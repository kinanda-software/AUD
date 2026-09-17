from rest_framework import serializers

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
)


# ============================================================
# PLANNING ASSESSMENT
# ============================================================

class PlanningAssessmentSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = PlanningAssessment
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# MATERIALITY ASSESSMENT
# ============================================================

class MaterialityAssessmentSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = MaterialityAssessment
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# AUDIT SCOPE
# ============================================================

class AuditScopeSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = AuditScope
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# AUDIT TEAM MEMBER
# ============================================================

class AuditTeamMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )

    class Meta:
        model = AuditTeamMember
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "username",
        ]


# ============================================================
# PLANNING MATTER
# ============================================================

class PlanningMatterSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = PlanningMatter
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PLANNING PROCEDURE
# ============================================================

class PlanningProcedureSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = PlanningProcedure
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PHASE 2.1 — TRANSACTION CYCLE ASSESSMENT
# ============================================================

class TransactionCycleAssessmentSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = TransactionCycleAssessment
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PHASE 2.2 — PROCESS FLOW & WALKTHROUGHS
# ============================================================

class ProcessFlowWalkthroughSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = ProcessFlowWalkthrough
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PHASE 2.3 — RISK POINTS
# ============================================================

class RiskPointSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = RiskPoint
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate_assertions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Assertions must be a list."
            )

        return value


# ============================================================
# PHASE 2.4 — CONTROLS
# ============================================================

class ControlSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = Control
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate_assertions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Assertions must be a list."
            )

        return value


# ============================================================
# PHASE 3.1 — EXECUTE TESTS OF CONTROLS
# ============================================================

class ControlTestExecutionSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = ControlTestExecution
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate_sample_size(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Sample size cannot be negative."
            )

        return value

    def validate_exceptions_found(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Exceptions found cannot be negative."
            )

        return value

    def validate(self, attrs):
        result = attrs.get(
            "result",
            getattr(
                self.instance,
                "result",
                ControlTestExecution.Result.NOT_STARTED,
            ),
        )

        exceptions_found = attrs.get(
            "exceptions_found",
            getattr(
                self.instance,
                "exceptions_found",
                0,
            ),
        )

        exception_nature = attrs.get(
            "exception_nature",
            getattr(
                self.instance,
                "exception_nature",
                "",
            ),
        )

        if result in [
            ControlTestExecution.Result.EXCEPTION,
            ControlTestExecution.Result.FAILED,
        ]:
            if not exception_nature.strip():
                raise serializers.ValidationError(
                    {
                        "exception_nature": (
                            "Exception nature is required when "
                            "the test result is Exception or Failed."
                        )
                    }
                )

        if exceptions_found < 0:
            raise serializers.ValidationError(
                {
                    "exceptions_found": (
                        "Exceptions found cannot be negative."
                    )
                }
            )

        return attrs


# ============================================================
# PHASE 3.2 — INTERIM-TO-YEAR-END
# ============================================================

class InterimYearEndAssessmentSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = InterimYearEndAssessment
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate(self, attrs):
        interim_date = attrs.get(
            "interim_date",
            getattr(
                self.instance,
                "interim_date",
                None,
            ),
        )

        year_end_date = attrs.get(
            "year_end_date",
            getattr(
                self.instance,
                "year_end_date",
                None,
            ),
        )

        if (
            interim_date
            and year_end_date
            and interim_date > year_end_date
        ):
            raise serializers.ValidationError(
                {
                    "interim_date": (
                        "Interim testing date cannot be "
                        "after the year-end date."
                    )
                }
            )

        return attrs


# ============================================================
# PHASE 3.3 — FRAUD / JOURNAL ENTRY PROCEDURES
# ============================================================

class FraudJournalEntryAssessmentSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = FraudJournalEntryAssessment
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate_total_population(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Total population cannot be negative."
            )

        return value

    def validate_selected_entries(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Selected entries cannot be negative."
            )

        return value

    def validate_exceptions_count(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Exceptions count cannot be negative."
            )

        return value

    def validate(self, attrs):
        total_population = attrs.get(
            "total_population",
            getattr(
                self.instance,
                "total_population",
                None,
            ),
        )

        selected_entries = attrs.get(
            "selected_entries",
            getattr(
                self.instance,
                "selected_entries",
                None,
            ),
        )

        if (
            total_population is not None
            and selected_entries is not None
            and selected_entries > total_population
        ):
            raise serializers.ValidationError(
                {
                    "selected_entries": (
                        "Selected entries cannot exceed "
                        "the total journal entry population."
                    )
                }
            )

        return attrs


# ============================================================
# PHASE 3.4 — SUBSTANTIVE PROCEDURES
# ============================================================

class SubstantiveProcedureAssessmentSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = SubstantiveProcedureAssessment

        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate_population_size(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Population size cannot be negative."
            )

        return value

    def validate_sample_size(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Sample size cannot be negative."
            )

        return value

    def validate_exceptions_count(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Exceptions count cannot be negative."
            )

        return value

    def validate_misstatement_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Misstatement amount cannot be negative."
            )

        return value

    def validate(self, attrs):
        population_size = attrs.get(
            "population_size",
            getattr(
                self.instance,
                "population_size",
                None,
            ),
        )

        sample_size = attrs.get(
            "sample_size",
            getattr(
                self.instance,
                "sample_size",
                None,
            ),
        )

        if (
            population_size is not None
            and sample_size is not None
            and sample_size > population_size
        ):
            raise serializers.ValidationError(
                {
                    "sample_size": (
                        "Sample size cannot exceed "
                        "the population size."
                    )
                }
            )

        return attrs


# ============================================================
# PHASE 3.5 — GENERAL AUDIT PROCEDURES
# ============================================================

class GeneralAuditProcedureSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = GeneralAuditProcedure

        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PHASE 3.6 — REASSESS COMBINED RISK
# ============================================================

class ReassessedCombinedRiskSerializer(
    serializers.ModelSerializer
):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = ReassessedCombinedRisk
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


# ============================================================
# PHASE 4.1 — EVALUATE MISSTATEMENTS
# ============================================================

class MisstatementAssessmentSerializer(
    serializers.ModelSerializer
):
    """
    Serializer for individual misstatement assessments.
    """

    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = MisstatementAssessment
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate(self, attrs):
        """
        Validate individual misstatement monetary amounts.
        """

        identified_amount = attrs.get(
            "identified_amount",
            getattr(
                self.instance,
                "identified_amount",
                0,
            ),
        )

        projected_amount = attrs.get(
            "projected_amount",
            getattr(
                self.instance,
                "projected_amount",
                0,
            ),
        )

        aggregated_amount = attrs.get(
            "aggregated_amount",
            getattr(
                self.instance,
                "aggregated_amount",
                0,
            ),
        )

        if (
            identified_amount is not None
            and identified_amount < 0
        ):
            raise serializers.ValidationError(
                {
                    "identified_amount": (
                        "Identified amount cannot be negative."
                    )
                }
            )

        if (
            projected_amount is not None
            and projected_amount < 0
        ):
            raise serializers.ValidationError(
                {
                    "projected_amount": (
                        "Projected amount cannot be negative."
                    )
                }
            )

        if (
            aggregated_amount is not None
            and aggregated_amount < 0
        ):
            raise serializers.ValidationError(
                {
                    "aggregated_amount": (
                        "Aggregated amount cannot be negative."
                    )
                }
            )

        return attrs


class MisstatementEvaluationSerializer(
    serializers.ModelSerializer
):
    """
    Serializer for the overall misstatement evaluation.
    """

    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = MisstatementEvaluation
        fields = "__all__"

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]

    def validate(self, attrs):
        """
        Validate overall misstatement evaluation amounts.
        """

        overall_materiality = attrs.get(
            "overall_materiality",
            getattr(
                self.instance,
                "overall_materiality",
                None,
            ),
        )

        performance_materiality = attrs.get(
            "performance_materiality",
            getattr(
                self.instance,
                "performance_materiality",
                None,
            ),
        )

        clearly_trivial_threshold = attrs.get(
            "clearly_trivial_threshold",
            getattr(
                self.instance,
                "clearly_trivial_threshold",
                None,
            ),
        )

        total_identified = attrs.get(
            "total_identified_misstatements",
            getattr(
                self.instance,
                "total_identified_misstatements",
                0,
            ),
        )

        total_corrected = attrs.get(
            "total_corrected_misstatements",
            getattr(
                self.instance,
                "total_corrected_misstatements",
                0,
            ),
        )

        total_uncorrected = attrs.get(
            "total_uncorrected_misstatements",
            getattr(
                self.instance,
                "total_uncorrected_misstatements",
                0,
            ),
        )

        monetary_fields = {
            "overall_materiality": overall_materiality,
            "performance_materiality": performance_materiality,
            "clearly_trivial_threshold": clearly_trivial_threshold,
            "total_identified_misstatements": total_identified,
            "total_corrected_misstatements": total_corrected,
            "total_uncorrected_misstatements": total_uncorrected,
        }

        for field_name, value in monetary_fields.items():
            if value is not None and value < 0:
                raise serializers.ValidationError(
                    {
                        field_name: (
                            f"{field_name.replace('_', ' ').capitalize()} "
                            "cannot be negative."
                        )
                    }
                )

        if (
            overall_materiality is not None
            and performance_materiality is not None
            and performance_materiality > overall_materiality
        ):
            raise serializers.ValidationError(
                {
                    "performance_materiality": (
                        "Performance materiality cannot be "
                        "greater than overall materiality."
                    )
                }
            )

        if (
            clearly_trivial_threshold is not None
            and overall_materiality is not None
            and clearly_trivial_threshold > overall_materiality
        ):
            raise serializers.ValidationError(
                {
                    "clearly_trivial_threshold": (
                        "Clearly trivial threshold cannot be "
                        "greater than overall materiality."
                    )
                }
            )

        if total_corrected > total_identified:
            raise serializers.ValidationError(
                {
                    "total_corrected_misstatements": (
                        "Total corrected misstatements cannot be "
                        "greater than total identified misstatements."
                    )
                }
            )

        if total_uncorrected > total_identified:
            raise serializers.ValidationError(
                {
                    "total_uncorrected_misstatements": (
                        "Total uncorrected misstatements cannot be "
                        "greater than total identified misstatements."
                    )
                }
            )

        return attrs

    # ============================================================
# PHASE 4.7 — FIRM-LEVEL QUALITY MONITORING
# ============================================================

class QualityMonitoringSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = QualityMonitoring
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


class QualityFindingSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="quality_monitoring.engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = QualityFinding
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]


class RemediationActionSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="quality_monitoring.engagement.engagement_code",
        read_only=True,
    )

    class Meta:
        model = RemediationAction
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "engagement_code",
        ]