import { test, expect } from '@playwright/test';

/**
 * T-S3-INT-01: Tích hợp S3 + e2e Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 3:
 * 1. Đăng nhập hệ thống & Truy cập mục lục chương khóa học (/courses/:courseId/manage/content - SCR-CNT-01)
 * 2. Tạo chương bài học mới và mở bộ soạn thảo khối (SCR-CNT-02)
 * 3. Soạn thảo đa dạng khối nội dung:
 *    - Khối Markdown / Văn bản
 *    - Khối Hình ảnh kèm upload ảnh trực tiếp (DEC-05)
 *    - Khối Thẻ ghi nhớ (Flashcard)
 * 4. Lưu nháp lần đầu thành công (tăng version lên v2)
 * 5. Xử lý xung đột 2 tab (Optimistic lock 409 VERSION_CONFLICT):
 *    - Tab B mở cùng chương, sửa đổi tiêu đề và Lưu nháp thành công (tăng version lên v3)
 *    - Tab A (chưa tải lại, giữ baseVersionNo = v2) sửa đổi và bấm Lưu nháp
 *    - Hệ thống chặn 409 VERSION_CONFLICT và hiển thị hộp thoại cảnh báo xung đột
 *    - Tab A nhấn "Tải lại bản mới nhất" để đồng bộ dữ liệu mới nhất từ Tab B
 * 6. Đăng tải chương trọn gói (Publish Chapter) -> trạng thái chuyển sang "Đã xuất bản"
 * 7. Kiểm tra chế độ xem trước bài học của học viên (FR-CNT-03) kèm tương tác lật thẻ nhớ
 * 8. Lịch sử phiên bản & Khôi phục (SCR-CNT-03): Xem danh sách snapshot và khôi phục bản cũ
 */
test.describe('S3 Content Editor & Publishing E2E Integration Flow', () => {
  const timestamp = Date.now();
  const chapterTitle = `Chương E2E ${timestamp}: Kiến trúc Modular Monolith Thực chiến`;
  const chapterDesc =
    'Chương bài học kiểm thử luồng biên tập khối, lưu nháp với khóa lạc quan và khôi phục phiên bản.';
  const courseId = 'my-course-1';

  // 1x1 PNG Base64 Buffer giả lập tải lên tệp ảnh hợp lệ (DEC-05)
  const mockPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  test('hoàn thành toàn bộ luồng: Soạn block + Upload ảnh → Lưu nháp → Xử lý xung đột 2 tab 409 → Đăng tải → Xem trước → Khôi phục lịch sử', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP VÀO HỆ THỐNG (/login)
    // -------------------------------------------------------------
    await page.goto('/login');
    await expect(page).toHaveTitle(/BrainMemo/i);

    await page.locator('#email').fill('quang.tran@brainmemo.vn');
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Chờ điều hướng kết thúc sau đăng nhập thành công
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập' })).toHaveCount(0, {
      timeout: 10000,
    });

    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'user',
        url: 'http://localhost:5173',
      },
    ]);

    // -------------------------------------------------------------
    // BƯỚC 2: MỤC LỤC CHƯƠNG & TẠO CHƯƠNG MỚI (SCR-CNT-01)
    // -------------------------------------------------------------
    await page.goto(`/courses/${courseId}/manage/content`);
    await expect(
      page.getByRole('heading', { name: /Mục lục chương & bài học/i })
    ).toBeVisible({ timeout: 10000 });

    // Nhấn nút "Thêm chương mới"
    const addChapterBtn = page.getByRole('button', { name: /Thêm chương mới/i });
    await expect(addChapterBtn).toBeVisible();
    await addChapterBtn.click();

    // Hộp thoại tạo chương mới hiển thị
    await expect(page.getByText('Thêm chương bài học mới')).toBeVisible({ timeout: 5000 });

    // Điền tiêu đề và mô tả chương
    await page
      .getByPlaceholder(/Ví dụ: Chương 1: Giới thiệu tổng quan.../i)
      .fill(chapterTitle);
    await page
      .getByPlaceholder(/Tóm tắt.*của chương.../i)
      .fill(chapterDesc);

    // Nhấn nút tạo chương
    await page.getByRole('button', { name: 'Tạo chương' }).click();

    // -------------------------------------------------------------
    // BƯỚC 3: MỞ TRÌNH SOẠN THẢO KHỐI & BIÊN SOẠN NỘI DUNG (SCR-CNT-02)
    // -------------------------------------------------------------
    // Xác nhận đã tự động chuyển hướng vào trang soạn thảo chương
    await expect(page).toHaveURL(new RegExp(`/courses/${courseId}/manage/content/chapter-`), {
      timeout: 15000,
    });
    await expect(page.getByText('v1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bản nháp')).toBeVisible();

    // --- 3.1. Thêm khối Markdown ---
    await page.getByRole('button', { name: 'Thêm khối nội dung mới' }).first().click();
    await expect(page.getByText('Chọn loại khối nội dung cần thêm')).toBeVisible();
    await page.getByRole('button', { name: /Markdown/i }).click();

    // Nhập nội dung Markdown
    const markdownTextarea = page.getByPlaceholder(/Nhập nội dung.*Markdown tại đây/i);
    await expect(markdownTextarea).toBeVisible();
    await markdownTextarea.fill('## Tổng quan kiến trúc\n\nKiến trúc **Modular Monolith** phân chia ranh giới theo modules.');

    // --- 3.2. Thêm khối Hình ảnh & Tải lên ảnh (DEC-05) ---
    await page.getByRole('button', { name: 'Thêm khối nội dung mới' }).first().click();
    await page.getByRole('button', { name: /Hình ảnh/i }).click();

    // Tải lên ảnh thông qua file input
    const imageInput = page.locator('input[type="file"][accept*="image"]').first();
    await imageInput.setInputFiles({
      name: 'architecture-diagram.png',
      mimeType: 'image/png',
      buffer: mockPngBuffer,
    });
    // Xác nhận ảnh đã gắn thành công
    await expect(page.getByRole('button', { name: 'Gỡ tệp tài nguyên' })).toBeVisible({
      timeout: 10000,
    });

    // --- 3.3. Thêm khối Thẻ ghi nhớ (Flashcard) ---
    await page.getByRole('button', { name: 'Thêm khối nội dung mới' }).first().click();
    await page.getByRole('button', { name: /Thẻ ghi nhớ/i }).click();

    // Điền nội dung thẻ ghi nhớ đầu tiên
    const frontTextarea = page.getByLabel('Mặt trước thẻ 1');
    const backTextarea = page.getByLabel('Mặt sau thẻ 1');
    await frontTextarea.fill('Modular Monolith là gì?');
    await backTextarea.fill('Kiến trúc đơn khối chia ranh giới module rõ ràng qua contracts.');

    // Xác nhận trạng thái form là "Chưa lưu"
    await expect(page.getByText('Chưa lưu')).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 4: LƯU NHÁP LẦN ĐẦU (BASE VERSION = v1 -> v2)
    // -------------------------------------------------------------
    const saveBtn = page.getByRole('button', { name: /Lưu nháp/i });
    await saveBtn.click();

    // Chờ thông báo lưu thành công và phiên bản tăng lên v2
    await expect(page.getByText('Lưu bản nháp thành công')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('v2')).toBeVisible();
    await expect(page.getByText('Đã lưu')).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 5: XỬ LÝ XUNG ĐỘT 2 TAB (409 VERSION_CONFLICT)
    // -------------------------------------------------------------
    // Mở Tab B song song trong cùng trình duyệt
    const currentUrl = page.url();
    const tabB = await page.context().newPage();
    await tabB.goto(currentUrl);

    // Xác nhận Tab B tải xong dữ liệu hiện tại (v2)
    await expect(tabB.getByText('v2')).toBeVisible({ timeout: 10000 });
    const tabBTitleInput = tabB.getByPlaceholder('Nhập tên chương...');
    await expect(tabBTitleInput).toHaveValue(chapterTitle);

    // Tab B chỉnh sửa tiêu đề chương và lưu nháp thành công
    const tabBUpdatedTitle = `${chapterTitle} - Cập nhật từ Tab B`;
    await tabBTitleInput.fill(tabBUpdatedTitle);
    await expect(tabB.getByText('Chưa lưu')).toBeVisible();
    await tabB.getByRole('button', { name: /Lưu nháp/i }).click();

    // Tab B lưu thành công lên version v3
    await expect(tabB.getByText('Lưu bản nháp thành công')).toBeVisible({ timeout: 10000 });
    await expect(tabB.getByText('v3')).toBeVisible();

    // Quay lại Tab A (vẫn đang giữ baseVersionNo = v2)
    const tabATitleInput = page.getByPlaceholder('Nhập tên chương...');
    await tabATitleInput.fill(`${chapterTitle} - Cập nhật xung đột từ Tab A`);
    await expect(page.getByText('Chưa lưu')).toBeVisible();

    // Tab A nhấn Lưu nháp -> Server phát hiện baseVersionNo (v2) != server lastVersionNo (v3) -> HTTP 409
    await page.getByRole('button', { name: /Lưu nháp/i }).click();

    // Tab A hiển thị hộp thoại cảnh báo xung đột phiên bản
    await expect(page.getByText('Phát hiện xung đột phiên bản (409)')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/không khớp với phiên bản mới nhất trên hệ thống/i)
    ).toBeVisible();

    // Tab A nhấn nút "Tải lại bản mới nhất" để cập nhật dữ liệu từ Tab B
    const reloadBtn = page.getByRole('button', { name: /Tải lại bản mới nhất/i });
    await reloadBtn.click();

    // Hộp thoại xung đột đóng lại, Tab A nhận dữ liệu mới nhất (v3) từ Tab B
    await expect(page.getByText('Phát hiện xung đột phiên bản (409)')).not.toBeVisible();
    await expect(page.getByText('v3')).toBeVisible({ timeout: 10000 });
    await expect(tabATitleInput).toHaveValue(tabBUpdatedTitle);

    // Đóng Tab B sau khi kiểm tra xong xung đột
    await tabB.close();

    // -------------------------------------------------------------
    // BƯỚC 6: ĐĂNG TẢI CHƯƠNG (PUBLISH CHAPTER)
    // -------------------------------------------------------------
    const publishBtn = page.getByRole('button', { name: /Đăng tải/i });
    await publishBtn.click();

    // Xác nhận thông báo đăng tải thành công
    await expect(page.getByText('Đăng tải chương thành công')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Đã xuất bản')).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 7: XEM TRƯỚC BÀI HỌC CỦA HỌC VIÊN (FR-CNT-03)
    // -------------------------------------------------------------
    const previewBtn = page.getByRole('button', { name: 'Xem trước như học viên' });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Hộp thoại xem trước toàn màn hình hiển thị
    const previewModal = page.getByRole('dialog', {
      name: 'Xem trước bài học ở chế độ học viên',
    });
    await expect(previewModal).toBeVisible({ timeout: 10000 });
    await expect(previewModal.getByText('Chế độ xem trước nháp (FR-CNT-03)')).toBeVisible();

    // Tương tác lật thẻ nhớ trong preview
    await expect(previewModal.getByText('Modular Monolith là gì?')).toBeVisible();
    await previewModal.getByText('Modular Monolith là gì?').click();
    await expect(
      previewModal.getByText('Kiến trúc đơn khối chia ranh giới module rõ ràng qua contracts.')
    ).toBeVisible();

    // Đóng chế độ xem trước
    await previewModal.getByRole('button', { name: 'Đóng xem trước' }).click();
    await expect(previewModal).not.toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 8: LỊCH SỬ PHIÊN BẢN & KHÔI PHỤC (SCR-CNT-03)
    // -------------------------------------------------------------
    const historyBtn = page.getByRole('button', { name: /Lịch sử/i });
    await historyBtn.click();

    // Hộp thoại lịch sử hiển thị danh sách các phiên bản
    await expect(page.getByText('Lịch sử phiên bản chương (SCR-CNT-03)')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Phiên bản #1')).toBeVisible();

    // Nhấn nút Khôi phục về phiên bản #1
    const restoreBtn = page.getByRole('button', { name: /Khôi phục/i }).first();
    await restoreBtn.click();

    // Modal xác nhận khôi phục hiển thị
    await expect(page.getByText(/Khôi phục về Phiên bản #/i)).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click();

    // Xác nhận khôi phục thành công
    await expect(page.getByText('Khôi phục phiên bản thành công')).toBeVisible({ timeout: 10000 });
  });
});
