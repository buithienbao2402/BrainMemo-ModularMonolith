# TÀI LIỆU THIẾT KẾ UML SEQUENCE DIAGRAM
## 10 PHÂN HỆ CỐT LÕI - HỆ THỐNG QUẢN LÝ KHÓA HỌC VÀ HỌC TẬP TRỰC TUYẾN

> **Căn cứ tài liệu:** `DAC_TA_YEU_CAU_HE_THONG.md` & `schema.sql`  
> **Kiến trúc:** Modular Monolith (10 Bounded Contexts, No Cross-Module FK).  
> **Nguyên tắc giao tiếp:** Giao tiếp đồng bộ qua **Contract công khai**, giao tiếp bất đồng bộ qua **Domain Event** kết hợp **Transactional Outbox Pattern**; kiểm tra phân quyền đa tầng tại Backend; nguyên tắc AI **Human-in-the-loop**.

---

## MỤC LỤC 10 SEQUENCE DIAGRAMS

1. [SD-01 (Identity Module): Xác thực đăng nhập & Kiểm tra trạng thái tài khoản](#sd-01-identity-module-xác-thực-đăng-nhập--kiểm-tra-trạng-thái-tài-khoản)
2. [SD-02 (Course Module): Quản lý chế độ truy cập & Ghi danh khóa học](#sd-02-course-module-quản-lý-chế-độ-truy-cập--ghi-danh-khóa-học)
3. [SD-03 (Content Module): Tổ chức cấu trúc phân cấp & Cấu hình bài kiểm tra](#sd-03-content-module-tổ-chức-cấu-trúc-phân-cấp--cấu-hình-bài-kiểm-tra)
4. [SD-04 (Learning Module): Truy cập học tập ma trận Khóa - Chương & Tiến độ](#sd-04-learning-module-truy-cập-học-tập-ma-trận-khóa---chương--tiến-độ)
5. [SD-05 (Assessment Module): Nộp bài thi, Chấm tự động & Tính chuẩn đầu ra CLO](#sd-05-assessment-module-nộp-bài-thi-chấm-tự-động--tính-chuẩn-đầu-ra-clo)
6. [SD-06 (Discovery Module): Khám phá, Tìm kiếm, Lọc & Bảng xếp hạng Top 10](#sd-06-discovery-module-khám-phá-tìm-kiếm-lọc--bảng-xếp-hạng-top-10)
7. [SD-07 (Profile Module): Quản lý hồ sơ cá nhân & Thiết lập quyền riêng tư](#sd-07-profile-module-quản-lý-hồ-sơ-cá-nhân--thiết-lập-quyền-riêng-tư)
8. [SD-08 (Notification Module): Tiếp nhận Domain Event & Quản trị thông báo hệ thống](#sd-08-notification-module-tiếp-nhận-domain-event--quản-trị-thông-báo-hệ-thống)
9. [SD-09 (Moderation Module): Xử lý báo cáo vi phạm, Chế tài & Ghi Audit Log](#sd-09-moderation-module-xử-lý-báo-cáo-vi-phạm-chế-tài--ghi-audit-log)
10. [SD-10 (AI Module): Sinh nội dung AI & Quét kiểm duyệt tự động](#sd-10-ai-module-sinh-nội-dung-ai--quét-kiểm-duyệt-tự-động)

---

### SD-01 (Identity Module): Xác thực đăng nhập & Kiểm tra trạng thái tài khoản

- **Mục đích nghiệp vụ:** Xác thực người dùng qua email/mật khẩu (BCrypt), kiểm tra trạng thái khóa tài khoản đa tầng, tự động mở khóa nếu hết hạn và cấp phát JWT Token.
- **Mã FR liên quan:** `FR-IDN-03`, `FR-IDN-05`, `Mục 3.1.1`, `NFR-04`, `NFR-05`.
- **Actor và Lifelines:** `Guest`, `Identity Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as "Khách (Guest)"
    participant Identity as "Identity Module"

    Guest->>Identity: Đăng nhập (email, password)
    activate Identity

    Identity->>Identity: Kiểm tra mật khẩu (BCrypt hash)
    alt Mật khẩu không chính xác
        Identity->>Identity: Tăng failed_login_attempts += 1
        opt failed_login_attempts  >=  5
            Identity->>Identity: Khóa tạm thời 15 phút (status = 'LOCKED', lock_until)
        end
        Identity-->>Guest: Báo lỗi - Email hoặc mật khẩu không chính xác
    else Mật khẩu chính xác
        Identity->>Identity: Reset failed_login_attempts = 0
        Identity->>Identity: Kiểm tra trạng thái tài khoản
        
        alt Trạng thái: Bị khóa có thời hạn
            alt Thời hạn khóa đã hết
                Identity->>Identity: Tự động mở khóa -> Trạng thái - Hoạt động (status = 'ACTIVE')
                Identity->>Identity: Cấp phát phiên (Access Token <= 30m, Refresh Token)
                Identity-->>Guest: Đăng nhập thành công (Trả về JWT Tokens)
            else Vẫn trong thời hạn khóa
                Identity->>Identity: Thu hồi toàn bộ Refresh Token
                Identity-->>Guest: Từ chối đăng nhập (Kèm lý do và thời hạn khóa)
            end
        else Trạng thái: Bị khóa vĩnh viễn
            Identity->>Identity: Thu hồi toàn bộ Refresh Token
            Identity-->>Guest: Từ chối đăng nhập - Tài khoản đã bị vô hiệu hóa
        else Trạng thái: Hoạt động
            Identity->>Identity: Cấp phát phiên mới (Access Token, Refresh Token)
            Identity-->>Guest: Đăng nhập thành công (Trả về JWT Tokens)
        end
    end
    deactivate Identity
```

- **Mô tả ngắn gọn:** Khách nhập mật khẩu $\to$ Identity xác thực hash $\to$ kiểm tra trạng thái tài khoản. Nếu bị khóa thì từ chối và thu hồi refresh token. Nếu bình thường (hoặc đã hết hạn khóa) thì cấp phát JWT tokens.
- **Quy tắc quan trọng:** Tài khoản bị khóa bị chặn toàn bộ API xác thực (`3.1.1`). 5 lần sai liên tiếp bị khóa 15 phút.

---

### SD-02 (Course Module): Quản lý chế độ truy cập & Ghi danh khóa học

- **Mục đích nghiệp vụ:** Ghi danh tự do khóa Public, gửi yêu cầu + duyệt khóa Private, bảo vệ tuyệt đối khóa Only Me. Mọi thay đổi ghi danh ghi nhận sự kiện `EnrollmentChanged(action)` vào bảng `crs_outbox_event` cùng transaction để Outbox Dispatcher phát tán bất đồng bộ.
- **Mã FR liên quan:** `FR-CRS-06`, `FR-CRS-08`, `FR-CRS-10`, `Mục 3.2.2`, `Mục 3.2.3`, `NFR-09`.
- **Actor và Lifelines:** `Student`, `Owner`, `Identity`, `Course`, `Outbox Dispatcher`, `Notification`, `Discovery`.

```mermaid
sequenceDiagram
    autonumber
    actor Student as "Học viên (User)"
    actor Owner as "Chủ khóa (User)"
    participant Identity as "Identity Module"
    participant Course as "Course Module"
    participant Outbox as "Outbox Dispatcher"
    participant Notification as "Notification Module"
    participant Discovery as "Discovery Module"

    Student->>Course: Yêu cầu ghi danh (courseId)
    activate Course
    Course->>Identity: [Contract] GetAccountStatus(userId)
    Identity-->>Course: ACTIVE
    Course->>Course: Kiểm tra tính hợp lệ + access_mode (Chủ khóa không tự ghi danh khóa mình)

    alt Khóa Only Me / Tạm ẩn / Đã xóa
        Course-->>Student: 404 Not Found (Không tiết lộ sự tồn tại của khóa học)
    else Chế độ PUBLIC
        Course->>Course: TX - Ghi crs_enrollment (status = ACTIVE) + ghi crs_outbox_event EnrollmentChanged(action = 'SELF_ENROLL')
        Course-->>Student: Ghi danh thành công (Được phép học các chương Public)
    else Chế độ PRIVATE
        Course->>Course: TX - Ghi crs_enrollment_request (PENDING) + crs_enrollment (PENDING_APPROVAL) + ghi crs_outbox_event EnrollmentChanged(action = 'REQUEST_SENT')
        Course-->>Student: Đã gửi yêu cầu, vui lòng chờ Chủ khóa xét duyệt

        %% Chủ khóa xét duyệt
        Owner->>Course: Phê duyệt yêu cầu (requestId, action = 'Accept' | 'Reject')
        alt Chấp nhận (Accept)
            Course->>Course: TX - Cập nhật crs_enrollment (ACTIVE) + request (ACCEPTED) + ghi crs_outbox_event EnrollmentChanged(action = 'REQUEST_APPROVED')
            Course-->>Owner: Đã phê duyệt học viên
        else Từ chối (Reject)
            Course->>Course: TX - Cập nhật request (REJECTED) + ghi crs_outbox_event EnrollmentChanged(action = 'REQUEST_REJECTED')
            Course-->>Owner: Đã từ chối yêu cầu
        end
    end
    deactivate Course

    %% Bước Outbox: Dispatcher quét sự kiện và phát tán bất đồng bộ
    Note over Course,Outbox: Tiến trình Outbox Dispatcher quét bảng crs_outbox_event
    loop Quét định kỳ crs_outbox_event
        Outbox->>Course: [Polling] Quét bản ghi crs_outbox_event (status = 'PENDING')
        Course-->>Outbox: Danh sách sự kiện EnrollmentChanged (eventId, action, payload)
        Outbox-->>Notification: [Event] EnrollmentChanged (action, recipient_id, payload - idempotent theo eventId)
        Outbox-->>Discovery: [Event] EnrollmentChanged (action, course_id, fact_type = ENROLLMENT_NEW)
        Outbox->>Course: Cập nhật crs_outbox_event (status = 'PUBLISHED')
    end
```

- **Mô tả ngắn gọn:** Khóa Public vào học ngay; Khóa Private vào hàng đợi chờ duyệt. Dữ liệu ghi danh và sự kiện `EnrollmentChanged(action)` được lưu cùng Transaction vào bảng Outbox. Tiến trình Outbox Dispatcher quét bảng phát tán sang Notification và Discovery.
- **Quy tắc quan trọng:** Khóa Only Me chặn tuyệt đối mọi hành vi ghi danh. Sự kiện đồng bộ qua `EnrollmentChanged` kèm tham số `action` rõ ràng (`SELF_ENROLL`, `REQUEST_SENT`, `REQUEST_APPROVED`, `REQUEST_REJECTED`).

---

### SD-03 (Content Module): Tổ chức cấu trúc phân cấp & Cấu hình bài kiểm tra

- **Mục đích nghiệp vụ:** Chủ khóa xây dựng cấu trúc Course $\to$ Chapter $\to$ Block, cấu hình bài thi xáo trộn từ ngân hàng câu hỏi, đăng tải chương. **Bỏ ValidateCloList và không lưu trọng số $w_{ik}$ ở Content**; việc liên kết CLO và lưu trọng số hoàn toàn do **Assessment Module** quản lý thông qua Contract `GetAssessableBlocks`.
- **Mã FR liên quan:** `FR-CNT-01`, `FR-CNT-04`, `FR-CNT-10`, `FR-CNT-12`, `FR-CNT-16`, `FR-AST-13`.
- **Actor và Lifelines:** `Owner`, `Content`, `Course`, `Assessment`, `Notification`, `Discovery`.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as "Chủ khóa (User)"
    participant Content as "Content Module"
    participant Course as "Course Module"
    participant Assessment as "Assessment Module"
    participant Notification as "Notification Module"
    participant Discovery as "Discovery Module"

    %% Bước 1: Soạn thảo và lưu chương (khóa lạc quan)
    Owner->>Content: Lưu chương (chapterId, lastVersionNo, blocks, quizConfig/assignmentConfig)
    activate Content
    Content->>Course: [Contract] GetCourseAccess(courseId, ownerId)
    Course-->>Content: isOwner = true, khóa chưa bị xóa
    Content->>Content: TX - Cập nhật có điều kiện last_version_no (khóa lạc quan chống ghi đè)
    Content->>Content: Ghi cnt_block và bảng cấu hình con (chỉ nhận câu hỏi READY)
    Content->>Content: Chèn cnt_chapter_version (snapshot bất biến, chỉ chứa questionId)
    Content-->>Owner: Lưu bản nháp thành công (versionNo mới)

    %% Bước 2: Đăng tải chương học
    Owner->>Content: Đăng tải chương (chapterId)
    Content->>Content: Kiểm tra điều kiện xuất bản (tài nguyên hợp lệ, quiz đủ câu READY)
    Content->>Content: TX - published_version_no = last_version_no, tạo snapshot cnt_published_block
    Content-->>Owner: Xuất bản chương thành công
    deactivate Content
    Content-->>Notification: [Event] ChapterPublished (thông báo chương mới khi isFirstPublish)
    Content-->>Discovery: [Event] ChapterPublished (cập nhật published_chapter_count)

    %% Bước 3: Liên kết CLO thuộc trách nhiệm của Assessment Module
    Owner->>Assessment: Thiết lập liên kết bài thi với CLO (courseId, blockId, cloWeights - {cloId, weight})
    activate Assessment
    Assessment->>Content: [Contract] GetAssessableBlocks(courseId)
    activate Content
    Content-->>Assessment: Danh sách bài kiểm tra/bài tập đã xuất bản + điểm tối đa
    deactivate Content
    Assessment->>Assessment: Lưu ast_assessment_component và ast_component_outcome_weight (kiểm tra weight > 0)
    Assessment-->>Owner: Liên kết CLO và trọng số thành công
    deactivate Assessment
```

- **Mô tả ngắn gọn:** Content quản lý nội dung bản nháp và bản xuất bản bất biến. Content không lưu trọng số CLO. Chủ khóa liên kết CLO trực tiếp với Assessment Module; Assessment lấy danh sách bài thi qua Contract `GetAssessableBlocks`.
- **Quy tắc quan trọng:** Bỏ `ValidateCloList` và không lưu $w_{ik}$ ở Content. Chỉ bài kiểm tra/bài tập đã xuất bản mới được liên kết CLO.

---

### SD-04 (Learning Module): Truy cập học tập ma trận Khóa - Chương & Tiến độ

- **Mục đích nghiệp vụ:** Kiểm tra quyền đọc theo ma trận Khóa–Chương qua Contract `CheckChapterAccess` (chương Protected yêu cầu Passcode), phục vụ nội dung đã xuất bản qua Contract `GetPublishedChapterContent`, ghi nhận Block hoàn thành và tự động tính % tiến độ cho học viên Đang học.
- **Mã FR liên quan:** `FR-CRS-07`, `FR-LRN-01`, `FR-LRN-03`, `FR-LRN-15`, `FR-LRN-16`, `Mục 3.2.2`, `Mục 3.4.1`.
- **Actor và Lifelines:** `Client` (Student / Guest), `Learning`, `Course`, `Content`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as "Người học (Student / Guest)"
    participant Learning as "Learning Module"
    participant Course as "Course Module"
    participant Content as "Content Module"

    Client->>Learning: Yêu cầu mở chương học (courseId, chapterId)
    activate Learning
    Learning->>Course: [Contract] CheckChapterAccess(courseId, chapterId, viewerUserId?)
    activate Course
    Course-->>Learning: {allowed, canSaveProgress, reason}
    deactivate Course

    alt reason = COURSE_DENIED hoặc NOT_FOUND (Khóa Only Me, Tạm ẩn, Private chưa ghi danh)
        Learning-->>Client: 403 Forbidden / 404 Not Found
    else reason = PASSCODE_REQUIRED (Chương Protected chưa mở khóa)
        Learning-->>Client: Yêu cầu nhập Passcode của chương
        Client->>Course: Nhập passcode chương (API Course Module, có rate limit)
        Course->>Course: So khớp BCrypt, ghi crs_chapter_unlock
        Course-->>Client: Mở khóa thành công, cho phép tải lại chương
    else allowed = true (Được phép truy cập)
        Learning->>Content: [Contract] GetPublishedChapterContent(chapterId)
        activate Content
        Content-->>Learning: Nội dung chương và danh sách cnt_published_block (KHÔNG kèm đáp án)
        deactivate Content
        Learning-->>Client: Hiển thị nội dung học tập

        %% Ghi nhận tiến độ học tập
        opt canSaveProgress = true (Chỉ áp dụng cho Học viên "Đang học")
            Client->>Learning: Mở tương tác Block nội dung (blockId)
            Learning->>Learning: Ghi lrn_block_completion (idempotent theo user_id + block_id)
            Learning->>Content: [Contract] ListPublishedBlocks(chapterId / courseId)
            Learning->>Learning: Tính lại % tiến độ Chương = (Số Block hoàn thành / Tổng Block xuất bản) * 100
            opt Tất cả Block trong chương hoàn thành
                Learning->>Learning: Đánh dấu hoàn thành Chương
                Learning->>Learning: Tính lại % tiến độ Khóa = (Số Chương hoàn thành / Tổng Chương xuất bản) * 100
                opt 100% Chương hoàn thành
                    Learning->>Learning: Ghi lrn_course_completion (xác lập mốc hoàn thành khóa học một lần)
                    Learning-->>Course: [Event] CourseCompleted(userId, courseId)
                end
            end
        end
    end
    deactivate Learning
```

- **Mô tả ngắn gọn:** Sử dụng `CheckChapterAccess` để phân định quyền đọc/hỏi passcode. Lấy nội dung bài giảng bằng `GetPublishedChapterContent`. Chỉ học viên Đang học mới được ghi nhận tiến độ % hoàn thành.
- **Quy tắc quan trọng:** Khách chỉ đọc chương Public của khóa Public và tuyệt đối không lưu tiến độ (`FR-LRN-16`). Mở block là hoàn thành block.

---

### SD-05 (Assessment Module): Nộp bài thi, Chấm tự động & Tính chuẩn đầu ra CLO

- **Mục đích nghiệp vụ:** Nộp bài kiểm tra $\to$ Assessment chấm tự động **đồng bộ** $\to$ học viên nhận điểm ngay. Sự kiện đi qua Outbox cập nhật tiến độ học tập và gửi thông báo. Mức đạt CLO theo chuẩn AUN-QA được tính khi truy vấn Bảng điểm (không tính lúc nộp).
- **Mã FR liên quan:** `FR-LRN-08`, `FR-AST-01`, `FR-AST-02`, `FR-AST-03`, `FR-AST-14`, `FR-AST-15`, `FR-CNT-13`, `Mục 3.5.2`, `NFR-09`, `NFR-10`.
- **Actor và Lifelines:** `Trigger` (Student / System khi hết giờ), `Learning`, `Assessment`, `Outbox Dispatcher`, `Notification`.

```mermaid
sequenceDiagram
    autonumber
    actor Trigger as "Người nộp (Student / System khi quá deadline)"
    participant Learning as "Learning Module"
    participant Assessment as "Assessment Module"
    participant Outbox as "Outbox Dispatcher"
    participant Notification as "Notification Module"

    %% Luồng nộp bài và chấm điểm đồng bộ
    Trigger->>Learning: Nộp bài kiểm tra (attemptId, answers)
    activate Learning
    Learning->>Learning: TX1 - Cập nhật lrn_quiz_attempt (status = 'SUBMITTED' hoặc 'AUTO_SUBMITTED', submitted_at = NOW()) + chèn lrn_outbox_event QuizAttemptSubmitted
    
    Learning->>Assessment: [Contract] GradeQuizAttempt(attemptId)
    activate Assessment
    Assessment->>Learning: [Contract] GetQuizAttemptForGrading(attemptId)
    activate Learning
    Learning-->>Assessment: Trả về question_snapshot (đáp án đúng, điểm, passScorePercent) + câu trả lời học viên
    deactivate Learning

    Assessment->>Assessment: Chấm điểm tự động từng câu trắc nghiệm (so khớp đáp án đúng)
    Assessment->>Assessment: TX - Ghi ast_grade_record (record_type = 'QUIZ_ATTEMPT'), áp dụng score_selection_rule cập nhật COMPONENT_FINAL
    opt Không có câu tự luận chờ chấm tay
        Assessment->>Assessment: is_fully_graded = TRUE - isPassed = (total_score / max_score * 100) >= passScorePercent
        Assessment->>Assessment: Chèn ast_outbox_event GradeRecorded (cùng TX)
    end
    Assessment-->>Learning: Kết quả chấm - {totalScore, maxScore, isFullyGraded, isPassed, questionsResult[]}
    deactivate Assessment

    Learning->>Learning: TX2 - Lưu điểm từng câu vào lrn_quiz_attempt_answer - nếu fullyGraded -> status = 'GRADED', total_score, graded_at
    Learning-->>Trigger: Hiển thị kết quả nộp bài (theo cấu hình review_policy FR-CNT-13)
    deactivate Learning

    alt Assessment gặp lỗi hoặc timeout
        Learning-->>Trigger: Thông báo - "Bài thi đã được ghi nhận, hệ thống đang xử lý chấm điểm ngầm"
    end

    %% Outbox Dispatcher phát sự kiện bất đồng bộ
    Note over Outbox,Notification: Sau commit, Outbox Dispatcher quét bảng phát tán sự kiện
    Outbox-->>Learning: [Event] QuizAttemptSubmitted -> UpdateCourseProgressHandler (Đánh dấu Block Quiz hoàn thành)
    Outbox-->>Assessment: [Event] QuizAttemptSubmitted -> Lưới an toàn - kiểm tra và gọi lại GradeQuizAttempt nếu chưa chấm
    Outbox-->>Notification: [Event] GradeRecorded -> Gửi thông báo kết quả điểm thi đến học viên
```

**Nhánh tính mức đạt Chuẩn đầu ra CLO/PLO theo chuẩn AUN-QA (khi xem Sổ điểm):**

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as "Học viên / Chủ khóa"
    participant Assessment as "Assessment Module"

    Viewer->>Assessment: GetStudentGradebook(userId, courseId)
    activate Assessment
    Assessment->>Assessment: Lấy điểm tổng kết COMPONENT_FINAL từng bài thi + ma trận trọng số ast_component_outcome_weight
    Assessment->>Assessment: Tính tỷ lệ đạt bài thi - t_i = điểm / điểm_tối_đa
    Assessment->>Assessment: Tính mức đạt CLO_k (%) = Sum(w_ik * t_i) / Sum(w_ik) * 100
    Assessment->>Assessment: Đạt chuẩn CLO nếu mức đạt >= pass_threshold (mặc định 50.00%)
    Assessment->>Assessment: Gán nhãn xếp loại - Chưa đạt, Đạt, Tốt, Xuất sắc (theo achievement_levels_json)
    Assessment-->>Viewer: Bảng điểm chi tiết - Điểm tổng kết môn, Điểm thành phần, Mức đạt từng CLO/PLO
    deactivate Assessment
```

- **Mô tả ngắn gọn:** Nộp bài $\to$ Assessment chấm điểm tự động đồng bộ $\to$ ghi nhận điểm ngay. Outbox kích hoạt cập nhật tiến độ học tập. Chuẩn đầu ra CLO được tính toán động khi truy vấn Sổ điểm dựa trên ma trận trọng số $w_{ik}$.
- **Quy tắc quan trọng:** Ngưỡng đạt bài thi đơn lẻ tính theo `pass_score` (%); Ngưỡng đạt Chuẩn đầu ra CLO tính theo `pass_threshold` (mặc định 50%). Hoàn thành tiến độ và Đạt chuẩn CLO là 2 kết quả độc lập.

---

### SD-06 (Discovery Module): Khám phá, Tìm kiếm, Lọc & Bảng xếp hạng Top 10

- **Mục đích nghiệp vụ:** Discovery phục vụ trang chủ, tìm kiếm, lọc, Top 10 từ **read model riêng `dsc_course_entry` và `dsc_course_activity_fact`**, **tuyệt đối không gọi Course Module trong luồng đọc**. Read model được đồng bộ bất đồng bộ từ các module qua Outbox.
- **Mã FR liên quan:** `FR-DSC-01..10`, `Mục 3.6.1`, `NFR-16`.
- **Actor và Lifelines:** `Client`, `Discovery`, `Learning`, `Outbox Dispatcher`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as "Người dùng / Khách"
    participant Discovery as "Discovery Module"
    participant Learning as "Learning Module"
    participant Outbox as "Outbox Dispatcher"

    %% Nhánh 1: Luồng đọc dữ liệu từ Read Model (KHÔNG gọi Course Module)
    Client->>Discovery: Truy vấn Khám phá / Tìm kiếm / Lọc / Top 10 (query, filters, page <= 50)
    activate Discovery
    alt Danh sách đề xuất (FR-DSC-02)
        Discovery->>Discovery: Chọn ngẫu nhiên (RANDOM) từ dsc_course_entry (độc lập mỗi lần tải trang, không theo lịch sử học)
    else Bảng xếp hạng Top 10 (FR-DSC-10)
        Discovery->>Discovery: Tổng hợp dsc_course_activity_fact theo kỳ (Tuần, Tháng, Toàn thời gian), chỉ lấy khóa còn trong dsc_course_entry
    else Tìm kiếm, lọc và sắp xếp (FR-DSC-04..09)
        Discovery->>Discovery: Truy vấn dsc_course_entry (tên, chủ khóa, tag, chế độ, trạng thái) với 6 tiêu chí sắp xếp
    end
    opt Lấy khóa đang học dở của học viên (FR-DSC-03)
        Discovery->>Learning: [Contract] ListInProgressCourses(userId)
        Learning-->>Discovery: Danh sách courseIds đang học
        Discovery->>Discovery: Lọc thông tin khóa học trực tiếp từ dsc_course_entry theo courseIds (không gọi Course)
    end
    Discovery-->>Client: Trả về kết quả hiển thị (Khóa Private chỉ hiển thị thông tin cơ bản)
    deactivate Discovery

    %% Nhánh 2: Luồng đồng bộ Read Model từ Outbox Events
    Note over Outbox,Discovery: Cập nhật Read Model bất đồng bộ khi có thay đổi dữ liệu
    Outbox-->>Discovery: [Event] CourseUpserted(courseId, revision, eligible, payload)
    activate Discovery
    alt eligible = true và revision  >=  source_revision
        Discovery->>Discovery: Upsert bản ghi dsc_course_entry
    else eligible = false (Khóa Only Me, Tạm ẩn hoặc Đã xóa)
        Discovery->>Discovery: Xóa bản ghi khỏi dsc_course_entry (loại bỏ hoàn toàn khỏi tìm kiếm)
    end
    deactivate Discovery
    
    Outbox-->>Discovery: [Event] EnrollmentChanged / NominationChanged / CourseReviewCreated -> Cập nhật số đếm + ghi dsc_course_activity_fact
```

- **Mô tả ngắn gọn:** Toàn bộ thao tác tìm kiếm, lọc, xem Top 10 đều đọc trực tiếp từ bảng Read Model `dsc_course_entry` của Discovery, hoàn toàn không gọi Course Module. Khóa Only Me hoặc Tạm ẩn tự động bị loại bỏ khỏi Read Model.
- **Quy tắc quan trọng:** Bảng xếp hạng Top 10 tính theo số hoạt động phát sinh mới trong kỳ từ bảng fact. Khóa đề xuất được bốc ngẫu nhiên độc lập.

---

### SD-07 (Profile Module): Quản lý hồ sơ cá nhân & Thiết lập quyền riêng tư

- **Mục đích nghiệp vụ:** Người dùng cập nhật hồ sơ cá nhân (kiểm tra tài khoản qua `GetAccountStatus`). Người xem tra cứu hồ sơ công khai; danh sách khóa học lấy qua Course Module với bộ lọc `audience = PUBLIC` (khóa Only Me không bao giờ hiển thị).
- **Mã FR liên quan:** `FR-PRF-01..07`, `FR-PRF-06`.
- **Actor và Lifelines:** `User`, `Viewer`, `Profile`, `Identity`, `Course`, `Discovery`.

```mermaid
sequenceDiagram
    autonumber
    actor User as "Chủ tài khoản (User)"
    actor Viewer as "Người xem (Guest / User khác)"
    participant Profile as "Profile Module"
    participant Identity as "Identity Module"
    participant Course as "Course Module"
    participant Discovery as "Discovery Module"

    %% Nhánh 1: Cập nhật thông tin hồ sơ
    User->>Profile: Cập nhật hồ sơ (displayName, avatar, bio, showCourseList, uiTheme - userId từ JWT)
    activate Profile
    Profile->>Identity: [Contract] GetAccountStatus(userId)
    activate Identity
    Identity-->>Profile: Trạng thái - ACTIVE
    deactivate Identity
    Profile->>Profile: Lưu dữ liệu vào prf_user_profile (làm sạch dữ liệu đầu vào HTML)
    Profile-->>User: Cập nhật hồ sơ thành công
    deactivate Profile
    Profile-->>Discovery: [Event] ProfileUpdated (đồng bộ tên hiển thị Chủ khóa trong dsc_course_entry)

    %% Nhánh 2: Xem hồ sơ công khai
    Viewer->>Profile: GetPublicProfile(targetUserId)
    activate Profile
    Profile->>Identity: [Contract] GetUserSummary(targetUserId)
    activate Identity
    Identity-->>Profile: {displayName, created_at (ngày gia nhập)}
    deactivate Identity

    alt show_course_list = FALSE (Người dùng chọn ẩn danh sách khóa)
        Profile-->>Viewer: Trả về thông tin hồ sơ cơ bản, ẩn danh sách khóa học
    else show_course_list = TRUE (Cho phép hiển thị danh sách khóa)
        Profile->>Course: [Contract] ListUserCourses(targetUserId, relation, audience = PUBLIC, page <= 50)
        activate Course
        Course-->>Profile: Danh sách khóa Public/Private (TUYỆT ĐỐI KHÔNG chứa khóa Only Me / Tạm ẩn / Đã xóa)
        deactivate Course
        Profile-->>Viewer: Trả về thông tin hồ sơ đầy đủ kèm danh sách khóa học
    end
    deactivate Profile
```

- **Mô tả ngắn gọn:** Xác thực trạng thái tài khoản qua `GetAccountStatus`. Khi xem hồ sơ công khai, gọi `ListUserCourses(audience = PUBLIC)` để bảo đảm khóa Only Me không bao giờ lộ ra ngoài.
- **Quy tắc quan trọng:** Khóa học `ONLY_ME` luôn luôn bị ẩn trên hồ sơ công khai bất kể người dùng cấu hình thế nào (`FR-PRF-06`).

---

### SD-08 (Notification Module): Tiếp nhận Domain Event & Quản trị thông báo hệ thống

- **Mục đích nghiệp vụ:** Tạo thông báo in-app từ Domain Event (idempotent), gửi email (3 loại xác minh/reset/khóa tài khoản). Admin phát loa Broadcast toàn hệ thống. **Giao diện người dùng lấy thông báo qua cơ chế Polling định kỳ (không dùng đẩy thời gian thực)**.
- **Mã FR liên quan:** `FR-NTF-01..07`.
- **Actor và Lifelines:** `Admin`, `Source` (Module phát event / Outbox Dispatcher), `Notification`, `Identity`, `Email Service`, `User`.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as "Quản trị viên (Admin)"
    participant Source as "Module phát event / Outbox Dispatcher"
    participant Notification as "Notification Module"
    participant Identity as "Identity Module"
    participant Email as "Email Service (SMTP)"
    actor User as "Người dùng"

    %% Nhánh 1: Tiếp nhận Domain Event tạo thông báo in-app
    Source-->>Notification: [Domain Event] EventPayload (eventId, eventType, recipientId, payload)
    activate Notification
    Notification->>Notification: Chèn ntf_notification, bỏ qua nếu trùng lặp (UNIQUE KEY source_event_id + recipient_id)
    deactivate Notification

    %% Nhánh 2: Xử lý hàng đợi gửi Email (3 loại: Verify Email, Reset Password, Account Locked)
    Source-->>Notification: [Event] EmailNotificationRequested(userId, emailType, tokenOrReason)
    activate Notification
    Notification->>Identity: [Contract] GetUserSummary(userId) để lấy email
    Notification->>Email: Gửi email qua SMTP (timeout 10s)
    alt Gửi email thành công
        Email-->>Notification: Đã gửi -> Ghi ntf_email_delivery (status = 'SENT')
    else Gửi thất bại hoặc timeout
        Notification->>Notification: Ghi ntf_email_delivery (status = 'FAILED', retry_count++) - kích hoạt retry nền
    end
    deactivate Notification

    %% Nhánh 3: Người dùng đọc thông báo bằng cơ chế Polling (thay vì kết nối thời gian thực)
    loop Định kỳ Polling (mỗi 10 - 30 giây)
        User->>Notification: [Polling] Lấy số thông báo chưa đọc / danh sách thông báo mới (page <= 50)
        Notification-->>User: Danh sách thông báo in-app của người dùng
    end
    User->>Notification: Đánh dấu đã đọc / xóa thông báo

    %% Nhánh 4: Admin Broadcast phát loa toàn trường
    Admin->>Notification: Phát thông báo hệ thống (title, content, priority)
    activate Notification
    Notification->>Identity: [Contract] IsAdmin(adminId)
    Notification->>Notification: Chèn ntf_announcement (status = 'PENDING')
    Notification-->>Admin: Tiếp nhận thông báo thành công
    loop Job nền Fan-out theo lô (mỗi lô  <=  50 người)
        Notification->>Identity: [Contract] ListActiveUserIds(afterId, limit)
        Notification->>Notification: Chèn hàng loạt vào ntf_notification (loại SYSTEM_ANNOUNCEMENT)
    end
    Notification->>Notification: Cập nhật ntf_announcement (status = 'COMPLETED', recipient_count)
    deactivate Notification
```

- **Mô tả ngắn gọn:** Tiếp nhận sự kiện tạo thông báo in-app (chống trùng lặp qua UK). Gửi email có retry queue. **Người dùng lấy thông báo mới qua cơ chế Polling định kỳ**. Admin phát thông báo toàn trường chạy job fan-out theo lô.
- **Quy tắc quan trọng:** Lỗi gửi email bên ngoài không bao giờ làm rollback giao dịch học tập chính (`FR-NTF-01`). Không dùng WebSocket đẩy thời gian thực để giảm tải và tránh rò rỉ kết nối.

---

### SD-09 (Moderation Module): Xử lý báo cáo vi phạm, Chế tài & Ghi Audit Log

- **Mục đích nghiệp vụ:** Tiếp nhận báo cáo vi phạm (chống spam), Admin thẩm định trong hàng đợi, thực thi chế tài (Tạm ẩn khóa học / Khóa tài khoản) và bắt buộc ghi nhật ký kiểm toán **Audit Log bất biến (Immutable)** trong cùng Transaction.
- **Mã FR liên quan:** `FR-MOD-01`, `FR-MOD-04`, `FR-MOD-07`, `FR-MOD-10`, `FR-MOD-13`.
- **Actor và Lifelines:** `Reporter`, `Admin`, `Moderation Module`, `Course Module`, `Identity Module`, `Notification Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Reporter as "Người dùng báo cáo"
    actor Admin as "Quản trị viên (Admin)"
    participant Moderation as "Moderation Module"
    participant Course as "Course Module"
    participant Identity as "Identity Module"
    participant Notification as "Notification Module"

    %% Bước 1: Tiếp nhận báo cáo và Chống Spam
    Reporter->>Moderation: Gửi báo cáo vi phạm (target_type, target_id, lý do, bằng chứng)
    activate Moderation
    Moderation->>Moderation: Kiểm tra rate limit chống spam (UNIQUE KEY uk_mod_report_pending ngăn gửi trùng lặp)
    Moderation->>Moderation: Lưu vào mod_report (status = 'PENDING') + lưu mod_report_evidence
    Moderation-->>Reporter: Gửi báo cáo thành công
    deactivate Moderation

    %% Bước 2: Admin thẩm định và thi hành chế tài
    Admin->>Moderation: Xử lý báo cáo (reportId, quyết định = 'RESOLVED', lý do, chế tài)
    activate Moderation
    Moderation->>Moderation: Kiểm tra bắt buộc có lý do xử phạt (không để trống)
    
    alt Chế tài: Tạm ẩn khóa học (FR-MOD-07)
        Moderation->>Course: [Contract] HideCourse(courseId, sanctionId, actorAdminId)
        activate Course
        Course->>Course: Đổi trạng thái - "Tạm ẩn" (loại khỏi Discovery, giữ nguyên tiến độ học viên)
        Course-->>Moderation: Đã ẩn khóa học
        deactivate Course
    else Chế tài: Khóa tài khoản có thời hạn (FR-MOD-10)
        Moderation->>Identity: [Contract] LockAccount(userId, type, until, reason, sanctionId, actorAdminId)
        activate Identity
        Identity->>Identity: Đổi trạng thái - "Bị khóa có thời hạn", thu hồi toàn bộ Refresh Token
        Identity-->>Moderation: Đã khóa tài khoản
        deactivate Identity
    end

    %% Bước 3: Ghi Audit Log bất biến và phát sự kiện
    Moderation->>Moderation: TX - Ghi mod_sanction + ghi mod_audit_log bất biến (chỉ INSERT, không UPDATE/DELETE)
    Moderation->>Moderation: Cập nhật mod_report (status = 'RESOLVED')
    
    Moderation-->>Notification: [Domain Event] ReportResolved(reportId, decision, reason, reporterUserId, targetUserId)
    Moderation-->>Admin: Thi hành chế tài và lưu nhật ký kiểm toán hoàn tất
    deactivate Moderation
```

- **Mô tả ngắn gọn:** Tiếp nhận báo cáo qua bộ lọc spam `uk_mod_report_pending` $\to$ Admin xử lý bắt buộc có lý do $\to$ áp dụng chế tài qua Contract $\to$ ghi Audit Log bất biến.
- **Quy tắc quan trọng:** Khóa Only Me không thể bị báo cáo hay tạm ẩn. Admin không thể tự khóa nick chính mình (`3.9.1`). Bảng Audit Log là bất biến.

---

### SD-10 (AI Module): Sinh nội dung AI & Quét kiểm duyệt tự động

- **Mục đích nghiệp vụ:** Chủ khóa dùng AI sinh câu hỏi (luôn ở trạng thái Nháp, duyệt mới thành Sẵn sàng - Human-in-the-loop). Mô hình PhoBERT quét ngầm phân loại mức độ độc hại sau khi lưu; vượt ngưỡng cảnh báo thì tự động gắn cờ tạo báo cáo chuyển Admin xử lý (AI không tự ý xóa bài/xử phạt).
- **Mã FR liên quan:** `FR-AI-01`, `FR-AI-02`, `FR-AI-03`, `FR-MOD-03`, `Mục 3.10.1`, `NFR-13`, `NFR-22`.
- **Actor và Lifelines:** `Owner`, `AI`, `LLM`, `Content`, `Source` (Learning/Course), `PhoBERT`, `Moderation`.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as "Chủ khóa (User)"
    participant AI as "AI Module"
    participant LLM as "External LLM API"
    participant Content as "Content Module"
    participant Source as "Learning / Course (nguồn event)"
    participant PhoBERT as "PhoBERT Service (Python)"
    participant Moderation as "Moderation Module"

    %% Nhánh 1: Sinh câu hỏi tự động (Human-in-the-loop)
    Owner->>AI: Yêu cầu sinh câu hỏi (courseId, văn bản dán hoặc chapterId, số lượng, độ khó)
    activate AI
    AI->>AI: Kiểm tra và tăng ai_user_daily_quota (used_count < quota_limit)
    alt Hết hạn mức gọi AI trong ngày
        AI-->>Owner: Báo lỗi - Bạn đã sử dụng hết lượt AI hôm nay
    else Còn hạn mức
        opt Nguồn đầu vào là chương học
            AI->>Content: [Contract] GetChapterTextForAi(chapterId, ownerId)
            Content-->>AI: Nội dung văn bản chương học
        end
        AI->>LLM: Sinh câu hỏi trắc nghiệm (timeout 30s)
        LLM-->>AI: Danh sách câu hỏi, phương án và đáp án giải thích
        AI->>Content: [Contract] ImportAiGeneratedQuestions(courseId, ownerId, aiJobId, items)
        Content->>Content: Lưu vào cnt_question với status = 'DRAFT', origin = 'AI'
        Content-->>AI: Đã lưu bản nháp vào ngân hàng
        AI-->>Owner: Hiển thị danh sách câu hỏi nháp
        Owner->>Content: Xem trước, chỉnh sửa câu từ và bấm Duyệt (DRAFT -> READY)
        Content-->>Owner: Câu hỏi chính thức sẵn sàng đưa vào đề thi
    end
    deactivate AI

    %% Nhánh 2: Quét kiểm duyệt độc hại ngầm bằng PhoBERT (chạy sau lưu, không chặn người dùng)
    Source-->>AI: [Event] CommentCreated / CourseUpserted (eligible = true, nội dung cần quét)
    activate AI
    AI->>PhoBERT: Phân tích độ độc hại văn bản (timeout 10s)
    alt Dịch vụ AI lỗi hoặc timeout
        PhoBERT-->>AI: Lỗi kết nối
        AI->>AI: Ghi ai_moderation_scan_log (error_message, flagged = FALSE) và bỏ qua
    else Phân tích thành công
        PhoBERT-->>AI: Trả về toxicity_score
        AI->>AI: Ghi ai_moderation_scan_log (score, threshold_used, flagged = (score >= threshold))
        opt score  >=  Ngưỡng cảnh báo Admin cấu hình
            AI->>Moderation: [Contract] SubmitAiFlag(aiFindingId, targetType, targetId, score, contentSnapshot)
            Moderation->>Moderation: Tạo bản ghi mod_report nguồn 'AI', status = 'PENDING'
        end
    end
    deactivate AI
```

- **Mô tả ngắn gọn:** Sinh quiz bằng LLM $\to$ lưu bản Nháp $\to$ Chủ khóa duyệt mới đưa vào ngân hàng đề. Quét PhoBERT nhận sự kiện chạy nền; nếu phát hiện vi phạm thì tạo báo cáo gắn cờ gửi về hàng đợi Admin, AI không tự ý xóa dữ liệu.
- **Quy tắc quan trọng:** Khóa Only Me không bao giờ bị quét. Quota gọi AI được kiểm soát chặt chẽ theo ngày.
