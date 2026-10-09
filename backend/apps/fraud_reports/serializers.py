from rest_framework import serializers

from .models import FraudReport


class FraudReportSubmitSerializer(serializers.ModelSerializer):
    """Payload accepted from the public fraud-report form."""

    class Meta:
        model = FraudReport
        fields = (
            "subject",
            "description",
            "reporter_name",
            "reporter_email",
            "reporter_phone",
        )


class FraudReportSerializer(serializers.ModelSerializer):
    """Staff-facing representation."""

    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username",
        read_only=True,
    )

    class Meta:
        model = FraudReport
        fields = "__all__"
        read_only_fields = (
            "reference",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        )


class FraudReportTriageSerializer(serializers.Serializer):
    """Payload for the triage action."""

    decision = serializers.ChoiceField(
        choices=("under_review", "investigating", "closed")
    )
    triage_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
