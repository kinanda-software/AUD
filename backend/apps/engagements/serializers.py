from rest_framework import serializers

from .models import Engagement


class EngagementSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(
        source="client.legal_name",
        read_only=True,
    )

    lead_auditor_username = serializers.CharField(
        source="lead_auditor.username",
        read_only=True,
    )

    class Meta:
        model = Engagement

        fields = [
            "id",
            "engagement_code",
            "client",
            "client_name",
            "title",
            "engagement_type",
            "description",
            "lead_auditor",
            "lead_auditor_username",
            "status",
            "current_phase",
            "risk_level",
            "start_date",
            "planned_end_date",
            "actual_end_date",
            "financial_year_end",
            "progress_percentage",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "client_name",
            "lead_auditor_username",
        ]