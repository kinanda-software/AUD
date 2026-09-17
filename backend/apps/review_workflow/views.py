from rest_framework import viewsets

from .models import ReviewAssignment
from .serializers import ReviewAssignmentSerializer


class ReviewAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ReviewAssignment.objects.select_related(
        "engagement",
        "reviewer",
    ).all()

    serializer_class = ReviewAssignmentSerializer