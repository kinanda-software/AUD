from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.engagements.models import Engagement

from .models import QualityMonitoringWorkpaper
from .serializers import QualityMonitoringWorkpaperSerializer


class QualityMonitoringWorkpaperView(APIView):
    """
    API endpoint for ISQM 1 Phase 4.7
    Quality Monitoring & Root Cause Analysis.

    Expected URL:
        /api/quality-monitorings/<engagement_id>/

    Authentication:
        Authorization: Token <token>
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_engagement(self, engagement_id):
        return get_object_or_404(
            Engagement,
            pk=engagement_id,
        )

    def get_workpaper(self, engagement_id):
        return (
            QualityMonitoringWorkpaper.objects
            .filter(
                engagement_id=engagement_id
            )
            .prefetch_related(
                "findings",
                "remediation_actions",
            )
            .first()
        )

    def serialize_workpaper(self, workpaper):
        """
        Return serialized workpaper data.
        """
        return QualityMonitoringWorkpaperSerializer(
            workpaper
        ).data

    # ==========================================================
    # GET
    # ==========================================================

    def get(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        # No workpaper yet
        if workpaper is None:
            return Response(
                {
                    "exists": False,
                    "engagement": engagement.id,
                    "workpaper": None,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "exists": True,
                "engagement": engagement.id,
                "workpaper": self.serialize_workpaper(
                    workpaper
                ),
            },
            status=status.HTTP_200_OK,
        )

    # ==========================================================
    # POST
    # ==========================================================

    def post(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        existing = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()

        # Always use the engagement from the URL.
        data["engagement"] = engagement.id

        # ------------------------------------------------------
        # Update existing workpaper
        # ------------------------------------------------------

        if existing is not None:
            serializer = QualityMonitoringWorkpaperSerializer(
                existing,
                data=data,
                partial=True,
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    self.serialize_workpaper(
                        workpaper
                    ),
                    status=status.HTTP_200_OK,
                )

            return Response(
                {
                    "success": False,
                    "message": "Unable to update Quality Monitoring workpaper.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Create new workpaper
        # ------------------------------------------------------

        serializer = QualityMonitoringWorkpaperSerializer(
            data=data
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                self.serialize_workpaper(
                    workpaper
                ),
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "success": False,
                "message": "Unable to create Quality Monitoring workpaper.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ==========================================================
    # PUT
    # ==========================================================

    def put(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()

        # Always force the correct engagement.
        data["engagement"] = engagement.id

        # ------------------------------------------------------
        # Create if it does not exist
        # ------------------------------------------------------

        if workpaper is None:
            serializer = QualityMonitoringWorkpaperSerializer(
                data=data
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    self.serialize_workpaper(
                        workpaper
                    ),
                    status=status.HTTP_201_CREATED,
                )

            return Response(
                {
                    "success": False,
                    "message": "Unable to create Quality Monitoring workpaper.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Update existing workpaper
        # ------------------------------------------------------

        serializer = QualityMonitoringWorkpaperSerializer(
            workpaper,
            data=data,
            partial=True,
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                self.serialize_workpaper(
                    workpaper
                ),
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": False,
                "message": "Unable to update Quality Monitoring workpaper.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ==========================================================
    # PATCH
    # ==========================================================

    def patch(self, request, engagement_id):
        engagement = self.get_engagement(
            engagement_id
        )

        workpaper = self.get_workpaper(
            engagement.id
        )

        data = request.data.copy()

        # Always force the correct engagement.
        data["engagement"] = engagement.id

        # ------------------------------------------------------
        # Create if it does not exist
        # ------------------------------------------------------

        if workpaper is None:
            serializer = QualityMonitoringWorkpaperSerializer(
                data=data
            )

            if serializer.is_valid():
                workpaper = serializer.save()

                return Response(
                    self.serialize_workpaper(
                        workpaper
                    ),
                    status=status.HTTP_201_CREATED,
                )

            return Response(
                {
                    "success": False,
                    "message": "Unable to create Quality Monitoring workpaper.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ------------------------------------------------------
        # Update existing workpaper
        # ------------------------------------------------------

        serializer = QualityMonitoringWorkpaperSerializer(
            workpaper,
            data=data,
            partial=True,
        )

        if serializer.is_valid():
            workpaper = serializer.save()

            return Response(
                self.serialize_workpaper(
                    workpaper
                ),
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": False,
                "message": "Unable to update Quality Monitoring workpaper.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )