-- =====================================================================
-- BRAINMEMO LMS - SCHEMA MYSQL 8.0
-- Kien truc: Modular Monolith, mot database, 10 module, 56 bang
-- Quy uoc:
--   * PK UUIDv7 BINARY(16) do ung dung sinh
--   * Khong co FK vat ly xuyen module; chi FK giua cac bang cung module
--   * Charset utf8mb4, collation mac dinh utf8mb4_0900_ai_ci
--   * Cot tag dung utf8mb4_0900_as_ci
--   * Cot *_marker: VIRTUAL (rieng ast_grade_record.final_marker: STORED)
--   * Ten CHECK/FK la duy nhat tren toan schema (MySQL yeu cau)
-- Thu tu module: Identity -> Profile -> Moderation -> Notification ->
--   Course -> Content -> Learning -> Assessment -> Discovery -> AI
-- =====================================================================

CREATE DATABASE IF NOT EXISTS brainmemo_lms
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE brainmemo_lms;

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 1: IDENTITY (idn_) - 5 bang
-- =======================================

CREATE TABLE idn_user (
  id                BINARY(16)    NOT NULL,
  email             VARCHAR(255)  COLLATE utf8mb4_0900_ai_ci NOT NULL,
  password_hash     VARCHAR(100)  NULL DEFAULT NULL,
  email_verified_at DATETIME(3)   NULL DEFAULT NULL,
  account_status    ENUM('ACTIVE','LOCKED_TEMPORARY','LOCKED_PERMANENT') NOT NULL DEFAULT 'ACTIVE',
  locked_at         DATETIME(3)   NULL DEFAULT NULL,
  locked_until      DATETIME(3)   NULL DEFAULT NULL,
  lock_reason       VARCHAR(1000) NULL DEFAULT NULL,
  lock_sanction_id  BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref mod_sanction.id',
  created_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_idn_user_email (email),
  KEY ix_idn_user_status_until (account_status, locked_until),
  CONSTRAINT ck_idn_user_lock CHECK (
    (account_status = 'ACTIVE'
       AND locked_at IS NULL AND locked_until IS NULL
       AND lock_reason IS NULL AND lock_sanction_id IS NULL)
    OR (account_status = 'LOCKED_TEMPORARY'
       AND locked_at IS NOT NULL AND locked_until IS NOT NULL AND lock_reason IS NOT NULL)
    OR (account_status = 'LOCKED_PERMANENT'
       AND locked_until IS NULL AND locked_at IS NOT NULL AND lock_reason IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idn_external_identity (
  id               BINARY(16)   NOT NULL,
  user_id          BINARY(16)   NOT NULL,
  provider         ENUM('GOOGLE') NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_idn_ext_provider_subject (provider, provider_subject),
  UNIQUE KEY uk_idn_ext_user_provider (user_id, provider),
  CONSTRAINT fk_idn_ext_user FOREIGN KEY (user_id) REFERENCES idn_user (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idn_refresh_session (
  id            BINARY(16)   NOT NULL,
  user_id       BINARY(16)   NOT NULL,
  token_hash    BINARY(32)   NOT NULL,
  user_agent    VARCHAR(512) NULL DEFAULT NULL,
  ip_address    VARCHAR(45)  NULL DEFAULT NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_used_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at    DATETIME(3)  NOT NULL,
  revoked_at    DATETIME(3)  NULL DEFAULT NULL,
  revoke_reason ENUM('LOGOUT','USER_REVOKED','LOGOUT_ALL','ACCOUNT_LOCKED') NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_idn_session_token_hash (token_hash),
  KEY ix_idn_session_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_idn_session_user FOREIGN KEY (user_id) REFERENCES idn_user (id) ON DELETE RESTRICT,
  CONSTRAINT ck_idn_session_revoke CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idn_user_token (
  id          BINARY(16)  NOT NULL,
  user_id     BINARY(16)  NOT NULL,
  purpose     ENUM('VERIFY_EMAIL','RESET_PASSWORD') NOT NULL,
  token_hash  BINARY(32)  NOT NULL,
  expires_at  DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL DEFAULT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_idn_token_hash (token_hash),
  KEY ix_idn_token_user_purpose (user_id, purpose, consumed_at, expires_at),
  CONSTRAINT fk_idn_token_user FOREIGN KEY (user_id) REFERENCES idn_user (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idn_admin_grant (
  id                 BINARY(16)  NOT NULL,
  user_id            BINARY(16)  NOT NULL,
  granted_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  granted_by_user_id BINARY(16)  NULL DEFAULT NULL COMMENT 'NULL = seed',
  revoked_at         DATETIME(3) NULL DEFAULT NULL,
  revoked_by_user_id BINARY(16)  NULL DEFAULT NULL,
  active_marker      TINYINT GENERATED ALWAYS AS (CASE WHEN revoked_at IS NULL THEN 1 ELSE NULL END) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_idn_admin_grant_active (user_id, active_marker),
  KEY ix_idn_admin_grant_active (active_marker, user_id),
  CONSTRAINT fk_idn_admin_grant_user       FOREIGN KEY (user_id)            REFERENCES idn_user (id) ON DELETE RESTRICT,
  CONSTRAINT fk_idn_admin_grant_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES idn_user (id) ON DELETE RESTRICT,
  CONSTRAINT fk_idn_admin_grant_revoked_by FOREIGN KEY (revoked_by_user_id) REFERENCES idn_user (id) ON DELETE RESTRICT,
  CONSTRAINT ck_idn_admin_grant_revoke CHECK (revoked_at IS NOT NULL OR revoked_by_user_id IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 2: PROFILE (prf_) - 1 bang
-- =======================================

CREATE TABLE prf_user_profile (
  user_id            BINARY(16)    NOT NULL COMMENT 'logical ref idn_user.id, NO FK',
  display_name       VARCHAR(100)  NOT NULL,
  avatar_storage_key VARCHAR(500)  NULL DEFAULT NULL,
  bio                VARCHAR(2000) NULL DEFAULT NULL,
  show_course_list   BOOLEAN       NOT NULL DEFAULT TRUE,
  ui_theme           ENUM('LIGHT','DARK') NOT NULL DEFAULT 'LIGHT',
  created_at         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT ck_prf_profile_display_name CHECK (CHAR_LENGTH(TRIM(display_name)) >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 3: MODERATION (mod_) - 4 bang
-- =======================================

CREATE TABLE mod_report (
  id                   BINARY(16)    NOT NULL,
  source               ENUM('USER','AI') NOT NULL,
  reporter_user_id     BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  target_type          ENUM('COURSE','COMMENT') NOT NULL,
  target_id            BINARY(16)    NOT NULL COMMENT 'logical ref crs_course.id or lrn_comment.id',
  target_course_id     BINARY(16)    NOT NULL COMMENT 'logical ref crs_course.id',
  target_owner_user_id BINARY(16)    NOT NULL COMMENT 'logical ref idn_user.id, snapshot',
  ai_finding_id        BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref ai_moderation_scan_log.id',
  reason_code          VARCHAR(30)   NOT NULL,
  description          TEXT          NULL,
  target_snapshot      TEXT          NULL,
  status               ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  resolution_reason    VARCHAR(1000) NULL DEFAULT NULL,
  resolved_by_user_id  BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref idn_user.id (Admin)',
  resolved_at          DATETIME(3)   NULL DEFAULT NULL,
  pending_marker       TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN 1 ELSE NULL END) VIRTUAL,
  created_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_mod_report_ai_finding (ai_finding_id),
  UNIQUE KEY uk_mod_report_pending (reporter_user_id, target_type, target_id, pending_marker),
  KEY ix_mod_report_queue (status, source, target_type, created_at),
  KEY ix_mod_report_target (target_type, target_id),
  CONSTRAINT ck_mod_report_user_source CHECK ((source = 'USER') = (reporter_user_id IS NOT NULL)),
  CONSTRAINT ck_mod_report_ai_source   CHECK ((source = 'AI') = (ai_finding_id IS NOT NULL)),
  CONSTRAINT ck_mod_report_resolved    CHECK ((status = 'PENDING') =
      (resolved_at IS NULL AND resolved_by_user_id IS NULL AND resolution_reason IS NULL)),
  CONSTRAINT ck_mod_report_course_target CHECK (target_type <> 'COURSE' OR target_id = target_course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mod_report_evidence (
  id          BINARY(16)    NOT NULL,
  report_id   BINARY(16)    NOT NULL,
  kind        ENUM('IMAGE','LINK') NOT NULL,
  storage_key VARCHAR(500)  NULL DEFAULT NULL,
  url         VARCHAR(2048) NULL DEFAULT NULL,
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_mod_evidence_report (report_id),
  CONSTRAINT fk_mod_evidence_report FOREIGN KEY (report_id) REFERENCES mod_report (id) ON DELETE RESTRICT,
  CONSTRAINT ck_mod_evidence_kind CHECK (
    (kind = 'IMAGE' AND storage_key IS NOT NULL AND url IS NULL)
    OR (kind = 'LINK' AND url IS NOT NULL AND storage_key IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mod_sanction (
  id                 BINARY(16)    NOT NULL,
  report_id          BINARY(16)    NULL DEFAULT NULL COMMENT 'NULL = xu ly truc tiep',
  sanction_type      ENUM('COMMENT_DELETE','COURSE_HIDE','ACCOUNT_LOCK_TEMPORARY','ACCOUNT_LOCK_PERMANENT','COURSE_PERMANENT_DELETE') NOT NULL,
  target_type        ENUM('COMMENT','COURSE','USER') NOT NULL,
  target_id          BINARY(16)    NOT NULL,
  subject_user_id    BINARY(16)    NOT NULL COMMENT 'logical ref idn_user.id',
  reason             VARCHAR(1000) NOT NULL,
  applied_by_user_id BINARY(16)    NOT NULL COMMENT 'logical ref idn_user.id (Admin)',
  applied_at         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at         DATETIME(3)   NULL DEFAULT NULL,
  lifted_at          DATETIME(3)   NULL DEFAULT NULL,
  lifted_by_user_id  BINARY(16)    NULL DEFAULT NULL,
  lift_reason        VARCHAR(1000) NULL DEFAULT NULL,
  lift_kind          ENUM('MANUAL','EXPIRED') NULL DEFAULT NULL,
  active_marker      TINYINT GENERATED ALWAYS AS (CASE WHEN lifted_at IS NULL THEN 1 ELSE NULL END) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_mod_sanction_active (sanction_type, target_id, active_marker),
  KEY ix_mod_sanction_report (report_id),
  KEY ix_mod_sanction_target (target_type, target_id),
  KEY ix_mod_sanction_active_type (active_marker, sanction_type),
  KEY ix_mod_sanction_expires (expires_at, active_marker),
  CONSTRAINT fk_mod_sanction_report FOREIGN KEY (report_id) REFERENCES mod_report (id) ON DELETE RESTRICT,
  CONSTRAINT ck_mod_sanction_temp_expiry CHECK (sanction_type <> 'ACCOUNT_LOCK_TEMPORARY' OR expires_at IS NOT NULL),
  CONSTRAINT ck_mod_sanction_no_expiry CHECK (
    sanction_type NOT IN ('ACCOUNT_LOCK_PERMANENT','COMMENT_DELETE','COURSE_PERMANENT_DELETE') OR expires_at IS NULL),
  CONSTRAINT ck_mod_sanction_perm_delete CHECK (sanction_type <> 'COURSE_PERMANENT_DELETE' OR lifted_at IS NULL),
  CONSTRAINT ck_mod_sanction_lift CHECK ((lifted_at IS NULL) = (lift_kind IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mod_audit_log (
  id            BINARY(16)    NOT NULL,
  occurred_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actor_type    ENUM('ADMIN','SYSTEM') NOT NULL,
  actor_user_id BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  action        ENUM('REPORT_ACCEPTED','REPORT_REJECTED','COMMENT_DELETED','COMMENT_RESTORED',
                     'COURSE_HIDDEN','COURSE_RESTORED','COURSE_PERMANENTLY_DELETED',
                     'ACCOUNT_LOCKED_TEMPORARY','ACCOUNT_LOCKED_PERMANENT','ACCOUNT_UNLOCKED') NOT NULL,
  object_type   ENUM('REPORT','COURSE','COMMENT','USER') NOT NULL,
  object_id     BINARY(16)    NOT NULL,
  object_label  VARCHAR(255)  NULL DEFAULT NULL,
  reason        VARCHAR(1000) NOT NULL,
  details       JSON          NULL,
  report_id     BINARY(16)    NULL DEFAULT NULL,
  sanction_id   BINARY(16)    NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_mod_audit_occurred (occurred_at),
  KEY ix_mod_audit_actor (actor_user_id, occurred_at),
  KEY ix_mod_audit_object (object_type, object_id, occurred_at),
  KEY ix_mod_audit_action (action, occurred_at),
  KEY ix_mod_audit_report (report_id),
  KEY ix_mod_audit_sanction (sanction_id),
  CONSTRAINT fk_mod_audit_report   FOREIGN KEY (report_id)   REFERENCES mod_report (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_mod_audit_sanction FOREIGN KEY (sanction_id) REFERENCES mod_sanction (id) ON DELETE RESTRICT,
  CONSTRAINT ck_mod_audit_actor CHECK ((actor_type = 'SYSTEM') = (actor_user_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Bat bien: tai khoan DB cua ung dung chi cap INSERT/SELECT tren mod_audit_log:
--   GRANT INSERT, SELECT ON brainmemo_lms.mod_audit_log TO 'app'@'%';

-- =======================================
-- MODULE 4: NOTIFICATION (ntf_) - 3 bang
-- =======================================

CREATE TABLE ntf_announcement (
  id                 BINARY(16)   NOT NULL,
  title              VARCHAR(200) NOT NULL,
  body               TEXT         NOT NULL,
  created_by_user_id BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id (Admin)',
  dispatch_status    ENUM('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
  recipient_count    INT          NULL DEFAULT NULL,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  dispatched_at      DATETIME(3)  NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_ntf_announcement_dispatch (dispatch_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ntf_notification (
  id                BINARY(16)  NOT NULL,
  recipient_user_id BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  type              ENUM('ENROLLMENT_INVITE_JOIN','ENROLLMENT','COMMENT','GRADE_FEEDBACK',
                         'NEW_CHAPTER','REPORT_RESULT','SANCTION','SYSTEM_ANNOUNCEMENT') NOT NULL,
  payload           JSON        NOT NULL,
  source_event_id   BINARY(16)  NOT NULL,
  announcement_id   BINARY(16)  NULL DEFAULT NULL,
  read_at           DATETIME(3) NULL DEFAULT NULL,
  deleted_at        DATETIME(3) NULL DEFAULT NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ntf_notification_event_recipient (source_event_id, recipient_user_id),
  KEY ix_ntf_notification_inbox (recipient_user_id, deleted_at, created_at),
  KEY ix_ntf_notification_unread (recipient_user_id, read_at, deleted_at),
  KEY ix_ntf_notification_announcement (announcement_id),
  CONSTRAINT fk_ntf_notification_announcement FOREIGN KEY (announcement_id)
    REFERENCES ntf_announcement (id) ON DELETE RESTRICT,
  CONSTRAINT ck_ntf_notification_announcement CHECK
    ((type = 'SYSTEM_ANNOUNCEMENT') = (announcement_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ntf_email_delivery (
  id                BINARY(16)   NOT NULL,
  source_event_id   BINARY(16)   NOT NULL,
  template          ENUM('VERIFY_EMAIL','RESET_PASSWORD','ACCOUNT_LOCKED') NOT NULL,
  recipient_user_id BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  status            ENUM('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  attempt_count     TINYINT      NOT NULL DEFAULT 0,
  next_attempt_at   DATETIME(3)  NULL DEFAULT NULL,
  last_attempt_at   DATETIME(3)  NULL DEFAULT NULL,
  last_error        VARCHAR(500) NULL DEFAULT NULL,
  sent_at           DATETIME(3)  NULL DEFAULT NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ntf_email_event_template (source_event_id, template),
  KEY ix_ntf_email_retry (status, next_attempt_at),
  CONSTRAINT ck_ntf_email_token_templates CHECK (template NOT IN ('VERIFY_EMAIL','RESET_PASSWORD') OR next_attempt_at IS NULL),
  CONSTRAINT ck_ntf_email_sent CHECK ((status = 'SENT') = (sent_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 5: COURSE (crs_) - 8 bang
-- =======================================

CREATE TABLE crs_course (
  id                BINARY(16)   NOT NULL,
  owner_user_id     BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  name              VARCHAR(200) NOT NULL,
  description       TEXT         NULL,
  cover_storage_key VARCHAR(500) NULL DEFAULT NULL,
  access_mode       ENUM('PUBLIC','PRIVATE','ONLY_ME') NOT NULL,
  status            ENUM('UPDATING','COMPLETED','PAUSED') NOT NULL DEFAULT 'UPDATING',
  hidden_at         DATETIME(3)  NULL DEFAULT NULL,
  hidden_sanction_id BINARY(16)  NULL DEFAULT NULL COMMENT 'logical ref mod_sanction.id',
  deleted_at        DATETIME(3)  NULL DEFAULT NULL,
  revision          INT UNSIGNED NOT NULL DEFAULT 1,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'ung dung dat, khong tu cap nhat',
  PRIMARY KEY (id),
  KEY ix_crs_course_owner (owner_user_id, deleted_at, created_at),
  CONSTRAINT ck_crs_course_hidden CHECK ((hidden_at IS NULL) = (hidden_sanction_id IS NULL)),
  CONSTRAINT ck_crs_course_only_me_not_hidden CHECK (access_mode <> 'ONLY_ME' OR hidden_at IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_course_tag (
  course_id BINARY(16) NOT NULL,
  tag       VARCHAR(50) COLLATE utf8mb4_0900_as_ci NOT NULL,
  PRIMARY KEY (course_id, tag),
  KEY ix_crs_course_tag_tag (tag, course_id),
  CONSTRAINT fk_crs_course_tag_course FOREIGN KEY (course_id) REFERENCES crs_course (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_enrollment (
  id                BINARY(16)  NOT NULL,
  course_id         BINARY(16)  NOT NULL,
  user_id           BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  status            ENUM('PENDING_APPROVAL','INVITED','ACTIVE','LEFT','REMOVED') NOT NULL,
  first_enrolled_at DATETIME(3) NULL DEFAULT NULL,
  status_changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_crs_enrollment_course_user (course_id, user_id),
  KEY ix_crs_enrollment_course_status (course_id, status, status_changed_at),
  KEY ix_crs_enrollment_user_status (user_id, status, status_changed_at),
  CONSTRAINT fk_crs_enrollment_course FOREIGN KEY (course_id) REFERENCES crs_course (id) ON DELETE CASCADE,
  CONSTRAINT ck_crs_enrollment_first CHECK (status NOT IN ('ACTIVE','LEFT','REMOVED') OR first_enrolled_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_enrollment_request (
  id                 BINARY(16)  NOT NULL,
  course_id          BINARY(16)  NOT NULL,
  user_id            BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  decision           ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  requested_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  decided_at         DATETIME(3) NULL DEFAULT NULL,
  decided_by_user_id BINARY(16)  NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  pending_marker     TINYINT GENERATED ALWAYS AS (CASE WHEN decision = 'PENDING' THEN 1 ELSE NULL END) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_crs_enrollment_request_pending (course_id, user_id, pending_marker),
  KEY ix_crs_enrollment_request_decision (course_id, decision, requested_at),
  CONSTRAINT fk_crs_enrollment_request_course FOREIGN KEY (course_id) REFERENCES crs_course (id) ON DELETE CASCADE,
  CONSTRAINT ck_crs_enrollment_request_decided CHECK
    ((decision = 'PENDING') = (decided_at IS NULL AND decided_by_user_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_chapter_access (
  chapter_id       BINARY(16)   NOT NULL COMMENT 'logical ref cnt_chapter.id, NO FK',
  course_id        BINARY(16)   NOT NULL,
  access_mode      ENUM('PUBLIC','PROTECTED') NOT NULL,
  passcode_hash    VARCHAR(100) NULL DEFAULT NULL,
  passcode_version INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (chapter_id),
  KEY ix_crs_chapter_access_course (course_id),
  CONSTRAINT fk_crs_chapter_access_course FOREIGN KEY (course_id) REFERENCES crs_course (id) ON DELETE CASCADE,
  CONSTRAINT ck_crs_chapter_access_passcode CHECK ((access_mode = 'PROTECTED') = (passcode_hash IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_chapter_unlock (
  chapter_id       BINARY(16)   NOT NULL,
  user_id          BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  passcode_version INT UNSIGNED NOT NULL,
  unlocked_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (chapter_id, user_id),
  KEY ix_crs_chapter_unlock_user (user_id),
  CONSTRAINT fk_crs_chapter_unlock_access FOREIGN KEY (chapter_id) REFERENCES crs_chapter_access (chapter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_nomination (
  id           BINARY(16)  NOT NULL,
  course_id    BINARY(16)  NOT NULL,
  user_id      BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  nominated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  withdrawn_at DATETIME(3) NULL DEFAULT NULL,
  active_marker TINYINT GENERATED ALWAYS AS (CASE WHEN withdrawn_at IS NULL THEN 1 ELSE NULL END) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_crs_nomination_active (course_id, user_id, active_marker),
  KEY ix_crs_nomination_course_active (course_id, active_marker),
  KEY ix_crs_nomination_course_time (course_id, nominated_at),
  CONSTRAINT fk_crs_nomination_course FOREIGN KEY (course_id) REFERENCES crs_course (id) ON DELETE CASCADE,
  CONSTRAINT ck_crs_nomination_withdrawn CHECK (withdrawn_at IS NULL OR withdrawn_at >= nominated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE crs_outbox_event (
  id            BINARY(16)        NOT NULL COMMENT 'eventId',
  event_type    VARCHAR(60)       NOT NULL,
  aggregate_id  BINARY(16)        NOT NULL COMMENT 'courseId, khong FK',
  payload       JSON              NOT NULL,
  created_at    DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at  DATETIME(3)       NULL DEFAULT NULL,
  attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_error    VARCHAR(500)      NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_crs_outbox_publish (published_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 6: CONTENT (cnt_) - 15 bang
-- =======================================

CREATE TABLE cnt_chapter (
  id                   BINARY(16)    NOT NULL,
  course_id            BINARY(16)    NOT NULL COMMENT 'logical ref crs_course.id',
  position             INT           NOT NULL,
  title                VARCHAR(200)  NOT NULL,
  description          VARCHAR(1000) NULL DEFAULT NULL,
  status               ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  last_version_no      INT UNSIGNED  NOT NULL DEFAULT 1,
  published_version_no INT UNSIGNED  NULL DEFAULT NULL,
  first_published_at   DATETIME(3)   NULL DEFAULT NULL,
  last_published_at    DATETIME(3)   NULL DEFAULT NULL,
  deleted_at           DATETIME(3)   NULL DEFAULT NULL,
  created_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_cnt_chapter_course_pos (course_id, deleted_at, position),
  KEY ix_cnt_chapter_course_status (course_id, status, deleted_at),
  CONSTRAINT ck_cnt_chapter_published CHECK ((status = 'PUBLISHED') = (published_version_no IS NOT NULL)),
  CONSTRAINT ck_cnt_chapter_first_pub CHECK (published_version_no IS NULL OR first_published_at IS NOT NULL),
  CONSTRAINT ck_cnt_chapter_version_order CHECK (published_version_no IS NULL OR published_version_no <= last_version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_chapter_version (
  id                       BINARY(16)   NOT NULL,
  chapter_id               BINARY(16)   NOT NULL,
  version_no               INT UNSIGNED NOT NULL,
  snapshot                 JSON         NOT NULL,
  restored_from_version_no INT UNSIGNED NULL DEFAULT NULL,
  created_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at             DATETIME(3)  NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_chapter_version (chapter_id, version_no),
  KEY ix_cnt_chapter_version_published (chapter_id, published_at),
  CONSTRAINT fk_cnt_chapter_version_chapter FOREIGN KEY (chapter_id) REFERENCES cnt_chapter (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Bat bien: ung dung chi duoc INSERT va cap nhat dung cot published_at.

CREATE TABLE cnt_resource (
  id                BINARY(16)      NOT NULL,
  course_id         BINARY(16)      NOT NULL COMMENT 'logical ref crs_course.id',
  kind              ENUM('IMAGE','VIDEO','AUDIO','PDF','ARCHIVE','OTHER') NOT NULL,
  original_filename VARCHAR(255)    NOT NULL,
  content_type      VARCHAR(100)    NOT NULL,
  size_bytes        BIGINT UNSIGNED NOT NULL,
  storage_key       VARCHAR(500)    NOT NULL,
  created_at        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at        DATETIME(3)     NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_resource_storage_key (storage_key),
  KEY ix_cnt_resource_course (course_id, deleted_at, created_at),
  CONSTRAINT ck_cnt_resource_size CHECK (size_bytes <= 20971520),
  CONSTRAINT ck_cnt_resource_image_size CHECK (kind <> 'IMAGE' OR size_bytes <= 5242880)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_question_bank (
  id                BINARY(16)  NOT NULL,
  course_id         BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id, 1 bank / course',
  difficulty_scheme ENUM('EASY_HARD','LEVEL_1_5','COGNITIVE_4') NULL DEFAULT NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_question_bank_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_question (
  id               BINARY(16)        NOT NULL,
  bank_id          BINARY(16)        NOT NULL,
  question_type    ENUM('MULTIPLE_CHOICE','TRUE_FALSE','FILL_BLANK','MATCHING','SHORT_ESSAY','ESSAY') NOT NULL,
  allow_multiple   BOOLEAN           NOT NULL DEFAULT FALSE,
  stem             TEXT              NOT NULL,
  explanation      TEXT              NULL,
  reference_answer TEXT              NULL,
  difficulty_code  TINYINT UNSIGNED  NULL DEFAULT NULL,
  default_points   DECIMAL(6,2)      NOT NULL DEFAULT 1.00,
  status           ENUM('DRAFT','READY','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  origin           ENUM('MANUAL','AI') NOT NULL DEFAULT 'MANUAL',
  ai_job_id        BINARY(16)        NULL DEFAULT NULL COMMENT 'logical ref ai_generation_job.id',
  ai_item_no       SMALLINT UNSIGNED NULL DEFAULT NULL,
  created_at       DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_question_ai_item (ai_job_id, ai_item_no),
  KEY ix_cnt_question_bank_status_type (bank_id, status, question_type),
  KEY ix_cnt_question_bank_difficulty (bank_id, difficulty_code),
  CONSTRAINT fk_cnt_question_bank FOREIGN KEY (bank_id) REFERENCES cnt_question_bank (id) ON DELETE RESTRICT,
  CONSTRAINT ck_cnt_question_ai CHECK ((origin = 'AI') = (ai_job_id IS NOT NULL AND ai_item_no IS NOT NULL)),
  CONSTRAINT ck_cnt_question_multiple CHECK (allow_multiple = FALSE OR question_type = 'MULTIPLE_CHOICE'),
  CONSTRAINT ck_cnt_question_points CHECK (default_points >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_question_option (
  id            BINARY(16)        NOT NULL,
  question_id   BINARY(16)        NOT NULL,
  position      SMALLINT UNSIGNED NOT NULL,
  content       TEXT              NOT NULL,
  match_content TEXT              NULL,
  blank_no      TINYINT UNSIGNED  NULL DEFAULT NULL,
  is_correct    BOOLEAN           NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  KEY ix_cnt_question_option_question (question_id, position),
  CONSTRAINT fk_cnt_question_option_question FOREIGN KEY (question_id) REFERENCES cnt_question (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_question_tag (
  question_id BINARY(16) NOT NULL,
  tag         VARCHAR(50) COLLATE utf8mb4_0900_as_ci NOT NULL,
  PRIMARY KEY (question_id, tag),
  KEY ix_cnt_question_tag_tag (tag, question_id),
  CONSTRAINT fk_cnt_question_tag_question FOREIGN KEY (question_id) REFERENCES cnt_question (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_block (
  id               BINARY(16)   NOT NULL,
  chapter_id       BINARY(16)   NOT NULL,
  block_type       ENUM('RICH_TEXT','IMAGE','VIDEO','AUDIO','FILE','MARKDOWN','FLASHCARD','QUESTION','ASSIGNMENT','QUIZ') NOT NULL,
  position         INT          NOT NULL,
  title            VARCHAR(200) NULL DEFAULT NULL,
  body             MEDIUMTEXT   NULL,
  resource_id      BINARY(16)   NULL DEFAULT NULL,
  question_id      BINARY(16)   NULL DEFAULT NULL,
  flashcards       JSON         NULL,
  ai_job_id        BINARY(16)   NULL DEFAULT NULL COMMENT 'logical ref ai_generation_job.id',
  ai_review_status ENUM('NOT_APPLICABLE','PENDING','APPROVED') NOT NULL DEFAULT 'NOT_APPLICABLE',
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_block_ai_job (ai_job_id),
  KEY ix_cnt_block_chapter_pos (chapter_id, position),
  KEY ix_cnt_block_resource (resource_id),
  KEY ix_cnt_block_question (question_id),
  CONSTRAINT fk_cnt_block_chapter  FOREIGN KEY (chapter_id)  REFERENCES cnt_chapter (id)  ON DELETE CASCADE,
  CONSTRAINT fk_cnt_block_resource FOREIGN KEY (resource_id) REFERENCES cnt_resource (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cnt_block_question FOREIGN KEY (question_id) REFERENCES cnt_question (id) ON DELETE RESTRICT,
  CONSTRAINT ck_cnt_block_text      CHECK (block_type NOT IN ('RICH_TEXT','MARKDOWN') OR body IS NOT NULL),
  CONSTRAINT ck_cnt_block_media     CHECK (block_type NOT IN ('IMAGE','VIDEO','AUDIO','FILE') OR resource_id IS NOT NULL),
  CONSTRAINT ck_cnt_block_flashcard CHECK (block_type <> 'FLASHCARD' OR flashcards IS NOT NULL),
  CONSTRAINT ck_cnt_block_question  CHECK (block_type <> 'QUESTION' OR question_id IS NOT NULL),
  CONSTRAINT ck_cnt_block_title     CHECK (block_type NOT IN ('QUIZ','ASSIGNMENT') OR title IS NOT NULL),
  CONSTRAINT ck_cnt_block_ai_review CHECK (ai_review_status = 'NOT_APPLICABLE'
      OR (block_type = 'FLASHCARD' AND ai_job_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_published_block (
  block_id    BINARY(16)   NOT NULL COMMENT 'khong FK toi cnt_block',
  chapter_id  BINARY(16)   NOT NULL,
  block_type  ENUM('RICH_TEXT','IMAGE','VIDEO','AUDIO','FILE','MARKDOWN','FLASHCARD','QUESTION','ASSIGNMENT','QUIZ') NOT NULL,
  position    INT          NOT NULL,
  resource_id BINARY(16)   NULL DEFAULT NULL,
  question_id BINARY(16)   NULL DEFAULT NULL COMMENT 'cung module, khong FK',
  version_no  INT UNSIGNED NOT NULL,
  PRIMARY KEY (block_id),
  KEY ix_cnt_published_block_chapter_pos (chapter_id, position),
  KEY ix_cnt_published_block_resource (resource_id),
  CONSTRAINT fk_cnt_published_block_chapter  FOREIGN KEY (chapter_id)  REFERENCES cnt_chapter (id)  ON DELETE CASCADE,
  CONSTRAINT fk_cnt_published_block_resource FOREIGN KEY (resource_id) REFERENCES cnt_resource (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_quiz_config (
  block_id          BINARY(16)        NOT NULL,
  open_at           DATETIME(3)       NULL DEFAULT NULL,
  close_at          DATETIME(3)       NULL DEFAULT NULL,
  time_limit_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,
  max_attempts      SMALLINT UNSIGNED NULL DEFAULT 1 COMMENT 'NULL = khong gioi han',
  pass_score        DECIMAL(6,2)      NULL DEFAULT NULL COMMENT 'chi hien thi',
  result_display    ENUM('AFTER_EACH_ANSWER','AFTER_SUBMIT','AFTER_CLOSE','AFTER_GRADING') NOT NULL DEFAULT 'AFTER_SUBMIT',
  shuffle_questions BOOLEAN           NOT NULL DEFAULT FALSE,
  shuffle_options   BOOLEAN           NOT NULL DEFAULT FALSE,
  password_hash     VARCHAR(100)      NULL DEFAULT NULL,
  updated_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (block_id),
  CONSTRAINT fk_cnt_quiz_config_block FOREIGN KEY (block_id) REFERENCES cnt_block (id) ON DELETE CASCADE,
  CONSTRAINT ck_cnt_quiz_config_window_pair CHECK ((open_at IS NULL) = (close_at IS NULL)),
  CONSTRAINT ck_cnt_quiz_config_window_order CHECK (open_at IS NULL OR open_at < close_at),
  CONSTRAINT ck_cnt_quiz_config_time_limit CHECK (open_at IS NOT NULL OR time_limit_minutes IS NOT NULL),
  CONSTRAINT ck_cnt_quiz_config_attempts CHECK (max_attempts IS NULL OR max_attempts > 0),
  CONSTRAINT ck_cnt_quiz_config_minutes CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  CONSTRAINT ck_cnt_quiz_config_after_close CHECK (result_display <> 'AFTER_CLOSE' OR close_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_quiz_question (
  quiz_block_id BINARY(16)   NOT NULL,
  question_id   BINARY(16)   NOT NULL,
  position      INT          NOT NULL,
  points        DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (quiz_block_id, question_id),
  KEY ix_cnt_quiz_question_question (question_id),
  CONSTRAINT fk_cnt_quiz_question_block    FOREIGN KEY (quiz_block_id) REFERENCES cnt_block (id)    ON DELETE CASCADE,
  CONSTRAINT fk_cnt_quiz_question_question FOREIGN KEY (question_id)   REFERENCES cnt_question (id) ON DELETE RESTRICT,
  CONSTRAINT ck_cnt_quiz_question_points CHECK (points > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_quiz_random_rule (
  id                     BINARY(16)        NOT NULL,
  quiz_block_id          BINARY(16)        NOT NULL,
  position               SMALLINT UNSIGNED NOT NULL,
  pick_count             SMALLINT UNSIGNED NOT NULL,
  points_each            DECIMAL(6,2)      NOT NULL,
  filter_tag             VARCHAR(50) COLLATE utf8mb4_0900_as_ci NULL DEFAULT NULL,
  filter_difficulty_code TINYINT UNSIGNED  NULL DEFAULT NULL,
  filter_question_type   ENUM('MULTIPLE_CHOICE','TRUE_FALSE','FILL_BLANK','MATCHING','SHORT_ESSAY','ESSAY') NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_cnt_quiz_random_rule_block (quiz_block_id, position),
  CONSTRAINT fk_cnt_quiz_random_rule_block FOREIGN KEY (quiz_block_id) REFERENCES cnt_block (id) ON DELETE CASCADE,
  CONSTRAINT ck_cnt_quiz_random_rule_pick CHECK (pick_count > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_quiz_prerequisite (
  id            BINARY(16) NOT NULL,
  quiz_block_id BINARY(16) NOT NULL,
  target_kind   ENUM('CHAPTER','BLOCK') NOT NULL,
  target_id     BINARY(16) NOT NULL COMMENT 'tham chieu logic cung module, khong FK',
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_quiz_prerequisite (quiz_block_id, target_kind, target_id),
  CONSTRAINT fk_cnt_quiz_prerequisite_block FOREIGN KEY (quiz_block_id) REFERENCES cnt_block (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_quiz_exception (
  id                BINARY(16)        NOT NULL,
  course_id         BINARY(16)        NOT NULL COMMENT 'logical ref crs_course.id',
  quiz_block_id     BINARY(16)        NOT NULL COMMENT 'logic cung module, KHONG FK',
  user_id           BINARY(16)        NOT NULL COMMENT 'logical ref idn_user.id',
  extra_minutes     SMALLINT UNSIGNED NULL DEFAULT NULL,
  extra_attempts    SMALLINT UNSIGNED NULL DEFAULT NULL,
  extended_close_at DATETIME(3)       NULL DEFAULT NULL,
  created_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_cnt_quiz_exception_block_user (quiz_block_id, user_id),
  KEY ix_cnt_quiz_exception_course (course_id),
  CONSTRAINT ck_cnt_quiz_exception_any CHECK (
    extra_minutes IS NOT NULL OR extra_attempts IS NOT NULL OR extended_close_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cnt_assignment_config (
  block_id            BINARY(16)   NOT NULL,
  due_at              DATETIME(3)  NULL DEFAULT NULL,
  max_points          DECIMAL(6,2) NULL DEFAULT NULL COMMENT 'NULL = khong cham diem',
  max_file_size_bytes INT UNSIGNED NOT NULL DEFAULT 20971520,
  updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (block_id),
  CONSTRAINT fk_cnt_assignment_config_block FOREIGN KEY (block_id) REFERENCES cnt_block (id) ON DELETE CASCADE,
  CONSTRAINT ck_cnt_assignment_config_size CHECK (max_file_size_bytes <= 20971520)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 7: LEARNING (lrn_) - 7 bang
-- =======================================

CREATE TABLE lrn_block_completion (
  id           BINARY(16)  NOT NULL,
  user_id      BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  course_id    BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  chapter_id   BINARY(16)  NOT NULL COMMENT 'logical ref cnt_chapter.id',
  block_id     BINARY(16)  NOT NULL COMMENT 'logical ref cnt_block.id',
  block_type   ENUM('RICH_TEXT','IMAGE','VIDEO','AUDIO','FILE','MARKDOWN','FLASHCARD','QUESTION','ASSIGNMENT','QUIZ') NOT NULL,
  completed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_block_completion_user_block (user_id, block_id),
  KEY ix_lrn_block_completion_user_course (user_id, course_id, completed_at),
  KEY ix_lrn_block_completion_course_user (course_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_course_completion (
  id           BINARY(16)  NOT NULL,
  user_id      BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  course_id    BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  completed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_course_completion_user_course (user_id, course_id),
  KEY ix_lrn_course_completion_course (course_id, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_bookmark (
  id         BINARY(16)  NOT NULL,
  user_id    BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  course_id  BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  chapter_id BINARY(16)  NOT NULL COMMENT 'logical ref cnt_chapter.id',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_bookmark_user_course (user_id, course_id),
  KEY ix_lrn_bookmark_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_comment (
  id                BINARY(16)  NOT NULL,
  course_id         BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  chapter_id        BINARY(16)  NULL DEFAULT NULL COMMENT 'NULL = cap khoa',
  user_id           BINARY(16)  NOT NULL COMMENT 'tac gia, logical ref idn_user.id',
  parent_comment_id BINARY(16)  NULL DEFAULT NULL,
  content           TEXT        NOT NULL,
  is_pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
  pinned_at         DATETIME(3) NULL DEFAULT NULL,
  pinned_by_user_id BINARY(16)  NULL DEFAULT NULL,
  edited_at         DATETIME(3) NULL DEFAULT NULL,
  deleted_at        DATETIME(3) NULL DEFAULT NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_lrn_comment_course_chapter (course_id, chapter_id, deleted_at, created_at),
  KEY ix_lrn_comment_parent (parent_comment_id, created_at),
  KEY ix_lrn_comment_pinned (course_id, is_pinned, deleted_at),
  CONSTRAINT fk_lrn_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES lrn_comment (id) ON DELETE RESTRICT,
  CONSTRAINT ck_lrn_comment_pin CHECK ((is_pinned = FALSE) = (pinned_at IS NULL AND pinned_by_user_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_quiz_attempt (
  id                BINARY(16)   NOT NULL,
  user_id           BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  course_id         BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  quiz_block_id     BINARY(16)   NOT NULL COMMENT 'logical ref cnt_block.id',
  attempt_no        INT UNSIGNED NOT NULL,
  status            ENUM('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED','GRADED') NOT NULL DEFAULT 'IN_PROGRESS',
  started_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deadline_at       DATETIME(3)  NOT NULL,
  submitted_at      DATETIME(3)  NULL DEFAULT NULL,
  graded_at         DATETIME(3)  NULL DEFAULT NULL,
  total_score       DECIMAL(6,2) NULL DEFAULT NULL,
  max_score         DECIMAL(6,2) NOT NULL,
  question_snapshot JSON         NOT NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_quiz_attempt_user_quiz_no (user_id, quiz_block_id, attempt_no),
  KEY ix_lrn_quiz_attempt_gradebook (user_id, course_id, quiz_block_id, status),
  KEY ix_lrn_quiz_attempt_deadline (status, deadline_at),
  CONSTRAINT ck_lrn_quiz_attempt_in_progress CHECK (status <> 'IN_PROGRESS' OR submitted_at IS NULL),
  CONSTRAINT ck_lrn_quiz_attempt_graded CHECK (status <> 'GRADED' OR (graded_at IS NOT NULL AND total_score IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_quiz_attempt_answer (
  id                BINARY(16)   NOT NULL,
  attempt_id        BINARY(16)   NOT NULL,
  question_id       BINARY(16)   NOT NULL COMMENT 'logical ref cnt_question.id',
  question_position INT          NOT NULL,
  answer_payload    JSON         NULL,
  is_correct        TINYINT      NULL DEFAULT NULL,
  points_earned     DECIMAL(6,2) NULL DEFAULT NULL,
  max_points        DECIMAL(6,2) NOT NULL,
  answered_at       DATETIME(3)  NULL DEFAULT NULL,
  graded_at         DATETIME(3)  NULL DEFAULT NULL,
  graded_by_user_id BINARY(16)   NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  grader_feedback   TEXT         NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_answer_attempt_question (attempt_id, question_id),
  KEY ix_lrn_answer_question_correct (question_id, is_correct),
  CONSTRAINT fk_lrn_answer_attempt FOREIGN KEY (attempt_id) REFERENCES lrn_quiz_attempt (id) ON DELETE CASCADE,
  CONSTRAINT ck_lrn_answer_correct CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
  CONSTRAINT ck_lrn_answer_points CHECK (points_earned IS NULL OR points_earned >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE lrn_assignment_submission (
  id                  BINARY(16)  NOT NULL,
  user_id             BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  course_id           BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  assignment_block_id BINARY(16)  NOT NULL COMMENT 'logical ref cnt_block.id',
  status              ENUM('DRAFT','SUBMITTED','GRADED') NOT NULL DEFAULT 'DRAFT',
  text_content        MEDIUMTEXT  NULL,
  files               JSON        NULL,
  is_late             BOOLEAN     NULL DEFAULT NULL,
  submitted_at        DATETIME(3) NULL DEFAULT NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_lrn_submission_user_block (user_id, assignment_block_id),
  KEY ix_lrn_submission_course_status (course_id, status),
  CONSTRAINT ck_lrn_submission_draft CHECK ((status = 'DRAFT') = (submitted_at IS NULL)),
  CONSTRAINT ck_lrn_submission_late CHECK (status = 'DRAFT' OR is_late IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 8: ASSESSMENT (ast_) - 7 bang
-- =======================================

CREATE TABLE ast_assessment_config (
  id                      BINARY(16)   NOT NULL,
  course_id               BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  pass_threshold          DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  score_selection_rule    ENUM('HIGHEST','LATEST','AVERAGE') NOT NULL DEFAULT 'HIGHEST',
  grade_scale_json        JSON         NULL,
  achievement_levels_json JSON         NULL,
  bloom_scale_json        JSON         NULL,
  plo_enabled             BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_config_course (course_id),
  CONSTRAINT ck_ast_config_threshold CHECK (pass_threshold BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_assessment_component (
  id              BINARY(16)   NOT NULL,
  course_id       BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  source_kind     ENUM('QUIZ','ASSIGNMENT') NOT NULL,
  source_block_id BINARY(16)   NOT NULL COMMENT 'logical ref cnt_block.id',
  title           VARCHAR(200) NOT NULL,
  max_score       DECIMAL(6,2) NOT NULL,
  course_weight   DECIMAL(6,2) NOT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_component_course_block (course_id, source_block_id),
  KEY ix_ast_component_course_weight (course_id, course_weight),
  CONSTRAINT ck_ast_component_max_score CHECK (max_score > 0),
  CONSTRAINT ck_ast_component_weight CHECK (course_weight >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_clo (
  id               BINARY(16)  NOT NULL,
  course_id        BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  code             VARCHAR(30) NOT NULL,
  description      TEXT        NOT NULL,
  bloom_level_code VARCHAR(50) NULL DEFAULT NULL,
  linked_plo_ids   JSON        NULL COMMENT 'mang ID logic ast_plo',
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_clo_course_code (course_id, code),
  KEY ix_ast_clo_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_plo (
  id          BINARY(16)  NOT NULL,
  course_id   BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  code        VARCHAR(30) NOT NULL,
  description TEXT        NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_plo_course_code (course_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_component_outcome_weight (
  id           BINARY(16)   NOT NULL,
  component_id BINARY(16)   NOT NULL,
  clo_id       BINARY(16)   NOT NULL,
  weight       DECIMAL(6,2) NOT NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_outcome_weight_component_clo (component_id, clo_id),
  KEY ix_ast_outcome_weight_clo (clo_id),
  CONSTRAINT fk_ast_outcome_weight_component FOREIGN KEY (component_id) REFERENCES ast_assessment_component (id) ON DELETE CASCADE,
  CONSTRAINT fk_ast_outcome_weight_clo       FOREIGN KEY (clo_id)       REFERENCES ast_clo (id)                  ON DELETE RESTRICT,
  CONSTRAINT ck_ast_outcome_weight_positive CHECK (weight > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_grade_record (
  id                   BINARY(16)   NOT NULL,
  user_id              BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  course_id            BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  component_id         BINARY(16)   NOT NULL,
  record_type          ENUM('QUIZ_ATTEMPT','ASSIGNMENT_SUBMISSION','COMPONENT_FINAL') NOT NULL,
  source_attempt_id    BINARY(16)   NULL DEFAULT NULL COMMENT 'logical ref lrn_quiz_attempt.id',
  source_submission_id BINARY(16)   NULL DEFAULT NULL COMMENT 'logical ref lrn_assignment_submission.id',
  score                DECIMAL(6,2) NULL DEFAULT NULL,
  max_score            DECIMAL(6,2) NULL DEFAULT NULL,
  is_fully_graded      BOOLEAN      NOT NULL DEFAULT FALSE,
  graded_at            DATETIME(3)  NULL DEFAULT NULL,
  feedback             TEXT         NULL,
  final_marker         TINYINT GENERATED ALWAYS AS (CASE WHEN record_type = 'COMPONENT_FINAL' THEN 1 ELSE NULL END) STORED,
  created_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_grade_raw (user_id, component_id, record_type, source_attempt_id, source_submission_id),
  UNIQUE KEY uk_ast_grade_final (user_id, component_id, final_marker),
  KEY ix_ast_grade_gradebook (course_id, user_id, record_type),
  KEY ix_ast_grade_stats (component_id, record_type, score),
  CONSTRAINT fk_ast_grade_component FOREIGN KEY (component_id) REFERENCES ast_assessment_component (id) ON DELETE RESTRICT,
  CONSTRAINT ck_ast_grade_quiz CHECK ((record_type = 'QUIZ_ATTEMPT') =
      (source_attempt_id IS NOT NULL AND source_submission_id IS NULL)),
  CONSTRAINT ck_ast_grade_assignment CHECK ((record_type = 'ASSIGNMENT_SUBMISSION') =
      (source_submission_id IS NOT NULL AND source_attempt_id IS NULL)),
  CONSTRAINT ck_ast_grade_final CHECK ((record_type = 'COMPONENT_FINAL') =
      (source_attempt_id IS NULL AND source_submission_id IS NULL AND max_score IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ast_course_review (
  id                 BINARY(16)  NOT NULL,
  course_id          BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id',
  user_id            BINARY(16)  NOT NULL COMMENT 'logical ref idn_user.id',
  rating             TINYINT     NOT NULL,
  comment_text       TEXT        NULL,
  reply_text         TEXT        NULL,
  replied_at         DATETIME(3) NULL DEFAULT NULL,
  replied_by_user_id BINARY(16)  NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ast_review_course_user (course_id, user_id),
  KEY ix_ast_review_course_rating (course_id, rating),
  CONSTRAINT ck_ast_review_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_ast_review_reply CHECK ((reply_text IS NULL) = (replied_at IS NULL AND replied_by_user_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 9: DISCOVERY (dsc_) - 3 bang
-- =======================================

CREATE TABLE dsc_course_entry (
  course_id               BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  owner_user_id           BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  owner_display_name      VARCHAR(100) NOT NULL,
  name                    VARCHAR(200) NOT NULL,
  description             TEXT         NULL,
  cover_storage_key       VARCHAR(500) NULL DEFAULT NULL,
  access_mode             ENUM('PUBLIC','PRIVATE') NOT NULL,
  course_status           ENUM('UPDATING','COMPLETED','PAUSED') NOT NULL,
  tag_list                JSON         NULL,
  learner_count           INT UNSIGNED NOT NULL DEFAULT 0,
  review_count            INT UNSIGNED NOT NULL DEFAULT 0,
  avg_rating              DECIMAL(3,2) NULL DEFAULT NULL,
  nomination_count        INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count           INT UNSIGNED NOT NULL DEFAULT 0,
  published_chapter_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_updated_at         DATETIME(3)  NOT NULL,
  first_published_at      DATETIME(3)  NULL DEFAULT NULL,
  source_revision         INT UNSIGNED NOT NULL,
  synced_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (course_id),
  KEY ix_dsc_entry_home (access_mode, course_status, last_updated_at),
  KEY ix_dsc_entry_search (name, owner_display_name),
  KEY ix_dsc_entry_last_updated (last_updated_at),
  KEY ix_dsc_entry_first_published (first_published_at),
  KEY ix_dsc_entry_review_count (review_count),
  KEY ix_dsc_entry_nomination_count (nomination_count),
  KEY ix_dsc_entry_learner_count (learner_count),
  KEY ix_dsc_entry_comment_count (comment_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dsc_course_activity_fact (
  id              BINARY(16)  NOT NULL,
  course_id       BINARY(16)  NOT NULL COMMENT 'logical ref crs_course.id, khong FK',
  activity_type   ENUM('ENROLLMENT_NEW','REVIEW_NEW','NOMINATION_NEW','NOMINATION_WITHDRAWN') NOT NULL,
  user_id         BINARY(16)  NULL DEFAULT NULL COMMENT 'logical ref idn_user.id',
  source_event_id BINARY(16)  NOT NULL,
  occurred_at     DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dsc_fact_source_event (source_event_id),
  KEY ix_dsc_fact_course_type_time (course_id, activity_type, occurred_at),
  KEY ix_dsc_fact_type_time (activity_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE dsc_search_history (
  id         BINARY(16)   NOT NULL,
  user_id    BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  query_text VARCHAR(500) NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_dsc_search_history_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- MODULE 10: AI (ai_) - 3 bang
-- =======================================

CREATE TABLE ai_generation_job (
  id                BINARY(16)   NOT NULL COMMENT 'aiJobId',
  user_id           BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  course_id         BINARY(16)   NOT NULL COMMENT 'logical ref crs_course.id',
  job_type          ENUM('QUIZ','FLASHCARD') NOT NULL,
  source_kind       ENUM('PASTED_TEXT','CHAPTER') NOT NULL,
  source_text       MEDIUMTEXT   NULL,
  source_chapter_id BINARY(16)   NULL DEFAULT NULL COMMENT 'logical ref cnt_chapter.id',
  generation_params JSON         NOT NULL,
  status            ENUM('PENDING','RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
  result_count      INT UNSIGNED NULL DEFAULT NULL,
  error_message     VARCHAR(500) NULL DEFAULT NULL,
  started_at        DATETIME(3)  NULL DEFAULT NULL,
  completed_at      DATETIME(3)  NULL DEFAULT NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_ai_job_user (user_id, created_at),
  KEY ix_ai_job_status (status, created_at),
  CONSTRAINT ck_ai_job_pasted CHECK ((source_kind = 'PASTED_TEXT') =
      (source_text IS NOT NULL AND source_chapter_id IS NULL)),
  CONSTRAINT ck_ai_job_chapter CHECK ((source_kind = 'CHAPTER') =
      (source_chapter_id IS NOT NULL AND source_text IS NULL)),
  CONSTRAINT ck_ai_job_completed CHECK (status <> 'COMPLETED' OR (result_count IS NOT NULL AND completed_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_moderation_scan_log (
  id                   BINARY(16)    NOT NULL,
  scan_type            ENUM('COMMENT','COURSE_NAME','COURSE_DESCRIPTION') NOT NULL,
  target_id            BINARY(16)    NOT NULL COMMENT 'logical ref lrn_comment.id or crs_course.id',
  target_course_id     BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref crs_course.id',
  content_snapshot     TEXT          NOT NULL,
  model_name           VARCHAR(50)   NOT NULL DEFAULT 'PhoBERT',
  model_version        VARCHAR(50)   NULL DEFAULT NULL,
  score                DECIMAL(5,4)  NULL DEFAULT NULL,
  threshold_used       DECIMAL(5,4)  NULL DEFAULT NULL,
  flagged              BOOLEAN       NOT NULL DEFAULT FALSE,
  moderation_report_id BINARY(16)    NULL DEFAULT NULL COMMENT 'logical ref mod_report.id',
  scanned_at           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  error_message        VARCHAR(500)  NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY ix_ai_scan_target (scan_type, target_id, scanned_at),
  KEY ix_ai_scan_flagged (flagged, moderation_report_id, scanned_at),
  KEY ix_ai_scan_course (target_course_id),
  CONSTRAINT ck_ai_scan_flagged_score CHECK (flagged = FALSE OR score IS NOT NULL),
  CONSTRAINT ck_ai_scan_report_flagged CHECK (moderation_report_id IS NULL OR flagged = TRUE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ai_user_daily_quota (
  id          BINARY(16)   NOT NULL,
  user_id     BINARY(16)   NOT NULL COMMENT 'logical ref idn_user.id',
  quota_date  DATE         NOT NULL COMMENT 'ngay UTC',
  used_count  INT UNSIGNED NOT NULL DEFAULT 0,
  quota_limit INT UNSIGNED NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_quota_user_date (user_id, quota_date),
  CONSTRAINT ck_ai_quota_limit CHECK (used_count <= quota_limit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =======================================
-- KET THUC: 56 bang / 10 module
-- =======================================
