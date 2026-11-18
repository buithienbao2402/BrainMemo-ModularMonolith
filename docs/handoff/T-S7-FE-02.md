# Handoff Task T-S7-FE-02: FE Quiz Player Suite (Batched)

## 1. Mục tiêu và phạm vi đã hoàn thành
- **Thẻ bài kiểm tra & Điểm vào (SCR-LRN-02):**
  - Component `QuizBlockCard.tsx` tích hợp trong `BlockRenderer.tsx` (loại block `QUIZ`) và có thể chạy độc lập.
  - Hiển thị đầy đủ thông số: Thời gian làm bài (hoặc không giới hạn), Ngưỡng điểm đạt (%), Số lượt thi tối đa và lượt thi còn lại, Điểm cao nhất từng đạt.
  - Bảng lịch sử các lần thi: Lần thi, ngày giờ nộp bài, điểm số / tổng điểm (kèm %), trạng thái (Đạt / Chưa đạt / Đang làm), nút "Xem kết quả" dẫn tới trang kết quả.
  - Nút hành động thông minh:
    - Nếu đang có bài thi `IN_PROGRESS`: nút "Tiếp tục làm bài (Lần X)" cho phép học viên tiếp tục làm bài không tốn thêm lượt.
    - Nếu có mật khẩu bảo vệ (`hasPassword = true`): hiển thị Modal nhập mật khẩu trước khi mở đề.
    - Nếu đã hết lượt thi cho phép: disable nút và hiển thị "Đã hết số lượt thi".
    - Khi bắt đầu hoặc mở lại bài thi: điều hướng mượt mà vào `QuizPlayerPage`.

- **Giao diện Làm bài kiểm tra toàn màn hình (SCR-LRN-03):**
  - Trang `QuizPlayerPage.tsx` tại `/courses/:courseId/quiz-attempts/:attemptId` và `/quiz-attempts/:attemptId`.
  - **Thanh trạng thái trên cùng (Sticky Header):**
    - Thông tin lần thi và tổng số câu hỏi.
    - Đồng hồ đếm ngược (Countdown Timer) đồng bộ chuẩn thời gian server `deadlineAt - now`, chuyển màu cảnh báo vàng (< 5 phút) và đỏ nhấp nháy (< 1 phút). Tự động nộp bài khi thời gian về 0s.
    - Chỉ báo trạng thái tự động lưu (Autosave Status Indicator): Tự động lưu, Đang lưu (với spinner), Đã lưu lúc HH:mm:ss, Báo lỗi nếu kết nối gián đoạn.
    - Nút "Nộp bài thi".
  - **Vùng làm bài câu hỏi:**
    - Hỗ trợ đầy đủ 6 loại câu hỏi:
      1. `MULTIPLE_CHOICE`: Radio list cho câu hỏi đơn lựa chọn; Checkbox list cho câu hỏi nhiều lựa chọn (`allowMultiple = true`).
      2. `TRUE_FALSE`: 2 card Đúng / Sai trực quan.
      3. `FILL_BLANK`: Tự động tách các ô trống và cho phép nhập đáp án riêng cho từng ô.
      4. `MATCHING`: Cột thuật ngữ trái và dropdown chọn định nghĩa tương ứng vế phải.
      5. & 6. `SHORT_ESSAY` / `ESSAY`: Textarea nhập bài làm tự luận, đếm ký tự.
    - Nút "Gắn cờ xem lại" (Flag question) để đánh dấu các câu hỏi khó.
    - Điều hướng "Câu trước", "Câu sau", hoặc "Hoàn thành & Nộp".
  - **Bảng điều hướng câu hỏi (Sidebar Palette):**
    - Lưới số câu hỏi (1, 2, 3...) với các trạng thái màu rõ ràng: Đang xem (viền sáng), Đã trả lời (nền cam/primary), Chưa trả lời (viền xám), Đã gắn cờ (chấm vàng góc).
    - Bấm vào bất kỳ số câu hỏi nào để chuyển ngay đến câu đó.
    - Thống kê nhanh: số câu đã làm, số câu gắn cờ.
  - **3 Mẫu Hộp thoại xác nhận Nộp bài thi:**
    1. Hộp thoại nộp thông thường: hiển thị khi học viên đã hoàn thành tất cả các câu hỏi.
    2. Hộp thoại cảnh báo chưa làm hết: liệt kê số câu còn thiếu và nhắc nhở các câu chưa làm sẽ bị tính 0 điểm.
    3. Hộp thoại hết giờ làm bài: tự động khóa đề và gửi yêu cầu nộp bài chấm tự động.

- **Màn hình Kết quả bài kiểm tra (SCR-LRN-04):**
  - Trang `QuizResultPage.tsx` tại `/courses/:courseId/quiz-attempts/:attemptId/result` và `/quiz-attempts/:attemptId/result`.
  - Banner kết quả nổi bật: Biểu tượng cúp / thất bại, Tiêu đề ĐẠT / CHƯA ĐẠT, Điểm số lớn (ví dụ: `8.5 / 10.0` - `85%`).
  - Cảnh báo "Chờ giảng viên chấm phần tự luận" nếu có câu tự luận chưa có điểm.
  - Thông số chi tiết: Thời gian làm bài (phút, giây), số câu hỏi, trạng thái.
  - Danh sách xem lại bài làm chi tiết: Hiển thị từng câu hỏi kèm điểm đạt được (+X/Y đ), đáp án học viên đã chọn, đáp án đúng (nếu được unmask theo cấu hình `resultDisplay`), và khung Lời giải chi tiết (Explanation).

## 2. API Hooks & Mocks
- File `frontend/src/features/learning/api/quizApi.ts`:
  - `useQuizAttemptsQuery`, `useStartQuizAttemptMutation`, `useQuizAttemptQuery`, `useSaveQuizAnswerMutation`, `useSubmitQuizAttemptMutation`.
- File `frontend/mocks/handlers.ts`: Đã bổ sung đầy đủ mock handlers cho các endpoint quiz-attempts.

## 3. Kiểm thử & Đảm bảo chất lượng
- **Typecheck:** `npm --prefix frontend run typecheck` (0 errors).
- **Unit Test:** `npm --prefix frontend test -- src/features/learning/tests/quizPlayerSuite.test.tsx` (4/4 tests passed 100%).
