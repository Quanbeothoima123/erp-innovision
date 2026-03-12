-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `head_user_id` VARCHAR(30) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    INDEX `departments_head_user_id_idx`(`head_user_id`),
    INDEX `departments_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_titles` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `job_titles_code_key`(`code`),
    UNIQUE INDEX `job_titles_name_key`(`name`),
    INDEX `job_titles_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(30) NOT NULL,
    `user_code` VARCHAR(50) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(30) NULL,
    `avatar_url` VARCHAR(2048) NULL,
    `department_id` VARCHAR(30) NULL,
    `job_title_id` VARCHAR(30) NULL,
    `manager_id` VARCHAR(30) NULL,
    `hire_date` DATE NULL,
    `employment_status` ENUM('PROBATION', 'ACTIVE', 'ON_LEAVE', 'TERMINATED') NOT NULL DEFAULT 'PROBATION',
    `account_status` ENUM('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `failed_login_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `terminated_at` DATETIME(3) NULL,
    `termination_reason` TEXT NULL,
    `created_by_user_id` VARCHAR(30) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_user_code_key`(`user_code`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_account_status_employment_status_idx`(`account_status`, `employment_status`),
    INDEX `users_department_id_idx`(`department_id`),
    INDEX `users_manager_id_idx`(`manager_id`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED') NULL,
    `place_of_birth` VARCHAR(191) NULL,
    `nationality` VARCHAR(100) NULL DEFAULT 'Vietnamese',
    `ethnicity` VARCHAR(100) NULL,
    `permanent_address` VARCHAR(500) NULL,
    `current_address` VARCHAR(500) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `national_id_number` VARCHAR(50) NULL,
    `national_id_issue_date` DATE NULL,
    `national_id_issue_place` VARCHAR(191) NULL,
    `passport_number` VARCHAR(50) NULL,
    `passport_expiry` DATE NULL,
    `tax_code` VARCHAR(50) NULL,
    `social_insurance_number` VARCHAR(50) NULL,
    `health_insurance_number` VARCHAR(50) NULL,
    `health_insurance_expiry` DATE NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_branch` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(100) NULL,
    `bank_account_holder` VARCHAR(191) NULL,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_phone` VARCHAR(30) NULL,
    `emergency_contact_rel` VARCHAR(100) NULL,
    `dependant_count` INTEGER NOT NULL DEFAULT 0,
    `education_level` VARCHAR(100) NULL,
    `education_major` VARCHAR(191) NULL,
    `university` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `user_profiles_national_id_number_key`(`national_id_number`),
    UNIQUE INDEX `user_profiles_tax_code_key`(`tax_code`),
    UNIQUE INDEX `user_profiles_social_insurance_number_key`(`social_insurance_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `role_id` VARCHAR(30) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_role_id_idx`(`role_id`),
    UNIQUE INDEX `user_roles_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_tokens` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `token_type` ENUM('ACCOUNT_SETUP', 'PASSWORD_RESET') NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_tokens_token_hash_key`(`token_hash`),
    INDEX `auth_tokens_user_id_token_type_idx`(`user_id`, `token_type`),
    INDEX `auth_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `refresh_token_hash` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(1024) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_refresh_token_hash_key`(`refresh_token_hash`),
    INDEX `user_sessions_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_types` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `max_days_per_year` DECIMAL(5, 2) NULL,
    `requires_document` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_types_code_key`(`code`),
    UNIQUE INDEX `leave_types_name_key`(`name`),
    INDEX `leave_types_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
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

    INDEX `leave_balances_user_id_year_idx`(`user_id`, `year`),
    UNIQUE INDEX `leave_balances_user_id_leave_type_id_year_key`(`user_id`, `leave_type_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `leave_type_id` VARCHAR(30) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_days` DECIMAL(5, 2) NOT NULL,
    `is_half_day` BOOLEAN NOT NULL DEFAULT false,
    `half_day_period` VARCHAR(10) NULL,
    `reason` TEXT NULL,
    `document_url` VARCHAR(2048) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `current_step` ENUM('MANAGER', 'HR') NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `final_approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_requests_user_id_status_idx`(`user_id`, `status`),
    INDEX `leave_requests_leave_type_id_idx`(`leave_type_id`),
    INDEX `leave_requests_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_request_approvals` (
    `id` VARCHAR(30) NOT NULL,
    `leave_request_id` VARCHAR(30) NOT NULL,
    `approver_user_id` VARCHAR(30) NOT NULL,
    `step_type` ENUM('MANAGER', 'HR') NOT NULL,
    `step_order` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `comment` TEXT NULL,
    `action_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_request_approvals_approver_user_id_status_idx`(`approver_user_id`, `status`),
    UNIQUE INDEX `leave_request_approvals_leave_request_id_step_type_key`(`leave_request_id`, `step_type`),
    UNIQUE INDEX `leave_request_approvals_leave_request_id_step_order_key`(`leave_request_id`, `step_order`),
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
CREATE TABLE `attendance_requests` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `reviewer_id` VARCHAR(30) NULL,
    `request_type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
    `requested_at` DATETIME(3) NOT NULL,
    `work_date` DATE NOT NULL,
    `shift_id` VARCHAR(30) NULL,
    `is_remote_work` BOOLEAN NOT NULL DEFAULT false,
    `note` TEXT NULL,
    `image_url` VARCHAR(2048) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewed_at` DATETIME(3) NULL,
    `reject_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendance_requests_user_id_status_idx`(`user_id`, `status`),
    INDEX `attendance_requests_work_date_idx`(`work_date`),
    INDEX `attendance_requests_request_type_status_idx`(`request_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `shift_id` VARCHAR(30) NULL,
    `work_date` DATE NOT NULL,
    `check_in_at` DATETIME(3) NULL,
    `check_out_at` DATETIME(3) NULL,
    `total_work_minutes` INTEGER NULL,
    `late_minutes` INTEGER NOT NULL DEFAULT 0,
    `early_leave_minutes` INTEGER NOT NULL DEFAULT 0,
    `overtime_minutes` INTEGER NOT NULL DEFAULT 0,
    `overtime_approved_minutes` INTEGER NOT NULL DEFAULT 0,
    `is_holiday_work` BOOLEAN NOT NULL DEFAULT false,
    `is_weekend_work` BOOLEAN NOT NULL DEFAULT false,
    `is_remote_work` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY', 'MANUAL_ADJUSTED') NOT NULL DEFAULT 'PRESENT',
    `note` TEXT NULL,
    `adjusted_by_user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendance_records_work_date_idx`(`work_date`),
    INDEX `attendance_records_user_id_status_idx`(`user_id`, `status`),
    UNIQUE INDEX `attendance_records_user_id_work_date_key`(`user_id`, `work_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overtime_requests` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `approver_user_id` VARCHAR(30) NULL,
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

    INDEX `overtime_requests_user_id_status_idx`(`user_id`, `status`),
    INDEX `overtime_requests_work_date_idx`(`work_date`),
    INDEX `overtime_requests_approver_user_id_idx`(`approver_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(30) NOT NULL,
    `project_code` VARCHAR(50) NULL,
    `project_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `project_manager_user_id` VARCHAR(30) NULL,
    `client_id` VARCHAR(30) NULL,
    `contract_id` VARCHAR(30) NULL,
    `status` ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'PLANNING',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NULL,
    `health_status` ENUM('ON_TRACK', 'AT_RISK', 'DELAYED') NULL,
    `progress_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `actual_end_date` DATE NULL,
    `budget_amount` DECIMAL(18, 2) NULL,
    `spent_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `contract_value` DECIMAL(18, 2) NULL,
    `invoiced_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `closed_at` DATETIME(3) NULL,
    `closure_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_project_code_key`(`project_code`),
    INDEX `projects_project_manager_user_id_idx`(`project_manager_user_id`),
    INDEX `projects_client_id_idx`(`client_id`),
    INDEX `projects_contract_id_idx`(`contract_id`),
    INDEX `projects_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_project_assignments` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `role_in_project` VARCHAR(100) NULL,
    `allocation_percent` DECIMAL(5, 2) NULL,
    `hourly_rate` DECIMAL(18, 2) NULL,
    `joined_at` DATE NOT NULL,
    `left_at` DATE NULL,
    `status` ENUM('ACTIVE', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_billable` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_project_assignments_user_id_status_idx`(`user_id`, `status`),
    INDEX `user_project_assignments_project_id_status_idx`(`project_id`, `status`),
    UNIQUE INDEX `user_project_assignments_user_id_project_id_joined_at_key`(`user_id`, `project_id`, `joined_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_milestones` (
    `id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `owner_user_id` VARCHAR(30) NULL,
    `due_date` DATE NULL,
    `completed_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `invoice_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_milestones_project_id_status_idx`(`project_id`, `status`),
    INDEX `project_milestones_owner_user_id_idx`(`owner_user_id`),
    INDEX `project_milestones_due_date_idx`(`due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_expenses` (
    `id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `submitted_by_user_id` VARCHAR(30) NOT NULL,
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
    `reject_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_expenses_project_id_status_idx`(`project_id`, `status`),
    INDEX `project_expenses_submitted_by_user_id_idx`(`submitted_by_user_id`),
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
CREATE TABLE `payroll_periods` (
    `id` VARCHAR(30) NOT NULL,
    `period_code` VARCHAR(50) NOT NULL,
    `month` TINYINT UNSIGNED NOT NULL,
    `year` SMALLINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `pay_date` DATE NULL,
    `status` ENUM('DRAFT', 'CALCULATING', 'APPROVED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `working_days_in_period` INTEGER NULL,
    `standard_working_minutes` INTEGER NULL,
    `locked_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `approved_by_user_id` VARCHAR(30) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payroll_periods_period_code_key`(`period_code`),
    INDEX `payroll_periods_status_idx`(`status`),
    UNIQUE INDEX `payroll_periods_month_year_key`(`month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_compensations` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `salary_type` ENUM('MONTHLY', 'DAILY', 'HOURLY') NOT NULL,
    `base_salary` DECIMAL(18, 2) NOT NULL,
    `probation_salary` DECIMAL(18, 2) NULL,
    `standard_working_days` INTEGER NULL,
    `standard_working_hours` DECIMAL(5, 2) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `overtime_rate_weekday` DECIMAL(3, 1) NOT NULL DEFAULT 1.5,
    `overtime_rate_weekend` DECIMAL(3, 1) NOT NULL DEFAULT 2.0,
    `overtime_rate_holiday` DECIMAL(3, 1) NOT NULL DEFAULT 3.0,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_compensations_user_id_is_active_idx`(`user_id`, `is_active`),
    UNIQUE INDEX `user_compensations_user_id_effective_from_key`(`user_id`, `effective_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_components` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `component_type` ENUM('EARNING', 'DEDUCTION') NOT NULL,
    `calculation_type` ENUM('FIXED', 'FORMULA', 'MANUAL') NOT NULL,
    `is_taxable` BOOLEAN NOT NULL DEFAULT false,
    `is_insurable` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salary_components_code_key`(`code`),
    UNIQUE INDEX `salary_components_name_key`(`name`),
    INDEX `salary_components_component_type_is_active_idx`(`component_type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_salary_components` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `salary_component_id` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_salary_components_user_id_is_active_idx`(`user_id`, `is_active`),
    UNIQUE INDEX `user_salary_components_user_id_salary_component_id_effective_key`(`user_id`, `salary_component_id`, `effective_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` VARCHAR(30) NOT NULL,
    `payroll_period_id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `base_salary` DECIMAL(18, 2) NOT NULL,
    `working_days` DECIMAL(5, 2) NULL,
    `paid_leave_days` DECIMAL(5, 2) NULL,
    `unpaid_leave_days` DECIMAL(5, 2) NULL,
    `absent_days` DECIMAL(5, 2) NULL,
    `late_days` INTEGER NOT NULL DEFAULT 0,
    `overtime_weekday_minutes` INTEGER NOT NULL DEFAULT 0,
    `overtime_weekend_minutes` INTEGER NOT NULL DEFAULT 0,
    `overtime_holiday_minutes` INTEGER NOT NULL DEFAULT 0,
    `total_overtime_pay` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `gross_salary` DECIMAL(18, 2) NOT NULL,
    `total_allowances` DECIMAL(18, 2) NOT NULL,
    `total_bonus` DECIMAL(18, 2) NOT NULL,
    `social_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `health_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `unemployment_insurance_employee` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `personal_income_tax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxable_income` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_deductions` DECIMAL(18, 2) NOT NULL,
    `net_salary` DECIMAL(18, 2) NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'PAID', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `daily_rate` DECIMAL(18, 2) NULL,
    `hourly_rate` DECIMAL(18, 2) NULL,
    `generated_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `payment_ref` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_records_user_id_status_idx`(`user_id`, `status`),
    INDEX `payroll_records_payroll_period_id_status_idx`(`payroll_period_id`, `status`),
    UNIQUE INDEX `payroll_records_payroll_period_id_user_id_key`(`payroll_period_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_record_items` (
    `id` VARCHAR(30) NOT NULL,
    `payroll_record_id` VARCHAR(30) NOT NULL,
    `salary_component_id` VARCHAR(30) NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `item_type` ENUM('EARNING', 'DEDUCTION') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `source_type` ENUM('BASE', 'ALLOWANCE', 'BONUS', 'OVERTIME', 'ATTENDANCE', 'LEAVE', 'MANUAL', 'TAX', 'INSURANCE', 'ADVANCE') NULL,
    `quantity` DECIMAL(10, 2) NULL,
    `unit_rate` DECIMAL(18, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_record_items_payroll_record_id_idx`(`payroll_record_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_adjustments` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` VARCHAR(30) NOT NULL,
    `payroll_period_id` VARCHAR(30) NULL,
    `adjustment_type` ENUM('BONUS', 'DEDUCTION', 'ADVANCE', 'REIMBURSEMENT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
    `is_advance` BOOLEAN NOT NULL DEFAULT false,
    `advance_recovered_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `advance_fully_recovered` BOOLEAN NOT NULL DEFAULT false,
    `created_by_user_id` VARCHAR(30) NULL,
    `approved_by_user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_adjustments_user_id_status_idx`(`user_id`, `status`),
    INDEX `payroll_adjustments_payroll_period_id_idx`(`payroll_period_id`),
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
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(30) NULL,
    `address` VARCHAR(500) NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'Vietnam',
    `account_manager_user_id` VARCHAR(30) NULL,
    `total_contract_value` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `total_received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `outstanding_balance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_client_code_key`(`client_code`),
    INDEX `clients_status_idx`(`status`),
    INDEX `clients_account_manager_user_id_idx`(`account_manager_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` VARCHAR(30) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `job_title` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(30) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_contacts_client_id_idx`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` VARCHAR(30) NOT NULL,
    `contract_code` VARCHAR(50) NOT NULL,
    `client_id` VARCHAR(30) NOT NULL,
    `contract_type` ENUM('FIXED_PRICE', 'TIME_AND_MATERIAL', 'RETAINER', 'MILESTONE_BASED', 'MIXED') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_SIGN', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'SUSPENDED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `total_value` DECIMAL(18, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `received_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `remaining_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `signed_date` DATE NULL,
    `signed_by_user_id` VARCHAR(30) NULL,
    `termination_date` DATE NULL,
    `termination_reason` TEXT NULL,
    `file_url` VARCHAR(2048) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_contract_code_key`(`contract_code`),
    INDEX `contracts_client_id_status_idx`(`client_id`, `status`),
    INDEX `contracts_end_date_status_idx`(`end_date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_amendments` (
    `id` VARCHAR(30) NOT NULL,
    `contract_id` VARCHAR(30) NOT NULL,
    `amendment_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `value_change` DECIMAL(18, 2) NULL,
    `effective_date` DATE NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_SIGN', 'SIGNED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `file_url` VARCHAR(2048) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contract_amendments_contract_id_idx`(`contract_id`),
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
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `tax_amount` DECIMAL(18, 2) NOT NULL,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `paid_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `outstanding_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `notes` TEXT NULL,
    `created_by_user_id` VARCHAR(30) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_code_key`(`invoice_code`),
    INDEX `invoices_client_id_status_idx`(`client_id`, `status`),
    INDEX `invoices_contract_id_idx`(`contract_id`),
    INDEX `invoices_due_date_status_idx`(`due_date`, `status`),
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(30) NOT NULL,
    `recipient_user_id` VARCHAR(30) NOT NULL,
    `sender_user_id` VARCHAR(30) NULL,
    `type` ENUM('ATTENDANCE_CHECKIN_REQUEST', 'ATTENDANCE_CHECKOUT_REQUEST', 'ATTENDANCE_REQUEST_APPROVED', 'ATTENDANCE_REQUEST_REJECTED', 'LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_BALANCE_LOW', 'OVERTIME_REQUEST_CREATED', 'OVERTIME_APPROVED', 'OVERTIME_REJECTED', 'PROJECT_ASSIGNED', 'PROJECT_STATUS_CHANGED', 'MILESTONE_DUE_SOON', 'PAYROLL_READY', 'PAYSLIP_AVAILABLE', 'CONTRACT_SIGNED', 'CONTRACT_EXPIRING_SOON', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'INVOICE_OVERDUE', 'GENERAL') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `related_entity_type` VARCHAR(50) NULL,
    `related_entity_id` VARCHAR(30) NULL,
    `action_url` VARCHAR(2048) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notifications_recipient_user_id_is_read_idx`(`recipient_user_id`, `is_read`),
    INDEX `notifications_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(30) NOT NULL,
    `entity_type` ENUM('USER', 'USER_PROFILE', 'DEPARTMENT', 'JOB_TITLE', 'LEAVE_TYPE', 'LEAVE_REQUEST', 'LEAVE_BALANCE', 'ATTENDANCE_RECORD', 'ATTENDANCE_REQUEST', 'WORK_SHIFT', 'HOLIDAY', 'OVERTIME_REQUEST', 'PROJECT', 'PROJECT_ASSIGNMENT', 'PROJECT_MILESTONE', 'PROJECT_EXPENSE', 'PAYROLL_PERIOD', 'USER_COMPENSATION', 'SALARY_COMPONENT', 'USER_SALARY_COMPONENT', 'PAYROLL_RECORD', 'PAYROLL_ADJUSTMENT', 'INSURANCE_POLICY', 'TAX_POLICY', 'CLIENT', 'CLIENT_CONTACT', 'CONTRACT', 'CONTRACT_AMENDMENT', 'INVOICE', 'CLIENT_PAYMENT', 'CLIENT_DOCUMENT', 'USER_ROLE', 'NOTIFICATION') NOT NULL,
    `entity_id` VARCHAR(30) NOT NULL,
    `action_type` ENUM('CREATE', 'UPDATE', 'DEACTIVATE', 'APPROVE', 'REJECT', 'ASSIGN', 'REMOVE', 'STATUS_CHANGE', 'SEND', 'PAYMENT', 'CANCEL', 'SIGN', 'LOGIN', 'LOGOUT', 'PASSWORD_SET', 'PASSWORD_RESET') NOT NULL,
    `actor_user_id` VARCHAR(30) NULL,
    `description` TEXT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(1024) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    INDEX `audit_logs_actor_user_id_idx`(`actor_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_head_user_id_fkey` FOREIGN KEY (`head_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `job_titles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_tokens` ADD CONSTRAINT `auth_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_approvals` ADD CONSTRAINT `leave_request_approvals_leave_request_id_fkey` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_approvals` ADD CONSTRAINT `leave_request_approvals_approver_user_id_fkey` FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_requests` ADD CONSTRAINT `attendance_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_requests` ADD CONSTRAINT `attendance_requests_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_requests` ADD CONSTRAINT `attendance_requests_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overtime_requests` ADD CONSTRAINT `overtime_requests_approver_user_id_fkey` FOREIGN KEY (`approver_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_project_manager_user_id_fkey` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_project_assignments` ADD CONSTRAINT `user_project_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_project_assignments` ADD CONSTRAINT `user_project_assignments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_submitted_by_user_id_fkey` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_expenses` ADD CONSTRAINT `project_expenses_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_brackets` ADD CONSTRAINT `tax_brackets_tax_policy_id_fkey` FOREIGN KEY (`tax_policy_id`) REFERENCES `tax_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_periods` ADD CONSTRAINT `payroll_periods_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_compensations` ADD CONSTRAINT `user_compensations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_salary_components` ADD CONSTRAINT `user_salary_components_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_salary_components` ADD CONSTRAINT `user_salary_components_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_record_items` ADD CONSTRAINT `payroll_record_items_payroll_record_id_fkey` FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_record_items` ADD CONSTRAINT `payroll_record_items_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_account_manager_user_id_fkey` FOREIGN KEY (`account_manager_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_signed_by_user_id_fkey` FOREIGN KEY (`signed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_amendments` ADD CONSTRAINT `contract_amendments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
