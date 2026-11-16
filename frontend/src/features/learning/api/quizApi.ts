import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys, unwrapApi } from '@/shared/api';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'SHORT_ESSAY'
  | 'ESSAY';

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface QuizOptionDto {
  id: string;
  position: number;
  content: string;
  matchContent?: string | null;
  blankNo?: number | null;
  isCorrect?: boolean | null;
}

export interface QuizStudentAnswerDto {
  selectedOptionIds?: string[] | null;
  textAnswer?: string | null;
  matches?: Record<string, string> | null;
  isCorrect?: boolean | null;
  pointsEarned?: number | null;
  answeredAt?: string | null;
}

export interface QuizQuestionDto {
  id: string;
  position: number;
  questionType: QuestionType;
  stem: string;
  maxPoints: number;
  allowMultiple: boolean;
  options: QuizOptionDto[];
  explanation?: string | null;
  referenceAnswer?: string | null;
  studentAnswer?: QuizStudentAnswerDto | null;
}

export interface QuizAttemptDto {
  id: string;
  quizBlockId: string;
  courseId: string;
  attemptNo: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string | null;
  totalScore?: number | null;
  maxScore: number;
  questions: QuizQuestionDto[];
}

export interface QuizAttemptSummaryDto {
  attemptId: string;
  quizBlockId: string;
  userId: string;
  status: AttemptStatus;
  totalScore?: number | null;
  maxScore: number;
  startedAt: string;
  submittedAt?: string | null;
}

export interface SaveAnswerPayload {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  matches?: Record<string, string>;
}

export interface SaveAnswerResultDto {
  savedAt: string;
  isCorrect?: boolean | null;
  pointsEarned?: number | null;
}

export interface QuizSubmitResultDto {
  attemptId: string;
  status: AttemptStatus;
  totalScore?: number | null;
  maxScore: number;
  isPassed?: boolean | null;
}

/**
 * List student attempts for a specific quiz block (SCR-LRN-02).
 */
export function useQuizAttemptsQuery(courseId: string, blockId: string) {
  return useQuery({
    queryKey: queryKeys.learning.quizAttempts(courseId, blockId),
    queryFn: async (): Promise<QuizAttemptSummaryDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/quizzes/{blockId}/attempts', {
          params: { path: { courseId, blockId } },
        })
      );
    },
    enabled: Boolean(courseId && blockId),
  });
}

/**
 * Start a new quiz attempt or recover active in-progress attempt (SCR-LRN-02).
 */
export function useStartQuizAttemptMutation(courseId: string, blockId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: { password?: string }): Promise<QuizAttemptDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/quizzes/{blockId}/attempts', {
          params: { path: { courseId, blockId } },
          body: payload ?? {},
        })
      );
    },
    onSuccess: (attempt) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.learning.quizAttempts(courseId, blockId),
      });
      queryClient.setQueryData(queryKeys.learning.quizAttempt(attempt.id), attempt);
    },
  });
}

/**
 * Get quiz attempt detail with anti-leak masked or unmasked answers (SCR-LRN-03, SCR-LRN-04).
 */
export function useQuizAttemptQuery(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.learning.quizAttempt(attemptId),
    queryFn: async (): Promise<QuizAttemptDto> => {
      return unwrapApi(
        (apiClient as any).GET('/quiz-attempts/{id}', {
          params: { path: { id: attemptId } },
        })
      );
    },
    enabled: Boolean(attemptId),
  });
}

/**
 * Autosave student answer for a question in an active attempt (SCR-LRN-03).
 */
export function useSaveQuizAnswerMutation(attemptId: string) {
  return useMutation({
    mutationFn: async ({
      questionId,
      selectedOptionIds,
      textAnswer,
      matches,
    }: SaveAnswerPayload): Promise<SaveAnswerResultDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/quiz-attempts/{id}/answers/{questionId}', {
          params: { path: { id: attemptId, questionId } },
          body: {
            selectedOptionIds,
            textAnswer,
            matches,
          },
        })
      );
    },
  });
}

/**
 * Submit quiz attempt for auto-grading via ADR-04 Two-Phase Commit (SCR-LRN-03).
 */
export function useSubmitQuizAttemptMutation(attemptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<QuizSubmitResultDto> => {
      return unwrapApi(
        (apiClient as any).POST('/quiz-attempts/{id}/submit', {
          params: { path: { id: attemptId } },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.quizAttempt(attemptId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.learning.all });
    },
  });
}
