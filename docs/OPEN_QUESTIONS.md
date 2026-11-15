# OPEN_QUESTIONS – Xung đột & Điểm chưa rõ

> Quy tắc (`AGENT.md` §1 & §8, `DECISIONS.md`):
> - Khi gặp thiếu thông tin, mâu thuẫn tài liệu (chưa được chốt trong `DECISIONS.md`), thiếu ảnh PNG cho màn hình FE, hoặc cần thay đổi hợp đồng OpenAPI/Contracts: **DỪNG và ghi mục mới vào file này** kèm đề xuất cụ thể.
> - Không tự đoán, không tự bịa endpoint/trường/mã lỗi, không tự ý sửa `openapi/` hoặc `contracts/` nếu không phải task loại `CONTRACT`.

## Danh sách câu hỏi mở

### [OQ-01] Nguồn thiết kế Figma cho FE (`T-S0-FE-01+`) — ĐÃ GỠ CHẶN QUA FIGMA MCP
- **Trạng thái:** Đã gỡ chặn (2026-11-12).
- **Giải pháp áp dụng:** Người điều phối đã xác thực plugin **Figma** (`figma_figma` MCP) và cấp link trực tiếp [UI-BrainMemo-LMS](https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1). Thay cho `docs/design/figma-png/`, Agent đọc trực tiếp context + screenshot từ các frame Figma trong file trên cho `SCR-COM-01` (Header/SubNav/Footer Dark & Light, Profile menu, Admin Aside/Header) và hệ thống token màu/font chung.

### [OQ-02] Rà soát và đồng bộ toàn bộ 66 frame thiết kế trên Figma — ĐÃ HOÀN TẤT
- **Trạng thái:** Đã giải quyết & đồng bộ toàn diện vào `docs/FRONTEND_SPEC.md` (2026-11-15).
- **Phạm vi & Kết quả:**
  - Rà soát toàn bộ **66 top-level frames/screens/dialogs/drawers** trên `Page 1` của file Figma [UI-BrainMemo-LMS](https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1).
  - Đã lập danh mục chi tiết ánh xạ 1:1 giữa toàn bộ 66 frames Figma với mã màn hình `SCR-*`, Route, Phân quyền truy cập, API OpenAPI và các mẫu tương tác (Modal nộp bài, Drawer lịch sử phiên bản, Khóa tài khoản tạm thời/vĩnh viễn, OBE assessment matrix, Quản lý tài nguyên, Soạn thảo 10 blocks, Admin dashboard...).
  - Các màn hình `SCR-COM-02` (404) và `SCR-AUTH-01..05` (Auth flow) tuân thủ hoàn toàn hệ thống Design Tokens, bảng màu Dark/Light, typography `Merriweather` + `Inter` và CTA cam `#ff7a1a` chuẩn hóa từ Figma.
