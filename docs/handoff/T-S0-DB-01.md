# Handoff Note – T-S0-DB-01

- **Task:** `T-S0-DB-01` – Đưa `schema.sql` vào `db/`, áp dụng `DEC-01` & `DEC-12` (59 bảng), seed Admin đầu tiên + hướng dẫn
- **Vai trò:** DB
- **Nhánh:** `feat/T-S0-DB-01-baseline-schema-seed`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **`db/schema.sql` (baseline schema – 59 bảng):**
   - Sao chép nền từ `docs/schema.sql` (`utf8mb4` / `utf8mb4_0900_ai_ci`, `BINARY(16)` UUIDv7).
   - **Áp dụng DEC-01 trên `ast_grade_record`:** bỏ `UNIQUE KEY uk_ast_grade_raw (user_id, component_id, record_type, source_attempt_id, source_submission_id)`, thay bằng 2 index duy nhất độc lập `UNIQUE KEY uk_ast_grade_source_attempt (source_attempt_id)` và `UNIQUE KEY uk_ast_grade_source_submission (source_submission_id)` (giữ nguyên `uk_ast_grade_final`).
   - **Áp dụng DEC-12 (`sys_setting`):** thêm bảng `sys_setting(\`key\` VARCHAR(100) PK, value JSON NOT NULL, updated_by BINARY(16) NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3))`. Cập nhật chú thích tổng số bảng thành **59 bảng**.

2. **`db/seed/01_seed_admin.sql` & `db/seed/README.md`:**
   - Tạo script idempotent (`INSERT IGNORE` trong transaction) seed tài khoản Admin khởi tạo (`admin@brainmemo.local`, trạng thái `ACTIVE`, đã xác minh email, mật khẩu băm BCrypt work factor 11 tạo bằng `BCrypt.Net-Next`, không lưu plaintext trong SQL), cấp quyền gốc `idn_admin_grant` với `granted_by_user_id = NULL`, tạo hồ sơ `prf_user_profile` (`System Admin`) và khởi tạo 3 khóa mặc định của `sys_setting` theo DEC-12/DEC-21 (`ai.flag_threshold = 0.7`, `ai.daily_quota = 20`, `ai.llm_provider = "GEMINI"`).
   - Viết hướng dẫn chạy Docker Compose + nạp seed (`Linux/macOS/Bash` và `Windows PowerShell`), thông tin tài khoản dev mặc định kèm cảnh báo bảo mật đổi mật khẩu/thu hồi grant seed khi triển khai ngoài local dev, và câu lệnh kiểm tra nhanh.
   - Xóa `db/seed/.gitkeep`.

## Kết quả kiểm tra

- Khởi tạo sạch trên MySQL 8.0 (`mysql:8.0.46`) qua `docker compose -f infra/docker-compose.dev.yml down -v` rồi `up -d`:
  - `mysql` đạt trạng thái `healthy`; `/docker-entrypoint-initdb.d/schema.sql` chạy không lỗi.
  - **Đếm số bảng:** `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='brainmemo_lms'` = **59 bảng** (`ai`: 3, `ast`: 8, `cnt`: 15, `crs`: 8, `dsc`: 3, `idn`: 5, `lrn`: 8, `mod`: 4, `ntf`: 3, `prf`: 1, `sys`: 1).
  - **`SHOW INDEX FROM ast_grade_record`:** có `uk_ast_grade_source_attempt`, `uk_ast_grade_source_submission`, `uk_ast_grade_final`; không còn `uk_ast_grade_raw`.
  - **`DESCRIBE sys_setting`:** khớp DEC-12 (`key` PK `varchar(100)`, `value` `json`, `updated_by` `binary(16)` nullable, `updated_at` `datetime(3)`).
  - Chạy `db/seed/01_seed_admin.sql` **2 lần liên tiếp**: cả 2 lần đều thành công (idempotent); `idn_user = 1`, `idn_admin_grant = 1` (`granted_by_user_id = NULL`, `revoked_at = NULL`, `active_marker = 1`), `prf_user_profile = 1`, `sys_setting = 3`.
  - Hash BCrypt được tạo và kiểm chứng khớp bằng `BCrypt.Net-Next` (`Verify == True`).
- Dọn container/volume test sạch sẽ bằng `docker compose -f infra/docker-compose.dev.yml down -v`.

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không sửa `docs/schema.sql`, `frontend/`, `openapi/`, `contracts/`.
- **`T-S0-BE-01` / `T-S1-BE-01`:** Khi cấu hình EF Core / MySqlConnector dùng `BINARY(16)` với `UUID_TO_BIN('...')` mặc định (không swap byte RFC 9562), cần giữ đồng nhất `GuidFormat=Binary16` (big-endian RFC bytes) ở connection string.
- **`T-S1-BE-01`:** Migration ban đầu của từng module cần khớp schema baseline trong `db/schema.sql` (59 bảng) theo DEC-14.
