from decimal import Decimal

from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit_planning.models import AuditTeamMember

from .models import TimeEntry
from .serializers import TimeEntrySerializer


class TimeEntryViewSet(viewsets.ModelViewSet):
    queryset = (
        TimeEntry.objects
        .select_related("engagement", "user")
        .all()
    )

    serializer_class = TimeEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        engagement_id = params.get("engagement")
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        user_id = params.get("user")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        phase = params.get("phase")
        if phase:
            queryset = queryset.filter(phase=phase)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        Budget-vs-actual hours per engagement (or for one
        engagement when ?engagement=<id> is supplied).
        """
        engagement_id = request.query_params.get("engagement")

        entries = TimeEntry.objects.all()
        members = AuditTeamMember.objects.select_related(
            "engagement", "user"
        ).all()
        if engagement_id:
            entries = entries.filter(engagement_id=engagement_id)
            members = members.filter(engagement_id=engagement_id)

        actual_rows = (
            entries
            .values("engagement_id", "user__username", "phase")
            .annotate(total_hours=Sum("hours"))
        )

        per_engagement = {}

        def bucket(key, engagement_pk):
            if engagement_pk not in per_engagement:
                per_engagement[engagement_pk] = {
                    "engagement": engagement_pk,
                    "budgeted_hours": Decimal("0"),
                    "actual_hours": Decimal("0"),
                    "by_phase": {},
                    "by_user": {},
                }
            return per_engagement[engagement_pk]

        for member in members:
            data = bucket("budget", member.engagement_id)
            data["budgeted_hours"] += member.budgeted_hours

        for row in actual_rows:
            data = bucket("actual", row["engagement_id"])
            hours = row["total_hours"] or Decimal("0")
            data["actual_hours"] += hours
            data["by_phase"][row["phase"]] = (
                data["by_phase"].get(row["phase"], Decimal("0"))
                + hours
            )
            username = row["user__username"] or "unknown"
            data["by_user"][username] = (
                data["by_user"].get(username, Decimal("0"))
                + hours
            )

        results = []
        for data in per_engagement.values():
            variance = data["budgeted_hours"] - data["actual_hours"]
            results.append({
                "engagement": data["engagement"],
                "budgeted_hours": float(data["budgeted_hours"]),
                "actual_hours": float(data["actual_hours"]),
                "variance_hours": float(variance),
                "utilization_percent": (
                    round(
                        float(
                            data["actual_hours"]
                            / data["budgeted_hours"]
                            * 100
                        ),
                        1,
                    )
                    if data["budgeted_hours"] > 0 else None
                ),
                "by_phase": {
                    key: float(value)
                    for key, value in data["by_phase"].items()
                },
                "by_user": {
                    key: float(value)
                    for key, value in data["by_user"].items()
                },
            })

        results.sort(key=lambda item: item["engagement"])
        return Response(results)
