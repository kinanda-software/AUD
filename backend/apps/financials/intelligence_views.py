from decimal import Decimal

from rest_framework import mixins, serializers, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.engagements.models import Engagement
from .accounting_controls import FinancialControlMixin
from .intelligence_services import RULES, create_intelligence_run
from .models import FinancialIntelligenceRun, JournalEntry
from .subledger_views import EngagementFilter


class RunParameters(serializers.Serializer):
    engagement = serializers.PrimaryKeyRelatedField(queryset=Engagement.objects.all())
    name = serializers.CharField(max_length=200)
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    source = serializers.ChoiceField(choices=("all", *JournalEntry.Source.values), default="all")
    sampling_method = serializers.ChoiceField(choices=("seeded_random", "high_value"))
    sample_size = serializers.IntegerField(min_value=1, max_value=1000)
    seed = serializers.CharField(max_length=100)
    amount_threshold = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))
    round_increment = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))
    rules = serializers.ListField(child=serializers.ChoiceField(choices=RULES), allow_empty=False)

    def validate(self, attrs):
        if attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError("The start date must not exceed the end date.")
        if len(attrs["rules"]) != len(set(attrs["rules"])):
            raise serializers.ValidationError({"rules": "Select each rule only once."})
        return attrs


class RunSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialIntelligenceRun
        fields = [
            "id", "engagement", "name", "algorithm_version", "parameters", "population_fingerprint",
            "population_count", "sample_count", "finding_count", "created_by", "created_at",
        ]
        read_only_fields = fields


class RunSerializer(RunSummarySerializer):
    class Meta(RunSummarySerializer.Meta):
        fields = RunSummarySerializer.Meta.fields + ["results"]
        read_only_fields = fields


class RunPagination(PageNumberPagination):
    page_size = 25


class FinancialIntelligenceViewSet(
    FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialIntelligenceRun.objects.all()
    pagination_class = RunPagination

    def get_serializer_class(self):
        if self.action == "create":
            return RunParameters
        return RunSummarySerializer if self.action == "list" else RunSerializer

    def get_queryset(self):
        parameters = EngagementFilter(data=self.request.query_params)
        parameters.is_valid(raise_exception=True)
        queryset = super().get_queryset()
        engagement = parameters.validated_data.get("engagement")
        if engagement:
            queryset = queryset.filter(engagement_id=engagement)
        if self.action == "list":
            queryset = queryset.defer("results")
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        run = create_intelligence_run(parameters.validated_data, request.user)
        return Response(RunSerializer(run).data, status=201)
