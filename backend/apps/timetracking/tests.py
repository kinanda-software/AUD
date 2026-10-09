from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import TimeEntry


class TimeEntryModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="timer",
            password="pass1234",
        )
        client_record = Client.objects.create(
            client_code="CL-TT",
            legal_name="TT Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-TT",
            client=client_record,
            title="TT Test Engagement",
            start_date=timezone.now().date(),
        )

    def test_log_time(self):
        entry = TimeEntry.objects.create(
            engagement=self.engagement,
            user=self.user,
            entry_date=timezone.now().date(),
            hours=Decimal("3.50"),
            phase=TimeEntry.Phase.FIELDWORK,
        )
        self.assertEqual(entry.hours, Decimal("3.50"))
        self.assertEqual(
            entry.phase,
            TimeEntry.Phase.FIELDWORK,
        )
