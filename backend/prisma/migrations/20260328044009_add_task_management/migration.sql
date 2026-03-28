-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(30) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `deadline` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'TODO',
    `source_message` TEXT NULL,
    `project_id` VARCHAR(30) NULL,
    `assigned_to_user_id` VARCHAR(30) NULL,
    `created_by_user_id` VARCHAR(30) NOT NULL,
    `estimated_hours` DECIMAL(5, 1) NULL,
    `actual_hours` DECIMAL(5, 1) NULL,
    `completed_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tasks_status_is_active_idx`(`status`, `is_active`),
    INDEX `tasks_assigned_to_user_id_idx`(`assigned_to_user_id`),
    INDEX `tasks_project_id_idx`(`project_id`),
    INDEX `tasks_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `tasks_deadline_idx`(`deadline`),
    INDEX `tasks_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_comments` (
    `id` VARCHAR(30) NOT NULL,
    `task_id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `content` TEXT NOT NULL,
    `is_edited` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `task_comments_task_id_idx`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_user_id_fkey` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
