import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys, unwrapApi } from '@/shared/api';

export interface AssessmentConfigDto {
  passThreshold: number;
  scoreSelectionRule: 'HIGHEST' | 'LATEST' | 'AVERAGE';
  gradeScale?: Array<{ min: number; max: number; label: string }> | null;
  achievementLevels?: Array<{ code: string; label: string; minPct: number; maxPct: number }> | null;
  bloomScale?: unknown;
  ploEnabled: boolean;
}

export interface ComponentDto {
  blockId: string;
  sourceKind: string;
  title: string;
  maxScore: number;
  courseWeight?: number | null;
  isComponent: boolean;
  cloWeights?: Array<{ cloId: string; weight: number }> | null;
}

export interface UpsertComponentRequest {
  courseWeight: number;
  cloWeights?: Array<{ cloId: string; weight: number }> | null;
}

export interface GradingLearnerRefDto {
  id: string;
  displayName: string;
  email?: string | null;
}

export interface GradingQueueItemDto {
  kind: 'QUIZ_ATTEMPT' | 'ASSIGNMENT';
  sourceId: string;
  blockId: string;
  blockTitle: string;
  learner: GradingLearnerRefDto;
  submittedAt?: string | null;
}

export interface ManualQuestionGradeInput {
  questionId: string;
  points: number;
  feedback?: string | null;
}

export interface ManualGradesRequest {
  grades: ManualQuestionGradeInput[];
  overallFeedback?: string | null;
}

export interface GradeSubmissionRequest {
  score: number;
  feedback?: string | null;
}

export interface AttemptReviewQuestionDto {
  questionId: string;
  position: number;
  questionType: string;
  stem: string;
  maxPoints: number;
  pointsEarned?: number | null;
  referenceAnswer?: string | null;
  studentAnswerText?: string | null;
  studentSelectedOptionIds?: string[] | null;
  feedback?: string | null;
}

export interface AttemptReviewDto {
  attemptId: string;
  courseId: string;
  quizBlockId: string;
  userId: string;
  totalScore?: number | null;
  maxScore: number;
  isFullyGraded: boolean;
  questions: AttemptReviewQuestionDto[];
}

export interface GradingSubmissionDto {
  id: string;
  status: string;
  textContent?: string | null;
  files?: Array<{
    storageKey: string;
    originalFilename: string;
    sizeBytes: number;
    contentType: string;
  }> | null;
  isLate?: boolean | null;
  submittedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
}

export interface GradebookLearnerDto {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface GradebookComponentItemDto {
  blockId: string;
  title: string;
  maxScore: number;
  courseWeight: number;
  final?: number | null;
  highest?: number | null;
  latest?: number | null;
  average?: number | null;
  isPassed?: boolean | null;
  feedback?: string | null;
  status: 'GRADED' | 'PENDING_MANUAL' | 'NOT_STARTED' | 'NOT_DUE';
}

export interface GradebookResponseDto {
  learner: GradebookLearnerDto;
  components: GradebookComponentItemDto[];
  totalGrade?: number | null;
  classification?: string | null;
  cloAchievements?: unknown[] | null;
  ploAchievements?: unknown[] | null;
  allCloAchieved: boolean;
}

export interface ComponentAttemptScoreDto {
  attemptId: string;
  score?: number | null;
  maxScore: number;
  submittedAt?: string | null;
  isFullyGraded: boolean;
}

export interface ComponentScoresDto {
  learner: GradebookLearnerDto;
  attempts: ComponentAttemptScoreDto[];
  highest?: number | null;
  latest?: number | null;
  average?: number | null;
  final?: number | null;
}

export function useAssessmentConfig(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.config(courseId),
    queryFn: async (): Promise<AssessmentConfigDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/config', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useUpdateAssessmentConfig(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssessmentConfigDto): Promise<AssessmentConfigDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assessment/config', {
          params: { path: { courseId } },
          body: payload,
        }),
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.assessment.config(courseId), data);
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.gradebookMe(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.courseGradebook(courseId),
      });
    },
  });
}

export function useAssessableBlocks(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.assessableBlocks(courseId),
    queryFn: async (): Promise<ComponentDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/assessable-blocks', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useComponent(courseId: string, blockId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.component(courseId, blockId),
    queryFn: async (): Promise<ComponentDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/components/{blockId}', {
          params: { path: { courseId, blockId } },
        }),
      );
    },
    enabled: Boolean(courseId && blockId),
  });
}

export function useUpsertComponent(courseId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertComponentRequest): Promise<ComponentDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assessment/components/{blockId}', {
          params: { path: { courseId, blockId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.assessableBlocks(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.component(courseId, blockId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.courseGradebook(courseId),
      });
    },
  });
}

export function useUpsertComponentWeight(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blockId,
      payload,
    }: {
      blockId: string;
      payload: UpsertComponentRequest;
    }): Promise<ComponentDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assessment/components/{blockId}', {
          params: { path: { courseId, blockId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.assessableBlocks(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.courseGradebook(courseId),
      });
    },
  });
}

export function useDeleteComponent(courseId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(
        (apiClient as any).DELETE('/courses/{courseId}/assessment/components/{blockId}', {
          params: { path: { courseId, blockId } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.assessableBlocks(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.component(courseId, blockId),
      });
    },
  });
}

export function useGradingQueue(courseId: string, kind?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.assessment.gradingQueue(courseId, { kind, page, pageSize }),
    queryFn: async (): Promise<GradingQueueItemDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/grading-queue', {
          params: {
            path: { courseId },
            query: { kind, page, pageSize },
          },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useAttemptForReview(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.quizAttemptReview(attemptId),
    queryFn: async (): Promise<AttemptReviewDto> => {
      return unwrapApi(
        (apiClient as any).GET('/assessment/quiz-attempts/{attemptId}/review', {
          params: { path: { attemptId } },
        }),
      );
    },
    enabled: Boolean(attemptId),
  });
}

export function useGradeAttemptManually(attemptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ManualGradesRequest): Promise<void> => {
      return unwrapApi(
        (apiClient as any).PUT('/assessment/quiz-attempts/{attemptId}/manual-grades', {
          params: { path: { attemptId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.quizAttemptReview(attemptId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.all,
      });
    },
  });
}

export function useSubmissionForGrading(submissionId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.submissionForGrading(submissionId),
    queryFn: async (): Promise<GradingSubmissionDto> => {
      return unwrapApi(
        (apiClient as any).GET('/assessment/submissions/{submissionId}/grading', {
          params: { path: { submissionId } },
        }),
      );
    },
    enabled: Boolean(submissionId),
  });
}

export function useGradeSubmission(submissionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GradeSubmissionRequest): Promise<void> => {
      return unwrapApi(
        (apiClient as any).PUT('/assessment/submissions/{submissionId}/grade', {
          params: { path: { submissionId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.submissionForGrading(submissionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.all,
      });
    },
  });
}

export function useMyGradebook(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.gradebookMe(courseId),
    queryFn: async (): Promise<GradebookResponseDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/gradebook/me', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useStudentGradebook(courseId: string, userId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.studentGradebook(courseId, userId),
    queryFn: async (): Promise<GradebookResponseDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/gradebook/students/{userId}', {
          params: { path: { courseId, userId } },
        }),
      );
    },
    enabled: Boolean(courseId && userId),
  });
}

export function useCourseGradebook(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.courseGradebook(courseId),
    queryFn: async (): Promise<GradebookResponseDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/gradebook', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useComponentScores(courseId: string, blockId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.componentScores(courseId, blockId),
    queryFn: async (): Promise<ComponentScoresDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/components/{blockId}/scores', {
          params: { path: { courseId, blockId } },
        }),
      );
    },
    enabled: Boolean(courseId && blockId),
  });
}

// ==================== CLO & PLO ====================

export interface CloDto {
  id: string;
  courseId: string;
  code: string;
  description: string;
  bloomLevelCode?: string | null;
  linkedPloIds: string[];
}

export interface CreateCloRequest {
  code: string;
  description: string;
  bloomLevelCode?: string | null;
  linkedPloIds?: string[];
}

export interface UpdateCloRequest {
  code: string;
  description: string;
  bloomLevelCode?: string | null;
  linkedPloIds?: string[];
}

export interface PloDto {
  id: string;
  courseId: string;
  code: string;
  description: string;
}

export interface CreatePloRequest {
  code: string;
  description: string;
}

export interface UpdatePloRequest {
  code: string;
  description: string;
}

export function useClos(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.clos(courseId),
    queryFn: async (): Promise<CloDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/clos', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useCreateClo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCloRequest): Promise<CloDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/assessment/clos', {
          params: { path: { courseId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.assessableBlocks(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.stats(courseId) });
    },
  });
}

export function useUpdateClo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCloRequest }): Promise<CloDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assessment/clos/{id}', {
          params: { path: { courseId, id } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.stats(courseId) });
    },
  });
}

export function useDeleteClo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        (apiClient as any).DELETE('/courses/{courseId}/assessment/clos/{id}', {
          params: { path: { courseId, id } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.assessableBlocks(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.stats(courseId) });
    },
  });
}

export function usePlos(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.plos(courseId),
    queryFn: async (): Promise<PloDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/plos', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useCreatePlo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePloRequest): Promise<PloDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/assessment/plos', {
          params: { path: { courseId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.plos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
    },
  });
}

export function useUpdatePlo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePloRequest }): Promise<PloDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assessment/plos/{id}', {
          params: { path: { courseId, id } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.plos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
    },
  });
}

export function useDeletePlo(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return unwrapApi(
        (apiClient as any).DELETE('/courses/{courseId}/assessment/plos/{id}', {
          params: { path: { courseId, id } },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.plos(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.clos(courseId) });
    },
  });
}

// ==================== STATS & EXPORT ====================

export interface ScoreRangeStatsDto {
  rangeLabel: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface HardestQuestionDto {
  questionId: string;
  stem: string;
  questionType: string;
  totalAttempts: number;
  correctAttempts: number;
  averageScore: number;
  maxPoints: number;
  errorRate: number;
}

export interface CloPassRateDto {
  cloId: string;
  code: string;
  bloomLevelCode?: string | null;
  totalStudents: number;
  passedStudents: number;
  passRate: number;
}

export interface LevelDistributionDto {
  classification: string;
  count: number;
  percentage: number;
}

export interface AssessmentStatsDto {
  scoreDistribution: ScoreRangeStatsDto[];
  hardestQuestions: HardestQuestionDto[];
  cloPassRates: CloPassRateDto[];
  levelDistribution: LevelDistributionDto[];
}

export function useAssessmentStats(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.stats(courseId),
    queryFn: async (): Promise<AssessmentStatsDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assessment/stats', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

// ==================== COURSE REVIEWS ====================

export interface ReviewUserDto {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface CourseReviewDto {
  id: string;
  user: ReviewUserDto;
  rating: number;
  commentText?: string | null;
  replyText?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseReviewsResponseDto {
  avg?: number | null;
  count: number;
  items: CourseReviewDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CourseReviewSummaryDto {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export interface UpsertReviewRequest {
  rating: number;
  commentText?: string | null;
}

export interface ReplyReviewRequest {
  replyText: string;
}

export function useCourseReviews(courseId: string, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.assessment.reviews(courseId, params),
    queryFn: async (): Promise<CourseReviewsResponseDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/reviews', {
          params: {
            path: { courseId },
            query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 },
          },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useCourseReviewSummary(courseId: string) {
  return useQuery({
    queryKey: queryKeys.assessment.reviewSummary(courseId),
    queryFn: async (): Promise<CourseReviewSummaryDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/reviews/summary', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useUpsertReview(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertReviewRequest): Promise<CourseReviewDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/reviews/me', {
          params: { path: { courseId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.reviews(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.reviewSummary(courseId) });
    },
  });
}

export function useReplyReview(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReplyReviewRequest }): Promise<CourseReviewDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/reviews/{id}/reply', {
          params: { path: { courseId, id } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.reviews(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.reviewSummary(courseId) });
    },
  });
}
