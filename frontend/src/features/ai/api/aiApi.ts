import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, unwrapApi } from '@/shared/api';
import type { AiJobDto, AiJobRequest, AiQuotaDto, SystemSettingsDto } from '../types';

export const aiQueryKeys = {
  all: ['ai'] as const,
  quota: () => ['ai', 'quota'] as const,
  job: (id: string) => ['ai', 'job', id] as const,
  settings: () => ['admin', 'settings'] as const,
};

export function useAiQuota() {
  return useQuery({
    queryKey: aiQueryKeys.quota(),
    queryFn: async (): Promise<AiQuotaDto> => {
      const data = (await unwrapApi(
        (apiClient as any).GET('/ai/quota', {})
      )) as any;
      return {
        used: data?.usedCount ?? data?.usedToday ?? data?.used ?? 0,
        limit: data?.quotaLimit ?? data?.dailyLimit ?? data?.limit ?? 20,
        remaining: data?.remaining ?? data?.remainingToday ?? 20,
      };
    },
  });
}

export function useCreateQuizJob(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AiJobRequest): Promise<AiJobDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/ai/quiz-jobs', {
          params: { path: { courseId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.quota() });
    },
  });
}

export function useCreateFlashcardJob(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AiJobRequest): Promise<AiJobDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/ai/flashcard-jobs', {
          params: { path: { courseId } },
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.quota() });
    },
  });
}

export function useAiJob(jobId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: aiQueryKeys.job(jobId ?? ''),
    queryFn: async (): Promise<AiJobDto> => {
      if (!jobId) throw new Error('Job ID is required');
      return unwrapApi(
        (apiClient as any).GET('/ai/jobs/{id}', {
          params: { path: { id: jobId } },
        })
      );
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'RUNNING') {
        return 2000;
      }
      return false;
    },
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: aiQueryKeys.settings(),
    queryFn: async (): Promise<SystemSettingsDto> => {
      const data = (await unwrapApi(
        (apiClient as any).GET('/admin/settings', {})
      )) as any;
      return {
        aiDailyQuota: data?.aiDailyQuota ?? 20,
        aiLlmProvider: data?.aiLlmProvider ?? 'GEMINI',
      };
    },
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<SystemSettingsDto>): Promise<SystemSettingsDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/admin/settings', {
          body,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.settings() });
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.quota() });
    },
  });
}
