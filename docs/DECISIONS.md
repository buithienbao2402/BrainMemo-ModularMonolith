# DECISIONS – Quyết định bổ sung & sửa đổi (2026-11-11)

Thứ tự nguồn chuẩn khi xung đột:
**DAC_TA (đã sửa theo file này) > THIET_KE_CSDL > schema.sql > SEQUENCE_DIAGRAMS > CLASS_DIAGRAM > KIEN_TRUC**.
Mọi quyết định mới ghi ở đây có hiệu lực cao hơn tài liệu cũ. KIEN_TRUC được phép sửa cho khớp.
Gặp xung đột chưa có ở đây thì DỪNG, ghi vào `docs/OPEN_QUESTIONS.md`, không tự quyết.

| Mã | Quyết định | Tác động |
|:--|:--|:--|
| DEC-01 (A1) | Bỏ `uk_ast_grade_raw`. Thay bằng `UNIQUE(source_attempt_id)` và `UNIQUE(source_submission_id)`. | Migration trên `ast_grade_record`; cập nhật schema.sql |
| DEC-02 (A2) | Admin được **đọc chỉ-đọc** khóa Private/Tạm ẩn/Đã xóa và nội dung liên quan **chỉ khi tồn tại báo cáo** (Chờ xử lý hoặc đã xử lý) trỏ tới khóa đó. Chỉ đi qua endpoint của Moderation (`GET /admin/reports/{id}/target-content`) → Course `GetCourseAccess(purpose=MODERATION_REVIEW)`. Khóa Only Me: không ai ngoài Chủ khóa. | Course bước 4 của 3.5.8.1 thêm ngoại lệ; Moderation kiểm báo cáo trước khi gọi |
| DEC-03 (A3) | **Assessment** sở hữu chấm tay (endpoint, quyền, nhận xét). Việc ghi điểm từng câu vào `lrn_quiz_attempt_answer` do Learning thực hiện qua Contract mới `ApplyManualQuestionGrades`. Sau đó Assessment gọi lại `GradeQuizAttempt`; Learning cập nhật `GRADED` khi nhận `GradeRecorded`. | Contract mới ở Learning |
| DEC-04 (A4) | Một DB, mỗi module một DbContext. Chỉ luồng chế tài của Moderation (ADR-03) dùng chung connection/transaction qua `IModerationTransaction` (BuildingBlocks), các module bị gọi phải hỗ trợ tham gia transaction ngoài. Mọi nơi khác dùng Outbox. | BuildingBlocks |
| DEC-05 (A5) | Client PUT thẳng lên R2 bằng Presigned URL vào prefix `tmp/{userId}/{objectId}`. **Bỏ kiểm tra nội dung thực** (NFR-08 sửa). Giữ bước commit: endpoint nghiệp vụ nhận `uploadKey`, server `HEAD` tệp, kiểm dung lượng (ảnh ≤ 5 MB, tệp ≤ 20 MB) và whitelist đuôi tệp, rồi copy sang khóa chính thức và ghi `storage_key`. Lifecycle rule R2 xóa `tmp/` sau 24 giờ. | NFR-08; Phần 4 CSDL |
| DEC-06 (A6) | Bucket private hoàn toàn, kể cả avatar. Bỏ phân vùng `public/`. Avatar/bìa/tệp trả qua Presigned GET (TTL 15 phút; avatar 1 giờ). | CSDL 4.3, 4.5 |
| DEC-07 (A7) | Sinh AI **bất đồng bộ**: `POST` trả `202 {jobId}`; FE polling `GET /ai/jobs/{id}` mỗi 2 giây. Không có thông báo "AI hoàn thành" (bỏ `AIGenerationCompleted` → Notification, C5). | SD-10 sửa |
| DEC-08 (A8) | Profile gọi Course `ListUserCourses(audience=PUBLIC)`; bỏ `IProfilePrivacy` khỏi KIEN_TRUC. | KIEN_TRUC |
| DEC-09 (C1) | Dữ liệu liên kết CLO thuộc Assessment. Giao diện soạn Content và giao diện Chuẩn đầu ra **cùng gọi** `PUT /courses/{id}/assessment/components/{blockId}`. | FE có 2 điểm vào |
| DEC-10 (C2) | Admin được báo cáo, nhưng chỉ với đối tượng Admin truy cập được theo luật thường. | – |
| DEC-11 (C3) | Giữ một `COMPONENT_FINAL` theo quy tắc của khóa. API bảng điểm trả thêm `highest/latest/average` tính khi đọc. | Không đổi schema |
| DEC-12 (C4) | Thêm bảng `sys_setting(key PK, value JSON, updated_by, updated_at)`. Tổng **59 bảng**. Truy cập qua `ISystemSettings`. Khóa: `ai.flag_threshold`, `ai.daily_quota`, `ai.llm_provider`. | Migration; Registry 5.1 |
| DEC-13 (C6) | `ast_assessment_component` tạo kiểu upsert khi Chủ khóa đặt trọng số hoặc liên kết CLO, từ bất kỳ màn hình nào. | – |
| DEC-14 (C7) | `db/schema.sql` là baseline. Mọi thay đổi sau đó đi qua EF Core Migration, đồng thời cập nhật lại `schema.sql` cho khớp. | – |
| DEC-15 | Tên Contract dùng kiểu CSDL (`GetCourseAccess`), gom thành interface theo module (`ICourseContract`). Tên event dùng đúng THIET_KE_CSDL 4.8. Tên cũ trong KIEN_TRUC/CLASS_DIAGRAM (`ICourseAccess`, `CommentPosted`, `AttemptSubmitted`, `CoursePurged`...) bị loại bỏ. | – |
| DEC-16 | Mã HTTP: 401 chưa đăng nhập; 403 đã đăng nhập nhưng thiếu quyền (vì khóa/chương hiển thị công khai); **404 để giấu sự tồn tại** (Only Me, Tạm ẩn/Đã xóa với người không phải chủ khóa). Khách chạm vào tài nguyên cần đăng nhập → 401. | Mọi module |
| DEC-17 | Chấm điểm: một loại `MULTIPLE_CHOICE` + cờ `allow_multiple`; Strategy chọn theo cờ. | CLASS_DIAGRAM 2 |
| DEC-18 | `IFileStorage` S3-compatible: R2 ở production, MinIO ở dev. Tên `MinioStorageService` đổi thành `S3FileStorage`. | CLASS_DIAGRAM 7 |
| DEC-19 | Xác thực: access token JWT 30 phút trong body (FE giữ trong bộ nhớ). Refresh token 14 ngày, xoay vòng, cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. Email chưa xác minh vẫn đăng nhập được nhưng **không tạo khóa, không dùng AI**. Mỗi request xác thực kiểm `account_status`. | Identity |
| DEC-20 | API: prefix `/api/v1`; phân trang `page`/`pageSize` (≤ 50); lỗi theo RFC 9457 ProblemDetails + `code` + `errors[]` tiếng Việt; ID là UUID chuỗi (UUIDv7); thời gian ISO-8601 UTC; JSON camelCase. | openapi |
| DEC-21 | LLM qua `ILlmClient`, mặc định Gemini free API; provider đổi bằng cấu hình `ai.llm_provider`. Stack Python AI-service: FastAPI + ONNX Runtime. | Tech stack |
| DEC-22 | MediatR/CQRS áp dụng cho cả 10 module. | – |
| DEC-23 | Monorepo. Một file OpenAPI mỗi module, gộp tự động thành `openapi/openapi.yaml`. | – |
| DEC-24 | Sửa lỗi nhỏ: CSDL 5.2 FR-NTF-03 index đúng là `(status,next_attempt_at)`; CSDL 4.3 "3.6.9.4" đúng là 3.6.7.4; bỏ chữ "Inbox" khỏi KIEN_TRUC (dùng UK idempotent); scheduler "Top 10" bỏ (tính trực tiếp từ fact); SD-10 bổ sung luồng flashcard (cùng cơ chế job, `jobType=FLASHCARD`). | Docs |
| DEC-25 | Mã N*/D*/PD*/C* trong tài liệu cũ coi là đã giải quyết theo nội dung THIET_KE_CSDL. | – |
| DEC-26 | Đặc tả không có chức năng gửi lại email xác minh → không làm. Mời học viên bằng **email** (server tra `FindUserIdByEmail`, rate limit). | Identity |