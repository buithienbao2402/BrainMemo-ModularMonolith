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

describe('S4 Enrollment & Learning Suite (SCR-CRS-05, SCR-CRS-06, SCR-LRN-01, SCR-LRN-07)', () => {
  describe('SCR-CRS-05: Quản lý học viên (/courses/:courseId/manage/students)', () => {
    it('renders 4 tabs, search input and invite button', async () => {
      renderAppAt('/courses/my-course-1/manage/students');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /Quản lý học viên/i })
        ).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Đang học' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đã hoàn thành' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Chờ duyệt' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đã mời' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mời học viên/i })).toBeInTheDocument();
    });

    it('allows opening invite modal and inviting a student', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/students');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Mời học viên/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Mời học viên/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email người học/i)).toBeInTheDocument();

      await user.type(screen.getByLabelText(/Email người học/i), 'newstudent@example.com');
      await user.click(screen.getByRole('button', { name: /Gửi lời mời/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('switches to "Chờ duyệt" tab and displays pending approval actions', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/students');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Chờ duyệt' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Chờ duyệt' }));

      await waitFor(() => {
        expect(screen.getAllByText('Chờ duyệt').length).toBeGreaterThan(1);
      });

      expect(screen.getByRole('button', { name: /^Duyệt$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Từ chối$/ })).toBeInTheDocument();
    });
  });

  describe('SCR-CRS-06: Cấu hình chế độ truy cập (/courses/:courseId/manage/access)', () => {
    it('renders course access mode options and chapter access table', async () => {
      renderAppAt('/courses/my-course-1/manage/access');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /Cấu hình chế độ truy cập/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText(/Công khai \(PUBLIC\)/i).length).toBeGreaterThan(0);
      });

      expect(screen.getAllByText(/Riêng tư \(PRIVATE\)/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Chỉ mình tôi \(ONLY_ME\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/2. Bảo vệ Passcode từng Chương/i)).toBeInTheDocument();
    });

    it('allows opening chapter passcode configuration modal', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/access');

      await waitFor(() => {
        const configButtons = screen.getAllByRole('button', { name: /Cấu hình/i });
        expect(configButtons.length).toBeGreaterThan(0);
      });

      const configButtons = screen.getAllByRole('button', { name: /Cấu hình/i });
      await user.click(configButtons[0]!);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Cấu hình truy cập chương/i)).toBeInTheDocument();
    });
  });

  describe('SCR-LRN-01: Trình học tập Learning Player (/courses/:courseId/learn)', () => {
    it('renders player workspace, syllabus sidebar and active chapter content', async () => {
      renderAppAt('/courses/my-course-1/learn/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getAllByText(/Chương 1: Giới thiệu kiến trúc Modular Monolith/i).length
        ).toBeGreaterThan(0);
      });

      // Syllabus sidebar
      expect(screen.getByText(/Mục lục bài học/i)).toBeInTheDocument();
      expect(screen.getByText(/Tiến độ hoàn thành/i)).toBeInTheDocument();

      // Content blocks
      expect(screen.getByText(/Tổng quan bài học/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Nguyên lý thiết kế/i).length).toBeGreaterThan(0);
    });

    it('renders 3D flashcard with flip interaction', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/learn/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByText(/Thẻ ghi nhớ/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Mặt trước \(Câu hỏi \/ Khái niệm\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Modular Monolith là gì\?/i)).toBeInTheDocument();

      // Click flip card
      await user.click(screen.getByRole('button', { name: /Lật thẻ/i }));

      expect(screen.getByText(/Mặt sau \(Giải thích \/ Ý nghĩa\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Hệ thống đơn khối chia ranh giới module rõ ràng qua contracts\./i)
      ).toBeInTheDocument();
    });

    it('renders interactive practice question and checks answer', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/learn/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByText(/Câu hỏi thực hành/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /Trong kiến trúc Modular Monolith, các module giao tiếp với nhau bằng cách nào\?/i
        )
      ).toBeInTheDocument();

      const option = screen.getByText(/Thông qua IModuleContract và Contracts project in-process/i);
      await user.click(option);

      const checkButton = screen.getByRole('button', { name: /Kiểm tra đáp án/i });
      await user.click(checkButton);

      await waitFor(() => {
        expect(screen.getAllByText(/Chính xác!/i).length).toBeGreaterThan(0);
      });
    });

    it('prompts passcode modal when accessing protected chapter', async () => {
      renderAppAt('/courses/my-course-1/learn/chapter-3333-protected');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText(/Chương học có bảo vệ Passcode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mở khóa chương/i })).toBeInTheDocument();
    });
  });

  describe('SCR-LRN-07: Bookmark cá nhân (/me/bookmarks)', () => {
    it('renders saved bookmarks and continue learning link', async () => {
      renderAppAt('/me/bookmarks');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /Khóa học & Bài học đã lưu/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Khóa học Thiết kế hệ thống/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Chương 1: Giới thiệu kiến trúc Modular Monolith/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Tiếp tục học/i })).toBeInTheDocument();
    });
  });
});
