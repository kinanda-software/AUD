from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from .accounting_controls import FinancialControlMixin

from .models import (
    BankStatement,
    BankStatementLine,
    BANK_MATCH_DATE_WINDOW_DAYS,
    ChartOfAccount,
    FinancialDimension,
    FinancialAuditEvent,
    FinancialBudget,
    FinancialBudgetLine,
    GeneralLedger,
)
from .workflow_serializers import (
    BankStatementLineSerializer,
    BankStatementSerializer,
    FinancialAuditEventSerializer,
    FinancialDimensionSerializer,
    FinancialBudgetLineSerializer,
    FinancialBudgetSerializer,
)
from .workflow_services import (
    build_bank_match_candidates,
    build_bank_reconciliation_summary,
    build_budget_actuals,
    parse_statement_csv,
    record_financial_event,
)


def _write_audit_event(request, engagement_id, action_name, object_type, object_id, details=None):
    return record_financial_event(
        engagement_id=engagement_id,
        actor=request.user,
        action=action_name,
        object_type=object_type,
        object_id=object_id,
        details=details,
    )


class FinancialBudgetViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = FinancialBudgetSerializer
    queryset = FinancialBudget.objects.prefetch_related(
        "lines", "lines__account", "lines__dimensions",
    ).all()

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)
        return queryset

    def perform_create(self, serializer):
        budget = serializer.save(created_by=self.request.user)
        _write_audit_event(
            self.request, budget.engagement_id, "created",
            "financial_budget", budget.id,
            {"name": budget.name, "fiscal_year": budget.fiscal_year},
        )

    def perform_update(self, serializer):
        if serializer.instance.status == FinancialBudget.Status.APPROVED:
            raise ValidationError("Approved budgets cannot be changed.")
        changes_period_basis = False
        for field in ("engagement", "fiscal_year", "currency"):
            if field not in serializer.validated_data:
                continue
            new_value = serializer.validated_data[field]
            old_value = (
                serializer.instance.engagement_id
                if field == "engagement"
                else getattr(serializer.instance, field)
            )
            if field == "engagement":
                new_value = new_value.pk
            changes_period_basis = changes_period_basis or new_value != old_value
        if changes_period_basis and serializer.instance.lines.exists():
            raise ValidationError(
                "Remove all budget lines before changing engagement, year or currency."
            )
        budget = serializer.save()
        _write_audit_event(
            self.request, budget.engagement_id, "updated",
            "financial_budget", budget.id,
            {"name": budget.name, "fiscal_year": budget.fiscal_year},
        )

    def perform_destroy(self, instance):
        if instance.status == FinancialBudget.Status.APPROVED:
            raise ValidationError("Approved budgets cannot be deleted.")
        _write_audit_event(
            self.request, instance.engagement_id, "deleted",
            "financial_budget", instance.id,
            {"name": instance.name, "fiscal_year": instance.fiscal_year},
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        budget = self.get_object()
        if budget.status == FinancialBudget.Status.APPROVED:
            raise ValidationError("Budget is already approved.")
        if not budget.lines.exists():
            raise ValidationError("Add at least one account-month budget before approval.")
        budget.status = FinancialBudget.Status.APPROVED
        budget.approved_by = request.user
        budget.approved_at = timezone.now()
        budget.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        _write_audit_event(
            request, budget.engagement_id, "approved",
            "financial_budget", budget.id,
            {"name": budget.name, "fiscal_year": budget.fiscal_year},
        )
        return Response(self.get_serializer(budget).data)

    @action(detail=True, methods=["get"], url_path="actuals")
    def actuals(self, request, pk=None):
        budget = self.get_object()
        lines = list(
            budget.lines.select_related("account").prefetch_related("dimensions").all()
        )
        ledger = list(
            GeneralLedger.objects.select_related("account").filter(
                engagement_id=budget.engagement_id,
                account__account_type__in=["revenue", "expense"],
                transaction_date__gte=date(budget.fiscal_year, 1, 1),
                transaction_date__lte=date(budget.fiscal_year, 12, 31),
                status=GeneralLedger.Status.POSTED,
            ).prefetch_related("dimensions")
        )
        return Response(build_budget_actuals(budget, lines, ledger))


class FinancialDimensionViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = FinancialDimensionSerializer
    queryset = FinancialDimension.objects.select_related("engagement").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)
        if (
            self.action == "list"
            and self.request.query_params.get("include_inactive") != "true"
        ):
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_create(self, serializer):
        dimension = serializer.save()
        _write_audit_event(
            self.request, dimension.engagement_id, "created",
            "financial_dimension", dimension.id,
            {
                "dimension_type": dimension.dimension_type,
                "name": dimension.name,
                "code": dimension.code,
            },
        )

    def perform_update(self, serializer):
        dimension = serializer.instance
        has_assignments = (
            dimension.ledger_entries.exists()
            or dimension.budget_lines.exists()
        )
        changes_definition = any(
            key in serializer.validated_data
            for key in ("engagement", "dimension_type", "name", "code")
        )
        if has_assignments and changes_definition:
            raise ValidationError(
                "A dimension already assigned to a budget or ledger entry cannot be changed. Deactivate it and create a replacement."
            )
        dimension = serializer.save()
        _write_audit_event(
            self.request, dimension.engagement_id, "updated",
            "financial_dimension", dimension.id,
            {
                "dimension_type": dimension.dimension_type,
                "name": dimension.name,
                "code": dimension.code,
                "is_active": dimension.is_active,
            },
        )

    def perform_destroy(self, instance):
        if instance.ledger_entries.exists() or instance.budget_lines.exists():
            raise ValidationError(
                "A dimension assigned to a budget or ledger entry cannot be deleted."
            )
        _write_audit_event(
            self.request, instance.engagement_id, "deleted",
            "financial_dimension", instance.id,
            {"dimension_type": instance.dimension_type, "name": instance.name},
        )
        instance.delete()


class FinancialBudgetLineViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = FinancialBudgetLineSerializer
    queryset = FinancialBudgetLine.objects.select_related(
        "budget", "account",
    ).all()

    def get_queryset(self):
        queryset = super().get_queryset()
        budget_id = self.request.query_params.get("budget")
        if budget_id:
            queryset = queryset.filter(budget_id=budget_id)
        return queryset

    def _ensure_draft(self, budget):
        if budget.status == FinancialBudget.Status.APPROVED:
            raise ValidationError("Approved budgets cannot be changed.")

    def perform_create(self, serializer):
        line = serializer.validated_data.get("budget")
        self._ensure_draft(line)
        instance = serializer.save()
        _write_audit_event(
            self.request, instance.budget.engagement_id, "line_created",
            "financial_budget_line", instance.id,
            {
                "budget_id": instance.budget_id,
                "account_id": instance.account_id,
                "period": instance.period.isoformat(),
                "amount": format(instance.amount, ".2f"),
                "dimensions": list(
                    instance.dimensions.values_list("id", flat=True)
                ),
            },
        )

    def perform_update(self, serializer):
        line = serializer.instance
        self._ensure_draft(line.budget)
        budget = serializer.validated_data.get("budget", line.budget)
        self._ensure_draft(budget)
        instance = serializer.save()
        _write_audit_event(
            self.request, instance.budget.engagement_id, "line_updated",
            "financial_budget_line", instance.id,
            {
                "budget_id": instance.budget_id,
                "account_id": instance.account_id,
                "period": instance.period.isoformat(),
                "amount": format(instance.amount, ".2f"),
                "dimensions": list(
                    instance.dimensions.values_list("id", flat=True)
                ),
            },
        )

    def perform_destroy(self, instance):
        self._ensure_draft(instance.budget)
        _write_audit_event(
            self.request, instance.budget.engagement_id, "line_deleted",
            "financial_budget_line", instance.id,
            {
                "budget_id": instance.budget_id,
                "account_id": instance.account_id,
                "period": instance.period.isoformat(),
                "amount": format(instance.amount, ".2f"),
                "dimensions": list(
                    instance.dimensions.values_list("id", flat=True)
                ),
            },
        )
        instance.delete()


class BankStatementViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = BankStatementSerializer
    queryset = BankStatement.objects.select_related(
        "engagement", "account",
    ).prefetch_related("lines").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)
        return queryset

    def perform_create(self, serializer):
        values = serializer.validated_data
        with transaction.atomic():
            ChartOfAccount.objects.select_for_update().get(
                pk=values["account"].pk
            )
            overlap = BankStatement.objects.filter(
                account=values["account"],
                period_start__lte=values["period_end"],
                period_end__gte=values["period_start"],
            ).exists()
            if overlap:
                raise ValidationError(
                    "A statement already exists for this account and overlapping period."
                )
            statement = serializer.save(created_by=self.request.user)
            _write_audit_event(
                self.request, statement.engagement_id, "created",
                "bank_statement", statement.id,
                {
                    "account_id": statement.account_id,
                    "period_start": statement.period_start.isoformat(),
                    "period_end": statement.period_end.isoformat(),
                },
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            statement = BankStatement.objects.select_for_update().get(
                pk=serializer.instance.pk
            )
            serializer.instance = statement
            if statement.status == BankStatement.Status.RECONCILED:
                raise ValidationError("Reconciled statements cannot be changed.")
            account = serializer.validated_data.get("account", statement.account)
            period_start = serializer.validated_data.get(
                "period_start", statement.period_start,
            )
            period_end = serializer.validated_data.get(
                "period_end", statement.period_end,
            )
            account_ids = sorted({statement.account_id, account.pk})
            list(
                ChartOfAccount.objects.select_for_update()
                .filter(pk__in=account_ids)
                .order_by("pk")
            )
            if statement.lines.exists():
                immutable_after_import = {
                    "engagement": statement.engagement_id,
                    "account": statement.account_id,
                    "currency": statement.currency,
                    "period_start": statement.period_start,
                    "period_end": statement.period_end,
                    "opening_balance": statement.opening_balance,
                    "closing_balance": statement.closing_balance,
                }
                for field, old_value in immutable_after_import.items():
                    if field not in serializer.validated_data:
                        continue
                    new_value = serializer.validated_data[field]
                    if field in ("engagement", "account"):
                        new_value = new_value.pk
                    if new_value != old_value:
                        raise ValidationError(
                            "Delete and recreate the statement to change imported statement details."
                        )
            overlap = BankStatement.objects.filter(
                account=account,
                period_start__lte=period_end,
                period_end__gte=period_start,
            ).exclude(pk=statement.pk).exists()
            if overlap:
                raise ValidationError(
                    "A statement already exists for this account and overlapping period."
                )
            statement = serializer.save()
            _write_audit_event(
                self.request, statement.engagement_id, "updated",
                "bank_statement", statement.id,
                {"account_id": statement.account_id},
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            instance = BankStatement.objects.select_for_update().get(
                pk=instance.pk
            )
            if instance.status == BankStatement.Status.RECONCILED:
                raise ValidationError("Reconciled statements cannot be deleted.")
            _write_audit_event(
                self.request, instance.engagement_id, "deleted",
                "bank_statement", instance.id,
                {"account_id": instance.account_id},
            )
            instance.delete()

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="import-csv",
    )
    def import_csv(self, request, pk=None):
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": "Upload a CSV file in the file field."})
        with transaction.atomic():
            statement = self.get_object()
            statement = BankStatement.objects.select_for_update().get(pk=statement.pk)
            if statement.status != BankStatement.Status.DRAFT:
                raise ValidationError("Reconciled statements cannot be imported into.")
            if statement.lines.exists():
                raise ValidationError("This statement already has imported transaction rows.")
            rows = parse_statement_csv(upload, statement)
            BankStatementLine.objects.bulk_create([
                BankStatementLine(**row) for row in rows
            ])
            _write_audit_event(
                request, statement.engagement_id, "transactions_imported",
                "bank_statement", statement.id,
                {"line_count": len(rows), "filename": upload.name},
            )
        return Response(
            {
                "statement_id": statement.id,
                "imported_line_count": len(rows),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="match-candidates")
    def match_candidates(self, request, pk=None):
        statement = self.get_object()
        if statement.status != BankStatement.Status.DRAFT:
            raise ValidationError("Reconciled statements cannot be matched.")
        lines = list(statement.lines.filter(matched_entry__isnull=True))
        matched_entry_ids = set(
            BankStatementLine.objects.filter(
                matched_entry__isnull=False,
            ).values_list("matched_entry_id", flat=True)
        )
        ledger = list(
            GeneralLedger.objects.filter(
                engagement_id=statement.engagement_id,
                account_id=statement.account_id,
                transaction_date__gte=statement.period_start,
                transaction_date__lte=statement.period_end,
                status=GeneralLedger.Status.POSTED,
            ).order_by("transaction_date", "id")
        )
        return Response(
            build_bank_match_candidates(lines, ledger, matched_entry_ids)
        )

    def _reconciliation_data(self, statement):
        statement_lines = list(statement.lines.select_related("matched_entry"))
        ledger_entries = list(
            GeneralLedger.objects.filter(
                engagement_id=statement.engagement_id,
                account_id=statement.account_id,
                transaction_date__gte=statement.period_start,
                transaction_date__lte=statement.period_end,
                status=GeneralLedger.Status.POSTED,
            )
        )
        matched_elsewhere = BankStatementLine.objects.filter(
            matched_entry__isnull=False,
        ).exclude(statement=statement).values_list("matched_entry_id", flat=True)
        matched_ids = set(matched_elsewhere)
        matched_ids.update(
            line.matched_entry_id
            for line in statement_lines
            if line.matched_entry_id is not None
        )
        summary = build_bank_reconciliation_summary(
            statement, statement_lines, ledger_entries, matched_ids,
        )
        return summary, statement_lines, ledger_entries

    @action(detail=True, methods=["get"], url_path="reconciliation")
    def reconciliation(self, request, pk=None):
        statement = self.get_object()
        summary, _, _ = self._reconciliation_data(statement)
        return Response(summary)

    @action(detail=True, methods=["post"])
    def reconcile(self, request, pk=None):
        statement = self.get_object()
        with transaction.atomic():
            statement = BankStatement.objects.select_for_update().get(pk=statement.pk)
            if statement.status == BankStatement.Status.RECONCILED:
                raise ValidationError("Statement is already reconciled.")
            summary, _, _ = self._reconciliation_data(statement)
            if not summary["can_reconcile"]:
                raise ValidationError({
                    "detail": (
                        "Reconciliation requires matching statement and posted ledger rows, "
                        "a verified book opening balance, and zero statement/book differences."
                    ),
                    "reconciliation": summary,
                })
            statement.status = BankStatement.Status.RECONCILED
            statement.reconciled_by = request.user
            statement.reconciled_at = timezone.now()
            statement.save(update_fields=[
                "status", "reconciled_by", "reconciled_at", "updated_at",
            ])
            _write_audit_event(
                request, statement.engagement_id, "reconciled",
                "bank_statement", statement.id,
                summary,
            )
            return Response({
                **summary,
                "status": statement.status,
                "reconciled_by": request.user.pk,
                "reconciled_at": statement.reconciled_at,
            })


class BankStatementLineViewSet(FinancialControlMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = BankStatementLineSerializer
    queryset = BankStatementLine.objects.select_related(
        "statement", "matched_entry",
    ).all()

    def get_queryset(self):
        queryset = super().get_queryset()
        statement_id = self.request.query_params.get("statement")
        if statement_id:
            queryset = queryset.filter(statement_id=statement_id)
        return queryset

    @action(detail=True, methods=["post"])
    def match(self, request, pk=None):
        line = self.get_object()
        with transaction.atomic():
            statement = BankStatement.objects.select_for_update().get(
                pk=line.statement_id
            )
            line = BankStatementLine.objects.select_for_update().get(pk=line.pk)
            if statement.status != BankStatement.Status.DRAFT:
                raise ValidationError("Reconciled statement lines cannot be changed.")
            if line.matched_entry_id is not None:
                raise ValidationError("Statement line already has a ledger match.")
            try:
                ledger_entry_id = int(request.data.get("ledger_entry_id"))
            except (TypeError, ValueError) as error:
                raise ValidationError({"ledger_entry_id": "Provide a valid ledger entry ID."}) from error
            entry = GeneralLedger.objects.filter(
                id=ledger_entry_id,
                engagement_id=statement.engagement_id,
                account_id=statement.account_id,
                transaction_date__gte=max(
                    statement.period_start,
                    line.transaction_date - timedelta(
                        days=BANK_MATCH_DATE_WINDOW_DAYS,
                    ),
                ),
                transaction_date__lte=min(
                    statement.period_end,
                    line.transaction_date + timedelta(
                        days=BANK_MATCH_DATE_WINDOW_DAYS,
                    ),
                ),
                status=GeneralLedger.Status.POSTED,
                debit=(
                    line.amount if line.amount > Decimal("0.00") else Decimal("0.00")
                ),
                credit=(
                    -line.amount if line.amount < Decimal("0.00") else Decimal("0.00")
                ),
            ).first()
            if entry is None:
                raise ValidationError(
                    "Choose a posted ledger entry with the same account and signed amount, "
                    "dated within three days of the statement transaction."
                )
            line.matched_entry = entry
            line.matched_by = request.user
            line.matched_at = timezone.now()
            try:
                line.save(update_fields=["matched_entry", "matched_by", "matched_at"])
            except (IntegrityError, DjangoValidationError) as error:
                raise ValidationError("Ledger entry is already matched to another statement line.") from error
            _write_audit_event(
                request, statement.engagement_id, "line_matched",
                "bank_statement_line", line.id,
                {"ledger_entry_id": entry.id},
            )
        return Response(self.get_serializer(line).data)

    @action(detail=True, methods=["post"])
    def unmatch(self, request, pk=None):
        line = self.get_object()
        with transaction.atomic():
            statement = BankStatement.objects.select_for_update().get(
                pk=line.statement_id
            )
            line = BankStatementLine.objects.select_for_update().get(pk=line.pk)
            if statement.status != BankStatement.Status.DRAFT:
                raise ValidationError("Reconciled statement lines cannot be changed.")
            if line.matched_entry_id is None:
                raise ValidationError("Statement line has no ledger match.")
            entry_id = line.matched_entry_id
            line.matched_entry = None
            line.matched_by = None
            line.matched_at = None
            line.save(update_fields=["matched_entry", "matched_by", "matched_at"])
            _write_audit_event(
                request, statement.engagement_id, "line_unmatched",
                "bank_statement_line", line.id,
                {"ledger_entry_id": entry_id},
            )
        return Response(self.get_serializer(line).data)


class FinancialAuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FinancialAuditEventSerializer
    queryset = FinancialAuditEvent.objects.select_related("actor").all()

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)
        return queryset
