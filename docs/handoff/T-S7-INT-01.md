# Handoff Task T-S7-INT-01: S7 Integration & E2E Testing Suite

## 1. Mục tiêu và phạm vi đã hoàn thành
- Tích hợp toàn diện chu trình thi cử và ngân hàng câu hỏi của Slice 7:
  1. **Ngân hàng câu hỏi (Content Module):** Quản lý câu hỏi 6 loại, lọc, chuyển trạng thái `DRAFT <-> READY`, xem thống kê tần suất sử dụng (SCR-CNT-04, SCR-CNT-05).
  2. **Soạn bài kiểm tra & Bốc đề ngẫu nhiên:** Thuật toán bốc đề theo quy tắc không trùng lặp `DrawQuizQuestions`, tính ngoại lệ học viên, bảo vệ mật khẩu BCrypt (SCR-CNT-06, SCR-CNT-09).
  3. **Thẻ bài kiểm tra & Điểm vào (SCR-LRN-02):** Hiển thị thông số thời gian, số câu, ngưỡng đạt, lịch sử điểm thi, nút Bắt đầu / Tiếp tục làm bài không hao phí lượt.
  4. **Làm bài kiểm tra & Tự động lưu (SCR-LRN-03):** Giao diện tập trung toàn màn hình, đếm ngược đồng bộ server, làm bài 6 loại câu hỏi, gắn cờ xem lại, lưu tự động debounce, bảng câu hỏi nhảy nhanh.
  5. **Nộp bài & Chấm tự động ADR-04 Two-Phase Commit:**
     - `TX1`: Ghi nhận trạng thái `SUBMITTED`.
     - `Outside TX`: Đánh giá bằng bộ chấm tự động Assessment (`MultipleChoice`, `TrueFalse`, `FillBlank`, `Matching`, `Essay`).
     - `TX2`: Cập nhật trạng thái `GRADED`, tổng điểm, chi tiết từng câu, hoàn thành block bài học và bắn sự kiện tích hợp.
  6. **Màn hình Kết quả (SCR-LRN-04):** Hiển thị cúp ĐẠT / CHƯA ĐẠT, điểm số, thời gian hoàn thành, danh sách câu hỏi kèm đáp án của học viên, đáp án đúng và lời giải chi tiết.

## 2. Kịch bản E2E Playwright
- File `frontend/e2e/quiz-player-flow.spec.ts`:
  - Bước 1: Đăng nhập học viên/tác giả.
  - Bước 2: Quản lý ngân hàng câu hỏi (`/manage/questions`), kiểm tra bộ lọc, bảng dữ liệu câu hỏi và mở Drawer thống kê sử dụng (`QuestionUsageDrawer`).
  - Bước 3: Vào làm bài kiểm tra (`/courses/sample-course-1/quiz-attempts/att-in-progress-1`), kiểm tra đồng hồ đếm ngược, chỉ báo tự động lưu, chọn đáp án trắc nghiệm, gắn cờ xem lại, chuyển sang câu tiếp theo.
  - Bước 4: Nhấn nộp bài khi còn câu chưa làm -> Kiểm tra Modal cảnh báo chưa hoàn thành -> Xác nhận nộp bài.
  - Bước 5: Kiểm tra tự động chuyển trang Kết quả bài thi (`/result`), kiểm tra banner ĐẠT, tổng điểm 10/10, danh sách câu hỏi và lời giải chi tiết.

## 3. Kết quả xác minh (100% Pass)
- **Backend Build:** `dotnet build backend/BrainMemo.sln` đa luồng mặc định (0 Warning(s), 0 Error(s)).
- **Backend Module Tests:**
  - `Content.UnitTests`: 98/98 tests passed 100%.
  - `Learning.UnitTests`: 21/21 tests passed 100%.
  - `Assessment.UnitTests`: 8/8 tests passed 100%.
- **Frontend Typecheck:** `npm --prefix frontend run typecheck` (0 errors).
- **Frontend Unit Tests:** 9/9 tests passed 100% (`questionBankAndQuizAuthoring.test.tsx` + `quizPlayerSuite.test.tsx`).
- **Playwright E2E:** `quiz-player-flow.spec.ts` passed 100% (1 passed, 4.8s).
