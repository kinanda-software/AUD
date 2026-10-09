from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import AuditSchedule
from .serializers import AuditScheduleSerializer


class AuditScheduleViewSet(viewsets.ModelViewSet):
    queryset = (
        AuditSchedule.objects
        .select_related("engagement", "engagement__client", "created_by")
        .prefetch_related("assigned_auditors")
        .all()
    )

    serializer_class = AuditScheduleSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(
                status=status_param
            )

        return queryset

    def _notify_auditors(self, schedule, recipients):
        from apps.notifications.models import Notification

        for user in recipients:
            Notification.objects.create(
                recipient=user,
                notification_type="deadline",
                title=f"Audit scheduled: {schedule.title}",
                message=(
                    f"You are assigned to '{schedule.title}' "
                    f"({schedule.get_audit_type_display()}) for "
                    f"{schedule.engagement.engagement_code} on "
                    f"{schedule.scheduled_start:%d %b %Y %H:%M}. "
                    f"Location: {schedule.location or 'To be confirmed'}."
                ),
            )

    def perform_create(self, serializer):
        schedule = serializer.save(
            created_by=self.request.user
        )
        self._notify_auditors(
            schedule,
            schedule.assigned_auditors.all(),
        )

    def perform_update(self, serializer):
        previous_ids = set(
            self.get_object()
            .assigned_auditors.values_list("pk", flat=True)
        )
        schedule = serializer.save()
        new_assignees = (
            schedule.assigned_auditors.exclude(
                pk__in=previous_ids
            )
        )
        self._notify_auditors(schedule, new_assignees)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """
        Scheduled and in-progress audits starting from now,
        oldest first. Supports ?days=<n> to limit the window.
        """
        queryset = self.get_queryset().filter(
            scheduled_end__gte=timezone.now(),
            status__in=(
                AuditSchedule.Status.SCHEDULED,
                AuditSchedule.Status.IN_PROGRESS,
            ),
        )

        days = request.query_params.get("days")
        if days and days.isdigit():
            queryset = queryset.filter(
                scheduled_start__lte=(
                    timezone.now()
                    + timezone.timedelta(days=int(days))
                )
            )

        serializer = self.get_serializer(
            queryset[:50],
            many=True,
        )
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="schedule-next",
    )
    def schedule_next(self, request, pk=None):
        """
        Create the next occurrence of a recurring audit,
        shifting the window forward by recurrence_months.
        """
        source = self.get_object()

        if not source.recurrence_months:
            raise ValidationError(
                "Set a recurrence interval before scheduling "
                "the next occurrence."
            )

        next_start = source.next_occurrence
        duration = source.scheduled_end - source.scheduled_start

        occurrence = AuditSchedule.objects.create(
            engagement=source.engagement,
            title=source.title,
            audit_type=source.audit_type,
            scheduled_start=next_start,
            scheduled_end=next_start + duration,
            location=source.location,
            auditee_name=source.auditee_name,
            auditee_email=source.auditee_email,
            reminder_days=source.reminder_days,
            recurrence_months=source.recurrence_months,
            notes=source.notes,
            created_by=request.user,
        )
        occurrence.assigned_auditors.set(
            source.assigned_auditors.all()
        )
        self._notify_auditors(
            occurrence,
            occurrence.assigned_auditors.all(),
        )

        serializer = self.get_serializer(occurrence)
        return Response(serializer.data, status=201)
