from django.contrib import admin

from .models import SampleSelection


@admin.register(SampleSelection)
class SampleSelectionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "engagement",
        "method",
        "sample_size",
        "population_size",
        "created_by",
        "created_at",
    )
    list_filter = ("method",)
    search_fields = ("name", "engagement__engagement_code")
    readonly_fields = ("items", "seed", "interval")
