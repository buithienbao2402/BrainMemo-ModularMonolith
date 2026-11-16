import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi } from '@/shared/api';
import type { PagedListResponse } from '@/features/moderation/types';
import type {
  AdminLockUserRequest,
  AdminUnlockUserRequest,
  AdminUserSummary,
  CreateAnnouncementRequest,
} from '../types';

export const adminQueryKeys = {
  all: ['admin'] as const,
  users: (params?: Record<string, unknown>) => ['admin', 'users', params ?? {}] as const,
  announcements: () => ['admin', 'announcements'] as const,
};

export function useAdminUsers(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: async (): Promise<PagedListResponse<AdminUserSummary>> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/users', {
          params: { query: params },
        }),
      );
    },
  });
}

export function useGrantAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/users/{id}/grant-admin', {
          params: { path: { id: userId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

export function useRevokeAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/users/{id}/revoke-admin', {
          params: { path: { id: userId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

export function useLockUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdminLockUserRequest): Promise<void> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/users/{id}/lock', {
          params: { path: { id: userId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

export function useUnlockUser(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdminUnlockUserRequest): Promise<void> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/users/{id}/unlock', {
          params: { path: { id: userId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAnnouncementRequest): Promise<{ id: string }> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/announcements', {
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.announcements() });
    },
  });
}
