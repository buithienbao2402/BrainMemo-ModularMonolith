import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  queryKeys,
  unwrapApi,
  type components,
  type ProfileDto,
} from '@/shared/api';

export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest'];
export type CourseCard = components['schemas']['CourseCard'];
export type PageMeta = components['schemas']['PageMeta'];

export interface ListProfileCoursesResponse {
  items?: CourseCard[];
  meta?: PageMeta;
}

export type ProfileCourseRelation = 'OWNED' | 'ENROLLED' | 'COMPLETED';

/**
 * Fetch current authenticated user's profile (FR-PRF-01).
 */
export function useMyProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: async (): Promise<ProfileDto> => {
      return unwrapApi(apiClient.GET('/profiles/me'));
    },
    staleTime: 60 * 1000,
    enabled: options?.enabled,
  });
}

/**
 * Update current authenticated user's profile (FR-PRF-01..04,07).
 */
export function useUpdateMyProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateProfileRequest): Promise<ProfileDto> => {
      return unwrapApi(apiClient.PUT('/profiles/me', { body }));
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile.me(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

/**
 * Fetch public profile of any user by ID (FR-PRF-06).
 */
export function usePublicProfileQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile.detail(userId),
    queryFn: async (): Promise<ProfileDto> => {
      return unwrapApi(
        apiClient.GET('/profiles/{userId}', {
          params: {
            path: { userId },
          },
        })
      );
    },
    enabled: Boolean(userId),
  });
}

/**
 * Fetch courses displayed on a user's public profile (FR-PRF-05).
 */
export function useProfileCoursesQuery(
  userId: string,
  params?: {
    relation?: ProfileCourseRelation;
    page?: number;
    pageSize?: number;
  }
) {
  const relation = params?.relation ?? 'OWNED';
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 12;

  return useQuery({
    queryKey: queryKeys.profile.courses(userId, { relation, page, pageSize }),
    queryFn: async (): Promise<ListProfileCoursesResponse> => {
      return unwrapApi(
        apiClient.GET('/profiles/{userId}/courses', {
          params: {
            path: { userId },
            query: {
              relation,
              page,
              pageSize,
            },
          },
        })
      );
    },
    enabled: Boolean(userId),
  });
}
