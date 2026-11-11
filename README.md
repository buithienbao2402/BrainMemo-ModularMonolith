# BrainMemo - Nền tảng học tập trực tuyến

## Giới thiệu

BrainMemo là nền tảng LMS cho phép người dùng tự do đăng tải, chia sẻ và sử dụng các bộ học liệu do chính người dùng tạo ra. Hệ thống hỗ trợ các chức năng tương tự Moodle, đồng thời cung cấp bài kiểm tra và học bằng flashcard.

## Điểm vượt trội so với các LMS khác

- **Đánh giá năng lực linh hoạt:** đánh giá học viên theo chuẩn đầu ra AUN QA.
- **Kiểm duyệt nội dung tự động:** ứng dụng mô hình PhoBERT để quét và phát hiện nội dung vi phạm.
- **Tự động sinh nội dung học tập:** tích hợp API LLM để sinh câu hỏi và flashcard, giảm công sức soạn thủ công.

## Kiến trúc hệ thống

**Modular Monolith + Layered Architecture**

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | C# .NET (ASP.NET Core, EF Core, MediatR) |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Database | MySQL 8 |
| Storage | Cloudflare R2 / MinIO (S3-compatible) |
| AI Service | Python FastAPI + PhoBERT ONNX Runtime |
| DevOps | Docker Compose, Nginx, Cloudflare DNS & SSL, Jenkins CI/CD |

## Thiết kế giao diện

Link Figma: https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1&t=7byuXLiQQSm0VyuI-1

---

## Cấu trúc Monorepo

Chi tiết quy ước cây thư mục và luật phụ thuộc xem tại [docs/REPO_STRUCTURE.md](docs/REPO_STRUCTURE.md).

```text
BrainMemo-ModularMonolith/
├─ AGENT.md               # Luật làm việc chung
├─ .editorconfig          # Quy chuẩn format code đa ngôn ngữ
├─ docs/
│  ├─ spec/               # Tài liệu đặc tả gốc (chỉ đọc)
│  ├─ handoff/            # Ghi chú bàn giao theo task
│  ├─ design/figma-png/   # Ảnh màn hình Figma (SCR-*)
│  ├─ DECISIONS.md        # Quyết định kiến trúc bổ sung
│  ├─ REPO_STRUCTURE.md   # Quy chuẩn cây thư mục & luật phụ thuộc
│  ├─ FRONTEND_SPEC.md    # Đặc tả giao diện & quy ước FE
│  ├─ BACKLOG.md          # Danh sách task theo sprint/slice
│  └─ BACKLOG_STATUS.md   # Trạng thái thực hiện task
├─ openapi/               # Hợp đồng OpenAPI theo module & file gộp openapi.yaml
├─ contracts/             # Đặc tả Contract C# & Integration Events
├─ backend/               # Solution .NET Modular Monolith + tests
├─ frontend/              # React + TypeScript + Vite + Playwright e2e
├─ ai-service/            # Python FastAPI + PhoBERT ONNX
├─ db/                    # schema.sql baseline & seed scripts
├─ infra/                 # Docker Compose, Nginx, Jenkins, .env.example
└─ tools/                 # Script tiện ích (merge-openapi)
```

---

## Hướng dẫn chạy (Local Development)

> **Lưu ý:** Ở bước khởi tạo monorepo (`T-S0-OPS-01`), khung thư mục đã được dựng theo chuẩn. Các file cấu hình chạy thực tế của từng thành phần sẽ lần lượt được bổ sung trong các task nền tảng của Sprint S0 (`T-S0-OPS-02`, `T-S0-OPS-03`, `T-S0-DB-01`, `T-S0-BE-01/02`, `T-S0-FE-01`).

### 1. Yêu cầu môi trường (Prerequisites)

- [.NET SDK](https://dotnet.microsoft.com/) (khuyến nghị .NET 8 LTS trở lên)
- [Node.js](https://nodejs.org/) ≥ 20 và `pnpm`
- [Docker](https://www.docker.com/) & Docker Compose
- [Python](https://www.python.org/) ≥ 3.11 (nếu chạy `ai-service` trực tiếp ngoài Docker)

### 2. Cấu hình biến môi trường

Sao chép file mẫu cấu hình môi trường (sẵn sàng sau `T-S0-OPS-02`):

```bash
cp infra/env/.env.example .env
```

Cập nhật các thông tin kết nối MySQL, MinIO/R2, SMTP (Mailpit ở dev), JWT secret và LLM API key trong `.env` nếu cần.

### 3. Khởi chạy hạ tầng dịch vụ (Docker Compose)

Chạy MySQL 8, MinIO, Mailpit và `ai-service` ở chế độ phát triển:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Nạp baseline schema và dữ liệu Admin khởi tạo từ `db/schema.sql` và `db/seed/` (theo hướng dẫn chi tiết của `T-S0-OPS-02` / `T-S0-DB-01`).

### 4. Chạy Backend (.NET WebApi)

```bash
cd backend
dotnet restore BrainMemo.sln
dotnet build BrainMemo.sln
dotnet run --project src/Host/BrainMemo.WebApi
```

- Kiểm tra health check: `GET /health`
- Swagger UI (Development): `/swagger`

### 5. Chạy Frontend (React + Vite)

```bash
cd frontend
pnpm install
pnpm gen:api     # Sinh type TypeScript từ openapi/openapi.yaml vào src/shared/api/schema.d.ts
pnpm dev
```

Nếu chưa chạy Backend thật, bật chế độ mock (MSW/Prism) bằng biến môi trường trong `frontend/.env.local`:

```env
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=true
```

### 6. Chạy AI Service (Python FastAPI)

Nếu không chạy qua `docker-compose.dev.yml`, có thể chạy trực tiếp:

```bash
cd ai-service
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows (PowerShell): .\.venv\Scripts\Activate.ps1
pip install -e .
uvicorn app.main:app --reload --port 8000
```

---

## Hợp đồng OpenAPI & Kiểm thử

### Gộp và kiểm tra OpenAPI (`tools/merge-openapi`)

```bash
pnpm --filter tools openapi:bundle   # Gộp openapi/modules/*.yaml -> openapi/openapi.yaml
pnpm --filter tools openapi:lint     # Kiểm tra chuẩn Redocly
```

### Chạy kiểm thử

- **Backend (Unit, Integration, Architecture Tests):**
  ```bash
  dotnet test backend/BrainMemo.sln
  ```
- **Frontend (Unit tests & E2E Playwright):**
  ```bash
  pnpm --filter frontend test
  pnpm --filter frontend test:e2e
  ```

---

## Quy trình làm việc & Tài liệu tham khảo

- Quy tắc làm việc chung cho lập trình viên và AI: [AGENT.md](AGENT.md)
- Quyết định kiến trúc & xử lý xung đột tài liệu: [docs/DECISIONS.md](docs/DECISIONS.md)
- Đặc tả gốc: [docs/spec/](docs/spec/)
- Kế hoạch & Trạng thái task: [docs/BACKLOG.md](docs/BACKLOG.md) | [docs/BACKLOG_STATUS.md](docs/BACKLOG_STATUS.md)
