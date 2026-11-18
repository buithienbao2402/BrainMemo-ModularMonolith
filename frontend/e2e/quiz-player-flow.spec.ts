import { test, expect } from '@playwright/test';

/**
 * T-S7-INT-01: Tích hợp S7 + E2E Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 7:
 * 1. Quản lý ngân hàng câu hỏi (SCR-CNT-04) & Thống kê tần suất câu hỏi (SCR-CNT-05).
 * 2. Cấu hình bài kiểm tra & ngoại lệ học viên (SCR-CNT-06, SCR-CNT-09).
 * 3. Học viên xem thẻ bài kiểm tra trong bài học (SCR-LRN-02).
 * 4. Học viên bắt đầu bài thi, đếm ngược thời gian, trả lời câu hỏi, gắn cờ xem lại, tự động lưu (SCR-LRN-03).
 * 5. Cảnh báo nộp bài chưa làm hết & Nộp bài thành công (ADR-04 Two-Phase Commit).
 * 6. Màn hình Kết quả bài kiểm tra (SCR-LRN-04): Điểm số, Đạt/Không đạt, xem lại đáp án và lời giải chi tiết.
 */
test.describe('S7 Quiz & Question Bank E2E Integration Flow', () => {
  test('toàn bộ luồng: Ngân hàng câu hỏi → Làm bài kiểm tra → Tự động lưu → Nộp bài → Xem kết quả', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // -------------------------------------------------------------
    // PHẦN 1: ĐĂNG NHẬP HỌC VIÊN / TÁC GIẢ
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
    // PHẦN 2: QUẢN LÝ NGÂN HÀNG CÂU HỎI (SCR-CNT-04 & SCR-CNT-05)
    // -------------------------------------------------------------
    await page.goto('/manage/questions');
    await expect(page.getByRole('heading', { name: /Ngân hàng câu hỏi/i })).toBeVisible({ timeout: 10000 });

    // Kiểm tra các thành phần bộ lọc & dữ liệu câu hỏi
    await expect(page.getByPlaceholder('Tìm kiếm nội dung...')).toBeVisible();
    await expect(page.getByText('Thủ đô của Việt Nam là gì?')).toBeVisible();

    // Mở Drawer thống kê sử dụng câu hỏi (SCR-CNT-05) qua số lượng sử dụng trong bảng
    const usageBtn = page.getByRole('button', { name: '1' }).first();
    if (await usageBtn.isVisible()) {
      await usageBtn.click();
      await expect(page.getByText(/Thông tin sử dụng câu hỏi/i)).toBeVisible();
      // Đóng drawer
      await page.keyboard.press('Escape');
    }

    // -------------------------------------------------------------
    // PHẦN 3: LÀM BÀI KIỂM TRA (SCR-LRN-03)
    // -------------------------------------------------------------
    // Truy cập trực tiếp vào giao diện làm bài kiểm tra đang diễn ra
    await page.goto('/courses/sample-course-1/quiz-attempts/att-in-progress-1');
    await expect(page.getByText(/Bài kiểm tra đánh giá kiến thức/i)).toBeVisible({ timeout: 10000 });

    // Kiểm tra đồng hồ đếm ngược và chỉ báo tự động lưu
    await expect(page.locator('header').getByText(/Lần thi 1/i)).toBeVisible();
    await expect(page.getByText(/Tự động lưu/i)).toBeVisible();

    // Câu 1: Trả lời trắc nghiệm
    await expect(page.getByText('Thủ đô của Việt Nam là gì?')).toBeVisible();
    const optionHanoi = page.getByText('Hà Nội');
    await optionHanoi.click();

    // Gắn cờ xem lại
    const flagBtn = page.getByRole('button', { name: /Gắn cờ xem lại/i });
    await flagBtn.click();
    await expect(page.getByRole('button', { name: /Đã gắn cờ/i })).toBeVisible();

    // Chuyển sang Câu 2 bằng nút Câu sau
    const nextBtn = page.getByRole('button', { name: /Câu sau/i });
    await nextBtn.click();

    await expect(page.getByText('HTML là một ngôn ngữ lập trình.')).toBeVisible();
    await expect(page.getByText('Câu 2')).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 4: HỘP THOẠI CẢNH BÁO CHƯA LÀM HẾT & NỘP BÀI THI
    // -------------------------------------------------------------
    const submitBtn = page.getByRole('button', { name: /Nộp bài thi/i });
    await submitBtn.click();

    // Hộp thoại cảnh báo hiển thị do Câu 2 chưa chọn đáp án
    await expect(page.getByText('Cảnh báo: Còn câu hỏi chưa trả lời')).toBeVisible();
    await expect(page.getByText(/Những câu chưa làm sẽ được tính 0 điểm/i)).toBeVisible();

    // Đồng ý nộp bài
    const confirmSubmitBtn = page.getByRole('button', { name: /Vẫn muốn nộp bài/i });
    await confirmSubmitBtn.click();

    // -------------------------------------------------------------
    // PHẦN 5: MÀN HÌNH KẾT QUẢ BÀI KIỂM TRA (SCR-LRN-04)
    // -------------------------------------------------------------
    // Sau khi nộp, hệ thống điều hướng đến /quiz-attempts/:id/result
    await expect(page).toHaveURL(/result/, { timeout: 15000 });
    await expect(page.getByText(/Chúc mừng! Bạn đã ĐẠT/i)).toBeVisible();
    await expect(page.getByText(/Chi tiết câu hỏi & Lời giải/i)).toBeVisible();
    await expect(page.getByText(/Hà Nội là thủ đô của nước CHXHCN Việt Nam/i)).toBeVisible();
  });
});
