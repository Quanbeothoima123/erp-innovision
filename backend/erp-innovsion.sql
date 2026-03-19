-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: erp-innovsion
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('917cee25-e63d-4d4e-ab8d-0f5f00c14245','ccc963aa88918c4225e1c36f5cf3bb5ebdc1bde68bb37dd6fd8e5e76af9b1652','2026-03-12 10:43:26.428','20260312104324_add_compensation_pay_cycle',NULL,NULL,'2026-03-12 10:43:24.204',1),('adc0d9e3-87fe-44cb-9d36-1afd77297a4e','522a35a24040950c018344e236f7807ba07154c18b3b091acb0371583e03f682','2026-03-12 15:07:48.447','20260312150747_add_shifts_configs_and_fix_relations',NULL,NULL,'2026-03-12 15:07:47.795',1),('bb3fd29e-d20f-4a77-9416-e5c06ff9eea9','2f44ef94b59eb35c90223f8a74ec9d03bcfce5eb8c5665fa2f75cc170f14f482','2026-03-12 10:40:16.808','20260312063208_init_v3_system',NULL,NULL,'2026-03-12 10:39:55.891',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_records` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shift_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_date` date NOT NULL,
  `check_in_at` datetime(3) DEFAULT NULL,
  `check_out_at` datetime(3) DEFAULT NULL,
  `total_work_minutes` int DEFAULT NULL,
  `late_minutes` int NOT NULL DEFAULT '0',
  `early_leave_minutes` int NOT NULL DEFAULT '0',
  `overtime_minutes` int NOT NULL DEFAULT '0',
  `overtime_approved_minutes` int NOT NULL DEFAULT '0',
  `is_holiday_work` tinyint(1) NOT NULL DEFAULT '0',
  `is_weekend_work` tinyint(1) NOT NULL DEFAULT '0',
  `is_remote_work` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('PRESENT','ABSENT','LEAVE','HOLIDAY','MANUAL_ADJUSTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESENT',
  `note` text COLLATE utf8mb4_unicode_ci,
  `adjusted_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `source_checkin_request_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_checkout_request_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_records_user_id_work_date_key` (`user_id`,`work_date`),
  UNIQUE KEY `attendance_records_source_checkin_request_id_key` (`source_checkin_request_id`),
  UNIQUE KEY `attendance_records_source_checkout_request_id_key` (`source_checkout_request_id`),
  KEY `attendance_records_work_date_idx` (`work_date`),
  KEY `attendance_records_user_id_status_idx` (`user_id`,`status`),
  KEY `attendance_records_shift_id_fkey` (`shift_id`),
  KEY `attendance_records_adjusted_by_user_id_fkey` (`adjusted_by_user_id`),
  CONSTRAINT `attendance_records_adjusted_by_user_id_fkey` FOREIGN KEY (`adjusted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_source_checkin_request_id_fkey` FOREIGN KEY (`source_checkin_request_id`) REFERENCES `attendance_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_source_checkout_request_id_fkey` FOREIGN KEY (`source_checkout_request_id`) REFERENCES `attendance_requests` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_records`
--

LOCK TABLES `attendance_records` WRITE;
/*!40000 ALTER TABLE `attendance_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_requests`
--

DROP TABLE IF EXISTS `attendance_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_requests` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewer_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_type` enum('CHECK_IN','CHECK_OUT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_at` datetime(3) NOT NULL,
  `work_date` date NOT NULL,
  `shift_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_remote_work` tinyint(1) NOT NULL DEFAULT '0',
  `note` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reviewed_at` datetime(3) DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_requests_user_id_status_idx` (`user_id`,`status`),
  KEY `attendance_requests_work_date_idx` (`work_date`),
  KEY `attendance_requests_request_type_status_idx` (`request_type`,`status`),
  KEY `attendance_requests_reviewer_id_fkey` (`reviewer_id`),
  KEY `attendance_requests_shift_id_fkey` (`shift_id`),
  CONSTRAINT `attendance_requests_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_requests_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_requests`
--

LOCK TABLES `attendance_requests` WRITE;
/*!40000 ALTER TABLE `attendance_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` enum('USER','USER_PROFILE','DEPARTMENT','JOB_TITLE','LEAVE_TYPE','LEAVE_REQUEST','LEAVE_BALANCE','ATTENDANCE_RECORD','ATTENDANCE_REQUEST','WORK_SHIFT','HOLIDAY','OVERTIME_REQUEST','PROJECT','PROJECT_ASSIGNMENT','PROJECT_MILESTONE','PROJECT_EXPENSE','PAYROLL_PERIOD','USER_COMPENSATION','SALARY_COMPONENT','USER_SALARY_COMPONENT','PAYROLL_RECORD','PAYROLL_ADJUSTMENT','INSURANCE_POLICY','TAX_POLICY','CLIENT','CLIENT_CONTACT','CONTRACT','CONTRACT_AMENDMENT','INVOICE','CLIENT_PAYMENT','CLIENT_DOCUMENT','USER_ROLE','NOTIFICATION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` enum('CREATE','UPDATE','DEACTIVATE','APPROVE','REJECT','ASSIGN','REMOVE','STATUS_CHANGE','SEND','PAYMENT','CANCEL','SIGN','LOGIN','LOGOUT','PASSWORD_SET','PASSWORD_RESET') COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id_idx` (`entity_type`,`entity_id`),
  KEY `audit_logs_created_at_idx` (`created_at`),
  KEY `audit_logs_actor_user_id_idx` (`actor_user_id`),
  CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('cmmokrhm800d97cw0lz5567aw','USER','cmmokrf7m000s7cw0cbejlm98','LOGIN',NULL,'Đăng nhập thành công',NULL,NULL,NULL,'192.168.1.100',NULL,'2026-03-13 07:28:04.592'),('cmmokrhm800da7cw0jk0mtvlv','USER','cmmokrf8v000x7cw0rmsgkfoc','LOGIN',NULL,'Đăng nhập thành công',NULL,NULL,NULL,'192.168.1.105',NULL,'2026-03-13 07:28:04.592'),('cmmokrhm800db7cw0b0059f0v','LEAVE_REQUEST','cmmokrhj000ch7cw0m8avfm82','APPROVE',NULL,'HR duyệt đơn nghỉ phép của Đinh Văn Giang',NULL,NULL,NULL,NULL,NULL,'2026-03-13 07:28:04.592'),('cmmokrhm800dc7cw0hd7f0ujm','PAYROLL_PERIOD','cmmokrgqj009f7cw07urlwbkn','APPROVE','cmmokrf7a000r7cw0j1fv9te7','Phê duyệt kỳ lương tháng 1/2026',NULL,NULL,NULL,NULL,NULL,'2026-03-13 07:28:04.592'),('cmmokrhm800dd7cw0ku88jz7f','CONTRACT','cmmokrgnc008i7cw0py3wh0rh','SIGN','cmmokrf7a000r7cw0j1fv9te7','Ký hợp đồng HĐ-2023-001 với FTech Vietnam',NULL,NULL,NULL,NULL,NULL,'2026-03-13 07:28:04.592'),('cmmokrhm800de7cw0k561ycr8','USER','cmmokrfbd00177cw0t0my3fho','CREATE',NULL,'Tạo tài khoản nhân viên mới: Trần Văn Sơn',NULL,NULL,NULL,NULL,NULL,'2026-03-13 07:28:04.592');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_tokens`
--

DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_tokens` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` enum('ACCOUNT_SETUP','PASSWORD_RESET') COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_tokens_token_hash_key` (`token_hash`),
  KEY `auth_tokens_user_id_token_type_idx` (`user_id`,`token_type`),
  KEY `auth_tokens_expires_at_idx` (`expires_at`),
  CONSTRAINT `auth_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_tokens`
--

LOCK TABLES `auth_tokens` WRITE;
/*!40000 ALTER TABLE `auth_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_contacts`
--

DROP TABLE IF EXISTS `client_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_contacts` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `client_contacts_client_id_idx` (`client_id`),
  CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_contacts`
--

LOCK TABLES `client_contacts` WRITE;
/*!40000 ALTER TABLE `client_contacts` DISABLE KEYS */;
INSERT INTO `client_contacts` VALUES ('cmmokrgn1008c7cw0fg9apawn','cmmokrglw00887cw0dd8pm5hj','Nguyễn Minh Khôi','Giám Đốc Công Nghệ','khoi.nguyen@ftech.vn','0901000001',1,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324'),('cmmokrgn1008d7cw0owa9ieof','cmmokrglw00887cw0dd8pm5hj','Trần Thị Lan Anh','Trưởng Phòng Mua Hàng','lananh.tran@ftech.vn','0901000002',0,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324'),('cmmokrgn1008e7cw06kz3wp64','cmmokrgma00897cw0pvblddu8','Lê Quốc Hùng','IT Director','hung.le@greenmart.vn','0902000001',1,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324'),('cmmokrgn1008f7cw096zfn55r','cmmokrgma00897cw0pvblddu8','Phạm Thị Thu Hà','Project Manager','thuha.pham@greenmart.vn','0902000002',0,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324'),('cmmokrgn1008g7cw0dhii5su6','cmmokrgmm008a7cw0jxmfwthd','Hoàng Văn Tuyến','Phó Giám Đốc Sở','hvtuyen@hanoi.gov.vn','024 3825 9988',1,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324'),('cmmokrgn1008h7cw0auggx4le','cmmokrgmt008b7cw0iun8ue3y','Bùi Ngọc Anh','CEO','ceo@smartmove.vn','0905123457',1,NULL,'2026-03-13 07:28:03.324','2026-03-13 07:28:03.324');
/*!40000 ALTER TABLE `client_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_documents`
--

DROP TABLE IF EXISTS `client_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_documents` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_confidential` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `client_documents_client_id_document_type_idx` (`client_id`,`document_type`),
  KEY `client_documents_uploaded_by_user_id_fkey` (`uploaded_by_user_id`),
  CONSTRAINT `client_documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `client_documents_uploaded_by_user_id_fkey` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_documents`
--

LOCK TABLES `client_documents` WRITE;
/*!40000 ALTER TABLE `client_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `client_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_payments`
--

DROP TABLE IF EXISTS `client_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_payments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `exchange_rate` decimal(18,6) NOT NULL DEFAULT '1.000000',
  `amount_in_vnd` decimal(18,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('BANK_TRANSFER','CASH','CHECK','CREDIT_CARD','ONLINE','CRYPTO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_number` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','FAILED','REFUNDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMPLETED',
  `received_bank_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_account_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `confirmed_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmed_at` datetime(3) DEFAULT NULL,
  `receipt_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_payments_payment_code_key` (`payment_code`),
  KEY `client_payments_client_id_status_idx` (`client_id`,`status`),
  KEY `client_payments_contract_id_idx` (`contract_id`),
  KEY `client_payments_invoice_id_idx` (`invoice_id`),
  KEY `client_payments_payment_date_idx` (`payment_date`),
  KEY `client_payments_confirmed_by_user_id_fkey` (`confirmed_by_user_id`),
  CONSTRAINT `client_payments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `client_payments_confirmed_by_user_id_fkey` FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `client_payments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `client_payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_payments`
--

LOCK TABLES `client_payments` WRITE;
/*!40000 ALTER TABLE `client_payments` DISABLE KEYS */;
INSERT INTO `client_payments` VALUES ('cmmokrhlm00cs7cw03o3db4rz','cmmokrglw00887cw0dd8pm5hj','cmmokrgnc008i7cw0py3wh0rh','cmmokrhkm00cp7cw01h4e8zmj','PMT-2025-001',660000000.00,'VND',1.000000,660000000.00,'2025-02-20','BANK_TRANSFER','FT202502200001','COMPLETED','Vietcombank','1019000123456','Thanh toán hóa đơn INV-2025-001',NULL,'2025-02-21 00:00:00.000',NULL,'2026-03-13 07:28:04.570','2026-03-13 07:28:04.570'),('cmmokrhlm00ct7cw0y3yi8lg2','cmmokrgmm008a7cw0jxmfwthd','cmmokrgnv008k7cw0jl1mkiaa','cmmokrhlb00cr7cw0h9ceh3mv','PMT-2025-009',440000000.00,'VND',1.000000,440000000.00,'2025-07-25','BANK_TRANSFER','NS20250725999','COMPLETED','BIDV','12010000112233','Thanh toán hóa đơn INV-2025-008 từ Sở TTTT HN',NULL,'2025-07-26 00:00:00.000',NULL,'2026-03-13 07:28:04.570','2026-03-13 07:28:04.570');
/*!40000 ALTER TABLE `client_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_type` enum('INDIVIDUAL','COMPANY','GOVERNMENT','NGO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PROSPECT','ACTIVE','INACTIVE','BLACKLISTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROSPECT',
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Vietnam',
  `account_manager_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_contract_value` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_received_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `outstanding_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clients_client_code_key` (`client_code`),
  KEY `clients_status_idx` (`status`),
  KEY `clients_account_manager_user_id_idx` (`account_manager_user_id`),
  CONSTRAINT `clients_account_manager_user_id_fkey` FOREIGN KEY (`account_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES ('cmmokrglw00887cw0dd8pm5hj','KH001','COMPANY','ACTIVE','Công ty Cổ phần Công nghệ FTech Việt Nam','FTech VN','0101234567','Công nghệ thông tin','https://www.ftech.vn','info@ftech.vn','024 3999 8888','Tòa nhà FTech, 89 Láng Hạ, Đống Đa, Hà Nội','Hà Nội','Vietnam',NULL,2500000000.00,1800000000.00,700000000.00,'Khách hàng lớn, đối tác chiến lược từ năm 2020','2026-03-13 07:28:03.283','2026-03-13 07:28:03.283'),('cmmokrgma00897cw0pvblddu8','KH002','COMPANY','ACTIVE','Tập đoàn Bán lẻ GreenMart','GreenMart','0207654321','Bán lẻ','https://www.greenmart.vn','tech@greenmart.vn','028 3888 7777','Lầu 12, Tòa nhà Pearl, 8 Hoàng Diệu 2, Thủ Đức, TP.HCM','Hồ Chí Minh','Vietnam',NULL,1200000000.00,1200000000.00,0.00,'Dự án ERP bán lẻ đã hoàn thành, đang bàn contract mới','2026-03-13 07:28:03.297','2026-03-13 07:28:03.297'),('cmmokrgmm008a7cw0jxmfwthd','KH003','GOVERNMENT','ACTIVE','Sở Thông tin và Truyền thông Hà Nội','Sở TTTT HN','0100888999','Cơ quan nhà nước',NULL,'cntt@hanoi.gov.vn','024 3825 9999','9 Trần Phú, Ba Đình, Hà Nội','Hà Nội','Vietnam',NULL,800000000.00,400000000.00,400000000.00,'Dự án cổng thông tin điện tử','2026-03-13 07:28:03.309','2026-03-13 07:28:03.309'),('cmmokrgmt008b7cw0iun8ue3y','KH004','COMPANY','PROSPECT','Công ty TNHH Logistics Vận Tải SmartMove','SmartMove','0312345678','Logistics','https://www.smartmove.vn','business@smartmove.vn','0905 123 456','KCN Sóng Thần 2, Dĩ An, Bình Dương','Bình Dương','Vietnam',NULL,0.00,0.00,0.00,'Tiềm năng - đang trong giai đoạn đề xuất giải pháp','2026-03-13 07:28:03.316','2026-03-13 07:28:03.316');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contract_amendments`
--

DROP TABLE IF EXISTS `contract_amendments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contract_amendments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amendment_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `value_change` decimal(18,2) DEFAULT NULL,
  `effective_date` date NOT NULL,
  `status` enum('DRAFT','PENDING_SIGN','SIGNED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `file_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `contract_amendments_contract_id_idx` (`contract_id`),
  CONSTRAINT `contract_amendments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contract_amendments`
--

LOCK TABLES `contract_amendments` WRITE;
/*!40000 ALTER TABLE `contract_amendments` DISABLE KEYS */;
/*!40000 ALTER TABLE `contract_amendments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_type` enum('FIXED_PRICE','TIME_AND_MATERIAL','RETAINER','MILESTONE_BASED','MIXED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('DRAFT','PENDING_SIGN','ACTIVE','COMPLETED','TERMINATED','SUSPENDED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `total_value` decimal(18,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `received_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `remaining_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `signed_date` date DEFAULT NULL,
  `signed_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `termination_date` date DEFAULT NULL,
  `termination_reason` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contracts_contract_code_key` (`contract_code`),
  KEY `contracts_client_id_status_idx` (`client_id`,`status`),
  KEY `contracts_end_date_status_idx` (`end_date`,`status`),
  KEY `contracts_signed_by_user_id_fkey` (`signed_by_user_id`),
  CONSTRAINT `contracts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `contracts_signed_by_user_id_fkey` FOREIGN KEY (`signed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
INSERT INTO `contracts` VALUES ('cmmokrgnc008i7cw0py3wh0rh','HĐ-2023-001','cmmokrglw00887cw0dd8pm5hj','TIME_AND_MATERIAL','ACTIVE','Hợp đồng Phát triển Hệ thống ERP FTech - Phase 2','Phát triển và tích hợp module HR, Payroll, CRM cho hệ thống nội bộ FTech',2500000000.00,'VND',1800000000.00,700000000.00,'2023-06-01','2025-12-31','2023-05-20','cmmokrf7a000r7cw0j1fv9te7',NULL,NULL,NULL,'Thanh toán theo milestone hàng quý','2026-03-13 07:28:03.335','2026-03-13 07:28:03.335'),('cmmokrgnm008j7cw07n7wat41','HĐ-2022-003','cmmokrgma00897cw0pvblddu8','FIXED_PRICE','COMPLETED','Hợp đồng Xây dựng Hệ thống POS & Kho hàng GreenMart','Xây dựng hệ thống quản lý điểm bán, kho hàng, báo cáo cho 50 cửa hàng',1200000000.00,'VND',1200000000.00,0.00,'2022-01-15','2023-06-30','2022-01-10','cmmokrf7a000r7cw0j1fv9te7',NULL,NULL,NULL,NULL,'2026-03-13 07:28:03.346','2026-03-13 07:28:03.346'),('cmmokrgnv008k7cw0jl1mkiaa','HĐ-2024-007','cmmokrgmm008a7cw0jxmfwthd','MILESTONE_BASED','ACTIVE','Hợp đồng Xây dựng Cổng thông tin điện tử Sở TTTT Hà Nội','Xây dựng, triển khai cổng thông tin điện tử và hệ thống dịch vụ công trực tuyến',800000000.00,'VND',400000000.00,400000000.00,'2024-03-01','2025-09-30','2024-02-28','cmmokrf7a000r7cw0j1fv9te7',NULL,NULL,NULL,NULL,'2026-03-13 07:28:03.354','2026-03-13 07:28:03.354');
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `head_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_name_key` (`name`),
  KEY `departments_head_user_id_idx` (`head_user_id`),
  KEY `departments_is_active_idx` (`is_active`),
  CONSTRAINT `departments_head_user_id_fkey` FOREIGN KEY (`head_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES ('cmmokrf0a00077cw0xzxqh8tq','Ban Giám Đốc','Hội đồng lãnh đạo và điều hành công ty','cmmokrf7a000r7cw0j1fv9te7',1,'2026-03-13 07:28:01.209','2026-03-13 07:28:01.621'),('cmmokrf0j00087cw0e5rg2jj9','Phòng Kỹ Thuật','Phát triển phần mềm và hạ tầng kỹ thuật',NULL,1,'2026-03-13 07:28:01.219','2026-03-13 07:28:01.630'),('cmmokrf0u00097cw0xr7w8mo4','Phòng Nhân Sự','Tuyển dụng, đào tạo, chính sách nhân sự',NULL,1,'2026-03-13 07:28:01.229','2026-03-13 07:28:01.640'),('cmmokrf13000a7cw00vki98r9','Phòng Kế Toán','Tài chính, kế toán, thuế và báo cáo',NULL,1,'2026-03-13 07:28:01.239','2026-03-13 07:28:01.652'),('cmmokrf1e000b7cw0azc4rapo','Phòng Kinh Doanh','Phát triển thị trường và quản lý khách hàng',NULL,1,'2026-03-13 07:28:01.250','2026-03-13 07:28:01.662'),('cmmokrf1o000c7cw0btopv8uv','Phòng Marketing','Truyền thông, thương hiệu và digital marketing',NULL,1,'2026-03-13 07:28:01.260','2026-03-13 07:28:01.672');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holidays` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `year` smallint unsigned NOT NULL,
  `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `overtime_multiplier` decimal(3,1) NOT NULL DEFAULT '3.0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holidays_date_key` (`date`),
  KEY `holidays_year_idx` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `holidays`
--

LOCK TABLES `holidays` WRITE;
/*!40000 ALTER TABLE `holidays` DISABLE KEYS */;
INSERT INTO `holidays` VALUES ('cmmokrfv3005b7cw0dv6pbrn4','Tết Dương lịch 2025','2025-01-01',2025,1,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv3005c7cw075vhpspc','Tết Nguyên Đán 2025 (30 TN)','2025-01-28',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv3005d7cw04e2k7vhs','Tết Nguyên Đán 2025 (Mùng 1)','2025-01-29',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv3005e7cw09745kh4r','Tết Nguyên Đán 2025 (Mùng 2)','2025-01-30',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv3005f7cw0j1opm7lh','Tết Nguyên Đán 2025 (Mùng 3)','2025-01-31',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv3005g7cw06j1gfowe','Tết Nguyên Đán 2025 (Mùng 4)','2025-02-01',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005h7cw0ujgmwi8y','Tết Nguyên Đán 2025 (Mùng 5)','2025-02-02',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005i7cw0aw7tvjea','Giỗ Tổ Hùng Vương 2025','2025-04-07',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005j7cw0tjn8ccpy','Ngày Giải phóng 30/4','2025-04-30',2025,1,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005k7cw03z3b6sti','Ngày Quốc tế Lao động 1/5','2025-05-01',2025,1,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005l7cw07tn7eiot','Ngày Quốc khánh 2/9','2025-09-02',2025,1,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005m7cw04h9y4385','Ngày Quốc khánh 2/9 (bù)','2025-09-03',2025,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005n7cw0wgt14nia','Tết Dương lịch 2026','2026-01-01',2026,1,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005o7cw0o1wn291g','Tết Nguyên Đán 2026 (29 TN)','2026-02-16',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005p7cw0izyve88i','Tết Nguyên Đán 2026 (Mùng 1)','2026-02-17',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005q7cw0q4vqxxg0','Tết Nguyên Đán 2026 (Mùng 2)','2026-02-18',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005r7cw0n1w9tnon','Tết Nguyên Đán 2026 (Mùng 3)','2026-02-19',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005s7cw0c0e33hmd','Tết Nguyên Đán 2026 (Mùng 4)','2026-02-20',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319'),('cmmokrfv4005t7cw0o1xnukjb','Tết Nguyên Đán 2026 (Mùng 5)','2026-02-21',2026,0,NULL,3.0,'2026-03-13 07:28:02.319','2026-03-13 07:28:02.319');
/*!40000 ALTER TABLE `holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `insurance_policies`
--

DROP TABLE IF EXISTS `insurance_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `insurance_policies` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `policy_type` enum('SOCIAL','HEALTH','UNEMPLOYMENT','ACCIDENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_rate` decimal(5,4) NOT NULL,
  `employer_rate` decimal(5,4) NOT NULL,
  `salary_cap_amount` decimal(18,2) DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `insurance_policies_policy_type_is_active_idx` (`policy_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `insurance_policies`
--

LOCK TABLES `insurance_policies` WRITE;
/*!40000 ALTER TABLE `insurance_policies` DISABLE KEYS */;
INSERT INTO `insurance_policies` VALUES ('ins-health','HEALTH','Bảo hiểm y tế (BHYT)',0.0150,0.0300,36000000.00,'2024-01-01',NULL,1,'NV 1.5%, DN 3%, trần 36tr','2026-03-12 11:08:30.717','2026-03-12 11:08:30.717'),('ins-social','SOCIAL','Bảo hiểm xã hội (BHXH)',0.0800,0.1750,36000000.00,'2024-01-01',NULL,1,'NV 8%, DN 17.5%, trần 36tr','2026-03-12 11:08:30.717','2026-03-12 11:08:30.717'),('ins-unemp','UNEMPLOYMENT','Bảo hiểm thất nghiệp (BHTN)',0.0100,0.0100,36000000.00,'2024-01-01',NULL,1,'NV 1%, DN 1%, trần 36tr','2026-03-12 11:08:30.717','2026-03-12 11:08:30.717');
/*!40000 ALTER TABLE `insurance_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(18,2) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `tax_rate` decimal(4,2) NOT NULL DEFAULT '0.10',
  `tax_amount` decimal(18,2) NOT NULL,
  `total_amount` decimal(18,2) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id_idx` (`invoice_id`),
  CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
INSERT INTO `invoice_items` VALUES ('cmmokrhkz00cq7cw06lxixff9','cmmokrhkm00cp7cw01h4e8zmj','Phí phát triển Module HR (Phase 2.3)',1.00,'gói',600000000.00,600000000.00,0.10,60000000.00,660000000.00,1,NULL,'2026-03-13 07:28:04.547','2026-03-13 07:28:04.547');
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','DISPUTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `issued_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(18,2) NOT NULL,
  `tax_amount` decimal(18,2) NOT NULL,
  `total_amount` decimal(18,2) NOT NULL,
  `paid_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `outstanding_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_invoice_code_key` (`invoice_code`),
  KEY `invoices_client_id_status_idx` (`client_id`,`status`),
  KEY `invoices_contract_id_idx` (`contract_id`),
  KEY `invoices_due_date_status_idx` (`due_date`,`status`),
  KEY `invoices_project_id_fkey` (`project_id`),
  KEY `invoices_created_by_user_id_fkey` (`created_by_user_id`),
  CONSTRAINT `invoices_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoices_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('cmmokrhkm00cp7cw01h4e8zmj','INV-2025-001','cmmokrglw00887cw0dd8pm5hj','cmmokrgnc008i7cw0py3wh0rh','cmmokrgo3008l7cw0i6l9ieqv','PAID','2025-01-31','2025-02-28',600000000.00,60000000.00,660000000.00,660000000.00,0.00,'VND','Hóa đơn thanh toán theo tiến độ Q1/2025 - Hoàn thành Phase 2.3',NULL,'2025-02-01 00:00:00.000','2026-03-13 07:28:04.534','2026-03-13 07:28:04.534'),('cmmokrhlb00cr7cw0h9ceh3mv','INV-2025-008','cmmokrgmm008a7cw0jxmfwthd','cmmokrgnv008k7cw0jl1mkiaa','cmmokrgos008n7cw0oza926cm','SENT','2025-06-30','2025-07-31',400000000.00,40000000.00,440000000.00,440000000.00,0.00,'VND','Thanh toán lần 2 - Hoàn thành milestone thiết kế UI/UX',NULL,'2025-07-01 00:00:00.000','2026-03-13 07:28:04.559','2026-03-13 07:28:04.559');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_titles`
--

DROP TABLE IF EXISTS `job_titles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_titles` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_titles_name_key` (`name`),
  UNIQUE KEY `job_titles_code_key` (`code`),
  KEY `job_titles_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_titles`
--

LOCK TABLES `job_titles` WRITE;
/*!40000 ALTER TABLE `job_titles` DISABLE KEYS */;
INSERT INTO `job_titles` VALUES ('cmmokrf1z000d7cw02uywhvs7','CEO','Giám Đốc Điều Hành','Chief Executive Officer',1,'2026-03-13 07:28:01.270','2026-03-13 07:28:01.270'),('cmmokrf28000e7cw0gj9qoi84','CTO','Giám Đốc Kỹ Thuật','Chief Technology Officer',1,'2026-03-13 07:28:01.280','2026-03-13 07:28:01.280'),('cmmokrf2i000f7cw0w4gpbjmb','CFO','Giám Đốc Tài Chính','Chief Financial Officer',1,'2026-03-13 07:28:01.290','2026-03-13 07:28:01.290'),('cmmokrf2q000g7cw076ljvbf8','HR_MGR','Trưởng Phòng Nhân Sự','HR Manager',1,'2026-03-13 07:28:01.297','2026-03-13 07:28:01.297'),('cmmokrf2z000h7cw0ogepuv95','SAL_MGR','Trưởng Phòng Kinh Doanh','Sales Manager',1,'2026-03-13 07:28:01.307','2026-03-13 07:28:01.307'),('cmmokrf38000i7cw0c7d719qz','MKT_MGR','Trưởng Phòng Marketing','Marketing Manager',1,'2026-03-13 07:28:01.316','2026-03-13 07:28:01.316'),('cmmokrf3g000j7cw0dd1r1w1w','SR_DEV','Lập Trình Viên Senior','Senior Software Engineer',1,'2026-03-13 07:28:01.324','2026-03-13 07:28:01.324'),('cmmokrf3p000k7cw0u2aloh18','DEV','Lập Trình Viên','Software Engineer',1,'2026-03-13 07:28:01.332','2026-03-13 07:28:01.332'),('cmmokrf3x000l7cw0860yac8x','DEVOPS','Kỹ Sư DevOps','DevOps Engineer',1,'2026-03-13 07:28:01.340','2026-03-13 07:28:01.340'),('cmmokrf45000m7cw0ds848k72','HR_STF','Chuyên Viên Nhân Sự','HR Specialist',1,'2026-03-13 07:28:01.348','2026-03-13 07:28:01.348'),('cmmokrf4d000n7cw0ytivca36','ACC_STF','Kế Toán Viên','Accountant',1,'2026-03-13 07:28:01.357','2026-03-13 07:28:01.357'),('cmmokrf4l000o7cw0kflxl06t','SAL_EX','Chuyên Viên Kinh Doanh 2','Sales Executive',1,'2026-03-13 07:28:01.365','2026-03-13 09:46:07.558'),('cmmokrf4t000p7cw0hfghrnjn','MKT_EX','Chuyên Viên Marketing','Marketing Specialist',1,'2026-03-13 07:28:01.373','2026-03-13 07:28:01.373'),('cmmokrf4z000q7cw0er29yq91','BA','Phân Tích Nghiệp Vụ','Business Analyst',1,'2026-03-13 07:28:01.379','2026-03-13 07:28:01.379');
/*!40000 ALTER TABLE `job_titles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_balances`
--

DROP TABLE IF EXISTS `leave_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_balances` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leave_type_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` smallint unsigned NOT NULL,
  `entitled_days` decimal(5,2) NOT NULL,
  `carried_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `adjusted_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `used_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `pending_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `remaining_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_balances_user_id_leave_type_id_year_key` (`user_id`,`leave_type_id`,`year`),
  KEY `leave_balances_user_id_year_idx` (`user_id`,`year`),
  KEY `leave_balances_leave_type_id_fkey` (`leave_type_id`),
  CONSTRAINT `leave_balances_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `leave_balances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_balances`
--

LOCK TABLES `leave_balances` WRITE;
/*!40000 ALTER TABLE `leave_balances` DISABLE KEYS */;
INSERT INTO `leave_balances` VALUES ('cmmokrfuh003n7cw0baa6sdvd','cmmokrf7a000r7cw0j1fv9te7','cmmokrfso003h7cw0t109olxm',2025,12.00,0.00,0.00,6.00,0.00,6.00,NULL,'2026-03-13 07:28:02.297','2026-03-13 07:28:02.297'),('cmmokrfuh003o7cw026qtelen','cmmokrf7a000r7cw0j1fv9te7','cmmokrft0003i7cw05x1xxfvm',2025,30.00,0.00,0.00,2.00,0.00,28.00,NULL,'2026-03-13 07:28:02.297','2026-03-13 07:28:02.297'),('cmmokrfuh003p7cw05l9icwvf','cmmokrf7a000r7cw0j1fv9te7','cmmokrfso003h7cw0t109olxm',2026,12.00,2.00,0.00,1.00,0.00,13.00,NULL,'2026-03-13 07:28:02.297','2026-03-13 07:28:02.297'),('cmmokrfuh003q7cw0uq2msf4p','cmmokrf7a000r7cw0j1fv9te7','cmmokrft0003i7cw05x1xxfvm',2026,30.00,0.00,0.00,0.00,0.00,30.00,NULL,'2026-03-13 07:28:02.297','2026-03-13 07:28:02.297');
/*!40000 ALTER TABLE `leave_balances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_request_approvals`
--

DROP TABLE IF EXISTS `leave_request_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_request_approvals` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leave_request_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approver_user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_type` enum('MANAGER','HR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_order` int NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `comment` text COLLATE utf8mb4_unicode_ci,
  `action_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_request_approvals_leave_request_id_step_type_key` (`leave_request_id`,`step_type`),
  UNIQUE KEY `leave_request_approvals_leave_request_id_step_order_key` (`leave_request_id`,`step_order`),
  KEY `leave_request_approvals_approver_user_id_status_idx` (`approver_user_id`,`status`),
  CONSTRAINT `leave_request_approvals_approver_user_id_fkey` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `leave_request_approvals_leave_request_id_fkey` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_request_approvals`
--

LOCK TABLES `leave_request_approvals` WRITE;
/*!40000 ALTER TABLE `leave_request_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_request_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leave_type_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` decimal(5,2) NOT NULL,
  `is_half_day` tinyint(1) NOT NULL DEFAULT '0',
  `half_day_period` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `document_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `current_step` enum('MANAGER','HR') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `final_approved_at` datetime(3) DEFAULT NULL,
  `rejected_at` datetime(3) DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `cancel_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_user_id_status_idx` (`user_id`,`status`),
  KEY `leave_requests_leave_type_id_idx` (`leave_type_id`),
  KEY `leave_requests_start_date_end_date_idx` (`start_date`,`end_date`),
  CONSTRAINT `leave_requests_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_requests`
--

LOCK TABLES `leave_requests` WRITE;
/*!40000 ALTER TABLE `leave_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_types`
--

DROP TABLE IF EXISTS `leave_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_types` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_paid` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `max_days_per_year` decimal(5,2) DEFAULT NULL,
  `requires_document` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_types_code_key` (`code`),
  UNIQUE KEY `leave_types_name_key` (`name`),
  KEY `leave_types_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_types`
--

LOCK TABLES `leave_types` WRITE;
/*!40000 ALTER TABLE `leave_types` DISABLE KEYS */;
INSERT INTO `leave_types` VALUES ('cmmokrfso003h7cw0t109olxm','ANNUAL','Nghỉ Phép Năm','Nghỉ phép hưởng lương theo quy định BLLĐ',1,1,12.00,0,'2026-03-13 07:28:02.231','2026-03-13 07:28:02.231'),('cmmokrft0003i7cw05x1xxfvm','SICK','Nghỉ Ốm','Nghỉ do bệnh tật, có giấy bác sĩ',1,1,30.00,1,'2026-03-13 07:28:02.244','2026-03-13 07:28:02.244'),('cmmokrftb003j7cw02wnfqgva','MATERNITY','Nghỉ Thai Sản','Nghỉ sinh con theo chính sách BHXH',1,1,180.00,1,'2026-03-13 07:28:02.254','2026-03-13 07:28:02.254'),('cmmokrftj003k7cw0mxwg4t6c','UNPAID','Nghỉ Không Lương','Nghỉ phép không được trả lương',0,1,30.00,0,'2026-03-13 07:28:02.263','2026-03-13 07:28:02.263'),('cmmokrftt003l7cw0vdm8245o','COMP','Nghỉ Bù','Nghỉ bù ngày đã làm thêm',1,1,NULL,0,'2026-03-13 07:28:02.272','2026-03-13 07:28:02.272'),('cmmokrfu1003m7cw0jrtfjpi6','PERSONAL','Nghỉ Việc Riêng','Nghỉ có hưởng lương vì việc cá nhân (cưới, tang)',1,1,5.00,0,'2026-03-13 07:28:02.281','2026-03-13 07:28:02.281');
/*!40000 ALTER TABLE `leave_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('ATTENDANCE_CHECKIN_REQUEST','ATTENDANCE_CHECKOUT_REQUEST','ATTENDANCE_REQUEST_APPROVED','ATTENDANCE_REQUEST_REJECTED','LEAVE_REQUEST_CREATED','LEAVE_REQUEST_APPROVED','LEAVE_REQUEST_REJECTED','LEAVE_BALANCE_LOW','OVERTIME_REQUEST_CREATED','OVERTIME_APPROVED','OVERTIME_REJECTED','PROJECT_ASSIGNED','PROJECT_STATUS_CHANGED','MILESTONE_DUE_SOON','PAYROLL_READY','PAYSLIP_AVAILABLE','COMPENSATION_CHANGED','CONTRACT_SIGNED','CONTRACT_EXPIRING_SOON','INVOICE_SENT','PAYMENT_RECEIVED','INVOICE_OVERDUE','GENERAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_entity_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_recipient_user_id_is_read_idx` (`recipient_user_id`,`is_read`),
  KEY `notifications_type_idx` (`type`),
  KEY `notifications_sender_user_id_fkey` (`sender_user_id`),
  KEY `notifications_recipient_user_id_type_idx` (`recipient_user_id`,`type`),
  CONSTRAINT `notifications_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notifications_sender_user_id_fkey` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES ('cmmokrhlx00d27cw0ac329iaz','cmmokrf7a000r7cw0j1fv9te7',NULL,'CONTRACT_EXPIRING_SOON','Hợp đồng sắp hết hạn','Hợp đồng HĐ-2023-001 với FTech Vietnam sẽ hết hạn vào 31/12/2025. Cần gia hạn hoặc ký hợp đồng mới.',NULL,NULL,NULL,0,NULL,'2026-03-13 07:28:04.580','2026-03-13 07:28:04.580'),('cmmokrhlx00d47cw0ls2df38i','cmmokrf7a000r7cw0j1fv9te7',NULL,'PAYMENT_RECEIVED','Nhận thanh toán từ Sở TTTT HN','Sở TTTT HN đã chuyển 440,000,000 VNĐ - Thanh toán hóa đơn INV-2025-008.',NULL,NULL,NULL,1,'2025-07-27 00:00:00.000','2026-03-13 07:28:04.580','2026-03-13 07:28:04.580'),('cmmokrhlx00d67cw0l12trp7m','cmmokrf7a000r7cw0j1fv9te7',NULL,'PAYROLL_READY','Kỳ lương 2/2026 sẵn sàng duyệt','Bảng lương kỳ tháng 2/2026 đã được tính toán xong và đang chờ phê duyệt.',NULL,NULL,NULL,0,NULL,'2026-03-13 07:28:04.580','2026-03-13 07:28:04.580');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overtime_requests`
--

DROP TABLE IF EXISTS `overtime_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overtime_requests` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approver_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_date` date NOT NULL,
  `start_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planned_minutes` int NOT NULL,
  `actual_minutes` int DEFAULT NULL,
  `is_holiday` tinyint(1) NOT NULL DEFAULT '0',
  `is_weekend` tinyint(1) NOT NULL DEFAULT '0',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `submitted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `action_at` datetime(3) DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `overtime_requests_user_id_status_idx` (`user_id`,`status`),
  KEY `overtime_requests_work_date_idx` (`work_date`),
  KEY `overtime_requests_approver_user_id_idx` (`approver_user_id`),
  CONSTRAINT `overtime_requests_approver_user_id_fkey` FOREIGN KEY (`approver_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `overtime_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overtime_requests`
--

LOCK TABLES `overtime_requests` WRITE;
/*!40000 ALTER TABLE `overtime_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `overtime_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_adjustments`
--

DROP TABLE IF EXISTS `payroll_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_adjustments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payroll_period_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adjustment_type` enum('BONUS','DEDUCTION','ADVANCE','REIMBURSEMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','APPROVED','REJECTED','APPLIED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `is_advance` tinyint(1) NOT NULL DEFAULT '0',
  `advance_recovered_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `advance_fully_recovered` tinyint(1) NOT NULL DEFAULT '0',
  `created_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payroll_adjustments_user_id_status_idx` (`user_id`,`status`),
  KEY `payroll_adjustments_payroll_period_id_idx` (`payroll_period_id`),
  KEY `payroll_adjustments_created_by_user_id_fkey` (`created_by_user_id`),
  KEY `payroll_adjustments_approved_by_user_id_fkey` (`approved_by_user_id`),
  CONSTRAINT `payroll_adjustments_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payroll_adjustments_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payroll_adjustments_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payroll_adjustments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_adjustments`
--

LOCK TABLES `payroll_adjustments` WRITE;
/*!40000 ALTER TABLE `payroll_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_periods`
--

DROP TABLE IF EXISTS `payroll_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_periods` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `month` tinyint unsigned NOT NULL,
  `year` smallint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `pay_date` date DEFAULT NULL,
  `status` enum('DRAFT','CALCULATING','APPROVED','PAID','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `working_days_in_period` int DEFAULT NULL,
  `standard_working_minutes` int DEFAULT NULL,
  `locked_at` datetime(3) DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `approved_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_periods_period_code_key` (`period_code`),
  UNIQUE KEY `payroll_periods_month_year_key` (`month`,`year`),
  KEY `payroll_periods_status_idx` (`status`),
  KEY `payroll_periods_approved_by_user_id_fkey` (`approved_by_user_id`),
  CONSTRAINT `payroll_periods_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_periods`
--

LOCK TABLES `payroll_periods` WRITE;
/*!40000 ALTER TABLE `payroll_periods` DISABLE KEYS */;
INSERT INTO `payroll_periods` VALUES ('cmmokrgq2009d7cw0shfw029c','2025-01',1,2025,'2025-01-01','2025-01-31','2025-02-10','PAID',23,11040,'2025-02-01 00:00:00.000','2025-02-05 00:00:00.000','2025-02-10 00:00:00.000','cmmokrf7a000r7cw0j1fv9te7',NULL,'2026-03-13 07:28:03.434','2026-03-13 07:28:03.434'),('cmmokrgqa009e7cw0fj73dv1j','2025-02',2,2025,'2025-02-01','2025-02-28','2025-03-10','PAID',18,8640,'2025-03-01 00:00:00.000','2025-03-05 00:00:00.000','2025-03-10 00:00:00.000','cmmokrf7a000r7cw0j1fv9te7',NULL,'2026-03-13 07:28:03.441','2026-03-13 07:28:03.441'),('cmmokrgqj009f7cw07urlwbkn','2026-01',1,2026,'2026-01-01','2026-01-31','2026-02-10','PAID',22,10560,'2026-02-01 00:00:00.000','2026-02-05 00:00:00.000','2026-02-10 00:00:00.000','cmmokrf7a000r7cw0j1fv9te7',NULL,'2026-03-13 07:28:03.451','2026-03-13 07:28:03.451'),('cmmokrgqr009g7cw0d23jb6hc','2026-02',2,2026,'2026-02-01','2026-02-28','2026-03-10','APPROVED',17,8160,'2026-03-01 00:00:00.000','2026-03-05 00:00:00.000',NULL,NULL,NULL,'2026-03-13 07:28:03.459','2026-03-13 07:28:03.459'),('cmmokrgr2009h7cw0t3cwyjyv','2026-03',3,2026,'2026-03-01','2026-03-31',NULL,'DRAFT',21,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-13 07:28:03.470','2026-03-13 07:28:03.470');
/*!40000 ALTER TABLE `payroll_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_record_items`
--

DROP TABLE IF EXISTS `payroll_record_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_record_items` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payroll_record_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_component_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` enum('EARNING','DEDUCTION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `source_type` enum('BASE','ALLOWANCE','BONUS','OVERTIME','ATTENDANCE','LEAVE','MANUAL','TAX','INSURANCE','ADVANCE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `unit_rate` decimal(18,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payroll_record_items_payroll_record_id_idx` (`payroll_record_id`),
  KEY `payroll_record_items_salary_component_id_fkey` (`salary_component_id`),
  CONSTRAINT `payroll_record_items_payroll_record_id_fkey` FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payroll_record_items_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_record_items`
--

LOCK TABLES `payroll_record_items` WRITE;
/*!40000 ALTER TABLE `payroll_record_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_record_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_records`
--

DROP TABLE IF EXISTS `payroll_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_records` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payroll_period_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_salary` decimal(18,2) NOT NULL,
  `working_days` decimal(5,2) DEFAULT NULL,
  `paid_leave_days` decimal(5,2) DEFAULT NULL,
  `unpaid_leave_days` decimal(5,2) DEFAULT NULL,
  `absent_days` decimal(5,2) DEFAULT NULL,
  `late_days` int NOT NULL DEFAULT '0',
  `overtime_weekday_minutes` int NOT NULL DEFAULT '0',
  `overtime_weekend_minutes` int NOT NULL DEFAULT '0',
  `overtime_holiday_minutes` int NOT NULL DEFAULT '0',
  `total_overtime_pay` decimal(18,2) NOT NULL DEFAULT '0.00',
  `gross_salary` decimal(18,2) NOT NULL,
  `total_allowances` decimal(18,2) NOT NULL,
  `total_bonus` decimal(18,2) NOT NULL,
  `social_insurance_employee` decimal(18,2) NOT NULL DEFAULT '0.00',
  `health_insurance_employee` decimal(18,2) NOT NULL DEFAULT '0.00',
  `unemployment_insurance_employee` decimal(18,2) NOT NULL DEFAULT '0.00',
  `personal_income_tax` decimal(18,2) NOT NULL DEFAULT '0.00',
  `taxable_income` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_deductions` decimal(18,2) NOT NULL,
  `net_salary` decimal(18,2) NOT NULL,
  `status` enum('DRAFT','APPROVED','PAID','VOID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `daily_rate` decimal(18,2) DEFAULT NULL,
  `hourly_rate` decimal(18,2) DEFAULT NULL,
  `generated_at` datetime(3) DEFAULT NULL,
  `approved_at` datetime(3) DEFAULT NULL,
  `paid_at` datetime(3) DEFAULT NULL,
  `payment_ref` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_records_payroll_period_id_user_id_key` (`payroll_period_id`,`user_id`),
  KEY `payroll_records_user_id_status_idx` (`user_id`,`status`),
  KEY `payroll_records_payroll_period_id_status_idx` (`payroll_period_id`,`status`),
  CONSTRAINT `payroll_records_payroll_period_id_fkey` FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payroll_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_records`
--

LOCK TABLES `payroll_records` WRITE;
/*!40000 ALTER TABLE `payroll_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_expenses`
--

DROP TABLE IF EXISTS `project_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_expenses` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('LABOR','SOFTWARE','HARDWARE','TRAVEL','TRAINING','SUBCONTRACT','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `expense_date` date NOT NULL,
  `receipt_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','REIMBURSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `submitted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `approved_at` datetime(3) DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `project_expenses_project_id_status_idx` (`project_id`,`status`),
  KEY `project_expenses_submitted_by_user_id_idx` (`submitted_by_user_id`),
  KEY `project_expenses_approved_by_user_id_fkey` (`approved_by_user_id`),
  CONSTRAINT `project_expenses_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_expenses_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `project_expenses_submitted_by_user_id_fkey` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_expenses`
--

LOCK TABLES `project_expenses` WRITE;
/*!40000 ALTER TABLE `project_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_milestones`
--

DROP TABLE IF EXISTS `project_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_milestones` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `owner_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `status` enum('PENDING','IN_PROGRESS','DONE','OVERDUE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `invoice_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `project_milestones_project_id_status_idx` (`project_id`,`status`),
  KEY `project_milestones_owner_user_id_idx` (`owner_user_id`),
  KEY `project_milestones_due_date_idx` (`due_date`),
  KEY `project_milestones_invoice_id_fkey` (`invoice_id`),
  CONSTRAINT `project_milestones_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_milestones_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `project_milestones_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_milestones`
--

LOCK TABLES `project_milestones` WRITE;
/*!40000 ALTER TABLE `project_milestones` DISABLE KEYS */;
INSERT INTO `project_milestones` VALUES ('cmmokrgps00927cw0wggmnker','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.1 - Phân tích yêu cầu',NULL,NULL,'2023-08-31','2023-08-25 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00937cw0tm5zp4d1','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.2 - Design & Architecture',NULL,NULL,'2023-11-30','2023-11-28 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00947cw08hlyhrox','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.3 - Phát triển Module HR',NULL,NULL,'2024-06-30','2024-06-20 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00957cw00bs1m808','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.4 - Phát triển Payroll',NULL,NULL,'2024-12-31','2024-12-28 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00967cw0e5u4u3ux','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.5 - CRM & Reporting',NULL,NULL,'2025-09-30',NULL,'IN_PROGRESS',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00977cw0t2pn0ufn','cmmokrgo3008l7cw0i6l9ieqv','Phase 2.6 - UAT & Go-live',NULL,NULL,'2025-12-31',NULL,'PENDING',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00987cw0smy8e4ya','cmmokrgos008n7cw0oza926cm','Kickoff & Phân tích nghiệp vụ',NULL,NULL,'2024-05-31','2024-05-30 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps00997cw0o2vetris','cmmokrgos008n7cw0oza926cm','Thiết kế UI/UX',NULL,NULL,'2024-08-31','2024-09-05 00:00:00.000','DONE',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps009a7cw0yj5pjhz5','cmmokrgos008n7cw0oza926cm','Phát triển Backend & APIs',NULL,NULL,'2025-03-31',NULL,'IN_PROGRESS',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgps009b7cw00dbf392a','cmmokrgos008n7cw0oza926cm','Deploy & Testing',NULL,NULL,'2025-07-31',NULL,'PENDING',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424'),('cmmokrgpt009c7cw02p6lzkbj','cmmokrgos008n7cw0oza926cm','Nghiệm thu bàn giao',NULL,NULL,'2025-09-30',NULL,'PENDING',NULL,'2026-03-13 07:28:03.424','2026-03-13 07:28:03.424');
/*!40000 ALTER TABLE `project_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `project_manager_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contract_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PLANNING','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLANNING',
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `health_status` enum('ON_TRACK','AT_RISK','DELAYED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `progress_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `budget_amount` decimal(18,2) DEFAULT NULL,
  `spent_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `contract_value` decimal(18,2) DEFAULT NULL,
  `invoiced_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `received_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `closed_at` datetime(3) DEFAULT NULL,
  `closure_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `projects_project_code_key` (`project_code`),
  KEY `projects_project_manager_user_id_idx` (`project_manager_user_id`),
  KEY `projects_client_id_idx` (`client_id`),
  KEY `projects_contract_id_idx` (`contract_id`),
  KEY `projects_status_idx` (`status`),
  CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `projects_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `projects_project_manager_user_id_fkey` FOREIGN KEY (`project_manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('cmmokrgo3008l7cw0i6l9ieqv','PRJ-2023-001','FTech ERP Phase 2','Phát triển module HR, Payroll, CRM tích hợp cho FTech Vietnam',NULL,'cmmokrglw00887cw0dd8pm5hj','cmmokrgnc008i7cw0py3wh0rh','ACTIVE','HIGH','ON_TRACK',65.00,'2023-06-01','2025-12-31',NULL,2500000000.00,1450000000.00,'VND',2500000000.00,1800000000.00,1800000000.00,NULL,NULL,'2026-03-13 07:28:03.363','2026-03-13 07:28:03.363'),('cmmokrgof008m7cw0g0rsiyiu','PRJ-2022-003','GreenMart POS & Inventory','Hệ thống quản lý điểm bán và kho hàng cho chuỗi GreenMart',NULL,'cmmokrgma00897cw0pvblddu8','cmmokrgnm008j7cw07n7wat41','COMPLETED','HIGH','ON_TRACK',100.00,'2022-01-15','2023-06-30','2023-06-25',1200000000.00,1150000000.00,'VND',1200000000.00,1200000000.00,1200000000.00,NULL,NULL,'2026-03-13 07:28:03.375','2026-03-13 07:28:03.375'),('cmmokrgos008n7cw0oza926cm','PRJ-2024-007','Cổng TTĐT Sở TTTT Hà Nội','Cổng thông tin điện tử và dịch vụ công trực tuyến',NULL,'cmmokrgmm008a7cw0jxmfwthd','cmmokrgnv008k7cw0jl1mkiaa','ACTIVE','MEDIUM','AT_RISK',45.00,'2024-03-01','2025-09-30',NULL,800000000.00,320000000.00,'VND',800000000.00,400000000.00,400000000.00,NULL,NULL,'2026-03-13 07:28:03.388','2026-03-13 07:28:03.388'),('cmmokrgp4008o7cw0zetxcf2c','PRJ-2025-INT','Innovision ERP Internal','Hệ thống ERP nội bộ của Innovision - quản lý HR, lương, dự án',NULL,NULL,NULL,'ACTIVE','URGENT','ON_TRACK',80.00,'2025-01-01','2026-06-30',NULL,500000000.00,380000000.00,'VND',NULL,0.00,0.00,NULL,NULL,'2026-03-13 07:28:03.400','2026-03-13 07:28:03.400');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_code_key` (`code`),
  UNIQUE KEY `roles_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('cmmokrezj00007cw0y0dyoifp','ADMIN','Quản trị hệ thống','Toàn quyền quản trị hệ thống ERP','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezk00017cw0ujza3i9e','DIRECTOR','Giám đốc','Ban lãnh đạo cấp cao','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezk00027cw0eqqsv1or','MANAGER','Trưởng phòng','Quản lý phòng ban, duyệt đơn từ','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezk00037cw0dixt4att','HR','Nhân sự','Quản lý nhân sự, chấm công, lương','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezk00047cw033wtg0y3','ACCOUNTANT','Kế toán','Quản lý tài chính, hóa đơn, thanh toán','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezk00057cw0l2np899r','SALES','Kinh doanh','Quản lý khách hàng, hợp đồng','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182'),('cmmokrezl00067cw0ve5jidyq','EMPLOYEE','Nhân viên','Nhân viên thông thường','2026-03-13 07:28:01.182','2026-03-13 07:28:01.182');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_components`
--

DROP TABLE IF EXISTS `salary_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_components` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_type` enum('EARNING','DEDUCTION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `calculation_type` enum('FIXED','FORMULA','MANUAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_taxable` tinyint(1) NOT NULL DEFAULT '0',
  `is_insurable` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `salary_components_code_key` (`code`),
  UNIQUE KEY `salary_components_name_key` (`name`),
  KEY `salary_components_component_type_is_active_idx` (`component_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_components`
--

LOCK TABLES `salary_components` WRITE;
/*!40000 ALTER TABLE `salary_components` DISABLE KEYS */;
INSERT INTO `salary_components` VALUES ('cmmokrfwl006a7cw0jbvrmhp0','BASE','Lương Cơ Bản','EARNING','FIXED',1,1,1,1,'Lương cơ bản theo hợp đồng','2026-03-13 07:28:02.373','2026-03-13 07:28:02.373'),('cmmokrfx0006b7cw0c7dwhcq6','ALLOW_POS','Phụ Cấp Chức Vụ','EARNING','FIXED',1,0,1,2,'Phụ cấp theo chức danh quản lý','2026-03-13 07:28:02.388','2026-03-13 07:28:02.388'),('cmmokrfxc006c7cw0i2k100e0','ALLOW_PHONE','Phụ Cấp Điện Thoại','EARNING','FIXED',0,0,1,3,'Hỗ trợ chi phí điện thoại','2026-03-13 07:28:02.400','2026-03-13 07:28:02.400'),('cmmokrfxm006d7cw0j3leax7p','ALLOW_LUNCH','Phụ Cấp Ăn Trưa','EARNING','FIXED',0,0,1,4,'Hỗ trợ tiền ăn trưa','2026-03-13 07:28:02.410','2026-03-13 07:28:02.410'),('cmmokrfxz006e7cw0gs6l1k17','ALLOW_TRANS','Phụ Cấp Đi Lại','EARNING','FIXED',0,0,1,5,'Hỗ trợ chi phí đi lại','2026-03-13 07:28:02.422','2026-03-13 07:28:02.422'),('cmmokrfyf006f7cw04rzdx42c','BONUS_KPI','Thưởng KPI','EARNING','MANUAL',1,0,1,6,'Thưởng hiệu quả công việc hàng quý','2026-03-13 07:28:02.439','2026-03-13 07:28:02.439'),('cmmokrfyr006g7cw0uga9wofg','BONUS_TEAM','Thưởng Dự Án','EARNING','MANUAL',1,0,1,7,'Thưởng khi hoàn thành dự án','2026-03-13 07:28:02.451','2026-03-13 07:28:02.451'),('cmmokrfz1006h7cw0wtlw8qvk','SI','BHXH Nhân Viên (8%)','DEDUCTION','FORMULA',0,0,1,10,'Bảo hiểm xã hội người lao động','2026-03-13 07:28:02.461','2026-03-13 07:28:02.461'),('cmmokrfz9006i7cw03566lg5i','HI','BHYT Nhân Viên (1.5%)','DEDUCTION','FORMULA',0,0,1,11,'Bảo hiểm y tế người lao động','2026-03-13 07:28:02.469','2026-03-13 07:28:02.469'),('cmmokrfzh006j7cw0clsyuep4','UI','BHTN Nhân Viên (1%)','DEDUCTION','FORMULA',0,0,1,12,'Bảo hiểm thất nghiệp người lao động','2026-03-13 07:28:02.477','2026-03-13 07:28:02.477'),('cmmokrfzr006k7cw0551rs40f','PIT','Thuế Thu Nhập Cá Nhân','DEDUCTION','FORMULA',0,0,1,13,'Thuế TNCN theo biểu lũy tiến','2026-03-13 07:28:02.486','2026-03-13 07:28:02.486');
/*!40000 ALTER TABLE `salary_components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_configs`
--

DROP TABLE IF EXISTS `system_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_configs` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_configs_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_configs`
--

LOCK TABLES `system_configs` WRITE;
/*!40000 ALTER TABLE `system_configs` DISABLE KEYS */;
INSERT INTO `system_configs` VALUES ('cmmokrfha002a7cw092nz2gzs','company_name','CÔNG TY TNHH INNOVISION','Tên đầy đủ của công ty','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002b7cw0qzqjdo8i','company_short_name','INNOVISION','Tên viết tắt','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002c7cw0t724g3hk','company_tax_code','0109876543','Mã số thuế doanh nghiệp','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002d7cw0vbsee6h0','company_address','Tầng 8, Tòa nhà FPT, 17 Duy Tân, Cầu Giấy, Hà Nội','Địa chỉ trụ sở','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002e7cw0o8f1istq','company_phone','024 3795 8888','Số điện thoại công ty','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002f7cw0t6hbi9rn','company_email','info@innovision.vn','Email liên hệ','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002g7cw05dm7iuu7','company_website','https://www.innovision.vn','Website công ty','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002h7cw04los77uk','default_timezone','Asia/Ho_Chi_Minh','Múi giờ mặc định','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002i7cw01ajhfyen','work_hours_per_day','8','Số giờ làm việc tiêu chuẩn/ngày','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002j7cw02wa1ejkg','work_days_per_week','5','Số ngày làm việc/tuần (T2-T6)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002k7cw02roah5u5','default_annual_leave_days','12','Số ngày phép năm mặc định','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002l7cw04erbm66e','max_failed_login_attempts','5','Số lần đăng nhập sai tối đa trước khi khóa','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002m7cw0mcrkyihn','account_lock_duration_minutes','30','Thời gian khóa tài khoản (phút)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002n7cw08rsj44gn','probation_duration_months','2','Thời gian thử việc mặc định (tháng)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfha002o7cw0z4xvjp3d','probation_salary_percent','85','% lương nhận trong thời gian thử việc','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002p7cw08534ze3j','payroll_pay_day','10','Ngày trả lương hàng tháng','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002q7cw0e6rykrwo','social_insurance_rate_employee','8','Tỷ lệ đóng BHXH nhân viên (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002r7cw062lp00pn','social_insurance_rate_employer','17','Tỷ lệ đóng BHXH công ty (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002s7cw07krlhfgh','health_insurance_rate_employee','1.5','Tỷ lệ đóng BHYT nhân viên (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002t7cw0l6zqgdko','health_insurance_rate_employer','3','Tỷ lệ đóng BHYT công ty (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002u7cw0gmnyf514','unemployment_insurance_rate_employee','1','Tỷ lệ đóng BHTN nhân viên (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822'),('cmmokrfhb002v7cw01d6b9z95','unemployment_insurance_rate_employer','1','Tỷ lệ đóng BHTN công ty (%)','2026-03-13 07:28:01.822','2026-03-13 07:28:01.822');
/*!40000 ALTER TABLE `system_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_brackets`
--

DROP TABLE IF EXISTS `tax_brackets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_brackets` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tax_policy_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bracket_order` int NOT NULL,
  `min_income` decimal(18,2) NOT NULL,
  `max_income` decimal(18,2) DEFAULT NULL,
  `tax_rate` decimal(5,4) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_brackets_tax_policy_id_bracket_order_key` (`tax_policy_id`,`bracket_order`),
  KEY `tax_brackets_tax_policy_id_idx` (`tax_policy_id`),
  CONSTRAINT `tax_brackets_tax_policy_id_fkey` FOREIGN KEY (`tax_policy_id`) REFERENCES `tax_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_brackets`
--

LOCK TABLES `tax_brackets` WRITE;
/*!40000 ALTER TABLE `tax_brackets` DISABLE KEYS */;
INSERT INTO `tax_brackets` VALUES ('cmmokrfw4005w7cw0dnex4z91','cmmokrfvi005u7cw0oda6tc67',1,0.00,5000000.00,0.0500),('cmmokrfw4005x7cw03kc9lgqi','cmmokrfvi005u7cw0oda6tc67',2,5000000.00,10000000.00,0.1000),('cmmokrfw4005y7cw0z3bnnsdq','cmmokrfvi005u7cw0oda6tc67',3,10000000.00,18000000.00,0.1500),('cmmokrfw4005z7cw0gbbnd1r7','cmmokrfvi005u7cw0oda6tc67',4,18000000.00,32000000.00,0.2000),('cmmokrfw400607cw098ry1xi4','cmmokrfvi005u7cw0oda6tc67',5,32000000.00,52000000.00,0.2500),('cmmokrfw400617cw0cilbbnz4','cmmokrfvi005u7cw0oda6tc67',6,52000000.00,80000000.00,0.3000),('cmmokrfw400627cw00g5ymf54','cmmokrfvi005u7cw0oda6tc67',7,80000000.00,NULL,0.3500),('cmmokrfwc00637cw0hrzs803u','cmmokrfvu005v7cw0dj265k60',1,0.00,5000000.00,0.0500),('cmmokrfwc00647cw07fcg51vy','cmmokrfvu005v7cw0dj265k60',2,5000000.00,10000000.00,0.1000),('cmmokrfwc00657cw0g9hewtxv','cmmokrfvu005v7cw0dj265k60',3,10000000.00,18000000.00,0.1500),('cmmokrfwc00667cw06dwnebpp','cmmokrfvu005v7cw0dj265k60',4,18000000.00,32000000.00,0.2000),('cmmokrfwc00677cw0r2ilnfdp','cmmokrfvu005v7cw0dj265k60',5,32000000.00,52000000.00,0.2500),('cmmokrfwc00687cw03pudf2yi','cmmokrfvu005v7cw0dj265k60',6,52000000.00,80000000.00,0.3000),('cmmokrfwc00697cw0hd6icrju','cmmokrfvu005v7cw0dj265k60',7,80000000.00,NULL,0.3500);
/*!40000 ALTER TABLE `tax_brackets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_policies`
--

DROP TABLE IF EXISTS `tax_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_policies` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` smallint unsigned NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `personal_deduction` decimal(18,2) NOT NULL,
  `dependant_deduction` decimal(18,2) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tax_policies_year_is_active_idx` (`year`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_policies`
--

LOCK TABLES `tax_policies` WRITE;
/*!40000 ALTER TABLE `tax_policies` DISABLE KEYS */;
INSERT INTO `tax_policies` VALUES ('cmmokrfvi005u7cw0oda6tc67','Chính sách thuế TNCN 2025',2025,'Biểu thuế TNCN lũy tiến từng phần áp dụng năm 2025',0,11000000.00,4400000.00,'2025-01-01','2025-12-31','2026-03-13 07:28:02.333','2026-03-13 07:28:02.333'),('cmmokrfvu005v7cw0dj265k60','Chính sách thuế TNCN 2026',2026,'Biểu thuế TNCN lũy tiến từng phần áp dụng năm 2026',1,11000000.00,4400000.00,'2026-01-01',NULL,'2026-03-13 07:28:02.345','2026-03-13 07:28:02.345');
/*!40000 ALTER TABLE `tax_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_compensations`
--

DROP TABLE IF EXISTS `user_compensations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_compensations` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_type` enum('MONTHLY','DAILY','HOURLY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_salary` decimal(18,2) NOT NULL,
  `probation_salary` decimal(18,2) DEFAULT NULL,
  `standard_working_days` int DEFAULT NULL,
  `standard_working_hours` decimal(5,2) DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `overtime_rate_weekday` decimal(3,1) NOT NULL DEFAULT '1.5',
  `overtime_rate_weekend` decimal(3,1) NOT NULL DEFAULT '2.0',
  `overtime_rate_holiday` decimal(3,1) NOT NULL DEFAULT '3.0',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `change_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pay_day_of_month` tinyint unsigned DEFAULT NULL,
  `pay_frequency` enum('MONTHLY','BIWEEKLY','WEEKLY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTHLY',
  `probation_end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_compensations_user_id_effective_from_key` (`user_id`,`effective_from`),
  KEY `user_compensations_user_id_is_active_idx` (`user_id`,`is_active`),
  CONSTRAINT `user_compensations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_compensations`
--

LOCK TABLES `user_compensations` WRITE;
/*!40000 ALTER TABLE `user_compensations` DISABLE KEYS */;
INSERT INTO `user_compensations` VALUES ('cmmokrg08006l7cw00mzd30fi','cmmokrf7a000r7cw0j1fv9te7','MONTHLY',80000000.00,NULL,22,8.00,'VND',1.5,2.0,3.0,'2024-01-01',NULL,1,NULL,'2026-03-13 07:28:02.503','2026-03-13 07:28:02.503','Điều chỉnh lương theo năm 2024',10,'MONTHLY',NULL);
/*!40000 ALTER TABLE `user_compensations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('MALE','FEMALE','OTHER','UNDISCLOSED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_birth` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Vietnamese',
  `ethnicity` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `national_id_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `national_id_issue_date` date DEFAULT NULL,
  `national_id_issue_place` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passport_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `passport_expiry` date DEFAULT NULL,
  `tax_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `social_insurance_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `health_insurance_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `health_insurance_expiry` date DEFAULT NULL,
  `bank_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_holder` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_rel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dependant_count` int NOT NULL DEFAULT '0',
  `education_level` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `education_major` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `university` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_profiles_user_id_key` (`user_id`),
  UNIQUE KEY `user_profiles_national_id_number_key` (`national_id_number`),
  UNIQUE KEY `user_profiles_tax_code_key` (`tax_code`),
  UNIQUE KEY `user_profiles_social_insurance_number_key` (`social_insurance_number`),
  CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
INSERT INTO `user_profiles` VALUES ('cmmokrfdv00227cw01y3gcq3i','cmmokrf7a000r7cw0j1fv9te7','1982-04-10','MALE','Hà Nội','Vietnamese',NULL,'15 Nguyễn Trãi, Thanh Xuân, Hà Nội','15 Nguyễn Trãi, Thanh Xuân, Hà Nội','Hà Nội','Hà Nội','001082012345','2015-06-01','CA TP Hà Nội',NULL,NULL,'0100001001','0100001001',NULL,NULL,'Vietcombank','Chi Nhánh Hà Nội','1014789632','NGUYEN VAN AN','Nguyễn Thị Lan','0901111222','Vợ',2,'Thạc sĩ','Quản trị Kinh doanh','Đại học Kinh tế Quốc dân','Người này quá lười nên không để lại cái gì\n','2026-03-13 07:28:01.698','2026-03-16 04:04:35.281');
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_project_assignments`
--

DROP TABLE IF EXISTS `user_project_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_project_assignments` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_in_project` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allocation_percent` decimal(5,2) DEFAULT NULL,
  `hourly_rate` decimal(18,2) DEFAULT NULL,
  `joined_at` date NOT NULL,
  `left_at` date DEFAULT NULL,
  `status` enum('ACTIVE','ENDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `is_billable` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_project_assignments_user_id_project_id_joined_at_key` (`user_id`,`project_id`,`joined_at`),
  KEY `user_project_assignments_user_id_status_idx` (`user_id`,`status`),
  KEY `user_project_assignments_project_id_status_idx` (`project_id`,`status`),
  CONSTRAINT `user_project_assignments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_project_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_project_assignments`
--

LOCK TABLES `user_project_assignments` WRITE;
/*!40000 ALTER TABLE `user_project_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_project_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_id_key` (`user_id`,`role_id`),
  KEY `user_roles_role_id_idx` (`role_id`),
  CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES ('cmmokrfdj00187cw0ddq1jjbm','cmmokrf7a000r7cw0j1fv9te7','cmmokrezj00007cw0y0dyoifp','2026-03-13 07:28:01.687'),('cmmokrfdj00197cw032ji4o1e','cmmokrf7a000r7cw0j1fv9te7','cmmokrezk00017cw0ujza3i9e','2026-03-13 07:28:01.687'),('cmmokrfdj001a7cw046p93z4t','cmmokrf7a000r7cw0j1fv9te7','cmmokrezk00027cw0eqqsv1or','2026-03-13 07:28:01.687');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_salary_components`
--

DROP TABLE IF EXISTS `user_salary_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_salary_components` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_component_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_salary_components_user_id_salary_component_id_effective_key` (`user_id`,`salary_component_id`,`effective_from`),
  KEY `user_salary_components_user_id_is_active_idx` (`user_id`,`is_active`),
  KEY `user_salary_components_salary_component_id_fkey` (`salary_component_id`),
  CONSTRAINT `user_salary_components_salary_component_id_fkey` FOREIGN KEY (`salary_component_id`) REFERENCES `salary_components` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_salary_components_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_salary_components`
--

LOCK TABLES `user_salary_components` WRITE;
/*!40000 ALTER TABLE `user_salary_components` DISABLE KEYS */;
INSERT INTO `user_salary_components` VALUES ('cmmokrg6500717cw0xtdpeb6h','cmmokrf7a000r7cw0j1fv9te7','cmmokrfx0006b7cw0c7dwhcq6',10000000.00,'2024-01-01',NULL,1,NULL,'2026-03-13 07:28:02.717','2026-03-13 07:28:02.717'),('cmmokrg8800787cw0hwdtowkh','cmmokrf7a000r7cw0j1fv9te7','cmmokrfxc006c7cw0i2k100e0',500000.00,'2024-01-01',NULL,1,NULL,'2026-03-13 07:28:02.791','2026-03-13 07:28:02.791'),('cmmokrg9y007e7cw0afjtixtb','cmmokrf7a000r7cw0j1fv9te7','cmmokrfxm006d7cw0j3leax7p',730000.00,'2024-01-01',NULL,1,NULL,'2026-03-13 07:28:02.853','2026-03-13 07:28:02.853'),('cmmokrgfw007t7cw0x6z5ny7j','cmmokrf7a000r7cw0j1fv9te7','cmmokrfxz006e7cw0gs6l1k17',500000.00,'2024-01-01',NULL,1,NULL,'2026-03-13 07:28:03.067','2026-03-13 07:28:03.067');
/*!40000 ALTER TABLE `user_salary_components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_sessions_refresh_token_hash_key` (`refresh_token_hash`),
  KEY `user_sessions_user_id_expires_at_idx` (`user_id`,`expires_at`),
  CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES ('cmmoktm6n0000sww09l0vj8bc','cmmokrf7a000r7cw0j1fv9te7','913aa08c47e3c7841f529567e677db3186d46d8e251802096d30bd9a712ec2ab','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-20 07:29:43.813','2026-03-13 10:28:07.513','2026-03-13 07:29:43.821'),('cmmoku6fl0001sww0frr9mwgr','cmmokrf7a000r7cw0j1fv9te7','4f053436390da5fdf966fb7007ee23a95236e2d204a24e151120e87d798ef688','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-20 07:30:10.064','2026-03-13 10:28:07.513','2026-03-13 07:30:10.064'),('cmmokur620002sww07p6344cy','cmmokrf7a000r7cw0j1fv9te7','bff1e11af52fe75bb9dcf80fe715c7be26271fcab8bf376d35d4697efa8589b3','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 07:30:36.937','2026-03-13 10:28:07.513','2026-03-13 07:30:36.937'),('cmmokw7y90000bww0rrehr6cs','cmmokrf7a000r7cw0j1fv9te7','32b3d12cfe4dbb8cbe8bd9ea57af11452b4cada6ddfb92fa8438237daff98c28','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 07:31:45.341','2026-03-13 07:31:49.685','2026-03-13 07:31:45.345'),('cmmokwftm0001bww0n9c4tyk1','cmmokrf7a000r7cw0j1fv9te7','5c421ba5dd405c665515e84a37f1271e23006a1643f3ae0cfe45b8d573266504','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 07:31:55.545','2026-03-13 10:28:07.513','2026-03-13 07:31:55.545'),('cmmol842s0002bww0oqiq2je1','cmmokrf7a000r7cw0j1fv9te7','f78bdbdf0c134bb79a4cf3d41d548b59f3b62e22baa4337bf8998bcace960ced','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 07:41:00.195','2026-03-13 10:28:07.513','2026-03-13 07:41:00.195'),('cmmol9l7000001gw0lqturfhb','cmmokrf7a000r7cw0j1fv9te7','c284bed1062765edaea6d32381f1cb8e5f8153535ab5b30e9432c290c0c47c09','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 07:42:09.026','2026-03-13 10:28:07.513','2026-03-13 07:42:09.035'),('cmmolzy1x0000x8w0up212z3z','cmmokrf7a000r7cw0j1fv9te7','6b012ecfbebd268c8feff930aa41a83f9893b91641a03336a5966444c9644268','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 08:02:38.747','2026-03-13 08:13:13.508','2026-03-13 08:02:38.756'),('cmmomdoep00007ww0xmiq2tky','cmmokrf7a000r7cw0j1fv9te7','4ff1033cd1df14cea302b80f5b43d846cbb218121d1c04c2889a1da0eae42971','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-20 08:13:19.433','2026-03-13 10:28:07.513','2026-03-13 08:13:19.440'),('cmmomfbzu0000ecw0e8283xhk','cmmokrf7a000r7cw0j1fv9te7','d24d100f42098430386eb06f91462d48fc853a53feeee6fc84dd31ccbf81d292','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-20 08:31:23.164','2026-03-13 08:31:23.195','2026-03-13 08:14:36.665'),('cmmon8qer0001dkw07l6085s4','cmmokrf7a000r7cw0j1fv9te7','83c857385f624ef2a3058c62e1247ba72477adc2bb6b3ccd8655ff8285967d74','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-20 08:37:28.370','2026-03-13 10:28:07.513','2026-03-13 08:37:28.370'),('cmmon9lhk0000rkw05d0vb8xw','cmmokrf7a000r7cw0j1fv9te7','f458dda40a1fde6981b77e70266ad809c287ea56269972bff57855c484f1970f','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 08:38:08.630','2026-03-13 08:46:58.837','2026-03-13 08:38:08.645'),('cmmonltxv0000c4w0ecvrmbyy','cmmokrf7a000r7cw0j1fv9te7','7613cc07054d168472adb837098f82b6404201ab406ba20117db7c7e3968f324','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:02:59.749','2026-03-13 09:04:58.290','2026-03-13 08:47:39.474'),('cmmooavb60002y4w00kezh233','cmmokrf7a000r7cw0j1fv9te7','1281a7cf109a75d41696aedd3c229bbe6d98c0e211326c7cd72b14894f5d2f58','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:07:07.649','2026-03-13 09:07:12.266','2026-03-13 09:07:07.650'),('cmmopaq1t000150w0my8enmtg','cmmokrf7a000r7cw0j1fv9te7','52a3f0e107836f81a6dd3bb693554aeaeff01526c7ab11a6158de9067893ce50','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:35:00.446','2026-03-13 09:43:45.142','2026-03-13 09:35:00.447'),('cmmopmpr2000350w0q0phybfz','cmmokrf7a000r7cw0j1fv9te7','2b830306df6a3b468f029a5f021251dc9da3a1cf350f6ee8f6a3e451c4410b60','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:44:19.933','2026-03-13 09:48:58.781','2026-03-13 09:44:19.933'),('cmmopte4e000750w0ycn9o7tc','cmmokrf7a000r7cw0j1fv9te7','9eaed8aa3d51c89c9c22b6b7183d598427baad9b227165315dc7baad2f2c92e5','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:49:31.453','2026-03-13 09:49:48.897','2026-03-13 09:49:31.454'),('cmmoptw4p000850w0p88d59ep','cmmokrf7a000r7cw0j1fv9te7','89e6f0054aa75143ac52c0dcde32869e5fbea939ed684aa683f3c4394b6ec6a8','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 09:49:54.792','2026-03-13 09:49:58.411','2026-03-13 09:49:54.793'),('cmmopvaer000a50w0iwrnmk68','cmmokrf7a000r7cw0j1fv9te7','559faacadca90030ea55c57be08b330995123b235c477b76d300d444a718757f','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 10:10:50.540','2026-03-13 10:10:50.562','2026-03-13 09:50:59.955'),('cmmor3r66000b50w0k0svsatx','cmmokrf7a000r7cw0j1fv9te7','7ac15baad4ceb2a531e2d9de3fb427570035d17144f301fdbdd466fea72cce95','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 10:25:34.540','2026-03-13 10:28:07.513','2026-03-13 10:25:34.540'),('cmmor5zqz000e50w07oj6jd3i','cmmokrf7a000r7cw0j1fv9te7','0641b5ac3fa82c397108242700ca9120ebee89eb7d01c7cf4415cf8af7501fd8','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 10:27:18.970','2026-03-13 10:28:12.958','2026-03-13 10:27:18.971'),('cmmor7fms000f50w0s6aiqil5','cmmokrf7a000r7cw0j1fv9te7','8cd2849077c089180e8f3086797808a0b0adc16f53ae50116f723f36440451fd','::1','Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36','2026-03-20 10:28:26.211','2026-03-13 10:33:18.926','2026-03-13 10:28:26.211'),('cmmrvf78p00009gw0a7tuq6qy','cmmokrf7a000r7cw0j1fv9te7','762b363f575fa454f202f7fb040c8add3e983a0534a0396092259b1461a53c98','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-22 14:49:45.569',NULL,'2026-03-15 14:49:45.576'),('cmmskywkq0000ucw0swwptw15','cmmokrf7a000r7cw0j1fv9te7','9dcd817394677d6fdc8edd84ebd1cef5d4aac1dcb55415d459c2747f7ff142d8','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-23 03:06:43.212',NULL,'2026-03-16 02:44:55.273'),('cmmsmcwz10001ucw02wmuexnd','cmmokrf7a000r7cw0j1fv9te7','279f27887d781dd4096c176a51d40a749e6903c5068d433389cd5789b13fe72c','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-23 03:43:08.223',NULL,'2026-03-16 03:23:48.589'),('cmmsnqjm10002ucw02imxyc1e','cmmokrf7a000r7cw0j1fv9te7','672da78a779e22b9fffd7f77a09c3691f23f562dce66326aad1cc3db9411fe94','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-23 04:20:51.623','2026-03-16 04:20:53.927','2026-03-16 04:02:24.072'),('cmmsonoan0005ucw06235hny2','cmmokrf7a000r7cw0j1fv9te7','68098b900d852203ef0f2a3b03f087edb9a4ab2dc85a9a1d505da28777c4b18f','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-23 04:28:09.790','2026-03-16 04:29:20.328','2026-03-16 04:28:09.790'),('cmmsopu590007ucw0sfoqbu4l','cmmokrf7a000r7cw0j1fv9te7','e73b94daaad778d678a1254fe00d0bf5cd79d00da3c100527fea54efe159e2ae','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36','2026-03-23 04:29:50.684',NULL,'2026-03-16 04:29:50.684'),('cmmx0lxkv00005kw05u2zhdz4','cmmokrf7a000r7cw0j1fv9te7','4e72ce70d194299e67d687c2018c3f27e14039ac307b133074415f5db994c7db','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','2026-03-26 05:13:48.602',NULL,'2026-03-19 05:13:48.606');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_work_shifts`
--

DROP TABLE IF EXISTS `user_work_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_work_shifts` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shift_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `day_of_week` tinyint unsigned DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_work_shifts_user_id_shift_id_day_of_week_effective_from_key` (`user_id`,`shift_id`,`day_of_week`,`effective_from`),
  KEY `user_work_shifts_user_id_is_active_idx` (`user_id`,`is_active`),
  KEY `user_work_shifts_shift_id_idx` (`shift_id`),
  CONSTRAINT `user_work_shifts_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `work_shifts` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_work_shifts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_work_shifts`
--

LOCK TABLES `user_work_shifts` WRITE;
/*!40000 ALTER TABLE `user_work_shifts` DISABLE KEYS */;
INSERT INTO `user_work_shifts` VALUES ('cmmokrfl200317cw0ov0xoukw','cmmokrf7a000r7cw0j1fv9te7','cmmokrfhw002w7cw0zm1eyq7c',NULL,'2024-01-01',NULL,1,'Ca hành chính mặc định','2026-03-13 07:28:01.957','2026-03-13 07:28:01.957');
/*!40000 ALTER TABLE `user_work_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `employment_status` enum('PROBATION','ACTIVE','ON_LEAVE','TERMINATED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PROBATION',
  `account_status` enum('PENDING','ACTIVE','LOCKED','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime(3) DEFAULT NULL,
  `failed_login_count` int NOT NULL DEFAULT '0',
  `locked_until` datetime(3) DEFAULT NULL,
  `terminated_at` datetime(3) DEFAULT NULL,
  `termination_reason` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_user_code_key` (`user_code`),
  KEY `users_account_status_employment_status_idx` (`account_status`,`employment_status`),
  KEY `users_department_id_idx` (`department_id`),
  KEY `users_manager_id_idx` (`manager_id`),
  KEY `users_email_idx` (`email`),
  KEY `users_job_title_id_fkey` (`job_title_id`),
  KEY `users_created_by_user_id_fkey` (`created_by_user_id`),
  CONSTRAINT `users_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `job_titles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('cmmokrf7a000r7cw0j1fv9te7','EMP001','nguyen.van.an@innovision.vn','$2b$12$EAufxRbDXvxm1UROr7my5.nn48i6wcsLRJAuA5kLi8ibzYFex6hFW','Nguyễn Văn An','0983691265',NULL,'cmmokrf0a00077cw0xzxqh8tq','cmmokrf1z000d7cw02uywhvs7',NULL,'2018-01-15','ACTIVE','ACTIVE',0,'2026-03-19 05:13:48.581',0,NULL,NULL,NULL,NULL,'2026-03-13 07:28:01.461','2026-03-19 05:13:48.583',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_shifts`
--

DROP TABLE IF EXISTS `work_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_shifts` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shift_type` enum('MORNING','AFTERNOON','NIGHT','FLEXIBLE','SPLIT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `break_minutes` int NOT NULL DEFAULT '60',
  `work_minutes` int NOT NULL,
  `is_night_shift` tinyint(1) NOT NULL DEFAULT '0',
  `overtime_after_minutes` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_shifts_code_key` (`code`),
  UNIQUE KEY `work_shifts_name_key` (`name`),
  KEY `work_shifts_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_shifts`
--

LOCK TABLES `work_shifts` WRITE;
/*!40000 ALTER TABLE `work_shifts` DISABLE KEYS */;
INSERT INTO `work_shifts` VALUES ('cmmokrfhw002w7cw0zm1eyq7c','HC','Ca Hành Chính','MORNING','08:00','17:30',60,480,0,30,1,'2026-03-13 07:28:01.843','2026-03-13 07:28:01.843'),('cmmokrfi9002x7cw0cg7dwo03','SANG','Ca Sáng','MORNING','06:00','14:00',30,450,0,0,1,'2026-03-13 07:28:01.856','2026-03-13 07:28:01.856'),('cmmokrfj7002y7cw0wbg59rme','CHIEU','Ca Chiều','AFTERNOON','14:00','22:00',30,450,0,0,1,'2026-03-13 07:28:01.890','2026-03-13 07:28:01.890'),('cmmokrfjl002z7cw0gm0xoptn','DEM','Ca Đêm','NIGHT','22:00','06:00',60,420,1,0,1,'2026-03-13 07:28:01.903','2026-03-13 07:28:01.903'),('cmmokrfkb00307cw00myhcgem','FLEX','Ca Linh Hoạt','FLEXIBLE','09:00','18:00',60,480,0,0,1,'2026-03-13 07:28:01.930','2026-03-13 07:28:01.930');
/*!40000 ALTER TABLE `work_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'erp-innovsion'
--

--
-- Dumping routines for database 'erp-innovsion'
--
/*!50003 DROP PROCEDURE IF EXISTS `purge_users_except_one` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `purge_users_except_one`(IN p_keep_user_id VARCHAR(30))
BEGIN
  DECLARE v_keep_exists INT DEFAULT 0;
  DECLARE v_users_to_delete INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    DROP TEMPORARY TABLE IF EXISTS `tmp_users_to_delete`;
    RESIGNAL;
  END;

  SELECT COUNT(*)
    INTO v_keep_exists
  FROM `users`
  WHERE `id` = p_keep_user_id;

  IF v_keep_exists <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Keep user not found in users table';
  END IF;

  DROP TEMPORARY TABLE IF EXISTS `tmp_users_to_delete`;
  CREATE TEMPORARY TABLE `tmp_users_to_delete` (
    `id` VARCHAR(30) NOT NULL PRIMARY KEY
  );

  INSERT INTO `tmp_users_to_delete` (`id`)
  SELECT `id`
  FROM `users`
  WHERE `id` <> p_keep_user_id;

  SELECT COUNT(*)
    INTO v_users_to_delete
  FROM `tmp_users_to_delete`;

  START TRANSACTION;

  -- 1) NULL cac FK nullable tro toi user sap xoa
  UPDATE `departments` d
  JOIN `tmp_users_to_delete` t ON d.`head_user_id` = t.`id`
  SET d.`head_user_id` = NULL;

  UPDATE `users` u
  JOIN `tmp_users_to_delete` t ON u.`created_by_user_id` = t.`id`
  SET u.`created_by_user_id` = NULL;

  UPDATE `users` u
  JOIN `tmp_users_to_delete` t ON u.`manager_id` = t.`id`
  SET u.`manager_id` = NULL;

  UPDATE `attendance_requests` ar
  JOIN `tmp_users_to_delete` t ON ar.`reviewer_id` = t.`id`
  SET ar.`reviewer_id` = NULL;

  UPDATE `attendance_records` ar
  JOIN `tmp_users_to_delete` t ON ar.`adjusted_by_user_id` = t.`id`
  SET ar.`adjusted_by_user_id` = NULL;

  UPDATE `overtime_requests` ot
  JOIN `tmp_users_to_delete` t ON ot.`approver_user_id` = t.`id`
  SET ot.`approver_user_id` = NULL;

  UPDATE `projects` p
  JOIN `tmp_users_to_delete` t ON p.`project_manager_user_id` = t.`id`
  SET p.`project_manager_user_id` = NULL;

  UPDATE `project_milestones` pm
  JOIN `tmp_users_to_delete` t ON pm.`owner_user_id` = t.`id`
  SET pm.`owner_user_id` = NULL;

  UPDATE `project_expenses` pe
  JOIN `tmp_users_to_delete` t ON pe.`approved_by_user_id` = t.`id`
  SET pe.`approved_by_user_id` = NULL;

  UPDATE `payroll_periods` pp
  JOIN `tmp_users_to_delete` t ON pp.`approved_by_user_id` = t.`id`
  SET pp.`approved_by_user_id` = NULL;

  UPDATE `payroll_adjustments` pa
  JOIN `tmp_users_to_delete` t ON pa.`created_by_user_id` = t.`id`
  SET pa.`created_by_user_id` = NULL;

  UPDATE `payroll_adjustments` pa
  JOIN `tmp_users_to_delete` t ON pa.`approved_by_user_id` = t.`id`
  SET pa.`approved_by_user_id` = NULL;

  UPDATE `clients` c
  JOIN `tmp_users_to_delete` t ON c.`account_manager_user_id` = t.`id`
  SET c.`account_manager_user_id` = NULL;

  UPDATE `contracts` c
  JOIN `tmp_users_to_delete` t ON c.`signed_by_user_id` = t.`id`
  SET c.`signed_by_user_id` = NULL;

  UPDATE `invoices` i
  JOIN `tmp_users_to_delete` t ON i.`created_by_user_id` = t.`id`
  SET i.`created_by_user_id` = NULL;

  UPDATE `client_payments` cp
  JOIN `tmp_users_to_delete` t ON cp.`confirmed_by_user_id` = t.`id`
  SET cp.`confirmed_by_user_id` = NULL;

  UPDATE `client_documents` cd
  JOIN `tmp_users_to_delete` t ON cd.`uploaded_by_user_id` = t.`id`
  SET cd.`uploaded_by_user_id` = NULL;

  UPDATE `notifications` n
  JOIN `tmp_users_to_delete` t ON n.`sender_user_id` = t.`id`
  SET n.`sender_user_id` = NULL;

  UPDATE `audit_logs` al
  JOIN `tmp_users_to_delete` t ON al.`actor_user_id` = t.`id`
  SET al.`actor_user_id` = NULL;

  -- 2) Tach lien ket attendance_records -> attendance_requests
  -- Neu request nguon thuoc user sap xoa, null FK truoc khi xoa request
  UPDATE `attendance_records` ar
  JOIN `attendance_requests` req ON ar.`source_checkin_request_id` = req.`id`
  JOIN `tmp_users_to_delete` t ON req.`user_id` = t.`id`
  SET ar.`source_checkin_request_id` = NULL;

  UPDATE `attendance_records` ar
  JOIN `attendance_requests` req ON ar.`source_checkout_request_id` = req.`id`
  JOIN `tmp_users_to_delete` t ON req.`user_id` = t.`id`
  SET ar.`source_checkout_request_id` = NULL;

  -- 3) Xoa cac bang con co FK bat buoc toi user sap xoa
  -- Approval co approver_user_id bat buoc
  DELETE lra
  FROM `leave_request_approvals` lra
  JOIN `tmp_users_to_delete` t ON lra.`approver_user_id` = t.`id`;

  -- AttendanceRecord phai xoa truoc AttendanceRequest vi record dang reference request
  DELETE ar
  FROM `attendance_records` ar
  JOIN `tmp_users_to_delete` t ON ar.`user_id` = t.`id`;

  DELETE arq
  FROM `attendance_requests` arq
  JOIN `tmp_users_to_delete` t ON arq.`user_id` = t.`id`;

  -- LeaveRequestApproval se tu cascade khi xoa leave_requests cua user bi xoa
  DELETE lr
  FROM `leave_requests` lr
  JOIN `tmp_users_to_delete` t ON lr.`user_id` = t.`id`;

  DELETE ot
  FROM `overtime_requests` ot
  JOIN `tmp_users_to_delete` t ON ot.`user_id` = t.`id`;

  DELETE upa
  FROM `user_project_assignments` upa
  JOIN `tmp_users_to_delete` t ON upa.`user_id` = t.`id`;

  -- submitted_by_user_id la bat buoc
  DELETE pe
  FROM `project_expenses` pe
  JOIN `tmp_users_to_delete` t ON pe.`submitted_by_user_id` = t.`id`;

  DELETE uc
  FROM `user_compensations` uc
  JOIN `tmp_users_to_delete` t ON uc.`user_id` = t.`id`;

  DELETE usc
  FROM `user_salary_components` usc
  JOIN `tmp_users_to_delete` t ON usc.`user_id` = t.`id`;

  -- payroll_record_items se tu cascade khi xoa payroll_records
  DELETE pr
  FROM `payroll_records` pr
  JOIN `tmp_users_to_delete` t ON pr.`user_id` = t.`id`;

  DELETE pa
  FROM `payroll_adjustments` pa
  JOIN `tmp_users_to_delete` t ON pa.`user_id` = t.`id`;

  -- 4) Cuoi cung moi xoa users
  -- user_profiles, user_roles, auth_tokens, user_sessions, leave_balances,
  -- user_work_shifts, notifications(recipient_user_id) se tu cascade
  DELETE u
  FROM `users` u
  JOIN `tmp_users_to_delete` t ON u.`id` = t.`id`;

  COMMIT;

  SELECT
    p_keep_user_id AS `kept_user_id`,
    v_users_to_delete AS `deleted_user_count`,
    (SELECT COUNT(*) FROM `users`) AS `remaining_user_count`;

  DROP TEMPORARY TABLE IF EXISTS `tmp_users_to_delete`;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-19 12:45:17
