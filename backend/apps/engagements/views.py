from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Engagement
from .serializers import EngagementSerializer


class EngagementViewSet(viewsets.ModelViewSet):
    queryset = (
        Engagement.objects
        .select_related("client", "lead_auditor")
        .all()
        .order_by("-created_at")
    )

    serializer_class = EngagementSerializer

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def roll_forward(self, request, pk=None):
        """
        Roll this engagement forward into a new period.

        Creates a new engagement for the same client and
        carries over structural data — team, chart of
        accounts, and (blank) checklist instances. Prior
        answers, workpaper data, and risk assessments are
        intentionally NOT copied; they must be reperformed.
        """
        source = self.get_object()

        code = str(
            request.data.get("engagement_code") or ""
        ).strip()
        if not code:
            raise ValidationError({
                "engagement_code": "Provide a code for the new engagement.",
            })
        if Engagement.objects.filter(
            engagement_code=code
        ).exists():
            raise ValidationError({
                "engagement_code": "An engagement with this code already exists.",
            })

        start_date = request.data.get("start_date")
        if not start_date:
            raise ValidationError({
                "start_date": "Provide the new period start date.",
            })

        from apps.audit_planning.models import AuditTeamMember
        from apps.checklists.models import (
            ChecklistResponse,
            EngagementChecklist,
        )
        from apps.financials.models import ChartOfAccount

        new_engagement = Engagement.objects.create(
            engagement_code=code,
            client=source.client,
            title=(
                request.data.get("title")
                or f"{source.title} (rolled forward)"
            ),
            engagement_type=source.engagement_type,
            description=source.description,
            lead_auditor=source.lead_auditor,
            risk_level=source.risk_level,
            start_date=start_date,
            planned_end_date=(
                request.data.get("planned_end_date") or None
            ),
            financial_year_end=(
                request.data.get("financial_year_end") or None
            ),
            rolled_forward_from=source,
        )

        # -------------------------------------------------
        # Carry over the audit team
        # -------------------------------------------------
        for member in source.audit_team_members.all():
            AuditTeamMember.objects.create(
                engagement=new_engagement,
                user=member.user,
                role=member.role,
                responsibilities=member.responsibilities,
                budgeted_hours=member.budgeted_hours,
                is_key_member=member.is_key_member,
            )

        # -------------------------------------------------
        # Carry over the chart of accounts
        # -------------------------------------------------
        ChartOfAccount.objects.bulk_create([
            ChartOfAccount(
                engagement=new_engagement,
                account_code=account.account_code,
                account_name=account.account_name,
                account_type=account.account_type,
                financial_statement_section=(
                    account.financial_statement_section
                ),
                description=account.description,
                is_active=account.is_active,
            )
            for account in source.chart_of_accounts.all()
        ])

        # -------------------------------------------------
        # Carry over checklist templates as blank instances
        # -------------------------------------------------
        for checklist in (
            source.checklists.select_related("template").all()
        ):
            if not checklist.template.is_active:
                continue
            new_checklist = EngagementChecklist.objects.create(
                engagement=new_engagement,
                template=checklist.template,
                name=checklist.name,
                created_by=request.user,
            )
            ChecklistResponse.objects.bulk_create([
                ChecklistResponse(
                    engagement_checklist=new_checklist,
                    item=item,
                )
                for item in checklist.template.items.all()
            ])

        serializer = self.get_serializer(new_engagement)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
