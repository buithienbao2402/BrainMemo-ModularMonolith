# Handoff: T-S12-INT-01 - System Verification & Load Testing

## 1. Overview
- **Task ID:** `T-S12-INT-01`
- **Scope:**
  - Complete End-to-End System Verification covering 3 critical user journeys under NFR-17.
  - Load testing scripts and runner for 50 concurrent virtual users (50 VU) verifying NFR-01, NFR-02, and NFR-17 (5xx rate < 1%, latency p95 < 500ms).

## 2. Key Artifacts
- **Playwright E2E Suite:**
  - `frontend/e2e/system-verification-flows.spec.ts`
    - Luồng 1 (Learner Journey): Khám phá Top 10 (`/top10`, SCR-DSC-03) -> Ghi danh khóa học -> Học bài tại Learning Player (SCR-LRN-01) -> Lật thẻ Flashcard 3D -> Gửi câu hỏi Q&A trao đổi -> Làm bài kiểm tra Quiz Player (SCR-LRN-03) & nhận kết quả (SCR-LRN-04).
    - Luồng 2 (Instructor Journey): Quản trị chương bài học (SCR-CNT-01) -> Soạn bài tại Chapter Editor (SCR-CNT-02) -> Quản trị ngân hàng câu hỏi (SCR-CNT-04) -> Kiểm tra cờ xuất bản (SCR-CRS-04).
    - Luồng 3 (Admin & Moderation Journey): Cổng duyệt khóa học (`/admin/course-reviews`, SCR-MOD-07) -> Nhật ký kiểm toán (`/admin/audit-logs`, SCR-MOD-06) -> Quản lý cấu hình hạn mức AI hệ thống (`/admin/settings`, SCR-ADM-03).
- **Load Testing Suite:**
  - `tools/load-tests/k6-load-test-50vu.js`: Full k6 soak test script configured for 50 concurrent virtual users over 15 minutes checking Discovery, Courses, and Auth endpoints with strict thresholds (`http_req_failed: rate<0.01`, `http_req_duration: p(95)<500ms`).
  - `tools/load-tests/load-test-runner.js`: High-concurrency Node.js load test simulator measuring latency percentiles (p50, p90, p95, p99), throughput, and 5xx error rate.
  - `tools/load-tests/README.md`: Load test execution instructions and metrics guide.

## 3. Verification
- `pnpm --dir frontend test:e2e -- system-verification-flows.spec.ts`: 3/3 passed (15.6s).
- `dotnet build backend/BrainMemo.sln`: Succeeded cleanly with 0 warnings, 0 errors.
- Load test script syntax and threshold configuration validated.
