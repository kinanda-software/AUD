from django.conf import settings
from django.db import models


class Engagement(models.Model):

    class EngagementType(models.TextChoices):
        FINANCIAL_STATEMENT = (
            "financial_statement",
            "Financial Statement Audit",
        )
        COMPLIANCE = (
            "compliance",
            "Compliance Audit",
        )
        INTERNAL_CONTROL = (
            "internal_control",
            "Internal Controls Review",
        )
        IT_AUDIT = (
            "it_audit",
            "IT Audit",
        )
        OTHER = (
            "other",
            "Other",
        )

    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        RISK_ASSESSMENT = "risk_assessment", "Risk Assessment"
        FIELDWORK = "fieldwork", "Fieldwork"
        REPORTING = "reporting", "Reporting"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Phase(models.TextChoices):
        PHASE_1 = "phase_1", "Phase 1 - Planning"
        PHASE_2 = "phase_2", "Phase 2 - Risk Assessment"
        PHASE_3 = "phase_3", "Phase 3 - Risk Response"
        PHASE_4 = "phase_4", "Phase 4 - Conclusion & Reporting"
        COMPLETED = "completed", "Completed"

    engagement_code = models.CharField(
        max_length=50,
        unique=True,
    )

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="engagements",
    )

    title = models.CharField(
        max_length=255,
    )

    engagement_type = models.CharField(
        max_length=40,
        choices=EngagementType.choices,
        default=EngagementType.FINANCIAL_STATEMENT,
    )

    description = models.TextField(
        blank=True,
    )

    lead_auditor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lead_engagements",
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PLANNING,
    )

    current_phase = models.CharField(
        max_length=30,
        choices=Phase.choices,
        default=Phase.PHASE_1,
    )

    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.MEDIUM,
    )

    start_date = models.DateField()

    planned_end_date = models.DateField(
        null=True,
        blank=True,
    )

    actual_end_date = models.DateField(
        null=True,
        blank=True,
    )

    financial_year_end = models.DateField(
        null=True,
        blank=True,
    )

    progress_percentage = models.PositiveSmallIntegerField(
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Engagement"
        verbose_name_plural = "Engagements"

    def __str__(self):
        return f"{self.engagement_code} - {self.client.legal_name}"