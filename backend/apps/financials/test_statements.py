from datetime import date
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.identity.models import User
from .models import (
    Adjustment, ChartOfAccount, FinancialStatementLine, FinancialStatementMapping,
    FinancialStatementVersion, TrialBalance, TrialBalanceLine,
)


class MappedStatementTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.staff = User.objects.create_user(username="statement-staff", role="staff")
        self.manager = User.objects.create_user(username="statement-manager", role="manager")
        self.api.force_authenticate(self.manager)
        client = Client.objects.create(client_code="STATEMENTS", legal_name="Statements")
        self.engagement = Engagement.objects.create(
            client=client, engagement_code="STATEMENTS", title="Statements", start_date=date(2026, 1, 1),
            lead_auditor=self.staff,
        )
        self.current = TrialBalance.objects.create(
            engagement=self.engagement, period_start=date(2026, 1, 1), period_end=date(2026, 12, 31), currency="TZS",
        )
        self.prior = TrialBalance.objects.create(
            engagement=self.engagement, period_start=date(2025, 1, 1), period_end=date(2025, 12, 31), currency="TZS",
        )
        self.accounts = {}
        for group, code, debit, credit in (
            ("asset", "100", 150, 0), ("liability", "200", 0, 30),
            ("equity", "300", 0, 50), ("revenue", "400", 0, 100), ("expense", "500", 30, 0),
        ):
            account = ChartOfAccount.objects.create(
                engagement=self.engagement, account_code=code, account_name=group, account_type=group,
            )
            self.accounts[group] = account
            for tb in (self.current, self.prior):
                TrialBalanceLine.objects.create(
                    trial_balance=tb, account=account, account_code=code, account_name=group, debit=debit, credit=credit,
                )
            line = FinancialStatementLine.objects.create(
                engagement=self.engagement, code=code, label=group, group=group, note_reference="Note 1",
            )
            FinancialStatementMapping.objects.create(account=account, line=line)
        self.url = "/api/financials/statement-versions/"

    def preview(self, **query):
        return self.api.get(f"{self.url}preview/", {"current": self.current.pk, "comparison": self.prior.pk, **query})

    def save(self, **changes):
        self.api.force_authenticate(self.staff)
        return self.api.post(self.url, {
            "current": self.current.pk, "comparison": self.prior.pk, "name": "Version 1", **changes,
        }, format="json")

    def test_comparative_group_totals_and_drilldown_exact_shapes(self):
        response = self.preview()
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertTrue(data["ready_for_approval"])
        self.assertEqual(data["checks"]["current"]["profit"], "70.00")
        self.assertEqual(data["checks"]["current"]["position_difference"], "0.00")
        self.assertEqual(data["checks"]["current"]["tb_difference"], "0.00")
        self.assertEqual(data["checks"]["comparison"]["groups"]["asset"], "150.00")
        revenue = next(line for line in data["lines"] if line["group"] == "revenue")
        self.assertEqual(revenue["current"], "100.00")
        self.assertEqual(revenue["accounts"][0]["current"]["original"], "-100.00")
        self.assertEqual(revenue["accounts"][0]["current"]["display"], "100.00")
        self.assertEqual(revenue["note_reference"], "Note 1")

    def test_statement_access_rejects_unassigned_and_guest_users(self):
        from apps.audit_planning.models import AuditTeamMember

        version = self.save().data
        outsider = User.objects.create_user(username="statement-outsider", role="auditor")
        guest = User.objects.create_user(username="statement-access-guest", role="guest")
        for user in (outsider, guest):
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(f"{self.url}{version['id']}/").status_code, 404)
            self.assertEqual(self.api.get(self.url, {"engagement": self.engagement.pk}).data["count"], 0)
            self.assertEqual(self.preview().status_code, 403)
            self.assertEqual(self.api.post(self.url, {
                "current": self.current.pk, "name": "Private",
            }, format="json").status_code, 403)
        AuditTeamMember.objects.create(engagement=self.engagement, user=outsider, role="auditor")
        self.api.force_authenticate(outsider)
        self.assertEqual(self.api.get(f"{self.url}{version['id']}/").status_code, 200)
        self.assertEqual(self.preview().status_code, 200)
        for role in ("admin", "manager", "partner"):
            user = User.objects.create_user(username=f"statement-access-{role}", role=role)
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(f"{self.url}{version['id']}/").status_code, 200)

    def test_only_posted_adjustments_and_adjustment_only_accounts_included(self):
        extra = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="501", account_name="Extra expense", account_type="expense",
        )
        Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.current, adjustment_number="POSTED", description="Expense",
            debit_account=extra, credit_account=self.accounts["asset"], amount=10, status="posted",
        )
        Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.current, adjustment_number="DRAFT", description="Proposed",
            debit_account=extra, credit_account=self.accounts["asset"], amount=99, status="proposed",
        )
        data = self.preview().data
        self.assertEqual(data["checks"]["current"]["profit"], "60.00")
        self.assertEqual(data["checks"]["current"]["groups"]["asset"], "140.00")
        self.assertEqual(data["checks"]["current"]["posted_adjustment_count"], 1)
        self.assertEqual(data["unmapped"][0]["id"], extra.pk)
        self.assertEqual(data["unmapped"][0]["current"]["original"], "0.00")
        self.assertEqual(data["unmapped"][0]["current"]["adjustment"], "10.00")
        self.assertFalse(data["ready_for_approval"])

    def test_unmapped_prior_only_and_current_only_accounts_remain_visible(self):
        account = self.accounts["expense"]
        TrialBalanceLine.objects.filter(trial_balance=self.current, account=account).delete()
        FinancialStatementMapping.objects.filter(account=account).delete()
        data = self.preview().data
        self.assertEqual(data["unmapped"][0]["comparison"]["adjusted"], "30.00")
        self.assertFalse(data["unmapped"][0]["current"]["present"])
        self.assertFalse(data["ready_for_approval"])

    def test_unbalanced_empty_and_currency_overlap_guard(self):
        TrialBalanceLine.objects.filter(trial_balance=self.current, account=self.accounts["asset"]).update(debit=151)
        data = self.preview().data
        self.assertEqual(data["checks"]["current"]["position_difference"], "1.00")
        self.assertFalse(data["ready_for_approval"])
        self.prior.currency = "USD"
        self.prior.save()
        self.assertEqual(self.preview().status_code, 400)
        self.assertEqual(self.preview(comparison=self.current.pk).status_code, 400)
        TrialBalanceLine.objects.filter(trial_balance=self.current).delete()
        data = self.api.get(f"{self.url}preview/", {"current": self.current.pk}).data
        self.assertFalse(data["ready_for_approval"])
        self.assertIsNone(data["comparison_tb"])

    def test_duplicate_rows_and_foreign_account_rejected(self):
        with self.assertRaises(ValidationError):
            TrialBalanceLine.objects.create(
                trial_balance=self.current, account=self.accounts["asset"], account_code="100", account_name="Duplicate",
            )
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="OTHER-ST", title="Other", start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(engagement=other, account_code="X", account_name="Foreign", account_type="asset")
        TrialBalanceLine.objects.filter(trial_balance=self.current, account=self.accounts["asset"]).update(account=account)
        self.assertEqual(self.preview().status_code, 400)

    def test_saved_snapshot_independent_of_live_mapping_and_amounts(self):
        response = self.save()
        self.assertEqual(response.status_code, 201, response.data)
        version = response.data
        TrialBalanceLine.objects.filter(trial_balance=self.current).update(debit=999)
        FinancialStatementLine.objects.all().update(label="Changed")
        saved = self.api.get(f"{self.url}{version['id']}/").data
        self.assertEqual(saved["results"], version["results"])
        self.assertEqual(saved["fingerprint"], version["fingerprint"])
        self.assertIsNone(saved["approval"])
        model = FinancialStatementVersion.objects.get(pk=version["id"])
        with self.assertRaises(ValidationError):
            model.save()
        with self.assertRaises(ValidationError):
            model.delete()
        self.assertEqual(self.api.patch(f"{self.url}{model.pk}/", {}, format="json").status_code, 405)

    def test_approval_independent_role_and_duplicate_guards(self):
        version = self.save().data
        url = f"{self.url}{version['id']}/approve/"
        self.assertEqual(self.api.post(url, {"note": "Review"}, format="json").status_code, 403)
        self.api.force_authenticate(self.manager)
        response = self.api.post(url, {"note": "Checked mappings and reconciliation."}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["approval"]["actor_identifier"], self.manager.pk)
        self.assertEqual(self.api.post(url, {"note": "Again"}, format="json").status_code, 400)
        approval = FinancialStatementVersion.objects.get(pk=version["id"]).approval
        with self.assertRaises(ValidationError):
            approval.save()
        with self.assertRaises(ValidationError):
            approval.delete()

    def test_manager_cannot_approve_self_and_incomplete_versions_blocked(self):
        response = self.api.post(self.url, {"current": self.current.pk, "name": "Manager version"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.api.post(f"{self.url}{response.data['id']}/approve/", {"note": "Self"}, format="json").status_code, 403)
        FinancialStatementMapping.objects.all().delete()
        version = self.save().data
        self.api.force_authenticate(self.manager)
        self.assertEqual(self.api.post(f"{self.url}{version['id']}/approve/", {"note": "Incomplete"}, format="json").status_code, 400)

    def test_mapping_controls_group_validation_and_protected_lines(self):
        mapping = FinancialStatementMapping.objects.get(account=self.accounts["asset"])
        foreign_group = FinancialStatementLine.objects.get(group="expense")
        self.assertEqual(self.api.patch(
            f"/api/financials/statement-mappings/{mapping.pk}/", {"line": foreign_group.pk}, format="json",
        ).status_code, 400)
        self.assertEqual(self.api.patch(
            f"/api/financials/statement-lines/{mapping.line_id}/", {"group": "expense"}, format="json",
        ).status_code, 400)
        self.assertEqual(self.api.delete(f"/api/financials/statement-lines/{mapping.line_id}/").status_code, 400)
        self.api.force_authenticate(self.staff)
        self.assertEqual(self.api.delete(f"/api/financials/statement-mappings/{mapping.pk}/").status_code, 403)
        guest = User.objects.create_user(username="statement-guest", role="guest")
        self.api.force_authenticate(guest)
        self.assertEqual(self.preview().status_code, 403)
        self.assertEqual(self.api.post(self.url, {"current": self.current.pk, "name": "Guest"}, format="json").status_code, 403)

    def test_version_summary_defers_snapshot_and_requires_engagement(self):
        version = self.save().data
        self.assertEqual(self.api.get(self.url).status_code, 400)
        summary = self.api.get(self.url, {"engagement": self.engagement.pk}).data
        self.assertEqual(summary["count"], 1)
        self.assertEqual(summary["results"][0]["id"], version["id"])
        self.assertNotIn("results", summary["results"][0])

    def test_cross_engagement_comparison_and_mapping_rejected(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="OTHER-MAP", title="Other", start_date=date(2026, 1, 1),
        )
        tb = TrialBalance.objects.create(
            engagement=other, period_start=date(2025, 1, 1), period_end=date(2025, 12, 31),
        )
        self.assertEqual(self.preview(comparison=tb.pk).status_code, 400)
        line = FinancialStatementLine.objects.create(engagement=other, code="100", label="Other asset", group="asset")
        mapping = FinancialStatementMapping.objects.get(account=self.accounts["asset"])
        self.assertEqual(self.api.patch(
            f"/api/financials/statement-mappings/{mapping.pk}/", {"line": line.pk}, format="json",
        ).status_code, 400)
        FinancialStatementMapping.objects.filter(pk=mapping.pk).update(line=line)
        data = self.preview().data
        self.assertEqual(data["unmapped"][0]["reason"], "Mapping group/engagement is inconsistent")
        self.assertFalse(data["ready_for_approval"])

    def test_line_create_edit_mapping_reassign_and_delete_audited(self):
        response = self.api.post("/api/financials/statement-lines/", {
            "engagement": self.engagement.pk, "code": "CASH", "label": "Cash and bank",
            "group": "asset", "note_reference": "Note 2", "order": 1,
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        line = response.data
        mapping = FinancialStatementMapping.objects.get(account=self.accounts["asset"])
        response = self.api.patch(
            f"/api/financials/statement-mappings/{mapping.pk}/", {"line": line["id"]}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.api.get(
            "/api/financials/statement-mappings/", {"engagement": self.engagement.pk},
        ).status_code, 200)
        self.assertEqual(self.api.patch(
            f"/api/financials/statement-lines/{line['id']}/", {"label": "Bank accounts"}, format="json",
        ).status_code, 200)
        self.assertEqual(self.api.delete(f"/api/financials/statement-mappings/{mapping.pk}/").status_code, 204)
        self.assertEqual(self.api.delete(f"/api/financials/statement-lines/{line['id']}/").status_code, 204)
        from .models import FinancialAuditEvent
        self.assertEqual(FinancialAuditEvent.objects.filter(object_type="financialstatementmapping").count(), 2)

    def test_contra_balances_and_many_accounts_per_line_preserve_signed_values(self):
        account = self.accounts["asset"]
        contra = ChartOfAccount.objects.create(
            engagement=self.engagement, account_code="101", account_name="Accumulated depreciation", account_type="asset",
        )
        TrialBalanceLine.objects.create(
            trial_balance=self.current, account=contra, account_code="101", account_name=contra.account_name, credit=5,
        )
        FinancialStatementMapping.objects.create(
            account=contra, line=FinancialStatementMapping.objects.get(account=account).line,
        )
        data = self.preview().data
        row = next(line for line in data["lines"] if line["group"] == "asset")
        self.assertEqual(row["current"], "145.00")
        self.assertEqual(len(row["accounts"]), 2)
        self.assertEqual(row["accounts"][1]["current"]["display"], "-5.00")
        self.assertEqual(row["accounts"][1]["comparison"]["display"], "0.00")

    def test_invalid_foreign_posted_adjustment_rejected(self):
        other = Engagement.objects.create(
            client=self.engagement.client, engagement_code="OTHER-ADJ", title="Other", start_date=date(2026, 1, 1),
        )
        adjustment = Adjustment.objects.create(
            engagement=self.engagement, trial_balance=self.current, adjustment_number="FOREIGN", description="Test",
            debit_account=self.accounts["expense"], credit_account=self.accounts["asset"], amount=1, status="posted",
        )
        Adjustment.objects.filter(pk=adjustment.pk).update(engagement=other)
        self.assertEqual(self.preview().status_code, 400)

    def test_zero_net_unmapped_accounts_still_block_approval(self):
        FinancialStatementMapping.objects.filter(account=self.accounts["asset"]).delete()
        FinancialStatementMapping.objects.filter(account=self.accounts["expense"]).delete()
        TrialBalanceLine.objects.filter(
            trial_balance=self.current, account__in=[self.accounts["asset"], self.accounts["expense"]],
        ).update(debit=0, credit=0)
        data = self.preview().data
        self.assertFalse(data["ready_for_approval"])
        self.assertEqual(len(data["unmapped"]), 2)
