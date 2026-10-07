from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient
from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import ArchiveStatus, DocumentationArchive


class ArchiveReliabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user(username="archive-test", role="admin"))
        client = Client.objects.create(client_code="ARCHIVE-TEST", legal_name="Archive test")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="ARCHIVE-TEST", title="Archive test", start_date=date(2026, 1, 1),
        )
        self.url = "/api/archive-statuses/"
        self.payload = {
            "engagement": self.engagement.pk, "locked": True,
            "documentation_completed_at": "2026-10-07T00:00:00Z", "retention_period_years": 7,
        }

    def test_incomplete_archive_cannot_lock(self):
        self.assertEqual(self.client.post(self.url, self.payload, format="json").status_code, 400)
        self.assertFalse(ArchiveStatus.objects.exists())

    def test_successful_lock_updates_workpaper_and_prevents_edit_delete_or_unlock(self):
        flags = (
            "subsequentEventsReviewed", "finalReviewCompleted", "partnerApprovalCompleted",
            "archiveChecklistDocumentationComplete", "archiveChecklistOutstandingMattersResolved",
            "archiveChecklistFinalReviewComplete", "archiveChecklistPartnerApprovalComplete",
            "archiveChecklistRetentionConfirmed",
        )
        archive = DocumentationArchive.objects.create(engagement=self.engagement, data={
            **dict.fromkeys(flags, True), "documentationAreas": [{"completed": True}],
            "assemblySections": [{"completed": True}], "outstandingMatters": [],
        })
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        archive.refresh_from_db()
        self.assertEqual(archive.data["archiveStatus"], "Archived")
        self.assertEqual(archive.data["completionStatus"], "Completed")
        self.assertEqual(self.client.patch(
            f"/api/documentation-archives/{archive.pk}/", {"data": {}}, format="json",
        ).status_code, 400)
        self.assertEqual(self.client.delete(f"/api/documentation-archives/{archive.pk}/").status_code, 400)
        self.assertEqual(self.client.patch(
            f"{self.url}{response.data['id']}/", {"locked": False}, format="json",
        ).status_code, 400)

    def test_archive_cannot_claim_locked_state_before_lock(self):
        response = self.client.post("/api/documentation-archives/", {
            "engagement": self.engagement.pk, "data": {"archiveStatus": "Archived"},
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(DocumentationArchive.objects.exists())
