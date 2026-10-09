from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.clients.models import Client
from apps.engagements.models import Engagement
from django.utils import timezone

from .models import EvidenceFile


class EvidenceFileModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="uploader",
            password="pass1234",
        )
        client_record = Client.objects.create(
            client_code="CL-EVD",
            legal_name="Evidence Test Client",
        )
        self.engagement = Engagement.objects.create(
            engagement_code="ENG-EVD",
            client=client_record,
            title="Evidence Test Engagement",
            start_date=timezone.now().date(),
        )

    def test_upload_metadata(self):
        upload = SimpleUploadedFile(
            "bank-letter.pdf",
            b"%PDF-1.4 test evidence",
            content_type="application/pdf",
        )
        evidence = EvidenceFile.objects.create(
            engagement=self.engagement,
            file=upload,
            original_filename=upload.name,
            content_type=upload.content_type,
            file_size=upload.size,
            uploaded_by=self.user,
        )

        self.assertEqual(evidence.extension, "pdf")
        self.assertGreater(evidence.file_size, 0)
