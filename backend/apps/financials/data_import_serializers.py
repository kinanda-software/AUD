import json

from rest_framework import serializers

from apps.engagements.models import Engagement
from .models import FinancialAccountMapping, FinancialDataImport


class FinancialDataImportCreateSerializer(serializers.Serializer):
    engagement = serializers.PrimaryKeyRelatedField(queryset=Engagement.objects.all())
    source_system = serializers.CharField(max_length=100)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    currency = serializers.CharField(max_length=10)
    column_mapping = serializers.JSONField(required=False)
    file = serializers.FileField(required=False)
    rows = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=False,
        max_length=10000,
    )

    def to_internal_value(self, data):
        mapping = data.get("column_mapping")
        if isinstance(mapping, str):
            try:
                data = {key: data.get(key) for key in data}
                data["column_mapping"] = json.loads(mapping)
            except json.JSONDecodeError as error:
                raise serializers.ValidationError({
                    "column_mapping": "Provide a valid JSON object."
                }) from error
        return super().to_internal_value(data)

    def validate(self, attrs):
        if attrs["period_start"] > attrs["period_end"]:
            raise serializers.ValidationError({"period_end": "Period end must not be before period start."})
        if bool(attrs.get("file")) == bool(attrs.get("rows")):
            raise serializers.ValidationError("Provide exactly one source: a CSV/XLSX file or JSON rows.")
        if not attrs["currency"].strip():
            raise serializers.ValidationError({"currency": "Currency is required."})
        mapping = attrs.get("column_mapping") or {}
        allowed = {"account_code", "account_name", "debit", "credit"}
        if not isinstance(mapping, dict) or set(mapping) - allowed:
            raise serializers.ValidationError({
                "column_mapping": "Map only account_code, account_name, debit, and credit."
            })
        if any(not isinstance(value, str) or not value.strip() for value in mapping.values()):
            raise serializers.ValidationError({"column_mapping": "Column names must be non-empty strings."})
        attrs["column_mapping"] = {key: value.strip() for key, value in mapping.items()}
        attrs["source_system"] = attrs["source_system"].strip()
        attrs["currency"] = attrs["currency"].strip().upper()
        return attrs


class FinancialDataImportSerializer(serializers.ModelSerializer):
    preview_rows = serializers.SerializerMethodField()
    validation_error_count = serializers.SerializerMethodField()
    trial_balance_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = FinancialDataImport
        fields = [
            "id", "engagement", "source_system", "source_name", "source_format",
            "source_fingerprint", "period_start", "period_end", "currency",
            "column_mapping", "row_count", "total_debit", "total_credit", "status",
            "validation_errors", "validation_error_count", "preview_rows", "trial_balance_id",
            "created_by", "created_at", "imported_at",
        ]
        read_only_fields = fields

    def get_preview_rows(self, obj):
        return obj.rows[:100]

    def get_validation_error_count(self, obj):
        return len(obj.validation_errors)


class FinancialAccountMappingSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.account_code", read_only=True)
    account_name = serializers.CharField(source="account.account_name", read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = FinancialAccountMapping
        fields = [
            "id", "engagement", "source_system", "external_code", "account",
            "account_code", "account_name", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "account_code", "account_name"]

    def validate(self, attrs):
        engagement = attrs.get("engagement", getattr(self.instance, "engagement", None))
        account = attrs.get("account", getattr(self.instance, "account", None))
        if engagement and account and account.engagement_id != engagement.pk:
            raise serializers.ValidationError({"account": "Mapped account must belong to the selected engagement."})
        return attrs

    def validate_external_code(self, value):
        if not value.strip():
            raise serializers.ValidationError("External account code cannot be blank.")
        return value.strip()

    def validate_source_system(self, value):
        if not value.strip():
            raise serializers.ValidationError("Source system cannot be blank.")
        return value.strip()
