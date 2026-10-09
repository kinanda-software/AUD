from rest_framework.routers import DefaultRouter
from .accounting_views import AccountingControlViewSet
from .asset_views import FixedAssetViewSet, FixedAssetEventViewSet
from .inventory_views import InventoryItemViewSet, InventoryMovementViewSet
from .intelligence_views import FinancialIntelligenceViewSet
from .evidence_views import EvidenceViewSet, EvidenceLinkViewSet
from .finding_review_views import FindingReviewViewSet
from .pbc_views import PBCRequestViewSet, PBCEventViewSet
from .statement_views import StatementLineViewSet, StatementMappingViewSet, StatementVersionViewSet
from .subledger_views import ContactViewSet, TaxCodeViewSet, DocumentViewSet, PaymentViewSet, SubledgerReportViewSet
from .data_import_views import FinancialAccountMappingViewSet, FinancialDataImportViewSet

from .views import (
    AdjustmentViewSet,
    ChartOfAccountViewSet,
    GeneralLedgerViewSet,
    JournalEntryViewSet,
    JournalLineViewSet,
    LeadScheduleViewSet,
    SupportingDetailViewSet,
    TrialBalanceLineViewSet,
    TrialBalanceViewSet,
)
from .workflow_views import (
    BankStatementLineViewSet,
    BankStatementViewSet,
    FinancialDimensionViewSet,
    FinancialAuditEventViewSet,
    FinancialBudgetLineViewSet,
    FinancialBudgetViewSet,
)


router = DefaultRouter()
router.register(r"statement-lines", StatementLineViewSet, basename="financial-statement-line")
router.register(r"statement-mappings", StatementMappingViewSet, basename="financial-statement-mapping")
router.register(r"statement-versions", StatementVersionViewSet, basename="financial-statement-version")
router.register(r"pbc-requests", PBCRequestViewSet, basename="financial-pbc-request")
router.register(r"pbc-events", PBCEventViewSet, basename="financial-pbc-event")
router.register(r"finding-reviews", FindingReviewViewSet, basename="financial-finding-review")
router.register(r"evidence", EvidenceViewSet, basename="financial-evidence")
router.register(r"evidence-links", EvidenceLinkViewSet, basename="financial-evidence-link")
router.register(r"intelligence-runs", FinancialIntelligenceViewSet, basename="financial-intelligence")
router.register(r"data-imports", FinancialDataImportViewSet, basename="financial-data-import")
router.register(r"account-mappings", FinancialAccountMappingViewSet, basename="financial-account-mapping")
router.register(r"inventory-items", InventoryItemViewSet, basename="inventory-item")
router.register(r"inventory-movements", InventoryMovementViewSet, basename="inventory-movement")
router.register(r"fixed-assets", FixedAssetViewSet, basename="fixed-asset")
router.register(r"fixed-asset-events", FixedAssetEventViewSet, basename="fixed-asset-event")
router.register(r"contacts", ContactViewSet, basename="financial-contact")
router.register(r"tax-codes", TaxCodeViewSet, basename="financial-tax-code")
router.register(r"documents", DocumentViewSet, basename="financial-document")
router.register(r"payments", PaymentViewSet, basename="financial-payment")
router.register(r"subledger-reports", SubledgerReportViewSet, basename="subledger-report")
router.register(
    r"accounting-controls",
    AccountingControlViewSet,
    basename="accounting-control",
)


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

router.register(
    r"journal-entries",
    JournalEntryViewSet,
    basename="journal-entry",
)

router.register(
    r"journal-lines",
    JournalLineViewSet,
    basename="journal-line",
)

router.register(
    r"budgets",
    FinancialBudgetViewSet,
    basename="financial-budget",
)

router.register(
    r"dimensions",
    FinancialDimensionViewSet,
    basename="financial-dimension",
)

router.register(
    r"budget-lines",
    FinancialBudgetLineViewSet,
    basename="financial-budget-line",
)

router.register(
    r"bank-statements",
    BankStatementViewSet,
    basename="bank-statement",
)

router.register(
    r"bank-statement-lines",
    BankStatementLineViewSet,
    basename="bank-statement-line",
)

router.register(
    r"audit-events",
    FinancialAuditEventViewSet,
    basename="financial-audit-event",
)


urlpatterns = router.urls