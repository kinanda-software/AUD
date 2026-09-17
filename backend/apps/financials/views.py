from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    ChartOfAccount,
    TrialBalance,
    TrialBalanceLine,
)
from .serializers import (
    ChartOfAccountSerializer,
    TrialBalanceSerializer,
    TrialBalanceLineSerializer,
)


class ChartOfAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ChartOfAccountSerializer

    def get_queryset(self):
        queryset = ChartOfAccount.objects.select_related("engagement").all()

        engagement_id = self.request.query_params.get("engagement")

        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)

        return queryset

    @action(detail=False, methods=["get"], url_path="by-engagement/(?P<engagement_id>[^/.]+)")
    def by_engagement(self, request, engagement_id=None):
        accounts = self.get_queryset().filter(
            engagement_id=engagement_id,
            is_active=True,
        )

        serializer = self.get_serializer(accounts, many=True)

        return Response(serializer.data)


class TrialBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = TrialBalanceSerializer

    def get_queryset(self):
        queryset = TrialBalance.objects.select_related("engagement").prefetch_related(
            "lines"
        )

        engagement_id = self.request.query_params.get("engagement")

        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)

        return queryset

    @action(detail=True, methods=["get"], url_path="summary")
    def summary(self, request, pk=None):
        trial_balance = self.get_object()

        return Response(
            {
                "id": trial_balance.id,
                "engagement": trial_balance.engagement_id,
                "period_start": trial_balance.period_start,
                "period_end": trial_balance.period_end,
                "currency": trial_balance.currency,
                "status": trial_balance.status,
                "total_debit": trial_balance.total_debit,
                "total_credit": trial_balance.total_credit,
                "difference": trial_balance.difference,
                "is_balanced": trial_balance.is_balanced,
                "line_count": trial_balance.lines.count(),
            }
        )

    @action(detail=True, methods=["post"], url_path="lock")
    def lock(self, request, pk=None):
        trial_balance = self.get_object()

        if not trial_balance.is_balanced:
            return Response(
                {
                    "detail": "This trial balance cannot be locked because debit and credit totals do not balance.",
                    "total_debit": trial_balance.total_debit,
                    "total_credit": trial_balance.total_credit,
                    "difference": trial_balance.difference,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        trial_balance.status = TrialBalance.Status.LOCKED
        trial_balance.save(update_fields=["status", "updated_at"])

        return Response(
            self.get_serializer(trial_balance).data,
            status=status.HTTP_200_OK,
        )


class TrialBalanceLineViewSet(viewsets.ModelViewSet):
    serializer_class = TrialBalanceLineSerializer

    def get_queryset(self):
        queryset = TrialBalanceLine.objects.select_related(
            "trial_balance",
            "account",
        ).all()

        trial_balance_id = self.request.query_params.get("trial_balance")

        if trial_balance_id:
            queryset = queryset.filter(
                trial_balance_id=trial_balance_id
            )

        return queryset

    def perform_create(self, serializer):
        trial_balance = serializer.validated_data["trial_balance"]

        if trial_balance.status == TrialBalance.Status.LOCKED:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        account = serializer.validated_data["account"]

        serializer.save(
            account_code=account.account_code,
            account_name=account.account_name,
        )

    def perform_update(self, serializer):
        trial_balance = serializer.instance.trial_balance

        if trial_balance.status == TrialBalance.Status.LOCKED:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        account = serializer.validated_data.get(
            "account",
            serializer.instance.account,
        )

        serializer.save(
            account_code=account.account_code,
            account_name=account.account_name,
        )

    def perform_destroy(self, instance):
        if instance.trial_balance.status == TrialBalance.Status.LOCKED:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        instance.delete()
