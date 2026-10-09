from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FraudReport
from .serializers import (
    FraudReportSerializer,
    FraudReportSubmitSerializer,
    FraudReportTriageSerializer,
)


class FraudReportSubmitView(APIView):
    """
    POST /api/fraud-reports/submit/

    Public whistleblowing endpoint. Anonymous reports are
    accepted; the response returns only the reference so the
    reporter can quote it in follow-up contact.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = FraudReportSubmitSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        report = serializer.save()

        # Notify staff with review responsibility.
        from django.contrib.auth import get_user_model

        from apps.notifications.models import Notification

        reviewers = get_user_model().objects.filter(
            is_active=True,
            role__in=("admin", "manager", "partner"),
        )
        for reviewer in reviewers:
            Notification.objects.create(
                recipient=reviewer,
                notification_type="system",
                title=f"Fraud report received: {report.reference}",
                message=(
                    f"A public fraud report concerning "
                    f"'{report.subject}' was submitted and "
                    f"awaits triage."
                ),
            )

        return Response(
            {
                "reference": report.reference,
                "message": (
                    "Your report has been received. Quote the "
                    "reference in any follow-up contact."
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class FraudReportViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff triage list with status actions."""

    queryset = FraudReport.objects.select_related(
        "reviewed_by"
    ).all()
    serializer_class = FraudReportSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    @action(detail=True, methods=["post"])
    def triage(self, request, pk=None):
        report = self.get_object()

        if report.status == FraudReport.Status.CLOSED:
            raise ValidationError(
                "A closed report cannot be triaged further."
            )

        serializer = FraudReportTriageSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        report.status = serializer.validated_data["decision"]
        report.triage_notes = serializer.validated_data[
            "triage_notes"
        ]
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(
            update_fields=[
                "status",
                "triage_notes",
                "reviewed_by",
                "reviewed_at",
            ]
        )

        return Response(self.get_serializer(report).data)
