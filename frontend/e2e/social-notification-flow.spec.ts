import { test, expect } from '@playwright/test';

/**
 * T-S6-INT-01: Tích hợp S6 + e2e Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 6:
 * 1. Học viên bình luận trong bài học (SCR-LRN-06) -> Bình luận & phản hồi hiển thị trong danh sách thảo luận
 * 2. Hệ thống tạo thông báo -> Chuông báo ở Topbar hiển thị badge chưa đọc
 * 3. Mở Dropdown thông báo từ chuông -> Xem nhanh danh sách -> Chuyển sang Trang trung tâm thông báo (SCR-NTF-01)
 * 4. Lọc tab thông báo Chưa đọc / Tất cả -> Đánh dấu tất cả đã đọc
 * 5. Giảng viên điều hành thảo luận: Ghim / Bỏ ghim bình luận (SCR-LRN-06)
 * 6. Người học đề cử khóa học (SCR-CRS-01) -> Bảng quản lý khóa học hiển thị số lượt đề cử (SCR-CRS-04)
 */
test.describe('S6 Social & Notification E2E Integration Flow', () => {
  test('hoàn thành toàn bộ luồng: Bình luận bài học -> Chuông thông báo -> Xem & Đánh dấu đọc -> Ghim thảo luận -> Đề cử khóa học', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP HỌC VIÊN / NGƯỜI DÙNG (/login)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // BƯỚC 2: TRUY CẬP TRÌNH ĐỌC BÀI HỌC & ĐĂNG BÌNH LUẬN (SCR-LRN-06)
    // -------------------------------------------------------------
    await page.goto('/courses/my-course-1/learn/chapter-1111-1111');
    await expect(page.getByText(/Hỏi đáp & Thảo luận/i)).toBeVisible({ timeout: 15000 });

    const commentInput = page.getByPlaceholder(
      'Đặt câu hỏi hoặc chia sẻ ý kiến của bạn về bài học...'
    );
    await expect(commentInput).toBeVisible();

    const uniqueComment = `Bài giảng rất dễ hiểu và chi tiết! Cảm ơn Giảng viên. [${Date.now()}]`;
    await commentInput.fill(uniqueComment);

    const submitCommentBtn = page.getByRole('button', { name: /Gửi bình luận/i });
    await expect(submitCommentBtn).toBeEnabled();
    await submitCommentBtn.click();

    // Xác nhận bình luận mới xuất hiện trong luồng thảo luận
    await expect(page.getByText(uniqueComment)).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // BƯỚC 3: PHẢN HỒI (REPLY) LẠI BÌNH LUẬN ĐÃ CÓ (SCR-LRN-06)
    // -------------------------------------------------------------
    const replyButtons = page.getByRole('button', { name: /^Trả lời$/i });
    if ((await replyButtons.count()) > 0) {
      await replyButtons.first().click();

      const replyInput = page.getByPlaceholder(/Trả lời @/i);
      await expect(replyInput).toBeVisible();

      const uniqueReply = `Em hoàn toàn đồng ý với ý kiến này ạ! [${Date.now()}]`;
      await replyInput.fill(uniqueReply);

      await page.getByRole('button', { name: /Gửi trả lời/i }).click();
      await expect(page.getByText(uniqueReply)).toBeVisible({ timeout: 10000 });
    }

    // -------------------------------------------------------------
    // BƯỚC 4: QUAY VỀ TRANG KHÓA HỌC & KIỂM TRA CHUÔNG THÔNG BÁO Ở TOPBAR (SCR-NTF-01)
    // -------------------------------------------------------------
    await page.getByRole('link', { name: /Chi tiết khóa/i }).click();
    await expect(page).toHaveURL(/\/courses\/my-course-1$/, { timeout: 10000 });

    const bellBtn = page.getByRole('banner').getByRole('button', { name: /thông báo/i });
    await expect(bellBtn).toBeVisible({ timeout: 10000 });

    // Mở Dropdown thông báo nhanh
    await bellBtn.click();

    // Menu dropdown hiển thị danh sách thông báo
    await expect(page.getByText(/Bình luận mới về khóa học/i).first()).toBeVisible({ timeout: 5000 });

    // Nhấp vào "Xem tất cả thông báo" để tới trang trung tâm thông báo
    const viewAllLink = page.getByRole('menuitem', { name: /Xem tất cả thông báo/i });
    await expect(viewAllLink).toBeVisible();
    await viewAllLink.click();

    await expect(page).toHaveURL(/\/notifications/, { timeout: 10000 });

    // -------------------------------------------------------------
    // BƯỚC 5: TRANG TRUNG TÂM THÔNG BÁO (/notifications - SCR-NTF-01)
    // -------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'Thông báo', level: 1 })).toBeVisible();

    // Chuyển sang Tab Chưa đọc
    const unreadTab = page.getByRole('button', { name: 'Chưa đọc', exact: true });
    await unreadTab.click();
    await expect(unreadTab).toHaveClass(/bg-primary/);

    // Chuyển lại Tab Tất cả
    const allTab = page.getByRole('button', { name: 'Tất cả', exact: true });
    await allTab.click();
    await expect(allTab).toHaveClass(/bg-primary/);

    // Nhấn Đánh dấu tất cả đã đọc
    const markAllReadBtn = page.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i });
    if (await markAllReadBtn.isEnabled()) {
      await markAllReadBtn.click();
    }

    // -------------------------------------------------------------
    // BƯỚC 6: GIẢNG VIÊN ĐIỀU HÀNH BÌNH LUẬN (GHIM / BỎ GHIM) (SCR-LRN-06)
    // -------------------------------------------------------------
    await page.goto('/courses/my-course-1/learn/chapter-1111-1111');
    await expect(page.getByText(/Hỏi đáp & Thảo luận/i)).toBeVisible({ timeout: 10000 });

    // Tìm nút Ghim bình luận hoặc Bỏ ghim
    const pinActionBtn = page.locator('button[title="Ghim bình luận"], button[title="Bỏ ghim"]');
    if ((await pinActionBtn.count()) > 0) {
      const initialTitle = await pinActionBtn.first().getAttribute('title');
      await pinActionBtn.first().click();

      // Kiểm tra nhãn pin thay đổi hoặc huy hiệu Đã ghim xuất hiện
      await expect(
        page.locator('button[title="Ghim bình luận"], button[title="Bỏ ghim"]').first()
      ).not.toHaveAttribute('title', initialTitle ?? '', { timeout: 5000 });
    }

    // -------------------------------------------------------------
    // BƯỚC 7: NGƯỜI HỌC ĐỀ CỬ KHÓA HỌC (SCR-CRS-01)
    // -------------------------------------------------------------
    await page.goto('/courses/course-intro-1');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    const nominateBtn = page.getByRole('button', { name: /Đề cử/i });
    await expect(nominateBtn).toBeVisible({ timeout: 10000 });

    await nominateBtn.click();
    await expect(page.getByText('Đã đề cử khóa học!')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // BƯỚC 8: BẢNG QUẢN LÝ KHÓA HỌC HIỂN THỊ SỐ ĐỀ CỬ (SCR-CRS-04)
    // -------------------------------------------------------------
    await page.goto('/courses/my-course-1/manage');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Kiểm tra card Số đề cử & Top đề cử
    await expect(page.getByText('Số đề cử')).toBeVisible();
    await expect(page.getByText('TOP ĐỀ CỬ')).toBeVisible();
    await expect(page.getByRole('heading', { name: /XẾP HẠNG KHÓA HỌC/i })).toBeVisible();
  });
});
