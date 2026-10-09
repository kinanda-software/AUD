from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from .models import AuditRequest


class AuditRequestModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="intake",
            password="pass1234",
        )

    def test_reference_is_auto_generated(self):
        request_obj = AuditRequest.objects.create(
            company_name="Acme Logistics",
            contact_name="Jane Doe",
            contact_email="jane@example.com",
            created_by=self.user,
        )
        self.assertTrue(request_obj.reference.startswith("AR-"))
        self.assertEqual(
            request_obj.status,
            AuditRequest.Status.SUBMITTED,
        )

    def test_default_dates_optional(self):
        request_obj = AuditRequest.objects.create(
            company_name="No Dates Co",
            contact_name="A",
            contact_email="a@example.com",
            preferred_start_date=timezone.now().date(),
        )
        self.assertIsNone(request_obj.preferred_end_date)
