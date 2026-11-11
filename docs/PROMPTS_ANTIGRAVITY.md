# PROMPTS CHO ANTIGRAVITY – Task S0 → S10

Sinh từ `docs/BACKLOG.md`, `AGENT.md`, `docs/PRIORITY.md`. Mỗi prompt = **một task**, dán vào một phiên Antigravity **mới** (không dồn nhiều task vào một phiên).

## Cách dùng

1. Mở repo trong Antigravity; chắc chắn `AGENT.md`, `docs/`, `contracts/`, `openapi/` đã có trong workspace.
2. Đi theo đúng thứ tự bảng bên dưới. Một task chỉ chạy khi các task phụ thuộc đã **DONE** trong `docs/BACKLOG_STATUS.md`.
3. Task FE: đảm bảo PNG của các `SCR-*` đã nằm trong `docs/design/figma-png/` (tên `SCR-<MOD>-<nn>__<slug>.png`). Thiếu PNG thì agent sẽ dừng.
4. Sau mỗi PR: bạn duyệt, merge, rồi chuyển task sang DONE. Mỗi slice chỉ sang slice kế khi **INT của slice đó DONE** (trừ cặp song song).
5. Prompt mặc định để agent tự mở nhánh/commit/PR; nếu bạn muốn tự commit, xoá câu đó đi.

## Thứ tự chạy & song song (theo PRIORITY.md)

| Slice | Mức | Có thể song song |
|:--|:-:|:--|
| S0 | P0 | trong slice: OPS-03 ∥ BE-01 sau OPS-01 |
| S1 | P0 | BE-02..06 sau BE-01; FE ∥ BE (dùng mock) |
| S2 | P0 | Profile ∥ Course |
| S3 | P0 | FE ∥ BE (mock) |
| S4 | P0 | – |
| S5 | P1 | ∥ S6 |
| S6 | P1 | ∥ S5 |
| S7 | P1 | – |
| S8 | P1 | – |
| S9 | P2 | ∥ S10 |
| S10 | P2 | ∥ S9 |

Đường găng: S0 → S1 → S2 → S3 → S4 → S7 → S8. S5, S6, S9, S10 chen song song nếu có thêm người/AI.

## Lưu ý trước khi chạy

- Các file ở thư mục gốc `docs/` hiện chưa nằm trong `docs/spec/`; `T-S0-OPS-01` sẽ chuyển tài liệu gốc vào `docs/spec/`. Các prompt BE/FE tham chiếu đường dẫn **sau khi** OPS-01 xong.
- `schema.sql` hiện ghi 58 bảng; `T-S0-DB-01` nâng lên 59 bảng (thêm `sys_setting`, DEC-12).
- `OPS` và `DB` không có trong bảng vai trò của AGENT.md; prompt đã gán quyền tương đương INT và BE.
- `contracts/*.md` chưa có `README` ngoài file bạn đã cung cấp cho các module; nếu thiếu `contracts/events.md` hoặc `docs/OPEN_QUESTIONS.md`, agent sẽ ghi vào OPEN_QUESTIONS.

---


# S0 – Nền tảng

## T-S0-OPS-01

```
Vai trò: OPS (quyền như INT: infra/, tools/, openapi/, e2e/). Task: T-S0-OPS-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-OPS-01-<slug ngắn>`, commit theo dạng `T-S0-OPS-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: –. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-OPS-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Khởi tạo monorepo theo REPO_STRUCTURE (thư mục, .gitignore, .editorconfig, README, đưa tài liệu vào `docs/spec`).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Cây thư mục khớp; README có hướng dẫn chạy.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

LƯU Ý RIÊNG: Tài liệu gốc (DAC_TA, THIET_KE_CSDL, SEQUENCE_DIAGRAMS, CLASS_DIAGRAM, KIEN_TRUC) chuyển vào docs/spec/; các file điều phối (DECISIONS, FRONTEND_SPEC, PRIORITY, BACKLOG...) giữ ở docs/. Giữ .gitignore hiện có (dotnet), bổ sung phần node/python.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-OPS-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-OPS-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-OPS-02

```
Vai trò: OPS (quyền như INT: infra/, tools/, openapi/, e2e/). Task: T-S0-OPS-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-OPS-02-<slug ngắn>`, commit theo dạng `T-S0-OPS-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-OPS-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-OPS-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
`infra/docker-compose.dev.yml`: MySQL 8, MinIO (bucket + lifecycle `tmp/` 24h), Mailpit, ai-service stub; `.env.example`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): `docker compose up` chạy; MySQL nạp `db/schema.sql`.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

LƯU Ý RIÊNG: Không commit secret; biến môi trường đặt trong infra/env/.env.example.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-OPS-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-OPS-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-DB-01

```
Vai trò: DB (quyền như BE: db/, backend/). Task: T-S0-DB-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-DB-01-<slug ngắn>`, commit theo dạng `T-S0-DB-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-OPS-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-DB-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Đưa `schema.sql` vào `db/`; áp dụng DEC-01 (UNIQUE đơn trên `ast_grade_record`) và DEC-12 (`sys_setting`) trong schema.sql; seed Admin đầu tiên + hướng dẫn.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Chạy sạch trên MySQL 8; 59 bảng; seed Admin.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Đọc kỹ DEC-01, DEC-12, DEC-14 trong docs/DECISIONS.md. Seed Admin = idn_user + idn_admin_grant với granted_by NULL. Đếm bảng = 59 và ghi vào handoff.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-DB-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-DB-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-BE-01

```
Vai trò: BE. Task: T-S0-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-BE-01-<slug ngắn>`, commit theo dạng `T-S0-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-OPS-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Solution + dự án BuildingBlocks: SharedKernel (Result/Error/Entity/IClock), Abstractions (mọi cổng ở contracts/README §2), Infrastructure khung (Paging, MediatR behaviors Logging/Validation/Transaction, EventBus in-process).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Build sạch; unit test cho Result/Paging.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Tuân luật phụ thuộc REPO_STRUCTURE §2. Mọi hàm contract trả Result, không ném exception nghiệp vụ.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-BE-02

```
Vai trò: BE. Task: T-S0-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-BE-02-<slug ngắn>`, commit theo dạng `T-S0-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Host `BrainMemo.WebApi`: JWT bearer, ProblemDetails tiếng Việt (ánh xạ mã lỗi §3), RateLimiter (login 5/phút/IP), CORS, `/health`, Swagger, đăng ký module động.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): `GET /health` 200; lỗi trả đúng dạng Problem.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Bảng mã lỗi ↔ HTTP ở contracts/README.md §3; DEC-16, DEC-19, DEC-20.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-BE-03

```
Vai trò: BE. Task: T-S0-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-BE-03-<slug ngắn>`, commit theo dạng `T-S0-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Outbox chung: bảng-agnostic `OutboxWriter` + `OutboxDispatcher` (HostedService) dùng cho Course/Learning/Assessment.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: ghi event cùng TX, phát sau commit, bỏ trùng theo EventId.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Đọc THIET_KE_CSDL §1.4 mục 6 và §4.9 (ADR-02); bảng crs_/lrn_/ast_outbox_event có cấu trúc giống nhau.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-BE-04

```
Vai trò: BE. Task: T-S0-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-BE-04-<slug ngắn>`, commit theo dạng `T-S0-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
`Architecture.Tests` (NetArchTest) bảo đảm luật REPO_STRUCTURE §2.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test đỏ khi vi phạm tham chiếu.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Gồm cả luật: `purpose=MODERATION_REVIEW` chỉ được truyền từ Moderation (luật 9).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-BE-05

```
Vai trò: BE. Task: T-S0-BE-05.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-BE-05-<slug ngắn>`, commit theo dạng `T-S0-BE-05: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-BE-02, T-S0-OPS-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-BE-05 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- openapi/modules/files.yaml
- contracts/events.md

NỘI DUNG TASK:
`S3FileStorage` (R2/MinIO): CreateUploadUrl/Head/Commit/CreateDownloadUrl/Delete/DeleteByPrefix + endpoint `POST /files/upload-urls` (kiểm dung lượng khai báo, whitelist đuôi theo purpose).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Integration test với MinIO.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-05, DEC-06, DEC-18. Đổi tên MinioStorageService → S3FileStorage. Prefix khóa tệp ở contracts/README.md §2.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-BE-05.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-BE-05 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-OPS-03

```
Vai trò: OPS (quyền như INT: infra/, tools/, openapi/, e2e/). Task: T-S0-OPS-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-OPS-03-<slug ngắn>`, commit theo dạng `T-S0-OPS-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-OPS-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-OPS-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
`tools/merge-openapi` + lint Redocly + script `openapi:bundle`; sinh `openapi/openapi.yaml` từ `modules/`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Bundle sạch, lint sạch, trùng schema → lỗi.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

LƯU Ý RIÊNG: Luật gộp ở REPO_STRUCTURE §5: paths trùng → lỗi; components.schemas trùng tên → lỗi; components chung ở openapi.root.yaml.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-OPS-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-OPS-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-FE-01

```
Vai trò: FE. Task: T-S0-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-FE-01-<slug ngắn>`, commit theo dạng `T-S0-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-OPS-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- PNG: docs/design/figma-png/SCR-COM-01__*.png, docs/design/figma-png/SCR-COM-02__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
Khung FE: Vite/TS/Tailwind/shadcn, router, providers, `shared/api` (openapi-fetch, single-flight refresh, errors), layout, guards, i18n vi, `gen:api`, MSW/Prism.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): `pnpm dev` chạy; hiển thị SCR-COM-01/02 khung; gen type thành công.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: FRONTEND_SPEC §1–§5, §8. Access token chỉ giữ trong bộ nhớ.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S0-OPS-04

```
Vai trò: OPS (quyền như INT: infra/, tools/, openapi/, e2e/). Task: T-S0-OPS-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S0-OPS-04-<slug ngắn>`, commit theo dạng `T-S0-OPS-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-BE-01, T-S0-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S0-OPS-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md

NỘI DUNG TASK:
Jenkinsfile: build+test BE, lint+typecheck+build FE, lint OpenAPI; Dockerfile BE/FE/ai-service; nginx.conf.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Pipeline chạy xanh trên repo trống.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S0-OPS-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S0-OPS-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S1 – Identity

## T-S1-BE-01

```
Vai trò: BE. Task: T-S1-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-01-<slug ngắn>`, commit theo dạng `T-S1-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S0 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
Identity domain + DbContext + migration khớp `idn_*`; `IIdentityContract` (GetAccountStatus, IsAdmin, GetUserSummary, FindUserIdByEmail).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Unit test Domain; contract test.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-BE-02

```
Vai trò: BE. Task: T-S1-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-02-<slug ngắn>`, commit theo dạng `T-S1-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
Register + VerifyEmail (token SHA-256, TTL cấu hình, cập nhật có điều kiện) + event `UserRegistered`, `EmailVerificationRequested`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: token dùng 1 lần, hết hạn bị từ chối, email trùng 409.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: RawToken chỉ ở bộ nhớ, không ghi DB/log/Outbox (NFR-04). DEC-26: không làm chức năng gửi lại email xác minh.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-BE-03

```
Vai trò: BE. Task: T-S1-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-03-<slug ngắn>`, commit theo dạng `T-S1-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
Login/Refresh/Logout/LogoutAll/Sessions: JWT 30', refresh cookie 14 ngày xoay vòng, cập nhật có điều kiện chống race, kiểm `account_status`, tự gỡ khóa hết hạn lúc đăng nhập.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test đồng thời 2 refresh: 1 thắng; tài khoản khóa bị chặn.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: THIET_KE_CSDL §3.1.6.3 (rotation tại chỗ). DEC-19: cookie HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-BE-04

```
Vai trò: BE. Task: T-S1-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-04-<slug ngắn>`, commit theo dạng `T-S1-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
ForgotPassword/ResetPassword/ChangePassword (+ vô hiệu token cũ cùng purpose, thu hồi phiên khi đổi mật khẩu); `GET /auth/me`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test luồng; không lộ email tồn tại.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: forgot-password luôn trả 204.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-BE-05

```
Vai trò: BE. Task: T-S1-BE-05.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-05-<slug ngắn>`, commit theo dạng `T-S1-BE-05: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S0 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-05 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/notification.md
- openapi/modules/notification.yaml
- docs/spec/THIET_KE_CSDL.md §3.4 (Notification); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.8; docs/spec/SEQUENCE_DIAGRAMS.md SD-08
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
Notification (khung): bảng `ntf_*`, handler email 3 template, `SmtpEmailSender`, `ntf_email_delivery`, retry (token: trong bộ nhớ).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Email qua Mailpit; token không vào DB/log.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Chỉ khung + email; in-app để S6. VERIFY_EMAIL/RESET_PASSWORD retry trong bộ nhớ; ACCOUNT_LOCKED retry bền vững qua DB.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-05.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-05 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-BE-06

```
Vai trò: BE. Task: T-S1-BE-06.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-BE-06-<slug ngắn>`, commit theo dạng `T-S1-BE-06: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-BE-06 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/profile.md
- openapi/modules/profile.yaml
- docs/spec/THIET_KE_CSDL.md §3.2 (Profile); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.7; docs/spec/SEQUENCE_DIAGRAMS.md SD-07
- contracts/events.md

NỘI DUNG TASK:
Profile (khung): `prf_user_profile`, handler `UserRegistered` (display name mặc định xác định), `GetDisplayInfo`, `GET/PUT /profiles/me` (chưa avatar).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Idempotent theo PK.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Display name mặc định = "Người dùng " + 6 hex ngẫu nhiên của userId (THIET_KE_CSDL §3.2.6.2).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-BE-06.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-BE-06 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-FE-01

```
Vai trò: FE. Task: T-S1-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-FE-01-<slug ngắn>`, commit theo dạng `T-S1-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/identity.yaml
- PNG: docs/design/figma-png/SCR-AUTH-01__*.png, docs/design/figma-png/SCR-AUTH-02__*.png, docs/design/figma-png/SCR-AUTH-03__*.png, docs/design/figma-png/SCR-AUTH-04__*.png, docs/design/figma-png/SCR-AUTH-05__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-AUTH-01,02,03,04,05 + guards + nạp phiên khi khởi động.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Chạy với mock; đủ 4 trạng thái.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Khởi động app: POST /auth/refresh → getMe. Chưa có BE thì dùng mock (VITE_USE_MOCK=true).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-FE-02

```
Vai trò: FE. Task: T-S1-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-FE-02-<slug ngắn>`, commit theo dạng `T-S1-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/identity.yaml
- PNG: docs/design/figma-png/SCR-AUTH-06__*.png, docs/design/figma-png/SCR-COM-03__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-AUTH-06 (đổi mật khẩu, phiên) + SCR-COM-03.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Chạy với mock.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S1-INT-01

```
Vai trò: INT. Task: T-S1-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S1-INT-01-<slug ngắn>`, commit theo dạng `T-S1-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-BE-01..06, T-S1-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S1-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/identity.md, openapi/modules/identity.yaml
- contracts/notification.md, openapi/modules/notification.yaml
- contracts/profile.md, openapi/modules/profile.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S1 + e2e Playwright "đăng ký → xác minh (Mailpit) → đăng nhập → đăng xuất".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S1-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S1-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S2 – Profile, Files, Course

## T-S2-BE-01

```
Vai trò: BE. Task: T-S2-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-BE-01-<slug ngắn>`, commit theo dạng `T-S2-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S1 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/profile.md
- openapi/modules/profile.yaml
- docs/spec/THIET_KE_CSDL.md §3.2 (Profile); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.7; docs/spec/SEQUENCE_DIAGRAMS.md SD-07
- openapi/modules/files.yaml
- contracts/events.md

NỘI DUNG TASK:
Profile hoàn chỉnh: cập nhật + avatar (`uploadKey` commit), `GetPublicProfile`, `ProfileUpdated`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test commit tệp: kiểm size/đuôi.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-05, DEC-06: bucket private, avatar trả Presigned GET TTL 1 giờ.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-BE-02

```
Vai trò: BE. Task: T-S2-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-BE-02-<slug ngắn>`, commit theo dạng `T-S2-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S1 DONE, T-S0-BE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
Course domain + migration `crs_*`; CRUD khóa, tag ≤10, bìa, xóa mềm, `revision`, Outbox `CourseUpserted(eligible, …)`; chỉ email đã xác minh được tạo.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test eligible=false không mang nội dung.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Event eligible=false KHÔNG mang tên/mô tả và không nêu lý do (D18). Dùng OutboxWriter có sẵn.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-BE-03

```
Vai trò: BE. Task: T-S2-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-BE-03-<slug ngắn>`, commit theo dạng `T-S2-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S2-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
`GetCourseAccess` (đủ luật 3.5.8.1 + ModerationReview), `GetCourseSummaries`, `ListUserCourses`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test tham số hóa bảng quy tắc 3.2.2 (chưa gồm chương).
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Đọc contracts/course.md "Quy tắc đánh giá" + DEC-02. Không cache quyền. 404 để giấu Only Me/Tạm ẩn/Đã xóa (DEC-16).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-BE-04

```
Vai trò: BE. Task: T-S2-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-BE-04-<slug ngắn>`, commit theo dạng `T-S2-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S2-BE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/profile.md
- openapi/modules/profile.yaml
- docs/spec/THIET_KE_CSDL.md §3.2 (Profile); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.7; docs/spec/SEQUENCE_DIAGRAMS.md SD-07
- contracts/events.md

NỘI DUNG TASK:
`GET /profiles/{id}/courses`, `GET /me/courses`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Only Me/Tạm ẩn không lộ ở audience PUBLIC.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-FE-01

```
Vai trò: FE. Task: T-S2-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-FE-01-<slug ngắn>`, commit theo dạng `T-S2-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S1-FE-01, T-S1-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/profile.yaml
- openapi/modules/files.yaml
- PNG: docs/design/figma-png/SCR-PRF-01__*.png, docs/design/figma-png/SCR-PRF-02__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-PRF-01, SCR-PRF-02 (kèm quy trình upload).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Quy trình upload: FRONTEND_SPEC §5.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-FE-02

```
Vai trò: FE. Task: T-S2-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-FE-02-<slug ngắn>`, commit theo dạng `T-S2-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S2-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/course.yaml
- PNG: docs/design/figma-png/SCR-CRS-02__*.png, docs/design/figma-png/SCR-CRS-03__*.png, docs/design/figma-png/SCR-CRS-01__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CRS-02 (tạo/sửa), SCR-CRS-03, SCR-CRS-01 (trang giới thiệu, nút theo `viewer`).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: RequireVerifiedEmail cho tạo khóa.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S2-INT-01

```
Vai trò: INT. Task: T-S2-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S2-INT-01-<slug ngắn>`, commit theo dạng `T-S2-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S2-BE-01..04, T-S2-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S2-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/course.md, openapi/modules/course.yaml
- contracts/profile.md, openapi/modules/profile.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S2 + e2e "tạo khóa → xem ở hồ sơ → đổi sang Only Me (người khác 404)".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S2-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S2-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S3 – Content cơ bản

## T-S3-BE-01

```
Vai trò: BE. Task: T-S3-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-BE-01-<slug ngắn>`, commit theo dạng `T-S3-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S2 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- openapi/modules/files.yaml
- contracts/events.md

NỘI DUNG TASK:
Content domain + migration `cnt_*` (đủ 15 bảng); tài nguyên: tạo (commit `uploadKey`), liệt kê, xóa mềm (RESOURCE_IN_USE), `AuthorizeResourceDownload`, `download-url`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test giới hạn ảnh 5 MB / tệp 20 MB.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-05: bỏ kiểm tra nội dung thực; giữ HEAD + dung lượng + whitelist đuôi.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S3-BE-02

```
Vai trò: BE. Task: T-S3-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-BE-02-<slug ngắn>`, commit theo dạng `T-S3-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Chương: tạo/sắp xếp/xóa mềm; **Lưu** (khóa lạc quan, ghi Block, snapshot bất biến chỉ chứa questionId, làm sạch HTML); `GET draft`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test VERSION_CONFLICT; snapshot không có đáp án.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: THIET_KE_CSDL §3.6.6.1 (luồng Lưu). Hệ thống KHÔNG tự lưu.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S3-BE-03

```
Vai trò: BE. Task: T-S3-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-BE-03-<slug ngắn>`, commit theo dạng `T-S3-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Đăng tải (điều kiện 3.6.6.3, dựng lại `cnt_published_block`), lịch sử, khôi phục; event `ChapterPublished/Deleted`; contract `GetChapterInfo/ListPublishedChapters/CountPublishedChapters/ListPublishedBlocks/GetPublishedChapterContent`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test đăng tải trọn gói; khôi phục chỉ về nháp.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: GetPublishedChapterContent không kèm đáp án.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S3-FE-01

```
Vai trò: FE. Task: T-S3-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-FE-01-<slug ngắn>`, commit theo dạng `T-S3-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/content.yaml
- PNG: docs/design/figma-png/SCR-CNT-01__*.png, docs/design/figma-png/SCR-CNT-02__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CNT-01, SCR-CNT-02 (soạn 7 loại Block nội dung + flashcard; Tiptap; **không tự lưu**; cảnh báo thoát).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Xử lý 409 VERSION_CONFLICT theo FRONTEND_SPEC §4. Lazy-load Tiptap.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S3-FE-02

```
Vai trò: FE. Task: T-S3-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-FE-02-<slug ngắn>`, commit theo dạng `T-S3-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/content.yaml
- openapi/modules/files.yaml
- PNG: docs/design/figma-png/SCR-CNT-03__*.png, docs/design/figma-png/SCR-CNT-07__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CNT-03 (lịch sử), SCR-CNT-07 (tài nguyên + upload) + xem trước nháp.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S3-INT-01

```
Vai trò: INT. Task: T-S3-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S3-INT-01-<slug ngắn>`, commit theo dạng `T-S3-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-BE-01..03, T-S3-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S3-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/content.md, openapi/modules/content.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S3 + e2e "soạn → lưu → đăng tải" + xử lý xung đột 2 tab.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S3-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S3-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S4 – Ghi danh, quyền, Learning đọc

## T-S4-BE-01

```
Vai trò: BE. Task: T-S4-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-BE-01-<slug ngắn>`, commit theo dạng `T-S4-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S3 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/events.md

NỘI DUNG TASK:
Ghi danh: enroll/leave/remove/invite(email)/accept/decide request; 5 trạng thái, cập nhật có điều kiện; Outbox `EnrollmentChanged`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test chuyển trạng thái đủ bảng 3.5.8.2 + đồng thời.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-26: mời bằng email qua FindUserIdByEmail + rate limit. Chủ khóa không có dòng enrollment.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S4-BE-02

```
Vai trò: BE. Task: T-S4-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-BE-02-<slug ngắn>`, commit theo dạng `T-S4-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
Chế độ truy cập chương: `setChapterAccess`, `unlockChapter` (rate limit), `CheckChapterAccess`, xử lý `ChapterDeleted`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): **Test ma trận khóa×chương×vai** (3.2.2) đạt.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Ma trận ở DAC_TA 3.2.2; passcode BCrypt, đổi passcode tăng passcode_version.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S4-BE-03

```
Vai trò: BE. Task: T-S4-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-BE-03-<slug ngắn>`, commit theo dạng `T-S4-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Learning (khung): `readChapter`, `completeBlock`, tiến độ chương/khóa, `CourseCompleted` (một lần), bookmark, `GetCourseProgress`, `ListInProgressCourses`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: Khách/chưa ghi danh không ghi dữ liệu; tiến độ không bị hủy khi thêm chương.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DAC_TA 3.4.1 (quy tắc hoàn thành). Learning chỉ gọi Course.CheckChapterAccess + Content.GetPublishedChapterContent/ListPublishedBlocks.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S4-FE-01

```
Vai trò: FE. Task: T-S4-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-FE-01-<slug ngắn>`, commit theo dạng `T-S4-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S2-FE-01, T-S2-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/course.yaml
- PNG: docs/design/figma-png/SCR-CRS-05__*.png, docs/design/figma-png/SCR-CRS-06__*.png, docs/design/figma-png/SCR-CRS-01__*.png, docs/design/figma-png/SCR-CRS-03__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CRS-05, SCR-CRS-06; nút ghi danh/rời/xin vào ở CRS-01; lời mời ở CRS-03.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: CRS-01 và CRS-03 đã có từ S2: chỉ bổ sung phần ghi danh/lời mời.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S4-FE-02

```
Vai trò: FE. Task: T-S4-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-FE-02-<slug ngắn>`, commit theo dạng `T-S4-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-FE-01, T-S3-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/learning.yaml
- PNG: docs/design/figma-png/SCR-LRN-01__*.png, docs/design/figma-png/SCR-LRN-07__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-LRN-01 (đọc, passcode, tiến độ, bookmark, Khách chỉ đọc), SCR-LRN-07.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: 403 PASSCODE_REQUIRED → dialog passcode. Mở Block → completeBlock chỉ khi canSaveProgress. Lighthouse ≥ 70 cho LRN-01.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S4-INT-01

```
Vai trò: INT. Task: T-S4-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S4-INT-01-<slug ngắn>`, commit theo dạng `T-S4-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-BE-01..03, T-S4-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S4-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/course.md, openapi/modules/course.yaml
- contracts/learning.md, openapi/modules/learning.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S4 + e2e "ghi danh Public → đọc → tiến độ" và "Private xin vào → duyệt → đọc; chương Protected cần passcode".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S4-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S4-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S5 – Discovery

## T-S5-BE-01

```
Vai trò: BE. Task: T-S5-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S5-BE-01-<slug ngắn>`, commit theo dạng `T-S5-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S4 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S5-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/discovery.md
- openapi/modules/discovery.yaml
- docs/spec/THIET_KE_CSDL.md §3.9 (Discovery); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.6; docs/spec/SEQUENCE_DIAGRAMS.md SD-06
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
Discovery: migration `dsc_*`; handler `CourseUpserted/CoursePermanentlyDeleted/EnrollmentChanged/ChapterPublished/ProfileUpdated` (so `revision`, idempotent).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: eligible=false xóa dòng; event cũ bị bỏ.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Discovery là bên tiêu thụ thuần, không phát event, không gọi Course trong luồng đọc.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S5-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S5-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S5-BE-02

```
Vai trò: BE. Task: T-S5-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S5-BE-02-<slug ngắn>`, commit theo dạng `T-S5-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S5-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S5-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/discovery.md
- openapi/modules/discovery.yaml
- docs/spec/THIET_KE_CSDL.md §3.9 (Discovery); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.6; docs/spec/SEQUENCE_DIAGRAMS.md SD-06
- contracts/events.md

NỘI DUNG TASK:
`getHome` (đề xuất ngẫu nhiên mỗi lần), `searchCourses` (lọc/6 sắp xếp/lịch sử), `listSearchHistory`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Only Me/Tạm ẩn/Đã xóa không bao giờ xuất hiện.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Đề xuất = RANDOM mỗi lần tải, độc lập giữa người dùng (FR-DSC-02).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S5-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S5-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S5-BE-03

```
Vai trò: BE. Task: T-S5-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S5-BE-03-<slug ngắn>`, commit theo dạng `T-S5-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S5-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S5-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/discovery.md
- openapi/modules/discovery.yaml
- docs/spec/THIET_KE_CSDL.md §3.9 (Discovery); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.6; docs/spec/SEQUENCE_DIAGRAMS.md SD-06
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
Dựng lại read model: dùng `ListCourseSnapshots/ListEnrollmentFacts` (+ job CLI).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Dựng lại ra kết quả như event.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Cần bổ sung ListEnrollmentFacts/ListNominationFacts ở Course nếu chưa có theo contracts/course.md.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S5-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S5-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S5-FE-01

```
Vai trò: FE. Task: T-S5-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S5-FE-01-<slug ngắn>`, commit theo dạng `T-S5-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S0-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S5-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/discovery.yaml
- PNG: docs/design/figma-png/SCR-DSC-01__*.png, docs/design/figma-png/SCR-DSC-02__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-DSC-01, SCR-DSC-02.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: DSC-01: khối Đề xuất không cache giữa các lần tải. DSC-02: URL giữ query. Lighthouse ≥ 70 cho DSC-01.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S5-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S5-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S5-INT-01

```
Vai trò: INT. Task: T-S5-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S5-INT-01-<slug ngắn>`, commit theo dạng `T-S5-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S5-BE-01..03, T-S5-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S5-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/discovery.md, openapi/modules/discovery.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S5 + e2e "tạo khóa Public → thấy ở trang chủ → đổi Only Me → biến mất".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

LƯU Ý RIÊNG: Slice này có thể chạy song song với S6.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S5-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S5-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S6 – Bình luận, thông báo, đề cử

## T-S6-BE-01

```
Vai trò: BE. Task: T-S6-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-BE-01-<slug ngắn>`, commit theo dạng `T-S6-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S4 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/events.md

NỘI DUNG TASK:
Bình luận: tạo/trả lời 1 cấp/sửa/xóa mềm/ghim; `CommentCreated/Deleted`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test cha cùng khóa/chương; chỉ Chủ khóa ghim.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Trả lời tối đa 1 cấp (kiểm ở ứng dụng).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S6-BE-02

```
Vai trò: BE. Task: T-S6-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-BE-02-<slug ngắn>`, commit theo dạng `T-S6-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S4 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/notification.md
- openapi/modules/notification.yaml
- docs/spec/THIET_KE_CSDL.md §3.4 (Notification); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.8; docs/spec/SEQUENCE_DIAGRAMS.md SD-08
- contracts/events.md

NỘI DUNG TASK:
Notification in-app: handler theo bảng 3.4.6.1 (ghi danh, bình luận, chương mới), list/unread/read/read-all/delete.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Idempotent (UK); lỗi không rollback nghiệp vụ.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Bảng sự kiện → thông báo ở THIET_KE_CSDL §3.4.6.1. Xóa mềm để giữ khóa chống trùng.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S6-BE-03

```
Vai trò: BE. Task: T-S6-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-BE-03-<slug ngắn>`, commit theo dạng `T-S6-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S4 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/events.md

NỘI DUNG TASK:
Đề cử + thu hồi, `NominationChanged`, `GetCourseStats`, `GetCourseLearningStats`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: mỗi người 1 đề cử hiệu lực/khóa; giữ khi rời khóa.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Thu hồi = đặt withdrawn_at; đề cử lại = chèn dòng mới.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S6-FE-01

```
Vai trò: FE. Task: T-S6-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-FE-01-<slug ngắn>`, commit theo dạng `T-S6-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/learning.yaml
- openapi/modules/notification.yaml
- PNG: docs/design/figma-png/SCR-LRN-06__*.png, docs/design/figma-png/SCR-NTF-01__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-LRN-06 (bình luận), SCR-NTF-01.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Polling unread-count 30s chỉ khi tab hiển thị (FRONTEND_SPEC §5b).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S6-FE-02

```
Vai trò: FE. Task: T-S6-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-FE-02-<slug ngắn>`, commit theo dạng `T-S6-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/course.yaml
- PNG: docs/design/figma-png/SCR-CRS-01__*.png, docs/design/figma-png/SCR-CRS-04__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
Nút đề cử ở CRS-01; SCR-CRS-04 (thống kê).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S6-INT-01

```
Vai trò: INT. Task: T-S6-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S6-INT-01-<slug ngắn>`, commit theo dạng `T-S6-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S6-BE-01..03, T-S6-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S6-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/learning.md, openapi/modules/learning.yaml
- contracts/notification.md, openapi/modules/notification.yaml
- contracts/course.md, openapi/modules/course.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S6 + e2e "bình luận → chuông báo cho Chủ khóa".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S6-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S6-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S7 – Ngân hàng câu hỏi & Quiz

## T-S7-BE-01

```
Vai trò: BE. Task: T-S7-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-BE-01-<slug ngắn>`, commit theo dạng `T-S7-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S4 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Ngân hàng câu hỏi: CRUD 6 loại (+ option/tag), thang độ khó, trạng thái DRAFT/READY/ARCHIVED, lọc, import/export Excel/CSV.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test kiểm hợp lệ khi READY.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Bảng biểu diễn đáp án theo loại: THIET_KE_CSDL §3.6.4.8. Không xóa câu hỏi, chỉ Lưu trữ.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-BE-02

```
Vai trò: BE. Task: T-S7-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-BE-02-<slug ngắn>`, commit theo dạng `T-S7-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Cấu hình Quiz trong `saveChapter` (config, câu thủ công, quy tắc ngẫu nhiên, tiên quyết, mật khẩu BCrypt), kiểm điều kiện đăng tải quiz; `DrawQuizQuestions`, `GetPublishedQuizDefinition`, `VerifyQuizPassword`, ngoại lệ học viên.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test NOT_ENOUGH_QUESTIONS; không bốc trùng.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: pass_score là phần trăm 0–100 (ADR-05). Content không đảo thứ tự câu hỏi; Learning đảo.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-BE-03

```
Vai trò: BE. Task: T-S7-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-BE-03-<slug ngắn>`, commit theo dạng `T-S7-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Learning: `startQuizAttempt` (snapshot đề + `passScorePercent`, tính `deadline_at` một lần, đảo theo cờ, ngoại lệ, tiên quyết), `getQuizAttempt`, `saveQuizAnswer` (autosave), job tự nộp hết giờ.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test deadline theo server; F5 khôi phục đúng đề; không lộ đáp án.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Rủi ro rò đáp án: viết test khẳng định response getQuizAttempt/readChapter không chứa isCorrect trước thời điểm resultDisplay cho phép.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-BE-04

```
Vai trò: BE. Task: T-S7-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-BE-04-<slug ngắn>`, commit theo dạng `T-S7-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-BE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/events.md

NỘI DUNG TASK:
Assessment (khung): migration `ast_*`; `GradeQuizAttempt` + `IGradingStrategy` (MULTIPLE_CHOICE theo cờ, TRUE_FALSE, FILL_BLANK, MATCHING, tự luận→chờ chấm tay); `ast_grade_record` upsert; nhãn Đạt/Chưa đạt.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Unit test mỗi strategy; idempotent gọi lại.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-01 (UNIQUE source_attempt_id), DEC-17 (một loại MULTIPLE_CHOICE + cờ allow_multiple). CLASS_DIAGRAM mục 2 và 4.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-BE-05

```
Vai trò: BE. Task: T-S7-BE-05.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-BE-05-<slug ngắn>`, commit theo dạng `T-S7-BE-05: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-BE-04. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-BE-05 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/notification.md
- openapi/modules/notification.yaml
- docs/spec/THIET_KE_CSDL.md §3.4 (Notification); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.8; docs/spec/SEQUENCE_DIAGRAMS.md SD-08
- contracts/events.md

NỘI DUNG TASK:
`submitQuizAttempt` theo ADR-04 (TX1+Outbox → gọi chấm ngoài TX → TX2); `RegradeQuizAttemptHandler`; handler `GradeRecorded` ở Learning; `QuizAttemptSubmitted`→hoàn thành Block; thông báo `GRADE_FEEDBACK`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test: Assessment lỗi → vẫn SUBMITTED rồi được chấm lại; hiển thị theo `resultDisplay`.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: KHÔNG giữ transaction mở khi gọi sang Assessment. CLASS_DIAGRAM mục 3 và 4.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-BE-05.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-BE-05 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-FE-01

```
Vai trò: FE. Task: T-S7-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-FE-01-<slug ngắn>`, commit theo dạng `T-S7-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S3-FE-01, T-S3-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/content.yaml
- PNG: docs/design/figma-png/SCR-CNT-04__*.png, docs/design/figma-png/SCR-CNT-05__*.png, docs/design/figma-png/SCR-CNT-08__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CNT-04, SCR-CNT-05, SCR-CNT-08.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-FE-02

```
Vai trò: FE. Task: T-S7-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-FE-02-<slug ngắn>`, commit theo dạng `T-S7-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/content.yaml
- PNG: docs/design/figma-png/SCR-CNT-06__*.png, docs/design/figma-png/SCR-CNT-09__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-CNT-06 (cấu hình Quiz trong editor, chưa gồm liên kết CLO), SCR-CNT-09.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Ô "Liên kết CLO" để S9.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-FE-03

```
Vai trò: FE. Task: T-S7-FE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-FE-03-<slug ngắn>`, commit theo dạng `T-S7-FE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S4-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-FE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/learning.yaml
- PNG: docs/design/figma-png/SCR-LRN-02__*.png, docs/design/figma-png/SCR-LRN-03__*.png, docs/design/figma-png/SCR-LRN-04__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-LRN-02, SCR-LRN-03, SCR-LRN-04 (đồng hồ, autosave, điều hướng câu).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Đồng hồ dựa deadlineAt + serverNow; autosave debounce 3s, tối đa 30s. Hiển thị "Đã nộp, đang chấm" khi gradingPending.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-FE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-FE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S7-INT-01

```
Vai trò: INT. Task: T-S7-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S7-INT-01-<slug ngắn>`, commit theo dạng `T-S7-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-BE-01..05, T-S7-FE-01..03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S7-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/content.md, openapi/modules/content.yaml
- contracts/learning.md, openapi/modules/learning.yaml
- contracts/assessment.md, openapi/modules/assessment.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S7 + e2e "tạo câu hỏi → quiz → làm → nộp → thấy điểm"; test F5 giữa bài; hết giờ tự nộp.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S7-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S7-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S8 – Bài tập, chấm tay, bảng điểm

## T-S8-BE-01

```
Vai trò: BE. Task: T-S8-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-BE-01-<slug ngắn>`, commit theo dạng `T-S8-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S7 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- openapi/modules/files.yaml
- contracts/events.md

NỘI DUNG TASK:
Bài tập: cấu hình (đã có trong editor), `getMySubmission/saveSubmissionDraft/submitAssignment` (tệp qua `uploadKey`, `is_late`), `AssignmentSubmitted`; Assessment tạo grade_record chờ chấm.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Không nộp lại; tệp ≤ giới hạn.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Mỗi người một bản nộp mỗi bài tập (ALREADY_SUBMITTED 409).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S8-BE-02

```
Vai trò: BE. Task: T-S8-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-BE-02-<slug ngắn>`, commit theo dạng `T-S8-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S8-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/events.md

NỘI DUNG TASK:
**Chấm tay (DEC-03):** `listGradingQueue`, `getAttemptForReview`, `gradeAttemptManually` (→ `Learning.ApplyManualQuestionGrades` → `GradeQuizAttempt`), `gradeSubmission` (→ `MarkAssignmentGraded`).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test points ≤ max; `GradeRecorded` khi hết chờ; Learning cập nhật GRADED.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Đọc DEC-03 trong docs/DECISIONS.md. ApplyManualQuestionGrades không đổi status attempt.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S8-BE-03

```
Vai trò: BE. Task: T-S8-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-BE-03-<slug ngắn>`, commit theo dạng `T-S8-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S8-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/events.md

NỘI DUNG TASK:
Cấu hình đánh giá (`assessment/config`), component upsert (trọng số), `COMPONENT_FINAL` theo quy tắc khóa, bảng điểm (me/student/khóa/theo bài) kèm highest/latest/average, xếp loại.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test 3 quy tắc chọn điểm; thành phần quá hạn chưa làm = 0.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-11, DEC-13. highest/latest/average tính khi đọc.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S8-FE-01

```
Vai trò: FE. Task: T-S8-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-FE-01-<slug ngắn>`, commit theo dạng `T-S8-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S7-FE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/learning.yaml
- openapi/modules/assessment.yaml
- PNG: docs/design/figma-png/SCR-LRN-05__*.png, docs/design/figma-png/SCR-AST-06__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-LRN-05, SCR-AST-06.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S8-FE-02

```
Vai trò: FE. Task: T-S8-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-FE-02-<slug ngắn>`, commit theo dạng `T-S8-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S8-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/assessment.yaml
- PNG: docs/design/figma-png/SCR-AST-01__*.png, docs/design/figma-png/SCR-AST-04__*.png, docs/design/figma-png/SCR-AST-05__*.png, docs/design/figma-png/SCR-AST-07__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-AST-01, SCR-AST-04, SCR-AST-05, SCR-AST-07 (không gồm xuất file).

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Xuất file để S9.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S8-INT-01

```
Vai trò: INT. Task: T-S8-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S8-INT-01-<slug ngắn>`, commit theo dạng `T-S8-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S8-BE-01..03, T-S8-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S8-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/assessment.md, openapi/modules/assessment.yaml
- contracts/learning.md, openapi/modules/learning.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S8 + e2e "nộp bài tập → chấm → học viên thấy điểm/nhận xét; quiz tự luận chấm tay".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S8-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S8-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S9 – Chuẩn đầu ra, thống kê, đánh giá khóa

## T-S9-BE-01

```
Vai trò: BE. Task: T-S9-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-BE-01-<slug ngắn>`, commit theo dạng `T-S9-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S8 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/events.md

NỘI DUNG TASK:
CLO/PLO CRUD, Bloom, bật PLO, mức đạt tùy biến; `linked_plo_ids`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test ràng buộc UK(course,code).
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-BE-02

```
Vai trò: BE. Task: T-S9-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-BE-02-<slug ngắn>`, commit theo dạng `T-S9-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S9-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Liên kết CLO qua `upsertComponent.cloWeights` (thay thế toàn bộ); `listAssessableBlocks`; xử lý `ChapterPublished.removedBlockIds`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test dùng từ 2 điểm vào cho cùng kết quả.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-09: cả màn Content và màn Chuẩn đầu ra cùng gọi PUT /courses/{id}/assessment/components/{blockId}.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-BE-03

```
Vai trò: BE. Task: T-S9-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-BE-03-<slug ngắn>`, commit theo dạng `T-S9-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S9-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/events.md

NỘI DUNG TASK:
Tính mức đạt CLO/PLO khi đọc (công thức 3.5.2, đóng góp từng bài), đạt chuẩn đầu ra khóa.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test số học theo ví dụ ≥ 3 bộ dữ liệu.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Công thức: DAC_TA 3.5.2. pass_score (bài) ≠ pass_threshold (CLO/tổng kết). CLASS_DIAGRAM mục 1–2 (ICloAchievementCalculator).

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-BE-04

```
Vai trò: BE. Task: T-S9-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-BE-04-<slug ngắn>`, commit theo dạng `T-S9-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S9-BE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/content.md
- openapi/modules/content.yaml
- docs/spec/THIET_KE_CSDL.md §3.6 (Content); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.3; docs/spec/SEQUENCE_DIAGRAMS.md SD-03
- contracts/events.md

NỘI DUNG TASK:
Thống kê (`getAssessmentStats`, `getQuestionUsage` qua `GetQuestionUsageStats`), xuất Excel/PDF.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): File mở được; số liệu khớp.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-BE-05

```
Vai trò: BE. Task: T-S9-BE-05.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-BE-05-<slug ngắn>`, commit theo dạng `T-S9-BE-05: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S8 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-BE-05 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/assessment.md
- openapi/modules/assessment.yaml
- docs/spec/THIET_KE_CSDL.md §3.8 (Assessment); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.5; docs/spec/SEQUENCE_DIAGRAMS.md SD-05
- contracts/discovery.md
- openapi/modules/discovery.yaml
- docs/spec/THIET_KE_CSDL.md §3.9 (Discovery); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.6; docs/spec/SEQUENCE_DIAGRAMS.md SD-06
- contracts/events.md

NỘI DUNG TASK:
Đánh giá khóa: upsert (Đang học), trả lời, trung bình; Outbox `CourseReview*`; handler ở Discovery.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): UK 1 đánh giá/người/khóa.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Created chỉ phát khi tạo mới; Updated chỉ cập nhật avg_rating, không tạo fact.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-BE-05.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-BE-05 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-FE-01

```
Vai trò: FE. Task: T-S9-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-FE-01-<slug ngắn>`, commit theo dạng `T-S9-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S8-FE-02, T-S7-FE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/assessment.yaml
- openapi/modules/content.yaml
- PNG: docs/design/figma-png/SCR-AST-02__*.png, docs/design/figma-png/SCR-AST-03__*.png, docs/design/figma-png/SCR-CNT-06__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-AST-02, SCR-AST-03; ô "Liên kết CLO" ở SCR-CNT-06.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Cảnh báo tổng trọng số ≠ 100 nhưng không chặn.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-FE-02

```
Vai trò: FE. Task: T-S9-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-FE-02-<slug ngắn>`, commit theo dạng `T-S9-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S9-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/assessment.yaml
- PNG: docs/design/figma-png/SCR-AST-08__*.png, docs/design/figma-png/SCR-AST-07__*.png, docs/design/figma-png/SCR-AST-09__*.png, docs/design/figma-png/SCR-AST-06__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-AST-08, xuất báo cáo ở AST-07, SCR-AST-09, hiển thị CLO ở AST-06.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S9-INT-01

```
Vai trò: INT. Task: T-S9-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S9-INT-01-<slug ngắn>`, commit theo dạng `T-S9-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S9-BE-01..05, T-S9-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S9-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/assessment.md, openapi/modules/assessment.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S9 + e2e "tạo CLO → liên kết bài (từ cả 2 màn) → học viên thấy mức đạt".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

LƯU Ý RIÊNG: Slice này có thể chạy song song với S10.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S9-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S9-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```


# S10 – Moderation & Quản trị

## T-S10-BE-01

```
Vai trò: BE. Task: T-S10-BE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-BE-01-<slug ngắn>`, commit theo dạng `T-S10-BE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: Toàn bộ slice T-S6 DONE. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-BE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/identity.md
- openapi/modules/identity.yaml
- docs/spec/THIET_KE_CSDL.md §3.1 (Identity); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.1; docs/spec/SEQUENCE_DIAGRAMS.md SD-01
- contracts/notification.md
- openapi/modules/notification.yaml
- docs/spec/THIET_KE_CSDL.md §3.4 (Notification); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.8; docs/spec/SEQUENCE_DIAGRAMS.md SD-08
- contracts/events.md

NỘI DUNG TASK:
Identity admin: `adminListUsers`, grant/revoke Admin (khóa dòng, Admin ACTIVE cuối), `LockAccount/UnlockAccount`, job tự gỡ khóa hết hạn, event `AccountLocked/Unlocked` + email khóa.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test đua 2 Admin thu hồi nhau; SELF_LOCK; LAST_ADMIN.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: THIET_KE_CSDL §3.1.6.2 (khóa FOR UPDATE theo id). Kiểm "Admin cuối" phải nằm trong LockAccount, không dựa IsLastAdmin.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-BE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-BE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-BE-02

```
Vai trò: BE. Task: T-S10-BE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-BE-02-<slug ngắn>`, commit theo dạng `T-S10-BE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-BE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-BE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/moderation.md
- openapi/modules/moderation.yaml
- docs/spec/THIET_KE_CSDL.md §3.3 (Moderation); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.9; docs/spec/SEQUENCE_DIAGRAMS.md SD-09
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- openapi/modules/files.yaml
- contracts/events.md

NỘI DUNG TASK:
`IModerationTransaction` + Moderation: migration `mod_*`; `createReport` (chống trùng, rate limit, bằng chứng `uploadKey`), `ResolveReportTarget` ở Course/Learning.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test DUPLICATE_REPORT; Only Me → 404.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: DEC-04 + ADR-03: chỉ luồng chế tài của Moderation dùng chung connection/transaction. Làm IModerationTransaction + test rollback TRƯỚC khi viết chế tài.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-BE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-BE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-BE-03

```
Vai trò: BE. Task: T-S10-BE-03.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-BE-03-<slug ngắn>`, commit theo dạng `T-S10-BE-03: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-BE-02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-BE-03 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/learning.md
- openapi/modules/learning.yaml
- docs/spec/THIET_KE_CSDL.md §3.7 (Learning); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.4; docs/spec/SEQUENCE_DIAGRAMS.md SD-04, SD-05
- contracts/moderation.md
- openapi/modules/moderation.yaml
- docs/spec/THIET_KE_CSDL.md §3.3 (Moderation); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.9; docs/spec/SEQUENCE_DIAGRAMS.md SD-09
- contracts/events.md

NỘI DUNG TASK:
Course: `HideCourse/RestoreCourse/PermanentlyDeleteCourse` (+ `CoursePermanentlyDeleted` dọn module khác + tệp); Learning: `SoftDeleteComment/RestoreComment`.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test Only Me không ẩn được; dọn tệp theo tiền tố.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Các module bị gọi phải tham gia transaction ngoài (ExternalTransaction). Mọi module nhận CoursePermanentlyDeleted xử lý idempotent.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-BE-03.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-BE-03 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-BE-04

```
Vai trò: BE. Task: T-S10-BE-04.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-BE-04-<slug ngắn>`, commit theo dạng `T-S10-BE-04: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-BE-03. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-BE-04 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/moderation.md
- openapi/modules/moderation.yaml
- docs/spec/THIET_KE_CSDL.md §3.3 (Moderation); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.9; docs/spec/SEQUENCE_DIAGRAMS.md SD-09
- contracts/events.md

NỘI DUNG TASK:
`adminResolveReport` một transaction (rollback khi Contract từ chối), sanction, audit log INSERT-only, `ReportResolved`, hàng đợi/audit/dashboard, job hết hạn Tạm ẩn.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Test rollback toàn bộ; audit bất biến.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Luồng: cập nhật mod_report (WHERE status=PENDING) → chèn sanction → gọi Contract → chèn audit → COMMIT → phát ReportResolved. Tài khoản DB ứng dụng chỉ INSERT/SELECT trên mod_audit_log.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-BE-04.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-BE-04 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-BE-05

```
Vai trò: BE. Task: T-S10-BE-05.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-BE-05-<slug ngắn>`, commit theo dạng `T-S10-BE-05: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-BE-04. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-BE-05 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- contracts/README.md
- contracts/moderation.md
- openapi/modules/moderation.yaml
- docs/spec/THIET_KE_CSDL.md §3.3 (Moderation); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.9; docs/spec/SEQUENCE_DIAGRAMS.md SD-09
- contracts/notification.md
- openapi/modules/notification.yaml
- docs/spec/THIET_KE_CSDL.md §3.4 (Notification); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.8; docs/spec/SEQUENCE_DIAGRAMS.md SD-08
- contracts/course.md
- openapi/modules/course.yaml
- docs/spec/THIET_KE_CSDL.md §3.5 (Course); docs/spec/DAC_TA_YEU_CAU_HE_THONG.md §3.2; docs/spec/SEQUENCE_DIAGRAMS.md SD-02, SD-04
- contracts/events.md

NỘI DUNG TASK:
`adminGetReportTargetContent` (DEC-02), `adminApplySanction/Lift` trực tiếp, `createAnnouncement` + job fan-out, thông báo REPORT_RESULT/SANCTION.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Admin đọc được khóa Private/Tạm ẩn **chỉ khi có báo cáo**; Only Me → 404.
Ngoài ra áp Definition of Done của vai trò BE ở AGENT.md §7.

LƯU Ý RIÊNG: Gọi Course.GetCourseAccess(purpose=ModerationReview) chỉ sau khi xác nhận có báo cáo trỏ tới khóa. Fan-out broadcast theo lô ≤ 50 qua ListActiveUserIds.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Không sửa frontend/, openapi/, contracts/. Hợp đồng sai/thiếu → ghi docs/OPEN_QUESTIONS.md kèm đề xuất.
- Mọi thay đổi CSDL: EF Core migration và cập nhật db/schema.sql trong cùng PR.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-BE-05.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-BE-05 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-FE-01

```
Vai trò: FE. Task: T-S10-FE-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-FE-01-<slug ngắn>`, commit theo dạng `T-S10-FE-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S6-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-FE-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/moderation.yaml
- PNG: docs/design/figma-png/SCR-MOD-06__*.png, docs/design/figma-png/SCR-MOD-01__*.png, docs/design/figma-png/SCR-MOD-02__*.png, docs/design/figma-png/SCR-MOD-03__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-MOD-06 (dialog báo cáo, gắn vào khóa và bình luận), SCR-MOD-01,02,03.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Guard RequireAdmin cho /admin/*.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-FE-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-FE-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-FE-02

```
Vai trò: FE. Task: T-S10-FE-02.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-FE-02-<slug ngắn>`, commit theo dạng `T-S10-FE-02: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-FE-01. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-FE-02 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/FRONTEND_SPEC.md
- openapi/modules/moderation.yaml
- openapi/modules/identity.yaml
- openapi/modules/notification.yaml
- PNG: docs/design/figma-png/SCR-MOD-04__*.png, docs/design/figma-png/SCR-MOD-05__*.png, docs/design/figma-png/SCR-ADM-01__*.png, docs/design/figma-png/SCR-ADM-02__*.png
- docs/handoff/ của các task BE cùng slice (nếu đã DONE)

NỘI DUNG TASK:
SCR-MOD-04, SCR-MOD-05, SCR-ADM-01, SCR-ADM-02.

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): Mock chạy.
Ngoài ra áp Definition of Done của vai trò FE ở AGENT.md §7.

LƯU Ý RIÊNG: Thao tác nguy hiểm (khóa tài khoản, xóa vĩnh viễn) luôn có hộp xác nhận.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Thiếu PNG cho màn hình nào trong task → DỪNG, ghi docs/OPEN_QUESTIONS.md, không tự bịa giao diện. Dữ liệu theo OpenAPI, bố cục theo PNG.
- Chưa có BE thì chạy với VITE_USE_MOCK=true (Prism/MSW). Không sửa backend/, openapi/.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-FE-02.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-FE-02 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```

## T-S10-INT-01

```
Vai trò: INT. Task: T-S10-INT-01.

Bạn chạy trong Antigravity (có quyền ghi repo). Làm trực tiếp trên nhánh `feat/T-S10-INT-01-<slug ngắn>`, commit theo dạng `T-S10-INT-01: <mô tả>`, rồi mở PR. Không cần trả lại toàn bộ file trong chat.

BƯỚC 0 – Kiểm tra trước khi làm:
- Mở docs/BACKLOG_STATUS.md. Phụ thuộc của task này: T-S10-BE-01..05, T-S10-FE-01,02. Nếu có task chưa DONE → DỪNG và báo tôi.
- Đặt dòng T-S10-INT-01 thành IN_PROGRESS.

ĐỌC (và chỉ đọc những thứ này, cộng với dòng task trong docs/BACKLOG.md):
- AGENT.md
- docs/DECISIONS.md
- docs/REPO_STRUCTURE.md
- docs/FRONTEND_SPEC.md
- contracts/README.md
- contracts/moderation.md, openapi/modules/moderation.yaml
- contracts/course.md, openapi/modules/course.yaml
- contracts/discovery.md, openapi/modules/discovery.yaml
- docs/handoff/ của toàn bộ task BE + FE trong slice; e2e/

NỘI DUNG TASK:
Tích hợp S10 + e2e "báo cáo → Admin chấp nhận + tạm ẩn → khóa biến khỏi Discovery → khôi phục".

HOÀN THÀNH KHI (tiêu chí nghiệm thu bắt buộc): e2e xanh.
Ngoài ra áp Definition of Done của vai trò INT ở AGENT.md §7.

QUY TẮC:
- Chỉ làm đúng task này; không thêm tính năng ngoài task; không làm task kế tiếp.
- Chỉ sửa lệch hợp đồng/bug; ghi chú rõ nếu sửa openapi/ cho khớp thực tế.
- Tài liệu mâu thuẫn hoặc thiếu thông tin → DỪNG và hỏi tôi (hoặc ghi docs/OPEN_QUESTIONS.md). Không tự đoán endpoint/trường/mã lỗi.

KẾT THÚC:
1. Chạy build/test/lint theo DoD và dán kết quả tóm tắt.
2. Ghi docs/handoff/T-S10-INT-01.md (endpoint/handler đã làm, điểm lệch hợp đồng, dữ liệu seed/mock, việc INT cần biết).
3. Đặt T-S10-INT-01 thành REVIEW trong docs/BACKLOG_STATUS.md (tôi sẽ chuyển DONE sau khi duyệt PR).
4. Trả lời tôi: tóm tắt ≤ 5 dòng (đã làm gì, giả định, điểm cần chú ý) + link/tên nhánh PR.
```
