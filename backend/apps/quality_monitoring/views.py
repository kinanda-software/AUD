from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.engagements.models import Engagement

from .models import QualityMonitoringWorkpaper
from .serializers import QualityMonitoringWorkpaperSerializer


class QualityMonitoringWorkpaperView(APIView):

    def get_engagement(self, engagement_id):
        return get_object_or_404(
            Engagement,
            pk=engagement_id,
        )

    def get_workpaper(self, engagement_id):
        return (
            QualityMonitoringWorkpaper.objects
            .filter(engagement_id=engagement_id)
            .prefetch_related(
                "findings",
                "remediation_actions",
            )
            .first()
        )

    def get(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        if workpaper is None:
            return Response(
                {
                    "exists": False,
                    "engagement": engagement.id,
                    "workpaper": None,
                },
                status=status.HTTP_200_OK,
            )

        serializer = QualityMonitoringWorkpaperSerializer(
            workpaper
        )

        return Response(
            {
                "exists": True,
                "engagement": engagement.id,
                "workpaper": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        existing = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()
        data["engagement"] = engagement.id

        if existing is not None:
            serializer = QualityMonitoringWorkpaperSerializer(
                existing,
                data=data,
                partial=True,
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    QualityMonitoringWorkpaperSerializer(
                        workpaper
                    ).data,
                    status=status.HTTP_200_OK,
                )

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QualityMonitoringWorkpaperSerializer(
            data=data
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                QualityMonitoringWorkpaperSerializer(
                    workpaper
                ).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def put(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()
        data["engagement"] = engagement.id

        if workpaper is None:
            serializer = QualityMonitoringWorkpaperSerializer(
                data=data
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    QualityMonitoringWorkpaperSerializer(
                        workpaper
                    ).data,
                    status=status.HTTP_201_CREATED,
                )

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QualityMonitoringWorkpaperSerializer(
            workpaper,
            data=data,
            partial=True,
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                QualityMonitoringWorkpaperSerializer(
                    workpaper
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def patch(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()
        data["engagement"] = engagement.id

        if workpaper is None:
            serializer = QualityMonitoringWorkpaperSerializer(
                data=data
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    QualityMonitoringWorkpaperSerializer(
                        workpaper
                    ).data,
                    status=status.HTTP_201_CREATED,
                )

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QualityMonitoringWorkpaperSerializer(
            workpaper,
            data=data,
            partial=True,
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                QualityMonitoringWorkpaperSerializer(
                    workpaper
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )