from django.urls import path

from .views import (
    delete_notification,
    mark_all_notifications_read,
    mark_notification_read,
    notification_list,
)


urlpatterns = [
    path(
        "notifications/",
        notification_list,
        name="notification-list",
    ),
    path(
        "notifications/<int:notification_id>/read/",
        mark_notification_read,
        name="notification-read",
    ),
    path(
        "notifications/read-all/",
        mark_all_notifications_read,
        name="notification-read-all",
    ),
    path(
        "notifications/<int:notification_id>/",
        delete_notification,
        name="notification-delete",
    ),
]