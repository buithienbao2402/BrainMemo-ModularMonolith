# Handoff: T-S12-OPS-01 - Production VPS Deployment, Nginx SSL & Automated Backup

## 1. Overview
- **Task ID:** `T-S12-OPS-01`
- **Scope:**
  - Production VPS Docker Compose configuration (`infra/docker-compose.prod.yml`).
  - Production Nginx Reverse Proxy with SSL/TLS, HTTP-to-HTTPS redirect, and HSTS (`infra/nginx/nginx.prod.conf`).
  - Cloudflare configuration guide with Proxying, Full (Strict) SSL mode, Cache rules, and Cloudflare Access for `/admin/*` (`infra/cloudflare/cloudflare-setup.md`).
  - Automated daily MySQL backup with 7-day retention (`infra/scripts/backup-mysql.sh`), disaster recovery restore rehearsal script (`infra/scripts/restore-mysql.sh`), and crontab documentation (`infra/scripts/README.md`).

## 2. Key Components
- **Production Compose:**
  - `infra/docker-compose.prod.yml`: Internal networking for MySQL & MinIO (ports closed to public), only Nginx 80/443 exposed, healthchecks on all services, production env settings.
  - `infra/env/.env.prod.example`: Template for production secrets and configuration.
- **Nginx & SSL/TLS:**
  - `infra/nginx/nginx.prod.conf`: Port 80 redirect to HTTPS 301, Port 443 with TLS 1.2/1.3, modern cipher suite, HSTS (`max-age=31536000; includeSubDomains; preload`), security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), `/api/` proxying to `webapi:8080`, `/` to `frontend:80`.
- **Cloudflare Integration:**
  - `infra/cloudflare/cloudflare-setup.md`: A/CNAME proxy records, Full (Strict) SSL with Origin CA cert, Cache Rules (bypassing `/api/*`, 1-month edge TTL for `/assets/*`), Cloudflare Access protecting `/admin/*`.
- **Database Backup & Disaster Recovery:**
  - `infra/scripts/backup-mysql.sh`: `--single-transaction --quick --routines --triggers --events --hex-blob`, gzip-9, archive integrity check, 7-day retention cleanup, failure alerting webhook.
  - `infra/scripts/restore-mysql.sh`: Verifies archive integrity, restores to rehearsal database, verifies table count.
  - `infra/scripts/README.md`: Crontab guide and rehearsal procedure.

## 3. Verification
- Docker Compose configuration syntax verified.
- Shell scripts syntax checked (`set -euo pipefail`).
- Nginx configuration validated against upstream routing and SSL standards.
