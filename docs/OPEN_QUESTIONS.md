# OPEN_QUESTIONS – Xung đột & Điểm chưa rõ

> Quy tắc (`AGENT.md` §1 & §8, `DECISIONS.md`):
> - Khi gặp thiếu thông tin, mâu thuẫn tài liệu (chưa được chốt trong `DECISIONS.md`), thiếu ảnh PNG cho màn hình FE, hoặc cần thay đổi hợp đồng OpenAPI/Contracts: **DỪNG và ghi mục mới vào file này** kèm đề xuất cụ thể.
> - Không tự đoán, không tự bịa endpoint/trường/mã lỗi, không tự ý sửa `openapi/` hoặc `contracts/` nếu không phải task loại `CONTRACT`.

## Danh sách câu hỏi mở

### [OQ-01] Nguồn thiết kế Figma cho FE (`T-S0-FE-01+`) — ĐÃ GỠ CHẶN QUA FIGMA MCP
- **Trạng thái:** Đã gỡ chặn (2026-11-12).
- **Giải pháp áp dụng:** Người điều phối đã xác thực plugin **Figma** (`figma_figma` MCP) và cấp link trực tiếp [UI-BrainMemo-LMS](https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1). Thay cho `docs/design/figma-png/`, Agent đọc trực tiếp context + screenshot từ các frame Figma trong file trên cho `SCR-COM-01` (Header/SubNav/Footer Dark & Light, Profile menu, Admin Aside/Header) và hệ thống token màu/font chung.

### [OQ-02] Một số màn hình chưa có frame riêng trên Page 1 của file Figma
- **Phạm vi:** Rà soát toàn bộ **56** top-level frame trên `Page 1` của [UI-BrainMemo-LMS](https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1):
  - **`SCR-COM-02` (Trang 404 `*` trong `T-S0-FE-01`):** Chưa có frame riêng; hiện dựng bằng `PublicLayout` + thẻ trung tâm theo đúng design token, typography (`Merriweather` + `Inter`) và CTA cam `#ff7a1a` từ `SCR-COM-01` và frame `1:2` (`Khóa TK Vĩnh Viễn`).
  - **`SCR-AUTH-01..05` (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` cho `T-S1-FE-01`):** Chưa thấy frame riêng trên `Page 1`.
- **Đề xuất:** Nếu người điều phối bổ sung frame `SCR-COM-02` hoặc `SCR-AUTH-01..05` lên Figma (hoặc PNG vào `docs/design/figma-png/`) trước `T-S1-FE-01`, cần báo để cập nhật đúng bố cục.
