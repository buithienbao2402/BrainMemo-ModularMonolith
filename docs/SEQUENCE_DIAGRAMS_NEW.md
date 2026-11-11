# TÀI LIỆU THIẾT KẾ UML SEQUENCE DIAGRAM
## 10 PHÂN HỆ CỐT LÕI - HỆ THỐNG QUẢN LÝ KHÓA HỌC VÀ HỌC TẬP TRỰC TUYẾN

> **Căn cứ tài liệu:** `DAC_TA_YEU_CAU_HE_THONG.md`  
> **Phiên bản:** Chuẩn tinh gọn 1:1 đại diện cho 10 Module của hệ thống.  
> **Nguyên tắc thiết kế:** Giao tiếp đồng bộ qua **Contract công khai**, bất đồng bộ qua **Domain Event**; kiểm tra phân quyền đa tầng tại Backend; nguyên tắc AI **Human-in-the-loop**.

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
    actor Guest as Khách (Guest)
    participant Identity as Identity Module

    Guest->>Identity: Đăng nhập (email, password)
    activate Identity

    Identity->>Identity: Kiểm tra mật khẩu (BCrypt hash)
    alt Mật khẩu không chính xác
        Identity-->>Guest: Báo lỗi: Email hoặc mật khẩu không chính xác
    else Mật khẩu chính xác
        Identity->>Identity: Kiểm tra trạng thái tài khoản
        
        alt Trạng thái: Bị khóa có thời hạn
            alt Thời hạn khóa đã hết
                Identity->>Identity: Tự động mở khóa -> Trạng thái: Hoạt động
                Identity->>Identity: Cấp phát phiên (Access Token <= 30m, Refresh Token)
                Identity-->>Guest: Đăng nhập thành công (Trả về JWT Tokens)
            else Vẫn trong thời hạn khóa
                Identity->>Identity: Thu hồi toàn bộ Refresh Token
                Identity-->>Guest: Từ chối đăng nhập (Kèm lý do và thời hạn khóa)
            end
        else Trạng thái: Bị khóa vĩnh viễn
            Identity->>Identity: Thu hồi toàn bộ Refresh Token
            Identity-->>Guest: Từ chối đăng nhập: Tài khoản đã bị vô hiệu hóa
        else Trạng thái: Hoạt động
            Identity->>Identity: Cấp phát phiên mới (Access Token, Refresh Token)
            Identity-->>Guest: Đăng nhập thành công (Trả về JWT Tokens)
        end
    end
    deactivate Identity
```

- **Mô tả ngắn gọn:** Khách nhập mật khẩu $\to$ Identity xác thực hash $\to$ kiểm tra trạng thái tài khoản. Nếu bị khóa thì từ chối và thu hồi refresh token. Nếu bình thường (hoặc đã hết hạn khóa) thì cấp phát JWT tokens.
- **Quy tắc quan trọng:** Tài khoản bị khóa bị chặn toàn bộ API xác thực (`3.1.1`).

---

### SD-02 (Course Module): Quản lý chế độ truy cập & Ghi danh khóa học

- **Mục đích nghiệp vụ:** Xử lý việc ghi danh tự do đối với khóa Public, quy trình gửi yêu cầu duyệt đối với khóa Private và bảo vệ tính bí mật của khóa Only Me.
- **Mã FR liên quan:** `FR-CRS-06`, `FR-CRS-08`, `FR-CRS-10`, `Mục 3.2.2`, `Mục 3.2.3`.
- **Actor và Lifelines:** `Student`, `Owner`, `Identity Module`, `Course Module`, `Notification Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học viên (User)
    actor Owner as Chủ khóa (User)
    participant Identity as Identity Module
    participant Course as Course Module
    participant Notification as Notification Module

    Student->>Course: Yêu cầu ghi danh khóa học (course_id)
    activate Course

    Course->>Identity: [Contract] CheckUserStatus(user_id)
    Identity-->>Course: Trạng thái: Hoạt động

    Course->>Course: Kiểm tra chế độ truy cập của khóa học (access_mode)

    alt Chế độ: Only Me
        Course-->>Student: Từ chối: Khóa học chỉ dành riêng cho Chủ khóa
    else Chế độ: Public (Ghi danh tự do)
        Course->>Course: Tạo bản ghi ghi danh (status = "Đang học")
        Course-->>Student: Ghi danh thành công (Được phép học các chương Public)
        Course-)Notification: [Domain Event] CourseEnrolledEvent(student_id, course_id)
    else Chế độ: Private (Cần phê duyệt)
        Course->>Course: Tạo bản ghi ghi danh (status = "Chờ duyệt")
        Course-->>Student: Yêu cầu đã gửi, vui lòng chờ Chủ khóa xét duyệt
        Course-)Notification: [Domain Event] EnrollmentRequestedEvent(owner_id, student_id)
        
        %% Chủ khóa duyệt
        Owner->>Course: Phê duyệt yêu cầu (enrollment_id, action = 'Accept' | 'Reject')
        alt Chấp nhận
            Course->>Course: Cập nhật status = "Đang học"
            Course-->>Owner: Đã duyệt thành công
            Course-)Notification: [Domain Event] EnrollmentApprovedEvent(student_id, course_id)
        else Từ chối
            Course->>Course: Xóa / Đánh dấu từ chối yêu cầu
            Course-->>Owner: Đã từ chối yêu cầu
            Course-)Notification: [Domain Event] EnrollmentRejectedEvent(student_id, course_id)
        end
    end
    deactivate Course
```

- **Mô tả ngắn gọn:** Khóa Public vào học ngay (Đang học). Khóa Private chuyển trạng thái Chờ duyệt $\to$ Chủ khóa nhận thông báo và bấm Duyệt/Từ chối.
- **Quy tắc quan trọng:** Khóa Only Me không ai được ghi danh, kể cả Admin (`3.1.1`, `3.2.2`).

---

### SD-03 (Content Module): Tổ chức cấu trúc phân cấp & Cấu hình bài kiểm tra

- **Mục đích nghiệp vụ:** Chủ khóa xây dựng cấu trúc Course $\to$ Chapter $\to$ Block, cấu hình bài thi xáo trộn từ ngân hàng câu hỏi và liên kết trọng số đóng góp vào Chuẩn đầu ra (CLO).
- **Mã FR liên quan:** `FR-CNT-01`, `FR-CNT-04`, `FR-CNT-10`, `FR-CNT-12`, `FR-AST-13`.
- **Actor và Lifelines:** `Owner`, `Content Module`, `Assessment Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Chủ khóa (User)
    participant Content as Content Module
    participant Assessment as Assessment Module

    %% Bước 1: Tạo cấu trúc phân cấp
    Owner->>Content: Tạo Chương và Block nội dung (course_id, chapter_info, blocks)
    activate Content
    Content->>Content: Lưu cấu trúc Course -> Chapter -> Block (Trạng thái = Nháp)
    Content-->>Owner: Tạo nội dung thành công (chapter_id)

    %% Bước 2: Thiết lập câu hỏi bài kiểm tra từ ngân hàng
    Owner->>Content: Cấu hình bài kiểm tra (quiz_id, time_limit, shuffle=true, random_criteria)
    Content->>Content: Lấy câu hỏi từ Ngân hàng câu hỏi (Chỉ lấy câu trạng thái "Sẵn sàng")
    Content->>Content: Thiết lập cấu hình xáo trộn câu hỏi và đáp án
    Content-->>Owner: Cấu hình câu hỏi thành công

    %% Bước 3: Liên kết bài kiểm tra với Chuẩn đầu ra CLO
    Owner->>Content: Liên kết bài kiểm tra với CLO (quiz_id, clo_weights: {clo_id, weight})
    Content->>Assessment: [Contract] ValidateCloList(course_id, clo_ids)
    activate Assessment
    Assessment-->>Content: Xác nhận: Danh sách CLO hợp lệ
    deactivate Assessment

    Content->>Content: Lưu trọng số đóng góp (w_ik) của bài thi vào từng CLO
    Content-->>Owner: Liên kết CLO hoàn tất (Sẵn sàng tính điểm chuẩn đầu ra)
    deactivate Content
```

- **Mô tả ngắn gọn:** Soạn chương & block $\to$ bốc câu hỏi "Sẵn sàng" từ ngân hàng đưa vào bài thi $\to$ gọi Assessment Module xác thực danh sách CLO $\to$ lưu trọng số $w_{ik}$.
- **Quy tắc quan trọng:** Phải liên kết với CLO thì sau này bài thi mới được ghi nhận điểm vào chuẩn đầu ra (`FR-CNT-12`).

---

### SD-04 (Learning Module): Truy cập học tập ma trận Khóa - Chương & Tiến độ

- **Mục đích nghiệp vụ:** Kiểm tra quyền đọc nội dung theo ma trận kết hợp Khóa - Chương (chương Protected yêu cầu passcode). Mở Block là hoàn thành và tự động tính % tiến độ Chương/Khóa.
- **Mã FR liên quan:** `FR-CRS-07`, `FR-LRN-01`, `FR-LRN-03`, `FR-LRN-15`, `FR-LRN-16`, `Mục 3.2.2`, `Mục 3.4.1`.
- **Actor và Lifelines:** `Student` / `Guest`, `Learning Module`, `Course Module`, `Content Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người học (Student / Guest)
    participant Learning as Learning Module
    participant Course as Course Module
    participant Content as Content Module

    Client->>Learning: Yêu cầu mở chương học (course_id, chapter_id, passcode_input?)
    activate Learning

    Learning->>Course: [Contract] CheckAccessPermission(caller_id, course_id, chapter_id, passcode_input)
    activate Course
    
    alt Khóa học = Only Me & Caller KHÔNG PHẢI Chủ khóa
        Course-->>Learning: Từ chối truy cập (403 Forbidden)
        Learning-->>Client: Báo lỗi: Bạn không có quyền truy cập khóa học này
    else Chương = Protected & Chưa có Passcode hợp lệ
        Course-->>Learning: Yêu cầu Passcode chương
        Learning-->>Client: Yêu cầu nhập Passcode của chương để tiếp tục
    else Quyền truy cập Hợp lệ (Public hoặc Protected đã qua Passcode)
        Course-->>Learning: Cho phép truy cập (CallerType: Guest | EnrolledLearner)
        deactivate Course

        Learning->>Content: [Contract] GetChapterData(chapter_id)
        activate Content
        Content-->>Learning: Nội dung chương và danh sách Blocks đã đăng tải
        deactivate Content
        Learning-->>Client: Hiển thị nội dung học tập

        %% Ghi nhận tiến độ (Chỉ áp dụng cho Học viên Đang học, KHÔNG áp dụng cho Khách)
        opt Người học là Học viên "Đang học" (FR-3.4.1)
            Client->>Learning: Tương tác mở Block nội dung
            Learning->>Learning: Đánh dấu Block hoàn thành (Mở = Hoàn thành)
            Learning->>Learning: Tính lại % Tiến độ Chương = (Số Block hoàn thành / Tổng Block đăng tải) * 100
            opt Mọi Block trong chương đều hoàn thành
                Learning->>Learning: Đánh dấu Chương hoàn thành
                Learning->>Learning: Tính lại % Tiến độ Khóa = (Số Chương hoàn thành / Tổng Chương đăng tải) * 100
                opt 100% Chương hoàn thành
                    Learning->>Learning: Xác lập mốc "Đã hoàn thành khóa học" (Không bị hủy)
                end
            end
        end
    end
    deactivate Learning
```

- **Mô tả ngắn gọn:** Kiểm tra quyền hiệu lực $\to$ nếu chương Protected thì hỏi Passcode $\to$ mở bài là tính xong Block $\to$ cập nhật tiến độ Chương và Khóa.
- **Quy tắc quan trọng:** Khách chỉ đọc chương Public của khóa Public và không lưu tiến độ (`FR-LRN-16`).

---

### SD-05 (Assessment Module): Nộp bài thi, Chấm tự động & Tính chuẩn đầu ra CLO

- **Mục đích nghiệp vụ:** Đóng bài làm, tự động chấm điểm trắc nghiệm khách quan, cập nhật lịch sử điểm và áp dụng công thức trọng số AUN-QA để tính mức đạt CLO so khớp ngưỡng đạt chung (50%).
- **Mã FR liên quan:** `FR-AST-01`, `FR-AST-02`, `FR-AST-08`, `FR-AST-14`, `FR-AST-15`, `Mục 3.5.2`, `NFR-09`.
- **Actor và Lifelines:** `Student` / `System`, `Learning Module`, `Content Module`, `Assessment Module`, `Notification Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Trigger as Người nộp (Student / System khi hết giờ)
    participant Learning as Learning Module
    participant Content as Content Module
    participant Assessment as Assessment Module
    participant Notification as Notification Module

    Trigger->>Learning: Nộp bài kiểm tra (attempt_id, answers)
    activate Learning

    Learning->>Assessment: [Contract] CloseAttempt(attempt_id)
    activate Assessment
    Assessment-->>Learning: Đóng bài làm thành công (Ngăn sửa đổi)
    deactivate Assessment

    Learning->>Content: [Contract] GetAnswerKeyAndCloWeights(quiz_id)
    activate Content
    Content-->>Learning: Đáp án đúng, điểm từng câu, danh sách CLO & trọng số (w_ik)
    deactivate Content

    Learning->>Assessment: [Contract] ProcessGradingAndClo(attempt_id, user_id, answers, answer_keys, weights)
    activate Assessment
    Assessment->>Assessment: So khớp đáp án -> Tính tổng điểm bài thi
    Assessment->>Assessment: Cập nhật điểm: Gần nhất, Cao nhất, Trung bình (FR-AST-02)

    %% Tính mức đạt CLO theo AUN-QA (Mục 3.5.2)
    Assessment->>Assessment: Tính tỷ lệ đạt của bài thi: t_i = Điểm đạt / Điểm tối đa
    Assessment->>Assessment: Tính mức đạt CLO_k (%) = Sum(w_ik * t_i) / Sum(w_ik) * 100
    Assessment->>Assessment: So sánh mức đạt CLO với Ngưỡng đạt chung (Mặc định >= 50% là ĐẠT)
    Assessment->>Assessment: Gán tên mức đạt: Chưa đạt, Đạt, Tốt, Xuất sắc (FR-AST-14)
    
    Assessment-->>Learning: Trả về kết quả: Tổng điểm, Mức đạt từng CLO
    deactivate Assessment

    Learning-)Notification: [Domain Event] QuizCompletedEvent(user_id, quiz_id, score)
    activate Notification
    Notification->>Notification: Lưu thông báo kết quả thi trong ứng dụng
    deactivate Notification

    Learning-->>Trigger: Hiển thị kết quả nộp bài (Theo cấu hình hiển thị FR-CNT-13)
    deactivate Learning
```

- **Mô tả ngắn gọn:** Thu bài $\to$ chấm tự động $\to$ nhân trọng số tính mức đạt $\text{CLO}_k$ $\to$ so sánh ngưỡng 50% $\to$ bắn Domain Event báo kết quả.
- **Quy tắc quan trọng:** Hoàn thành khóa học (tiến độ) và Đạt chuẩn đầu ra CLO là hai kết quả độc lập (`3.4.1`, `3.5.2`).

---

### SD-06 (Discovery Module): Khám phá, Tìm kiếm, Lọc & Bảng xếp hạng Top 10

- **Mục đích nghiệp vụ:** Hiển thị trang chủ, tìm kiếm, lọc và Bảng xếp hạng Top 10. Đảm bảo quy tắc bảo vệ dữ liệu công khai và thuật toán đề xuất ngẫu nhiên.
- **Mã FR liên quan:** `FR-DSC-01`, `FR-DSC-02`, `FR-DSC-04`, `FR-DSC-10`, `Mục 3.6.1`.
- **Actor và Lifelines:** `Client` (Guest / User), `Discovery Module`, `Course Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Người dùng / Khách
    participant Discovery as Discovery Module
    participant Course as Course Module

    Client->>Discovery: Truy vấn Discovery / Tìm kiếm / Top 10 (params: keyword, tags, filter, sort)
    activate Discovery

    Discovery->>Course: [Contract] GetEligiblePublicCourses(params)
    activate Course
    
    Course->>Course: Lọc danh sách: LOẠI BỎ tuyệt đối khóa "Only Me", "Tạm ẩn", "Đã xóa"
    Course->>Course: Khóa "Private": Chỉ giữ lại thông tin cơ bản (ẩn toàn bộ chi tiết nội dung)
    Course->>Course: Khóa "Public": Giữ nguyên thông tin công khai
    
    alt Yêu cầu danh sách Đề xuất (FR-DSC-02)
        Course->>Course: Chọn NGẪU NHIÊN từ danh sách đủ điều kiện (Không phụ thuộc lịch sử học)
    else Yêu cầu Bảng xếp hạng Top 10 (FR-DSC-10)
        Course->>Course: Xếp hạng theo số phát sinh trong kỳ (Tuần/Tháng/Toàn thời gian):<br/>- Ghi danh mới (learners)<br/>- Đánh giá mới (ratings)<br/>- Đề cử mới (nominations)
    else Tìm kiếm / Lọc / Sắp xếp (FR-DSC-04 -> FR-DSC-09)
        Course->>Course: Áp dụng bộ lọc tag, trạng thái, chế độ truy cập và phân trang (<= 50)
    end

    Course-->>Discovery: Danh sách khóa học hợp lệ thỏa mãn điều kiện
    deactivate Course

    Discovery-->>Client: Hiển thị kết quả khám phá trên giao diện
    deactivate Discovery
```

- **Mô tả ngắn gọn:** Discovery lọc sạch khóa Only Me, Tạm ẩn, Đã xóa. Đề xuất chọn ngẫu nhiên từ pool hợp lệ. Top 10 tính theo số phát sinh mới trong kỳ.
- **Quy tắc quan trọng:** Khóa Only Me không bao giờ xuất hiện ở Discovery (`3.6.1`).

---

### SD-07 (Profile Module): Quản lý hồ sơ cá nhân & Thiết lập quyền riêng tư

- **Mục đích nghiệp vụ:** Người dùng cập nhật hồ sơ (tên, avatar, bio) và cấu hình ẩn/hiện danh sách khóa học cá nhân (luôn loại trừ khóa Only Me).
- **Mã FR liên quan:** `FR-PRF-01`, `FR-PRF-04`, `FR-PRF-06`.
- **Actor và Lifelines:** `User`, `Viewer`, `Profile Module`, `Course Module`, `Identity Module`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Chủ tài khoản (User)
    actor Viewer as Người xem (Guest / User khác)
    participant Profile as Profile Module
    participant Course as Course Module
    participant Identity as Identity Module

    %% Nhánh 1: Cập nhật thông tin cá nhân và Quyền riêng tư
    User->>Profile: Cập nhật hồ sơ (display_name, avatar, bio, privacy_setting)
    activate Profile
    Profile->>Identity: [Contract] ValidateUserActive(user_id)
    Identity-->>Profile: Hợp lệ
    Profile->>Profile: Lưu thông tin hồ sơ và cấu hình ẩn/hiện danh sách khóa học
    Profile-->>User: Cập nhật hồ sơ thành công
    deactivate Profile

    %% Nhánh 2: Xem hồ sơ công khai
    Viewer->>Profile: Xem trang hồ sơ công khai của User (target_user_id)
    activate Profile
    Profile->>Profile: Lấy thông tin cơ bản (display_name, avatar, bio, ngày gia nhập)
    
    alt Chủ tài khoản BẬT quyền riêng tư (Ẩn danh sách khóa học)
        Profile-->>Viewer: Hiển thị hồ sơ cơ bản (Danh sách khóa học bị ẩn)
    else Chủ tài khoản CHO PHÉP hiển thị danh sách khóa học
        Profile->>Course: [Contract] GetUserPublicCourses(target_user_id)
        activate Course
        Course->>Course: Lấy danh sách khóa đã tạo/học<br/>(LOẠI TRỪ TUYỆT ĐỐI khóa "Only Me" theo FR-PRF-06)
        Course-->>Profile: Danh sách khóa học hợp lệ
        deactivate Course
        Profile-->>Viewer: Hiển thị hồ sơ công khai kèm danh sách khóa học cho phép
    end
    deactivate Profile
```

- **Mô tả ngắn gọn:** Cập nhật thông tin cá nhân $\to$ đặt quyền riêng tư Ẩn/Hiện. Khi người khác xem hồ sơ, khóa Only Me luôn bị ẩn hoàn toàn.
- **Quy tắc quan trọng:** Khóa Only Me không bao giờ hiển thị trên hồ sơ công khai (`FR-PRF-06`).

---

### SD-08 (Notification Module): Tiếp nhận Domain Event & Quản trị thông báo hệ thống

- **Mục đích nghiệp vụ:** Tạo thông báo in-app và gửi email từ Domain Event sau khi nghiệp vụ chính hoàn tất. Admin gửi thông báo hệ thống diện rộng (Broadcast).
- **Mã FR liên quan:** `FR-NTF-01`, `FR-NTF-02`, `FR-NTF-03`, `FR-NTF-07`.
- **Actor và Lifelines:** `Admin`, `OtherModule`, `Notification Module`, `Email Service`, `User`.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên (Admin)
    participant OtherModule as Module nghiệp vụ khác
    participant Notification as Notification Module
    participant Email as Email Service
    actor User as Người dùng nhận thông báo

    %% Trường hợp 1: Tạo thông báo tự động từ Domain Event
    OtherModule-)Notification: [Domain Event] EventPayload (Loại sự kiện, target_user_id, message)
    activate Notification
    Notification->>Notification: Lưu thông báo vào CSDL (Loại = In-App, Đã đọc = False)
    Notification-->>User: Đẩy thông báo thời gian thực lên icon chuông (FR-NTF-02)

    opt Sự kiện quan trọng yêu cầu Email (Khóa tài khoản, xác minh email, reset mật khẩu)
        Notification->>Email: Gửi email thông báo (Timeout = 10s theo NFR-22)
        activate Email
        alt Gửi email thành công
            Email-->>Notification: Đã gửi
        else Lỗi kết nối Email Service
            Email-->>Notification: Gặp lỗi / Timeout
            Notification->>Notification: Ghi log lỗi (Không làm ảnh hưởng đến thông báo In-App)
        end
        deactivate Email
    end
    deactivate Notification

    %% Trường hợp 2: Admin gửi thông báo hệ thống diện rộng (Broadcast)
    Admin->>Notification: Gửi thông báo hệ thống (title, content, target = 'ALL')
    activate Notification
    Notification->>Notification: Xác thực quyền Admin
    Notification->>Notification: Tạo thông báo hệ thống gửi đến toàn bộ người dùng trong CSDL
    Notification-->>Admin: Phát thông báo hệ thống thành công (FR-NTF-07)
    Notification-->>User: Toàn bộ người dùng nhận thông báo trên icon chuông
    deactivate Notification
```

- **Mô tả ngắn gọn:** Nhận Domain Event $\to$ lưu thông báo chuông in-app và gửi email. Admin có chức năng Broadcast thông báo đến toàn bộ người dùng.
- **Quy tắc quan trọng:** Gửi thông báo thất bại không làm rollback nghiệp vụ chính (`FR-NTF-01`).

---

### SD-09 (Moderation Module): Xử lý báo cáo vi phạm, Chế tài & Ghi Audit Log

- **Mục đích nghiệp vụ:** Người dùng gửi báo cáo (chống spam), Admin thẩm định trong hàng đợi, thực thi chế tài (Ẩn khóa / Khóa tài khoản) và ghi Audit Log bất biến.
- **Mã FR liên quan:** `FR-MOD-01`, `FR-MOD-04`, `FR-MOD-07`, `FR-MOD-10`, `FR-MOD-13`.
- **Actor và Lifelines:** `Reporter`, `Admin`, `Moderation Module`, `Course Module`, `Identity Module`, `Notification Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Reporter as Người dùng báo cáo
    actor Admin as Quản trị viên (Admin)
    participant Moderation as Moderation Module
    participant Course as Course Module
    participant Identity as Identity Module
    participant Notification as Notification Module

    %% Bước 1: Tiếp nhận báo cáo và Chống Spam
    Reporter->>Moderation: Gửi báo cáo vi phạm (target_type, target_id, lý do, bằng chứng)
    activate Moderation
    Moderation->>Moderation: Kiểm tra rate limit chống spam (Không gửi trùng lặp liên tục - FR-MOD-02)
    Moderation->>Moderation: Lưu vào Hàng đợi báo cáo (Trạng thái = Chờ xử lý)
    Moderation-->>Reporter: Gửi báo cáo thành công
    deactivate Moderation

    %% Bước 2: Admin thẩm định và áp dụng chế tài
    Admin->>Moderation: Thẩm định và Xử lý báo cáo (report_id, quyết định = 'Chấp nhận', lý do, chế tài)
    activate Moderation
    Moderation->>Moderation: Kiểm tra lý do bắt buộc (Lý do không được để trống)
    
    alt Chế tài: Tạm ẩn khóa học (FR-MOD-07)
        Moderation->>Course: [Contract] HideCourse(course_id, reason, duration)
        activate Course
        Course->>Course: Chuyển trạng thái khóa: "Tạm ẩn" (Ẩn khỏi Discovery, giữ tiến độ học viên)
        Course-->>Moderation: Đã ẩn khóa học
        deactivate Course
    else Chế tài: Khóa tài khoản có thời hạn (FR-MOD-10)
        Moderation->>Identity: [Contract] LockAccount(user_id, duration, reason)
        activate Identity
        Identity->>Identity: Chuyển trạng thái: "Bị khóa có thời hạn", thu hồi mọi Refresh Token
        Identity-->>Moderation: Đã khóa tài khoản
        deactivate Identity
    end

    %% Bước 3: Ghi Audit Log bất biến và gửi thông báo
    Moderation->>Moderation: Ghi Audit Log bất biến (admin_id, action, target_id, reason, timestamp)
    Moderation->>Moderation: Cập nhật trạng thái báo cáo: "Đã chấp nhận"
    
    Moderation-)Notification: [Domain Event] ModerationResolvedEvent(reporter_id, target_user_id, outcome)
    Moderation-->>Admin: Xử lý vi phạm hoàn tất
    deactivate Moderation
```

- **Mô tả ngắn gọn:** Tiếp nhận báo cáo qua bộ lọc spam $\to$ Admin xử lý bắt buộc có lý do $\to$ áp dụng chế tài (ẩn khóa hoặc khóa tài khoản) $\to$ ghi Audit Log bất biến.
- **Quy tắc quan trọng:** Khóa Only Me không thể bị báo cáo hay tạm ẩn (`FR-MOD-01`, `FR-MOD-07`). Admin không thể tự khóa nick chính mình (`3.9.1`).

---

### SD-10 (AI Module): Sinh nội dung AI & Quét kiểm duyệt tự động

- **Mục đích nghiệp vụ:** Chủ khóa dùng External LLM sinh câu hỏi (trạng thái "Nháp", duyệt mới thành "Sẵn sàng"). Dịch vụ PhoBERT chạy ngầm quét vi phạm, đẩy cờ vào hàng đợi Admin (AI không tự động xóa/phạt).
- **Mã FR liên quan:** `FR-AI-01`, `FR-AI-03`, `FR-MOD-03`, `Mục 3.10.1`, `NFR-13`.
- **Actor và Lifelines:** `Owner`, `AI Module`, `LLM API`, `Content Module`, `PhoBERT Service`, `Moderation Module`.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Chủ khóa (User)
    participant AI as AI Module
    participant LLM as External LLM API
    participant Content as Content Module
    participant PhoBERT as PhoBERT Service (Python)
    participant Moderation as Moderation Module

    %% Nhánh 1: Sinh câu hỏi trắc nghiệm bằng LLM ngoài (Human-in-the-loop)
    Owner->>AI: Yêu cầu sinh câu hỏi trắc nghiệm (course_id, input_text, num_questions)
    activate AI
    AI->>AI: Kiểm tra hạn mức sử dụng LLM trong ngày (Daily Quota)
    alt Đã vượt quá hạn mức gọi AI trong ngày
        AI-->>Owner: Báo lỗi: Đã sử dụng hết hạn mức gọi AI hôm nay
    else Hạn mức còn hợp lệ
        AI->>LLM: Gọi API sinh câu hỏi trắc nghiệm (timeout = 30s)
        activate LLM
        LLM-->>AI: Trả về danh sách câu hỏi và đáp án gợi ý
        deactivate LLM
        
        AI->>Content: [Contract] SaveQuestions(course_id, questions, status="Nháp - do AI tạo")
        activate Content
        Content->>Content: Lưu câu hỏi vào ngân hàng dưới trạng thái Nháp (Draft)
        Content-->>AI: Đã lưu các câu hỏi nháp
        deactivate Content
        AI-->>Owner: Trả về danh sách câu hỏi nháp để Chủ khóa xem xét
        
        %% Chủ khóa duyệt (Bắt buộc)
        Owner->>Content: Xem lại, chỉnh sửa và Bấm phê duyệt (question_ids)
        activate Content
        Content->>Content: Chuyển trạng thái câu hỏi: "Nháp" -> "Sẵn sàng"
        Content-->>Owner: Phê duyệt thành công (Câu hỏi sẵn sàng đưa vào bài thi)
        deactivate Content
    end
    deactivate AI

    %% Nhánh 2: Quét kiểm duyệt tự động bằng PhoBERT chạy cục bộ
    Note over AI, Moderation: Kích hoạt ngầm sau khi có nội dung mới được lưu (bình luận, tên khóa học)
    AI->>PhoBERT: Gửi nội dung văn bản để phân tích nhãn vi phạm
    activate PhoBERT
    PhoBERT-->>AI: Trả về điểm vi phạm (violation_score)
    deactivate PhoBERT
    
    alt Điểm vi phạm >= Ngưỡng cấu hình của Admin
        AI->>Moderation: [Contract] Tạo cờ vi phạm (source='AI', target_info, score)
        activate Moderation
        Moderation->>Moderation: Đưa vào Hàng đợi kiểm duyệt tập trung (Chờ Admin xử lý)
        deactivate Moderation
    else Điểm vi phạm < Ngưỡng
        AI->>AI: Nội dung an toàn, kết thúc quét
    end
```

- **Mô tả ngắn gọn:** Sinh quiz bằng LLM ngoài (luôn ở trạng thái Nháp $\to$ Chủ khóa duyệt mới được dùng). PhoBERT quét ngầm bình luận $\to$ vi phạm thì đẩy vào hàng đợi cho Admin, AI không tự xóa.
- **Quy tắc quan trọng:** Khóa Only Me không bao giờ bị AI quét kiểm duyệt (`FR-AI-03`). Hết quota AI thì bị chặn (`3.10.1`).
