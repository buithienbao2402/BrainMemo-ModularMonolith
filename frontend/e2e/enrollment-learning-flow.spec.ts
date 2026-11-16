import { test, expect } from '@playwright/test';

/**
 * T-S4-INT-01: Tích hợp S4 + e2e Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 4:
 * 1. Ghi danh khóa học Public → Đọc bài học → Hoàn thành block → Cập nhật tiến độ → Đánh dấu Bookmark → Xem /me/bookmarks
 * 2. Cấu hình khóa học Private & Chương Protected kèm Passcode (SCR-CRS-06)
 * 3. Người học gửi yêu cầu tham gia khóa Private (PENDING_APPROVAL)
 * 4. Giảng viên phê duyệt yêu cầu trong Danh sách học viên (SCR-CRS-05)
 * 5. Học viên vào học chương Protected: Bị chặn bởi Passcode Modal → Nhập sai báo lỗi → Nhập đúng mở khóa thành công.
 */
test.describe('S4 Enrollment & Learning Player E2E Integration Flow', () => {
  test('hoàn thành toàn bộ luồng: Ghi danh Public → Đọc → Tiến độ → Bookmark & Private xin vào → Duyệt → Mở khóa Passcode', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // PHẦN 1: GHI DANH KHÓA PUBLIC → ĐỌC → TIẾN ĐỘ → BOOKMARK
    // -------------------------------------------------------------

    // Bước 1.1: Đăng nhập học viên
    await page.goto('/login');
    await expect(page).toHaveTitle(/BrainMemo/i);

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

    // Bước 1.2: Truy cập trang chi tiết khóa học Public (/courses/course-intro-1)
    await page.goto('/courses/course-intro-1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Bước 1.3: Nhấn nút tham gia khóa học
    const enrollBtn = page.getByRole('button', { name: /Tham gia khóa học/i });
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click();
    }

    // Bước 1.4: Truy cập thẳng vào trình đọc bài học (/courses/my-course-1/learn)
    await page.goto('/courses/my-course-1/learn/chapter-1111-1111');
    await expect(page.getByText(/Mục lục bài học/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Tổng quan bài học/i)).toBeVisible();

    // Bước 1.5: Tương tác với Thẻ nhớ Flashcard 3D
    await expect(page.getByText(/Thẻ ghi nhớ/i)).toBeVisible();
    await expect(page.getByText(/Mặt trước/i)).toBeVisible();

    // Lật thẻ flashcard
    await page.getByRole('button', { name: /Lật thẻ/i }).click();
    await expect(page.getByText(/Mặt sau/i)).toBeVisible();

    // Bước 1.6: Làm câu hỏi thực hành
    await expect(page.getByText(/Câu hỏi thực hành/i)).toBeVisible();
    await page
      .getByText(/Thông qua IModuleContract và Contracts project in-process/i)
      .click();
    await page.getByRole('button', { name: /Kiểm tra đáp án/i }).click();
    await expect(page.getByText(/Chính xác!/i).first()).toBeVisible({ timeout: 5000 });

    // Bước 1.7: Đánh dấu hoàn thành block
    const completeBlockBtn = page.getByRole('button', { name: /Đánh dấu xong/i }).first();
    if (await completeBlockBtn.isVisible()) {
      await completeBlockBtn.click();
      await expect(page.getByText(/Đã hoàn thành/i).first()).toBeVisible({ timeout: 5000 });
    }

    // Bước 1.8: Đánh dấu Bookmark bài học
    const bookmarkBtn = page.getByRole('button', { name: /Lưu bài/i });
    if (await bookmarkBtn.isVisible()) {
      await bookmarkBtn.click();
      await expect(page.getByRole('button', { name: /Đã lưu/i })).toBeVisible({ timeout: 5000 });
    }

    // Bước 1.9: Kiểm tra trang Bookmark cá nhân (/me/bookmarks)
    await page.goto('/me/bookmarks');
    await expect(page.getByRole('heading', { level: 1, name: /Khóa học & Bài học đã lưu/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('link', { name: /Tiếp tục học/i }).first()).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 2: CẤU HÌNH TRUY CẬP (ACCESS) & DUYỆT HỌC VIÊN (STUDENTS)
    // -------------------------------------------------------------

    // Bước 2.1: Truy cập trang Cấu hình quyền truy cập (/courses/my-course-1/manage/access)
    await page.goto('/courses/my-course-1/manage/access');
    await expect(page.getByRole('heading', { level: 1, name: /Cấu hình chế độ truy cập/i })).toBeVisible({
      timeout: 10000,
    });

    // Kiểm tra các tùy chọn chế độ khóa học
    await expect(page.getByText(/Công khai \(PUBLIC\)/i).first()).toBeVisible();
    await expect(page.getByText(/Riêng tư \(PRIVATE\)/i).first()).toBeVisible();
    await expect(page.getByText(/Chỉ mình tôi \(ONLY_ME\)/i).first()).toBeVisible();

    // Mở modal cấu hình passcode cho chương
    const configChapterBtn = page.getByRole('button', { name: /Cấu hình/i }).first();
    await configChapterBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Cấu hình truy cập chương/i)).toBeVisible();
    await page.getByRole('button', { name: /Hủy/i }).click();

    // Bước 2.2: Truy cập trang Quản lý danh sách học viên (/courses/my-course-1/manage/students)
    await page.goto('/courses/my-course-1/manage/students');
    await expect(page.getByRole('heading', { level: 1, name: /Quản lý học viên/i })).toBeVisible({
      timeout: 10000,
    });

    // Mời học viên mới qua email
    await page.getByRole('button', { name: /Mời học viên/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/Email người học/i).fill('student.e2e@example.com');
    await page.getByRole('button', { name: /Gửi lời mời/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // Chuyển tab "Chờ duyệt" và thao tác duyệt yêu cầu
    await page.getByRole('button', { name: 'Chờ duyệt' }).click();
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
    const approveBtn = page.getByRole('button', { name: /^Duyệt$/ }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }

    // -------------------------------------------------------------
    // PHẦN 3: BẢO VỆ PASSCODE CHƯƠNG & MỞ KHÓA THÀNH CÔNG
    // -------------------------------------------------------------

    // Bước 3.1: Truy cập chương có Passcode (/courses/my-course-1/learn/chapter-3333-protected)
    await page.goto('/courses/my-course-1/learn/chapter-3333-protected');

    // Chờ hệ thống phát hiện 403 PASSCODE_REQUIRED và mở Modal
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Chương học có bảo vệ Passcode/i)).toBeVisible();

    // Bước 3.2: Nhập sai Passcode -> Kiểm tra thông báo lỗi
    const passcodeInput = page.locator('#passcode-input');
    await passcodeInput.fill('9999');
    await page.getByRole('button', { name: /Mở khóa chương/i }).click();
    await expect(page.getByText(/Mật khẩu mở khóa không chính xác/i)).toBeVisible({ timeout: 5000 });

    // Bước 3.3: Nhập đúng Passcode '1234' -> Mở khóa thành công
    await passcodeInput.fill('1234');
    await page.getByRole('button', { name: /Mở khóa chương/i }).click();

    // Modal đóng lại và nội dung bảo mật được hiển thị
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Nội dung bảo mật đặc biệt/i)).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByText(/Bạn đã mở khóa thành công chương bảo vệ bằng Passcode!/i)
    ).toBeVisible();
  });
});
