from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    """
    Only authenticated users with the Administrator role
    can manage system users.
    """

    message = "Administrator access is required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "admin"
        )


class CanViewAuditTeamUsers(BasePermission):
    """
    Allows active authenticated audit users to view users
    who can be assigned to an audit team.
    """

    message = "You do not have permission to view audit team users."

    ALLOWED_ROLES = {
        "admin",
        "manager",
        "auditor",
    }

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role in self.ALLOWED_ROLES
        )