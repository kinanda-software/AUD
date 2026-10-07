from django.conf import settings
from django.test import SimpleTestCase


class RemovedAssistantTests(SimpleTestCase):
    def test_assistant_is_not_installed_or_configured(self):
        self.assertNotIn("apps.ai_assistant", settings.INSTALLED_APPS)
        self.assertFalse(hasattr(settings, "OPENAI_API_KEY"))
        self.assertFalse(hasattr(settings, "OPENAI_MODEL"))

    def test_old_assistant_api_routes_are_not_available(self):
        self.assertEqual(self.client.get("/api/ai/csrf/").status_code, 404)
        self.assertEqual(
            self.client.post("/api/ai/chat/", {"message": "test"}, content_type="application/json").status_code,
            404,
        )
