import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import {
  resetMockCourses,
  setMockPersonaCookie,
  mockUsers,
  mockProfiles,
} from '../../../../mocks/handlers';
import { server } from '../../../../mocks/server';

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
  resetMockCourses();
  setMockPersonaCookie('user');
  setAccessToken('mock-access-token-user');

  server.use(
    http.post('*/api/v1/auth/refresh', () =>
      HttpResponse.json({
        accessToken: 'mock-access-token-user',
        expiresIn: 1800,
        user: mockUsers.user,
      })
    ),
    http.get('*/api/v1/profiles/me', () => HttpResponse.json(mockProfiles.user)),
    http.get('*/api/v1/notifications/unread-count', () => HttpResponse.json({ count: 0 }))
  );
});

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('S5 Discovery Suite (SCR-DSC-01, SCR-DSC-02)', () => {
  describe('SCR-DSC-01: Trang chủ khám phá (/)', () => {
    it('renders hero banner, CTA buttons, and main sections', async () => {
      renderAppAt('/');

      // Hero banner
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /Khám phá khóa học/i })).toBeInTheDocument();

      // Main sections
      expect(screen.getByRole('heading', { name: /Đề xuất cho bạn/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Mới cập nhật/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Bảng xếp hạng Top 10/i })).toBeInTheDocument();
    });

    it('renders in-progress section for authenticated users', async () => {
      renderAppAt('/');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Đang học dở/i })).toBeInTheDocument();
      });
    });

    it('switches Top 10 leaderboard tabs between metrics and windows', async () => {
      const user = userEvent.setup();
      renderAppAt('/');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Bảng xếp hạng Top 10/i })).toBeInTheDocument();
      });

      // Switch metric to "Đề cử"
      const nominationTab = screen.getByRole('button', { name: 'Đề cử' });
      await user.click(nominationTab);

      // Switch window to "Tháng"
      const monthTab = screen.getByRole('button', { name: 'Tháng' });
      await user.click(monthTab);

      expect(nominationTab).toBeInTheDocument();
      expect(monthTab).toBeInTheDocument();
    });
  });

  describe('SCR-DSC-02: Khám phá khóa học (/courses)', () => {
    it('renders search input, filter sidebar, sort selector, and course list', async () => {
      renderAppAt('/courses');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Khám phá Khóa học/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('textbox', { name: /Tìm kiếm khóa học/i })).toBeInTheDocument();
      expect(screen.getByText(/Bộ lọc tìm kiếm/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Chọn tiêu chí sắp xếp/i)).toBeInTheDocument();
    });

    it('allows searching with keyword and filters courses', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses');

      const searchInput = await screen.findByRole('textbox', { name: /Tìm kiếm khóa học/i });
      await user.clear(searchInput);
      await user.type(searchInput, 'Toán');
      await user.click(screen.getByRole('button', { name: 'Tìm' }));

      await waitFor(() => {
        expect(screen.getByText(/cho từ khóa/i)).toBeInTheDocument();
      });
    });

    it('filters courses by access mode and status', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses');

      await screen.findByRole('heading', { level: 1, name: /Khám phá Khóa học/i });

      // Click "Riêng tư (Private)"
      const privateRadio = screen.getByRole('radio', { name: /Riêng tư \(Private\)/i });
      await user.click(privateRadio);

      // Click "Đã hoàn thành"
      const completedRadio = screen.getByRole('radio', { name: /Đã hoàn thành/i });
      await user.click(completedRadio);

      expect(privateRadio).toBeChecked();
      expect(completedRadio).toBeChecked();
    });

    it('allows resetting all filters with button', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses?q=Test&accessMode=PRIVATE');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Đặt lại/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Đặt lại/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Đặt lại/i })).not.toBeInTheDocument();
      });
    });
  });
});
