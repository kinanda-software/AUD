from collections import defaultdict
from decimal import Decimal
import logging
from smtplib import SMTPException

from django.http import HttpResponse
from django.db.models import ProtectedError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .accounting_controls import FinancialControlMixin, ensure_open, locked_policy, require_manager
from .models import (
    AccountingPolicy, FinancialContact, FinancialDocument, FinancialPayment,
    FinancialTaxCode, JournalEntry, FinancialAuditEvent,
)
from .subledger_serializers import (
    ContactSerializer, DocumentSerializer, PaymentParameters, PaymentSerializer, TaxCodeSerializer,
)
from .subledger_services import balance, create_payment, is_credit, is_sales, prepare_document
from .invoice_services import customer_statement, delivery_content, invoice_pdf, refund_receipt, send_invoice, statement_pdf


logger = logging.getLogger(__name__)


class DeliveryParameters(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("invoice", "reminder"))
    recipient = serializers.EmailField()
    subject = serializers.CharField(max_length=400)
    body = serializers.CharField(max_length=5000)


class RefundParameters(serializers.Serializer):
    transaction_date = serializers.DateField()
    reason = serializers.CharField(max_length=300)


class EngagementFilterMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        parameters = EngagementFilter(data=self.request.query_params)
        parameters.is_valid(raise_exception=True)
        engagement = parameters.validated_data.get("engagement")
        if engagement:
            queryset = queryset.filter(**{self.engagement_field: engagement})
        return queryset

    engagement_field = "engagement_id"

    def get_object(self):
        instance = super().get_object()
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            engagement = instance.document.engagement_id if isinstance(instance, FinancialPayment) else instance.engagement_id
            locked_policy(engagement)
            instance = type(instance).objects.select_for_update().get(pk=instance.pk)
        return instance


class EngagementFilter(serializers.Serializer):
    engagement = serializers.IntegerField(min_value=1, required=False)


class ContactViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ModelViewSet):
    queryset = FinancialContact.objects.all()
    serializer_class = ContactSerializer

    @action(detail=True, methods=["get"])
    def statement(self, request, pk=None):
        contact = self.get_object()
        # Engagement is obtained from the selected contact, not supplied by the caller.
        parameters = ReportParameters(data={**request.query_params.dict(), "engagement": contact.engagement_id})
        parameters.is_valid(raise_exception=True)
        if "as_of" not in parameters.validated_data:
            raise ValidationError("A customer statement requires an as_of date.")
        report = customer_statement(contact, parameters.validated_data["as_of"])
        download = serializers.ChoiceField(choices=("json", "pdf")).run_validation(request.query_params.get("download", "json"))
        if download == "pdf":
            response = HttpResponse(statement_pdf(contact, report), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="customer-statement-{contact.pk}.pdf"'
            response["Cache-Control"] = "no-store"
            return response
        return Response(report)

    def perform_destroy(self, instance):
        if instance.financialdocument_set.exists():
            raise ValidationError("Used contacts cannot be deleted. Deactivate the contact instead.")
        instance.delete()


class TaxCodeViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ModelViewSet):
    queryset = FinancialTaxCode.objects.all()
    serializer_class = TaxCodeSerializer

    def perform_create(self, serializer):
        require_manager(self.request.user)
        locked_policy(serializer.validated_data["engagement"].pk)
        serializer.save()

    def perform_update(self, serializer):
        require_manager(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user)
        if instance.financialdocumentline_set.exists():
            raise ValidationError("Used tax codes cannot be deleted. Deactivate the code instead.")
        instance.delete()


def cancel_source(journal, user):
    require_manager(user)
    locked_policy(journal.engagement_id)
    journal = JournalEntry.objects.select_for_update().get(pk=journal.pk)
    if journal.status in ("posted", "void"):
        raise ValidationError("Only unposted source journals can be cancelled.")
    journal.status = JournalEntry.Status.VOID
    journal.save()
    return journal


class DocumentViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ModelViewSet):
    queryset = FinancialDocument.objects.select_related(
        "contact", "journal", "original", "control_account",
    ).prefetch_related("lines", "payments__journal", "credit_notes__lines", "credit_notes__journal")
    serializer_class = DocumentSerializer

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        document = self.get_object()
        response = HttpResponse(invoice_pdf(document), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="invoice-{document.pk}.pdf"'
        response["Cache-Control"] = "no-store"
        return response

    @action(detail=True, methods=["get"], url_path="delivery-preview")
    def delivery_preview(self, request, pk=None):
        kind = serializers.ChoiceField(choices=("invoice", "reminder")).run_validation(request.query_params.get("kind"))
        return Response(delivery_content(self.get_object(), kind))

    @action(detail=True, methods=["get"], url_path="delivery-history")
    def delivery_history(self, request, pk=None):
        document = self.get_object()
        events = FinancialAuditEvent.objects.filter(
            engagement_id=document.engagement_id, object_type="invoice_delivery", object_id=document.pk,
        ).order_by("-pk")[:50]
        return Response([{"id": event.pk, "created_at": event.created_at, "details": event.details} for event in events])

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        parameters = DeliveryParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        data = dict(parameters.validated_data)
        kind = data.pop("kind")
        try:
            return Response(send_invoice(self.get_object(), kind, data, request.user))
        except (SMTPException, OSError):
            logger.error("Invoice SMTP submission failed for document %s", pk)
            return Response({"detail": "Email submission failed. Check SMTP configuration and delivery logs before retrying."}, status=502)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        ensure_open(locked_policy(instance.engagement_id), instance.transaction_date)
        if instance.journal_id:
            raise ValidationError("Prepared documents cannot be deleted. Cancel an unposted document or use a credit note.")
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError("This document is referenced by another record.") from exc

    @action(detail=True, methods=["post"])
    def prepare(self, request, pk=None):
        document = prepare_document(self.get_object(), request.user)
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        document = self.get_object()
        parameters = PaymentParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        payment = create_payment(document, parameters.validated_data, request.user)
        return Response(PaymentSerializer(payment).data, status=201)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        document = self.get_object()
        if not document.journal_id:
            raise ValidationError("Delete or edit an unprepared draft instead.")
        document.journal = cancel_source(document.journal, request.user)
        return Response(self.get_serializer(document).data)


class PaymentViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FinancialPayment.objects.select_related("journal", "document")
    serializer_class = PaymentSerializer
    engagement_field = "document__engagement_id"

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        parameters = RefundParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        journal = refund_receipt(self.get_object(), parameters.validated_data, request.user)
        return Response({"journal": journal.pk, "status": journal.status}, status=201)

    @action(detail=True, methods=["post"], url_path="cancel-refund")
    def cancel_refund(self, request, pk=None):
        payment = self.get_object()
        if not hasattr(payment.journal, "reversal"):
            raise ValidationError("There is no refund journal.")
        cancel_source(payment.journal.reversal, request.user)
        payment.refresh_from_db()
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        payment = self.get_object()
        cancel_source(payment.journal, request.user)
        payment.refresh_from_db()
        return Response(self.get_serializer(payment).data)


class ReportParameters(serializers.Serializer):
    engagement = serializers.IntegerField(min_value=1)
    as_of = serializers.DateField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    kind = serializers.ChoiceField(choices=("invoice", "bill"), required=False)


class SubledgerReportViewSet(viewsets.ViewSet):
    def parameters(self, request):
        parameters = ReportParameters(data=request.query_params)
        parameters.is_valid(raise_exception=True)
        data = parameters.validated_data
        policy = AccountingPolicy.objects.filter(engagement_id=data["engagement"]).first()
        if not policy or not policy.base_currency:
            raise ValidationError("Configure the base currency first.")
        return data, policy

    @action(detail=False, methods=["get"])
    def ageing(self, request):
        data, policy = self.parameters(request)
        if "as_of" not in data or "kind" not in data:
            raise ValidationError("Ageing requires as_of and kind (invoice or bill).")
        documents = FinancialDocument.objects.filter(
            engagement_id=data["engagement"], kind=data["kind"],
            transaction_date__lte=data["as_of"], journal__status="posted",
        ).select_related("contact", "journal").prefetch_related("lines")
        rows = []
        buckets = {key: Decimal("0.00") for key in ("current", "1_30", "31_60", "61_90", "over_90")}
        for document in documents:
            amount, base_amount = balance(document, as_of=data["as_of"])
            if amount == 0:
                continue
            days = (data["as_of"] - document.due_date).days
            bucket = "current" if days <= 0 else "1_30" if days <= 30 else "31_60" if days <= 60 else "61_90" if days <= 90 else "over_90"
            buckets[bucket] += base_amount
            rows.append({
                "id": document.pk, "number": document.number, "contact": document.contact.name,
                "currency": document.currency, "outstanding": format(amount, ".2f"),
                "base_outstanding": format(base_amount, ".2f"), "due_date": document.due_date,
                "days_overdue": max(days, 0), "bucket": bucket,
            })
        return Response({
            "as_of": data["as_of"], "kind": data["kind"], "base_currency": policy.base_currency,
            "rows": rows, "buckets": {key: format(value, ".2f") for key, value in buckets.items()},
            "base_total": format(sum(buckets.values(), Decimal("0.00")), ".2f"),
        })

    @action(detail=False, methods=["get"], url_path="tax-summary")
    def tax_summary(self, request):
        data, policy = self.parameters(request)
        if not data.get("date_from") or not data.get("date_to") or data["date_from"] > data["date_to"]:
            raise ValidationError("Tax summary requires date_from <= date_to.")
        documents = FinancialDocument.objects.filter(
            engagement_id=data["engagement"], journal__status="posted",
            transaction_date__range=(data["date_from"], data["date_to"]),
        ).prefetch_related("lines__tax_code")
        grouped = defaultdict(lambda: {"sales_net": Decimal("0.00"), "sales_tax": Decimal("0.00"),
                                       "purchase_net": Decimal("0.00"), "purchase_tax": Decimal("0.00")})
        for document in documents:
            sign = -1 if is_credit(document) else 1
            side = "sales" if is_sales(document) else "purchase"
            for line in document.lines.all():
                key = (line.tax_code_id, line.tax_code.name if line.tax_code else "No tax", str(line.tax_rate))
                grouped[key][f"{side}_net"] += sign * line.base_net
                grouped[key][f"{side}_tax"] += sign * line.base_tax
        return Response({
            "base_currency": policy.base_currency, "date_from": data["date_from"], "date_to": data["date_to"],
            "basis": "Posted invoice/bill and credit-note dates (accrual); not a statutory return.",
            "rows": [
                {"tax_code": key[0], "name": key[1], "rate": key[2],
                 **{field: format(value, ".2f") for field, value in amounts.items()}}
                for key, amounts in grouped.items()
            ],
        })
