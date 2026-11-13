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
    },
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
    },
  });
}
