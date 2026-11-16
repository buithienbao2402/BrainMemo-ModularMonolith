# Handoff: T-S8-INT-01 - Tích hợp S8 & E2E (Bài tập & Bảng điểm)

## Trạng thái
- **Task ID:** `T-S8-INT-01`
- **Tên task:** Tích hợp S8 + E2E
- **Nhánh:** `dev/kim-thuan`
- **Trạng thái:** `DONE`

## Kịch bản E2E Playwright (`frontend/e2e/grading-and-gradebook-flow.spec.ts`)
Đã triển khai và vượt qua 100% kịch bản kiểm thử tích hợp End-to-End cho toàn bộ Slice 8:
1. **Học viên nộp bài tập (SCR-LRN-05):**
   - Đăng nhập học viên `quang.tran@brainmemo.vn`.
   - Mở giao diện nộp bài tập `/courses/sample-course-1/assignments/assignment-block-1`.
   - Nhập nội dung bài làm, bấm lưu nháp ("Lưu nháp") -> hiển thị thông báo thành công.
   - Bấm nộp bài tập ("Nộp bài tập") -> hiển thị hộp thoại xác nhận -> xác nhận nộp ("Xác nhận nộp") -> hoàn tất nộp bài.
2. **Giảng viên cấu hình đánh giá (SCR-AST-01):**
   - Truy cập `/courses/sample-course-1/manage/assessment`.
   - Kiểm tra các quy tắc chọn điểm `HIGHEST` / `LATEST` / `AVERAGE` (DEC-11, DEC-13), ngưỡng đạt và bảng phân bổ trọng số điểm thành phần.
3. **Giảng viên xem hàng đợi chấm bài (SCR-AST-04):**
   - Truy cập `/courses/sample-course-1/manage/grading`.
   - Lọc theo tab "Bài tập nộp file".
   - Bấm nút "Chấm bài" dẫn trực tiếp đến không gian chấm bài tập của học viên.
4. **Giảng viên chấm bài thủ công (SCR-AST-05):**
   - Truy cập `/courses/sample-course-1/manage/grading/ASSIGNMENT/sub-assignment-demo-1`.
   - Nhập điểm số (95/100) và nhận xét chi tiết cho bài làm.
   - Bấm "Xác nhận chấm điểm" -> hiển thị thông báo thành công.
5. **Sổ điểm khóa học (SCR-AST-07):**
   - Truy cập `/courses/sample-course-1/manage/gradebook`.
   - Kiểm tra hiển thị danh sách học viên "Quang Trần", điểm số thành phần, điểm tổng kết thang 10, xếp loại học lực.
   - Nút "Xuất CSV" khả dụng.
6. **Sổ điểm cá nhân học viên (SCR-AST-06):**
   - Truy cập `/courses/sample-course-1/gradebook`.
   - Kiểm tra điểm tổng kết 8.85 / 10.0, xếp loại GIOI, trạng thái ĐẠT KHÓA HỌC.

## Kết quả kiểm thử
- **Playwright E2E:** `npm --prefix frontend run test:e2e -- grading-and-gradebook-flow.spec.ts` -> 1/1 passed (100%).
- **Frontend Unit Tests:** `npm --prefix frontend test -- gradingAndGradebookSuite` -> 6/6 passed.
- **Frontend Typecheck:** `npm --prefix frontend run typecheck` -> 0 errors.
- **Backend Build:** `dotnet build backend/BrainMemo.sln` -> 0 Warning, 0 Error.
- **Backend Unit Tests:**
  - `Assessment.UnitTests` -> 16/16 passed.
  - `Learning.UnitTests` -> 25/25 passed.
