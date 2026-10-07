from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from apps.engagements.access import EngagementAccessMixin, require_engagement_access

from .accounting_controls import FinancialControlMixin, locked_policy, require_manager
from .models import (
    ChartOfAccount, FinancialStatementApproval, FinancialStatementLine,
    FinancialStatementMapping, FinancialStatementVersion, TrialBalance,
)
from .statement_services import approve_statement, build_mapped_statements, save_statement_version
from .workflow_services import record_financial_event


class StatementFilter(serializers.Serializer):
    engagement = serializers.IntegerField(min_value=1)


class StatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialStatementLine
        fields = ["id", "engagement", "code", "label", "group", "note_reference", "order"]

    def validate(self, attrs):
        if self.instance:
            if attrs.get("engagement", self.instance.engagement) != self.instance.engagement:
                raise ValidationError("Statement lines cannot move between engagements.")
            group = attrs.get("group", self.instance.group)
            if self.instance.mappings.exclude(account__account_type=group).exists():
                raise ValidationError("Reassign incompatible account mappings before changing this group.")
        return attrs


class MappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialStatementMapping
        fields = ["id", "account", "line"]

    def validate(self, attrs):
        account = attrs.get("account", self.instance.account if self.instance else None)
        line = attrs.get("line", self.instance.line if self.instance else None)
        if self.instance and account != self.instance.account:
            raise ValidationError("Reassign the statement line, not the mapping's account.")
        if account.engagement_id != line.engagement_id or account.account_type != line.group:
            raise ValidationError("Account and statement line must share engagement and account group.")
        return attrs


class MappingControlMixin(EngagementAccessMixin, FinancialControlMixin):
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            require_manager(request.user)

    def perform_create(self, serializer):
        engagement = self.mapping_engagement(serializer.validated_data)
        require_engagement_access(self.request.user, engagement)
        locked_policy(engagement)
        self.revalidate(serializer)
        try:
            with transaction.atomic():
                instance = serializer.save()
        except IntegrityError as exc:
            raise ValidationError("This line code or account mapping was concurrently created. Reload configuration.") from exc
        self.record_mapping(instance, "created")

    def perform_update(self, serializer):
        locked_policy(self.mapping_engagement(serializer.validated_data, serializer.instance))
        self.revalidate(serializer)
        try:
            with transaction.atomic():
                instance = serializer.save()
        except IntegrityError as exc:
            raise ValidationError("This line code or account mapping already exists. Reload configuration.") from exc
        self.record_mapping(instance, "updated")

    def revalidate(self, serializer):
        for value in serializer.validated_data.values():
            if isinstance(value, (ChartOfAccount, FinancialStatementLine)):
                value.refresh_from_db()
        if serializer.instance:
            serializer.instance.refresh_from_db()
        serializer.validate(serializer.validated_data)

    def perform_destroy(self, instance):
        engagement = self.mapping_engagement({}, instance)
        locked_policy(engagement)
        self.record_mapping(instance, "deleted")
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError("Reassign account mappings before deleting this statement line.") from exc

    def record_mapping(self, instance, operation):
        record_financial_event(
            engagement_id=self.mapping_engagement({}, instance), actor=self.request.user, action=operation,
            object_type=instance._meta.model_name, object_id=instance.pk,
            details={field.name: getattr(instance, field.attname) for field in instance._meta.concrete_fields},
        )


class StatementLineViewSet(MappingControlMixin, viewsets.ModelViewSet):
    queryset = FinancialStatementLine.objects.all()
    serializer_class = StatementLineSerializer

    def mapping_engagement(self, data, instance=None):
        return data["engagement"].pk if "engagement" in data else instance.engagement_id

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = StatementFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            queryset = queryset.filter(engagement_id=parameters.validated_data["engagement"])
        return queryset


class StatementMappingViewSet(MappingControlMixin, viewsets.ModelViewSet):
    queryset = FinancialStatementMapping.objects.select_related("account", "line")
    serializer_class = MappingSerializer
    engagement_lookup = "account__engagement_id"

    def mapping_engagement(self, data, instance=None):
        return data["account"].engagement_id if "account" in data else instance.account.engagement_id

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = StatementFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            queryset = queryset.filter(account__engagement_id=parameters.validated_data["engagement"]).order_by("account__account_code")
        return queryset


class StatementParameters(serializers.Serializer):
    current = serializers.PrimaryKeyRelatedField(queryset=TrialBalance.objects.all())
    comparison = serializers.PrimaryKeyRelatedField(queryset=TrialBalance.objects.all(), required=False, allow_null=True)


class VersionParameters(StatementParameters):
    name = serializers.CharField(max_length=200)


class ApprovalParameters(serializers.Serializer):
    note = serializers.CharField(max_length=5000)


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialStatementApproval
        fields = ["id", "actor_identifier", "actor_name", "note", "created_at"]
        read_only_fields = fields


class VersionSummarySerializer(serializers.ModelSerializer):
    approval = ApprovalSerializer(read_only=True)

    class Meta:
        model = FinancialStatementVersion
        fields = [
            "id", "engagement", "name", "current_tb_id", "comparison_tb_id",
            "fingerprint", "created_by", "preparer_identifier", "created_at", "approval",
        ]
        read_only_fields = fields


class VersionSerializer(VersionSummarySerializer):
    class Meta(VersionSummarySerializer.Meta):
        fields = VersionSummarySerializer.Meta.fields + ["results"]
        read_only_fields = fields


class StatementPagination(PageNumberPagination):
    page_size = 25


class StatementVersionViewSet(
    EngagementAccessMixin, FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialStatementVersion.objects.select_related("approval")
    pagination_class = StatementPagination

    def get_serializer_class(self):
        if self.action == "create":
            return VersionParameters
        return VersionSummarySerializer if self.action == "list" else VersionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = StatementFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            queryset = queryset.filter(engagement_id=parameters.validated_data["engagement"]).defer("results")
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        self.check_trial_balance_access(parameters.validated_data)
        version = save_statement_version(parameters.validated_data, request.user)
        return Response(VersionSerializer(version).data, status=201)

    @action(detail=False, methods=["get"])
    def preview(self, request):
        parameters = StatementParameters(data=request.query_params)
        parameters.is_valid(raise_exception=True)
        data = parameters.validated_data
        self.check_trial_balance_access(data)
        return Response(build_mapped_statements(data["current"], data.get("comparison")))

    def check_trial_balance_access(self, data):
        for field in ("current", "comparison"):
            trial_balance = data.get(field)
            if trial_balance is not None:
                require_engagement_access(self.request.user, trial_balance.engagement_id)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        parameters = ApprovalParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        version = self.get_object()
        approve_statement(version, request.user, parameters.validated_data["note"])
        return Response(VersionSerializer(self.get_queryset().get(pk=version.pk)).data)
