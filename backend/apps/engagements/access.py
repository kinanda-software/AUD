from django.db.models import Q
from rest_framework.exceptions import PermissionDenied

from .models import Engagement


def accessible_engagements(user):
    queryset = Engagement.objects.all()
    if not user.is_authenticated or not user.is_active:
        return queryset.none()
    if user.is_superuser or user.role in ("admin", "partner", "manager"):
        return queryset
    if user.role in ("auditor", "staff"):
        return queryset.filter(
            Q(lead_auditor=user) | Q(audit_team_members__user=user)
        ).distinct()
    return queryset.none()


def require_engagement_access(user, engagement_id):
    if not accessible_engagements(user).filter(pk=engagement_id).exists():
        raise PermissionDenied("You do not have access to this engagement.")


class EngagementAccessMixin:
    engagement_lookup = "engagement_id"

    def get_queryset(self):
        return super().get_queryset().filter(**{
            f"{self.engagement_lookup}__in": accessible_engagements(self.request.user),
        })
