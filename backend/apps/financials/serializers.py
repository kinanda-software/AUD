from decimal import Decimal

from rest_framework import serializers
from .accounting_controls import source_journal

from .models import (
    Adjustment,
    BankStatement,
    BankStatementLine,
    ChartOfAccount,
    FinancialAuditEvent,
    FinancialBudget,
    FinancialBudgetLine,
    FinancialDimension,
    FinancialDimension,
    GeneralLedger,
    JournalEntry,
    JournalLine,
    LeadSchedule,
    SupportingDetail,
    TrialBalance,
    TrialBalanceLine,
    
    
)


# =========================================================
# CHART OF ACCOUNTS
# =========================================================

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


# =========================================================
# TRIAL BALANCE LINE
# =========================================================

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

        # -----------------------------------------------------
        # Debit cannot be negative
        # -----------------------------------------------------

        if debit < 0:
            raise serializers.ValidationError(
                {
                    "debit": "Debit cannot be negative."
                }
            )

        # -----------------------------------------------------
        # Credit cannot be negative
        # -----------------------------------------------------

        if credit < 0:
            raise serializers.ValidationError(
                {
                    "credit": "Credit cannot be negative."
                }
            )

        # -----------------------------------------------------
        # Cannot have both debit and credit
        # -----------------------------------------------------

        if debit > 0 and credit > 0:
            raise serializers.ValidationError(
                "A trial balance line cannot have both "
                "debit and credit."
            )

        # -----------------------------------------------------
        # Must have a balance
        # -----------------------------------------------------

        if debit == 0 and credit == 0:
            raise serializers.ValidationError(
                "A trial balance line must have either "
                "a debit or a credit amount."
            )

        # -----------------------------------------------------
        # Locked Trial Balance
        # -----------------------------------------------------

        trial_balance = attrs.get("trial_balance")

        if (
            trial_balance
            and trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise serializers.ValidationError(
                "A locked trial balance cannot be modified."
            )

        return attrs


# =========================================================
# TRIAL BALANCE
# =========================================================

class TrialBalanceSerializer(serializers.ModelSerializer):
    lines = TrialBalanceLineSerializer(
        many=True,
        read_only=True,
    )

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

    is_balanced = serializers.BooleanField(
        read_only=True,
    )

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

        if (
            period_start
            and period_end
            and period_start > period_end
        ):
            raise serializers.ValidationError(
                {
                    "period_end": (
                        "Period end date cannot be before "
                        "period start date."
                    )
                }
            )

        return attrs


# =========================================================
# ADJUSTMENTS
# =========================================================

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

    trial_balance_status = serializers.CharField(
        source="trial_balance.status",
        read_only=True,
    )

    class Meta:
        model = Adjustment

        fields = [
            "id",
            "engagement",

            # Trial Balance
            "trial_balance",
            "trial_balance_status",

            # Adjustment
            "adjustment_number",
            "description",

            # Debit Account
            "debit_account",
            "debit_account_code",
            "debit_account_name",

            # Credit Account
            "credit_account",
            "credit_account_code",
            "credit_account_name",

            # Amount / Status
            "amount",
            "status",

            # Memorandum (disclosure-only) flag
            "is_memorandum",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "trial_balance_status",
            "debit_account_code",
            "debit_account_name",
            "credit_account_code",
            "credit_account_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # -----------------------------------------------------
        # Existing values for PATCH requests
        # -----------------------------------------------------

        engagement = attrs.get(
            "engagement",
            getattr(
                self.instance,
                "engagement",
                None,
            ),
        )

        trial_balance = attrs.get(
            "trial_balance",
            getattr(
                self.instance,
                "trial_balance",
                None,
            ),
        )

        debit_account = attrs.get(
            "debit_account",
            getattr(
                self.instance,
                "debit_account",
                None,
            ),
        )

        credit_account = attrs.get(
            "credit_account",
            getattr(
                self.instance,
                "credit_account",
                None,
            ),
        )

        amount = attrs.get(
            "amount",
            getattr(
                self.instance,
                "amount",
                None,
            ),
        )

        # =====================================================
        # ENGAGEMENT
        # =====================================================

        if not engagement:
            raise serializers.ValidationError(
                {
                    "engagement": (
                        "Engagement is required."
                    )
                }
            )

        # =====================================================
        # TRIAL BALANCE
        # =====================================================

        if not trial_balance:
            raise serializers.ValidationError(
                {
                    "trial_balance": (
                        "Trial balance is required for "
                        "an adjustment."
                    )
                }
            )

        # =====================================================
        # TRIAL BALANCE MUST BELONG TO ENGAGEMENT
        # =====================================================

        if (
            trial_balance.engagement_id
            != engagement.pk
        ):
            raise serializers.ValidationError(
                {
                    "trial_balance": (
                        "Trial balance must belong to "
                        "the selected engagement."
                    )
                }
            )

        # =====================================================
        # LOCKED TRIAL BALANCE
        # =====================================================
        #
        # IMPORTANT:
        #
        # A locked Trial Balance freezes the ORIGINAL
        # accounting data.
        #
        # Audit adjustments are separate audit entries.
        # Therefore, adjustments are still allowed against
        # a locked Trial Balance.
        #
        # The Trial Balance lines themselves remain immutable.
        #
        # =====================================================

        # No lock validation here.

        # =====================================================
        # AMOUNT
        # =====================================================

        if (
            amount is not None
            and amount <= Decimal("0.00")
        ):
            raise serializers.ValidationError(
                {
                    "amount": (
                        "Adjustment amount must be "
                        "greater than zero."
                    )
                }
            )

        # =====================================================
        # DEBIT / CREDIT ACCOUNTS
        # =====================================================

        if (
            debit_account
            and credit_account
            and debit_account.pk
            == credit_account.pk
        ):
            raise serializers.ValidationError(
                (
                    "Debit and credit accounts must "
                    "be different."
                )
            )

        # =====================================================
        # DEBIT ACCOUNT MUST BELONG TO ENGAGEMENT
        # =====================================================

        if debit_account:
            if (
                debit_account.engagement_id
                != engagement.pk
            ):
                raise serializers.ValidationError(
                    {
                        "debit_account": (
                            "Debit account must belong "
                            "to the selected engagement."
                        )
                    }
                )

        # =====================================================
        # CREDIT ACCOUNT MUST BELONG TO ENGAGEMENT
        # =====================================================

        if credit_account:
            if (
                credit_account.engagement_id
                != engagement.pk
            ):
                raise serializers.ValidationError(
                    {
                        "credit_account": (
                            "Credit account must belong "
                            "to the selected engagement."
                        )
                    }
                )

        return attrs


# =========================================================
# LEAD SCHEDULE
# =========================================================

class LeadScheduleSerializer(serializers.ModelSerializer):
    engagement_name = serializers.CharField(
        source="engagement.title",
        read_only=True,
    )

    trial_balance_period_start = serializers.DateField(
        source="trial_balance.period_start",
        read_only=True,
    )

    trial_balance_period_end = serializers.DateField(
        source="trial_balance.period_end",
        read_only=True,
    )

    trial_balance_status = serializers.CharField(
        source="trial_balance.status",
        read_only=True,
    )

    account_code = serializers.CharField(
        source="account.account_code",
        read_only=True,
    )

    account_name = serializers.CharField(
        source="account.account_name",
        read_only=True,
    )

    # =========================================================
    # SUPPORTING DETAILS RECONCILIATION
    # =========================================================

    supporting_details_total = (
        serializers.SerializerMethodField()
    )

    supporting_details_difference = (
        serializers.SerializerMethodField()
    )

    supporting_details_reconciled = (
        serializers.SerializerMethodField()
    )

    supporting_reconciliation_status = (
        serializers.SerializerMethodField()
    )

    supporting_exception_count = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = LeadSchedule

        fields = [
            "id",

            # Engagement
            "engagement",
            "engagement_name",

            # Trial Balance
            "trial_balance",
            "trial_balance_period_start",
            "trial_balance_period_end",
            "trial_balance_status",

            # Account
            "account",
            "account_code",
            "account_name",

            # Lead Schedule
            "schedule_name",
            "reference",
            "purpose",
            "opening_balance",
            "adjustments",
            "adjusted_balance",
            "auditor_notes",
            "conclusion",
            "status",

            # Supporting Details Reconciliation
            "supporting_details_total",
            "supporting_details_difference",
            "supporting_details_reconciled",
            "supporting_reconciliation_status",
            "supporting_exception_count",

            # Audit timestamps
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",

            "engagement_name",

            "trial_balance_period_start",
            "trial_balance_period_end",
            "trial_balance_status",

            "account_code",
            "account_name",

            "supporting_details_total",
            "supporting_details_difference",
            "supporting_details_reconciled",
            "supporting_reconciliation_status",
            "supporting_exception_count",

            "created_at",
            "updated_at",
        ]

    # =========================================================
    # SUPPORTING DETAILS CALCULATIONS
    # =========================================================

    def get_supporting_details_total(self, obj):
        return sum(
            (
                detail.amount
                for detail in obj.supporting_details.all()
            ),
            Decimal("0.00"),
        )

    def get_supporting_details_difference(self, obj):
        supporting_total = (
            self.get_supporting_details_total(obj)
        )

        return (
            obj.adjusted_balance
            - supporting_total
        )

    def get_supporting_details_reconciled(self, obj):
        supporting_details = (
            obj.supporting_details.all()
        )

        # No supporting details means the schedule
        # is NOT reconciled.
        if not supporting_details.exists():
            return False

        supporting_total = (
            self.get_supporting_details_total(obj)
        )

        difference = (
            obj.adjusted_balance
            - supporting_total
        )

        return difference == Decimal("0.00")

    def get_supporting_reconciliation_status(self, obj):
        supporting_details = (
            obj.supporting_details.all()
        )

        # -----------------------------------------------------
        # 1. No supporting details
        # -----------------------------------------------------

        if not supporting_details.exists():
            return "no_support"

        supporting_total = (
            self.get_supporting_details_total(obj)
        )

        difference = (
            obj.adjusted_balance
            - supporting_total
        )

        # -----------------------------------------------------
        # 2. Supporting details do not reconcile
        # -----------------------------------------------------

        if difference != Decimal("0.00"):
            return "not_reconciled"

        # -----------------------------------------------------
        # 3. Amounts reconcile but exceptions exist
        # -----------------------------------------------------

        exception_exists = (
            supporting_details.filter(
                status=SupportingDetail.Status.EXCEPTION
            ).exists()
        )

        if exception_exists:
            return "reconciled_with_exceptions"

        # -----------------------------------------------------
        # 4. Fully reconciled
        # -----------------------------------------------------

        return "reconciled"

    def get_supporting_exception_count(self, obj):
        return obj.supporting_details.filter(
            status=SupportingDetail.Status.EXCEPTION
        ).count()

    # =========================================================
    # VALIDATION
    # =========================================================

    def validate(self, attrs):
        engagement = attrs.get(
            "engagement",
            getattr(
                self.instance,
                "engagement",
                None,
            ),
        )

        trial_balance = attrs.get(
            "trial_balance",
            getattr(
                self.instance,
                "trial_balance",
                None,
            ),
        )

        account = attrs.get(
            "account",
            getattr(
                self.instance,
                "account",
                None,
            ),
        )

        opening_balance = attrs.get(
            "opening_balance",
            getattr(
                self.instance,
                "opening_balance",
                0,
            ),
        )

        # -----------------------------------------------------
        # Engagement
        # -----------------------------------------------------

        if not engagement:
            raise serializers.ValidationError(
                {
                    "engagement": (
                        "Engagement is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Trial Balance
        # -----------------------------------------------------

        if not trial_balance:
            raise serializers.ValidationError(
                {
                    "trial_balance": (
                        "Trial balance is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Account
        # -----------------------------------------------------

        if not account:
            raise serializers.ValidationError(
                {
                    "account": (
                        "Account is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Trial Balance / Engagement
        # -----------------------------------------------------

        if (
            trial_balance.engagement_id
            != engagement.pk
        ):
            raise serializers.ValidationError(
                {
                    "trial_balance": (
                        "Trial balance must belong to "
                        "the selected engagement."
                    )
                }
            )

        # -----------------------------------------------------
        # Account / Engagement
        # -----------------------------------------------------

        if (
            account.engagement_id
            != engagement.pk
        ):
            raise serializers.ValidationError(
                {
                    "account": (
                        "Account must belong to "
                        "the selected engagement."
                    )
                }
            )

        # -----------------------------------------------------
        # Opening Balance
        # -----------------------------------------------------

        if opening_balance < 0:
            raise serializers.ValidationError(
                {
                    "opening_balance": (
                        "Opening balance cannot be negative."
                    )
                }
            )

        # -----------------------------------------------------
        # Locked Trial Balance
        # -----------------------------------------------------

        if (
            self.instance
            and self.instance.trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise serializers.ValidationError(
                (
                    "A Lead Schedule linked to a locked "
                    "trial balance cannot be modified."
                )
            )

        return attrs


# =========================================================
# SUPPORTING DETAILS
# =========================================================

class SupportingDetailSerializer(
    serializers.ModelSerializer
):
    lead_schedule_name = serializers.CharField(
        source="lead_schedule.schedule_name",
        read_only=True,
    )

    lead_schedule_adjusted_balance = (
        serializers.DecimalField(
            source="lead_schedule.adjusted_balance",
            max_digits=18,
            decimal_places=2,
            read_only=True,
        )
    )

    class Meta:
        model = SupportingDetail

        fields = [
            "id",
            "lead_schedule",
            "lead_schedule_name",
            "lead_schedule_adjusted_balance",
            "description",
            "reference",
            "amount",
            "audit_notes",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "lead_schedule_name",
            "lead_schedule_adjusted_balance",
            "created_at",
            "updated_at",
        ]


# =========================================================
# ADJUSTED TRIAL BALANCE LINE
# =========================================================

class AdjustedTrialBalanceLineSerializer(
    serializers.Serializer
):
    account = serializers.IntegerField()

    account_code = serializers.CharField()

    account_name = serializers.CharField()

    account_type = serializers.CharField(
        allow_blank=True,
        required=False,
        default="",
    )

    financial_statement_section = serializers.CharField(
        allow_blank=True,
        required=False,
        default="",
    )

    original_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    original_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjustment_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjustment_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjusted_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjusted_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )


# =========================================================
# ADJUSTED TRIAL BALANCE
# =========================================================

class AdjustedTrialBalanceSerializer(
    serializers.Serializer
):
    """
    Adjusted Trial Balance serializer.

    Accounting formula:

        Original Trial Balance
        +
        Posted Audit Adjustments
        =
        Adjusted Trial Balance

    Proposed and rejected adjustments do not affect
    the Adjusted Trial Balance.
    """

    # =====================================================
    # TRIAL BALANCE INFORMATION
    # =====================================================

    trial_balance = serializers.IntegerField()

    engagement = serializers.IntegerField()

    period_start = serializers.DateField()

    period_end = serializers.DateField()

    currency = serializers.CharField()

    status = serializers.CharField()

    description = serializers.CharField(
        allow_blank=True
    )

    # =====================================================
    # ORIGINAL TRIAL BALANCE
    # =====================================================

    original_total_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    original_total_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    original_difference = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    # =====================================================
    # POSTED AUDIT ADJUSTMENTS
    # =====================================================

    adjustment_total_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjustment_total_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjustment_difference = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    # =====================================================
    # ADJUSTED TRIAL BALANCE
    # =====================================================

    adjusted_total_debit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjusted_total_credit = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    adjusted_difference = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    is_balanced = serializers.BooleanField()

    # =====================================================
    # POSTED ADJUSTMENT COUNT
    # =====================================================

    posted_adjustment_count = serializers.IntegerField(
        default=0
    )

    # =====================================================
    # ATB LINES
    # =====================================================

    lines = AdjustedTrialBalanceLineSerializer(
        many=True
    )

    # =====================================================
    # TRANSFORM RESPONSE
    # =====================================================

    def to_representation(self, instance):
        """
        Convert the flat backend ATB calculation into
        the structured response expected by the frontend.
        """

        data = super().to_representation(instance)

        # =================================================
        # TRIAL BALANCE OBJECT
        # =================================================

        trial_balance_data = {
            "id": data["trial_balance"],
            "engagement": data["engagement"],
            "period_start": data["period_start"],
            "period_end": data["period_end"],
            "currency": data["currency"],
            "status": data["status"],
            "description": data["description"],
        }

        # =================================================
        # SUMMARY
        # =================================================

        summary_data = {
            "total_original_debit": data[
                "original_total_debit"
            ],

            "total_original_credit": data[
                "original_total_credit"
            ],

            "total_adjustment_debit": data[
                "adjustment_total_debit"
            ],

            "total_adjustment_credit": data[
                "adjustment_total_credit"
            ],

            "total_adjusted_debit": data[
                "adjusted_total_debit"
            ],

            "total_adjusted_credit": data[
                "adjusted_total_credit"
            ],

            "difference": data[
                "adjusted_difference"
            ],

            "is_balanced": data[
                "is_balanced"
            ],

            "line_count": len(
                data["lines"]
            ),

            "posted_adjustment_count": data[
                "posted_adjustment_count"
            ],
        }

        # =================================================
        # NORMALIZE LINES
        # =================================================

        normalized_lines = []

        for line in data["lines"]:
            normalized_lines.append(
                {
                    "account_id": line["account"],

                    "account_code": line[
                        "account_code"
                    ],

                    "account_name": line[
                        "account_name"
                    ],

                    "account_type": line.get(
                        "account_type",
                        "",
                    ),

                    "financial_statement_section": (
                        line.get(
                            "financial_statement_section",
                            "",
                        )
                    ),

                    "original_debit": line[
                        "original_debit"
                    ],

                    "original_credit": line[
                        "original_credit"
                    ],

                    "adjustment_debit": line[
                        "adjustment_debit"
                    ],

                    "adjustment_credit": line[
                        "adjustment_credit"
                    ],

                    "adjusted_debit": line[
                        "adjusted_debit"
                    ],

                    "adjusted_credit": line[
                        "adjusted_credit"
                    ],
                }
            )

        # =================================================
        # FINAL API RESPONSE
        # =================================================

        return {
            "trial_balance": trial_balance_data,
            "summary": summary_data,
            "lines": normalized_lines,
        }

    # =========================================================
# GENERAL LEDGER
# =========================================================

class GeneralLedgerSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(
        source="account.account_code",
        read_only=True,
    )

    account_name = serializers.CharField(
        source="account.account_name",
        read_only=True,
    )

    account_type = serializers.CharField(
        source="account.account_type",
        read_only=True,
    )

    financial_statement_section = serializers.CharField(
        source="account.financial_statement_section",
        read_only=True,
    )

    amount = serializers.SerializerMethodField()
    dimensions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=FinancialDimension.objects.all(),
        required=False,
    )
    dimension_values = serializers.SerializerMethodField()

    class Meta:
        model = GeneralLedger

        fields = [
            "id",
            "engagement",
            "account",
            "journal_line",
            "dimensions",
            "dimension_values",
            "account_code",
            "account_name",
            "account_type",
            "financial_statement_section",
            "transaction_date",
            "reference",
            "description",
            "debit",
            "credit",
            "amount",
            "source",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "journal_line",
            "account_code",
            "account_name",
            "account_type",
            "financial_statement_section",
            "amount",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        engagement = attrs.get(
            "engagement",
            getattr(
                self.instance,
                "engagement",
                None,
            ),
        )

        account = attrs.get(
            "account",
            getattr(
                self.instance,
                "account",
                None,
            ),
        )

        debit = attrs.get(
            "debit",
            getattr(
                self.instance,
                "debit",
                Decimal("0.00"),
            ),
        )

        credit = attrs.get(
            "credit",
            getattr(
                self.instance,
                "credit",
                Decimal("0.00"),
            ),
        )

        if not engagement:
            raise serializers.ValidationError(
                {
                    "engagement": (
                        "Engagement is required."
                    )
                }
            )

        if not account:
            raise serializers.ValidationError(
                {
                    "account": (
                        "Account is required."
                    )
                }
            )

        if (
            account.engagement_id
            != engagement.pk
        ):
            raise serializers.ValidationError(
                {
                    "account": (
                        "Account must belong to "
                        "the selected engagement."
                    )
                }
            )

        dimensions = attrs.get(
            "dimensions",
            list(self.instance.dimensions.all()) if self.instance else [],
        )
        if len({dimension.pk for dimension in dimensions}) != len(dimensions):
            raise serializers.ValidationError({
                "dimensions": "A dimension value cannot be assigned more than once."
            })
        if any(
            dimension.engagement_id != engagement.pk
            for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Every dimension must belong to the selected engagement."
            })
        if "dimensions" in attrs and any(
            not dimension.is_active for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Inactive dimensions cannot be assigned to a ledger entry."
            })

        if debit < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "debit": (
                        "Debit cannot be negative."
                    )
                }
            )

        if credit < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "credit": (
                        "Credit cannot be negative."
                    )
                }
            )

        if (
            debit > Decimal("0.00")
            and credit > Decimal("0.00")
        ):
            raise serializers.ValidationError(
                "A General Ledger entry cannot have "
                "both debit and credit."
            )

        if (
            debit == Decimal("0.00")
            and credit == Decimal("0.00")
        ):
            raise serializers.ValidationError(
                "A General Ledger entry must have "
                "either a debit or a credit amount."
            )

        return attrs

    def get_amount(self, obj):
        return obj.amount

    def get_dimension_values(self, obj):
        return [
            {
                "id": dimension.id,
                "dimension_type": dimension.dimension_type,
                "name": dimension.name,
            }
            for dimension in obj.dimensions.all()
        ]

    # =========================================================
# JOURNAL LINES
# =========================================================

class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(
        source="account.account_code",
        read_only=True,
    )

    account_name = serializers.CharField(
        source="account.account_name",
        read_only=True,
    )

    amount = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        read_only=True,
    )
    dimensions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=FinancialDimension.objects.all(),
        required=False,
    )
    dimension_values = serializers.SerializerMethodField()

    class Meta:
        model = JournalLine
        fields = [
            "id",
            "journal_entry",
            "account",
            "account_code",
            "account_name",
            "dimensions",
            "dimension_values",
            "dimensions",
            "dimension_values",
            "debit",
            "credit",
            "amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "journal_entry",
            "account_code",
            "account_name",
            "amount",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        debit = attrs.get(
            "debit",
            Decimal("0.00"),
        )

        credit = attrs.get(
            "credit",
            Decimal("0.00"),
        )

        if debit < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "debit": "Debit cannot be negative."
                }
            )

        if credit < Decimal("0.00"):
            raise serializers.ValidationError(
                {
                    "credit": "Credit cannot be negative."
                }
            )

        if (
            debit > Decimal("0.00")
            and credit > Decimal("0.00")
        ):
            raise serializers.ValidationError(
                "A journal line cannot have both debit and credit."
            )

        if (
            debit == Decimal("0.00")
            and credit == Decimal("0.00")
        ):
            raise serializers.ValidationError(
                "A journal line must have either a debit or a credit amount."
            )

        journal_entry = attrs.get(
            "journal_entry",
            getattr(self.instance, "journal_entry", None),
        )
        dimensions = attrs.get(
            "dimensions",
            list(self.instance.dimensions.all()) if self.instance else [],
        )
        if len({dimension.pk for dimension in dimensions}) != len(dimensions):
            raise serializers.ValidationError({
                "dimensions": "A dimension value cannot be assigned more than once."
            })
        if journal_entry and any(
            dimension.engagement_id != journal_entry.engagement_id
            for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Every dimension must belong to the journal engagement."
            })
        if "dimensions" in attrs and any(
            not dimension.is_active for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Inactive dimensions cannot be assigned to a journal line."
            })
        return attrs

    def get_dimension_values(self, obj):
        return [
            {
                "id": dimension.id,
                "dimension_type": dimension.dimension_type,
                "name": dimension.name,
            }
            for dimension in obj.dimensions.all()
        ]


# =========================================================
# JOURNAL ENTRY
# =========================================================

class JournalEntrySerializer(serializers.ModelSerializer):
    reversal_id = serializers.IntegerField(source="reversal.pk", read_only=True, default=None)
    requires_approval = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    source_document = serializers.SerializerMethodField()
    lines = JournalLineSerializer(
        many=True,
        required=False,
    )

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

    is_balanced = serializers.BooleanField(
        read_only=True,
    )

    line_count = serializers.IntegerField(
        read_only=True,
    )

    class Meta:
        model = JournalEntry

        fields = [
            "id",
            "engagement",
            "entry_number",
            "transaction_date",
            "reference",
            "description",
            "source",
            "status",
            "created_by",
            "approved_by",
            "approved_at",
            "reversal_of",
            "reversal_id",
            "requires_approval",
            "can_manage",
            "can_approve",
            "source_document",
            "lines",
            "total_debit",
            "total_credit",
            "difference",
            "is_balanced",
            "line_count",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "created_by",
            "approved_by",
            "approved_at",
            "reversal_of",
            "reversal_id",
            "total_debit",
            "total_credit",
            "difference",
            "is_balanced",
            "line_count",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        if self.initial_data.get("status", "draft") != "draft":
            raise serializers.ValidationError({
                "status": "Use the journal workflow actions to change status.",
            })
        if self.instance and self.instance.status != JournalEntry.Status.DRAFT:
            raise serializers.ValidationError("Only draft journals can be edited.")
        if self.instance and source_journal(self.instance):
            raise serializers.ValidationError("Source-document journals cannot be edited. Correct the source document.")
        engagement = attrs.get(
            "engagement",
            getattr(
                self.instance,
                "engagement",
                None,
            ),
        )

        entry_number = attrs.get(
            "entry_number",
            getattr(
                self.instance,
                "entry_number",
                None,
            ),
        )

        transaction_date = attrs.get(
            "transaction_date",
            getattr(
                self.instance,
                "transaction_date",
                None,
            ),
        )

        description = attrs.get(
            "description",
            getattr(
                self.instance,
                "description",
                None,
            ),
        )

        # -----------------------------------------------------
        # Engagement
        # -----------------------------------------------------

        if not engagement:
            raise serializers.ValidationError(
                {
                    "engagement": (
                        "Engagement is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Entry Number
        # -----------------------------------------------------

        if not entry_number:
            raise serializers.ValidationError(
                {
                    "entry_number": (
                        "Entry number is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Transaction Date
        # -----------------------------------------------------

        if not transaction_date:
            raise serializers.ValidationError(
                {
                    "transaction_date": (
                        "Transaction date is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Description
        # -----------------------------------------------------

        if not description:
            raise serializers.ValidationError(
                {
                    "description": (
                        "Description is required."
                    )
                }
            )

        # -----------------------------------------------------
        # Entry Number Uniqueness
        # -----------------------------------------------------

        queryset = JournalEntry.objects.filter(
            engagement=engagement,
            entry_number=entry_number,
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                {
                    "entry_number": (
                        "This entry number already exists "
                        "for the selected engagement."
                    )
                }
            )

        for line_number, line_data in enumerate(attrs.get("lines", []), start=1):
            account = line_data.get("account")
            if account and not account.is_active:
                raise serializers.ValidationError({
                    "lines": f"Line {line_number} account is inactive.",
                })
            if account and account.engagement_id != engagement.pk:
                raise serializers.ValidationError({
                    "lines": f"Line {line_number} account must belong to the selected engagement."
                })
            if any(
                dimension.engagement_id != engagement.pk
                for dimension in line_data.get("dimensions", [])
            ):
                raise serializers.ValidationError({
                    "lines": f"Line {line_number} dimensions must belong to the selected engagement."
                })
        if self.instance and getattr(self.instance, "opening_policy", None):
            if engagement.pk != self.instance.engagement_id:
                raise serializers.ValidationError("An opening journal cannot change engagement.")
            if transaction_date != self.instance.transaction_date:
                raise serializers.ValidationError("The established opening date cannot be changed.")
            if any(
                line["account"].account_type not in ("asset", "liability", "equity")
                for line in attrs.get("lines", [])
            ):
                raise serializers.ValidationError("Opening journals use balance-sheet accounts only.")

        return attrs

    def get_requires_approval(self, obj):
        policy = getattr(obj.engagement, "accounting_policy", None)
        return bool(policy and policy.require_journal_approval)

    def get_source_document(self, obj):
        return source_journal(obj)

    def get_can_manage(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return bool(user and (
            getattr(user, "is_superuser", False)
            or getattr(user, "role", None) in ("admin", "manager")
        ))

    def get_can_approve(self, obj):
        request = self.context.get("request")
        return bool(
            self.get_can_manage(obj) and request
            and obj.status == JournalEntry.Status.SUBMITTED
            and obj.created_by_id != request.user.pk
        )

    def create(self, validated_data):
        lines_data = validated_data.pop(
            "lines",
            [],
        )

        entry = JournalEntry.objects.create(
            **validated_data
        )

        for line_data in lines_data:
            dimensions = line_data.pop("dimensions", [])
            JournalLine.objects.create(
                journal_entry=entry,
                **line_data,
            ).dimensions.set(dimensions)

        return entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop(
            "lines",
            None,
        )

        # -----------------------------------------------------
        # Prevent modification of posted / void entries
        # -----------------------------------------------------

        if instance.status == JournalEntry.Status.POSTED:
            raise serializers.ValidationError(
                (
                    "A posted journal entry cannot "
                    "be modified."
                )
            )

        if instance.status == JournalEntry.Status.VOID:
            raise serializers.ValidationError(
                (
                    "A void journal entry cannot "
                    "be modified."
                )
            )

        # -----------------------------------------------------
        # Update Journal Entry header
        # -----------------------------------------------------

        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        instance.save()

        # -----------------------------------------------------
        # Replace lines when supplied
        # -----------------------------------------------------

        if lines_data is not None:
            instance.lines.all().delete()

            for line_data in lines_data:
                dimensions = line_data.pop("dimensions", [])
                JournalLine.objects.create(
                    journal_entry=instance,
                    **line_data,
                ).dimensions.set(dimensions)

        return instance