from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models


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
                fields=["engagement", "account_code"],
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
        ordering = ["-period_end", "-created_at"]

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"TB {self.period_end}"
        )

    @property
    def total_debit(self):
        return sum(
            (line.debit for line in self.lines.all()),
            Decimal("0.00"),
        )

    @property
    def total_credit(self):
        return sum(
            (line.credit for line in self.lines.all()),
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
                fields=["trial_balance", "account"],
                name="unique_account_per_trial_balance",
            )
        ]

    def clean(self):
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
                "A trial balance line cannot have both debit and credit."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.account_code} - {self.account_name}"

    
