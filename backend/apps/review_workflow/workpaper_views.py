from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.engagements.models import Engagement
from .models import EngagementWorkpaper, SummaryReview
from .workpaper_serializers import SCHEMAS, SUMMARY_FIELDS, WorkpaperInputSerializer, validate_shape


class EngagementWorkpaperView(APIView):
    permission_classes = [IsAuthenticated]

    def engagement(self, request, engagement_id, section):
        if section not in SCHEMAS:
            from rest_framework.exceptions import NotFound
            raise NotFound("Unknown workpaper section.")
        queryset = Engagement.objects.all()
        if not request.user.is_staff and not request.user.is_superuser:
            queryset = queryset.filter(
                Q(lead_auditor=request.user) | Q(audit_team_members__user=request.user)
                | Q(review_assignments__reviewer=request.user)
            ).distinct()
        return get_object_or_404(queryset, pk=engagement_id)

    def representation(self, record, engagement_id, section):
        if record is None:
            return {"engagement": engagement_id, "section": section, "id": None,
                    "data": None, "completion_status": "Not Started", "completed_at": None}
        data = ({key: getattr(record, field) for key, field in SUMMARY_FIELDS.items()}
                if section == "summary-review" else record.data)
        if section != "summary-review":
            validate_shape(data, SCHEMAS[section])
        else:
            for key, value in data.items():
                # Legacy SummaryReview records used empty objects for untouched sections.
                if value != {}:
                    validate_shape(value, SCHEMAS[section][key], key)
        return {"engagement": engagement_id, "section": section, "id": record.pk, "data": data,
                "completion_status": record.completion_status, "completed_at": record.completed_at}

    def get(self, request, engagement_id, section):
        engagement = self.engagement(request, engagement_id, section)
        model = SummaryReview if section == "summary-review" else EngagementWorkpaper
        filters = {"engagement": engagement}
        if section != "summary-review":
            filters["section"] = section
        return Response(self.representation(model.objects.filter(**filters).first(), engagement.pk, section))

    @transaction.atomic
    def put(self, request, engagement_id, section):
        engagement = self.engagement(request, engagement_id, section)
        # Serialize saves for one engagement, including first-time creation.
        Engagement.objects.select_for_update().get(pk=engagement.pk)
        serializer = WorkpaperInputSerializer(data=request.data, context={"section": section, "engagement": engagement})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data["data"]
        complete = serializer.validated_data["complete"]
        defaults = {"completion_status": "Completed" if complete else "In Progress",
                    "completed_at": timezone.now() if complete else None}
        if section == "summary-review":
            defaults.update({field: data[key] for key, field in SUMMARY_FIELDS.items()})
            record, _ = SummaryReview.objects.update_or_create(engagement=engagement, defaults=defaults)
        else:
            defaults["data"] = data
            record, _ = EngagementWorkpaper.objects.update_or_create(
                engagement=engagement, section=section, defaults=defaults,
            )
        return Response(self.representation(record, engagement.pk, section))
