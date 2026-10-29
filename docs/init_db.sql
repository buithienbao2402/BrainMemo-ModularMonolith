-- =============================================================================
-- SCHEMA 1: brainmemo_identity (Xác thực, Phân quyền & Người dùng)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS `brainmemo_identity` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_identity`;

DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `bio` VARCHAR(500) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `user_roles` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` VARCHAR(50) NOT NULL COMMENT 'GUEST, STUDENT, CREATOR, ADMIN',
    PRIMARY KEY (`user_id`, `role`),
    CONSTRAINT `fk_userroles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_refreshtokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 2: brainmemo_curriculum (Khóa học, Cấu trúc Khối & Chuẩn CLO AUN-QA)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS `brainmemo_curriculum` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_curriculum`;

DROP TABLE IF EXISTS `text_blocks`;
DROP TABLE IF EXISTS `blocks`;
DROP TABLE IF EXISTS `pages`;
DROP TABLE IF EXISTS `chapters`;
DROP TABLE IF EXISTS `course_tags`;
DROP TABLE IF EXISTS `tags`;
DROP TABLE IF EXISTS `course_clos`;
DROP TABLE IF EXISTS `courses`;

CREATE TABLE `courses` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `creator_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(191) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `access_type` ENUM('PUBLIC', 'PRIVATE', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_creator` (`creator_id`)
) ENGINE=InnoDB;

CREATE TABLE `course_clos` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `clo_code` VARCHAR(50) NOT NULL COMMENT 'CLO1, CLO2, CLO3...',
    `description` TEXT NOT NULL COMMENT 'Mô tả năng lực chuẩn AUN-QA',
    `target_percentage` INT NOT NULL DEFAULT 75 COMMENT 'Chỉ tiêu đạt (%)',
    CONSTRAINT `fk_clos_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `tags` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tag_name` VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `course_tags` (
    `course_id` BIGINT UNSIGNED NOT NULL,
    `tag_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`course_id`, `tag_id`),
    CONSTRAINT `fk_coursetags_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_coursetags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `chapters` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    `access_type` ENUM('PUBLIC', 'PRIVATE', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `is_draft` BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT `fk_chapters_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `pages` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    CONSTRAINT `fk_pages_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `page_id` BIGINT UNSIGNED NOT NULL,
    `block_type` ENUM('TEXT', 'MEDIA', 'QUIZ', 'FLASHCARD') NOT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    CONSTRAINT `fk_blocks_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `text_blocks` (
    `block_id` BIGINT UNSIGNED PRIMARY KEY,
    `content_markdown` MEDIUMTEXT NOT NULL,
    CONSTRAINT `fk_textblocks_block` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 3: brainmemo_storage (Lưu trữ Metadata Tệp tin S3 / MinIO)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS `brainmemo_storage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_storage`;

DROP TABLE IF EXISTS `media_files`;

CREATE TABLE `media_files` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `owner_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `file_name` VARCHAR(255) NOT NULL,
    `object_key` VARCHAR(191) NOT NULL UNIQUE COMMENT 'Khóa định danh trên MinIO Bucket',
    `bucket_name` VARCHAR(100) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_owner` (`owner_id`)
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 4: brainmemo_assessment (Khảo thí, AI Sư phạm & Kiểm định AUN-QA)
-- =============================================================================
CREATE DATABASE IF NOT EXISTS `brainmemo_assessment` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_assessment`;

DROP TABLE IF EXISTS `discussions`;
DROP TABLE IF EXISTS `user_course_progress`;
DROP TABLE IF EXISTS `flashcards`;
DROP TABLE IF EXISTS `flashcard_blocks`;
DROP TABLE IF EXISTS `adaptive_remediations`;
DROP TABLE IF EXISTS `clo_results`;
DROP TABLE IF EXISTS `quiz_attempt_answers`;
DROP TABLE IF EXISTS `quiz_attempts`;
DROP TABLE IF EXISTS `quiz_options`;
DROP TABLE IF EXISTS `quiz_questions`;
DROP TABLE IF EXISTS `quiz_blocks`;

CREATE TABLE `quiz_blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.blocks.id',
    `title` VARCHAR(255) NOT NULL,
    `passing_score` INT NOT NULL DEFAULT 70,
    INDEX `idx_block` (`block_id`)
) ENGINE=InnoDB;

CREATE TABLE `quiz_questions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `quiz_block_id` BIGINT UNSIGNED NOT NULL,
    `clo_id` BIGINT UNSIGNED NULL COMMENT 'Logical ID -> brainmemo_curriculum.course_clos.id (AUN-QA)',
    `question_type` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE') NOT NULL DEFAULT 'SINGLE_CHOICE',
    `question_text` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `order_index` INT NOT NULL DEFAULT 0,
    CONSTRAINT `fk_questions_quizblock` FOREIGN KEY (`quiz_block_id`) REFERENCES `quiz_blocks` (`id`) ON DELETE CASCADE,
    INDEX `idx_clo` (`clo_id`)
) ENGINE=InnoDB;

CREATE TABLE `quiz_options` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `question_id` BIGINT UNSIGNED NOT NULL,
    `option_text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT `fk_options_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `quiz_attempts` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `quiz_block_id` BIGINT UNSIGNED NOT NULL,
    `total_score` DECIMAL(5,2) NOT NULL,
    `is_passed` BOOLEAN NOT NULL,
    `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attempts_quizblock` FOREIGN KEY (`quiz_block_id`) REFERENCES `quiz_blocks` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_attempts` (`user_id`, `quiz_block_id`)
) ENGINE=InnoDB;

CREATE TABLE `quiz_attempt_answers` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `attempt_id` BIGINT UNSIGNED NOT NULL,
    `question_id` BIGINT UNSIGNED NOT NULL,
    `selected_option_id` BIGINT UNSIGNED NULL,
    `is_correct` BOOLEAN NOT NULL,
    CONSTRAINT `fk_attemptanswers_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_attemptanswers_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `clo_results` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `course_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.courses.id',
    `clo_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.course_clos.id',
    `attained_percentage` DECIMAL(5,2) NOT NULL,
    `is_passed` BOOLEAN NOT NULL,
    `evaluated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_course_clo` (`user_id`, `course_id`, `clo_id`)
) ENGINE=InnoDB;

CREATE TABLE `adaptive_remediations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `quiz_attempt_id` BIGINT UNSIGNED NOT NULL,
    `target_clo_id` BIGINT UNSIGNED NULL COMMENT 'Logical ID -> brainmemo_curriculum.course_clos.id',
    `diagnostic_summary` TEXT NOT NULL COMMENT 'AI chẩn đoán bẫy tư duy',
    `is_resolved` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_remediations_attempt` FOREIGN KEY (`quiz_attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `flashcard_blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.blocks.id',
    `instructions` VARCHAR(255) NULL,
    INDEX `idx_fc_block` (`block_id`)
) ENGINE=InnoDB;

CREATE TABLE `flashcards` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `flashcard_block_id` BIGINT UNSIGNED NOT NULL,
    `front_text` TEXT NOT NULL COMMENT 'Mặt 1: Thuật ngữ',
    `back_text` TEXT NOT NULL COMMENT 'Mặt 2: Định nghĩa',
    `real_world_example` TEXT NULL COMMENT 'Mặt 3: Ví dụ thực tế code',
    `order_index` INT NOT NULL DEFAULT 0,
    CONSTRAINT `fk_flashcards_block` FOREIGN KEY (`flashcard_block_id`) REFERENCES `flashcard_blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `user_course_progress` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `course_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.courses.id',
    `progress_percentage` INT NOT NULL DEFAULT 0,
    `last_accessed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_course` (`user_id`, `course_id`)
) ENGINE=InnoDB;

CREATE TABLE `discussions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_curriculum.courses.id',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Logical ID -> brainmemo_identity.users.id',
    `parent_id` BIGINT UNSIGNED NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_discussions_parent` FOREIGN KEY (`parent_id`) REFERENCES `discussions` (`id`) ON DELETE CASCADE,
    INDEX `idx_course_discussions` (`course_id`)
) ENGINE=InnoDB;