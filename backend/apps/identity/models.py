from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Administrator"),
        ("auditor", "Auditor"),
        ("manager", "Manager"),
        ("reviewer", "Peer Reviewer (Read Only)"),
        ("staff", "Staff"),
        ("guest", "Guest"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="staff",
    )

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.username