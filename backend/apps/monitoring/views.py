from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import MonitoringAlert, MonitoringRule
from .serializers import (
    MonitoringAlertSerializer,
    MonitoringRuleSerializer,
)


class MonitoringRuleViewSet(viewsets.ModelViewSet):
    queryset = (
        MonitoringRule.objects
        .select_related("engagement", "created_by")
        .all()
    )

    serializer_class = MonitoringRuleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get(
            "engagement"
        )
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active"])
        return Response(self.get_serializer(rule).data)


class MonitoringAlertViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        MonitoringAlert.objects
        .select_related(
            "rule",
            "engagement",
            "acknowledged_by",
        )
        .all()
    )

    serializer_class = MonitoringAlertSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        engagement_id = params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        severity = params.get("severity")
        if severity:
            queryset = queryset.filter(severity=severity)

        return queryset

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        if alert.status != MonitoringAlert.Status.OPEN:
            raise ValidationError(
                "Only open alerts can be acknowledged."
            )
        alert.status = MonitoringAlert.Status.ACKNOWLEDGED
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save(
            update_fields=[
                "status",
                "acknowledged_by",
                "acknowledged_at",
            ]
        )
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        alert = self.get_object()
        if alert.status == MonitoringAlert.Status.DISMISSED:
            raise ValidationError("Alert already dismissed.")
        alert.status = MonitoringAlert.Status.DISMISSED
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save(
            update_fields=[
                "status",
                "acknowledged_by",
                "acknowledged_at",
            ]
        )
        return Response(self.get_serializer(alert).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Open-alert counts for badges and dashboards."""
        queryset = self.filter_queryset(self.get_queryset())

        open_alerts = queryset.filter(
            status=MonitoringAlert.Status.OPEN
        )

        by_severity = {}
        for value, label in MonitoringRule.Severity.choices:
            by_severity[value] = {
                "label": label,
                "count": open_alerts.filter(
                    severity=value
                ).count(),
            }

        return Response({
            "open": open_alerts.count(),
            "acknowledged": queryset.filter(
                status=MonitoringAlert.Status.ACKNOWLEDGED
            ).count(),
            "dismissed": queryset.filter(
                status=MonitoringAlert.Status.DISMISSED
            ).count(),
            "by_severity": by_severity,
        })
