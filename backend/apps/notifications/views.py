from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    notifications = Notification.objects.filter(
        recipient=request.user
    )

    serializer = NotificationSerializer(
        notifications,
        many=True,
    )

    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user,
        )
    except Notification.DoesNotExist:
        return Response(
            {"error": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notification.is_read = True
    notification.save(update_fields=["is_read"])

    return Response(
        {
            "message": "Notification marked as read.",
            "notification": NotificationSerializer(
                notification
            ).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(
        recipient=request.user,
        is_read=False,
    ).update(is_read=True)

    return Response(
        {
            "message": "All notifications marked as read."
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user,
        )
    except Notification.DoesNotExist:
        return Response(
            {"error": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notification.delete()

    return Response(
        {
            "message": "Notification deleted."
        }
    )