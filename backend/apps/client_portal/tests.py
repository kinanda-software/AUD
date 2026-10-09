from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from .models import ClientRegistration


class ClientRegistrationModelTests(TestCase):
    def test_reference_is_auto_generated(self):
        registration = ClientRegistration.objects.create(
            legal_name="Portal Test Co",
            contact_person="Sam",
            contact_email="sam@example.com",
        )
        self.assertTrue(registration.reference.startswith("REG-"))
        self.assertEqual(
            registration.status,
            ClientRegistration.Status.PENDING,
        )

    def test_otp_fields_default(self):
        registration = ClientRegistration.objects.create(
            legal_name="OTP Co",
            contact_person="A",
            contact_email="a@example.com",
            otp_code="123456",
            otp_expires_at=timezone.now() + timedelta(minutes=10),
        )
        self.assertEqual(registration.otp_attempts, 0)
        self.assertEqual(len(registration.otp_code), 6)
