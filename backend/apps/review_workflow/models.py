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