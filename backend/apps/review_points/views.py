from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import ReviewPoint
from .serializers import (
    ReviewPointResponseSerializer,
    ReviewPointSerializer,
)


class ReviewPointViewSet(viewsets.ModelViewSet):
    queryset = (
        ReviewPoint.objects
        .select_related(
            "engagement",
            "raised_by",
            "assigned_to",
            "responded_by",
            "cleared_by",
        )
        .all()
    )

    serializer_class = ReviewPointSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        engagement_id = params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(engagement_id=engagement_id)

        status_param = params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        assigned_to = params.get("assigned_to")
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        section = params.get("section")
        if section:
            queryset = queryset.filter(section=section)

        return queryset

    def _notify_assignee(self, review_point):
        if review_point.assigned_to is None:
            return

        from apps.notifications.models import Notification

        Notification.objects.create(
            recipient=review_point.assigned_to,
            notification_type="review",
            title=(
                f"Review point assigned: {review_point.reference}"
            ),
            message=(
                f"'{review_point.title}' on "
                f"{review_point.engagement.engagement_code}"
                + (
                    f" (section: {review_point.section})"
                    if review_point.section else ""
                )
                + " requires your response."
            ),
        )

    def perform_create(self, serializer):
        review_point = serializer.save(
            raised_by=self.request.user
        )
        self._notify_assignee(review_point)

    def perform_update(self, serializer):
        previous_assignee = self.get_object().assigned_to_id
        review_point = serializer.save()
        if (
            review_point.assigned_to_id
            and review_point.assigned_to_id != previous_assignee
        ):
            self._notify_assignee(review_point)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        """Record the assignee's answer to a review point."""
        review_point = self.get_object()

        if review_point.status == ReviewPoint.Status.CLEARED:
            raise ValidationError(
                "This review point is cleared. Reopen it first."
            )

        serializer = ReviewPointResponseSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        review_point.response = serializer.validated_data[
            "response"
        ]
        review_point.responded_by = request.user
        review_point.responded_at = timezone.now()
        review_point.status = ReviewPoint.Status.RESPONDED
        review_point.save(
            update_fields=[
                "response",
                "responded_by",
                "responded_at",
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(review_point).data
        )

    @action(detail=True, methods=["post"])
    def clear(self, request, pk=None):
        """
        Clear a review point after a response has been
        recorded — the reviewer accepts the disposition.
        """
        review_point = self.get_object()

        if review_point.status == ReviewPoint.Status.CLEARED:
            raise ValidationError(
                "This review point is already cleared."
            )
        if not review_point.response.strip():
            raise ValidationError(
                "A response must be recorded before clearing."
            )

        review_point.status = ReviewPoint.Status.CLEARED
        review_point.cleared_by = request.user
        review_point.cleared_at = timezone.now()
        review_point.save(
            update_fields=[
                "status",
                "cleared_by",
                "cleared_at",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(review_point).data
        )

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        review_point = self.get_object()

        if review_point.status != ReviewPoint.Status.CLEARED:
            raise ValidationError(
                "Only a cleared review point can be reopened."
            )

        review_point.status = ReviewPoint.Status.OPEN
        review_point.cleared_by = None
        review_point.cleared_at = None
        review_point.save(
            update_fields=[
                "status",
                "cleared_by",
                "cleared_at",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(review_point).data
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Counts by status for dashboards."""
        queryset = self.filter_queryset(self.get_queryset())

        by_status = {}
        for value, label in ReviewPoint.Status.choices:
            by_status[value] = {
                "label": label,
                "count": queryset.filter(status=value).count(),
            }

        return Response({
            "total": queryset.count(),
            "open": queryset.exclude(
                status=ReviewPoint.Status.CLEARED
            ).count(),
            "by_status": by_status,
        })
