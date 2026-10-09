from datetime import date

from rest_framework import serializers

from .models import SampleSelection


class SampleSelectionSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    account_code = serializers.CharField(
        source="account.account_code",
        read_only=True,
    )

    method_label = serializers.CharField(
        source="get_method_display",
        read_only=True,
    )

    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = SampleSelection
        fields = "__all__"
        read_only_fields = (
            "population_size",
            "population_value",
            "interval",
            "items",
            "created_by",
            "created_at",
        )


class SampleRequestSerializer(serializers.Serializer):
    """Payload for drawing a new sample."""

    engagement = serializers.IntegerField()
    name = serializers.CharField(max_length=200)
    method = serializers.ChoiceField(
        choices=("random", "systematic", "mus")
    )
    sample_size = serializers.IntegerField(min_value=1)
    seed = serializers.IntegerField(required=False, allow_null=True)
    account = serializers.IntegerField(required=False, allow_null=True)


class AnalysisQuerySerializer(serializers.Serializer):
    """Shared query params for the read-only analyses."""

    engagement = serializers.IntegerField()
    account = serializers.IntegerField(required=False, allow_null=True)


class AgingQuerySerializer(serializers.Serializer):
    engagement = serializers.IntegerField()
    as_of = serializers.DateField(required=False, default=date.today)
    side = serializers.ChoiceField(
        choices=("receivable", "payable"),
        default="receivable",
    )
