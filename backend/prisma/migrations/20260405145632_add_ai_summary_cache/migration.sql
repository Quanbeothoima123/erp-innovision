-- CreateTable
CREATE TABLE `ai_summary_caches` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `question_type` VARCHAR(50) NOT NULL,
    `data_hash` VARCHAR(64) NOT NULL,
    `period_key` VARCHAR(20) NOT NULL,
    `answer` LONGTEXT NOT NULL,
    `tokens_used` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `ai_summary_caches_user_id_question_type_idx`(`user_id`, `question_type`),
    INDEX `ai_summary_caches_expires_at_idx`(`expires_at`),
    UNIQUE INDEX `ai_summary_caches_user_id_question_type_period_key_key`(`user_id`, `question_type`, `period_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_summary_caches` ADD CONSTRAINT `ai_summary_caches_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
