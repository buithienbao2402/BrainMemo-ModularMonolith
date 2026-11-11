# REPO_STRUCTURE – Monorepo BrainMemo LMS

## 1. Cây thư mục

```
brainmemo/
├─ AGENT.md                      # Luật chung cho mọi AI (đọc đầu tiên)
├─ README.md
├─ docs/
│  ├─ spec/                      # Tài liệu gốc (chỉ đọc)
│  │  ├─ DAC_TA_YEU_CAU_HE_THONG.md
│  │  ├─ THIET_KE_CSDL.md
│  │  ├─ SEQUENCE_DIAGRAMS.md
│  │  ├─ CLASS_DIAGRAM.md
│  │  └─ KIEN_TRUC_HE_THONG.md
│  ├─ DECISIONS.md               # Quyết định bổ sung (ưu tiên cao hơn spec/)
│  ├─ REPO_STRUCTURE.md
│  ├─ FRONTEND_SPEC.md
│  ├─ PRIORITY.md
│  ├─ BACKLOG.md                 # Danh sách task (không sửa nội dung task)
│  ├─ BACKLOG_STATUS.md          # Bảng trạng thái task (AI cập nhật)
│  ├─ OPEN_QUESTIONS.md          # Xung đột/điểm chưa rõ, AI ghi vào đây
│  ├─ handoff/                   # Ghi chú bàn giao: T-S3-BE-02.md ...
│  └─ design/figma-png/          # SCR-AUTH-01__login.png ...
├─ openapi/
│  ├─ openapi.root.yaml          # info, security, components dùng chung
│  ├─ modules/                   # identity.yaml profile.yaml files.yaml course.yaml
│  │                             # content.yaml learning.yaml assessment.yaml
│  │                             # discovery.yaml notification.yaml moderation.yaml ai.yaml
│  └─ openapi.yaml               # SINH RA bởi tools/merge-openapi (commit vào repo)
├─ contracts/                    # Đặc tả Contract/Event (markdown, nguồn chuẩn)
│  ├─ README.md  identity.md  profile.md  course.md  content.md  learning.md
│  ├─ assessment.md  discovery.md  notification.md  moderation.md  ai.md
│  └─ events.md
├─ backend/
│  ├─ BrainMemo.sln
│  ├─ src/
│  │  ├─ BuildingBlocks/
│  │  │  ├─ BrainMemo.SharedKernel/          # Entity, ValueObject, Result, Error, IClock
│  │  │  ├─ BrainMemo.BuildingBlocks.Abstractions/  # IFileStorage, ILlmClient, IEmailSender,
│  │  │  │                                   # IPhoBertClient, ISystemSettings,
│  │  │  │                                   # IEventBus, IModerationTransaction
│  │  │  └─ BrainMemo.BuildingBlocks.Infrastructure/ # Outbox, EventBus in-process, Paging,
│  │  │                                      # MediatR behaviors, S3FileStorage, SmtpEmailSender
│  │  ├─ Modules/
│  │  │  └─ <Module>/                        # Identity Profile Moderation Notification
│  │  │     ├─ BrainMemo.<Module>.Api/       #   Course Content Learning Assessment
│  │  │     ├─ BrainMemo.<Module>.Application/ #  Discovery AI
│  │  │     ├─ BrainMemo.<Module>.Domain/
│  │  │     ├─ BrainMemo.<Module>.Infrastructure/  # DbContext riêng, Migrations/
│  │  │     └─ BrainMemo.<Module>.Contracts/ # Interface + DTO + Event (không tham chiếu module nào)
│  │  └─ Host/BrainMemo.WebApi/              # Program.cs, JWT, RateLimiter, ProblemDetails,
│  │                                         # HostedServices (OutboxDispatcher, Schedulers)
│  └─ tests/
│     ├─ <Module>.UnitTests/
│     ├─ <Module>.IntegrationTests/          # Testcontainers MySQL
│     └─ Architecture.Tests/                 # NetArchTest: kiểm luật phụ thuộc
├─ frontend/
│  ├─ package.json  vite.config.ts  tailwind.config.ts  tsconfig.json
│  ├─ src/
│  │  ├─ app/                  # router, providers, layouts, guards
│  │  ├─ shared/
│  │  │  ├─ api/               # schema.d.ts (SINH), client.ts, errors.ts, queryKeys.ts
│  │  │  ├─ ui/                # shadcn/ui wrappers
│  │  │  ├─ lib/  hooks/  i18n/  styles/
│  │  └─ features/<module>/    # api/ components/ pages/ hooks/ schemas/ tests/
│  ├─ e2e/                     # Playwright
│  └─ mocks/                   # MSW handlers (nếu cần)
├─ ai-service/                 # Python FastAPI + PhoBERT ONNX
│  ├─ app/{main.py,pipeline.py,schemas.py}  models/  tests/  Dockerfile  pyproject.toml
├─ db/
│  ├─ schema.sql               # Baseline 58 bảng (+ cập nhật sau mỗi migration)
│  └─ seed/                    # seed Admin đầu tiên, dữ liệu demo
├─ infra/
│  ├─ docker-compose.yml  docker-compose.dev.yml (MySQL, MinIO, Mailpit, AI-service)
│  ├─ nginx/  jenkins/Jenkinsfile  env/.env.example
└─ tools/
   └─ merge-openapi/           # script Node gộp openapi/modules/*.yaml → openapi/openapi.yaml
```

## 2. Luật phụ thuộc (Architecture.Tests phải bảo đảm)

1. `*.Contracts` không tham chiếu project nào ngoài `SharedKernel`.
2. `Domain` không tham chiếu gì ngoài `SharedKernel`.
3. `Application` → `Domain`, `*.Contracts` (của module khác), `Abstractions`.
4. `Infrastructure` → `Application`, `Domain`. DbContext của module chỉ chứa bảng có prefix của module.
5. `Api` → `Application`. Host tham chiếu mọi `Api` + `Infrastructure` để đăng ký DI.
6. Cấm tham chiếu `Application/Domain/Infrastructure` của module khác.
7. Cấm FK vật lý xuyên module, cấm JOIN xuyên module (kiểm bằng review + test schema).
8. Module chỉ chạm bảng của chính nó. Mỗi module có Migration riêng trong `Infrastructure/Migrations`.
9. `purpose=MODERATION_REVIEW` chỉ được truyền từ Moderation (Architecture test).

## 3. Quy tắc đặt tên

| Đối tượng | Quy ước |
|:--|:--|
| Namespace/Project | `BrainMemo.<Module>.<Layer>` |
| Contract interface | `I<Module>Contract` (ví dụ `ICourseContract`) |
| Command/Query | `<Verb><Noun>Command` / `Get<Noun>Query`, handler `...Handler` |
| Event | Tên trong `contracts/events.md`, hậu tố thì quá khứ |
| Bảng | prefix module (`crs_`), snake_case |
| Endpoint | kebab-case, danh từ số nhiều, `operationId` camelCase = tên hàm FE |
| FE feature folder | tên module viết thường (`course`, `content`) |
| Mã màn hình | `SCR-<MOD>-<nn>` trùng tên file PNG |
| Nhánh git | `feat/<task-id>-<slug>` (ví dụ `feat/T-S2-BE-03-create-course`) |
| Commit | `<task-id>: <mô tả>` (ví dụ `T-S2-BE-03: add CreateCourseCommand`) |

## 4. Quyền sở hữu thư mục theo vai trò

| Vai trò | Được sửa | Chỉ đọc | Cấm |
|:--|:--|:--|:--|
| **BE** | `backend/`, `db/`, `ai-service/` | `openapi/`, `contracts/`, `docs/` | Sửa `frontend/`; sửa OpenAPI/Contracts trừ task loại CONTRACT |
| **FE** | `frontend/` (trừ `shared/api/schema.d.ts`: chỉ sinh) | `openapi/`, `docs/` | Sửa `backend/` |
| **INT** | `frontend/` + `backend/` (sửa lỗi lệch hợp đồng), `e2e/`, `infra/`, `tools/`, `openapi/` (sửa theo thực tế) | tất cả | Thêm tính năng mới ngoài task |
| **ARCH** (bạn) | `docs/`, `AGENT.md`, `openapi/`, `contracts/` | – | – |

## 5. Quy trình sinh OpenAPI
1. Sửa file trong `openapi/modules/` (task loại CONTRACT).
2. `pnpm --filter tools openapi:bundle` → ghi `openapi/openapi.yaml`.
3. `pnpm --filter tools openapi:lint` (Redocly) phải sạch.
4. FE: `pnpm --filter frontend gen:api` → `shared/api/schema.d.ts`.
5. BE: test hợp đồng so khớp route/response của WebApi với `openapi.yaml` (Schemathesis hoặc test thủ công theo task).

Luật gộp: `paths` hợp nhất (trùng path → lỗi); `components.schemas` tên duy nhất toàn bộ (trùng → lỗi); `components` chung nằm ở `openapi.root.yaml`.