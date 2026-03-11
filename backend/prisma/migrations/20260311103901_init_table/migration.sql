-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `head_employee_id` VARCHAR(30) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `departments_name_key`(`name`),
    INDEX `departments_head_employee_id_idx`(`head_employee_id`),
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
CREATE TABLE `employees` (
    `id` VARCHAR(30) NOT NULL,
    `employee_code` VARCHAR(50) NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `work_email` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(30) NULL,
    `department_id` VARCHAR(30) NULL,
    `job_title_id` VARCHAR(30) NULL,
    `manager_id` VARCHAR(30) NULL,
    `hire_date` DATE NOT NULL,
    `employment_status` ENUM('PROBATION', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deactivated_at` DATETIME(3) NULL,
    `deactivation_reason` TEXT NULL,
    `avatar_url` VARCHAR(2048) NULL,
    `notes` TEXT NULL,
    `created_by_user_id` VARCHAR(30) NULL,
    `updated_by_user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_employee_code_key`(`employee_code`),
    UNIQUE INDEX `employees_work_email_key`(`work_email`),
    INDEX `employees_full_name_idx`(`full_name`),
    INDEX `employees_department_id_idx`(`department_id`),
    INDEX `employees_job_title_id_idx`(`job_title_id`),
    INDEX `employees_manager_id_idx`(`manager_id`),
    INDEX `employees_employment_status_is_active_idx`(`employment_status`, `is_active`),
    INDEX `employees_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `employees_updated_by_user_id_idx`(`updated_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_profiles` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED') NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `ward` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_relationship` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(30) NULL,
    `emergency_contact_email` VARCHAR(191) NULL,
    `bank_name` VARCHAR(191) NULL,
    `bank_account_number` VARCHAR(100) NULL,
    `bank_account_holder` VARCHAR(191) NULL,
    `bank_branch` VARCHAR(191) NULL,
    `tax_code` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_profiles_employee_id_key`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_types` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_types_code_key`(`code`),
    UNIQUE INDEX `leave_types_name_key`(`name`),
    INDEX `leave_types_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `leave_type_id` VARCHAR(30) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `total_days` DECIMAL(5, 2) NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `current_step` ENUM('MANAGER', 'HR') NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `final_approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_requests_employee_id_status_idx`(`employee_id`, `status`),
    INDEX `leave_requests_leave_type_id_idx`(`leave_type_id`),
    INDEX `leave_requests_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_request_approvals` (
    `id` VARCHAR(30) NOT NULL,
    `leave_request_id` VARCHAR(30) NOT NULL,
    `approver_employee_id` VARCHAR(30) NOT NULL,
    `step_type` ENUM('MANAGER', 'HR') NOT NULL,
    `step_order` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `comment` TEXT NULL,
    `action_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `leave_request_approvals_approver_employee_id_status_idx`(`approver_employee_id`, `status`),
    UNIQUE INDEX `leave_request_approvals_leave_request_id_step_type_key`(`leave_request_id`, `step_type`),
    UNIQUE INDEX `leave_request_approvals_leave_request_id_step_order_key`(`leave_request_id`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `work_date` DATE NOT NULL,
    `check_in_at` DATETIME(3) NULL,
    `check_out_at` DATETIME(3) NULL,
    `total_work_minutes` INTEGER NULL,
    `status` ENUM('CHECKED_IN', 'COMPLETED', 'ABSENT', 'MANUAL_ADJUSTED') NOT NULL DEFAULT 'CHECKED_IN',
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `attendance_records_work_date_idx`(`work_date`),
    INDEX `attendance_records_employee_id_status_idx`(`employee_id`, `status`),
    UNIQUE INDEX `attendance_records_employee_id_work_date_key`(`employee_id`, `work_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(30) NOT NULL,
    `project_code` VARCHAR(50) NULL,
    `project_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `project_manager_employee_id` VARCHAR(30) NULL,
    `status` ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'PLANNING',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NULL,
    `health_status` ENUM('ON_TRACK', 'AT_RISK', 'DELAYED') NULL,
    `progress_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `actual_end_date` DATE NULL,
    `budget_amount` DECIMAL(18, 2) NULL,
    `client_name` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_project_code_key`(`project_code`),
    INDEX `projects_project_manager_employee_id_idx`(`project_manager_employee_id`),
    INDEX `projects_status_is_active_idx`(`status`, `is_active`),
    INDEX `projects_health_status_idx`(`health_status`),
    INDEX `projects_priority_idx`(`priority`),
    INDEX `projects_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_project_assignments` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `role_in_project` VARCHAR(100) NULL,
    `allocation_percent` DECIMAL(5, 2) NULL,
    `joined_at` DATE NOT NULL,
    `left_at` DATE NULL,
    `status` ENUM('ACTIVE', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_billable` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_project_assignments_employee_id_status_idx`(`employee_id`, `status`),
    INDEX `employee_project_assignments_project_id_status_idx`(`project_id`, `status`),
    UNIQUE INDEX `employee_project_assignments_employee_id_project_id_joined_a_key`(`employee_id`, `project_id`, `joined_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_milestones` (
    `id` VARCHAR(30) NOT NULL,
    `project_id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `owner_employee_id` VARCHAR(30) NULL,
    `due_date` DATE NULL,
    `completed_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_milestones_project_id_status_idx`(`project_id`, `status`),
    INDEX `project_milestones_owner_employee_id_idx`(`owner_employee_id`),
    INDEX `project_milestones_due_date_idx`(`due_date`),
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
    `locked_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payroll_periods_period_code_key`(`period_code`),
    INDEX `payroll_periods_status_idx`(`status`),
    UNIQUE INDEX `payroll_periods_month_year_key`(`month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_compensations` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `salary_type` ENUM('MONTHLY', 'DAILY', 'HOURLY') NOT NULL,
    `base_salary` DECIMAL(18, 2) NOT NULL,
    `standard_working_days` INTEGER NULL,
    `standard_working_hours` DECIMAL(5, 2) NULL,
    `currency` VARCHAR(10) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_compensations_employee_id_is_active_idx`(`employee_id`, `is_active`),
    UNIQUE INDEX `employee_compensations_employee_id_effective_from_key`(`employee_id`, `effective_from`),
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
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `salary_components_code_key`(`code`),
    UNIQUE INDEX `salary_components_name_key`(`name`),
    INDEX `salary_components_component_type_is_active_idx`(`component_type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_salary_components` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `salary_component_id` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `employee_salary_components_employee_id_is_active_idx`(`employee_id`, `is_active`),
    INDEX `employee_salary_components_salary_component_id_idx`(`salary_component_id`),
    UNIQUE INDEX `employee_salary_components_employee_id_salary_component_id_e_key`(`employee_id`, `salary_component_id`, `effective_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_records` (
    `id` VARCHAR(30) NOT NULL,
    `payroll_period_id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `base_salary` DECIMAL(18, 2) NOT NULL,
    `working_days` DECIMAL(5, 2) NULL,
    `paid_leave_days` DECIMAL(5, 2) NULL,
    `unpaid_leave_days` DECIMAL(5, 2) NULL,
    `gross_salary` DECIMAL(18, 2) NOT NULL,
    `total_allowances` DECIMAL(18, 2) NOT NULL,
    `total_bonus` DECIMAL(18, 2) NOT NULL,
    `total_deductions` DECIMAL(18, 2) NOT NULL,
    `net_salary` DECIMAL(18, 2) NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'PAID', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `generated_at` DATETIME(3) NULL,
    `approved_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_records_employee_id_status_idx`(`employee_id`, `status`),
    INDEX `payroll_records_payroll_period_id_status_idx`(`payroll_period_id`, `status`),
    UNIQUE INDEX `payroll_records_payroll_period_id_employee_id_key`(`payroll_period_id`, `employee_id`),
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
    `source_type` ENUM('BASE', 'ALLOWANCE', 'BONUS', 'ATTENDANCE', 'LEAVE', 'MANUAL', 'TAX', 'INSURANCE') NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_record_items_payroll_record_id_idx`(`payroll_record_id`),
    INDEX `payroll_record_items_salary_component_id_idx`(`salary_component_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_adjustments` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NOT NULL,
    `payroll_period_id` VARCHAR(30) NULL,
    `adjustment_type` ENUM('BONUS', 'DEDUCTION', 'ADVANCE', 'REIMBURSEMENT') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING',
    `created_by_user_id` VARCHAR(30) NULL,
    `approved_by_user_id` VARCHAR(30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payroll_adjustments_employee_id_status_idx`(`employee_id`, `status`),
    INDEX `payroll_adjustments_payroll_period_id_idx`(`payroll_period_id`),
    INDEX `payroll_adjustments_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `payroll_adjustments_approved_by_user_id_idx`(`approved_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(30) NOT NULL,
    `employee_id` VARCHAR(30) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `full_name` VARCHAR(191) NULL,
    `avatar_url` VARCHAR(2048) NULL,
    `account_status` ENUM('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `must_change_password` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(3) NULL,
    `failed_login_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_employee_id_key`(`employee_id`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_account_status_is_active_idx`(`account_status`, `is_active`),
    INDEX `users_employee_id_idx`(`employee_id`),
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
CREATE TABLE `notifications` (
    `id` VARCHAR(30) NOT NULL,
    `recipient_user_id` VARCHAR(30) NOT NULL,
    `sender_user_id` VARCHAR(30) NULL,
    `type` ENUM('LEAVE_REQUEST_CREATED', 'LEAVE_REQUEST_APPROVED', 'LEAVE_REQUEST_REJECTED', 'LEAVE_REQUEST_NEEDS_HR_REVIEW', 'PROJECT_ASSIGNED', 'PAYROLL_READY', 'GENERAL') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `related_entity_type` VARCHAR(50) NULL,
    `related_entity_id` VARCHAR(30) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notifications_recipient_user_id_is_read_idx`(`recipient_user_id`, `is_read`),
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_sender_user_id_idx`(`sender_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(30) NOT NULL,
    `entity_type` ENUM('EMPLOYEE', 'EMPLOYEE_PROFILE', 'DEPARTMENT', 'JOB_TITLE', 'LEAVE_TYPE', 'LEAVE_REQUEST', 'LEAVE_REQUEST_APPROVAL', 'ATTENDANCE', 'PROJECT', 'PROJECT_ASSIGNMENT', 'PROJECT_MILESTONE', 'PAYROLL_PERIOD', 'EMPLOYEE_COMPENSATION', 'SALARY_COMPONENT', 'EMPLOYEE_SALARY_COMPONENT', 'PAYROLL_RECORD', 'PAYROLL_RECORD_ITEM', 'PAYROLL_ADJUSTMENT', 'USER', 'USER_ROLE', 'AUTH_TOKEN', 'USER_SESSION', 'NOTIFICATION') NOT NULL,
    `entity_id` VARCHAR(30) NOT NULL,
    `action_type` ENUM('CREATE', 'UPDATE', 'DEACTIVATE', 'APPROVE', 'REJECT', 'CHECK_IN', 'CHECK_OUT', 'ASSIGN', 'REMOVE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'PASSWORD_SET', 'PASSWORD_RESET') NOT NULL,
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
ALTER TABLE `departments` ADD CONSTRAINT `departments_head_employee_id_fkey` FOREIGN KEY (`head_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `job_titles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_profiles` ADD CONSTRAINT `employee_profiles_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_approvals` ADD CONSTRAINT `leave_request_approvals_leave_request_id_fkey` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_request_approvals` ADD CONSTRAINT `leave_request_approvals_approver_employee_id_fkey` FOREIGN KEY (`approver_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_project_manager_employee_id_fkey` FOREIGN KEY (`project_manager_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_assignments` ADD CONSTRAINT `employee_project_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_assignments` ADD CONSTRAINT `employee_project_assignments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_milestones` ADD CONSTRAINT `project_milestones_owner_employee_id_fkey` FOREIGN KEY (`owner_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_compensations` ADD CONSTRAINT `employee_compensations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_components` ADD CONSTRAINT `employee_salary_components_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_salary_components` ADD CONSTRAINT `employee_salary_components_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_record_items` ADD CONSTRAINT `payroll_record_items_payroll_record_id_fkey` FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_record_items` ADD CONSTRAINT `payroll_record_items_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_adjustments` ADD CONSTRAINT `payroll_adjustments_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_tokens` ADD CONSTRAINT `auth_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
