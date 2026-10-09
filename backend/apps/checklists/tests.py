from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import (
    ChecklistItem,
    ChecklistResponse,
    ChecklistTemplate,
    EngagementChecklist,
)


class ChecklistScoringTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="checker",
            password="pass1234",
        )
        client_record = Client.objects.create(
            client_code="CL-CHK",
            legal_name="Checklist Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-CHK",
            client=client_record,
            title="Checklist Test Engagement",
            start_date=timezone.now().date(),
        )
        self.template = ChecklistTemplate.objects.create(
            name="Controls checklist",
        )
        self.item_a = ChecklistItem.objects.create(
            template=self.template,
            order=1,
            question="Are approvals documented?",
            weight=Decimal("2.00"),
        )
        self.item_b = ChecklistItem.objects.create(
            template=self.template,
            order=2,
            question="Is access restricted?",
            weight=Decimal("1.00"),
        )
        self.checklist = EngagementChecklist.objects.create(
            engagement=self.engagement,
            template=self.template,
            name=self.template.name,
        )

    def test_weighted_score_and_rating(self):
        ChecklistResponse.objects.create(
            engagement_checklist=self.checklist,
            item=self.item_a,
            value="yes",
        )
        ChecklistResponse.objects.create(
            engagement_checklist=self.checklist,
            item=self.item_b,
            value="no",
        )

        score = self.checklist.compute_score()

        # 2 of 3 weight earned => 66.7% => C - Fair
        self.assertEqual(score["percent"], 66.7)
        self.assertEqual(score["rating"], "C - Fair")
        self.assertEqual(score["yes"], 1)
        self.assertEqual(score["no"], 1)

    def test_na_responses_are_excluded(self):
        ChecklistResponse.objects.create(
            engagement_checklist=self.checklist,
            item=self.item_a,
            value="yes",
        )
        ChecklistResponse.objects.create(
            engagement_checklist=self.checklist,
            item=self.item_b,
            value="na",
        )

        score = self.checklist.compute_score()

        self.assertEqual(score["percent"], 100.0)
        self.assertEqual(score["rating"], "A - Excellent")
