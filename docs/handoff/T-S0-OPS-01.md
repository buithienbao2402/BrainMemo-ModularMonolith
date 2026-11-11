# Handoff Note – T-S0-OPS-01

- **Task:** `T-S0-OPS-01` – Khởi tạo monorepo theo `REPO_STRUCTURE`
- **Vai trò:** OPS
- **Nhánh:** `feat/T-S0-OPS-01-init-monorepo`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Chuyển 5 tài liệu đặc tả gốc vào `docs/spec/`:**
   - Di chuyển `DAC_TA_YEU_CAU_HE_THONG.md`, `THIET_KE_CSDL.md`, `SEQUENCE_DIAGRAMS.md`, `CLASS_DIAGRAM.md`, `KIEN_TRUC_HE_THONG.md` từ `docs/` sang `docs/spec/`.
   - Giữ nguyên các file điều phối và tài liệu phụ ở `docs/` (`DECISIONS.md`, `REPO_STRUCTURE.md`, `FRONTEND_SPEC.md`, `PRIORITY.md`, `BACKLOG.md`, `BACKLOG_STATUS.md`, `PROMPTS_ANTIGRAVITY.md`, `BFD.pdf`, `USE_CASE_TONG_QUAT.jpg`, `schema.sql`).
   - Khởi tạo `docs/OPEN_QUESTIONS.md`, `docs/handoff/`, `docs/design/figma-png/`.
   - Khởi tạo bảng trạng thái cho toàn bộ 92 task trong `docs/BACKLOG_STATUS.md` và đặt `T-S0-OPS-01` sang `REVIEW`.

2. **Khởi tạo cây thư mục monorepo chuẩn theo `docs/REPO_STRUCTURE.md`:**
   - `backend/src/BuildingBlocks/{BrainMemo.SharedKernel,BrainMemo.BuildingBlocks.Abstractions,BrainMemo.BuildingBlocks.Infrastructure}`
   - `backend/src/Modules/<Module>/BrainMemo.<Module>.{Api,Application,Domain,Infrastructure,Contracts}` cho đủ 10 module (`Identity`, `Profile`, `Moderation`, `Notification`, `Course`, `Content`, `Learning`, `Assessment`, `Discovery`, `AI`)
   - `backend/src/Host/BrainMemo.WebApi`
   - `backend/tests/{Architecture.Tests,<Module>.UnitTests,<Module>.IntegrationTests}`
   - `frontend/{src/app,src/shared/{api,ui,lib,hooks,i18n,styles},src/features,e2e,mocks}`
   - `ai-service/{app,models,tests}`
   - `db/seed`
   - `infra/{nginx,jenkins,env}`
   - `tools/merge-openapi`
   - Đặt `.gitkeep` trong các thư mục rỗng để Git theo dõi đúng cấu trúc.

3. **Cấu hình repo & tài liệu chạy:**
   - Tạo `.editorconfig` cho đa ngôn ngữ (C#/.NET, TypeScript/React/YAML/JSON/CSS, Python, SQL, Shell, Markdown).
   - Giữ nguyên phần `.gitignore` cho .NET/VS và bổ sung quy tắc cho `.env.*` (giữ `.env.example`, `infra/env/.env.example`), Node/pnpm/Vite/Playwright, Python/ONNX model weights và Docker volumes cục bộ (không dùng pattern `ENV/` để tránh xung đột với `infra/env/` trên Windows).
   - Cập nhật `README.md` bổ sung cấu trúc monorepo, yêu cầu môi trường và hướng dẫn chạy các thành phần.

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không chỉnh sửa `openapi/` hay `contracts/` (chưa phát sinh lệch hợp đồng).
- Không có dữ liệu seed/mock ở task này.
- `T-S0-DB-01` sẽ lấy `docs/schema.sql` đưa sang `db/schema.sql` và áp dụng `DEC-01`, `DEC-12`.
- Các task tiếp theo có thể triển khai sau khi PR này được duyệt: `T-S0-OPS-02`, `T-S0-OPS-03`, `T-S0-BE-01`.
