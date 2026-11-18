import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi } from '@/shared/api';
import { queryKeys } from '@/shared/api/queryKeys';

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type NotificationType =
  | 'ENROLLMENT_INVITE_JOIN'
  | 'ENROLLMENT'
  | 'COMMENT'
  | 'GRADE_FEEDBACK'
  | 'NEW_CHAPTER'
  | 'REPORT_RESULT'
  | 'SANCTION'
  | 'SYSTEM_ANNOUNCEMENT';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload?: Record<string, any>;
  title: string | null;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  meta: PageMeta;
}

/**
 * List paginated notifications (SCR-NTF-01).
 */
export function useNotificationsQuery(params: ListNotificationsParams = {}) {
  const { unreadOnly = false, page = 1, pageSize = 10 } = params;

  return useQuery({
    queryKey: queryKeys.notifications.list({ unreadOnly, page, pageSize }),
    queryFn: async (): Promise<NotificationListResponse> => {
      const res = await unwrapApi(
        apiClient.GET('/notifications', {
          params: {
            query: {
              unreadOnly,
              page,
              pageSize,
            },
          },
        })
      );
      return (res as any) || { items: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
    },
  });
}

/**
 * Get count of unread notifications.
 */
export function useUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<{ count: number }> => {
      const res = await unwrapApi(apiClient.GET('/notifications/unread-count'));
      return { count: (res as any)?.count ?? 0 };
    },
    enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Mark a single notification as read (FR-NTF-05).
 */
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        apiClient.POST('/notifications/{id}/read', {
          params: { path: { id } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mark all notifications as read.
 */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(apiClient.POST('/notifications/read-all'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Soft delete a notification (FR-NTF-06).
 */
export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/notifications/{id}', {
          params: { path: { id } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
