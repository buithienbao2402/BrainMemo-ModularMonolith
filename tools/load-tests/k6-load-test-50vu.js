import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * T-S12-INT-01: Load Test Script for 50 Concurrent Virtual Users (15 minutes)
 * Requirements: NFR-01, NFR-02, NFR-17
 * - Concurrency: 50 Virtual Users (VU)
 * - Target Duration: 15 minutes (Ramp-up 1m -> Soak 13m -> Ramp-down 1m)
 * - Target Error Rate: 5xx errors < 1% (NFR-01/02)
 * - Latency Target: p(95) < 500ms
 */
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp-up to 50 VUs
    { duration: '13m', target: 50 }, // Soak test at 50 VUs
    { duration: '1m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // 5xx and connection failure rate must be strictly under 1% (NFR-01 / NFR-02)
    http_req_failed: ['rate<0.01'],
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000/api/v1';

export default function () {
  group('1. Khám phá & Trang chủ (Discovery)', function () {
    const resHome = http.get(`${BASE_URL}/discovery/home`, {
      headers: { Accept: 'application/json' },
    });
    check(resHome, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);

    const resTop10 = http.get(`${BASE_URL}/discovery/top10?metric=LEARNERS&window=WEEK`, {
      headers: { Accept: 'application/json' },
    });
    check(resTop10, {
      'top10 status is 200': (r) => r.status === 200,
      'top10 response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  group('2. Tìm kiếm khóa học & Lọc danh mục', function () {
    const resSearch = http.get(`${BASE_URL}/discovery/courses?q=&page=1&pageSize=10`, {
      headers: { Accept: 'application/json' },
    });
    check(resSearch, {
      'courses search status is 200': (r) => r.status === 200,
      'courses search response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  group('3. Chi tiết khóa học & Học tập', function () {
    const resCourse = http.get(`${BASE_URL}/courses/sample-course-1`, {
      headers: { Accept: 'application/json' },
    });
    check(resCourse, {
      'course detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'course detail duration < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });
}
