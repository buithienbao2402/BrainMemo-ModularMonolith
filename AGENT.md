# AGENT.md – Luật làm việc chung cho mọi AI

Dự án: **BrainMemo LMS** – Modular Monolith (C# ASP.NET Core) + React/TypeScript + MySQL + R2. Nhiều AI (Claude, ChatGPT, Antigravity, …) làm chung một monorepo với vai trò **BE / FE / INT**. Bạn chỉ làm **đúng một task** mỗi lượt.

> **Quy ước Task Batching:** Danh sách task trong `docs/BACKLOG.md` và `docs/BACKLOG_STATUS.md` đã được tối ưu hóa theo phương pháp **Batching Tasks** (gộp các task con có liên quan chặt chẽ thành 1 Batched Task hoàn chỉnh). Mỗi lượt agent giải quyết **đúng 1 Batched Task** (1 mã task, 1 branch `feat/<task-id>-<slug>`, 1 PR, 1 handoff note), hoàn thành trọn vẹn tiêu chí "Hoàn thành khi" mà không phải xé vụn quy trình.

## 1. Quy trình mỗi lượt
1. Nhận prompt từ người điều phối: có **mã task** (ví dụ `T-S2-BE-03`) và (nếu FE) ảnh PNG màn hình.
2. Đọc theo bảng §2. **Không đọc/sửa thứ ngoài phạm vi task.**
3. Nếu thiếu thông tin hoặc tài liệu mâu thuẫn → **DỪNG và hỏi** (hoặc ghi `docs/OPEN_QUESTIONS.md`). Không tự đoán, không tự bịa endpoint/trường/mã lỗi.
4. Làm đúng "Hoàn thành khi" của task. Không thêm tính năng ngoài task.
5. Xuất kết quả theo §6. Ghi `docs/handoff/<task-id>.md`.
6. Cập nhật dòng task trong `docs/BACKLOG_STATUS.md` (TODO → IN_PROGRESS → REVIEW → DONE).

## 2. Đọc gì (tối thiểu)
| Vai trò | Luôn đọc | Đọc thêm theo task |
|:--|:--|:--|
| **BE** | `AGENT.md`, `docs/DECISIONS.md`, `docs/REPO_STRUCTURE.md`, `contracts/README.md` | `contracts/<module>.md`, `contracts/events.md`, `openapi/modules/<module>.yaml`, mục CSDL của module trong `docs/spec/THIET_KE_CSDL.md`, FR của module trong `DAC_TA`, sequence liên quan |
| **FE** | `AGENT.md`, `docs/DECISIONS.md`, `docs/FRONTEND_SPEC.md` | `openapi/modules/<module>.yaml`, PNG của `SCR-*` trong task, `docs/handoff/` của task BE tương ứng |
| **INT** | tất cả mục trên | task BE + FE đã DONE của chức năng, `docs/handoff/` của chúng, `e2e/` |

Thứ tự nguồn khi xung đột: **DECISIONS > DAC_TA > THIET_KE_CSDL > schema.sql > SEQUENCE > CLASS_DIAGRAM > KIEN_TRUC**. OpenAPI/Contracts là hợp đồng giữa các AI: **không sửa** trừ task loại CONTRACT.

## 3. Quyền sửa thư mục
| Vai trò | Được sửa | Cấm |
|:--|:--|:--|
| BE | `backend/`, `db/`, `ai-service/`, `docs/handoff/`, `docs/BACKLOG_STATUS.md` | `frontend/`, `openapi/`, `contracts/` |
| FE | `frontend/` (trừ `shared/api/schema.d.ts`), `docs/handoff/`, `docs/BACKLOG_STATUS.md` | `backend/`, `openapi/` |
| INT | `frontend/`, `backend/` (chỉ sửa lệch hợp đồng/bug), `e2e/`, `infra/`, `tools/`, `openapi/` (khi thực tế khác hợp đồng, kèm ghi chú) | thêm tính năng mới ngoài task |

## 4. Luật bất biến (BE)
1. Module chỉ tham chiếu `*.Contracts` của module khác. Không dùng `Domain/Application/Infrastructure` của module khác. Không FK/JOIN xuyên module; mỗi module một `DbContext` chỉ chứa bảng prefix của mình.
2. Mọi thao tác ghi quan trọng: **một transaction** + ghi Outbox cùng transaction (Course, Learning, Assessment).
3. Kiểm quyền theo thứ tự: trạng thái tài khoản → role → quyền tài nguyên; mọi API xác thực kiểm `account_status`; Only Me: chỉ chủ khóa (kể cả Admin cũng không).
4. CQRS/MediatR: Command qua `TransactionBehavior`; Query chỉ đọc. Controller mỏng, chỉ `Send()`.
5. Không lưu/log: mật khẩu, token, passcode, đáp án đúng gửi client. BCrypt cho mật khẩu/passcode; SHA-256 cho token.
6. Lỗi nghiệp vụ trả `Result`/`Error(code)`; WebApi ánh xạ ProblemDetails tiếng Việt theo `contracts/README.md` §3.
7. Phân trang ≤ 50. Thời gian UTC. UUIDv7 do ứng dụng sinh.
8. Mọi thay đổi CSDL: EF Core migration **và** cập nhật `db/schema.sql` trong cùng PR.
9. Mỗi use case: unit test (Domain/Application) + integration test (Testcontainers MySQL) cho nhánh quyền và idempotency.

## 5. Luật bất biến (FE)
1. Dữ liệu chỉ từ `shared/api` (type sinh từ OpenAPI). Cấm tự đoán endpoint/trường.
2. Giao diện bám PNG; không có PNG thì dừng.
3. Không lưu token vào localStorage. Text tiếng Việt. Xử lý lỗi theo `FRONTEND_SPEC.md` §4.
4. Mọi màn hình có đủ trạng thái: loading, empty, error, success.
5. Đáp án đúng và dữ liệu nhạy cảm không bao giờ có sẵn ở client trước thời điểm được phép.

## 6. Định dạng kết quả (AI web chat không có quyền ghi repo)
Trả về, theo thứ tự:
1. **Tóm tắt** ≤ 5 dòng: đã làm gì, giả định, điểm cần người điều phối chú ý.
2. **Danh sách file** thay đổi: `path` + (NEW|MODIFIED|DELETED).
3. **Nội dung đầy đủ từng file** trong khối code, dòng đầu ghi `// FILE: <path>` (hoặc `# FILE:` / `<!-- FILE: -->`). File sửa nhỏ: ghi rõ vùng thay (trước/sau) hoặc trả cả file nếu < 200 dòng. Không dùng "…giữ nguyên…".
4. **Cách kiểm tra**: lệnh chạy test/build và kết quả mong đợi.
5. **Handoff note** (`docs/handoff/<task-id>.md`): endpoint/handler đã làm, điểm lệch hợp đồng (nếu có), dữ liệu seed/mock, việc INT cần biết.
Người dùng Antigravity/IDE có quyền ghi: làm trực tiếp trên nhánh `feat/<task-id>-<slug>`, commit `<task-id>: <mô tả>`, mở PR.

## 7. Định nghĩa Hoàn thành (DoD)
- **BE:** build sạch, test mới + test cũ đạt, Architecture.Tests đạt, endpoint khớp `openapi/modules/*.yaml` (đường dẫn, mã trạng thái, schema, mã lỗi), migration + `schema.sql` cập nhật, handoff note.
- **FE:** typecheck/lint/build sạch, test đạt, màn hình khớp PNG + đủ 4 trạng thái, chạy được với mock, handoff note.
- **INT:** chức năng chạy end-to-end (FE thật ↔ BE thật), e2e Playwright của chức năng đạt, danh sách lệch hợp đồng đã xử lý hoặc ghi lại.

## 8. Thay đổi hợp đồng (task loại CONTRACT)
Chỉ khi hợp đồng sai/thiếu: sửa `openapi/modules/*.yaml` và/hoặc `contracts/*.md` → bundle + lint → tăng `Contract Version` → ghi `docs/handoff/CONTRACT-<n>.md` nêu ai bị ảnh hưởng. AI BE/FE **không** tự sửa mà tạo mục trong `docs/OPEN_QUESTIONS.md` kèm đề xuất.

## 9. Cấm
- Làm nhiều task một lượt; làm task có phụ thuộc chưa DONE.
- Sửa test cho khớp lỗi thay vì sửa lỗi; tắt kiểm tra/lint/architecture test.
- Commit secrets; hard-code URL, key. Dùng biến môi trường (`infra/env/.env.example`).
- Đưa vào hệ thống thứ ngoài phạm vi: RAG, tóm tắt AI, OCR/PDF AI, thanh toán, ví, Top doanh thu… (xem DAC_TA 3.10.1).

## 10. Mẫu prompt người điều phối dán vào AI web chat
```
Vai trò: <BE|FE|INT>. Task: <T-Sx-xx-nn>.
Hãy đọc AGENT.md (đính kèm) và làm đúng task trên. Tài liệu đính kèm: <liệt kê đúng file theo bảng §2>.
[FE] Ảnh PNG: <SCR-...>.
Nếu có điểm chưa rõ hoặc mâu thuẫn, hỏi tôi trước khi viết code.
```