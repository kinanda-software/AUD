from rest_framework import serializers

from .models import (
    Adjustment,
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


class AdjustmentSerializer(serializers.ModelSerializer):
    debit_account_name = serializers.CharField(
        source="debit_account.account_name",
        read_only=True,
    )

    credit_account_name = serializers.CharField(
        source="credit_account.account_name",
        read_only=True,
    )

    debit_account_code = serializers.CharField(
        source="debit_account.account_code",
        read_only=True,
    )

    credit_account_code = serializers.CharField(
        source="credit_account.account_code",
        read_only=True,
    )

    class Meta:
        model = Adjustment
        fields = [
            "id",
            "engagement",
            "adjustment_number",
            "description",
            "debit_account",
            "debit_account_code",
            "debit_account_name",
            "credit_account",
            "credit_account_code",
            "credit_account_name",
            "amount",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "debit_account_code",
            "debit_account_name",
            "credit_account_code",
            "credit_account_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        engagement = attrs.get("engagement")
        debit_account = attrs.get("debit_account")
        credit_account = attrs.get("credit_account")
        amount = attrs.get("amount")

        if amount is not None and amount <= 0:
            raise serializers.ValidationError(
                {
                    "amount": "Adjustment amount must be greater than zero."
                }
            )

        if (
            debit_account
            and credit_account
            and debit_account.pk == credit_account.pk
        ):
            raise serializers.ValidationError(
                "Debit and credit accounts must be different."
            )

        if engagement and debit_account:
            if debit_account.engagement.pk != engagement.pk:
                raise serializers.ValidationError(
                    {
                        "debit_account": (
                            "Debit account must belong to the selected engagement."
                        )
                    }
                )

        if engagement and credit_account:
            if credit_account.engagement.pk != engagement.pk:
                raise serializers.ValidationError(
                    {
                        "credit_account": (
                            "Credit account must belong to the selected engagement."
                        )
                    }
                )

        return attrs