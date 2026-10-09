from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import ReviewPoint


class ReviewPointModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="reviewer",
            password="pass1234",
        )
        client_record = Client.objects.create(
            client_code="CL-RP",
            legal_name="RP Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-RP",
            client=client_record,
            title="RP Test Engagement",
            start_date=timezone.now().date(),
        )

    def test_reference_is_auto_generated(self):
        point = ReviewPoint.objects.create(
            engagement=self.engagement,
            title="Confirm receivables cut-off",
            description="Verify year-end cut-off procedures.",
            raised_by=self.user,
        )
        self.assertTrue(point.reference.startswith("RP-"))
        self.assertEqual(point.status, ReviewPoint.Status.OPEN)

    def test_ordering_newest_first(self):
        first = ReviewPoint.objects.create(
            engagement=self.engagement,
            title="First",
            description="d",
        )
        second = ReviewPoint.objects.create(
            engagement=self.engagement,
            title="Second",
            description="d",
        )
        points = list(ReviewPoint.objects.all())
        self.assertEqual(points[0].pk, second.pk)
        self.assertEqual(points[1].pk, first.pk)
