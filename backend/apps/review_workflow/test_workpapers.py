from copy import deepcopy
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.clients.models import Client
from apps.engagements.models import Engagement
from .models import EngagementWorkpaper, ReviewAssignment, SummaryReview
from .workpaper_serializers import SCHEMAS


def fixture(schema, key=""):
    if isinstance(schema, dict):
        return {name: fixture(child, name) for name, child in schema.items()}
    if isinstance(schema, list):
        return [fixture(schema[0])]
    if isinstance(schema, tuple):
        return next((value for value in schema if value), "")
    if schema is dict:
        return {}
    if schema is bool:
        return True
    if schema is int:
        return 1
    if schema is float:
        return 10.0
    return "2026-10-01" if key.endswith(("Date", "completedDate")) else "Documented evidence"


class WorkpaperPersistenceTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="workpaper-auditor")
        cls.other = get_user_model().objects.create_user(username="workpaper-other")
        client = Client.objects.create(client_code="WP-TEST", legal_name="Synthetic workpaper client")
        cls.engagement = Engagement.objects.create(
            client=client, engagement_code="WP-TEST-1", title="Synthetic engagement",
            start_date=date(2026, 10, 1), lead_auditor=cls.user,
        )
        cls.other_engagement = Engagement.objects.create(
            client=client, engagement_code="WP-TEST-2", title="Other synthetic engagement",
            start_date=date(2026, 10, 1), lead_auditor=cls.other,
        )

    def setUp(self):
        self.client.force_authenticate(self.user)

    def url(self, section, engagement=None):
        return f"/api/engagements/{(engagement or self.engagement).pk}/workpapers/{section}/"

    def complete_data(self, section):
        data = fixture(SCHEMAS[section])
        if section == "evaluate-misstatements":
            data.update(overallMateriality=100, performanceMateriality=75, clearlyTrivialThreshold=5)
        elif section == "financial-statement-procedures":
            data["disclosureItems"][0]["status"] = "Reviewed"
        elif section == "client-communications":
            for key in ["deficiencies", "governanceMatters"]:
                data[key][0]["status"] = "Communicated"
            data["representationItems"][0]["status"] = "Received"
        elif section == "opinion-report":
            for key in ["deficiencies", "governanceMatters"]:
                data[key][0]["communicationStatus"] = "Communicated"
            data["representations"][0]["status"] = "Received"
            data["representationStatus"] = "Received"
        elif section == "risk-reassessment":
            data["originalRisk"] = "Low"
            data["reassessedRisk"] = "High"
        elif section == "summary-review":
            for key in ["reviewAreas", "judgments"]:
                data[key][0]["status"] = "Reviewed"
            data["reviewComments"][0]["status"] = "Cleared"
        return data

    def test_read_missing_record_does_not_create_or_seed(self):
        for section in SCHEMAS:
            response = self.client.get(self.url(section))
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIsNone(response.data["id"])
            self.assertIsNone(response.data["data"])
        self.assertFalse(EngagementWorkpaper.objects.exists())
        self.assertFalse(SummaryReview.objects.exists())

    def test_all_seven_pages_round_trip_stable_identity_completion_and_edit_invalidation(self):
        for section in SCHEMAS:
            with self.subTest(section=section):
                data = self.complete_data(section)
                response = self.client.put(self.url(section), {"data": data, "complete": True}, format="json")
                self.assertEqual(response.status_code, 200, response.data)
                identity = response.data["id"]
                self.assertEqual(response.data["completion_status"], "Completed")
                self.assertIsNotNone(response.data["completed_at"])
                response = self.client.get(self.url(section))
                self.assertEqual(response.data["data"], data)
                response = self.client.put(self.url(section), {"data": data}, format="json")
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data["id"], identity)
                self.assertEqual(response.data["completion_status"], "In Progress")
                self.assertIsNone(response.data["completed_at"])
        self.assertEqual(EngagementWorkpaper.objects.count(), 6)
        self.assertEqual(SummaryReview.objects.count(), 1)

    def test_incomplete_workpapers_cannot_complete_and_existing_record_is_preserved(self):
        for section in SCHEMAS:
            with self.subTest(section=section):
                data = fixture(SCHEMAS[section])
                self.assertEqual(self.client.put(self.url(section), {"data": data}, format="json").status_code, 200)
                if section == "inventory":
                    data["risks"][0]["level"] = ""
                elif section == "risk-reassessment":
                    data["conclusion"] = " "
                elif section == "summary-review":
                    data["overallConclusion"] = " "
                elif section == "evaluate-misstatements":
                    data["auditorConclusion"] = " "
                response = self.client.put(self.url(section), {"data": data, "complete": True}, format="json")
                self.assertEqual(response.status_code, 400, response.data)
                self.assertEqual(self.client.get(self.url(section)).data["completion_status"], "In Progress")

    def test_malformed_data_rejected_without_overwriting(self):
        section = "evaluate-misstatements"
        data = self.complete_data(section)
        self.client.put(self.url(section), {"data": data}, format="json")
        for change in [{"overallMateriality": -1}, {"overallMateriality": "100"},
                       {"misstatements": {}}, {"auditorConclusion": False}]:
            invalid = {**data, **change}
            self.assertEqual(self.client.put(self.url(section), {"data": invalid}, format="json").status_code, 400)
        missing = deepcopy(data)
        missing.pop("auditorConclusion")
        self.assertEqual(self.client.put(self.url(section), {"data": missing}, format="json").status_code, 400)
        self.assertEqual(self.client.get(self.url(section)).data["data"], data)

    def test_duplicate_rows_invalid_dates_and_unknown_section_rejected(self):
        data = self.complete_data("inventory")
        data["risks"] *= 2
        self.assertEqual(self.client.put(self.url("inventory"), {"data": data}, format="json").status_code, 400)
        data = self.complete_data("client-communications")
        data["finalCommunicationDate"] = "2026-99-99"
        self.assertEqual(self.client.put(self.url("client-communications"), {"data": data}, format="json").status_code, 400)
        self.assertEqual(self.client.get(self.url("unknown")).status_code, 404)

    def test_summary_requires_every_real_assignment_including_non_template_areas(self):
        assignment = ReviewAssignment.objects.create(
            engagement=self.engagement, reviewer=self.user, review_area="Custom component review",
            assigned_date=date(2026, 10, 1),
        )
        data = self.complete_data("summary-review")
        self.assertEqual(self.client.put(self.url("summary-review"), {"data": data, "complete": True}, format="json").status_code, 400)
        custom = deepcopy(data["reviewAreas"][0])
        custom.update(id=f"assignment-{assignment.pk}", area=assignment.review_area)
        data["reviewAreas"].append(custom)
        response = self.client.put(self.url("summary-review"), {"data": data, "complete": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(SummaryReview.objects.get().uncorrected_misstatements, data["uncorrectedMisstatements"])
        self.assertEqual(SummaryReview.objects.get().review_areas[-1]["area"], assignment.review_area)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, "Pending")

    def test_preserves_existing_summary_and_exposes_all_sections(self):
        record = SummaryReview.objects.create(
            engagement=self.engagement, overall_conclusion="Existing evidence",
            approval_comments="Existing approval notes", completion_checklist={"legacy": True},
        )
        response = self.client.get(self.url("summary-review"))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["id"], record.pk)
        self.assertEqual(response.data["data"]["approvalComments"], "Existing approval notes")
        self.assertEqual(response.data["data"]["completionChecklist"], {"legacy": True})

    def test_authentication_and_engagement_isolation(self):
        data = self.complete_data("inventory")
        self.assertEqual(self.client.get(self.url("inventory", self.other_engagement)).status_code, 404)
        self.assertEqual(self.client.put(self.url("inventory", self.other_engagement), {"data": data}, format="json").status_code, 404)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url("inventory")).status_code, [401, 403])
        self.assertFalse(EngagementWorkpaper.objects.exists())

    def test_corrupt_stored_record_returns_explicit_error(self):
        EngagementWorkpaper.objects.create(engagement=self.engagement, section="inventory", data={"risks": "corrupt"})
        response = self.client.get(self.url("inventory"))
        self.assertEqual(response.status_code, 400)
