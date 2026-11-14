import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAccessToken, getAccessToken } from '@/shared/api';
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

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Auth Pages (SCR-AUTH-01..05)', () => {
  describe('SCR-AUTH-01: Login (/login)', () => {
    it('renders login form with inputs, submit button, google button and links', async () => {
      renderAppAt('/login');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Địa chỉ email')).toBeInTheDocument();
      expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tiếp tục với Google/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute(
        'href',
        '/forgot-password'
      );
      expect(screen.getByRole('link', { name: 'Đăng ký ngay' })).toHaveAttribute(
        'href',
        '/register'
      );
    });

    it('shows field validation errors when submitted with empty or invalid fields', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

      await waitFor(() => {
        expect(screen.getByText('Vui lòng nhập địa chỉ email')).toBeInTheDocument();
        expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
      });
    });

    it('successfully logs in with valid credentials and sets token in memory', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Địa chỉ email'), 'quang.tran@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'Secret123!');
      await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

      await waitFor(() => {
        expect(getAccessToken()).toContain('mock-access-token');
      });
    });

    it('shows error on invalid credentials (401)', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Địa chỉ email'), 'wrong@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

      await waitFor(() => {
        expect(screen.getByText('Email hoặc mật khẩu không chính xác.')).toBeInTheDocument();
      });
    });

    it('redirects to /locked (SCR-COM-03) on 403 ACCOUNT_LOCKED', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Địa chỉ email'), 'locked@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'Secret123!');
      await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Tài khoản đang bị khóa' })).toBeInTheDocument();
        expect(
          screen.getByText('Tài khoản bị khóa do vi phạm tiêu chuẩn cộng đồng')
        ).toBeInTheDocument();
      });
    });
  });

  describe('SCR-AUTH-02: Register (/register)', () => {
    it('renders register form with password confirmation', async () => {
      renderAppAt('/register');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng ký tài khoản' })).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument();
      expect(screen.getByLabelText('Địa chỉ email')).toBeInTheDocument();
      expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
      expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đăng ký tài khoản' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Đăng nhập ngay' })).toHaveAttribute(
        'href',
        '/login'
      );
    });

    it('validates password minimum length and mismatch', async () => {
      const user = userEvent.setup();
      renderAppAt('/register');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng ký tài khoản' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
      await user.type(screen.getByLabelText('Địa chỉ email'), 'test@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'short');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'different');
      await user.click(screen.getByRole('button', { name: 'Đăng ký tài khoản' }));

      await waitFor(() => {
        expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeInTheDocument();
        expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
      });
    });

    it('shows error if email is already taken (409)', async () => {
      const user = userEvent.setup();
      renderAppAt('/register');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng ký tài khoản' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
      await user.type(screen.getByLabelText('Địa chỉ email'), 'existing@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'ValidPassword123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'ValidPassword123!');
      await user.click(screen.getByRole('button', { name: 'Đăng ký tài khoản' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Địa chỉ email này đã được đăng ký. Vui lòng chọn email khác hoặc đăng nhập.'
          )
        ).toBeInTheDocument();
      });
    });

    it('successfully registers and displays success screen instructing email check', async () => {
      const user = userEvent.setup();
      renderAppAt('/register');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng ký tài khoản' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Họ và tên'), 'Học viên mới');
      await user.type(screen.getByLabelText('Địa chỉ email'), 'new.student@brainmemo.vn');
      await user.type(screen.getByLabelText('Mật khẩu'), 'ValidPassword123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'ValidPassword123!');
      await user.click(screen.getByRole('button', { name: 'Đăng ký tài khoản' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đăng ký thành công!' })).toBeInTheDocument();
        expect(screen.getByText(/new\.student@brainmemo\.vn/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toBeInTheDocument();
      });
    });
  });

  describe('SCR-AUTH-03: Forgot Password (/forgot-password)', () => {
    it('renders forgot password form and always displays privacy-safe confirmation message', async () => {
      const user = userEvent.setup();
      renderAppAt('/forgot-password');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quên mật khẩu' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Địa chỉ email'), 'user@brainmemo.vn');
      await user.click(screen.getByRole('button', { name: 'Gửi liên kết khôi phục' }));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Yêu cầu đã được tiếp nhận' })
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('SCR-AUTH-04: Reset Password (/reset-password)', () => {
    it('shows missing token error card when accessed without token', async () => {
      renderAppAt('/reset-password');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Thiếu mã xác nhận' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toBeInTheDocument();
      });
    });

    it('renders form and successfully resets password with valid token', async () => {
      const user = userEvent.setup();
      renderAppAt('/reset-password?token=valid-reset-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Mật khẩu mới'), 'BrandNewPass123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'BrandNewPass123!');
      await user.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Đặt lại mật khẩu thành công!' })
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Đăng nhập ngay' })).toBeInTheDocument();
      });
    });

    it('handles expired or invalid reset token error', async () => {
      const user = userEvent.setup();
      renderAppAt('/reset-password?token=invalid-token');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Đặt lại mật khẩu' })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Mật khẩu mới'), 'BrandNewPass123!');
      await user.type(screen.getByLabelText('Xác nhận mật khẩu mới'), 'BrandNewPass123!');
      await user.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Mã xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu quên mật khẩu.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('SCR-AUTH-05: Verify Email (/verify-email)', () => {
    it('displays missing token alert when accessed without token', async () => {
      renderAppAt('/verify-email');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Xác minh email' })).toBeInTheDocument();
        expect(
          screen.getByText(
            'Đường dẫn thiếu mã token xác minh. Vui lòng kiểm tra lại liên kết trong email.'
          )
        ).toBeInTheDocument();
      });
    });

    it('verifies valid token and displays success state', async () => {
      renderAppAt('/verify-email?token=valid-email-token');

      await waitFor(() => {
        expect(screen.getByTestId('verify-email-success')).toBeInTheDocument();
        expect(
          screen.getByRole('heading', { name: 'Xác minh email thành công!' })
        ).toBeInTheDocument();
      });
    });

    it('displays error state when token is invalid or expired', async () => {
      renderAppAt('/verify-email?token=invalid-token');

      await waitFor(() => {
        expect(screen.getByTestId('verify-email-error')).toBeInTheDocument();
        expect(
          screen.getByRole('heading', { name: 'Xác minh email thất bại' })
        ).toBeInTheDocument();
      });
    });
  });
});
