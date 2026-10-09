from django.conf import settings
from django.db import models


class NonConformance(models.Model):
    """
    An engagement-level non-conformance register entry with
    corrective and preventive action (CAPA) tracking:
    investigation, root-cause analysis, action plans,
    verification, and closure.
    """

    class Source(models.TextChoices):
        AUDIT_FINDING = "audit_finding", "Audit Finding"
        INTERNAL_REVIEW = "internal_review", "Internal Review"
        EXTERNAL_AUDIT = "external_audit", "External Audit"
        CLIENT_COMPLAINT = "client_complaint", "Client Complaint"
        OTHER = "other", "Other"

    class Severity(models.TextChoices):
        MINOR = "minor", "Minor"
        MAJOR = "major", "Major"
        CRITICAL = "critical", "Critical"

    class FindingType(models.TextChoices):
        OBSERVATION = "observation", "Observation"
        NON_CONFORMITY = "non_conformity", "Non-Conformity"
        MAJOR_NON_CONFORMITY = (
            "major_non_conformity",
            "Major Non-Conformity",
        )

    class Category(models.TextChoices):
        DOCUMENTATION = "documentation", "Documentation"
        CONTROLS = "controls", "Internal Controls"
        OPERATIONS = "operations", "Operations"
        FINANCIAL_RECORDS = (
            "financial_records",
            "Financial Records",
        )
        REPORTING = "reporting", "Reporting"
        COMPLIANCE = "compliance", "Compliance"
        IT_SYSTEMS = "it_systems", "IT Systems"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        INVESTIGATION = "investigation", "Under Investigation"
        CAPA_IN_PROGRESS = (
            "capa_in_progress",
            "CAPA In Progress",
        )
        VERIFICATION = "verification", "Awaiting Verification"
        CLOSED = "closed", "Closed"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="nonconformances",
    )

    reference = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. NC-000042.",
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField()

    source = models.CharField(
        max_length=30,
        choices=Source.choices,
        default=Source.AUDIT_FINDING,
    )

    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.MINOR,
    )

    finding_type = models.CharField(
        max_length=30,
        choices=FindingType.choices,
        default=FindingType.NON_CONFORMITY,
        help_text=(
            "Observations record drift-risk practices without "
            "a breached requirement; non-conformities cite one."
        ),
    )

    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
        help_text="Used for cross-engagement pattern detection.",
    )

    requirement_reference = models.CharField(
        max_length=255,
        blank=True,
        help_text=(
            "The clause, standard, or manual section this "
            "finding fails, e.g. 'ISA 505' or 'Manual §4.2'."
        ),
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN,
    )

    investigation_notes = models.TextField(
        blank=True,
    )

    root_cause = models.TextField(
        blank=True,
    )

    correction = models.TextField(
        blank=True,
        help_text="The immediate fix applied to the instance found.",
    )

    corrective_action = models.TextField(
        blank=True,
        help_text="The action taken against the root cause.",
    )

    preventive_action = models.TextField(
        blank=True,
    )

    verification_notes = models.TextField(
        blank=True,
        help_text=(
            "Evidence, recorded at a later date, that the "
            "corrective action held."
        ),
    )

    management_response = models.TextField(
        blank=True,
        help_text=(
            "The audited entity's formal response to this "
            "finding, for inclusion in the management letter."
        ),
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_nonconformances",
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="raised_nonconformances",
    )

    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_nonconformances",
    )

    closed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Non-Conformance"
        verbose_name_plural = "Non-Conformances"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"NC-{self.pk:06d}"
            super().save(update_fields=["reference"])

    def __str__(self):
        return f"{self.reference or 'NC'} - {self.title}"
