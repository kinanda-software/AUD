from rest_framework import serializers
from .models import CompletionReview


class CompletionReviewSerializer(serializers.ModelSerializer):
    engagement_name = serializers.CharField(
        source="engagement.title",
        read_only=True,
    )

    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CompletionReview
        fields = [
            "id",
            "engagement",
            "engagement_name",
            "status",
            "financial_statements_finalized",
            "audit_adjustments_reviewed",
            "subsequent_events_reviewed",
            "going_concern_reviewed",
            "legal_matters_reviewed",
            "related_parties_reviewed",
            "audit_documentation_completed",
            "review_points_cleared",
            "partner_review_completed",
            "eqr_completed",
            "outstanding_matters",
            "final_review_notes",
            "completion_conclusion",
            "completed_by",
            "completed_by_name",
            "completion_date",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "engagement_name",
            "completed_by_name",
            "created_at",
            "updated_at",
        ]

    def get_completed_by_name(self, obj):
        if not obj.completed_by:
            return None

        return (
            obj.completed_by.get_full_name()
            or obj.completed_by.username
        )
