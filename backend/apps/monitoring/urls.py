from rest_framework.routers import DefaultRouter

from .views import MonitoringAlertViewSet, MonitoringRuleViewSet


router = DefaultRouter()

router.register(
    "monitoring-rules",
    MonitoringRuleViewSet,
    basename="monitoring-rule",
)

router.register(
    "monitoring-alerts",
    MonitoringAlertViewSet,
    basename="monitoring-alert",
)

urlpatterns = router.urls
