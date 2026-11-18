import { test, expect } from '@playwright/test';

/**
 * T-S5-INT-01: Tích hợp S5 + e2e Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 5:
 * Tạo khóa học Public → Thấy ở trang chủ (SCR-DSC-01) & tìm kiếm (SCR-DSC-02) → Đổi sang Only Me → Biến mất khỏi khám phá
 */
test.describe('S5 Discovery E2E Integration Flow', () => {
  const timestamp = Date.now();
  const courseTitle = `Khóa học E2E Discovery Public ${timestamp}`;
  const courseDesc = 'Khóa học phục vụ kiểm thử luồng khám phá và bộ lọc tìm kiếm Slice 5.';

  test('hoàn thành toàn bộ luồng: Tạo khóa Public → Thấy ở trang chủ & Tìm kiếm → Đổi Only Me → Biến mất', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP GIẢNG VIÊN (/login)
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
    // BƯỚC 2: TẠO KHÓA HỌC MỚI CHẾ ĐỘ PUBLIC (/courses/new)
    // -------------------------------------------------------------
    await page.goto('/courses/new');
    await expect(page.getByRole('heading', { name: 'Tạo khóa học mới' })).toBeVisible({
      timeout: 10000,
    });

    await page.locator('#name').fill(courseTitle);
    await page.locator('#description').fill(courseDesc);

    // Gắn tag
    const tagInput = page.getByPlaceholder('Gõ tag và bấm Enter...');
    await tagInput.fill('discovery');
    await tagInput.press('Enter');

    // Chọn chế độ công khai (PUBLIC)
    await page.getByText('Công khai').first().click();

    // Nhấn Tạo khóa học
    await page.getByRole('button', { name: 'Tạo khóa học' }).click();

    // Chờ điều hướng đến trang chi tiết khóa học vừa tạo
    await expect(page).toHaveURL(/\/courses\/(?!new)[^/]+$/, { timeout: 15000 });
    const courseUrl = page.url();
    const createdCourseId = courseUrl.split('/courses/')[1].split('?')[0].split('#')[0];

    await expect(page.getByRole('heading', { level: 1 })).toContainText(courseTitle, {
      timeout: 10000,
    });

    // -------------------------------------------------------------
    // BƯỚC 3: KIỂM TRA XUẤT HIỆN TẠI TRANG CHỦ (SCR-DSC-01) (/)
    // -------------------------------------------------------------
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Khóa học công khai mới tạo xuất hiện trên trang chủ
    await expect(page.getByText(courseTitle).first()).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // BƯỚC 4: TÌM KIẾM TẠI TRANG KHÁM PHÁ (SCR-DSC-02) (/courses)
    // -------------------------------------------------------------
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1, name: /Khám phá Khóa học/i })).toBeVisible({
      timeout: 10000,
    });

    // Tìm kiếm với từ khóa
    const searchInput = page.locator('#search-course-input');
    await searchInput.fill(`Discovery Public ${timestamp}`);
    await page.getByRole('button', { name: 'Tìm' }).click();

    // Xác nhận URL giữ query và kết quả tìm thấy khóa học
    await expect(page).toHaveURL(/q=Discovery.*Public/, {
      timeout: 8000,
    });
    await expect(page.getByText(courseTitle).first()).toBeVisible({ timeout: 8000 });

    // -------------------------------------------------------------
    // BƯỚC 5: ĐỔI CHẾ ĐỘ KHÓA HỌC SANG ONLY_ME (/courses/:id/edit)
    // -------------------------------------------------------------
    await page.goto(`/courses/${createdCourseId}/edit`);
    await expect(page.getByRole('heading', { name: 'Chỉnh sửa khóa học' })).toBeVisible({
      timeout: 10000,
    });

    // Chuyển sang "Chỉ mình tôi"
    await page.getByText('Chỉ mình tôi').click();
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    // Chờ lưu xong và điều hướng về trang chi tiết
    await expect(page).toHaveURL(`/courses/${createdCourseId}`, { timeout: 15000 });
    await expect(page.getByText(/Chỉ mình tôi/i).first()).toBeVisible({ timeout: 8000 });

    // -------------------------------------------------------------
    // BƯỚC 6: XÁC NHẬN KHÓA HỌC BIẾN MẤT HOÀN TOÀN KHỎI KHÁM PHÁ
    // -------------------------------------------------------------
    // 6.1: Trang chủ (/) không còn hiển thị khóa Only Me
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(courseTitle)).toHaveCount(0);

    // 6.2: Trang Tìm kiếm (/courses) tìm kiếm từ khóa đó báo không tìm thấy
    await page.goto(`/courses?q=Discovery+Public+${timestamp}`);
    await expect(page.getByRole('heading', { level: 1, name: /Khám phá Khóa học/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/Không tìm thấy khóa học phù hợp/i)).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText(courseTitle)).toHaveCount(0);
  });
});
