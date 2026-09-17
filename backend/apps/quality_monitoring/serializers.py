from rest_framework import serializers

from .models import (
    QualityMonitoringWorkpaper,
    QualityFinding,
    RemediationAction,
)


class QualityFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityFinding
        fields = [
            "id",
            "reference",
            "area",
            "description",
            "severity",
            "status",
            "root_cause",
            "corrective_action",
            "responsible_person",
            "target_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class RemediationActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RemediationAction
        fields = [
            "id",
            "reference",
            "action",
            "owner",
            "target_date",
            "status",
            "effectiveness",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


class QualityMonitoringWorkpaperSerializer(
    serializers.ModelSerializer
):
    findings = QualityFindingSerializer(
        many=True,
        required=False,
    )

    remediation_actions = RemediationActionSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = QualityMonitoringWorkpaper
        fields = [
            "id",
            "engagement",
            "completion_status",
            "inspection_status",
            "inspection_date",
            "inspector_name",
            "inspection_scope",
            "inspection_methodology",
            "inspection_conclusion",
            "firm_methodology_feedback",
            "training_feedback",
            "staffing_feedback",
            "supervision_feedback",
            "engagement_performance_conclusion",
            "overall_quality_conclusion",
            "monitoring_period",
            "next_monitoring_date",
            "leadership_review_completed",
            "findings_communicated",
            "root_cause_completed",
            "remediation_plan_approved",
            "effectiveness_monitoring_completed",
            "quality_leadership_notified",
            "findings",
            "remediation_actions",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        findings_data = validated_data.pop(
            "findings",
            [],
        )

        remediation_data = validated_data.pop(
            "remediation_actions",
            [],
        )

        workpaper = QualityMonitoringWorkpaper.objects.create(
            **validated_data
        )

        for finding_data in findings_data:
            QualityFinding.objects.create(
                workpaper=workpaper,
                **finding_data
            )

        for action_data in remediation_data:
            RemediationAction.objects.create(
                workpaper=workpaper,
                **action_data
            )

        return workpaper

    def update(self, instance, validated_data):
        findings_data = validated_data.pop(
            "findings",
            None,
        )

        remediation_data = validated_data.pop(
            "remediation_actions",
            None,
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if findings_data is not None:
            instance.findings.all().delete()

            for finding_data in findings_data:
                QualityFinding.objects.create(
                    workpaper=instance,
                    **finding_data
                )

        if remediation_data is not None:
            instance.remediation_actions.all().delete()

            for action_data in remediation_data:
                RemediationAction.objects.create(
                    workpaper=instance,
                    **action_data
                )

        return instance