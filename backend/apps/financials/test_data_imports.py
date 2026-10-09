import json
from datetime import date
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from openpyxl import Workbook
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    ChartOfAccount,
    FinancialAccountMapping,
    FinancialAuditEvent,
    FinancialDataImport,
    TrialBalance,
)


class FinancialDataImportTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="import-staff", role="staff")
        self.manager = User.objects.create_user(username="import-manager", role="manager")
        self.guest = User.objects.create_user(username="import-guest", role="guest")
        self.api.force_authenticate(self.staff)
        client = Client.objects.create(client_code="IMP", legal_name="Import Client")
        self.engagement = Engagement.objects.create(
            client=client,
            engagement_code="IMP",
            title="Import Engagement",
            start_date=date(2026, 1, 1),
        )
        self.cash = self.account("1000", "Cash")
        self.revenue = self.account("4000", "Revenue", "revenue")
        self.url = "/api/financials/data-imports/"

    def account(self, code, name, kind="asset"):
        return ChartOfAccount.objects.create(
            engagement=self.engagement,
            account_code=code,
            account_name=name,
            account_type=kind,
        )

    def metadata(self):
        return {
            "engagement": self.engagement.pk,
            "source_system": "Test ERP",
            "period_start": "2026-01-01",
            "period_end": "2026-12-31",
            "currency": "TZS",
        }

    def upload_csv(self, content=None, source_name="trial-balance.csv"):
        return SimpleUploadedFile(
            source_name,
            (content or "account_code,debit,credit\n1000,100.00,\n4000,,100.00\n").encode(),
            content_type="text/csv",
        )

    def test_csv_is_snapshotted_and_only_manager_can_commit(self):
        response = self.api.post(self.url, {
            **self.metadata(),
            "column_mapping": json.dumps({
                "account_code": "account_code",
                "debit": "debit",
                "credit": "credit",
            }),
            "file": self.upload_csv(),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "validated")
        self.assertEqual(response.data["row_count"], 2)
        self.assertEqual(response.data["total_debit"], "100.00")
        self.assertEqual(response.data["total_credit"], "100.00")
        self.assertEqual(response.data["preview_rows"][0]["account_id"], self.cash.pk)
        self.assertEqual(
            self.api.post(f"{self.url}{response.data['id']}/commit/", {}, format="json").status_code,
            403,
        )
        self.api.force_authenticate(self.manager)
        committed = self.api.post(f"{self.url}{response.data['id']}/commit/", {}, format="json")
        self.assertEqual(committed.status_code, 201, committed.data)
        trial_balance = TrialBalance.objects.get(pk=committed.data["trial_balance_id"])
        self.assertEqual(trial_balance.status, TrialBalance.Status.IMPORTED)
        self.assertEqual(trial_balance.lines.count(), 2)
        self.assertEqual(committed.data["status"], "imported")
        actions = list(
            FinancialAuditEvent.objects.filter(object_type="financial_data_import")
            .order_by("id")
            .values_list("action", flat=True)
        )
        self.assertEqual(actions, ["created", "imported"])
        self.assertEqual(
            self.api.post(f"{self.url}{response.data['id']}/commit/", {}, format="json").status_code,
            400,
        )

    def test_unbalanced_or_unmapped_rows_are_kept_for_review_and_not_imported(self):
        response = self.api.post(self.url, {
            **self.metadata(),
            "file": self.upload_csv(
                "account_code,debit,credit\n1000,100.00,\nUNKNOWN,,90.00\n",
            ),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "needs_review")
        errors = response.data["validation_errors"]
        self.assertTrue(any(item["field"] == "account_code" for item in errors))
        self.assertTrue(any(item["field"] == "reconciliation" for item in errors))
        self.api.force_authenticate(self.manager)
        self.assertEqual(
            self.api.post(f"{self.url}{response.data['id']}/commit/", {}, format="json").status_code,
            400,
        )
        self.assertFalse(TrialBalance.objects.exists())

    def test_duplicate_upload_is_detected_and_period_duplicate_is_rejected(self):
        first = self.api.post(self.url, {
            **self.metadata(), "file": self.upload_csv(),
        }, format="multipart")
        self.assertEqual(first.status_code, 201, first.data)
        duplicate = self.api.post(self.url, {
            **self.metadata(), "file": self.upload_csv(),
        }, format="multipart")
        self.assertEqual(duplicate.status_code, 201, duplicate.data)
        self.assertEqual(duplicate.data["status"], "needs_review")
        self.assertIn("already received", duplicate.data["validation_errors"][0]["message"])

        other = self.api.post(self.url, {
            **self.metadata(),
            "period_start": "2025-01-01",
            "period_end": "2025-12-31",
            "file": self.upload_csv(source_name="prior-year.csv"),
        }, format="multipart")
        self.assertEqual(other.status_code, 201, other.data)
        self.api.force_authenticate(self.manager)
        self.assertEqual(
            self.api.post(f"{self.url}{first.data['id']}/commit/", {}, format="json").status_code,
            201,
        )
        # Re-use the same period through a different source file: the existing TB blocks it.
        same_period = self.api.post(self.url, {
            **self.metadata(),
            "source_system": "Second ERP",
            "file": self.upload_csv(source_name="different.csv"),
        }, format="multipart")
        self.assertEqual(same_period.status_code, 201, same_period.data)
        self.assertEqual(same_period.data["status"], "needs_review")
        self.assertTrue(any(error["field"] == "period" for error in same_period.data["validation_errors"]))

    def test_xlsx_import_and_json_api_ingestion_use_source_account_mappings(self):
        forbidden = self.api.post("/api/financials/account-mappings/", {
            "engagement": self.engagement.pk,
            "source_system": "Workbook ERP",
            "external_code": "CASH-GL",
            "account": self.cash.pk,
        }, format="json")
        self.assertEqual(forbidden.status_code, 403)
        self.api.force_authenticate(self.manager)
        mapping = self.api.post("/api/financials/account-mappings/", {
            "engagement": self.engagement.pk,
            "source_system": "Workbook ERP",
            "external_code": "CASH-GL",
            "account": self.cash.pk,
        }, format="json")
        self.assertEqual(mapping.status_code, 201, mapping.data)
        self.assertEqual(FinancialAccountMapping.objects.count(), 1)
        self.api.force_authenticate(self.staff)

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["GL Code", "Debit Amount", "Credit Amount"])
        sheet.append(["CASH-GL", 25, None])
        sheet.append(["4000", None, 25])
        content = BytesIO()
        workbook.save(content)
        upload = SimpleUploadedFile("export.xlsx", content.getvalue())
        xlsx = self.api.post(self.url, {
            **self.metadata(),
            "source_system": "Workbook ERP",
            "column_mapping": json.dumps({
                "account_code": "GL Code",
                "debit": "Debit Amount",
                "credit": "Credit Amount",
            }),
            "file": upload,
        }, format="multipart")
        self.assertEqual(xlsx.status_code, 201, xlsx.data)
        self.assertEqual(xlsx.data["status"], "validated")
        self.assertEqual(xlsx.data["source_format"], "xlsx")

        api_rows = self.api.post(self.url, {
            **self.metadata(),
            "source_system": "API ERP",
            "rows": [
                {"account_code": "1000", "debit": "5.00", "credit": "0"},
                {"account_code": "4000", "debit": "0", "credit": "5.00"},
            ],
        }, format="json")
        self.assertEqual(api_rows.status_code, 201, api_rows.data)
        self.assertEqual(api_rows.data["source_format"], "json")
        self.assertEqual(api_rows.data["status"], "validated")

    def test_duplicate_accounts_invalid_amounts_and_guest_write_are_rejected(self):
        duplicate_account = self.api.post(self.url, {
            **self.metadata(),
            "file": self.upload_csv("account_code,debit,credit\n1000,30,\n1000,20,\n"),
        }, format="multipart")
        self.assertEqual(duplicate_account.status_code, 201, duplicate_account.data)
        self.assertEqual(duplicate_account.data["status"], "needs_review")
        self.assertTrue(any("Duplicate mapped account" in item["message"] for item in duplicate_account.data["validation_errors"]))

        invalid_amount = self.api.post(self.url, {
            **self.metadata(),
            "file": self.upload_csv("account_code,debit,credit\n1000,1.001,\n4000,,1.001\n"),
        }, format="multipart")
        self.assertEqual(invalid_amount.status_code, 201, invalid_amount.data)
        self.assertTrue(any(item["field"] == "debit" for item in invalid_amount.data["validation_errors"]))
        self.api.force_authenticate(self.guest)
        self.assertEqual(self.api.post(self.url, {
            **self.metadata(), "file": self.upload_csv(source_name="guest.csv"),
        }, format="multipart").status_code, 403)
