from rest_framework import serializers

from .models import EvidenceFile


class EvidenceFileSerializer(serializers.ModelSerializer):
    engagement_code = serializers.CharField(
        source="engagement.engagement_code",
        read_only=True,
    )

    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
    )

    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EvidenceFile
        fields = "__all__"
        read_only_fields = (
            "original_filename",
            "content_type",
            "file_size",
            "uploaded_by",
            "uploaded_at",
        )

    def get_file_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        url = obj.file.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def validate_file(self, value):
        max_size = 25 * 1024 * 1024  # 25 MB
        if value.size > max_size:
            raise serializers.ValidationError(
                "Evidence files must be 25 MB or smaller."
            )
        return value
