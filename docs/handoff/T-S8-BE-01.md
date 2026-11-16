# Handoff: T-S8-BE-01 – Assignments & Manual Grading Pipeline (Batched)

## 1. Trạng thái task
- **Mã task:** `T-S8-BE-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Các tính năng & Endpoints đã hiện thực
### A. Module Learning (Quản lý nộp bài tập học viên)
- **Entity & Persistence:**
  - `AssignmentSubmission`: Lưu trữ bài nộp (`DRAFT`, `SUBMITTED`, `GRADED`), `TextContent`, `FilesJson`, cờ `IsLate`, `SubmittedAt`.
  - Config EF `AssignmentSubmissionConfiguration` trong `LearningDbContext` (bảng `lrn_assignment_submissions`).
- **Endpoints:**
  - `GET /api/v1/courses/{courseId}/assignments/{blockId}/submission`: Lấy bài nộp cá nhân của học viên hiện tại.
  - `PUT /api/v1/courses/{courseId}/assignments/{blockId}/submission`: Lưu bản nháp (cho phép cập nhật text và tệp đính kèm khi còn là DRAFT).
  - `POST /api/v1/courses/{courseId}/assignments/{blockId}/submission/submit`: Nộp bài chính thức. Tính toán `IsLate` dựa theo hạn nộp từ `IContentContract`, đánh dấu hoàn thành block (`BlockCompletion`), và gọi `IAssessmentContract.RecordAssignmentSubmission` tạo bản ghi chấm điểm.
  - `GET /api/v1/courses/{courseId}/submissions/pending`: Giảng viên lấy danh sách bài tập đã nộp chờ chấm.

### B. Module Assessment (Quy trình chấm điểm thủ công & Hàng đợi DEC-03)
- **Endpoints:**
  - `GET /api/v1/courses/{courseId}/assessment/grading-queue`: Hàng đợi chấm thi & bài tập (lọc theo `kind=QUIZ_ATTEMPT` hoặc `kind=ASSIGNMENT`).
  - `GET /api/v1/assessment/quiz-attempts/{id}/review`: Lấy chi tiết bài thi trắc nghiệm/tự luận phục vụ chấm điểm review.
  - `PUT /api/v1/assessment/quiz-attempts/{id}/manual-grades`: Chấm điểm thủ công câu hỏi tự luận theo DEC-03. Ủy quyền lưu điểm cho từng câu qua `ILearningContract.ApplyManualQuestionGrades`, sau đó gọi `GradeQuizAttempt` để tổng hợp điểm và cập nhật bản ghi chấm điểm thành `is_fully_graded = true`.
  - `GET /api/v1/assessment/submissions/{id}/grade`: Lấy bài tập nộp để giảng viên chấm điểm.
  - `PUT /api/v1/assessment/submissions/{id}/grade`: Giảng viên nhập điểm và feedback cho bài tập nộp. Cập nhật `GradeRecord` và thông báo cho Learning Module qua `ILearningContract.MarkAssignmentGraded`.

## 3. Kiểm thử & Độ tin cậy
- **Build backend:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
- **Unit Tests:**
  - `backend/tests/Learning.UnitTests/AssignmentSubmissionTests.cs`: 4 unit tests mới (Lưu nháp, Nộp đúng hạn, Nộp trễ hạn, Danh sách chờ chấm). Toàn bộ 25/25 tests của `Learning.UnitTests` đều pass.
  - `backend/tests/Assessment.UnitTests/ManualGradingPipelineTests.cs`: 3 unit tests mới (Chấm điểm bài tập, Ràng buộc điểm tối đa, Chấm thủ công DEC-03). Toàn bộ 11/11 tests của `Assessment.UnitTests` đều pass.

## 4. Ghi chú tích hợp cho FE / INT
- Frontend sẽ gọi `GET /api/v1/courses/{courseId}/assessment/grading-queue` để hiển thị màn hình danh sách hàng đợi chờ chấm `SCR-AST-01`.
- `SCR-LRN-05` sử dụng `GET/PUT/POST /api/v1/courses/{courseId}/assignments/{blockId}/submission`.
- `SCR-AST-04` sử dụng `GET /api/v1/assessment/quiz-attempts/{id}/review` & `PUT /api/v1/assessment/quiz-attempts/{id}/manual-grades` cho bài thi trắc nghiệm/tự luận, và `GET/PUT /api/v1/assessment/submissions/{id}/grade` cho bài nộp assignment.
