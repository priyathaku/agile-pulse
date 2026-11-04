import { apiClient } from "./client";
import { NotificationItem, PaginatedResult } from "../types";

export const notificationsApi = {
  list: (unreadOnly: boolean = false) =>
    apiClient<PaginatedResult<NotificationItem>>(
      `/notifications?unread_only=${unreadOnly}`,
    ),

  markRead: (id: number) =>
    apiClient<NotificationItem>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    apiClient<{ message: string; count: number }>(
      "/notifications/mark-all-read",
      {
        method: "POST",
      },
    ),
};
