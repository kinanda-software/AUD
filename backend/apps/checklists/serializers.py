from rest_framework import serializers

from .models import (
    ChecklistItem,
    ChecklistResponse,
    ChecklistTemplate,
    EngagementChecklist,
)


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = "__all__"


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(
        many=True,
        read_only=True,
    )

    item_count = serializers.IntegerField(
        source="items.count",
        read_only=True,
    )

    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = ChecklistTemplate
        fields = "__all__"
        read_only_fields = (
            "created_by",
            "created_at",
            "updated_at",
        )


class ChecklistResponseSerializer(serializers.ModelSerializer):
    question = serializers.CharField(
        source="item.question",
        read_only=True,
    )

    response_type = serializers.CharField(
        source="item.response_type",
        read_only=True,
    )

    order = serializers.IntegerField(
        source="item.order",
        read_only=True,
    )

    parent = serializers.IntegerField(
        source="item.parent_id",
        read_only=True,
    )

    condition_value = serializers.CharField(
        source="item.condition_value",
        read_only=True,
    )

    class Meta:
        model = ChecklistResponse
        fields = "__all__"
        read_only_fields = ("engagement_checklist", "item")


class EngagementChecklistSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    template_name = serializers.CharField(
        source="template.name",
        read_only=True,
    )

    score = serializers.SerializerMethodField()

    class Meta:
        model = EngagementChecklist
        fields = "__all__"
        read_only_fields = (
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_score(self, obj):
        return obj.compute_score()


class BulkResponseEntrySerializer(serializers.Serializer):
    """One answer inside the bulk responses payload."""

    item = serializers.IntegerField()
    value = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
    rating = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=5,
    )
    text_value = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class BulkResponseSerializer(serializers.Serializer):
    responses = BulkResponseEntrySerializer(many=True)
    complete = serializers.BooleanField(default=False)
