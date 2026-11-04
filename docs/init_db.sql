-- =============================================================================
-- SCHEMA 1: IDENTITY & ACCESS MANAGEMENT
-- =============================================================================
DROP DATABASE IF EXISTS `brainmemo_identity`;
CREATE DATABASE `brainmemo_identity` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_identity`;

CREATE TABLE `users` (
    `user_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `avatar_media_id` BIGINT NULL,
    `bio` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

CREATE TABLE `user_roles` (
    `user_id` BIGINT NOT NULL,
    `role` ENUM('STUDENT', 'CREATOR') NOT NULL,
    PRIMARY KEY (`user_id`, `role`),
    CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `email_otps` (
    `otp_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL,
    `otp_code` VARCHAR(6) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `is_used` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_otps_email_code` (`email`, `otp_code`)
) ENGINE=InnoDB;

CREATE TABLE `refresh_tokens` (
    `token_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `replaced_by_token_id` BIGINT NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT FALSE,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_refresh_user` (`user_id`),
    CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 2: CURRICULUM MANAGEMENT
-- =============================================================================
DROP DATABASE IF EXISTS `brainmemo_curriculum`;
CREATE DATABASE `brainmemo_curriculum` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_curriculum`;

CREATE TABLE `tags` (
    `tag_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `slug` VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `courses` (
    `course_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `creator_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(280) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `thumbnail_media_id` BIGINT NULL,
    `access_type` ENUM('PUBLIC', 'PRIVATE', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT FALSE,
    `published_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_courses_creator` (`creator_id`),
    FULLTEXT INDEX `ft_courses_title_desc` (`title`, `description`)
) ENGINE=InnoDB;

CREATE TABLE `course_tags` (
    `course_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,
    PRIMARY KEY (`course_id`, `tag_id`),
    CONSTRAINT `fk_course_tags_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_course_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `course_clos` (
    `clo_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT NOT NULL,
    `clo_code` VARCHAR(20) NOT NULL,
    `description` TEXT NOT NULL,
    `target_percentage` DECIMAL(5,2) NOT NULL DEFAULT 75.00,
    `bloom_level` ENUM('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_course_clo_code` (`course_id`, `clo_code`),
    CONSTRAINT `fk_course_clos_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `enrollments` (
    `enrollment_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `role` ENUM('STUDENT') NOT NULL DEFAULT 'STUDENT',
    `enrolled_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_student_course` (`course_id`, `student_id`),
    CONSTRAINT `fk_enrollments_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `chapters` (
    `chapter_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `access_type` ENUM('PUBLIC', 'PRIVATE', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_chapters_course` (`course_id`),
    CONSTRAINT `fk_chapters_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `pages` (
    `page_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pages_chapter` (`chapter_id`),
    CONSTRAINT `fk_pages_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`chapter_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `blocks` (
    `block_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `page_id` BIGINT NOT NULL,
    `block_type` ENUM('TEXT', 'MEDIA', 'QUIZ', 'FLASHCARD') NOT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    INDEX `idx_blocks_page` (`page_id`),
    CONSTRAINT `fk_blocks_page` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `text_blocks` (
    `block_id` BIGINT PRIMARY KEY,
    `content_markdown` LONGTEXT NOT NULL,
    CONSTRAINT `fk_text_blocks_block` FOREIGN KEY (`block_id`) REFERENCES `blocks`(`block_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `media_blocks` (
    `block_id` BIGINT PRIMARY KEY,
    `media_file_id` BIGINT NOT NULL,
    CONSTRAINT `fk_media_blocks_block` FOREIGN KEY (`block_id`) REFERENCES `blocks`(`block_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `user_course_progress` (
    `progress_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `course_id` BIGINT NOT NULL,
    `progress_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `completed_chapters_count` INT NOT NULL DEFAULT 0,
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_user_course_prog` (`user_id`, `course_id`),
    INDEX `idx_progress_course` (`course_id`),
    CONSTRAINT `fk_progress_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `discussions` (
    `discussion_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `page_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `parent_id` BIGINT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_discussions_page` (`page_id`),
    INDEX `idx_discussions_user` (`user_id`),
    CONSTRAINT `fk_discussions_page` FOREIGN KEY (`page_id`) REFERENCES `pages`(`page_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 3: OBJECT STORAGE & MEDIA
-- =============================================================================
DROP DATABASE IF EXISTS `brainmemo_storage`;
CREATE DATABASE `brainmemo_storage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_storage`;

CREATE TABLE `media_files` (
    `media_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `owner_id` BIGINT NOT NULL,
    `object_key` VARCHAR(500) NOT NULL UNIQUE,
    `file_name` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED') NOT NULL DEFAULT 'PENDING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_media_owner` (`owner_id`),
    INDEX `idx_media_status_created` (`status`, `created_at`)
) ENGINE=InnoDB;

-- =============================================================================
-- SCHEMA 4: ASSESSMENT & OBE ENGINE (AUN-QA)
-- =============================================================================
DROP DATABASE IF EXISTS `brainmemo_assessment`;
CREATE DATABASE `brainmemo_assessment` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_assessment`;

CREATE TABLE `quiz_blocks` (
    `quiz_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT NOT NULL UNIQUE,
    `title` VARCHAR(200) NOT NULL,
    `passing_score` DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    `max_attempts` INT NOT NULL DEFAULT 3,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `quiz_questions` (
    `question_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `quiz_id` BIGINT NOT NULL,
    `clo_id` BIGINT NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_type` ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE') NOT NULL,
    `bloom_level` INT NOT NULL CHECK (`bloom_level` BETWEEN 1 AND 6),
    `clo_weight` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    `explanation` TEXT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    INDEX `idx_questions_quiz` (`quiz_id`),
    INDEX `idx_questions_clo` (`clo_id`),
    CONSTRAINT `fk_questions_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quiz_blocks`(`quiz_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `quiz_options` (
    `option_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `question_id` BIGINT NOT NULL,
    `option_text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
    `order_index` INT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_options_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `quiz_attempts` (
    `attempt_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `quiz_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `score` DECIMAL(5,2) NOT NULL,
    `is_passed` BOOLEAN NOT NULL DEFAULT FALSE,
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_attempts_quiz_student` (`quiz_id`, `student_id`),
    CONSTRAINT `fk_attempts_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quiz_blocks`(`quiz_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `quiz_attempt_answers` (
    `attempt_answer_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `attempt_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    CONSTRAINT `fk_attempt_answers_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts`(`attempt_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `attempt_selected_options` (
    `attempt_answer_id` BIGINT NOT NULL,
    `option_id` BIGINT NOT NULL,
    PRIMARY KEY (`attempt_answer_id`, `option_id`),
    CONSTRAINT `fk_selected_options_answer` FOREIGN KEY (`attempt_answer_id`) REFERENCES `quiz_attempt_answers`(`attempt_answer_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `flashcard_blocks` (
    `flashcard_set_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT NOT NULL UNIQUE,
    `title` VARCHAR(200) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `flashcards` (
    `flashcard_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `flashcard_set_id` BIGINT NOT NULL,
    `front_text` VARCHAR(255) NOT NULL,
    `back_text` TEXT NOT NULL,
    `real_world_example` TEXT NULL,
    `order_index` INT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_flashcards_set` FOREIGN KEY (`flashcard_set_id`) REFERENCES `flashcard_blocks`(`flashcard_set_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `clo_results` (
    `result_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `clo_id` BIGINT NOT NULL,
    `score_percentage` DECIMAL(5,2) NOT NULL,
    `rubric_level` INT NOT NULL CHECK (`rubric_level` BETWEEN 0 AND 4),
    `evaluated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_student_course_clo` (`course_id`, `student_id`, `clo_id`),
    INDEX `idx_clo_matrix` (`course_id`, `clo_id`)
) ENGINE=InnoDB;
