export type AiSourceKind = 'PASTED_TEXT' | 'CHAPTER';
export type AiJobType = 'QUIZ' | 'FLASHCARD';
export type AiJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AiJobRequest {
  sourceKind: AiSourceKind;
  sourceText?: string;
  sourceChapterId?: string;
  count?: number;
  difficulty?: string;
  typeFilter?: string[];
}

export interface AiJobDto {
  id: string;
  jobType: AiJobType;
  status: AiJobStatus;
  resultCount?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface AiQuotaDto {
  used: number;
  limit: number;
  remaining: number;
}

export interface SystemSettingsDto {
  aiDailyQuota: number;
  aiLlmProvider: 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
}
