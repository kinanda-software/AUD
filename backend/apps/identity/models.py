from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Administrator"),
        ("auditor", "Auditor"),
        ("manager", "Manager"),
        ("staff", "Staff"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="staff",
    )

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.username