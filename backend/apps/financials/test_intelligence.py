from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .intelligence_services import RULES, fingerprint, select_sample
from .models import (
    AccountingPolicy, ChartOfAccount, FinancialAuditEvent, FinancialDimension,
    FinancialIntelligenceRun, GeneralLedger, JournalEntry, JournalLine,
)


class IntelligenceTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="intel-staff", role="staff")
        self.manager = User.objects.create_user(username="intel-manager", role="manager")
        self.guest = User.objects.create_user(username="intel-guest", role="guest")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="INTEL", legal_name="Intelligence")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="INTEL", title="Intelligence", start_date=date(2026, 1, 1),
        )
        self.policy = AccountingPolicy.objects.create(engagement=self.engagement, base_currency="TZS")
        self.cash = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="CASH", account_name="Cash", account_type="asset",
        )
        self.revenue = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="REV", account_name="Revenue", account_type="revenue",
        )
        self.url = "/api/financials/intelligence-runs/"

    def journal(self, amount="100", day=date(2026, 1, 1), source="manual", status="posted", **changes):
        journal = JournalEntry.objects.create(
            engagement=self.engagement, entry_number=f"J-{JournalEntry.objects.count()}",
            transaction_date=day, description="Test journal", reference="REFERENCE",
            source=source, status=status, created_by=self.staff, **changes,
        )
        for account, debit, credit in ((self.cash, amount, 0), (self.revenue, 0, amount)):
            line = JournalLine.objects.create(journal_entry=journal, account=account, debit=debit, credit=credit)
            if status == "posted":
                GeneralLedger.objects.create(
                    engagement=self.engagement, account=account, journal_line=line,
                    transaction_date=day, debit=debit, credit=credit,
                    status="posted", source="journal", description="Test",
                )
        return journal

    def parameters(self, **changes):
        return {
            "engagement": self.engagement.pk, "name": "Journal test",
            "date_from": "2026-01-01", "date_to": "2026-01-31", "source": "all",
            "sampling_method": "seeded_random", "sample_size": 1, "seed": "audit-seed",
            "amount_threshold": "100.00", "round_increment": "100.00", "rules": list(RULES),
            **changes,
        }

    def run_analysis(self, **changes):
        response = self.api.post(self.url, self.parameters(**changes), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_saved_run_retains_population_parameters_and_audit_event(self):
        journal = self.journal()
        run = self.run_analysis()
        self.assertEqual(run["population_count"], 1)
        self.assertEqual(run["sample_count"], 1)
        self.assertEqual(run["results"]["sampled_journal_ids"], [journal.pk])
        self.assertEqual(run["parameters"]["base_currency"], "TZS")
        self.assertEqual(run["population_fingerprint"], fingerprint(run["results"]["population"]))
        self.assertEqual(len(run["population_fingerprint"]), 64)
        self.assertEqual(run["created_by"], self.staff.pk)
        event = FinancialAuditEvent.objects.get(object_type="financial_intelligence_run")
        self.assertEqual(event.actor_id, self.staff.pk)
        self.assertEqual(event.details["population_fingerprint"], run["population_fingerprint"])
        self.assertNotIn("population", event.details)

    def test_same_seed_and_snapshot_are_reproducible_without_replacement(self):
        for number in range(12):
            self.journal(amount=str(number + 1))
        first = self.run_analysis(sample_size=5)
        second = self.run_analysis(sample_size=5)
        self.assertEqual(first["population_fingerprint"], second["population_fingerprint"])
        self.assertEqual(first["results"]["sampled_journal_ids"], second["results"]["sampled_journal_ids"])
        ids = first["results"]["sampled_journal_ids"]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(ids, select_sample(first["results"]["population"], first["parameters"]))
        different = self.run_analysis(sample_size=5, seed="different")
        self.assertNotEqual(ids, different["results"]["sampled_journal_ids"])
        self.assertEqual(first["population_fingerprint"], different["population_fingerprint"])

    def test_high_value_sample_uses_numeric_amount_and_id_tie_break(self):
        small = self.journal(amount="9")
        large = self.journal(amount="100")
        equal = self.journal(amount="100")
        data = self.run_analysis(sampling_method="high_value", sample_size=2)
        self.assertEqual(data["results"]["sampled_journal_ids"], [large.pk, equal.pk])
        self.assertEqual(data["results"]["sample_total_debit"], "200.00")
        self.assertEqual(data["results"]["population_total_debit"], "209.00")
        self.assertNotIn(small.pk, data["results"]["sampled_journal_ids"])

    def test_period_source_and_posted_status_scope_are_explicit(self):
        included = self.journal(source="manual")
        self.journal(source="import")
        self.journal(status="draft")
        self.journal(day=date(2025, 12, 31))
        self.journal(day=date(2026, 2, 1))
        data = self.run_analysis(source="manual")
        self.assertEqual([row["id"] for row in data["results"]["population"]], [included.pk])
        self.assertEqual(data["parameters"]["source"], "manual")

    def test_threshold_rounding_weekend_and_missing_approval_rules(self):
        weekend = self.journal(day=date(2026, 1, 3), amount="100")
        self.journal(day=date(2026, 1, 5), amount="99.99")
        data = self.run_analysis()
        findings = data["results"]["findings"]
        for rule in ("large_journal", "round_amount", "weekend_date"):
            rows = [row for row in findings if row["rule"] == rule]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["journal_ids"], [weekend.pk])
        self.assertEqual(sum(row["rule"] == "missing_recorded_approval" for row in findings), 2)
        self.assertTrue(any("may not have been required" in row["message"] for row in findings))
        self.assertFalse(any(row["rule"] == "incomplete_ledger_provenance" for row in findings))

    def test_duplicate_signature_excludes_journal_number_but_requires_reference(self):
        first = self.journal()
        second = self.journal()
        third = self.journal(amount="101")
        fourth = self.journal()
        JournalEntry.objects.filter(pk=fourth.pk).update(reference="")
        data = self.run_analysis(rules=["potential_duplicate"])
        findings = data["results"]["findings"]
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["journal_ids"], [first.pk, second.pk])
        self.assertNotIn(third.pk, findings[0]["journal_ids"])

    def test_preparer_self_approval_and_corrupt_provenance_are_screened(self):
        journal = self.journal()
        JournalEntry.objects.filter(pk=journal.pk).update(approved_by=self.staff, approved_at=journal.created_at)
        GeneralLedger.objects.filter(journal_line__journal_entry=journal).update(debit=Decimal("1"))
        data = self.run_analysis()
        rules = {row["rule"] for row in data["results"]["findings"]}
        self.assertIn("self_approval", rules)
        self.assertIn("incomplete_ledger_provenance", rules)
        self.assertNotIn("missing_recorded_approval", rules)
        JournalEntry.objects.filter(pk=journal.pk).update(created_by=None)
        data = self.run_analysis(rules=["missing_preparer"])
        self.assertEqual(data["results"]["findings"][0]["rule"], "missing_preparer")

    def test_dimensions_are_snapshotted_and_distinguish_duplicates(self):
        first = self.journal()
        second = self.journal()
        dimension = FinancialDimension.objects.create(
            engagement=self.engagement, dimension_type="project", name="Project A",
        )
        second.lines.first().dimensions.add(dimension)
        data = self.run_analysis(rules=["potential_duplicate"])
        self.assertEqual(data["results"]["findings"], [])
        row = next(row for row in data["results"]["population"] if row["id"] == second.pk)
        self.assertEqual(row["lines"][0]["dimensions"][0]["name"], "Project A")
        self.assertEqual(row["lines"][0]["dimensions"][0]["type"], "project")
        self.assertEqual(first.lines.count(), 2)

    def test_historical_snapshot_does_not_change_when_live_labels_change(self):
        journal = self.journal()
        first = self.run_analysis()
        ChartOfAccount.objects.filter(pk=self.cash.pk).update(account_name="Renamed")
        JournalEntry.objects.filter(pk=journal.pk).update(description="Changed")
        response = self.api.get(f"{self.url}{first['id']}/")
        self.assertEqual(response.data["results"], first["results"])
        second = self.run_analysis()
        self.assertNotEqual(first["population_fingerprint"], second["population_fingerprint"])

    def test_invalid_parameters_and_empty_or_oversized_sample_save_nothing(self):
        for changes in (
            {"sample_size": 0}, {"sample_size": 1001}, {"seed": ""}, {"rules": []},
            {"rules": ["unknown"]}, {"rules": ["weekend_date", "weekend_date"]},
            {"date_from": "2026-02-01"}, {"amount_threshold": "-1"}, {"round_increment": "0"},
            {"sampling_method": "mus"}, {"source": "bad"}, {"engagement": 999999},
        ):
            with self.subTest(changes=changes):
                response = self.api.post(self.url, self.parameters(**changes), format="json")
                self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.api.post(self.url, self.parameters(), format="json").status_code, 400)
        self.journal()
        self.assertEqual(self.api.post(self.url, self.parameters(sample_size=2), format="json").status_code, 400)
        self.assertEqual(FinancialIntelligenceRun.objects.count(), 0)
        self.assertEqual(FinancialAuditEvent.objects.count(), 0)

    def test_population_limits_are_explicit_not_truncated(self):
        self.journal()
        with patch("apps.financials.intelligence_services.MAX_JOURNALS", 0):
            response = self.api.post(self.url, self.parameters(), format="json")
            self.assertEqual(response.status_code, 400)
        with patch("apps.financials.intelligence_services.MAX_LINES", 1):
            response = self.api.post(self.url, self.parameters(), format="json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(FinancialIntelligenceRun.objects.count(), 0)

    def test_foreign_engagement_metadata_is_not_snapshotted(self):
        journal = self.journal()
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="INTEL-FOREIGN", title="Other",
            start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(
            engagement=other, account_code="FOREIGN", account_name="Foreign account", account_type="asset",
        )
        line = journal.lines.first()
        JournalLine.objects.filter(pk=line.pk).update(account=account)
        response = self.api.post(self.url, self.parameters(), format="json")
        self.assertEqual(response.status_code, 400)
        JournalLine.objects.filter(pk=line.pk).update(account=self.cash)
        dimension = FinancialDimension.objects.create(
            engagement=other, dimension_type="project", name="Foreign project",
        )
        line.dimensions.add(dimension)
        response = self.api.post(self.url, self.parameters(), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(FinancialIntelligenceRun.objects.count(), 0)
        self.assertEqual(FinancialAuditEvent.objects.count(), 0)

    def test_run_list_pagination_does_not_return_population_snapshots(self):
        self.journal()
        run = self.run_analysis()
        original = FinancialIntelligenceRun.objects.get(pk=run["id"])
        for number in range(25):
            FinancialIntelligenceRun.objects.create(
                engagement=self.engagement, name=f"Extra {number}", algorithm_version=original.algorithm_version,
                parameters=original.parameters, population_fingerprint=original.population_fingerprint,
                population_count=original.population_count, sample_count=original.sample_count,
                finding_count=original.finding_count, results=original.results, created_by=self.staff,
            )
        response = self.api.get(self.url)
        self.assertEqual(response.data["count"], 26)
        self.assertEqual(len(response.data["results"]), 25)
        self.assertIsNotNone(response.data["next"])
        self.assertTrue(all("results" not in row for row in response.data["results"]))
        response = self.api.get(f"{self.url}?page=2")
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNotNone(response.data["previous"])
        self.assertEqual(response.data["results"][0]["id"], original.pk)

    def test_runs_are_immutable_model_and_api_and_guest_cannot_create(self):
        self.journal()
        data = self.run_analysis()
        run = FinancialIntelligenceRun.objects.get(pk=data["id"])
        run.name = "Changed"
        with self.assertRaises(ValidationError):
            run.save()
        with self.assertRaises(ValidationError):
            run.delete()
        detail = f"{self.url}{run.pk}/"
        self.assertEqual(self.api.patch(detail, {"name": "Edit"}, format="json").status_code, 405)
        self.assertEqual(self.api.delete(detail).status_code, 405)
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.api.get(detail).status_code, 200)
        self.assertEqual(self.api.post(self.url, self.parameters(), format="json").status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(self.url).status_code, (401, 403))

    def test_list_is_paginated_summary_and_engagement_filtered(self):
        self.journal()
        data = self.run_analysis()
        response = self.api.get(f"{self.url}?engagement={self.engagement.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertNotIn("results", response.data["results"][0])
        self.assertEqual(response.data["results"][0]["id"], data["id"])
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="INTEL-OTHER", title="Other", start_date=date(2026, 1, 1),
        )
        self.assertEqual(self.api.get(f"{self.url}?engagement={other.pk}").data["count"], 0)
        self.assertEqual(self.api.get(f"{self.url}?engagement=bad").status_code, 400)

    def test_closed_period_can_be_analysed_without_posting_anything(self):
        self.journal()
        self.policy.closed_through = date(2026, 1, 31)
        self.policy.save()
        before = GeneralLedger.objects.count()
        data = self.run_analysis()
        self.assertEqual(GeneralLedger.objects.count(), before)
        self.assertEqual(data["population_count"], 1)

    def test_large_valid_amounts_do_not_overflow_decimal_screening(self):
        self.journal(amount="9999999999999999.99")
        self.journal(amount="9999999999999999.99")
        data = self.run_analysis(sample_size=2, round_increment="0.01")
        self.assertEqual(data["results"]["population_total_debit"], "19999999999999999.98")
        self.assertEqual(data["results"]["sample_total_debit"], "19999999999999999.98")

    def test_unknown_currency_is_explicit_and_unbalanced_legacy_is_screened(self):
        journal = self.journal()
        journal.lines.filter(account=self.revenue).update(credit=99)
        self.policy.base_currency = ""
        self.policy.save()
        data = self.run_analysis()
        self.assertIn("unbalanced_journal", {row["rule"] for row in data["results"]["findings"]})
        self.assertIsNone(data["parameters"]["base_currency"])
        self.assertTrue(any("Base currency is not configured" in warning for warning in data["results"]["warnings"]))
