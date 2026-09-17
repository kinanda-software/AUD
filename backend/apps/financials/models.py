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
            (line.debit for line in self.lines.all()),  # type: ignore
            Decimal("0.00"),
        )

    @property
    def total_credit(self):
        return sum(
            (line.credit for line in self.lines.all()),  # type: ignore
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

        if self.debit_account_id == self.credit_account_id:  # type: ignore
            raise ValidationError(
                "Debit and credit accounts must be different."
            )

        if (
            self.debit_account
            and self.debit_account.engagement.pk != self.engagement.pk
        ):
            raise ValidationError(
                {
                    "debit_account": (
                        "Debit account must belong to the selected engagement."
                    )
                }
            )

        if (
            self.credit_account
            and self.credit_account.engagement.pk != self.engagement.pk
        ):
            raise ValidationError(
                {
                    "credit_account": (
                        "Credit account must belong to the selected engagement."
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