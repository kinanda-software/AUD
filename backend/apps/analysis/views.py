import random

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.financials.models import GeneralLedger

from .models import SampleSelection
from .serializers import (
    AgingQuerySerializer,
    AnalysisQuerySerializer,
    SampleRequestSerializer,
    SampleSelectionSerializer,
)
from .services import (
    _entry_amount,
    _posted_ledger,
    build_aging,
    build_benford_analysis,
    build_stratification,
    draw_sample,
)


class BenfordAnalysisView(APIView):
    """
    GET /api/analysis/benford/?engagement=<id>[&account=<id>]

    First-digit Benford analysis over the posted ledger.
    """

    def get(self, request):
        query = AnalysisQuerySerializer(
            data=request.query_params
        )
        query.is_valid(raise_exception=True)
        result = build_benford_analysis(
            query.validated_data["engagement"],
            query.validated_data.get("account"),
        )
        return Response(result)


class StratificationView(APIView):
    """
    GET /api/analysis/stratification/?engagement=<id>[&account=<id>]

    Amount-band population profile with top-10 concentration.
    """

    def get(self, request):
        query = AnalysisQuerySerializer(
            data=request.query_params
        )
        query.is_valid(raise_exception=True)
        result = build_stratification(
            query.validated_data["engagement"],
            query.validated_data.get("account"),
        )
        return Response(result)


class AgingAnalysisView(APIView):
    """
    GET /api/analysis/aging/?engagement=<id>&side=receivable|payable&as_of=YYYY-MM-DD
    """

    def get(self, request):
        query = AgingQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        result = build_aging(
            query.validated_data["engagement"],
            query.validated_data["as_of"],
            query.validated_data["side"],
        )
        return Response(result)


class SampleSelectionViewSet(viewsets.ModelViewSet):
    """
    Draw, list, and inspect documented audit samples.
    Creation draws the sample and stores it with its seed
    for reproducibility.
    """

    queryset = (
        SampleSelection.objects
        .select_related("engagement", "account", "created_by")
        .all()
    )

    serializer_class = SampleSelectionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        engagement_id = self.request.query_params.get(
            "engagement"
        )
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )
        return queryset

    def create(self, request, *args, **kwargs):
        payload = SampleRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        population = list(
            _posted_ledger(
                data["engagement"],
                data.get("account"),
            )
        )
        if not population:
            raise ValidationError(
                "The posted ledger population is empty for this "
                "engagement (and account, if filtered)."
            )
        if data["sample_size"] > len(population):
            raise ValidationError({
                "sample_size": (
                    f"Sample size cannot exceed the population "
                    f"of {len(population)} entries."
                ),
            })

        seed = data.get("seed")
        if seed is None:
            seed = random.SystemRandom().randint(1, 2**31 - 1)

        items, interval = draw_sample(
            population,
            data["method"],
            data["sample_size"],
            seed,
        )

        selection = SampleSelection.objects.create(
            engagement_id=data["engagement"],
            account_id=data.get("account"),
            name=data["name"],
            method=data["method"],
            population_size=len(population),
            population_value=sum(
                (_entry_amount(entry) for entry in population),
            ),
            sample_size=len(items),
            seed=seed,
            interval=interval,
            items=items,
            created_by=request.user,
        )

        serializer = self.get_serializer(selection)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
