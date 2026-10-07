from decimal import Decimal

from rest_framework import serializers

from .accounting_controls import locked_policy
from .inventory_services import check_inventory_accounts, stock_state
from .models import ChartOfAccount, InventoryItem, InventoryMovement


class InventoryItemSerializer(serializers.ModelSerializer):
    state = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = ["id", "engagement", "sku", "name", "unit", "inventory_account", "expense_account", "is_active", "state"]

    def get_state(self, obj):
        return {
            key: format(value, ".4f" if key == "quantity" else ".6f" if key == "average_unit_cost" else ".2f")
            if isinstance(value, Decimal) else value
            for key, value in stock_state(obj).items()
        }

    def validate(self, attrs):
        values = {
            field: attrs.get(field, getattr(self.instance, field, None))
            for field in ("engagement", "sku", "inventory_account", "expense_account")
        }
        item = InventoryItem(**values)
        policy = locked_policy(item.engagement_id)
        if not policy.base_currency:
            raise serializers.ValidationError("Configure the base currency before creating stock items.")
        check_inventory_accounts(item)
        if self.instance:
            if item.engagement_id != self.instance.engagement_id:
                raise serializers.ValidationError("Stock items cannot move between engagements.")
            if self.instance.movements.exists():
                for field in ("sku", "unit", "inventory_account", "expense_account"):
                    if attrs.get(field, getattr(self.instance, field)) != getattr(self.instance, field):
                        raise serializers.ValidationError("Used item codes, units and account mappings are immutable.")
        duplicates = InventoryItem.objects.filter(engagement_id=item.engagement_id, sku=item.sku)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError({"sku": "This SKU already exists in this engagement."})
        return attrs


class MovementParameters(serializers.Serializer):
    kind = serializers.ChoiceField(choices=InventoryMovement.Kind.choices)
    transaction_date = serializers.DateField()
    quantity = serializers.DecimalField(max_digits=18, decimal_places=4, min_value=Decimal("0.0001"))
    total_value = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"), required=False)
    offset_account = serializers.PrimaryKeyRelatedField(queryset=ChartOfAccount.objects.all(), required=False, allow_null=True)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    reason = serializers.CharField(max_length=500)
    register_only = serializers.BooleanField(default=False)
    confirm_existing_balance = serializers.BooleanField(default=False)


class InventoryMovementSerializer(serializers.ModelSerializer):
    journal_status = serializers.SerializerMethodField()
    sku = serializers.CharField(source="item.sku", read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            "id", "item", "sku", "kind", "transaction_date", "quantity", "value",
            "quantity_before", "quantity_after", "value_before", "value_after",
            "offset_account", "reference", "reason", "register_only", "journal", "journal_status", "created_at",
        ]
        read_only_fields = fields

    def get_journal_status(self, obj):
        return obj.journal.status if obj.journal_id else "posted"
