from rest_framework.routers import DefaultRouter

from .views import (
    AdjustmentViewSet,
    ChartOfAccountViewSet,
    GeneralLedgerViewSet,
    LeadScheduleViewSet,
    SupportingDetailViewSet,
    TrialBalanceLineViewSet,
    TrialBalanceViewSet,
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


router.register(
    r"adjustments",
    AdjustmentViewSet,
    basename="adjustment",
)


router.register(
    r"lead-schedules",
    LeadScheduleViewSet,
    basename="lead-schedule",
)


router.register(
    r"supporting-details",
    SupportingDetailViewSet,
    basename="supporting-detail",
)

router.register(
    r"general-ledger",
    GeneralLedgerViewSet,
    basename="general-ledger",
)


urlpatterns = router.urls