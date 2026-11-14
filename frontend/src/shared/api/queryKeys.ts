/**
 * Hierarchical TanStack Query key factories shared across modules.
 */
export const queryKeys = {
  health: ['health'] as const,
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
    sessions: () => ['auth', 'sessions'] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => ['profile', 'me'] as const,
    detail: (userId: string) => ['profile', 'detail', userId] as const,
    courses: (userId: string, params?: Record<string, unknown>) =>
      ['profile', 'courses', userId, params ?? {}] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (params?: Record<string, unknown>) => ['courses', 'list', params ?? {}] as const,
    detail: (courseId: string) => ['courses', 'detail', courseId] as const,
    myCourses: (params?: Record<string, unknown>) =>
      ['courses', 'myCourses', params ?? {}] as const,
    myInvitations: () => ['courses', 'myInvitations'] as const,
    myCreated: (params?: Record<string, unknown>) =>
      ['courses', 'myCreated', params ?? {}] as const,
    bookmarks: (params?: Record<string, unknown>) =>
      ['courses', 'bookmarks', params ?? {}] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params?: Record<string, unknown>) => ['notifications', 'list', params ?? {}] as const,
    unreadCount: () => ['notifications', 'unreadCount'] as const,
  },
  content: {
    all: ['content'] as const,
    chapters: (courseId: string) => ['content', 'chapters', courseId] as const,
    chapterDraft: (courseId: string, chapterId: string) =>
      ['content', 'chapterDraft', courseId, chapterId] as const,
    chapterVersions: (courseId: string, chapterId: string, params?: Record<string, unknown>) =>
      ['content', 'chapterVersions', courseId, chapterId, params ?? {}] as const,
    resources: (courseId: string) => ['content', 'resources', courseId] as const,
    resourceDownloadUrl: (courseId: string, resourceId: string) =>
      ['content', 'resourceDownloadUrl', courseId, resourceId] as const,
  },
  admin: {
    all: ['admin'] as const,
    overview: () => ['admin', 'overview'] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params ?? {}] as const,
    auditLogs: (params?: Record<string, unknown>) => ['admin', 'auditLogs', params ?? {}] as const,
  },
} as const;
