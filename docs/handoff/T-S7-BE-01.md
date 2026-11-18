# Handoff Task T-S7-BE-01: Question Bank & Quiz Authoring Engine (Batched)

## 1. Mục tiêu và phạm vi đã hoàn thành
- **Ngân hàng câu hỏi (Content Module):**
  - Thực thể `Question` (`cnt_question`), `QuestionOption` (`cnt_question_option`), `QuestionTag` (`cnt_question_tag`), `QuestionBank` (`cnt_question_bank`).
  - Hỗ trợ đầy đủ 6 loại câu hỏi:
    1. `MultipleChoice`: stem, options (>= 2), allowMultiple = false (đúng 1 đáp án đúng), allowMultiple = true (>= 1 đáp án đúng).
    2. `TrueFalse`: stem, đúng 2 options, đúng 1 đáp án đúng.
    3. `FillBlank`: stem, >= 1 option, có blankNo và nội dung không rỗng.
    4. `Matching`: stem, >= 2 options, có cả content và matchContent.
    5. `ShortEssay` / `Essay`: stem, có referenceAnswer hoặc explanation.
  - Bộ kiểm định tính hợp lệ khi chuyển sang READY: `QuestionValidator.ValidateForReady(...)`. Khi vi phạm trả về mã lỗi `INVALID_STATE`.
  - Không bao giờ xóa câu hỏi, chỉ lưu trữ `ARCHIVED`. Cho phép các luồng trạng thái `DRAFT <-> READY`, `DRAFT -> ARCHIVED`, `READY -> ARCHIVED`, `ARCHIVED -> DRAFT`.
  - Phân loại độ khó và cấu hình thang độ khó của ngân hàng câu hỏi (`EASY_HARD`, `LEVEL_1_5`, `COGNITIVE_4`).
  - Lọc câu hỏi theo tag, difficultyCode, questionType, status; phân trang chuẩn `items` và `meta: { total, page, pageSize }`.
  - Thống kê sử dụng câu hỏi (`GET /api/v1/courses/{courseId}/questions/{questionId}/usage`): tra cứu các bài thi sử dụng câu hỏi.
  - Nhập câu hỏi từ CSV/Excel (`POST /api/v1/courses/{courseId}/questions/import`): phân tích từng dòng, tạo câu hỏi DRAFT, báo cáo danh sách lỗi theo từng số dòng cụ thể.
  - Xuất câu hỏi (`GET /api/v1/courses/{courseId}/questions/export?format=csv`): xuất toàn bộ danh sách câu hỏi trong ngân hàng ra file CSV.

- **Cấu hình bài thi trong chương & Bốc đề thi (Quiz Authoring Engine):**
  - Mật khẩu bài thi: Hashing BCrypt với work factor 11 (`IQuizPasswordHasher`, `BCryptQuizPasswordHasher`). Mật khẩu là write-only, không bao giờ lộ ra trong API get hay snapshot.
  - Ngoại lệ học viên (`cnt_quiz_exception`): CRUD ngoại lệ cho học viên (thêm phút, thêm lượt thi, gia hạn thời gian đóng `extendedCloseAt`).
  - Bốc đề thi (`DrawQuizQuestions` trong `IContentContract`):
    - Thu thập câu hỏi thủ công (`cnt_quiz_question`) theo thứ tự `position`.
    - Thu thập câu hỏi ngẫu nhiên theo các quy tắc `cnt_quiz_random_rule` từ ngân hàng câu hỏi READY của khóa học, lọc theo tag, difficultyCode, questionType.
    - Đảm bảo loại trừ câu hỏi đã chọn (không bao giờ trùng câu hỏi).
    - Trả lỗi `NOT_ENOUGH_QUESTIONS` nếu ngân hàng không đủ số lượng câu hỏi hợp lệ theo quy tắc.
    - Giữ nguyên thứ tự gốc tác giả soạn thảo (Content không đảo; Learning đảm nhiệm đảo thứ tự khi làm bài).
  - Xác thực mật khẩu bài thi (`VerifyQuizPassword`): kiểm tra BCrypt hash, trả lỗi `QUIZ_PASSWORD_INVALID` nếu sai.
  - API lấy danh sách quiz trong chương: `GET /api/v1/courses/{courseId}/chapters/{chapterId}/quizzes` trả về thông tin quiz blocks, quiz config và tổng số câu hỏi.

## 2. Danh sách Endpoint API đã triển khai
1. `GET /api/v1/courses/{courseId}/question-bank`: Lấy cấu hình thang độ khó của ngân hàng.
2. `PUT /api/v1/courses/{courseId}/question-bank`: Cập nhật cấu hình thang độ khó.
3. `GET /api/v1/courses/{courseId}/questions`: Lọc danh sách câu hỏi (tag, difficultyCode, type, status, page, pageSize).
4. `POST /api/v1/courses/{courseId}/questions`: Tạo câu hỏi mới (mặc định DRAFT).
5. `GET /api/v1/courses/{courseId}/questions/{questionId}`: Chi tiết câu hỏi (kèm đáp án cho Chủ khóa).
6. `PUT /api/v1/courses/{courseId}/questions/{questionId}`: Cập nhật câu hỏi.
7. `PUT /api/v1/courses/{courseId}/questions/{questionId}/status`: Thay đổi trạng thái (kiểm hợp lệ khi sang READY).
8. `GET /api/v1/courses/{courseId}/questions/{questionId}/usage`: Thống kê tần suất và vị trí sử dụng câu hỏi.
9. `POST /api/v1/courses/{courseId}/questions/import`: Nhập danh sách câu hỏi từ file CSV (báo cáo từng dòng).
10. `GET /api/v1/courses/{courseId}/questions/export`: Xuất ngân hàng câu hỏi ra file CSV.
11. `GET /api/v1/courses/{courseId}/quizzes/{blockId}/exceptions`: Danh sách ngoại lệ của bài thi.
12. `PUT /api/v1/courses/{courseId}/quizzes/{blockId}/exceptions/{userId}`: Đặt/cập nhật ngoại lệ cho học viên.
13. `DELETE /api/v1/courses/{courseId}/quizzes/{blockId}/exceptions/{userId}`: Xóa ngoại lệ của học viên.
14. `GET /api/v1/courses/{courseId}/chapters/{chapterId}/quizzes`: Danh sách các bài thi thuộc chương.

## 3. Kiểm thử tự động đã thực hiện
- `dotnet test backend/tests/Content.UnitTests/`: 98/98 tests passed 100% (thêm 14 tests mới bao phủ toàn diện 6 loại câu hỏi, import CSV, xuất CSV, ngoại lệ học viên, BCrypt password check, bốc đề thi `DrawQuizQuestions`, phòng ngừa trùng lặp và kiểm tra `NOT_ENOUGH_QUESTIONS`).
- `dotnet build backend/BrainMemo.sln`: 0 Warning(s), 0 Error(s).

## 4. Điểm cần lưu ý cho Frontend và Tích hợp (FE & INT)
- Khi gọi `PUT /api/v1/courses/{courseId}/questions/{questionId}/status` với `status: "READY"`, nếu câu hỏi chưa đủ điều kiện (ví dụ: MultipleChoice không có đáp án đúng, hoặc TrueFalse không đủ 2 đáp án), server sẽ trả về HTTP 422 với mã `INVALID_STATE` và thông điệp hướng dẫn cụ thể.
- Mật khẩu quiz khi lưu tại `SaveChapterDraft` hay `QuizConfig` là write-only; khi đọc về qua API, trường `password` luôn là `null` và có cờ boolean `hasPassword: true/false`.
- API `GET /api/v1/courses/{courseId}/chapters/{chapterId}/quizzes` trả về cả các bài thi trong chương làm việc (draft) và đã đăng tải, phục vụ cho việc hiển thị tóm tắt và điều hướng làm bài.
