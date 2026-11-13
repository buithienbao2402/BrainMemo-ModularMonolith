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
];
