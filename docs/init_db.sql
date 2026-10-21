-- ====================================================================
-- DỰ ÁN: HỆ THỐNG BRAINMEMO (MODULAR MONOLITH BACKEND)
-- ====================================================================

DROP DATABASE IF EXISTS `brainmemo_db`;
CREATE DATABASE `brainmemo_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `brainmemo_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================
-- PHÂN HỆ 1: MODULE IDENTITY & ACCESS MANAGEMENT
-- ====================================================================

-- 1. Bảng Người dùng (users)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Bảng Phân quyền Vai trò (user_roles)
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('Student', 'CourseCreator', 'Admin') NOT NULL DEFAULT 'Student',
    PRIMARY KEY (`user_id`, `role`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bảng Quản lý Phiên & Token Refresh (refresh_tokens)
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `token` VARCHAR(500) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_refresh_tokens_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ====================================================================
-- PHÂN HỆ 2: MODULE CURRICULUM & CONTENT MANAGEMENT
-- ====================================================================

-- 4. Bảng Khóa học (courses)
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `creator_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `access_type` ENUM('PUBLIC', 'PRIVATE', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_courses_creator` (`creator_id`),
    INDEX `idx_courses_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Bảng Nhãn Tags tìm kiếm (tags)
DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tag_name` VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Bảng Trung gian Khóa học - Thẻ (course_tags)
DROP TABLE IF EXISTS `course_tags`;
CREATE TABLE `course_tags` (
    `course_id` BIGINT UNSIGNED NOT NULL,
    `tag_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`course_id`, `tag_id`),
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Bảng Chương học (chapters)
DROP TABLE IF EXISTS `chapters`;
CREATE TABLE `chapters` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `order_index` INT UNSIGNED NOT NULL DEFAULT 1,
    `access_type` ENUM('PUBLIC', 'PROTECTED') NOT NULL DEFAULT 'PUBLIC',
    `passcode_hash` VARCHAR(255) NULL,
    `is_draft` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
    INDEX `idx_chapters_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Bảng Trang nội dung (pages)
DROP TABLE IF EXISTS `pages`;
CREATE TABLE `pages` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `order_index` INT UNSIGNED NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE,
    INDEX `idx_pages_chapter` (`chapter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Bảng Cha quản lý Khối nội dung đa hình (blocks)
DROP TABLE IF EXISTS `blocks`;
CREATE TABLE `blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `page_id` BIGINT UNSIGNED NOT NULL,
    `block_type` ENUM('TEXT', 'MEDIA', 'FLASHCARD', 'QUIZ') NOT NULL,
    `order_index` INT UNSIGNED NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE CASCADE,
    INDEX `idx_blocks_page` (`page_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Bảng Con: Khối Văn bản (text_blocks)
DROP TABLE IF EXISTS `text_blocks`;
CREATE TABLE `text_blocks` (
    `block_id` BIGINT UNSIGNED PRIMARY KEY,
    `content_markdown` LONGTEXT NOT NULL,
    FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ====================================================================
-- PHÂN HỆ 3: MODULE MEDIA & STORAGE SERVICE (S3 / R2 / MINIO)
-- ====================================================================

-- 11. Bảng Quản lý Siêu dữ liệu Tệp tin (media_files)
DROP TABLE IF EXISTS `media_files`;
CREATE TABLE `media_files` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `owner_id` BIGINT UNSIGNED NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `object_key` VARCHAR(500) NOT NULL UNIQUE,
    `bucket_name` VARCHAR(100) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` BIGINT UNSIGNED NOT NULL,
    `storage_provider` VARCHAR(50) NOT NULL DEFAULT 'CLOUDFLARE_R2',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_media_files_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ====================================================================
-- PHÂN HỆ 4: MODULE AI ENGINE & ASSESSMENT
-- ====================================================================

-- 12. Bảng Khối Trắc nghiệm (quiz_blocks)
DROP TABLE IF EXISTS `quiz_blocks`;
CREATE TABLE `quiz_blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `title` VARCHAR(255) NULL,
    FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Bảng Câu hỏi trắc nghiệm (quiz_questions)
DROP TABLE IF EXISTS `quiz_questions`;
CREATE TABLE `quiz_questions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `quiz_block_id` BIGINT UNSIGNED NOT NULL,
    `question_text` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `order_index` INT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (`quiz_block_id`) REFERENCES `quiz_blocks`(`id`) ON DELETE CASCADE,
    INDEX `idx_questions_quiz` (`quiz_block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Bảng Phương án trả lời (quiz_options)
DROP TABLE IF EXISTS `quiz_options`;
CREATE TABLE `quiz_options` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `question_id` BIGINT UNSIGNED NOT NULL,
    `option_text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (`question_id`) REFERENCES `quiz_questions`(`id`) ON DELETE CASCADE,
    INDEX `idx_options_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Bảng Lịch sử làm bài trắc nghiệm (quiz_attempts)
DROP TABLE IF EXISTS `quiz_attempts`;
CREATE TABLE `quiz_attempts` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `quiz_block_id` BIGINT UNSIGNED NOT NULL,
    `score` DECIMAL(5,2) NOT NULL,
    `total_questions` INT UNSIGNED NOT NULL,
    `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`quiz_block_id`) REFERENCES `quiz_blocks`(`id`) ON DELETE CASCADE,
    INDEX `idx_attempts_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Bảng Khối Thẻ ghi nhớ (flashcard_blocks)
DROP TABLE IF EXISTS `flashcard_blocks`;
CREATE TABLE `flashcard_blocks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `block_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `instructions` VARCHAR(255) NULL,
    FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Bảng Thẻ ghi nhớ chi tiết (flashcards)
DROP TABLE IF EXISTS `flashcards`;
CREATE TABLE `flashcards` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `flashcard_block_id` BIGINT UNSIGNED NOT NULL,
    `front_text` TEXT NOT NULL,
    `back_text` TEXT NOT NULL,
    `order_index` INT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (`flashcard_block_id`) REFERENCES `flashcard_blocks`(`id`) ON DELETE CASCADE,
    INDEX `idx_cards_block` (`flashcard_block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Bảng Tiến độ học tập cá nhân (user_course_progress)
DROP TABLE IF EXISTS `user_course_progress`;
CREATE TABLE `user_course_progress` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `progress_percentage` INT UNSIGNED NOT NULL DEFAULT 0,
    `last_accessed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_user_course` (`user_id`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Bảng Thảo luận & Bình luận (discussions)
DROP TABLE IF EXISTS `discussions`;
CREATE TABLE `discussions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `course_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `parent_id` BIGINT UNSIGNED NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `discussions`(`id`) ON DELETE CASCADE,
    INDEX `idx_discussions_course` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;