import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  queryKeys,
  unwrapApi,
  type components,
} from '@/shared/api';

export type CourseDto = components['schemas']['CourseDto'];
export type CourseUpsertRequest = components['schemas']['CourseUpsertRequest'];
export type CourseCard = components['schemas']['CourseCard'];
export type EnrollmentDto = components['schemas']['EnrollmentDto'];
export type PageMeta = components['schemas']['PageMeta'];

export interface ListCoursesResponse {
  items?: CourseCard[];
  meta?: PageMeta;
}

export type MyCoursesRelation = 'OWNED' | 'ENROLLED_ACTIVE';

/**
 * Fetch a single course by ID (FR-CRS-02).
 */
export function useCourseQuery(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: async (): Promise<CourseDto> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    enabled: Boolean(courseId),
  });
}

/**
 * Create a new course (FR-CRS-01).
 * Requires verified email.
 */
export function useCreateCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CourseUpsertRequest): Promise<CourseDto> => {
      return unwrapApi(apiClient.POST('/courses', { body }));
    },
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
      if (newCourse.id) {
        queryClient.setQueryData(queryKeys.courses.detail(newCourse.id), newCourse);
      }
    },
  });
}

/**
 * Update an existing course (FR-CRS-03, 05, 06).
 */
export function useUpdateCourseMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CourseUpsertRequest): Promise<CourseDto> => {
      return unwrapApi(
        apiClient.PATCH('/courses/{courseId}', {
          params: {
            path: { courseId },
          },
          body,
        })
      );
    },
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(queryKeys.courses.detail(courseId), updatedCourse);
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

/**
 * Soft delete a course (FR-CRS-04).
 */
export function useDeleteCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

/**
 * Fetch courses created by or enrolled by the current user (FR-PRF-05, FR-CRS-03).
 */
export function useMyCoursesQuery(params: {
  relation: MyCoursesRelation;
  page?: number;
  pageSize?: number;
}) {
  const { relation, page = 1, pageSize = 12 } = params;

  return useQuery({
    queryKey: queryKeys.courses.myCourses({ relation, page, pageSize }),
    queryFn: async (): Promise<ListCoursesResponse> => {
      return unwrapApi(
        apiClient.GET('/me/courses', {
          params: {
            query: {
              relation,
              page,
              pageSize,
            },
          },
        })
      );
    },
  });
}

/**
 * Fetch pending course invitations for current user.
 */
export function useMyInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.courses.myInvitations(),
    queryFn: async (): Promise<CourseCard[]> => {
      return unwrapApi(apiClient.GET('/me/invitations'));
    },
  });
}

/**
 * Enroll in a course (FR-CRS-08, 10).
 * PUBLIC -> ACTIVE; PRIVATE -> PENDING_APPROVAL
 */
export function useEnrollMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<EnrollmentDto> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/enrollments', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.myCourses() });
    },
  });
}

/**
 * Leave a course (FR-CRS-11).
 */
export function useLeaveCourseMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/enrollments/me', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.myCourses() });
    },
  });
}

/**
 * Accept an invitation to join a course.
 */
export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string): Promise<EnrollmentDto> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/invitations/accept', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.myInvitations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.myCourses() });
    },
  });
}

/**
 * Nominate a course (FR-CRS-15).
 */
export function useNominateCourseMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/nomination', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.nominationsSummary(courseId) });
    },
  });
}

export interface NominationSummaryDto {
  nominationCount: number;
  hasNominated: boolean;
}

/**
 * Get nomination count and user status for a course (FR-CRS-15, 16).
 */
export function useNominationSummaryQuery(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.nominationsSummary(courseId),
    queryFn: async (): Promise<NominationSummaryDto> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/nominations/summary' as any, {
          params: { path: { courseId } },
        })
      );
    },
    enabled: !!courseId,
  });
}

/**
 * Withdraw nomination for a course (FR-CRS-16).
 */
export function useWithdrawNominationMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/nomination', {
          params: {
            path: { courseId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.nominationsSummary(courseId) });
    },
  });
}

export interface CourseOverviewStats {
  activeLearners: number;
  activeLearnersChangeWeekly: number;
  completedLearners: number;
  completionRatePercent: number;
  completionTargetPercent: number;
  totalChapters: number;
  publishedChapters: number;
  draftChapters: number;
  totalComments: number;
  newCommentsCount: number;
  avgResponseTimeHours: number;
  totalRatings: number;
  averageRating: number;
  fiveStarPercentage: number;
  totalRecommendations: number;
  systemRank: number;
}

export interface CourseRankingData {
  timeRange: 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';
  byStudents: {
    rank: number;
    totalCourses: number;
    percentileTop: number;
    classSize: number;
  };
  byRecommendations: {
    rank: number;
    totalCourses: number;
    isTop3: boolean;
    totalRecommendations: number;
  };
  byRatings: {
    rank: number;
    totalCourses: number;
    percentileTop: number;
    ratingsCount: number;
    averageRating: number;
  };
}

export interface PendingSubmissionItem {
  id: string;
  studentName: string;
  studentInitials: string;
  avatarBgColor?: string;
  assignmentTitle: string;
  timeAgo: string;
}

export interface EnrollmentRequestItem {
  id: string;
  studentName: string;
  studentInitials: string;
  avatarBgColor?: string;
  studentRoleOrSchool: string;
  timeAgo: string;
}

export interface CourseReportItem {
  id: string;
  targetType: 'Khóa học' | 'Bình luận' | 'Bài học';
  excerpt: string;
  reason: string;
  reportedDate: string;
  status: 'Chờ xử lý' | 'Đã chấp nhận' | 'Đã từ chối';
}

export interface CourseOverviewData {
  course: CourseDto;
  stats: CourseOverviewStats;
  ranking: CourseRankingData;
  pendingSubmissions: PendingSubmissionItem[];
  pendingRequests: EnrollmentRequestItem[];
  reports: CourseReportItem[];
}

/**
 * Fetch course overview dashboard data for instructor (SCR-CRS-Overview).
 */
export function useCourseOverviewQuery(
  courseId: string,
  timeRange: 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME' = 'ALL_TIME'
) {
  return useQuery({
    queryKey: queryKeys.courses.overview(courseId, timeRange),
    queryFn: async (): Promise<CourseOverviewData> => {
      // In production or mock environment, call GET /api/v1/courses/{courseId}/overview
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/overview' as any, {
          params: {
            path: { courseId },
            query: { timeRange },
          },
        } as any)
      );
    },
    enabled: Boolean(courseId),
  });
}

/**
 * Approve student enrollment request.
 */
export function useApproveEnrollmentRequestMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/enrollment-requests/{requestId}/approve' as any, {
          params: {
            path: { courseId, requestId },
          },
        } as any)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.overview(courseId) });
    },
  });
}

/**
 * Reject student enrollment request.
 */
export function useRejectEnrollmentRequestMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/enrollment-requests/{requestId}/reject' as any, {
          params: {
            path: { courseId, requestId },
          },
        } as any)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.overview(courseId) });
    },
  });
}

export interface ListEnrollmentsResponse {
  items?: EnrollmentDto[];
  meta?: PageMeta;
}

/**
 * List enrollments for a course with optional status filter (FR-CRS-12).
 */
export function useEnrollmentsQuery(
  courseId: string,
  params?: { status?: string; page?: number; pageSize?: number }
) {
  const { status, page = 1, pageSize = 20 } = params ?? {};

  return useQuery({
    queryKey: queryKeys.courses.students(courseId, status),
    queryFn: async (): Promise<ListEnrollmentsResponse> => {
      return unwrapApi(
        apiClient.GET('/courses/{courseId}/enrollments', {
          params: {
            path: { courseId },
            query: {
              ...(status ? { status: status as any } : {}),
              page,
              pageSize,
            },
          },
        })
      );
    },
    enabled: Boolean(courseId),
  });
}

/**
 * Invite a learner by email (FR-CRS-09).
 */
export function useInviteLearnerMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string): Promise<EnrollmentDto> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/invitations', {
          params: {
            path: { courseId },
          },
          body: { email },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.students(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.overview(courseId) });
    },
  });
}

/**
 * Decide (accept / reject) an enrollment request for private course (FR-CRS-10).
 */
export function useDecideEnrollmentRequestMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      decision,
    }: {
      requestId: string;
      decision: 'ACCEPTED' | 'REJECTED';
    }): Promise<void> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/enrollment-requests/{requestId}/decision', {
          params: {
            path: { courseId, requestId },
          },
          body: { decision },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.students(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.overview(courseId) });
    },
  });
}

/**
 * Remove a learner from a course (FR-CRS-13).
 */
export function useRemoveLearnerMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      return unwrapApi(
        apiClient.DELETE('/courses/{courseId}/enrollments/{userId}', {
          params: {
            path: { courseId, userId },
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.students(courseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.overview(courseId) });
    },
  });
}

export interface ChapterAccessDto {
  accessMode: 'PUBLIC' | 'PROTECTED';
  passcode?: string;
  passcodeVersion?: number;
}

/**
 * Get chapter access configuration (FR-CRS-07).
 */
export function useChapterAccessQuery(courseId: string, chapterId: string) {
  return useQuery({
    queryKey: queryKeys.content.chapterAccess(courseId, chapterId),
    queryFn: async (): Promise<ChapterAccessDto> => {
      const res = await unwrapApi(
        apiClient.GET('/courses/{courseId}/chapters/{chapterId}/access', {
          params: {
            path: { courseId, chapterId },
          },
        })
      );
      return res as unknown as ChapterAccessDto;
    },
    enabled: Boolean(courseId && chapterId),
  });
}

/**
 * Configure chapter access mode and passcode (FR-CRS-07).
 */
export function useSetChapterAccessMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      accessMode: 'PUBLIC' | 'PROTECTED';
      passcode?: string;
    }): Promise<void> => {
      return unwrapApi(
        apiClient.PUT('/courses/{courseId}/chapters/{chapterId}/access', {
          params: {
            path: { courseId, chapterId },
          },
          body: {
            accessMode: body.accessMode,
            passcode: body.passcode || '',
          },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.chapterAccess(courseId, chapterId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.chapters(courseId),
      });
    },
  });
}

/**
 * Unlock a protected chapter using passcode (FR-CRS-07).
 */
export function useUnlockChapterMutation(courseId: string, chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (passcode: string): Promise<void> => {
      return unwrapApi(
        apiClient.POST('/courses/{courseId}/chapters/{chapterId}/unlock', {
          params: {
            path: { courseId, chapterId },
          },
          body: { passcode },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.learning.chapter(courseId, chapterId),
      });
    },
  });
}



