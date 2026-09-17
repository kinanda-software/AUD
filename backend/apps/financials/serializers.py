from rest_framework import serializers

from .models import (
    ChartOfAccount,
    TrialBalance,
    TrialBalanceLine,
)


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = [
            "id",
            "engagement",
            "account_code",
            "account_name",
            "account_type",
            "financial_statement_section",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class TrialBalanceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrialBalanceLine
        fields = [
            "id",
            "trial_balance",
            "account",
            "account_code",
            "account_name",
            "debit",
            "credit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "account_code",
            "account_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        debit = attrs.get("debit", 0)
        credit = attrs.get("credit", 0)

        if debit < 0:
            raise serializers.ValidationError(
                {"debit": "Debit cannot be negative."}
            )

        if credit < 0:
            raise serializers.ValidationError(
                {"credit": "Credit cannot be negative."}
            )

        if debit > 0 and credit > 0:
            raise serializers.ValidationError(
                "A trial balance line cannot have both debit and credit."
            )

        if debit == 0 and credit == 0:
            raise serializers.ValidationError(
                "A trial balance line must have either a debit or a credit amount."
            )

        trial_balance = attrs.get("trial_balance")

        if trial_balance and trial_balance.status == TrialBalance.Status.LOCKED:
            raise serializers.ValidationError(
                "A locked trial balance cannot be modified."
            )

        return attrs


class TrialBalanceSerializer(serializers.ModelSerializer):
    lines = TrialBalanceLineSerializer(many=True, read_only=True)

    total_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
    )

    total_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
    )

    difference = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
    )

    is_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = TrialBalance
        fields = [
            "id",
            "engagement",
            "period_start",
            "period_end",
            "currency",
            "status",
            "description",
            "lines",
            "total_debit",
            "total_credit",
            "difference",
            "is_balanced",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "lines",
            "total_debit",
            "total_credit",
            "difference",
            "is_balanced",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        period_start = attrs.get("period_start")
        period_end = attrs.get("period_end")

        if period_start and period_end and period_start > period_end:
            raise serializers.ValidationError(
                {
                    "period_end": "Period end date cannot be before period start date."
                }
            )

        return attrs