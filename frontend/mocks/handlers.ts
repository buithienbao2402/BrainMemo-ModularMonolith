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
      hasUnpublishedChanges: true,
      lastVersionNo: 2,
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
            { front: 'Modular Monolith là gì?', back: 'Hệ thống đơn khối chia ranh giới module rõ ràng qua contracts.' },
            { front: 'DEC-05 quy định gì?', back: 'Client upload trực tiếp qua presigned URL; ảnh <= 5MB, tệp <= 20MB.' },
          ],
          aiReviewStatus: 'APPROVED',
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
export let mockResources: Record<string, MockResourceItem[]> = JSON.parse(
  JSON.stringify(initialMockResources)
);

export function resetMockCourses(): void {
  mockCourses = [...initialMockCourses];
  mockChapters = JSON.parse(JSON.stringify(initialMockChapters));
  mockVersions = JSON.parse(JSON.stringify(initialMockVersions));
  mockResources = JSON.parse(JSON.stringify(initialMockResources));
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('bm_mock_courses');
      window.localStorage.removeItem('bm_mock_profiles');
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
    const count = persona === 'admin' ? 5 : persona === 'user' ? 3 : 1;
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

  http.put('*/api/v1/courses/:courseId/nomination', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/api/v1/courses/:courseId/nomination', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ==========================================
  // S3 Content & Chapter Drafting (T-S3-FE-01)
  // ==========================================
  http.get('*/api/v1/courses/:courseId/chapters', ({ params }) => {
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

    return HttpResponse.json(newChapter, { status: 201 });
  }),

  http.put('*/api/v1/courses/:courseId/chapters/order', async ({ params, request }) => {
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
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/v1/courses/:courseId/chapters/:chapterId', ({ params }) => {
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
    chapter.hasUnpublishedChanges = true;

    if (!mockVersions[chapterId]) {
      mockVersions[chapterId] = [];
    }
    mockVersions[chapterId].push({
      versionNo: chapter.lastVersionNo,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      restoredFromVersionNo: null,
    });

    return HttpResponse.json(chapter, { status: 200 });
  }),

  http.delete('*/api/v1/courses/:courseId/chapters/:chapterId', ({ params }) => {
    const courseId = String(params.courseId);
    const chapterId = String(params.chapterId);
    const list = mockChapters[courseId] || [];
    const idx = list.findIndex((c) => c.id === chapterId);

    if (idx !== -1) {
      list.splice(idx, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/v1/courses/:courseId/chapters/:chapterId/publish', ({ params }) => {
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

    return HttpResponse.json(chapter, { status: 200 });
  }),

  http.get('*/api/v1/courses/:courseId/chapters/:chapterId/versions', ({ params }) => {
    const chapterId = String(params.chapterId);
    const versions = mockVersions[chapterId] || [
      {
        versionNo: 1,
        createdAt: '2026-11-10T08:00:00Z',
        publishedAt: null,
        restoredFromVersionNo: null,
      },
    ];
    return HttpResponse.json(versions, { status: 200 });
  }),

  http.post(
    '*/api/v1/courses/:courseId/chapters/:chapterId/versions/:versionNo/restore',
    ({ params }) => {
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

      chapter.lastVersionNo = (chapter.lastVersionNo || 1) + 1;
      chapter.hasUnpublishedChanges = true;

      if (!mockVersions[chapterId]) {
        mockVersions[chapterId] = [];
      }
      mockVersions[chapterId].push({
        versionNo: chapter.lastVersionNo,
        createdAt: new Date().toISOString(),
        publishedAt: null,
        restoredFromVersionNo: versionNo,
      });

      return HttpResponse.json(chapter, { status: 200 });
    }
  ),

  http.get('*/api/v1/courses/:courseId/resources', ({ params }) => {
    const courseId = String(params.courseId);
    const list = mockResources[courseId] || [];
    return HttpResponse.json(list, { status: 200 });
  }),

  http.post('*/api/v1/courses/:courseId/resources', async ({ params, request }) => {
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
    return HttpResponse.json(newRes, { status: 201 });
  }),

  http.delete('*/api/v1/courses/:courseId/resources/:id', ({ params }) => {
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
];
