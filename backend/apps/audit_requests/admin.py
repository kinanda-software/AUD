from django.contrib import admin

from .models import AuditRequest


@admin.register(AuditRequest)
class AuditRequestAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "company_name",
        "audit_type",
        "status",
        "reviewed_by",
        "created_at",
    )
    list_filter = ("status", "audit_type")
    search_fields = (
        "reference",
        "company_name",
        "contact_email",
    )
