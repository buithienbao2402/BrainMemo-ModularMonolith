export interface AdminUserSummary {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  isLocked: boolean;
  lockType?: string | null;
  lockedUntil?: string | null;
  lockReason?: string | null;
  createdAt: string;
}

export interface AdminLockUserRequest {
  reason: string;
  type: 'TEMPORARY' | 'PERMANENT';
  until?: string;
}

export interface AdminUnlockUserRequest {
  reason: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
