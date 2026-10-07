import { apiRequest } from "@/lib/api";

export type AuditNotification = {
  id: number;
  title: string;
  message: string;
  notification_type: "review" | "audit" | "deadline" | "system";
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(signal?: AbortSignal): Promise<AuditNotification[]> {
  const result = await apiRequest<AuditNotification[]>("/notifications/", {
    cache: "no-store", signal,
  });
  if (!Array.isArray(result)) {
    throw new Error("Invalid notification list response.");
  }
  return result;
}

export async function markNotificationRead(id: number): Promise<AuditNotification> {
  const result = await apiRequest<{ notification: AuditNotification }>(
    `/notifications/${id}/read/`, { method: "POST" },
  );
  if (!result?.notification || result.notification.id !== id
    || result.notification.is_read !== true) {
    throw new Error("The server did not confirm the notification as read.");
  }
  return result.notification;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/notifications/read-all/", { method: "POST" });
}

export async function deleteNotification(id: number): Promise<void> {
  await apiRequest(`/notifications/${id}/`, { method: "DELETE" });
}
