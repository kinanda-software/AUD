from django.contrib import admin

from .models import EvidenceFile


@admin.register(EvidenceFile)
class EvidenceFileAdmin(admin.ModelAdmin):
    list_display = (
        "original_filename",
        "engagement",
        "section",
        "file_size",
        "uploaded_by",
        "uploaded_at",
    )
    list_filter = ("section", "content_type")
    search_fields = (
        "original_filename",
        "caption",
        "engagement__engagement_code",
    )
