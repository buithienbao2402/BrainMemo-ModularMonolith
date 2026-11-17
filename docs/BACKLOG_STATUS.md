# BACKLOG_STATUS – Trạng thái thực hiện task (Batched)

> **Quy ước trạng thái:** `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE` | `BLOCKED`  
> **Nguồn danh sách task:** [BACKLOG.md](BACKLOG.md) (Phiên bản đã tối ưu hoá Task Batching)

| Task | Gốc (Cũ) | Trạng thái | AI/Người làm | PR / Nhánh | Ghi chú |
|:--|:--|:--|:--|:--|:--|
| **S0 – Nền tảng** | | | | | |
| T-S0-OPS-01 | OPS-01 | DONE | Antigravity (OPS) | feat/T-S0-OPS-01-init-monorepo | Khởi tạo monorepo theo `REPO_STRUCTURE.md`, `.gitignore`, `.editorconfig`, `README.md`, `docs/spec/`, handoff note |
| T-S0-OPS-02 | OPS-02 | DONE | Antigravity (OPS) | feat/T-S0-OPS-02-docker-compose-dev | `infra/docker-compose.dev.yml` (MySQL 8, S3/MinIO `pgsty/silo` + lifecycle `tmp/` 24h, Mailpit, `ai-service` stub), `infra/env/.env.example` |
| T-S0-DB-01 | DB-01 | DONE | Antigravity (DB) | feat/T-S0-DB-01-baseline-schema-seed | Baseline db/schema.sql (59 bảng, DEC-01, DEC-12) + seed Admin & hướng dẫn |
| T-S0-BE-01 | BE-01 | DONE | Antigravity (BE) | feat/T-S0-BE-01-solution-buildingblocks | Solution BrainMemo.sln + BuildingBlocks (SharedKernel, Abstractions, Infrastructure) + 32 unit tests |
| T-S0-BE-02 | BE-02 | DONE | Antigravity (BE) | feat/T-S0-BE-02-webapi-host | Host BrainMemo.WebApi (JWT, ProblemDetails §3, RateLimiter login 5/p/IP, CORS, /health, Swagger, ModuleRegistry) + 43 tests |
| T-S0-BE-03 | BE-03 | DONE | Antigravity (BE) | feat/T-S0-BE-03-shared-outbox | Outbox chung bảng-agnostic (`OutboxWriter` + `OutboxDispatcher` HostedService + `EfOutboxStore`) + 5 outbox tests |
| T-S0-BE-04 | BE-04 | DONE | Antigravity (BE) | feat/T-S0-BE-04-architecture-tests | `Architecture.Tests` (NetArchTest + Cecil + Roslyn): kiểm đủ 9 luật REPO_STRUCTURE §2 + test âm tính |
| T-S0-BE-05 | BE-05 | DONE | Antigravity (BE) | feat/T-S0-BE-05-s3-file-storage | `S3FileStorage` (`AWSSDK.S3` R2/MinIO), `FileUploadPolicy`, `POST /api/v1/files/upload-urls`, integration test MinIO (`140/140` tests pass) |
| T-S0-OPS-03 | OPS-03 | DONE | Antigravity (OPS) | feat/T-S0-OPS-03-merge-openapi | Script `tools/merge-openapi` (`pnpm --filter tools openapi:bundle` / `openapi:check`), Redocly lint (`openapi/redocly.yaml`, `pnpm --filter tools openapi:lint`), bundle `openapi/openapi.yaml` (`11` module, `110` paths, `55` schemas) & `11/11` unit tests pass |
| T-S0-FE-01 | FE-01 | DONE | Antigravity (FE) | feat/T-S0-FE-01-frontend-shell | Khung FE (`frontend/`: Vite/TS 5.9/Tailwind/Radix UI, Router 6, TanStack Query 5, `shared/api` single-flight refresh, `gen:api`, MSW 3, `SCR-COM-01/02/03`) & 12/12 Vitest tests pass |
| T-S0-OPS-04 | OPS-04 | DONE | Antigravity (OPS) | feat/T-S0-OPS-04-ci-dockerfiles-nginx | Jenkinsfile, Dockerfiles BE/FE/AI, Nginx reverse proxy, Docker Compose full-stack + handoff note |
| **S1 – Identity** | | | | | |
| T-S1-BE-01 | BE-01 | DONE | Antigravity (BE) | feat/T-S1-BE-01-identity-domain | Identity Domain (idn_*), IdentityDbContext + InitialIdentity migration, IIdentityContract & integration events, BCrypt/SHA-256 services, unit & MySQL 8 integration tests, handoff note |
| T-S1-BE-02 | BE-02 | DONE | Antigravity (BE) | feat/T-S1-BE-02-register-verify-email | `POST /api/v1/auth/register` & `verify-email`, BCrypt/SHA-256 + atomic token consume, `IPostCommitEventQueue`, `ErrorResultFilter`, unit & MySQL 8 integration tests, handoff note (PR #6 merged) |
| T-S1-BE-03 | BE-03 + BE-04 | DONE | Antigravity (BE) | feat/T-S1-BE-04-password-flows-me | **Auth, Session & Password Lifecycle (Batched):** Login/Refresh/Logout/Sessions + Forgot/Reset/ChangePassword + `GET /auth/me`, Middleware `AccountStatusMiddleware`, 100% tests pass (PR #7, #8 merged) |
| T-S1-BE-04 | BE-05 + BE-06 | DONE | Antigravity (BE) | feat/T-S1-BE-04-notification-profile | **Skeletons & Handlers (Notification + Profile - Batched):** Bảng `prf_user_profile`, `IProfileContract`, `GET/PUT /profiles/me`, `ntf_*`, Mailpit SMTP sender, 3 email handlers, in-app notifications & announcements, 100% tests pass (PR #10 merged) |
| T-S1-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | feat/T-S1-FE-01-auth-account-ui | **Auth & Account UI (Batched):** SCR-AUTH-01..06 + SCR-COM-03 + sessions, guards, 100% tests pass (PR #9 merged) |
| T-S1-INT-01 | INT-01 | DONE | Antigravity (INT) | feat/T-S1-INT-01-e2e-auth-flow | Tích hợp S1 + e2e Playwright: Đăng ký → Xác minh Mailpit → Đăng nhập → Đổi MK → Đăng xuất (100% tests pass) |
| **S2 – Profile, Files, Course** | | | | | |
| T-S2-BE-01 | BE-01 | DONE | Antigravity (BE) | feat/T-S2-BE-01-profile-avatar | Profile hoàn chỉnh + Upload Avatar S3/R2 + GetPublicProfile (21/21 tests pass) |
| T-S2-BE-02 | BE-02..04 | DONE | Antigravity (BE) | feat/T-S2-BE-02-course-module | **Course Module Toàn diện (Batched):** Domain & migration `crs_*`, CRUD khóa học, tags, bìa ảnh, Outbox, Phân quyền `GetCourseAccess` 3.5.8.1, Danh sách khóa của tôi / hồ sơ / public (57/57 tests pass) |
| T-S2-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | feat/T-S2-FE-01-profile-course-ui | **FE Profile & Course Management (Batched):** SCR-PRF-01, 02 + SCR-CRS-01, 02, 03 (16/16 tests pass, 0 type error) |
| T-S2-INT-01 | INT-01 | DONE | Antigravity (INT) | feat/T-S2-INT-01-course-profile-e2e | **Tích hợp S2 + e2e:** Tạo khóa học → Upload bìa & avatar → Xem hồ sơ → Đổi trạng thái Only Me (người khác 404, e2e pass 100%) |
| **S3 – Content cơ bản** | | | | | |
| T-S3-BE-01 | BE-01 + BE-02 | DONE | Antigravity (BE) | feat/T-S3-BE-01-content-drafting | **Content Domain, Resource Library & Drafting (Batched):** 15 bảng cnt_*, quản lý tài nguyên, CRUD chương, lưu nháp với khóa lạc quan (409 VERSION_CONFLICT), 7 loại Block, HTML sanitize, bảo mật snapshot không đáp án (61/61 tests pass) |
| T-S3-BE-02 | BE-03 | DONE | Antigravity (BE) | feat/T-S3-BE-02-publishing-contracts | **Publishing, Version History & Contracts (Batched):** Đăng tải chương, lịch sử phiên bản, khôi phục, event & contracts (84/84 tests pass) |
| T-S3-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | feat/T-S3-FE-01-content-editor-suite | **FE Content Editor Suite (Batched):** SCR-CNT-01, 02, 03, 07 (10 loại block, khóa lạc quan 409, quản lý tài nguyên DEC-05, lịch sử phiên bản, 17/17 tests pass) |
| T-S3-INT-01 | INT-01 | DONE | Antigravity (INT) | feat/T-S3-INT-01-content-editor-e2e | **Tích hợp S3 + e2e:** Soạn thảo block + upload ảnh → Lưu nháp → Xử lý xung đột 2 tab (409) → Đăng tải chương → Khôi phục lịch sử (100% tests pass) |
| **S4 – Ghi danh & Learning** | | | | | |
| T-S4-BE-01 | BE-01 + BE-02 | DONE | Antigravity (BE) | feat/T-S4-BE-01-enrollment-chapter-access | **Enrollment & Chapter Access Engine (Batched):** Ghi danh 5 trạng thái + Ma trận quyền 3.2.2 + Mở khóa chương passcode (`POST /courses/{id}/chapters/{chapterId}/verify-passcode`) + Outbox + Quản lý yêu cầu tham gia chờ duyệt (`GET/POST /courses/{id}/enrollment-requests`) |
| T-S4-BE-02 | BE-03 | DONE | Antigravity (BE) | dev/kim-thuan | **Learning Progress & Player Service:** Đọc chương, hoàn thành block, tính tiến độ, bookmark, event hoàn thành khóa + Thống kê học tập (`GET /courses/{id}/enrollments/summary`) + Thống kê hoàn thành chương (`GET /courses/{id}/chapters/{chapterId}/progress-summary`) |
| T-S4-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Enrollment & Learning Player (Batched):** SCR-CRS-05, 06 (Danh sách học viên, duyệt yêu cầu, mời email) + SCR-LRN-01, 07 (Learning Player, 3D Flashcard flip, Practice Question, Passcode gate, Bookmark) |
| T-S4-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S4 + e2e:** Ghi danh Public → Đọc → Tiến độ + Private xin vào → Duyệt → Đọc; Chương Protected cần passcode (100% tests pass) |
| **S5 – Discovery** | | | | | |
| T-S5-BE-01 | BE-01..03 | DONE | Antigravity (BE) | dev/kim-thuan | **Discovery Module Trọn gói (Batched):** Read model `dsc_*`, Event handlers, API Home/Search lọc & sắp xếp, Rebuild CLI + API Xếp hạng khóa học theo học viên/đề cử/đánh giá (`GET /courses/{id}/ranking`) (8/8 tests pass, 0 warning 0 error) |
| T-S5-FE-01 | FE-01 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Discovery (Batched):** SCR-DSC-01, SCR-DSC-02 (7/7 tests pass, 0 type error) |
| T-S5-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S5 + e2e:** tạo khóa Public → thấy ở trang chủ/tìm kiếm → đổi Only Me → biến mất (100% tests pass) |
| **S6 – Bình luận & Đề cử** | | | | | |
| T-S6-BE-01 | BE-01 + BE-02 | DONE | Antigravity (BE) | dev/kim-thuan | **Comments & In-App Notifications (Batched):** Bình luận đa cấp, ghim + Luồng thông báo tự động bảng 3.4.6.1 + Thống kê bình luận (`comments/summary`) (30/30 tests pass, 0 warning 0 error) |
| T-S6-BE-02 | BE-03 | DONE | Antigravity (BE) | dev/kim-thuan | **Nominations & Learning Stats (Batched):** Đề cử/thu hồi + Thống kê học tập khóa & số đề cử cộng đồng (`nominations/summary`) (91/91 tests pass, 0 warning 0 error) |
| T-S6-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Social & Notifications (Batched):** SCR-LRN-06 + SCR-NTF-01 + SCR-CRS-04 & nút đề cử (24/24 tests pass, typecheck clean) |
| T-S6-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S6 + e2e:** Playwright e2e `social-notification-flow.spec.ts` pass 100%, 24/24 FE tests pass, BE build & unit tests pass |
| **S7 – Ngân hàng câu hỏi & Quiz** | | | | | |
| T-S7-BE-01 | BE-01 + BE-02 | DONE | Antigravity (BE) | dev/kim-thuan | **Question Bank & Quiz Authoring (Batched):** Ngân hàng câu hỏi 6 loại + Cấu hình bài thi trong chương + Bốc đề thi + API Quiz gắn với chương (`GET /courses/{id}/chapters/{chapterId}/quizzes`) (98/98 tests pass, build clean) |
| T-S7-BE-02 | BE-03..05 | DONE | Antigravity (BE) | dev/kim-thuan | **Quiz Engine & Auto-Grading (Batched):** Làm bài, autosave, deadline worker + Bộ chấm tự động ADR-04 + Nộp bài TX1/TX2 |
| T-S7-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Question Bank & Quiz Authoring (Batched):** SCR-CNT-04, 05, 06, 08, 09 (5/5 tests pass, 0 type error) |
| T-S7-FE-02 | FE-03 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Quiz Player:** SCR-LRN-02, 03, 04 (4/4 tests pass, 0 type error) |
| T-S7-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S7 + e2e:** Playwright e2e `quiz-player-flow.spec.ts` pass 100%, 9/9 FE tests pass, BE build clean & unit tests pass |
| **S8 – Bài tập & Bảng điểm** | | | | | |
| T-S8-BE-01 | BE-01 + BE-02 | DONE | Antigravity (BE) | dev/kim-thuan | **Assignments & Manual Grading Pipeline (Batched):** Nộp bài tập commit tệp + Hàng đợi chấm thi & Chấm tay tự luận DEC-03 + API Bài tập nộp chưa chấm (`GET /courses/{id}/submissions/pending`) |
| T-S8-BE-02 | BE-03 | DONE | Antigravity (BE) | dev/kim-thuan | **Gradebook & Evaluation Rules (Batched):** Trọng số đánh giá, tính điểm final, bảng điểm, xếp loại |
| T-S8-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Grading Suite & Gradebook (Batched):** SCR-LRN-05 + SCR-AST-01, 04, 05, 06, 07 (6/6 tests pass, 0 type error) |
| T-S8-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S8 + e2e:** Playwright e2e `grading-and-gradebook-flow.spec.ts` pass 100%, 6/6 FE tests pass, BE build clean & unit tests pass |
| **S9 – CLO/PLO & Đánh giá khóa** | | | | | |
| T-S9-BE-01 | BE-01..04 | DONE | Antigravity (BE) | dev/kim-thuan | **CLO/PLO Engine, Analytics & Export (Batched):** CLO/PLO CRUD, liên kết trọng số, công thức 3.5.2, xuất báo cáo (22/22 tests pass, build clean) |
| T-S9-BE-02 | BE-05 | DONE | Antigravity (BE) | dev/kim-thuan | **Course Review & Rating:** Học viên đánh giá 1-5 sao, phản hồi của giảng viên, rating Discovery & tổng kết sao (`reviews/summary`) (28/28 tests pass, build clean) |
| T-S9-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE CLO/PLO, Analytics & Reviews (Batched):** SCR-AST-02, 03, 08, 09 + Đánh giá sao (11/11 tests pass, 0 type error) |
| T-S9-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S9 + e2e:** Playwright e2e `outcomes-and-reviews-flow.spec.ts` pass 100%, 11/11 FE tests pass, BE build clean & unit tests pass |
| **S10 – Moderation & Quản trị** | | | | | |
| T-S10-BE-01 | BE-01 | DONE | – | – | **Identity Admin & Account Controls:** Phân quyền Admin, khóa/mở khóa tài khoản, job tự gỡ khóa |
| T-S10-BE-02 | BE-02..05 | DONE | Antigravity (BE) | dev/kim-thuan | **Full Moderation Pipeline, Sanctions & Audit (Batched):** Báo cáo vi phạm (`GET /courses/{id}/reports`), transaction IModerationTransaction, chế tài, audit log, broadcast |
| T-S10-FE-01 | FE-01 + FE-02 | DONE | Antigravity (FE) | dev/kim-thuan | **FE Moderation & Admin Portal (Batched):** SCR-MOD-01..06 + SCR-ADM-01, 02 (9/9 tests pass, 0 type error) |
| T-S10-INT-01 | INT-01 | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp S10 + e2e:** Playwright e2e `moderation-and-admin-flow.spec.ts` pass 100%, 9/9 FE tests pass, BE build clean & unit tests pass |
| **S10.5 – Nâng cấp: Kiểm duyệt khóa học, Q&A bài học, Nhắn tin & Bỏ PhoBERT** | | | | | |
| T-S10R-BE-01 | – | DONE | Antigravity (BE) | dev/kim-thuan | **Kiểm duyệt xuất bản khóa học (BE):** `CoursePublishStatus` (`DRAFT`/`PENDING_APPROVAL`/`PUBLISHED`/`REJECTED`), `GetCourseAccess` ẩn khóa chưa xuất bản (404), Discovery filter, Moderation review queue + Approve/Reject + Notification (`91/91` Course + `9/9` Moderation tests pass) |
| T-S10R-BE-02 | – | DONE | Antigravity (BE) | dev/kim-thuan | **Hỏi đáp theo từng bài học (BE):** Nâng cấp `lrn_comment` thành Q&A theo `chapterId` (tiêu đề, `block_id`, trạng thái `is_resolved`, lọc/tìm kiếm, đánh dấu giải đáp, `25/25` Learning tests pass) |
| T-S10R-BE-03 | – | DONE | Antigravity (BE) | dev/kim-thuan | **Module Messaging (BE):** Tạo mới `BrainMemo.Messaging` (`msg_conversation`, `msg_message`, migration `InitialMessaging`), nhắn tin 1-1 học viên – giảng viên, đánh dấu đã đọc, Notification (`61/61` WebApi tests pass) |
| T-S10R-BE-04 | – | DONE | Antigravity (BE) | dev/kim-thuan | **Dọn dẹp PhoBERT (BE & Infra):** Xóa `ai-service/`, xóa `IPhoBertClient.cs`, xóa `ai_moderation_scan_log`, xóa `PendingAiFlags` & `aiFlagThreshold` khỏi OpenAPI/Backend/Docker |
| T-S10R-FE-01 | – | DONE | Antigravity (FE) | dev/kim-thuan | **FE Kiểm duyệt khóa học & Dọn AI flag:** `CoursePublishStatusBanner` (`SCR-CRS-04`), cổng Admin duyệt khóa học `AdminCourseReviewsPage` (`SCR-MOD-07`), bỏ cờ AI (`9/9` Moderation FE tests pass) |
| T-S10R-FE-02 | – | DONE | Antigravity (FE) | dev/kim-thuan | **FE Hỏi đáp bài học & Nhắn tin Giảng viên:** Tab Q&A bài học (`CommentSection`), `ChatDrawer` & Messages Hub `/me/messages` (`MessagesPage`), `tsc -b --noEmit` clean |
| T-S10R-INT-01 | – | DONE | Antigravity (INT) | dev/kim-thuan | **Tích hợp & Kiểm thử:** OpenAPI bundle (12 modules, 123 paths), Backend build 0 errors, `211/211` backend unit/host tests pass, FE typecheck & modified Vitest suites pass |
| **S11 – AI Services (GenAI Only)** | | | | | |
| T-S11-BE-01 | BE-01..03 | DONE | Antigravity (BE) | dev/kim-thuan | **GenAI Quiz & Flashcard Service (Batched):** Settings (`aiDailyQuota`, `aiLlmProvider`), Quota, Gemini API (`ILlmClient`), Background jobs sinh câu hỏi Quiz & Flashcard, Content import (`11/11` AI tests pass) |
| T-S11-FE-01 | FE-01 | TODO | – | – | **FE AI Features & Quota Management (Batched):** SCR-AI-01, 02 + SCR-ADM-03 |
| T-S11-INT-01 | INT-01 | TODO | – | – | Tích hợp S11 + e2e |
| **S12 – Hoàn thiện & Triển khai** | | | | | |
| T-S12-BE-01 | BE-01 + BE-02 | TODO | – | – | **Top 10, Google OAuth & Housekeeping (Batched):** BXH Top 10, Google login, worker dọn dẹp |
| T-S12-FE-01 | FE-01 | TODO | – | – | **FE Top 10, Social Auth & Lighthouse (Batched):** SCR-DSC-03, Google button, tối ưu Lighthouse ≥ 70 |
| T-S12-INT-01 | INT-01 | TODO | – | – | **System Verification & Load Testing:** e2e 3 luồng NFR-17 + Load test 50 VU |
| T-S12-OPS-01 | OPS-01 | TODO | – | – | **Triển khai Production VPS:** Docker Compose prod, Nginx SSL, Cloudflare, backup MySQL |
