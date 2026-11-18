export type ReportSource = 'USER';
export type ReportTargetType = 'COURSE' | 'COMMENT';
export type ReportStatus = 'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED';
export type EvidenceKind = 'TEXT_EXCERPT' | 'IMAGE_URL' | 'LINK';

export type SanctionType =
  | 'COURSE_HIDE'
  | 'COMMENT_DELETE'
  | 'ACCOUNT_LOCK_TEMPORARY'
  | 'ACCOUNT_LOCK_PERMANENT'
  | 'COURSE_PERMANENT_DELETE';

export type SanctionTargetType = 'COURSE' | 'COMMENT' | 'ACCOUNT';
export type SanctionStatus = 'ACTIVE' | 'LIFTED' | 'EXPIRED';
export type LiftKind = 'MANUAL' | 'AUTO_EXPIRED';

export type AuditActorType = 'ADMIN' | 'SYSTEM';
export type AuditAction =
  | 'REPORT_CREATE'
  | 'REPORT_RESOLVE'
  | 'SANCTION_APPLY'
  | 'SANCTION_LIFT'
  | 'COURSE_HIDE'
  | 'COMMENT_DELETE'
  | 'ACCOUNT_LOCK'
  | 'ACCOUNT_UNLOCK';

export type AuditObjectType = 'REPORT' | 'SANCTION' | 'COURSE' | 'COMMENT' | 'USER_ACCOUNT';

export interface ReportEvidenceDto {
  id: string;
  kind: EvidenceKind;
  content: string;
}

export interface ReportDto {
  id: string;
  reportNumber: string;
  source: ReportSource;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  reporterUserId?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  resolutionNote?: string | null;
  resolverUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  evidences: ReportEvidenceDto[];
}

export interface ReportTargetContentDto {
  targetType: string;
  targetId: string;
  contentSnapshot: string;
  metadata?: Record<string, unknown> | null;
}

export interface SanctionDto {
  id: string;
  reportId?: string | null;
  type: SanctionType;
  targetType: SanctionTargetType;
  targetId: string;
  reason: string;
  durationHours?: number | null;
  expiresAt?: string | null;
  status: SanctionStatus;
  appliedByUserId: string;
  appliedAt: string;
  liftedAt?: string | null;
  liftedByUserId?: string | null;
  liftReason?: string | null;
  liftKind?: LiftKind | null;
}

export interface AuditLogDto {
  id: string;
  occurredAt: string;
  actorType: AuditActorType;
  actorUserId?: string | null;
  actorName?: string | null;
  action: AuditAction;
  objectType: AuditObjectType;
  objectId: string;
  ipAddress?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ModerationDashboardDto {
  pendingReportsCount: number;
  pendingAiFlagsCount?: number;
  pendingCourseReviewsCount: number;
  activeSanctionsCount: number;
  lockedUsersCount: number;
  hiddenCoursesCount: number;
  recentAuditLogs: AuditLogDto[];
}

export interface CourseReviewQueueItemDto {
  courseId: string;
  name: string;
  description?: string | null;
  accessMode: string;
  publishStatus: 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';
  owner: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  submittedForReviewAt?: string | null;
  rejectionReason?: string | null;
}

export interface PagedListResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
  evidenceUrls?: string[];
}

export interface SanctionRequestItem {
  type: SanctionType;
  targetType: SanctionTargetType;
  targetId: string;
  reason: string;
  durationDays?: number;
  durationHours?: number;
}

export interface ResolveReportRequest {
  resolution: 'ACCEPTED' | 'REJECTED';
  note?: string;
  sanctions?: SanctionRequestItem[];
}

export interface DirectSanctionRequest {
  type: SanctionType;
  targetType: SanctionTargetType;
  targetId: string;
  reason: string;
  durationDays?: number;
  durationHours?: number;
}

export interface LiftSanctionRequest {
  reason: string;
}
