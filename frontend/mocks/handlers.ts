import { http, HttpResponse } from 'msw';
import type { AuthTokens, CurrentUser, ProblemDetails, ProfileDto } from '@/shared/api';

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
