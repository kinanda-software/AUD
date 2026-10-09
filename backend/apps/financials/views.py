from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .analytics import build_financial_analysis
from .analytics_serializers import FinancialAnalysisParametersSerializer
from .trace import TraceParameters, build_account_trace
from .accounting_controls import FinancialControlMixin, ensure_open, locked_policy, require_manager, source_journal
from .accounting_services import post_journal
from .models import (
    AccountingPolicy,
    Adjustment,
    ChartOfAccount,
    GeneralLedger,
    JournalEntry,
    JournalLine,
    LeadSchedule,
    SupportingDetail,
    TrialBalance,
    TrialBalanceLine,
)

from .serializers import (
    AdjustmentSerializer,
    AdjustedTrialBalanceSerializer,
    ChartOfAccountSerializer,
    GeneralLedgerSerializer,
    JournalEntrySerializer,
    JournalLineSerializer,
    LeadScheduleSerializer,
    SupportingDetailSerializer,
    TrialBalanceSerializer,
    TrialBalanceLineSerializer,
)


# =========================================================
# CHART OF ACCOUNTS
# =========================================================

class ChartOfAccountViewSet(FinancialControlMixin, viewsets.ModelViewSet):
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

class TrialBalanceViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = TrialBalanceSerializer

    @action(detail=True, methods=["get"], url_path="trace")
    def trace(self, request, pk=None):
        trial_balance = self.get_object()
        parameters = TraceParameters(data=request.query_params)
        parameters.is_valid(raise_exception=True)
        return Response(build_account_trace(trial_balance, parameters.validated_data))

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

    @action(
        detail=True,
        methods=["get"],
        url_path="analysis",
    )
    def analysis(self, request, pk=None):
        trial_balance = self.get_object()
        parameters = FinancialAnalysisParametersSerializer(
            data=request.query_params
        )
        parameters.is_valid(raise_exception=True)
        options = parameters.validated_data

        comparison = None
        comparison_id = options.get("comparison_id")
        if comparison_id is not None:
            comparison = self.get_queryset().filter(
                id=comparison_id,
                engagement_id=trial_balance.engagement_id,
                currency=trial_balance.currency,
                period_end__lt=trial_balance.period_start,
            ).first()
            if comparison is None:
                raise ValidationError({
                    "comparison_id": (
                        "Choose an earlier, non-overlapping trial balance "
                        "from the same engagement and currency."
                    ),
                })

        ledger_entries = list(
            GeneralLedger.objects
            .select_related("account")
            .filter(
                engagement_id=trial_balance.engagement_id,
                transaction_date__gte=trial_balance.period_start,
                transaction_date__lte=trial_balance.period_end,
                status=GeneralLedger.Status.POSTED,
            )
        )
        journal_entries = list(
            JournalEntry.objects
            .prefetch_related("lines")
            .filter(
                engagement_id=trial_balance.engagement_id,
                transaction_date__gte=trial_balance.period_start,
                transaction_date__lte=trial_balance.period_end,
                status=JournalEntry.Status.POSTED,
            )
        )
        result = build_financial_analysis(
            trial_balance=trial_balance,
            current_lines=list(
                trial_balance.lines.select_related("account").all()
            ),
            comparison=comparison,
            comparison_lines=(
                list(comparison.lines.select_related("account").all())
                if comparison else []
            ),
            ledger_entries=ledger_entries,
            journal_entries=journal_entries,
            amount_threshold=options["amount_threshold"],
            percent_threshold=options["percent_threshold"],
            reconcile_ledger=options["reconcile_ledger"],
        )
        return Response(result)

    # =====================================================
    # INTERNAL ADJUSTED TRIAL BALANCE CALCULATION
    # =====================================================

    
    # =====================================================
    # GENERATE TRIAL BALANCE FROM GENERAL LEDGER
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="generate-from-gl",
    )
    def generate_from_gl(
        self,
        request,
        pk=None,
    ):
        """
        Generate / refresh Trial Balance lines from
        POSTED General Ledger entries for the Trial Balance
        engagement. With a posted opening journal, include
        opening balances and activity through the reporting end date.
        Otherwise preserve period-activity-only generation.

        Rules:
            - Only POSTED GL entries are included.
            - GL entries must belong to the same engagement.
            - Start at the configured opening date when available,
              otherwise at the TB period start.
            - Accounts are grouped and netted.
            - Existing TB lines are replaced.
            - Posted audit adjustments are NOT touched.
            - Locked Trial Balances cannot be refreshed.
        """

        trial_balance = self.get_object()

        # -------------------------------------------------
        # LOCK PROTECTION
        # -------------------------------------------------

        if trial_balance.status == TrialBalance.Status.LOCKED:
            raise ValidationError(
                "A locked trial balance cannot be regenerated."
            )

        # -------------------------------------------------
        # GET POSTED GENERAL LEDGER ENTRIES
        # -------------------------------------------------

        policy = AccountingPolicy.objects.filter(
            engagement_id=trial_balance.engagement_id,
        ).select_related("opening_journal").first()
        ledger_start = trial_balance.period_start
        if (
            policy and policy.opening_journal_id
            and policy.opening_journal.status == JournalEntry.Status.POSTED
            and policy.opening_journal.transaction_date <= trial_balance.period_start
        ):
            ledger_start = policy.opening_journal.transaction_date

        gl_entries = (
            GeneralLedger.objects
            .select_related("account")
            .filter(
                engagement_id=trial_balance.engagement_id,
                transaction_date__gte=ledger_start,
                transaction_date__lte=trial_balance.period_end,
                status=GeneralLedger.Status.POSTED,
            )
            .order_by(
                "transaction_date",
                "id",
            )
        )

        # -------------------------------------------------
        # GROUP GL ENTRIES BY ACCOUNT
        # -------------------------------------------------

        account_totals = {}

        for entry in gl_entries:

            account_id = entry.account_id

            if account_id not in account_totals:
                account_totals[account_id] = {
                    "account": entry.account,
                    "debit": Decimal("0.00"),
                    "credit": Decimal("0.00"),
                }

            account_totals[account_id]["debit"] += (
                entry.debit or Decimal("0.00")
            )

            account_totals[account_id]["credit"] += (
                entry.credit or Decimal("0.00")
            )

        # -------------------------------------------------
        # BUILD TRIAL BALANCE LINES
        # -------------------------------------------------

        generated_lines = []

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for account_data in account_totals.values():

            account = account_data["account"]

            debit = account_data["debit"]
            credit = account_data["credit"]

            # Net the account so one TB line contains
            # either debit OR credit.

            net_balance = debit - credit

            if net_balance > Decimal("0.00"):

                final_debit = net_balance
                final_credit = Decimal("0.00")

            elif net_balance < Decimal("0.00"):

                final_debit = Decimal("0.00")
                final_credit = abs(net_balance)

            else:
                # Zero-balance accounts are not necessary
                # in the Trial Balance.
                continue

            generated_lines.append(
                {
                    "account": account,
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "debit": final_debit,
                    "credit": final_credit,
                }
            )

            total_debit += final_debit
            total_credit += final_credit

        # -------------------------------------------------
        # SORT BY ACCOUNT CODE
        # -------------------------------------------------

        generated_lines.sort(
            key=lambda item: item["account_code"]
        )

        # -------------------------------------------------
        # REPLACE EXISTING TRIAL BALANCE LINES
        # -------------------------------------------------

        with transaction.atomic():

            TrialBalanceLine.objects.filter(
                trial_balance=trial_balance
            ).delete()

            for line_data in generated_lines:

                TrialBalanceLine.objects.create(
                    trial_balance=trial_balance,
                    account=line_data["account"],
                    account_code=line_data["account_code"],
                    account_name=line_data["account_name"],
                    debit=line_data["debit"],
                    credit=line_data["credit"],
                )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        difference = (
            total_debit
            - total_credit
        )

        return Response(
            {
                "message": (
                    "Trial Balance generated successfully "
                    "from General Ledger."
                ),
                "trial_balance": trial_balance.id,
                "engagement": trial_balance.engagement_id,
                "period_start": trial_balance.period_start,
                "period_end": trial_balance.period_end,
                "source": "general_ledger",
                "ledger_start": ledger_start,
                "includes_opening_balances": ledger_start != trial_balance.period_start
                or bool(policy and policy.opening_journal_id
                        and policy.opening_journal.status == JournalEntry.Status.POSTED
                        and policy.opening_journal.transaction_date == ledger_start),
                "gl_entry_count": gl_entries.count(),
                "line_count": len(generated_lines),
                "total_debit": total_debit,
                "total_credit": total_credit,
                "difference": difference,
                "is_balanced": (
                    difference == Decimal("0.00")
                ),
            },
            status=status.HTTP_200_OK,
        )



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
        # Memorandum entries are recorded for disclosure
        # purposes only and never enter the adjusted TB.
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
            .exclude(
                is_memorandum=True,
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

class TrialBalanceLineViewSet(FinancialControlMixin, viewsets.ModelViewSet):
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

class AdjustmentViewSet(FinancialControlMixin, viewsets.ModelViewSet):
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

class LeadScheduleViewSet(FinancialControlMixin, viewsets.ModelViewSet):
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

class SupportingDetailViewSet(FinancialControlMixin, viewsets.ModelViewSet):
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


        # =========================================================
# GENERAL LEDGER
# =========================================================

class GeneralLedgerViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = GeneralLedgerSerializer

    def perform_destroy(self, instance):
        if instance.status == GeneralLedger.Status.POSTED:
            raise ValidationError("Posted ledger entries are immutable. Use a reversing journal.")
        instance.delete()

    def get_queryset(
        self,
    ) -> QuerySet[GeneralLedger]:  # type: ignore

        queryset = (
            GeneralLedger.objects
            .select_related(
                "engagement",
                "account",
            )
            .prefetch_related("dimensions")
            .all()
        )

        # -------------------------------------------------
        # ENGAGEMENT
        # -------------------------------------------------

        engagement_id = (
            self.request.query_params.get(
                "engagement"
            )
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        # -------------------------------------------------
        # ACCOUNT
        # -------------------------------------------------

        account_id = (
            self.request.query_params.get(
                "account"
            )
        )

        if account_id:
            queryset = queryset.filter(
                account_id=account_id
            )

        # -------------------------------------------------
        # STATUS
        # -------------------------------------------------

        status_filter = (
            self.request.query_params.get(
                "status"
            )
        )

        if status_filter:
            queryset = queryset.filter(
                status=status_filter
            )

        # -------------------------------------------------
        # SOURCE
        # -------------------------------------------------

        source_filter = (
            self.request.query_params.get(
                "source"
            )
        )

        if source_filter:
            queryset = queryset.filter(
                source=source_filter
            )

        # -------------------------------------------------
        # DATE FROM
        # -------------------------------------------------

        date_from = (
            self.request.query_params.get(
                "date_from"
            )
        )

        if date_from:
            queryset = queryset.filter(
                transaction_date__gte=date_from
            )

        # -------------------------------------------------
        # DATE TO
        # -------------------------------------------------

        date_to = (
            self.request.query_params.get(
                "date_to"
            )
        )

        if date_to:
            queryset = queryset.filter(
                transaction_date__lte=date_to
            )

        return queryset

    # =====================================================
    # CREATE
    # =====================================================

    def perform_create(self, serializer):
        engagement = (
            serializer.validated_data[
                "engagement"
            ]
        )

        account = (
            serializer.validated_data[
                "account"
            ]
        )

        if (
            account.engagement_id
            != engagement.id
        ):
            raise ValidationError(
                "Account must belong to the same "
                "engagement."
            )

        serializer.save()

    # =====================================================
    # UPDATE
    # =====================================================

    def perform_update(self, serializer):
        instance = serializer.instance

        engagement = (
            serializer.validated_data.get(
                "engagement",
                instance.engagement,
            )
        )

        account = (
            serializer.validated_data.get(
                "account",
                instance.account,
            )
        )

        if (
            account.engagement_id
            != engagement.id
        ):
            raise ValidationError(
                "Account must belong to the same "
                "engagement."
            )

        serializer.save()

    # =====================================================
    # SUMMARY
    # =====================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="summary",
    )
    def summary(self, request):
        queryset = self.get_queryset()

        total_debit = sum(
            (
                entry.debit
                for entry in queryset
            ),
            Decimal("0.00"),
        )

        total_credit = sum(
            (
                entry.credit
                for entry in queryset
            ),
            Decimal("0.00"),
        )

        balance = (
            total_debit - total_credit
        )

        return Response(
            {
                "count": queryset.count(),
                "total_debit": total_debit,
                "total_credit": total_credit,
                "balance": balance,
            }
        )

    # =========================================================
# JOURNAL ENTRIES
# =========================================================

class JournalEntryViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_object(self):
        instance = super().get_object()
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            locked_policy(instance.engagement_id)
            instance = JournalEntry.objects.select_for_update().get(pk=instance.pk)
        return instance

    def get_queryset(self) -> QuerySet[JournalEntry]:
        queryset = (
            JournalEntry.objects
            .select_related("engagement", "engagement__accounting_policy", "reversal")
            .prefetch_related(
                "lines",
                "lines__account",
                "lines__dimensions",
            )
            .all()
        )

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        status = self.request.query_params.get(
            "status"
        )

        source = self.request.query_params.get(
            "source"
        )

        date_from = self.request.query_params.get(
            "date_from"
        )

        date_to = self.request.query_params.get(
            "date_to"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        if status:
            queryset = queryset.filter(
                status=status
            )

        if source:
            queryset = queryset.filter(
                source=source
            )

        if date_from:
            queryset = queryset.filter(
                transaction_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                transaction_date__lte=date_to
            )

        return queryset

        # =====================================================
    # POST JOURNAL ENTRY
    # =====================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="post",
    )
    def post_entry(
        self,
        request,
        pk=None,
    ):
        journal_entry = self.get_object()

        with transaction.atomic():
            post_journal(journal_entry)

        # ---------------------------------------------
        # RETURN UPDATED JOURNAL ENTRY
        # ---------------------------------------------

        serializer = self.get_serializer(
            journal_entry
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        journal = self.get_object()
        if journal.status != JournalEntry.Status.DRAFT:
            raise ValidationError("Only draft journals can be submitted.")
        ensure_open(locked_policy(journal.engagement_id), journal.transaction_date)
        try:
            journal.validate_for_posting()
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.messages}) from exc
        if journal.created_by_id is None:
            journal.created_by = request.user
        journal.status = JournalEntry.Status.SUBMITTED
        journal.save()
        return Response(self.get_serializer(journal).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        require_manager(request.user)
        journal = self.get_object()
        if journal.status != JournalEntry.Status.SUBMITTED:
            raise ValidationError("Only submitted journals can be approved.")
        if journal.created_by_id == request.user.pk:
            raise ValidationError("The preparer cannot approve their own journal.")
        journal.status = JournalEntry.Status.APPROVED
        journal.approved_by = request.user
        journal.approved_at = timezone.now()
        journal.save()
        return Response(self.get_serializer(journal).data)

    @action(detail=True, methods=["post"], url_path="return-to-draft")
    def return_to_draft(self, request, pk=None):
        from .accounting_views import ReasonSerializer

        require_manager(request.user)
        parameters = ReasonSerializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        journal = self.get_object()
        if journal.status not in (JournalEntry.Status.SUBMITTED, JournalEntry.Status.APPROVED):
            raise ValidationError("Only submitted or approved journals can be returned.")
        journal.status = JournalEntry.Status.DRAFT
        journal.approved_by = None
        journal.approved_at = None
        journal._control_reason = parameters.validated_data["reason"]
        journal.save()
        return Response(self.get_serializer(journal).data)

    @action(detail=True, methods=["post"])
    def reverse(self, request, pk=None):
        class ReversalParameters(serializers.Serializer):
            transaction_date = serializers.DateField()
            entry_number = serializers.CharField(max_length=50)
            reason = serializers.CharField(max_length=400)

        parameters = ReversalParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        original = self.get_object()
        if source_journal(original):
            raise ValidationError("Use the source workflow instead of reversing its journal directly.")
        if original.status != JournalEntry.Status.POSTED or original.reversal_of_id:
            raise ValidationError("Only an original posted journal can be reversed.")
        if JournalEntry.objects.filter(reversal_of=original).exists():
            raise ValidationError("This journal already has a reversing journal.")
        if not original.lines.exists() or original.lines.filter(ledger_entry__isnull=True).exists():
            raise ValidationError(
                "This legacy journal has no complete posting provenance. Reconcile it "
                "before creating a manual correcting journal."
            )
        data = parameters.validated_data
        if data["transaction_date"] < original.transaction_date:
            raise ValidationError("A reversal cannot be dated before the original journal.")
        ensure_open(locked_policy(original.engagement_id), data["transaction_date"])
        serializer = self.get_serializer(data={
            "engagement": original.engagement_id,
            "entry_number": data["entry_number"],
            "transaction_date": data["transaction_date"],
            "description": f"Reversal of {original.entry_number}: {data['reason']}",
            "reference": original.reference,
            "source": "manual",
            "lines": [
                {
                    "account": line.account_id,
                    "debit": str(line.credit), "credit": str(line.debit),
                    "dimensions": list(line.dimensions.values_list("pk", flat=True)),
                }
                for line in original.lines.all()
            ],
        })
        serializer.is_valid(raise_exception=True)
        journal = serializer.save(created_by=request.user, reversal_of=original)
        return Response(self.get_serializer(journal).data, status=201)

    def perform_destroy(self, instance):
        if source_journal(instance):
            raise ValidationError("Cancel the unposted source document instead of deleting its journal.")
        if AccountingPolicy.objects.filter(opening_journal=instance).exists():
            raise ValidationError("Edit the draft opening journal rather than deleting its baseline.")
        if instance.status == JournalEntry.Status.POSTED:
            raise serializers.ValidationError(
                "A posted journal entry cannot be deleted."
            )

        if instance.status == JournalEntry.Status.VOID:
            raise serializers.ValidationError(
                "A void journal entry cannot be deleted."
            )

        instance.delete()


# =========================================================
# JOURNAL LINES
# =========================================================

class JournalLineViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = JournalLineSerializer

    def get_queryset(self) -> QuerySet[JournalLine]:
        queryset = (
            JournalLine.objects
            .select_related(
                "journal_entry",
                "journal_entry__engagement",
                "account",
            )
            .all()
        )

        journal_entry_id = self.request.query_params.get(
            "journal_entry"
        )

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        account_id = self.request.query_params.get(
            "account"
        )

        if journal_entry_id:
            queryset = queryset.filter(
                journal_entry_id=journal_entry_id
            )

        if engagement_id:
            queryset = queryset.filter(
                journal_entry__engagement_id=engagement_id
            )

        if account_id:
            queryset = queryset.filter(
                account_id=account_id
            )

        return queryset

    def perform_destroy(self, instance):
        if instance.journal_entry.status == (
            JournalEntry.Status.POSTED
        ):
            raise serializers.ValidationError(
                "A line belonging to a posted journal entry "
                "cannot be deleted."
            )

        if instance.journal_entry.status == (
            JournalEntry.Status.VOID
        ):
            raise serializers.ValidationError(
                "A line belonging to a void journal entry "
                "cannot be deleted."
            )

        instance.delete()