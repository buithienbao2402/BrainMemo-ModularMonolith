# Handoff: T-S8-BE-02 – Gradebook & Evaluation Rules (Batched: BE-03)

## 1. Trạng thái task
- **Mã task:** `T-S8-BE-02`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Các tính năng & Endpoints đã hiện thực
### A. Cấu hình đánh giá môn học (`AssessmentConfig`)
- `GET /api/v1/courses/{courseId}/assessment/config`: Lấy cấu hình đánh giá của môn học (tự tạo mặc định `passThreshold = 50.0m`, `scoreSelectionRule = "HIGHEST"`, `ploEnabled = false` nếu chưa có).
- `PUT /api/v1/courses/{courseId}/assessment/config`: Cập nhật cấu hình đánh giá (ngưỡng đạt, quy tắc chọn điểm `HIGHEST`/`LATEST`/`AVERAGE`, thang xếp loại học lực, thang Bloom, bật/tắt PLO).

### B. Thành phần đánh giá & Trọng số (`AssessmentComponent`)
- `GET /api/v1/courses/{courseId}/assessment/assessable-blocks`: Danh sách các khối làm bài (Quiz/Assignment) từ Content Contract, hiển thị kèm thông tin thành phần và trọng số.
- `GET /api/v1/courses/{courseId}/assessment/components/{blockId}`: Lấy thông tin một thành phần đánh giá.
- `PUT /api/v1/courses/{courseId}/assessment/components/{blockId}`: Upsert thành phần đánh giá và trọng số môn học (`courseWeight >= 0`).
- `DELETE /api/v1/courses/{courseId}/assessment/components/{blockId}`: Gỡ thành phần khỏi cấu hình đánh giá. Trả về `409 Conflict` nếu thành phần đã có bản ghi điểm (`ast_grade_record`).

### C. Bảng điểm & Quy tắc tính điểm (`GradebookCalculator`)
- Thực hiện đầy đủ 3 quy tắc chọn điểm:
  - `HIGHEST`: Điểm cao nhất trong các lần làm bài đã chấm.
  - `LATEST`: Điểm của lần làm bài nộp gần nhất đã chấm.
  - `AVERAGE`: Điểm trung bình của các lần làm bài đã chấm.
- Thành phần quá hạn chưa làm được tự động tính **0 điểm**; thành phần chưa đến hạn không bị phạt điểm vào điểm tổng kết.
- Tự động tính điểm tổng kết khóa (`TotalGrade` thang điểm 10 theo trọng số) và xếp loại học lực (Xuất sắc, Giỏi, Khá, Trung bình, Yếu, Kém hoặc theo thang tùy biến).
- Lưu giữ bản ghi `COMPONENT_FINAL` theo DEC-11.
- **Endpoints bảng điểm:**
  - `GET /api/v1/courses/{courseId}/assessment/gradebook/me`: Bảng điểm của học viên hiện tại.
  - `GET /api/v1/courses/{courseId}/assessment/gradebook/students/{userId}`: Giảng viên xem bảng điểm của một học viên cụ thể.
  - `GET /api/v1/courses/{courseId}/assessment/gradebook`: Bảng điểm toàn khóa có phân trang.
  - `GET /api/v1/courses/{courseId}/assessment/components/{blockId}/scores`: Bảng điểm chi tiết theo từng bài kiểm tra/bài tập, hiển thị tất cả các lần làm bài kèm `highest`, `latest`, `average`, `final`.

## 3. Kiểm thử & Độ tin cậy
- **Build backend:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
- **Unit Tests:**
  - `backend/tests/Assessment.UnitTests/GradebookAndEvaluationRulesTests.cs`: 5 unit tests toàn diện cho 3 quy tắc chọn điểm (Highest, Latest, Average), xử lý quá hạn = 0, chưa đến hạn không phạt điểm, xóa thành phần conflict 409, lưu trữ cấu hình.
  - Toàn bộ 16/16 tests của `Assessment.UnitTests` đều pass.

## 4. Ghi chú tích hợp cho FE / INT
- Màn hình `SCR-AST-05` (Bảng điểm khóa học) gọi `GET /api/v1/courses/{courseId}/assessment/gradebook`.
- Màn hình `SCR-AST-07` (Bảng điểm học viên) gọi `GET /api/v1/courses/{courseId}/assessment/gradebook/students/{userId}` hoặc `.../gradebook/me`.
- Màn hình `SCR-AST-06` (Bảng điểm theo bài) gọi `GET /api/v1/courses/{courseId}/assessment/components/{blockId}/scores`.
- Màn hình cấu hình đánh giá gọi `GET/PUT /api/v1/courses/{courseId}/assessment/config` và `GET/PUT/DELETE /api/v1/courses/{courseId}/assessment/components/{blockId}`.
