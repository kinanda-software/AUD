from decimal import Decimal

from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import (
    Adjustment,
    ChartOfAccount,
    LeadSchedule,
    SupportingDetail,
    TrialBalance,
    TrialBalanceLine,
)

from .serializers import (
    AdjustmentSerializer,
    AdjustedTrialBalanceSerializer,
    ChartOfAccountSerializer,
    LeadScheduleSerializer,
    SupportingDetailSerializer,
    TrialBalanceSerializer,
    TrialBalanceLineSerializer,
)


# =========================================================
# CHART OF ACCOUNTS
# =========================================================

class ChartOfAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ChartOfAccountSerializer

    def get_queryset(
        self,
    ) -> QuerySet[ChartOfAccount]:  # type: ignore
        queryset = (
            ChartOfAccount.objects
            .select_related("engagement")
            .all()
        )

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset

    @action(
        detail=False,
        methods=["get"],
        url_path="by-engagement/(?P<engagement_id>[^/.]+)",
    )
    def by_engagement(
        self,
        request,
        engagement_id=None,
    ):
        accounts = self.get_queryset().filter(
            engagement_id=engagement_id,
            is_active=True,
        )

        serializer = self.get_serializer(
            accounts,
            many=True,
        )

        return Response(serializer.data)


# =========================================================
# TRIAL BALANCE
# =========================================================

class TrialBalanceViewSet(viewsets.ModelViewSet):
    serializer_class = TrialBalanceSerializer

    def get_queryset(
        self,
    ) -> QuerySet[TrialBalance]:  # type: ignore
        queryset = (
            TrialBalance.objects
            .select_related("engagement")
            .prefetch_related(
                "lines",
                "lines__account",
            )
        )

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset

    # =====================================================
    # TRIAL BALANCE SUMMARY
    # =====================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="summary",
    )
    def summary(
        self,
        request,
        pk=None,
    ):
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

    # =====================================================
    # INTERNAL ADJUSTED TRIAL BALANCE CALCULATION
    # =====================================================

    def _calculate_adjusted_lines(
        self,
        trial_balance,
    ):
        """
        Build the Adjusted Trial Balance from:

            Original Trial Balance
                    +
            Posted Audit Adjustments
                    =
            Adjusted Trial Balance

        Only POSTED adjustments are included.
        """

        # -------------------------------------------------
        # ORIGINAL TRIAL BALANCE LINES
        # -------------------------------------------------

        lines = (
            TrialBalanceLine.objects
            .select_related("account")
            .filter(
                trial_balance=trial_balance
            )
            .order_by("account_code")
        )

        # -------------------------------------------------
        # POSTED ADJUSTMENTS
        # -------------------------------------------------

        posted_adjustments = (
            Adjustment.objects
            .select_related(
                "debit_account",
                "credit_account",
            )
            .filter(
                trial_balance=trial_balance,
                status=Adjustment.Status.POSTED,
            )
            .order_by("id")
        )

        posted_adjustment_count = (
            posted_adjustments.count()
        )

        # -------------------------------------------------
        # ADJUSTMENT TOTALS BY ACCOUNT
        # -------------------------------------------------

        adjustment_totals = {}

        for adjustment in posted_adjustments:

            debit_account_id = (
                adjustment.debit_account_id
            )

            credit_account_id = (
                adjustment.credit_account_id
            )

            amount = adjustment.amount

            if debit_account_id not in adjustment_totals:
                adjustment_totals[debit_account_id] = {
                    "debit": Decimal("0.00"),
                    "credit": Decimal("0.00"),
                }

            adjustment_totals[
                debit_account_id
            ]["debit"] += amount

            if credit_account_id not in adjustment_totals:
                adjustment_totals[credit_account_id] = {
                    "debit": Decimal("0.00"),
                    "credit": Decimal("0.00"),
                }

            adjustment_totals[
                credit_account_id
            ]["credit"] += amount

        # -------------------------------------------------
        # RESULT STORAGE
        # -------------------------------------------------

        adjusted_lines = []

        total_original_debit = Decimal("0.00")
        total_original_credit = Decimal("0.00")

        total_adjustment_debit = Decimal("0.00")
        total_adjustment_credit = Decimal("0.00")

        total_adjusted_debit = Decimal("0.00")
        total_adjusted_credit = Decimal("0.00")

        processed_account_ids = set()

        # -------------------------------------------------
        # EXISTING TRIAL BALANCE ACCOUNTS
        # -------------------------------------------------

        for line in lines:

            account = line.account
            account_id = line.account_id

            original_debit = (
                line.debit or Decimal("0.00")
            )

            original_credit = (
                line.credit or Decimal("0.00")
            )

            account_adjustments = (
                adjustment_totals.get(
                    account_id,
                    {
                        "debit": Decimal("0.00"),
                        "credit": Decimal("0.00"),
                    },
                )
            )

            adjustment_debit = (
                account_adjustments["debit"]
            )

            adjustment_credit = (
                account_adjustments["credit"]
            )

            original_signed_balance = (
                original_debit
                - original_credit
            )

            adjusted_signed_balance = (
                original_signed_balance
                + adjustment_debit
                - adjustment_credit
            )

            if adjusted_signed_balance >= Decimal("0.00"):

                adjusted_debit = (
                    adjusted_signed_balance
                )

                adjusted_credit = Decimal("0.00")

            else:

                adjusted_debit = Decimal("0.00")

                adjusted_credit = abs(
                    adjusted_signed_balance
                )

            adjusted_lines.append(
                {
                    "account": account_id,
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "account_type": account.account_type,
                    "financial_statement_section": (
                        account.financial_statement_section
                        or ""
                    ),
                    "original_debit": original_debit,
                    "original_credit": original_credit,
                    "adjustment_debit": adjustment_debit,
                    "adjustment_credit": adjustment_credit,
                    "adjusted_debit": adjusted_debit,
                    "adjusted_credit": adjusted_credit,
                }
            )

            total_original_debit += original_debit
            total_original_credit += original_credit

            total_adjustment_debit += adjustment_debit
            total_adjustment_credit += adjustment_credit

            total_adjusted_debit += adjusted_debit
            total_adjusted_credit += adjusted_credit

            processed_account_ids.add(account_id)

        # -------------------------------------------------
        # ADJUSTMENT-ONLY ACCOUNTS
        # -------------------------------------------------

        adjustment_account_ids = set(
            adjustment_totals.keys()
        )

        missing_account_ids = (
            adjustment_account_ids
            - processed_account_ids
        )

        if missing_account_ids:

            accounts = (
                ChartOfAccount.objects
                .filter(
                    id__in=missing_account_ids,
                    engagement_id=trial_balance.engagement_id,
                )
                .order_by("account_code")
            )

            for account in accounts:

                account_adjustments = (
                    adjustment_totals[
                        account.id
                    ]
                )

                adjustment_debit = (
                    account_adjustments["debit"]
                )

                adjustment_credit = (
                    account_adjustments["credit"]
                )

                adjusted_signed_balance = (
                    adjustment_debit
                    - adjustment_credit
                )

                if adjusted_signed_balance >= Decimal("0.00"):

                    adjusted_debit = (
                        adjusted_signed_balance
                    )

                    adjusted_credit = Decimal("0.00")

                else:

                    adjusted_debit = Decimal("0.00")

                    adjusted_credit = abs(
                        adjusted_signed_balance
                    )

                adjusted_lines.append(
                    {
                        "account": account.id,
                        "account_code": account.account_code,
                        "account_name": account.account_name,
                        "account_type": account.account_type,
                        "financial_statement_section": (
                            account.financial_statement_section
                            or ""
                        ),
                        "original_debit": Decimal("0.00"),
                        "original_credit": Decimal("0.00"),
                        "adjustment_debit": adjustment_debit,
                        "adjustment_credit": adjustment_credit,
                        "adjusted_debit": adjusted_debit,
                        "adjusted_credit": adjusted_credit,
                    }
                )

                total_adjustment_debit += (
                    adjustment_debit
                )

                total_adjustment_credit += (
                    adjustment_credit
                )

                total_adjusted_debit += (
                    adjusted_debit
                )

                total_adjusted_credit += (
                    adjusted_credit
                )

        # -------------------------------------------------
        # SORT
        # -------------------------------------------------

        adjusted_lines.sort(
            key=lambda item: item["account_code"]
        )

        # -------------------------------------------------
        # DIFFERENCES
        # -------------------------------------------------

        original_difference = (
            total_original_debit
            - total_original_credit
        )

        adjustment_difference = (
            total_adjustment_debit
            - total_adjustment_credit
        )

        adjusted_difference = (
            total_adjusted_debit
            - total_adjusted_credit
        )

        is_balanced = (
            abs(adjusted_difference)
            < Decimal("0.01")
        )

        return {
            "lines": adjusted_lines,
            "posted_adjustment_count": (
                posted_adjustment_count
            ),
            "original_total_debit": (
                total_original_debit
            ),
            "original_total_credit": (
                total_original_credit
            ),
            "original_difference": (
                original_difference
            ),
            "adjustment_total_debit": (
                total_adjustment_debit
            ),
            "adjustment_total_credit": (
                total_adjustment_credit
            ),
            "adjustment_difference": (
                adjustment_difference
            ),
            "adjusted_total_debit": (
                total_adjusted_debit
            ),
            "adjusted_total_credit": (
                total_adjusted_credit
            ),
            "adjusted_difference": (
                adjusted_difference
            ),
            "is_balanced": is_balanced,
        }

    # =====================================================
    # ADJUSTED TRIAL BALANCE
    # =====================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="adjusted",
    )
    def adjusted(
        self,
        request,
        pk=None,
    ):
        trial_balance = self.get_object()

        calculation = (
            self._calculate_adjusted_lines(
                trial_balance
            )
        )

        atb_data = {
            "trial_balance": trial_balance.id,

            "engagement": (
                trial_balance.engagement_id
            ),

            "period_start": (
                trial_balance.period_start
            ),

            "period_end": (
                trial_balance.period_end
            ),

            "currency": (
                trial_balance.currency
            ),

            "status": (
                trial_balance.status
            ),

            "description": (
                trial_balance.description
            ),

            "original_total_debit": (
                calculation[
                    "original_total_debit"
                ]
            ),

            "original_total_credit": (
                calculation[
                    "original_total_credit"
                ]
            ),

            "original_difference": (
                calculation[
                    "original_difference"
                ]
            ),

            "adjustment_total_debit": (
                calculation[
                    "adjustment_total_debit"
                ]
            ),

            "adjustment_total_credit": (
                calculation[
                    "adjustment_total_credit"
                ]
            ),

            "adjustment_difference": (
                calculation[
                    "adjustment_difference"
                ]
            ),

            "adjusted_total_debit": (
                calculation[
                    "adjusted_total_debit"
                ]
            ),

            "adjusted_total_credit": (
                calculation[
                    "adjusted_total_credit"
                ]
            ),

            "adjusted_difference": (
                calculation[
                    "adjusted_difference"
                ]
            ),

            "is_balanced": (
                calculation[
                    "is_balanced"
                ]
            ),

            "posted_adjustment_count": (
                calculation[
                    "posted_adjustment_count"
                ]
            ),

            "lines": (
                calculation[
                    "lines"
                ]
            ),
        }

        serializer = (
            AdjustedTrialBalanceSerializer(
                atb_data
            )
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # FINANCIAL STATEMENTS
    # =====================================================

    @action(
        detail=True,
        methods=["get"],
        url_path="financial-statements",
    )
    def financial_statements(
        self,
        request,
        pk=None,
    ):
        """
        Generate Financial Statements from the
        Adjusted Trial Balance.

        Accounting flow:

            Original TB
                 +
            Posted Adjustments
                 =
            Adjusted TB
                 +
            Account Classification
                 =
            Financial Statements

        Financial statements are generated dynamically.
        No financial statement database record is created.
        """

        trial_balance = self.get_object()

        # -------------------------------------------------
        # BUILD ADJUSTED TRIAL BALANCE
        # -------------------------------------------------

        calculation = (
            self._calculate_adjusted_lines(
                trial_balance
            )
        )

        adjusted_lines = calculation["lines"]

        # -------------------------------------------------
        # FINANCIAL STATEMENT STORAGE
        # -------------------------------------------------

        revenue = []
        expenses = []

        assets = []
        liabilities = []
        equity = []

        other_accounts = []

        total_revenue = Decimal("0.00")
        total_expenses = Decimal("0.00")

        total_assets = Decimal("0.00")
        total_liabilities = Decimal("0.00")
        total_equity = Decimal("0.00")

        # -------------------------------------------------
        # PROCESS ADJUSTED ACCOUNTS
        # -------------------------------------------------

        for line in adjusted_lines:

            account_type = (
                line["account_type"]
            )

            adjusted_debit = (
                line["adjusted_debit"]
            )

            adjusted_credit = (
                line["adjusted_credit"]
            )

            # ---------------------------------------------
            # COMMON ACCOUNT INFORMATION
            # ---------------------------------------------

            account_data = {
                "account_id": line["account"],
                "account_code": line["account_code"],
                "account_name": line["account_name"],
                "financial_statement_section": (
                    line[
                        "financial_statement_section"
                    ]
                ),
                "debit": adjusted_debit,
                "credit": adjusted_credit,
            }

            # ---------------------------------------------
            # REVENUE
            # ---------------------------------------------

            if (
                account_type
                == ChartOfAccount.AccountType.REVENUE
            ):

                balance = (
                    adjusted_credit
                    - adjusted_debit
                )

                account_data["balance"] = balance

                revenue.append(
                    account_data
                )

                total_revenue += balance

            # ---------------------------------------------
            # EXPENSE
            # ---------------------------------------------

            elif (
                account_type
                == ChartOfAccount.AccountType.EXPENSE
            ):

                balance = (
                    adjusted_debit
                    - adjusted_credit
                )

                account_data["balance"] = balance

                expenses.append(
                    account_data
                )

                total_expenses += balance

            # ---------------------------------------------
            # ASSET
            # ---------------------------------------------

            elif (
                account_type
                == ChartOfAccount.AccountType.ASSET
            ):

                balance = (
                    adjusted_debit
                    - adjusted_credit
                )

                account_data["balance"] = balance

                assets.append(
                    account_data
                )

                total_assets += balance

            # ---------------------------------------------
            # LIABILITY
            # ---------------------------------------------

            elif (
                account_type
                == ChartOfAccount.AccountType.LIABILITY
            ):

                balance = (
                    adjusted_credit
                    - adjusted_debit
                )

                account_data["balance"] = balance

                liabilities.append(
                    account_data
                )

                total_liabilities += balance

            # ---------------------------------------------
            # EQUITY
            # ---------------------------------------------

            elif (
                account_type
                == ChartOfAccount.AccountType.EQUITY
            ):

                balance = (
                    adjusted_credit
                    - adjusted_debit
                )

                account_data["balance"] = balance

                equity.append(
                    account_data
                )

                total_equity += balance

            # ---------------------------------------------
            # OTHER / UNCLASSIFIED
            # ---------------------------------------------

            else:

                account_data["balance"] = (
                    adjusted_debit
                    - adjusted_credit
                )

                other_accounts.append(
                    account_data
                )

        # -------------------------------------------------
        # PROFIT / LOSS
        # -------------------------------------------------

        profit_before_tax = (
            total_revenue
            - total_expenses
        )

        # -------------------------------------------------
        # CURRENT PERIOD PROFIT / LOSS
        # -------------------------------------------------

        current_period_profit = (
            profit_before_tax
        )

        total_equity_including_profit = (
            total_equity
            + current_period_profit
        )

        total_liabilities_and_equity = (
            total_liabilities
            + total_equity_including_profit
        )

        statement_of_financial_position_difference = (
            total_assets
            - total_liabilities_and_equity
        )

        statement_of_financial_position_balanced = (
            abs(
                statement_of_financial_position_difference
            )
            < Decimal("0.01")
        )

        # -------------------------------------------------
        # SORT ACCOUNT GROUPS
        # -------------------------------------------------

        revenue.sort(
            key=lambda item: item["account_code"]
        )

        expenses.sort(
            key=lambda item: item["account_code"]
        )

        assets.sort(
            key=lambda item: item["account_code"]
        )

        liabilities.sort(
            key=lambda item: item["account_code"]
        )

        equity.sort(
            key=lambda item: item["account_code"]
        )

        other_accounts.sort(
            key=lambda item: item["account_code"]
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return Response(
            {
                "trial_balance": {
                    "id": trial_balance.id,
                    "engagement": (
                        trial_balance.engagement_id
                    ),
                    "period_start": (
                        trial_balance.period_start
                    ),
                    "period_end": (
                        trial_balance.period_end
                    ),
                    "currency": (
                        trial_balance.currency
                    ),
                    "status": (
                        trial_balance.status
                    ),
                    "description": (
                        trial_balance.description
                    ),
                },

                "source": {
                    "original_trial_balance": True,
                    "posted_adjustments_only": True,
                    "posted_adjustment_count": (
                        calculation[
                            "posted_adjustment_count"
                        ]
                    ),
                    "adjusted_trial_balance_balanced": (
                        calculation[
                            "is_balanced"
                        ]
                    ),
                },

                # =========================================
                # PROFIT OR LOSS
                # =========================================

                "profit_or_loss": {
                    "revenue": revenue,

                    "expenses": expenses,

                    "total_revenue": (
                        total_revenue
                    ),

                    "total_expenses": (
                        total_expenses
                    ),

                    "profit_before_tax": (
                        profit_before_tax
                    ),

                    "net_profit_or_loss": (
                        profit_before_tax
                    ),
                },

                # =========================================
                # STATEMENT OF FINANCIAL POSITION
                # =========================================

                "statement_of_financial_position": {
                    "assets": assets,

                    "liabilities": liabilities,

                    "equity": equity,

                    "current_period_profit_or_loss": (
                        current_period_profit
                    ),

                    "total_assets": (
                        total_assets
                    ),

                    "total_liabilities": (
                        total_liabilities
                    ),

                    "total_equity": (
                        total_equity
                    ),

                    "total_equity_including_profit": (
                        total_equity_including_profit
                    ),

                    "total_liabilities_and_equity": (
                        total_liabilities_and_equity
                    ),

                    "difference": (
                        statement_of_financial_position_difference
                    ),

                    "is_balanced": (
                        statement_of_financial_position_balanced
                    ),
                },

                # =========================================
                # UNCLASSIFIED / OTHER
                # =========================================

                "other_accounts": other_accounts,

                # =========================================
                # CONTROL TOTALS
                # =========================================

                "control": {
                    "adjusted_total_debit": (
                        calculation[
                            "adjusted_total_debit"
                        ]
                    ),

                    "adjusted_total_credit": (
                        calculation[
                            "adjusted_total_credit"
                        ]
                    ),

                    "adjusted_difference": (
                        calculation[
                            "adjusted_difference"
                        ]
                    ),

                    "adjusted_trial_balance_balanced": (
                        calculation[
                            "is_balanced"
                        ]
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # LOCK TRIAL BALANCE
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="lock",
    )
    def lock(
        self,
        request,
        pk=None,
    ):
        trial_balance = self.get_object()

        if (
            trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            return Response(
                {
                    "detail": (
                        "This trial balance is already locked."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not trial_balance.is_balanced:
            return Response(
                {
                    "detail": (
                        "This trial balance cannot be "
                        "locked because debit and credit "
                        "totals do not balance."
                    ),
                    "total_debit": (
                        trial_balance.total_debit
                    ),
                    "total_credit": (
                        trial_balance.total_credit
                    ),
                    "difference": (
                        trial_balance.difference
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        trial_balance.status = (
            TrialBalance.Status.LOCKED
        )

        trial_balance.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(
                trial_balance
            ).data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# TRIAL BALANCE LINES
# =========================================================

class TrialBalanceLineViewSet(viewsets.ModelViewSet):
    serializer_class = TrialBalanceLineSerializer

    def get_queryset(
        self,
    ) -> QuerySet[TrialBalanceLine]:  # type: ignore

        queryset = (
            TrialBalanceLine.objects
            .select_related(
                "trial_balance",
                "account",
            )
            .all()
        )

        trial_balance_id = (
            self.request.query_params.get(
                "trial_balance"
            )
        )

        if trial_balance_id:
            queryset = queryset.filter(
                trial_balance_id=trial_balance_id
            )

        return queryset

    # =====================================================
    # CREATE
    # =====================================================

    def perform_create(self, serializer):
        trial_balance = (
            serializer.validated_data[
                "trial_balance"
            ]
        )

        if (
            trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        account = (
            serializer.validated_data[
                "account"
            ]
        )

        if (
            account.engagement_id
            != trial_balance.engagement_id
        ):
            raise ValidationError(
                "Account must belong to the same "
                "engagement as the trial balance."
            )

        serializer.save(
            account_code=account.account_code,
            account_name=account.account_name,
        )

    # =====================================================
    # UPDATE
    # =====================================================

    def perform_update(self, serializer):
        trial_balance = (
            serializer.instance.trial_balance
        )

        if (
            trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        account = serializer.validated_data.get(
            "account",
            serializer.instance.account,
        )

        if (
            account.engagement_id
            != trial_balance.engagement_id
        ):
            raise ValidationError(
                "Account must belong to the same "
                "engagement as the trial balance."
            )

        serializer.save(
            account_code=account.account_code,
            account_name=account.account_name,
        )

    # =====================================================
    # DELETE
    # =====================================================

    def perform_destroy(self, instance):
        if (
            instance.trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "A locked trial balance cannot be modified."
            )

        instance.delete()


# =========================================================
# ADJUSTMENTS
# =========================================================

class AdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = AdjustmentSerializer

    def get_queryset(
        self,
    ) -> QuerySet[Adjustment]:  # type: ignore

        queryset = (
            Adjustment.objects
            .select_related(
                "engagement",
                "trial_balance",
                "debit_account",
                "credit_account",
            )
            .all()
        )

        engagement_id = (
            self.request.query_params.get(
                "engagement"
            )
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        trial_balance_id = (
            self.request.query_params.get(
                "trial_balance"
            )
        )

        if trial_balance_id:
            queryset = queryset.filter(
                trial_balance_id=trial_balance_id
            )

        return queryset

    # =====================================================
    # CREATE ADJUSTMENT
    # =====================================================

    def perform_create(self, serializer):
        trial_balance = (
            serializer.validated_data.get(
                "trial_balance"
            )
        )

        if not trial_balance:
            raise ValidationError(
                "Trial balance is required for an adjustment."
            )

        serializer.save()

    # =====================================================
    # UPDATE ADJUSTMENT
    # =====================================================

    def perform_update(self, serializer):
        current_adjustment = serializer.instance

        if (
            current_adjustment.status
            == Adjustment.Status.POSTED
        ):
            raise ValidationError(
                "A posted adjustment cannot be modified."
            )

        if (
            current_adjustment.status
            == Adjustment.Status.REJECTED
        ):
            raise ValidationError(
                "A rejected adjustment cannot be modified."
            )

        current_trial_balance = (
            current_adjustment.trial_balance
        )

        new_trial_balance = (
            serializer.validated_data.get(
                "trial_balance",
                current_trial_balance,
            )
        )

        if not new_trial_balance:
            raise ValidationError(
                "Trial balance is required for an adjustment."
            )

        serializer.save()

    # =====================================================
    # DELETE ADJUSTMENT
    # =====================================================

    def perform_destroy(self, instance):

        if (
            instance.status
            == Adjustment.Status.POSTED
        ):
            raise ValidationError(
                "A posted adjustment cannot be deleted."
            )

        if (
            instance.status
            == Adjustment.Status.REJECTED
        ):
            raise ValidationError(
                "A rejected adjustment cannot be deleted."
            )

        instance.delete()

    # =====================================================
    # BY ENGAGEMENT
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="by-engagement/(?P<engagement_id>[^/.]+)",
    )
    def by_engagement(
        self,
        request,
        engagement_id=None,
    ):
        adjustments = self.get_queryset().filter(
            engagement_id=engagement_id
        )

        serializer = self.get_serializer(
            adjustments,
            many=True,
        )

        return Response(serializer.data)

    # =====================================================
    # POST ADJUSTMENT
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="post",
    )
    def post_adjustment(
        self,
        request,
        pk=None,
    ):
        adjustment = self.get_object()

        if not adjustment.trial_balance:
            return Response(
                {
                    "detail": (
                        "An adjustment must be linked "
                        "to a trial balance before it "
                        "can be posted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            adjustment.status
            == Adjustment.Status.POSTED
        ):
            return Response(
                {
                    "detail": (
                        "This adjustment has already "
                        "been posted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            adjustment.status
            == Adjustment.Status.REJECTED
        ):
            return Response(
                {
                    "detail": (
                        "A rejected adjustment cannot "
                        "be posted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        adjustment.status = (
            Adjustment.Status.POSTED
        )

        adjustment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(
                adjustment
            ).data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # REJECT ADJUSTMENT
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="reject",
    )
    def reject_adjustment(
        self,
        request,
        pk=None,
    ):
        adjustment = self.get_object()

        if (
            adjustment.status
            == Adjustment.Status.POSTED
        ):
            return Response(
                {
                    "detail": (
                        "A posted adjustment cannot "
                        "be rejected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            adjustment.status
            == Adjustment.Status.REJECTED
        ):
            return Response(
                {
                    "detail": (
                        "This adjustment has already "
                        "been rejected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        adjustment.status = (
            Adjustment.Status.REJECTED
        )

        adjustment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(
                adjustment
            ).data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# LEAD SCHEDULES
# =========================================================

class LeadScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = LeadScheduleSerializer

    def get_queryset(
        self,
    ) -> QuerySet[LeadSchedule]:  # type: ignore

        queryset = (
            LeadSchedule.objects
            .select_related(
                "engagement",
                "trial_balance",
                "account",
            )
            .all()
        )

        engagement_id = (
            self.request.query_params.get(
                "engagement"
            )
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        trial_balance_id = (
            self.request.query_params.get(
                "trial_balance"
            )
        )

        if trial_balance_id:
            queryset = queryset.filter(
                trial_balance_id=trial_balance_id
            )

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        return queryset

    # =====================================================
    # CREATE
    # =====================================================

    def perform_create(self, serializer):
        """
        A Lead Schedule is an audit working paper.

        It may reference a locked Trial Balance because
        the Trial Balance is the source data for the
        working paper.

        Locking the Trial Balance prevents modification
        of the original accounting data. It does not
        prevent creation of downstream audit documentation.
        """

        trial_balance = (
            serializer.validated_data[
                "trial_balance"
            ]
        )

        account = (
            serializer.validated_data[
                "account"
            ]
        )

        # -------------------------------------------------
        # ENGAGEMENT INTEGRITY
        # -------------------------------------------------

        if (
            trial_balance.engagement_id
            != account.engagement_id
        ):
            raise ValidationError(
                "The account must belong to the same "
                "engagement as the trial balance."
            )

        # -------------------------------------------------
        # LOCKED TB IS ALLOWED
        # -------------------------------------------------

        serializer.save()

    # =====================================================
    # UPDATE
    # =====================================================

    def perform_update(self, serializer):
        """
        Lead Schedule working papers remain editable even
        when their source Trial Balance is locked.

        The locked Trial Balance itself remains protected.
        """

        current_trial_balance = (
            serializer.instance.trial_balance
        )

        new_trial_balance = (
            serializer.validated_data.get(
                "trial_balance",
                current_trial_balance,
            )
        )

        new_account = (
            serializer.validated_data.get(
                "account",
                serializer.instance.account,
            )
        )

        # -------------------------------------------------
        # ENGAGEMENT INTEGRITY
        # -------------------------------------------------

        if (
            new_trial_balance.engagement_id
            != new_account.engagement_id
        ):
            raise ValidationError(
                "The account must belong to the same "
                "engagement as the trial balance."
            )

        # -------------------------------------------------
        # LOCKED TB DOES NOT BLOCK WORKING PAPER UPDATE
        # -------------------------------------------------

        serializer.save()

    # =====================================================
    # DELETE
    # =====================================================

    def perform_destroy(self, instance):
        """
        A Lead Schedule is an audit working paper.

        Deleting the working paper does not modify the
        locked Trial Balance, so the Trial Balance lock
        does not prevent deletion.
        """

        instance.delete()

    # =====================================================
    # BY ENGAGEMENT
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="by-engagement/(?P<engagement_id>[^/.]+)",
    )
    def by_engagement(
        self,
        request,
        engagement_id=None,
    ):
        schedules = self.get_queryset().filter(
            engagement_id=engagement_id
        )

        serializer = self.get_serializer(
            schedules,
            many=True,
        )

        return Response(serializer.data)

    # =====================================================
    # BY TRIAL BALANCE
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="by-trial-balance/(?P<trial_balance_id>[^/.]+)",
    )
    def by_trial_balance(
        self,
        request,
        trial_balance_id=None,
    ):
        schedules = self.get_queryset().filter(
            trial_balance_id=trial_balance_id
        )

        serializer = self.get_serializer(
            schedules,
            many=True,
        )

        return Response(serializer.data)


# =========================================================
# SUPPORTING DETAILS
# =========================================================

class SupportingDetailViewSet(viewsets.ModelViewSet):
    serializer_class = SupportingDetailSerializer

    def get_queryset(
        self,
    ) -> QuerySet[SupportingDetail]:  # type: ignore

        queryset = (
            SupportingDetail.objects
            .select_related(
                "lead_schedule",
                "lead_schedule__trial_balance",
                "lead_schedule__account",
            )
            .all()
        )

        lead_schedule_id = (
            self.request.query_params.get(
                "lead_schedule"
            )
        )

        if lead_schedule_id:
            queryset = queryset.filter(
                lead_schedule_id=lead_schedule_id
            )

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        return queryset

    # =====================================================
    # CREATE
    # =====================================================

    def perform_create(self, serializer):
        lead_schedule = (
            serializer.validated_data[
                "lead_schedule"
            ]
        )

        trial_balance = (
            lead_schedule.trial_balance
        )

        if (
            trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "Supporting details cannot be created "
                "for a Lead Schedule linked to a locked "
                "trial balance."
            )

        serializer.save()

    # =====================================================
    # UPDATE
    # =====================================================

    def perform_update(self, serializer):
        supporting_detail = (
            serializer.instance
        )

        current_lead_schedule = (
            supporting_detail.lead_schedule
        )

        current_trial_balance = (
            current_lead_schedule.trial_balance
        )

        if (
            current_trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "Supporting details linked to a locked "
                "trial balance cannot be modified."
            )

        new_lead_schedule = (
            serializer.validated_data.get(
                "lead_schedule",
                current_lead_schedule,
            )
        )

        new_trial_balance = (
            new_lead_schedule.trial_balance
        )

        if (
            new_trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "Supporting details cannot be linked "
                "to a locked trial balance."
            )

        serializer.save()

    # =====================================================
    # DELETE
    # =====================================================

    def perform_destroy(self, instance):
        trial_balance = (
            instance.lead_schedule.trial_balance
        )

        if (
            trial_balance.status
            == TrialBalance.Status.LOCKED
        ):
            raise ValidationError(
                "Supporting details linked to a locked "
                "trial balance cannot be deleted."
            )

        instance.delete()