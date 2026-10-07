from decimal import Decimal

from rest_framework import serializers


class FinancialAnalysisParametersSerializer(serializers.Serializer):
    comparison_id = serializers.IntegerField(required=False, min_value=1)
    amount_threshold = serializers.DecimalField(
        max_digits=18,
        decimal_places=2,
        min_value=Decimal("0.00"),
        default=Decimal("0.00"),
    )
    percent_threshold = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        min_value=Decimal("0.00"),
        default=Decimal("25.00"),
    )
    reconcile_ledger = serializers.BooleanField(default=False)
