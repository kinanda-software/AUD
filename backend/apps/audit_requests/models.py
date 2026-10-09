from django.conf import settings
from django.db import models


class AuditRequest(models.Model):
    """
    An audit request submitted by a client or logged by staff —
    the intake pipeline ahead of engagement creation. Requests
    are reviewed, accepted or rejected, and accepted requests
    are converted into engagements.
    """

    class AuditType(models.TextChoices):
        FINANCIAL_STATEMENT = (
            "financial_statement",
            "Financial Statement Audit",
        )
        COMPLIANCE = "compliance", "Compliance Audit"
        INTERNAL_CONTROL = (
            "internal_control",
            "Internal Controls Review",
        )
        IT_AUDIT = "it_audit", "IT Audit"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CONVERTED = "converted", "Converted to Engagement"

    reference = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. AR-000042.",
    )

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_requests",
        help_text="Existing client, when the requester is known.",
    )

    company_name = models.CharField(
        max_length=255,
        help_text="Company name as stated by the requester.",
    )

    contact_name = models.CharField(
        max_length=255,
    )

    contact_email = models.EmailField()

    contact_phone = models.CharField(
        max_length=50,
        blank=True,
    )

    audit_type = models.CharField(
        max_length=40,
        choices=AuditType.choices,
        default=AuditType.FINANCIAL_STATEMENT,
    )

    preferred_start_date = models.DateField(
        null=True,
        blank=True,
    )

    preferred_end_date = models.DateField(
        null=True,
        blank=True,
    )

    scope_notes = models.TextField(
        blank=True,
        help_text="Scope, locations, periods, or special requirements.",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )

    review_notes = models.TextField(
        blank=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_audit_requests",
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_requests",
        help_text="Engagement created when this request was converted.",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submitted_audit_requests",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Audit Request"
        verbose_name_plural = "Audit Requests"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"AR-{self.pk:06d}"
            super().save(update_fields=["reference"])

    def __str__(self):
        return f"{self.reference or 'AR'} - {self.company_name}"
