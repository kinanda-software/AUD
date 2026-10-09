from django.db import models


class ClientRegistration(models.Model):
    """
    A self-service client registration submitted through the
    public portal. Email ownership is verified with a one-time
    code (OTP) before staff review and approval, which creates
    the Client record.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Email Verification"
        VERIFIED = "verified", "Email Verified"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    reference = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. REG-000042.",
    )

    legal_name = models.CharField(
        max_length=255,
    )

    registration_number = models.CharField(
        max_length=100,
        blank=True,
    )

    license_authority = models.CharField(
        max_length=150,
        blank=True,
        help_text="Authority that issued the trade/practice license.",
    )

    license_expiry_date = models.DateField(
        null=True,
        blank=True,
    )

    industry = models.CharField(
        max_length=150,
        blank=True,
    )

    contact_person = models.CharField(
        max_length=255,
    )

    contact_email = models.EmailField()

    contact_phone = models.CharField(
        max_length=50,
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    otp_code = models.CharField(
        max_length=6,
        blank=True,
    )

    otp_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    otp_attempts = models.PositiveSmallIntegerField(
        default=0,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    review_notes = models.TextField(
        blank=True,
    )

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registrations",
        help_text="Client record created when approved.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Client Registration"
        verbose_name_plural = "Client Registrations"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"REG-{self.pk:06d}"
            super().save(update_fields=["reference"])

    def __str__(self):
        return f"{self.reference or 'REG'} - {self.legal_name}"
