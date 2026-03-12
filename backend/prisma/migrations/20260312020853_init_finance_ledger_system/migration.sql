/*
  Warnings:

  - You are about to drop the column `client_name` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `attendance_records` ADD COLUMN `early_leave_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `is_holiday_work` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_remote_work` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_weekend_work` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `late_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `overtime_approved_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `overtime_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `shift_id` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `audit_logs` MODIFY `entity_type` ENUM('EMPLOYEE', 'EMPLOYEE_PROFILE', 'DEPARTMENT', 'JOB_TITLE', 'LEAVE_TYPE', 'LEAVE_REQUEST', 'LEAVE_REQUEST_APPROVAL', 'LEAVE_BALANCE', 'ATTENDANCE', 'WORK_SHIFT', 'HOLIDAY', 'OVERTIME_REQUEST', 'PROJECT', 'PROJECT_ASSIGNMENT', 'PROJECT_MILESTONE', 'PROJECT_EXPENSE', 'PAYROLL_PERIOD', 'EMPLOYEE_COMPENSATION', 'SALARY_COMPONENT', 'EMPLOYEE_SALARY_COMPONENT', 'PAYROLL_RECORD', 'PAYROLL_RECORD_ITEM', 'PAYROLL_ADJUSTMENT', 'INSURANCE_POLICY', 'TAX_POLICY', 'CLIENT', 'CLIENT_CONTACT', 'CONTRACT', 'CONTRACT_AMENDMENT', 'INVOICE', 'INVOICE_ITEM', 'CLIENT_PAYMENT', 'CLIENT_DOCUMENT', 'USER', 'USER_ROLE', 'AUTH_TOKEN', 'USER_SESSION', 'NOTIFICATION') NOT NULL,
    MODIFY `action_type` ENUM('CREATE', 'UPDATE', 'DEACTIVATE', 'APPROVE', 'REJECT', 'CHECK_IN', 'CHECK_OUT', 'ASSIGN', 'REMOVE', 'STATUS_CHANGE', 'SEND', 'PAYMENT', 'CANCEL', 'SIGN', 'LOGIN', 'LOGOUT', 'PASSWORD_SET', 'PASSWORD_RESET') NOT NULL;

-- AlterTable
ALTER TABLE `employee_compensations` ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `overtime_rate_holiday` DECIMAL(3, 1) NOT NULL DEFAULT 3.0,
    ADD COLUMN `overtime_rate_weekday` DECIMAL(3, 1) NOT NULL DEFAULT 1.5,
    ADD COLUMN `overtime_rate_weekend` DECIMAL(3, 1) NOT NULL DEFAULT 2.0,
    ADD COLUMN `probation_salary` DECIMAL(18, 2) NULL;

-- AlterTable
ALTER TABLE `employee_profiles` ADD COLUMN `bank_swift_code` VARCHAR(20) NULL,
    ADD COLUMN `dependant_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `health_insurance_expiry` DATE NULL,
    ADD COLUMN `health_insurance_number` VARCHAR(50) NULL,
    ADD COLUMN `national_id_issued` DATE NULL,
    ADD COLUMN `national_id_number` VARCHAR(50) NULL,
    ADD COLUMN `national_id_place` VARCHAR(191) NULL,
    ADD COLUMN `passport_expiry` DATE NULL,
    ADD COLUMN `passport_number` VARCHAR(50) NULL,
    ADD COLUMN `social_insurance_number` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `employee_project_assignments` ADD COLUMN `hourly_rate` DECIMAL(18, 2) NULL;

-- AlterTable
ALTER TABLE `leave_requests` ADD COLUMN `cancel_reason` TEXT NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `document_url` VARCHAR(2048) NULL,
    ADD COLUMN `half_day_period` VARCHAR(10) NULL,
    ADD COLUMN `is_half_day` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `leave_types` ADD COLUMN `carry_over_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `is_half_day_allowed` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `max_days_per_request` INTEGER NULL,
    ADD COLUMN `max_days_per_year` INTEGER NULL,
    ADD COLUMN `min_days_notice` INTEGER NULL,
    ADD COLUMN `requires_approval` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `requires_document` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `action_url` VARCHAR(2048) NULL,
    MODIFY `type` ENUM('LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_REQUEST_NEEDS_HR_REVIEW', 'LEAVE_BALANCE_LOW', 'OVERTIME_REQUEST_CREATED', 'OVERTIME_APPROVED', 'OVERTIME_REJECTED', 'PROJECT_ASSIGNED', 'PROJECT_STATUS_CHANGED', 'MILESTONE_DUE_SOON', 'PAYROLL_READY', 'PAYSLIP_AVAILABLE', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRING_SOON', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'INVOICE_OVERDUE', 'GENERAL') NOT NULL;

-- AlterTable
ALTER TABLE `payroll_adjustments` ADD COLUMN `advance_fully_recovered` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `advance_recovered_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `is_advance` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `payroll_periods` ADD COLUMN `approved_by_user_id` VARCHAR(30) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `standard_working_minutes` INTEGER NULL,
    ADD COLUMN `working_days_in_period` INTEGER NULL;

-- AlterTable
ALTER TABLE `payroll_record_items` ADD COLUMN `quantity` DECIMAL(10, 2) NULL,
    ADD COLUMN `unit_rate` DECIMAL(18, 2) NULL,
    MODIFY `source_type` ENUM('BASE', 'ALLOWANCE', 'BONUS', 'OVERTIME', 'ATTENDANCE', 'LEAVE', 'MANUAL', 'TAX', 'INSURANCE', 'ADVANCE') NULL;

-- AlterTable
ALTER TABLE `payroll_records` ADD COLUMN `absent_days` DECIMAL(5, 2) NULL,
    ADD COLUMN `daily_rate` DECIMAL(18, 2) NULL,
    ADD COLUMN `health_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `hourly_rate` DECIMAL(18, 2) NULL,
    ADD COLUMN `late_days` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `overtime_holiday_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `overtime_weekday_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `overtime_weekend_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `payment_ref` VARCHAR(191) NULL,
    ADD COLUMN `personal_income_tax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `social_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `taxable_income` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `total_overtime_pay` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `unemployment_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `project_milestones` ADD COLUMN `invoice_id` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `projects` DROP COLUMN `client_name`,
    ADD COLUMN `client_id` VARCHAR(30) NULL,
    ADD COLUMN `closed_at` DATETIME(3) NULL,
    ADD COLUMN `closure_note` TEXT NULL,
    ADD COLUMN `contract_id` VARCHAR(30) NULL,
    ADD COLUMN `contract_value` DECIMAL(18, 2) NULL,
    ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    ADD COLUMN `invoiced_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `spent_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `salary_components` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `display_order` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `leave_type_id` VARCHAR(30) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `entitled_days` DECIMAL(5, 2) NOT NULL,
    `carried_days` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `adjusted_days` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `used_days` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `pending_days` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `remaining_days` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_balances_employee_id_year_idx`(`employee_id`, `year`),
    INDEX `leave_balances_leave_type_id_idx`(`leave_type_id`),
    UNIQUE INDEX `leave_balances_employee_id_leave_type_id_year_key`(`employee_id`, `leave_type_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `is_recurring` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `overtime_multiplier` DECIMAL(3, 1) NOT NULL DEFAULT 3.0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `holidays_year_idx`(`year`),
    UNIQUE INDEX `holidays_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_shifts` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shift_type` ENUM('MORNING', 'AFTERNOON', 'NIGHT', 'FLEXIBLE', 'SPLIT') NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `break_minutes` INTEGER NOT NULL DEFAULT 60,
    `work_minutes` INTEGER NOT NULL,
    `is_night_shift` BOOLEAN NOT NULL DEFAULT false,
    `overtime_after_minutes` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `work_shifts_code_key`(`code`),
    UNIQUE INDEX `work_shifts_name_key`(`name`),
    INDEX `work_shifts_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtime_requests` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `approver_employee_id` VARCHAR(30) NULL,
    `work_date` DATE NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `planned_minutes` INTEGER NOT NULL,
    `actual_minutes` INTEGER NULL,
    `is_holiday` BOOLEAN NOT NULL DEFAULT false,
    `is_weekend` BOOLEAN NOT NULL DEFAULT false,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `action_at` DATETIME(3) NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `overtime_requests_employee_id_status_idx`(`employee_id`, `status`),
    INDEX `overtime_requests_work_date_idx`(`work_date`),
    INDEX `overtime_requests_approver_employee_id_idx`(`approver_employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_expenses` (
    `id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `submitted_by_employee_id` VARCHAR(30) NOT NULL,
    `approved_by_user_id` VARCHAR(30) NULL,
    `category` ENUM('LABOR', 'SOFTWARE', 'HARDWARE', 'TRAVEL', 'TRAINING', 'SUBCONTRACT', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `expense_date` DATE NOT NULL,
    `receipt_url` VARCHAR(2048) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED') NOT NULL DEFAULT 'PENDING',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `reject_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_expenses_project_id_status_idx`(`project_id`, `status`),
    INDEX `project_expenses_submitted_by_employee_id_idx`(`submitted_by_employee_id`),
    INDEX `project_expenses_expense_date_idx`(`expense_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `insurance_policies` (
    `id` VARCHAR(30) NOT NULL,
    `policy_type` ENUM('SOCIAL', 'HEALTH', 'UNEMPLOYMENT', 'ACCIDENT') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `employee_rate` DECIMAL(5, 4) NOT NULL,
    `employer_rate` DECIMAL(5, 4) NOT NULL,
    `salary_cap_amount` DECIMAL(18, 2) NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `insurance_policies_policy_type_is_active_idx`(`policy_type`, `is_active`),
    INDEX `insurance_policies_effective_from_idx`(`effective_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_policies` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `personal_deduction` DECIMAL(18, 2) NOT NULL,
    `dependant_deduction` DECIMAL(18, 2) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tax_policies_year_is_active_idx`(`year`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_brackets` (
    `id` VARCHAR(30) NOT NULL,
    `tax_policy_id` VARCHAR(30) NOT NULL,
    `bracket_order` INTEGER NOT NULL,
    `min_income` DECIMAL(18, 2) NOT NULL,
    `max_income` DECIMAL(18, 2) NULL,
    `tax_rate` DECIMAL(5, 4) NOT NULL,

    INDEX `tax_brackets_tax_policy_id_idx`(`tax_policy_id`),
    UNIQUE INDEX `tax_brackets_tax_policy_id_bracket_order_key`(`tax_policy_id`, `bracket_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(30) NOT NULL,
    `client_code` VARCHAR(50) NULL,
    `client_type` ENUM('INDIVIDUAL', 'COMPANY', 'GOVERNMENT', 'NGO') NOT NULL,
    `status` ENUM('PROSPECT', 'ACTIVE', 'INACTIVE', 'BLACKLISTED') NOT NULL DEFAULT 'PROSPECT',
    `company_name` VARCHAR(255) NOT NULL,
    `short_name` VARCHAR(100) NULL,
    `tax_code` VARCHAR(50) NULL,
    `industry` VARCHAR(100) NULL,
    `website` VARCHAR(2048) NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'Việt Nam',
    `postal_code` VARCHAR(20) NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(100) NULL,
    `bank_account_holder` VARCHAR(191) NULL,
    `bank_branch` VARCHAR(191) NULL,
    `bank_swift_code` VARCHAR(20) NULL,
    `account_manager_id` VARCHAR(30) NULL,
    `total_contract_value` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_invoiced_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `outstanding_balance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_client_code_key`(`client_code`),
    INDEX `clients_status_is_active_idx`(`status`, `is_active`),
    INDEX `clients_client_type_idx`(`client_type`),
    INDEX `clients_account_manager_id_idx`(`account_manager_id`),
    INDEX `clients_company_name_idx`(`company_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` VARCHAR(30) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `job_title` VARCHAR(191) NULL,
    `department` VARCHAR(100) NULL,
    `email` VARCHAR(191) NULL,
    `phone_number` VARCHAR(30) NULL,
    `phone_alt` VARCHAR(30) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_billing` BOOLEAN NOT NULL DEFAULT false,
    `is_technical` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_contacts_client_id_is_active_idx`(`client_id`, `is_active`),
    INDEX `client_contacts_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` VARCHAR(30) NOT NULL,
    `contract_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `contract_type` ENUM('FIXED_PRICE', 'TIME_AND_MATERIAL', 'RETAINER', 'MILESTONE_BASED', 'MIXED') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_SIGN', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'SUSPENDED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `total_value` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `vat_rate` DECIMAL(4, 2) NOT NULL DEFAULT 0.1,
    `vat_amount` DECIMAL(18, 2) NOT NULL,
    `total_with_vat` DECIMAL(18, 2) NOT NULL,
    `payment_term_days` INTEGER NULL,
    `retainer_amount` DECIMAL(18, 2) NULL,
    `signed_date` DATE NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `actual_end_date` DATE NULL,
    `invoiced_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `remaining_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `terms` LONGTEXT NULL,
    `internal_notes` TEXT NULL,
    `contract_file_url` VARCHAR(2048) NULL,
    `signed_by_user_id` VARCHAR(30) NULL,
    `handled_by_employee_id` VARCHAR(30) NULL,
    `terminated_at` DATETIME(3) NULL,
    `termination_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_contract_code_key`(`contract_code`),
    INDEX `contracts_client_id_status_idx`(`client_id`, `status`),
    INDEX `contracts_status_idx`(`status`),
    INDEX `contracts_start_date_end_date_idx`(`start_date`, `end_date`),
    INDEX `contracts_signed_by_user_id_idx`(`signed_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_amendments` (
    `id` VARCHAR(30) NOT NULL,
    `contract_id` VARCHAR(30) NOT NULL,
    `amendment_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_SIGN', 'SIGNED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `change_description` TEXT NULL,
    `value_change` DECIMAL(18, 2) NULL,
    `end_date_change` DATE NULL,
    `signed_date` DATE NULL,
    `effective_date` DATE NULL,
    `file_url` VARCHAR(2048) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contract_amendments_amendment_code_key`(`amendment_code`),
    INDEX `contract_amendments_contract_id_status_idx`(`contract_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(30) NOT NULL,
    `invoice_code` VARCHAR(50) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `contract_id` VARCHAR(30) NULL,
    `project_id` VARCHAR(30) NULL,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issued_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `paid_date` DATE NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `tax_rate` DECIMAL(4, 2) NOT NULL DEFAULT 0.1,
    `tax_amount` DECIMAL(18, 2) NOT NULL,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `paid_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `outstanding_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `vat_invoice_number` VARCHAR(50) NULL,
    `vat_invoice_date` DATE NULL,
    `vat_invoice_series` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `payment_instructions` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `viewed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `created_by_user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_code_key`(`invoice_code`),
    INDEX `invoices_client_id_status_idx`(`client_id`, `status`),
    INDEX `invoices_contract_id_idx`(`contract_id`),
    INDEX `invoices_project_id_idx`(`project_id`),
    INDEX `invoices_due_date_status_idx`(`due_date`, `status`),
    INDEX `invoices_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(30) NOT NULL,
    `invoice_id` VARCHAR(30) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit` VARCHAR(50) NULL,
    `unit_price` DECIMAL(18, 2) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `tax_rate` DECIMAL(4, 2) NOT NULL DEFAULT 0.1,
    `tax_amount` DECIMAL(18, 2) NOT NULL,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `invoice_items_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_payments` (
    `id` VARCHAR(30) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `contract_id` VARCHAR(30) NULL,
    `invoice_id` VARCHAR(30) NULL,
    `payment_code` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `exchange_rate` DECIMAL(18, 6) NOT NULL DEFAULT 1,
    `amount_in_vnd` DECIMAL(18, 2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `payment_method` ENUM('BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD', 'ONLINE', 'CRYPTO') NOT NULL,
    `reference_number` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `received_bank_name` VARCHAR(191) NULL,
    `received_account_number` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `confirmed_by_user_id` VARCHAR(30) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `receipt_url` VARCHAR(2048) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_payments_payment_code_key`(`payment_code`),
    INDEX `client_payments_client_id_status_idx`(`client_id`, `status`),
    INDEX `client_payments_contract_id_idx`(`contract_id`),
    INDEX `client_payments_invoice_id_idx`(`invoice_id`),
    INDEX `client_payments_payment_date_idx`(`payment_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_documents` (
    `id` VARCHAR(30) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `document_type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `file_url` VARCHAR(2048) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `uploaded_by_user_id` VARCHAR(30) NULL,
    `is_confidential` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_documents_client_id_document_type_idx`(`client_id`, `document_type`),
    INDEX `client_documents_uploaded_by_user_id_idx`(`uploaded_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `attendance_records_shift_id_idx` ON `attendance_records`(`shift_id`);

-- CreateIndex
CREATE INDEX `projects_client_id_idx` ON `projects`(`client_id`);

-- CreateIndex
CREATE INDEX `projects_contract_id_idx` ON `projects`(`contract_id`);

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_approver_employee_id_fkey` FOREIGN KEY (`approver_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_submitted_by_employee_id_fkey` FOREIGN KEY (`submitted_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_brackets` ADD CONSTRAINT `tax_brackets_tax_policy_id_fkey` FOREIGN KEY (`tax_policy_id`) REFERENCES `tax_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_periods` ADD CONSTRAINT `payroll_periods_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_account_manager_id_fkey` FOREIGN KEY (`account_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_signed_by_user_id_fkey` FOREIGN KEY (`signed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_amendments` ADD CONSTRAINT `contract_amendments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_payments` ADD CONSTRAINT `client_payments_confirmed_by_user_id_fkey` FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_documents` ADD CONSTRAINT `client_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
