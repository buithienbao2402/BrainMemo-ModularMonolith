# Handoff: T-S10-INT-01 – Tích hợp S10 & E2E (Moderation & Quản trị hệ thống)

## 1. Trạng thái task
- **Mã task:** `T-S10-INT-01`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Kịch bản E2E Playwright (`frontend/e2e/moderation-and-admin-flow.spec.ts`)
Đã triển khai và vượt qua 100% kịch bản kiểm thử tích hợp End-to-End toàn diện cho Slice 10:
1. **Đăng nhập người dùng:** Xác thực đăng nhập qua trang `/login`.
2. **Báo cáo vi phạm khóa học (SCR-MOD-01):**
   - Người dùng truy cập `/courses/sample-course-1`, mở modal báo cáo vi phạm (`ReportModal`).
   - Lựa chọn lý do vi phạm (`INAPPROPRIATE_CONTENT`), nhập mô tả chi tiết và gửi báo cáo vi phạm thành công.
3. **Giảng viên theo dõi báo cáo khóa học (SCR-MOD-02):**
   - Giảng viên truy cập `/courses/sample-course-1/manage/reports`.
   - Kiểm tra các chỉ số KPI báo cáo và danh sách báo cáo vi phạm liên quan đến khóa học.
   - Mở dialog kiểm tra chi tiết phản ánh của học viên và đóng dialog an toàn.
4. **Admin tổng quan trung tâm quản trị (SCR-ADM-01 Dashboard):**
   - Đăng nhập quyền Admin, truy cập `/admin`.
   - Kiểm tra các thẻ KPI: Báo cáo chờ xử lý, Cờ cảnh báo PhoBERT AI, Chế tài đang hiệu lực, Tài khoản bị khóa.
5. **Admin duyệt hàng đợi kiểm duyệt báo cáo (SCR-MOD-03):**
   - Truy cập `/admin/reports`.
   - Kiểm tra cờ phát hiện từ PhoBERT AI (badge "PhoBERT AI") và báo cáo vi phạm từ người học.
6. **Admin xem xét chi tiết & phán quyết báo cáo (SCR-MOD-04):**
   - Truy cập `/admin/reports/rep-adm-1`.
   - Kiểm tra thông tin snapshot đối tượng tại thời điểm kiểm duyệt (Preview DEC-02).
   - Kiểm tra các nút lựa chọn kết luận (Xác nhận vi phạm / Bác bỏ báo cáo) và nhập ghi chú phán quyết.
7. **Admin quản lý chế tài kỷ luật & gỡ chế tài (SCR-MOD-05):**
   - Truy cập `/admin/sanctions`.
   - Kiểm tra danh sách chế tài đang hiệu lực.
   - Thao tác mở modal Áp dụng chế tài trực tiếp và modal Gỡ chế tài với lý do kiểm toán bắt buộc.
8. **Admin tra cứu nhật ký kiểm toán hệ thống (SCR-MOD-06):**
   - Truy cập `/admin/audit-logs`.
   - Kiểm tra danh sách các sự kiện kiểm toán bất biến (`REPORT_RESOLVE`, `SANCTION_APPLY`).
   - Mở modal xem chi tiết payload JSON của bản ghi kiểm toán.
9. **Admin quản trị phân quyền & khóa tài khoản người dùng (SCR-ADM-01):**
   - Truy cập `/admin/users`.
   - Kiểm tra danh sách tài khoản, vai trò Admin/User, trạng thái khóa.
   - Thao tác mở modal kiểm soát tài khoản (Cấp/Thu hồi Admin, Khóa/Mở khóa tài khoản).
10. **Admin phát thông báo toàn hệ thống (SCR-ADM-02):**
    - Truy cập `/admin/announcements`.
    - Nhập tiêu đề và nội dung thông báo.
    - Chuyển tab Xem trước (Preview) để kiểm tra định dạng phát thanh.
    - Nhấn "Phát thông báo ngay" và xác nhận trong dialog broadcast thành công.

## 3. Kết quả kiểm thử & Độ tin cậy
- **Playwright E2E:** `npm --prefix frontend run test:e2e -- moderation-and-admin-flow.spec.ts` -> 1/1 passed (100% pass).
- **Frontend Unit Tests:** `npm --prefix frontend test -- moderationAndAdminPages.test.tsx --run` -> 9/9 passed (100% pass).
- **Frontend Build:** `npm --prefix frontend run build` -> 0 errors.
- **Backend Unit Tests:** `dotnet test backend/tests/Moderation.UnitTests/Moderation.UnitTests.csproj` -> 9/9 passed (100% pass).
- **Backend Build:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
