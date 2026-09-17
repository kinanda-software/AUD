from rest_framework.routers import DefaultRouter

from .views import (
    ChartOfAccountViewSet,
    TrialBalanceViewSet,
    TrialBalanceLineViewSet,
)

router = DefaultRouter()

router.register(
    r"chart-of-accounts",
    ChartOfAccountViewSet,
    basename="chart-of-account",
)

router.register(
    r"trial-balances",
    TrialBalanceViewSet,
    basename="trial-balance",
)

router.register(
    r"trial-balance-lines",
    TrialBalanceLineViewSet,
    basename="trial-balance-line",
)

urlpatterns = router.urls
