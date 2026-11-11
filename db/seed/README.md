# Hướng dẫn nạp Schema & Seed Admin (`db/`)

## 1. Tổng quan

- [`db/schema.sql`](../schema.sql): Baseline schema MySQL 8 cho BrainMemo LMS (**59 bảng** = 58 bảng nghiệp vụ qua 10 module + `sys_setting` theo DEC-12), đã áp dụng DEC-01 (index duy nhất tách riêng trên `ast_grade_record.source_attempt_id` và `source_submission_id`).
- [`db/seed/01_seed_admin.sql`](./01_seed_admin.sql): Script **idempotent** tạo tài khoản Admin khởi tạo (`idn_user` + `idn_admin_grant` với `granted_by_user_id = NULL`), hồ sơ `prf_user_profile`, và 3 khóa cấu hình mặc định trong `sys_setting` (`ai.flag_threshold`, `ai.daily_quota`, `ai.llm_provider`).

## 2. Cách nạp schema & seed với Docker Compose (Local Dev)

File [`infra/docker-compose.dev.yml`](../../infra/docker-compose.dev.yml) mount `db/` vào `/docker-entrypoint-initdb.d`:
- Khi volume `mysql-data` được tạo mới lần đầu, MySQL 8 **tự động chạy** `db/schema.sql`.
- Thư mục con `db/seed/` được entrypoint của MySQL bỏ qua khi init tự động, nên cần chạy thủ công bước seed sau khi container MySQL ở trạng thái `healthy`.

### Bước 1: Chuẩn bị `.env` và khởi chạy hạ tầng

```bash
cp infra/env/.env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
docker compose -f infra/docker-compose.dev.yml ps
```

Đợi service `mysql` chuyển sang trạng thái `healthy`.

### Bước 2: Chạy script seed Admin

**Linux / macOS / Git Bash:**

```bash
docker exec -i brainmemo-mysql-dev mysql -ubrainmemo -pbrainmemo_dev_pw brainmemo_lms < db/seed/01_seed_admin.sql
```

**Windows PowerShell:**

```powershell
Get-Content -Raw db/seed/01_seed_admin.sql | docker exec -i brainmemo-mysql-dev mysql -ubrainmemo -pbrainmemo_dev_pw brainmemo_lms
```

> Nếu đã đổi `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` trong `.env`, thay tương ứng trong lệnh trên.

## 3. Tài khoản Admin mặc định (Chỉ dùng ở Local Dev)

| Trường | Giá trị mặc định (Dev) |
|---|---|
| Email | `admin@brainmemo.local` |
| Mật khẩu | `Admin@Dev2026!` |
| Display name | `System Admin` |
| Trạng thái | `ACTIVE`, email đã xác minh, `granted_by_user_id = NULL` |

> **Cảnh báo bảo mật:** Không sử dụng mật khẩu mặc định này cho staging/production. Sau khi đăng nhập lần đầu ở môi trường triển khai, đổi mật khẩu tài khoản Admin này hoặc tạo Admin mới và thu hồi `idn_admin_grant` của tài khoản seed.

## 4. Cấu hình `sys_setting` mặc định (DEC-12, DEC-21)

| Key | Giá trị JSON | Ý nghĩa |
|---|---|---|
| `ai.flag_threshold` | `0.7` | Ngưỡng điểm PhoBERT gắn cờ vi phạm (0..1) |
| `ai.daily_quota` | `20` | Hạn mức lượt gọi LLM mỗi ngày mỗi người dùng |
| `ai.llm_provider` | `"GEMINI"` | Provider LLM mặc định (`GEMINI` / `OPENAI` / `ANTHROPIC`) |

## 5. Kiểm tra nhanh sau khi nạp

```bash
docker exec -i brainmemo-mysql-dev mysql -ubrainmemo -pbrainmemo_dev_pw brainmemo_lms -e "
  SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'brainmemo_lms';
  SELECT BIN_TO_UUID(u.id) AS user_id, u.email, u.account_status, g.granted_by_user_id, g.revoked_at
  FROM idn_user u
  JOIN idn_admin_grant g ON g.user_id = u.id
  WHERE u.email = 'admin@brainmemo.local';
  SELECT * FROM sys_setting ORDER BY 1;
"
```

Kết quả mong đợi: `table_count = 59`, 1 bản ghi Admin active với `granted_by_user_id = NULL`, và 3 bản ghi trong `sys_setting`.
