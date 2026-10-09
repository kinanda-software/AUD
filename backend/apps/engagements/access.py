from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, BasePermission

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
    if user.role == "reviewer":
        # Peer reviewers see only the engagements they are
        # assigned to review — and only in read-only mode
        # (see ReadOnlyReviewerPermission).
        return queryset.filter(
            review_assignments__reviewer=user
        ).distinct()
    return queryset.none()


def require_engagement_access(user, engagement_id):
    if not accessible_engagements(user).filter(pk=engagement_id).exists():
        raise PermissionDenied("You do not have access to this engagement.")


class ReadOnlyReviewerPermission(BasePermission):
    """
    Peer reviewers (role = 'reviewer') may read engagement
    data but cannot create, modify, or delete records.
    All other roles are unaffected.
    """

    message = "Peer reviewers have read-only access."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "role", None) == "reviewer":
            return request.method in SAFE_METHODS
        return True


class EngagementAccessMixin:
    engagement_lookup = "engagement_id"

    def get_queryset(self):
        return super().get_queryset().filter(**{
            f"{self.engagement_lookup}__in": accessible_engagements(self.request.user),
        })
