from django.urls import path

from .views import QualityMonitoringWorkpaperView


urlpatterns = [
    path(
        "quality-monitorings/<int:engagement_id>/",
        QualityMonitoringWorkpaperView.as_view(),
        name="quality-monitoring-workpaper",
    ),

    # Alternative readable URL
    path(
        "engagements/<int:engagement_id>/quality-monitoring/",
        QualityMonitoringWorkpaperView.as_view(),
        name="engagement-quality-monitoring-workpaper",
    ),
]