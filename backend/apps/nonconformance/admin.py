from django.contrib import admin

from .models import NonConformance


@admin.register(NonConformance)
class NonConformanceAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "title",
        "engagement",
        "severity",
        "status",
        "assigned_to",
        "due_date",
    )
    list_filter = ("severity", "status", "source")
    search_fields = (
        "reference",
        "title",
        "engagement__engagement_code",
    )
