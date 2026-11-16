import { http, HttpResponse } from 'msw';
import type { AuthTokens, CurrentUser, ProblemDetails, ProfileDto } from '@/shared/api';
import type { SessionDto } from '@/features/identity/api';

export type MockPersona = 'guest' | 'user' | 'unverified' | 'admin' | 'locked';

export function setMockPersonaCookie(persona: MockPersona): void {
  if (typeof document !== 'undefined') {
    document.cookie = `bm_mock_persona=${persona}; path=/`;
  }
}

export const mockUsers: Record<Exclude<MockPersona, 'guest' | 'locked'>, CurrentUser> = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'quang.tran@brainmemo.vn',
    emailVerified: true,
    isAdmin: false,
    accountStatus: 'ACTIVE',
  },
  unverified: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'hocvien.moi@brainmemo.vn',
    emailVerified: false,
    isAdmin: false,
    accountStatus: 'ACTIVE',
  },
  admin: {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'admin@brainmemo.vn',
    emailVerified: true,
    isAdmin: true,
    accountStatus: 'ACTIVE',
  },
};

export const initialMockProfiles: Record<Exclude<MockPersona, 'guest' | 'locked'>, ProfileDto> = {
  user: {
    userId: mockUsers.user.id,
    displayName: 'Quang Trần',
    avatarUrl: null,
    bio: 'Học viên & tác giả khóa học BrainMemo',
    showCourseList: true,
    uiTheme: 'DARK',
    joinedAt: '2026-01-15T08:00:00Z',
  },
  unverified: {
    userId: mockUsers.unverified.id,
    displayName: 'Minh Anh',
    avatarUrl: null,
    bio: 'Tài khoản mới đang chờ xác minh email',
    showCourseList: true,
    uiTheme: 'LIGHT',
    joinedAt: '2026-10-01T08:00:00Z',
  },
  admin: {
    userId: mockUsers.admin.id,
    displayName: 'Quản trị BrainMemo',
    avatarUrl: null,
    bio: 'Điều phối kiểm duyệt & vận hành hệ thống',
    showCourseList: false,
    uiTheme: 'DARK',
    joinedAt: '2025-12-01T08:00:00Z',
  },
};

export function getStoredProfiles(): Record<Exclude<MockPersona, 'guest' | 'locked'>, ProfileDto> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_profiles');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return { ...initialMockProfiles };
}

export function saveStoredProfiles(profiles: Record<Exclude<MockPersona, 'guest' | 'locked'>, ProfileDto>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_profiles', JSON.stringify(profiles));
    } catch {}
  }
}

export const mockProfiles: Record<Exclude<MockPersona, 'guest' | 'locked'>, ProfileDto> = getStoredProfiles();

export const initialMockSessions: SessionDto[] = [
  {
    id: 'session-1-current',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
    ipAddress: '127.0.0.1',
    createdAt: '2026-11-13T08:00:00Z',
    lastUsedAt: '2026-11-13T10:00:00Z',
    isCurrent: true,
  },
  {
    id: 'session-2-mobile',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    ipAddress: '192.168.1.45',
    createdAt: '2026-11-10T14:20:00Z',
    lastUsedAt: '2026-11-12T19:30:00Z',
    isCurrent: false,
  },
  {
    id: 'session-3-work',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129.0.0.0',
    ipAddress: '14.161.22.8',
    createdAt: '2026-11-05T09:15:00Z',
    lastUsedAt: '2026-11-11T16:45:00Z',
    isCurrent: false,
  },
];

export let mockSessions: SessionDto[] = [...initialMockSessions];

export function resetMockSessions(): void {
  mockSessions = [...initialMockSessions];
}

export interface MockCourseItem {
  id: string;
  name: string;
  description?: string | null;
  coverUrl: string | null;
  accessMode: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME';
  status: 'UPDATING' | 'COMPLETED' | 'PAUSED' | 'PUBLISHED' | 'DRAFT' | 'HIDDEN';
  isHidden?: boolean;
  isDeleted?: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  owner?: {
    id?: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  viewer: {
    isOwner: boolean;
    enrollmentStatus: string | null;
    canReadContent: boolean;
    canLearn: boolean;
    hasNominated: boolean;
  };
  ratingAvg: number | null;
  ratingCount: number;
  learnerCount?: number;
  chapterCount?: number;
  pendingReviews?: number;
  pendingGrades?: number;
  progressPercent?: number | null;
}

export const initialMockCourses: MockCourseItem[] = [
  {
    id: 'my-course-1',
    name: 'Khóa học do tôi biên soạn',
    description: 'Khóa học thực chiến hướng dẫn toàn diện từ cơ bản đến nâng cao.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'PUBLIC',
    status: 'UPDATING',
    isHidden: false,
    isDeleted: false,
    tags: ['python', 'backend'],
    learnerCount: 1240,
    chapterCount: 24,
    ratingAvg: 4.8,
    ratingCount: 320,
    pendingReviews: 5,
    pendingGrades: 12,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
  {
    id: 'my-course-2',
    name: 'Kiến trúc Microservices & Distributed Systems thực chiến',
    description: 'Thiết kế hệ thống chịu tải cao và kiến trúc phân tán.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'PRIVATE',
    status: 'UPDATING',
    isHidden: false,
    isDeleted: false,
    tags: ['microservices', 'distributed'],
    learnerCount: 840,
    chapterCount: 16,
    ratingAvg: 4.9,
    ratingCount: 180,
    pendingReviews: 3,
    pendingGrades: 8,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
  {
    id: 'my-course-3',
    name: 'Khoa học Dữ liệu ứng dụng với Python, Pandas & Scikit-Learn',
    description: 'Phân tích dữ liệu và machine learning cơ bản.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'PUBLIC',
    status: 'COMPLETED',
    isHidden: false,
    isDeleted: false,
    tags: ['datascience', 'python'],
    learnerCount: 3420,
    chapterCount: 32,
    ratingAvg: 4.9,
    ratingCount: 880,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
  {
    id: 'my-course-4',
    name: 'Thực hành Web Scraping nâng cao & Automation Bot',
    description: 'Khóa học riêng tư dành riêng cho tác giả biên soạn.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'ONLY_ME',
    status: 'HIDDEN',
    isHidden: true,
    isDeleted: false,
    tags: ['webscraping', 'automation'],
    learnerCount: 210,
    chapterCount: 8,
    ratingAvg: 4.7,
    ratingCount: 45,
    createdAt: '2026-05-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
  {
    id: 'my-course-5',
    name: 'Xây dựng Design System chuyên nghiệp với React & Tailwind',
    description: 'Thiết kế và xây dựng UI component library tái sử dụng.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'PUBLIC',
    status: 'PAUSED',
    isHidden: false,
    isDeleted: false,
    tags: ['designsystem', 'react'],
    learnerCount: 1890,
    chapterCount: 18,
    ratingAvg: 4.8,
    ratingCount: 290,
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
  {
    id: 'my-course-6',
    name: 'Cấu trúc Dữ liệu & Giải thuật: Chinh phục Phỏng vấn Big Tech',
    description: 'Luyện thuật toán và cấu trúc dữ liệu phỏng vấn.',
    coverUrl: null,
    owner: { id: mockUsers.user.id, displayName: 'Quang Trần', avatarUrl: null },
    accessMode: 'PUBLIC',
    status: 'UPDATING',
    isHidden: false,
    isDeleted: false,
    tags: ['dsa', 'algorithms'],
    learnerCount: 5100,
    chapterCount: 40,
    ratingAvg: 4.9,
    ratingCount: 1120,
    pendingGrades: 16,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    viewer: {
      isOwner: true,
      enrollmentStatus: null,
      canReadContent: true,
      canLearn: true,
      hasNominated: false,
    },
  },
];

export function getStoredCourses(): MockCourseItem[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_courses');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return [...initialMockCourses];
}

export function saveStoredCourses(courses: MockCourseItem[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_courses', JSON.stringify(courses));
    } catch {}
  }
}

export let mockCourses: MockCourseItem[] = getStoredCourses();

export interface MockChapterItem {
  id: string;
  courseId?: string;
  position: number;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  accessMode: string;
  passcode?: string | null;
  hasUnpublishedChanges: boolean;
  lastVersionNo: number;
  publishedVersionNo: number | null;
  blocks: Array<Record<string, unknown>>;
}

export interface MockVersionItem {
  versionNo: number;
  createdAt: string;
  publishedAt: string | null;
  restoredFromVersionNo: number | null;
  title?: string;
  description?: string;
  blocks?: Array<Record<string, unknown>>;
  authorName?: string;
}

export interface MockResourceItem {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'ARCHIVE' | 'OTHER';
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export const initialMockChapters: Record<string, MockChapterItem[]> = {
  'my-course-1': [
    {
      id: 'chapter-1111-1111',
      position: 1,
      title: 'Chương 1: Giới thiệu kiến trúc Modular Monolith',
      description: 'Tìm hiểu tổng quan về kiến trúc và các nguyên lý thiết kế.',
      status: 'PUBLISHED',
      accessMode: 'PUBLIC',
      hasUnpublishedChanges: false,
      lastVersionNo: 1,
      publishedVersionNo: 1,
      blocks: [
        {
          id: 'block-1111',
          blockType: 'RICH_TEXT',
          position: 1,
          title: 'Tổng quan bài học',
          body: '<p>Chào mừng bạn đến với khóa học <strong>BrainMemo Modular Monolith</strong>!</p>',
        },
        {
          id: 'block-2222',
          blockType: 'MARKDOWN',
          position: 2,
          title: 'Nguyên lý thiết kế',
          body: '### Quy ước module\n- Mỗi module một DbContext\n- Không tham chiếu chéo tầng domain',
        },
        {
          id: 'block-3333',
          blockType: 'FLASHCARD',
          position: 3,
          title: 'Bộ thẻ nhớ ôn tập',
          flashcards: [
            { id: 'fc-1', frontText: 'Modular Monolith là gì?', backText: 'Hệ thống đơn khối chia ranh giới module rõ ràng qua contracts.' },
            { id: 'fc-2', frontText: 'DEC-05 quy định gì?', backText: 'Client upload trực tiếp qua presigned URL; ảnh <= 5MB, tệp <= 20MB.' },
          ],
          aiReviewStatus: 'APPROVED',
        },
        {
          id: 'block-5555',
          blockType: 'QUESTION',
          position: 4,
          title: 'Câu hỏi kiểm tra nhanh',
          question: {
            questionType: 'SINGLE_CHOICE',
            stem: 'Trong kiến trúc Modular Monolith, các module giao tiếp với nhau bằng cách nào?',
            options: [
              { id: 'opt-1', content: 'Gọi API HTTP qua mạng Internet' },
              { id: 'opt-2', content: 'Thông qua IModuleContract và Contracts project in-process' },
              { id: 'opt-3', content: 'Truy vấn trực tiếp DbContext của module khác' },
              { id: 'opt-4', content: 'Chia sẻ các entity Domain nội bộ' },
            ],
            matchingPairs: [],
          },
          correctOptionId: 'opt-2',
          explanation: 'Các module trong Modular Monolith giao tiếp in-process thông qua interface công khai định nghĩa trong *.Contracts.',
        },
      ],
    },
    {
      id: 'chapter-3333-protected',
      position: 3,
      title: 'Chương 3: Bảo mật & Phân quyền nâng cao (Protected)',
      description: 'Chương học nâng cao yêu cầu passcode.',
      status: 'PUBLISHED',
      accessMode: 'PROTECTED',
      passcode: '1234',
      hasUnpublishedChanges: false,
      lastVersionNo: 1,
      publishedVersionNo: 1,
      blocks: [
        {
          id: 'block-sec-1',
          blockType: 'RICH_TEXT',
          position: 1,
          title: 'Nội dung bảo mật đặc biệt',
          body: '<p>Bạn đã mở khóa thành công chương bảo vệ bằng Passcode!</p>',
        },
      ],
    },
    {
      id: 'chapter-2222-2222',
      position: 2,
      title: 'Chương 2: Thiết kế CSDL & Domain Entity',
      description: 'Chi tiết các bảng cnt_* và quy tắc persistence.',
      status: 'DRAFT',
      accessMode: 'PUBLIC',
      hasUnpublishedChanges: true,
      lastVersionNo: 1,
      publishedVersionNo: null,
      blocks: [
        {
          id: 'block-4444',
          blockType: 'RICH_TEXT',
          position: 1,
          title: 'Cơ sở dữ liệu',
          body: '<p>Quy ước bảng và EF Core migration trong BrainMemo.</p>',
        },
      ],
    },
  ],
  'course-intro-1': [
    {
      id: 'chapter-intro-1',
      position: 1,
      title: 'Chương 1: Nhập môn kiến trúc LMS',
      description: 'Làm quen với các thuật ngữ cốt lõi.',
      status: 'PUBLISHED',
      accessMode: 'PUBLIC',
      hasUnpublishedChanges: false,
      lastVersionNo: 1,
      publishedVersionNo: 1,
      blocks: [],
    },
  ],
};

export const initialMockVersions: Record<string, MockVersionItem[]> = {
  'chapter-1111-1111': [
    {
      versionNo: 1,
      createdAt: '2026-11-10T08:00:00Z',
      publishedAt: null,
      restoredFromVersionNo: null,
    },
    {
      versionNo: 2,
      createdAt: '2026-11-12T10:00:00Z',
      publishedAt: '2026-11-12T10:30:00Z',
      restoredFromVersionNo: null,
    },
  ],
  'chapter-2222-2222': [
    {
      versionNo: 1,
      createdAt: '2026-11-13T09:00:00Z',
      publishedAt: null,
      restoredFromVersionNo: null,
    },
  ],
};

export const initialMockResources: Record<string, MockResourceItem[]> = {
  'my-course-1': [
    {
      id: 'res-img-01',
      kind: 'IMAGE',
      originalFilename: 'architecture-diagram.png',
      contentType: 'image/png',
      sizeBytes: 1048576,
      createdAt: '2026-11-10T09:00:00Z',
    },
    {
      id: 'res-pdf-01',
      kind: 'PDF',
      originalFilename: 'course-syllabus.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2450000,
      createdAt: '2026-11-11T14:00:00Z',
    },
  ],
  'course-intro-1': [
    {
      id: 'res-intro-01',
      kind: 'IMAGE',
      originalFilename: 'welcome-banner.png',
      contentType: 'image/png',
      sizeBytes: 524288,
      createdAt: '2026-11-01T08:00:00Z',
    },
  ],
};

export let mockChapters: Record<string, MockChapterItem[]> = JSON.parse(
  JSON.stringify(initialMockChapters)
);
export let mockVersions: Record<string, MockVersionItem[]> = JSON.parse(
  JSON.stringify(initialMockVersions)
);
export interface MockEnrollmentItem {
  id: string;
  courseId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  };
  status: 'PENDING_APPROVAL' | 'INVITED' | 'ACTIVE' | 'LEFT' | 'REMOVED';
  requestId?: string | null;
  statusChangedAt: string;
}

export const initialMockEnrollments: Record<string, MockEnrollmentItem[]> = {
  'my-course-1': [
    {
      id: 'enr-1',
      courseId: 'my-course-1',
      user: {
        id: 'u-std-1',
        displayName: 'Nguyễn Văn An',
        email: 'an.nguyen@example.com',
        avatarUrl: null,
      },
      status: 'ACTIVE',
      requestId: null,
      statusChangedAt: '2026-11-10T10:00:00Z',
    },
    {
      id: 'enr-2',
      courseId: 'my-course-1',
      user: {
        id: 'u-std-2',
        displayName: 'Trần Thị Bình',
        email: 'binh.tran@example.com',
        avatarUrl: null,
      },
      status: 'ACTIVE',
      requestId: null,
      statusChangedAt: '2026-11-11T14:30:00Z',
    },
    {
      id: 'enr-3',
      courseId: 'my-course-1',
      user: {
        id: 'u-std-3',
        displayName: 'Lê Hoàng Cường',
        email: 'cuong.le@example.com',
        avatarUrl: null,
      },
      status: 'PENDING_APPROVAL',
      requestId: 'req-s4-1',
      statusChangedAt: '2026-11-14T09:15:00Z',
    },
    {
      id: 'enr-4',
      courseId: 'my-course-1',
      user: {
        id: 'u-std-4',
        displayName: 'Phạm Thu Dung',
        email: 'dung.pham@example.com',
        avatarUrl: null,
      },
      status: 'INVITED',
      requestId: null,
      statusChangedAt: '2026-11-15T08:00:00Z',
    },
    {
      id: 'enr-5',
      courseId: 'my-course-1',
      user: {
        id: 'u-std-5',
        displayName: 'Vũ Đức Em',
        email: 'em.vu@example.com',
        avatarUrl: null,
      },
      status: 'REMOVED',
      requestId: null,
      statusChangedAt: '2026-11-12T16:00:00Z',
    },
  ],
};

export let mockEnrollments: Record<string, MockEnrollmentItem[]> = JSON.parse(
  JSON.stringify(initialMockEnrollments)
);

export let mockUnlockedChapters = new Set<string>();
export let mockCompletedBlocks: Record<string, string[]> = {
  'my-course-1': ['block-1111'],
};
export let mockBookmarks: Array<{
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterTitle: string;
  updatedAt: string;
}> = [
  {
    courseId: 'my-course-1',
    courseName: 'Khóa học Thiết kế hệ thống',
    chapterId: 'chapter-1111-1111',
    chapterTitle: 'Chương 1: Giới thiệu kiến trúc Modular Monolith',
    updatedAt: new Date().toISOString(),
  },
];
export let mockSearchHistory: Array<{
  queryText: string;
  createdAt: string;
}> = [
  { queryText: 'React', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { queryText: 'Dotnet', createdAt: new Date(Date.now() - 7200000).toISOString() },
];
export let passcodeAttempts: Record<string, number> = {};

export function getStoredEnrollments(): Record<string, MockEnrollmentItem[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_enrollments');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return mockEnrollments;
}

export function saveStoredEnrollments(enrollments: Record<string, MockEnrollmentItem[]>): void {
  mockEnrollments = enrollments;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_enrollments', JSON.stringify(enrollments));
    } catch {}
  }
}

export let mockResources: Record<string, MockResourceItem[]> = JSON.parse(
  JSON.stringify(initialMockResources)
);

export function getStoredChapters(): Record<string, MockChapterItem[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_chapters');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return mockChapters;
}

export function saveStoredChapters(chapters: Record<string, MockChapterItem[]>): void {
  mockChapters = chapters;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_chapters', JSON.stringify(chapters));
    } catch {}
  }
}

export function getStoredVersions(): Record<string, MockVersionItem[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_versions');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return mockVersions;
}

export function saveStoredVersions(versions: Record<string, MockVersionItem[]>): void {
  mockVersions = versions;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_versions', JSON.stringify(versions));
    } catch {}
  }
}

export function getStoredResources(): Record<string, MockResourceItem[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_resources');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return mockResources;
}

export function saveStoredResources(resources: Record<string, MockResourceItem[]>): void {
  mockResources = resources;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_resources', JSON.stringify(resources));
    } catch {}
  }
}

export interface MockNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  payload?: any;
}

export const initialMockNotifications: MockNotificationItem[] = [
  {
    id: 'ntf-1',
    type: 'COMMENT',
    title: 'Bình luận mới về khóa học',
    body: 'Học viên Nguyễn Văn A đã bình luận về khóa học "Lập trình Web hiện đại".',
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    payload: { courseId: 'c1' },
  },
  {
    id: 'ntf-2',
    type: 'ENROLLMENT',
    title: 'Học viên mới tham gia',
    body: 'Trần Thị B đã ghi danh vào khóa học của bạn.',
    readAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    payload: { courseId: 'c1' },
  },
  {
    id: 'ntf-3',
    type: 'NEW_CHAPTER',
    title: 'Chương mới đã xuất bản',
    body: 'Khóa học bạn đang theo dõi vừa ra mắt chương mới.',
    readAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    payload: { courseId: 'c1', chapterId: 'ch1' },
  },
];

export interface MockCommentItem {
  id: string;
  courseId: string;
  chapterId: string | null;
  parentCommentId?: string | null;
  author: { id: string; displayName: string; avatarUrl?: string };
  content: string;
  isPinned: boolean;
  isDeleted?: boolean;
  editedAt: string | null;
  createdAt: string;
  replies?: MockCommentItem[];
}

export const initialMockComments: Record<string, MockCommentItem[]> = {
  'my-course-1': [
    {
      id: 'cmt-1',
      courseId: 'my-course-1',
      chapterId: null,
      author: { id: 'user-1', displayName: 'Lê Minh Tuấn' },
      content: 'Khóa học này giải thích rất dễ hiểu và chi tiết!',
      isPinned: true,
      editedAt: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      replies: [
        {
          id: 'cmt-reply-1',
          courseId: 'my-course-1',
          chapterId: null,
          author: { id: 'owner-1', displayName: 'Giảng viên Quang Trần' },
          parentCommentId: 'cmt-1',
          content: 'Cảm ơn Tuấn nhé! Chúc bạn học tốt!',
          isPinned: false,
          editedAt: null,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ],
    },
  ],
};

export const initialMockNominations: Record<string, { count: number; hasNominated: boolean }> = {
  'course-intro-1': { count: 15, hasNominated: false },
  'my-course-1': { count: 10, hasNominated: false },
};

export function getStoredNotifications(): MockNotificationItem[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_notifications');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return JSON.parse(JSON.stringify(initialMockNotifications));
}

export function saveStoredNotifications(items: MockNotificationItem[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_notifications', JSON.stringify(items));
    } catch {}
  }
}

export function getStoredComments(): Record<string, MockCommentItem[]> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_comments');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return JSON.parse(JSON.stringify(initialMockComments));
}

export function saveStoredComments(items: Record<string, MockCommentItem[]>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_comments', JSON.stringify(items));
    } catch {}
  }
}

export function getStoredNominations(): Record<string, { count: number; hasNominated: boolean }> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bm_mock_nominations');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
  }
  return JSON.parse(JSON.stringify(initialMockNominations));
}

export function saveStoredNominations(items: Record<string, { count: number; hasNominated: boolean }>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bm_mock_nominations', JSON.stringify(items));
    } catch {}
  }
}

export function resetMockCourses(): void {
  mockCourses = [...initialMockCourses];
  mockChapters = JSON.parse(JSON.stringify(initialMockChapters));
  mockVersions = JSON.parse(JSON.stringify(initialMockVersions));
  mockResources = JSON.parse(JSON.stringify(initialMockResources));
  mockEnrollments = JSON.parse(JSON.stringify(initialMockEnrollments));
  mockUnlockedChapters.clear();
  mockCompletedBlocks = { 'my-course-1': ['block-1111'] };
  mockBookmarks = [
    {
      courseId: 'my-course-1',
      courseName: 'Khóa học Thiết kế hệ thống',
      chapterId: 'chapter-1111-1111',
      chapterTitle: 'Chương 1: Giới thiệu kiến trúc Modular Monolith',
      updatedAt: new Date().toISOString(),
    },
  ];
  mockSearchHistory = [
    { queryText: 'React', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { queryText: 'Dotnet', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ];
  passcodeAttempts = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('bm_mock_courses');
      window.localStorage.removeItem('bm_mock_profiles');
      window.localStorage.removeItem('bm_mock_chapters');
      window.localStorage.removeItem('bm_mock_versions');
      window.localStorage.removeItem('bm_mock_resources');
      window.localStorage.removeItem('bm_mock_enrollments');
      window.localStorage.removeItem('bm_mock_notifications');
      window.localStorage.removeItem('bm_mock_comments');
      window.localStorage.removeItem('bm_mock_nominations');
    } catch {
      // ignore
    }
  }
}

function readPersonaFromCookie(request: Request): MockPersona {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.includes('mock-access-token-admin')) return 'admin';
  if (authHeader.includes('mock-access-token-unverified')) return 'unverified';
  if (authHeader.includes('mock-access-token-user') || authHeader.includes('mock-access-token-google')) return 'user';

  const cookieHeader =
    request.headers.get('cookie') ?? (typeof document !== 'undefined' ? document.cookie : '');
  const match = cookieHeader.match(/(?:^|;\s*)bm_mock_persona=([^;]+)/);
  const value = match?.[1]?.trim();
  if (
    value === 'user' ||
    value === 'unverified' ||
    value === 'admin' ||
    value === 'locked' ||
    value === 'guest'
  ) {
    return value;
  }
  return 'guest';
}

function problemResponse(status: number, body: ProblemDetails) {
  return HttpResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

export const submittedQuizAttemptIds = new Set<string>();

export const handlers = [
  http.post('*/api/v1/auth/refresh', ({ request }) => {
    const persona = readPersonaFromCookie(request);

    if (persona === 'locked') {
      return problemResponse(403, {
        title: 'Tài khoản đang bị khóa',
        status: 403,
        code: 'ACCOUNT_LOCKED',
        lockReason: 'Vi phạm quy tắc nội dung cộng đồng',
        lockedUntil: null,
      });
    }

    if (persona === 'guest') {
      return problemResponse(401, {
        title: 'Chưa có phiên đăng nhập hợp lệ',
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = mockUsers[persona];
    const tokens: AuthTokens = {
      accessToken: `mock-access-token-${persona}`,
      expiresIn: 1800,
      user,
    };
    return HttpResponse.json(tokens, {
      status: 200,
      headers: {
        'Set-Cookie': `bm_mock_persona=${persona}; Path=/; SameSite=Lax`,
      },
    });
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [
          ...(!body.email ? [{ field: 'email', message: 'Vui lòng nhập địa chỉ email' }] : []),
          ...(!body.password ? [{ field: 'password', message: 'Vui lòng nhập mật khẩu' }] : []),
        ],
      });
    }

    if (body.email === 'locked@brainmemo.vn') {
      return problemResponse(403, {
        title: 'Tài khoản đang bị khóa',
        status: 403,
        code: 'ACCOUNT_LOCKED',
        lockReason: 'Tài khoản bị khóa do vi phạm tiêu chuẩn cộng đồng',
        lockedUntil: '2026-12-31T23:59:59Z',
      });
    }

    if (body.email === 'wrong@brainmemo.vn' || body.password === 'wrongpass') {
      return problemResponse(401, {
        title: 'Xác thực thất bại',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        detail: 'Email hoặc mật khẩu không chính xác.',
      });
    }

    const persona: Exclude<MockPersona, 'guest' | 'locked'> =
      body.email === mockUsers.admin.email
        ? 'admin'
        : body.email === mockUsers.unverified.email
          ? 'unverified'
          : 'user';

    setMockPersonaCookie(persona);

    const tokens: AuthTokens = {
      accessToken: `mock-access-token-${persona}`,
      expiresIn: 1800,
      user: {
        ...mockUsers[persona],
        email: body.email,
      },
    };
    return HttpResponse.json(tokens, {
      status: 200,
      headers: {
        'Set-Cookie': `bm_mock_persona=${persona}; Path=/; SameSite=Lax`,
      },
    });
  }),

  http.post('*/api/v1/auth/google', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { idToken?: string };
    if (!body.idToken) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'idToken', message: 'Thiếu Google idToken' }],
      });
    }

    setMockPersonaCookie('user');
    const tokens: AuthTokens = {
      accessToken: 'mock-access-token-google',
      expiresIn: 1800,
      user: mockUsers.user,
    };
    return HttpResponse.json(tokens, {
      status: 200,
      headers: {
        'Set-Cookie': 'bm_mock_persona=user; Path=/; SameSite=Lax',
      },
    });
  }),

  http.post('*/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    if (body.email === 'existing@brainmemo.vn' || body.email === mockUsers.user.email) {
      return problemResponse(409, {
        title: 'Email đã tồn tại',
        status: 409,
        code: 'EMAIL_TAKEN',
        detail: 'Địa chỉ email này đã được sử dụng.',
      });
    }

    if (!body.password || body.password.length < 8) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'password', message: 'Mật khẩu phải có ít nhất 8 ký tự' }],
      });
    }

    return new HttpResponse(null, { status: 201 });
  }),

  http.post('*/api/v1/auth/verify-email', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { token?: string };

    if (!body.token || body.token === 'invalid-token' || body.token === 'expired-token') {
      return problemResponse(400, {
        title: 'Mã xác minh không hợp lệ',
        status: 400,
        code: 'TOKEN_INVALID_OR_EXPIRED',
        detail: 'Mã token xác minh không hợp lệ hoặc đã hết hạn.',
      });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/auth/forgot-password', () => {
    // Luôn trả 204 để không lộ sự tồn tại của email (FR-IDN-07)
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/auth/reset-password', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      newPassword?: string;
    };

    if (!body.token || body.token === 'invalid-token' || body.token === 'expired-token') {
      return problemResponse(400, {
        title: 'Mã token không hợp lệ',
        status: 400,
        code: 'TOKEN_INVALID_OR_EXPIRED',
        detail: 'Mã token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      });
    }

    if (!body.newPassword || body.newPassword.length < 8) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'newPassword', message: 'Mật khẩu mới phải có ít nhất 8 ký tự' }],
      });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/auth/change-password', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (body.currentPassword === 'WrongPass123!') {
      return problemResponse(400, {
        title: 'Mật khẩu hiện tại không đúng',
        status: 400,
        code: 'INVALID_PASSWORD',
        detail: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    if (!body.newPassword || body.newPassword.length < 8) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'newPassword', message: 'Mật khẩu mới phải có ít nhất 8 ký tự' }],
      });
    }

    // Revoke other sessions on password change
    mockSessions = mockSessions.filter((s) => s.isCurrent);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/auth/sessions', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    return HttpResponse.json(mockSessions, { status: 200 });
  }),

  http.delete('*/api/v1/auth/sessions/:id', ({ params, request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    const { id } = params;
    mockSessions = mockSessions.filter((s) => s.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/auth/logout-all', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    mockSessions = [];
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/auth/me', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Phiên đăng nhập đã hết hạn',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }
    return HttpResponse.json(mockUsers[persona], { status: 200 });
  }),

  http.post('*/api/v1/auth/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/profiles/me', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }
    return HttpResponse.json(mockProfiles[persona], { status: 200 });
  }),

  http.put('*/api/v1/profiles/me', async ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }
    const body = (await request.json().catch(() => ({}))) as any;
    const current = mockProfiles[persona];
    let newAvatarUrl = current.avatarUrl;
    if (body.removeAvatar) {
      newAvatarUrl = null;
    } else if (body.avatarUploadKey) {
      newAvatarUrl = `https://storage.mock.local/avatars/${body.avatarUploadKey}.png`;
    }

    const updated: ProfileDto = {
      ...current,
      displayName: body.displayName !== undefined ? body.displayName : current.displayName,
      bio: body.bio !== undefined ? body.bio : current.bio,
      showCourseList: body.showCourseList !== undefined ? body.showCourseList : current.showCourseList,
      uiTheme: body.uiTheme !== undefined ? body.uiTheme : current.uiTheme,
      avatarUrl: newAvatarUrl,
    };
    mockProfiles[persona] = updated;
    saveStoredProfiles(mockProfiles);

    // Synchronize displayName and avatar in mockCourses and mockUsers
    const uId = mockUsers[persona]?.id;
    if (uId) {
      mockCourses.forEach((c) => {
        if (c.owner?.id === uId) {
          if (!c.owner) {
            c.owner = { id: uId };
          }
          c.owner.displayName = updated.displayName;
          c.owner.avatarUrl = updated.avatarUrl;
        }
      });
      saveStoredCourses(mockCourses);
    }

    return HttpResponse.json(updated, { status: 200 });
  }),

  http.get('*/api/v1/notifications/unread-count', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }
    const notifications = getStoredNotifications();
    const count = notifications.filter((n) => !n.readAt).length;
    return HttpResponse.json({ count }, { status: 200 });
  }),

  // Presigned S3/R2 File Upload Mock Handlers (DEC-05)
  http.post('*/api/v1/files/upload-urls', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      purpose?: string;
      fileName?: string;
      sizeBytes?: number;
      contentType?: string;
    };

    if (!body.purpose || !body.fileName || !body.sizeBytes || !body.contentType) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        detail: 'Thiếu thông tin yêu cầu cấp presigned URL.',
      });
    }

    const key = `mock-key-${Date.now()}-${body.fileName}`;
    return HttpResponse.json(
      {
        uploadKey: key,
        uploadUrl: `https://storage.mock.local/tmp/${key}`,
        method: 'PUT',
        headers: {},
        expiresAt: '2026-11-13T23:59:59Z',
      },
      { status: 200 }
    );
  }),

  http.put('https://storage.mock.local/tmp/*', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Public Profile Handlers (FR-PRF-05, FR-PRF-06)
  http.get('*/api/v1/profiles/:userId', ({ params }) => {
    const { userId } = params;
    const foundProfile = Object.values(mockProfiles).find((p) => p.userId === userId);

    if (foundProfile) {
      return HttpResponse.json(foundProfile, { status: 200 });
    }

    if (userId === '404' || userId === 'not-found') {
      return problemResponse(404, {
        title: 'Không tìm thấy hồ sơ',
        status: 404,
        code: 'PROFILE_NOT_FOUND',
        detail: 'Không tìm thấy người dùng được yêu cầu.',
      });
    }

    // Default mock public profile for any arbitrary valid-looking UUID
    const fallbackProfile: ProfileDto = {
      userId: String(userId),
      displayName: 'Nguyễn Văn A',
      avatarUrl: null,
      bio: 'Lập trình viên & thành viên cộng đồng BrainMemo LMS',
      showCourseList: true,
      uiTheme: 'DARK',
      joinedAt: '2026-03-01T08:00:00Z',
    };
    return HttpResponse.json(fallbackProfile, { status: 200 });
  }),

  http.get('*/api/v1/profiles/:userId/courses', ({ params, request }) => {
    const { userId } = params;
    const persona = readPersonaFromCookie(request);
    const url = new URL(request.url);
    const relation = url.searchParams.get('relation') || 'OWNED';

    if (userId === 'hidden-courses-user') {
      return HttpResponse.json({ items: [], meta: { totalCount: 0 } }, { status: 200 });
    }

    const currentUserId = persona !== 'guest' && persona !== 'locked' ? mockUsers[persona]?.id : null;
    const isViewingSelf = Boolean(currentUserId && currentUserId === userId);

    const profile = Object.values(mockProfiles).find((p) => p.userId === userId);
    if (profile && !profile.showCourseList && !isViewingSelf) {
      return HttpResponse.json(
        { items: [], meta: { page: 1, pageSize: 12, totalCount: 0, totalPages: 0 } },
        { status: 200 }
      );
    }

    let items: any[] = [];
    if (relation === 'OWNED') {
      const owned = mockCourses.filter((c) => c.owner?.id === userId);
      if (owned.length > 0) {
        items = isViewingSelf
          ? owned
          : owned.filter((c) => c.accessMode === 'PUBLIC' && !c.isHidden && !c.isDeleted);
      } else {
        // Fallback mock item
        items = [
          {
            id: 'mock-crs-1',
            name: 'Kiến trúc Modular Monolith trong thực tế',
            coverUrl: null,
            owner: { id: String(userId), displayName: profile?.displayName || 'Tác giả' },
            accessMode: 'PUBLIC',
            status: 'PUBLISHED',
            tags: ['architecture', 'dotnet'],
            learnerCount: 120,
            ratingAvg: 4.9,
            ratingCount: 35,
            nominationCount: 15,
            progressPercent: null,
          },
        ];
      }
    } else {
      items = [
        {
          id: 'mock-crs-1',
          name: 'Kiến trúc Modular Monolith trong thực tế',
          coverUrl: null,
          owner: { id: String(userId), displayName: 'Tác giả' },
          accessMode: 'PUBLIC',
          status: 'PUBLISHED',
          tags: ['architecture', 'dotnet'],
          learnerCount: 120,
          ratingAvg: 4.9,
          ratingCount: 35,
          nominationCount: 15,
          progressPercent: relation === 'ENROLLED' ? 65 : null,
        },
      ];
    }

    return HttpResponse.json(
      {
        items,
        meta: {
          page: 1,
          pageSize: 12,
          totalCount: items.length,
          totalPages: 1,
        },
      },
      { status: 200 }
    );
  }),

  // Course Overview Dashboard (Figma node-id=28:7067)
  http.get('*/api/v1/courses/:courseId/overview', ({ params, request }) => {
    mockCourses = getStoredCourses();
    const { courseId } = params;
    const persona = readPersonaFromCookie(request);

    if (courseId === '404' || courseId === 'not-found') {
      return problemResponse(404, {
        title: 'Khóa học không tồn tại',
        status: 404,
        code: 'COURSE_NOT_FOUND',
        detail: 'Khóa học không tồn tại hoặc đã bị xóa.',
      });
    }

    const foundCourse = mockCourses.find((c) => c.id === courseId);
    const isOwner = foundCourse
      ? foundCourse.owner?.id === mockUsers.user.id
      : persona === 'user' && courseId === 'my-course-1';

    const courseData = foundCourse || {
      id: String(courseId),
      name: 'Nhập môn Python - Từ Zero tới Hero',
      description:
        'Khóa học cung cấp lộ trình từ nền tảng cú pháp đến tư duy lập trình chuyên sâu, tích hợp thuật toán Spaced Repetition (SRS) giúp người học ghi nhớ kiến thức vĩnh viễn.',
      coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
      accessMode: 'PUBLIC',
      status: 'UPDATING',
      isHidden: false,
      isDeleted: false,
      tags: ['Python', 'Backend', 'Thuật toán', 'Tự động hóa'],
      createdAt: '2026-08-15T08:00:00Z',
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      owner: {
        id: mockUsers.user.id,
        displayName: 'Quang Trần',
        avatarUrl: null,
      },
      viewer: {
        isOwner: Boolean(isOwner),
        enrollmentStatus: null,
        canReadContent: true,
        canLearn: true,
        hasNominated: false,
      },
    };

    const chapters = mockChapters[String(courseId)] || [];
    const totalChapters = chapters.length > 0 ? chapters.length : 24;
    const publishedChapters = chapters.filter((c) => c.status === 'PUBLISHED').length || 22;
    const draftChapters = totalChapters - publishedChapters;

    return HttpResponse.json({
      course: courseData,
      stats: {
        activeLearners: 1240,
        activeLearnersChangeWeekly: 18,
        completedLearners: 310,
        completionRatePercent: 25,
        completionTargetPercent: 30,
        totalChapters,
        publishedChapters,
        draftChapters,
        totalComments: 872,
        newCommentsCount: 48,
        avgResponseTimeHours: 2,
        totalRatings: 320,
        averageRating: 4.8,
        fiveStarPercentage: 92,
        totalRecommendations: 560,
        systemRank: 3,
      },
      ranking: {
        timeRange: 'ALL_TIME',
        byStudents: {
          rank: 12,
          totalCourses: 1240,
          percentileTop: 1.0,
          classSize: 1240,
        },
        byRecommendations: {
          rank: 3,
          totalCourses: 1240,
          isTop3: true,
          totalRecommendations: 560,
        },
        byRatings: {
          rank: 8,
          totalCourses: 1240,
          percentileTop: 0.6,
          ratingsCount: 320,
          averageRating: 4.8,
        },
      },
      pendingSubmissions: [
        {
          id: 'sub-1',
          studentName: 'Trần Minh Đức',
          studentInitials: 'MĐ',
          avatarBgColor: 'bg-[#0061d1]',
          assignmentTitle: 'Bài tập 4: Đệ quy & Quy hoạch động',
          timeAgo: '5 phút trước',
        },
        {
          id: 'sub-2',
          studentName: 'Lê Thu Trang',
          studentInitials: 'TT',
          avatarBgColor: 'bg-[#22b76a]',
          assignmentTitle: 'Dự án: Xây dựng REST API với FastAPI',
          timeAgo: '28 phút trước',
        },
        {
          id: 'sub-3',
          studentName: 'Nguyễn Hoàng Nam',
          studentInitials: 'HN',
          avatarBgColor: 'bg-[#39383f]',
          assignmentTitle: 'Quiz 03: Xử lý ngoại lệ trong Python',
          timeAgo: '1 giờ trước',
        },
        {
          id: 'sub-4',
          studentName: 'Vũ Đình Trọng',
          studentInitials: 'ĐT',
          avatarBgColor: 'bg-[#ff7a1a]',
          assignmentTitle: 'Bài tập 2: Cấu trúc dữ liệu Dictionary & Set',
          timeAgo: '2 giờ trước',
        },
        {
          id: 'sub-5',
          studentName: 'Phạm Khánh Linh',
          studentInitials: 'KL',
          avatarBgColor: 'bg-[#34343b]',
          assignmentTitle: 'Capstone: Web Scraper đa luồng',
          timeAgo: '4 giờ trước',
        },
      ],
      pendingRequests: [
        {
          id: 'req-1',
          studentName: 'Đặng Hải Yến',
          studentInitials: 'HY',
          avatarBgColor: 'bg-[#ff7a1a]',
          studentRoleOrSchool: 'Học viên chuyển ngành • 15 phút trước',
          timeAgo: '15 phút trước',
        },
        {
          id: 'req-2',
          studentName: 'Bùi Quốc Toàn',
          studentInitials: 'QT',
          avatarBgColor: 'bg-[#0061d1]',
          studentRoleOrSchool: 'Kỹ sư Backend • 40 phút trước',
          timeAgo: '40 phút trước',
        },
        {
          id: 'req-3',
          studentName: 'Hồ Ngọc Mai',
          studentInitials: 'NM',
          avatarBgColor: 'bg-[#22b76a]',
          studentRoleOrSchool: 'Sinh viên ĐH Bách Khoa • 2 giờ trước',
          timeAgo: '2 giờ trước',
        },
        {
          id: 'req-4',
          studentName: 'Đỗ Tuấn Khang',
          studentInitials: 'TK',
          avatarBgColor: 'bg-[#39383f]',
          studentRoleOrSchool: 'Data Analyst • 3 giờ trước',
          timeAgo: '3 giờ trước',
        },
        {
          id: 'req-5',
          studentName: 'Lương Minh Tuấn',
          studentInitials: 'MT',
          avatarBgColor: 'bg-[#34343b]',
          studentRoleOrSchool: 'Học viên tự do • Hôm qua',
          timeAgo: 'Hôm qua',
        },
      ],
      reports: [
        {
          id: 'rep-1',
          targetType: 'Khóa học',
          excerpt: '"Khóa học bị trùng lặp kiến thức với khóa đã có trên diễn đàn mở mà không ghi nguồn..."',
          reason: 'Trùng lặp nội dung',
          reportedDate: '08/11/2026',
          status: 'Chờ xử lý',
        },
        {
          id: 'rep-2',
          targetType: 'Bình luận',
          excerpt: '"Spam liên kết quảng cáo nhóm telegram bên ngoài yêu cầu chuyển tiền..."',
          reason: 'Nội dung phản cảm/Spam',
          reportedDate: '05/11/2026',
          status: 'Đã chấp nhận',
        },
        {
          id: 'rep-3',
          targetType: 'Bình luận',
          excerpt: '"Học viên bình luận dùng từ ngữ kích động xúc phạm giảng viên trong phần thảo luận..."',
          reason: 'Ngôn từ thù ghét',
          reportedDate: '02/11/2026',
          status: 'Đã từ chối',
        },
      ],
    });
  }),

  http.post('*/api/v1/courses/:courseId/enrollment-requests/:requestId/approve', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.post('*/api/v1/courses/:courseId/enrollment-requests/:requestId/reject', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Course Module Handlers (FR-CRS-01..16)
  http.get('*/api/v1/courses/:courseId', ({ params, request }) => {
    const { courseId } = params;
    const persona = readPersonaFromCookie(request);

    if (courseId === '404' || courseId === 'not-found') {
      return problemResponse(404, {
        title: 'Khóa học không tồn tại',
        status: 404,
        code: 'COURSE_NOT_FOUND',
        detail: 'Khóa học không tồn tại hoặc đã bị xóa.',
      });
    }

    const course = mockCourses.find((c) => c.id === courseId);
    if (!course) {
      const isOwner = persona === 'user' && courseId === 'my-course-1';
      const isEnrolled = courseId === 'enrolled-course-1';

      return HttpResponse.json(
        {
          id: String(courseId),
          name: isOwner
            ? 'Khóa học do tôi biên soạn'
            : 'Lập trình Fullstack Modular Monolith với ASP.NET Core & React',
          description:
            'Khóa học thực chiến hướng dẫn toàn diện từ thiết kế Domain-Driven Design, kiến trúc Modular Monolith, quản lý state và UI với React 18.',
          coverUrl: null,
          accessMode: courseId === 'private-course-1' ? 'PRIVATE' : 'PUBLIC',
          status: 'PUBLISHED',
          isHidden: false,
          isDeleted: false,
          tags: ['fullstack', 'csharp', 'react'],
          createdAt: '2026-03-01T08:00:00Z',
          updatedAt: '2026-11-12T10:00:00Z',
          owner: {
            id: isOwner ? mockUsers.user.id : mockUsers.admin.id,
            displayName: isOwner ? mockProfiles.user.displayName : mockProfiles.admin.displayName,
            avatarUrl: null,
          },
          viewer: {
            isOwner,
            enrollmentStatus: isEnrolled ? 'ACTIVE' : null,
            canReadContent: isOwner || isEnrolled,
            canLearn: isOwner || isEnrolled,
            hasNominated: false,
          },
          ratingAvg: 4.8,
          ratingCount: 28,
        },
        { status: 200 }
      );
    }

    const currentUserId = persona !== 'guest' && persona !== 'locked' ? mockUsers[persona]?.id : null;
    const isOwner = Boolean(currentUserId && course.owner?.id === currentUserId);

    // DEC-16 & 3.5.8.1: Hide existence of ONLY_ME / Hidden / Deleted courses with 404 for non-owners
    if (course.accessMode === 'ONLY_ME' && !isOwner) {
      return problemResponse(404, {
        title: 'Khóa học không tồn tại',
        status: 404,
        code: 'COURSE_NOT_FOUND',
        detail: 'Khóa học không tồn tại hoặc đã bị xóa.',
      });
    }

    return HttpResponse.json(
      {
        ...course,
        viewer: {
          ...course.viewer,
          isOwner,
          canReadContent: isOwner || course.accessMode === 'PUBLIC',
          canLearn: isOwner || (course.accessMode === 'PUBLIC' && persona !== 'guest'),
        },
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses', async ({ request }) => {
    const persona = readPersonaFromCookie(request);
    const body = (await request.json().catch(() => ({}))) as any;
    if (!body.name) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'name', message: 'Tên khóa học không được để trống' }],
      });
    }

    const courseId = `created-course-${Date.now()}`;
    const ownerUser = persona !== 'guest' && persona !== 'locked' ? mockUsers[persona] : mockUsers.user;
    const ownerProfile = persona !== 'guest' && persona !== 'locked' ? mockProfiles[persona] : mockProfiles.user;

    const newCourse: MockCourseItem = {
      id: courseId,
      name: body.name,
      description: body.description || '',
      accessMode: body.accessMode || 'PUBLIC',
      status: body.status || 'UPDATING',
      isHidden: false,
      isDeleted: false,
      tags: body.tags || [],
      coverUrl: body.coverUploadKey
        ? `https://storage.mock.local/covers/${body.coverUploadKey}.png`
        : null,
      owner: {
        id: ownerUser.id,
        displayName: ownerProfile.displayName,
        avatarUrl: ownerProfile.avatarUrl,
      },
      viewer: {
        isOwner: true,
        enrollmentStatus: null,
        canReadContent: true,
        canLearn: true,
        hasNominated: false,
      },
      ratingAvg: null,
      ratingCount: 0,
      learnerCount: 0,
      chapterCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCourses.unshift(newCourse);
    saveStoredCourses(mockCourses);
    return HttpResponse.json(newCourse, { status: 201 });
  }),

  http.patch('*/api/v1/courses/:courseId', async ({ params, request }) => {
    const { courseId } = params;
    const persona = readPersonaFromCookie(request);
    const body = (await request.json().catch(() => ({}))) as any;

    let course = mockCourses.find((c) => c.id === courseId);
    if (!course) {
      const ownerUser = persona !== 'guest' && persona !== 'locked' ? mockUsers[persona] : mockUsers.user;
      const ownerProfile = persona !== 'guest' && persona !== 'locked' ? mockProfiles[persona] : mockProfiles.user;
      const newCourse: MockCourseItem = {
        id: String(courseId),
        name: body.name || 'Khóa học cập nhật',
        description: body.description || '',
        accessMode: body.accessMode || 'PUBLIC',
        status: body.status || 'UPDATING',
        isHidden: false,
        isDeleted: false,
        tags: body.tags || [],
        coverUrl: null,
        owner: {
          id: ownerUser.id,
          displayName: ownerProfile.displayName,
          avatarUrl: ownerProfile.avatarUrl,
        },
        viewer: {
          isOwner: true,
          enrollmentStatus: null,
          canReadContent: true,
          canLearn: true,
          hasNominated: false,
        },
        ratingAvg: null,
        ratingCount: 0,
        learnerCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockCourses.unshift(newCourse);
      course = newCourse;
    } else {
      if (body.name !== undefined) course.name = body.name;
      if (body.description !== undefined) course.description = body.description;
      if (body.accessMode !== undefined) course.accessMode = body.accessMode;
      if (body.status !== undefined) course.status = body.status;
      if (body.tags !== undefined) course.tags = body.tags;
      if (body.removeCover) {
        course.coverUrl = null;
      } else if (body.coverUploadKey) {
        course.coverUrl = `https://storage.mock.local/covers/${body.coverUploadKey}.png`;
      }
      course.updatedAt = new Date().toISOString();
    }

    saveStoredCourses(mockCourses);
    return HttpResponse.json(course, { status: 200 });
  }),

  http.delete('*/api/v1/courses/:courseId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/me/courses', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    const url = new URL(request.url);
    const relation = url.searchParams.get('relation');

    const currentUserId = mockUsers[persona]?.id;
    let sampleItems: any[] = [];

    if (relation === 'OWNED') {
      sampleItems = mockCourses.filter((c) => c.owner?.id === currentUserId);
    } else {
      sampleItems = [
        {
          id: 'enrolled-course-1',
          name: 'Khóa học đang học: Kiến trúc phần mềm',
          coverUrl: null,
          owner: { id: mockUsers.admin.id, displayName: mockProfiles.admin.displayName },
          accessMode: 'PUBLIC',
          status: 'PUBLISHED',
          tags: ['architecture'],
          learnerCount: 110,
          ratingAvg: 4.8,
          ratingCount: 30,
          nominationCount: 20,
          progressPercent: 75,
        },
      ];
    }

    return HttpResponse.json(
      {
        items: sampleItems,
        meta: {
          page: 1,
          pageSize: 12,
          totalCount: sampleItems.length,
          totalPages: 1,
        },
      },
      { status: 200 }
    );
  }),

  http.get('*/api/v1/me/invitations', ({ request }) => {
    const persona = readPersonaFromCookie(request);
    if (persona === 'guest' || persona === 'locked') {
      return problemResponse(401, {
        title: 'Chưa xác thực',
        status: 401,
        code: 'UNAUTHORIZED',
      });
    }

    return HttpResponse.json(
      [
        {
          id: 'invited-course-1',
          name: 'Lời mời: Lập trình Cloud Native trên AWS & Azure',
          coverUrl: null,
          owner: { id: mockUsers.admin.id, displayName: mockProfiles.admin.displayName },
          accessMode: 'PRIVATE',
          status: 'PUBLISHED',
          tags: ['cloud', 'devops'],
          learnerCount: 25,
          ratingAvg: 5.0,
          ratingCount: 6,
        },
      ],
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/enrollments', ({ params }) => {
    return HttpResponse.json(
      {
        id: `enrollment-${Date.now()}`,
        courseId: String(params.courseId),
        user: { id: mockUsers.user.id, displayName: mockProfiles.user.displayName },
        status: 'ACTIVE',
        statusChangedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),

  http.delete('*/api/v1/courses/:courseId/enrollments/me', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/courses/:courseId/invitations/accept', ({ params }) => {
    return HttpResponse.json(
      {
        id: `enrollment-inv-${Date.now()}`,
        courseId: String(params.courseId),
        user: { id: mockUsers.user.id, displayName: mockProfiles.user.displayName },
        status: 'ACTIVE',
        statusChangedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),

  http.put('*/api/v1/courses/:courseId/nomination', ({ params }) => {
    const courseId = String(params.courseId);
    const nominations = getStoredNominations();
    const current = nominations[courseId] || { count: 10, hasNominated: false };
    if (!current.hasNominated) {
      current.count += 1;
      current.hasNominated = true;
    }
    nominations[courseId] = current;
    saveStoredNominations(nominations);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/api/v1/courses/:courseId/nomination', ({ params }) => {
    const courseId = String(params.courseId);
    const nominations = getStoredNominations();
    const current = nominations[courseId] || { count: 10, hasNominated: false };
    if (current.hasNominated) {
      current.count = Math.max(0, current.count - 1);
      current.hasNominated = false;
    }
    nominations[courseId] = current;
    saveStoredNominations(nominations);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/nominations/summary', ({ params }) => {
    const courseId = String(params.courseId);
    const nominations = getStoredNominations();
    const current = nominations[courseId] || { count: 15, hasNominated: false };
    return HttpResponse.json(
      {
        nominationCount: current.count,
        hasNominated: current.hasNominated,
      },
      { status: 200 }
    );
  }),

  // ==========================================
  // S6 Social & Notifications (T-S6-FE-01)
  // ==========================================
  http.get('*/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

    let list = getStoredNotifications();
    if (unreadOnly) {
      list = list.filter((n) => !n.readAt);
    }

    const total = list.length;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);

    return HttpResponse.json(
      {
        items: paginated,
        meta: {
          page,
          pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/notifications/:id/read', ({ params }) => {
    const list = getStoredNotifications();
    const target = list.find((n) => n.id === params.id);
    if (target) {
      target.readAt = new Date().toISOString();
      saveStoredNotifications(list);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/notifications/read-all', () => {
    const list = getStoredNotifications();
    const now = new Date().toISOString();
    list.forEach((n) => {
      if (!n.readAt) n.readAt = now;
    });
    saveStoredNotifications(list);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/api/v1/notifications/:id', ({ params }) => {
    let list = getStoredNotifications();
    list = list.filter((n) => n.id !== params.id);
    saveStoredNotifications(list);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/comments', ({ params }) => {
    const courseId = String(params.courseId);
    const all = getStoredComments();
    const items = all[courseId] || all['my-course-1'] || [];
    return HttpResponse.json(
      {
        items,
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: items.length,
          totalPages: 1,
        },
      },
      { status: 200 }
    );
  }),

  http.get('*/api/v1/courses/:courseId/comments/summary', ({ params }) => {
    const courseId = String(params.courseId);
    const all = getStoredComments();
    const items = all[courseId] || all['my-course-1'] || [];
    const rootComments = items.length;
    const replyCount = items.reduce((sum, c) => sum + (c.replies ? c.replies.length : 0), 0);
    const pinnedComments = items.filter((c) => c.isPinned).length;
    return HttpResponse.json(
      {
        totalComments: rootComments + replyCount,
        rootComments,
        pinnedComments,
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/comments', async ({ request, params }) => {
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as any;
    const all = getStoredComments();
    if (!all[courseId]) {
      all[courseId] = [...(all['my-course-1'] || [])];
    }
    const newCommentId = `cmt-${Date.now()}`;
    const newComment: MockCommentItem = {
      id: newCommentId,
      courseId,
      chapterId: body.chapterId || null,
      parentCommentId: body.parentCommentId || null,
      author: { id: 'my-user-id', displayName: 'Học viên Nguyễn Văn A' },
      content: body.content || '',
      isPinned: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    if (body.parentCommentId) {
      const parent = all[courseId].find((c) => c.id === body.parentCommentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(newComment);
      } else {
        all[courseId].push(newComment);
      }
    } else {
      all[courseId].unshift(newComment);
    }
    saveStoredComments(all);

    // Trigger notification for course owner
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `ntf-${Date.now()}`,
      type: 'COMMENT',
      title: 'Bình luận mới về khóa học',
      body: `Học viên vừa bình luận: "${(body.content || '').slice(0, 50)}"`,
      readAt: null,
      createdAt: new Date().toISOString(),
      payload: { courseId, commentId: newCommentId },
    });
    saveStoredNotifications(notifications);

    return HttpResponse.json(newComment, { status: 201 });
  }),

  http.patch('*/api/v1/comments/:id', async ({ request, params }) => {
    const commentId = String(params.id);
    const body = (await request.json().catch(() => ({}))) as any;
    const all = getStoredComments();
    for (const key of Object.keys(all)) {
      const list = all[key];
      if (!list) continue;
      const found = list.find((c) => c.id === commentId);
      if (found) {
        found.content = body.content || found.content;
        found.editedAt = new Date().toISOString();
        break;
      }
    }
    saveStoredComments(all);
    return HttpResponse.json(
      {
        id: commentId,
        content: body.content || '',
        editedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),

  http.delete('*/api/v1/comments/:id', ({ params }) => {
    const commentId = String(params.id);
    const all = getStoredComments();
    for (const key of Object.keys(all)) {
      const list = all[key];
      if (!list) continue;
      const idx = list.findIndex((c) => c.id === commentId);
      if (idx !== -1 && list[idx]) {
        list[idx]!.isDeleted = true;
        list[idx]!.content = 'Bình luận này đã bị xóa';
        break;
      }
      for (const root of list) {
        if (root.replies) {
          const rIdx = root.replies.findIndex((r) => r.id === commentId);
          if (rIdx !== -1 && root.replies[rIdx]) {
            root.replies[rIdx]!.isDeleted = true;
            root.replies[rIdx]!.content = 'Bình luận này đã bị xóa';
            break;
          }
        }
      }
    }
    saveStoredComments(all);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put('*/api/v1/comments/:id/pin', ({ params }) => {
    const commentId = String(params.id);
    const all = getStoredComments();
    for (const key of Object.keys(all)) {
      const list = all[key];
      if (!list) continue;
      const found = list.find((c) => c.id === commentId);
      if (found) {
        found.isPinned = true;
        break;
      }
    }
    saveStoredComments(all);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/api/v1/comments/:id/pin', ({ params }) => {
    const commentId = String(params.id);
    const all = getStoredComments();
    for (const key of Object.keys(all)) {
      const list = all[key];
      if (!list) continue;
      const found = list.find((c) => c.id === commentId);
      if (found) {
        found.isPinned = false;
        break;
      }
    }
    saveStoredComments(all);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==========================================
  // S3 Content & Chapter Drafting (T-S3-FE-01)
  // ==========================================
  http.get('*/api/v1/courses/:courseId/chapters', ({ params }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const list = mockChapters[courseId] || [];
    return HttpResponse.json(
      list.map((c) => ({
        id: c.id,
        position: c.position,
        title: c.title,
        description: c.description,
        status: c.status,
        accessMode: c.accessMode,
        hasUnpublishedChanges: c.hasUnpublishedChanges,
      })),
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/chapters', async ({ params, request }) => {
    mockChapters = getStoredChapters();
    mockVersions = getStoredVersions();
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
    };

    if (!body.title?.trim()) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'title', message: 'Tên chương không được để trống' }],
      });
    }

    if (!mockChapters[courseId]) {
      mockChapters[courseId] = [];
    }

    const newPosition = mockChapters[courseId].length + 1;
    const newId = `chapter-${Date.now()}`;
    const newChapter: MockChapterItem = {
      id: newId,
      courseId,
      position: newPosition,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: 'DRAFT',
      accessMode: 'PUBLIC',
      hasUnpublishedChanges: false,
      lastVersionNo: 1,
      publishedVersionNo: null,
      blocks: [],
    };

    mockChapters[courseId].push(newChapter);
    mockVersions[newId] = [
      {
        versionNo: 1,
        createdAt: new Date().toISOString(),
        publishedAt: null,
        restoredFromVersionNo: null,
      },
    ];
    saveStoredChapters(mockChapters);
    saveStoredVersions(mockVersions);

    return HttpResponse.json(newChapter, { status: 201 });
  }),

  http.put('*/api/v1/courses/:courseId/chapters/order', async ({ params, request }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as { chapterIds?: string[] };
    const list = mockChapters[courseId] || [];

    if (body.chapterIds && Array.isArray(body.chapterIds)) {
      const orderMap = new Map<string, number>();
      body.chapterIds.forEach((id, idx) => orderMap.set(id, idx + 1));

      list.forEach((ch) => {
        if (orderMap.has(ch.id)) {
          ch.position = orderMap.get(ch.id)!;
        }
      });
      list.sort((a, b) => a.position - b.position);
      saveStoredChapters(mockChapters);
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/chapters/:chapterId', ({ params }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const list = mockChapters[courseId] || [];
    const chapter = list.find((c) => c.id === chapterId);

    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
        detail: 'Không tìm thấy chương bài học được yêu cầu.',
      });
    }

    return HttpResponse.json(chapter, { status: 200 });
  }),

  http.put('*/api/v1/courses/:courseId/chapters/:chapterId', async ({ params, request }) => {
    mockChapters = getStoredChapters();
    mockVersions = getStoredVersions();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const body = (await request.json().catch(() => ({}))) as {
      baseVersionNo?: number;
      title?: string;
      description?: string;
      blocks?: Array<Record<string, unknown>>;
    };

    const list = mockChapters[courseId] || [];
    const chapter = list.find((c) => c.id === chapterId);

    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
        detail: 'Không tìm thấy chương bài học.',
      });
    }

    // Optimistic locking check (FR-CNT-16)
    if (body.baseVersionNo !== undefined && body.baseVersionNo !== chapter.lastVersionNo) {
      return problemResponse(409, {
        title: 'Xung đột phiên bản',
        status: 409,
        code: 'VERSION_CONFLICT',
        detail: `Phiên bản của bạn (v${body.baseVersionNo}) không khớp với phiên bản mới nhất trên hệ thống (v${chapter.lastVersionNo}). Vui lòng tải lại dữ liệu mới nhất.`,
      });
    }

    chapter.title = body.title?.trim() || chapter.title;
    chapter.description = body.description?.trim() ?? chapter.description;
    chapter.blocks = body.blocks || [];
    chapter.lastVersionNo = (chapter.lastVersionNo || 1) + 1;
    chapter.status = 'DRAFT';
    chapter.hasUnpublishedChanges = true;

    if (!mockVersions[chapterId]) {
      mockVersions[chapterId] = [];
    }
    mockVersions[chapterId].push({
      versionNo: chapter.lastVersionNo,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      restoredFromVersionNo: null,
      title: chapter.title,
      description: chapter.description ?? undefined,
      blocks: JSON.parse(JSON.stringify(chapter.blocks)),
      authorName: 'Quang Trần (Bạn)',
    });
    saveStoredChapters(mockChapters);
    saveStoredVersions(mockVersions);

    return HttpResponse.json(chapter, { status: 200 });
  }),

  http.delete('*/api/v1/courses/:courseId/chapters/:chapterId', ({ params }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const list = mockChapters[courseId] || [];
    const idx = list.findIndex((c) => c.id === chapterId);

    if (idx !== -1) {
      list.splice(idx, 1);
      saveStoredChapters(mockChapters);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/courses/:courseId/chapters/:chapterId/publish', ({ params }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const list = mockChapters[courseId] || [];
    const chapter = list.find((c) => c.id === chapterId);

    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
      });
    }

    chapter.status = 'PUBLISHED';
    chapter.publishedVersionNo = chapter.lastVersionNo;
    chapter.hasUnpublishedChanges = false;
    saveStoredChapters(mockChapters);

    return HttpResponse.json(chapter, { status: 200 });
  }),

  http.get('*/api/v1/courses/:courseId/chapters/:chapterId/versions', ({ params }) => {
    mockVersions = getStoredVersions();
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const chapter = (mockChapters[courseId] || []).find((c) => c.id === chapterId);

    const versions = mockVersions[chapterId] || [
      {
        versionNo: chapter?.lastVersionNo || 4,
        createdAt: new Date().toISOString(),
        publishedAt: null,
        restoredFromVersionNo: null,
        title: chapter?.title || 'Chương 4: Hàm & Phạm vi biến (Scope)',
        description:
          chapter?.description ||
          'Nắm vững quy tắc phân định phạm vi LEGB (Local, Enclosing, Global, Built-in), lambda function và cơ chế tạo đóng kín (Closures) trong kiến trúc ngôn ngữ Python.',
        blocks: chapter?.blocks || [],
        authorName: 'Quang Trần (Bạn)',
      },
      {
        versionNo: (chapter?.lastVersionNo || 4) - 1,
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        publishedAt: null,
        restoredFromVersionNo: null,
        title: chapter?.title || 'Chương 4: Hàm & Phạm vi biến (Scope)',
        description: 'Bản thảo ban đầu về hàm trong Python.',
        blocks: chapter?.blocks?.slice(0, 2) || [],
        authorName: 'Quang Trần',
      },
      {
        versionNo: Math.max(1, (chapter?.lastVersionNo || 4) - 2),
        createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
        publishedAt: null,
        restoredFromVersionNo: null,
        title: chapter?.title || 'Chương 4: Hàm & Phạm vi biến',
        description: 'Bản thảo ngày hôm qua',
        blocks: chapter?.blocks?.slice(0, 1) || [],
        authorName: 'Quang Trần',
      },
    ];
    return HttpResponse.json(versions, { status: 200 });
  }),

  http.post(
    '*/api/v1/courses/:courseId/chapters/:chapterId/versions/:versionNo/restore',
    ({ params }) => {
      mockChapters = getStoredChapters();
      mockVersions = getStoredVersions();
      const courseId = String(params.courseId);
      const chapterId = String(params.chapterId);
      const versionNo = Number(params.versionNo);

      const list = mockChapters[courseId] || [];
      const chapter = list.find((c) => c.id === chapterId);

      if (!chapter) {
        return problemResponse(404, {
          title: 'Chương không tồn tại',
          status: 404,
          code: 'CHAPTER_NOT_FOUND',
        });
      }

      // Find the version to restore blocks from
      const versionList = mockVersions[chapterId] || [];
      const targetVersion = versionList.find((v) => v.versionNo === versionNo);
      if (targetVersion?.blocks && targetVersion.blocks.length > 0) {
        chapter.blocks = JSON.parse(JSON.stringify(targetVersion.blocks));
      }
      if (targetVersion?.title) {
        chapter.title = targetVersion.title;
      }
      if (targetVersion?.description !== undefined) {
        chapter.description = targetVersion.description;
      }

      chapter.lastVersionNo = (chapter.lastVersionNo || 1) + 1;
      chapter.status = 'DRAFT';
      chapter.hasUnpublishedChanges = true;

      if (!mockVersions[chapterId]) {
        mockVersions[chapterId] = [];
      }
      mockVersions[chapterId].push({
        versionNo: chapter.lastVersionNo,
        createdAt: new Date().toISOString(),
        publishedAt: null,
        restoredFromVersionNo: versionNo,
        title: chapter.title,
        description: chapter.description ?? undefined,
        blocks: JSON.parse(JSON.stringify(chapter.blocks)),
        authorName: 'Quang Trần (Bạn)',
      });
      saveStoredChapters(mockChapters);
      saveStoredVersions(mockVersions);

      return HttpResponse.json(chapter, { status: 200 });
    }
  ),

  http.get('*/api/v1/courses/:courseId/chapters/:chapterId/access', ({ params }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const list = mockChapters[courseId] || [];
    const chapter = list.find((c) => c.id === chapterId);
    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
      });
    }
    return HttpResponse.json(
      {
        accessMode: chapter.accessMode || 'PUBLIC',
        passcode: chapter.passcode || '',
        passcodeVersion: 1,
      },
      { status: 200 }
    );
  }),

  http.put('*/api/v1/courses/:courseId/chapters/:chapterId/access', async ({ params, request }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const body = (await request.json().catch(() => ({}))) as {
      accessMode?: 'PUBLIC' | 'PROTECTED';
      passcode?: string;
    };
    const list = mockChapters[courseId] || [];
    const chapter = list.find((c) => c.id === chapterId);
    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
      });
    }
    if (body.accessMode) {
      chapter.accessMode = body.accessMode;
      chapter.passcode = body.passcode || null;
      saveStoredChapters(mockChapters);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/resources', ({ params }) => {
    mockResources = getStoredResources();
    const courseId = String(params.courseId);
    const list = mockResources[courseId] || [];
    return HttpResponse.json(list, { status: 200 });
  }),

  http.post('*/api/v1/courses/:courseId/resources', async ({ params, request }) => {
    mockResources = getStoredResources();
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as {
      uploadKey?: string;
      originalFilename?: string;
    };

    if (!body.uploadKey || !body.originalFilename) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        detail: 'Thiếu uploadKey hoặc tên tệp gốc.',
      });
    }

    if (!mockResources[courseId]) {
      mockResources[courseId] = [];
    }

    const ext = body.originalFilename.split('.').pop()?.toLowerCase();
    let kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'ARCHIVE' | 'OTHER' = 'OTHER';
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) kind = 'IMAGE';
    else if (['mp4', 'webm'].includes(ext || '')) kind = 'VIDEO';
    else if (['mp3', 'wav', 'ogg'].includes(ext || '')) kind = 'AUDIO';
    else if (['pdf'].includes(ext || '')) kind = 'PDF';
    else if (['zip', 'rar', '7z'].includes(ext || '')) kind = 'ARCHIVE';

    const newRes = {
      id: `res-${Date.now()}`,
      kind,
      originalFilename: body.originalFilename,
      contentType: kind === 'IMAGE' ? 'image/png' : 'application/octet-stream',
      sizeBytes: 1048576,
      createdAt: new Date().toISOString(),
    };

    mockResources[courseId].push(newRes);
    saveStoredResources(mockResources);
    return HttpResponse.json(newRes, { status: 201 });
  }),

  http.delete('*/api/v1/courses/:courseId/resources/:id', ({ params }) => {
    mockResources = getStoredResources();
    const courseId = String(params.courseId);
    const resId = String(params.id);

    // If resource is in-use (test resource `res-in-use`), respond with 409
    if (resId === 'res-in-use') {
      return problemResponse(409, {
        title: 'Tài nguyên đang được sử dụng',
        status: 409,
        code: 'RESOURCE_IN_USE',
        detail: 'Không thể xóa tài nguyên này vì đang có ít nhất một khối nội dung bài học sử dụng.',
      });
    }

    const list = mockResources[courseId] || [];
    const idx = list.findIndex((r) => r.id === resId);
    if (idx !== -1) {
      list.splice(idx, 1);
      saveStoredResources(mockResources);
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/resources/:id/download-url', ({ params }) => {
    const resId = String(params.id);
    return HttpResponse.json(
      {
        url: `https://storage.mock.local/download/${resId}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      { status: 200 }
    );
  }),

  // ==========================================
  // S4 Enrollment & Learning Player Handlers
  // ==========================================
  http.get('*/api/v1/courses/:courseId/enrollments', ({ params, request }) => {
    mockEnrollments = getStoredEnrollments();
    const courseId = String(params.courseId);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

    const list = mockEnrollments[courseId] || mockEnrollments['my-course-1'] || [];
    const filtered = status ? list.filter((e) => e.status === status) : list;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return HttpResponse.json(
      {
        items,
        meta: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize) || 1,
        },
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/invitations', async ({ params, request }) => {
    mockEnrollments = getStoredEnrollments();
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as { email?: string };

    if (!body.email?.trim()) {
      return problemResponse(422, {
        title: 'Email không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'email', message: 'Vui lòng nhập địa chỉ email người học' }],
      });
    }

    if (!mockEnrollments[courseId]) {
      mockEnrollments[courseId] = [];
    }

    const email = body.email.trim();
    const newEnrollment: MockEnrollmentItem = {
      id: `enr-inv-${Date.now()}`,
      courseId,
      user: {
        id: `u-inv-${Date.now()}`,
        displayName: email.split('@')[0] || 'User',
        email,
        avatarUrl: null,
      },
      status: 'INVITED',
      requestId: null,
      statusChangedAt: new Date().toISOString(),
    };

    mockEnrollments[courseId].push(newEnrollment);
    saveStoredEnrollments(mockEnrollments);

    return HttpResponse.json(newEnrollment, { status: 200 });
  }),

  http.post(
    '*/api/v1/courses/:courseId/enrollment-requests/:requestId/decision',
    async ({ params, request }) => {
      mockEnrollments = getStoredEnrollments();
      const courseId = String(params.courseId);
      const requestId = String(params.requestId);
      const body = (await request.json().catch(() => ({}))) as {
        decision?: 'ACCEPTED' | 'REJECTED';
      };

      const list = mockEnrollments[courseId] || mockEnrollments['my-course-1'] || [];
      const item = list.find((e) => e.requestId === requestId || e.id === requestId);
      if (item) {
        if (body.decision === 'ACCEPTED') {
          item.status = 'ACTIVE';
        } else {
          item.status = 'REMOVED';
        }
        item.statusChangedAt = new Date().toISOString();
        saveStoredEnrollments(mockEnrollments);
      }

      return new HttpResponse(null, { status: 204 });
    }
  ),

  http.delete('*/api/v1/courses/:courseId/enrollments/:userId', ({ params }) => {
    mockEnrollments = getStoredEnrollments();
    const courseId = String(params.courseId);
    const userId = String(params.userId);

    const list = mockEnrollments[courseId] || mockEnrollments['my-course-1'] || [];
    const item = list.find((e) => e.user.id === userId || e.id === userId);
    if (item) {
      item.status = 'REMOVED';
      item.statusChangedAt = new Date().toISOString();
      saveStoredEnrollments(mockEnrollments);
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(
    '*/api/v1/courses/:courseId/chapters/:chapterId/unlock',
    async ({ params, request }) => {
      mockChapters = getStoredChapters();
      const courseId = String(params.courseId);
      const chapterId = String(params.chapterId);
      const body = (await request.json().catch(() => ({}))) as { passcode?: string };

      const attempts = passcodeAttempts[chapterId] || 0;
      if (attempts >= 5) {
        return problemResponse(429, {
          title: 'Quá số lần thử',
          status: 429,
          code: 'TOO_MANY_REQUESTS',
          detail: 'Bạn đã nhập sai passcode quá 5 lần. Vui lòng thử lại sau 15 phút.',
        });
      }

      const list = mockChapters[courseId] || mockChapters['my-course-1'] || [];
      const chapter = list.find((c) => c.id === chapterId);

      const expectedPasscode = chapter?.passcode || '1234';
      if (body.passcode !== expectedPasscode) {
        passcodeAttempts[chapterId] = attempts + 1;
        return problemResponse(400, {
          title: 'Mật khẩu sai',
          status: 400,
          code: 'INVALID_PASSCODE',
          detail: 'Mật khẩu mở khóa không chính xác. Vui lòng thử lại.',
        });
      }

      passcodeAttempts[chapterId] = 0;
      mockUnlockedChapters.add(chapterId);
      return new HttpResponse(null, { status: 204 });
    }
  ),

  http.get('*/api/v1/courses/:courseId/learn/chapters/:chapterId', ({ params, request }) => {
    mockChapters = getStoredChapters();
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);

    const list = mockChapters[courseId] || mockChapters['my-course-1'] || [];
    const chapter = list.find((c) => c.id === chapterId);
    if (!chapter) {
      return problemResponse(404, {
        title: 'Chương không tồn tại',
        status: 404,
        code: 'CHAPTER_NOT_FOUND',
        detail: 'Không tìm thấy nội dung bài học cho chương này.',
      });
    }

    if (chapter.accessMode === 'PROTECTED' && !mockUnlockedChapters.has(chapterId)) {
      return problemResponse(403, {
        title: 'Yêu cầu Passcode',
        status: 403,
        code: 'PASSCODE_REQUIRED',
        detail: 'Chương này được bảo vệ bằng mật khẩu passcode.',
      });
    }

    const authHeader = request.headers.get('authorization') || '';
    const canSaveProgress = Boolean(authHeader && !authHeader.includes('guest'));

    const completedIds = mockCompletedBlocks[courseId] || [];

    const blocks = (chapter.blocks || []).map((blk: any) => {
      const isCompleted = completedIds.includes(blk.id);
      if (blk.blockType === 'QUESTION') {
        const { correctOptionId, ...sanitized } = blk;
        return {
          ...sanitized,
          completed: isCompleted,
        };
      }
      return {
        ...blk,
        completed: isCompleted,
      };
    });

    return HttpResponse.json(
      {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        versionNo: chapter.publishedVersionNo || chapter.lastVersionNo || 1,
        canSaveProgress,
        blocks,
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/blocks/:blockId/complete', ({ params }) => {
    const courseId = String(params.courseId);
    const blockId = String(params.blockId);

    if (!mockCompletedBlocks[courseId]) {
      mockCompletedBlocks[courseId] = [];
    }
    if (!mockCompletedBlocks[courseId].includes(blockId)) {
      mockCompletedBlocks[courseId].push(blockId);
    }

    mockChapters = getStoredChapters();
    const courseChapters = mockChapters[courseId] || mockChapters['my-course-1'] || [];
    const totalBlocks = courseChapters.reduce(
      (sum, c) => sum + (c.blocks ? c.blocks.length : 0),
      0
    );
    const completedCount = mockCompletedBlocks[courseId].length;
    const percent = totalBlocks > 0 ? Math.min(100, Math.round((completedCount / totalBlocks) * 100)) : 0;

    const completedIds = mockCompletedBlocks[courseId] || [];
    return HttpResponse.json(
      {
        courseId,
        percent,
        completedChapterIds: percent >= 100 ? courseChapters.map((c) => c.id) : [],
        chapters: courseChapters.map((c) => ({
          chapterId: c.id,
          percent: c.blocks?.length
            ? Math.round(
                (c.blocks.filter((b: any) => completedIds.includes(b.id)).length /
                  c.blocks.length) *
                  100
              )
            : 0,
        })),
        completedBlockIds: completedIds,
        lastActivityAt: new Date().toISOString(),
        courseCompletedAt: percent >= 100 ? new Date().toISOString() : null,
      },
      { status: 200 }
    );
  }),

  http.post('*/api/v1/courses/:courseId/blocks/:blockId/practice-answer', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      selectedOptionIds?: string[];
      bool?: boolean;
      text?: string;
    };

    const isCorrect = body.selectedOptionIds?.includes('opt-2') ?? true;

    return HttpResponse.json(
      {
        isCorrect,
        explanation: isCorrect
          ? 'Chính xác! Các module giao tiếp in-process thông qua interface công khai định nghĩa trong *.Contracts.'
          : 'Chưa chính xác. Các module không nên phụ thuộc trực tiếp vào DbContext hay Domain nội bộ của nhau.',
      },
      { status: 200 }
    );
  }),

  http.get('*/api/v1/courses/:courseId/progress', ({ params }) => {
    const courseId = String(params.courseId);
    mockChapters = getStoredChapters();
    const courseChapters = mockChapters[courseId] || mockChapters['my-course-1'] || [];
    const completedList = mockCompletedBlocks[courseId] || [];

    const totalBlocks = courseChapters.reduce(
      (sum, c) => sum + (c.blocks ? c.blocks.length : 0),
      0
    );
    const completedCount = completedList.length;
    const percent = totalBlocks > 0 ? Math.min(100, Math.round((completedCount / totalBlocks) * 100)) : 0;

    return HttpResponse.json(
      {
        courseId,
        percent,
        completedChapterIds: percent >= 100 ? courseChapters.map((c) => c.id) : [],
        chapters: courseChapters.map((c) => ({
          chapterId: c.id,
          percent: c.blocks?.length
            ? Math.round(
                (c.blocks.filter((b: any) => completedList.includes(b.id)).length /
                  c.blocks.length) *
                  100
              )
            : 0,
        })),
        completedBlockIds: completedList,
        lastActivityAt: completedList.length ? new Date().toISOString() : null,
        courseCompletedAt: percent >= 100 ? new Date().toISOString() : null,
      },
      { status: 200 }
    );
  }),

  http.put('*/api/v1/courses/:courseId/bookmark', async ({ params, request }) => {
    const courseId = String(params.courseId);
    const body = (await request.json().catch(() => ({}))) as { chapterId?: string };

    mockChapters = getStoredChapters();
    const courseChapters = mockChapters[courseId] || mockChapters['my-course-1'] || [];
    const chapter = courseChapters.find((c) => c.id === body.chapterId);

    const existingIdx = mockBookmarks.findIndex((b) => b.courseId === courseId);
    const bookmarkEntry = {
      courseId,
      courseName: 'Khóa học Modular Monolith',
      chapterId: body.chapterId || courseChapters[0]?.id || 'chapter-1',
      chapterTitle: chapter?.title || 'Chương 1',
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      mockBookmarks[existingIdx] = bookmarkEntry;
    } else {
      mockBookmarks.push(bookmarkEntry);
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/api/v1/courses/:courseId/bookmark', ({ params }) => {
    const courseId = String(params.courseId);
    mockBookmarks = mockBookmarks.filter((b) => b.courseId !== courseId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/me/bookmarks', () => {
    return HttpResponse.json(mockBookmarks, { status: 200 });
  }),

  // ==========================================
  // DISCOVERY HANDLERS (SCR-DSC-01, SCR-DSC-02)
  // ==========================================
  http.get('*/discovery/home', () => {
    mockCourses = getStoredCourses();
    const eligible = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');
    const recentlyUpdated = [...eligible].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);
    const recommended = [...eligible].sort(() => 0.5 - Math.random()).slice(0, 8);
    const inProgress = eligible.slice(0, 3).map((c) => ({
      ...c,
      progressPercent: 45,
    }));

    return HttpResponse.json({
      recentlyUpdated,
      recommended,
      inProgress,
    });
  }),
  http.get('*/api/v1/discovery/home', () => {
    mockCourses = getStoredCourses();
    const eligible = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');
    const recentlyUpdated = [...eligible].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10);
    const recommended = [...eligible].sort(() => 0.5 - Math.random()).slice(0, 8);
    const inProgress = eligible.slice(0, 3).map((c) => ({
      ...c,
      progressPercent: 45,
    }));

    return HttpResponse.json({
      recentlyUpdated,
      recommended,
      inProgress,
    });
  }),

  http.get('*/discovery/courses', ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const tag = (url.searchParams.get('tag') || '').trim().toLowerCase();
    const accessMode = url.searchParams.get('accessMode');
    const status = url.searchParams.get('status');
    const sort = url.searchParams.get('sort') || 'RECENTLY_UPDATED';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '12', 10);

    if (q && !mockSearchHistory.some((h) => h.queryText.toLowerCase() === q)) {
      mockSearchHistory.unshift({ queryText: q, createdAt: new Date().toISOString() });
    }

    mockCourses = getStoredCourses();
    let items = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');

    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.owner?.displayName && c.owner.displayName.toLowerCase().includes(q))
      );
    }

    if (tag) {
      items = items.filter((c) => c.tags?.some((t) => t.toLowerCase() === tag));
    }

    if (accessMode) {
      items = items.filter((c) => c.accessMode === accessMode);
    }

    if (status) {
      items = items.filter((c) => c.status === status);
    }

    if (sort === 'MOST_LEARNERS') {
      items.sort((a, b) => (b.learnerCount ?? 0) - (a.learnerCount ?? 0));
    } else if (sort === 'MOST_NOMINATED') {
      items.sort((a, b) => ((b as any).nominationCount ?? 0) - ((a as any).nominationCount ?? 0));
    } else if (sort === 'MOST_REVIEWED') {
      items.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    } else {
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return HttpResponse.json({
      items: paginatedItems,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  }),
  http.get('*/api/v1/discovery/courses', ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const tag = (url.searchParams.get('tag') || '').trim().toLowerCase();
    const accessMode = url.searchParams.get('accessMode');
    const status = url.searchParams.get('status');
    const sort = url.searchParams.get('sort') || 'RECENTLY_UPDATED';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '12', 10);

    if (q && !mockSearchHistory.some((h) => h.queryText.toLowerCase() === q)) {
      mockSearchHistory.unshift({ queryText: q, createdAt: new Date().toISOString() });
    }

    mockCourses = getStoredCourses();
    let items = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');

    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.owner?.displayName && c.owner.displayName.toLowerCase().includes(q))
      );
    }

    if (tag) {
      items = items.filter((c) => c.tags?.some((t) => t.toLowerCase() === tag));
    }

    if (accessMode) {
      items = items.filter((c) => c.accessMode === accessMode);
    }

    if (status) {
      items = items.filter((c) => c.status === status);
    }

    if (sort === 'MOST_LEARNERS') {
      items.sort((a, b) => (b.learnerCount ?? 0) - (a.learnerCount ?? 0));
    } else if (sort === 'MOST_NOMINATED') {
      items.sort((a, b) => ((b as any).nominationCount ?? 0) - ((a as any).nominationCount ?? 0));
    } else if (sort === 'MOST_REVIEWED') {
      items.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    } else {
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return HttpResponse.json({
      items: paginatedItems,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  }),

  http.get('*/discovery/search-history', () => {
    return HttpResponse.json(mockSearchHistory);
  }),
  http.get('*/api/v1/discovery/search-history', () => {
    return HttpResponse.json(mockSearchHistory);
  }),

  http.get('*/discovery/top10', () => {
    mockCourses = getStoredCourses();
    const eligible = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');
    const top10 = eligible.slice(0, 10).map((course, idx) => ({
      rank: idx + 1,
      count: (course.learnerCount ?? 100) + (10 - idx) * 15,
      course,
    }));
    return HttpResponse.json(top10);
  }),
  http.get('*/api/v1/discovery/top10', () => {
    mockCourses = getStoredCourses();
    const eligible = mockCourses.filter((c) => !c.isDeleted && !c.isHidden && c.accessMode !== 'ONLY_ME');
    const top10 = eligible.slice(0, 10).map((course, idx) => ({
      rank: idx + 1,
      count: (course.learnerCount ?? 100) + (10 - idx) * 15,
      course,
    }));
    return HttpResponse.json(top10);
  }),

  http.get('*/courses/:courseId/ranking', ({ params }) => {
    const courseId = String(params.courseId);
    return HttpResponse.json({
      courseId,
      learnerRank: 1,
      nominationRank: 2,
      reviewRank: 1,
      learnerCount: 250,
      nominationCount: 42,
      reviewCount: 30,
      totalEligibleCourses: 15,
    });
  }),
  http.get('*/api/v1/courses/:courseId/ranking', ({ params }) => {
    const courseId = String(params.courseId);
    return HttpResponse.json({
      courseId,
      learnerRank: 1,
      nominationRank: 2,
      reviewRank: 1,
      learnerCount: 250,
      nominationCount: 42,
      reviewCount: 30,
      totalEligibleCourses: 15,
    });
  }),

  // Questions and Quiz Authoring (T-S7-FE-01)
  http.get('*/courses/:courseId/questions', () => {
    return HttpResponse.json({
      items: [
        {
          id: 'q-sample-1',
          courseId: 'test-course-id',
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          difficultyCode: 1,
          defaultPoints: 10,
          status: 'READY',
          origin: 'MANUAL',
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội', isCorrect: true },
            { id: 'opt-2', position: 2, content: 'Huế', isCorrect: false },
          ],
          usageCount: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    });
  }),
  http.get('*/api/v1/courses/:courseId/questions', () => {
    return HttpResponse.json({
      items: [
        {
          id: 'q-sample-1',
          courseId: 'test-course-id',
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          difficultyCode: 1,
          defaultPoints: 10,
          status: 'READY',
          origin: 'MANUAL',
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội', isCorrect: true },
            { id: 'opt-2', position: 2, content: 'Huế', isCorrect: false },
          ],
          usageCount: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    });
  }),

  http.get('*/courses/:courseId/questions/:questionId/usage', ({ params }) => {
    return HttpResponse.json({
      questionId: String(params.questionId),
      quizCount: 2,
      attemptCount: 15,
      correctRate: 75,
      usedInQuizzes: [
        { quizBlockId: 'b-1', title: 'Quiz giữa kỳ', chapterTitle: 'Chương 1' },
      ],
    });
  }),
  http.get('*/api/v1/courses/:courseId/questions/:questionId/usage', ({ params }) => {
    return HttpResponse.json({
      questionId: String(params.questionId),
      quizCount: 2,
      attemptCount: 15,
      correctRate: 75,
      usedInQuizzes: [
        { quizBlockId: 'b-1', title: 'Quiz giữa kỳ', chapterTitle: 'Chương 1' },
      ],
    });
  }),

  http.get('*/courses/:courseId/quizzes/:blockId/exceptions', () => {
    return HttpResponse.json([]);
  }),
  http.get('*/api/v1/courses/:courseId/quizzes/:blockId/exceptions', () => {
    return HttpResponse.json([]);
  }),

  http.put('*/courses/:courseId/quizzes/:blockId/exceptions/:userId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.put('*/api/v1/courses/:courseId/quizzes/:blockId/exceptions/:userId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/courses/:courseId/quizzes/:blockId/exceptions/:userId', () => {
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('*/api/v1/courses/:courseId/quizzes/:blockId/exceptions/:userId', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Quiz Attempts (SCR-LRN-02, SCR-LRN-03, SCR-LRN-04)
  http.get('*/courses/:courseId/quizzes/:blockId/attempts', () => {
    return HttpResponse.json([
      {
        attemptId: 'att-sample-1',
        quizBlockId: 'block-quiz-1',
        userId: '11111111-1111-4111-8111-111111111111',
        status: 'GRADED',
        totalScore: 8.5,
        maxScore: 10,
        startedAt: '2026-11-15T08:00:00Z',
        submittedAt: '2026-11-15T08:35:00Z',
      },
    ]);
  }),
  http.get('*/api/v1/courses/:courseId/quizzes/:blockId/attempts', () => {
    return HttpResponse.json([
      {
        attemptId: 'att-sample-1',
        quizBlockId: 'block-quiz-1',
        userId: '11111111-1111-4111-8111-111111111111',
        status: 'GRADED',
        totalScore: 8.5,
        maxScore: 10,
        startedAt: '2026-11-15T08:00:00Z',
        submittedAt: '2026-11-15T08:35:00Z',
      },
    ]);
  }),

  http.post('*/courses/:courseId/quizzes/:blockId/attempts', () => {
    return HttpResponse.json({
      id: 'att-in-progress-1',
      quizBlockId: 'block-quiz-1',
      courseId: 'sample-course-1',
      attemptNo: 2,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      totalScore: null,
      maxScore: 10,
      questions: [
        {
          id: 'q-mc-1',
          position: 1,
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội' },
            { id: 'opt-2', position: 2, content: 'Hồ Chí Minh' },
          ],
        },
        {
          id: 'q-tf-1',
          position: 2,
          questionType: 'TRUE_FALSE',
          stem: 'HTML là một ngôn ngữ lập trình.',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-tf-1', position: 1, content: 'Đúng' },
            { id: 'opt-tf-2', position: 2, content: 'Sai' },
          ],
        },
      ],
    });
  }),
  http.post('*/api/v1/courses/:courseId/quizzes/:blockId/attempts', () => {
    return HttpResponse.json({
      id: 'att-in-progress-1',
      quizBlockId: 'block-quiz-1',
      courseId: 'sample-course-1',
      attemptNo: 2,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      totalScore: null,
      maxScore: 10,
      questions: [
        {
          id: 'q-mc-1',
          position: 1,
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội' },
            { id: 'opt-2', position: 2, content: 'Hồ Chí Minh' },
          ],
        },
        {
          id: 'q-tf-1',
          position: 2,
          questionType: 'TRUE_FALSE',
          stem: 'HTML là một ngôn ngữ lập trình.',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-tf-1', position: 1, content: 'Đúng' },
            { id: 'opt-tf-2', position: 2, content: 'Sai' },
          ],
        },
      ],
    });
  }),

  http.get('*/quiz-attempts/:attemptId', ({ params, request }) => {
    if (request.headers.get('accept')?.includes('text/html')) {
      return;
    }
    const isResult = params.attemptId === 'att-result-1' || submittedQuizAttemptIds.has(String(params.attemptId));
    return HttpResponse.json({
      id: String(params.attemptId),
      quizBlockId: 'block-quiz-1',
      courseId: 'sample-course-1',
      attemptNo: 1,
      status: isResult ? 'GRADED' : 'IN_PROGRESS',
      startedAt: '2026-11-15T08:00:00Z',
      deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      submittedAt: isResult ? '2026-11-15T08:25:00Z' : null,
      totalScore: isResult ? 10 : null,
      maxScore: 10,
      questions: [
        {
          id: 'q-mc-1',
          position: 1,
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội', isCorrect: isResult ? true : undefined },
            { id: 'opt-2', position: 2, content: 'Hồ Chí Minh', isCorrect: isResult ? false : undefined },
          ],
          explanation: isResult ? 'Hà Nội là thủ đô của nước CHXHCN Việt Nam.' : undefined,
          studentAnswer: isResult ? { selectedOptionIds: ['opt-1'], isCorrect: true, pointsEarned: 5 } : undefined,
        },
        {
          id: 'q-tf-1',
          position: 2,
          questionType: 'TRUE_FALSE',
          stem: 'HTML là một ngôn ngữ lập trình.',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-tf-1', position: 1, content: 'Đúng', isCorrect: isResult ? false : undefined },
            { id: 'opt-tf-2', position: 2, content: 'Sai', isCorrect: isResult ? true : undefined },
          ],
          explanation: isResult ? 'HTML là ngôn ngữ đánh dấu siêu văn bản, không phải ngôn ngữ lập trình.' : undefined,
          studentAnswer: isResult ? { selectedOptionIds: ['opt-tf-2'], isCorrect: true, pointsEarned: 5 } : undefined,
        },
      ],
    });
  }),
  http.get('*/api/v1/quiz-attempts/:attemptId', ({ params }) => {
    const isResult = params.attemptId === 'att-result-1' || submittedQuizAttemptIds.has(String(params.attemptId));
    return HttpResponse.json({
      id: String(params.attemptId),
      quizBlockId: 'block-quiz-1',
      courseId: 'sample-course-1',
      attemptNo: 1,
      status: isResult ? 'GRADED' : 'IN_PROGRESS',
      startedAt: '2026-11-15T08:00:00Z',
      deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      submittedAt: isResult ? '2026-11-15T08:25:00Z' : null,
      totalScore: isResult ? 10 : null,
      maxScore: 10,
      questions: [
        {
          id: 'q-mc-1',
          position: 1,
          questionType: 'MULTIPLE_CHOICE',
          stem: 'Thủ đô của Việt Nam là gì?',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-1', position: 1, content: 'Hà Nội', isCorrect: isResult ? true : undefined },
            { id: 'opt-2', position: 2, content: 'Hồ Chí Minh', isCorrect: isResult ? false : undefined },
          ],
          explanation: isResult ? 'Hà Nội là thủ đô của nước CHXHCN Việt Nam.' : undefined,
          studentAnswer: isResult ? { selectedOptionIds: ['opt-1'], isCorrect: true, pointsEarned: 5 } : undefined,
        },
        {
          id: 'q-tf-1',
          position: 2,
          questionType: 'TRUE_FALSE',
          stem: 'HTML là một ngôn ngữ lập trình.',
          maxPoints: 5,
          allowMultiple: false,
          options: [
            { id: 'opt-tf-1', position: 1, content: 'Đúng', isCorrect: isResult ? false : undefined },
            { id: 'opt-tf-2', position: 2, content: 'Sai', isCorrect: isResult ? true : undefined },
          ],
          explanation: isResult ? 'HTML là ngôn ngữ đánh dấu siêu văn bản, không phải ngôn ngữ lập trình.' : undefined,
          studentAnswer: isResult ? { selectedOptionIds: ['opt-tf-2'], isCorrect: true, pointsEarned: 5 } : undefined,
        },
      ],
    });
  }),

  http.put('*/quiz-attempts/:attemptId/answers/:questionId', () => {
    return HttpResponse.json({
      savedAt: new Date().toISOString(),
      isCorrect: null,
      pointsEarned: null,
    });
  }),
  http.put('*/api/v1/quiz-attempts/:attemptId/answers/:questionId', () => {
    return HttpResponse.json({
      savedAt: new Date().toISOString(),
      isCorrect: null,
      pointsEarned: null,
    });
  }),

  http.post('*/quiz-attempts/:attemptId/submit', ({ params }) => {
    submittedQuizAttemptIds.add(String(params.attemptId));
    return HttpResponse.json({
      attemptId: String(params.attemptId),
      status: 'GRADED',
      totalScore: 10,
      maxScore: 10,
      isPassed: true,
    });
  }),
  http.post('*/api/v1/quiz-attempts/:attemptId/submit', ({ params }) => {
    submittedQuizAttemptIds.add(String(params.attemptId));
    return HttpResponse.json({
      attemptId: String(params.attemptId),
      status: 'GRADED',
      totalScore: 10,
      maxScore: 10,
      isPassed: true,
    });
  }),
];
