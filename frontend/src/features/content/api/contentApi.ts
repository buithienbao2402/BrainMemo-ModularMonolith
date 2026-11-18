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
 * Save chapter draft dynamically supporting new and existing chapters.
 */
export function useSaveChapterDraftDynamicMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chapterId,
      body,
    }: {
      chapterId: string;
      body: SaveChapterRequest;
    }): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/chapters/{chapterId}', {
          params: { path: { courseId, chapterId } },
          body,
        })
      );
    },
    onSuccess: (updatedChapter, { chapterId }) => {
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
 * Publish chapter atomically with dynamic chapterId (FR-CNT-16).
 */
export function usePublishChapterDynamicMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterId: string): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/chapters/{chapterId}/publish', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    onSuccess: (publishedChapter, chapterId) => {
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
 * Publish chapter by chapterId (convenient for chapter lists).
 */
export function usePublishChapterActionMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterId: string): Promise<ChapterDetail> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/chapters/{chapterId}/publish', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    onSuccess: (_, chapterId) => {
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

/**
 * Get chapter access mode & config (FR-CRS-07).
 */
export function useChapterAccessQuery(courseId: string, chapterId: string) {
  return useQuery({
    queryKey: queryKeys.content.chapterAccess(courseId, chapterId),
    queryFn: async (): Promise<{ accessMode?: string; passcodeVersion?: number }> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/chapters/{chapterId}/access', {
          params: { path: { courseId, chapterId } },
        })
      );
    },
    enabled: Boolean(courseId && chapterId && chapterId !== 'new'),
  });
}

/**
 * Set chapter access mode (FR-CRS-07).
 */
export function useSetChapterAccessMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { accessMode: 'PUBLIC' | 'PROTECTED'; passcode?: string }): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/chapters/{chapterId}/access', {
          params: { path: { courseId, chapterId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapterAccess(courseId, chapterId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapterDraft(courseId, chapterId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.chapters(courseId) });
    },
  });
}

// ==========================================
// Question Bank & Quiz Authoring (T-S7-FE-01)
// ==========================================

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'ESSAY';

export type QuestionStatus = 'DRAFT' | 'READY';

export interface QuestionOptionItem {
  id?: string;
  position: number;
  content: string;
  matchContent?: string | null;
  blankNo?: number | null;
  isCorrect?: boolean | null;
}

export interface QuestionItemDto {
  id: string;
  courseId: string;
  questionType: QuestionType;
  stem: string;
  explanation?: string | null;
  referenceAnswer?: string | null;
  difficultyCode?: number | null;
  defaultPoints: number;
  status: QuestionStatus;
  origin: string;
  tags?: string[] | null;
  options: QuestionOptionItem[];
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionListResponse {
  items: QuestionItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface QuestionFilterParams {
  tag?: string;
  difficulty?: number;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UpsertQuestionRequest {
  questionType: QuestionType;
  stem: string;
  explanation?: string | null;
  referenceAnswer?: string | null;
  difficultyCode?: number | null;
  defaultPoints: number;
  tags?: string[] | null;
  options: QuestionOptionItem[];
}

export interface QuestionUsageResponse {
  questionId: string;
  quizCount: number;
  attemptCount: number;
  correctRate?: number | null;
  usedInQuizzes?: { quizBlockId: string; title: string; chapterTitle?: string }[];
}

export interface QuizExceptionDto {
  userId: string;
  extraMinutes?: number | null;
  extraAttempts?: number | null;
  extendedCloseAt?: string | null;
  userEmail?: string;
  userFullName?: string;
}

export function useQuestionsQuery(courseId: string, params?: QuestionFilterParams) {
  return useQuery({
    queryKey: queryKeys.content.questions(courseId, params as Record<string, unknown>),
    queryFn: async (): Promise<QuestionListResponse> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/questions', {
          params: {
            path: { courseId },
            query: params,
          },
        })
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useQuestionDetailQuery(courseId: string, questionId?: string | null) {
  return useQuery({
    queryKey: queryKeys.content.questionDetail(courseId, questionId || ''),
    queryFn: async (): Promise<QuestionItemDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/questions/{questionId}', {
          params: { path: { courseId, questionId } },
        })
      );
    },
    enabled: Boolean(courseId && questionId),
  });
}

export function useCreateQuestionMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpsertQuestionRequest): Promise<QuestionItemDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/questions', {
          params: { path: { courseId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questions(courseId) });
    },
  });
}

export function useUpdateQuestionMutation(courseId: string, questionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpsertQuestionRequest): Promise<QuestionItemDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/questions/{questionId}', {
          params: { path: { courseId, questionId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questions(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questionDetail(courseId, questionId) });
    },
  });
}

export function useUpdateQuestionStatusMutation(courseId: string, questionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: QuestionStatus): Promise<void> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/questions/{questionId}/status', {
          params: { path: { courseId, questionId } },
          body: { status },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questions(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questionDetail(courseId, questionId) });
    },
  });
}

export function useQuestionUsageQuery(courseId: string, questionId?: string | null) {
  return useQuery({
    queryKey: queryKeys.content.questionUsage(courseId, questionId || ''),
    queryFn: async (): Promise<QuestionUsageResponse> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/questions/{questionId}/usage', {
          params: { path: { courseId, questionId } },
        })
      );
    },
    enabled: Boolean(courseId && questionId),
  });
}

export function useImportQuestionsMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<{ importedCount: number; errors?: string[] }> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/courses/${courseId}/questions/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('brainmemo_access_token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Lỗi khi nhập câu hỏi.');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.questions(courseId) });
    },
  });
}

export function useQuizExceptionsQuery(courseId: string, blockId: string) {
  return useQuery({
    queryKey: queryKeys.content.quizExceptions(courseId, blockId),
    queryFn: async (): Promise<QuizExceptionDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/quizzes/{blockId}/exceptions', {
          params: { path: { courseId, blockId } },
        })
      );
    },
    enabled: Boolean(courseId && blockId),
  });
}

export function useUpsertQuizExceptionMutation(courseId: string, blockId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      extraMinutes,
      extraAttempts,
      extendedCloseAt,
    }: {
      userId: string;
      extraMinutes?: number | null;
      extraAttempts?: number | null;
      extendedCloseAt?: string | null;
    }): Promise<void> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/quizzes/{blockId}/exceptions/{userId}', {
          params: { path: { courseId, blockId, userId } },
          body: { extraMinutes, extraAttempts, extendedCloseAt },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.quizExceptions(courseId, blockId) });
    },
  });
}

export function useDeleteQuizExceptionMutation(courseId: string, blockId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      return unwrapApi(
        (apiClient as any).DELETE('/courses/{courseId}/quizzes/{blockId}/exceptions/{userId}', {
          params: { path: { courseId, blockId, userId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.quizExceptions(courseId, blockId) });
    },
  });
}
