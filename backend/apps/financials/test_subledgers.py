from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, ChartOfAccount, FinancialContact, FinancialDocument,
    FinancialPayment, FinancialTaxCode, FinancialAuditEvent, GeneralLedger, JournalEntry,
)


class SubledgerTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="sl-staff", role="staff")
        self.manager = User.objects.create_user(username="sl-manager", role="manager")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="SL", legal_name="Subledger Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="SL", title="Subledgers", start_date=date(2026, 1, 1),
        )
        self.policy = AccountingPolicy.objects.create(engagement=self.engagement, base_currency="TZS")
        self.accounts = {}
        for code, kind in (
            ("AR", "asset"), ("AP", "liability"), ("BANK", "asset"),
            ("REV", "revenue"), ("COST", "expense"), ("OUTPUT", "liability"),
            ("INPUT", "asset"), ("FXGAIN", "revenue"), ("FXLOSS", "expense"),
        ):
            self.accounts[code] = ChartOfAccount.objects.create(
                engagement=self.engagement, account_code=code, account_name=code, account_type=kind,
            )
        self.customer = FinancialContact.objects.create(
            engagement=self.engagement, kind="customer", name="Customer",
        )
        self.supplier = FinancialContact.objects.create(
            engagement=self.engagement, kind="supplier", name="Supplier",
        )
        self.tax = FinancialTaxCode.objects.create(
            engagement=self.engagement, name="Example 18%", rate="18.0000",
            sales_account=self.accounts["OUTPUT"], purchase_account=self.accounts["INPUT"],
        )

    def document(self, kind="invoice", amount="100.00", currency="TZS", rate="1", original=None):
        sales = kind in ("invoice", "sales_credit")
        data = {
            "engagement": self.engagement.pk, "kind": kind,
            "number": f"D{FinancialDocument.objects.count() + 1}",
            "contact": (self.customer if sales else self.supplier).pk,
            "transaction_date": "2026-01-01", "due_date": "2026-01-31",
            "currency": currency, "exchange_rate": rate,
            "control_account": self.accounts["AR" if sales else "AP"].pk,
            "lines": [{
                "account": self.accounts["REV" if sales else "COST"].pk,
                "description": "Service", "net_amount": amount, "tax_code": self.tax.pk,
            }],
        }
        if original:
            data["original"] = original
        response = self.api.post("/api/financials/documents/", data, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def action(self, pk, name, data=None):
        return self.api.post(f"/api/financials/documents/{pk}/{name}/", data or {}, format="json")

    def post(self, journal):
        return self.api.post(f"/api/financials/journal-entries/{journal}/post/", {}, format="json")

    def posted_document(self, **options):
        document = self.document(**options)
        response = self.action(document["id"], "prepare")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        return FinancialDocument.objects.get(pk=document["id"])

    def payment(self, document, amount="118.00", rate="1", date="2026-02-01", fx=None):
        data = {
            "amount": amount, "exchange_rate": rate, "transaction_date": date,
            "bank_account": self.accounts["BANK"].pk, "reference": "Payment",
        }
        if fx:
            data["fx_account"] = self.accounts[fx].pk
        return self.action(document.pk, "pay", data)

    def test_invoice_and_bill_post_correct_double_entries_and_tax(self):
        for kind, control, net, tax, sign in (
            ("invoice", "AR", "REV", "OUTPUT", Decimal("1")),
            ("bill", "AP", "COST", "INPUT", Decimal("-1")),
        ):
            with self.subTest(kind=kind):
                document = self.posted_document(kind=kind)
                ledger = GeneralLedger.objects.filter(journal_line__journal_entry=document.journal)
                self.assertEqual(sum((line.debit - line.credit for line in ledger), Decimal("0")), 0)
                amounts = {line.account.account_code: line.debit - line.credit for line in ledger}
                self.assertEqual(amounts[control], sign * 118)
                self.assertEqual(amounts[net], -sign * 100)
                self.assertEqual(amounts[tax], -sign * 18)
                self.assertEqual(document.lines.get().tax_rate, Decimal("18"))

    def test_partial_payments_reserve_pending_amounts_and_clear_when_posted(self):
        document = self.posted_document()
        first = self.payment(document, "50.00")
        self.assertEqual(first.status_code, 201, first.data)
        second = self.payment(document, "69.00")
        self.assertEqual(second.status_code, 400)
        response = self.api.get(f"/api/financials/documents/{document.pk}/")
        self.assertEqual(response.data["outstanding"], "118.00")
        self.assertEqual(response.data["available_to_settle"], "68.00")
        self.assertEqual(self.post(first.data["journal"]).status_code, 200)
        final = self.payment(document, "68.00")
        self.assertEqual(final.status_code, 201)
        self.assertEqual(self.post(final.data["journal"]).status_code, 200)
        self.assertEqual(self.api.get(
            f"/api/financials/documents/{document.pk}/",
        ).data["outstanding"], "0.00")

    def test_foreign_currency_payment_records_realised_fx(self):
        document = self.posted_document(currency="USD", rate="2500")
        response = self.payment(document, "118.00", rate="2600", fx="FXGAIN")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["base_amount"], "306800.00")
        self.assertEqual(response.data["control_base_amount"], "295000.00")
        self.assertEqual(response.data["fx_difference"], "-11800.00")
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        fx = GeneralLedger.objects.get(account=self.accounts["FXGAIN"])
        self.assertEqual(fx.credit, Decimal("11800"))

    def test_bill_foreign_payment_loss_sign_and_wrong_fx_account(self):
        document = self.posted_document(kind="bill", currency="USD", rate="2500")
        self.assertEqual(self.payment(document, rate="2600", fx="FXGAIN").status_code, 400)
        response = self.payment(document, rate="2600", fx="FXLOSS")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["fx_difference"], "11800.00")
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)

    def test_base_currency_requires_rate_one_and_configuration(self):
        data = self.document()
        response = self.api.patch(f"/api/financials/documents/{data['id']}/", {
            "exchange_rate": "2",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.policy.base_currency = ""
        self.policy.save()
        response = self.api.patch(f"/api/financials/documents/{data['id']}/", {
            "exchange_rate": "1",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_credit_note_reduces_balance_and_tax_summary_only_after_posting(self):
        original = self.posted_document()
        credit = self.document(kind="sales_credit", amount="20.00", original=original.pk)
        prepared = self.action(credit["id"], "prepare")
        self.assertEqual(prepared.status_code, 200, prepared.data)
        self.assertEqual(self.post(prepared.data["journal"]).status_code, 200)
        response = self.api.get(f"/api/financials/documents/{original.pk}/")
        self.assertEqual(response.data["outstanding"], "94.40")
        response = self.api.get("/api/financials/subledger-reports/tax-summary/", {
            "engagement": self.engagement.pk, "date_from": "2026-01-01", "date_to": "2026-01-31",
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["rows"][0]["sales_net"], "80.00")
        self.assertEqual(response.data["rows"][0]["sales_tax"], "14.40")

    def test_credit_cannot_exceed_original_pending_balance(self):
        original = self.posted_document()
        payment = self.payment(original, "100.00")
        self.assertEqual(payment.status_code, 201)
        credit = self.document(kind="sales_credit", amount="20.00", original=original.pk)
        event_count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.action(credit["id"], "prepare").status_code, 400)
        self.assertIsNone(FinancialDocument.objects.get(pk=credit["id"]).journal_id)
        self.assertEqual(FinancialAuditEvent.objects.count(), event_count)

    def test_source_journal_is_immutable_and_cannot_be_reversed_directly(self):
        document = self.posted_document()
        response = self.api.post(f"/api/financials/journal-entries/{document.journal_id}/reverse/", {
            "entry_number": "BYPASS", "transaction_date": "2026-02-01", "reason": "Bypass",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.api.patch(f"/api/financials/documents/{document.pk}/", {
            "number": "CHANGED",
        }, format="json").status_code, 400)
        self.assertEqual(self.api.delete(f"/api/financials/documents/{document.pk}/").status_code, 400)
        draft = self.document()
        prepared = self.action(draft["id"], "prepare")
        journal = prepared.data["journal"]
        self.assertEqual(self.api.patch(f"/api/financials/journal-entries/{journal}/", {
            "description": "BYPASS",
        }, format="json").status_code, 400)
        line = JournalEntry.objects.get(pk=journal).lines.first()
        self.assertEqual(self.api.delete(f"/api/financials/journal-lines/{line.pk}/").status_code, 400)

    def test_approval_enabled_sources_require_independent_approval(self):
        self.policy.require_journal_approval = True
        self.policy.save()
        document = self.document()
        prepared = self.action(document["id"], "prepare")
        self.assertEqual(prepared.data["journal_status"], "submitted")
        self.assertEqual(self.post(prepared.data["journal"]).status_code, 400)
        self.api.force_authenticate(self.manager)
        response = self.api.post(f"/api/financials/journal-entries/{prepared.data['journal']}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.post(prepared.data["journal"]).status_code, 200)

    def test_ageing_as_of_excludes_future_settlements(self):
        document = self.posted_document()
        payment = self.payment(document, "118.00", date="2026-03-01")
        self.assertEqual(self.post(payment.data["journal"]).status_code, 200)
        response = self.api.get("/api/financials/subledger-reports/ageing/", {
            "engagement": self.engagement.pk, "kind": "invoice", "as_of": "2026-02-15",
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["buckets"]["1_30"], "118.00")
        later = self.api.get("/api/financials/subledger-reports/ageing/", {
            "engagement": self.engagement.pk, "kind": "invoice", "as_of": "2026-03-01",
        })
        self.assertEqual(later.data["base_total"], "0.00")

    def test_cancel_pending_payment_releases_reservation_and_cannot_cancel_posted(self):
        document = self.posted_document()
        payment = self.payment(document)
        self.api.force_authenticate(self.manager)
        response = self.api.post(f"/api/financials/payments/{payment.data['id']}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["journal_status"], "void")
        replacement = self.payment(document)
        self.assertEqual(replacement.status_code, 201)
        self.assertEqual(self.post(replacement.data["journal"]).status_code, 200)
        self.assertEqual(self.api.post(
            f"/api/financials/payments/{replacement.data['id']}/cancel/", {}, format="json",
        ).status_code, 400)

    def test_tax_mapping_immutable_after_use_and_guest_read_only(self):
        self.document()
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.patch(f"/api/financials/tax-codes/{self.tax.pk}/", {
            "rate": "20",
        }, format="json").status_code, 400)
        guest = User.objects.create_user(username="sl-guest", role="guest")
        self.api.force_authenticate(guest)
        self.assertEqual(self.api.post("/api/financials/contacts/", {
            "engagement": self.engagement.pk, "kind": "customer", "name": "BYPASS",
        }, format="json").status_code, 403)
        self.assertEqual(self.api.get("/api/financials/documents/").status_code, 200)

    def test_period_close_blocks_documents_and_payments(self):
        document = self.posted_document()
        self.policy.closed_through = date(2026, 2, 28)
        self.policy.save()
        self.assertEqual(self.payment(document).status_code, 400)
        self.assertFalse(FinancialPayment.objects.exists())

    def test_tax_rounding_and_base_residual_are_exact(self):
        document = self.posted_document(amount="0.03", currency="USD", rate="1.33333333")
        line = document.lines.get()
        self.assertEqual(line.tax_amount, Decimal("0.01"))
        self.assertEqual(line.base_net, Decimal("0.04"))
        self.assertEqual(line.base_tax, Decimal("0.01"))
        first = self.payment(document, "0.01", rate="1.33333333")
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(self.post(first.data["journal"]).status_code, 200)
        final = self.payment(document, "0.03", rate="1.33333333")
        self.assertEqual(final.status_code, 201, final.data)
        self.assertEqual(self.post(final.data["journal"]).status_code, 200)
        ar = GeneralLedger.objects.filter(account=self.accounts["AR"])
        self.assertEqual(sum((line.debit - line.credit for line in ar), Decimal("0")), 0)

    def test_purchase_credit_reverses_expense_and_input_tax(self):
        original = self.posted_document(kind="bill")
        credit = self.document(kind="purchase_credit", amount="10.00", original=original.pk)
        prepared = self.action(credit["id"], "prepare")
        self.assertEqual(prepared.status_code, 200, prepared.data)
        self.assertEqual(self.post(prepared.data["journal"]).status_code, 200)
        ledger = GeneralLedger.objects.filter(journal_line__journal_entry_id=prepared.data["journal"])
        amounts = {entry.account.account_code: entry.debit - entry.credit for entry in ledger}
        self.assertEqual(amounts["AP"], Decimal("11.80"))
        self.assertEqual(amounts["COST"], Decimal("-10.00"))
        self.assertEqual(amounts["INPUT"], Decimal("-1.80"))

    def test_cancel_unposted_document_returns_actual_status(self):
        document = self.document()
        self.action(document["id"], "prepare")
        self.api.force_authenticate(self.manager)
        response = self.action(document["id"], "cancel")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["journal_status"], "void")
        self.assertEqual(self.post(response.data["journal"]).status_code, 400)

    def test_converted_amount_overflow_returns_validation_error_and_rolls_back(self):
        document = self.document()
        event_count = FinancialAuditEvent.objects.count()
        response = self.api.patch(f"/api/financials/documents/{document['id']}/", {
            "currency": "USD", "exchange_rate": "9999999999.99999999",
            "lines": [{
                "account": self.accounts["REV"].pk, "description": "Overflow",
                "net_amount": "9999999999999999.99",
            }],
        }, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(FinancialAuditEvent.objects.count(), event_count)
        saved = FinancialDocument.objects.get(pk=document["id"])
        self.assertEqual(saved.currency, "TZS")
        self.assertEqual(saved.lines.get().net_amount, Decimal("100.00"))

    def test_wrong_contact_type_and_cross_engagement_accounts_are_rejected(self):
        document = self.document()
        response = self.api.patch(f"/api/financials/documents/{document['id']}/", {
            "contact": self.supplier.pk,
        }, format="json")
        self.assertEqual(response.status_code, 400)
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="SL2", title="Other", start_date=date(2026, 1, 1),
        )
        foreign = ChartOfAccount.objects.create(
            engagement=other, account_code="FOR", account_name="Foreign", account_type="revenue",
        )
        response = self.api.patch(f"/api/financials/documents/{document['id']}/", {
            "lines": [{"account": foreign.pk, "description": "Cross engagement", "net_amount": "10.00"}],
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_used_zero_tax_code_cannot_be_prepared_when_deactivated(self):
        self.tax.rate = 0
        self.tax.save()
        document = self.document()
        self.tax.is_active = False
        self.tax.save()
        self.assertEqual(self.action(document["id"], "prepare").status_code, 400)
        self.assertIsNone(FinancialDocument.objects.get(pk=document["id"]).journal_id)

    def test_configured_base_currency_blocks_mislabeled_trial_balance(self):
        response = self.api.post("/api/financials/trial-balances/", {
            "engagement": self.engagement.pk, "currency": "USD",
            "period_start": "2026-01-01", "period_end": "2026-12-31",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_fixed_base_currency_cannot_change_and_legacy_confirmation_is_required(self):
        self.api.force_authenticate(self.manager)
        controls = f"/api/financials/accounting-controls/{self.engagement.pk}/configure/"
        response = self.api.post(controls, {
            "require_journal_approval": False, "base_currency": "USD",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.posted_document()
        self.policy.base_currency = ""
        self.policy.save()
        response = self.api.post(controls, {
            "require_journal_approval": False, "base_currency": "TZS",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        response = self.api.post(controls, {
            "require_journal_approval": False, "base_currency": "TZS", "confirm_legacy_currency": True,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["base_currency"], "TZS")

    def test_draft_source_documents_block_period_close(self):
        self.document()
        self.api.force_authenticate(self.manager)
        response = self.api.post(
            f"/api/financials/accounting-controls/{self.engagement.pk}/close/",
            {"closed_through": "2026-01-31", "reason": "Close"}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.policy.refresh_from_db()
        self.assertIsNone(self.policy.closed_through)

    def test_duplicate_document_number_returns_400(self):
        document = self.document()
        duplicate = {
            key: document[key] for key in (
                "engagement", "kind", "number", "contact", "transaction_date", "due_date",
                "currency", "exchange_rate", "control_account", "original",
            )
        }
        duplicate["lines"] = [{
            "account": self.accounts["REV"].pk, "description": "Duplicate", "net_amount": "1.00",
        }]
        self.assertEqual(self.api.post(
            "/api/financials/documents/", duplicate, format="json",
        ).status_code, 400)
