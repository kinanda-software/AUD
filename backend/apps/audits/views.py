from rest_framework import viewsets

from .models import Audit
from .serializers import AuditSerializer


class AuditViewSet(viewsets.ModelViewSet):
    queryset = Audit.objects.all().order_by("-created_at")
    serializer_class = AuditSerializer