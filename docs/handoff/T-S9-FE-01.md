# Handoff: T-S9-FE-01 – FE CLO/PLO, Analytics & Reviews (Batched)

## 1. Trạng thái task
- **Mã task:** `T-S9-FE-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Các màn hình & Tính năng đã hiện thực
### A. SCR-AST-02 – Quản lý Chuẩn đầu ra học phần (CLO & PLO)
- Route: `/courses/:courseId/manage/outcomes`
- Giao diện:
  - Bảng danh sách CLO: Mã chuẩn (Code), Cấp độ nhận thức Bloom (Nhớ, Hiểu, Vận dụng, Phân tích, Đánh giá, Sáng tạo), Mô tả chi tiết, Danh sách PLO đã ánh xạ, Thao tác Sửa/Xóa.
  - Bảng danh sách PLO: Mã chuẩn chương trình (Code), Mô tả mục tiêu, Thao tác Sửa/Xóa.
  - Modal tạo/sửa CLO kèm chọn nhanh cấp độ Bloom và checkbox liên kết PLO.
  - Modal tạo/sửa PLO.
  - Dialog xác nhận xóa với thông báo lỗi rõ ràng nếu chuẩn CLO đang được sử dụng trong ma trận bài đánh giá (409 Conflict `CLO_IN_USE`).

### B. SCR-AST-03 – Ma trận 2 chiều bài đánh giá và CLO (Mapping Matrix)
- Route: `/courses/:courseId/manage/outcomes/mapping`
- Giao diện:
  - Bảng ma trận 2 chiều: Các hàng là bài kiểm tra (Quiz) và bài tập lớn (Assignment); Các cột là các Chuẩn đầu ra CLO của khóa học.
  - Ô nhập % trọng số khóa học của bài đánh giá và % đóng góp cho từng CLO.
  - Hàng tổng cộng tính tổng % từng cột CLO và tổng trọng số toàn khóa.
  - Banner cảnh báo mềm: Cảnh báo khi tổng trọng số điểm thành phần khác 100% nhưng không chặn lưu dữ liệu.
  - Nút "Lưu ma trận": Cập nhật đồng loạt cấu hình trọng số lên backend thông qua endpoint `PUT /courses/{courseId}/assessment/components/{blockId}`.

### C. SCR-AST-08 – Thống kê kết quả đánh giá khóa học & Xuất CSV
- Route: `/courses/:courseId/manage/stats`
- Giao diện:
  - Thẻ chỉ số tổng quan: Tổng số học viên đánh giá, Tỷ lệ đạt chuẩn đầu ra trung bình toàn khóa, Số câu hỏi cần cải thiện.
  - Biểu đồ phân bố phổ điểm (Histogram): 5 khoảng điểm (0-2, 2-4, 4-6, 6-8, 8-10) với màu sắc trực quan (đỏ, vàng, xanh).
  - Mức độ đạt từng chuẩn đầu ra (CLO Pass Rates): Tiến độ hoàn thành %, số lượng học viên đạt/tổng số, huy hiệu Đạt chuẩn/Chưa đạt.
  - Phân tích câu hỏi hay làm sai nhất (Hardest Questions): Bảng câu hỏi kèm lượt làm, điểm trung bình và tỷ lệ làm sai (Error rate %).
  - Phân phối xếp loại học lực: Xuất sắc, Giỏi, Khá, Trung bình, Yếu.
  - Nút xuất dữ liệu trực tiếp: "Xuất bảng điểm (CSV)" và "Xuất CLO (CSV)" kết nối endpoint `/courses/{courseId}/assessment/export`.

### D. SCR-AST-09 – Quản lý đánh giá và nhận xét khóa học
- Route: `/courses/:courseId/manage/reviews`
- Giao diện:
  - Tổng quan điểm số trung bình (thang 5 sao) và biểu đồ phân bổ số lượng từng mức 1..5 sao.
  - Thanh lọc nhận xét theo số sao (Tất cả, 5 sao, 4 sao, 3 sao, 2 sao, 1 sao).
  - Danh sách thẻ nhận xét của học viên: Avatar, Tên, Ngày gửi, Số sao, Lời nhận xét.
  - Phản hồi của giảng viên: Hiển thị phản hồi đã gửi kèm thời gian, nút phản hồi hoặc chỉnh sửa phản hồi trực tiếp kết nối endpoint `PUT /courses/{courseId}/reviews/{id}/reply`.

### E. Nâng cấp SCR-AST-06 (Sổ điểm học viên)
- Route: `/courses/:courseId/gradebook`
- Bổ sung khối "Mức độ đạt Chuẩn đầu ra học phần (CLO)": Hiển thị chi tiết tỷ lệ % đạt từng CLO, nhãn xếp loại, thanh tiến độ và trạng thái "ĐẠT TẤT CẢ CLO" / "CHƯA ĐẠT".

## 3. Kiểm thử & Độ tin cậy
- **Frontend Typecheck:** `npm --prefix frontend run typecheck` -> 0 errors.
- **Frontend Build:** `npm --prefix frontend run build` -> Hoàn thành trong 4.03s, 0 errors.
- **Unit Tests:** `npm --prefix frontend run test -- src/features/assessment`
  - `outcomesAndReviewsSuite.test.tsx`: 5/5 tests passed.
  - `gradingAndGradebookSuite.test.tsx`: 6/6 tests passed.
  - Tổng cộng 11/11 tests passed.
