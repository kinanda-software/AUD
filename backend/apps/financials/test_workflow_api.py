from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User

from .models import (
    BankStatement,
    BankStatementLine,
    ChartOfAccount,
    FinancialBudget,
    FinancialDimension,
    GeneralLedger,
)
from .serializers import GeneralLedgerSerializer, JournalEntrySerializer
from .workflow_serializers import FinancialBudgetLineSerializer
from .views import JournalEntryViewSet
from .workflow_views import (
    BankStatementViewSet,
    BankStatementLineViewSet,
    FinancialDimensionViewSet,
    FinancialBudgetViewSet,
)


class FinancialWorkflowApiTests(SimpleTestCase):
    databases = {"default"}

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(is_authenticated=True, pk=7)

    def make_request(self, method, path, data=None, format=None):
        request = getattr(self.factory, method)(
            path,
            data or {},
            **({"format": format} if format else {}),
        )
        force_authenticate(request, user=self.user)
        return request

    @patch.object(FinancialBudgetViewSet, "get_serializer")
    @patch("apps.financials.workflow_views._write_audit_event")
    @patch.object(FinancialBudgetViewSet, "get_object")
    def test_budget_approval_records_approver_and_event(
        self, get_object, record_event, get_serializer,
    ):
        budget = Mock(
            id=3,
            status=FinancialBudget.Status.DRAFT,
            engagement_id=12,
            name="Operating",
            fiscal_year=2026,
            lines=Mock(),
        )
        budget.lines.exists.return_value = True
        budget.save = Mock()
        get_object.return_value = budget
        get_serializer.return_value.data = {"id": 3, "status": "approved"}

        response = FinancialBudgetViewSet.as_view({"post": "approve"})(
            self.make_request("post", "/api/financials/budgets/3/approve/"),
            pk="3",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")
        self.assertEqual(budget.approved_by, self.user)
        self.assertEqual(budget.status, FinancialBudget.Status.APPROVED)
        record_event.assert_called_once()


class FinancialDimensionWorkflowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="dimension-auditor",
        )
        self.client_record = Client.objects.create(
            client_code="DIM-CLIENT",
            legal_name="Dimension Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="DIM-ENG",
            client=self.client_record,
            title="Dimension Engagement",
            start_date=date(2026, 1, 1),
        )
        self.other_client = Client.objects.create(
            client_code="OTHER-DIM-CLIENT",
            legal_name="Other Dimension Client",
        )
        self.other_engagement = Engagement.objects.create(
            engagement_code="OTHER-DIM-ENG",
            client=self.other_client,
            title="Other Dimension Engagement",
            start_date=date(2026, 1, 1),
        )
        self.revenue = ChartOfAccount.objects.create(
            engagement=self.engagement,
            account_code="400",
            account_name="Revenue",
            account_type=ChartOfAccount.AccountType.REVENUE,
        )
        self.expense = ChartOfAccount.objects.create(
            engagement=self.engagement,
            account_code="500",
            account_name="Expense",
            account_type=ChartOfAccount.AccountType.EXPENSE,
        )
        self.budget = FinancialBudget.objects.create(
            engagement=self.engagement,
            name="Dimension budget",
            fiscal_year=2026,
        )
        self.location = FinancialDimension.objects.create(
            engagement=self.engagement,
            dimension_type=FinancialDimension.Type.LOCATION,
            name="North",
        )
        self.project = FinancialDimension.objects.create(
            engagement=self.engagement,
            dimension_type=FinancialDimension.Type.PROJECT,
            name="Project A",
        )
        self.foreign_dimension = FinancialDimension.objects.create(
            engagement=self.other_engagement,
            dimension_type=FinancialDimension.Type.PROJECT,
            name="Foreign project",
        )

    def test_budget_lines_allow_distinct_dimension_combinations(self):
        for dimensions, amount in (
            ([self.location.pk], "100.00"),
            ([self.location.pk, self.project.pk], "200.00"),
        ):
            serializer = FinancialBudgetLineSerializer(data={
                "budget": self.budget.pk,
                "account": self.revenue.pk,
                "period": "2026-01-01",
                "amount": amount,
                "dimensions": dimensions,
            })
            self.assertTrue(serializer.is_valid(), serializer.errors)
            serializer.save()

        duplicate = FinancialBudgetLineSerializer(data={
            "budget": self.budget.pk,
            "account": self.revenue.pk,
            "period": "2026-01-01",
            "amount": "300.00",
            "dimensions": [self.location.pk],
        })
        self.assertFalse(duplicate.is_valid())
        self.assertIn("dimensions", duplicate.errors)

    def test_budget_and_ledger_reject_dimensions_from_another_engagement(self):
        budget_line = FinancialBudgetLineSerializer(data={
            "budget": self.budget.pk,
            "account": self.revenue.pk,
            "period": "2026-01-01",
            "amount": "100.00",
            "dimensions": [self.foreign_dimension.pk],
        })
        self.assertFalse(budget_line.is_valid())
        self.assertIn("dimensions", budget_line.errors)

        ledger_entry = GeneralLedgerSerializer(data={
            "engagement": self.engagement.pk,
            "account": self.revenue.pk,
            "transaction_date": "2026-01-10",
            "reference": "DIM-1",
            "description": "Dimension validation",
            "debit": "10.00",
            "credit": "0.00",
            "dimensions": [self.foreign_dimension.pk],
        })
        self.assertFalse(ledger_entry.is_valid())
        self.assertIn("dimensions", ledger_entry.errors)

        valid_entry = GeneralLedgerSerializer(data={
            "engagement": self.engagement.pk,
            "account": self.revenue.pk,
            "transaction_date": "2026-01-10",
            "reference": "DIM-2",
            "description": "Tagged ledger line",
            "debit": "10.00",
            "credit": "0.00",
            "dimensions": [self.location.pk],
        })
        self.assertTrue(valid_entry.is_valid(), valid_entry.errors)
        saved_entry = valid_entry.save()
        self.assertEqual(
            list(saved_entry.dimensions.values_list("id", flat=True)),
            [self.location.pk],
        )

    def test_posting_journal_carries_line_dimensions_to_ledger(self):
        serializer = JournalEntrySerializer(data={
            "engagement": self.engagement.pk,
            "entry_number": "JE-DIM-1",
            "transaction_date": "2026-01-10",
            "reference": "DIM-1",
            "description": "Tagged journal",
            "source": "manual",
            "status": "draft",
            "lines": [
                {
                    "account": self.expense.pk,
                    "debit": "100.00",
                    "credit": "0.00",
                    "dimensions": [self.location.pk, self.project.pk],
                },
                {
                    "account": self.revenue.pk,
                    "debit": "0.00",
                    "credit": "100.00",
                    "dimensions": [self.location.pk, self.project.pk],
                },
            ],
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        journal = serializer.save()
        request = self.factory.post("/api/financials/journal-entries/1/post/")
        force_authenticate(request, user=self.user)

        response = JournalEntryViewSet.as_view({"post": "post_entry"})(
            request,
            pk=journal.pk,
        )

        self.assertEqual(response.status_code, 200)
        entries = GeneralLedger.objects.filter(engagement=self.engagement)
        self.assertEqual(entries.count(), 2)
        for entry in entries:
            self.assertEqual(
                set(entry.dimensions.values_list("id", flat=True)),
                {self.location.pk, self.project.pk},
            )

    def test_assigned_dimension_can_be_deactivated_but_not_renamed(self):
        budget_line = FinancialBudgetLineSerializer(data={
            "budget": self.budget.pk,
            "account": self.revenue.pk,
            "period": "2026-01-01",
            "amount": "100.00",
            "dimensions": [self.location.pk],
        })
        self.assertTrue(budget_line.is_valid(), budget_line.errors)
        budget_line.save()

        deactivate_request = self.factory.patch(
            f"/api/financials/dimensions/{self.location.pk}/",
            {"is_active": False},
            format="json",
        )
        force_authenticate(deactivate_request, user=self.user)
        deactivate_response = FinancialDimensionViewSet.as_view(
            {"patch": "partial_update"},
        )(deactivate_request, pk=self.location.pk)

        self.assertEqual(deactivate_response.status_code, 200)
        self.location.refresh_from_db()
        self.assertFalse(self.location.is_active)

        rename_request = self.factory.patch(
            f"/api/financials/dimensions/{self.location.pk}/",
            {"name": "North renamed"},
            format="json",
        )
        force_authenticate(rename_request, user=self.user)
        rename_response = FinancialDimensionViewSet.as_view(
            {"patch": "partial_update"},
        )(rename_request, pk=self.location.pk)
        self.assertEqual(rename_response.status_code, 400)


class BankStatementMatchingTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username="bank-match-auditor")
        client_record = Client.objects.create(
            client_code="BANK-MATCH-CLIENT",
            legal_name="Bank Match Client",
        )
        engagement = Engagement.objects.create(
            engagement_code="BANK-MATCH-ENG",
            client=client_record,
            title="Bank Match Engagement",
            start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(
            engagement=engagement,
            account_code="1000",
            account_name="Operating Bank",
            account_type=ChartOfAccount.AccountType.ASSET,
        )
        self.statement = BankStatement.objects.create(
            engagement=engagement,
            account=account,
            currency="TZS",
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
            opening_balance=Decimal("100.00"),
            closing_balance=Decimal("200.00"),
            book_opening_balance=Decimal("100.00"),
            created_by=self.user,
        )
        self.statement_line = BankStatementLine.objects.create(
            statement=self.statement,
            row_number=2,
            transaction_date=date(2026, 1, 10),
            description="Customer receipt",
            reference="RCPT-102",
            amount=Decimal("100.00"),
        )
        self.ledger_entry = GeneralLedger.objects.create(
            engagement=engagement,
            account=account,
            transaction_date=date(2026, 1, 12),
            reference="RCPT 102",
            description="Customer receipt",
            debit=Decimal("100.00"),
            credit=Decimal("0.00"),
            source=GeneralLedger.Source.MANUAL,
            status=GeneralLedger.Status.POSTED,
        )

    def match_request(self):
        request = self.factory.post(
            f"/api/financials/bank-statement-lines/{self.statement_line.pk}/match/",
            {"ledger_entry_id": self.ledger_entry.pk},
            format="json",
        )
        force_authenticate(request, user=self.user)
        return request

    def test_match_action_accepts_near_date_exact_amount_candidate(self):
        response = BankStatementLineViewSet.as_view({"post": "match"})(
            self.match_request(),
            pk=self.statement_line.pk,
        )

        self.assertEqual(response.status_code, 200)
        self.statement_line.refresh_from_db()
        self.assertEqual(self.statement_line.matched_entry_id, self.ledger_entry.pk)

    def test_match_action_rejects_candidate_outside_date_window(self):
        self.ledger_entry.transaction_date = date(2026, 1, 14)
        self.ledger_entry.save(update_fields=["transaction_date"])

        response = BankStatementLineViewSet.as_view({"post": "match"})(
            self.match_request(),
            pk=self.statement_line.pk,
        )

        self.assertEqual(response.status_code, 400)
        self.statement_line.refresh_from_db()
        self.assertIsNone(self.statement_line.matched_entry_id)


class FinancialWorkflowEndpointTests(SimpleTestCase):
    databases = {"default"}

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(is_authenticated=True, pk=7)

    def make_request(self, method, path, data=None, format=None):
        request = getattr(self.factory, method)(
            path,
            data or {},
            **({"format": format} if format else {}),
        )
        force_authenticate(request, user=self.user)
        return request

    @patch.object(BankStatementViewSet, "_reconciliation_data")
    @patch("apps.financials.workflow_views.BankStatement.objects")
    @patch.object(BankStatementViewSet, "get_object")
    def test_reconciliation_endpoint_returns_actionable_unmatched_error(
        self, get_object, bank_statements, reconciliation_data,
    ):
        statement = SimpleNamespace(
            pk=4,
            status=BankStatement.Status.DRAFT,
        )
        get_object.return_value = statement
        bank_statements.select_for_update.return_value.get.return_value = statement
        summary = {
            "can_reconcile": False,
            "unmatched_statement_line_count": 1,
        }
        reconciliation_data.return_value = (summary, [], [])

        response = BankStatementViewSet.as_view({"post": "reconcile"})(
            self.make_request("post", "/api/financials/bank-statements/4/reconcile/"),
            pk="4",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["reconciliation"]["unmatched_statement_line_count"]),
            "1",
        )

    @patch("apps.financials.workflow_views._write_audit_event")
    @patch("apps.financials.workflow_views.BankStatementLine.objects")
    @patch("apps.financials.workflow_views.BankStatement.objects")
    @patch.object(BankStatementViewSet, "get_object")
    def test_csv_import_endpoint_creates_rows_and_audit_event(
        self, get_object, bank_statements, statement_lines, record_event,
    ):
        statement = BankStatement(
            pk=4,
            status=BankStatement.Status.DRAFT,
            engagement_id=12,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        get_object.return_value = statement
        bank_statements.select_for_update.return_value.get.return_value = statement
        statement_lines.bulk_create = Mock()
        upload = (
            b"date,description,reference,amount\n"
            b"2026-01-03,Customer receipt,R-1,100.00\n"
        )

        response = BankStatementViewSet.as_view({"post": "import_csv"})(
            self.make_request(
                "post",
                "/api/financials/bank-statements/4/import-csv/",
                {"file": SimpleUploadedFile(
                    "statement.csv", upload, content_type="text/csv",
                )},
                format="multipart",
            ),
            pk="4",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["imported_line_count"], 1)
        statement_lines.bulk_create.assert_called_once()
        record_event.assert_called_once()
