-- Migration: Thêm các trường 2FA vào bảng users
-- Chạy: npx prisma migrate dev --name add_two_factor_auth

ALTER TABLE `users`
  ADD COLUMN `two_factor_enabled`    TINYINT(1)   NOT NULL DEFAULT 0          AFTER `must_change_password`,
  ADD COLUMN `two_factor_secret`     VARCHAR(255) NULL DEFAULT NULL            AFTER `two_factor_enabled`,
  ADD COLUMN `two_factor_pending`    VARCHAR(255) NULL DEFAULT NULL            AFTER `two_factor_secret`,
  ADD COLUMN `two_factor_enabled_at` DATETIME(3)  NULL DEFAULT NULL            AFTER `two_factor_pending`;
