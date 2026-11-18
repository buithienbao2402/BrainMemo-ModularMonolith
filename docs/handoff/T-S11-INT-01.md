# Handoff: T-S11-INT-01 – Tích hợp S11 & E2E (AI GenAI Services)

## 1. Trạng thái task
- **Mã task:** `T-S11-INT-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Kịch bản E2E Playwright (`frontend/e2e/ai-generation-flow.spec.ts`)
Đã triển khai và vượt qua 100% kịch bản kiểm thử tích hợp End-to-End toàn diện cho Slice 11:
1. **Đăng nhập hệ thống:** Xác thực đăng nhập qua trang `/login`, cấu hình mock persona `user`.
2. **Sinh câu hỏi Quiz với AI (SCR-AI-01) tại Ngân hàng câu hỏi:**
   - Giảng viên truy cập `/courses/my-course-1/manage/questions`.
   - Mở modal AI (`AiGenerateModal`), kiểm tra hạn mức AI hôm nay (UTC).
   - Nhập tài liệu văn bản học phần, cấu hình độ khó và số lượng câu hỏi.
   - Bấm "Bắt đầu tạo (Quiz)", đợi AI xử lý và nhận thông báo hoàn tất sinh câu hỏi nháp (DRAFT).
   - Bấm "Xác nhận & Xem nội dung" để đóng modal an toàn.
3. **Sinh Flashcard với AI (SCR-AI-02) và Duyệt thẻ tại Trình biên tập chương:**
   - Giảng viên truy cập `/courses/my-course-1/manage/content/chapter-1111-1111`.
   - Nhấn nút "Tạo nội dung với AI" trong thanh công cụ chương học.
   - Chọn tab "Sinh Flashcard", nhập nội dung kiến thức chuyên môn.
   - Bấm "Bắt đầu tạo (Flashcard)", nhận thông báo hoàn tất sinh thẻ chờ duyệt (PENDING).
   - Xác nhận đóng modal, kiểm tra khối Flashcard hiển thị trong bài học với các thẻ học tập.
4. **Quản trị viên cấu hình hạn mức AI & LLM Provider (SCR-ADM-03):**
   - Đăng nhập quyền Admin (`admin` persona), truy cập `/admin/settings`.
   - Kiểm tra các thông số GenAI: Daily Quota và Nhà cung cấp mô hình LLM (`aiLlmProvider`).
   - Cập nhật hạn mức hàng ngày (ví dụ: 30 lượt/ngày) và nhấn "Lưu thay đổi".
   - Kiểm tra thông báo lưu thành công trên giao diện.

## 3. Kết quả kiểm thử & Độ tin cậy
- **Playwright E2E:** `pnpm --dir frontend test:e2e -- ai-generation-flow.spec.ts` -> 1 passed (100% pass).
- **Frontend AI Unit Tests:** `pnpm --dir frontend test src/features/ai/tests/aiFeature.test.tsx --run` -> 4/4 passed (100% pass).
- **Backend AI Unit Tests:** `dotnet test backend/tests/AI.UnitTests/AI.UnitTests.csproj` -> 11/11 passed (100% pass).
- **Backend Solution Build:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
