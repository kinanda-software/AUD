from rest_framework import serializers

from .models import MonitoringAlert, MonitoringRule


class MonitoringRuleSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    rule_type_label = serializers.CharField(
        source="get_rule_type_display",
        read_only=True,
    )

    alert_count = serializers.IntegerField(
        source="alerts.count",
        read_only=True,
    )

    class Meta:
        model = MonitoringRule
        fields = "__all__"
        read_only_fields = ("created_by", "created_at")


class MonitoringAlertSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(
        source="rule.name",
        read_only=True,
    )

    rule_type = serializers.CharField(
        source="rule.rule_type",
        read_only=True,
    )

    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    acknowledged_by_username = serializers.CharField(
        source="acknowledged_by.username",
        read_only=True,
    )

    class Meta:
        model = MonitoringAlert
        fields = "__all__"
        read_only_fields = (
            "rule",
            "engagement",
            "title",
            "object_type",
            "object_id",
            "severity",
            "details",
            "acknowledged_by",
            "acknowledged_at",
            "created_at",
        )
