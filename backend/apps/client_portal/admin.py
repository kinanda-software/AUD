from django.contrib import admin

from .models import ClientRegistration


@admin.register(ClientRegistration)
class ClientRegistrationAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "legal_name",
        "contact_email",
        "status",
        "license_expiry_date",
        "created_at",
    )
    list_filter = ("status", "license_authority")
    search_fields = (
        "reference",
        "legal_name",
        "contact_email",
    )
    readonly_fields = ("otp_code", "otp_expires_at", "otp_attempts")
