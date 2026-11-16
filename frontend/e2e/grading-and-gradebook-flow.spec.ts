import { test, expect } from '@playwright/test';

/**
 * T-S8-INT-01: Tích hợp S8 + E2E Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 8:
 * 1. Học viên nộp bài tập (SCR-LRN-05): Soạn bài, lưu nháp, nộp bài chính thức.
 * 2. Giảng viên cấu hình quy tắc đánh giá & trọng số thành phần (SCR-AST-01).
 * 3. Giảng viên xem hàng đợi chấm bài (SCR-AST-04): Lọc theo loại hoạt động.
 * 4. Giảng viên chấm bài thủ công (SCR-AST-05): Chấm điểm bài tập nộp file, nhập nhận xét.
 * 5. Giảng viên xem sổ điểm khóa học (SCR-AST-07): Tổng kết điểm, xếp loại, xuất CSV.
 * 6. Học viên xem sổ điểm cá nhân (SCR-AST-06): Điểm tổng kết thang 10, xếp loại, điểm các thành phần.
 */
test.describe('S8 Grading & Gradebook E2E Integration Flow', () => {
  test('toàn bộ luồng: Nộp bài tập → Cấu hình đánh giá → Hàng đợi chấm bài → Chấm điểm → Sổ điểm khóa học → Sổ điểm cá nhân', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // PHẦN 1: ĐĂNG NHẬP HỌC VIÊN / GIẢNG VIÊN
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
    // PHẦN 2: HỌC VIÊN NỘP BÀI TẬP (SCR-LRN-05)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/assignments/assignment-block-1');
    await expect(page.getByRole('heading', { name: /Bài tập thực hành/i })).toBeVisible({ timeout: 10000 });

    // Soạn nội dung bài nộp
    const textarea = page.locator('textarea');
    await textarea.fill('Đây là bài tập lớn thiết kế hệ thống CSDL của em.');

    // Lưu nháp
    const saveDraftBtn = page.getByRole('button', { name: /Lưu nháp/i });
    await saveDraftBtn.click();
    await expect(page.getByText('Đã lưu bản nháp thành công.')).toBeVisible();

    // Nộp bài chính thức
    const submitBtn = page.getByRole('button', { name: /Nộp bài tập/i }).last();
    await submitBtn.click();

    // Hộp thoại xác nhận nộp
    await expect(page.getByText('Xác nhận nộp bài tập')).toBeVisible();
    const confirmBtn = page.getByRole('button', { name: 'Xác nhận nộp', exact: true });
    await confirmBtn.click();

    await expect(page.getByText('Nộp bài tập thành công!')).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 3: CẤU HÌNH ĐÁNH GIÁ & QUY TẮC TÍNH ĐIỂM (SCR-AST-01)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/assessment');
    await expect(page.getByRole('heading', { name: /Cấu hình đánh giá & Quy tắc tính điểm/i })).toBeVisible({ timeout: 10000 });

    // Kiểm tra quy tắc điểm cao nhất & bảng phân bổ trọng số
    await expect(page.getByText('Điểm cao nhất')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Phân bổ trọng số điểm thành phần/i })).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 4: HÀNG ĐỢI CHẤM BÀI (SCR-AST-04)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/grading');
    await expect(page.getByRole('heading', { name: /Hàng đợi chấm điểm/i })).toBeVisible({ timeout: 10000 });

    // Lọc theo Bài tập nộp file
    const assignmentFilterTab = page.getByRole('button', { name: 'Bài tập nộp file' });
    await assignmentFilterTab.click();

    await expect(page.getByText('Bài tập lớn: Thiết kế CSDL')).toBeVisible();

    // Bấm nút Chấm bài
    const gradeBtn = page.getByRole('button', { name: /Chấm bài/i }).first();
    await gradeBtn.click();

    // -------------------------------------------------------------
    // PHẦN 5: CHẤM BÀI THỦ CÔNG (SCR-AST-05)
    // -------------------------------------------------------------
    await expect(page).toHaveURL(/manage\/grading\/ASSIGNMENT/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Chấm điểm bài tập nộp file/i })).toBeVisible();

    // Nhập điểm và nhận xét
    const scoreInput = page.locator('input[type="number"]');
    await scoreInput.fill('95');

    const feedbackInput = page.locator('textarea');
    await feedbackInput.fill('Bài làm rất tốt, sơ đồ thiết kế rõ ràng chuẩn hóa bậc 3NF.');

    const submitGradingBtn = page.getByRole('button', { name: 'Xác nhận chấm điểm' });
    await submitGradingBtn.click();

    await expect(page.getByText('Đã chấm bài tập thành công!')).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 6: SỔ ĐIỂM KHÓA HỌC (SCR-AST-07)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/gradebook');
    await expect(page.getByRole('heading', { name: /Sổ điểm khóa học/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Quang Trần')).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất CSV/i })).toBeEnabled();

    // -------------------------------------------------------------
    // PHẦN 7: SỔ ĐIỂM CÁ NHÂN HỌC VIÊN (SCR-AST-06)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/gradebook');
    await expect(page.getByRole('heading', { name: /Kết quả học tập & Sổ điểm của bạn/i })).toBeVisible({ timeout: 10000 });

    // Kiểm tra điểm tổng kết thang 10 & kết quả xếp loại
    await expect(page.getByText('8.85')).toBeVisible();
    await expect(page.getByText('GIOI')).toBeVisible();
    await expect(page.getByText('ĐẠT KHÓA HỌC')).toBeVisible();
  });
});
