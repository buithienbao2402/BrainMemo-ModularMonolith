import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { mockProfiles, mockUsers } from '@mocks/handlers';
import { server } from '@mocks/server';
import { clearAccessToken, getAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from './providers';
import { createAppQueryClient } from './queryClient';
import { appRoutes } from './router';

function renderAppAt(initialPath: string) {
  const queryClient = createAppQueryClient({ disableRetry: true });
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialPath],
  });

  return render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  document.documentElement.className = '';
  delete document.documentElement.dataset.theme;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('App Shell (SCR-COM-01, SCR-COM-02, SCR-COM-03, Guards, Theme)', () => {
  it('renders Guest SCR-COM-01 layout, theme toggle, and all 4 UI states cleanly', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Đăng ký' })).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Tìm khóa học, chủ khóa...').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
    expect(
      screen.getByText('© 2026 BrainMemo LMS. Tất cả các quyền được bảo lưu.')
    ).toBeInTheDocument();

    // Toggle theme light <-> dark without storing auth secrets
    const themeToggle = screen.getByRole('button', { name: /Chuyển sang giao diện/i });
    const wasDark = document.documentElement.classList.contains('dark');
    await user.click(themeToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(!wasDark);

    // Verify Figma Guest Home sections
    expect(screen.getByText('MỚI CẬP NHẬT')).toBeInTheDocument();
    expect(screen.getByText('BẢNG XẾP HẠNG')).toBeInTheDocument();
    expect(screen.getByText('KHÁM PHÁ NGẪU NHIÊN')).toBeInTheDocument();
    expect(screen.getByText('ĐÁNH GIÁ MỚI NHẤT')).toBeInTheDocument();
    expect(screen.getByText('MỚI ĐƯỢC ĐỀ CỬ')).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });

  it('boots authenticated learner via POST /auth/refresh, shows unread notifications, profile menu & logs out', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          accessToken: 'learner-token-abc',
          expiresIn: 1800,
          user: mockUsers.user,
        })
      ),
      http.get('*/api/v1/profiles/me', () => HttpResponse.json(mockProfiles.user)),
      http.get('*/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 3 }))
    );

    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Quang Trần' })).toBeInTheDocument();
    });

    expect(getAccessToken()).toBe('learner-token-abc');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('link', { name: 'Tạo khóa học' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Có 3 thông báo chưa đọc' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard học tập' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();
    expect(screen.getByText('TIẾP TỤC HỌC')).toBeInTheDocument();

    // Open profile menu & log out
    await user.click(screen.getByRole('button', { name: 'Quang Trần' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Xem thông tin công khai' })
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cài đặt' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    });
    expect(getAccessToken()).toBeNull();
  });

  it('redirects unauthenticated RequireAuth to /login?next= and renders SCR-COM-02 for unknown routes', async () => {
    const firstRender = renderAppAt('/me/courses');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
    });
    firstRender.unmount();

    renderAppAt('/duong-dan-sai-404');
    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    });
    expect(screen.getByText('Không tìm thấy trang')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quay về trang chủ' })).toBeInTheDocument();
  });

  it('shows verify email banner on RequireVerifiedEmail route and blocks non-admin from /admin', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          accessToken: 'unverified-token',
          expiresIn: 1800,
          user: mockUsers.unverified,
        })
      ),
      http.get('*/api/v1/profiles/me', () => HttpResponse.json(mockProfiles.unverified)),
      http.get('*/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 0 }))
    );

    const firstRender = renderAppAt('/courses/new');
    await waitFor(() => {
      expect(screen.getByText(/Tài khoản chưa xác minh email/i)).toBeInTheDocument();
    });
    firstRender.unmount();

    renderAppAt('/admin');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Bạn không có quyền thực hiện thao tác này.'
      );
    });
  });

  it('renders AdminLayout for admin user and redirects locked accounts to SCR-COM-03', async () => {
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json({
          accessToken: 'admin-token',
          expiresIn: 1800,
          user: mockUsers.admin,
        })
      ),
      http.get('*/api/v1/profiles/me', () => HttpResponse.json(mockProfiles.admin)),
      http.get('*/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 5 }))
    );

    const adminRender = renderAppAt('/admin');
    await waitFor(() => {
      expect(screen.getByText('SCR-ADM-01')).toBeInTheDocument();
    });

    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng quản trị' });
    expect(within(sidebar).getByRole('link', { name: 'Kiểm duyệt nội dung' })).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('link', { name: 'Cấu hình AI kiểm duyệt' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang học tập' })).toBeInTheDocument();
    adminRender.unmount();

    // Locked account handling -> SCR-COM-03
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json(
          {
            title: 'Tài khoản đang bị khóa',
            status: 403,
            code: 'ACCOUNT_LOCKED',
            lockReason: 'Vi phạm bản quyền tài liệu',
            lockedUntil: null,
          },
          { status: 403 }
        )
      )
    );

    renderAppAt('/');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tài khoản đang bị khóa' })).toBeInTheDocument();
    });
    expect(screen.getByText('Vi phạm bản quyền tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Vĩnh viễn')).toBeInTheDocument();
  });
});
