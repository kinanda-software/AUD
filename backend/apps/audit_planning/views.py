from rest_framework import viewsets
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.engagements.models import Engagement
from .archive_validation import validate_archive_completion

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
    RemediationAction,
    DocumentationArchive,
    ArchiveStatus,
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
    DocumentationArchiveSerializer,
    ArchiveStatusSerializer,
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

class MisstatementAssessmentViewSet(
    viewsets.ModelViewSet
):
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


class MisstatementEvaluationViewSet(
    viewsets.ModelViewSet
):
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

class QualityMonitoringViewSet(
    viewsets.ModelViewSet
):
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


class QualityFindingViewSet(
    viewsets.ModelViewSet
):
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


class RemediationActionViewSet(
    viewsets.ModelViewSet
):
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


# ============================================================
# PHASE 4.6 — DOCUMENTATION ARCHIVE
# ============================================================

class ArchiveMutationMixin:
    @transaction.atomic
    def perform_create(self, serializer):
        engagement = serializer.validated_data["engagement"]
        Engagement.objects.select_for_update().get(pk=engagement.pk)
        self.ensure_unlocked(engagement.pk)
        self.save_archive(serializer, engagement)

    @transaction.atomic
    def perform_update(self, serializer):
        engagement = serializer.instance.engagement
        if serializer.validated_data.get("engagement", engagement) != engagement:
            raise ValidationError("Archive records cannot move between engagements.")
        Engagement.objects.select_for_update().get(pk=engagement.pk)
        self.ensure_unlocked(engagement.pk)
        self.save_archive(serializer, engagement)

    @transaction.atomic
    def perform_destroy(self, instance):
        Engagement.objects.select_for_update().get(pk=instance.engagement_id)
        self.ensure_unlocked(instance.engagement_id)
        instance.delete()

    def ensure_unlocked(self, engagement_id):
        if ArchiveStatus.objects.filter(engagement_id=engagement_id, locked=True).exists():
            raise ValidationError("This engagement archive is locked and read-only.")

    def save_archive(self, serializer, engagement):
        if isinstance(serializer, ArchiveStatusSerializer) and serializer.validated_data.get("locked"):
            archive = DocumentationArchive.objects.filter(engagement=engagement).first()
            validate_archive_completion(archive.data if archive else None)
            completed_at = serializer.validated_data.get("documentation_completed_at")
            retention = serializer.validated_data.get("retention_period_years")
            if not completed_at or not retention or retention < 1:
                raise ValidationError("A completion date and positive retention period are required.")
            serializer.save()
            archive.data = {**archive.data, "completionStatus": "Completed", "archiveStatus": "Archived"}
            archive.save(update_fields=["data", "updated_at"])
        else:
            if isinstance(serializer, DocumentationArchiveSerializer):
                data = serializer.validated_data.get("data", serializer.instance.data if serializer.instance else {})
                if not isinstance(data, dict):
                    raise ValidationError("Documentation archive data must be an object.")
                if data.get("archiveStatus") == "Archived":
                    raise ValidationError("Lock the archive before claiming archived status.")
            serializer.save()


class DocumentationArchiveViewSet(ArchiveMutationMixin, viewsets.ModelViewSet):
    queryset = DocumentationArchive.objects.select_related(
        "engagement"
    ).all()

    serializer_class = DocumentationArchiveSerializer

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
# PHASE 4.6 — ARCHIVE STATUS
# ============================================================

class ArchiveStatusViewSet(ArchiveMutationMixin, viewsets.ModelViewSet):
    queryset = ArchiveStatus.objects.select_related(
        "engagement"
    ).all()

    serializer_class = ArchiveStatusSerializer

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