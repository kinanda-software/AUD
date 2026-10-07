from django.conf import settings
from django.test import SimpleTestCase


class FrontendOriginTests(SimpleTestCase):
    origins = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    )

    def test_login_preflight_allows_local_frontend_origins(self):
        for origin in self.origins:
            with self.subTest(origin=origin):
                response = self.client.options(
                    "/api/auth/login/",
                    HTTP_ORIGIN=origin,
                    HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
                    HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,authorization",
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["Access-Control-Allow-Origin"], origin)
                self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
                self.assertIn("POST", response["Access-Control-Allow-Methods"])
                self.assertIn("authorization", response["Access-Control-Allow-Headers"])

    def test_auth_responses_allow_local_frontend_origins(self):
        for origin in self.origins:
            with self.subTest(origin=origin):
                login_response = self.client.post(
                    "/api/auth/login/",
                    data="{}",
                    content_type="application/json",
                    HTTP_ORIGIN=origin,
                )
                self.assertEqual(login_response.status_code, 400)
                session_response = self.client.get("/api/auth/me/", HTTP_ORIGIN=origin)
                self.assertEqual(session_response.status_code, 401)
                for response in (login_response, session_response):
                    self.assertEqual(response["Access-Control-Allow-Origin"], origin)
                    self.assertEqual(response["Access-Control-Allow-Credentials"], "true")

    def test_untrusted_origins_receive_no_cors_permission(self):
        for origin in ("http://localhost:3002", "https://untrusted.example"):
            for method in ("options", "post", "get"):
                with self.subTest(origin=origin, method=method):
                    if method == "options":
                        response = self.client.options(
                            "/api/auth/login/",
                            HTTP_ORIGIN=origin,
                            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
                        )
                    elif method == "post":
                        response = self.client.post(
                            "/api/auth/login/",
                            data="{}",
                            content_type="application/json",
                            HTTP_ORIGIN=origin,
                        )
                    else:
                        response = self.client.get("/api/auth/me/", HTTP_ORIGIN=origin)
                    self.assertNotIn("Access-Control-Allow-Origin", response)
                    self.assertNotIn("Access-Control-Allow-Credentials", response)

    def test_session_csrf_trust_includes_local_frontend_origins(self):
        for origin in self.origins:
            with self.subTest(origin=origin):
                self.assertIn(origin, settings.CSRF_TRUSTED_ORIGINS)
