from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.clients.models import Client
from apps.engagements.models import Engagement

from .models import NonConformance


class NonConformanceModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="capa",
            password="pass1234",
        )
        client_record = Client.objects.create(
            client_code="CL-NC",
            legal_name="NC Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-NC",
            client=client_record,
            title="NC Test Engagement",
            start_date=timezone.now().date(),
        )

    def test_reference_is_auto_generated(self):
        nc = NonConformance.objects.create(
            engagement=self.engagement,
            title="Missing approval on journal",
            description="Journal posted without review.",
            raised_by=self.user,
        )
        self.assertTrue(nc.reference.startswith("NC-"))
        self.assertIn(str(nc.pk), nc.reference)

    def test_default_status_is_open(self):
        nc = NonConformance.objects.create(
            engagement=self.engagement,
            title="Gap",
            description="desc",
        )
        self.assertEqual(
            nc.status,
            NonConformance.Status.OPEN,
        )

    def test_finding_defaults(self):
        nc = NonConformance.objects.create(
            engagement=self.engagement,
            title="Permit signed late",
            description="desc",
            requirement_reference="Manual §4.2",
        )
        self.assertEqual(
            nc.finding_type,
            NonConformance.FindingType.NON_CONFORMITY,
        )
        self.assertEqual(
            nc.category,
            NonConformance.Category.OTHER,
        )
        self.assertEqual(nc.requirement_reference, "Manual §4.2")
        self.assertEqual(nc.correction, "")
        self.assertEqual(nc.verification_notes, "")
