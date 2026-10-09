import os

from django.conf import settings
from django.db import models


class EvidenceFile(models.Model):
    """
    A digital audit-evidence attachment linked to an
    engagement (and optionally a workpaper section).

    Files are stored under MEDIA_ROOT/evidence/<year>/<month>/
    and served from MEDIA_URL in development.
    """

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="evidence_files",
    )

    section = models.CharField(
        max_length=100,
        blank=True,
        help_text=(
            "Optional workpaper or audit area this "
            "evidence supports, e.g. 'planning-assessment'."
        ),
    )

    file = models.FileField(
        upload_to="evidence/%Y/%m/",
    )

    original_filename = models.CharField(
        max_length=255,
    )

    content_type = models.CharField(
        max_length=100,
        blank=True,
    )

    file_size = models.PositiveBigIntegerField(
        default=0,
    )

    caption = models.CharField(
        max_length=255,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_evidence",
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-uploaded_at"]
        verbose_name = "Evidence File"
        verbose_name_plural = "Evidence Files"

    def __str__(self):
        return (
            f"{self.original_filename} - "
            f"{self.engagement.engagement_code}"
        )

    @property
    def extension(self):
        return os.path.splitext(
            self.original_filename
        )[1].lstrip(".").lower()
