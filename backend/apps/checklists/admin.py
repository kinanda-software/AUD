from django.contrib import admin

from .models import (
    ChecklistItem,
    ChecklistResponse,
    ChecklistTemplate,
    EngagementChecklist,
)


class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 1


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "is_active",
        "created_by",
        "created_at",
    )
    list_filter = ("category", "is_active")
    search_fields = ("name", "description")
    inlines = (ChecklistItemInline,)


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = (
        "template",
        "order",
        "question",
        "response_type",
        "weight",
        "parent",
    )
    list_filter = ("response_type", "template")


@admin.register(EngagementChecklist)
class EngagementChecklistAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "engagement",
        "template",
        "status",
        "created_at",
    )
    list_filter = ("status",)


@admin.register(ChecklistResponse)
class ChecklistResponseAdmin(admin.ModelAdmin):
    list_display = (
        "engagement_checklist",
        "item",
        "value",
        "rating",
    )
