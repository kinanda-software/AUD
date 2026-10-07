from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from django.urls import resolve
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import TrialBalance
from .views import TrialBalanceViewSet


class TrialBalanceListApiTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.client_record = Client.objects.create(
            client_code="TB-LIST-CLIENT",
            legal_name="Trial Balance List Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="TB-LIST-ENG",
            client=self.client_record,
            title="Trial Balance List Engagement",
            start_date=date(2026, 1, 1),
        )
        self.trial_balance = TrialBalance.objects.create(
            engagement=self.engagement,
            period_start=date(2026, 1, 1),
            period_end=date(2026, 12, 31),
        )

    def test_list_succeeds_without_nonexistent_line_dimensions_relation(self):
        request = self.factory.get("/api/financials/trial-balances/")
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True),
        )

        response = TrialBalanceViewSet.as_view({"get": "list"})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.trial_balance.id)


class FinancialAnalysisApiTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = TrialBalanceViewSet.as_view({"get": "analysis"})
        self.trial_balance = SimpleNamespace(
            id=1,
            engagement_id=10,
            currency="TZS",
            period_start=date(2026, 1, 1),
            period_end=date(2026, 12, 31),
            lines=Mock(),
        )
        self.trial_balance.lines.select_related.return_value.all.return_value = []

    def make_request(self, params=None):
        request = self.factory.get(
            "/api/financials/trial-balances/1/analysis/",
            params or {},
        )
        force_authenticate(
            request,
            user=SimpleNamespace(is_authenticated=True),
        )
        return request

    @patch.object(TrialBalanceViewSet, "get_object")
    def test_invalid_query_parameters_return_400(self, get_object):
        get_object.return_value = self.trial_balance
        invalid_parameters = [
            {"amount_threshold": "-1"},
            {"amount_threshold": "1.001"},
            {"amount_threshold": "99999999999999999.99"},
            {"percent_threshold": "0.001"},
            {"percent_threshold": "-0.01"},
            {"percent_threshold": "1000000.00"},
            {"percent_threshold": "NaN"},
            {"comparison_id": "0"},
            {"comparison_id": "not-an-integer"},
            {"reconcile_ledger": "sometimes"},
        ]
        for parameters in invalid_parameters:
            with self.subTest(parameters=parameters):
                response = self.view(self.make_request(parameters), pk="1")
                self.assertEqual(response.status_code, 400)

    @patch.object(TrialBalanceViewSet, "get_queryset")
    @patch.object(TrialBalanceViewSet, "get_object")
    def test_comparison_must_be_earlier_same_engagement_and_currency(
        self, get_object, get_queryset,
    ):
        get_object.return_value = self.trial_balance
        get_queryset.return_value.filter.return_value.first.return_value = None
        response = self.view(
            self.make_request({"comparison_id": "2"}),
            pk="1",
        )
        self.assertEqual(response.status_code, 400)
        get_queryset.return_value.filter.assert_called_once_with(
            id=2,
            engagement_id=10,
            currency="TZS",
            period_end__lt=self.trial_balance.period_start,
        )

    @patch("apps.financials.views.JournalEntry")
    @patch("apps.financials.views.GeneralLedger")
    @patch.object(TrialBalanceViewSet, "get_object")
    def test_default_analysis_scopes_to_posted_current_period_records(
        self, get_object, general_ledger, journal_entry,
    ):
        get_object.return_value = self.trial_balance
        general_ledger.Status.POSTED = "posted"
        journal_entry.Status.POSTED = "posted"
        general_ledger.objects.select_related.return_value.filter.return_value = []
        journal_entry.objects.prefetch_related.return_value.filter.return_value = []

        response = self.view(self.make_request(), pk="1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["amount_threshold"], "0.00")
        self.assertEqual(response.data["percent_threshold"], "25.00")
        self.assertFalse(response.data["reconcile_ledger"])
        self.assertEqual(response.data["difference"], "0.00")
        general_ledger.objects.select_related.return_value.filter.assert_called_once_with(
            engagement_id=10,
            transaction_date__gte=self.trial_balance.period_start,
            transaction_date__lte=self.trial_balance.period_end,
            status="posted",
        )
        journal_entry.objects.prefetch_related.return_value.filter.assert_called_once_with(
            engagement_id=10,
            transaction_date__gte=self.trial_balance.period_start,
            transaction_date__lte=self.trial_balance.period_end,
            status="posted",
        )

    @patch("apps.financials.views.JournalEntry")
    @patch("apps.financials.views.GeneralLedger")
    @patch.object(TrialBalanceViewSet, "get_queryset")
    @patch.object(TrialBalanceViewSet, "get_object")
    def test_valid_custom_parameters_are_returned(
        self, get_object, get_queryset, general_ledger, journal_entry,
    ):
        get_object.return_value = self.trial_balance
        comparison = SimpleNamespace(
            id=2,
            period_start=date(2025, 1, 1),
            period_end=date(2025, 12, 31),
            lines=Mock(),
        )
        comparison.lines.select_related.return_value.all.return_value = []
        get_queryset.return_value.filter.return_value.first.return_value = comparison
        general_ledger.objects.select_related.return_value.filter.return_value = []
        journal_entry.objects.prefetch_related.return_value.filter.return_value = []

        response = self.view(
            self.make_request({
                "comparison_id": "2",
                "amount_threshold": "123.45",
                "percent_threshold": "30.50",
                "reconcile_ledger": "true",
            }),
            pk="1",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["comparison_id"], 2)
        self.assertEqual(response.data["amount_threshold"], "123.45")
        self.assertEqual(response.data["percent_threshold"], "30.50")
        self.assertTrue(response.data["reconcile_ledger"])
        self.assertEqual(
            response.data["comparison_period_start"],
            "2025-01-01",
        )
        self.assertEqual(
            response.data["comparison_period_end"],
            "2025-12-31",
        )
        get_queryset.return_value.filter.assert_called_once_with(
            id=2,
            engagement_id=10,
            currency="TZS",
            period_end__lt=self.trial_balance.period_start,
        )
        comparison.lines.select_related.return_value.all.assert_called_once_with()

    @patch("apps.financials.views.JournalEntry")
    @patch("apps.financials.views.GeneralLedger")
    @patch.object(TrialBalanceViewSet, "get_object")
    def test_maximum_threshold_values_are_accepted(
        self, get_object, general_ledger, journal_entry,
    ):
        get_object.return_value = self.trial_balance
        general_ledger.objects.select_related.return_value.filter.return_value = []
        journal_entry.objects.prefetch_related.return_value.filter.return_value = []

        response = self.view(
            self.make_request({
                "amount_threshold": "9999999999999999.99",
                "percent_threshold": "999999.99",
            }),
            pk="1",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["amount_threshold"],
            "9999999999999999.99",
        )
        self.assertEqual(response.data["percent_threshold"], "999999.99")

    def test_route_requires_authentication(self):
        match = resolve("/api/financials/trial-balances/1/analysis/")
        self.assertEqual(match.url_name, "trial-balance-analysis")
        response = match.func(
            self.factory.get("/api/financials/trial-balances/1/analysis/"),
            **match.kwargs,
        )
        self.assertEqual(response.status_code, 401)
