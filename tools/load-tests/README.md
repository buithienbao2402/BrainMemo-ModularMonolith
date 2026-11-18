# BrainMemo Load Testing Suite (NFR-01, NFR-02, NFR-17)

## 1. Overview
- **Objective:** Verify system resilience, throughput, and error boundaries under a continuous load of 50 concurrent virtual users (50 VU).
- **Standards:**
  - `NFR-01`: Thời gian phản hồi 95% request (p95) < 500ms.
  - `NFR-02`: Tỷ lệ lỗi máy chủ (5xx) dưới tải cao phải < 1%.
  - `NFR-17`: Kiểm thử tải 50 VU trong 15 phút.

## 2. Test Scripts
- `k6-load-test-50vu.js`: Full k6 soak test script configured with 3 stages (1m ramp-up to 50 VU, 13m soak at 50 VU, 1m ramp-down) checking Discovery, Top 10, Courses, and Chapter endpoints.
- `load-test-runner.js`: High-throughput concurrent Node.js runner that benchmarks 50 concurrent workers, measures request latency percentiles (p50, p90, p95, p99), and validates the `< 1% 5xx` rate.

## 3. Running Load Tests
### Running with k6
```bash
k6 run --env TARGET_URL=http://localhost:5000/api/v1 tools/load-tests/k6-load-test-50vu.js
```

### Running with Node.js runner
```bash
node tools/load-tests/load-test-runner.js
```
Environment variables:
- `TARGET_URL`: Host address (default: `http://localhost:5173`)
- `CONCURRENCY`: Concurrent virtual users (default: `50`)
- `DURATION`: Test duration in seconds (e.g. `900` for 15 minutes, or `10` for sanity)
