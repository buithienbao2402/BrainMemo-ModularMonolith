# BACKLOG – Task cho AI (Batched & Streamlined)

> **Chiến lược Batching Tasks (Gộp Task):**  
> Để giảm thiểu **context overhead** (đọc spec, setup branch, viết handoff, mở PR lặp đi lặp lại), các task con có liên quan chặt chẽ về cùng module, luồng nghiệp vụ hoặc tầng dữ liệu đã được gộp thành các **Batched Tasks**.  
> - Mỗi Batched Task giải quyết trọn vẹn một lát tính năng hoàn chỉnh (Feature Slice).  
> - Giữ vững ranh giới vai trò (`BE`, `FE`, `INT`, `OPS`) và DoD nghiêm ngặt theo `AGENT.md`.  
> - Cột **Gốc** chỉ rõ các task con ban đầu đã được gom vào.

Quy ước trạng thái trên `docs/BACKLOG_STATUS.md`: `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE` | `BLOCKED`.

---

## S0 – Nền tảng (Đã hoàn thành)
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S0-OPS-01 | T-S0-OPS-01 | OPS | Khởi tạo monorepo theo REPO_STRUCTURE (thư mục, .gitignore, .editorconfig, README, đưa tài liệu vào `docs/spec`) | – | Cây thư mục khớp; README có hướng dẫn chạy |
| T-S0-OPS-02 | T-S0-OPS-02 | OPS | `infra/docker-compose.dev.yml`: MySQL 8, MinIO (bucket + lifecycle `tmp/` 24h), Mailpit, ai-service stub; `.env.example` | 01 | `docker compose up` chạy; MySQL nạp `db/schema.sql` |
| T-S0-DB-01 | T-S0-DB-01 | DB | Đưa `schema.sql` vào `db/`; áp dụng DEC-01 (UNIQUE đơn trên `ast_grade_record`) và DEC-12 (`sys_setting`) trong schema.sql; seed Admin đầu tiên + hướng dẫn | 02 | Chạy sạch trên MySQL 8; 59 bảng; seed Admin |
| T-S0-BE-01 | T-S0-BE-01 | BE | Solution + dự án BuildingBlocks: SharedKernel (Result/Error/Entity/IClock), Abstractions, Infrastructure khung (Paging, MediatR behaviors, EventBus in-process) | 01 | Build sạch; unit test cho Result/Paging |
| T-S0-BE-02 | T-S0-BE-02 | BE | Host `BrainMemo.WebApi`: JWT bearer, ProblemDetails tiếng Việt (ánh xạ mã lỗi §3), RateLimiter (login 5/phút/IP), CORS, `/health`, Swagger, đăng ký module động | BE-01 | `GET /health` 200; lỗi trả đúng dạng Problem |
| T-S0-BE-03 | T-S0-BE-03 | BE | Outbox chung: bảng-agnostic `OutboxWriter` + `OutboxDispatcher` (HostedService) dùng cho Course/Learning/Assessment | BE-01 | Test: ghi event cùng TX, phát sau commit, bỏ trùng theo EventId |
| T-S0-BE-04 | T-S0-BE-04 | BE | `Architecture.Tests` (NetArchTest) bảo đảm luật REPO_STRUCTURE §2 | BE-01 | Test đỏ khi vi phạm tham chiếu |
| T-S0-BE-05 | T-S0-BE-05 | BE | `S3FileStorage` (R2/MinIO): CreateUploadUrl/Head/Commit/CreateDownloadUrl/Delete/DeleteByPrefix + endpoint `POST /files/upload-urls` | BE-02, OPS-02 | Integration test với MinIO |
| T-S0-OPS-03 | T-S0-OPS-03 | OPS | `tools/merge-openapi` + lint Redocly + script `openapi:bundle`; sinh `openapi/openapi.yaml` từ `modules/` | 01 | Bundle sạch, lint sạch, trùng schema → lỗi |
| T-S0-FE-01 | T-S0-FE-01 | FE | Khung FE: Vite/TS/Tailwind/shadcn, router, providers, `shared/api` (openapi-fetch, single-flight refresh, errors), layout, guards, i18n vi, `gen:api`, MSW/Prism | OPS-03 | `pnpm dev` chạy; hiển thị SCR-COM-01/02 khung; gen type thành công |
| T-S0-OPS-04 | T-S0-OPS-04 | OPS | Jenkinsfile: build+test BE, lint+typecheck+build FE, lint OpenAPI; Dockerfile BE/FE/ai-service; nginx.conf | BE-01, FE-01 | Pipeline chạy xanh trên repo trống |

---

## S1 – Identity & Tài khoản
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S1-BE-01 | BE-01 | BE | Identity domain + DbContext + migration khớp `idn_*`; `IIdentityContract` (GetAccountStatus, IsAdmin, GetUserSummary, FindUserIdByEmail) | S0 | Unit test Domain; contract test đạt |
| T-S1-BE-02 | BE-02 | BE | Register + VerifyEmail (token SHA-256, TTL cấu hình, cập nhật có điều kiện) + event `UserRegistered`, `EmailVerificationRequested` | BE-01 | Test: token dùng 1 lần, hết hạn bị từ chối, email trùng 409 |
| T-S1-BE-03 | BE-03 + BE-04 | BE | **Auth, Session & Password Lifecycle (Batched):** Login/Refresh (cookie xoay vòng 14d, chống race), Logout/LogoutAll, Quản lý phiên (`idn_user_session`), Forgot/Reset/Change Password (thu hồi token/phiên), `GET /auth/me`, kiểm tra `account_status`, tự gỡ khóa hết hạn | BE-01, BE-02 | Test 2 refresh đồng thời; tài khoản khóa bị chặn; reset/change mật khẩu thu hồi phiên |
| T-S1-BE-04 | BE-05 + BE-06 | BE | **Skeletons & Handlers (Notification + Profile - Batched):** Bảng `ntf_*` & `prf_*`, handler `UserRegistered` tạo profile mặc định + gửi mail xác minh (Mailpit, 3 template, retry), `GetDisplayInfo`, `GET/PUT /profiles/me` | BE-02 | Gửi mail qua Mailpit; token không lọt log/DB; tạo profile idempotent theo PK |
| T-S1-FE-01 | FE-01 + FE-02 | FE | **Auth & Account UI (Batched):** SCR-AUTH-01..06 (Đăng ký, Đăng nhập, Xác minh, Quên/Đổi MK, Quản lý phiên) + SCR-COM-03 (Header user menu) + auth guards & khôi phục phiên | S0 FE-01 | Chạy sạch với mock API; đủ 4 trạng thái (loading/empty/error/success) |
| T-S1-INT-01 | INT-01 | INT | Tích hợp S1 + e2e Playwright: Đăng ký → Xác minh Mailpit → Đăng nhập → Đổi MK → Đăng xuất | BE-01..04, FE-01 | Bộ e2e xanh; API FE ↔ BE chuẩn hợp đồng |

---

## S2 – Profile, Files & Quản lý Khóa học
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S2-BE-01 | BE-01 | BE | **Profile hoàn chỉnh:** Cập nhật thông tin + upload avatar (commit `uploadKey` qua S3/R2), `GetPublicProfile`, event `ProfileUpdated` | S1 | Test commit tệp (kích thước/whitelist định dạng); cập nhật profile chuẩn xác |
| T-S2-BE-02 | BE-02 + BE-03 + BE-04 | BE | **Course Module Toàn diện (Batched):** Domain & migration `crs_*`; CRUD khóa học, tags ≤10, upload ảnh bìa, xóa mềm, `revision`, Outbox `CourseUpserted`; Phân quyền truy cập 3.5.8.1 `GetCourseAccess` (kèm ModerationReview); Queries danh sách (`GetCourseSummaries`, `ListUserCourses`, `GET /profiles/{id}/courses`, `GET /me/courses`) | S1, S0 BE-03 | Test ma trận 3.2.2; Only Me/Tạm ẩn không lộ ở public; Outbox phát event chuẩn |
| T-S2-FE-01 | FE-01 + FE-02 | FE | **FE Profile & Course Management (Batched):** SCR-PRF-01, 02 (Xem/Sửa hồ sơ + Upload avatar) + SCR-CRS-01, 02, 03 (Chi tiết giới thiệu, Form Tạo/Sửa khóa học, Quản lý khóa học) | S1 FE-01 | Chạy mượt với mock; kiểm soát quyền xem theo viewer state |
| T-S2-INT-01 | INT-01 | INT | Tích hợp S2 + e2e: Tạo khóa học → Upload bìa & avatar → Xem hồ sơ → Đổi trạng thái Only Me (người khác 404) | BE-01..02, FE-01 | e2e xanh; upload S3/MinIO thực tế thành công |

---

## S3 – Content cơ bản (Chương & Soạn thảo)
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S3-BE-01 | BE-01 + BE-02 | BE | **Content Domain, Resource Library & Drafting (Batched):** Domain + migration 15 bảng `cnt_*`; Quản lý tài nguyên khóa học (commit `uploadKey`, whitelist size/mime, xóa mềm `RESOURCE_IN_USE`, presigned download); CRUD chương, sắp xếp thứ tự; Lưu nháp với khóa lạc quan (optimistic locking), 7 loại Block nội dung, HTML sanitize, `GET draft` | S2 | Test giới hạn tệp; VERSION_CONFLICT khi sửa đồng thời; snapshot nháp an toàn |
| T-S3-BE-02 | BE-03 | BE | **Publishing, Version History & Contracts (Batched):** Đăng tải chương trọn gói (kiểm tra điều kiện 3.6.6.3, sinh `cnt_published_block`), lịch sử phiên bản, khôi phục bản nháp từ lịch sử; Event `ChapterPublished/Deleted`; Contracts truy vấn nội dung xuất bản | BE-01 | Đăng tải trọn gói nguyên khối; khôi phục an toàn về nháp; contract test đạt |
| T-S3-FE-01 | FE-01 + FE-02 | FE | **FE Content Editor Suite (Batched):** SCR-CNT-01, 02, 03, 07 (Trình soạn thảo Block/Tiptap, flashcard, drawer quản lý tài nguyên, xem trước nháp, lịch sử phiên bản & khôi phục, cảnh báo thoát khi chưa lưu) | S0 FE-01 | Mock chạy mượt; ngăn chặn mất dữ liệu uncommitted; đúng giao diện |
| T-S3-INT-01 | INT-01 | INT | Tích hợp S3 + e2e: Soạn thảo block + upload ảnh → Lưu nháp → Xử lý xung đột 2 tab → Đăng tải chương → Khôi phục lịch sử | BE-01..02, FE-01 | e2e xanh |

---

## S4 – Ghi danh, Quyền truy cập & Learning Player
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S4-BE-01 | BE-01 + BE-02 | BE | **Enrollment & Chapter Access Engine (Batched):** Ghi danh 5 trạng thái (enroll/leave/remove/invite/accept/decide), cập nhật có điều kiện, Outbox `EnrollmentChanged`; Chế độ truy cập chương (Free, Member, Protected kèm passcode BCrypt & rate limit), `CheckChapterAccess`, xử lý `ChapterDeleted` | S3 | Test ma trận 3.2.2 khóa × chương × vai; test race condition ghi danh; brute-force passcode bị chặn |
| T-S4-BE-02 | BE-03 | BE | **Learning Progress & Player Service:** Đọc chương (`readChapter`), đánh dấu hoàn thành Block (`completeBlock`), tính toán tiến độ chương/khóa học, event `CourseCompleted` (đúng 1 lần), hệ thống bookmark, `GetCourseProgress`, `ListInProgressCourses` | BE-01 | Khách/chưa ghi danh không thể ghi tiến độ; tiến độ không bị sai lệch khi thêm chương mới |
| T-S4-FE-01 | FE-01 + FE-02 | FE | **FE Enrollment & Learning Player (Batched):** SCR-CRS-05, 06 (Danh sách học viên, duyệt yêu cầu ghi danh) + SCR-LRN-01, 07 (Trình đọc nội dung, nhập passcode chương, thanh tiến độ, đánh dấu bookmark, Khách chỉ đọc) | S3 FE-01 | Giao diện hiển thị đúng theo trạng thái ghi danh & passcode |
| T-S4-INT-01 | INT-01 | INT | Tích hợp S4 + e2e: Ghi danh Public → Đọc bài → Hoàn thành block → Tiến độ tăng; Khóa Private xin vào → Duyệt → Mở chương Protected bằng passcode | BE-01..02, FE-01 | e2e xanh |

---

## S5 – Discovery (Khám phá & Tìm kiếm)
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S5-BE-01 | BE-01 + BE-02 + BE-03 | BE | **Discovery Module Trọn gói (Batched):** Migration `dsc_*`; Event handlers đồng bộ (`CourseUpserted`, `CoursePermanentlyDeleted`, `EnrollmentChanged`, `ChapterPublished`, `ProfileUpdated` - idempotent theo `revision`); Search & Home API (`getHome` gợi ý ngẫu nhiên, `searchCourses` lọc 6 tiêu chí & sắp xếp, lịch sử tìm kiếm); Job CLI Rebuild read model | S4 | Only Me/Tạm ẩn/Đã xóa tuyệt đối không xuất hiện; Rebuild CLI đồng bộ chuẩn xác từ snapshots |
| T-S5-FE-01 | FE-01 | FE | **FE Discovery (Batched):** SCR-DSC-01 (Trang chủ, banner, danh mục, gợi ý) + SCR-DSC-02 (Tìm kiếm, bộ lọc nâng cao, phân trang, lịch sử tìm kiếm) | S0 FE-01 | Mock chạy; tương tác lọc/sắp xếp mượt mà |
| T-S5-INT-01 | INT-01 | INT | Tích hợp S5 + e2e: Tạo khóa Public → Xuất hiện ở trang chủ & tìm kiếm → Đổi sang Only Me → Ngay lập tức biến mất | BE-01, FE-01 | e2e xanh |

---

## S6 – Bình luận, Thông báo & Đề cử
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S6-BE-01 | BE-01 + BE-02 | BE | **Comments & In-App Notifications (Batched):** Bình luận khóa/chương (tạo, trả lời 1 cấp, sửa, xóa mềm, chủ khóa ghim); In-app Notification engine (handlers tự động theo bảng 3.4.6.1: ghi danh, bình luận mới, chương mới; API list/unread/read/read-all/delete) | S4 | Ràng buộc cha cùng khóa/chương; chỉ chủ khóa được ghim; thông báo idempotent theo Unique Key |
| T-S6-BE-02 | BE-03 | BE | **Nominations & Learning Stats (Batched):** Đề cử khóa học & thu hồi đề cử (Outbox `NominationChanged`); Thống kê khóa học (`GetCourseStats`, `GetCourseLearningStats`) | S4 | Mỗi người đúng 1 đề cử hiệu lực/khóa; giữ đề cử khi rời khóa |
| T-S6-FE-01 | FE-01 + FE-02 | FE | **FE Social & Notifications (Batched):** SCR-LRN-06 (Luồng bình luận, trả lời, ghim) + SCR-NTF-01 (Trung tâm thông báo, chuông real-time) + SCR-CRS-04 (Dashboard thống kê khóa học & nút đề cử ở CRS-01) | S4 FE-01 | Giao diện trực quan; badge đếm thông báo chưa đọc cập nhật chuẩn |
| T-S6-INT-01 | INT-01 | INT | Tích hợp S6 + e2e: Học viên bình luận → Chuông thông báo hiển thị cho Chủ khóa → Chủ khóa ghim bình luận → Học viên đề cử khóa học | BE-01..02, FE-01 | e2e xanh |

---

## S7 – Ngân hàng câu hỏi & Quiz (Kiểm tra)
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S7-BE-01 | BE-01 + BE-02 | BE | **Question Bank & Quiz Authoring (Batched):** Ngân hàng câu hỏi trong Content (CRUD 6 loại câu, phân loại độ khó, DRAFT/READY/ARCHIVED, import/export CSV/Excel); Cấu hình Quiz trong chương (random rules, bốc đề `DrawQuizQuestions`, điều kiện đăng tải quiz, mật khẩu quiz BCrypt, ngoại lệ học viên) | S4 | Validate chặt khi READY; bốc đề không trùng lặp; báo lỗi khi không đủ câu hỏi hợp lệ |
| T-S7-BE-02 | BE-03 + BE-04 + BE-05 | BE | **Quiz Engine & Auto-Grading (Batched):** Migration `ast_*`; Lifecycle làm bài (`startQuizAttempt` snapshot đề không lộ đáp án, autosave câu trả lời, tính deadline server, worker tự nộp hết giờ); Bộ chấm tự động ADR-04 (`IGradingStrategy` cho Multiple Choice, True/False, Fill Blank, Matching; tự luận chờ chấm tay); Upsert `ast_grade_record`; Cơ chế nộp bài TX1+TX2 an toàn | BE-01 | Không rò rỉ đáp án; F5 khôi phục đúng bài; hết giờ tự động nộp; điểm số tính chuẩn xác |
| T-S7-FE-01 | FE-01 + FE-02 | FE | **FE Question Bank & Quiz Authoring (Batched):** SCR-CNT-04, 05, 08 (Quản lý ngân hàng câu hỏi, modal tạo/sửa 6 loại câu, import/export) + SCR-CNT-06, 09 (Cấu hình Quiz trong editor, chọn quy tắc bốc đề, xem trước đề) | S3 FE-01 | Giao diện tạo câu hỏi sinh động; import file có kiểm tra lỗi định dạng |
| T-S7-FE-02 | FE-03 | FE | **FE Quiz Player:** SCR-LRN-02, 03, 04 (Giao diện làm quiz toàn màn hình, đồng hồ đếm ngược, danh sách câu hỏi điều hướng nhanh, autosave mượt mà, modal xác nhận nộp & màn hình kết quả) | S4 FE-01 | Tự nộp khi đếm ngược về 0; không mất bài khi tải lại trang |
| T-S7-INT-01 | INT-01 | INT | Tích hợp S7 + e2e: Giảng viên tạo ngân hàng câu hỏi → Tạo Quiz bốc đề → Học viên làm bài (test F5 khôi phục, autosave) → Hết giờ/Nộp bài → Xem điểm số & feedback | BE-01..02, FE-01..02 | e2e xanh |

---

## S8 – Bài tập, Chấm tay & Bảng điểm
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S8-BE-01 | BE-01 + BE-02 | BE | **Assignments & Manual Grading Pipeline (Batched):** Quản lý nộp bài tập (`saveSubmissionDraft`, `submitAssignment` commit tệp `uploadKey`, cờ `is_late`, tạo record chờ chấm); Hàng đợi chấm thi DEC-03 (`listGradingQueue`, `getAttemptForReview`); Chấm điểm thủ công bài tự luận & bài tập (`gradeAttemptManually`, `gradeSubmission`), chuyển trạng thái GRADED & phát `GradeRecorded` | S7 | Học viên không được nộp lại sau khi đã submit; điểm chấm không vượt max điểm; thông báo gửi về cho học viên |
| T-S8-BE-02 | BE-03 | BE | **Gradebook & Evaluation Rules (Batched):** Cấu hình đánh giá môn học (trọng số thành phần, `COMPONENT_FINAL`); Bảng điểm (của tôi, học viên, toàn khóa) hỗ trợ 3 quy tắc chọn điểm (highest/latest/average); Xếp loại học lực | BE-01 | Điểm thành phần quá hạn chưa nộp = 0; tính toán trọng số chuẩn xác |
| T-S8-FE-01 | FE-01 + FE-02 | FE | **FE Grading Suite & Gradebook (Batched):** SCR-LRN-05 (Giao diện nộp bài tập & xem kết quả) + SCR-AST-01, 04, 05, 06, 07 (Hàng đợi chấm bài giảng viên, giao diện chấm điểm tự luận kèm nhận xét, bảng điểm tổng hợp) | S7 FE-01 | Hỗ trợ chấm điểm nhanh, lọc danh sách bài cần chấm |
| T-S8-INT-01 | INT-01 | INT | Tích hợp S8 + e2e: Học viên nộp file bài tập → Giảng viên vào hàng đợi chấm bài & cho điểm → Học viên nhận thông báo và thấy điểm trên Bảng điểm | BE-01..02, FE-01 | e2e xanh |

---

## S9 – Chuẩn đầu ra (CLO/PLO), Báo cáo & Đánh giá khóa
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S9-BE-01 | BE-01..04 | BE | **CLO/PLO Engine, Analytics & Export (Batched):** CRUD CLO/PLO, thang Bloom, ánh xạ chuẩn đầu ra; Liên kết trọng số CLO vào bài thi/câu hỏi (`cloWeights`); Công thức tính mức đạt chuẩn đầu ra 3.5.2; Thống kê đánh giá & xuất báo cáo Excel/PDF | S8 | Ràng buộc UK(course,code); tính toán chuẩn số học theo spec; file báo cáo mở chuẩn định dạng |
| T-S9-BE-02 | BE-05 | BE | **Course Review & Rating:** Học viên đánh giá khóa học (1-5 sao, nhận xét), giảng viên phản hồi; Outbox `CourseReview*`; Đồng bộ điểm rating ra Discovery | S8 | Unique 1 đánh giá/học viên/khóa (chỉ áp dụng cho học viên đang học) |
| T-S9-FE-01 | FE-01 + FE-02 | FE | **FE CLO/PLO, Analytics & Reviews (Batched):** SCR-AST-02, 03 (Quản lý CLO/PLO, ma trận liên kết bài thi) + SCR-AST-08, 09 (Báo cáo trực quan mức đạt chuẩn, xuất file) + Form đánh giá sao ở chi tiết khóa | S8 FE-01 | Biểu đồ trực quan; form liên kết CLO thao tác thuận tiện |
| T-S9-INT-01 | INT-01 | INT | Tích hợp S9 + e2e: Thiết lập CLO → Liên kết vào Quiz & Bài tập → Sau khi chấm, xem báo cáo mức đạt chuẩn → Đánh giá khóa học 5 sao | BE-01..02, FE-01 | e2e xanh |

---

## S10 – Moderation & Quản trị Hệ thống
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S10-BE-01 | BE-01 | BE | **Identity Admin & Account Controls:** Quản lý người dùng Admin (`adminListUsers`), phân quyền/thu hồi quyền Admin (khóa dòng, chống hủy Admin cuối cùng), Khóa/Mở khóa tài khoản, job tự gỡ khóa hết hạn, event `AccountLocked/Unlocked` | S6 | Chống race 2 admin thu hồi nhau; cấm tự khóa chính mình; gửi email thông báo |
| T-S10-BE-02 | BE-02..05 | BE | **Full Moderation Pipeline, Sanctions & Audit (Batched):** Migration `mod_*`; Báo cáo vi phạm (`createReport`, đính kèm bằng chứng `uploadKey`); Hooks xử lý nội dung khóa/bình luận; Transaction xử lý báo cáo `IModerationTransaction` (áp dụng chế tài, tạm ẩn/khôi phục, audit log INSERT-only bất biến); Xem nội dung vi phạm DEC-02; Thông báo hệ thống & broadcast | BE-01 | Báo cáo Only Me trả về 404; Rollback toàn bộ khi từ chối; Audit log không thể bị sửa/xóa |
| T-S10-FE-01 | FE-01 + FE-02 | FE | **FE Moderation & Admin Portal (Batched):** SCR-MOD-01..06 (Hộp thoại gửi báo cáo vi phạm, hàng đợi báo cáo của Admin, chi tiết thẩm định bằng chứng, thực hiện chế tài) + SCR-ADM-01, 02 (Danh sách người dùng, phân quyền Admin, khóa tài khoản) | S6 FE-01 | Giao diện trực quan cho Admin xử lý; thao tác chế tài yêu cầu xác nhận rõ ràng |
| T-S10-INT-01 | INT-01 | INT | Tích hợp S10 + e2e: Người dùng báo cáo khóa học vi phạm → Admin tiếp nhận hàng đợi → Tạm ẩn khóa học → Khóa biến mất khỏi Discovery → Khôi phục lại | BE-01..02, FE-01 | e2e xanh |

---

## S11 – AI Services (GenAI & Content Safety)
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S11-BE-01 | BE-01..03 | BE | **GenAI Quiz & Flashcard Service (Batched):** Cấu hình `sys_setting` & quota hàng ngày của người dùng; `ILlmClient` (Gemini API, timeout, circuit breaker); Background jobs sinh câu hỏi Quiz & Flashcard nháp tự động từ tài liệu | S10, S7 | Kiểm soát quota đồng thời chống lạm dụng; import dạng nháp DRAFT/PENDING; chặn xuất bản khi chưa duyệt |
| T-S11-BE-02 | BE-04 | BE | **PhoBERT Content Safety Service:** `ai-service` Python FastAPI + mô hình PhoBERT ONNX int8 (`/score`); C# `IPhoBertClient`; Background worker quét bình luận/nội dung khóa mới để tự động gắn cờ vi phạm | BE-01 | Tự động gắn cờ vi phạm vào hàng đợi Moderation; lỗi AI không làm nghẽn luồng chính |
| T-S11-FE-01 | FE-01 | FE | **FE AI Features & Quota Management (Batched):** SCR-AI-01, 02 (Giao diện yêu cầu AI sinh câu hỏi/flashcard, theo dõi tiến độ job, duyệt nội dung sinh) + SCR-ADM-03 (Quản trị quota và cấu hình AI) | S7 FE-01 | Hiển thị quota trực quan; thao tác duyệt/sửa nội dung AI đề xuất tiện lợi |
| T-S11-INT-01 | INT-01 | INT | Tích hợp S11 + e2e: Gửi tài liệu yêu cầu AI sinh Quiz → Worker sinh hoàn tất → Giảng viên duyệt vào bài thi; Học viên bình luận xấu → PhoBERT gắn cờ vi phạm | BE-01..02, FE-01 | e2e xanh |

---

## S12 – Hoàn thiện & Triển khai Production
| ID | Gốc | Vai | Nội dung | Phụ thuộc | Hoàn thành khi |
|:--|:--|:-:|:--|:--|:--|
| T-S12-BE-01 | BE-01 + BE-02 | BE | **Top 10, Google OAuth & Housekeeping (Batched):** BXH Top 10 khóa học (tuần/tháng/toàn thời gian); Đăng nhập mạng xã hội Google OAuth; Các worker dọn dẹp (Outbox đã gửi, file mồ côi trên S3/R2, session hết hạn) | S5, S9, S1 | Xếp hạng chuẩn xác; đăng nhập Google mượt mà; worker chạy định kỳ an toàn |
| T-S12-FE-01 | FE-01 | FE | **FE Top 10, Social Auth & Lighthouse (Batched):** SCR-DSC-03 (Trang bảng xếp hạng Top 10) + Nút đăng nhập Google tại màn hình Auth + Tối ưu hóa hiệu năng Lighthouse ≥ 70 | – | Điểm Lighthouse DSC-01 & LRN-01 ≥ 70 |
| T-S12-INT-01 | INT-01 | INT | **System Verification & Load Testing:** Kiểm thử toàn diện 3 luồng người dùng NFR-17; Chạy kiểm thử tải (Load test) 50 người dùng đồng thời trong 15 phút (tỷ lệ 5xx < 1%) | S1–S11 | Đạt chuẩn NFR-01/02/17 |
| T-S12-OPS-01 | OPS-01 | OPS | **Triển khai Production VPS:** Cấu hình Docker Compose production, Nginx reverse proxy SSL/TLS, Cloudflare Origin CA & HSTS, Cron backup MySQL tự động giữ 7 ngày + diễn tập khôi phục | INT-01 | Hệ thống chạy thông suốt trên môi trường production VPS; khôi phục backup thành công |
