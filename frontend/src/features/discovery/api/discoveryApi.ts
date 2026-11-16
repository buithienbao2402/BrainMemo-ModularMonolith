import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  queryKeys,
  unwrapApi,
  type components,
} from '@/shared/api';

export type CourseCard = components['schemas']['CourseCard'];
export type PageMeta = components['schemas']['PageMeta'];
export type CourseStatus = components['schemas']['CourseStatus'];

export interface HomeDiscoveryData {
  recentlyUpdated?: CourseCard[];
  recommended?: CourseCard[];
  inProgress?: CourseCard[];
}

export interface SearchCoursesResponse {
  items?: CourseCard[];
  meta?: PageMeta;
}

export interface SearchHistoryItem {
  queryText?: string;
  createdAt?: string;
}

export interface Top10Item {
  rank?: number;
  count?: number;
  course?: CourseCard;
}

export interface SearchCoursesParams {
  q?: string;
  tag?: string;
  accessMode?: 'PUBLIC' | 'PRIVATE';
  status?: CourseStatus;
  sort?:
    | 'RECENTLY_UPDATED'
    | 'NEWEST_LAUNCH'
    | 'MOST_REVIEWED'
    | 'MOST_NOMINATED'
    | 'MOST_LEARNERS'
    | 'MOST_COMMENTED';
  page?: number;
  pageSize?: number;
}

/**
 * Fetch home discovery sections (FR-DSC-01..03).
 * Note: Đề xuất KHÔNG cache giữa các lần tải (FR-DSC-02 / prompt T-S5-FE-01).
 */
export function useHomeDiscoveryQuery() {
  return useQuery({
    queryKey: queryKeys.discovery.home(),
    queryFn: async (): Promise<HomeDiscoveryData> => {
      return unwrapApi(
        apiClient.GET('/discovery/home', {})
      );
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
}

/**
 * Search and filter courses with URL sync (FR-DSC-04..09).
 */
export function useSearchCoursesQuery(params: SearchCoursesParams) {
  return useQuery({
    queryKey: queryKeys.discovery.courses(params as Record<string, unknown>),
    queryFn: async (): Promise<SearchCoursesResponse> => {
      return unwrapApi(
        apiClient.GET('/discovery/courses', {
          params: {
            query: {
              q: params.q || undefined,
              tag: params.tag || undefined,
              accessMode: params.accessMode || undefined,
              status: params.status || undefined,
              sort: params.sort || undefined,
              page: params.page,
              pageSize: params.pageSize,
            },
          },
        })
      );
    },
  });
}

/**
 * List recent search history for authenticated users (FR-DSC-05).
 */
export function useSearchHistoryQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.discovery.searchHistory(),
    queryFn: async (): Promise<SearchHistoryItem[]> => {
      return unwrapApi(
        apiClient.GET('/discovery/search-history', {})
      );
    },
    enabled,
    staleTime: 30000,
  });
}

/**
 * Get top 10 leaderboard by metric and window (FR-DSC-10).
 */
export function useTop10Query(
  metric: 'LEARNERS' | 'REVIEWS' | 'NOMINATIONS',
  window: 'WEEK' | 'MONTH' | 'ALL_TIME'
) {
  return useQuery({
    queryKey: queryKeys.discovery.top10(metric, window),
    queryFn: async (): Promise<Top10Item[]> => {
      return unwrapApi(
        apiClient.GET('/discovery/top10', {
          params: {
            query: { metric, window },
          },
        })
      );
    },
    staleTime: 60000,
  });
}
