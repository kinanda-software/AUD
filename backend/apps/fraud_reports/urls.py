from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import FraudReportSubmitView, FraudReportViewSet


router = DefaultRouter()

router.register(
    "fraud-reports",
    FraudReportViewSet,
    basename="fraud-report",
)

urlpatterns = [
    path(
        "fraud-reports/submit/",
        FraudReportSubmitView.as_view(),
        name="fraud-report-submit",
    ),
] + router.urls
