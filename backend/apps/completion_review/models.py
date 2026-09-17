from django.conf import settings
from django.db import models


class CompletionReview(models.Model):
    STATUS_CHOICES = [
        ("Not Started", "Not Started"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
    ]

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="completion_review",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="Not Started",
    )

    financial_statements_finalized = models.BooleanField(default=False)
    audit_adjustments_reviewed = models.BooleanField(default=False)
    subsequent_events_reviewed = models.BooleanField(default=False)
    going_concern_reviewed = models.BooleanField(default=False)
    legal_matters_reviewed = models.BooleanField(default=False)
    related_parties_reviewed = models.BooleanField(default=False)
    audit_documentation_completed = models.BooleanField(default=False)
    review_points_cleared = models.BooleanField(default=False)
    partner_review_completed = models.BooleanField(default=False)
    eqr_completed = models.BooleanField(default=False)

    outstanding_matters = models.TextField(blank=True)
    final_review_notes = models.TextField(blank=True)
    completion_conclusion = models.TextField(blank=True)

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_completion_reviews",
    )

    completion_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Completion Review - {self.engagement}"
