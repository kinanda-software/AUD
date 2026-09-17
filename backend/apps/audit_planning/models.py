from django.conf import settings
from django.db import models


class PlanningAssessment(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        APPROVED = "approved", "Approved"

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="planning_assessment",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )

    business_understanding = models.TextField(blank=True)
    industry_understanding = models.TextField(blank=True)
    regulatory_environment = models.TextField(blank=True)
    accounting_framework = models.TextField(blank=True)
    reporting_requirements = models.TextField(blank=True)
    significant_changes = models.TextField(blank=True)
    significant_risks_identified = models.TextField(blank=True)
    fraud_risk_considerations = models.TextField(blank=True)
    going_concern_considerations = models.TextField(blank=True)
    related_parties_considerations = models.TextField(blank=True)
    internal_audit_considerations = models.TextField(blank=True)
    previous_auditor_considerations = models.TextField(blank=True)
    planning_conclusion = models.TextField(blank=True)

    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepared_planning_assessments",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_planning_assessments",
    )

    prepared_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Planning Assessment - {self.engagement.engagement_code}"


class MaterialityAssessment(models.Model):
    class Benchmark(models.TextChoices):
        REVENUE = "revenue", "Revenue"
        PROFIT_BEFORE_TAX = "profit_before_tax", "Profit Before Tax"
        TOTAL_ASSETS = "total_assets", "Total Assets"
        EQUITY = "equity", "Equity"
        EXPENSES = "expenses", "Expenses"
        OTHER = "other", "Other"

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="materiality_assessment",
    )

    benchmark = models.CharField(
        max_length=30,
        choices=Benchmark.choices,
        default=Benchmark.PROFIT_BEFORE_TAX,
    )

    benchmark_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    benchmark_percentage = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=0,
    )

    overall_materiality = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    performance_materiality = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    clearly_trivial_threshold = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    rationale = models.TextField(blank=True)
    qualitative_factors = models.TextField(blank=True)

    reassessment_required = models.BooleanField(
        default=False,
    )

    reassessment_reason = models.TextField(blank=True)

    prepared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepared_materiality_assessments",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Materiality - {self.engagement.engagement_code}"


class AuditScope(models.Model):
    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="audit_scope",
    )

    entities_in_scope = models.TextField(blank=True)

    locations_in_scope = models.TextField(
        blank=True,
    )

    reporting_period = models.CharField(
        max_length=100,
        blank=True,
    )

    financial_statement_areas = models.TextField(
        blank=True,
    )

    significant_accounts = models.TextField(
        blank=True,
    )

    significant_disclosures = models.TextField(
        blank=True,
    )

    systems_in_scope = models.TextField(
        blank=True,
    )

    processes_in_scope = models.TextField(
        blank=True,
    )

    areas_out_of_scope = models.TextField(
        blank=True,
    )

    component_auditor_involvement = models.BooleanField(
        default=False,
    )

    component_auditor_details = models.TextField(
        blank=True,
    )

    scope_conclusion = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Audit Scope - {self.engagement.engagement_code}"


class AuditTeamMember(models.Model):
    class Role(models.TextChoices):
        ENGAGEMENT_PARTNER = (
            "engagement_partner",
            "Engagement Partner",
        )

        ENGAGEMENT_MANAGER = (
            "engagement_manager",
            "Engagement Manager",
        )

        SENIOR_AUDITOR = (
            "senior_auditor",
            "Senior Auditor",
        )

        AUDITOR = (
            "auditor",
            "Auditor",
        )

        ASSISTANT = (
            "assistant",
            "Assistant",
        )

        IT_SPECIALIST = (
            "it_specialist",
            "IT Specialist",
        )

        TAX_SPECIALIST = (
            "tax_specialist",
            "Tax Specialist",
        )

        VALUATION_SPECIALIST = (
            "valuation_specialist",
            "Valuation Specialist",
        )

        OTHER = (
            "other",
            "Other",
        )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="audit_team_members",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="audit_team_assignments",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
    )

    responsibilities = models.TextField(
        blank=True,
    )

    budgeted_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    is_key_member = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "user",
                ],
                name="unique_engagement_team_member",
            )
        ]

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.user.username} - "
            f"{self.role}"
        )


class PlanningMatter(models.Model):
    class MatterType(models.TextChoices):
        SIGNIFICANT_RISK = (
            "significant_risk",
            "Significant Risk",
        )

        FRAUD = (
            "fraud",
            "Fraud",
        )

        RELATED_PARTY = (
            "related_party",
            "Related Party",
        )

        GOING_CONCERN = (
            "going_concern",
            "Going Concern",
        )

        ESTIMATION = (
            "estimation",
            "Accounting Estimation",
        )

        IT = (
            "it",
            "Information Technology",
        )

        REGULATORY = (
            "regulatory",
            "Regulatory",
        )

        LITIGATION = (
            "litigation",
            "Litigation",
        )

        OTHER = (
            "other",
            "Other",
        )

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="planning_matters",
    )

    matter_type = models.CharField(
        max_length=30,
        choices=MatterType.choices,
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.MEDIUM,
    )

    response_required = models.BooleanField(
        default=True,
    )

    planned_response = models.TextField(
        blank=True,
    )

    resolved = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.title}"
        )


class PlanningProcedure(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = (
            "not_started",
            "Not Started",
        )

        IN_PROGRESS = (
            "in_progress",
            "In Progress",
        )

        COMPLETED = (
            "completed",
            "Completed",
        )

        NOT_APPLICABLE = (
            "not_applicable",
            "Not Applicable",
        )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="planning_procedures",
    )

    procedure_code = models.CharField(
        max_length=50,
    )

    title = models.CharField(
        max_length=255,
    )

    objective = models.TextField(
        blank=True,
    )

    procedure_description = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )

    conclusion = models.TextField(
        blank=True,
    )

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_planning_procedures",
    )

    performed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "procedure_code",
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "procedure_code",
                ],
                name="unique_planning_procedure_code",
            )
        ]

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.procedure_code} - "
            f"{self.title}"
        )


class TransactionCycleAssessment(models.Model):
    """
    Phase 2 - Risk Assessment & Strategy
    Section 2.1 - Transaction Cycle Assessment

    Stores the risk assessment workpaper for each transaction cycle
    within an audit engagement.
    """

    class CycleType(models.TextChoices):
        REVENUE = (
            "revenue",
            "Revenue",
        )

        PURCHASING_PAYABLES = (
            "purchasing_payables",
            "Purchasing & Payables",
        )

        PAYROLL = (
            "payroll",
            "Payroll",
        )

        INVENTORY = (
            "inventory",
            "Inventory",
        )

        FINANCIAL_STATEMENT_CLOSE = (
            "financial_statement_close",
            "Financial Statement Close",
        )

        OTHER_SIGNIFICANT_PROCESSES = (
            "other_significant_processes",
            "Other Significant Processes",
        )

    class Status(models.TextChoices):
        NOT_ASSESSED = (
            "not_assessed",
            "Not Assessed",
        )

        ASSESSED = (
            "assessed",
            "Assessed",
        )

    # ---------------------------------------------------------
    # Engagement
    # ---------------------------------------------------------

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="transaction_cycle_assessments",
    )

    # ---------------------------------------------------------
    # Transaction Cycle
    # ---------------------------------------------------------

    cycle_type = models.CharField(
        max_length=50,
        choices=CycleType.choices,
    )

    # ---------------------------------------------------------
    # Assessment Information
    # ---------------------------------------------------------

    description = models.TextField(
        blank=True,
    )

    significant_accounts = models.TextField(
        blank=True,
    )

    disclosure_processes = models.TextField(
        blank=True,
    )

    # ---------------------------------------------------------
    # IT Environment
    # ---------------------------------------------------------

    it_applications = models.TextField(
        blank=True,
    )

    it_dependencies = models.TextField(
        blank=True,
    )

    # ---------------------------------------------------------
    # Financial Statement Assertions
    # ---------------------------------------------------------

    assertions = models.JSONField(
        default=list,
        blank=True,
    )

    # ---------------------------------------------------------
    # Assessment Status
    # ---------------------------------------------------------

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_ASSESSED,
    )

    # ---------------------------------------------------------
    # Audit Trail
    # ---------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # ---------------------------------------------------------
    # Meta
    # ---------------------------------------------------------

    class Meta:
        ordering = [
            "cycle_type",
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "engagement",
                    "cycle_type",
                ],
                name="unique_engagement_transaction_cycle",
            )
        ]

    # ---------------------------------------------------------
    # String Representation
    # ---------------------------------------------------------

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.get_cycle_type_display()}"
        )


    # ============================================================
# PHASE 2.2 — PROCESS FLOW & WALKTHROUGHS
# ============================================================

class ProcessFlowWalkthrough(models.Model):
    """
    Phase 2.2 — Process Flow & Walkthroughs

    Stores the documented business process, process flow,
    key controls, IT dependencies and walkthrough results
    for an audit engagement.
    """

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="process_flow_walkthrough",
    )

    # --------------------------------------------------------
    # Process Information
    # --------------------------------------------------------

    process_name = models.CharField(
        max_length=255,
    )

    process_owner = models.CharField(
        max_length=255,
    )

    department = models.CharField(
        max_length=255,
        blank=True,
    )

    walkthrough_date = models.DateField()

    # --------------------------------------------------------
    # Process Description & Flow
    # --------------------------------------------------------

    process_description = models.TextField(
        blank=True,
    )

    process_flow = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Controls
    # --------------------------------------------------------

    key_controls = models.TextField(
        blank=True,
    )

    control_objectives = models.TextField(
        blank=True,
    )

    control_owner = models.CharField(
        max_length=255,
        blank=True,
    )

    # --------------------------------------------------------
    # IT Environment
    # --------------------------------------------------------

    it_applications = models.TextField(
        blank=True,
    )

    it_dependencies = models.TextField(
        blank=True,
    )

    interfaces = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Walkthrough
    # --------------------------------------------------------

    walkthrough_procedure = models.TextField(
        blank=True,
    )

    evidence_obtained = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Findings / Observations
    # --------------------------------------------------------

    observations = models.TextField(
        blank=True,
    )

    exceptions = models.TextField(
        blank=True,
    )

    conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Process Flow & Walkthrough"
        verbose_name_plural = "Process Flow & Walkthroughs"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.process_name}"
        )

    
# ============================================================
# PHASE 2.3 — RISK POINTS
# ============================================================

class RiskPoint(models.Model):
    class RiskLevel(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        SIGNIFICANT = "Significant", "Significant"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="risk_points",
    )

    # Used to preserve the order of risks on the workpaper
    sort_order = models.PositiveIntegerField(default=0)

    account = models.CharField(
        max_length=255
    )

    risk_description = models.TextField()

    assertions = models.JSONField(
        default=list,
        blank=True,
    )

    # Inherent risk factors
    fraud_risk = models.BooleanField(default=False)
    complexity = models.BooleanField(default=False)
    subjectivity = models.BooleanField(default=False)
    uncertainty = models.BooleanField(default=False)
    management_bias = models.BooleanField(default=False)

    likelihood = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.MEDIUM,
    )

    magnitude = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
        default=RiskLevel.MEDIUM,
    )

    significant_risk = models.BooleanField(default=False)

    control_response = models.TextField(
        blank=True
    )

    rationale = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "Risk Point"
        verbose_name_plural = "Risk Points"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.account}"
        )

    # ============================================================
# PHASE 2.4 — CONTROLS
# ============================================================

class Control(models.Model):
    class ControlType(models.TextChoices):
        PREVENTIVE = "Preventive", "Preventive"
        DETECTIVE = "Detective", "Detective"

    class ControlNature(models.TextChoices):
        MANUAL = "Manual", "Manual"
        IT_DEPENDENT_MANUAL = (
            "IT Dependent Manual",
            "IT Dependent Manual",
        )
        AUTOMATED = "Automated", "Automated"

    class Frequency(models.TextChoices):
        CONTINUOUS = "Continuous", "Continuous"
        DAILY = "Daily", "Daily"
        WEEKLY = "Weekly", "Weekly"
        MONTHLY = "Monthly", "Monthly"
        QUARTERLY = "Quarterly", "Quarterly"
        ANNUALLY = "Annually", "Annually"
        AS_NEEDED = "As Needed", "As Needed"

    class ReliancePlanned(models.TextChoices):
        YES = "Yes", "Yes"
        NO = "No", "No"
        TO_BE_DETERMINED = (
            "To Be Determined",
            "To Be Determined",
        )

    class DesignEffectiveness(models.TextChoices):
        EFFECTIVE = "Effective", "Effective"
        PARTIALLY_EFFECTIVE = (
            "Partially Effective",
            "Partially Effective",
        )
        INEFFECTIVE = "Ineffective", "Ineffective"
        NOT_ASSESSED = (
            "Not Assessed",
            "Not Assessed",
        )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="controls",
    )

    # Used to preserve the order of controls on the workpaper
    sort_order = models.PositiveIntegerField(
        default=0
    )

    control_id = models.CharField(
        max_length=100
    )

    process_cycle = models.CharField(
        max_length=255
    )

    control_objective = models.TextField()

    control_description = models.TextField()

    control_type = models.CharField(
        max_length=20,
        choices=ControlType.choices,
        default=ControlType.PREVENTIVE,
    )

    control_nature = models.CharField(
        max_length=30,
        choices=ControlNature.choices,
        default=ControlNature.MANUAL,
    )

    frequency = models.CharField(
        max_length=30,
        choices=Frequency.choices,
        default=Frequency.DAILY,
    )

    control_owner = models.CharField(
        max_length=255
    )

    control_evidence = models.TextField(
        blank=True
    )

    key_control = models.BooleanField(
        default=False
    )

    assertions = models.JSONField(
        default=list,
        blank=True,
    )

    reliance_planned = models.CharField(
        max_length=30,
        choices=ReliancePlanned.choices,
        default=ReliancePlanned.TO_BE_DETERMINED,
    )

    design_effectiveness = models.CharField(
        max_length=30,
        choices=DesignEffectiveness.choices,
        default=DesignEffectiveness.NOT_ASSESSED,
    )

    control_deficiencies = models.TextField(
        blank=True
    )

    auditor_conclusion = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "Control"
        verbose_name_plural = "Controls"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.control_id}"
        )
# ============================================================
# PHASE 3.1 — EXECUTE TESTS OF CONTROLS
# ============================================================

class ControlTestExecution(models.Model):
    """
    Phase 3.1 — Execute Tests of Controls

    Stores the execution of a control test performed during
    the audit execution phase.
    """

    class Assertion(models.TextChoices):
        EXISTENCE = "Existence", "Existence"
        COMPLETENESS = "Completeness", "Completeness"
        ACCURACY = "Accuracy", "Accuracy"
        CUT_OFF = "Cut-off", "Cut-off"
        OCCURRENCE = "Occurrence", "Occurrence"
        CLASSIFICATION = "Classification", "Classification"
        VALUATION = "Valuation", "Valuation"
        RIGHTS_OBLIGATIONS = (
            "Rights & Obligations",
            "Rights & Obligations",
        )
        PRESENTATION_DISCLOSURE = (
            "Presentation & Disclosure",
            "Presentation & Disclosure",
        )

    class ControlType(models.TextChoices):
        MANUAL = "Manual", "Manual"
        IT_DEPENDENT_MANUAL = (
            "IT Dependent Manual",
            "IT Dependent Manual",
        )
        AUTOMATED = "Automated", "Automated"
        IT_GENERAL_CONTROL = (
            "IT General Control",
            "IT General Control",
        )

    class SamplingMethod(models.TextChoices):
        RANDOM = "Random", "Random"
        SYSTEMATIC = "Systematic", "Systematic"
        JUDGMENTAL = "Judgmental", "Judgmental"
        STRATIFIED = "Stratified", "Stratified"
        FULL_POPULATION = (
            "Full Population",
            "Full Population",
        )

    class Result(models.TextChoices):
        NOT_STARTED = (
            "Not Started",
            "Not Started",
        )
        PASSED = "Passed", "Passed"
        EXCEPTION = "Exception", "Exception"
        FAILED = "Failed", "Failed"
        NOT_APPLICABLE = (
            "Not Applicable",
            "Not Applicable",
        )

    class RelianceDecision(models.TextChoices):
        RELY_IN_FULL = (
            "Rely in Full",
            "Rely in Full",
        )
        RELY_IN_PART = (
            "Rely in Part",
            "Rely in Part",
        )
        DO_NOT_RELY = (
            "Do Not Rely",
            "Do Not Rely",
        )
        SUBSTANTIVE_REQUIRED = (
            "Substantive Approach Required",
            "Substantive Approach Required",
        )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="control_test_executions",
    )

    # --------------------------------------------------------
    # Control Information
    # --------------------------------------------------------

    control_name = models.CharField(
        max_length=255,
    )

    control_reference = models.CharField(
        max_length=100,
    )

    assertion = models.CharField(
        max_length=50,
        choices=Assertion.choices,
    )

    control_type = models.CharField(
        max_length=50,
        choices=ControlType.choices,
    )

    # --------------------------------------------------------
    # Testing
    # --------------------------------------------------------

    testing_objective = models.TextField(
        blank=True,
    )

    test_procedure = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Population & Sampling
    # --------------------------------------------------------

    population = models.TextField(
        blank=True,
    )

    sample_size = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    sampling_method = models.CharField(
        max_length=30,
        choices=SamplingMethod.choices,
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Evidence
    # --------------------------------------------------------

    audit_evidence = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Test Result
    # --------------------------------------------------------

    result = models.CharField(
        max_length=30,
        choices=Result.choices,
        default=Result.NOT_STARTED,
    )

    exceptions_found = models.PositiveIntegerField(
        default=0,
    )

    # --------------------------------------------------------
    # Exception Evaluation
    # --------------------------------------------------------

    exception_nature = models.TextField(
        blank=True,
    )

    exception_effect = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Auditor Conclusion
    # --------------------------------------------------------

    reliance_decision = models.CharField(
        max_length=50,
        choices=RelianceDecision.choices,
        blank=True,
    )

    auditor_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # --------------------------------------------------------
    # Meta
    # --------------------------------------------------------

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "Control Test Execution"
        verbose_name_plural = "Control Test Executions"

    # --------------------------------------------------------
    # String Representation
    # --------------------------------------------------------

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.control_reference} - "
            f"{self.control_name}"
        )

    # ============================================================
# PHASE 3.2 — INTERIM-TO-YEAR-END CONSIDERATIONS
# ============================================================

class InterimYearEndAssessment(models.Model):
    """
    Phase 3.2 — Interim-to-Year-End Considerations

    Documents whether interim control testing can be rolled
    forward to the year-end audit period.
    """

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="interim_year_end_assessments",
    )

    control_name = models.CharField(
        max_length=255,
    )

    interim_date = models.DateField()

    year_end_date = models.DateField()

    interim_testing = models.TextField(
        blank=True,
    )

    control_changes = models.TextField(
        blank=True,
    )

    remaining_period = models.TextField(
        blank=True,
    )

    additional_testing = models.TextField(
        blank=True,
    )

    exceptions = models.TextField(
        blank=True,
    )

    conclusion = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "Interim Year-End Assessment"
        verbose_name_plural = "Interim Year-End Assessments"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.control_name} - "
            f"Interim to Year-End"
        )

# ============================================================
# PHASE 3.3 — FRAUD / JOURNAL ENTRY PROCEDURES
# ============================================================

class FraudJournalEntryAssessment(models.Model):
    """
    Phase 3.3 — Fraud / Journal Entry Procedures

    Documents journal entry testing, management override
    procedures, data analytics, fraud indicators, exceptions,
    and the auditor's conclusion.
    """

    class SelectionMethod(models.TextChoices):
        RISK_BASED = "Risk-based", "Risk-based"
        RANDOM = "Random", "Random"
        FULL_POPULATION = (
            "Full Population",
            "Full Population",
        )
        DATA_ANALYTICS = (
            "Data Analytics",
            "Data Analytics",
        )
        JUDGMENTAL = "Judgmental", "Judgmental"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="fraud_journal_entry_assessments",
    )

    # --------------------------------------------------------
    # JOURNAL ENTRY POPULATION
    # --------------------------------------------------------

    population_description = models.TextField(
        blank=True,
    )

    population_period = models.CharField(
        max_length=255,
        blank=True,
    )

    total_population = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    selection_method = models.CharField(
        max_length=30,
        choices=SelectionMethod.choices,
        blank=True,
    )

    selected_entries = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    selection_rationale = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # JOURNAL ENTRY TESTING
    # --------------------------------------------------------

    journal_entry_testing = models.TextField(
        blank=True,
    )

    testing_period = models.CharField(
        max_length=255,
        blank=True,
    )

    journal_entry_criteria = models.TextField(
        blank=True,
    )

    journal_entry_evidence = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # MANAGEMENT OVERRIDE PROCEDURES
    # --------------------------------------------------------

    management_override_procedures = models.TextField(
        blank=True,
    )

    override_results = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # DATA ANALYTICS & ANOMALIES
    # --------------------------------------------------------

    data_analytics_anomalies = models.TextField(
        blank=True,
    )

    anomaly_analysis = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # POSSIBLE FRAUD INDICATORS
    # --------------------------------------------------------

    possible_fraud_indicators = models.TextField(
        blank=True,
    )

    fraud_risk_assessment = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # EXCEPTIONS
    # --------------------------------------------------------

    exceptions = models.TextField(
        blank=True,
    )

    exceptions_count = models.PositiveIntegerField(
        default=0,
    )

    exception_resolution = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # AUDITOR CONCLUSION
    # --------------------------------------------------------

    auditor_conclusion = models.TextField(
        blank=True,
    )

    fraud_implication = models.TextField(
        blank=True,
    )

    further_procedures_required = models.BooleanField(
        default=False,
    )

    # --------------------------------------------------------
    # AUDIT TRAIL
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = (
            "Fraud Journal Entry Assessment"
        )

        verbose_name_plural = (
            "Fraud Journal Entry Assessments"
        )

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"Fraud / Journal Entry Procedures"
        )

    # ============================================================
# PHASE 3.4 — SUBSTANTIVE PROCEDURES
# ============================================================

class SubstantiveProcedureAssessment(models.Model):
    """
    Phase 3.4 — Substantive Procedures

    Documents substantive analytical procedures and tests
    of details performed during audit execution.
    """

    class ProcedureType(models.TextChoices):
        ANALYTICAL_PROCEDURES = (
            "Analytical Procedures",
            "Analytical Procedures",
        )
        KEY_ITEM_TESTING = (
            "Key Item Testing",
            "Key Item Testing",
        )
        SAMPLING = (
            "Sampling",
            "Sampling",
        )
        CONFIRMATION = (
            "Confirmation",
            "Confirmation",
        )
        FULL_POPULATION_ANALYTICS = (
            "Full Population Analytics",
            "Full Population Analytics",
        )
        INVENTORY_ATTENDANCE = (
            "Inventory Attendance",
            "Inventory Attendance",
        )
        LEGAL_LETTER = (
            "Legal Letter",
            "Legal Letter",
        )
        SEGMENT_TESTING = (
            "Segment Testing",
            "Segment Testing",
        )

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="substantive_procedure_assessments",
    )

    # --------------------------------------------------------
    # PROCEDURE INFORMATION
    # --------------------------------------------------------

    procedure_name = models.CharField(
        max_length=255,
        blank=True,
    )

    procedure_type = models.CharField(
        max_length=50,
        choices=ProcedureType.choices,
    )

    financial_statement_area = models.CharField(
        max_length=255,
        blank=True,
    )

    account_balance = models.CharField(
        max_length=255,
        blank=True,
    )

    assertion = models.CharField(
        max_length=100,
        blank=True,
    )

    procedure_objective = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # POPULATION & SAMPLE
    # --------------------------------------------------------

    population_description = models.TextField(
        blank=True,
    )

    population_period = models.CharField(
        max_length=255,
        blank=True,
    )

    population_size = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    sample_size = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    sampling_method = models.CharField(
        max_length=255,
        blank=True,
    )

    selection_rationale = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # PROCEDURE PERFORMED
    # --------------------------------------------------------

    procedure_performed = models.TextField(
        blank=True,
    )

    testing_results = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # EVIDENCE
    # --------------------------------------------------------

    evidence_obtained = models.TextField(
        blank=True,
    )

    evidence_reference = models.CharField(
        max_length=255,
        blank=True,
    )

    # --------------------------------------------------------
    # EXCEPTIONS & MISSTATEMENTS
    # --------------------------------------------------------

    exceptions_misstatements = models.TextField(
        blank=True,
    )

    exceptions_count = models.PositiveIntegerField(
        default=0,
    )

    misstatement_amount = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
    )

    exception_resolution = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # AUDITOR CONCLUSION
    # --------------------------------------------------------

    auditor_conclusion = models.TextField(
        blank=True,
    )

    further_procedures_required = models.BooleanField(
        default=False,
    )

    further_procedures_description = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # AUDIT TRAIL
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = (
            "Substantive Procedure Assessment"
        )

        verbose_name_plural = (
            "Substantive Procedure Assessments"
        )

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.procedure_type} - "
            f"{self.procedure_name}"
        )

    # ============================================================
# PHASE 3.5 — GENERAL AUDIT PROCEDURES
# ============================================================

class GeneralAuditProcedure(models.Model):
    """
    Phase 3.5 — General Audit Procedures

    Documents cross-cutting audit procedures and specialist work.
    """

    class ProcedureType(models.TextChoices):
        GROUP_AUDIT = "Group Audit", "Group Audit"

        INTERNAL_AUDIT_RELIANCE = (
            "Internal Audit Reliance",
            "Internal Audit Reliance",
        )

        EXPERT_INVOLVEMENT = (
            "Expert Involvement",
            "Expert Involvement",
        )

        SAMPLING = "Sampling", "Sampling"

        ACCOUNTING_ESTIMATES = (
            "Accounting Estimates",
            "Accounting Estimates",
        )

        FINANCIAL_STATEMENT_CLOSE = (
            "Financial Statement Close Process",
            "Financial Statement Close Process",
        )

        SUSTAINABILITY = (
            "Sustainability",
            "Sustainability",
        )

        SERVICE_ORGANIZATION = (
            "Service Organization",
            "Service Organization",
        )

        COMPLEX_TRANSACTIONS = (
            "Complex Transactions",
            "Complex Transactions",
        )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="general_audit_procedures",
    )

    # --------------------------------------------------------
    # Procedure Classification
    # --------------------------------------------------------

    procedure_type = models.CharField(
        max_length=100,
        choices=ProcedureType.choices,
    )

    responsible_person = models.CharField(
        max_length=255,
        blank=True,
    )

    # --------------------------------------------------------
    # Procedure Performed
    # --------------------------------------------------------

    procedure_performed = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Evidence & Documentation
    # --------------------------------------------------------

    evidence_documentation = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Findings
    # --------------------------------------------------------

    findings = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Issues Requiring Follow-Up
    # --------------------------------------------------------

    issues_follow_up = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Auditor Conclusion
    # --------------------------------------------------------

    auditor_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # --------------------------------------------------------
    # Meta
    # --------------------------------------------------------

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "General Audit Procedure"

        verbose_name_plural = "General Audit Procedures"

    # --------------------------------------------------------
    # String Representation
    # --------------------------------------------------------

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.procedure_type}"
        )

    # ============================================================
# PHASE 3.6 — REASSESS COMBINED RISK
# ============================================================

class ReassessedCombinedRisk(models.Model):

    class Assertion(models.TextChoices):
        OCCURRENCE = "Occurrence", "Occurrence"
        COMPLETENESS = "Completeness", "Completeness"
        ACCURACY = "Accuracy", "Accuracy"
        CUTOFF = "Cut-off", "Cut-off"
        EXISTENCE = "Existence", "Existence"
        VALUATION = "Valuation", "Valuation"
        RIGHTS_OBLIGATIONS = "Rights & Obligations", "Rights & Obligations"
        CLASSIFICATION = "Classification", "Classification"
        PRESENTATION_DISCLOSURE = (
            "Presentation & Disclosure",
            "Presentation & Disclosure",
        )

    class RiskLevel(models.TextChoices):
        LOW = "Low", "Low"
        MODERATE = "Moderate", "Moderate"
        HIGH = "High", "High"
        SIGNIFICANT = "Significant", "Significant"

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="reassessed_combined_risks",
    )

    # --------------------------------------------------------
    # Original Risk Assessment
    # --------------------------------------------------------

    risk_area = models.CharField(
        max_length=255,
    )

    assertion = models.CharField(
        max_length=100,
        choices=Assertion.choices,
    )

    original_risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
    )

    # --------------------------------------------------------
    # Evidence Obtained During Audit Execution
    # --------------------------------------------------------

    new_audit_evidence = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Unexpected Results
    # --------------------------------------------------------

    unexpected_results = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Control Exceptions
    # --------------------------------------------------------

    control_exceptions = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Misstatements Identified
    # --------------------------------------------------------

    misstatements_identified = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Confirmation Exceptions
    # --------------------------------------------------------

    confirmation_exceptions = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Reassessed Risk
    # --------------------------------------------------------

    reassessed_risk_level = models.CharField(
        max_length=20,
        choices=RiskLevel.choices,
    )

    reason_for_risk_change = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Additional Audit Procedures
    # --------------------------------------------------------

    additional_audit_procedures = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Auditor Conclusion
    # --------------------------------------------------------

    auditor_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        verbose_name = "Reassessed Combined Risk"
        verbose_name_plural = "Reassessed Combined Risks"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"{self.risk_area} - "
            f"{self.reassessed_risk_level}"
        )

    # ============================================================
# PHASE 4.1 — EVALUATE MISSTATEMENTS
# ============================================================

class MisstatementAssessment(models.Model):
    """
    Phase 4.1 — Evaluate Misstatements

    Stores individual misstatements identified during the audit
    and the auditor's evaluation of their effect on the
    financial statements.
    """

    class Assertion(models.TextChoices):
        OCCURRENCE = "Occurrence", "Occurrence"
        COMPLETENESS = "Completeness", "Completeness"
        ACCURACY = "Accuracy", "Accuracy"
        CUT_OFF = "Cut-off", "Cut-off"
        EXISTENCE = "Existence", "Existence"
        VALUATION = "Valuation", "Valuation"
        RIGHTS_OBLIGATIONS = (
            "Rights & Obligations",
            "Rights & Obligations",
        )
        CLASSIFICATION = "Classification", "Classification"
        PRESENTATION_DISCLOSURE = (
            "Presentation & Disclosure",
            "Presentation & Disclosure",
        )

    class MisstatementNature(models.TextChoices):
        FACTUAL = "Factual", "Factual"
        JUDGMENTAL = "Judgmental", "Judgmental"
        PROJECTED = "Projected", "Projected"

    class CorrectionStatus(models.TextChoices):
        CORRECTED = "Corrected", "Corrected"
        UNCORRECTED = "Uncorrected", "Uncorrected"
        PARTIALLY_CORRECTED = (
            "Partially Corrected",
            "Partially Corrected",
        )

    class EvaluationResult(models.TextChoices):
        CLEARLY_TRIVIAL = (
            "Clearly Trivial",
            "Clearly Trivial",
        )
        BELOW_MATERIALITY = (
            "Below Materiality",
            "Below Materiality",
        )
        MATERIAL = "Material", "Material"
        QUALITATIVELY_MATERIAL = (
            "Qualitatively Material",
            "Qualitatively Material",
        )
        POTENTIALLY_MATERIAL = (
            "Potentially Material",
            "Potentially Material",
        )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    engagement = models.ForeignKey(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="misstatement_assessments",
    )

    # --------------------------------------------------------
    # Misstatement Identification
    # --------------------------------------------------------

    reference = models.CharField(
        max_length=50,
        blank=True,
    )

    description = models.TextField()

    financial_statement_area = models.CharField(
        max_length=255,
        blank=True,
    )

    account = models.CharField(
        max_length=255,
        blank=True,
    )

    assertion = models.CharField(
        max_length=100,
        choices=Assertion.choices,
    )

    nature = models.CharField(
        max_length=30,
        choices=MisstatementNature.choices,
    )

    # --------------------------------------------------------
    # Misstatement Amount
    # --------------------------------------------------------

    identified_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    projected_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    aggregated_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    # --------------------------------------------------------
    # Correction Status
    # --------------------------------------------------------

    correction_status = models.CharField(
        max_length=30,
        choices=CorrectionStatus.choices,
        default=CorrectionStatus.UNCORRECTED,
    )

    management_response = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Evaluation
    # --------------------------------------------------------

    materiality_reference = models.TextField(
        blank=True,
    )

    evaluation_result = models.CharField(
        max_length=40,
        choices=EvaluationResult.choices,
        blank=True,
    )

    qualitative_factors = models.TextField(
        blank=True,
    )

    financial_statement_effect = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Uncorrected Misstatement Considerations
    # --------------------------------------------------------

    included_in_uncorrected_summary = models.BooleanField(
        default=False,
    )

    communicated_to_management = models.BooleanField(
        default=False,
    )

    communicated_to_governance = models.BooleanField(
        default=False,
    )

    written_representation_required = models.BooleanField(
        default=False,
    )

    written_representation_obtained = models.BooleanField(
        default=False,
    )

    # --------------------------------------------------------
    # Audit Response
    # --------------------------------------------------------

    further_procedures_required = models.BooleanField(
        default=False,
    )

    further_procedures_description = models.TextField(
        blank=True,
    )

    effect_on_audit_opinion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Auditor Conclusion
    # --------------------------------------------------------

    auditor_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "Misstatement Assessment"
        verbose_name_plural = "Misstatement Assessments"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"Misstatement - "
            f"{self.reference or self.id}"
        )


class MisstatementEvaluation(models.Model):
    """
    Phase 4.1 — Overall Misstatement Evaluation

    Stores the overall evaluation of identified and uncorrected
    misstatements for the engagement.
    """

    class OverallConclusion(models.TextChoices):
        NO_MATERIAL_MISSTATEMENTS = (
            "No Material Misstatements",
            "No Material Misstatements",
        )

        MISSTATEMENTS_CORRECTED = (
            "Misstatements Corrected",
            "Misstatements Corrected",
        )

        UNCORRECTED_NOT_MATERIAL = (
            "Uncorrected Misstatements Not Material",
            "Uncorrected Misstatements Not Material",
        )

        MATERIAL_UNCORRECTED = (
            "Material Uncorrected Misstatements",
            "Material Uncorrected Misstatements",
        )

        FURTHER_EVALUATION_REQUIRED = (
            "Further Evaluation Required",
            "Further Evaluation Required",
        )

    # --------------------------------------------------------
    # Engagement
    # --------------------------------------------------------

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="misstatement_evaluation",
    )

    # --------------------------------------------------------
    # Materiality
    # --------------------------------------------------------

    overall_materiality = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
    )

    performance_materiality = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
    )

    clearly_trivial_threshold = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
    )

    # --------------------------------------------------------
    # Aggregate Misstatements
    # --------------------------------------------------------

    total_identified_misstatements = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    total_corrected_misstatements = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    total_uncorrected_misstatements = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=0,
    )

    # --------------------------------------------------------
    # Evaluation
    # --------------------------------------------------------

    aggregate_effect = models.TextField(
        blank=True,
    )

    qualitative_factors = models.TextField(
        blank=True,
    )

    management_response = models.TextField(
        blank=True,
    )

    governance_communication = models.TextField(
        blank=True,
    )

    written_representation_considered = models.BooleanField(
        default=False,
    )

    written_representation_obtained = models.BooleanField(
        default=False,
    )

    # --------------------------------------------------------
    # Audit Opinion Consideration
    # --------------------------------------------------------

    effect_on_audit_opinion = models.TextField(
        blank=True,
    )

    further_procedures_required = models.BooleanField(
        default=False,
    )

    further_procedures_description = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Overall Conclusion
    # --------------------------------------------------------

    overall_conclusion = models.CharField(
        max_length=60,
        choices=OverallConclusion.choices,
        blank=True,
    )

    auditor_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "Misstatement Evaluation"
        verbose_name_plural = "Misstatement Evaluations"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"Overall Misstatement Evaluation"
        )

    # ============================================================
# PHASE 4.7 — FIRM-LEVEL QUALITY MONITORING
# ============================================================

class QualityMonitoring(models.Model):
    class CompletionStatus(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"

    class InspectionStatus(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"
        NOT_APPLICABLE = "Not Applicable", "Not Applicable"

    engagement = models.OneToOneField(
        "engagements.Engagement",
        on_delete=models.CASCADE,
        related_name="quality_monitoring",
    )

    # --------------------------------------------------------
    # Completion
    # --------------------------------------------------------

    completion_status = models.CharField(
        max_length=20,
        choices=CompletionStatus.choices,
        default=CompletionStatus.NOT_STARTED,
    )

    # --------------------------------------------------------
    # Inspection
    # --------------------------------------------------------

    inspection_status = models.CharField(
        max_length=20,
        choices=InspectionStatus.choices,
        default=InspectionStatus.NOT_STARTED,
    )

    inspection_date = models.DateField(
        null=True,
        blank=True,
    )

    inspector_name = models.CharField(
        max_length=255,
        blank=True,
    )

    monitoring_period = models.CharField(
        max_length=255,
        blank=True,
    )

    next_monitoring_date = models.DateField(
        null=True,
        blank=True,
    )

    inspection_scope = models.TextField(
        blank=True,
    )

    inspection_methodology = models.TextField(
        blank=True,
    )

    inspection_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Firm-Level Feedback
    # --------------------------------------------------------

    firm_methodology_feedback = models.TextField(
        blank=True,
    )

    training_feedback = models.TextField(
        blank=True,
    )

    staffing_feedback = models.TextField(
        blank=True,
    )

    supervision_feedback = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Conclusions
    # --------------------------------------------------------

    engagement_performance_conclusion = models.TextField(
        blank=True,
    )

    overall_quality_conclusion = models.TextField(
        blank=True,
    )

    # --------------------------------------------------------
    # Governance / Follow-Up
    # --------------------------------------------------------

    leadership_review_completed = models.BooleanField(
        default=False,
    )

    findings_communicated = models.BooleanField(
        default=False,
    )

    root_cause_completed = models.BooleanField(
        default=False,
    )

    remediation_plan_approved = models.BooleanField(
        default=False,
    )

    effectiveness_monitoring_completed = models.BooleanField(
        default=False,
    )

    quality_leadership_notified = models.BooleanField(
        default=False,
    )

    # --------------------------------------------------------
    # Audit Trail
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-updated_at",
            "-created_at",
        ]

        verbose_name = "Quality Monitoring"
        verbose_name_plural = "Quality Monitoring"

    def __str__(self):
        return (
            f"{self.engagement.engagement_code} - "
            f"Quality Monitoring"
        )


class QualityFinding(models.Model):
    class Severity(models.TextChoices):
        LOW = "Low", "Low"
        MODERATE = "Moderate", "Moderate"
        SIGNIFICANT = "Significant", "Significant"
        SEVERE = "Severe", "Severe"

    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        UNDER_INVESTIGATION = (
            "Under Investigation",
            "Under Investigation",
        )
        REMEDIATED = "Remediated", "Remediated"
        ACCEPTED = "Accepted", "Accepted"
        NOT_APPLICABLE = (
            "Not Applicable",
            "Not Applicable",
        )

    quality_monitoring = models.ForeignKey(
        QualityMonitoring,
        on_delete=models.CASCADE,
        related_name="findings",
    )

    reference = models.CharField(
        max_length=100,
    )

    area = models.CharField(
        max_length=255,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.MODERATE,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.OPEN,
    )

    root_cause = models.TextField(
        blank=True,
    )

    corrective_action = models.TextField(
        blank=True,
    )

    responsible_person = models.CharField(
        max_length=255,
        blank=True,
    )

    target_date = models.DateField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "id",
        ]

        verbose_name = "Quality Finding"
        verbose_name_plural = "Quality Findings"

    def __str__(self):
        return (
            f"{self.quality_monitoring.engagement.engagement_code} - "
            f"{self.reference}"
        )


class RemediationAction(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = "Not Started", "Not Started"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"
        MONITORING = "Monitoring", "Monitoring"

    quality_monitoring = models.ForeignKey(
        QualityMonitoring,
        on_delete=models.CASCADE,
        related_name="remediation_actions",
    )

    reference = models.CharField(
        max_length=100,
    )

    action = models.TextField(
        blank=True,
    )

    owner = models.CharField(
        max_length=255,
        blank=True,
    )

    target_date = models.DateField(
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
    )

    effectiveness = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "id",
        ]

        verbose_name = "Remediation Action"
        verbose_name_plural = "Remediation Actions"

    def __str__(self):
        return (
            f"{self.quality_monitoring.engagement.engagement_code} - "
            f"{self.reference}"
        )