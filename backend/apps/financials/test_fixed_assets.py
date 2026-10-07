from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, ChartOfAccount, FinancialAuditEvent, FixedAsset, FixedAssetEvent,
    GeneralLedger, JournalEntry,
)


class FixedAssetTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.manager = User.objects.create_user(username="fa-manager", role="manager")
        self.other_manager = User.objects.create_user(username="fa-reviewer", role="manager")
        self.staff = User.objects.create_user(username="fa-staff", role="staff")
        self.guest = User.objects.create_user(username="fa-guest", role="guest")
        self.api.force_authenticate(self.manager)
        client = Client.objects.create(client_code="FA", legal_name="Asset Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="FA", title="Assets", start_date=date(2026, 1, 1),
        )
        self.policy = AccountingPolicy.objects.create(engagement=self.engagement, base_currency="TZS")
        self.accounts = {
            code: ChartOfAccount.objects.create(
                engagement=self.engagement, account_code=code, account_name=code, account_type=kind,
            )
            for code, kind in (
                ("COST", "asset"), ("ACCUM", "asset"), ("BANK", "asset"),
                ("DEP", "expense"), ("GAIN", "revenue"), ("LOSS", "expense"),
            )
        }

    def data(self, **changes):
        return {
            "engagement": self.engagement.pk, "asset_number": f"FA-{FixedAsset.objects.count() + 1}",
            "name": "Equipment", "registration_mode": "new", "acquisition_date": "2026-01-15",
            "depreciation_start": "2026-01-01", "depreciation_months": 3,
            "cost": "100.00", "residual_value": "10.00", "opening_depreciation": "0.00",
            "asset_account": self.accounts["COST"].pk,
            "accumulated_account": self.accounts["ACCUM"].pk,
            "expense_account": self.accounts["DEP"].pk,
            "funding_account": self.accounts["BANK"].pk,
            **changes,
        }

    def create(self, **changes):
        response = self.api.post("/api/financials/fixed-assets/", self.data(**changes), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def action(self, asset, name, data=None):
        return self.api.post(f"/api/financials/fixed-assets/{asset}/{name}/", data or {}, format="json")

    def post(self, journal):
        return self.api.post(f"/api/financials/journal-entries/{journal}/post/", {}, format="json")

    def acquired(self, **changes):
        asset = self.create(**changes)
        response = self.action(asset["id"], "acquire")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.post(response.data["acquisition_journal"]).status_code, 200)
        return asset["id"]

    def depreciate(self, asset, period):
        response = self.action(asset, "depreciate", {"period_end": period})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        return response.data

    def get(self, asset):
        return self.api.get(f"/api/financials/fixed-assets/{asset}/").data

    def test_acquisition_posts_cost_and_funding_only_once(self):
        asset = self.acquired()
        self.assertEqual(self.action(asset, "acquire").status_code, 400)
        journal = self.get(asset)["acquisition_journal"]
        self.assertEqual(self.post(journal).status_code, 400)
        self.assertEqual(GeneralLedger.objects.count(), 2)
        self.assertEqual(GeneralLedger.objects.get(account=self.accounts["COST"]).debit, Decimal("100"))
        self.assertEqual(GeneralLedger.objects.get(account=self.accounts["BANK"]).credit, Decimal("100"))

    def test_rounding_residual_and_final_month_leave_residual_value(self):
        asset = self.acquired(cost="100.01", residual_value="0.00")
        events = [self.depreciate(asset, period) for period in ("2026-01-31", "2026-02-28", "2026-03-31")]
        self.assertEqual([event["amount"] for event in events], ["33.34", "33.33", "33.34"])
        self.assertEqual(self.get(asset)["state"]["net_book_value"], "0.00")
        self.assertIsNone(self.get(asset)["state"]["next_depreciation_date"])
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-04-30"}).status_code, 400)

    def test_existing_asset_requires_confirmation_and_does_not_duplicate_ledger(self):
        data = self.data(
            registration_mode="existing", acquisition_date="2020-01-01",
            opening_depreciation="30.00", funding_account=None,
        )
        self.assertEqual(self.api.post("/api/financials/fixed-assets/", data, format="json").status_code, 400)
        data["confirm_existing_balances"] = True
        response = self.api.post("/api/financials/fixed-assets/", data, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(GeneralLedger.objects.count(), 0)
        self.assertEqual(response.data["state"]["net_book_value"], "70.00")
        self.assertEqual(self.action(response.data["id"], "acquire").status_code, 400)
        event = self.depreciate(response.data["id"], "2026-01-31")
        self.assertEqual(event["amount"], "20.00")
        self.assertEqual(GeneralLedger.objects.count(), 2)

    def test_pending_depreciation_reserves_month_and_cancel_releases_it(self):
        asset = self.acquired()
        first = self.action(asset, "depreciate", {"period_end": "2026-01-31"})
        self.assertEqual(first.status_code, 201)
        for period in ("2026-01-31", "2026-02-28"):
            self.assertEqual(self.action(asset, "depreciate", {"period_end": period}).status_code, 400)
        cancelled = self.api.post(f"/api/financials/fixed-asset-events/{first.data['id']}/cancel/", {}, format="json")
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data["journal_status"], "void")
        self.depreciate(asset, "2026-01-31")
        self.assertEqual(FixedAssetEvent.objects.count(), 2)

    def test_depreciation_cannot_skip_month_or_precede_acquisition_post(self):
        asset = self.create()["id"]
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-31"}).status_code, 400)
        acquisition = self.action(asset, "acquire").data
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-31"}).status_code, 400)
        self.assertEqual(self.post(acquisition["acquisition_journal"]).status_code, 200)
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-02-28"}).status_code, 400)
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-30"}).status_code, 400)

    def disposal(self, asset, proceeds="80.00", account="GAIN", day="2026-02-15"):
        return self.action(asset, "dispose", {
            "transaction_date": day, "proceeds": proceeds,
            "bank_account": self.accounts["BANK"].pk,
            "gain_loss_account": self.accounts[account].pk,
        })

    def test_disposal_gain_and_loss_remove_cost_and_accumulated_depreciation(self):
        for proceeds, account, expected in (("80.00", "GAIN", "-10.00"), ("50.00", "LOSS", "20.00")):
            with self.subTest(proceeds=proceeds):
                asset = self.acquired()
                self.depreciate(asset, "2026-01-31")
                response = self.disposal(asset, proceeds, account)
                self.assertEqual(response.status_code, 201, response.data)
                self.assertTrue(self.get(asset)["state"]["disposal_pending"])
                self.assertEqual(self.post(response.data["journal"]).status_code, 200)
                lines = GeneralLedger.objects.filter(journal_line__journal_entry_id=response.data["journal"])
                amounts = {line.account.account_code: line.debit - line.credit for line in lines}
                self.assertEqual(amounts["COST"], -100)
                self.assertEqual(amounts["ACCUM"], 30)
                self.assertEqual(amounts[account], Decimal(expected))
                self.assertEqual(sum(amounts.values()), 0)
                self.assertTrue(self.get(asset)["state"]["disposed"])
                self.assertEqual(self.get(asset)["state"]["net_book_value"], "0.00")
                self.assertEqual(self.disposal(asset).status_code, 400)

    def test_disposal_blocks_missing_months_and_depreciation_in_disposal_month(self):
        asset = self.acquired()
        self.assertEqual(self.disposal(asset).status_code, 400)
        self.depreciate(asset, "2026-01-31")
        self.assertEqual(self.disposal(asset, day="2026-01-31").status_code, 400)
        self.assertEqual(self.disposal(asset, day="2026-03-15").status_code, 400)
        self.assertEqual(self.disposal(asset).status_code, 201)
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-02-28"}).status_code, 400)

    def test_zero_proceeds_writeoff_and_wrong_gain_account(self):
        asset = self.acquired()
        self.depreciate(asset, "2026-01-31")
        self.assertEqual(self.disposal(asset, "50.00", "GAIN").status_code, 400)
        response = self.action(asset, "dispose", {
            "transaction_date": "2026-02-01", "proceeds": "0.00",
            "gain_loss_account": self.accounts["LOSS"].pk,
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)

    def test_roles_and_independent_approval(self):
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.api.post("/api/financials/fixed-assets/", self.data(), format="json").status_code, 403)
        self.api.force_authenticate(self.manager)
        self.policy.require_journal_approval = True
        self.policy.save()
        asset = self.create()["id"]
        response = self.action(asset, "acquire")
        journal = response.data["acquisition_journal"]
        self.assertEqual(response.data["acquisition_status"], "submitted")
        self.assertEqual(self.post(journal).status_code, 400)
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/approve/").status_code, 400)
        self.api.force_authenticate(self.other_manager)
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/approve/").status_code, 200)
        self.assertEqual(self.post(journal).status_code, 200)
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-31"}).status_code, 403)
        self.assertEqual(self.api.get("/api/financials/fixed-assets/").status_code, 200)

    def test_registered_asset_and_source_journals_are_immutable(self):
        asset = self.acquired()
        self.assertEqual(self.api.patch(f"/api/financials/fixed-assets/{asset}/", {"cost": "150.00"}, format="json").status_code, 400)
        self.assertEqual(self.api.delete(f"/api/financials/fixed-assets/{asset}/").status_code, 400)
        journal = self.get(asset)["acquisition_journal"]
        response = self.api.get(f"/api/financials/journal-entries/{journal}/")
        self.assertTrue(response.data["source_document"])
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/reverse/", {
            "transaction_date": "2026-01-31", "entry_number": "REV", "reason": "test",
        }, format="json").status_code, 400)
        self.assertEqual(self.action(asset, "cancel-acquisition").status_code, 400)

    def test_currency_account_schedule_and_value_validation(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="OTHER-FA", title="Other", start_date=date(2026, 1, 1),
        )
        foreign = ChartOfAccount.objects.create(
            engagement=other, account_code="F", account_name="Other", account_type="asset",
        )
        for changes in (
            {"asset_account": foreign.pk}, {"expense_account": self.accounts["BANK"].pk},
            {"accumulated_account": self.accounts["COST"].pk}, {"funding_account": None},
            {"residual_value": "101.00"}, {"opening_depreciation": "1.00"},
            {"depreciation_start": "2026-01-15"}, {"depreciation_start": "2025-12-01"},
            {"depreciation_start": "9999-12-01"}, {"depreciation_months": 0},
        ):
            with self.subTest(changes=changes):
                self.assertEqual(self.api.post("/api/financials/fixed-assets/", self.data(**changes), format="json").status_code, 400)
        self.policy.base_currency = ""
        self.policy.save()
        self.assertEqual(self.api.post("/api/financials/fixed-assets/", self.data(), format="json").status_code, 400)
        self.assertEqual(FixedAsset.objects.count(), 0)

    def test_fully_depreciated_existing_asset_can_be_registered_and_disposed(self):
        asset = self.create(
            registration_mode="existing", acquisition_date="2020-01-01",
            residual_value="0.00", opening_depreciation="100.00",
            funding_account=None, confirm_existing_balances=True,
        )
        self.assertIsNone(asset["state"]["next_depreciation_date"])
        self.assertEqual(asset["state"]["net_book_value"], "0.00")
        response = self.action(asset["id"], "dispose", {
            "transaction_date": "2026-01-15", "proceeds": "0.00",
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)

    def test_existing_asset_disposal_cannot_precede_opening_snapshot(self):
        asset = self.create(
            registration_mode="existing", acquisition_date="2020-01-01",
            residual_value="0.00", opening_depreciation="100.00",
            funding_account=None, confirm_existing_balances=True,
        )
        response = self.action(asset["id"], "dispose", {
            "transaction_date": "2025-12-31", "proceeds": "0.00",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(FixedAssetEvent.objects.count(), 0)

    def test_cancelled_disposal_restores_depreciation_and_cancellation_is_manager_only(self):
        asset = self.acquired()
        self.depreciate(asset, "2026-01-31")
        response = self.disposal(asset)
        self.assertEqual(response.status_code, 201)
        url = f"/api/financials/fixed-asset-events/{response.data['id']}/cancel/"
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.api.post(url, {}, format="json").status_code, 403)
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.post(url, {}, format="json").status_code, 200)
        self.assertEqual(self.get(asset)["state"]["next_depreciation_date"], date(2026, 2, 28))
        self.depreciate(asset, "2026-02-28")

    def test_cancelled_acquisition_stays_unregistered_and_cannot_be_posted(self):
        asset = self.create()["id"]
        acquired = self.action(asset, "acquire").data
        response = self.action(asset, "cancel-acquisition")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["state"]["registered"])
        self.assertEqual(response.data["acquisition_status"], "void")
        self.assertEqual(self.post(acquired["acquisition_journal"]).status_code, 400)
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-31"}).status_code, 400)
        self.assertEqual(GeneralLedger.objects.count(), 0)

    def test_leap_year_month_end_and_residual_value(self):
        asset = self.acquired(acquisition_date="2024-01-15", depreciation_start="2024-01-01")
        self.depreciate(asset, "2024-01-31")
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2024-02-28"}).status_code, 400)
        self.depreciate(asset, "2024-02-29")
        self.depreciate(asset, "2024-03-31")
        self.assertEqual(self.get(asset)["state"]["net_book_value"], "10.00")

    def test_close_blocks_due_depreciation_and_period_locks_apply(self):
        asset = self.acquired()
        close_url = f"/api/financials/accounting-controls/{self.engagement.pk}/close/"
        data = {"closed_through": "2026-01-31", "reason": "Close January"}
        self.assertEqual(self.api.post(close_url, data, format="json").status_code, 400)
        self.depreciate(asset, "2026-01-31")
        self.assertEqual(self.api.post(close_url, data, format="json").status_code, 200)
        self.assertEqual(self.api.post("/api/financials/fixed-assets/", self.data(), format="json").status_code, 400)
        self.depreciate(asset, "2026-02-28")

    def test_draft_blocks_close_and_failed_actions_leave_no_history(self):
        asset = self.create()["id"]
        count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.action(asset, "depreciate", {"period_end": "2026-01-31"}).status_code, 400)
        self.assertEqual(FinancialAuditEvent.objects.count(), count)
        response = self.api.post(f"/api/financials/accounting-controls/{self.engagement.pk}/close/", {
            "closed_through": "2026-01-31", "reason": "Close",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(FinancialAuditEvent.objects.filter(object_type="fixedasset").exists())
        self.assertEqual(JournalEntry.objects.count(), 0)

    def test_duplicate_asset_number_and_draft_edit_delete(self):
        asset = self.create()
        self.assertEqual(self.api.post("/api/financials/fixed-assets/", self.data(asset_number=asset["asset_number"]), format="json").status_code, 400)
        self.assertEqual(self.api.patch(f"/api/financials/fixed-assets/{asset['id']}/", {"name": "Renamed"}, format="json").status_code, 200)
        self.assertEqual(self.api.delete(f"/api/financials/fixed-assets/{asset['id']}/").status_code, 204)
