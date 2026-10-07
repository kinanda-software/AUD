from django.db.models import Count, OuterRef, Subquery
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .accounting_controls import FinancialControlMixin
from .finding_review_services import REVIEW_STATES, record_finding_review, review_state
from .models import FinancialFindingReview, FinancialIntelligenceRun


class ReviewParameters(serializers.Serializer):
    run = serializers.PrimaryKeyRelatedField(queryset=FinancialIntelligenceRun.objects.defer("results"))
    finding_index = serializers.IntegerField(min_value=0)
    action = serializers.ChoiceField(choices=FinancialFindingReview.Action.choices)
    expected_previous = serializers.IntegerField(min_value=1, allow_null=True)
    outcome = serializers.ChoiceField(choices=FinancialFindingReview.Outcome.choices, required=False)
    conclusion = serializers.CharField(max_length=5000, required=False)
    note = serializers.CharField(max_length=5000)


class ReviewFilter(serializers.Serializer):
    run = serializers.PrimaryKeyRelatedField(queryset=FinancialIntelligenceRun.objects.defer("results"))
    finding_index = serializers.IntegerField(min_value=0, required=False)
    offset = serializers.IntegerField(min_value=0, default=0)

    def validate(self, attrs):
        if "finding_index" in attrs and attrs["finding_index"] >= attrs["run"].finding_count:
            raise serializers.ValidationError({"finding_index": "Select a finding in this saved run."})
        return attrs


class ReviewSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()

    def get_state(self, obj):
        return review_state(obj)

    class Meta:
        model = FinancialFindingReview
        fields = [
            "id", "run", "finding_index", "action", "state", "outcome", "conclusion", "note",
            "evidence_link_ids", "previous", "actor", "actor_identifier", "actor_name", "actor_role", "created_at",
        ]
        read_only_fields = fields


class ReviewPagination(PageNumberPagination):
    page_size = 25


class FindingReviewViewSet(
    FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialFindingReview.objects.all()
    pagination_class = ReviewPagination

    def get_serializer_class(self):
        return ReviewParameters if self.action == "create" else ReviewSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = ReviewFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            data = parameters.validated_data
            queryset = queryset.filter(run=data["run"])
            if "finding_index" in data:
                queryset = queryset.filter(finding_index=data["finding_index"])
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        review = record_finding_review(parameters.validated_data, request.user)
        return Response(ReviewSerializer(review).data, status=201)

    @action(detail=False, methods=["get"])
    def status(self, request):
        parameters = ReviewFilter(data=request.query_params)
        parameters.is_valid(raise_exception=True)
        data = parameters.validated_data
        run = data["run"]
        latest_id = FinancialFindingReview.objects.filter(
            run=run, finding_index=OuterRef("finding_index"),
        ).order_by("-id").values("id")[:1]
        latest = FinancialFindingReview.objects.filter(run=run, pk=Subquery(latest_id))
        counts = {state: 0 for state in ("unreviewed", "reviewed", "signed_off", "returned", "reopened")}
        reviewed_count = 0
        for group in latest.order_by().values("action").annotate(count=Count("id")):
            counts[REVIEW_STATES[group["action"]]] = group["count"]
            reviewed_count += group["count"]
        counts["unreviewed"] = run.finding_count - reviewed_count
        offset = data["offset"]
        stop = min(offset + 25, run.finding_count)
        records = {record.finding_index: record for record in latest.filter(
            finding_index__gte=offset, finding_index__lt=stop,
        )}
        return Response({
            "run": run.pk, "finding_count": run.finding_count, "counts": counts,
            "offset": offset, "next_offset": stop if stop < run.finding_count else None,
            "results": [{
                "finding_index": index, "state": review_state(records.get(index)),
                "latest": ReviewSerializer(records[index]).data if index in records else None,
            } for index in range(offset, stop)],
        })
