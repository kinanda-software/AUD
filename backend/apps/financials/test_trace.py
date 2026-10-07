from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, Adjustment, ChartOfAccount, FinancialAuditEvent, FinancialContact,
    FinancialDocument, FinancialPayment, FixedAsset, FixedAssetEvent, GeneralLedger,
    InventoryItem, InventoryMovement, JournalEntry, JournalLine, LeadSchedule, SupportingDetail,
    TrialBalance, TrialBalanceLine,
)


class TraceTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.user = User.objects.create_user(username="trace-reader", role="guest")
        self.api.force_authenticate(self.user)
        client = Client.objects.create(client_code="TRACE", legal_name="Trace Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="TRACE", title="Trace", start_date=date(2026, 1, 1),
        )
        self.accounts = {
            code: ChartOfAccount.objects.create(
                engagement=self.engagement, account_code=code, account_name=code, account_type=kind,
            )
            for code, kind in (("CASH", "asset"), ("OTHER", "asset"), ("REV", "revenue"), ("EXP", "expense"))
        }
        self.tb = TrialBalance.objects.create(
            engagement=self.engagement, period_start=date(2026, 2, 1), period_end=date(2026, 2, 28),
        )
        self.line = TrialBalanceLine.objects.create(
            trial_balance=self.tb, account=self.accounts["CASH"], account_code="CASH", account_name="Cash",
            debit=100,
        )

    def trace(self, code="CASH", **params):
        return self.api.get(f"/api/financials/trial-balances/{self.tb.pk}/trace/", {
            "account": self.accounts[code].pk, **params,
        })

    def adjustment(self, status="posted", debit="CASH", credit="REV", amount="20"):
        return Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.tb,
            adjustment_number=f"A-{Adjustment.objects.count()}", description="Adjustment",
            debit_account=self.accounts[debit], credit_account=self.accounts[credit], amount=amount, status=status,
        )

    def ledger(self, amount="100", day=date(2026, 2, 1), linked=True, status="posted"):
        journal = JournalEntry.objects.create(
            engagement=self.engagement, entry_number=f"J-{JournalEntry.objects.count()}",
            transaction_date=day, description="Test journal", status=status, created_by=self.user,
        )
        line = JournalLine.objects.create(journal_entry=journal, account=self.accounts["CASH"], debit=amount)
        JournalLine.objects.create(journal_entry=journal, account=self.accounts["REV"], credit=amount)
        entry = GeneralLedger.objects.create(
            engagement=self.engagement, account=self.accounts["CASH"], transaction_date=day,
            description="Test", debit=amount, journal_line=line if linked else None, status=status,
        )
        return journal, entry

    def test_trace_matches_adjusted_calculation_and_excludes_unposted_adjustments(self):
        self.adjustment()
        self.adjustment(status="proposed", amount="500")
        self.adjustment(status="rejected", amount="100")
        self.adjustment(debit="EXP", credit="CASH", amount="5")
        response = self.trace()
        self.assertEqual(response.status_code, 200, response.data)
        calc = response.data["calculation"]
        self.assertEqual(calc["original_net"], "100.00")
        self.assertEqual(calc["adjustment_debit"], "20.00")
        self.assertEqual(calc["adjustment_credit"], "5.00")
        self.assertEqual(calc["adjusted_net"], "115.00")
        existing = self.api.get(f"/api/financials/trial-balances/{self.tb.pk}/adjusted/")
        row = next(row for row in existing.data["lines"] if row["account_id"] == self.accounts["CASH"].pk)
        self.assertEqual(Decimal(calc["adjusted_net"]), Decimal(row["adjusted_debit"]) - Decimal(row["adjusted_credit"]))
        self.assertEqual(sum(row["included"] for row in response.data["adjustments"]["rows"]), 2)

    def test_adjustment_only_account_and_unrelated_account(self):
        self.adjustment(credit="OTHER")
        response = self.trace("OTHER")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["calculation"]["original_line"])
        self.assertEqual(response.data["calculation"]["adjusted_credit"], "20.00")
        self.assertEqual(self.trace("EXP").status_code, 404)

    def test_exact_journal_provenance_and_missing_legacy_link(self):
        journal, entry = self.ledger()
        self.ledger(amount="30", linked=False)
        data = self.trace().data
        self.assertEqual(data["ledger"]["count"], 2)
        self.assertEqual(data["ledger_scope"]["missing_provenance_count"], 1)
        row = next(row for row in data["ledger"]["rows"] if row["id"] == entry.pk)
        self.assertEqual(row["provenance"], "verified")
        self.assertEqual(row["journal"]["id"], journal.pk)
        self.assertEqual(row["journal"]["created_by"], self.user.username)
        self.assertEqual(row["journal"]["sources"], [])
        self.assertEqual(data["ledger_scope"]["difference_to_original_tb"], "-30.00")
        self.assertEqual(data["ledger_scope"]["relationship"], "account_date_candidates")

    def test_inconsistent_link_is_flagged_not_verified(self):
        journal, entry = self.ledger()
        GeneralLedger.objects.filter(pk=entry.pk).update(debit=101)
        self.assertEqual(self.trace().data["ledger"]["rows"][0]["provenance"], "inconsistent")

    def test_cross_engagement_journal_metadata_is_not_exposed(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="TRACE-FOREIGN", title="Other",
            start_date=date(2026, 1, 1),
        )
        journal, unused = self.ledger()
        JournalEntry.objects.filter(pk=journal.pk).update(engagement=other)
        row = self.trace().data["ledger"]["rows"][0]
        self.assertEqual(row["provenance"], "inconsistent")
        self.assertIsNone(row["journal"])

    def test_support_limit_preserves_full_count_and_totals(self):
        lead = LeadSchedule.objects.create(
            engagement=self.engagement, trial_balance=self.tb, account=self.accounts["CASH"],
            schedule_name="Cash lead", opening_balance=100, adjusted_balance=100,
        )
        SupportingDetail.objects.bulk_create([
            SupportingDetail(lead_schedule=lead, description=f"Support {number}", amount=1)
            for number in range(101)
        ])
        data = self.trace().data["lead_schedules"][0]
        self.assertEqual(data["support_count"], 101)
        self.assertEqual(len(data["support"]), 100)
        self.assertEqual(data["support_total"], "101.00")
        self.assertEqual(data["support_difference"], "-1.00")

    def test_period_scoping_and_opening_carry_forward(self):
        opening, unused = self.ledger(day=date(2026, 1, 1), amount="50")
        self.ledger(day=date(2026, 2, 15), amount="10")
        self.ledger(day=date(2026, 3, 1), amount="20")
        self.ledger(status="draft", amount="1000")
        data = self.trace().data
        self.assertEqual(data["ledger_scope"]["net"], "10.00")
        self.assertFalse(data["ledger_scope"]["includes_opening"])
        AccountingPolicy.objects.create(engagement=self.engagement, base_currency="TZS", opening_journal=opening)
        data = self.trace().data
        self.assertEqual(data["ledger_scope"]["net"], "60.00")
        self.assertEqual(data["ledger_scope"]["date_from"], date(2026, 1, 1))
        self.assertTrue(data["ledger_scope"]["currency_confirmed"])
        self.assertTrue(data["ledger_scope"]["includes_opening"])

    def test_pagination_uses_full_totals_and_deterministic_rows(self):
        for number in range(5):
            self.ledger(amount=str(number + 1))
            self.adjustment(amount=str(number + 1))
        data = self.trace(page_size=2).data
        self.assertEqual(data["ledger"]["count"], 5)
        self.assertEqual(len(data["ledger"]["rows"]), 2)
        self.assertEqual(data["ledger"]["next_offset"], 2)
        self.assertEqual(data["ledger_scope"]["net"], "15.00")
        self.assertEqual(data["calculation"]["adjustment_debit"], "15.00")
        second = self.trace(page_size=2, ledger_offset=2, adjustment_offset=4).data
        self.assertEqual(second["ledger"]["next_offset"], 4)
        self.assertIsNone(second["adjustments"]["next_offset"])
        self.assertEqual(len(second["adjustments"]["rows"]), 1)
        self.assertFalse({row["id"] for row in data["ledger"]["rows"]} & {row["id"] for row in second["ledger"]["rows"]})

    def test_lead_support_and_stale_balance_differences_are_explicit(self):
        lead = LeadSchedule.objects.create(
            engagement=self.engagement, trial_balance=self.tb, account=self.accounts["CASH"],
            schedule_name="Cash lead", opening_balance=100, adjusted_balance=90, conclusion="Review required",
        )
        SupportingDetail.objects.create(lead_schedule=lead, description="Bank", amount=80, reference="BANK-REF", status="exception")
        row = self.trace().data["lead_schedules"][0]
        self.assertEqual(row["difference_to_current_adjusted_tb"], "-10.00")
        self.assertEqual(row["support_difference"], "10.00")
        self.assertEqual(row["support"][0]["status"], "exception")
        self.assertEqual(row["conclusion"], "Review required")

    def test_all_source_kinds_use_explicit_journal_links(self):
        customer = FinancialContact.objects.create(engagement=self.engagement, kind="customer", name="Customer")
        journal, unused = self.ledger()
        document = FinancialDocument.objects.create(
            engagement=self.engagement, kind="invoice", number="INV1", contact=customer,
            transaction_date=date(2026, 2, 1), due_date=date(2026, 2, 28), currency="TZS",
            exchange_rate=1, control_account=self.accounts["CASH"], journal=journal,
        )
        journal, unused = self.ledger()
        FinancialPayment.objects.create(
            document=document, transaction_date=date(2026, 2, 1), amount=10, exchange_rate=1,
            base_amount=10, control_base_amount=10, fx_difference=0, bank_account=self.accounts["CASH"], journal=journal,
        )
        journal, unused = self.ledger()
        asset = FixedAsset.objects.create(
            engagement=self.engagement, asset_number="FA1", name="Asset", registration_mode="new",
            acquisition_date=date(2026, 2, 1), depreciation_start=date(2026, 2, 1), depreciation_months=12,
            cost=100, asset_account=self.accounts["CASH"], accumulated_account=self.accounts["OTHER"],
            expense_account=self.accounts["EXP"], acquisition_journal=journal,
        )
        journal, unused = self.ledger()
        FixedAssetEvent.objects.create(asset=asset, kind="depreciation", transaction_date=date(2026, 2, 28), amount=10, journal=journal)
        journal, unused = self.ledger()
        item = InventoryItem.objects.create(
            engagement=self.engagement, sku="ITEM", name="Item", unit="each",
            inventory_account=self.accounts["CASH"], expense_account=self.accounts["EXP"],
        )
        InventoryMovement.objects.create(
            item=item, kind="receipt", transaction_date=date(2026, 2, 1), quantity=1, value=100,
            quantity_before=0, quantity_after=1, value_before=0, value_after=100,
            offset_account=self.accounts["OTHER"], reason="Receipt", journal=journal,
        )
        data = self.trace().data
        kinds = {source["kind"] for row in data["ledger"]["rows"] for source in row["journal"]["sources"]}
        self.assertEqual(kinds, {"invoice", "payment", "asset_acquisition", "asset_depreciation", "inventory_movement"})
        evidence_kinds = {
            source["evidence_target_kind"]
            for row in data["ledger"]["rows"] for source in row["journal"]["sources"]
        }
        self.assertEqual(evidence_kinds, {"document", "payment", "asset", "asset_event", "inventory_movement"})

    def test_invalid_parameters_and_cross_engagement_access(self):
        for params in ({"account": 0}, {"account": "bad"}, {"page_size": 101}, {"ledger_offset": -1}, {"adjustment_offset": "bad"}):
            self.assertEqual(self.api.get(f"/api/financials/trial-balances/{self.tb.pk}/trace/", {
                "account": self.accounts["CASH"].pk, **params,
            }).status_code, 400)
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="TRACE-OTHER", title="Other", start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(engagement=other, account_code="F", account_name="Foreign", account_type="asset")
        self.assertEqual(self.api.get(f"/api/financials/trial-balances/{self.tb.pk}/trace/", {"account": account.pk}).status_code, 404)

    def test_read_only_authenticated_and_no_false_evidence_claim(self):
        count = FinancialAuditEvent.objects.count()
        response = self.trace()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(FinancialAuditEvent.objects.count(), count)
        self.assertTrue(any("not verified attached evidence" in warning for warning in response.data["warnings"]))
        self.assertIn(self.api.post(f"/api/financials/trial-balances/{self.tb.pk}/trace/", {}).status_code, (403, 405))
        self.api.force_authenticate(None)
        self.assertIn(self.trace().status_code, (401, 403))
