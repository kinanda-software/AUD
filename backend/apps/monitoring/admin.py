from django.contrib import admin

from .models import MonitoringAlert, MonitoringRule


@admin.register(MonitoringRule)
class MonitoringRuleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "rule_type",
        "engagement",
        "severity",
        "is_active",
    )
    list_filter = ("rule_type", "severity", "is_active")
    search_fields = ("name",)


@admin.register(MonitoringAlert)
class MonitoringAlertAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "engagement",
        "severity",
        "status",
        "created_at",
    )
    list_filter = ("severity", "status")
    search_fields = (
        "title",
        "engagement__engagement_code",
    )
    readonly_fields = ("details",)
