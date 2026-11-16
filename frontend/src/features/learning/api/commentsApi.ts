import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi } from '@/shared/api';
import { queryKeys } from '@/shared/api/queryKeys';

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CommentAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface CommentDto {
  id: string;
  courseId: string;
  chapterId?: string | null;
  author: CommentAuthor;
  parentCommentId?: string | null;
  content: string;
  isPinned: boolean;
  isDeleted?: boolean;
  editedAt?: string | null;
  createdAt: string;
  replies?: CommentDto[];
}

export interface CommentsSummaryDto {
  totalComments: number;
  rootComments: number;
  pinnedComments: number;
}

export interface ListCommentsParams {
  chapterId?: string;
  page?: number;
  pageSize?: number;
}

export interface CommentListResponse {
  items: CommentDto[];
  meta: PageMeta;
}

export interface CreateCommentPayload {
  content: string;
  chapterId?: string;
  parentCommentId?: string;
}

/**
 * List comments for a course/chapter (FR-LRN-10).
 */
export function useCommentsQuery(
  courseId: string,
  params: ListCommentsParams = {}
) {
  const { chapterId, page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: queryKeys.learning.comments(courseId, { chapterId, page, pageSize }),
    queryFn: async (): Promise<CommentListResponse> => {
      const res = await unwrapApi(
        apiClient.GET('/courses/{courseId}/comments', {
          params: {
            path: { courseId },
            query: {
              chapterId,
              page,
              pageSize,
            },
          },
        })
      );
      return (res as any) || { items: [], meta: { page, pageSize, totalItems: 0, totalPages: 1 } };
    },
    enabled: !!courseId,
  });
}

/**
 * Get comments summary statistics (FR-LRN-10).
 */
export function useCommentsSummaryQuery(courseId: string) {
  return useQuery({
    queryKey: queryKeys.learning.commentsSummary(courseId),
    queryFn: async (): Promise<CommentsSummaryDto> => {
      const res = await unwrapApi(
        apiClient.GET('/courses/{courseId}/comments/summary' as any, {
          params: {
            path: { courseId },
          },
        })
      );
      return (res as any) || { totalComments: 0, rootComments: 0, pinnedComments: 0 };
    },
    enabled: !!courseId,
  });
}

/**
 * Create a new comment or reply (FR-LRN-10, 11).
 */
export function useCreateCommentMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload): Promise<CommentDto> => {
      const res = await unwrapApi(
        apiClient.POST('/courses/{courseId}/comments', {
          params: { path: { courseId } },
          body: payload,
        })
      );
      return res as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', courseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.commentsSummary(courseId) });
    },
  });
}

/**
 * Edit an existing comment (FR-LRN-12).
 */
export function useEditCommentMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
    }: {
      id: string;
      content: string;
    }): Promise<CommentDto> => {
      const res = await unwrapApi(
        apiClient.PATCH('/comments/{id}', {
          params: { path: { id } },
          body: { content },
        })
      );
      return res as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', courseId] });
    },
  });
}

/**
 * Delete a comment (FR-LRN-12).
 */
export function useDeleteCommentMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/comments/{id}', {
          params: { path: { id } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', courseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.commentsSummary(courseId) });
    },
  });
}

/**
 * Pin a comment (FR-LRN-13).
 */
export function usePinCommentMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/comments/{id}/pin', {
          params: { path: { id } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', courseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.commentsSummary(courseId) });
    },
  });
}

/**
 * Unpin a comment (FR-LRN-13).
 */
export function useUnpinCommentMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/comments/{id}/pin', {
          params: { path: { id } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'comments', courseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.commentsSummary(courseId) });
    },
  });
}
