# Handoff: T-S9-INT-01 – Tích hợp S9 & E2E (CLO/PLO, Analytics & Reviews)

## 1. Trạng thái task
- **Mã task:** `T-S9-INT-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Kịch bản E2E Playwright (`frontend/e2e/outcomes-and-reviews-flow.spec.ts`)
Đã triển khai và vượt qua 100% kịch bản kiểm thử tích hợp End-to-End toàn diện cho Slice 9:
1. **Đăng nhập:** Đăng nhập học viên/giảng viên qua trang `/login`.
2. **Quản lý Chuẩn đầu ra (SCR-AST-02):**
   - Truy cập `/courses/sample-course-1/manage/outcomes`.
   - Kiểm tra danh sách các chuẩn CLO (`CLO1`, `CLO2`) và PLO (`PLO1`, `PLO2`).
   - Mở modal tạo mới CLO, kiểm tra các trường và đóng modal.
3. **Ma trận bài đánh giá và Chuẩn đầu ra (SCR-AST-03):**
   - Truy cập `/courses/sample-course-1/manage/outcomes/mapping`.
   - Kiểm tra bảng ma trận 2 chiều các bài kiểm tra và bài tập lớn với các chuẩn CLO.
   - Thao tác lưu ma trận ánh xạ trọng số (`Lưu ma trận`) thành công.
4. **Báo cáo thống kê đánh giá khóa học (SCR-AST-08):**
   - Truy cập `/courses/sample-course-1/manage/stats`.
   - Kiểm tra phổ điểm học viên (Histogram 5 khoảng điểm).
   - Kiểm tra mức độ đạt từng chuẩn đầu ra (CLO pass rates).
   - Kiểm tra phân tích câu hỏi học viên làm sai nhiều nhất.
   - Kiểm tra khả dụng của các nút xuất CSV ("Xuất bảng điểm (CSV)" & "Xuất CLO (CSV)").
5. **Quản lý Đánh giá & Nhận xét khóa học (SCR-AST-09):**
   - Truy cập `/courses/sample-course-1/manage/reviews`.
   - Kiểm tra chỉ số đánh giá trung bình 4.8 / 5.0 và biểu đồ phân bổ số sao.
   - Thao tác lọc theo số sao (lọc 5 sao).
   - Kiểm tra hiển thị đánh giá của học viên và phản hồi chính thức từ giảng viên.
6. **Sổ điểm cá nhân học viên xem mức độ đạt CLO (SCR-AST-06):**
   - Truy cập `/courses/sample-course-1/gradebook`.
   - Kiểm tra điểm tổng kết 8.85 / 10.0, xếp loại GIOI.
   - Kiểm tra khối hiển thị Chuẩn đầu ra (CLO) với huy hiệu "ĐẠT TẤT CẢ CLO".

## 3. Kết quả kiểm thử & Độ tin cậy
- **Playwright E2E:** `npm --prefix frontend run test:e2e -- outcomes-and-reviews-flow.spec.ts` -> 1/1 passed (100%).
- **Frontend Unit Tests:** `npm --prefix frontend run test -- src/features/assessment` -> 11/11 tests passed.
- **Frontend Typecheck:** `npm --prefix frontend run typecheck` -> 0 errors.
- **Backend Build:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
- **Backend Unit Tests:** `dotnet test backend/tests/Assessment.UnitTests/Assessment.UnitTests.csproj` -> 28/28 tests passed.
