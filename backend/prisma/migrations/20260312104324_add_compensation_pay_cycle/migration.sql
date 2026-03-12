/*
  Warnings:

  - You are about to drop the column `notes` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[source_checkin_request_id]` on the table `attendance_records` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source_checkout_request_id]` on the table `attendance_records` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `attendance_records` ADD COLUMN `source_checkin_request_id` VARCHAR(30) NULL,
    ADD COLUMN `source_checkout_request_id` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('ATTENDANCE_CHECKIN_REQUEST', 'ATTENDANCE_CHECKOUT_REQUEST', 'ATTENDANCE_REQUEST_APPROVED', 'ATTENDANCE_REQUEST_REJECTED', 'LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_BALANCE_LOW', 'OVERTIME_REQUEST_CREATED', 'OVERTIME_APPROVED', 'OVERTIME_REJECTED', 'PROJECT_ASSIGNED', 'PROJECT_STATUS_CHANGED', 'MILESTONE_DUE_SOON', 'PAYROLL_READY', 'PAYSLIP_AVAILABLE', 'COMPENSATION_CHANGED', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRING_SOON', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'INVOICE_OVERDUE', 'GENERAL') NOT NULL;

-- AlterTable
ALTER TABLE `user_compensations` ADD COLUMN `change_reason` VARCHAR(500) NULL,
    ADD COLUMN `pay_day_of_month` TINYINT UNSIGNED NULL,
    ADD COLUMN `pay_frequency` ENUM('MONTHLY', 'BIWEEKLY', 'WEEKLY') NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN `probation_end_date` DATE NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `notes`,
    ADD COLUMN `admin_notes` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `attendance_records_source_checkin_request_id_key` ON `attendance_records`(`source_checkin_request_id`);

-- CreateIndex
CREATE UNIQUE INDEX `attendance_records_source_checkout_request_id_key` ON `attendance_records`(`source_checkout_request_id`);

-- CreateIndex
CREATE INDEX `notifications_recipient_user_id_type_idx` ON `notifications`(`recipient_user_id`, `type`);

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_adjusted_by_user_id_fkey` FOREIGN KEY (`adjusted_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_source_checkin_request_id_fkey` FOREIGN KEY (`source_checkin_request_id`) REFERENCES `attendance_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_source_checkout_request_id_fkey` FOREIGN KEY (`source_checkout_request_id`) REFERENCES `attendance_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
