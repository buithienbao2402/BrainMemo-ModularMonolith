import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetMockSessions } from '@mocks/handlers';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';

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

beforeEach(() => {
  resetMockSessions();
  setAccessToken('mock-access-token-user');
  document.cookie = 'bm_mock_persona=user; path=/';
});

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetMockSessions();
});

describe('SCR-AUTH-06: Security & Sessions (/settings/security & /settings/sessions)', () => {
  it('renders security settings page with change password section', async () => {
    renderAppAt('/settings/security');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'CÀI ĐẶT TÀI KHOẢN' })
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
  });

  describe('Change Password Card', () => {
    it('validates password requirements and mismatch', async () => {
      const user = userEvent.setup();
      renderAppAt('/settings/security');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));

      await waitFor(() => {
        expect(screen.getByText('Vui lòng nhập mật khẩu hiện tại')).toBeInTheDocument();
        expect(screen.getByText('Mật khẩu mới phải có ít nhất 8 ký tự')).toBeInTheDocument();
      });
    });

    it('shows error when current password is wrong', async () => {
      const user = userEvent.setup();
      renderAppAt('/settings/security');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'WrongPass123!');
      await user.type(screen.getByLabelText('Mật khẩu mới'), 'ValidNewPass123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'ValidNewPass123!');
      await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));

      await waitFor(() => {
        expect(screen.getByText('Mật khẩu hiện tại không chính xác.')).toBeInTheDocument();
      });
    });

    it('successfully changes password and clears form', async () => {
      const user = userEvent.setup();
      renderAppAt('/settings/security');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'OldPass123!');
      await user.type(screen.getByLabelText('Mật khẩu mới'), 'NewPass123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'NewPass123!');
      await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));

      await waitFor(() => {
        expect(
          screen.getAllByText(
            /Đổi mật khẩu thành công\. Các phiên đăng nhập trên thiết bị khác đã được thu hồi\./i
          ).length
        ).toBeGreaterThan(0);
      });

      expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('');
      expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
      expect(screen.getByLabelText('Xác nhận mật khẩu mới')).toHaveValue('');
    });
  });

  describe('Session List Card (/settings/sessions)', () => {
    it('displays active sessions list with current device badge', async () => {
      renderAppAt('/settings/sessions');

      await waitFor(() => {
        expect(screen.getByText('Phiên hiện tại')).toBeInTheDocument();
      });

      expect(screen.getByText('DANH SÁCH THIẾT BỊ KẾT NỐI')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Đăng xuất khỏi tất cả thiết bị' })
      ).toBeInTheDocument();
    });

    it('opens confirmation dialog and revokes a specific session', async () => {
      const user = userEvent.setup();
      renderAppAt('/settings/sessions');

      await waitFor(() => {
        expect(screen.getByText('Phiên hiện tại')).toBeInTheDocument();
      });

      // Find the revoke button for the second session
      const revokeButtons = screen.getAllByRole('button', { name: /Thu hồi/i });
      expect(revokeButtons.length).toBeGreaterThan(0);
      expect(revokeButtons[0]).toBeDefined();
      await user.click(revokeButtons[0]!);

      // Confirmation dialog should open
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Thu hồi phiên đăng nhập?' })
        ).toBeInTheDocument();
      });

      // Confirm revoke
      const confirmButton = screen.getByRole('button', { name: 'Thu hồi ngay' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Đã thu hồi phiên')).toBeInTheDocument();
      });
    });

    it('opens confirmation dialog and logs out all sessions', async () => {
      const user = userEvent.setup();
      renderAppAt('/settings/sessions');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Đăng xuất khỏi tất cả thiết bị' })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Đăng xuất khỏi tất cả thiết bị' }));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Đăng xuất khỏi tất cả thiết bị?' })
        ).toBeInTheDocument();
      });

      const confirmLogoutAll = screen.getByRole('button', {
        name: 'Đồng ý đăng xuất tất cả',
      });
      await user.click(confirmLogoutAll);

      // Successfully redirected to login
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });
    });
  });
});
