from django.conf import settings
from django.db import models


class FraudReport(models.Model):
    """
    A public fraud / irregularity report (whistleblowing
    channel). Anonymous submissions are supported — reporter
    identity fields are optional. Staff triage submissions
    and record their handling.
    """

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        INVESTIGATING = "investigating", "Investigating"
        CLOSED = "closed", "Closed"

    reference = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. FR-000042.",
    )

    subject = models.CharField(
        max_length=255,
        help_text="Entity, person, or area the report concerns.",
    )

    description = models.TextField(
        help_text="What happened, where, when, and who is involved.",
    )

    reporter_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional — anonymous reports are accepted.",
    )

    reporter_email = models.EmailField(
        blank=True,
    )

    reporter_phone = models.CharField(
        max_length=50,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )

    triage_notes = models.TextField(
        blank=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_fraud_reports",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Fraud Report"
        verbose_name_plural = "Fraud Reports"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"FR-{self.pk:06d}"
            super().save(update_fields=["reference"])

    def __str__(self):
        return f"{self.reference or 'FR'} - {self.subject}"
