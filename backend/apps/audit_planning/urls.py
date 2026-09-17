from rest_framework.routers import DefaultRouter

from .views import (
    AuditScopeViewSet,
    AuditTeamMemberViewSet,
    MaterialityAssessmentViewSet,
    PlanningAssessmentViewSet,
    PlanningMatterViewSet,
    PlanningProcedureViewSet,
    TransactionCycleAssessmentViewSet,
    ProcessFlowWalkthroughViewSet,
    RiskPointViewSet,
    ControlViewSet,
    ControlTestExecutionViewSet,
    InterimYearEndAssessmentViewSet,
    FraudJournalEntryAssessmentViewSet,
    SubstantiveProcedureAssessmentViewSet,
    GeneralAuditProcedureViewSet,
    ReassessedCombinedRiskViewSet,
    MisstatementAssessmentViewSet,
    MisstatementEvaluationViewSet,
    QualityMonitoringViewSet,
    QualityFindingViewSet,
    RemediationActionViewSet,
)

router = DefaultRouter()


# ============================================================
# PHASE 1 — AUDIT PLANNING
# ============================================================

router.register(
    "planning-assessments",
    PlanningAssessmentViewSet,
    basename="planning-assessment",
)

router.register(
    "materiality-assessments",
    MaterialityAssessmentViewSet,
    basename="materiality-assessment",
)

router.register(
    "audit-scopes",
    AuditScopeViewSet,
    basename="audit-scope",
)

router.register(
    "audit-team-members",
    AuditTeamMemberViewSet,
    basename="audit-team-member",
)

router.register(
    "planning-matters",
    PlanningMatterViewSet,
    basename="planning-matter",
)

router.register(
    "planning-procedures",
    PlanningProcedureViewSet,
    basename="planning-procedure",
)


# ============================================================
# PHASE 2.1 — TRANSACTION CYCLES
# ============================================================

router.register(
    "transaction-cycle-assessments",
    TransactionCycleAssessmentViewSet,
    basename="transaction-cycle-assessment",
)


# ============================================================
# PHASE 2.2 — PROCESS FLOW & WALKTHROUGHS
# ============================================================

router.register(
    "process-flow-walkthroughs",
    ProcessFlowWalkthroughViewSet,
    basename="process-flow-walkthrough",
)


# ============================================================
# PHASE 2.3 — RISK POINTS
# ============================================================

router.register(
    "risk-points",
    RiskPointViewSet,
    basename="risk-point",
)


# ============================================================
# PHASE 2.4 — CONTROLS
# ============================================================

router.register(
    "controls",
    ControlViewSet,
    basename="control",
)


# ============================================================
# PHASE 3.1 — EXECUTE TESTS OF CONTROLS
# ============================================================

router.register(
    "control-test-executions",
    ControlTestExecutionViewSet,
    basename="control-test-execution",
)


# ============================================================
# PHASE 3.2 — INTERIM-TO-YEAR-END
# ============================================================

router.register(
    "interim-year-end-assessments",
    InterimYearEndAssessmentViewSet,
    basename="interim-year-end-assessment",
)


# ============================================================
# PHASE 3.3 — FRAUD / JOURNAL ENTRY PROCEDURES
# ============================================================

router.register(
    "fraud-journal-entry-assessments",
    FraudJournalEntryAssessmentViewSet,
    basename="fraud-journal-entry-assessment",
)


# ============================================================
# PHASE 3.4 — SUBSTANTIVE PROCEDURES
# ============================================================

router.register(
    "substantive-procedure-assessments",
    SubstantiveProcedureAssessmentViewSet,
    basename="substantive-procedure-assessment",
)


# ============================================================
# PHASE 3.5 — GENERAL AUDIT PROCEDURES
# ============================================================

router.register(
    "general-audit-procedures",
    GeneralAuditProcedureViewSet,
    basename="general-audit-procedure",
)


# ============================================================
# PHASE 3.6 — REASSESS COMBINED RISK
# ============================================================

router.register(
    "reassessed-combined-risks",
    ReassessedCombinedRiskViewSet,
    basename="reassessed-combined-risk",
)


# ============================================================
# PHASE 4.1 — EVALUATE MISSTATEMENTS
# ============================================================

router.register(
    "misstatement-assessments",
    MisstatementAssessmentViewSet,
    basename="misstatement-assessment",
)

router.register(
    "misstatement-evaluations",
    MisstatementEvaluationViewSet,
    basename="misstatement-evaluation",
)


# ============================================================
# PHASE 4.7 — FIRM-LEVEL QUALITY MONITORING
# ============================================================

router.register(
    "quality-monitorings",
    QualityMonitoringViewSet,
    basename="quality-monitoring",
)

router.register(
    "quality-findings",
    QualityFindingViewSet,
    basename="quality-finding",
)

router.register(
    "remediation-actions",
    RemediationActionViewSet,
    basename="remediation-action",
)


# ============================================================
# URL PATTERNS
# ============================================================

urlpatterns = router.urls