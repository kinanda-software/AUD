
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings


BANK_MATCH_DATE_WINDOW_DAYS = 3


class ChartOfAccount(models.Model):
    class AccountType(models.TextChoices):
        ASSET = "asset", "Asset"
        LIABILITY = "liability", "Liability"
        EQUITY = "equity", "Equity"
        REVENUE = "revenue", "Revenue"
        EXPENSE = "expense", "Expense"

    class FinancialStatementSection(models.TextChoices):
        STATEMENT_OF_FINANCIAL_POSITION = (
            "statement_of_financial_position",
            "Statement of Financial Position",
        )
        PROFIT_OR_LOSS = (
            "profit_or_loss",
            "Profit or Loss",
        )
        CASH_FLOW = (
            "cash_flow",
            "Cash Flow Statement",
        )
        EQUITY = (
            "equity",
            "Statement of Changes in Equity",
        )
        OTHER = (
            "other",
            "Other",
        )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="chart_of_accounts",
    )

    account_code = models.CharField(
        max_length=50,
    )

    account_name = models.CharField(
        max_length=255,
    )

    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
    )

    financial_statement_section = models.CharField(
        max_length=50,
        choices=FinancialStatementSection.choices,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["account_code"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "account_code",
                ],
                name="unique_account_code_per_engagement",
            )
        ]

    def __str__(self):
        return f"{self.account_code} - {self.account_name}"


class TrialBalance(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IMPORTED = "imported", "Imported"
        REVIEWED = "reviewed", "Reviewed"
        LOCKED = "locked", "Locked"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="trial_balances",
    )

    period_start = models.DateField()

    period_end = models.DateField()

    currency = models.CharField(
        max_length=10,
        default="TZS",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    description = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-period_end",
            "-created_at",
        ]

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"TB {self.period_end}"
        )

    @property
    def total_debit(self):
        return sum(
            (
                line.debit
                for line in self.lines.all()
            ),
            Decimal("0.00"),
        )

    @property
    def total_credit(self):
        return sum(
            (
                line.credit
                for line in self.lines.all()
            ),
            Decimal("0.00"),
        )

    @property
    def difference(self):
        return self.total_debit - self.total_credit

    @property
    def is_balanced(self):
        return self.difference == Decimal("0.00")


class TrialBalanceLine(models.Model):
    trial_balance = models.ForeignKey(
        TrialBalance,
        on_delete=models.CASCADE,
        related_name="lines",
    )

    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="trial_balance_lines",
    )

    account_code = models.CharField(
        max_length=50,
    )

    account_name = models.CharField(
        max_length=255,
    )

    debit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    credit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["account_code"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "trial_balance",
                    "account",
                ],
                name="unique_account_per_trial_balance",
            )
        ]

    def clean(self):
        if self.debit < 0:
            raise ValidationError(
                {
                    "debit": "Debit cannot be negative."
                }
            )

        if self.credit < 0:
            raise ValidationError(
                {
                    "credit": "Credit cannot be negative."
                }
            )

        if self.debit > 0 and self.credit > 0:
            raise ValidationError(
                "A trial balance line cannot have both debit and credit."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.account_code} - "
            f"{self.account_name}"
        )


class Adjustment(models.Model):
    class Status(models.TextChoices):
        PROPOSED = "proposed", "Proposed"
        POSTED = "posted", "Posted"
        REJECTED = "rejected", "Rejected"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="adjustments",
    )

    trial_balance = models.ForeignKey(
        TrialBalance,
        on_delete=models.CASCADE,
        related_name="adjustments",
        null=True,
        blank=True,
    )

    adjustment_number = models.CharField(
        max_length=50,
    )

    description = models.TextField()

    debit_account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="debit_adjustments",
    )

    credit_account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="credit_adjustments",
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROPOSED,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "adjustment_number",
                ],
                name="unique_adjustment_number_per_engagement",
            )
        ]

    def clean(self):
        if self.amount <= Decimal("0.00"):
            raise ValidationError(
                {
                    "amount": (
                        "Adjustment amount must be greater than zero."
                    )
                }
            )

        if self.debit_account_id == self.credit_account_id:
            raise ValidationError(
                "Debit and credit accounts must be different."
            )

        if (
            self.debit_account
            and self.debit_account.engagement.pk
            != self.engagement.pk
        ):
            raise ValidationError(
                {
                    "debit_account": (
                        "Debit account must belong to "
                        "the selected engagement."
                    )
                }
            )

        if (
            self.credit_account
            and self.credit_account.engagement.pk
            != self.engagement.pk
        ):
            raise ValidationError(
                {
                    "credit_account": (
                        "Credit account must belong to "
                        "the selected engagement."
                    )
                }
            )

        if (
            self.trial_balance
            and self.trial_balance.engagement_id
            != self.engagement_id
        ):
            raise ValidationError(
                {
                    "trial_balance": (
                        "Trial balance must belong to "
                        "the selected engagement."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.adjustment_number} - "
            f"{self.description}"
        )


class LeadSchedule(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_REVIEW = "in_review", "In Review"
        COMPLETED = "completed", "Completed"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="lead_schedules",
    )

    trial_balance = models.ForeignKey(
        TrialBalance,
        on_delete=models.PROTECT,
        related_name="lead_schedules",
    )

    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="lead_schedules",
    )

    schedule_name = models.CharField(
        max_length=255,
    )

    reference = models.CharField(
        max_length=50,
        blank=True,
    )

    purpose = models.TextField(
        blank=True,
    )

    opening_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    adjustments = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    adjusted_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    auditor_notes = models.TextField(
        blank=True,
    )

    conclusion = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["schedule_name"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "trial_balance",
                    "account",
                ],
                name="unique_lead_schedule_per_tb_account",
            )
        ]

    def clean(self):
        if (
            self.trial_balance
            and self.trial_balance.engagement_id
            != self.engagement_id
        ):
            raise ValidationError(
                {
                    "trial_balance": (
                        "Trial balance must belong to "
                        "the selected engagement."
                    )
                }
            )

        if (
            self.account
            and self.account.engagement_id
            != self.engagement_id
        ):
            raise ValidationError(
                {
                    "account": (
                        "Account must belong to "
                        "the selected engagement."
                    )
                }
            )

        if self.opening_balance < Decimal("0.00"):
            raise ValidationError(
                {
                    "opening_balance": (
                        "Opening balance cannot be negative."
                    )
                }
            )

    @property
    def supporting_details_total(self):
        return sum(
            (
                detail.amount
                for detail in self.supporting_details.all()
            ),
            Decimal("0.00"),
        )

    @property
    def supporting_details_difference(self):
        return (
            self.adjusted_balance
            - self.supporting_details_total
        )

    @property
    def supporting_details_reconciled(self):
        return (
            self.supporting_details_difference
            == Decimal("0.00")
        )

    def __str__(self):
        return (
            f"{self.schedule_name} - "
            f"{self.account.account_code}"
        )


class SupportingDetail(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        TESTED = "tested", "Tested"
        AGREED = "agreed", "Agreed"
        EXCEPTION = "exception", "Exception"

    lead_schedule = models.ForeignKey(
        LeadSchedule,
        on_delete=models.CASCADE,
        related_name="supporting_details",
    )

    description = models.CharField(
        max_length=255,
    )

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    audit_notes = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.description} - {self.amount}"


# =========================================================
# GENERAL LEDGER
# =========================================================

class GeneralLedger(models.Model):
    class Source(models.TextChoices):
       MANUAL = "manual", "Manual"
       IMPORT = "import", "Import"
       TRIAL_BALANCE = "trial_balance", "Trial Balance"
       ADJUSTMENT = "adjustment", "Adjustment"
       JOURNAL = "journal", "Journal"
       OTHER = "other", "Other"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        POSTED = "posted", "Posted"
        VOID = "void", "Void"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="general_ledger_entries",
    )

    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="general_ledger_entries",
    )

    dimensions = models.ManyToManyField(
        "FinancialDimension",
        related_name="ledger_entries",
        blank=True,
    )
    journal_line = models.OneToOneField(
        "JournalLine", on_delete=models.PROTECT, null=True, blank=True,
        related_name="ledger_entry",
    )

    transaction_date = models.DateField()

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    description = models.CharField(
        max_length=500,
    )

    debit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )

    credit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=0,
    )
    

    source = models.CharField(
        max_length=30,
        choices=Source.choices,
        default=Source.MANUAL,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "transaction_date",
            "id",
        ]
        indexes = [
            models.Index(
                fields=[
                    "engagement",
                    "transaction_date",
                ]
            ),
            models.Index(
                fields=[
                    "account",
                    "transaction_date",
                ]
            ),
            models.Index(
                fields=[
                    "status",
                ]
            ),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.debit < 0:
            raise ValidationError(
                {"debit": "Debit cannot be negative."}
            )

        if self.credit < 0:
            raise ValidationError(
                {"credit": "Credit cannot be negative."}
            )

        if self.debit > 0 and self.credit > 0:
            raise ValidationError(
                "A General Ledger entry cannot have both "
                "debit and credit."
            )

        if self.debit == 0 and self.credit == 0:
            raise ValidationError(
                "A General Ledger entry must have either "
                "a debit or a credit amount."
            )

        if self.account_id:
            if (
                self.account.engagement_id
                != self.engagement_id
            ):
                raise ValidationError(
                    {
                        "account": (
                            "Account must belong to the "
                            "same engagement."
                        )
                    }
                )

    @property
    def amount(self):
        return self.debit if self.debit > 0 else self.credit

        # =========================================================
# JOURNAL ENTRY
# =========================================================

class JournalEntry(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        IMPORT = "import", "Import"
        ADJUSTMENT = "adjustment", "Adjustment"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        POSTED = "posted", "Posted"
        VOID = "void", "Void"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )

    entry_number = models.CharField(
        max_length=50,
    )

    transaction_date = models.DateField()

    reference = models.CharField(
        max_length=100,
        blank=True,
    )

    description = models.CharField(
        max_length=500,
    )

    source = models.CharField(
        max_length=30,
        choices=Source.choices,
        default=Source.MANUAL,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="prepared_financial_journals",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="approved_financial_journals",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    reversal_of = models.OneToOneField(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="reversal",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "transaction_date",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "entry_number",
                ],
                name="unique_journal_entry_number_per_engagement",
            )
        ]
        indexes = [
            models.Index(
                fields=[
                    "engagement",
                    "transaction_date",
                ]
            ),
            models.Index(
                fields=[
                    "status",
                ]
            ),
        ]

    @property
    def total_debit(self):
        return sum(
            (
                line.debit
                for line in self.lines.all()
            ),
            Decimal("0.00"),
        )

    @property
    def total_credit(self):
        return sum(
            (
                line.credit
                for line in self.lines.all()
            ),
            Decimal("0.00"),
        )

    @property
    def difference(self):
        return self.total_debit - self.total_credit

    @property
    def is_balanced(self):
        return self.difference == Decimal("0.00")

    @property
    def line_count(self):
        return self.lines.count()

    def validate_for_posting(self):
        if self.status == self.Status.POSTED:
            raise ValidationError(
                "Journal entry is already posted."
            )

        if self.status == self.Status.VOID:
            raise ValidationError(
                "A void journal entry cannot be posted."
            )

        if self.line_count < 2:
            raise ValidationError(
                "A journal entry must have at least two lines."
            )

        for line in self.lines.select_related("account"):
            if line.account.engagement_id != self.engagement_id:
                raise ValidationError(
                    {
                        "account": (
                            "All journal accounts must belong "
                            "to the same engagement."
                        )
                    }
                )

            if not line.account.is_active:
                raise ValidationError(
                    {
                        "account": (
                            f"Account {line.account.account_code} "
                            "is inactive."
                        )
                    }
                )

        if not self.is_balanced:
            raise ValidationError(
                (
                    "Journal entry is not balanced. "
                    f"Debit: {self.total_debit}, "
                    f"Credit: {self.total_credit}."
                )
            )

    def __str__(self):
        return (
            f"{self.entry_number} - "
            f"{self.description}"
        )


class JournalLine(models.Model):
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="lines",
    )

    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="journal_lines",
    )

    dimensions = models.ManyToManyField(
        "FinancialDimension",
        related_name="journal_lines",
        blank=True,
    )

    debit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    credit = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(
                fields=[
                    "journal_entry",
                ]
            ),
            models.Index(
                fields=[
                    "account",
                ]
            ),
        ]

    def clean(self):
        if self.debit < Decimal("0.00"):
            raise ValidationError(
                {
                    "debit": "Debit cannot be negative."
                }
            )

        if self.credit < Decimal("0.00"):
            raise ValidationError(
                {
                    "credit": "Credit cannot be negative."
                }
            )

        if (
            self.debit > Decimal("0.00")
            and self.credit > Decimal("0.00")
        ):
            raise ValidationError(
                "A journal line cannot have both debit and credit."
            )

        if (
            self.debit == Decimal("0.00")
            and self.credit == Decimal("0.00")
        ):
            raise ValidationError(
                "A journal line must have either a debit "
                "or a credit amount."
            )

        if self.journal_entry_id and self.account_id:
            if (
                self.account.engagement_id
                != self.journal_entry.engagement_id
            ):
                raise ValidationError(
                    {
                        "account": (
                            "Account must belong to the "
                            "same engagement as the journal entry."
                        )
                    }
                )

            if not self.account.is_active:
                raise ValidationError(
                    {
                        "account": (
                            f"Account {self.account.account_code} "
                            "is inactive."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def amount(self):
        return (
            self.debit
            if self.debit > Decimal("0.00")
            else self.credit
        )

    def __str__(self):
        return (
            f"{self.journal_entry.entry_number} - "
            f"{self.account.account_code}"
        )


class FinancialDimension(models.Model):
    class Type(models.TextChoices):
        CLASS = "class", "Class"
        LOCATION = "location", "Location"
        PROJECT = "project", "Project"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="financial_dimensions",
    )
    dimension_type = models.CharField(max_length=20, choices=Type.choices)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["dimension_type", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["engagement", "dimension_type", "name"],
                name="unique_financial_dimension_name",
            ),
        ]

    def __str__(self):
        return f"{self.get_dimension_type_display()}: {self.name}"


class FinancialBudget(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="financial_budgets",
    )
    name = models.CharField(max_length=150)
    fiscal_year = models.PositiveSmallIntegerField()
    currency = models.CharField(max_length=10, default="TZS")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_financial_budgets",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_financial_budgets",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fiscal_year", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["engagement", "name", "fiscal_year"],
                name="unique_financial_budget_per_year",
            ),
        ]

    def __str__(self):
        return f"{self.name} - {self.fiscal_year}"


class FinancialBudgetLine(models.Model):
    budget = models.ForeignKey(
        FinancialBudget,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="budget_lines",
    )
    period = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    dimension_signature = models.CharField(
        max_length=500,
        blank=True,
        default="",
        editable=False,
    )
    dimensions = models.ManyToManyField(
        FinancialDimension,
        related_name="budget_lines",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["period", "account__account_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget", "account", "period", "dimension_signature"],
                name="unique_budget_account_month",
            ),
        ]

    def clean(self):
        if self.period and self.period.day != 1:
            raise ValidationError({"period": "Budget periods must start on the first day of a month."})
        if self.budget_id and self.period and self.period.year != self.budget.fiscal_year:
            raise ValidationError({"period": "Budget period must fall within the budget fiscal year."})
        if self.amount is not None and self.amount < Decimal("0.00"):
            raise ValidationError({"amount": "Budget amounts cannot be negative."})
        if self.budget_id and self.account_id:
            if self.budget.engagement_id != self.account.engagement_id:
                raise ValidationError({"account": "Budget account must belong to the budget engagement."})
            if self.account.account_type not in ("revenue", "expense"):
                raise ValidationError({"account": "Only revenue and expense accounts can be budgeted."})
            if self.budget.status == FinancialBudget.Status.APPROVED:
                raise ValidationError("Approved budgets cannot be changed.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class BankStatement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        RECONCILED = "reconciled", "Reconciled"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="bank_statements",
    )
    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name="bank_statements",
    )
    currency = models.CharField(max_length=10, default="TZS")
    period_start = models.DateField()
    period_end = models.DateField()
    opening_balance = models.DecimalField(max_digits=18, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=18, decimal_places=2)
    book_opening_balance = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Opening cash-book balance, confirmed from supporting records.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_bank_statements",
    )
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciled_bank_statements",
    )
    reconciled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_end", "-created_at"]

    def clean(self):
        if self.period_start and self.period_end and self.period_start > self.period_end:
            raise ValidationError({"period_end": "Statement end cannot precede its start."})
        if self.engagement_id and self.account_id:
            if self.account.engagement_id != self.engagement_id:
                raise ValidationError({"account": "Bank account must belong to the engagement."})
            if self.account.account_type != ChartOfAccount.AccountType.ASSET:
                raise ValidationError({"account": "Select a bank or cash asset account."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.account} - {self.period_start} to {self.period_end}"


class BankStatementLine(models.Model):
    statement = models.ForeignKey(
        BankStatement,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    row_number = models.PositiveIntegerField()
    transaction_date = models.DateField()
    description = models.CharField(max_length=500)
    reference = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        help_text="Positive values increase the bank balance; negative values decrease it.",
    )
    matched_entry = models.OneToOneField(
        GeneralLedger,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bank_statement_match",
    )
    matched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matched_bank_statement_lines",
    )
    matched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["transaction_date", "row_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["statement", "row_number"],
                name="unique_bank_statement_row",
            ),
        ]

    def clean(self):
        if self.amount == Decimal("0.00"):
            raise ValidationError({"amount": "Statement line amount cannot be zero."})
        if self.statement_id and self.transaction_date:
            if not self.statement.period_start <= self.transaction_date <= self.statement.period_end:
                raise ValidationError({"transaction_date": "Transaction date must fall within the statement period."})
        if self.statement_id and self.matched_entry_id:
            entry = self.matched_entry
            if (
                entry.engagement_id != self.statement.engagement_id
                or entry.account_id != self.statement.account_id
                or entry.status != GeneralLedger.Status.POSTED
                or abs((entry.transaction_date - self.transaction_date).days)
                > BANK_MATCH_DATE_WINDOW_DAYS
                or entry.debit - entry.credit != self.amount
            ):
                raise ValidationError({
                    "matched_entry": (
                        "Matched ledger entry must be posted, match the account and signed "
                        f"amount, and be dated within {BANK_MATCH_DATE_WINDOW_DAYS} days "
                        "of the statement transaction."
                    )
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class FinancialAuditEvent(models.Model):
    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="financial_audit_events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="financial_audit_events",
    )
    action = models.CharField(max_length=40)
    object_type = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["engagement", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
        ]

    def __str__(self):
        return f"{self.action} {self.object_type} #{self.object_id}"


class AccountingPolicy(models.Model):
    engagement = models.OneToOneField(
        "engagements.Engagement", on_delete=models.CASCADE,
        related_name="accounting_policy",
    )
    require_journal_approval = models.BooleanField(default=False)
    base_currency = models.CharField(max_length=3, blank=True, default="")
    closed_through = models.DateField(null=True, blank=True)
    opening_journal = models.OneToOneField(
        JournalEntry, on_delete=models.PROTECT, null=True, blank=True,
        related_name="opening_policy",
    )
    updated_at = models.DateTimeField(auto_now=True)


class FinancialContact(models.Model):
    class Kind(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        SUPPLIER = "supplier", "Supplier"

    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["engagement", "kind", "name"], name="unique_financial_contact"),
        ]


class FinancialTaxCode(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    rate = models.DecimalField(max_digits=7, decimal_places=4)
    sales_account = models.ForeignKey(
        ChartOfAccount, on_delete=models.PROTECT, related_name="sales_tax_codes",
    )
    purchase_account = models.ForeignKey(
        ChartOfAccount, on_delete=models.PROTECT, related_name="purchase_tax_codes",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["engagement", "name"], name="unique_financial_tax_code"),
            models.CheckConstraint(condition=models.Q(rate__gte=0, rate__lte=100), name="financial_tax_rate_range"),
        ]


class FinancialDocument(models.Model):
    class Kind(models.TextChoices):
        INVOICE = "invoice", "Sales Invoice"
        BILL = "bill", "Supplier Bill"
        SALES_CREDIT = "sales_credit", "Sales Credit Note"
        PURCHASE_CREDIT = "purchase_credit", "Purchase Credit Note"

    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.CASCADE)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    number = models.CharField(max_length=50)
    contact = models.ForeignKey(FinancialContact, on_delete=models.PROTECT)
    transaction_date = models.DateField()
    due_date = models.DateField()
    currency = models.CharField(max_length=3)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8)
    control_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    original = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="credit_notes",
    )
    journal = models.OneToOneField(
        JournalEntry, null=True, blank=True, on_delete=models.PROTECT,
        related_name="financial_document",
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["engagement", "kind", "number"], name="unique_financial_document_number"),
            models.CheckConstraint(condition=models.Q(exchange_rate__gt=0), name="financial_document_positive_rate"),
        ]


class FinancialDocumentLine(models.Model):
    document = models.ForeignKey(FinancialDocument, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT)
    description = models.CharField(max_length=255)
    net_amount = models.DecimalField(max_digits=18, decimal_places=2)
    tax_code = models.ForeignKey(FinancialTaxCode, null=True, blank=True, on_delete=models.PROTECT)
    tax_rate = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    tax_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    base_net = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    base_tax = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(net_amount__gt=0), name="financial_document_positive_net"),
        ]


class FinancialPayment(models.Model):
    document = models.ForeignKey(FinancialDocument, on_delete=models.PROTECT, related_name="payments")
    transaction_date = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8)
    base_amount = models.DecimalField(max_digits=18, decimal_places=2)
    control_base_amount = models.DecimalField(max_digits=18, decimal_places=2)
    fx_difference = models.DecimalField(max_digits=18, decimal_places=2)
    bank_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="financial_payments")
    fx_account = models.ForeignKey(
        ChartOfAccount, null=True, blank=True, on_delete=models.PROTECT, related_name="financial_fx_payments",
    )
    reference = models.CharField(max_length=100, blank=True)
    journal = models.OneToOneField(JournalEntry, on_delete=models.PROTECT, related_name="financial_payment")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name="financial_payment_positive_amount"),
            models.CheckConstraint(condition=models.Q(exchange_rate__gt=0), name="financial_payment_positive_rate"),
        ]


class FixedAsset(models.Model):
    class Mode(models.TextChoices):
        NEW = "new", "New acquisition"
        EXISTING = "existing", "Already recorded in ledger"

    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.CASCADE)
    asset_number = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    registration_mode = models.CharField(max_length=10, choices=Mode.choices)
    acquisition_date = models.DateField()
    depreciation_start = models.DateField()
    depreciation_months = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=18, decimal_places=2)
    residual_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    opening_depreciation = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    asset_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="fixed_assets")
    accumulated_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="accumulated_assets")
    expense_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="depreciation_assets")
    funding_account = models.ForeignKey(
        ChartOfAccount, null=True, blank=True, on_delete=models.PROTECT, related_name="funded_assets",
    )
    acquisition_journal = models.OneToOneField(
        JournalEntry, null=True, blank=True, on_delete=models.PROTECT, related_name="fixed_asset",
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["asset_number", "id"]
        constraints = [
            models.UniqueConstraint(fields=["engagement", "asset_number"], name="unique_fixed_asset_number"),
            models.CheckConstraint(condition=models.Q(cost__gt=0), name="fixed_asset_positive_cost"),
            models.CheckConstraint(
                condition=models.Q(residual_value__gte=0, opening_depreciation__gte=0)
                & models.Q(cost__gte=models.F("residual_value") + models.F("opening_depreciation")),
                name="fixed_asset_value_range",
            ),
            models.CheckConstraint(
                condition=models.Q(depreciation_months__gte=1, depreciation_months__lte=1200),
                name="fixed_asset_months_range",
            ),
        ]


class FixedAssetEvent(models.Model):
    class Kind(models.TextChoices):
        DEPRECIATION = "depreciation", "Monthly depreciation"
        DISPOSAL = "disposal", "Disposal"

    asset = models.ForeignKey(FixedAsset, on_delete=models.PROTECT, related_name="events")
    kind = models.CharField(max_length=15, choices=Kind.choices)
    transaction_date = models.DateField()
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    journal = models.OneToOneField(JournalEntry, on_delete=models.PROTECT, related_name="fixed_asset_event")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["transaction_date", "id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gte=0), name="fixed_asset_event_nonnegative"),
        ]


class InventoryItem(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.CASCADE)
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=30)
    inventory_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="inventory_items")
    expense_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name="inventory_expense_items")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku", "id"]
        constraints = [
            models.UniqueConstraint(fields=["engagement", "sku"], name="unique_inventory_sku"),
        ]


class InventoryMovement(models.Model):
    class Kind(models.TextChoices):
        OPENING = "opening", "Opening stock"
        RECEIPT = "receipt", "Stock receipt"
        ISSUE = "issue", "Stock issue"
        INCREASE = "increase", "Positive stock adjustment"
        DECREASE = "decrease", "Negative stock adjustment"

    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="movements")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    transaction_date = models.DateField()
    quantity = models.DecimalField(max_digits=18, decimal_places=4)
    value = models.DecimalField(max_digits=18, decimal_places=2)
    quantity_before = models.DecimalField(max_digits=18, decimal_places=4)
    quantity_after = models.DecimalField(max_digits=18, decimal_places=4)
    value_before = models.DecimalField(max_digits=18, decimal_places=2)
    value_after = models.DecimalField(max_digits=18, decimal_places=2)
    offset_account = models.ForeignKey(ChartOfAccount, null=True, blank=True, on_delete=models.PROTECT)
    reference = models.CharField(max_length=100, blank=True)
    reason = models.CharField(max_length=500)
    register_only = models.BooleanField(default=False)
    journal = models.OneToOneField(
        JournalEntry, null=True, blank=True, on_delete=models.PROTECT, related_name="inventory_movement",
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["transaction_date", "id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0, value__gt=0), name="inventory_positive_movement"),
            models.CheckConstraint(
                condition=models.Q(quantity_before__gte=0, quantity_after__gte=0, value_before__gte=0, value_after__gte=0),
                name="inventory_nonnegative_balances",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(register_only=True, kind="opening", journal__isnull=True, offset_account__isnull=True)
                    | models.Q(register_only=False, journal__isnull=False, offset_account__isnull=False)
                ),
                name="inventory_movement_source",
            ),
        ]


class FinancialIntelligenceRun(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    algorithm_version = models.CharField(max_length=30)
    parameters = models.JSONField()
    population_fingerprint = models.CharField(max_length=64)
    population_count = models.PositiveIntegerField()
    sample_count = models.PositiveIntegerField()
    finding_count = models.PositiveIntegerField()
    results = models.JSONField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Saved audit-intelligence runs are immutable. Create a new run.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Saved audit-intelligence runs cannot be deleted.")


class FinancialEvidence(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    filename = models.CharField(max_length=200)
    content_type = models.CharField(max_length=80)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    content = models.BinaryField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at", "-id"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Evidence files and metadata are immutable. Upload a new version.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Financial evidence is retained and cannot be deleted.")


class FinancialEvidenceLink(models.Model):
    class Target(models.TextChoices):
        ACCOUNT_TRACE = "account_trace", "Trial balance account trace"
        RUN = "run", "Audit intelligence run"
        FINDING = "run_finding", "Saved run finding"
        LEDGER = "ledger", "Ledger entry"
        JOURNAL = "journal", "Journal entry"
        ADJUSTMENT = "adjustment", "Audit adjustment"
        LEAD = "lead_schedule", "Lead schedule"
        SUPPORT = "supporting_detail", "Supporting detail"
        DOCUMENT = "document", "Invoice, bill or credit"
        PAYMENT = "payment", "Document payment"
        ASSET = "asset", "Fixed asset"
        ASSET_EVENT = "asset_event", "Asset event"
        INVENTORY_ITEM = "inventory_item", "Stock item"
        INVENTORY_MOVEMENT = "inventory_movement", "Stock movement"
        PBC_REQUEST = "pbc_request", "PBC document request"

    evidence = models.ForeignKey(FinancialEvidence, on_delete=models.PROTECT, related_name="links")
    target_kind = models.CharField(max_length=30, choices=Target.choices)
    target_id = models.PositiveBigIntegerField()
    selector = models.BigIntegerField(default=-1)
    target_snapshot = models.JSONField()
    note = models.CharField(max_length=1000)
    linked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-linked_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["evidence", "target_kind", "target_id", "selector"],
                name="unique_financial_evidence_target",
            ),
        ]
        indexes = [
            models.Index(fields=["target_kind", "target_id", "selector"]),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Evidence links are immutable. Record another supporting attachment instead.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Evidence links are retained and cannot be deleted.")


class FinancialFindingReview(models.Model):
    class Action(models.TextChoices):
        REVIEW = "review", "Record review outcome"
        SIGN_OFF = "sign_off", "Independent sign-off"
        RETURN = "return", "Return for further work"
        REOPEN = "reopen", "Reopen signed-off finding"

    class Outcome(models.TextChoices):
        EXPLAINED = "explained", "Explained / no exception identified"
        EXCEPTION = "exception", "Exception confirmed"
        FOLLOW_UP = "follow_up", "Further work required"

    run = models.ForeignKey(FinancialIntelligenceRun, on_delete=models.PROTECT, related_name="finding_reviews")
    finding_index = models.PositiveIntegerField()
    action = models.CharField(max_length=20, choices=Action.choices)
    outcome = models.CharField(max_length=20, choices=Outcome.choices)
    conclusion = models.TextField()
    note = models.TextField()
    evidence_link_ids = models.JSONField(default=list)
    previous = models.OneToOneField("self", null=True, on_delete=models.PROTECT, related_name="successor")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    actor_identifier = models.PositiveBigIntegerField()
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        indexes = [models.Index(fields=["run", "finding_index", "-id"])]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Finding review history is immutable. Record a new workflow action.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Finding review history cannot be deleted.")


class FinancialPBCRequest(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    description = models.TextField()
    requested_from = models.CharField(max_length=200)
    responsible_name = models.CharField(max_length=200)
    due_date = models.DateField()
    priority = models.CharField(max_length=10, choices=[("normal", "Normal"), ("high", "High"), ("low", "Low")])
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_date", "id"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("PBC request details are immutable. Cancel and replace an incorrect request.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("PBC requests are retained. Cancel the request instead.")


class FinancialPBCEvent(models.Model):
    class Action(models.TextChoices):
        SUBMIT = "submit", "Submit documents"
        ACCEPT = "accept", "Accept submission"
        RETURN = "return", "Return for further documents"
        REOPEN = "reopen", "Reopen accepted request"
        CANCEL = "cancel", "Cancel request"

    request = models.ForeignKey(FinancialPBCRequest, on_delete=models.PROTECT, related_name="events")
    action = models.CharField(max_length=10, choices=Action.choices)
    note = models.TextField()
    evidence_link_ids = models.JSONField(default=list)
    previous = models.OneToOneField("self", null=True, on_delete=models.PROTECT, related_name="successor")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    actor_identifier = models.PositiveBigIntegerField()
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=30)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
        indexes = [models.Index(fields=["request", "-id"])]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("PBC history is immutable. Record another workflow action.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("PBC history cannot be deleted.")


class FinancialStatementLine(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.PROTECT)
    code = models.CharField(max_length=50)
    label = models.CharField(max_length=200)
    group = models.CharField(max_length=20, choices=ChartOfAccount.AccountType.choices)
    note_reference = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "code", "id"]
        constraints = [models.UniqueConstraint(fields=["engagement", "code"], name="unique_statement_line_code")]


class FinancialStatementMapping(models.Model):
    account = models.OneToOneField(ChartOfAccount, on_delete=models.PROTECT, related_name="statement_mapping")
    line = models.ForeignKey(FinancialStatementLine, on_delete=models.PROTECT, related_name="mappings")


class FinancialStatementVersion(models.Model):
    engagement = models.ForeignKey("engagements.Engagement", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    current_tb_id = models.PositiveBigIntegerField()
    comparison_tb_id = models.PositiveBigIntegerField(null=True)
    results = models.JSONField()
    fingerprint = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    preparer_identifier = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Saved statement versions are immutable. Save a new version.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Saved statement versions cannot be deleted.")


class FinancialStatementApproval(models.Model):
    version = models.OneToOneField(FinancialStatementVersion, on_delete=models.PROTECT, related_name="approval")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    actor_identifier = models.PositiveBigIntegerField()
    actor_name = models.CharField(max_length=150)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Statement approval is immutable. Save a new version for further review.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Statement approvals cannot be deleted.")