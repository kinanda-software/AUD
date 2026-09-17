from rest_framework import viewsets

from .models import Engagement
from .serializers import EngagementSerializer


class EngagementViewSet(viewsets.ModelViewSet):
    queryset = (
        Engagement.objects
        .select_related("client", "lead_auditor")
        .all()
        .order_by("-created_at")
    )

    serializer_class = EngagementSerializer
