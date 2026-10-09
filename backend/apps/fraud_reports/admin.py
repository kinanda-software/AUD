from django.contrib import admin

from .models import FraudReport


@admin.register(FraudReport)
class FraudReportAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "subject",
        "status",
        "reviewed_by",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("reference", "subject")
