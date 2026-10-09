from rest_framework import serializers

from .models import ReviewPoint


class ReviewPointSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    raised_by_name = serializers.SerializerMethodField()

    assigned_to_name = serializers.SerializerMethodField()

    responded_by_username = serializers.CharField(
        source="responded_by.username",
        read_only=True,
    )

    cleared_by_username = serializers.CharField(
        source="cleared_by.username",
        read_only=True,
    )

    class Meta:
        model = ReviewPoint
        fields = "__all__"
        read_only_fields = (
            "reference",
            "raised_by",
            "responded_by",
            "responded_at",
            "cleared_by",
            "cleared_at",
            "created_at",
            "updated_at",
        )

    def get_raised_by_name(self, obj):
        if obj.raised_by is None:
            return ""
        return obj.raised_by.get_full_name() or obj.raised_by.username

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return ""
        return (
            obj.assigned_to.get_full_name()
            or obj.assigned_to.username
        )


class ReviewPointResponseSerializer(serializers.Serializer):
    """Payload for the respond action."""

    response = serializers.CharField()
