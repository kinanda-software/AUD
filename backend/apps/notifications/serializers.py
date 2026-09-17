from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "is_read",
            "created_at",
            "time",
        ]

    def get_time(self, obj):
        return obj.created_at.isoformat()