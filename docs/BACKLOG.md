# BACKLOG – Task cho AI

Quy ước: mỗi task nhỏ vừa một lượt chat (≈ 1 use case hoặc 1–2 màn hình). "Phụ thuộc" phải DONE trước. Cột "Hoàn thành khi" là tiêu chí nghiệm thu bắt buộc; ngoài ra áp DoD ở AGENT.md §7.
BACKLOG_STATUS.md: bảng `| Task | Trạng thái | AI/Người làm | PR | Ghi chú |`, trạng thái TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED.

## S0 – Nền tảng
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S0-OPS-01 | OPS | Khởi tạo monorepo theo REPO_STRUCTURE (thư mục, .gitignore, .editorconfig, README, đưa tài liệu vào `docs/spec`) | – | Cây thư mục khớp; README có hướng dẫn chạy |
| T-S0-OPS-02 | OPS | `infra/docker-compose.dev.yml`: MySQL 8, MinIO (bucket + lifecycle `tmp/` 24h), Mailpit, ai-service stub; `.env.example` | 01 | `docker compose up` chạy; MySQL nạp `db/schema.sql` |
| T-S0-DB-01 | DB | Đưa `schema.sql` vào `db/`; áp dụng DEC-01 (UNIQUE đơn trên `ast_grade_record`) và DEC-12 (`sys_setting`) trong schema.sql; seed Admin đầu tiên + hướng dẫn | 02 | Chạy sạch trên MySQL 8; 59 bảng; seed Admin |
| T-S0-BE-01 | BE | Solution + dự án BuildingBlocks: SharedKernel (Result/Error/Entity/IClock), Abstractions (mọi cổng ở contracts/README §2), Infrastructure khung (Paging, MediatR behaviors Logging/Validation/Transaction, EventBus in-process) | 01 | Build sạch; unit test cho Result/Paging |
| T-S0-BE-02 | BE | Host `BrainMemo.WebApi`: JWT bearer, ProblemDetails tiếng Việt (ánh xạ mã lỗi §3), RateLimiter (login 5/phút/IP), CORS, `/health`, Swagger, đăng ký module động | BE-01 | `GET /health` 200; lỗi trả đúng dạng Problem |
| T-S0-BE-03 | BE | Outbox chung: bảng-agnostic `OutboxWriter` + `OutboxDispatcher` (HostedService) dùng cho Course/Learning/Assessment | BE-01 | Test: ghi event cùng TX, phát sau commit, bỏ trùng theo EventId |
| T-S0-BE-04 | BE | `Architecture.Tests` (NetArchTest) bảo đảm luật REPO_STRUCTURE §2 | BE-01 | Test đỏ khi vi phạm tham chiếu |
| T-S0-BE-05 | BE | `S3FileStorage` (R2/MinIO): CreateUploadUrl/Head/Commit/CreateDownloadUrl/Delete/DeleteByPrefix + endpoint `POST /files/upload-urls` (kiểm dung lượng khai báo, whitelist đuôi theo purpose) | BE-02, OPS-02 | Integration test với MinIO |
| T-S0-OPS-03 | OPS | `tools/merge-openapi` + lint Redocly + script `openapi:bundle`; sinh `openapi/openapi.yaml` từ `modules/` | 01 | Bundle sạch, lint sạch, trùng schema → lỗi |
| T-S0-FE-01 | FE | Khung FE: Vite/TS/Tailwind/shadcn, router, providers, `shared/api` (openapi-fetch, single-flight refresh, errors), layout, guards, i18n vi, `gen:api`, MSW/Prism | OPS-03 | `pnpm dev` chạy; hiển thị SCR-COM-01/02 khung; gen type thành công |
| T-S0-OPS-04 | OPS | Jenkinsfile: build+test BE, lint+typecheck+build FE, lint OpenAPI; Dockerfile BE/FE/ai-service; nginx.conf | BE-01, FE-01 | Pipeline chạy xanh trên repo trống |

## S1 – Identity
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S1-BE-01 | BE | Identity domain + DbContext + migration khớp `idn_*`; `IIdentityContract` (GetAccountStatus, IsAdmin, GetUserSummary, FindUserIdByEmail) | S0 | Unit test Domain; contract test |
| T-S1-BE-02 | BE | Register + VerifyEmail (token SHA-256, TTL cấu hình, cập nhật có điều kiện) + event `UserRegistered`, `EmailVerificationRequested` | BE-01 | Test: token dùng 1 lần, hết hạn bị từ chối, email trùng 409 |
| T-S1-BE-03 | BE | Login/Refresh/Logout/LogoutAll/Sessions: JWT 30', refresh cookie 14 ngày xoay vòng, cập nhật có điều kiện chống race, kiểm `account_status`, tự gỡ khóa hết hạn lúc đăng nhập | BE-01 | Test đồng thời 2 refresh: 1 thắng; tài khoản khóa bị chặn |
| T-S1-BE-04 | BE | ForgotPassword/ResetPassword/ChangePassword (+ vô hiệu token cũ cùng purpose, thu hồi phiên khi đổi mật khẩu); `GET /auth/me` | BE-02 | Test luồng; không lộ email tồn tại |
| T-S1-BE-05 | BE | Notification (khung): bảng `ntf_*`, handler email 3 template, `SmtpEmailSender`, `ntf_email_delivery`, retry (token: trong bộ nhớ) | S0 | Email qua Mailpit; token không vào DB/log |
| T-S1-BE-06 | BE | Profile (khung): `prf_user_profile`, handler `UserRegistered` (display name mặc định xác định), `GetDisplayInfo`, `GET/PUT /profiles/me` (chưa avatar) | BE-02 | Idempotent theo PK |
| T-S1-FE-01 | FE | SCR-AUTH-01,02,03,04,05 + guards + nạp phiên khi khởi động | S0 FE-01 | Chạy với mock; đủ 4 trạng thái |
| T-S1-FE-02 | FE | SCR-AUTH-06 (đổi mật khẩu, phiên) + SCR-COM-03 | FE-01 | Chạy với mock |
| T-S1-INT-01 | INT | Tích hợp S1 + e2e Playwright "đăng ký → xác minh (Mailpit) → đăng nhập → đăng xuất" | BE-01..06, FE-01,02 | e2e xanh |

## S2 – Profile, Files, Course
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S2-BE-01 | BE | Profile hoàn chỉnh: cập nhật + avatar (`uploadKey` commit), `GetPublicProfile`, `ProfileUpdated` | S1 | Test commit tệp: kiểm size/đuôi |
| T-S2-BE-02 | BE | Course domain + migration `crs_*`; CRUD khóa, tag ≤10, bìa, xóa mềm, `revision`, Outbox `CourseUpserted(eligible, …)`; chỉ email đã xác minh được tạo | S1, S0 BE-03 | Test eligible=false không mang nội dung |
| T-S2-BE-03 | BE | `GetCourseAccess` (đủ luật 3.5.8.1 + ModerationReview), `GetCourseSummaries`, `ListUserCourses` | BE-02 | Test tham số hóa bảng quy tắc 3.2.2 (chưa gồm chương) |
| T-S2-BE-04 | BE | `GET /profiles/{id}/courses`, `GET /me/courses` | BE-03 | Only Me/Tạm ẩn không lộ ở audience PUBLIC |
| T-S2-FE-01 | FE | SCR-PRF-01, SCR-PRF-02 (kèm quy trình upload) | S1 FE | Mock chạy |
| T-S2-FE-02 | FE | SCR-CRS-02 (tạo/sửa), SCR-CRS-03, SCR-CRS-01 (trang giới thiệu, nút theo `viewer`) | FE-01 | Mock chạy |
| T-S2-INT-01 | INT | Tích hợp S2 + e2e "tạo khóa → xem ở hồ sơ → đổi sang Only Me (người khác 404)" | BE-01..04, FE-01,02 | e2e xanh |

## S3 – Content cơ bản
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S3-BE-01 | BE | Content domain + migration `cnt_*` (đủ 15 bảng); tài nguyên: tạo (commit `uploadKey`), liệt kê, xóa mềm (RESOURCE_IN_USE), `AuthorizeResourceDownload`, `download-url` | S2 | Test giới hạn ảnh 5 MB / tệp 20 MB |
| T-S3-BE-02 | BE | Chương: tạo/sắp xếp/xóa mềm; **Lưu** (khóa lạc quan, ghi Block, snapshot bất biến chỉ chứa questionId, làm sạch HTML); `GET draft` | BE-01 | Test VERSION_CONFLICT; snapshot không có đáp án |
| T-S3-BE-03 | BE | Đăng tải (điều kiện 3.6.6.3, dựng lại `cnt_published_block`), lịch sử, khôi phục; event `ChapterPublished/Deleted`; contract `GetChapterInfo/ListPublishedChapters/CountPublishedChapters/ListPublishedBlocks/GetPublishedChapterContent` | BE-02 | Test đăng tải trọn gói; khôi phục chỉ về nháp |
| T-S3-FE-01 | FE | SCR-CNT-01, SCR-CNT-02 (soạn 7 loại Block nội dung + flashcard; Tiptap; **không tự lưu**; cảnh báo thoát) | S0 FE-01 | Mock chạy |
| T-S3-FE-02 | FE | SCR-CNT-03 (lịch sử), SCR-CNT-07 (tài nguyên + upload) + xem trước nháp | FE-01 | Mock chạy |
| T-S3-INT-01 | INT | Tích hợp S3 + e2e "soạn → lưu → đăng tải" + xử lý xung đột 2 tab | BE-01..03, FE-01,02 | e2e xanh |

## S4 – Ghi danh, quyền, Learning đọc
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S4-BE-01 | BE | Ghi danh: enroll/leave/remove/invite(email)/accept/decide request; 5 trạng thái, cập nhật có điều kiện; Outbox `EnrollmentChanged` | S3 | Test chuyển trạng thái đủ bảng 3.5.8.2 + đồng thời |
| T-S4-BE-02 | BE | Chế độ truy cập chương: `setChapterAccess`, `unlockChapter` (rate limit), `CheckChapterAccess`, xử lý `ChapterDeleted` | BE-01 | **Test ma trận khóa×chương×vai** (3.2.2) đạt |
| T-S4-BE-03 | BE | Learning (khung): `readChapter`, `completeBlock`, tiến độ chương/khóa, `CourseCompleted` (một lần), bookmark, `GetCourseProgress`, `ListInProgressCourses` | BE-02 | Test: Khách/chưa ghi danh không ghi dữ liệu; tiến độ không bị hủy khi thêm chương |
| T-S4-FE-01 | FE | SCR-CRS-05, SCR-CRS-06; nút ghi danh/rời/xin vào ở CRS-01; lời mời ở CRS-03 | S2 FE | Mock chạy |
| T-S4-FE-02 | FE | SCR-LRN-01 (đọc, passcode, tiến độ, bookmark, Khách chỉ đọc), SCR-LRN-07 | S3 FE | Mock chạy |
| T-S4-INT-01 | INT | Tích hợp S4 + e2e "ghi danh Public → đọc → tiến độ" và "Private xin vào → duyệt → đọc; chương Protected cần passcode" | BE-01..03, FE-01,02 | e2e xanh |

## S5 – Discovery
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S5-BE-01 | BE | Discovery: migration `dsc_*`; handler `CourseUpserted/CoursePermanentlyDeleted/EnrollmentChanged/ChapterPublished/ProfileUpdated` (so `revision`, idempotent) | S4 | Test: eligible=false xóa dòng; event cũ bị bỏ |
| T-S5-BE-02 | BE | `getHome` (đề xuất ngẫu nhiên mỗi lần), `searchCourses` (lọc/6 sắp xếp/lịch sử), `listSearchHistory` | BE-01 | Only Me/Tạm ẩn/Đã xóa không bao giờ xuất hiện |
| T-S5-BE-03 | BE | Dựng lại read model: dùng `ListCourseSnapshots/ListEnrollmentFacts` (+ job CLI) | BE-01 | Dựng lại ra kết quả như event |
| T-S5-FE-01 | FE | SCR-DSC-01, SCR-DSC-02 | S0 FE-01 | Mock chạy |
| T-S5-INT-01 | INT | Tích hợp S5 + e2e "tạo khóa Public → thấy ở trang chủ → đổi Only Me → biến mất" | BE-01..03, FE-01 | e2e xanh |

## S6 – Bình luận, thông báo, đề cử
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S6-BE-01 | BE | Bình luận: tạo/trả lời 1 cấp/sửa/xóa mềm/ghim; `CommentCreated/Deleted` | S4 | Test cha cùng khóa/chương; chỉ Chủ khóa ghim |
| T-S6-BE-02 | BE | Notification in-app: handler theo bảng 3.4.6.1 (ghi danh, bình luận, chương mới), list/unread/read/read-all/delete | S4 | Idempotent (UK); lỗi không rollback nghiệp vụ |
| T-S6-BE-03 | BE | Đề cử + thu hồi, `NominationChanged`, `GetCourseStats`, `GetCourseLearningStats` | S4 | Test: mỗi người 1 đề cử hiệu lực/khóa; giữ khi rời khóa |
| T-S6-FE-01 | FE | SCR-LRN-06 (bình luận), SCR-NTF-01 | S4 FE | Mock chạy |
| T-S6-FE-02 | FE | Nút đề cử ở CRS-01; SCR-CRS-04 (thống kê) | S4 FE | Mock chạy |
| T-S6-INT-01 | INT | Tích hợp S6 + e2e "bình luận → chuông báo cho Chủ khóa" | BE-01..03, FE-01,02 | e2e xanh |

## S7 – Ngân hàng câu hỏi & Quiz
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S7-BE-01 | BE | Ngân hàng câu hỏi: CRUD 6 loại (+ option/tag), thang độ khó, trạng thái DRAFT/READY/ARCHIVED, lọc, import/export Excel/CSV | S4 | Test kiểm hợp lệ khi READY |
| T-S7-BE-02 | BE | Cấu hình Quiz trong `saveChapter` (config, câu thủ công, quy tắc ngẫu nhiên, tiên quyết, mật khẩu BCrypt), kiểm điều kiện đăng tải quiz; `DrawQuizQuestions`, `GetPublishedQuizDefinition`, `VerifyQuizPassword`, ngoại lệ học viên | BE-01 | Test NOT_ENOUGH_QUESTIONS; không bốc trùng |
| T-S7-BE-03 | BE | Learning: `startQuizAttempt` (snapshot đề + `passScorePercent`, tính `deadline_at` một lần, đảo theo cờ, ngoại lệ, tiên quyết), `getQuizAttempt`, `saveQuizAnswer` (autosave), job tự nộp hết giờ | BE-02 | Test deadline theo server; F5 khôi phục đúng đề; không lộ đáp án |
| T-S7-BE-04 | BE | Assessment (khung): migration `ast_*`; `GradeQuizAttempt` + `IGradingStrategy` (MULTIPLE_CHOICE theo cờ, TRUE_FALSE, FILL_BLANK, MATCHING, tự luận→chờ chấm tay); `ast_grade_record` upsert; nhãn Đạt/Chưa đạt | BE-03 | Unit test mỗi strategy; idempotent gọi lại |
| T-S7-BE-05 | BE | `submitQuizAttempt` theo ADR-04 (TX1+Outbox → gọi chấm ngoài TX → TX2); `RegradeQuizAttemptHandler`; handler `GradeRecorded` ở Learning; `QuizAttemptSubmitted`→hoàn thành Block; thông báo `GRADE_FEEDBACK` | BE-04 | Test: Assessment lỗi → vẫn SUBMITTED rồi được chấm lại; hiển thị theo `resultDisplay` |
| T-S7-FE-01 | FE | SCR-CNT-04, SCR-CNT-05, SCR-CNT-08 | S3 FE | Mock chạy |
| T-S7-FE-02 | FE | SCR-CNT-06 (cấu hình Quiz trong editor, chưa gồm liên kết CLO), SCR-CNT-09 | FE-01 | Mock chạy |
| T-S7-FE-03 | FE | SCR-LRN-02, SCR-LRN-03, SCR-LRN-04 (đồng hồ, autosave, điều hướng câu) | S4 FE | Mock chạy |
| T-S7-INT-01 | INT | Tích hợp S7 + e2e "tạo câu hỏi → quiz → làm → nộp → thấy điểm"; test F5 giữa bài; hết giờ tự nộp | BE-01..05, FE-01..03 | e2e xanh |

## S8 – Bài tập, chấm tay, bảng điểm
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S8-BE-01 | BE | Bài tập: cấu hình (đã có trong editor), `getMySubmission/saveSubmissionDraft/submitAssignment` (tệp qua `uploadKey`, `is_late`), `AssignmentSubmitted`; Assessment tạo grade_record chờ chấm | S7 | Không nộp lại; tệp ≤ giới hạn |
| T-S8-BE-02 | BE | **Chấm tay (DEC-03):** `listGradingQueue`, `getAttemptForReview`, `gradeAttemptManually` (→ `Learning.ApplyManualQuestionGrades` → `GradeQuizAttempt`), `gradeSubmission` (→ `MarkAssignmentGraded`) | BE-01 | Test points ≤ max; `GradeRecorded` khi hết chờ; Learning cập nhật GRADED |
| T-S8-BE-03 | BE | Cấu hình đánh giá (`assessment/config`), component upsert (trọng số), `COMPONENT_FINAL` theo quy tắc khóa, bảng điểm (me/student/khóa/theo bài) kèm highest/latest/average, xếp loại | BE-02 | Test 3 quy tắc chọn điểm; thành phần quá hạn chưa làm = 0 |
| T-S8-FE-01 | FE | SCR-LRN-05, SCR-AST-06 | S7 FE | Mock chạy |
| T-S8-FE-02 | FE | SCR-AST-01, SCR-AST-04, SCR-AST-05, SCR-AST-07 (không gồm xuất file) | FE-01 | Mock chạy |
| T-S8-INT-01 | INT | Tích hợp S8 + e2e "nộp bài tập → chấm → học viên thấy điểm/nhận xét; quiz tự luận chấm tay" | BE-01..03, FE-01,02 | e2e xanh |

## S9 – Chuẩn đầu ra, thống kê, đánh giá khóa
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S9-BE-01 | BE | CLO/PLO CRUD, Bloom, bật PLO, mức đạt tùy biến; `linked_plo_ids` | S8 | Test ràng buộc UK(course,code) |
| T-S9-BE-02 | BE | Liên kết CLO qua `upsertComponent.cloWeights` (thay thế toàn bộ); `listAssessableBlocks`; xử lý `ChapterPublished.removedBlockIds` | BE-01 | Test dùng từ 2 điểm vào cho cùng kết quả |
| T-S9-BE-03 | BE | Tính mức đạt CLO/PLO khi đọc (công thức 3.5.2, đóng góp từng bài), đạt chuẩn đầu ra khóa | BE-02 | Test số học theo ví dụ ≥ 3 bộ dữ liệu |
| T-S9-BE-04 | BE | Thống kê (`getAssessmentStats`, `getQuestionUsage` qua `GetQuestionUsageStats`), xuất Excel/PDF | BE-03 | File mở được; số liệu khớp |
| T-S9-BE-05 | BE | Đánh giá khóa: upsert (Đang học), trả lời, trung bình; Outbox `CourseReview*`; handler ở Discovery | S8 | UK 1 đánh giá/người/khóa |
| T-S9-FE-01 | FE | SCR-AST-02, SCR-AST-03; ô "Liên kết CLO" ở SCR-CNT-06 | S8 FE | Mock chạy |
| T-S9-FE-02 | FE | SCR-AST-08, xuất báo cáo ở AST-07, SCR-AST-09, hiển thị CLO ở AST-06 | FE-01 | Mock chạy |
| T-S9-INT-01 | INT | Tích hợp S9 + e2e "tạo CLO → liên kết bài (từ cả 2 màn) → học viên thấy mức đạt" | BE-01..05, FE-01,02 | e2e xanh |

## S10 – Moderation & Quản trị
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S10-BE-01 | BE | Identity admin: `adminListUsers`, grant/revoke Admin (khóa dòng, Admin ACTIVE cuối), `LockAccount/UnlockAccount`, job tự gỡ khóa hết hạn, event `AccountLocked/Unlocked` + email khóa | S6 | Test đua 2 Admin thu hồi nhau; SELF_LOCK; LAST_ADMIN |
| T-S10-BE-02 | BE | `IModerationTransaction` + Moderation: migration `mod_*`; `createReport` (chống trùng, rate limit, bằng chứng `uploadKey`), `ResolveReportTarget` ở Course/Learning | BE-01 | Test DUPLICATE_REPORT; Only Me → 404 |
| T-S10-BE-03 | BE | Course: `HideCourse/RestoreCourse/PermanentlyDeleteCourse` (+ `CoursePermanentlyDeleted` dọn module khác + tệp); Learning: `SoftDeleteComment/RestoreComment` | BE-02 | Test Only Me không ẩn được; dọn tệp theo tiền tố |
| T-S10-BE-04 | BE | `adminResolveReport` một transaction (rollback khi Contract từ chối), sanction, audit log INSERT-only, `ReportResolved`, hàng đợi/audit/dashboard, job hết hạn Tạm ẩn | BE-03 | Test rollback toàn bộ; audit bất biến |
| T-S10-BE-05 | BE | `adminGetReportTargetContent` (DEC-02), `adminApplySanction/Lift` trực tiếp, `createAnnouncement` + job fan-out, thông báo REPORT_RESULT/SANCTION | BE-04 | Admin đọc được khóa Private/Tạm ẩn **chỉ khi có báo cáo**; Only Me → 404 |
| T-S10-FE-01 | FE | SCR-MOD-06 (dialog báo cáo, gắn vào khóa và bình luận), SCR-MOD-01,02,03 | S6 FE | Mock chạy |
| T-S10-FE-02 | FE | SCR-MOD-04, SCR-MOD-05, SCR-ADM-01, SCR-ADM-02 | FE-01 | Mock chạy |
| T-S10-INT-01 | INT | Tích hợp S10 + e2e "báo cáo → Admin chấp nhận + tạm ẩn → khóa biến khỏi Discovery → khôi phục" | BE-01..05, FE-01,02 | e2e xanh |

## S11 – AI
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S11-BE-01 | BE | `sys_setting` + `ISystemSettings` + `adminGet/UpdateSettings`; `ai_user_daily_quota` (cập nhật có điều kiện) | S10 | Test 2 request đồng thời không vượt hạn mức |
| T-S11-BE-02 | BE | `ILlmClient` (Gemini mặc định, đổi provider qua cấu hình, timeout 30s, retry+circuit breaker); job sinh quiz: 202 + worker + `ImportAiGeneratedQuestions` (DRAFT) | BE-01, S7 | Idempotent theo (aiJobId,itemNo); lỗi → FAILED |
| T-S11-BE-03 | BE | Job sinh flashcard → `ImportAiGeneratedFlashcards` (PENDING), chặn đăng tải khi còn PENDING | BE-02 | Test chặn publish |
| T-S11-BE-04 | BE | `ai-service` Python FastAPI + PhoBERT ONNX int8 (`/score`); `IPhoBertClient`; handler `CommentCreated/CourseUpserted` → scan log → `SubmitAiFlag` | BE-01, S10 | Lỗi dịch vụ → bỏ qua + log; không quét Only Me |
| T-S11-FE-01 | FE | SCR-AI-01, SCR-AI-02 (polling job, quota, duyệt nháp), SCR-ADM-03 (cấu hình) | S7 FE | Mock chạy |
| T-S11-INT-01 | INT | Tích hợp S11 + e2e "sinh quiz AI → duyệt → dùng trong bài"; "bình luận vi phạm → cờ AI trong hàng đợi" | BE-01..04, FE-01 | e2e xanh |

## S12 – Hoàn thiện
| ID | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:-:|:--|:--|:--|
| T-S12-BE-01 | BE | Top 10 (`getTop10` từ fact, tuần/tháng/toàn thời gian; trừ đề cử thu hồi) | S5, S9 | Test theo kỳ |
| T-S12-BE-02 | BE | Đăng nhập Google; xoay lock phiên; dọn Outbox/tệp mồ côi/`tmp/` | S1 | Test OAuth giả lập |
| T-S12-FE-01 | FE | SCR-DSC-03; nút Google ở AUTH-01; tối ưu Lighthouse ≥ 70 (DSC-01, LRN-01) | – | Báo cáo Lighthouse |
| T-S12-INT-01 | INT | e2e ba luồng NFR-17 (đăng ký/đăng nhập; ghi danh và học; làm bài kiểm tra); kiểm thử tải 50 VU/15' (5xx < 1%) | S1–S11 | Đạt NFR-01/02/17 |
| T-S12-OPS-01 | OPS | Triển khai VPS: Docker Compose prod, Nginx, Cloudflare (Origin CA, HSTS), backup MySQL hằng ngày giữ 7 bản + tài liệu khôi phục + thử khôi phục | INT-01 | Chạy production; restore thành công 1 lần |

## Task loại CONTRACT (tạo khi cần)
Mẫu: `T-CON-<n>` – Vai: ARCH/INT. Nội dung: sửa `openapi/modules/*.yaml` hoặc `contracts/*.md`, bundle + lint, tăng `Contract Version`, ghi `docs/handoff/CONTRACT-<n>.md`.