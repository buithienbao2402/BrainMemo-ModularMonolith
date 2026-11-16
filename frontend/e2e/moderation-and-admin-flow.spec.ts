import { test, expect } from '@playwright/test';

/**
 * T-S10-INT-01: Tích hợp S10 + E2E Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 10:
 * 1. Đăng nhập hệ thống.
 * 2. Người dùng báo cáo vi phạm khóa học (SCR-MOD-01).
 * 3. Giảng viên theo dõi danh sách báo cáo khóa học (SCR-MOD-02).
 * 4. Admin kiểm tra tổng quan trung tâm quản trị (SCR-ADM-01 Overview Dashboard).
 * 5. Admin duyệt hàng đợi kiểm duyệt vi phạm (SCR-MOD-03).
 * 6. Admin kiểm tra chi tiết & phán quyết báo cáo với chế tài (SCR-MOD-04).
 * 7. Admin quản lý chế tài kỷ luật & gỡ chế tài (SCR-MOD-05).
 * 8. Admin tra cứu nhật ký kiểm toán hệ thống (SCR-MOD-06).
 * 9. Admin quản trị phân quyền & khóa tài khoản người dùng (SCR-ADM-01).
 * 10. Admin phát thông báo broadcast toàn hệ thống (SCR-ADM-02).
 */
test.describe('S10 Moderation & Admin Portal E2E Integration Flow', () => {
  test('toàn bộ luồng: Báo cáo vi phạm → Giảng viên xem báo cáo → Admin Dashboard → Hàng đợi kiểm duyệt → Phán quyết & Chế tài → Quản lý tài khoản → Broadcast thông báo', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // PHẦN 1: ĐĂNG NHẬP
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
    // PHẦN 2: BÁO CÁO VI PHẠM KHÓA HỌC (SCR-MOD-01)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1');
    await expect(page.getByRole('button', { name: /Báo cáo khóa học vi phạm/i })).toBeVisible({
      timeout: 15000,
    });

    // Mở modal báo cáo
    await page.getByRole('button', { name: /Báo cáo khóa học vi phạm/i }).click();
    await expect(page.getByRole('heading', { name: /Báo cáo vi phạm khóa học/i })).toBeVisible();

    // Điền lý do và mô tả
    await page.locator('#report-reason').selectOption('INAPPROPRIATE_CONTENT');
    await page.locator('#report-desc').fill('Khóa học này chứa một số nội dung không phù hợp với tiêu chuẩn giáo dục.');

    // Gửi báo cáo
    await page.getByRole('button', { name: 'Gửi báo cáo vi phạm' }).click();

    // -------------------------------------------------------------
    // PHẦN 3: GIẢNG VIÊN XEM BÁO CÁO KHÓA HỌC (SCR-MOD-02)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/reports');
    await expect(page.getByRole('heading', { name: /Báo cáo vi phạm khóa học/i })).toBeVisible({
      timeout: 15000,
    });

    // Kiểm tra các chỉ số KPI
    await expect(page.getByText(/Tổng báo cáo/i)).toBeVisible();
    await expect(page.getByText(/Đang chờ xử lý/i).first()).toBeVisible();

    // Kiểm tra danh sách báo cáo
    await expect(
      page.getByText(/Nội dung chứa liên kết quảng cáo spam ngoài luồng/i)
    ).toBeVisible();

    // Mở dialog xem chi tiết một báo cáo
    const detailBtn = page.getByRole('button', { name: /Chi tiết/i }).first();
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();

    await expect(page.getByText(/Thông tin phản ánh từ cộng đồng người học/i)).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).first().click();

    // -------------------------------------------------------------
    // PHẦN 4: ĐĂNG NHẬP ADMIN & TỔNG QUAN QUẢN TRỊ (SCR-ADM-01 DASHBOARD)
    // -------------------------------------------------------------
    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'admin',
        url: 'http://localhost:5173',
      },
    ]);

    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: /Tổng quan trung tâm quản trị BrainMemo/i })
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra các thẻ KPI trên Dashboard
    await expect(page.getByText('Báo cáo chờ xử lý')).toBeVisible();
    await expect(page.getByText('Cờ cảnh báo PhoBERT AI')).toBeVisible();
    await expect(page.getByText('Chế tài đang hiệu lực')).toBeVisible();
    await expect(page.getByText('Tài khoản bị khóa')).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 5: HÀNG ĐỢI KIỂM DUYỆT BÁO CÁO VI PHẠM (SCR-MOD-03)
    // -------------------------------------------------------------
    await page.goto('/admin/reports');
    await expect(
      page.getByRole('heading', { name: /Hàng đợi kiểm duyệt báo cáo vi phạm/i })
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra cờ phát hiện từ PhoBERT AI
    await expect(page.getByText('PhoBERT AI', { exact: true })).toBeVisible();
    await expect(page.getByText(/Nội dung đạo văn từ khóa học khác/i)).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 6: CHI TIẾT & PHÁN QUYẾT BÁO CÁO (SCR-MOD-04)
    // -------------------------------------------------------------
    await page.goto('/admin/reports/rep-adm-1');
    await expect(
      page.getByRole('heading', { name: /Chi tiết & Xử lý báo cáo/i })
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra preview snapshot đối tượng
    await expect(page.getByText(/Nội dung đối tượng tại thời điểm xem xét/i)).toBeVisible();

    // Kiểm tra panel quyết định xử lý
    await expect(page.getByText(/Kết luận kiểm duyệt/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Xác nhận vi phạm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bác bỏ báo cáo/i })).toBeVisible();

    // Điền ghi chú phán quyết
    await page.locator('#res-note').fill('Đã xác minh vi phạm sao chép nội dung.');

    // -------------------------------------------------------------
    // PHẦN 7: QUẢN LÝ CHẾ TÀI KỶ LUẬT (SCR-MOD-05)
    // -------------------------------------------------------------
    await page.goto('/admin/sanctions');
    await expect(
      page.getByRole('heading', { name: /Quản lý chế tài kỷ luật & xử phạt/i })
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra danh sách chế tài
    await expect(page.getByText(/Spam bình luận quấy rối hàng loạt/i)).toBeVisible();

    // Mở modal áp dụng chế tài trực tiếp
    const directSanctionBtn = page.getByRole('button', { name: /Áp dụng chế tài trực tiếp/i });
    await expect(directSanctionBtn).toBeVisible();
    await directSanctionBtn.click();

    await expect(page.getByText(/Áp dụng chế tài kỷ luật thủ công/i)).toBeVisible();
    await page.getByRole('button', { name: 'Hủy' }).click();

    // Mở modal gỡ chế tài
    const liftBtn = page.getByRole('button', { name: /Gỡ chế tài/i }).first();
    await expect(liftBtn).toBeVisible();
    await liftBtn.click();

    await expect(page.getByRole('heading', { name: /Gỡ bỏ chế tài kỷ luật/i })).toBeVisible();
    await page.getByRole('button', { name: 'Hủy' }).click();

    // -------------------------------------------------------------
    // PHẦN 8: NHẬT KÝ KIỂM TOÁN HỆ THỐNG (SCR-MOD-06)
    // -------------------------------------------------------------
    await page.goto('/admin/audit-logs');
    await expect(
      page.getByRole('heading', { name: /Nhật ký kiểm toán hệ thống/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('cell', { name: 'REPORT_RESOLVE' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SANCTION_APPLY' })).toBeVisible();

    // Mở modal xem JSON chi tiết
    const jsonBtn = page.getByRole('button', { name: /Xem JSON/i }).first();
    await expect(jsonBtn).toBeVisible();
    await jsonBtn.click();

    await expect(page.getByRole('heading', { name: /Chi tiết bản ghi kiểm toán/i })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).first().click();

    // -------------------------------------------------------------
    // PHẦN 9: QUẢN TRỊ TÀI KHOẢN & PHÂN QUYỀN (SCR-ADM-01)
    // -------------------------------------------------------------
    await page.goto('/admin/users');
    await expect(
      page.getByRole('heading', { name: /Quản trị tài khoản & phân quyền người dùng/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('admin@brainmemo.io')).toBeVisible();
    await expect(page.getByText('spammer@example.com')).toBeVisible();

    // Thao tác nút mở khóa tài khoản
    const unlockBtn = page.getByRole('button', { name: /Mở khóa/i }).first();
    await expect(unlockBtn).toBeVisible();
    await unlockBtn.click();

    await expect(page.getByRole('heading', { name: /Mở khóa tài khoản/i })).toBeVisible();
    await page.getByRole('button', { name: 'Hủy' }).click();

    // -------------------------------------------------------------
    // PHẦN 10: PHÁT THÔNG BÁO TOÀN HỆ THỐNG (SCR-ADM-02)
    // -------------------------------------------------------------
    await page.goto('/admin/announcements');
    await expect(
      page.getByRole('heading', { name: /Phát thông báo toàn hệ thống/i })
    ).toBeVisible({ timeout: 15000 });

    await page.locator('#announcement-title').fill('Thông báo nâng cấp hệ thống máy chủ');
    await page.locator('#announcement-body').fill('Hệ thống BrainMemo sẽ tạm dừng phục vụ 30 phút vào lúc 02:00 sáng.');

    // Chuyển tab xem trước (Preview)
    await page.getByRole('button', { name: 'Xem trước (Preview)' }).click();
    await expect(page.getByRole('heading', { name: /Thông báo nâng cấp hệ thống máy chủ/i })).toBeVisible();

    // Nhấn phát thông báo
    await page.getByRole('button', { name: /Phát thông báo ngay/i }).click();

    // Modal xác nhận xuất hiện
    await expect(
      page.getByRole('heading', { name: /Xác nhận phát thông báo toàn hệ thống/i })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Xác nhận phát sóng' }).click();
  });
});
