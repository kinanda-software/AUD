from django.db import models


class Client(models.Model):
    class ClientType(models.TextChoices):
        COMPANY = "company", "Company"
        GOVERNMENT = "government", "Government"
        NGO = "ngo", "NGO"
        BANK = "bank", "Bank"
        INSURANCE = "insurance", "Insurance"
        OTHER = "other", "Other"

    class ClientStatus(models.TextChoices):
        PROSPECT = "prospect", "Prospect"
        ONBOARDING = "onboarding", "Onboarding"
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    client_code = models.CharField(
        max_length=50,
        unique=True,
    )

    legal_name = models.CharField(
        max_length=255,
    )

    trading_name = models.CharField(
        max_length=255,
        blank=True,
    )

    client_type = models.CharField(
        max_length=30,
        choices=ClientType.choices,
        default=ClientType.COMPANY,
    )

    registration_number = models.CharField(
        max_length=100,
        blank=True,
    )

    tax_identification_number = models.CharField(
        max_length=100,
        blank=True,
    )

    industry = models.CharField(
        max_length=150,
        blank=True,
    )

    address = models.TextField(
        blank=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
    )

    country = models.CharField(
        max_length=100,
        default="Tanzania",
    )

    contact_person = models.CharField(
        max_length=255,
        blank=True,
    )

    contact_email = models.EmailField(
        blank=True,
    )

    contact_phone = models.CharField(
        max_length=50,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=ClientStatus.choices,
        default=ClientStatus.PROSPECT,
    )

    risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.MEDIUM,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["legal_name"]
        verbose_name = "Client"
        verbose_name_plural = "Clients"

    def __str__(self):
        return f"{self.client_code} - {self.legal_name}"