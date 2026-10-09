from rest_framework import serializers

from .models import AuditSchedule


class AuditScheduleSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    client_name = serializers.CharField(
        source="engagement.client.legal_name",
        read_only=True,
    )

    assigned_auditor_names = serializers.SerializerMethodField()

    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    next_occurrence = serializers.DateTimeField(
        read_only=True,
    )

    class Meta:
        model = AuditSchedule
        fields = "__all__"
        read_only_fields = (
            "reminder_sent",
            "created_by",
            "created_at",
            "updated_at",
        )

    def get_assigned_auditor_names(self, obj):
        return [
            user.get_full_name() or user.username
            for user in obj.assigned_auditors.all()
        ]

    def validate(self, attrs):
        start = attrs.get(
            "scheduled_start",
            getattr(self.instance, "scheduled_start", None),
        )
        end = attrs.get(
            "scheduled_end",
            getattr(self.instance, "scheduled_end", None),
        )
        if start and end and end <= start:
            raise serializers.ValidationError({
                "scheduled_end": (
                    "The scheduled end must be after the "
                    "scheduled start."
                ),
            })
        return attrs
