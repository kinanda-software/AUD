from django.conf import settings
from django.db import models


class MonitoringRule(models.Model):
    """
    A continuous-controls-monitoring rule. Rules with no
    engagement apply to every engagement; engagement-scoped
    rules apply only to that engagement. Rules are evaluated
    in real time as financial events are recorded.
    """

    class RuleType(models.TextChoices):
        LARGE_AMOUNT = "large_amount", "Large posting above threshold"
        ROUND_NUMBER = "round_number", "Round-number amount"
        OFF_HOURS = "off_hours", "Weekend or off-hours posting"
        BACKDATED = "backdated", "Backdated transaction"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="monitoring_rules",
        help_text="Leave empty for a firm-wide (global) rule.",
    )

    name = models.CharField(
        max_length=200,
    )

    rule_type = models.CharField(
        max_length=30,
        choices=RuleType.choices,
    )

    parameters = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Rule options, e.g. {\"threshold\": 1000000} for "
            "large_amount or {\"max_age_days\": 30} for backdated."
        ),
    )

    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.MEDIUM,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_monitoring_rules",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Monitoring Rule"
        verbose_name_plural = "Monitoring Rules"

    def __str__(self):
        scope = self.engagement.engagement_code if self.engagement else "Global"
        return f"{self.name} ({scope})"


class MonitoringAlert(models.Model):
    """
    An alert raised when a financial event matched an active
    monitoring rule at the moment the event was recorded.
    """

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        DISMISSED = "dismissed", "Dismissed"

    rule = models.ForeignKey(
        MonitoringRule,
        on_delete=models.PROTECT,
        related_name="alerts",
    )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="monitoring_alerts",
    )

    title = models.CharField(
        max_length=255,
    )

    object_type = models.CharField(
        max_length=80,
        help_text="Model name of the triggering record.",
    )

    object_id = models.CharField(
        max_length=80,
    )

    severity = models.CharField(
        max_length=10,
        choices=MonitoringRule.Severity.choices,
        default=MonitoringRule.Severity.MEDIUM,
    )

    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Evidence captured from the triggering event.",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_monitoring_alerts",
    )

    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Monitoring Alert"
        verbose_name_plural = "Monitoring Alerts"
        indexes = [
            models.Index(fields=["engagement", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.engagement.engagement_code}"
