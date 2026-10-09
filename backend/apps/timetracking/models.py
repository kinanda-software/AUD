from django.conf import settings
from django.db import models


class TimeEntry(models.Model):
    """
    Actual hours logged by a team member against an
    engagement phase. Compared against AuditTeamMember
    budgeted_hours for budget-vs-actual tracking.
    """

    class Phase(models.TextChoices):
        PLANNING = "planning", "Planning"
        RISK_ASSESSMENT = "risk_assessment", "Risk Assessment"
        FIELDWORK = "fieldwork", "Fieldwork"
        REVIEW = "review", "Review"
        COMPLETION = "completion", "Completion & Reporting"
        OTHER = "other", "Other"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="time_entries",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="time_entries",
    )

    entry_date = models.DateField()

    hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
    )

    phase = models.CharField(
        max_length=30,
        choices=Phase.choices,
        default=Phase.FIELDWORK,
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
        ordering = ["-entry_date", "-created_at"]
        verbose_name = "Time Entry"
        verbose_name_plural = "Time Entries"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.user.username} - {self.hours}h"
        )
