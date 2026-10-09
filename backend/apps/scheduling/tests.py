from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import AuditSchedule


class AuditScheduleModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="scheduler",
            password="pass1234",
        )
        self.client_record = Client.objects.create(
            client_code="CL-SCHED",
            legal_name="Schedule Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-SCHED",
            client=self.client_record,
            title="Schedule Test Engagement",
            start_date=timezone.now().date(),
        )

    def test_create_schedule(self):
        start = timezone.now() + timedelta(days=3)
        schedule = AuditSchedule.objects.create(
            engagement=self.engagement,
            title="Inventory count observation",
            scheduled_start=start,
            scheduled_end=start + timedelta(hours=4),
        )
        schedule.assigned_auditors.add(self.user)

        self.assertEqual(
            schedule.status,
            AuditSchedule.Status.SCHEDULED,
        )
        self.assertIn(self.user, schedule.assigned_auditors.all())

    def test_end_must_be_after_start(self):
        start = timezone.now() + timedelta(days=3)
        schedule = AuditSchedule(
            engagement=self.engagement,
            title="Invalid window",
            scheduled_start=start,
            scheduled_end=start,
        )
        with self.assertRaises(Exception):
            schedule.full_clean()

    def test_next_occurrence_with_recurrence(self):
        start = timezone.now() + timedelta(days=3)
        schedule = AuditSchedule.objects.create(
            engagement=self.engagement,
            title="Annual internal audit",
            scheduled_start=start,
            scheduled_end=start + timedelta(hours=6),
            recurrence_months=12,
        )
        expected = start.replace(year=start.year + 1)
        self.assertEqual(schedule.next_occurrence, expected)

    def test_next_occurrence_none_without_recurrence(self):
        start = timezone.now() + timedelta(days=3)
        schedule = AuditSchedule.objects.create(
            engagement=self.engagement,
            title="One-off",
            scheduled_start=start,
            scheduled_end=start + timedelta(hours=1),
        )
        self.assertIsNone(schedule.next_occurrence)

    def test_add_months_clamps_day(self):
        from datetime import datetime
        from django.utils import timezone as tz
        from .models import _add_months

        jan31 = tz.make_aware(datetime(2026, 1, 31, 9, 0))
        self.assertEqual(
            _add_months(jan31, 1).day,
            28,
        )
