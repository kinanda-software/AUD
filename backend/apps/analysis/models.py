from django.conf import settings
from django.db import models


class SampleSelection(models.Model):
    """
    A documented, reproducible audit sample drawn from a
    posted ledger population. The seed and interval are stored
    so the selection can be re-derived and defended later.
    """

    class Method(models.TextChoices):
        RANDOM = "random", "Random"
        SYSTEMATIC = "systematic", "Systematic"
        MUS = "mus", "Monetary-Unit Sampling"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="sample_selections",
    )

    name = models.CharField(
        max_length=200,
    )

    method = models.CharField(
        max_length=20,
        choices=Method.choices,
    )

    account = models.ForeignKey(
        "financials.ChartOfAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sample_selections",
        help_text="Population restricted to this account, if set.",
    )

    population_size = models.PositiveIntegerField()

    population_value = models.DecimalField(
        max_digits=20,
        decimal_places=2,
    )

    sample_size = models.PositiveIntegerField()

    seed = models.BigIntegerField(
        help_text="Random seed — reproduce the selection.",
    )

    interval = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Sampling interval (systematic and MUS).",
    )

    items = models.JSONField(
        default=list,
        help_text="Selected population items with identifiers.",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_samples",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Sample Selection"
        verbose_name_plural = "Sample Selections"

    def __str__(self):
        return (
            f"{self.name} ({self.get_method_display()}) — "
            f"{self.engagement.engagement_code}"
        )
