from django.db import models


class QualityMonitoringWorkpaper(models.Model):
    class CompletionStatus(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"

    class InspectionStatus(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"
        NOT_APPLICABLE = "Not Applicable", "Not Applicable"

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="quality_monitoring_workpaper",
    )

    completion_status = models.CharField(
        max_length=30,
        choices=CompletionStatus.choices,
        default=CompletionStatus.NOT_STARTED,
    )

    inspection_status = models.CharField(
        max_length=30,
        choices=InspectionStatus.choices,
        default=InspectionStatus.NOT_STARTED,
    )

    inspection_date = models.DateField(
        null=True,
        blank=True,
    )

    inspector_name = models.CharField(
        max_length=255,
        blank=True,
    )

    inspection_scope = models.TextField(
        blank=True,
    )

    inspection_methodology = models.TextField(
        blank=True,
    )

    inspection_conclusion = models.TextField(
        blank=True,
    )

    firm_methodology_feedback = models.TextField(
        blank=True,
    )

    training_feedback = models.TextField(
        blank=True,
    )

    staffing_feedback = models.TextField(
        blank=True,
    )

    supervision_feedback = models.TextField(
        blank=True,
    )

    engagement_performance_conclusion = models.TextField(
        blank=True,
    )

    overall_quality_conclusion = models.TextField(
        blank=True,
    )

    monitoring_period = models.CharField(
        max_length=255,
        blank=True,
    )

    next_monitoring_date = models.DateField(
        null=True,
        blank=True,
    )

    leadership_review_completed = models.BooleanField(
        default=False,
    )

    findings_communicated = models.BooleanField(
        default=False,
    )

    root_cause_completed = models.BooleanField(
        default=False,
    )

    remediation_plan_approved = models.BooleanField(
        default=False,
    )

    effectiveness_monitoring_completed = models.BooleanField(
        default=False,
    )

    quality_leadership_notified = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "quality_monitoring_workpapers"
        ordering = ["-updated_at"]

    def __str__(self):
        return (
            f"Quality Monitoring 4.7 - "
            f"Engagement {self.engagement_id}"
        )


class QualityFinding(models.Model):
    class Severity(models.TextChoices):
        LOW = "Low", "Low"
        MODERATE = "Moderate", "Moderate"
        SIGNIFICANT = "Significant", "Significant"
        SEVERE = "Severe", "Severe"

    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        UNDER_INVESTIGATION = (
            "Under Investigation",
            "Under Investigation",
        )
        REMEDIATED = "Remediated", "Remediated"
        ACCEPTED = "Accepted", "Accepted"
        NOT_APPLICABLE = "Not Applicable", "Not Applicable"

    workpaper = models.ForeignKey(
        QualityMonitoringWorkpaper,
        on_delete=models.CASCADE,
        related_name="findings",
    )

    reference = models.CharField(
        max_length=50,
    )

    area = models.CharField(
        max_length=255,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.MODERATE,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN,
    )

    root_cause = models.TextField(
        blank=True,
    )

    corrective_action = models.TextField(
        blank=True,
    )

    responsible_person = models.CharField(
        max_length=255,
        blank=True,
    )

    target_date = models.DateField(
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
        db_table = "quality_monitoring_findings"
        ordering = ["id"]

    def __str__(self):
        return self.reference


class RemediationAction(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"
        MONITORING = "Monitoring", "Monitoring"

    workpaper = models.ForeignKey(
        QualityMonitoringWorkpaper,
        on_delete=models.CASCADE,
        related_name="remediation_actions",
    )

    reference = models.CharField(
        max_length=50,
    )

    action = models.TextField(
        blank=True,
    )

    owner = models.CharField(
        max_length=255,
        blank=True,
    )

    target_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )

    effectiveness = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "quality_monitoring_remediation_actions"
        ordering = ["id"]

    def __str__(self):
        return self.reference