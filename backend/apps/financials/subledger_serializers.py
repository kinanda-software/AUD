from decimal import Decimal

from rest_framework import serializers

from .accounting_controls import ensure_open, locked_policy
from .models import (
    FinancialContact, FinancialDocument, FinancialDocumentLine, FinancialPayment,
    FinancialTaxCode,
)
from .subledger_services import (
    balance, check_account, create_document_lines, totals, validate_rate,
)


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialContact
        fields = ["id", "engagement", "kind", "name", "email", "is_active"]

    def validate(self, attrs):
        if self.instance:
            if attrs.get("engagement", self.instance.engagement).pk != self.instance.engagement_id:
                raise serializers.ValidationError("A contact cannot move to another engagement.")
            if attrs.get("kind", self.instance.kind) != self.instance.kind and self.instance.financialdocument_set.exists():
                raise serializers.ValidationError("The type of a used contact cannot be changed.")
        return attrs


class TaxCodeSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(
        max_digits=7, decimal_places=4, min_value=Decimal("0"), max_value=Decimal("100"),
    )

    class Meta:
        model = FinancialTaxCode
        fields = ["id", "engagement", "name", "rate", "sales_account", "purchase_account", "is_active"]

    def validate(self, attrs):
        def value(field):
            return attrs.get(field, getattr(self.instance, field, None))

        engagement = value("engagement")
        check_account(value("sales_account"), engagement.pk, ("liability",))
        check_account(value("purchase_account"), engagement.pk, ("asset",))
        if self.instance:
            if engagement.pk != self.instance.engagement_id:
                raise serializers.ValidationError("Tax codes cannot move between engagements.")
            if self.instance.financialdocumentline_set.exists():
                for field in ("rate", "sales_account", "purchase_account"):
                    if value(field) != getattr(self.instance, field):
                        raise serializers.ValidationError(
                            "Used tax rates and account mappings are immutable. Create a new tax code instead."
                        )
        return attrs


class DocumentLineSerializer(serializers.ModelSerializer):
    net_amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))

    class Meta:
        model = FinancialDocumentLine
        fields = [
            "id", "account", "description", "net_amount", "tax_code",
            "tax_rate", "tax_amount", "base_net", "base_tax",
        ]
        read_only_fields = ["id", "tax_rate", "tax_amount", "base_net", "base_tax"]


class PaymentSerializer(serializers.ModelSerializer):
    journal_status = serializers.CharField(source="journal.status", read_only=True)
    refund_journal = serializers.IntegerField(source="journal.reversal.pk", read_only=True, default=None)
    refund_status = serializers.CharField(source="journal.reversal.status", read_only=True, default=None)

    class Meta:
        model = FinancialPayment
        fields = [
            "id", "document", "transaction_date", "amount", "exchange_rate",
            "base_amount", "control_base_amount", "fx_difference", "bank_account",
            "fx_account", "reference", "journal", "journal_status", "created_at", "refund_journal", "refund_status",
        ]
        read_only_fields = fields


class PaymentParameters(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))
    exchange_rate = serializers.DecimalField(
        max_digits=18, decimal_places=8, min_value=Decimal("0.00000001"),
    )

    class Meta:
        model = FinancialPayment
        fields = ["transaction_date", "amount", "exchange_rate", "bank_account", "fx_account", "reference"]


class DocumentSerializer(serializers.ModelSerializer):
    lines = DocumentLineSerializer(many=True, allow_empty=False)
    payments = PaymentSerializer(many=True, read_only=True)
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    journal_status = serializers.CharField(source="journal.status", read_only=True, default=None)
    amounts = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()
    available_to_settle = serializers.SerializerMethodField()
    exchange_rate = serializers.DecimalField(
        max_digits=18, decimal_places=8, min_value=Decimal("0.00000001"),
    )

    class Meta:
        model = FinancialDocument
        fields = [
            "id", "engagement", "kind", "number", "contact", "contact_name", "transaction_date",
            "due_date", "currency", "exchange_rate", "control_account", "original",
            "journal", "journal_status", "lines", "payments", "amounts", "outstanding",
            "available_to_settle", "created_by", "created_at",
        ]
        read_only_fields = ["id", "journal", "created_by", "created_at"]

    def validate(self, attrs):
        if self.instance and self.instance.journal_id:
            raise serializers.ValidationError("Prepared documents are immutable. Use a credit note for corrections.")

        def value(field):
            return attrs.get(field, getattr(self.instance, field, None))

        engagement = value("engagement")
        if self.instance and engagement.pk != self.instance.engagement_id:
            raise serializers.ValidationError("Documents cannot move between engagements.")
        policy = locked_policy(engagement.pk)
        ensure_open(policy, value("transaction_date"))
        if policy.opening_journal_id and value("transaction_date") < policy.opening_journal.transaction_date:
            raise serializers.ValidationError("Document date cannot precede the opening-balance date.")
        validate_rate(policy, value("currency"), value("exchange_rate"))
        if value("due_date") < value("transaction_date"):
            raise serializers.ValidationError({"due_date": "Due date cannot precede the document date."})
        sales = value("kind") in ("invoice", "sales_credit")
        contact = value("contact")
        if contact.engagement_id != engagement.pk or not contact.is_active:
            raise serializers.ValidationError({"contact": "Select an active contact from this engagement."})
        if contact.kind != ("customer" if sales else "supplier"):
            raise serializers.ValidationError({"contact": "Invoices require customers; bills require suppliers."})
        control = value("control_account")
        check_account(control, engagement.pk, ("asset",) if sales else ("liability",))
        original = value("original")
        if value("kind") in ("sales_credit", "purchase_credit"):
            if original is None or original.kind != ("invoice" if sales else "bill"):
                raise serializers.ValidationError({"original": "Select the original invoice or bill."})
            if (
                original.engagement_id != engagement.pk or original.contact_id != contact.pk
                or original.control_account_id != control.pk
                or original.currency != value("currency") or original.exchange_rate != value("exchange_rate")
            ):
                raise serializers.ValidationError("Credit notes must use the original engagement, contact, currency, rate, and control account.")
            if value("transaction_date") < original.transaction_date:
                raise serializers.ValidationError("Credit date cannot precede the original.")
        elif original is not None:
            raise serializers.ValidationError({"original": "Only credit notes can reference an original."})
        lines = attrs.get("lines")
        if self.instance and lines is None:
            lines = [
                {"account": line.account, "tax_code": line.tax_code}
                for line in self.instance.lines.select_related("account", "tax_code")
            ]
        if len(lines or []) > 200:
            raise serializers.ValidationError({"lines": "Documents support at most 200 lines."})
        for line in lines or []:
            check_account(line["account"], engagement.pk, ("revenue",) if sales else ("expense", "asset"))
            if line["account"].pk == control.pk:
                raise serializers.ValidationError("Line accounts must differ from the control account.")
            code = line.get("tax_code")
            if code and (code.engagement_id != engagement.pk or not code.is_active):
                raise serializers.ValidationError({"lines": "Select active tax codes from this engagement."})
        return attrs

    def create(self, validated_data):
        lines = validated_data.pop("lines")
        document = FinancialDocument.objects.create(**validated_data)
        create_document_lines(document, lines)
        return document

    def update(self, instance, validated_data):
        lines = validated_data.pop("lines", None)
        old_rate = instance.exchange_rate
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lines is None and instance.exchange_rate != old_rate:
            lines = [
                {"account": line.account, "description": line.description,
                 "net_amount": line.net_amount, "tax_code": line.tax_code}
                for line in instance.lines.select_related("account", "tax_code")
            ]
        if lines is not None:
            instance.lines.all().delete()
            create_document_lines(instance, lines)
        return instance

    def get_amounts(self, obj):
        return {key: format(value, ".2f") for key, value in totals(obj).items()}

    def get_outstanding(self, obj):
        if obj.kind not in ("invoice", "bill"):
            return None
        return format(balance(obj)[0], ".2f")

    def get_available_to_settle(self, obj):
        if obj.kind not in ("invoice", "bill"):
            return None
        return format(balance(obj, reserved=True)[0], ".2f")
