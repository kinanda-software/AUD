from rest_framework import serializers

from .models import AuditRequest


class AuditRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(
        source="client.legal_name",
        read_only=True,
    )

    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username",
        read_only=True,
    )

    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = AuditRequest
        fields = "__all__"
        read_only_fields = (
            "reference",
            "status",
            "reviewed_by",
            "reviewed_at",
            "engagement",
            "created_by",
            "created_at",
            "updated_at",
        )


class AuditRequestReviewSerializer(serializers.Serializer):
    """Payload for the review action."""

    decision = serializers.ChoiceField(
        choices=("under_review", "accept", "reject")
    )
    review_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class AuditRequestConvertSerializer(serializers.Serializer):
    """Payload for converting an accepted request to an engagement."""

    engagement_code = serializers.CharField(max_length=50)
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
    start_date = serializers.DateField()
    planned_end_date = serializers.DateField(
        required=False,
        allow_null=True,
    )
    financial_year_end = serializers.DateField(
        required=False,
        allow_null=True,
    )
    lead_auditor = serializers.IntegerField(
        required=False,
        allow_null=True,
    )
