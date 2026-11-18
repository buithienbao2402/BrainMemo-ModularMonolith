# Handoff: T-S9-BE-01 – CLO/PLO Engine, Analytics & Export (Batched)

## 1. Trạng thái task
- **Mã task:** `T-S9-BE-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Các tính năng & Endpoints đã hiện thực
### A. Module Assessment (Định nghĩa chuẩn đầu ra CLO & PLO)
- **Entities & Persistence:**
  - `Clo`: Khóa chính `Id`, `CourseId`, `Code`, `Description`, `BloomLevelCode`, `LinkedPloIds` (danh sách Guid PLO liên kết), `CreatedAt`, `UpdatedAt`. Ràng buộc unique `uk_ast_clo_course_code` trên (`course_id`, `code`).
  - `Plo`: Khóa chính `Id`, `CourseId`, `Code`, `Description`, `CreatedAt`, `UpdatedAt`. Ràng buộc unique `uk_ast_plo_course_code` trên (`course_id`, `code`).
  - `ComponentOutcomeWeight`: Khóa chính `Id`, `ComponentId`, `CloId`, `Weight` (> 0). Ràng buộc unique `uk_ast_outcome_weight_component_clo` trên (`component_id`, `clo_id`).
- **Endpoints CLO:**
  - `GET /api/v1/courses/{courseId}/assessment/clos`: Lấy danh sách CLO của khóa học kèm PLO đã liên kết.
  - `POST /api/v1/courses/{courseId}/assessment/clos`: Tạo CLO mới, kiểm tra trùng lặp `Code` trong khóa học (báo 409 Conflict `CLO_CODE_EXISTS`).
  - `PUT /api/v1/courses/{courseId}/assessment/clos/{id}`: Cập nhật thông tin CLO (Code, Description, BloomLevel, LinkedPloIds).
  - `DELETE /api/v1/courses/{courseId}/assessment/clos/{id}`: Xóa CLO. Nếu có trọng số thành phần liên kết (`ComponentOutcomeWeight`), chặn xóa với mã 409 Conflict `CLO_IN_USE`.
- **Endpoints PLO:**
  - `GET /api/v1/courses/{courseId}/assessment/plos`: Lấy danh sách PLO của khóa học.
  - `POST /api/v1/courses/{courseId}/assessment/plos`: Tạo PLO mới, kiểm tra trùng mã `Code` trong khóa học (báo 409 Conflict `PLO_CODE_EXISTS`).
  - `PUT /api/v1/courses/{courseId}/assessment/plos/{id}`: Cập nhật thông tin PLO.
  - `DELETE /api/v1/courses/{courseId}/assessment/plos/{id}`: Xóa PLO và tự động gỡ bỏ tham chiếu `ploId` trong toàn bộ CLO của khóa học.

### B. Công thức tính mức độ đạt chuẩn đầu ra (Section 3.5.2)
- Hiện thực trong `GradebookCalculator`:
  - $t_i = \text{Score} / \text{MaxScore}$.
  - $\text{CloPct} = \frac{\sum (w_{ik} \cdot t_i)}{\sum w_{ik}} \times 100$.
  - Mức xếp loại CLO: Xuất sắc ($\ge 85\%$), Tốt ($70\% - 84\%$), Đạt ($50\% - 69\%$), Chưa đạt ($< 50\%$).
  - `Achieved = CloPct >= (PassThreshold ?? 50)`.
  - $\text{PloPct} = \text{Average}(\text{CloPct})$ của các CLO liên kết với PLO đó (khi `PloEnabled == true`).
  - `AllCloAchieved`: True nếu tất cả CLO của khóa học đều đạt (`Achieved == true`).
- Tự động tích hợp vào `GetMyGradebook`, `GetStudentGradebook`, `ListCourseGradebook`.

### C. Phân tích thống kê & Xuất dữ liệu đánh giá
- **Endpoints Thống kê & Báo cáo:**
  - `GET /api/v1/courses/{courseId}/assessment/stats`: Thống kê phân phối điểm (phổ điểm các mức 0-2, 2-4, 4-6, 6-8, 8-10), tỷ lệ đạt từng CLO, phân phối xếp loại học lực, và các câu hỏi khó nhất (`hardest-questions`).
  - `GET /api/v1/courses/{courseId}/assessment/export`: Xuất bảng điểm hoặc báo cáo chuẩn đầu ra theo định dạng CSV (hỗ trợ BOM UTF-8 tiếng Việt) với tham số `scope=GRADEBOOK` hoặc `scope=CLO`.

## 3. Kiểm thử & Độ tin cậy
- **Build backend:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
- **Unit Tests:**
  - `backend/tests/Assessment.UnitTests/CloAndPloEngineTests.cs`: 6 unit tests bao phủ:
    - Ràng buộc Unique Code cho CLO & PLO (`CLO_CODE_EXISTS`, `PLO_CODE_EXISTS`).
    - Chặn xóa CLO khi đang có cấu hình trọng số (`CLO_IN_USE`).
    - Tự động dọn dẹp tham chiếu PLO khi xóa PLO.
    - Công thức tính chuẩn đầu ra Mục 3.5.2 CLO & PLO, mức độ đạt và xếp loại.
    - Tạo tệp CSV xuất dữ liệu bảng điểm với UTF-8 encoding và tiêu đề chính xác.
  - Toàn bộ 22/22 unit tests của `Assessment.UnitTests` đều pass thành công.

## 4. Ghi chú tích hợp cho FE / INT
- FE màn hình `SCR-AST-02` (Ma trận CLO/PLO) và `SCR-AST-03` (Bảng thống kê & Báo cáo phổ điểm) sẽ tiêu thụ các endpoint:
  - `GET/POST/PUT/DELETE /api/v1/courses/{courseId}/assessment/clos`
  - `GET/POST/PUT/DELETE /api/v1/courses/{courseId}/assessment/plos`
  - `GET /api/v1/courses/{courseId}/assessment/stats`
  - `GET /api/v1/courses/{courseId}/assessment/export`
