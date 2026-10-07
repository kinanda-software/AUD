import hashlib

from django.db import transaction
from rest_framework import serializers

from .models import (
    BankStatement,
    BankStatementLine,
    FinancialDimension,
    FinancialAuditEvent,
    FinancialBudget,
    FinancialBudgetLine,
)


class FinancialDimensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialDimension
        fields = [
            "id", "engagement", "dimension_type", "name", "code",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        engagement = attrs.get(
            "engagement", getattr(self.instance, "engagement", None),
        )
        dimension_type = attrs.get(
            "dimension_type", getattr(self.instance, "dimension_type", None),
        )
        name = attrs.get(
            "name", getattr(self.instance, "name", ""),
        ).strip()
        if not name:
            raise serializers.ValidationError({"name": "Name cannot be blank."})
        if engagement and dimension_type:
            duplicates = FinancialDimension.objects.filter(
                engagement=engagement,
                dimension_type=dimension_type,
                name__iexact=name,
            )
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError({
                    "name": "This name already exists for the selected dimension type and engagement."
                })
        if "name" in attrs:
            attrs["name"] = name
        return attrs


class FinancialBudgetLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.account_code", read_only=True)
    account_name = serializers.CharField(source="account.account_name", read_only=True)
    account_type = serializers.CharField(source="account.account_type", read_only=True)
    dimensions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=FinancialDimension.objects.all(),
        required=False,
    )
    dimension_values = FinancialDimensionSerializer(
        source="dimensions",
        many=True,
        read_only=True,
    )

    class Meta:
        model = FinancialBudgetLine
        fields = [
            "id", "budget", "account", "account_code", "account_name",
            "account_type", "period", "amount", "dimensions", "dimension_values",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        budget = attrs.get("budget", getattr(self.instance, "budget", None))
        dimensions = attrs.get(
            "dimensions",
            list(self.instance.dimensions.all()) if self.instance else [],
        )
        if len({dimension.pk for dimension in dimensions}) != len(dimensions):
            raise serializers.ValidationError({
                "dimensions": "A dimension value cannot be assigned more than once."
            })
        if budget and any(
            dimension.engagement_id != budget.engagement_id
            for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Every dimension must belong to the budget engagement."
            })
        if "dimensions" in attrs and any(
            not dimension.is_active for dimension in dimensions
        ):
            raise serializers.ValidationError({
                "dimensions": "Inactive dimensions cannot be assigned to a budget line."
            })

        account = attrs.get("account", getattr(self.instance, "account", None))
        period = attrs.get("period", getattr(self.instance, "period", None))
        dimension_ids = ",".join(
            str(dimension.pk)
            for dimension in sorted(dimensions, key=lambda item: item.pk)
        )
        signature = (
            hashlib.sha256(dimension_ids.encode("ascii")).hexdigest()
            if dimension_ids else ""
        )
        if budget and account and period:
            duplicates = FinancialBudgetLine.objects.filter(
                budget=budget,
                account=account,
                period=period,
                dimension_signature=signature,
            )
            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)
            if duplicates.exists():
                raise serializers.ValidationError({
                    "dimensions": "A budget amount already exists for this account, month and dimension combination."
                })
        attrs["dimension_signature"] = signature
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        dimensions = validated_data.pop("dimensions", [])
        instance = FinancialBudgetLine.objects.create(**validated_data)
        instance.dimensions.set(dimensions)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        dimensions = validated_data.pop("dimensions", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if dimensions is not None:
            instance.dimensions.set(dimensions)
        return instance


class FinancialBudgetSerializer(serializers.ModelSerializer):
    lines = FinancialBudgetLineSerializer(many=True, read_only=True)
    fiscal_year = serializers.IntegerField(min_value=1, max_value=9999)

    class Meta:
        model = FinancialBudget
        fields = [
            "id", "engagement", "name", "fiscal_year", "currency", "status",
            "created_by", "approved_by", "approved_at", "lines",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "created_by", "approved_by", "approved_at",
            "created_at", "updated_at",
        ]


class BankStatementLineSerializer(serializers.ModelSerializer):
    matched_entry_reference = serializers.CharField(
        source="matched_entry.reference",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = BankStatementLine
        fields = [
            "id", "statement", "row_number", "transaction_date",
            "description", "reference", "amount", "matched_entry",
            "matched_entry_reference", "matched_by", "matched_at",
        ]
        read_only_fields = fields


class BankStatementSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.account_code", read_only=True)
    account_name = serializers.CharField(source="account.account_name", read_only=True)
    line_count = serializers.SerializerMethodField()
    matched_line_count = serializers.SerializerMethodField()

    def get_line_count(self, obj):
        return obj.lines.count()

    def get_matched_line_count(self, obj):
        return obj.lines.filter(matched_entry__isnull=False).count()

    class Meta:
        model = BankStatement
        fields = [
            "id", "engagement", "account", "account_code", "account_name",
            "currency", "period_start", "period_end", "opening_balance",
            "closing_balance", "book_opening_balance", "status", "created_by",
            "reconciled_by", "reconciled_at", "line_count", "matched_line_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "created_by", "reconciled_by", "reconciled_at",
            "line_count", "matched_line_count", "created_at", "updated_at",
        ]


class FinancialAuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source="actor.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = FinancialAuditEvent
        fields = [
            "id", "engagement", "actor", "actor_name", "action",
            "object_type", "object_id", "details", "created_at",
        ]
        read_only_fields = fields
