"""
URL configuration for config project.
"""

from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    # ========================================================
    # Django Admin
    # ========================================================
    path("admin/", admin.site.urls),

    # ========================================================
    # Audit API
    # ========================================================
    path(
        "api/",
        include("apps.audits.urls"),
    ),

    # ========================================================
    # Client API
    # ========================================================
    path(
        "api/",
        include("apps.clients.urls"),
    ),

    # ========================================================
    # Engagement API
    # ========================================================
    path(
        "api/",
        include("apps.engagements.urls"),
    ),

    # ========================================================
    # Audit Planning API
    # ========================================================
    path(
        "api/",
        include("apps.audit_planning.urls"),
    ),

    # ========================================================
    # Notifications API
    # ========================================================
    path(
        "api/",
        include("apps.notifications.urls"),
    ),

    # ========================================================
    # Authentication API
    # ========================================================
    path(
        "api/auth/",
        include("apps.identity.urls"),
    ),

    # ========================================================
    # Review Workflow API
    # ========================================================
    path(
        "api/",
        include("apps.review_workflow.urls"),
    ),

    # ========================================================
    # Completion Review API
    # ========================================================
    path(
        "api/",
        include("apps.completion_review.urls"),
    ),

    # ========================================================
    # Financials API
    # ========================================================
    path(
    "api/financials/",
    include("apps.financials.urls"),
),

    # ========================================================
    # AI ASSISTANT API
    # ========================================================
    path(
        "api/ai/",
        include("apps.ai_assistant.urls"),
    ),
]