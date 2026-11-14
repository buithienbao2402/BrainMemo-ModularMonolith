import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import { mockUsers, setMockPersonaCookie } from '../../../../mocks/handlers';

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

describe('Profile Pages (SCR-PRF-01 & SCR-PRF-02)', () => {
  describe('SCR-PRF-01: Public Profile (/users/:userId)', () => {
    it('renders user public profile header with name, bio and joined date', async () => {
      renderAppAt(`/users/${mockUsers.user.id}`);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quang Trần');
      });

      expect(screen.getByText(/Học viên & tác giả khóa học BrainMemo/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đang học/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đã hoàn thành/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đã tạo/i })).toBeInTheDocument();
    });

    it('shows error state when profile is not found (404)', async () => {
      renderAppAt('/users/not-found');

      await waitFor(() => {
        expect(screen.getByText('Không tìm thấy người dùng')).toBeInTheDocument();
      });
      expect(screen.getByText(/Không tìm thấy hồ sơ/i)).toBeInTheDocument();
    });

    it('allows switching relation tabs to view enrolled courses', async () => {
      const user = userEvent.setup();
      renderAppAt(`/users/${mockUsers.user.id}`);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Đang học/i })).toBeInTheDocument();
      });

      const ownedTab = screen.getByRole('button', { name: /Đã tạo/i });
      await user.click(ownedTab);

      await waitFor(() => {
        expect(ownedTab).toHaveClass('bg-primary');
      });
    });
  });

  describe('SCR-PRF-02: Edit Profile (/settings/profile)', () => {
    it('loads current profile into form and allows saving updates', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/settings/profile');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Họ và tên hiển thị/i);
      expect(nameInput).toHaveValue('Quang Trần');

      const bioInput = screen.getByLabelText(/Giới thiệu bản thân/i);
      expect(bioInput).toHaveValue('Học viên & tác giả khóa học BrainMemo');

      // Update name
      await user.clear(nameInput);
      await user.type(nameInput, 'Quang Trần (Senior Engineer)');

      const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Cập nhật thành công')).toBeInTheDocument();
      });
    });

    it('validates required display name field', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/settings/profile');

      await waitFor(() => {
        expect(screen.getByLabelText(/Họ và tên hiển thị/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Họ và tên hiển thị/i);
      await user.clear(nameInput);

      const submitBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Họ và tên hiển thị không được để trống')).toBeInTheDocument();
      });
    });
  });
});
