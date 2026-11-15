import { render, screen, waitFor } from '@testing-library/react';
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
    it('renders chapter syllabus with published tab and allows switching to draft tab', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Mục lục chương & bài học/i })
        ).toBeInTheDocument();
      });

      // Default tab: Chương đã đăng tải
      await waitFor(() => {
        expect(
          screen.getByText('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      // Action buttons
      expect(screen.getByRole('button', { name: /Thêm chương mới/i })).toBeInTheDocument();
      // "Thư viện tài nguyên" was removed as requested
      expect(screen.queryByRole('button', { name: /Thư viện tài nguyên/i })).not.toBeInTheDocument();

      // Switch to "Chương nháp" tab to see draft chapter
      await user.click(screen.getByRole('button', { name: /Chương nháp/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Chương 2: Thiết kế CSDL & Domain Entity')
        ).toBeInTheDocument();
      });
    });

    it('navigates to unified editor on "Thêm chương mới" and saves chapter draft', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Thêm chương mới/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Thêm chương mới/i }));

      // Editor canvas appears with placeholder for title
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Chương: Tiêu đề chương bài học.../i)
        ).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText(/Chương: Tiêu đề chương bài học.../i);
      await user.type(titleInput, 'Chương 3: Kiểm thử và Tích hợp hệ thống');

      const saveBtn = screen.getByRole('button', { name: /Lưu nháp/i });
      await user.click(saveBtn);

      // Verifies save toast
      await waitFor(() => {
        expect(screen.getByText(/Lưu bản nháp thành công/i)).toBeInTheDocument();
      });
    });

    it('supports inserting a chapter after an existing chapter from actions menu', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      await waitFor(() => {
        expect(
          screen.getByText('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const moreBtn = screen.getByRole('button', {
        name: 'Thao tác khác cho Chương 1: Giới thiệu kiến trúc Modular Monolith',
      });
      await user.click(moreBtn);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Chèn chương sau/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /Chèn chương sau/i }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Chương: Tiêu đề chương bài học.../i)
        ).toBeInTheDocument();
      });
    });

    it('opens confirmation modal and soft deletes a chapter', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content');

      // Click to draft tab where chapter 2 is located
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Chương nháp/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /Chương nháp/i }));

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
          screen.getByText('Chưa có chương nào được đăng tải')
        ).toBeInTheDocument();
      });

      expect(
        screen.getAllByRole('button', { name: /Thêm chương mới/i }).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // SCR-CNT-02: Chapter Editor Suite
  // ==========================================
  describe('SCR-CNT-02: Chapter Editor Page (/courses/:courseId/manage/content/:chapterId)', () => {
    it('loads chapter draft with blocks and toolbar controls', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      // Status pill
      expect(screen.getByText('Đã xuất bản')).toBeInTheDocument();
      expect(screen.getByText('Đã lưu')).toBeInTheDocument();

      // Top bar has removed v1/v2, Eye, History and Resource icons as requested
      expect(screen.queryByText('v2')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Xem trước như học viên' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tài nguyên/i })).not.toBeInTheDocument();

      // Check blocks loaded
      expect(screen.getByText('Markdown')).toBeInTheDocument();
      expect(screen.getByText('Bộ thẻ nhớ (Flashcard)')).toBeInTheDocument();

      // Check actions: Lưu nháp, Đăng tải, MoreVertical
      expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đăng tải/i })).toBeInTheDocument();

      // 3-dots menu contains ONLY: Chế độ truy cập, Lịch sử phiên bản, Xóa chương
      const moreBtn = screen.getByRole('button', { name: 'Tùy chọn khác cho chương' });
      await user.click(moreBtn);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Chế độ truy cập/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Lịch sử phiên bản/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Xóa chương/i })).toBeInTheDocument();
      });
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
      expect(screen.getByText(/Chưa lưu/i)).toBeInTheDocument();

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
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      const addBtn = screen.getAllByRole('button', { name: /Thêm khối nội dung mới/i })[0];
      await user.click(addBtn!);

      await waitFor(() => {
        expect(screen.getByText('Chọn loại block chèn vào')).toBeInTheDocument();
      });

      // Select Assignment block
      const assignmentOpt = screen.getByRole('button', { name: /Bài tập nộp tệp/i });
      await user.click(assignmentOpt);

      await waitFor(() => {
        expect(
          screen.getByText('Cấu hình bài tập thực hành (Assignment)')
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Chưa lưu/i)).toBeInTheDocument();
    });

    it('deletes a block from chapter', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByText('Bộ thẻ nhớ (Flashcard)')).toBeInTheDocument();
      });

      const deleteBtns = screen.getAllByRole('button', { name: 'Xóa khối' });
      await user.click(deleteBtns[0]!); // Delete first block

      expect(screen.getByText(/Chưa lưu/i)).toBeInTheDocument();
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
        expect(screen.getByText('Rời khỏi trang?')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Mọi nội dung vừa biên tập sẽ bị mất nếu bạn rời đi mà không nhấn lưu/i)
      ).toBeInTheDocument();

      // Cancel keeps user on page
      const stayBtn = screen.getByRole('button', { name: 'Ở lại tiếp tục sửa' });
      await user.click(stayBtn);

      expect(screen.queryByText('Rời khỏi trang?')).not.toBeInTheDocument();
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
    it('opens version history dialog from 3-dots menu, displays versions and restores past version', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Tùy chọn khác cho chương' })
        ).toBeInTheDocument();
      });

      // Click 3-dots menu
      await user.click(screen.getByRole('button', { name: 'Tùy chọn khác cho chương' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Lịch sử phiên bản/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('menuitem', { name: /Lịch sử phiên bản/i }));

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
  // SCR-CNT-04: Chapter Access Mode & Passcode Panel
  // ==========================================
  describe('SCR-CNT-04: Chapter Access Mode Panel', () => {
    it('opens chapter access panel from 3-dots menu, switches to protected mode with passcode, and applies', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Tùy chọn khác cho chương' })
        ).toBeInTheDocument();
      });

      // 1. Open 3-dots menu
      await user.click(screen.getByRole('button', { name: 'Tùy chọn khác cho chương' }));

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /Chế độ truy cập/i })).toBeInTheDocument();
      });

      // 2. Click Chế độ truy cập
      await user.click(screen.getByRole('menuitem', { name: /Chế độ truy cập/i }));

      // 3. Panel opens on right
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Panel Chế độ truy cập' })).toBeInTheDocument();
      });

      expect(screen.getByText('Public (Công khai)')).toBeInTheDocument();
      expect(screen.getByText('Protected (Có mật khẩu)')).toBeInTheDocument();

      // 4. Click Protected card -> input passcode appears
      await user.click(screen.getByText('Protected (Có mật khẩu)'));

      await waitFor(() => {
        expect(screen.getByLabelText('Mật khẩu chương')).toBeInTheDocument();
      });

      const passInput = screen.getByLabelText('Mật khẩu chương');
      await user.clear(passInput);
      await user.type(passInput, 'PyMaster2025#');

      // 5. Click Áp dụng
      const applyBtn = screen.getByRole('button', { name: 'Áp dụng' });
      await user.click(applyBtn);

      // Verify success toast & drawer closes
      await waitFor(() => {
        expect(screen.getByText('Cập nhật chế độ truy cập thành công')).toBeInTheDocument();
      });

      expect(screen.queryByRole('dialog', { name: 'Panel Chế độ truy cập' })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // SCR-CNT-05: Block Actions & Trailing Text Block
  // ==========================================
  describe('SCR-CNT-05: Block Actions & Notion Editing Experience', () => {
    it('renders 6-dots block options menu with reorder, convert type, and delete without duplicate option', async () => {
      const user = userEvent.setup();
      renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(screen.getByText('Bộ thẻ nhớ (Flashcard)')).toBeInTheDocument();
      });

      const gripBtns = screen.getAllByRole('button', {
        name: /Tùy chọn khối/i,
      });
      expect(gripBtns.length).toBeGreaterThan(0);

      // Click 6-dots button on first block
      await user.click(gripBtns[0]!);

      await waitFor(() => {
        expect(screen.getByText('Đổi thứ tự')).toBeInTheDocument();
        expect(screen.getByText('Chuyển thành')).toBeInTheDocument();
        expect(screen.getByText('Xóa block')).toBeInTheDocument();
      });

      // Verify NO duplicate option as requested
      expect(screen.queryByText('Nhân bản khối')).not.toBeInTheDocument();
    });

    it('always maintains a trailing empty rich text block at the bottom of the editor', async () => {
      const { container } = renderAppAt('/courses/my-course-1/manage/content/chapter-1111-1111');

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Chương 1: Giới thiệu kiến trúc Modular Monolith')
        ).toBeInTheDocument();
      });

      // The chapter loaded has 2 specialized blocks, so the editor must have automatically appended
      // an empty text block with data-placeholder at the bottom
      await waitFor(() => {
        const emptyPlaceholders = container.querySelectorAll(
          '[data-placeholder="Nhập nội dung văn bản..."]'
        );
        expect(emptyPlaceholders.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ==========================================
  // SCR-CNT-07: Resource Management
  // ==========================================
  describe('SCR-CNT-07: Resource Management (/courses/:courseId/manage/resources)', () => {
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
});
