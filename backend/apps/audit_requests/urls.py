from rest_framework.routers import DefaultRouter

from .views import AuditRequestViewSet


router = DefaultRouter()

router.register(
    "audit-requests",
    AuditRequestViewSet,
    basename="audit-request",
)

urlpatterns = router.urls
