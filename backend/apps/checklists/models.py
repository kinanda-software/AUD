from decimal import Decimal

from django.conf import settings
from django.db import models


class ChecklistTemplate(models.Model):
    """
    A reusable audit checklist/questionnaire template.

    Templates can be created from scratch, cloned from an
    existing template, or imported from an Excel workbook.
    """

    name = models.CharField(
        max_length=200,
    )

    description = models.TextField(
        blank=True,
    )

    category = models.CharField(
        max_length=100,
        blank=True,
        default="General",
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_checklist_templates",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "Checklist Template"
        verbose_name_plural = "Checklist Templates"

    def __str__(self):
        return self.name


class ChecklistItem(models.Model):
    """
    One question in a checklist template.

    Items can be nested under a parent item and shown only
    when the parent's answer matches `condition_value`
    (conditional sub-questions).
    """

    class ResponseType(models.TextChoices):
        YES_NO = "yes_no", "Yes / No"
        YES_NO_NA = "yes_no_na", "Yes / No / N/A"
        TEXT = "text", "Text"
        NUMBER = "number", "Number"
        RATING = "rating", "Rating (1-5)"

    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.CASCADE,
        related_name="items",
    )

    order = models.PositiveIntegerField(
        default=0,
    )

    question = models.TextField()

    response_type = models.CharField(
        max_length=20,
        choices=ResponseType.choices,
        default=ResponseType.YES_NO_NA,
    )

    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Scoring weight for this question.",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sub_items",
    )

    condition_value = models.CharField(
        max_length=50,
        blank=True,
        help_text=(
            "Show this sub-question only when the parent "
            "answer equals this value (e.g. 'no')."
        ),
    )

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Checklist Item"
        verbose_name_plural = "Checklist Items"

    def __str__(self):
        return f"{self.template.name}: {self.question[:60]}"


class EngagementChecklist(models.Model):
    """
    A checklist template instantiated for one engagement,
    holding the auditors' responses and computed score.
    """

    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="checklists",
    )

    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.PROTECT,
        related_name="engagement_checklists",
    )

    name = models.CharField(
        max_length=200,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_engagement_checklists",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Engagement Checklist"
        verbose_name_plural = "Engagement Checklists"

    def __str__(self):
        return (
            f"{self.name} - {self.engagement.engagement_code}"
        )

    def compute_score(self):
        """
        Weighted compliance score over yes/no questions.

        N/A and unanswered questions are excluded. Returns a
        dict with the percentage, rating band, and counts.
        """
        responses = (
            self.responses
            .select_related("item")
            .filter(
                item__response_type__in=(
                    ChecklistItem.ResponseType.YES_NO,
                    ChecklistItem.ResponseType.YES_NO_NA,
                )
            )
        )

        total_weight = Decimal("0")
        earned_weight = Decimal("0")
        answered = 0
        yes_count = 0
        no_count = 0

        for response in responses:
            value = (response.value or "").lower()
            if value not in ("yes", "no"):
                continue
            answered += 1
            weight = response.item.weight or Decimal("1")
            total_weight += weight
            if value == "yes":
                yes_count += 1
                earned_weight += weight
            else:
                no_count += 1

        percent = None
        rating = "Not scored"
        if total_weight > 0:
            percent = round(
                float(earned_weight / total_weight * 100),
                1,
            )
            if percent >= 90:
                rating = "A - Excellent"
            elif percent >= 75:
                rating = "B - Good"
            elif percent >= 60:
                rating = "C - Fair"
            else:
                rating = "D - Poor"

        return {
            "percent": percent,
            "rating": rating,
            "answered": answered,
            "yes": yes_count,
            "no": no_count,
            "total_questions": self.responses.count(),
        }


class ChecklistResponse(models.Model):
    """One auditor answer to one checklist item."""

    engagement_checklist = models.ForeignKey(
        EngagementChecklist,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    item = models.ForeignKey(
        ChecklistItem,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    value = models.CharField(
        max_length=20,
        blank=True,
        help_text="yes / no / na for yes-no questions.",
    )

    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="1-5 for rating questions.",
    )

    text_value = models.TextField(
        blank=True,
        help_text="Answer for text/number questions.",
    )

    comment = models.TextField(
        blank=True,
    )

    class Meta:
        unique_together = ("engagement_checklist", "item")
        ordering = ["item__order", "item__id"]
        verbose_name = "Checklist Response"
        verbose_name_plural = "Checklist Responses"

    def __str__(self):
        return (
            f"Response to item {self.item_id} on "
            f"checklist {self.engagement_checklist_id}"
        )
