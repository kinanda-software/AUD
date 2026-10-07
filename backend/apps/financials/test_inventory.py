from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, ChartOfAccount, FinancialAuditEvent, GeneralLedger,
    InventoryItem, InventoryMovement, JournalEntry,
)


class InventoryTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.manager = User.objects.create_user(username="stock-manager", role="manager")
        self.reviewer = User.objects.create_user(username="stock-reviewer", role="manager")
        self.staff = User.objects.create_user(username="stock-staff", role="staff")
        self.guest = User.objects.create_user(username="stock-guest", role="guest")
        self.api.force_authenticate(self.manager)
        client = Client.objects.create(client_code="ST", legal_name="Stock Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="ST", title="Inventory", start_date=date(2026, 1, 1),
        )
        self.policy = AccountingPolicy.objects.create(engagement=self.engagement, base_currency="TZS")
        self.accounts = {
            code: ChartOfAccount.objects.create(
                engagement=self.engagement, account_code=code, account_name=code, account_type=kind,
            )
            for code, kind in (
                ("STOCK", "asset"), ("BANK", "asset"), ("PAYABLE", "liability"),
                ("COGS", "expense"), ("ADJUST", "expense"), ("EQUITY", "equity"), ("GAIN", "revenue"),
            )
        }
        self.item = self.create_item()

    def item_data(self, **changes):
        return {
            "engagement": self.engagement.pk, "sku": f"SKU-{InventoryItem.objects.count() + 1}",
            "name": "Widgets", "unit": "each", "inventory_account": self.accounts["STOCK"].pk,
            "expense_account": self.accounts["COGS"].pk, **changes,
        }

    def create_item(self, **changes):
        response = self.api.post("/api/financials/inventory-items/", self.item_data(**changes), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def move(self, kind="receipt", quantity="10.0000", value="100.00", day="2026-01-01", item=None, **changes):
        data = {
            "kind": kind, "transaction_date": day, "quantity": quantity,
            "reason": "Inventory transaction", "reference": "STOCK",
        }
        if kind in ("receipt", "opening", "increase"):
            data["total_value"] = value
            data["offset_account"] = self.accounts[
                "EQUITY" if kind == "opening" else "ADJUST" if kind == "increase" else "BANK"
            ].pk
        if kind == "decrease":
            data["offset_account"] = self.accounts["ADJUST"].pk
        data.update(changes)
        return self.api.post(f"/api/financials/inventory-items/{item or self.item}/move/", data, format="json")

    def post(self, journal):
        return self.api.post(f"/api/financials/journal-entries/{journal}/post/", {}, format="json")

    def posted_move(self, **changes):
        response = self.move(**changes)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        return response.data

    def state(self, item=None):
        return self.api.get(f"/api/financials/inventory-items/{item or self.item}/").data["state"]

    def cancel(self, movement):
        return self.api.post(f"/api/financials/inventory-movements/{movement}/cancel/", {}, format="json")

    def test_receipts_and_issues_use_moving_weighted_average(self):
        self.posted_move()
        self.posted_move(quantity="10", value="300.00", day="2026-01-02")
        self.assertEqual(self.state()["quantity"], "20.0000")
        self.assertEqual(self.state()["value"], "400.00")
        self.assertEqual(self.state()["average_unit_cost"], "20.000000")
        issue = self.posted_move(kind="issue", quantity="5", day="2026-01-03")
        self.assertEqual(issue["value"], "100.00")
        self.assertEqual(self.state()["quantity"], "15.0000")
        self.assertEqual(self.state()["value"], "300.00")
        lines = GeneralLedger.objects.filter(journal_line__journal_entry=issue["journal"])
        amounts = {line.account.account_code: line.debit - line.credit for line in lines}
        self.assertEqual(amounts, {"STOCK": Decimal("-100"), "COGS": Decimal("100")})
        ledger_stock = GeneralLedger.objects.filter(account=self.accounts["STOCK"])
        self.assertEqual(sum((line.debit - line.credit for line in ledger_stock), Decimal("0")), Decimal("300"))

    def test_pending_receipts_do_not_change_stock_and_block_next_movement(self):
        receipt = self.move()
        self.assertEqual(receipt.status_code, 201)
        self.assertEqual(self.state()["quantity"], "0.0000")
        self.assertTrue(self.state()["pending_movement"])
        self.assertEqual(self.move(kind="issue", quantity="1").status_code, 400)
        self.assertEqual(self.move(quantity="1", value="5").status_code, 400)
        self.assertEqual(self.post(receipt.data["journal"]).status_code, 200)
        self.assertEqual(self.post(receipt.data["journal"]).status_code, 400)
        self.assertEqual(GeneralLedger.objects.count(), 2)

    def test_cancelled_issue_releases_stock_and_preserves_history(self):
        self.posted_move()
        issue = self.move(kind="issue", quantity="4")
        self.assertEqual(issue.status_code, 201)
        self.assertEqual(self.state()["quantity"], "10.0000")
        self.assertEqual(self.move(kind="issue", quantity="1").status_code, 400)
        response = self.cancel(issue.data["id"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["journal_status"], "void")
        self.assertEqual(self.post(issue.data["journal"]).status_code, 400)
        self.posted_move(kind="issue", quantity="10")
        self.assertEqual(self.state()["quantity"], "0.0000")
        self.assertEqual(InventoryMovement.objects.count(), 3)

    def test_negative_inventory_and_manual_issue_value_rejected_atomically(self):
        count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.move(kind="issue", quantity="1").status_code, 400)
        self.assertEqual(FinancialAuditEvent.objects.count(), count)
        self.posted_move()
        self.assertEqual(self.move(kind="issue", quantity="11").status_code, 400)
        self.assertEqual(self.move(kind="issue", quantity="1", total_value="1.00").status_code, 400)
        self.assertEqual(self.move(kind="issue", quantity="1", offset_account=self.accounts["ADJUST"].pk).status_code, 400)
        self.assertEqual(InventoryMovement.objects.count(), 1)

    def test_final_issue_absorbs_rounding_and_fractional_quantities(self):
        self.posted_move(quantity="0.3000", value="0.10")
        first = self.posted_move(kind="issue", quantity="0.1000")
        second = self.posted_move(kind="issue", quantity="0.1000")
        final = self.posted_move(kind="issue", quantity="0.1000")
        self.assertEqual([first["value"], second["value"], final["value"]], ["0.03", "0.04", "0.03"])
        self.assertEqual(self.state()["value"], "0.00")
        self.assertEqual(self.state()["average_unit_cost"], "0.000000")

    def test_zero_rounded_issue_and_zero_remaining_value_are_rejected(self):
        self.posted_move(quantity="10", value="0.01")
        self.assertEqual(self.move(kind="issue", quantity="1").status_code, 400)
        self.assertEqual(self.move(kind="issue", quantity="9").status_code, 400)
        self.posted_move(kind="issue", quantity="10")
        self.assertEqual(self.state()["quantity"], "0.0000")

    def test_register_only_opening_requires_confirmation_and_never_posts_again(self):
        response = self.move(kind="opening", register_only=True, offset_account=None)
        self.assertEqual(response.status_code, 400)
        response = self.move(
            kind="opening", register_only=True, offset_account=None, confirm_existing_balance=True,
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data["journal"])
        self.assertEqual(response.data["journal_status"], "posted")
        self.assertEqual(GeneralLedger.objects.count(), 0)
        self.assertEqual(self.state()["value"], "100.00")
        self.assertEqual(self.cancel(response.data["id"]).status_code, 400)
        self.assertEqual(self.move(kind="opening").status_code, 400)
        self.posted_move(kind="issue", quantity="4")
        self.assertEqual(self.state()["value"], "60.00")

    def test_journal_opening_and_opening_after_empty_stock_are_rejected(self):
        opening = self.posted_move(kind="opening")
        self.assertEqual(GeneralLedger.objects.get(account=self.accounts["EQUITY"]).credit, Decimal("100"))
        self.assertEqual(opening["quantity_before"], "0.0000")
        self.posted_move(kind="issue", quantity="10")
        self.assertEqual(self.move(kind="opening").status_code, 400)
        self.assertEqual(self.move(register_only=True, confirm_existing_balance=True).status_code, 400)

    def test_positive_and_negative_adjustments_post_correct_accounts(self):
        self.posted_move()
        increase = self.posted_move(kind="increase", quantity="5", value="100")
        self.assertEqual(self.state()["value"], "200.00")
        decrease = self.posted_move(kind="decrease", quantity="3")
        self.assertEqual(decrease["value"], "40.00")
        self.assertEqual(self.state()["quantity"], "12.0000")
        self.assertEqual(self.state()["value"], "160.00")
        self.assertEqual(GeneralLedger.objects.get(
            journal_line__journal_entry=increase["journal"], account=self.accounts["ADJUST"],
        ).credit, Decimal("100"))
        self.assertEqual(GeneralLedger.objects.get(
            journal_line__journal_entry=decrease["journal"], account=self.accounts["ADJUST"],
        ).debit, Decimal("40"))

    def test_backdating_rejected_but_same_date_is_sequential(self):
        self.posted_move(day="2026-02-01")
        self.assertEqual(self.move(day="2026-01-31").status_code, 400)
        self.posted_move(kind="issue", quantity="5", day="2026-02-01")
        self.posted_move(quantity="10", value="200", day="2026-02-01")
        self.assertEqual(self.state()["quantity"], "15.0000")
        self.assertEqual(self.state()["value"], "250.00")

    def test_manager_permissions_and_guest_read_only(self):
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.api.post("/api/financials/inventory-items/", self.item_data(), format="json").status_code, 403)
        for kind in ("opening", "increase", "decrease"):
            self.assertEqual(self.move(kind=kind).status_code, 403)
        receipt = self.move()
        self.assertEqual(receipt.status_code, 201)
        self.assertEqual(self.cancel(receipt.data["id"]).status_code, 403)
        self.assertEqual(self.post(receipt.data["journal"]).status_code, 200)
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.move(kind="issue", quantity="1").status_code, 403)
        self.assertEqual(self.api.get("/api/financials/inventory-items/").status_code, 200)

    def test_independent_approval_before_quantity_recognition(self):
        self.policy.require_journal_approval = True
        self.policy.save()
        receipt = self.move()
        self.assertEqual(receipt.data["journal_status"], "submitted")
        journal = receipt.data["journal"]
        self.assertEqual(self.post(journal).status_code, 400)
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/approve/").status_code, 400)
        self.api.force_authenticate(self.reviewer)
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/approve/").status_code, 200)
        self.assertEqual(self.post(journal).status_code, 200)
        self.assertEqual(self.state()["quantity"], "10.0000")

    def test_used_mappings_and_source_journals_are_immutable(self):
        receipt = self.posted_move()
        url = f"/api/financials/inventory-items/{self.item}/"
        for changes in ({"unit": "kg"}, {"sku": "NEW"}, {"inventory_account": self.accounts["BANK"].pk}):
            self.assertEqual(self.api.patch(url, changes, format="json").status_code, 400)
        self.assertEqual(self.api.patch(url, {"name": "Renamed"}, format="json").status_code, 200)
        self.assertEqual(self.api.delete(url).status_code, 400)
        journal = receipt["journal"]
        self.assertTrue(self.api.get(f"/api/financials/journal-entries/{journal}/").data["source_document"])
        self.assertEqual(self.api.patch(f"/api/financials/journal-entries/{journal}/", {"description": "Edit"}, format="json").status_code, 400)
        self.assertEqual(self.api.post(f"/api/financials/journal-entries/{journal}/reverse/", {
            "transaction_date": "2026-01-02", "entry_number": "REV", "reason": "test",
        }, format="json").status_code, 400)
        self.assertEqual(self.cancel(receipt["id"]).status_code, 400)

    def test_accounts_currency_inactive_items_and_input_validation(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="ST-OTHER", title="Other", start_date=date(2026, 1, 1),
        )
        foreign = ChartOfAccount.objects.create(engagement=other, account_code="F", account_name="Foreign", account_type="asset")
        for changes in (
            {"offset_account": foreign.pk}, {"offset_account": self.accounts["STOCK"].pk},
            {"offset_account": self.accounts["COGS"].pk}, {"quantity": "0"},
            {"quantity": "-1"}, {"quantity": "0.00001"}, {"total_value": "0"}, {"reason": ""},
        ):
            self.assertEqual(self.move(**changes).status_code, 400)
        self.assertEqual(self.move(kind="opening", register_only=True, confirm_existing_balance=True).status_code, 400)
        self.api.patch(f"/api/financials/inventory-items/{self.item}/", {"is_active": False}, format="json")
        self.assertEqual(self.move().status_code, 400)
        self.policy.base_currency = ""
        self.policy.save()
        self.assertEqual(self.api.post("/api/financials/inventory-items/", self.item_data(), format="json").status_code, 400)
        self.assertEqual(JournalEntry.objects.count(), 0)

    def test_stock_overflows_rollback_and_preserve_pending_state(self):
        self.posted_move(quantity="99999999999999.9999", value="9999999999999999.99")
        count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.move(quantity="0.0001", value="0.01").status_code, 400)
        self.assertEqual(FinancialAuditEvent.objects.count(), count)
        self.assertFalse(self.state()["pending_movement"])
        self.assertEqual(InventoryMovement.objects.count(), 1)
        self.posted_move(kind="issue", quantity="99999999999999.9999")
        self.assertEqual(self.state()["value"], "0.00")

    def test_value_overflow_rejected_even_when_quantity_is_in_range(self):
        self.posted_move(quantity="1", value="9999999999999999.99")
        response = self.move(quantity="1", value="0.01")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.state()["quantity"], "1.0000")
        self.assertFalse(self.state()["pending_movement"])
        self.assertEqual(InventoryMovement.objects.count(), 1)

    def test_cancelled_opening_can_be_reprepared_before_first_recognised_movement(self):
        opening = self.move(kind="opening")
        self.assertEqual(opening.status_code, 201)
        self.assertEqual(self.cancel(opening.data["id"]).status_code, 200)
        self.posted_move(kind="opening", quantity="5", value="80")
        self.assertEqual(self.state()["quantity"], "5.0000")
        self.assertEqual(self.move(kind="opening").status_code, 400)

    def test_item_accounts_must_match_engagement_and_expected_type(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="ST-ACCT", title="Other", start_date=date(2026, 1, 1),
        )
        foreign = ChartOfAccount.objects.create(engagement=other, account_code="F", account_name="Foreign", account_type="asset")
        for changes in (
            {"inventory_account": foreign.pk},
            {"inventory_account": self.accounts["COGS"].pk},
            {"expense_account": self.accounts["GAIN"].pk},
            {"inventory_account": self.accounts["EQUITY"].pk},
        ):
            self.assertEqual(self.api.post("/api/financials/inventory-items/", self.item_data(**changes), format="json").status_code, 400)

    def test_close_pending_and_closed_period_movement(self):
        receipt = self.move()
        url = f"/api/financials/accounting-controls/{self.engagement.pk}/close/"
        data = {"closed_through": "2026-01-31", "reason": "Close stock"}
        self.assertEqual(self.api.post(url, data, format="json").status_code, 400)
        self.assertEqual(self.post(receipt.data["journal"]).status_code, 200)
        self.assertEqual(self.api.post(url, data, format="json").status_code, 200)
        self.assertEqual(self.move(day="2026-01-31").status_code, 400)
        self.assertEqual(self.move(
            kind="opening", item=self.create_item(), day="2026-01-31",
            register_only=True, offset_account=None, confirm_existing_balance=True,
        ).status_code, 400)
        self.posted_move(day="2026-02-01")

    def test_list_filter_and_unused_item_edit_delete(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="ST-OTHER", title="Other", start_date=date(2026, 1, 1),
        )
        self.posted_move()
        response = self.api.get(f"/api/financials/inventory-movements/?engagement={other.pk}")
        self.assertEqual(response.data, [])
        self.assertEqual(self.api.get("/api/financials/inventory-movements/?engagement=bad").status_code, 400)
        self.assertEqual(self.api.post("/api/financials/inventory-items/", self.item_data(sku="SKU-1"), format="json").status_code, 400)
        item = self.create_item()
        url = f"/api/financials/inventory-items/{item}/"
        self.assertEqual(self.api.patch(url, {"unit": "kg"}, format="json").status_code, 200)
        self.assertEqual(self.api.delete(url).status_code, 204)

    def test_posting_revalidates_prepared_stock_baseline(self):
        self.posted_move()
        issue = self.move(kind="issue", quantity="5")
        # Simulate out-of-workflow data corruption; posting must not silently consume stale quantities.
        InventoryMovement.objects.filter(journal__status="posted").update(quantity_after=Decimal("6"))
        response = self.post(issue.data["journal"])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(GeneralLedger.objects.count(), 2)
        self.assertEqual(JournalEntry.objects.get(pk=issue.data["journal"]).status, "draft")
