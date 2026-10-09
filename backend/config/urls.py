"""
URL configuration for config project.
"""

from django.conf import settings
from django.conf.urls.static import static
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
    # Audit Scheduling API
    # ========================================================
    path(
        "api/",
        include("apps.scheduling.urls"),
    ),

    # ========================================================
    # Evidence Management API
    # ========================================================
    path(
        "api/",
        include("apps.evidence.urls"),
    ),

    # ========================================================
    # Non-Conformance (CAPA) API
    # ========================================================
    path(
        "api/",
        include("apps.nonconformance.urls"),
    ),

    # ========================================================
    # Checklist Library API
    # ========================================================
    path(
        "api/",
        include("apps.checklists.urls"),
    ),

    # ========================================================
    # Reporting (PDF export) API
    # ========================================================
    path(
        "api/",
        include("apps.reporting.urls"),
    ),

    # ========================================================
    # Review Points (clearance notes) API
    # ========================================================
    path(
        "api/",
        include("apps.review_points.urls"),
    ),

    # ========================================================
    # Time Tracking API
    # ========================================================
    path(
        "api/",
        include("apps.timetracking.urls"),
    ),

    # ========================================================
    # Audit Request Intake API
    # ========================================================
    path(
        "api/",
        include("apps.audit_requests.urls"),
    ),

    # ========================================================
    # Client Portal (self-registration + OTP) API
    # ========================================================
    path(
        "api/",
        include("apps.client_portal.urls"),
    ),

    # ========================================================
    # Continuous Monitoring API
    # ========================================================
    path(
        "api/",
        include("apps.monitoring.urls"),
    ),

    # ========================================================
    # Audit Analytics API
    # ========================================================
    path(
        "api/",
        include("apps.analysis.urls"),
    ),

    # ========================================================
    # Fraud Reporting (public whistleblowing) API
    # ========================================================
    path(
        "api/",
        include("apps.fraud_reports.urls"),
    ),

]


# ========================================================
# Media files (development only)
# ========================================================
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )