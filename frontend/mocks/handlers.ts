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

export const mockProfiles: Record<Exclude<MockPersona, 'guest' | 'locked'>, ProfileDto> = {
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

function readPersonaFromCookie(request: Request): MockPersona {
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
    return HttpResponse.json(tokens, { status: 200 });
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
    return HttpResponse.json(tokens, { status: 200 });
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
    return HttpResponse.json(tokens, { status: 200 });
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
    const patch = (await request.json().catch(() => ({}))) as Partial<ProfileDto>;
    const updated: ProfileDto = {
      ...mockProfiles[persona],
      ...patch,
    };
    mockProfiles[persona] = updated;
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
    const url = new URL(request.url);
    const relation = url.searchParams.get('relation') || 'OWNED';

    if (userId === 'hidden-courses-user') {
      return HttpResponse.json({ items: [], meta: { totalCount: 0 } }, { status: 200 });
    }

    const mockItems = [
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

    return HttpResponse.json(
      {
        items: mockItems,
        meta: {
          page: 1,
          pageSize: 12,
          totalCount: mockItems.length,
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
  }),

  http.post('*/api/v1/courses', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    if (!body.name) {
      return problemResponse(422, {
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'name', message: 'Tên khóa học không được để trống' }],
      });
    }

    const newCourse = {
      id: `created-course-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      accessMode: body.accessMode || 'PUBLIC',
      status: body.status || 'DRAFT',
      tags: body.tags || [],
      coverUrl: null,
      owner: {
        id: mockUsers.user.id,
        displayName: mockProfiles.user.displayName,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(newCourse, { status: 201 });
  }),

  http.patch('*/api/v1/courses/:courseId', async ({ params, request }) => {
    const { courseId } = params;
    const body = (await request.json().catch(() => ({}))) as any;

    return HttpResponse.json(
      {
        id: String(courseId),
        name: body.name || 'Khóa học cập nhật',
        description: body.description || '',
        accessMode: body.accessMode || 'PUBLIC',
        status: body.status || 'PUBLISHED',
        tags: body.tags || [],
        coverUrl: null,
        owner: {
          id: mockUsers.user.id,
          displayName: mockProfiles.user.displayName,
        },
        viewer: {
          isOwner: true,
          enrollmentStatus: null,
          canReadContent: true,
          canLearn: true,
          hasNominated: false,
        },
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
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

    const sampleItems =
      relation === 'OWNED'
        ? [
            {
              id: 'my-course-1',
              name: 'Nhập môn Python - Từ Zero tới Hero',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'PUBLIC',
              status: 'UPDATING',
              tags: ['python', 'backend'],
              learnerCount: 1240,
              chapterCount: 24,
              ratingAvg: 4.8,
              ratingCount: 320,
              pendingReviews: 5,
              pendingGrades: 12,
            },
            {
              id: 'my-course-2',
              name: 'Kiến trúc Microservices & Distributed Systems thực chiến',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'PRIVATE',
              status: 'UPDATING',
              tags: ['microservices', 'distributed'],
              learnerCount: 840,
              chapterCount: 16,
              ratingAvg: 4.9,
              ratingCount: 180,
              pendingReviews: 3,
              pendingGrades: 8,
            },
            {
              id: 'my-course-3',
              name: 'Khoa học Dữ liệu ứng dụng với Python, Pandas & Scikit-Learn',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'PUBLIC',
              status: 'COMPLETED',
              tags: ['datascience', 'python'],
              learnerCount: 3420,
              chapterCount: 32,
              ratingAvg: 4.9,
              ratingCount: 880,
              isSrsSynced: true,
            },
            {
              id: 'my-course-4',
              name: 'Thực hành Web Scraping nâng cao & Automation Bot',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'ONLY_ME',
              status: 'HIDDEN',
              tags: ['webscraping', 'automation'],
              learnerCount: 210,
              chapterCount: 8,
              ratingAvg: 4.7,
              ratingCount: 45,
              isDraftReviewing: true,
              isHiddenWarning: true,
            },
            {
              id: 'my-course-5',
              name: 'Xây dựng Design System chuyên nghiệp với React & Tailwind',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'PUBLIC',
              status: 'PAUSED',
              tags: ['designsystem', 'react'],
              learnerCount: 1890,
              chapterCount: 18,
              ratingAvg: 4.8,
              ratingCount: 290,
              isContentMaintaining: true,
            },
            {
              id: 'my-course-6',
              name: 'Cấu trúc Dữ liệu & Giải thuật: Chinh phục Phỏng vấn Big Tech',
              coverUrl: null,
              owner: { id: mockUsers.user.id, displayName: 'Quang Trần' },
              accessMode: 'PUBLIC',
              status: 'UPDATING',
              tags: ['dsa', 'algorithms'],
              learnerCount: 5100,
              chapterCount: 40,
              ratingAvg: 4.9,
              ratingCount: 1120,
              pendingGrades: 16,
            },
          ]
        : [
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
];
