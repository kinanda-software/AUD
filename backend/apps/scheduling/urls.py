from rest_framework.routers import DefaultRouter

from .views import AuditScheduleViewSet


router = DefaultRouter()

router.register(
    "schedules",
    AuditScheduleViewSet,
    basename="schedule",
)

urlpatterns = router.urls
