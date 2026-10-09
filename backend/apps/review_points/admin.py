from django.contrib import admin

from .models import ReviewPoint


@admin.register(ReviewPoint)
class ReviewPointAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "title",
        "engagement",
        "section",
        "priority",
        "status",
        "assigned_to",
        "due_date",
    )
    list_filter = ("status", "priority", "section")
    search_fields = (
        "reference",
        "title",
        "engagement__engagement_code",
    )
