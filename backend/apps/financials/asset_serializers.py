from decimal import Decimal

from rest_framework import serializers

from .accounting_controls import ensure_open, locked_policy
from .asset_services import asset_state, check_asset_accounts, month_end
from .models import ChartOfAccount, FixedAsset, FixedAssetEvent
from .subledger_services import check_account


class FixedAssetEventSerializer(serializers.ModelSerializer):
    journal_status = serializers.CharField(source="journal.status", read_only=True)

    class Meta:
        model = FixedAssetEvent
        fields = ["id", "asset", "kind", "transaction_date", "amount", "journal", "journal_status"]
        read_only_fields = fields


class FixedAssetSerializer(serializers.ModelSerializer):
    cost = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0.01"))
    residual_value = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0"), default=0)
    opening_depreciation = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0"), default=0)
    depreciation_months = serializers.IntegerField(min_value=1, max_value=1200)
    confirm_existing_balances = serializers.BooleanField(write_only=True, default=False)
    acquisition_status = serializers.CharField(source="acquisition_journal.status", read_only=True, default=None)
    state = serializers.SerializerMethodField()
    events = FixedAssetEventSerializer(many=True, read_only=True)

    class Meta:
        model = FixedAsset
        fields = [
            "id", "engagement", "asset_number", "name", "registration_mode", "acquisition_date",
            "depreciation_start", "depreciation_months", "cost", "residual_value",
            "opening_depreciation", "asset_account", "accumulated_account", "expense_account",
            "funding_account", "acquisition_journal", "acquisition_status", "state", "events",
            "confirm_existing_balances", "created_at",
        ]
        read_only_fields = ["id", "acquisition_journal", "created_at"]

    def get_state(self, obj):
        return {
            key: format(value, ".2f") if isinstance(value, Decimal) else value
            for key, value in asset_state(obj).items()
        }

    def validate(self, attrs):
        if self.instance:
            if self.instance.registration_mode == "existing" or self.instance.acquisition_journal_id:
                raise serializers.ValidationError("Registered or prepared assets are immutable.")
            if attrs.get("engagement", self.instance.engagement).pk != self.instance.engagement_id:
                raise serializers.ValidationError("Assets cannot move between engagements.")
        fields = [
            "engagement", "registration_mode", "acquisition_date", "depreciation_start",
            "depreciation_months", "cost", "residual_value", "opening_depreciation",
            "asset_account", "accumulated_account", "expense_account", "funding_account",
        ]
        values = {field: attrs.get(field, getattr(self.instance, field, None)) for field in fields}
        asset = FixedAsset(**values)
        policy = locked_policy(asset.engagement_id)
        number = attrs.get("asset_number", getattr(self.instance, "asset_number", None))
        duplicates = FixedAsset.objects.filter(engagement_id=asset.engagement_id, asset_number=number)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError({"asset_number": "An asset with this number already exists in this engagement."})
        if not policy.base_currency:
            raise serializers.ValidationError("Configure the base currency before registering assets.")
        ensure_open(policy, asset.depreciation_start if asset.registration_mode == "existing" else asset.acquisition_date)
        if asset.depreciation_start.day != 1:
            raise serializers.ValidationError("Depreciation start must be the first day of a month.")
        if asset.depreciation_start < asset.acquisition_date.replace(day=1):
            raise serializers.ValidationError("Depreciation cannot start before the acquisition month.")
        month_end(asset.depreciation_start, asset.depreciation_months - 1)
        basis = asset.cost - asset.residual_value - asset.opening_depreciation
        if basis < 0 or (basis > 0 and basis < Decimal(asset.depreciation_months) / 100):
            raise serializers.ValidationError("Remaining depreciable value must allow at least 0.01 per scheduled month.")
        check_asset_accounts(asset)
        if asset.registration_mode == "existing":
            if asset.acquisition_date >= asset.depreciation_start:
                raise serializers.ValidationError("Existing assets must have been acquired before the opening register month.")
            if not attrs.get("confirm_existing_balances", False):
                raise serializers.ValidationError("Confirm that asset cost and opening depreciation are already recorded in the base-currency ledger.")
            if asset.funding_account_id:
                raise serializers.ValidationError("Register-only assets do not use a funding account.")
        else:
            if asset.opening_depreciation:
                raise serializers.ValidationError("New acquisitions cannot have opening depreciation.")
            if not asset.funding_account_id:
                raise serializers.ValidationError("New acquisitions require a funding account.")
            check_account(asset.funding_account, asset.engagement_id, ("asset", "liability", "equity"))
            if asset.funding_account_id in (asset.asset_account_id, asset.accumulated_account_id):
                raise serializers.ValidationError("Funding must use a different account from cost and accumulated depreciation.")
        attrs.pop("confirm_existing_balances", None)
        return attrs


class DepreciationParameters(serializers.Serializer):
    period_end = serializers.DateField()


class DisposalParameters(serializers.Serializer):
    transaction_date = serializers.DateField()
    proceeds = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=Decimal("0"))
    bank_account = serializers.PrimaryKeyRelatedField(queryset=ChartOfAccount.objects.all(), required=False, allow_null=True)
    gain_loss_account = serializers.PrimaryKeyRelatedField(queryset=ChartOfAccount.objects.all(), required=False, allow_null=True)
