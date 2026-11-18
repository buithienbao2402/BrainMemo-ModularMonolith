import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys, unwrapApi } from '@/shared/api';

export type BlockType =
  | 'RICH_TEXT'
  | 'MARKDOWN'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'FILE'
  | 'FLASHCARD'
  | 'QUESTION'
  | 'QUIZ'
  | 'ASSIGNMENT';

export interface FlashcardItem {
  id: string;
  frontText?: string;
  backText?: string;
  frontImage?: string;
  backImage?: string;
}

export interface PracticeQuestionData {
  questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'MATCHING' | 'ESSAY';
  stem: string;
  options?: Array<{ id: string; content: string }>;
  matchingPairs?: Array<{ leftId: string; leftText: string; rightId: string; rightText: string }>;
}

export interface LearnBlockDto {
  id: string;
  blockType: BlockType;
  position: number;
  completed: boolean;
  title?: string;
  body?: string;
  resourceUrl?: string;
  flashcards?: FlashcardItem[];
  question?: PracticeQuestionData;
  quizSummary?: Record<string, unknown>;
  assignmentSummary?: Record<string, unknown>;
}

export interface LearnChapterDto {
  id: string;
  title: string;
  description?: string | null;
  versionNo: number;
  canSaveProgress: boolean;
  blocks: LearnBlockDto[];
}

export interface ChapterProgressSummary {
  chapterId: string;
  percent: number;
}

export interface ProgressDto {
  courseId: string;
  percent: number;
  completedChapterIds: string[];
  chapters: ChapterProgressSummary[];
  completedBlockIds: string[];
  lastActivityAt?: string | null;
  courseCompletedAt?: string | null;
}

export interface BookmarkItem {
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterTitle: string;
  updatedAt: string;
}

export interface AnswerPayload {
  selectedOptionIds?: string[];
  bool?: boolean;
  blanks?: string[];
  pairs?: Array<{ leftId: string; rightId: string }>;
  text?: string;
}

export interface PracticeAnswerResult {
  isCorrect?: boolean | null;
  explanation?: string | null;
}

/**
 * Fetch chapter content for learning player (FR-LRN-01, FR-LRN-15).
 * Answers are stripped out; includes block completion status.
 */
export function useReadChapterQuery(
  courseId: string,
  chapterId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.learning.chapter(courseId, chapterId),
    queryFn: async (): Promise<LearnChapterDto> => {
      const res = await unwrapApi(
        apiClient.GET('/courses/{courseId}/learn/chapters/{chapterId}', {
          params: {
            path: { courseId, chapterId },
          },
        })
      );
      return res as unknown as LearnChapterDto;
    },
    enabled: Boolean(courseId && chapterId) && (options?.enabled ?? true),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 PASSCODE_REQUIRED or NOT_ENROLLED
      if (error?.status === 403 || error?.status === 401 || error?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Fetch course progress (FR-LRN-03).
 */
export function useCourseProgressQuery(courseId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.learning.progress(courseId),
    queryFn: async (): Promise<ProgressDto> => {
      const res = await unwrapApi(
        apiClient.GET('/courses/{courseId}/progress', {
          params: {
            path: { courseId },
          },
        })
      );
      return res as unknown as ProgressDto;
    },
    enabled: Boolean(courseId) && (options?.enabled ?? true),
  });
}

/**
 * Mark a block completed (idempotent, FR-LRN-03).
 */
export function useCompleteBlockMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string): Promise<ProgressDto> => {
      const res = await unwrapApi(
        apiClient.POST('/courses/{courseId}/blocks/{blockId}/complete', {
          params: {
            path: { courseId, blockId },
          },
        })
      );
      return res as unknown as ProgressDto;
    },
    onSuccess: (updatedProgress) => {
      queryClient.setQueryData(queryKeys.learning.progress(courseId), updatedProgress);
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.all });
    },
  });
}

/**
 * Answer a practice question block (FR-LRN-01).
 */
export function useAnswerPracticeQuestionMutation(courseId: string, blockId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AnswerPayload): Promise<PracticeAnswerResult> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/blocks/{blockId}/practice-answer', {
          params: {
            path: { courseId, blockId },
          },
          body: payload as any,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress(courseId) });
    },
  });
}

/**
 * Set bookmark for course (FR-LRN-02).
 */
export function useSetBookmarkMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chapterId: string): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/bookmark', {
          params: {
            path: { courseId },
          },
          body: { chapterId },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.myBookmarks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.bookmarks() });
    },
  });
}

/**
 * Remove bookmark for course.
 */
export function useRemoveBookmarkMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/bookmark', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.myBookmarks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.bookmarks() });
    },
  });
}

/**
 * List personal bookmarks (FR-LRN-07).
 */
export function useMyBookmarksQuery() {
  return useQuery({
    queryKey: queryKeys.learning.myBookmarks(),
    queryFn: async (): Promise<BookmarkItem[]> => {
      const res = await unwrapApi(apiClient.GET('/me/bookmarks'));
      return res as unknown as BookmarkItem[];
    },
  });
}
