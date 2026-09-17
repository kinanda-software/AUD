from rest_framework import viewsets
from .models import CompletionReview
from .serializers import CompletionReviewSerializer


class CompletionReviewViewSet(viewsets.ModelViewSet):
    queryset = CompletionReview.objects.select_related(
        "engagement",
        "completed_by",
    ).all()

    serializer_class = CompletionReviewSerializer

    def perform_update(self, serializer):
        serializer.save()

    def perform_create(self, serializer):
        serializer.save()
