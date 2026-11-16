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
    overview: (courseId: string, timeRange?: string) =>
      ['courses', 'overview', courseId, timeRange ?? 'ALL_TIME'] as const,
    myCourses: (params?: Record<string, unknown>) =>
      ['courses', 'myCourses', params ?? {}] as const,
    myInvitations: () => ['courses', 'myInvitations'] as const,
    myCreated: (params?: Record<string, unknown>) =>
      ['courses', 'myCreated', params ?? {}] as const,
    bookmarks: (params?: Record<string, unknown>) =>
      ['courses', 'bookmarks', params ?? {}] as const,
    students: (courseId: string, status?: string) =>
      ['courses', 'students', courseId, status ?? 'ALL'] as const,
    enrollmentRequests: (courseId: string) =>
      ['courses', 'enrollmentRequests', courseId] as const,
    nominationsSummary: (courseId: string) =>
      ['courses', 'nominationsSummary', courseId] as const,
    stats: (courseId: string) =>
      ['courses', 'stats', courseId] as const,
  },
  learning: {
    all: ['learning'] as const,
    progress: (courseId: string) => ['learning', 'progress', courseId] as const,
    chapter: (courseId: string, chapterId: string) =>
      ['learning', 'chapter', courseId, chapterId] as const,
    myBookmarks: () => ['learning', 'myBookmarks'] as const,
    comments: (courseId: string, params?: Record<string, unknown>) =>
      ['learning', 'comments', courseId, params ?? {}] as const,
    commentsSummary: (courseId: string) =>
      ['learning', 'commentsSummary', courseId] as const,
    quizAttempts: (courseId: string, blockId: string) =>
      ['learning', 'quizAttempts', courseId, blockId] as const,
    quizAttempt: (attemptId: string) =>
      ['learning', 'quizAttempt', attemptId] as const,
    assignmentSubmission: (courseId: string, blockId: string) =>
      ['learning', 'assignmentSubmission', courseId, blockId] as const,
    pendingSubmissions: (courseId: string) =>
      ['learning', 'pendingSubmissions', courseId] as const,
  },
  assessment: {
    all: ['assessment'] as const,
    config: (courseId: string) => ['assessment', 'config', courseId] as const,
    assessableBlocks: (courseId: string) => ['assessment', 'assessableBlocks', courseId] as const,
    component: (courseId: string, blockId: string) => ['assessment', 'component', courseId, blockId] as const,
    gradingQueue: (courseId: string, params?: Record<string, unknown>) =>
      ['assessment', 'gradingQueue', courseId, params ?? {}] as const,
    quizAttemptReview: (attemptId: string) => ['assessment', 'quizAttemptReview', attemptId] as const,
    submissionForGrading: (submissionId: string) => ['assessment', 'submissionForGrading', submissionId] as const,
    gradebookMe: (courseId: string) => ['assessment', 'gradebookMe', courseId] as const,
    studentGradebook: (courseId: string, userId: string) => ['assessment', 'studentGradebook', courseId, userId] as const,
    courseGradebook: (courseId: string, params?: Record<string, unknown>) =>
      ['assessment', 'courseGradebook', courseId, params ?? {}] as const,
    componentScores: (courseId: string, blockId: string) => ['assessment', 'componentScores', courseId, blockId] as const,
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
    chapterAccess: (courseId: string, chapterId: string) =>
      ['content', 'chapterAccess', courseId, chapterId] as const,
    resources: (courseId: string) => ['content', 'resources', courseId] as const,
    resourceDownloadUrl: (courseId: string, resourceId: string) =>
      ['content', 'resourceDownloadUrl', courseId, resourceId] as const,
    questions: (courseId: string, params?: Record<string, unknown>) =>
      ['content', 'questions', courseId, params ?? {}] as const,
    questionDetail: (courseId: string, questionId: string) =>
      ['content', 'questionDetail', courseId, questionId] as const,
    questionUsage: (courseId: string, questionId: string) =>
      ['content', 'questionUsage', courseId, questionId] as const,
    quizExceptions: (courseId: string, blockId: string) =>
      ['content', 'quizExceptions', courseId, blockId] as const,
  },
  discovery: {
    all: ['discovery'] as const,
    home: () => ['discovery', 'home'] as const,
    courses: (params?: Record<string, unknown>) => ['discovery', 'courses', params ?? {}] as const,
    top10: (metric: string, window: string) => ['discovery', 'top10', metric, window] as const,
    searchHistory: () => ['discovery', 'searchHistory'] as const,
    ranking: (courseId: string) => ['discovery', 'ranking', courseId] as const,
  },
  admin: {
    all: ['admin'] as const,
    overview: () => ['admin', 'overview'] as const,
    users: (params?: Record<string, unknown>) => ['admin', 'users', params ?? {}] as const,
    auditLogs: (params?: Record<string, unknown>) => ['admin', 'auditLogs', params ?? {}] as const,
  },
} as const;
