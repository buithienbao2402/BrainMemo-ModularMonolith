import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAccessToken, setAccessToken } from '@/shared/api';
import '@/shared/i18n';
import { AppProviders } from '@/app/providers';
import { createAppQueryClient } from '@/app/queryClient';
import { appRoutes } from '@/app/router';
import {
  setMockPersonaCookie,
  resetMockCourses,
  mockChapters,
  mockResources,
} from '../../../../mocks/handlers';

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
  setMockPersonaCookie('user');
  setAccessToken('mock-access-token-user');
  resetMockCourses();
});

afterEach(() => {
  clearAccessToken();
  document.cookie = 'bm_mock_persona=; max-age=0; path=/';
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Content Editor Suite (T-S3-FE-01)', () => {
  // ==========================================
  // SCR-CNT-01: Chapter List & Syllabus
  // ==========================================
  describe('SCR-CNT-01: Chapter List Page (/courses/:courseId/manage/content)', () => {
    it('renders chapter syllabus with positions, titles, badges, and action buttons', async () => {
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Mục lục chương & bài học/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByText('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText('Chương 2: Thiết kế CSDL & Domain Entity')
      ).toBeInTheDocument();

      // Check badges
      expect(screen.getByText('Đã đăng tải')).toBeInTheDocument();
      expect(screen.getByText('Bản nháp')).toBeInTheDocument();
      expect(screen.getByText('Có sửa đổi chưa đăng tải')).toBeInTheDocument();

      // Buttons
      expect(screen.getByRole('button', { name: /Thêm chương mới/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thư viện tài nguyên/i })).toBeInTheDocument();
    });

    it('creates a new chapter through modal and updates syllabus list', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Thêm chương mới/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Thêm chương mới/i }));

      // Modal appears
      await waitFor(() => {
        expect(screen.getByText('Thêm chương bài học mới')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText(/Ví dụ: Chương 1: Giới thiệu tổng quan.../i);
      await user.type(titleInput, 'Chương 3: Kiểm thử và Tích hợp hệ thống');

      const submitBtn = screen.getByRole('button', { name: 'Tạo chương' });
      await user.click(submitBtn);

      // Verifies navigation or toast
      await waitFor(() => {
        expect(screen.getByText(/Tạo chương mới thành công/i)).toBeInTheDocument();
      });
    });

    it('allows moving chapter order up and down', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByText('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const downBtn = screen.getByRole('button', {
        name: 'Di chuyển chương Chương 1: Giới thiệu kiến trúc Modular Monolith xuống',
      });
      await user.click(downBtn);

      await waitFor(() => {
        expect(screen.getByText('Đã cập nhật thứ tự chương')).toBeInTheDocument();
      });
    });

    it('opens confirmation modal and soft deletes a chapter', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByText('Chương 2: Thiết kế CSDL & Domain Entity')
        ).toBeInTheDocument();
      });

      const deleteBtn = screen.getByRole('button', {
        name: 'Xóa chương Chương 2: Thiết kế CSDL & Domain Entity',
      });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa chương?')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận xóa' });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Đã xóa chương')).toBeInTheDocument();
      });
    });

    it('renders empty state when course has no chapters', async () => {
      mockChapters['empty-course'] = [];
      renderAppAt('/courses/empty-course/manage/content');

      await waitFor(() => {
        expect(
          screen.getByText('Khóa học chưa có chương bài học nào')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole('button', { name: /Tạo chương đầu tiên/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================
  // SCR-CNT-02: Chapter Editor Suite
  // ==========================================
  describe('SCR-CNT-02: Chapter Editor Page (/courses/:courseId/manage/content/:chapterId)', () => {
    it('loads chapter draft with blocks and toolbar controls', async () => {
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('Đã xuất bản')).toBeInTheDocument();
      expect(screen.getByText('Đã lưu')).toBeInTheDocument();

      // Check blocks loaded
      expect(screen.getByText('Văn bản (Rich Text)')).toBeInTheDocument();
      expect(screen.getByText('Markdown')).toBeInTheDocument();
      expect(screen.getByText('Bộ thẻ nhớ (Flashcard)')).toBeInTheDocument();

      // Check actions
      expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đăng tải/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Xem trước như học viên' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lịch sử/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tài nguyên/i })).toBeInTheDocument();
    });

    it('marks form as dirty when editing title or blocks, and saves draft with optimistic lock', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue(
        'Chương 1: Giới thiệu kiến trúc Modular Monolith'
      );
      await user.type(titleInput, ' - Cập nhật mới');

      // Dirty indicator turns on
      expect(screen.getByText('Chưa lưu')).toBeInTheDocument();

      // Save draft
      const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Lưu bản nháp thành công')).toBeInTheDocument();
      });

      expect(screen.getByText('Đã lưu')).toBeInTheDocument();
    });

    it('adds a new block and updates block list', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByText('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const addBtn = screen.getAllByRole('button', { name: /Thêm khối nội dung mới/i })[0];
      await user.click(addBtn!);

      await waitFor(() => {
        expect(screen.getByText('Chọn loại khối nội dung cần thêm')).toBeInTheDocument();
      });

      // Select Assignment block
      const assignmentOpt = screen.getByRole('button', { name: /Bài tập nộp tệp/i });
      await user.click(assignmentOpt);

      await waitFor(() => {
        expect(
          screen.getByText('Cấu hình bài tập thực hành (Assignment)')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Chưa lưu')).toBeInTheDocument();
    });

    it('deletes a block from chapter', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByText('Bộ thẻ nhớ (Flashcard)')).toBeInTheDocument();
      });

      const deleteBtns = screen.getAllByRole('button', { name: 'Xóa khối' });
      await user.click(deleteBtns[0]!); // Delete first block

      expect(screen.getByText('Chưa lưu')).toBeInTheDocument();
    });

    it('shows unsaved changes confirmation dialog when clicking back button while dirty', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue(
        'Chương 1: Giới thiệu kiến trúc Modular Monolith'
      );
      await user.type(titleInput, ' modified');

      const backBtn = screen.getByRole('button', { name: 'Quay lại mục lục chương' });
      await user.click(backBtn);

      // Warning dialog appears
      await waitFor(() => {
        expect(screen.getByText('Có thay đổi chưa được lưu!')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Nếu rời đi bây giờ, mọi thay đổi chưa được lưu sẽ bị mất/i)
      ).toBeInTheDocument();

      // Cancel keeps user on page
      const cancelBtn = screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' });
      await user.click(cancelBtn);

      expect(screen.queryByText('Có thay đổi chưa được lưu!')).not.toBeInTheDocument();
    });

    it('publishes chapter successfully', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-2222-2222');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 2: Thiết kế CSDL & Domain Entity')
        ).toBeInTheDocument();
      });

      const publishBtn = screen.getByRole('button', { name: /Đăng tải/i });
      await user.click(publishBtn);

      await waitFor(() => {
        expect(screen.getByText('Đăng tải chương thành công')).toBeInTheDocument();
      });
    });

    it('handles 409 VERSION_CONFLICT by displaying resolution dialog', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      // Simulate conflict by bumping version on server
      const currentChapter = mockChapters['my-course-1']?.[0];
      if (currentChapter) {
        currentChapter.lastVersionNo = 99;
      }

      const titleInput = screen.getByDisplayValue(
        'Chương 1: Giới thiệu kiến trúc Modular Monolith'
      );
      await user.type(titleInput, ' test conflict');

      const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(
          screen.getByText('Phát hiện xung đột phiên bản (409)')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole('button', { name: /Tải lại bản mới nhất/i })
      ).toBeInTheDocument();
    });
  });

  // ==========================================
  // SCR-CNT-03: Version History & Restore
  // ==========================================
  describe('SCR-CNT-03: Version History Modal', () => {
    it('opens version history dialog, displays versions and restores past version', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Lịch sử/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Lịch sử/i }));

      // Modal opens
      await waitFor(() => {
        expect(
          screen.getByText('Lịch sử phiên bản chương (SCR-CNT-03)')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Phiên bản #1')).toBeInTheDocument();
      expect(screen.getByText('Phiên bản #2')).toBeInTheDocument();
      expect(screen.getByText('Bản hiện tại')).toBeInTheDocument();

      // Click restore on version 1
      const restoreBtn = screen.getByRole('button', { name: /Khôi phục/i });
      await user.click(restoreBtn);

      // Confirm restore
      await waitFor(() => {
        expect(screen.getByText(/Khôi phục về Phiên bản #1?/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận khôi phục' });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText('Khôi phục phiên bản thành công')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // SCR-CNT-07: Resource Drawer & Management
  // ==========================================
  describe('SCR-CNT-07: Resource Drawer & Management (/courses/:courseId/manage/resources)', () => {
    it('opens resource drawer from editor, lists resources and filters by kind', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Tài nguyên/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Tài nguyên/i }));

      // Drawer opens
      await waitFor(() => {
        expect(
          screen.getByText('Kho tài nguyên khóa học (SCR-CNT-07)')
        ).toBeInTheDocument();
      });

      expect(screen.getByText('architecture-diagram.png')).toBeInTheDocument();
      expect(screen.getByText('course-syllabus.pdf')).toBeInTheDocument();

      // Filter by PDF
      const pdfFilterBtn = screen.getByRole('button', { name: 'Tài liệu PDF' });
      await user.click(pdfFilterBtn);

      expect(screen.getByText('course-syllabus.pdf')).toBeInTheDocument();
      expect(screen.queryByText('architecture-diagram.png')).not.toBeInTheDocument();
    });

    it('renders dedicated ResourceManagementPage at /courses/:courseId/manage/resources', async () => {
      renderAppAt('/courses/my-course-1/manage/resources');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Quản lý tài nguyên khóa học/i })
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('architecture-diagram.png')).toBeInTheDocument();
      });
      expect(screen.getByText('course-syllabus.pdf')).toBeInTheDocument();
    });

    it('handles 409 RESOURCE_IN_USE when deleting a resource referenced by a block', async () => {
      const user = userEvent.setup();
      // Add in-use resource to mock
      (mockResources['my-course-1'] ??= []).push({
        id: 'res-in-use',
        kind: 'IMAGE',
        originalFilename: 'in-use-banner.png',
        contentType: 'image/png',
        sizeBytes: 1048576,
        createdAt: '2026-11-12T00:00:00Z',
      });

      renderAppAt('/courses/my-course-1/manage/resources');

      await waitFor(() => {
        expect(screen.getByText('in-use-banner.png')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByRole('button', {
        name: 'Xóa tài nguyên in-use-banner.png',
      });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận xóa tài nguyên?')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: 'Xác nhận xóa' });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(
          screen.getByText(
            /Tài nguyên này hiện đang được sử dụng trong bài học của khóa học/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // FR-CNT-03: Student View Draft Preview
  // ==========================================
  describe('FR-CNT-03: Chapter Preview Modal', () => {
    it('opens reading preview mode and allows interactive flashcard flipping', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Xem trước như học viên' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Xem trước như học viên' }));

      // Preview opens
      await waitFor(() => {
        expect(
          screen.getByRole('dialog', { name: 'Xem trước bài học ở chế độ học viên' })
        ).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog', { name: 'Xem trước bài học ở chế độ học viên' });
      const modalQueries = within(modal);

      // Front side of card is shown
      expect(modalQueries.getByText('Modular Monolith là gì?')).toBeInTheDocument();

      // Click card to flip
      const flashcardEl = modalQueries.getByText('Modular Monolith là gì?');
      await user.click(flashcardEl);

      // Back side is shown
      await waitFor(() => {
        expect(
          modalQueries.getByText('Hệ thống đơn khối chia ranh giới module rõ ràng qua contracts.')
        ).toBeInTheDocument();
      });

      // Close preview
      const closeBtn = modalQueries.getByRole('button', { name: 'Đóng xem trước' });
      await user.click(closeBtn);

      expect(
        screen.queryByRole('dialog', { name: 'Xem trước bài học ở chế độ học viên' })
      ).not.toBeInTheDocument();
    });
  });
});
