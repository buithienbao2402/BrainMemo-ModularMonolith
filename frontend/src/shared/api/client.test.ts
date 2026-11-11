import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@mocks/server';
import { createManagedApiClient, unwrapApi } from './client';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

afterEach(() => {
  clearAccessToken();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('createManagedApiClient / single-flight refresh & memory token', () => {
  it('attaches Bearer token from memory only without touching Web Storage', async () => {
    setAccessToken('initial-mem-token');
    let capturedAuthHeader: string | null = null;

    server.use(
      http.get('*/api/v1/auth/me', ({ request }) => {
        capturedAuthHeader = request.headers.get('authorization');
        return HttpResponse.json({
          id: 'u-1',
          email: 'user@brainmemo.vn',
          emailVerified: true,
          isAdmin: false,
          accountStatus: 'ACTIVE',
        });
      })
    );

    const managed = createManagedApiClient({ baseUrl: '/api/v1' });
    const me = await unwrapApi(managed.client.GET('/auth/me'));

    expect(me.email).toBe('user@brainmemo.vn');
    expect(capturedAuthHeader).toBe('Bearer initial-mem-token');
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('performs single-flight POST /auth/refresh for concurrent 401 failures and retries each request once', async () => {
    setAccessToken('expired-token');
    let refreshCalls = 0;

    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({
          accessToken: 'fresh-token-123',
          expiresIn: 1800,
          user: {
            id: 'u-1',
            email: 'user@brainmemo.vn',
            emailVerified: true,
            isAdmin: false,
            accountStatus: 'ACTIVE',
          },
        });
      }),
      http.get('*/api/v1/auth/me', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-token-123') {
          return HttpResponse.json(
            { title: 'Expired', status: 401, code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }
        return HttpResponse.json({
          id: 'u-1',
          email: 'user@brainmemo.vn',
          emailVerified: true,
          isAdmin: false,
          accountStatus: 'ACTIVE',
        });
      }),
      http.get('*/api/v1/notifications/unread-count', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-token-123') {
          return HttpResponse.json(
            { title: 'Expired', status: 401, code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }
        return HttpResponse.json({ count: 7 });
      }),
      http.get('*/api/v1/profiles/me', ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer fresh-token-123') {
          return HttpResponse.json(
            { title: 'Expired', status: 401, code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }
        return HttpResponse.json({
          userId: 'u-1',
          displayName: 'Quang Trần',
          uiTheme: 'DARK',
        });
      })
    );

    const managed = createManagedApiClient({ baseUrl: '/api/v1' });

    const [me, unread, profile] = await Promise.all([
      unwrapApi(managed.client.GET('/auth/me')),
      unwrapApi(managed.client.GET('/notifications/unread-count')),
      unwrapApi(managed.client.GET('/profiles/me')),
    ]);

    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe('fresh-token-123');
    expect(me.email).toBe('user@brainmemo.vn');
    expect(unread.count).toBe(7);
    expect(profile.displayName).toBe('Quang Trần');
  });

  it('preserves request body on 401 retry and triggers session expiration if refresh fails', async () => {
    setAccessToken('old-token');
    let receivedBody: unknown = null;

    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        return HttpResponse.json({
          accessToken: 'renewed-token',
          expiresIn: 1800,
        });
      }),
      http.put('*/api/v1/profiles/me', async ({ request }) => {
        if (request.headers.get('authorization') !== 'Bearer renewed-token') {
          return HttpResponse.json(
            { title: 'Expired', status: 401, code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }
        receivedBody = await request.json();
        return HttpResponse.json({ displayName: 'Tên Mới', uiTheme: 'LIGHT' });
      })
    );

    const managed = createManagedApiClient({ baseUrl: '/api/v1' });
    const updated = await unwrapApi(
      managed.client.PUT('/profiles/me', {
        body: { displayName: 'Tên Mới', uiTheme: 'LIGHT' },
      })
    );

    expect(receivedBody).toEqual({ displayName: 'Tên Mới', uiTheme: 'LIGHT' });
    expect(updated.displayName).toBe('Tên Mới');

    // Now simulate failed refresh on subsequent 401
    const onSessionExpired = vi.fn();
    managed.setCallbacks({ onSessionExpired });

    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        return HttpResponse.json(
          { title: 'Hết phiên', status: 401, code: 'INVALID_REFRESH_TOKEN' },
          { status: 401 }
        );
      }),
      http.get('*/api/v1/auth/me', () => {
        return HttpResponse.json(
          { title: 'Hết phiên', status: 401, code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      })
    );

    await expect(unwrapApi(managed.client.GET('/auth/me'))).rejects.toMatchObject({
      status: 401,
    });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('dispatches onAccountLocked, onRateLimited, and onServerError callbacks', async () => {
    const onAccountLocked = vi.fn();
    const onRateLimited = vi.fn();
    const onServerError = vi.fn();

    const managed = createManagedApiClient({
      baseUrl: '/api/v1',
      callbacks: { onAccountLocked, onRateLimited, onServerError },
    });

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json(
          {
            title: 'Tài khoản bị khóa',
            status: 403,
            code: 'ACCOUNT_LOCKED',
            lockReason: 'Spam',
            lockedUntil: null,
          },
          { status: 403 }
        )
      )
    );
    await expect(unwrapApi(managed.client.GET('/auth/me'))).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
    expect(onAccountLocked).toHaveBeenCalledTimes(1);

    server.use(
      http.get('*/api/v1/notifications/unread-count', () =>
        HttpResponse.json(
          { title: 'Quá nhanh', status: 429, code: 'RATE_LIMITED' },
          { status: 429 }
        )
      )
    );
    await expect(
      unwrapApi(managed.client.GET('/notifications/unread-count'))
    ).rejects.toMatchObject({ status: 429 });
    expect(onRateLimited).toHaveBeenCalledTimes(1);

    server.use(
      http.get('*/api/v1/profiles/me', () =>
        HttpResponse.json(
          { title: 'Lỗi hệ thống', status: 500, code: 'INTERNAL_ERROR' },
          { status: 500 }
        )
      )
    );
    await expect(unwrapApi(managed.client.GET('/profiles/me'))).rejects.toMatchObject({
      status: 500,
    });
    expect(onServerError).toHaveBeenCalledTimes(1);
  });
});
