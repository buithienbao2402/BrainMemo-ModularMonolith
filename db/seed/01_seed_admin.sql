-- =====================================================================
-- BRAINMEMO LMS - INITIAL SEED SCRIPT (T-S0-DB-01)
-- Muc dich:
--   1. Tao tai khoan Admin dau tien (idn_user + idn_admin_grant, granted_by_user_id = NULL)
--   2. Tao ho so tuong ung trong prf_user_profile
--   3. Khoi tao cac khoa mac dinh trong sys_setting (DEC-12, DEC-21)
--
-- Tinh chat: Idempotent (chay lai nhieu lan khong gay loi / khong trung ban ghi).
-- Canh bao bao mat: Chi dung cho moi truong local dev. Doi mat khau hoac thu hoi
-- quyen Admin nay ngay khi trien khai moi truong chia se / staging / production.
-- Xem chi tiet tai db/seed/README.md.
-- =====================================================================

USE brainmemo_lms;

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET @seed_admin_email = 'admin@brainmemo.local';
SET @seed_admin_user_id = UUID_TO_BIN('01a1cb77-0375-7fb7-8b76-ecaf4cc36db6');
SET @seed_admin_grant_id = UUID_TO_BIN('01a1cb77-0375-7dc6-ad57-8498c126f848');
-- BCrypt (work factor 11) cho tai khoan Admin dev mac dinh (khong luu plaintext trong SQL).
SET @seed_password_hash = '$2a$11$4f2yYs1CM3IolauQs0rFvOIj3uljtDHa4TlvJBlGBEHHnD1ZRnTOu';

START TRANSACTION;

-- 1. Tao tai khoan Admin dau tien da xac minh email va trang thai ACTIVE
INSERT IGNORE INTO idn_user (
  id,
  email,
  password_hash,
  email_verified_at,
  account_status
)
VALUES (
  @seed_admin_user_id,
  @seed_admin_email,
  @seed_password_hash,
  UTC_TIMESTAMP(3),
  'ACTIVE'
);

-- Lay lai id thuc te theo email (tranh lech FK neu tai khoan da ton tai tu truoc)
SELECT id INTO @target_admin_user_id
FROM idn_user
WHERE email = @seed_admin_email
LIMIT 1;

-- 2. Cap quyen Admin goc voi granted_by_user_id = NULL (quy uoc seed)
INSERT IGNORE INTO idn_admin_grant (
  id,
  user_id,
  granted_at,
  granted_by_user_id,
  revoked_at,
  revoked_by_user_id
)
VALUES (
  @seed_admin_grant_id,
  @target_admin_user_id,
  UTC_TIMESTAMP(3),
  NULL,
  NULL,
  NULL
);

-- 3. Tao ho so co ban trong prf_user_profile cho Admin
INSERT IGNORE INTO prf_user_profile (
  user_id,
  display_name,
  show_course_list,
  ui_theme
)
VALUES (
  @target_admin_user_id,
  'System Admin',
  FALSE,
  'LIGHT'
);

-- 4. Khoi tao cau hinh mac dinh trong sys_setting (DEC-12, DEC-21)
INSERT IGNORE INTO sys_setting (`key`, value, updated_by)
VALUES
  ('ai.flag_threshold', CAST('0.7' AS JSON), NULL),
  ('ai.daily_quota', CAST('20' AS JSON), NULL),
  ('ai.llm_provider', JSON_QUOTE('GEMINI'), NULL);

COMMIT;
