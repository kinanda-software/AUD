from django.urls import path

from .views import (
    ConsolidatedReportView,
    EngagementSummaryReportView,
    ManagementLetterView,
)


urlpatterns = [
    path(
        "reporting/engagements/<int:engagement_id>/summary.pdf",
        EngagementSummaryReportView.as_view(),
        name="engagement-summary-report",
    ),
    path(
        "reporting/engagements/<int:engagement_id>/management-letter.pdf",
        ManagementLetterView.as_view(),
        name="management-letter-report",
    ),
    path(
        "reporting/consolidated.pdf",
        ConsolidatedReportView.as_view(),
        name="consolidated-report",
    ),
]
