from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from .models import EvidenceFile
from .serializers import EvidenceFileSerializer


class EvidenceFileViewSet(viewsets.ModelViewSet):
    queryset = (
        EvidenceFile.objects
        .select_related("engagement", "uploaded_by")
        .all()
    )

    serializer_class = EvidenceFileSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = super().get_queryset()

        engagement_id = self.request.query_params.get(
            "engagement"
        )
        if engagement_id:
            queryset = queryset.filter(
                engagement_id=engagement_id
            )

        section = self.request.query_params.get("section")
        if section:
            queryset = queryset.filter(
                section=section
            )

        return queryset

    def perform_create(self, serializer):
        upload = self.request.FILES.get("file")
        serializer.save(
            uploaded_by=self.request.user,
            original_filename=(
                upload.name if upload else ""
            ),
            content_type=(
                getattr(upload, "content_type", "") or ""
            ),
            file_size=(
                upload.size if upload else 0
            ),
        )

    def perform_destroy(self, instance):
        # Remove the stored file alongside the record so
        # orphaned uploads do not accumulate on disk.
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()
