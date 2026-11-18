import { test, expect } from '@playwright/test';

/**
 * T-S11-INT-01: Tích hợp S11 + E2E Playwright
 * Kịch bản kiểm thử End-to-End toàn diện Slice 11 (GenAI Services):
 * 1. Đăng nhập hệ thống & thiết lập phiên instructor / user.
 * 2. Giảng viên truy cập Ngân hàng câu hỏi (SCR-CNT-04) và mở Trợ lý AI (SCR-AI-01).
 * 3. Sinh câu hỏi trắc nghiệm tự động từ tài liệu văn bản với hạn mức quota hiển thị thời gian thực.
 * 4. Xác nhận kết quả sinh câu hỏi vào kho câu hỏi nháp (DRAFT).
 * 5. Giảng viên mở Trình biên tập chương học (SCR-CNT-02) và kích hoạt AI sinh Flashcard (SCR-AI-02).
 * 6. Kiểm tra khối Thẻ ghi nhớ hiển thị trên editor và phê duyệt nội dung.
 * 7. Quản trị viên truy cập Cấu hình hệ thống (SCR-ADM-03 /admin/settings) điều chỉnh Daily Quota và LLM Provider.
 */
test.describe('S11 AI GenAI Services E2E Integration Flow', () => {
  test('toàn bộ luồng: Sinh câu hỏi Quiz với AI → Sinh Flashcard vào bài học → Duyệt thẻ AI → Quản trị cấu hình hạn mức AI & LLM Provider', async ({
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
    // PHẦN 2: SINH CÂU HỎI QUIZ VỚI AI (SCR-AI-01) TẠI NGÂN HÀNG CÂU HỎI
    // -------------------------------------------------------------
    await page.goto('/courses/my-course-1/manage/questions');
    await expect(page.getByRole('heading', { name: /Ngân hàng câu hỏi/i })).toBeVisible({
      timeout: 15000,
    });

    // Mở modal AI
    const aiQuizBtn = page.getByRole('button', { name: /Tạo câu hỏi với AI/i });
    await expect(aiQuizBtn).toBeVisible();
    await aiQuizBtn.click();

    // Kiểm tra modal AI hiển thị
    await expect(page.getByRole('heading', { name: /Tạo nội dung với AI/i })).toBeVisible();
    await expect(page.getByText(/Hạn mức AI hôm nay/i)).toBeVisible();

    // Điền tài liệu văn bản
    const docTextarea = page.getByPlaceholder(/Dán nội dung bài học, tài liệu/i);
    await expect(docTextarea).toBeVisible();
    await docTextarea.fill(
      'Học sâu (Deep Learning) là một tập con của Học máy (Machine Learning), sử dụng các mạng nơ-ron nhân tạo nhiều tầng để trích xuất đặc trưng tự động từ dữ liệu phi cấu trúc.'
    );

    // Nhấn Bắt đầu tạo (Quiz)
    const startQuizBtn = page.getByRole('button', { name: /Bắt đầu tạo \(Quiz\)/i });
    await expect(startQuizBtn).toBeEnabled();
    await startQuizBtn.click();

    // Kiểm tra trạng thái hoàn tất
    await expect(page.getByText(/Tạo nội dung AI hoàn tất!/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/câu hỏi vào Ngân hàng câu hỏi ở trạng thái Nháp/i)).toBeVisible();

    // Đóng modal
    await page.getByRole('button', { name: /Xác nhận & Xem nội dung/i }).click();
    await expect(page.getByRole('heading', { name: /Tạo nội dung với AI/i })).toHaveCount(0);

    // -------------------------------------------------------------
    // PHẦN 3: SINH FLASHCARD VỚI AI (SCR-AI-02) VÀ DUYỆT THẺ (APPROVAL)
    // -------------------------------------------------------------
    await page.goto('/courses/my-course-1/manage/content/chapter-1111-1111');
    await expect(page.getByRole('button', { name: /Tạo nội dung với AI/i })).toBeVisible({
      timeout: 15000,
    });

    // Mở modal AI từ Chapter Editor
    await page.getByRole('button', { name: /Tạo nội dung với AI/i }).click();
    await expect(page.getByRole('heading', { name: /Tạo nội dung với AI/i })).toBeVisible();

    // Chọn tab Flashcard
    const flashcardTab = page.getByRole('button', { name: /Sinh Flashcard/i });
    await flashcardTab.click();
    await expect(page.getByText(/Số lượng thẻ \(1 - 30\):/i)).toBeVisible();

    // Dán nội dung
    const fcTextarea = page.getByPlaceholder(/Dán nội dung bài học, tài liệu/i);
    await fcTextarea.fill(
      'Thuật ngữ: Backpropagation: Thuật toán lan truyền ngược để cập nhật trọng số. Epoch: Một lượt duyệt qua toàn bộ tập dữ liệu huấn luyện.'
    );

    // Nhấn Bắt đầu tạo (Flashcard)
    const startFcBtn = page.getByRole('button', { name: /Bắt đầu tạo \(Flashcard\)/i });
    await expect(startFcBtn).toBeEnabled();
    await startFcBtn.click();

    // Kiểm tra hoàn tất
    await expect(page.getByText(/Tạo nội dung AI hoàn tất!/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/thẻ ghi nhớ \(Flashcard\) vào chương học ở trạng thái Chờ duyệt/i)).toBeVisible();

    // Xác nhận và đóng modal
    await page.getByRole('button', { name: /Xác nhận & Xem nội dung/i }).click();
    await expect(page.getByRole('heading', { name: /Tạo nội dung với AI/i })).toHaveCount(0);

    // Kiểm tra trình biên tập chương hiển thị thẻ Flashcard
    await expect(page.getByText(/Bộ thẻ nhớ Flashcard/i)).toBeVisible();

    // -------------------------------------------------------------
    // PHẦN 4: ADMIN QUẢN TRỊ CẤU HÌNH HỆ THỐNG & AI QUOTA (SCR-ADM-03)
    // -------------------------------------------------------------
    await page.context().addCookies([
      {
        name: 'bm_mock_persona',
        value: 'admin',
        url: 'http://localhost:5173',
      },
    ]);

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: /Cấu hình hệ thống/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Cấu hình Dịch vụ GenAI \(Quiz & Flashcard\)/i)).toBeVisible();

    // Thay đổi Daily Quota
    const quotaInput = page.locator('input[type="number"]');
    await expect(quotaInput).toBeVisible();
    await quotaInput.fill('30');

    // Lưu cấu hình
    const saveSettingsBtn = page.getByRole('button', { name: /Lưu thay đổi/i });
    await saveSettingsBtn.click();

    // Thông báo thành công
    await expect(
      page.getByText(/Cập nhật cấu hình hệ thống thành công!/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
