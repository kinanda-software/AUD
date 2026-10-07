from datetime import date
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from django.core.exceptions import ValidationError
from django.db import connections
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    AccountingPolicy, FinancialAuditEvent, FinancialEvidence, FinancialEvidenceLink,
    FinancialFindingReview, FinancialIntelligenceRun,
)


class FindingReviewTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="review-staff", role="staff")
        self.manager = User.objects.create_user(username="review-manager", role="manager")
        self.admin = User.objects.create_user(username="review-admin", role="admin")
        self.auditor = User.objects.create_user(username="review-auditor", role="auditor")
        self.guest = User.objects.create_user(username="review-guest", role="guest")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="REVIEW", legal_name="Finding Review")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="REVIEW", title="Review", start_date=date(2026, 1, 1),
        )
        self.run = FinancialIntelligenceRun.objects.create(
            engagement=self.engagement, name="Review run", algorithm_version="journal-screen-v1",
            parameters={}, population_fingerprint="a" * 64, population_count=1, sample_count=1,
            finding_count=2, results={"findings": [
                {"rule": "weekend_date", "journal_ids": [1], "message": "Weekend"},
                {"rule": "missing_preparer", "journal_ids": [1], "message": "Preparer"},
            ]}, created_by=self.staff,
        )
        self.url = "/api/financials/finding-reviews/"

    def review(self, **changes):
        response = self.api.post(self.url, {
            "run": self.run.pk, "finding_index": 0, "action": "review", "expected_previous": None,
            "outcome": "explained", "conclusion": "Inspected support: valid weekend posting.",
            "note": "Agreed to the source document.", **changes,
        }, format="json")
        return response

    def transition(self, previous, action, **changes):
        return self.api.post(self.url, {
            "run": self.run.pk, "finding_index": 0, "action": action,
            "expected_previous": previous, "note": "Reviewed rationale and support.", **changes,
        }, format="json")

    def status(self, **query):
        return self.api.get(f"{self.url}status/", {"run": self.run.pk, **query})

    def test_review_preserves_snapshot_and_records_actor_and_activity(self):
        original = self.run.results
        response = self.review()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["state"], "reviewed")
        self.assertEqual(response.data["actor_identifier"], self.staff.pk)
        self.assertEqual(response.data["actor_name"], self.staff.username)
        self.run.refresh_from_db()
        self.assertEqual(self.run.results, original)
        self.assertEqual(self.run.population_fingerprint, "a" * 64)
        event = FinancialAuditEvent.objects.get(object_type="financial_finding_review")
        self.assertEqual(event.actor_id, self.staff.pk)
        self.assertEqual(event.details["finding_index"], 0)
        self.assertNotIn("results", event.details)
        counts = self.status().data["counts"]
        self.assertEqual(counts["reviewed"], 1)
        self.assertEqual(counts["unreviewed"], 1)

    def test_independent_manager_signoff_binds_exact_review(self):
        review = self.review().data
        self.assertEqual(self.transition(review["id"], "sign_off").status_code, 403)
        self.api.force_authenticate(self.manager)
        signed = self.transition(review["id"], "sign_off")
        self.assertEqual(signed.status_code, 201, signed.data)
        self.assertEqual(signed.data["previous"], review["id"])
        self.assertEqual(signed.data["conclusion"], review["conclusion"])
        self.assertEqual(signed.data["state"], "signed_off")
        self.assertEqual(self.review(expected_previous=signed.data["id"]).status_code, 400)
        self.assertEqual(self.transition(signed.data["id"], "sign_off").status_code, 400)

    def test_managers_cannot_self_sign_and_admin_is_allowed(self):
        self.api.force_authenticate(self.manager)
        review = self.review().data
        self.assertEqual(self.transition(review["id"], "sign_off").status_code, 403)
        self.api.force_authenticate(self.admin)
        self.assertEqual(self.transition(review["id"], "sign_off").status_code, 201)

    def test_unresolved_followup_cannot_be_signed_off(self):
        response = self.review(outcome="follow_up", conclusion="Missing bank confirmation.")
        self.assertEqual(response.status_code, 201)
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.transition(response.data["id"], "sign_off").status_code, 400)
        self.assertEqual(self.transition(response.data["id"], "return").status_code, 201)

    def test_return_revision_and_reopen_preserve_full_chain(self):
        first = self.review().data
        self.api.force_authenticate(self.manager)
        returned = self.transition(first["id"], "return").data
        self.assertEqual(returned["state"], "returned")
        self.api.force_authenticate(self.staff)
        second = self.review(expected_previous=returned["id"], outcome="exception", conclusion="Confirmed missing approval.").data
        self.api.force_authenticate(self.manager)
        signed = self.transition(second["id"], "sign_off").data
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.transition(signed["id"], "reopen").status_code, 403)
        self.api.force_authenticate(self.admin)
        reopened = self.transition(signed["id"], "reopen")
        self.assertEqual(reopened.status_code, 201)
        self.assertEqual(reopened.data["state"], "reopened")
        self.api.force_authenticate(self.staff)
        third = self.review(expected_previous=reopened.data["id"])
        self.assertEqual(third.status_code, 201, third.data)
        history = self.api.get(self.url, {"run": self.run.pk, "finding_index": 0}).data
        self.assertEqual(history["count"], 6)
        self.assertEqual(history["results"][0]["previous"], reopened.data["id"])
        self.assertEqual(FinancialFindingReview.objects.get(pk=first["id"]).outcome, "explained")

    def test_stale_actions_return_conflict_and_no_extra_history(self):
        first = self.review().data
        self.assertEqual(self.review().status_code, 409)
        second = self.review(expected_previous=first["id"]).data
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.transition(first["id"], "sign_off").status_code, 409)
        self.assertEqual(self.transition(second["id"], "sign_off").status_code, 201)
        self.assertEqual(FinancialFindingReview.objects.count(), 3)
        self.assertEqual(FinancialAuditEvent.objects.filter(object_type="financial_finding_review").count(), 3)

    def test_invalid_actions_fields_and_indexes_rejected(self):
        for changes in (
            {"finding_index": -1}, {"finding_index": 2}, {"finding_index": 999},
            {"outcome": "bad"}, {"conclusion": ""}, {"note": "  "},
            {"expected_previous": 0}, {"run": 99999}, {"action": "bad"},
        ):
            self.assertEqual(self.review(**changes).status_code, 400)
        self.api.force_authenticate(self.manager)
        for action in ("sign_off", "return", "reopen"):
            self.assertEqual(self.transition(None, action).status_code, 400)
        first = self.review().data
        self.assertEqual(self.transition(first["id"], "return", outcome="exception").status_code, 400)
        self.assertEqual(self.transition(first["id"], "return", conclusion="Changed").status_code, 400)
        self.assertEqual(FinancialFindingReview.objects.count(), 1)

    def test_expected_previous_is_required_and_finding_scope_is_separate(self):
        response = self.api.post(self.url, {
            "run": self.run.pk, "finding_index": 0, "action": "review",
            "outcome": "explained", "conclusion": "Support", "note": "Support",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        first = self.review().data
        self.assertEqual(self.review(finding_index=1, expected_previous=first["id"]).status_code, 409)
        self.assertEqual(self.review(finding_index=1).status_code, 201)
        self.assertEqual(self.status().data["counts"]["reviewed"], 2)

    def test_guest_read_only_and_anonymous_blocked(self):
        first = self.review().data
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.review().status_code, 403)
        self.assertEqual(self.transition(first["id"], "sign_off").status_code, 403)
        self.assertEqual(self.status().status_code, 200)
        self.assertEqual(self.api.get(self.url, {"run": self.run.pk}).status_code, 200)
        self.api.force_authenticate(None)
        self.assertIn(self.status().status_code, (401, 403))
        self.assertIn(self.api.get(f"{self.url}{first['id']}/").status_code, (401, 403))

    def test_history_immutable_and_actor_identity_survives_user_deletion(self):
        first = self.review().data
        record = FinancialFindingReview.objects.get(pk=first["id"])
        with self.assertRaises(ValidationError):
            record.save()
        with self.assertRaises(ValidationError):
            record.delete()
        self.assertEqual(self.api.patch(f"{self.url}{record.pk}/", {}, format="json").status_code, 405)
        self.assertEqual(self.api.delete(f"{self.url}{record.pk}/").status_code, 405)
        staff_id = self.staff.pk
        self.api.force_authenticate(self.manager)
        self.staff.delete()
        record.refresh_from_db()
        self.assertIsNone(record.actor)
        self.assertEqual(record.actor_identifier, staff_id)
        self.assertEqual(record.actor_name, "review-staff")
        self.assertEqual(self.transition(record.pk, "sign_off").status_code, 201)

    def test_evidence_scope_is_frozen_at_review_and_signoff(self):
        evidence = FinancialEvidence.objects.create(
            engagement=self.engagement, title="Support", filename="support.txt", content_type="text/plain",
            size=1, sha256="a" * 64, content=b"x",
        )
        def link(index):
            return FinancialEvidenceLink.objects.create(
                evidence=evidence, target_kind="run_finding", target_id=self.run.pk, selector=index,
                target_snapshot={"label": "Finding"}, note="Support",
            )
        included = link(0)
        link(1)
        first = self.review().data
        self.assertEqual(first["evidence_link_ids"], [included.pk])
        second_evidence = FinancialEvidence.objects.create(
            engagement=self.engagement, title="Later", filename="support.txt", content_type="text/plain",
            size=1, sha256="a" * 64, content=b"x",
        )
        FinancialEvidenceLink.objects.create(
            evidence=second_evidence, target_kind="run_finding", target_id=self.run.pk, selector=0,
            target_snapshot={"label": "Finding"}, note="Later support",
        )
        self.api.force_authenticate(self.manager)
        signed = self.transition(first["id"], "sign_off")
        self.assertEqual(signed.data["evidence_link_ids"], [included.pk])

    def test_closed_period_and_auditor_can_record_reviews(self):
        AccountingPolicy.objects.create(engagement=self.engagement, closed_through=date(2026, 12, 31))
        self.api.force_authenticate(self.auditor)
        response = self.review()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.transition(response.data["id"], "return").status_code, 403)

    def test_status_pagination_counts_all_findings_and_history_pages(self):
        FinancialIntelligenceRun.objects.filter(pk=self.run.pk).update(
            finding_count=30, results={"findings": [{"rule": "weekend_date"} for _ in range(30)]},
        )
        previous = None
        for index in range(26):
            response = self.review(expected_previous=previous)
            self.assertEqual(response.status_code, 201)
            previous = response.data["id"]
        first = self.status().data
        self.assertEqual(len(first["results"]), 25)
        self.assertEqual(first["next_offset"], 25)
        self.assertEqual(first["counts"]["unreviewed"], 29)
        self.assertEqual(first["results"][0]["latest"]["id"], previous)
        second = self.status(offset=25).data
        self.assertEqual(len(second["results"]), 5)
        self.assertIsNone(second["next_offset"])
        history = self.api.get(self.url, {"run": self.run.pk, "finding_index": 0}).data
        self.assertEqual(history["count"], 26)
        self.assertEqual(len(history["results"]), 25)
        self.assertTrue(history["next"])
        self.assertEqual(self.api.get(self.url, {"run": self.run.pk, "finding_index": 0, "page": 2}).data["results"][0]["previous"], None)

    def test_filters_require_valid_run_and_finding(self):
        for query in ({}, {"run": "invalid"}, {"run": 99999}, {"run": self.run.pk, "finding_index": 2}):
            self.assertEqual(self.api.get(self.url, query).status_code, 400)
            self.assertEqual(self.api.get(f"{self.url}status/", query).status_code, 400)


class FindingReviewConcurrencyTests(TransactionTestCase):
    def test_simultaneous_first_outcomes_have_one_winner_and_one_conflict(self):
        user = User.objects.create_user(username="concurrent-review", role="staff")
        client = Client.objects.create(client_code="CONCURRENT", legal_name="Concurrent")
        engagement = Engagement.objects.create(
            client=client, engagement_code="CONCURRENT", title="Concurrent", start_date=date(2026, 1, 1),
        )
        AccountingPolicy.objects.create(engagement=engagement)
        run = FinancialIntelligenceRun.objects.create(
            engagement=engagement, name="Concurrent", algorithm_version="journal-screen-v1",
            parameters={}, population_fingerprint="a" * 64, population_count=1,
            sample_count=1, finding_count=1, results={"findings": [{"rule": "weekend_date"}]},
        )
        barrier = Barrier(2)

        def submit():
            try:
                api = APIClient()
                api.force_authenticate(user)
                barrier.wait(timeout=10)
                response = api.post("/api/financials/finding-reviews/", {
                    "run": run.pk, "finding_index": 0, "action": "review", "expected_previous": None,
                    "outcome": "explained", "conclusion": "Concurrent outcome", "note": "Review",
                }, format="json")
                return response.status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda unused: submit(), range(2)))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(FinancialFindingReview.objects.count(), 1)
        self.assertEqual(FinancialAuditEvent.objects.filter(object_type="financial_finding_review").count(), 1)
