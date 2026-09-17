
from rest_framework import viewsets

from .models import (
    AuditScope,
    AuditTeamMember,
    MaterialityAssessment,
    PlanningAssessment,
    PlanningMatter,
    PlanningProcedure,
    TransactionCycleAssessment,
    ProcessFlowWalkthrough,
    RiskPoint,
    Control,
    ControlTestExecution,
    InterimYearEndAssessment,
    FraudJournalEntryAssessment,
    SubstantiveProcedureAssessment,
    GeneralAuditProcedure,
    ReassessedCombinedRisk,
    MisstatementAssessment,
    MisstatementEvaluation,
    QualityMonitoring,
    QualityFinding,
    RemediationAction
)

from .serializers import (
    AuditScopeSerializer,
    AuditTeamMemberSerializer,
    MaterialityAssessmentSerializer,
    PlanningAssessmentSerializer,
    PlanningMatterSerializer,
    PlanningProcedureSerializer,
    TransactionCycleAssessmentSerializer,
    ProcessFlowWalkthroughSerializer,
    RiskPointSerializer,
    ControlSerializer,
    ControlTestExecutionSerializer,
    InterimYearEndAssessmentSerializer,
    FraudJournalEntryAssessmentSerializer,
    SubstantiveProcedureAssessmentSerializer,
    GeneralAuditProcedureSerializer,
    ReassessedCombinedRiskSerializer,
    MisstatementAssessmentSerializer,
    MisstatementEvaluationSerializer,
    QualityMonitoringSerializer,
    QualityFindingSerializer,
    RemediationActionSerializer,
)


# ============================================================
# PLANNING ASSESSMENT
# ============================================================

class PlanningAssessmentViewSet(viewsets.ModelViewSet):
    queryset = PlanningAssessment.objects.select_related(
        "engagement"
    ).all()

    serializer_class = PlanningAssessmentSerializer


# ============================================================
# MATERIALITY ASSESSMENT
# ============================================================

class MaterialityAssessmentViewSet(viewsets.ModelViewSet):
    queryset = MaterialityAssessment.objects.select_related(
        "engagement"
    ).all()

    serializer_class = MaterialityAssessmentSerializer


# ============================================================
# AUDIT SCOPE
# ============================================================

class AuditScopeViewSet(viewsets.ModelViewSet):
    queryset = AuditScope.objects.select_related(
        "engagement"
    ).all()

    serializer_class = AuditScopeSerializer


# ============================================================
# AUDIT TEAM MEMBER
# ============================================================

class AuditTeamMemberViewSet(viewsets.ModelViewSet):
    queryset = AuditTeamMember.objects.select_related(
        "engagement",
        "user",
    ).all()

    serializer_class = AuditTeamMemberSerializer


# ============================================================
# PLANNING MATTER
# ============================================================

class PlanningMatterViewSet(viewsets.ModelViewSet):
    queryset = PlanningMatter.objects.select_related(
        "engagement"
    ).all()

    serializer_class = PlanningMatterSerializer


# ============================================================
# PLANNING PROCEDURE
# ============================================================

class PlanningProcedureViewSet(viewsets.ModelViewSet):
    queryset = PlanningProcedure.objects.select_related(
        "engagement"
    ).all()

    serializer_class = PlanningProcedureSerializer


# ============================================================
# PHASE 2.1 — TRANSACTION CYCLE ASSESSMENT
# ============================================================

class TransactionCycleAssessmentViewSet(
    viewsets.ModelViewSet
):
    queryset = TransactionCycleAssessment.objects.select_related(
        "engagement"
    ).all()

    serializer_class = TransactionCycleAssessmentSerializer


# ============================================================
# PHASE 2.2 — PROCESS FLOW & WALKTHROUGHS
# ============================================================

class ProcessFlowWalkthroughViewSet(
    viewsets.ModelViewSet
):
    queryset = ProcessFlowWalkthrough.objects.select_related(
        "engagement"
    ).all()

    serializer_class = ProcessFlowWalkthroughSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 2.3 — RISK POINTS
# ============================================================

class RiskPointViewSet(viewsets.ModelViewSet):
    queryset = RiskPoint.objects.select_related(
        "engagement"
    ).all()

    serializer_class = RiskPointSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 2.4 — CONTROLS
# ============================================================

class ControlViewSet(viewsets.ModelViewSet):
    queryset = Control.objects.select_related(
        "engagement"
    ).all()

    serializer_class = ControlSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.1 — EXECUTE TESTS OF CONTROLS
# ============================================================

class ControlTestExecutionViewSet(
    viewsets.ModelViewSet
):
    queryset = ControlTestExecution.objects.select_related(
        "engagement"
    ).all()

    serializer_class = ControlTestExecutionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.2 — INTERIM-TO-YEAR-END
# ============================================================

class InterimYearEndAssessmentViewSet(
    viewsets.ModelViewSet
):
    queryset = (
        InterimYearEndAssessment.objects
        .select_related("engagement")
        .all()
    )

    serializer_class = InterimYearEndAssessmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.3 — FRAUD / JOURNAL ENTRY PROCEDURES
# ============================================================

class FraudJournalEntryAssessmentViewSet(
    viewsets.ModelViewSet
):
    queryset = (
        FraudJournalEntryAssessment.objects
        .select_related("engagement")
        .all()
    )

    serializer_class = FraudJournalEntryAssessmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.4 — SUBSTANTIVE PROCEDURES
# ============================================================

class SubstantiveProcedureAssessmentViewSet(
    viewsets.ModelViewSet
):
    queryset = (
        SubstantiveProcedureAssessment.objects
        .select_related("engagement")
        .all()
    )

    serializer_class = SubstantiveProcedureAssessmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.5 — GENERAL AUDIT PROCEDURES
# ============================================================

class GeneralAuditProcedureViewSet(
    viewsets.ModelViewSet
):
    queryset = GeneralAuditProcedure.objects.select_related(
        "engagement"
    ).all()

    serializer_class = GeneralAuditProcedureSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


# ============================================================
# PHASE 3.6 — REASSESS COMBINED RISK
# ============================================================

class ReassessedCombinedRiskViewSet(
    viewsets.ModelViewSet
):
    queryset = ReassessedCombinedRisk.objects.select_related(
        "engagement"
    ).all()

    serializer_class = ReassessedCombinedRiskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset

    # ============================================================
# PHASE 4.1 — EVALUATE MISSTATEMENTS
# ============================================================

class MisstatementAssessmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for individual misstatement assessments.

    Supports:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE

    Can be filtered by engagement:
    /api/misstatement-assessments/?engagement=1
    """

    queryset = MisstatementAssessment.objects.select_related(
        "engagement"
    ).all()

    serializer_class = MisstatementAssessmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


class MisstatementEvaluationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for the overall misstatement evaluation.

    One evaluation exists per engagement.

    Supports:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE

    Can be filtered by engagement:
    /api/misstatement-evaluations/?engagement=1
    """

    queryset = MisstatementEvaluation.objects.select_related(
        "engagement"
    ).all()

    serializer_class = MisstatementEvaluationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset

    # ============================================================
# PHASE 4.7 — FIRM-LEVEL QUALITY MONITORING
# ============================================================

class QualityMonitoringViewSet(viewsets.ModelViewSet):
    """
    API endpoint for firm-level quality monitoring.

    One quality monitoring record exists per engagement.

    Supports:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE

    Can be filtered by engagement:
    /api/quality-monitorings/?engagement=1
    """

    queryset = QualityMonitoring.objects.select_related(
        "engagement"
    ).all()

    serializer_class = QualityMonitoringSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )

        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        return queryset


class QualityFindingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for individual quality findings.

    Can be filtered by quality monitoring:
    /api/quality-findings/?quality_monitoring=1

    Can also be filtered by engagement:
    /api/quality-findings/?engagement=1
    """

    queryset = QualityFinding.objects.select_related(
        "quality_monitoring",
        "quality_monitoring__engagement",
    ).all()

    serializer_class = QualityFindingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        quality_monitoring_id = (
            self.request.query_params.get(
                "quality_monitoring"
            )
        )

        engagement_id = (
            self.request.query_params.get(
                "engagement"
            )
        )

        if quality_monitoring_id:
            queryset = queryset.filter(
                quality_monitoring_id=quality_monitoring_id
            )

        if engagement_id:
            queryset = queryset.filter(
                quality_monitoring__engagement_id=engagement_id
            )

        return queryset


class RemediationActionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for remediation and corrective actions.

    Can be filtered by quality monitoring:
    /api/remediation-actions/?quality_monitoring=1

    Can also be filtered by engagement:
    /api/remediation-actions/?engagement=1
    """

    queryset = RemediationAction.objects.select_related(
        "quality_monitoring",
        "quality_monitoring__engagement",
    ).all()

    serializer_class = RemediationActionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        quality_monitoring_id = (
            self.request.query_params.get(
                "quality_monitoring"
            )
        )

        engagement_id = (
            self.request.query_params.get(
                "engagement"
            )
        )

        if quality_monitoring_id:
            queryset = queryset.filter(
                quality_monitoring_id=quality_monitoring_id
            )

        if engagement_id:
            queryset = queryset.filter(
                quality_monitoring__engagement_id=engagement_id
            )

        return queryset

