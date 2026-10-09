from rest_framework.routers import DefaultRouter

from .views import EvidenceFileViewSet


router = DefaultRouter()

router.register(
    "evidence-files",
    EvidenceFileViewSet,
    basename="evidence-file",
)

urlpatterns = router.urls
