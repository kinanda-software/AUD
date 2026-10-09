from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .accounting_controls import FinancialControlMixin, require_manager
from .data_import_serializers import (
    FinancialAccountMappingSerializer,
    FinancialDataImportCreateSerializer,
    FinancialDataImportSerializer,
)
from .data_import_services import commit_data_import, create_data_import
from .models import FinancialAccountMapping, FinancialDataImport


class FinancialDataImportViewSet(
    FinancialControlMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = FinancialDataImport.objects.select_related("engagement", "created_by", "trial_balance")
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement = self.request.query_params.get("engagement")
        return queryset.filter(engagement_id=engagement) if engagement else queryset

    def get_serializer_class(self):
        return FinancialDataImportCreateSerializer if self.action == "create" else FinancialDataImportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        imported = create_data_import(serializer.validated_data, request.user)
        return Response(FinancialDataImportSerializer(imported).data, status=201)

    @action(detail=True, methods=["post"], url_path="commit")
    def commit(self, request, pk=None):
        imported = self.get_object()
        trial_balance = commit_data_import(imported, request.user)
        imported.refresh_from_db()
        response = FinancialDataImportSerializer(imported).data
        response["trial_balance_id"] = trial_balance.pk
        return Response(response, status=201)


class FinancialAccountMappingViewSet(FinancialControlMixin, viewsets.ModelViewSet):
    serializer_class = FinancialAccountMappingSerializer
    queryset = FinancialAccountMapping.objects.select_related("engagement", "account", "created_by")

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement = self.request.query_params.get("engagement")
        source_system = self.request.query_params.get("source_system")
        if engagement:
            queryset = queryset.filter(engagement_id=engagement)
        if source_system:
            queryset = queryset.filter(source_system__iexact=source_system)
        return queryset

    def perform_create(self, serializer):
        require_manager(self.request.user)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        require_manager(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user)
        instance.delete()
