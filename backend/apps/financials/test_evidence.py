import hashlib
from datetime import date
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError as APIValidationError

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .evidence_services import validate_upload
from .models import (
    AccountingPolicy, Adjustment, ChartOfAccount, FinancialAuditEvent, FinancialContact, FinancialDocument,
    FinancialEvidence, FinancialEvidenceLink, FinancialIntelligenceRun, FinancialPayment,
    FixedAsset, FixedAssetEvent, GeneralLedger, InventoryItem, InventoryMovement,
    JournalEntry, LeadSchedule, SupportingDetail, TrialBalance, TrialBalanceLine,
)


class EvidenceTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="evidence-staff", role="staff")
        self.guest = User.objects.create_user(username="evidence-guest", role="guest")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="EVID", legal_name="Evidence Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="EVID", title="Evidence", start_date=date(2026, 1, 1),
            lead_auditor=self.staff,
        )
        self.account = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="CASH", account_name="Cash", account_type="asset",
        )
        self.expense = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="EXP", account_name="Expense", account_type="expense",
        )
        self.tb = TrialBalance.objects.create(
            engagement=self.engagement, period_start=date(2026, 1, 1), period_end=date(2026, 12, 31),
        )
        TrialBalanceLine.objects.create(
            trial_balance=self.tb, account=self.account, account_code="CASH", account_name="Cash", debit=100,
        )
        self.url = "/api/financials/evidence/"
        self.link_url = "/api/financials/evidence-links/"

    def upload(self, filename="support.pdf", content=b"%PDF-1.7\nTest fixture", **changes):
        return self.api.post(self.url, {
            "engagement": self.engagement.pk, "title": "Support", "description": "Audit support",
            "file": SimpleUploadedFile(filename, content, content_type="application/octet-stream"), **changes,
        }, format="multipart")

    def evidence(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def link(self, evidence, kind="account_trace", target=None, selector=None, **changes):
        return self.api.post(self.link_url, {
            "evidence": evidence, "target_kind": kind, "target_id": target or self.tb.pk,
            "selector": self.account.pk if selector is None else selector, "note": "Supports this test", **changes,
        }, format="json")

    def run_record(self):
        return FinancialIntelligenceRun.objects.create(
            engagement=self.engagement, name="Run", algorithm_version="journal-screen-v1",
            parameters={}, population_fingerprint="a" * 64, population_count=1, sample_count=1, finding_count=1,
            results={"findings": [{"rule": "weekend_date", "journal_ids": [1], "message": "Weekend"}]},
        )

    def test_upload_metadata_hash_and_authenticated_download_exact_bytes(self):
        data = self.evidence()
        content = b"%PDF-1.7\nTest fixture"
        self.assertNotIn("content", data)
        self.assertEqual(data["sha256"], hashlib.sha256(content).hexdigest())
        self.assertEqual(data["size"], len(content))
        self.assertEqual(data["content_type"], "application/pdf")
        response = self.api.get(f"{self.url}{data['id']}/download/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), content)
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertEqual(response["Content-Type"], "application/octet-stream")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(f"{self.url}{data['id']}/download/").status_code, (401, 403))

    def test_engagement_access_for_evidence_metadata_links_downloads_and_uploads(self):
        from apps.audit_planning.models import AuditTeamMember

        data = self.evidence()
        link = self.link(data["id"]).data
        outsider = User.objects.create_user(username="evidence-outsider", role="auditor")
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="PRIVATE-EVID", title="Private",
            start_date=date(2026, 1, 1), lead_auditor=outsider,
        )
        for user in (outsider, self.guest):
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk}).data["count"], 0)
            for endpoint in (
                f"{self.url}{data['id']}/", f"{self.url}{data['id']}/download/",
                f"{self.link_url}{link['id']}/",
            ):
                self.assertEqual(self.api.get(endpoint).status_code, 404)
            self.assertEqual(self.upload().status_code, 403)
            self.assertEqual(self.link(data["id"]).status_code, 403)
        AuditTeamMember.objects.create(engagement=self.engagement, user=outsider, role="auditor")
        self.api.force_authenticate(outsider)
        self.assertEqual(self.api.get(f"{self.url}{data['id']}/").status_code, 200)
        self.assertEqual(self.api.get(f"{self.url}{data['id']}/download/").status_code, 200)
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.upload(engagement=other.pk).status_code, 403)
        for role in ("admin", "manager", "partner"):
            user = User.objects.create_user(username=f"evidence-{role}", role=role)
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(f"{self.url}{data['id']}/").status_code, 200)

    def test_allowlisted_signatures_utf8_and_untrusted_mime(self):
        for filename, content, mime in (
            ("file.pdf", b"%PDF-1.4\nfixture", "application/pdf"),
            ("file.png", b"\x89PNG\r\n\x1a\nfixture", "image/png"),
            ("file.jpeg", b"\xff\xd8\xfffixture", "image/jpeg"),
            ("file.csv", b"\xef\xbb\xbfdate,amount\n2026-01-01,5\n", "text/csv"),
            ("file.TXT", "support café".encode("utf-8"), "text/plain"),
        ):
            response = self.upload(filename, content)
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data["content_type"], mime)

    def test_invalid_files_are_rejected_without_rows_or_audit_events(self):
        for filename, content in (
            ("file.exe", b"program"), ("file.html", b"<html>"), ("file.pdf", b"not a PDF"),
            ("file.png", b"not a PNG"), ("file.jpg", b"not JPEG"),
            ("empty.txt", b""), ("binary.txt", b"\xff\xff"), ("null.csv", b"a,\x00"),
        ):
            response = self.upload(filename, content)
            self.assertEqual(response.status_code, 400, response.data)
        with patch("apps.financials.evidence_services.MAX_EVIDENCE_SIZE", 4):
            response = self.upload("big.txt", b"12345")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(FinancialEvidence.objects.count(), 0)
        self.assertEqual(FinancialAuditEvent.objects.count(), 0)

    def test_size_limit_is_exact_and_large_file_is_not_silently_truncated(self):
        with patch("apps.financials.evidence_services.MAX_EVIDENCE_SIZE", 5):
            response = self.upload("limit.txt", b"12345")
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["size"], 5)
            self.assertEqual(self.upload("too-big.txt", b"123456").status_code, 400)

    def test_real_ten_mebibyte_boundary_and_invalid_filename(self):
        limit = 10 * 1024 * 1024
        self.assertEqual(self.upload("large.txt", b"x" * (limit + 1)).status_code, 400)
        response = self.upload("limit.txt", b"x" * limit)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["size"], limit)
        with self.assertRaises(APIValidationError):
            validate_upload(SimpleUploadedFile("bad\nname.txt", b"valid"))
        self.assertEqual(self.upload("x" * 201 + ".txt", b"valid").status_code, 400)

    def test_upload_and_link_are_atomic_on_invalid_target(self):
        response = self.upload(target_kind="account_trace", target_id=self.tb.pk, selector=999999, note="Support")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(FinancialEvidence.objects.count(), 0)
        self.assertEqual(FinancialAuditEvent.objects.count(), 0)
        response = self.upload(target_kind="account_trace", target_id=self.tb.pk, selector=self.account.pk, note="Support")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(FinancialEvidenceLink.objects.count(), 1)
        self.assertEqual(FinancialAuditEvent.objects.filter(
            object_type__in=("financial_evidence", "financial_evidence_link"),
        ).count(), 2)

    def test_linked_upload_requires_complete_target_parameters(self):
        for changes in (
            {"target_kind": "journal"}, {"target_id": self.tb.pk},
            {"note": "note"}, {"selector": self.account.pk}, {"target_kind": "bad"},
        ):
            self.assertEqual(self.upload(**changes).status_code, 400)
        self.assertEqual(FinancialEvidence.objects.count(), 0)

    def test_trace_link_duplicate_snapshot_and_list_filter(self):
        data = self.evidence()
        link = self.link(data["id"])
        self.assertEqual(link.status_code, 201, link.data)
        self.assertEqual(link.data["target_snapshot"]["account"], self.account.pk)
        self.assertEqual(link.data["evidence_metadata"]["sha256"], data["sha256"])
        self.assertNotIn("content", link.data["evidence_metadata"])
        self.assertEqual(self.link(data["id"]).status_code, 400)
        response = self.api.get(self.link_url, {
            "engagement": self.engagement.pk, "target_kind": "account_trace",
            "target_id": self.tb.pk, "selector": self.account.pk,
        })
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], link.data["id"])
        ChartOfAccount.objects.filter(pk=self.account.pk).update(account_name="Changed")
        self.assertIn("Cash", self.api.get(f"{self.link_url}{link.data['id']}/").data["target_snapshot"]["label"])

    def test_finding_link_preserves_run_and_exact_index(self):
        run = self.run_record()
        original = run.results
        data = self.evidence()
        response = self.link(data["id"], "run_finding", run.pk, 0)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["target_snapshot"]["finding"], original["findings"][0])
        run.refresh_from_db()
        self.assertEqual(run.results, original)
        self.assertEqual(self.link(data["id"], "run_finding", run.pk, 1).status_code, 400)
        self.assertEqual(self.link(data["id"], "run_finding", run.pk, -1).status_code, 400)
        self.assertEqual(self.link(data["id"], "run", run.pk, 0).status_code, 400)
        self.assertEqual(self.link(data["id"], "run", run.pk, -1).status_code, 201)

    def test_cross_engagement_targets_and_unknown_ids_rejected(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="EVID-OTHER", title="Other", start_date=date(2026, 1, 1),
        )
        journal = JournalEntry.objects.create(
            engagement=other, entry_number="OTHER", transaction_date=date(2026, 1, 1), description="Other",
        )
        data = self.evidence()
        self.assertEqual(self.link(data["id"], "journal", journal.pk, -1).status_code, 400)
        self.assertEqual(self.link(data["id"], "journal", 999999, -1).status_code, 400)
        self.assertEqual(self.link(data["id"], "journal", journal.pk, 0).status_code, 400)
        self.assertEqual(FinancialEvidenceLink.objects.count(), 0)

    def test_adjustment_only_trace_account_is_supported(self):
        Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.tb, adjustment_number="ADJ",
            description="Adjustment", debit_account=self.expense, credit_account=self.account, amount=10,
        )
        data = self.evidence()
        response = self.link(data["id"], selector=self.expense.pk)
        self.assertEqual(response.status_code, 201, response.data)

    def test_all_explicit_record_types_are_linkable(self):
        journal = JournalEntry.objects.create(
            engagement=self.engagement, entry_number="J", transaction_date=date(2026, 1, 1), description="Journal",
        )
        ledger = GeneralLedger.objects.create(
            engagement=self.engagement, account=self.account, transaction_date=date(2026, 1, 1), description="GL", debit=1,
        )
        adjustment = Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.tb, adjustment_number="A", description="Adjustment",
            debit_account=self.account, credit_account=self.expense, amount=1,
        )
        lead = LeadSchedule.objects.create(
            engagement=self.engagement, trial_balance=self.tb, account=self.account, schedule_name="Lead",
        )
        support = SupportingDetail.objects.create(lead_schedule=lead, description="Support")
        contact = FinancialContact.objects.create(engagement=self.engagement, kind="customer", name="Customer")
        document = FinancialDocument.objects.create(
            engagement=self.engagement, kind="invoice", number="INV", contact=contact,
            transaction_date=date(2026, 1, 1), due_date=date(2026, 1, 31), currency="TZS",
            exchange_rate=1, control_account=self.account,
        )
        payment = FinancialPayment.objects.create(
            document=document, transaction_date=date(2026, 1, 1), amount=1, exchange_rate=1,
            base_amount=1, control_base_amount=1, fx_difference=0, bank_account=self.account, journal=journal,
        )
        asset = FixedAsset.objects.create(
            engagement=self.engagement, asset_number="FA", name="Asset", registration_mode="existing",
            acquisition_date=date(2025, 1, 1), depreciation_start=date(2026, 1, 1), depreciation_months=1,
            cost=100, asset_account=self.account, accumulated_account=self.account, expense_account=self.expense,
        )
        event = FixedAssetEvent.objects.create(
            asset=asset, kind="depreciation", transaction_date=date(2026, 1, 31), amount=100, journal=journal,
        )
        item = InventoryItem.objects.create(
            engagement=self.engagement, sku="ST", name="Stock", unit="each",
            inventory_account=self.account, expense_account=self.expense,
        )
        movement = InventoryMovement.objects.create(
            item=item, kind="opening", transaction_date=date(2026, 1, 1), quantity=1, value=10,
            quantity_before=0, quantity_after=1, value_before=0, value_after=10,
            reason="Opening", register_only=True,
        )
        evidence = self.evidence()
        for kind, record in (
            ("journal", journal), ("ledger", ledger), ("adjustment", adjustment),
            ("lead_schedule", lead), ("supporting_detail", support), ("document", document),
            ("payment", payment), ("asset", asset), ("asset_event", event),
            ("inventory_item", item), ("inventory_movement", movement),
        ):
            response = self.link(evidence["id"], kind, record.pk, -1)
            self.assertEqual(response.status_code, 201, response.data)
            other = Engagement.objects.get_or_create(
                client=self.engagement.client, engagement_code="FOREIGN",
                defaults={"title": "Foreign", "start_date": date(2026, 1, 1), "lead_auditor": self.staff},
            )[0]
            foreign_evidence = self.upload(engagement=other.pk)
            self.assertEqual(foreign_evidence.status_code, 201)
            self.assertEqual(self.link(foreign_evidence.data["id"], kind, record.pk, -1).status_code, 400)

    def test_files_links_immutable_and_guest_read_only(self):
        evidence = self.evidence()
        response = self.link(evidence["id"])
        model = FinancialEvidence.objects.get(pk=evidence["id"])
        with self.assertRaises(ValidationError):
            model.save()
        with self.assertRaises(ValidationError):
            model.delete()
        link = FinancialEvidenceLink.objects.get(pk=response.data["id"])
        with self.assertRaises(ValidationError):
            link.save()
        with self.assertRaises(ValidationError):
            link.delete()
        for url in (f"{self.url}{model.pk}/", f"{self.link_url}{link.pk}/"):
            self.assertEqual(self.api.patch(url, {"title": "Edit"}, format="json").status_code, 405)
            self.assertEqual(self.api.delete(url).status_code, 405)
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.upload().status_code, 403)
        self.assertEqual(self.link(evidence["id"]).status_code, 403)
        self.assertEqual(self.api.get(f"{self.url}{model.pk}/").status_code, 404)
        response = self.api.get(f"{self.url}{model.pk}/download/")
        self.assertEqual(response.status_code, 404)

    def test_corrupted_bytes_fail_integrity_and_log(self):
        evidence = self.evidence()
        FinancialEvidence.objects.filter(pk=evidence["id"]).update(content=b"corrupt")
        with self.assertLogs("apps.financials.evidence_services", level="ERROR") as logs:
            response = self.api.get(f"{self.url}{evidence['id']}/download/")
        self.assertEqual(response.status_code, 500)
        self.assertIn("integrity", logs.output[0])

    def test_lists_require_engagement_and_audit_metadata_excludes_bytes(self):
        evidence = self.evidence()
        self.assertEqual(self.api.get(self.url).status_code, 400)
        self.assertEqual(self.api.get(self.link_url).status_code, 400)
        for query in ({"engagement": "bad"}, {"engagement": self.engagement.pk, "target_kind": "journal"}):
            self.assertEqual(self.api.get(self.link_url, query).status_code, 400)
        data = self.api.get(self.url, {"engagement": self.engagement.pk}).data
        self.assertEqual(data["count"], 1)
        self.assertNotIn("content", data["results"][0])
        event = FinancialAuditEvent.objects.get(object_type="financial_evidence")
        self.assertEqual(event.actor_id, self.staff.pk)
        self.assertEqual(event.details["sha256"], evidence["sha256"])
        self.assertNotIn("content", event.details)

    def test_closed_period_allows_evidence_without_ledger_mutation(self):
        AccountingPolicy.objects.create(engagement=self.engagement, closed_through=date(2026, 12, 31))
        response = self.upload(
            target_kind="account_trace", target_id=self.tb.pk, selector=self.account.pk, note="Closed-period support",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(GeneralLedger.objects.count(), 0)
        self.assertEqual(JournalEntry.objects.count(), 0)

    def test_metadata_pagination_defers_binary_payload_and_scopes_engagement(self):
        base = self.evidence()
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="PAGE-OTHER", title="Other",
            start_date=date(2026, 1, 1), lead_auditor=self.staff,
        )
        self.assertEqual(self.upload(engagement=other.pk).status_code, 201)
        for index in range(25):
            FinancialEvidence.objects.create(
                engagement=self.engagement, title=f"Page {index}", filename="support.txt",
                content_type="text/plain", size=1, content=b"x", sha256=hashlib.sha256(b"x").hexdigest(),
            )
        with CaptureQueriesContext(connection) as queries:
            response = self.api.get(self.url, {"engagement": self.engagement.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 26)
        self.assertEqual(len(response.data["results"]), 25)
        self.assertTrue(response.data["next"])
        self.assertFalse(any('"content"' in query["sql"] for query in queries))
        response = self.api.get(self.url, {"engagement": self.engagement.pk, "page": 2})
        self.assertEqual(response.data["results"][0]["id"], base["id"])
        for evidence in FinancialEvidence.objects.filter(engagement=self.engagement).defer("content"):
            self.assertEqual(self.link(evidence.pk).status_code, 201)
        with CaptureQueriesContext(connection) as queries:
            response = self.api.get(self.link_url, {
                "engagement": self.engagement.pk, "target_kind": "account_trace",
                "target_id": self.tb.pk, "selector": self.account.pk,
            })
        self.assertEqual(response.data["count"], 26)
        self.assertEqual(len(response.data["results"]), 25)
        self.assertFalse(any('"content"' in query["sql"] for query in queries))
