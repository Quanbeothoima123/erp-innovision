-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('ATTENDANCE_CHECKIN_REQUEST', 'ATTENDANCE_CHECKOUT_REQUEST', 'ATTENDANCE_REQUEST_APPROVED', 'ATTENDANCE_REQUEST_REJECTED', 'LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_BALANCE_LOW', 'OVERTIME_REQUEST_CREATED', 'OVERTIME_APPROVED', 'OVERTIME_REJECTED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_DUE_SOON', 'PROJECT_ASSIGNED', 'PROJECT_STATUS_CHANGED', 'MILESTONE_DUE_SOON', 'PAYROLL_READY', 'PAYSLIP_AVAILABLE', 'COMPENSATION_CHANGED', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRING_SOON', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'INVOICE_OVERDUE', 'GENERAL') NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `telegram_chat_id` VARCHAR(50) NULL,
    ADD COLUMN `telegram_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `telegram_linked_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `user_telegram_settings` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `notify_attendance_request` BOOLEAN NOT NULL DEFAULT true,
    `notify_attendance_approved` BOOLEAN NOT NULL DEFAULT true,
    `notify_attendance_rejected` BOOLEAN NOT NULL DEFAULT true,
    `notify_leave_request` BOOLEAN NOT NULL DEFAULT true,
    `notify_leave_approved` BOOLEAN NOT NULL DEFAULT true,
    `notify_leave_rejected` BOOLEAN NOT NULL DEFAULT true,
    `notify_leave_balance_low` BOOLEAN NOT NULL DEFAULT true,
    `notify_overtime_request` BOOLEAN NOT NULL DEFAULT true,
    `notify_overtime_approved` BOOLEAN NOT NULL DEFAULT true,
    `notify_overtime_rejected` BOOLEAN NOT NULL DEFAULT true,
    `notify_task_assigned` BOOLEAN NOT NULL DEFAULT true,
    `notify_task_updated` BOOLEAN NOT NULL DEFAULT true,
    `notify_task_due_soon` BOOLEAN NOT NULL DEFAULT true,
    `notify_payroll` BOOLEAN NOT NULL DEFAULT true,
    `notify_payslip` BOOLEAN NOT NULL DEFAULT true,
    `notify_compensation` BOOLEAN NOT NULL DEFAULT true,
    `notify_project` BOOLEAN NOT NULL DEFAULT true,
    `notify_milestone` BOOLEAN NOT NULL DEFAULT true,
    `notify_general` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_telegram_settings_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_group_configs` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `group_chat_id` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `telegram_group_configs_group_chat_id_key`(`group_chat_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_telegram_settings` ADD CONSTRAINT `user_telegram_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
