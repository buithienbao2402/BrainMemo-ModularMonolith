import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi, type components } from '@/shared/api';

export type ConversationDto = components['schemas']['ConversationDto'];
export type MessageDto = components['schemas']['MessageDto'];
export type PageMeta = components['schemas']['PageMeta'];

export const messagingQueryKeys = {
  all: ['messaging'] as const,
  conversations: (params?: { courseId?: string; page?: number }) =>
    ['messaging', 'conversations', params ?? {}] as const,
  conversation: (id: string) => ['messaging', 'conversation', id] as const,
  messages: (id: string, page?: number) => ['messaging', 'messages', id, page ?? 1] as const,
  unreadCount: () => ['messaging', 'unreadCount'] as const,
};

export function useOpenConversationMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ConversationDto> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/messages/conversations', {
          params: { path: { courseId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.all });
    },
  });
}

export function useConversationsQuery(params?: {
  courseId?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { courseId, page = 1, pageSize = 20, enabled = true } = params ?? {};
  return useQuery({
    queryKey: messagingQueryKeys.conversations({ courseId, page }),
    queryFn: async (): Promise<{ items: ConversationDto[]; meta: PageMeta }> => {
      const res = await unwrapApi(
        apiClient.GET('/messages/conversations', {
          params: { query: { courseId, page, pageSize } },
        })
      );
      return (res as any) ?? { items: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
    },
    enabled,
    refetchInterval: 10_000,
  });
}

export function useMessagesQuery(conversationId: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: messagingQueryKeys.messages(conversationId, page),
    queryFn: async (): Promise<{ items: MessageDto[]; meta: PageMeta }> => {
      const res = await unwrapApi(
        apiClient.GET('/messages/conversations/{id}/messages', {
          params: { path: { id: conversationId }, query: { page, pageSize } },
        })
      );
      return (res as any) ?? { items: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
    },
    enabled: Boolean(conversationId),
    refetchInterval: 4_000,
  });
}

export function useSendMessageMutation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string): Promise<MessageDto> => {
      return unwrapApi(
        apiClient.POST('/messages/conversations/{id}/messages', {
          params: { path: { id: conversationId } },
          body: { content },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.unreadCount() });
    },
  });
}

export function useMarkConversationReadMutation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await unwrapApi(
        apiClient.PUT('/messages/conversations/{id}/read', {
          params: { path: { id: conversationId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: messagingQueryKeys.unreadCount() });
    },
  });
}

export function useUnreadMessagesCountQuery(enabled = true) {
  return useQuery({
    queryKey: messagingQueryKeys.unreadCount(),
    queryFn: async (): Promise<{ unreadCount: number }> => {
      const res = await unwrapApi(apiClient.GET('/messages/unread-count'));
      return { unreadCount: res?.unreadCount ?? 0 };
    },
    enabled,
    refetchInterval: 15_000,
  });
}
