from rest_framework.routers import DefaultRouter

from .views import NonConformanceViewSet


router = DefaultRouter()

router.register(
    "nonconformances",
    NonConformanceViewSet,
    basename="nonconformance",
)

urlpatterns = router.urls
