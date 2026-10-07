from datetime import date
from smtplib import SMTPException
from unittest.mock import patch

from django.test import override_settings

from apps.identity.models import User
from . import test_subledgers
from .models import FinancialAuditEvent, JournalEntry
from .subledger_services import balance
from .trace import source_records


class InvoiceCompletionTests(test_subledgers.SubledgerTests):
    def refund(self, payment, **data):
        self.api.force_authenticate(self.manager)
        return self.api.post(f"/api/financials/payments/{payment}/refund/", {
            "transaction_date": "2026-03-01", "reason": "Customer receipt returned", **data,
        }, format="json")

    def posted_receipt(self, document):
        response = self.payment(document)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        return response.data

    def test_pdf_is_authenticated_and_drafts_are_downloadable(self):
        document = self.document()
        response = self.api.get(f"/api/financials/documents/{document['id']}/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(f"/api/financials/documents/{document['id']}/pdf/").status_code, 401)

    def test_delivery_requires_posted_invoice_customer_email_and_overdue_balance(self):
        document = self.document()
        url = f"/api/financials/documents/{document['id']}/delivery-preview/"
        self.assertEqual(self.api.get(url, {"kind": "invoice"}).status_code, 400)
        self.customer.email = "customer@example.test"
        self.customer.save()
        posted = self.posted_document()
        url = f"/api/financials/documents/{posted.pk}/delivery-preview/"
        self.assertEqual(self.api.get(url, {"kind": "reminder"}).status_code, 200)
        receipt = self.posted_receipt(posted)
        self.assertIsNotNone(receipt)
        self.assertEqual(self.api.get(url, {"kind": "reminder"}).status_code, 400)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
    def test_reviewed_delivery_and_history_with_pdf_attachment(self):
        self.customer.email = "customer@example.test"
        self.customer.save()
        document = self.posted_document()
        url = f"/api/financials/documents/{document.pk}/"
        preview = self.api.get(url + "delivery-preview/", {"kind": "invoice"}).data
        with (
            patch("apps.financials.invoice_services.EmailMessage.send", return_value=1) as send,
            patch("apps.financials.invoice_services.EmailMessage.attach") as attach,
        ):
            response = self.api.post(url + "send/", {"kind": "invoice", **preview}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        send.assert_called_once_with(fail_silently=False)
        self.assertEqual(attach.call_args.args[2], "application/pdf")
        self.assertTrue(attach.call_args.args[1].startswith(b"%PDF"))
        self.assertEqual(response.data["status"], "accepted_by_smtp")
        history = self.api.get(url + "delivery-history/")
        self.assertEqual(len(history.data), 1)
        self.assertEqual(history.data[0]["details"]["recipient"], self.customer.email)
        with patch("apps.financials.invoice_services.EmailMessage.send") as send:
            changed = self.api.post(url + "send/", {"kind": "invoice", **preview, "recipient": "different@example.test"}, format="json")
        self.assertEqual(changed.status_code, 400)
        send.assert_not_called()

    def test_console_email_is_not_reported_as_delivered(self):
        self.customer.email = "customer@example.test"
        self.customer.save()
        document = self.posted_document()
        url = f"/api/financials/documents/{document.pk}/"
        preview = self.api.get(url + "delivery-preview/", {"kind": "invoice"}).data
        with override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend"):
            self.assertEqual(self.api.post(url + "send/", {"kind": "invoice", **preview}, format="json").status_code, 400)
        self.assertFalse(FinancialAuditEvent.objects.filter(object_type="invoice_delivery").exists())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
    def test_smtp_failure_is_explicit_and_has_no_success_event(self):
        self.customer.email = "customer@example.test"
        self.customer.save()
        document = self.posted_document()
        url = f"/api/financials/documents/{document.pk}/"
        preview = self.api.get(url + "delivery-preview/", {"kind": "invoice"}).data
        with patch("apps.financials.invoice_services.EmailMessage.send", side_effect=SMTPException("test failure")):
            response = self.api.post(url + "send/", {"kind": "invoice", **preview}, format="json")
        self.assertEqual(response.status_code, 502)
        self.assertFalse(FinancialAuditEvent.objects.filter(object_type="invoice_delivery").exists())

    def test_full_refund_restores_balance_only_after_posting_and_respects_as_of(self):
        document = self.posted_document()
        payment = self.posted_receipt(document)
        self.assertEqual(balance(document)[0], 0)
        response = self.refund(payment["id"])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(balance(document, reserved=True)[0], 0)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        self.assertEqual(balance(document)[0], 118)
        self.assertEqual(balance(document, as_of=date(2026, 2, 28))[0], 0)
        self.assertEqual(balance(document, as_of=date(2026, 3, 1))[0], 118)
        self.assertEqual(JournalEntry.objects.get(pk=payment["journal"]).status, "posted")
        self.assertEqual(self.refund(payment["id"]).status_code, 400)
        self.assertEqual(source_records([response.data["journal"]], self.engagement.pk)[response.data["journal"]][0]["kind"], "receipt_refund")

    def test_refund_approval_policy_and_cancellation_preserve_reservations(self):
        document = self.posted_document()
        payment = self.posted_receipt(document)
        self.policy.require_journal_approval = True
        self.policy.save()
        response = self.refund(payment["id"])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "submitted")
        self.assertEqual(self.post(response.data["journal"]).status_code, 400)
        cancel = self.api.post(f"/api/financials/payments/{payment['id']}/cancel-refund/", {}, format="json")
        self.assertEqual(cancel.status_code, 200, cancel.data)
        self.assertEqual(cancel.data["refund_status"], "void")
        self.assertEqual(balance(document)[0], 0)
        self.assertEqual(self.refund(payment["id"]).status_code, 400)

    def test_foreign_receipt_refund_reverses_exact_fx_and_control_amounts(self):
        document = self.posted_document(currency="USD", rate="2500")
        response = self.payment(document, rate="2600", fx="FXGAIN")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        refund = self.refund(response.data["id"])
        self.assertEqual(refund.status_code, 201, refund.data)
        original = JournalEntry.objects.get(pk=response.data["journal"])
        reversal = JournalEntry.objects.get(pk=refund.data["journal"])
        originals = {line.account_id: line.debit - line.credit for line in original.lines.all()}
        reversed_amounts = {line.account_id: line.debit - line.credit for line in reversal.lines.all()}
        self.assertEqual(reversed_amounts, {account: -amount for account, amount in originals.items()})
        self.assertEqual(self.post(reversal.pk).status_code, 200)
        self.assertEqual(balance(document), (118, 295000))

    def test_refund_requires_independent_approval_when_enabled(self):
        document = self.posted_document()
        payment = self.posted_receipt(document)
        self.policy.require_journal_approval = True
        self.policy.save()
        response = self.refund(payment["id"])
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/financials/journal-entries/{response.data['journal']}/approve/"
        self.assertEqual(self.api.post(url, {}, format="json").status_code, 400)
        reviewer = User.objects.create_user(username="refund-reviewer", role="manager")
        self.api.force_authenticate(reviewer)
        self.assertEqual(self.api.post(url, {}, format="json").status_code, 200)
        self.assertEqual(self.post(response.data["journal"]).status_code, 200)
        self.assertEqual(balance(document)[0], 118)

    def test_refund_dates_roles_close_books_and_direct_mutations_are_guarded(self):
        document = self.posted_document()
        payment = self.posted_receipt(document)
        self.api.force_authenticate(self.staff)
        url = f"/api/financials/payments/{payment['id']}/refund/"
        self.assertEqual(self.api.post(url, {"transaction_date": "2026-03-01", "reason": "Test"}, format="json").status_code, 403)
        self.assertEqual(self.refund(payment["id"], transaction_date="2026-01-01").status_code, 400)
        self.policy.closed_through = date(2026, 3, 1)
        self.policy.save()
        self.assertEqual(self.refund(payment["id"]).status_code, 400)
        response = self.refund(payment["id"], transaction_date="2026-03-02")
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/financials/journal-entries/{response.data['journal']}/"
        self.assertEqual(self.api.patch(url, {"description": "Tampered"}, format="json").status_code, 400)
        self.assertEqual(self.api.delete(url).status_code, 400)

    def test_customer_statement_is_as_of_and_excludes_drafts(self):
        document = self.posted_document()
        self.document()
        self.posted_receipt(document)
        url = f"/api/financials/contacts/{self.customer.pk}/statement/"
        early = self.api.get(url, {"as_of": "2026-01-31"})
        self.assertEqual(early.status_code, 200, early.data)
        self.assertEqual(early.data["totals_by_currency"], {"TZS": "118.00"})
        later = self.api.get(url, {"as_of": "2026-02-01"})
        self.assertEqual(later.data["totals_by_currency"], {"TZS": "0.00"})
        self.assertEqual(len(later.data["rows"]), 1)
        pdf = self.api.get(url, {"as_of": "2026-02-01", "download": "pdf"})
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b"%PDF"))
        self.assertEqual(self.api.get(url).status_code, 400)
        self.assertEqual(self.api.get(f"/api/financials/contacts/{self.supplier.pk}/statement/", {"as_of": "2026-02-01"}).status_code, 400)

    def test_customer_statement_does_not_sum_mixed_currencies(self):
        self.posted_document()
        self.posted_document(currency="USD", rate="2500")
        response = self.api.get(f"/api/financials/contacts/{self.customer.pk}/statement/", {"as_of": "2026-01-31"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals_by_currency"], {"TZS": "118.00", "USD": "118.00"})
