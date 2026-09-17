from rest_framework import serializers

from .models import ReviewAssignment


class ReviewAssignmentSerializer(serializers.ModelSerializer):
    engagement_name = serializers.CharField(
        source="engagement.title",
        read_only=True,
    )

    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ReviewAssignment
        fields = [
            "id",
            "engagement",
            "engagement_name",
            "reviewer",
            "reviewer_name",
            "review_area",
            "assigned_date",
            "due_date",
            "status",
            "review_notes",
            "completed_date",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_name",
            "reviewer_name",
        ]

    def get_reviewer_name(self, obj):
        if not obj.reviewer:
            return None

        return (
            obj.reviewer.get_full_name()
            or obj.reviewer.username
        )