from django.test import TestCase

from .models import FraudReport


class FraudReportModelTests(TestCase):
    def test_reference_is_auto_generated(self):
        report = FraudReport.objects.create(
            subject="Procurement irregularities",
            description="Details of the concern.",
        )
        self.assertTrue(report.reference.startswith("FR-"))
        self.assertEqual(
            report.status,
            FraudReport.Status.SUBMITTED,
        )

    def test_anonymous_report_allowed(self):
        report = FraudReport.objects.create(
            subject="Anonymous concern",
            description="No reporter details given.",
        )
        self.assertEqual(report.reporter_name, "")
        self.assertEqual(report.reporter_email, "")
