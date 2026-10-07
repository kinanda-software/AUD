import io

from django.http import FileResponse
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.engagements.models import Engagement
from apps.engagements.access import EngagementAccessMixin, require_engagement_access
from .accounting_controls import FinancialControlMixin, locked_policy
from .evidence_services import (
    checked_evidence_content, create_evidence_link, upload_evidence, validate_upload,
)
from .models import FinancialEvidence, FinancialEvidenceLink


class EvidenceParameters(serializers.Serializer):
    engagement = serializers.PrimaryKeyRelatedField(queryset=Engagement.objects.all())
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    file = serializers.FileField()
    target_kind = serializers.ChoiceField(choices=FinancialEvidenceLink.Target.choices, required=False)
    target_id = serializers.IntegerField(min_value=1, required=False)
    selector = serializers.IntegerField(min_value=-1, default=-1)
    note = serializers.CharField(max_length=1000, required=False)

    def validate(self, attrs):
        target_fields = ("target_kind", "target_id", "note")
        if any(field in attrs for field in target_fields) and not all(field in attrs for field in target_fields):
            raise serializers.ValidationError("Linked uploads require target_kind, target_id and note together.")
        if attrs["selector"] != -1 and "target_kind" not in attrs:
            raise serializers.ValidationError("Selector requires a linked upload target.")
        return attrs

    def validate_file(self, value):
        self.validated_file = validate_upload(value)
        return value


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialEvidence
        fields = [
            "id", "engagement", "title", "description", "filename", "content_type",
            "size", "sha256", "uploaded_by", "uploaded_at",
        ]
        read_only_fields = fields


class LinkParameters(serializers.Serializer):
    evidence = serializers.PrimaryKeyRelatedField(queryset=FinancialEvidence.objects.defer("content"))
    target_kind = serializers.ChoiceField(choices=FinancialEvidenceLink.Target.choices)
    target_id = serializers.IntegerField(min_value=1)
    selector = serializers.IntegerField(min_value=-1, default=-1)
    note = serializers.CharField(max_length=1000)


class EvidenceLinkSerializer(serializers.ModelSerializer):
    evidence_metadata = EvidenceSerializer(source="evidence", read_only=True)

    class Meta:
        model = FinancialEvidenceLink
        fields = [
            "id", "evidence", "evidence_metadata", "target_kind", "target_id", "selector",
            "target_snapshot", "note", "linked_by", "linked_at",
        ]
        read_only_fields = fields


class EvidenceFilter(serializers.Serializer):
    engagement = serializers.IntegerField(min_value=1)
    target_kind = serializers.ChoiceField(choices=FinancialEvidenceLink.Target.choices, required=False)
    target_id = serializers.IntegerField(min_value=1, required=False)
    selector = serializers.IntegerField(min_value=-1, required=False)

    def validate(self, attrs):
        if ("target_kind" in attrs) != ("target_id" in attrs):
            raise serializers.ValidationError("Target filtering requires both target_kind and target_id.")
        if "selector" in attrs and "target_kind" not in attrs:
            raise serializers.ValidationError("Selector filtering requires a target.")
        return attrs


class EvidencePagination(PageNumberPagination):
    page_size = 25


class EvidenceViewSet(
    EngagementAccessMixin, FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialEvidence.objects.defer("content")
    pagination_class = EvidencePagination
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        return EvidenceParameters if self.action == "create" else EvidenceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = EvidenceFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            queryset = queryset.filter(engagement_id=parameters.validated_data["engagement"])
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        require_engagement_access(request.user, parameters.validated_data["engagement"].pk)
        locked_policy(parameters.validated_data["engagement"].pk)
        evidence = upload_evidence(parameters.validated_data, request.user, parameters.validated_file)
        if "target_kind" in parameters.validated_data:
            create_evidence_link(
                {**parameters.validated_data, "evidence": evidence}, request.user,
            )
        return Response(EvidenceSerializer(evidence).data, status=201)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        evidence = self.get_object()
        response = FileResponse(
            io.BytesIO(checked_evidence_content(evidence)), as_attachment=True,
            filename=evidence.filename, content_type="application/octet-stream",
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response


class EvidenceLinkViewSet(
    EngagementAccessMixin, FinancialControlMixin, mixins.CreateModelMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, viewsets.GenericViewSet,
):
    queryset = FinancialEvidenceLink.objects.select_related("evidence").defer("evidence__content")
    engagement_lookup = "evidence__engagement_id"
    pagination_class = EvidencePagination

    def get_serializer_class(self):
        return LinkParameters if self.action == "create" else EvidenceLinkSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list":
            parameters = EvidenceFilter(data=self.request.query_params)
            parameters.is_valid(raise_exception=True)
            data = parameters.validated_data
            queryset = queryset.filter(evidence__engagement_id=data["engagement"])
            for field in ("target_kind", "target_id", "selector"):
                if field in data:
                    queryset = queryset.filter(**{field: data[field]})
        return queryset

    def create(self, request, *args, **kwargs):
        parameters = self.get_serializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        require_engagement_access(request.user, parameters.validated_data["evidence"].engagement_id)
        locked_policy(parameters.validated_data["evidence"].engagement_id)
        link = create_evidence_link(parameters.validated_data, request.user)
        return Response(EvidenceLinkSerializer(link).data, status=201)
