import { test, expect } from '@playwright/test';

/**
 * T-S2-INT-01: Tích hợp S2 + e2e Playwright
 * Kịch bản nghiệm thu toàn diện Slice 2:
 * 1. Đăng nhập hệ thống
 * 2. Cập nhật hồ sơ & Tải lên Avatar (DEC-05 / S3 Storage)
 * 3. Kiểm tra trang cá nhân công khai hiển thị avatar & tên mới (SCR-PRF-01)
 * 4. Tạo khóa học mới kèm tải lên ảnh bìa (SCR-CRS-02)
 * 5. Xác nhận khóa học công khai xuất hiện trên hồ sơ tác giả
 * 6. Đổi trạng thái khóa học sang "Chỉ mình tôi" (ONLY_ME)
 * 7. Kiểm tra quyền riêng tư (DEC-16 & Ma trận 3.5.8.1):
 *    - Chủ sở hữu vẫn truy cập và chỉnh sửa bình thường
 *    - Người khác / Khách vãng lai truy cập nhận mã HTTP 404 (Không tìm thấy khóa học)
 *    - Khóa học Only Me biến mất khỏi danh sách hồ sơ công khai đối với người ngoài
 */
test.describe('S2 Course & Profile E2E Integration Flow', () => {
  const timestamp = Date.now();
  const newDisplayName = `Quang Trần - Lead Instructor ${timestamp % 1000}`;
  const newBio =
    'Chuyên gia kiến trúc hệ thống phân tán và Modular Monolith với ASP.NET Core & React.';
  const courseTitle = `Khóa học E2E: Modular Monolith Thực Chiến ${timestamp}`;
  const courseDesc =
    'Khóa học thực chiến kiểm thử E2E Playwright và phân quyền truy cập ma trận 3.5.8.1.';
  const userId = '11111111-1111-4111-8111-111111111111';

  // 1x1 PNG Base64 Buffer giả lập tải lên tệp ảnh hợp lệ (DEC-05)
  const mockPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  test('hoàn thành toàn bộ luồng: Đăng nhập → Cập nhật Avatar & Profile → Tạo khóa học & Bìa → Đổi sang Only Me → Người ngoài nhận 404', async ({
    page,
    browser,
  }) => {
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
    // BƯỚC 2: CẬP NHẬT HỒ SƠ & UPLOAD AVATAR (/settings/profile)
    // -------------------------------------------------------------
    await page.goto('/settings/profile');
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible({
      timeout: 10000,
    });

    // Chờ form tải xong dữ liệu hồ sơ ban đầu từ server
    const displayNameInput = page.locator('#displayName');
    await expect(displayNameInput).toHaveValue(/.+/);

    // Cập nhật thông tin Họ tên và Giới thiệu
    await displayNameInput.fill(newDisplayName);
    await page.locator('#bio').fill(newBio);

    // Tải lên ảnh đại diện Avatar qua file input
    const avatarInput = page.locator('input[type="file"][accept*="image"]').first();
    await avatarInput.setInputFiles({
      name: 'avatar-test.png',
      mimeType: 'image/png',
      buffer: mockPngBuffer,
    });
    await expect(page.getByRole('button', { name: 'Gỡ ảnh' })).toBeVisible({ timeout: 10000 });

    // Nhấn Lưu thay đổi
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    // Xác nhận hiển thị thông báo toast thành công
    await expect(page.getByText('Cập nhật thành công')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // BƯỚC 3: XEM HỒ SƠ CÔNG KHAI (SCR-PRF-01) (/users/:userId)
    // -------------------------------------------------------------
    await page.goto(`/users/${userId}`);

    // Xác nhận thông tin hồ sơ hiển thị đầy đủ
    await expect(page.getByRole('heading', { level: 1 })).toContainText(newDisplayName, {
      timeout: 10000,
    });
    await expect(page.getByText(newBio)).toBeVisible();
    await expect(page.getByText('Hồ sơ của bạn')).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 4: TẠO KHÓA HỌC MỚI KÈM ẢNH BÌA (/courses/new)
    // -------------------------------------------------------------
    await page.goto('/courses/new');
    await expect(page.getByRole('heading', { name: 'Tạo khóa học mới' })).toBeVisible({
      timeout: 10000,
    });

    // Điền form thông tin khóa học
    await page.locator('#name').fill(courseTitle);
    await page.locator('#description').fill(courseDesc);

    // Gắn tag cho khóa học
    const tagInput = page.getByPlaceholder('Gõ tag và bấm Enter...');
    await tagInput.fill('e2e');
    await tagInput.press('Enter');

    // Chọn chế độ truy cập "Công khai" (PUBLIC)
    await page.getByText('Công khai').first().click();

    // Tải lên ảnh bìa khóa học
    const coverInput = page.locator('input[type="file"][accept*="image"]').first();
    await coverInput.setInputFiles({
      name: 'cover-test.png',
      mimeType: 'image/png',
      buffer: mockPngBuffer,
    });
    await expect(page.getByText('Đổi ảnh')).toBeVisible({ timeout: 10000 });

    // Gửi form Tạo khóa học
    await page.getByRole('button', { name: 'Tạo khóa học' }).click();

    // Chờ hệ thống tạo xong và điều hướng tới trang chi tiết khóa học
    await expect(page).toHaveURL(/\/courses\/(?!new)[^/]+$/, { timeout: 15000 });

    // Trích xuất courseId của khóa học vừa tạo
    const courseUrl = page.url();
    const createdCourseId = courseUrl.split('/courses/')[1].split('?')[0].split('#')[0];

    // Xác thực giao diện chi tiết khóa học (SCR-CRS-01) cho tác giả
    await expect(page.getByRole('heading', { level: 1 })).toContainText(courseTitle, {
      timeout: 10000,
    });
    await expect(page.getByText('Công khai')).toBeVisible();
    await expect(page.getByText('Bạn là chủ biên soạn khóa học này.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Chỉnh sửa khóa học/i })).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 5: XEM KHÓA HỌC TRÊN HỒ SƠ CÔNG KHAI
    // -------------------------------------------------------------
    await page.goto(`/users/${userId}`);

    // Bấm chuyển sang tab "Đã tạo"
    const createdTab = page.getByRole('button', { name: 'Đã tạo' });
    await createdTab.click();

    // Khóa học công khai vừa tạo xuất hiện trong danh sách
    await expect(page.getByRole('link', { name: courseTitle, exact: true })).toBeVisible({
      timeout: 10000,
    });

    // -------------------------------------------------------------
    // BƯỚC 6: ĐỔI TRẠNG THÁI KHÓA HỌC SANG ONLY_ME (/courses/:id/edit)
    // -------------------------------------------------------------
    await page.goto(`/courses/${createdCourseId}/edit`);
    await expect(page.getByRole('heading', { name: 'Chỉnh sửa khóa học' })).toBeVisible({
      timeout: 10000,
    });

    // Chuyển chế độ hiển thị sang "Chỉ mình tôi"
    await page.getByText('Chỉ mình tôi').click();

    // Lưu thay đổi
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    // Chờ quay trở lại trang chi tiết khóa học
    await expect(page).toHaveURL(`/courses/${createdCourseId}`, { timeout: 15000 });

    // Xác nhận tác giả vẫn xem được và huy hiệu đổi sang "Chỉ mình tôi"
    await expect(page.getByText('Chỉ mình tôi')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bạn là chủ biên soạn khóa học này.')).toBeVisible();

    // -------------------------------------------------------------
    // BƯỚC 7: KIỂM TRA BẢO MẬT QUYỀN RIÊNG TƯ CHO NGƯỜI NGOÀI (DEC-16)
    // -------------------------------------------------------------
    // Lấy storage state hiện tại (chứa mock database trong localStorage)
    const currentStorage = await page.context().storageState();

    // Mở Browser Context độc lập hoàn toàn cho Khách vãng lai (không cookie danh tính, giữ mock database)
    const guestContext = await browser.newContext({
      storageState: {
        cookies: [],
        origins: currentStorage.origins,
      },
    });
    const guestPage = await guestContext.newPage();

    // 7.1. Khách truy cập trực tiếp URL của khóa học ONLY_ME
    await guestPage.goto(`/courses/${createdCourseId}`);

    // DEC-16 & 3.5.8.1: Khách hoặc người ngoài nhận thông báo 404 Không tìm thấy khóa học
    await expect(guestPage.getByText('Không tìm thấy khóa học')).toBeVisible({ timeout: 10000 });
    await expect(
      guestPage.getByText('Khóa học không tồn tại hoặc đã bị xóa.')
    ).toBeVisible();

    // 7.2. Khách vào trang hồ sơ công khai của tác giả
    await guestPage.goto(`/users/${userId}`);
    const guestCreatedTab = guestPage.getByRole('button', { name: 'Đã tạo' });
    await guestCreatedTab.click();

    // DEC-16: Khóa học ONLY_ME hoàn toàn KHÔNG xuất hiện trên hồ sơ công khai đối với người ngoài
    await expect(guestPage.getByRole('link', { name: courseTitle, exact: true })).toHaveCount(0);

    // Đóng context khách
    await guestContext.close();
  });
});
