from rest_framework import serializers

from .models import NonConformance


class NonConformanceSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    assigned_to_name = serializers.SerializerMethodField()

    raised_by_username = serializers.CharField(
        source="raised_by.username",
        read_only=True,
    )

    verified_by_username = serializers.CharField(
        source="verified_by.username",
        read_only=True,
    )

    class Meta:
        model = NonConformance
        fields = "__all__"
        read_only_fields = (
            "reference",
            "raised_by",
            "verified_by",
            "closed_at",
            "created_at",
            "updated_at",
        )

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return ""
        return (
            obj.assigned_to.get_full_name()
            or obj.assigned_to.username
        )
