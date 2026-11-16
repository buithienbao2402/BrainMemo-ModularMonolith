# Handoff: T-S8-FE-01 - FE Grading Suite & Gradebook (Batched)

## Trạng thái
- **Task ID:** `T-S8-FE-01`
- **Tên task:** FE Grading Suite & Gradebook (Batched: FE-01 + FE-02)
- **Nhánh:** `dev/kim-thuan`
- **Trạng thái:** `DONE`

## Các màn hình và tính năng đã thực hiện
1. **SCR-LRN-05: Nộp bài tập học viên (`AssignmentPlayerPage.tsx` - `/courses/:courseId/assignments/:blockId`)**
   - Soạn thảo nội dung văn bản nộp bài.
   - Đính kèm tệp tin tài liệu (PDF, Word, Zip).
   - Lưu bản nháp (`PUT /api/v1/courses/:courseId/assignments/:blockId/submission/draft`).
   - Nộp bài chính thức (`POST /api/v1/courses/:courseId/assignments/:blockId/submission/submit`).
   - Hiển thị phản hồi, điểm số và nhận xét từ giảng viên khi bài đã được chấm (`GRADED`).

2. **SCR-AST-04: Hàng đợi chấm bài (`GradingQueuePage.tsx` - `/courses/:courseId/manage/grading`)**
   - Bộ lọc danh sách theo hoạt động: Tất cả, Bài kiểm tra tự luận (`QUIZ_ATTEMPT`), Bài tập nộp file (`ASSIGNMENT`).
   - Bảng phân chia hàng đợi với tên học viên, thời gian nộp, tên hoạt động và nút dẫn vào không gian chấm bài.

3. **SCR-AST-05: Không gian chấm bài thủ công (`ManualGradingPage.tsx` - `/courses/:courseId/manage/grading/:kind/:id`)**
   - Giao diện chấm bài thi tự luận: xem câu hỏi, bài trả lời của học viên, đáp án tham khảo, nhập điểm từng câu và nhận xét tổng quan.
   - Giao diện chấm bài tập nộp: xem văn bản nộp, danh sách tệp đính kèm, nhập điểm thang 100 và nhận xét của giáo viên.

4. **SCR-AST-06: Sổ điểm cá nhân học viên (`LearnerGradebookPage.tsx` - `/courses/:courseId/gradebook`)**
   - Thẻ thống kê tổng quan: Điểm tổng kết thang 10, xếp loại học lực, trạng thái Đạt / Chưa đạt.
   - Bảng chi tiết các cột điểm thành phần: Trọng số (%), điểm cao nhất, điểm lần nộp gần nhất, điểm trung bình, điểm ghi nhận vào sổ điểm (`final`) và nhận xét của giảng viên.

5. **SCR-AST-07: Sổ điểm toàn khóa học (`CourseGradebookPage.tsx` - `/courses/:courseId/manage/gradebook`)**
   - Bảng tổng hợp tất cả học viên và tất cả cột điểm thành phần tự động co giãn theo danh sách component.
   - Tìm kiếm học viên theo tên hoặc email.
   - Xuất dữ liệu bảng điểm ra định dạng CSV (hỗ trợ UTF-8 BOM hiển thị chuẩn tiếng Việt trong Excel).

6. **SCR-AST-01: Cấu hình đánh giá & Quy tắc tính điểm (`AssessmentConfigPage.tsx` - `/courses/:courseId/manage/assessment`)**
   - Cài đặt ngưỡng đạt khóa học (thang điểm 10).
   - Chọn quy tắc tính điểm thi nhiều lần: `HIGHEST` (Điểm cao nhất), `LATEST` (Lần nộp gần nhất), `AVERAGE` (Điểm trung bình các lần).
   - Bật / tắt tính toán chuẩn đầu ra chương trình đào tạo (PLO).
   - Thiết lập bảng phân bổ trọng số % các cột điểm thành phần (cảnh báo khi tổng trọng số khác 100%).

## Kiểm thử & Xác minh chất lượng
- **Unit & Integration tests (Frontend):**
  - Chạy `npm --prefix frontend test -- gradingAndGradebookSuite` -> 6/6 tests PASS.
- **Typecheck:**
  - Chạy `npm --prefix frontend run typecheck` -> 0 errors, 0 warnings.
