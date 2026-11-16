import { test, expect } from '@playwright/test';

/**
 * T-S9-INT-01: Tích hợp S9 + E2E Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 9:
 * 1. Đăng nhập hệ thống.
 * 2. Giảng viên cấu hình chuẩn đầu ra CLO & PLO (SCR-AST-02).
 * 3. Giảng viên cấu hình ma trận đánh giá 2 chiều (SCR-AST-03).
 * 4. Giảng viên xem báo cáo thống kê phổ điểm & mức độ đạt CLO (SCR-AST-08).
 * 5. Giảng viên quản lý nhận xét sao và gửi phản hồi (SCR-AST-09).
 * 6. Học viên xem sổ điểm cá nhân và mức đạt chuẩn đầu ra CLO (SCR-AST-06).
 */
test.describe('S9 CLO/PLO, Analytics & Reviews E2E Integration Flow', () => {
  test('toàn bộ luồng: Quản lý CLO/PLO → Ma trận bài đánh giá → Thống kê phổ điểm → Quản lý đánh giá sao → Sổ điểm cá nhân đạt CLO', async ({
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
    // PHẦN 2: QUẢN LÝ CHUẨN ĐẦU RA HỌC PHẦN CLO & PLO (SCR-AST-02)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/outcomes');
    await expect(
      page.getByRole('heading', { name: /Chuẩn đầu ra học phần \(CLO & PLO\)/i })
    ).toBeVisible({ timeout: 15000 });

    // Kiểm tra danh sách CLO & PLO
    await expect(page.getByText('CLO1')).toBeVisible();
    await expect(page.getByText('CLO2')).toBeVisible();
    await expect(page.getByText('PLO1').first()).toBeVisible();

    // Mở modal thêm CLO mới
    const addCloBtn = page.getByRole('button', { name: /Thêm CLO mới/i });
    await expect(addCloBtn).toBeVisible();
    await addCloBtn.click();

    await expect(page.getByRole('heading', { name: /Thêm Chuẩn đầu ra học phần/i })).toBeVisible();
    // Đóng modal bằng nút Hủy
    await page.getByRole('button', { name: 'Hủy' }).click();

    // -------------------------------------------------------------
    // PHẦN 3: MA TRẬN BÀI ĐÁNH GIÁ & CLO (SCR-AST-03)
    // -------------------------------------------------------------
    const matrixLink = page.getByRole('button', { name: /Ma trận đánh giá/i });
    await matrixLink.click();

    await expect(page).toHaveURL(/manage\/outcomes\/mapping/, { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: /Ma trận bài đánh giá và Chuẩn đầu ra/i })
    ).toBeVisible();

    // Kiểm tra hiển thị bảng 2 chiều và các bài đánh giá
    await expect(page.getByText('Kiểm tra trắc nghiệm & tự luận Chương 1')).toBeVisible();
    await expect(page.getByText('Bài tập lớn: Thiết kế CSDL')).toBeVisible();

    const saveMatrixBtn = page.getByRole('button', { name: /Lưu ma trận/i });
    await expect(saveMatrixBtn).toBeVisible();
    await saveMatrixBtn.click();
    await expect(page.getByText(/Đã lưu ma trận ánh xạ chuẩn đầu ra thành công/i)).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 4: THỐNG KÊ KẾT QUẢ ĐÁNH GIÁ & PHỔ ĐIỂM (SCR-AST-08)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/stats');
    await expect(
      page.getByRole('heading', { name: /Thống kê kết quả đánh giá khóa học/i })
    ).toBeVisible({ timeout: 10000 });

    // Kiểm tra các phần tử thống kê
    await expect(page.getByRole('heading', { name: /Phổ điểm học viên/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mức độ đạt từng Chuẩn đầu ra/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Phân tích câu hỏi hay làm sai nhất/i })).toBeVisible();

    // Kiểm tra nút xuất báo cáo
    await expect(page.getByRole('button', { name: /Xuất bảng điểm \(CSV\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Xuất CLO \(CSV\)/i })).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 5: QUẢN LÝ ĐÁNH GIÁ & NHẬN XÉT KHÓA HỌC (SCR-AST-09)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/manage/reviews');
    await expect(
      page.getByRole('heading', { name: /Quản lý đánh giá và nhận xét khóa học/i })
    ).toBeVisible({ timeout: 10000 });

    // Điểm đánh giá trung bình
    await expect(page.getByText('4.8')).toBeVisible();

    // Lọc theo 5 sao
    const fiveStarFilter = page.getByRole('button', { name: /5 sao/i }).first();
    await fiveStarFilter.click();

    // Kiểm tra hiển thị nhận xét và phản hồi của giảng viên
    await expect(page.getByText('Trần Văn An')).toBeVisible();
    await expect(page.getByText('Khóa học rất hay và bám sát thực tế!')).toBeVisible();
    await expect(page.getByText('Phản hồi của giảng viên')).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 6: HỌC VIÊN XEM SỔ ĐIỂM CÁ NHÂN VỚI CHUẨN ĐẦU RA (SCR-AST-06)
    // -------------------------------------------------------------
    await page.goto('/courses/sample-course-1/gradebook');
    await expect(
      page.getByRole('heading', { name: /Kết quả học tập & Sổ điểm của bạn/i })
    ).toBeVisible({ timeout: 10000 });

    // Kiểm tra điểm tổng kết và xếp loại
    await expect(page.getByText('8.85')).toBeVisible();
    await expect(page.getByText('GIOI')).toBeVisible();

    // Kiểm tra khối Chuẩn đầu ra
    await expect(
      page.getByRole('heading', { name: /Mức độ đạt Chuẩn đầu ra học phần \(CLO\)/i })
    ).toBeVisible();
    await expect(page.getByText('ĐẠT TẤT CẢ CLO')).toBeVisible();
  });
});
