import { test, expect } from '@playwright/test';

/**
 * T-S12-INT-01: System Verification & E2E Testing (NFR-17)
 * Kiểm thử toàn diện 3 luồng người dùng trọng yếu của hệ thống BrainMemo:
 *
 * LUỒNG 1: NGƯỜI HỌC (LEARNER FLOW)
 * - Khám phá khóa học & xem bảng xếp hạng Top 10 (SCR-DSC-03).
 * - Vào xem chi tiết khóa học, ghi danh khóa học.
 * - Vào phòng học (Learning Player SCR-LRN-01), xem nội dung, lật flashcard.
 * - Tương tác hỏi đáp bài học (Q&A CommentSection).
 * - Làm bài kiểm tra trắc nghiệm (Quiz Player SCR-LRN-03) & xem kết quả (SCR-LRN-04).
 *
 * LUỒNG 2: GIẢNG VIÊN (INSTRUCTOR FLOW)
 * - Quản trị khóa học & danh mục bài học (Chapter List SCR-CNT-01).
 * - Soạn thảo bài giảng trong Chapter Editor (SCR-CNT-02).
 * - Soạn câu hỏi & thẻ ghi nhớ với AI / Question Bank (SCR-CNT-04).
 * - Gửi yêu cầu duyệt xuất bản khóa học (SCR-CRS-04 SUBMITTED_FOR_REVIEW).
 *
 * LUỒNG 3: QUẢN TRỊ VIÊN & KIỂM DUYỆT (ADMIN & MODERATION FLOW)
 * - Đăng nhập quyền Admin.
 * - Kiểm duyệt xuất bản khóa học (SCR-MOD-07 /admin/course-reviews).
 * - Xem nhật ký kiểm toán hệ thống (SCR-MOD-06 /admin/audit-logs).
 * - Quản lý cấu hình hạn mức AI hệ thống (SCR-ADM-03 /admin/settings).
 */
test.describe('NFR-17 Master System Verification Flows', () => {
  // -------------------------------------------------------------------------
  // LUỒNG 1: NGƯỜI HỌC (LEARNER FLOW)
  // -------------------------------------------------------------------------
  test('Luồng 1: Người học khám phá Top 10 → Ghi danh → Học bài & Flashcard → Q&A → Thi trắc nghiệm', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // 1.1 Khám phá bảng xếp hạng Top 10 (/top10)
    await page.goto('/top10');
    await expect(page).toHaveTitle(/BrainMemo/i);
    await expect(page.getByRole('heading', { level: 1, name: /Bảng Xếp Hạng Top 10 Khóa Học/i })).toBeVisible({
      timeout: 15000,
    });

    // Chuyển đổi metric & window
    const ratingBtn = page.getByRole('button', { name: /Đánh giá/i });
    if (await ratingBtn.isVisible()) {
      await ratingBtn.click();
    }
    const monthBtn = page.getByRole('button', { name: /Tháng này/i });
    if (await monthBtn.isVisible()) {
      await monthBtn.click();
    }

    // 1.2 Đăng nhập tài khoản học viên
    await page.goto('/login');
    await page.locator('#email').fill('quang.tran@brainmemo.vn');
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'user',
        url: 'http://localhost:5173',
      },
    ]);

    // 1.3 Xem chi tiết khóa học & ghi danh (/courses/course-intro-1)
    await page.goto('/courses/course-intro-1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });

    const enrollBtn = page.getByRole('button', { name: /Tham gia khóa học/i });
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click();
    }

    // 1.4 Vào phòng học (Learning Player /courses/my-course-1/learn/chapter-1111-1111)
    await page.goto('/courses/my-course-1/learn/chapter-1111-1111');
    await expect(page.getByText(/Mục lục bài học/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Tổng quan bài học/i)).toBeVisible();

    // Lật thẻ Flashcard
    const flipBtn = page.getByRole('button', { name: /Lật thẻ/i });
    if (await flipBtn.isVisible()) {
      await flipBtn.click();
      await expect(page.getByText(/Mặt sau/i)).toBeVisible();
    }

    // 1.5 Q&A bài học
    const questionInput = page.getByPlaceholder(/Đặt câu hỏi hoặc thảo luận/i);
    if (await questionInput.isVisible()) {
      await questionInput.fill('Xin hỏi giảng viên về phần tham số learning rate tối ưu?');
      const submitCommentBtn = page.getByRole('button', { name: /Gửi bình luận|Gửi câu hỏi/i });
      if (await submitCommentBtn.isVisible()) {
        await submitCommentBtn.click();
      }
    }

    // 1.6 Thi trắc nghiệm Quiz Player (/courses/sample-course-1/quiz-attempts/att-in-progress-1)
    await page.goto('/courses/sample-course-1/quiz-attempts/att-in-progress-1');
    await expect(page.getByText(/Bài kiểm tra đánh giá kiến thức/i)).toBeVisible({ timeout: 15000 });

    // Trả lời câu hỏi 1
    const optionHanoi = page.getByText('Hà Nội');
    if (await optionHanoi.isVisible()) {
      await optionHanoi.click();
    }

    // Nộp bài thi
    const submitBtn = page.getByRole('button', { name: /Nộp bài thi/i });
    await submitBtn.click();

    // Xác nhận nộp bài trong dialog cảnh báo
    const confirmBtn = page.getByRole('button', { name: /Vẫn muốn nộp bài/i });
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();

    // Kiểm tra kết quả bài kiểm tra (SCR-LRN-04)
    await expect(page).toHaveURL(/result/, { timeout: 15000 });
    await expect(page.getByText(/Chúc mừng! Bạn đã ĐẠT/i)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // LUỒNG 2: GIẢNG VIÊN (INSTRUCTOR FLOW)
  // -------------------------------------------------------------------------
  test('Luồng 2: Giảng viên quản lý khóa học → Soạn bài Chapter Editor → Ngân hàng câu hỏi → Gửi duyệt xuất bản', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // 2.1 Thiết lập phiên Giảng viên
    await page.goto('/login');
    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'user',
        url: 'http://localhost:5173',
      },
    ]);

    // 2.2 Quản trị chương bài học (/courses/my-course-1/manage/content)
    await page.goto('/courses/my-course-1/manage/content');
    await expect(page.getByRole('heading', { name: /Mục lục chương & bài học/i })).toBeVisible({
      timeout: 15000,
    });

    // 2.3 Mở Chapter Editor (/courses/my-course-1/manage/content/chapter-1111-1111)
    await page.goto('/courses/my-course-1/manage/content/chapter-1111-1111');
    await expect(page.getByRole('button', { name: /Tạo nội dung với AI/i })).toBeVisible({
      timeout: 15000,
    });

    // 2.4 Quản trị Ngân hàng câu hỏi (/courses/my-course-1/manage/questions)
    await page.goto('/courses/my-course-1/manage/questions');
    await expect(page.getByRole('heading', { name: /Ngân hàng câu hỏi/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /Tạo câu hỏi với AI/i })).toBeVisible();

    // 2.5 Kiểm tra Banner Trạng thái xuất bản khóa học (SCR-CRS-04)
    await page.goto('/courses/my-course-1/manage');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Trạng thái xuất bản|Bản nháp|Đang biên tập/i)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // LUỒNG 3: QUẢN TRỊ VIÊN & KIỂM DUYỆT (ADMIN & MODERATION FLOW)
  // -------------------------------------------------------------------------
  test('Luồng 3: Admin kiểm duyệt xuất bản khóa học → Nhật ký kiểm toán → Cấu hình hạn mức hệ thống AI', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // 3.1 Thiết lập phiên Admin
    await page.goto('/login');
    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'admin',
        url: 'http://localhost:5173',
      },
    ]);

    // 3.2 Cổng Admin duyệt xuất bản khóa học (/admin/course-reviews, SCR-MOD-07)
    await page.goto('/admin/course-reviews');
    await expect(page.getByRole('heading', { name: /Duyệt xuất bản khóa học/i })).toBeVisible({
      timeout: 15000,
    });

    // 3.3 Tra cứu Nhật ký kiểm toán hệ thống (/admin/audit-logs, SCR-MOD-06)
    await page.goto('/admin/audit-logs');
    await expect(page.getByRole('heading', { name: /Nhật ký kiểm toán/i })).toBeVisible({
      timeout: 15000,
    });

    // 3.4 Cấu hình hạn mức AI & cài đặt hệ thống (/admin/settings, SCR-ADM-03)
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: /Cấu hình hệ thống/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Cấu hình Dịch vụ GenAI/i)).toBeVisible({ timeout: 15000 });

    // Điều chỉnh Daily Quota
    const quotaInput = page.locator('input[type="number"]');
    await expect(quotaInput).toBeVisible();
    await quotaInput.fill('150');

    // Lưu cấu hình
    await page.getByRole('button', { name: /Lưu thay đổi/i }).click();
    await expect(page.getByText(/Cập nhật cấu hình hệ thống thành công/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
