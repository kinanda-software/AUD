from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AuditSchedule(models.Model):
    """
    A scheduled audit activity for an engagement.

    Supports internal and external audits, auditor/auditee
    assignment, and deadline reminders through the existing
    notifications app.
    """

    class AuditType(models.TextChoices):
        INTERNAL = "internal", "Internal Audit"
        EXTERNAL = "external", "External Audit"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    title = models.CharField(
        max_length=255,
    )

    audit_type = models.CharField(
        max_length=20,
        choices=AuditType.choices,
        default=AuditType.INTERNAL,
    )

    scheduled_start = models.DateTimeField()

    scheduled_end = models.DateTimeField()

    location = models.CharField(
        max_length=255,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )

    assigned_auditors = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="audit_schedules",
    )

    auditee_name = models.CharField(
        max_length=255,
        blank=True,
    )

    auditee_email = models.EmailField(
        blank=True,
    )

    reminder_days = models.PositiveSmallIntegerField(
        default=1,
        help_text="Days before the start date to send a reminder.",
    )

    recurrence_months = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text=(
            "Repeat interval in months for recurring audits, "
            "e.g. 12 for an annual internal audit cycle."
        ),
    )

    reminder_sent = models.BooleanField(
        default=False,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_schedules",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["scheduled_start"]
        verbose_name = "Audit Schedule"
        verbose_name_plural = "Audit Schedules"

    def clean(self):
        if (
            self.scheduled_start
            and self.scheduled_end
            and self.scheduled_end <= self.scheduled_start
        ):
            raise ValidationError({
                "scheduled_end": (
                    "The scheduled end must be after the "
                    "scheduled start."
                ),
            })

    def __str__(self):
        return (
            f"{self.title} - {self.engagement.engagement_code}"
        )

    @property
    def next_occurrence(self):
        """Next occurrence of a recurring schedule, if any."""
        if not self.recurrence_months or not self.scheduled_start:
            return None
        return _add_months(
            self.scheduled_start,
            self.recurrence_months,
        )


def _add_months(value, months):
    """Shift a datetime by whole months, clamping the day."""
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(
        value.day,
        [31, 29 if year % 4 == 0 and (
            year % 100 != 0 or year % 400 == 0
        ) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1],
    )
    return value.replace(year=year, month=month, day=day)
