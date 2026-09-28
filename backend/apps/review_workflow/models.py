
from django.conf import settings
from django.db import models


class ReviewAssignment(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
        ("Returned", "Returned"),
    ]

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="review_assignments",
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="review_assignments",
    )

    review_area = models.CharField(max_length=255)

    assigned_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="Pending",
    )

    review_notes = models.TextField(blank=True)

    completed_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.engagement} - {self.review_area}"


class SummaryReview(models.Model):
    """
    Main database record for Phase 4.3:
    Summary Review & Overall Review / Approval.

    ReviewAssignment continues to store individual review assignments,
    while this model stores the complete 4.3 workpaper.
    """

    STATUS_CHOICES = [
        ("In Progress", "In Progress"),
        ("Completed", "Completed"),
    ]

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="summary_review",
    )

    # ---------------------------------------------------------
    # 4.3.2 Significant Judgments
    # ---------------------------------------------------------

    judgments = models.JSONField(
        default=list,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.3 Uncorrected Misstatements
    # ---------------------------------------------------------

    uncorrected_misstatements = models.JSONField(
        default=dict,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.4 Financial Statement Procedures
    # ---------------------------------------------------------

    financial_statement_confirmations = models.JSONField(
        default=dict,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.5 Engagement Team Review
    # ---------------------------------------------------------

    engagement_team_review = models.JSONField(
        default=dict,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.6 Engagement Partner Review & Approval
    # ---------------------------------------------------------

    partner_review = models.JSONField(
        default=dict,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.7 Engagement Quality Review
    # ---------------------------------------------------------

    eqr_review = models.JSONField(
        default=dict,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.8 Review Comments & Clearance
    # ---------------------------------------------------------

    review_comments = models.JSONField(
        default=list,
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.9 Overall Review Conclusion
    # ---------------------------------------------------------

    overall_conclusion = models.TextField(
        blank=True,
    )

    approval_comments = models.TextField(
        blank=True,
    )

    # ---------------------------------------------------------
    # 4.3.10 Completion
    # ---------------------------------------------------------

    completion_checklist = models.JSONField(
        default=dict,
        blank=True,
    )

    completion_status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="In Progress",
    )

    completed_at = models.DateTimeField(
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
        ordering = ["-updated_at"]

    def __str__(self):
        return (
            f"{self.engagement} - "
            f"Summary Review"
        )

