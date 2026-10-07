from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .accounting_controls import FinancialControlMixin, locked_policy, require_manager
from .inventory_serializers import InventoryItemSerializer, InventoryMovementSerializer, MovementParameters
from .inventory_services import prepare_movement
from .models import InventoryItem, InventoryMovement
from .subledger_views import EngagementFilter, EngagementFilterMixin, cancel_source


class InventoryItemViewSet(FinancialControlMixin, EngagementFilterMixin, viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related("inventory_account", "expense_account")
    serializer_class = InventoryItemSerializer

    def perform_create(self, serializer):
        require_manager(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        require_manager(self.request.user)
        serializer.save()

    def perform_destroy(self, instance):
        require_manager(self.request.user)
        if instance.movements.exists():
            raise ValidationError("Used stock items cannot be deleted. Deactivate the item instead.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        item = self.get_object()
        parameters = MovementParameters(data=request.data)
        parameters.is_valid(raise_exception=True)
        movement = prepare_movement(item, parameters.validated_data, request.user)
        return Response(InventoryMovementSerializer(movement).data, status=201)


class InventoryMovementViewSet(FinancialControlMixin, viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related("item", "journal")
    serializer_class = InventoryMovementSerializer

    def get_queryset(self):
        parameters = EngagementFilter(data=self.request.query_params)
        parameters.is_valid(raise_exception=True)
        queryset = super().get_queryset()
        engagement = parameters.validated_data.get("engagement")
        if engagement:
            queryset = queryset.filter(item__engagement_id=engagement)
        return queryset

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        movement = self.get_object()
        locked_policy(movement.item.engagement_id)
        movement = InventoryMovement.objects.select_for_update(of=("self",)).select_related("journal").get(pk=movement.pk)
        if not movement.journal_id:
            raise ValidationError("Confirmed register-only opening stock cannot be cancelled.")
        movement.journal = cancel_source(movement.journal, request.user)
        return Response(self.get_serializer(movement).data)
