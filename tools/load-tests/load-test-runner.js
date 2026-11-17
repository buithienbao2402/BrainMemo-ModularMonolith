/**
 * Node.js Load Test Runner for BrainMemo (NFR-01, NFR-02, NFR-17)
 * Runs 50 concurrent virtual users against target endpoints and reports:
 * - Total requests
 * - Requests per second (RPS)
 * - Latency p50, p90, p95, p99
 * - Error rate (4xx, 5xx, failed)
 * - NFR verification check: 5xx rate < 1%
 */

import http from 'node:http';
import https from 'node:https';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || '5', 10);

const ENDPOINTS = [
  '/',
  '/top10',
  '/courses',
  '/login',
];

let totalRequests = 0;
let successRequests = 0;
let error4xx = 0;
let error5xx = 0;
let failedRequests = 0;
const latencies = [];

function makeRequest(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'BrainMemo-LoadTest/1.0',
          Accept: 'text/html,application/json,*/*',
        },
        timeout: 5000,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          const duration = Date.now() - startTime;
          totalRequests++;
          latencies.push(duration);

          if (res.statusCode >= 200 && res.statusCode < 400) {
            successRequests++;
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            error4xx++;
          } else if (res.statusCode >= 500) {
            error5xx++;
          }
          resolve();
        });
      }
    );

    req.on('error', () => {
      totalRequests++;
      failedRequests++;
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      totalRequests++;
      failedRequests++;
      resolve();
    });
  });
}

async function runWorker(workerId, stopTime) {
  let endpointIndex = workerId % ENDPOINTS.length;

  while (Date.now() < stopTime) {
    const endpoint = ENDPOINTS[endpointIndex % ENDPOINTS.length];
    endpointIndex++;
    await makeRequest(`${TARGET_URL}${endpoint}`);
    // Brief sleep simulating realistic user think-time
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function main() {
  console.log('===============================================================');
  console.log(`BrainMemo NFR-17 Load Test Verification`);
  console.log(`Target URL:        ${TARGET_URL}`);
  console.log(`Concurrency (VU):  ${CONCURRENCY}`);
  console.log(`Duration:          ${DURATION_SECONDS}s`);
  console.log('===============================================================');

  const startTime = Date.now();
  const stopTime = startTime + DURATION_SECONDS * 1000;

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(runWorker(i, stopTime));
  }

  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  const rps = (totalRequests / (totalTimeSec || 1)).toFixed(1);
  const error5xxRate = totalRequests > 0 ? ((error5xx / totalRequests) * 100).toFixed(2) : '0.00';
  const passNfr = parseFloat(error5xxRate) < 1.0;

  console.log(`\n--- RESULTS ---`);
  console.log(`Total Requests:    ${totalRequests}`);
  console.log(`Successful:        ${successRequests}`);
  console.log(`Client Error 4xx:  ${error4xx}`);
  console.log(`Server Error 5xx:  ${error5xx} (${error5xxRate}%)`);
  console.log(`Failed/Timeout:    ${failedRequests}`);
  console.log(`Throughput:        ${rps} req/sec`);
  console.log(`Latency p50:       ${p50}ms`);
  console.log(`Latency p90:       ${p90}ms`);
  console.log(`Latency p95:       ${p95}ms`);
  console.log(`Latency p99:       ${p99}ms`);
  console.log('===============================================================');
  console.log(`NFR-01/02 Standard (5xx < 1%): ${passNfr ? 'PASSED [OK]' : 'FAILED [ERR]'}`);
  console.log('===============================================================');

  if (!passNfr) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
