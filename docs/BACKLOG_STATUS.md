# BACKLOG_STATUS – Trạng thái thực hiện task

> Quy ước trạng thái: `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE` | `BLOCKED`  
> Nguồn danh sách task: [BACKLOG.md](BACKLOG.md)

| Task | Trạng thái | AI/Người làm | PR | Ghi chú |
|:--|:--|:--|:--|:--|
| T-S0-OPS-01 | DONE | Antigravity (OPS) | feat/T-S0-OPS-01-init-monorepo | Khởi tạo monorepo theo `REPO_STRUCTURE.md`, `.gitignore`, `.editorconfig`, `README.md`, `docs/spec/`, handoff note |
| T-S0-OPS-02 | DONE | Antigravity (OPS) | feat/T-S0-OPS-02-docker-compose-dev | `infra/docker-compose.dev.yml` (MySQL 8, S3/MinIO `pgsty/silo` + lifecycle `tmp/` 24h, Mailpit, `ai-service` stub), `infra/env/.env.example` |
| T-S0-DB-01 | DONE | Antigravity (DB) | feat/T-S0-DB-01-baseline-schema-seed | Baseline db/schema.sql (59 bảng, DEC-01, DEC-12) + seed Admin & hướng dẫn |
| T-S0-BE-01 | DONE | Antigravity (BE) | feat/T-S0-BE-01-solution-buildingblocks | Solution BrainMemo.sln + BuildingBlocks (SharedKernel, Abstractions, Infrastructure) + 32 unit tests |
| T-S0-BE-02 | DONE | Antigravity (BE) | feat/T-S0-BE-02-webapi-host | Host BrainMemo.WebApi (JWT, ProblemDetails §3, RateLimiter login 5/p/IP, CORS, /health, Swagger, ModuleRegistry) + 43 tests |
| T-S0-BE-03 | DONE | Antigravity (BE) | feat/T-S0-BE-03-shared-outbox | Outbox chung bảng-agnostic (`OutboxWriter` + `OutboxDispatcher` HostedService + `EfOutboxStore`) + 5 outbox tests |
| T-S0-BE-04 | DONE | Antigravity (BE) | feat/T-S0-BE-04-architecture-tests | `Architecture.Tests` (NetArchTest + Cecil + Roslyn): kiểm đủ 9 luật REPO_STRUCTURE §2 + test âm tính |
| T-S0-BE-05 | DONE | Antigravity (BE) | feat/T-S0-BE-05-s3-file-storage | `S3FileStorage` (`AWSSDK.S3` R2/MinIO), `FileUploadPolicy`, `POST /api/v1/files/upload-urls`, integration test MinIO (`140/140` tests pass) |
| T-S0-OPS-03 | DONE | Antigravity (OPS) | feat/T-S0-OPS-03-merge-openapi | Script `tools/merge-openapi` (`pnpm --filter tools openapi:bundle` / `openapi:check`), Redocly lint (`openapi/redocly.yaml`, `pnpm --filter tools openapi:lint`), bundle `openapi/openapi.yaml` (`11` module, `110` paths, `55` schemas) & `11/11` unit tests pass |
| T-S0-FE-01 | DONE | Antigravity (FE) | feat/T-S0-FE-01-frontend-shell | Khung FE (`frontend/`: Vite/TS 5.9/Tailwind/Radix UI, Router 6, TanStack Query 5, `shared/api` single-flight refresh, `gen:api`, MSW 3, `SCR-COM-01/02/03`) & 12/12 Vitest tests pass |
| T-S0-OPS-04 | DONE | Antigravity (OPS) | feat/T-S0-OPS-04-ci-dockerfiles-nginx | Jenkinsfile, Dockerfiles BE/FE/AI, Nginx reverse proxy, Docker Compose full-stack + handoff note |
| T-S1-BE-01 | DONE | Antigravity (BE) | feat/T-S1-BE-01-identity-domain | Identity Domain (idn_*), IdentityDbContext + InitialIdentity migration, IIdentityContract & integration events, BCrypt/SHA-256 services, unit & MySQL 8 integration tests, handoff note |
| T-S1-BE-02 | TODO | – | – | – |
| T-S1-BE-03 | TODO | – | – | – |
| T-S1-BE-04 | TODO | – | – | – |
| T-S1-BE-05 | TODO | – | – | – |
| T-S1-BE-06 | TODO | – | – | – |
| T-S1-FE-01 | TODO | – | – | – |
| T-S1-FE-02 | TODO | – | – | – |
| T-S1-INT-01 | TODO | – | – | – |
| T-S2-BE-01 | TODO | – | – | – |
| T-S2-BE-02 | TODO | – | – | – |
| T-S2-BE-03 | TODO | – | – | – |
| T-S2-BE-04 | TODO | – | – | – |
| T-S2-FE-01 | TODO | – | – | – |
| T-S2-FE-02 | TODO | – | – | – |
| T-S2-INT-01 | TODO | – | – | – |
| T-S3-BE-01 | TODO | – | – | – |
| T-S3-BE-02 | TODO | – | – | – |
| T-S3-BE-03 | TODO | – | – | – |
| T-S3-FE-01 | TODO | – | – | – |
| T-S3-FE-02 | TODO | – | – | – |
| T-S3-INT-01 | TODO | – | – | – |
| T-S4-BE-01 | TODO | – | – | – |
| T-S4-BE-02 | TODO | – | – | – |
| T-S4-BE-03 | TODO | – | – | – |
| T-S4-FE-01 | TODO | – | – | – |
| T-S4-FE-02 | TODO | – | – | – |
| T-S4-INT-01 | TODO | – | – | – |
| T-S5-BE-01 | TODO | – | – | – |
| T-S5-BE-02 | TODO | – | – | – |
| T-S5-BE-03 | TODO | – | – | – |
| T-S5-FE-01 | TODO | – | – | – |
| T-S5-INT-01 | TODO | – | – | – |
| T-S6-BE-01 | TODO | – | – | – |
| T-S6-BE-02 | TODO | – | – | – |
| T-S6-BE-03 | TODO | – | – | – |
| T-S6-FE-01 | TODO | – | – | – |
| T-S6-FE-02 | TODO | – | – | – |
| T-S6-INT-01 | TODO | – | – | – |
| T-S7-BE-01 | TODO | – | – | – |
| T-S7-BE-02 | TODO | – | – | – |
| T-S7-BE-03 | TODO | – | – | – |
| T-S7-BE-04 | TODO | – | – | – |
| T-S7-BE-05 | TODO | – | – | – |
| T-S7-FE-01 | TODO | – | – | – |
| T-S7-FE-02 | TODO | – | – | – |
| T-S7-FE-03 | TODO | – | – | – |
| T-S7-INT-01 | TODO | – | – | – |
| T-S8-BE-01 | TODO | – | – | – |
| T-S8-BE-02 | TODO | – | – | – |
| T-S8-BE-03 | TODO | – | – | – |
| T-S8-FE-01 | TODO | – | – | – |
| T-S8-FE-02 | TODO | – | – | – |
| T-S8-INT-01 | TODO | – | – | – |
| T-S9-BE-01 | TODO | – | – | – |
| T-S9-BE-02 | TODO | – | – | – |
| T-S9-BE-03 | TODO | – | – | – |
| T-S9-BE-04 | TODO | – | – | – |
| T-S9-BE-05 | TODO | – | – | – |
| T-S9-FE-01 | TODO | – | – | – |
| T-S9-FE-02 | TODO | – | – | – |
| T-S9-INT-01 | TODO | – | – | – |
| T-S10-BE-01 | TODO | – | – | – |
| T-S10-BE-02 | TODO | – | – | – |
| T-S10-BE-03 | TODO | – | – | – |
| T-S10-BE-04 | TODO | – | – | – |
| T-S10-BE-05 | TODO | – | – | – |
| T-S10-FE-01 | TODO | – | – | – |
| T-S10-FE-02 | TODO | – | – | – |
| T-S10-INT-01 | TODO | – | – | – |
| T-S11-BE-01 | TODO | – | – | – |
| T-S11-BE-02 | TODO | – | – | – |
| T-S11-BE-03 | TODO | – | – | – |
| T-S11-BE-04 | TODO | – | – | – |
| T-S11-FE-01 | TODO | – | – | – |
| T-S11-INT-01 | TODO | – | – | – |
| T-S12-BE-01 | TODO | – | – | – |
| T-S12-BE-02 | TODO | – | – | – |
| T-S12-FE-01 | TODO | – | – | – |
| T-S12-INT-01 | TODO | – | – | – |
| T-S12-OPS-01 | TODO | – | – | – |
