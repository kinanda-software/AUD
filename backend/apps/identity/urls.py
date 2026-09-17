from django.urls import path

from .views import (
    login_view,
    logout_view,
    current_user_view,
    csrf_token_view,
    users_view,
    user_detail_view,
    audit_team_users_view,
)

urlpatterns = [
    # Authentication
    path(
        "login/",
        login_view,
        name="login",
    ),

    path(
        "logout/",
        logout_view,
        name="logout",
    ),

    path(
        "me/",
        current_user_view,
        name="current-user",
    ),

    # User Management
    path(
        "users/",
        users_view,
        name="users",
    ),

    path(
        "users/<int:user_id>/",
        user_detail_view,
        name="user-detail",
    ),

    # Audit Team User Selection
    path(
        "audit-team-users/",
        audit_team_users_view,
        name="audit-team-users",
    ),

    # CSRF
    path(
        "csrf-token/",
        csrf_token_view,
        name="csrf-token",
    ),
]