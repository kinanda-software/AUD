from django.db.models import CharField, Count, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.engagements.models import Engagement
from .accounting_controls import FinancialControlMixin
from .models import FinancialPBCEvent, FinancialPBCRequest
from .pbc_services import PBC_STATES, create_pbc_request, pbc_state, record_pbc_event


class PBCParameters(serializers.Serializer):
    engagement = serializers.PrimaryKeyRelatedField(queryset=Engagement.objects.all())
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=5000)
    requested_from = serializers.CharField(max_length=200)
    responsible_name = serializers.CharField(max_length=200)
    due_date = serializers.DateField()
    priority = serializers.ChoiceField(choices=("normal", "high", "low"), default="normal")


class PBCFilter(serializers.Serializer):
    engagement = serializers.IntegerField(min_value=1)
    state = serializers.ChoiceField(choices=("open", "submitted", "accepted", "returned", "cancelled"), required=False)
    overdue = serializers.BooleanField(required=False, default=None, allow_null=True)


class PBCEventParameters(serializers.Serializer):
    request = serializers.PrimaryKeyRelatedField(queryset=FinancialPBCRequest.objects.all())
    action = serializers.ChoiceField(choices=FinancialPBCEvent.Action.choices)
    expected_previous = serializers.IntegerField(min_value=1, allow_null=True)
    note = serializers.CharField(max_length=5000)
    evidence_link_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False, max_length=100, required=False,
    )


class PBCEventSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()

    def get_state(self, obj):
        return pbc_state(obj)

    class Meta:
        model = FinancialPBCEvent
        fields = [
            "id", "request", "action", "state", "note", "evidence_link_ids", "previous",
            "actor", "actor_identifier", "actor_name", "actor_role", "created_at",
        ]
        read_only_fields = fields


class PBCSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    latest_event = serializers.SerializerMethodField()

    def get_state(self, obj):
        return PBC_STATES[obj.latest_action] if obj.latest_action else "open"

    def get_overdue(self, obj):
        return obj.due_date < timezone.localdate() and self.get_state(obj) not in ("accepted", "cancelled")

    def get_latest_event(self, obj):
        if not obj.latest_id:
            return None
        return obj.latest_id

    class Meta:
        model = FinancialPBCRequest
        fields = [
            "id", "engagement", "title", "description", "requested_from", "responsible_name",
            "due_date", "priority", "created_by", "created_at", "state", "overdue", "latest_event",
        ]
        read_only_fields = fields


def pbc_queryset():
    latest = FinancialPBCEvent.objects.filter(request_id=OuterRef("pk")).order_by("-id")
    return FinancialPBCRequest.objects.annotate(
        latest_action=Coalesce(Subquery(latest.values("action")[:1]), Value(""), output_field=CharField()),
        latest_id=Subquery(latest.values("id")[:1]),
    )


class PBCPagination(PageNumberPagination):
    page_size = 25


class PBCRequestViewSet(
    FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialPBCRequest.objects.all()
    pagination_class = PBCPagination

    def get_serializer_class(self):
        return PBCParameters if self.action == "create" else PBCSerializer

    def get_queryset(self):
        queryset = pbc_queryset()
        if self.action in ("list", "summary"):
            parameters = PBCFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            data = parameters.validated_data
            queryset = queryset.filter(engagement_id=data["engagement"])
            if "state" in data:
                actions = [key for key, value in PBC_STATES.items() if value == data["state"]]
                if data["state"] == "open":
                    actions.append("")
                queryset = queryset.filter(latest_action__in=actions)
            if data["overdue"] is not None:
                overdue = queryset.filter(due_date__lt=timezone.localdate()).exclude(latest_action__in=("accept", "cancel"))
                queryset = overdue if data["overdue"] else queryset.exclude(pk__in=overdue.values("pk"))
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        record = create_pbc_request(parameters.validated_data, request.user)
        return Response(PBCSerializer(pbc_queryset().get(pk=record.pk)).data, status=201)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = self.get_queryset()
        counts = {state: 0 for state in ("open", "submitted", "accepted", "returned", "cancelled")}
        for group in queryset.order_by().values("latest_action").annotate(count=Count("id")):
            state = PBC_STATES[group["latest_action"]] if group["latest_action"] else "open"
            counts[state] += group["count"]
        return Response({
            "counts": counts, "total": sum(counts.values()),
            "overdue": queryset.filter(due_date__lt=timezone.localdate()).exclude(latest_action__in=("accept", "cancel")).count(),
            "as_of": timezone.localdate(),
        })


class PBCEventFilter(serializers.Serializer):
    request = serializers.PrimaryKeyRelatedField(queryset=FinancialPBCRequest.objects.all())


class PBCEventViewSet(
    FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialPBCEvent.objects.all()
    pagination_class = PBCPagination

    def get_serializer_class(self):
        return PBCEventParameters if self.action == "create" else PBCEventSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = PBCEventFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            queryset = queryset.filter(request=parameters.validated_data["request"])
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        event = record_pbc_event(parameters.validated_data, request.user)
        return Response(PBCEventSerializer(event).data, status=201)
