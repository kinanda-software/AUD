from django.contrib import admin

from .models import AuditSchedule


@admin.register(AuditSchedule)
class AuditScheduleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "engagement",
        "audit_type",
        "status",
        "scheduled_start",
        "scheduled_end",
    )
    list_filter = ("audit_type", "status")
    search_fields = (
        "title",
        "engagement__engagement_code",
    )
    filter_horizontal = ("assigned_auditors",)
