# Handoff Task T-S7-FE-01: Question Bank & Quiz Authoring Suite (Batched)

## 1. Mục tiêu và phạm vi đã hoàn thành
- **Quản lý Ngân hàng câu hỏi (SCR-CNT-04):**
  - Trang `QuestionBankPage.tsx` tại `/manage/questions` và `/courses/:courseId/manage/questions`.
  - Bộ lọc toàn diện: từ khóa tìm kiếm nội dung câu hỏi, loại câu hỏi (6 loại: `MULTIPLE_CHOICE`, `TRUE_FALSE`, `FILL_BLANK`, `MATCHING`, `SHORT_ESSAY`, `ESSAY`), thang độ khó (dễ/vừa/khó), trạng thái (`DRAFT`, `READY`, `ARCHIVED`), thẻ phân loại (tags).
  - Bảng dữ liệu câu hỏi với định dạng rõ ràng, điểm số, badge trạng thái, thao tác nhanh chuyển đổi trạng thái `DRAFT <-> READY` và lưu trữ `ARCHIVED`.
  - Nút xuất dữ liệu ngân hàng ra CSV.
  - Tích hợp Modal tạo/sửa câu hỏi, Modal nhập từ file, Drawer thống kê tần suất sử dụng.

- **Modal Soạn thảo Câu hỏi (SCR-CNT-05):**
  - `QuestionEditorModal.tsx`: Hỗ trợ đầy đủ 6 loại câu hỏi:
    1. Trắc nghiệm (`MULTIPLE_CHOICE`): cấu hình đơn lựa chọn hoặc nhiều lựa chọn, danh sách options, đánh dấu đáp án đúng, thêm/xóa option.
    2. Đúng / Sai (`TRUE_FALSE`): 2 lựa chọn cố định, chọn đáp án đúng.
    3. Điền vào chỗ trống (`FILL_BLANK`): quy định vị trí ô trống `[blank1]`, danh sách đáp án chấp nhận cho từng ô.
    4. Nối cặp (`MATCHING`): thêm các cặp vế trái - vế phải tương ứng.
    5. & 6. Tự luận ngắn / Dài (`SHORT_ESSAY`, `ESSAY`): câu hỏi, đáp án mẫu/hướng dẫn chấm chi tiết.
  - Bộ kiểm định trực tiếp (live validation) hiển thị badge `DRAFT` khi thiếu thông tin bắt buộc và tự động chuyển sang `READY` khi các tiêu chí hợp lệ được thỏa mãn.
  - Hỗ trợ thêm/xóa tag nhãn, cấu hình điểm số và độ khó.

- **Drawer Thống kê Sử dụng Câu hỏi (SCR-CNT-05):**
  - `QuestionUsageDrawer.tsx`: Hiển thị số lượng bài kiểm tra sử dụng câu hỏi, tổng số lượt làm bài, tỷ lệ trả lời đúng trung bình, và danh sách các bài thi đang sử dụng câu hỏi này.

- **Modal Nhập Câu hỏi Hàng loạt (SCR-CNT-08):**
  - `ImportQuestionsModal.tsx`: Nút tải tệp CSV mẫu chuẩn hóa, kéo thả hoặc chọn file CSV/XLSX, phân tích dữ liệu, hiển thị danh sách dòng hợp lệ và cảnh báo lỗi theo từng dòng cụ thể nếu sai định dạng.

- **Wizard Cấu hình Bài thi & Ngoại lệ Học viên (SCR-CNT-06 & SCR-CNT-09):**
  - `QuizBlockEditor.tsx`: Gồm 3 tabs trực quan:
    1. **Thông tin chung:** Thời gian làm bài, số lần làm bài tối đa, ngưỡng điểm đạt, chính sách hiển thị kết quả, mật khẩu bài thi (write-only), trộn câu hỏi / trộn đáp án, chặn quay lại câu trước.
    2. **Câu hỏi & Đề thi:** Chọn trực tiếp câu hỏi từ ngân hàng câu hỏi READY và thêm quy tắc bốc câu hỏi ngẫu nhiên theo tag/độ khó/loại câu hỏi với tính năng chống trùng lặp.
    3. **Ngoại lệ học viên (SCR-CNT-09):** Thiết lập thêm phút làm bài, thêm lượt thi hoặc gia hạn thời hạn chót cho từng học viên cụ thể (được cấp phép hoặc có lý do đặc biệt).

## 2. API Hooks & State
- Thêm các hooks trong `frontend/src/features/content/api/contentApi.ts`:
  - `useQuestionsQuery`, `useQuestionDetailQuery`, `useCreateQuestionMutation`, `useUpdateQuestionMutation`, `useUpdateQuestionStatusMutation`, `useQuestionUsageQuery`, `useImportQuestionsMutation`, `useQuizExceptionsQuery`, `useUpsertQuizExceptionMutation`, `useDeleteQuizExceptionMutation`.
- Đồng bộ query keys tại `frontend/src/shared/api/queryKeys.ts`.

## 3. Kiểm thử & Đảm bảo chất lượng
- **Typecheck:** `npm --prefix frontend run typecheck` (0 errors).
- **Unit Test:** `npm --prefix frontend test -- src/features/content/tests/questionBankAndQuizAuthoring.test.tsx` (5/5 tests passed 100%).
