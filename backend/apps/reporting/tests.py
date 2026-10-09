# The reporting app renders PDFs from models owned by
# other apps and defines no models of its own.
from django.test import SimpleTestCase


class ReportingSmokeTests(SimpleTestCase):
    def test_app_imports(self):
        import apps.reporting.views  # noqa: F401
