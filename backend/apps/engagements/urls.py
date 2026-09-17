from rest_framework.routers import DefaultRouter

from .views import EngagementViewSet


router = DefaultRouter()

router.register(
    "engagements",
    EngagementViewSet,
    basename="engagement",
)

urlpatterns = router.urls