from rest_framework import serializers

from .models import TimeEntry


class TimeEntrySerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = "__all__"
        read_only_fields = (
            "user",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def validate_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Hours must be greater than zero."
            )
        if value > 24:
            raise serializers.ValidationError(
                "A single entry cannot exceed 24 hours."
            )
        return value
