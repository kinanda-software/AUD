from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from .models import User
from datetime import date
from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.review_workflow.models import ReviewAssignment


class UserDeletionTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="delete-admin", role="admin")
        self.target = User.objects.create_user(username="delete-target", role="auditor")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.url = f"/api/auth/users/{self.target.pk}/"

    def test_reviewer_with_audit_records_returns_conflict_without_deleting_records(self):
        client = Client.objects.create(client_code="DELETE-TEST", legal_name="Deletion test")
        engagement = Engagement.objects.create(
            client=client, engagement_code="DELETE-TEST", title="Deletion test",
            start_date=date(2026, 1, 1),
        )
        assignment = ReviewAssignment.objects.create(
            engagement=engagement, reviewer=self.target, review_area="Evidence",
            assigned_date=date(2026, 1, 1),
        )
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 409)
        self.assertIn("deactivate", response.data["error"].lower())
        self.assertTrue(User.objects.filter(pk=self.target.pk).exists())
        self.assertTrue(ReviewAssignment.objects.filter(pk=assignment.pk).exists())
        response = self.client.patch(self.url, {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)
        self.assertTrue(ReviewAssignment.objects.filter(pk=assignment.pk).exists())

    def test_unlinked_account_can_be_deleted(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.target.pk).exists())

    def test_self_deletion_and_non_administrator_deletion_remain_blocked(self):
        self.assertEqual(self.client.delete(f"/api/auth/users/{self.admin.pk}/").status_code, 400)
        self.client.force_authenticate(self.target)
        self.assertEqual(self.client.delete(f"/api/auth/users/{self.admin.pk}/").status_code, 403)


class CurrentUserAuthenticationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="auth-regression", password="Regression-only-password")
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()

    def test_token_authentication_without_session_cookie(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["id"], self.user.pk)
        self.assertNotIn("sessionid", self.client.cookies)

    def test_session_authentication_still_supported(self):
        self.client.force_login(self.user)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], self.user.pk)

    def test_anonymous_invalid_and_inactive_token_rejected(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Token invalid")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_login_token_verifies_after_browser_session_is_discarded(self):
        response = self.client.post("/api/auth/login/", {
            "username": self.user.username, "password": "Regression-only-password",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        token = response.json()["token"]
        self.client.cookies.clear()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
