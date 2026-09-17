from django.urls import path

from .views import QualityMonitoringWorkpaperView


urlpatterns = [
    path(
        "engagements/<int:engagement_id>/quality-monitoring/",
        QualityMonitoringWorkpaperView.as_view(),
        name="quality-monitoring-workpaper",
    ),
]