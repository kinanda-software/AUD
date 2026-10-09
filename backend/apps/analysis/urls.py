from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AgingAnalysisView,
    BenfordAnalysisView,
    SampleSelectionViewSet,
    StratificationView,
)


router = DefaultRouter()

router.register(
    "analysis-samples",
    SampleSelectionViewSet,
    basename="analysis-sample",
)

urlpatterns = [
    path(
        "analysis/benford/",
        BenfordAnalysisView.as_view(),
        name="analysis-benford",
    ),
    path(
        "analysis/stratification/",
        StratificationView.as_view(),
        name="analysis-stratification",
    ),
    path(
        "analysis/aging/",
        AgingAnalysisView.as_view(),
        name="analysis-aging",
    ),
] + router.urls
