from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, FinancialAuditEvent, FinancialEvidence, FinancialEvidenceLink,
    FinancialPBCEvent, FinancialPBCRequest, GeneralLedger,
)


class PBCTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="pbc-staff", role="staff")
        self.manager = User.objects.create_user(username="pbc-manager", role="manager")
        self.admin = User.objects.create_user(username="pbc-admin", role="admin")
        self.guest = User.objects.create_user(username="pbc-guest", role="guest")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="PBC", legal_name="PBC Client")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="PBC", title="PBC", start_date=date(2026, 1, 1),
            lead_auditor=self.staff,
        )
        self.url = "/api/financials/pbc-requests/"
        self.events = "/api/financials/pbc-events/"

    def create_request(self, **changes):
        return self.api.post(self.url, {
            "engagement": self.engagement.pk, "title": "Bank statements",
            "description": "Complete bank statements for all accounts.",
            "requested_from": "Client accountant", "responsible_name": "Audit staff",
            "due_date": timezone.localdate().isoformat(), "priority": "normal", **changes,
        }, format="json")

    def request_record(self, **changes):
        response = self.create_request(**changes)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def upload(self, request):
        response = self.api.post("/api/financials/evidence/", {
            "engagement": request["engagement"], "title": "Statement",
            "file": SimpleUploadedFile("bank.txt", b"Bank statement fixture"),
            "target_kind": "pbc_request", "target_id": request["id"], "selector": -1, "note": "Requested statement",
        }, format="multipart")
        return response

    def linked_evidence(self, request):
        evidence = self.upload(request)
        self.assertEqual(evidence.status_code, 201, evidence.data)
        return FinancialEvidenceLink.objects.get(evidence_id=evidence.data["id"]).pk

    def event(self, request, action="submit", previous=None, **changes):
        return self.api.post(self.events, {
            "request": request["id"], "action": action, "expected_previous": previous,
            "note": "Received and inspected package", **changes,
        }, format="json")

    def test_request_creation_metadata_history_and_required_fields(self):
        data = self.request_record()
        self.assertEqual(data["state"], "open")
        self.assertFalse(data["overdue"])
        self.assertIsNone(data["latest_event"])
        self.assertEqual(data["created_by"], self.staff.pk)
        event = FinancialAuditEvent.objects.get(object_type="financial_pbc_request")
        self.assertEqual(event.details["requested_from"], "Client accountant")
        for changes in (
            {"title": ""}, {"description": "  "}, {"requested_from": ""},
            {"responsible_name": ""}, {"due_date": "bad"}, {"priority": "urgent"}, {"engagement": 999999},
        ):
            self.assertEqual(self.create_request(**changes).status_code, 400)
        self.assertEqual(FinancialPBCRequest.objects.count(), 1)

    def test_submission_acceptance_and_frozen_document_scope(self):
        request = self.request_record()
        included = self.linked_evidence(request)
        excluded = self.linked_evidence(request)
        response = self.event(request, evidence_link_ids=[included])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["state"], "submitted")
        self.assertEqual(response.data["evidence_link_ids"], [included])
        self.assertEqual(self.event(request, "accept", response.data["id"]).status_code, 403)
        self.api.force_authenticate(self.manager)
        accepted = self.event(request, "accept", response.data["id"])
        self.assertEqual(accepted.status_code, 201, accepted.data)
        self.assertEqual(accepted.data["evidence_link_ids"], [included])
        self.assertNotIn(excluded, accepted.data["evidence_link_ids"])
        data = self.api.get(f"{self.url}{request['id']}/").data
        self.assertEqual(data["state"], "accepted")
        self.assertEqual(data["latest_event"], accepted.data["id"])

    def test_return_resubmission_reopen_and_cancellation_history(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        submitted = self.event(request, evidence_link_ids=[link]).data
        self.api.force_authenticate(self.manager)
        returned = self.event(request, "return", submitted["id"]).data
        self.assertEqual(returned["state"], "returned")
        self.api.force_authenticate(self.staff)
        another = self.linked_evidence(request)
        second = self.event(request, previous=returned["id"], evidence_link_ids=[another]).data
        self.api.force_authenticate(self.manager)
        accepted = self.event(request, "accept", second["id"]).data
        reopened = self.event(request, "reopen", accepted["id"]).data
        self.assertEqual(reopened["state"], "open")
        cancelled = self.event(request, "cancel", reopened["id"]).data
        self.assertEqual(cancelled["state"], "cancelled")
        for action in ("submit", "accept", "return", "reopen", "cancel"):
            self.assertEqual(self.event(request, action, cancelled["id"]).status_code, 400)
        history = self.api.get(self.events, {"request": request["id"]}).data
        self.assertEqual(history["count"], 6)
        self.assertEqual(history["results"][0]["previous"], reopened["id"])
        self.assertEqual(history["results"][-1]["evidence_link_ids"], [link])

    def test_links_only_allowed_when_open_or_returned_upload_rolls_back(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        submitted = self.event(request, evidence_link_ids=[link]).data
        count = FinancialEvidence.objects.count()
        audit_count = FinancialAuditEvent.objects.count()
        self.assertEqual(self.upload(request).status_code, 400)
        self.assertEqual(FinancialEvidence.objects.count(), count)
        self.assertEqual(FinancialAuditEvent.objects.count(), audit_count)
        self.api.force_authenticate(self.manager)
        accepted = self.event(request, "accept", submitted["id"]).data
        self.assertEqual(self.upload(request).status_code, 400)
        self.event(request, "reopen", accepted["id"])
        self.assertEqual(self.upload(request).status_code, 201)

    def test_submission_requires_exact_same_request_engagement_links(self):
        request = self.request_record()
        other = self.request_record(title="Other request")
        own = self.linked_evidence(request)
        foreign = self.linked_evidence(other)
        for ids in ([], [999999], [foreign], [own, own]):
            self.assertEqual(self.event(request, evidence_link_ids=ids).status_code, 400)
        self.assertEqual(self.event(request).status_code, 400)
        FinancialEvidenceLink.objects.filter(pk=own).update(target_kind="run")
        self.assertEqual(self.event(request, evidence_link_ids=[own]).status_code, 400)
        self.assertEqual(FinancialPBCEvent.objects.count(), 0)

    def test_cross_engagement_evidence_and_selector_rejected(self):
        request = self.request_record()
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="PBC-OTHER", title="Other", start_date=date(2026, 1, 1),
            lead_auditor=self.staff,
        )
        evidence = FinancialEvidence.objects.create(
            engagement=other, title="Other", filename="other.txt", content_type="text/plain",
            size=1, sha256="a" * 64, content=b"x",
        )
        response = self.api.post("/api/financials/evidence-links/", {
            "evidence": evidence.pk, "target_kind": "pbc_request", "target_id": request["id"], "note": "Other", "selector": -1,
        }, format="json")
        self.assertEqual(response.status_code, 400)
        own = self.linked_evidence(request)
        response = self.api.post("/api/financials/evidence-links/", {
            "evidence": FinancialEvidenceLink.objects.get(pk=own).evidence_id, "target_kind": "pbc_request",
            "target_id": request["id"], "note": "Bad selector", "selector": 0,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_transition_guards_and_required_version_and_note(self):
        request = self.request_record()
        self.api.force_authenticate(self.manager)
        for action in ("accept", "return", "reopen"):
            self.assertEqual(self.event(request, action).status_code, 400)
        link = self.linked_evidence(request)
        for changes in (
            {"note": ""}, {"expected_previous": 0}, {"action": "bad"},
        ):
            self.assertEqual(self.event(request, evidence_link_ids=[link], **changes).status_code, 400)
        response = self.api.post(self.events, {
            "request": request["id"], "action": "submit", "note": "Package", "evidence_link_ids": [link],
        }, format="json")
        self.assertEqual(response.status_code, 400)
        submit = self.event(request, evidence_link_ids=[link]).data
        self.assertEqual(self.event(request, previous=submit["id"], evidence_link_ids=[link]).status_code, 400)
        self.assertEqual(self.event(request, "accept", submit["id"], evidence_link_ids=[link]).status_code, 400)

    def test_stale_submissions_do_not_duplicate_events_or_activity(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        submit = self.event(request, evidence_link_ids=[link]).data
        self.assertEqual(self.event(request, evidence_link_ids=[link]).status_code, 409)
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.event(request, "accept").status_code, 409)
        accepted = self.event(request, "accept", submit["id"]).data
        self.assertEqual(self.event(request, "return", submit["id"]).status_code, 409)
        self.assertEqual(FinancialPBCEvent.objects.count(), 2)
        self.assertEqual(FinancialAuditEvent.objects.filter(object_type="financial_pbc_event").count(), 2)
        self.assertEqual(FinancialPBCEvent.objects.get(pk=accepted["id"]).previous_id, submit["id"])

    def test_guests_read_only_staff_cannot_make_manager_decisions(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        self.assertEqual(self.event(request, "cancel").status_code, 403)
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.create_request().status_code, 403)
        self.assertEqual(self.event(request, evidence_link_ids=[link]).status_code, 403)
        self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk}).status_code, 200)
        self.assertEqual(self.api.get(self.events, {"request": request["id"]}).status_code, 200)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(f"{self.url}{request['id']}/").status_code, (401, 403))

    def test_due_dates_summary_and_state_filters_scope_entire_register(self):
        today = timezone.localdate()
        overdue = self.request_record(due_date=(today - timedelta(days=1)).isoformat())
        self.request_record()
        submitted_request = self.request_record(due_date=(today - timedelta(days=2)).isoformat())
        link = self.linked_evidence(submitted_request)
        submitted = self.event(submitted_request, evidence_link_ids=[link]).data
        self.api.force_authenticate(self.manager)
        self.event(submitted_request, "accept", submitted["id"])
        self.assertTrue(self.api.get(f"{self.url}{overdue['id']}/").data["overdue"])
        summary = self.api.get(f"{self.url}summary/", {"engagement": self.engagement.pk}).data
        self.assertEqual(summary["total"], 3, summary)
        self.assertEqual(summary["counts"]["open"], 2)
        self.assertEqual(summary["counts"]["accepted"], 1)
        self.assertEqual(summary["overdue"], 1)
        self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk, "overdue": "true"}).data["count"], 1)
        self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk, "overdue": "false"}).data["count"], 2)
        self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk, "state": "accepted"}).data["count"], 1)

    def test_immutable_models_and_actor_identity_after_deletion(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        event = self.event(request, evidence_link_ids=[link]).data
        for record in (
            FinancialPBCRequest.objects.get(pk=request["id"]), FinancialPBCEvent.objects.get(pk=event["id"]),
        ):
            with self.assertRaises(ValidationError):
                record.save()
            with self.assertRaises(ValidationError):
                record.delete()
        for url in (f"{self.url}{request['id']}/", f"{self.events}{event['id']}/"):
            self.assertEqual(self.api.patch(url, {}, format="json").status_code, 405)
            self.assertEqual(self.api.delete(url).status_code, 405)
        self.api.force_authenticate(self.manager)
        staff_id = self.staff.pk
        self.staff.delete()
        stored = self.api.get(f"{self.events}{event['id']}/").data
        self.assertIsNone(stored["actor"])
        self.assertEqual(stored["actor_identifier"], staff_id)
        self.assertEqual(stored["actor_name"], "pbc-staff")

    def test_closed_period_requests_and_submissions_do_not_change_ledger(self):
        AccountingPolicy.objects.create(engagement=self.engagement, closed_through=date(2026, 12, 31))
        request = self.request_record()
        link = self.linked_evidence(request)
        self.assertEqual(self.event(request, evidence_link_ids=[link]).status_code, 201)
        self.assertEqual(GeneralLedger.objects.count(), 0)

    def test_pagination_engagement_scope_and_invalid_filters(self):
        for _ in range(26):
            self.request_record()
        response = self.api.get(self.url, {"engagement": self.engagement.pk}).data
        self.assertEqual(response["count"], 26)
        self.assertEqual(len(response["results"]), 25)
        self.assertTrue(response["next"])
        self.assertEqual(len(self.api.get(self.url, {"engagement": self.engagement.pk, "page": 2}).data["results"]), 1)
        self.assertEqual(self.api.get(self.url, {"engagement": 999999}).data["count"], 0)
        for query in ({}, {"engagement": "bad"}, {"engagement": self.engagement.pk, "state": "bad"}):
            self.assertEqual(self.api.get(self.url, query).status_code, 400)
            self.assertEqual(self.api.get(f"{self.url}summary/", query).status_code, 400)
        self.assertEqual(self.api.get(self.events).status_code, 400)
        self.assertEqual(self.api.get(self.events, {"request": 999999}).status_code, 400)

    def test_history_pagination_and_reopened_counts_share_open_state(self):
        request = self.request_record()
        self.request_record(title="Unsubmitted open request")
        link = self.linked_evidence(request)
        self.api.force_authenticate(self.manager)
        previous = None
        for _ in range(12):
            submitted = self.event(request, previous=previous, evidence_link_ids=[link]).data
            returned = self.event(request, "return", submitted["id"]).data
            previous = returned["id"]
        submitted = self.event(request, previous=previous, evidence_link_ids=[link]).data
        accepted = self.event(request, "accept", submitted["id"]).data
        reopened = self.event(request, "reopen", accepted["id"]).data
        self.assertEqual(reopened["state"], "open")
        summary = self.api.get(f"{self.url}summary/", {"engagement": self.engagement.pk}).data
        self.assertEqual(summary["counts"]["open"], 2)
        self.assertEqual(summary["total"], 2)
        history = self.api.get(self.events, {"request": request["id"]}).data
        self.assertEqual(history["count"], 27)
        self.assertEqual(len(history["results"]), 25)
        self.assertTrue(history["next"])
        second = self.api.get(self.events, {"request": request["id"], "page": 2}).data
        self.assertEqual(len(second["results"]), 2)
        self.assertIsNone(second["results"][-1]["previous"])
        self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk, "state": "open"}).data["count"], 2)

    def test_submission_limit_unknown_request_and_cancelled_link_guard(self):
        request = self.request_record()
        link = self.linked_evidence(request)
        self.assertEqual(self.event(request, evidence_link_ids=list(range(1, 102))).status_code, 400)
        self.assertEqual(self.api.post(self.events, {
            "request": 999999, "action": "submit", "expected_previous": None,
            "note": "Missing", "evidence_link_ids": [link],
        }, format="json").status_code, 400)
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.event(request, "cancel").status_code, 201)
        self.assertEqual(self.upload(request).status_code, 400)
        self.assertEqual(FinancialEvidence.objects.count(), 1)


class PBCConcurrencyTests(TransactionTestCase):
    def test_concurrent_submissions_one_winner_one_conflict(self):
        user = User.objects.create_user(username="pbc-concurrent", role="staff")
        client = Client.objects.create(client_code="PBC-CONCURRENT", legal_name="Concurrent")
        engagement = Engagement.objects.create(
            client=client, engagement_code="PBC-CONCURRENT", title="Concurrent", start_date=date(2026, 1, 1),
        )
        AccountingPolicy.objects.create(engagement=engagement)
        request = FinancialPBCRequest.objects.create(
            engagement=engagement, title="Request", description="Support", requested_from="Client",
            responsible_name="Audit staff", due_date=date(2026, 10, 1), priority="normal",
        )
        evidence = FinancialEvidence.objects.create(
            engagement=engagement, title="Support", filename="support.txt", content_type="text/plain",
            size=1, sha256="a" * 64, content=b"x",
        )
        link = FinancialEvidenceLink.objects.create(
            evidence=evidence, target_kind="pbc_request", target_id=request.pk, selector=-1,
            target_snapshot={"label": "Request"}, note="Support",
        )
        barrier = Barrier(2)
        def submit():
            try:
                api = APIClient()
                api.force_authenticate(user)
                barrier.wait(timeout=10)
                return api.post("/api/financials/pbc-events/", {
                    "request": request.pk, "action": "submit", "expected_previous": None,
                    "note": "Package", "evidence_link_ids": [link.pk],
                }, format="json").status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda unused: submit(), range(2)))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(FinancialPBCEvent.objects.count(), 1)
