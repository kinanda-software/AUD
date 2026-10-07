from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import ReviewAssignmentViewSet
from .workpaper_views import EngagementWorkpaperView


router = DefaultRouter()

router.register(
    r"review-assignments",
    ReviewAssignmentViewSet,
    basename="review-assignment",
)

urlpatterns = router.urls + [
    path("engagements/<int:engagement_id>/workpapers/<slug:section>/",
         EngagementWorkpaperView.as_view(), name="engagement-workpaper"),
]