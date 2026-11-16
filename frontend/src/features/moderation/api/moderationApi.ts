import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi } from '@/shared/api';
import type {
  AuditLogDto,
  CreateReportRequest,
  DirectSanctionRequest,
  LiftSanctionRequest,
  ModerationDashboardDto,
  PagedListResponse,
  ReportDto,
  ReportTargetContentDto,
  ResolveReportRequest,
  SanctionDto,
} from '../types';

export const moderationQueryKeys = {
  all: ['moderation'] as const,
  reports: (params?: Record<string, unknown>) => ['moderation', 'reports', params ?? {}] as const,
  reportDetail: (id: string) => ['moderation', 'report', id] as const,
  targetContent: (id: string) => ['moderation', 'targetContent', id] as const,
  courseReports: (courseId: string) => ['moderation', 'courseReports', courseId] as const,
  sanctions: (params?: Record<string, unknown>) => ['moderation', 'sanctions', params ?? {}] as const,
  auditLogs: (params?: Record<string, unknown>) => ['moderation', 'auditLogs', params ?? {}] as const,
  dashboard: () => ['moderation', 'dashboard'] as const,
};

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReportRequest): Promise<ReportDto> => {
      return unwrapApi(
        (apiClient as any).POST('/reports', {
          body: payload,
        }),
      );
    },
    onSuccess: (_, variables) => {
      if (variables.targetType === 'COURSE') {
        queryClient.invalidateQueries({
          queryKey: moderationQueryKeys.courseReports(variables.targetId),
        });
      }
      queryClient.invalidateQueries({ queryKey: moderationQueryKeys.all });
    },
  });
}

export function useCourseReports(courseId: string) {
  return useQuery({
    queryKey: moderationQueryKeys.courseReports(courseId),
    queryFn: async (): Promise<ReportDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/reports', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}

export function useAdminReports(params?: {
  status?: string;
  targetType?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: moderationQueryKeys.reports(params),
    queryFn: async (): Promise<PagedListResponse<ReportDto>> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/reports', {
          params: { query: params },
        }),
      );
    },
  });
}

export function useAdminReport(id: string) {
  return useQuery({
    queryKey: moderationQueryKeys.reportDetail(id),
    queryFn: async (): Promise<ReportDto> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/reports/{id}', {
          params: { path: { id } },
        }),
      );
    },
    enabled: Boolean(id),
  });
}

export function useReportTargetContent(id: string) {
  return useQuery({
    queryKey: moderationQueryKeys.targetContent(id),
    queryFn: async (): Promise<ReportTargetContentDto> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/reports/{id}/target-content', {
          params: { path: { id } },
        }),
      );
    },
    enabled: Boolean(id),
    retry: false,
  });
}

export function useResolveReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ResolveReportRequest): Promise<ReportDto> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/reports/{id}/resolve', {
          params: { path: { id: reportId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationQueryKeys.all });
    },
  });
}

export function useAdminSanctions(params?: {
  activeOnly?: boolean;
  targetType?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: moderationQueryKeys.sanctions(params),
    queryFn: async (): Promise<PagedListResponse<SanctionDto>> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/sanctions', {
          params: { query: params },
        }),
      );
    },
  });
}

export function useApplySanction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DirectSanctionRequest): Promise<SanctionDto> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/sanctions', {
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationQueryKeys.all });
    },
  });
}

export function useLiftSanction(sanctionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LiftSanctionRequest): Promise<SanctionDto> => {
      return unwrapApi(
        (apiClient as any).POST('/admin/sanctions/{id}/lift', {
          params: { path: { id: sanctionId } },
          body: payload,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationQueryKeys.all });
    },
  });
}

export function useAdminAuditLogs(params?: {
  action?: string;
  objectType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: moderationQueryKeys.auditLogs(params),
    queryFn: async (): Promise<PagedListResponse<AuditLogDto>> => {
      return unwrapApi(
        (apiClient as any).GET('/admin/audit-logs', {
          params: { query: params },
        }),
      );
    },
  });
}

export function useModerationDashboard() {
  return useQuery({
    queryKey: moderationQueryKeys.dashboard(),
    queryFn: async (): Promise<ModerationDashboardDto> => {
      return unwrapApi((apiClient as any).GET('/admin/dashboard'));
    },
  });
}
