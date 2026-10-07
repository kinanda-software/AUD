from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, ChartOfAccount, FinancialAuditEvent, GeneralLedger,
    JournalEntry, TrialBalance,
)


class AccountingControlTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="bookkeeper", role="staff")
        self.manager = User.objects.create_user(username="accounting-manager", role="manager")
        self.guest = User.objects.create_user(username="accounting-guest", role="guest")
        client = Client.objects.create(client_code="AC", legal_name="Accounting Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="AC", title="Accounting",
            start_date=date(2026, 1, 1),
        )
        self.cash = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="100", account_name="Cash",
            account_type="asset",
        )
        self.equity = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="300", account_name="Capital",
            account_type="equity",
        )
        self.controls = f"/api/financials/accounting-controls/{self.engagement.pk}/"
        self.api.force_authenticate(self.staff)

    def journal(self, number="J1", transaction_date="2026-01-01"):
        return self.api.post("/api/financials/journal-entries/", {
            "engagement": self.engagement.pk,
            "entry_number": number, "transaction_date": transaction_date,
            "description": "Capital contribution",
            "lines": [
                {"account": self.cash.pk, "debit": "100.00", "credit": "0.00"},
                {"account": self.equity.pk, "debit": "0.00", "credit": "100.00"},
            ],
        }, format="json")

    def journal_action(self, pk, action, data=None):
        return self.api.post(
            f"/api/financials/journal-entries/{pk}/{action}/",
            data or {}, format="json",
        )

    def test_opt_in_approval_and_independent_preparer(self):
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.post(self.controls + "configure/", {
            "require_journal_approval": True,
        }, format="json").status_code, 200)
        response = self.journal()
        self.assertEqual(response.status_code, 201)
        pk = response.data["id"]
        self.assertEqual(self.journal_action(pk, "post").status_code, 400)
        self.assertEqual(self.journal_action(pk, "submit").status_code, 200)
        self.assertEqual(self.journal_action(pk, "approve").status_code, 400)
        other_manager = User.objects.create_user(username="other-manager", role="manager")
        self.api.force_authenticate(other_manager)
        self.assertEqual(self.journal_action(pk, "approve").status_code, 200)
        self.assertEqual(self.journal_action(pk, "post").status_code, 200)
        journal = JournalEntry.objects.get(pk=pk)
        self.assertEqual(journal.approved_by, other_manager)
        self.assertEqual(GeneralLedger.objects.count(), 2)
        self.assertEqual(self.journal_action(pk, "post").status_code, 400)
        self.assertEqual(GeneralLedger.objects.count(), 2)

    def test_submitted_header_and_lines_are_frozen(self):
        pk = self.journal().data["id"]
        self.assertEqual(self.journal_action(pk, "submit").status_code, 200)
        response = self.api.patch(f"/api/financials/journal-entries/{pk}/", {
            "description": "Changed",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        line = JournalEntry.objects.get(pk=pk).lines.first()
        response = self.api.patch(f"/api/financials/journal-lines/{line.pk}/", {
            "debit": "110.00",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.api.delete(
            f"/api/financials/journal-lines/{line.pk}/",
        ).status_code, 400)

    def test_return_to_draft_clears_approval_and_records_reason(self):
        pk = self.journal().data["id"]
        self.journal_action(pk, "submit")
        self.api.force_authenticate(self.manager)
        self.journal_action(pk, "approve")
        response = self.journal_action(pk, "return-to-draft", {"reason": "Check source evidence"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "draft")
        self.assertIsNone(response.data["approved_by"])
        event = FinancialAuditEvent.objects.filter(
            object_type="journalentry", object_id=str(pk),
        ).first()
        self.assertEqual(event.details["reason"], "Check source evidence")
        self.assertEqual(event.details["before"]["status"], "approved")
        self.assertEqual(event.details["after"]["status"], "draft")

    def test_direct_status_changes_and_direct_approved_ledger_bypass_are_rejected(self):
        pk = self.journal().data["id"]
        response = self.api.patch(f"/api/financials/journal-entries/{pk}/", {
            "status": "posted",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        AccountingPolicy.objects.update_or_create(
            engagement=self.engagement, defaults={"require_journal_approval": True},
        )
        response = self.api.post("/api/financials/general-ledger/", {
            "engagement": self.engagement.pk, "account": self.cash.pk,
            "transaction_date": "2026-01-01", "description": "Bypass",
            "debit": "100.00", "credit": "0.00", "status": "posted",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(GeneralLedger.objects.exists())

    def test_close_and_reopen_enforce_transaction_date_and_manager_permission(self):
        pk = self.journal().data["id"]
        self.assertEqual(self.journal_action(pk, "post").status_code, 200)
        data = {"closed_through": "2026-01-31", "reason": "January signed off"}
        self.assertEqual(self.api.post(
            self.controls + "close/", data, format="json",
        ).status_code, 403)
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.post(
            self.controls + "close/", data, format="json",
        ).status_code, 200)
        self.assertEqual(self.journal("CLOSED", "2026-01-31").status_code, 400)
        self.assertFalse(JournalEntry.objects.filter(entry_number="CLOSED").exists())
        self.assertEqual(self.journal("OPEN", "2026-02-01").status_code, 201)
        self.assertEqual(self.api.post(self.controls + "reopen/", {
            "reason": "Approved correction",
        }, format="json").status_code, 200)
        self.assertEqual(self.journal("CORRECTION", "2026-01-31").status_code, 201)

    def test_close_rejects_pending_journals(self):
        self.journal()
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.post(self.controls + "close/", {
            "closed_through": "2026-01-31", "reason": "Close",
        }, format="json").status_code, 400)
        self.assertIsNone(AccountingPolicy.objects.get(
            engagement=self.engagement,
        ).closed_through)

    def test_reversal_creates_linked_draft_and_preserves_original(self):
        pk = self.journal().data["id"]
        self.journal_action(pk, "post")
        response = self.journal_action(pk, "reverse", {
            "entry_number": "REV1", "transaction_date": "2026-02-01",
            "reason": "Reverse accrual",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["reversal_of"], pk)
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(self.journal_action(response.data["id"], "post").status_code, 200)
        self.assertEqual(sum((entry.debit - entry.credit for entry in
                              GeneralLedger.objects.filter(account=self.cash)), Decimal("0")), 0)
        self.assertEqual(JournalEntry.objects.get(pk=pk).status, "posted")
        self.assertEqual(self.journal_action(pk, "reverse", {
            "entry_number": "REV2", "transaction_date": "2026-02-01",
            "reason": "Duplicate",
        }).status_code, 400)
        entry = GeneralLedger.objects.first()
        self.assertEqual(self.api.patch(
            f"/api/financials/general-ledger/{entry.pk}/",
            {"description": "Changed"}, format="json",
        ).status_code, 400)
        self.assertEqual(self.api.delete(
            f"/api/financials/general-ledger/{entry.pk}/",
        ).status_code, 400)

    def test_opening_balances_are_included_in_later_trial_balances(self):
        self.api.force_authenticate(self.manager)
        response = self.api.post(self.controls + "opening-balances/", {
            "entry_number": "OPENING", "transaction_date": "2026-01-01",
            "description": "Conversion balances",
            "lines": [
                {"account": self.cash.pk, "debit": "100.00", "credit": "0.00"},
                {"account": self.equity.pk, "debit": "0.00", "credit": "100.00"},
            ],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.journal_action(response.data["id"], "post").status_code, 200)
        tb = TrialBalance.objects.create(
            engagement=self.engagement,
            period_start=date(2026, 2, 1), period_end=date(2026, 2, 28),
        )
        response = self.api.post(
            f"/api/financials/trial-balances/{tb.pk}/generate-from-gl/",
            {}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["includes_opening_balances"])
        self.assertEqual(tb.total_debit, Decimal("100.00"))
        self.assertEqual(tb.total_credit, Decimal("100.00"))
        self.assertEqual(self.journal("BEFORE", "2025-12-31").status_code, 400)

    def test_guest_cannot_write_and_core_history_has_actor(self):
        response = self.journal()
        self.assertEqual(response.status_code, 201)
        event = FinancialAuditEvent.objects.filter(
            object_type="journalentry", object_id=str(response.data["id"]),
        ).get()
        self.assertEqual(event.actor, self.staff)
        self.assertIsNone(event.details["before"])
        self.assertEqual(event.details["after"]["entry_number"], "J1")
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.journal("GUEST").status_code, 403)
        self.assertEqual(self.api.get(
            "/api/financials/journal-entries/",
        ).status_code, 200)

    def test_reading_policy_has_no_write_side_effects(self):
        response = self.api.get(self.controls)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["require_journal_approval"])
        self.assertFalse(response.data["can_manage"])
        self.assertFalse(AccountingPolicy.objects.exists())
        self.assertFalse(FinancialAuditEvent.objects.exists())

    def test_unbalanced_opening_request_rolls_back_policy_and_history(self):
        self.api.force_authenticate(self.manager)
        response = self.api.post(self.controls + "opening-balances/", {
            "entry_number": "BAD-OPENING", "transaction_date": "2026-01-01",
            "description": "Unbalanced opening balances",
            "lines": [
                {"account": self.cash.pk, "debit": "100.00", "credit": "0.00"},
                {"account": self.equity.pk, "debit": "0.00", "credit": "99.99"},
            ],
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(AccountingPolicy.objects.exists())
        self.assertFalse(JournalEntry.objects.exists())
        self.assertFalse(FinancialAuditEvent.objects.exists())

    def test_pending_opening_prevents_other_postings_and_cannot_be_deleted(self):
        self.api.force_authenticate(self.manager)
        response = self.api.post(self.controls + "opening-balances/", {
            "entry_number": "OPENING", "transaction_date": "2026-01-01",
            "description": "Opening balances",
            "lines": [
                {"account": self.cash.pk, "debit": "100.00", "credit": "0.00"},
                {"account": self.equity.pk, "debit": "0.00", "credit": "100.00"},
            ],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        opening_pk = response.data["id"]
        other = self.journal("OTHER", "2026-02-01")
        self.assertEqual(other.status_code, 201)
        event_count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.journal_action(other.data["id"], "post").status_code, 400)
        self.assertFalse(GeneralLedger.objects.exists())
        self.assertEqual(FinancialAuditEvent.objects.count(), event_count)
        self.assertEqual(self.api.delete(
            f"/api/financials/journal-entries/{opening_pk}/",
        ).status_code, 400)
        self.assertEqual(self.journal_action(opening_pk, "post").status_code, 200)

    def test_unbalanced_draft_posting_does_not_partially_write_ledger(self):
        pk = self.journal().data["id"]
        line = JournalEntry.objects.get(pk=pk).lines.get(account=self.cash)
        line.debit = Decimal("100.01")
        line.save()
        event_count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.journal_action(pk, "post").status_code, 400)
        self.assertFalse(GeneralLedger.objects.exists())
        self.assertEqual(JournalEntry.objects.get(pk=pk).status, "draft")
        self.assertEqual(FinancialAuditEvent.objects.count(), event_count)

    def test_legacy_posted_journal_requires_manual_reconciliation_before_reversal(self):
        pk = self.journal().data["id"]
        JournalEntry.objects.filter(pk=pk).update(status="posted")
        response = self.journal_action(pk, "reverse", {
            "entry_number": "LEGACY-REV", "transaction_date": "2026-02-01",
            "reason": "Legacy correction",
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("provenance", str(response.data))
        self.assertFalse(JournalEntry.objects.filter(reversal_of_id=pk).exists())
