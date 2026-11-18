import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys, unwrapApi } from '@/shared/api';

export interface SubmissionFileRefDto {
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  contentType: string;
}

export interface SubmissionDto {
  id: string;
  courseId: string;
  blockId: string;
  userId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
  textContent?: string | null;
  files?: SubmissionFileRefDto[] | null;
  isLate?: boolean | null;
  submittedAt?: string | null;
  score?: number | null;
  feedback?: string | null;
}

export interface SubmissionUpsertDto {
  textContent?: string;
  fileUploadKeys?: string[];
}

export interface PendingSubmissionItemDto {
  submissionId: string;
  blockId: string;
  blockTitle: string;
  learnerId: string;
  learnerDisplayName: string;
  submittedAt?: string | null;
}

export function useMyAssignmentSubmission(courseId: string, blockId: string) {
  return useQuery({
    queryKey: queryKeys.learning.assignmentSubmission(courseId, blockId),
    queryFn: async (): Promise<SubmissionDto> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/assignments/{blockId}/submission', {
          params: { path: { courseId, blockId } },
        }),
      );
    },
    enabled: Boolean(courseId && blockId),
  });
}

export function useSaveAssignmentDraft(courseId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmissionUpsertDto): Promise<SubmissionDto> => {
      return unwrapApi(
        (apiClient as any).PUT('/courses/{courseId}/assignments/{blockId}/submission/draft', {
          params: { path: { courseId, blockId } },
          body: payload,
        }),
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.learning.assignmentSubmission(courseId, blockId),
        data,
      );
    },
  });
}

export function useSubmitAssignment(courseId: string, blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SubmissionDto> => {
      return unwrapApi(
        (apiClient as any).POST('/courses/{courseId}/assignments/{blockId}/submission/submit', {
          params: { path: { courseId, blockId } },
        }),
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.learning.assignmentSubmission(courseId, blockId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.learning.progress(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessment.gradebookMe(courseId),
      });
    },
  });
}

export function usePendingSubmissions(courseId: string) {
  return useQuery({
    queryKey: queryKeys.learning.pendingSubmissions(courseId),
    queryFn: async (): Promise<PendingSubmissionItemDto[]> => {
      return unwrapApi(
        (apiClient as any).GET('/courses/{courseId}/submissions/pending', {
          params: { path: { courseId } },
        }),
      );
    },
    enabled: Boolean(courseId),
  });
}
