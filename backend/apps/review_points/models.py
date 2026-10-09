from django.conf import settings
from django.db import models


class ReviewPoint(models.Model):
    """
    A review point (review note / clearance item) raised on an
    engagement — typically by a partner or manager on a specific
    workpaper section — assigned to a team member, answered,
    and cleared. This is the point-level clearance trail behind
    the engagement review workflow.
    """

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESPONDED = "responded", "Responded"
        CLEARED = "cleared", "Cleared"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="review_points",
    )

    reference = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. RP-000042.",
    )

    section = models.CharField(
        max_length=100,
        blank=True,
        help_text=(
            "Workpaper or audit area this point relates to, "
            "e.g. 'planning-assessment' or 'trial-balance'."
        ),
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField()

    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="raised_review_points",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_review_points",
    )

    response = models.TextField(
        blank=True,
        help_text="The assignee's answer / disposition.",
    )

    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responded_review_points",
    )

    responded_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    cleared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cleared_review_points",
    )

    cleared_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    due_date = models.DateField(
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
        verbose_name = "Review Point"
        verbose_name_plural = "Review Points"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"RP-{self.pk:06d}"
            super().save(update_fields=["reference"])

    def __str__(self):
        return f"{self.reference or 'RP'} - {self.title}"
