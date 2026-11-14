import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import { setMockPersonaCookie } from '../../../../mocks/handlers';

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

describe('Course Pages (SCR-CRS-01..03)', () => {
  describe('SCR-CRS-01: Course Details (/courses/:courseId)', () => {
    it('renders course details, badges, tags and tabs', async () => {
      renderAppAt('/courses/course-intro-1');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(screen.getByText(/Lập trình Fullstack Modular Monolith/i)).toBeInTheDocument();
      expect(screen.getByText('Công khai')).toBeInTheDocument();
      expect(screen.getByText(/Tổng quan khóa học/i)).toBeInTheDocument();
      expect(screen.getByText(/Mục lục chương bài học/i)).toBeInTheDocument();
    });

    it('displays enroll CTA button for guest/un-enrolled visitor', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      renderAppAt('/courses/course-intro-1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Tham gia khóa học/i })).toBeInTheDocument();
      });
    });

    it('displays owner action buttons when viewer is course creator', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      renderAppAt('/courses/my-course-1');

      await waitFor(() => {
        expect(screen.getByText(/Bạn là chủ biên soạn khóa học này/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /Chỉnh sửa khóa học/i })).toHaveAttribute(
        'href',
        '/courses/my-course-1/edit'
      );
      expect(screen.getByRole('link', { name: /Bảng quản lý khóa học/i })).toHaveAttribute(
        'href',
        '/courses/my-course-1/manage'
      );
    });

    it('shows error state when course does not exist (404)', async () => {
      renderAppAt('/courses/not-found');

      await waitFor(() => {
        expect(screen.getByText('Không tìm thấy khóa học')).toBeInTheDocument();
      });
      expect(screen.getByText('Khóa học không tồn tại hoặc đã bị xóa.')).toBeInTheDocument();
    });

    it('allows toggling nominate button', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/courses/course-intro-1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Đề cử/i })).toBeInTheDocument();
      });

      const nominateBtn = screen.getByRole('button', { name: /Đề cử/i });
      await user.click(nominateBtn);

      await waitFor(() => {
        expect(screen.getByText('Đã đề cử khóa học!')).toBeInTheDocument();
      });
    });
  });

  describe('SCR-CRS-02: Course Create & Edit Form (/courses/new, /courses/:courseId/edit)', () => {
    it('renders create course form and validates required name', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/courses/new');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Tạo khóa học mới' })).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /Tạo khóa học/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Tên khóa học không được để trống')).toBeInTheDocument();
      });
    });

    it('successfully creates course with valid title and access mode', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/courses/new');

      await waitFor(() => {
        expect(screen.getByLabelText(/Tên khóa học/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Tên khóa học/i);
      await user.type(nameInput, 'Khóa học TypeScript Chuyên Sâu 2026');

      const descInput = screen.getByLabelText(/Mô tả chi tiết khóa học/i);
      await user.type(descInput, 'Nội dung thực hành nâng cao với TypeScript và Generic programming.');

      const submitBtn = screen.getByRole('button', { name: /Tạo khóa học/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Tạo khóa học thành công!')).toBeInTheDocument();
      });
    });

    it('renders edit mode with existing course data and delete modal', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/edit');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Chỉnh sửa khóa học' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Tên khóa học/i)).toHaveValue('Khóa học do tôi biên soạn');
      });

      const deleteBtn = screen.getByRole('button', { name: /Xóa khóa học/i });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Xóa khóa học?' })).toBeInTheDocument();
      });

      const confirmDeleteBtn = screen.getByRole('button', { name: 'Xác nhận xóa' });
      await user.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(screen.getByText('Đã xóa khóa học')).toBeInTheDocument();
      });
    });
  });

  describe('Course Management: Trang chủ Quản lý khóa học (/manage/courses)', () => {
    it('renders course management dashboard with stats, filter chips, and sidebar action', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      renderAppAt('/manage/courses');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Trang chủ Quản lý khóa học' })).toBeInTheDocument();
      });

      expect(screen.getByText('TỔNG KHÓA HỌC')).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đang cập nhật' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đã hoàn thành' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tạm ẩn' })).toBeInTheDocument();

      // Sidebar has primary "Tạo khóa học" CTA
      expect(screen.getAllByRole('link', { name: /Tạo khóa học/i }).length).toBeGreaterThan(0);
    });

    it('allows filtering by status in course management', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      const user = userEvent.setup();
      renderAppAt('/manage/courses');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Trang chủ Quản lý khóa học' })).toBeInTheDocument();
      });

      const updatingChip = screen.getByRole('button', { name: 'Đang cập nhật' });
      await user.click(updatingChip);

      await waitFor(() => {
        expect(updatingChip).toHaveClass('bg-brand-orange');
      });
    });

    it('redirects legacy /me/courses to /manage/courses', async () => {
      setMockPersonaCookie('user');
      setAccessToken('mock-access-token-user');

      renderAppAt('/me/courses');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Trang chủ Quản lý khóa học' })).toBeInTheDocument();
      });
    });
  });
});
