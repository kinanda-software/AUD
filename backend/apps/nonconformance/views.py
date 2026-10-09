from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import NonConformance
from .serializers import NonConformanceSerializer


class NonConformanceViewSet(viewsets.ModelViewSet):
    queryset = (
        NonConformance.objects
        .select_related(
            "engagement",
            "assigned_to",
            "raised_by",
            "verified_by",
        )
        .all()
    )

    serializer_class = NonConformanceSerializer

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

    def _notify_assignee(self, nonconformance):
        if nonconformance.assigned_to is None:
            return

        from apps.notifications.models import Notification

        Notification.objects.create(
            recipient=nonconformance.assigned_to,
            notification_type="audit",
            title=(
                f"Non-conformance assigned: "
                f"{nonconformance.reference}"
            ),
            message=(
                f"'{nonconformance.title}' "
                f"({nonconformance.get_severity_display()}) on "
                f"{nonconformance.engagement.engagement_code} "
                f"has been assigned to you."
                + (
                    f" Due {nonconformance.due_date:%d %b %Y}."
                    if nonconformance.due_date else ""
                )
            ),
        )

    def perform_create(self, serializer):
        nonconformance = serializer.save(
            raised_by=self.request.user
        )
        self._notify_assignee(nonconformance)

    def perform_update(self, serializer):
        previous_assignee = self.get_object().assigned_to_id
        nonconformance = serializer.save()
        if (
            nonconformance.assigned_to_id
            and nonconformance.assigned_to_id
            != previous_assignee
        ):
            self._notify_assignee(nonconformance)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """
        Verify and close a non-conformance. Requires a
        documented root cause and corrective action.
        """
        nonconformance = self.get_object()

        if nonconformance.status == NonConformance.Status.CLOSED:
            raise ValidationError(
                "This non-conformance is already closed."
            )

        missing = []
        if not nonconformance.root_cause.strip():
            missing.append("root cause")
        if not nonconformance.corrective_action.strip():
            missing.append("corrective action")
        if missing:
            raise ValidationError(
                "Document the "
                + " and ".join(missing)
                + " before closing this non-conformance."
            )

        nonconformance.status = NonConformance.Status.CLOSED
        nonconformance.verified_by = request.user
        nonconformance.closed_at = timezone.now()
        nonconformance.save(
            update_fields=[
                "status",
                "verified_by",
                "closed_at",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(nonconformance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        nonconformance = self.get_object()

        if nonconformance.status != NonConformance.Status.CLOSED:
            raise ValidationError(
                "Only a closed non-conformance can be reopened."
            )

        nonconformance.status = NonConformance.Status.OPEN
        nonconformance.verified_by = None
        nonconformance.closed_at = None
        nonconformance.save(
            update_fields=[
                "status",
                "verified_by",
                "closed_at",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(nonconformance)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Counts by status and severity for dashboards."""
        queryset = self.filter_queryset(self.get_queryset())

        by_status = {}
        for value, label in NonConformance.Status.choices:
            by_status[value] = {
                "label": label,
                "count": queryset.filter(status=value).count(),
            }

        by_severity = {}
        for value, label in NonConformance.Severity.choices:
            by_severity[value] = {
                "label": label,
                "count": queryset.filter(severity=value).count(),
            }

        return Response({
            "total": queryset.count(),
            "by_status": by_status,
            "by_severity": by_severity,
        })

    @action(detail=False, methods=["get"])
    def patterns(self, request):
        """
        Cross-engagement recurrence by finding category.

        A category recorded on two or more engagements is
        flagged systemic — one pattern, not separate closures.
        Observations are excluded from non-conformity counts.
        """
        queryset = self.filter_queryset(
            self.get_queryset()
        ).exclude(
            finding_type=NonConformance.FindingType.OBSERVATION
        )

        rows = (
            queryset
            .values("category")
            .annotate(
                total=Count("id"),
                engagement_count=Count("engagement", distinct=True),
                open_count=Count(
                    "id",
                    filter=~Q(
                        status=NonConformance.Status.CLOSED
                    ),
                ),
            )
            .order_by("-total")
        )

        labels = dict(NonConformance.Category.choices)
        results = [
            {
                "category": row["category"],
                "label": labels.get(row["category"], row["category"]),
                "total": row["total"],
                "open": row["open_count"],
                "engagement_count": row["engagement_count"],
                "systemic": row["engagement_count"] >= 2,
            }
            for row in rows
        ]

        return Response({
            "systemic_count": sum(
                1 for row in results if row["systemic"]
            ),
            "categories": results,
        })

    @action(
        detail=False,
        methods=["get"],
        url_path="source-comparison",
    )
    def source_comparison(self, request):
        """
        Internally-found vs externally-found findings per
        engagement — the direct measure of whether the
        internal audit programme surfaces issues first.
        """
        queryset = self.filter_queryset(self.get_queryset())

        rows = (
            queryset
            .values(
                "engagement_id",
                "engagement__engagement_code",
            )
            .annotate(
                internal=Count(
                    "id",
                    filter=Q(
                        source__in=(
                            NonConformance.Source.AUDIT_FINDING,
                            NonConformance.Source.INTERNAL_REVIEW,
                        )
                    ),
                ),
                external=Count(
                    "id",
                    filter=Q(
                        source__in=(
                            NonConformance.Source.EXTERNAL_AUDIT,
                            NonConformance.Source.CLIENT_COMPLAINT,
                        )
                    ),
                ),
                other=Count(
                    "id",
                    filter=Q(source=NonConformance.Source.OTHER),
                ),
            )
            .order_by("engagement__engagement_code")
        )

        results = [
            {
                "engagement": row["engagement_id"],
                "engagement_code": row["engagement__engagement_code"],
                "internal": row["internal"],
                "external": row["external"],
                "other": row["other"],
            }
            for row in rows
        ]

        return Response({
            "totals": {
                "internal": sum(r["internal"] for r in results),
                "external": sum(r["external"] for r in results),
                "other": sum(r["other"] for r in results),
            },
            "engagements": results,
        })
