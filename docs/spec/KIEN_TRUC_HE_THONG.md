
## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```mermaid
flowchart TB
    subgraph ClientLayer["TẦNG NGƯỜI DÙNG (CLIENT)"]
        Guest["Khách (Guest)<br/>Discovery + nội dung Public"]
        Browser["Trình duyệt Web<br/>Người dùng (Học viên / Chủ khóa) và Admin"]
    end

    subgraph CloudflareLayer["TẦNG BẢO MẬT & PHÂN PHỐI (CLOUDFLARE)"]
        CF_DNS["Cloudflare DNS"]
        CF_SSL["Cloudflare Edge Proxy<br/>HTTPS / TLS 1.3 / HSTS"]
    end

    subgraph VPS_Docker["MÁY CHỦ VPS (DOCKER COMPOSE NETWORK)"]
        Nginx["Nginx Reverse Proxy<br/>Origin CA, chuyển HTTP sang HTTPS"]
        ReactUI["Frontend React + TypeScript<br/>Bản build tĩnh do Nginx phục vụ"]

        subgraph DotNetBackend["Backend Container: C# ASP.NET Core - Modular Monolith + Layered"]
            APIHost["BrainMemo.WebApi Host<br/>REST API<br/>JWT, Rate Limiter, ProblemDetails tiếng Việt"]
            BG["Hosted Services chạy nền<br/>Outbox Dispatcher, Scheduler: tự nộp bài quá hạn,<br/>gỡ khóa tài khoản / tạm ẩn khóa học hết hạn, tính Top 10, dọn tệp"]
            BB["BuildingBlocks<br/>SharedKernel, Event Bus in-process, Outbox / Inbox, Phân trang, Clock"]

            subgraph Modules["10 MODULE NGHIỆP VỤ (mỗi module: Api / Application / Domain / Infrastructure / Contracts)"]
                subgraph GrpNen["Nền tảng"]
                    ModIdn["Identity<br/>Xác thực, phiên, khóa tài khoản, role Admin"]
                    ModPrf["Profile<br/>Hồ sơ, quyền riêng tư, giao diện"]
                    ModNtf["Notification<br/>In-app (polling), Email, Broadcast"]
                end
                subgraph GrpHocLieu["Học liệu & Đánh giá"]
                    ModCrs["Course<br/>Khóa học, truy cập khóa/chương, ghi danh, đề cử"]
                    ModCnt["Content<br/>Chương, Block, ngân hàng câu hỏi, bài thi, phiên bản, tệp"]
                    ModLrn["Learning<br/>Tiến độ, làm bài, bài tập, bình luận"]
                    ModAst["Assessment<br/>Chấm điểm, CLO/PLO, đánh giá khóa, xuất báo cáo"]
                end
                subgraph GrpKhac["Khám phá & Kiểm soát"]
                    ModDsc["Discovery<br/>Tìm kiếm, lọc, Top 10"]
                    ModMod["Moderation<br/>Báo cáo, chế tài, Audit Log"]
                end
                subgraph GrpAI["Trí tuệ nhân tạo"]
                    ModAI["AI<br/>Sinh quiz, sinh flashcard, quét vi phạm, Quota Guard"]
                end
            end

            Infra["Infrastructure Adapters<br/>EF Core (DbContext riêng mỗi module), IFileStorage (S3), ILlmClient,<br/>IEmailSender, IPhoBertClient, Google OAuth, Excel / PDF Exporter"]
        end

        subgraph PythonAI["AI Service Container: Python (CPU)"]
            FastAPI_AI["FastAPI Moderation Controller"]
            PhoPipe["PhoBERT Pipeline<br/>Tách từ tiếng Việt + PhoBERT (ONNX int8)"]
        end

        MySQL[("MySQL 8<br/>1 database, bảng tiền tố theo module")]
    end

    subgraph ExternalCloud["DỊCH VỤ BÊN NGOÀI (EXTERNAL)"]
        R2Storage[("Cloudflare R2 / MinIO<br/>Object Storage - S3 API")]
        LLMApi["LLM API bên ngoài<br/>Trừu tượng hóa qua ILlmClient"]
        SMTP["Dịch vụ Email SMTP"]
        GoogleOAuth["Google OAuth 2.0"]
    end

    Guest -->|"HTTPS (443)"| CF_DNS
    Browser -->|"HTTPS (443)"| CF_DNS
    CF_DNS --> CF_SSL
    CF_SSL -->|"TLS (Origin CA)"| Nginx
    Nginx -->|"Static / SPA"| ReactUI
    Nginx -->|"REST /api/*"| APIHost
    Browser -.->|"Presigned PUT/GET: tải tệp trực tiếp"| R2Storage

    APIHost --> Modules
    BG --> Modules
    BG -->|"Poll Outbox"| MySQL
    Modules -.->|"dùng chung"| BB
    Modules --> Infra

    Infra -->|"EF Core (TCP 3306)"| MySQL
    Infra -->|"S3 SDK (Presigned URL)"| R2Storage
    Infra -->|"HTTP nội bộ (timeout 10s, lỗi thì bỏ qua + ghi log)"| FastAPI_AI
    FastAPI_AI --> PhoPipe
    Infra -->|"HTTPS (timeout 30s, retry + circuit breaker)"| LLMApi
    Infra -->|"SMTP (timeout 10s)"| SMTP
    Infra <-->|"OAuth 2.0"| GoogleOAuth

    classDef mod fill:#e8f1ff,stroke:#3b6fd4,color:#000
    class ModIdn,ModPrf,ModNtf,ModCrs,ModCnt,ModLrn,ModAst,ModDsc,ModMod,ModAI mod
```

## 2. QUAN HỆ PHỤ THUỘC GIỮA CÁC MODULE

Quy ước: `A → B` nghĩa là A chỉ tham chiếu `B.Contracts`. Nét liền: gọi Contract. Nét đứt: nhận event hoặc implement port do B định nghĩa. Các project `*.Contracts` không tham chiếu module nào nên không có vòng phụ thuộc.

```mermaid
flowchart BT
    Identity["Identity"]
    Profile["Profile"]
    Course["Course"]
    Content["Content"]
    Learning["Learning"]
    Assessment["Assessment"]
    AI["AI"]
    Moderation["Moderation"]
    Notification["Notification"]
    Discovery["Discovery"]
    AllMods["Tất cả module khác"]

    AllMods -->|"IAccessChecker, trạng thái tài khoản"| Identity
    Profile -.->|"UserRegistered"| Identity

    Course -->|"IProfilePrivacy, IUserDirectory"| Profile
    Content -->|"ICourseAccess; implements ICourseContentStats"| Course
    Learning -->|"ICourseAccess; implements ICourseLearningStats"| Course
    Learning -->|"cấu trúc đã đăng tải, IQuestionEvaluator"| Content
    Assessment -->|"danh sách học viên, quyền"| Course
    Assessment -->|"cấu hình bài thi, IQuestionEvaluator; implements IQuestionUsageProvider"| Content
    Learning & Assessment -->|"IUserDirectory"| Profile
    Assessment -.->|"AttemptSubmitted, AssignmentSubmitted"| Learning

    AI -->|"ICourseVisibility (loại Only Me)"| Course
    AI -->|"đọc nội dung chương, IQuestionDraftWriter"| Content
    AI -.->|"CommentPosted, CourseInfoChanged"| Learning
    AI -.-> Course

    Moderation -->|"IModerationReader, ẩn/khôi phục/xóa vĩnh viễn"| Course
    Moderation -->|"đọc, xóa mềm bình luận"| Learning
    Moderation -->|"lệnh khóa / mở khóa tài khoản"| Identity
    Moderation -.->|"ContentFlagged"| AI

    Content & Learning & Assessment & Discovery -.->|"CoursePurged, CourseVisibilityChanged"| Course
    Notification -.->|"Event của mọi module"| Course
    Notification -.-> Learning
    Notification -.-> Assessment
    Notification -.-> Moderation
    Notification -.-> Identity
    Discovery -.->|"Event cập nhật read model"| Content
    Discovery -.-> Learning
    Discovery -.-> Assessment
    Learning -.->|"implements IInProgressCoursesProvider"| Discovery
```

## 3. LUỒNG KIỂM TRA QUYỀN TRUY CẬP

```mermaid
flowchart TB
    Req["Request đến API"] --> HasJwt{"Có JWT?"}

    HasJwt -->|"Không"| GuestChk{"Khóa Public, chương Public,<br/>khóa không Tạm ẩn / Đã xóa / Only Me?"}
    GuestChk -->|"Có"| AllowG["Cho phép đọc<br/>(không lưu tiến độ / điểm)"]
    GuestChk -->|"Không"| Deny401["401 / 403"]

    HasJwt -->|"Có"| S1{"Bước 1: Tài khoản bị khóa?"}
    S1 -->|"Có"| DenyLock["Chặn ngay"]
    S1 -->|"Không"| S2{"Bước 2: Role hợp lệ?<br/>(chức năng quản trị chỉ Admin)"}
    S2 -->|"Không"| Deny403a["403"]
    S2 -->|"Có"| OM{"Khóa Only Me?"}
    OM -->|"Có"| Own1{"Là Chủ khóa?"}
    Own1 -->|"Không"| Deny404["404 (không lộ sự tồn tại)<br/>kể cả Admin"]
    Own1 -->|"Có"| Allow["Cho phép"]
    OM -->|"Không"| Hid{"Khóa Tạm ẩn / Đã xóa?"}
    Hid -->|"Có"| Own2{"Là Chủ khóa, hoặc Admin<br/>trong phạm vi xử lý báo cáo?"}
    Own2 -->|"Có"| Allow
    Own2 -->|"Không"| Deny403b["403 / 404"]
    Hid -->|"Không"| Own3{"Là Chủ khóa?"}
    Own3 -->|"Có"| Allow
    Own3 -->|"Không"| En{"Ghi danh Đang học?"}
    En -->|"Không"| Pub{"Khóa Public và chương Public?"}
    Pub -->|"Có"| AllowG2["Cho phép đọc như Khách<br/>(không lưu dữ liệu)"]
    Pub -->|"Không"| Deny403c["403"]
    En -->|"Có"| Prot{"Chương Protected?"}
    Prot -->|"Không"| Allow
    Prot -->|"Có"| Pass{"Đã nhập đúng passcode<br/>(version hiện tại)?"}
    Pass -->|"Có"| Allow
    Pass -->|"Không"| DenyPass["Yêu cầu nhập passcode"]
```
