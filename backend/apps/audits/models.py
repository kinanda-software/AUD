from django.db import models
from django.conf import settings


class Audit(models.Model):
    STATUS_CHOICES = [
        ("planned", "Planned"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    audit_code = models.CharField(
        max_length=50,
        unique=True
    )

    title = models.CharField(
        max_length=255
    )

    description = models.TextField(
        blank=True
    )

    audit_type = models.CharField(
        max_length=100
    )

    auditee = models.CharField(
        max_length=255
    )

    lead_auditor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_audits"
    )

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="planned"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.audit_code} - {self.title}"