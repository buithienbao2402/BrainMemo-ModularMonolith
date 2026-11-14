import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  queryKeys,
  unwrapApi,
  uploadFileToStorage,
  type components,
} from '@/shared/api';

export type ChapterSummary = components['schemas']['ChapterSummary'];
export type ChapterDetail = components['schemas']['ChapterDetail'];
export type SaveChapterRequest = components['schemas']['SaveChapterRequest'];
export type BlockDto = components['schemas']['BlockDto'];
export type BlockType = components['schemas']['BlockType'];
export type ChapterVersionDto = components['schemas']['ChapterVersionDto'];
export type ResourceDto = components['schemas']['ResourceDto'];
export type QuizConfig = components['schemas']['QuizConfig'];

export type CreateChapterRequest = {
  title: string;
  description?: string;
};

export type CreateResourceRequest = {
  uploadKey: string;
  originalFilename: string;
};

/**
 * List chapters of a course (FR-CNT-01).
 * Course owner receives all chapters (draft & published), others get published only.
 */
export function useChaptersQuery(courseId: string) {
  return useQuery({
    queryKey: queryKeys.content.chapters(courseId),
    queryFn: async (): Promise<ChapterSummary[]> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/chapters', {
          params: { path: { courseId } },
        })
      );
    },
    enabled: Boolean(courseId),
  });
}

/**
 * Create a new chapter in course (FR-CNT-01).
 */
export function useCreateChapterMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateChapterRequest): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/chapters', {
          params: { path: { courseId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
    },
  });
}

/**
 * Reorder chapters sequentially (FR-CNT-01).
 */
export function useReorderChaptersMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterIds: string[]): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/chapters/order', {
          params: { path: { courseId } },
          body: { chapterIds },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
    },
  });
}

/**
 * Get chapter draft with blocks for editing/previewing (FR-CNT-03, FR-CNT-16).
 */
export function useChapterDraftQuery(courseId: string, chapterId: string) {
  return useQuery({
    queryKey: queryKeys.content.chapterDraft(courseId, chapterId),
    queryFn: async (): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/chapters/{chapterId}', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    enabled: Boolean(courseId && chapterId),
  });
}

/**
 * Save chapter draft with optimistic locking (FR-CNT-16).
 * Throws 409 VERSION_CONFLICT if baseVersionNo does not match.
 */
export function useSaveChapterDraftMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: SaveChapterRequest): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/chapters/{chapterId}', {
          params: { path: { courseId, chapterId } },
          body,
        })
      );
    },
    onSuccess: (updatedChapter) => {
      queryClient.setQueryData(
        queryKeys.content.chapterDraft(courseId, chapterId),
        updatedChapter
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.chapterVersions(courseId, chapterId),
      });
    },
  });
}

/**
 * Soft delete chapter (FR-CNT-01).
 */
export function useDeleteChapterMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterId: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/chapters/{chapterId}', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
    },
  });
}

/**
 * Publish chapter atomically (FR-CNT-16).
 */
export function usePublishChapterMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/chapters/{chapterId}/publish', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    onSuccess: (publishedChapter) => {
      queryClient.setQueryData(
        queryKeys.content.chapterDraft(courseId, chapterId),
        publishedChapter
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.chapterVersions(courseId, chapterId),
      });
    },
  });
}

/**
 * List historical versions of chapter (FR-CNT-17).
 */
export function useChapterVersionsQuery(
  courseId: string,
  chapterId: string,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: queryKeys.content.chapterVersions(courseId, chapterId, params),
    queryFn: async (): Promise<ChapterVersionDto[]> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/chapters/{chapterId}/versions', {
          params: {
            path: { courseId, chapterId },
            query: { page: params?.page, pageSize: params?.pageSize },
          },
        })
      );
    },
    enabled: Boolean(courseId && chapterId),
  });
}

/**
 * Restore an older version into working draft (FR-CNT-17).
 */
export function useRestoreChapterVersionMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionNo: number): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.POST(
          '/courses/{courseId}/chapters/{chapterId}/versions/{versionNo}/restore',
          {
            params: { path: { courseId, chapterId, versionNo } },
          }
        )
      );
    },
    onSuccess: (restoredChapter) => {
      queryClient.setQueryData(
        queryKeys.content.chapterDraft(courseId, chapterId),
        restoredChapter
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.chapterVersions(courseId, chapterId),
      });
    },
  });
}

/**
 * List all resources of a course (FR-CNT-18).
 */
export function useResourcesQuery(courseId: string) {
  return useQuery({
    queryKey: queryKeys.content.resources(courseId),
    queryFn: async (): Promise<ResourceDto[]> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/resources', {
          params: { path: { courseId } },
        })
      );
    },
    enabled: Boolean(courseId),
  });
}

/**
 * Commit a newly uploaded resource (FR-CNT-18).
 */
export function useCreateResourceMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateResourceRequest): Promise<ResourceDto> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/resources', {
          params: { path: { courseId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.resources(courseId) });
    },
  });
}

/**
 * Soft delete resource (FR-CNT-18).
 * Rejects with 409 RESOURCE_IN_USE if still referenced by any block.
 */
export function useDeleteResourceMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/resources/{id}', {
          params: { path: { courseId, id: resourceId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.resources(courseId) });
    },
  });
}

/**
 * Get presigned download URL for a resource (DEC-06, TTL 15 minutes).
 */
export function useResourceDownloadUrlQuery(
  courseId: string,
  resourceId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.content.resourceDownloadUrl(courseId, resourceId),
    queryFn: async (): Promise<{ url?: string; expiresAt?: string }> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/resources/{id}/download-url', {
          params: { path: { courseId, id: resourceId } },
        })
      );
    },
    enabled: Boolean(courseId && resourceId && (options?.enabled ?? true)),
    staleTime: 10 * 60 * 1000, // 10 minutes cache within 15 min TTL
  });
}

/**
 * Composite helper to upload file to storage and commit it as a course resource.
 */
export async function uploadAndCommitResource(
  courseId: string,
  file: File,
  commitMutation: (body: CreateResourceRequest) => Promise<ResourceDto>,
  onProgress?: (percent: number) => void
): Promise<ResourceDto> {
  const uploadKey = await uploadFileToStorage({
    file,
    purpose: 'COURSE_RESOURCE',
    courseId,
    onProgress,
  });

  return commitMutation({
    uploadKey,
    originalFilename: file.name,
  });
}
