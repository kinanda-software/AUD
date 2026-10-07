from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .accounting_controls import FinancialControlMixin, locked_policy, require_manager
from .asset_serializers import (
    DepreciationParameters, DisposalParameters, FixedAssetEventSerializer, FixedAssetSerializer,
)
from .asset_services import prepare_acquisition, prepare_depreciation, prepare_disposal
from .models import FixedAsset, FixedAssetEvent
from .subledger_views import EngagementFilterMixin, cancel_source


class FixedAssetViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ModelViewSet):
    queryset = FixedAsset.objects.select_related(
        "acquisition_journal", "asset_account", "accumulated_account", "expense_account", "funding_account",
    ).prefetch_related("events__journal")
    serializer_class = FixedAssetSerializer

    def perform_create(self, serializer):
        require_manager(self.request.user)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        require_manager(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user)
        if instance.registration_mode == "existing" or instance.acquisition_journal_id:
            raise ValidationError("Only unprepared new-acquisition drafts can be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def acquire(self, request, pk=None):
        require_manager(request.user)
        asset = prepare_acquisition(self.get_object(), request.user)
        return Response(self.get_serializer(asset).data)

    @action(detail=True, methods=["post"])
    def depreciate(self, request, pk=None):
        asset = self.get_object()
        parameters = DepreciationParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        event = prepare_depreciation(asset, parameters.validated_data["period_end"], request.user)
        return Response(FixedAssetEventSerializer(event).data, status=201)

    @action(detail=True, methods=["post"])
    def dispose(self, request, pk=None):
        require_manager(request.user)
        asset = self.get_object()
        parameters = DisposalParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        event = prepare_disposal(asset, parameters.validated_data, request.user)
        return Response(FixedAssetEventSerializer(event).data, status=201)

    @action(detail=True, methods=["post"], url_path="cancel-acquisition")
    def cancel_acquisition(self, request, pk=None):
        asset = self.get_object()
        if not asset.acquisition_journal_id:
            raise ValidationError("This asset has no acquisition journal.")
        asset.acquisition_journal = cancel_source(asset.acquisition_journal, request.user)
        return Response(self.get_serializer(asset).data)


class FixedAssetEventViewSet(FinancialControlMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FixedAssetEvent.objects.select_related("journal", "asset")
    serializer_class = FixedAssetEventSerializer

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        event = self.get_object()
        locked_policy(event.asset.engagement_id)
        event = FixedAssetEvent.objects.select_for_update().select_related("journal").get(pk=event.pk)
        event.journal = cancel_source(event.journal, request.user)
        return Response(self.get_serializer(event).data)
