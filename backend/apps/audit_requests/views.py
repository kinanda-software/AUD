from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import AuditRequest
from .serializers import (
    AuditRequestConvertSerializer,
    AuditRequestReviewSerializer,
    AuditRequestSerializer,
)


def _require_manager(user):
    if not user.is_superuser and user.role not in (
        "admin",
        "manager",
        "partner",
    ):
        raise PermissionDenied(
            "Only a manager or administrator can review "
            "audit requests."
        )


class AuditRequestViewSet(viewsets.ModelViewSet):
    queryset = (
        AuditRequest.objects
        .select_related(
            "client",
            "reviewed_by",
            "engagement",
            "created_by",
        )
        .all()
    )

    serializer_class = AuditRequestSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        client_id = params.get("client")
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        # The pipeline status fields are driven only by the
        # review/convert actions, not by plain edits.
        serializer.save(
            status=self.get_object().status,
            reviewed_by=self.get_object().reviewed_by,
            reviewed_at=self.get_object().reviewed_at,
            engagement=self.get_object().engagement,
        )

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """Accept, reject, or mark a request under review."""
        _require_manager(request.user)
        audit_request = self.get_object()

        if audit_request.status in (
            AuditRequest.Status.REJECTED,
            AuditRequest.Status.CONVERTED,
        ):
            raise ValidationError(
                f"A {audit_request.get_status_display().lower()} "
                "request cannot be reviewed."
            )

        serializer = AuditRequestReviewSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        status_map = {
            "under_review": AuditRequest.Status.UNDER_REVIEW,
            "accept": AuditRequest.Status.ACCEPTED,
            "reject": AuditRequest.Status.REJECTED,
        }

        audit_request.status = status_map[decision]
        audit_request.review_notes = serializer.validated_data[
            "review_notes"
        ]
        audit_request.reviewed_by = request.user
        audit_request.reviewed_at = timezone.now()
        audit_request.save(
            update_fields=[
                "status",
                "review_notes",
                "reviewed_by",
                "reviewed_at",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(audit_request).data
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def convert(self, request, pk=None):
        """
        Convert an accepted request into a new engagement.
        """
        _require_manager(request.user)
        audit_request = self.get_object()

        if audit_request.status != AuditRequest.Status.ACCEPTED:
            raise ValidationError(
                "Only accepted requests can be converted "
                "to engagements."
            )

        serializer = AuditRequestConvertSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.clients.models import Client
        from apps.engagements.models import Engagement

        if Engagement.objects.filter(
            engagement_code=data["engagement_code"]
        ).exists():
            raise ValidationError({
                "engagement_code": (
                    "An engagement with this code already exists."
                ),
            })

        client = audit_request.client
        if client is None:
            # The requester was not a registered client —
            # create the client record from the request data.
            base_code = f"AR{audit_request.pk:05d}"
            client_code = base_code
            suffix = 1
            while Client.objects.filter(
                client_code=client_code
            ).exists():
                suffix += 1
                client_code = f"{base_code}-{suffix}"
            client = Client.objects.create(
                client_code=client_code,
                legal_name=audit_request.company_name,
                contact_person=audit_request.contact_name,
                contact_email=audit_request.contact_email,
                contact_phone=audit_request.contact_phone,
                status=Client.ClientStatus.ONBOARDING,
            )
            audit_request.client = client

        lead_auditor = None
        if data.get("lead_auditor"):
            from django.contrib.auth import get_user_model

            lead_auditor = get_user_model().objects.filter(
                pk=data["lead_auditor"]
            ).first()

        engagement = Engagement.objects.create(
            engagement_code=data["engagement_code"],
            client=client,
            title=(
                data["title"]
                or f"{audit_request.get_audit_type_display()} — "
                f"{audit_request.company_name}"
            ),
            engagement_type=audit_request.audit_type,
            description=audit_request.scope_notes,
            lead_auditor=lead_auditor,
            start_date=data["start_date"],
            planned_end_date=data.get("planned_end_date"),
            financial_year_end=data.get("financial_year_end"),
        )

        audit_request.engagement = engagement
        audit_request.status = AuditRequest.Status.CONVERTED
        audit_request.save(
            update_fields=[
                "client",
                "engagement",
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(audit_request).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Counts by status for the intake dashboard."""
        queryset = self.filter_queryset(self.get_queryset())

        by_status = {}
        for value, label in AuditRequest.Status.choices:
            by_status[value] = {
                "label": label,
                "count": queryset.filter(status=value).count(),
            }

        return Response({
            "total": queryset.count(),
            "awaiting_review": queryset.filter(
                status__in=(
                    AuditRequest.Status.SUBMITTED,
                    AuditRequest.Status.UNDER_REVIEW,
                )
            ).count(),
            "by_status": by_status,
        })
