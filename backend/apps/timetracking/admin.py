from django.contrib import admin

from .models import TimeEntry


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = (
        "engagement",
        "user",
        "entry_date",
        "phase",
        "hours",
    )
    list_filter = ("phase", "entry_date")
    search_fields = (
        "engagement__engagement_code",
        "user__username",
    )
