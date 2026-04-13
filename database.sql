CREATE DATABASE IF NOT EXISTS `rd_mozirje`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_slovenian_ci;

USE `rd_mozirje`;

CREATE TABLE IF NOT EXISTS `rd_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(80) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `modules_json` JSON NOT NULL,
  `permissions_json` JSON NOT NULL,
  `visible_statuses_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rd_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_storage` (
  `storage_key` VARCHAR(120) NOT NULL,
  `storage_value` LONGTEXT NOT NULL,
  `updated_by` VARCHAR(80) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`storage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(80) NULL,
  `action` VARCHAR(160) NOT NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rd_audit_log_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;


CREATE TABLE IF NOT EXISTS `rd_members` (
  `member_id` BIGINT UNSIGNED NOT NULL,
  `zap_st` VARCHAR(40) NULL,
  `status` VARCHAR(20) NULL,
  `spc` VARCHAR(10) NULL,
  `clanska` VARCHAR(40) NULL,
  `priimek` VARCHAR(120) NULL,
  `ime` VARCHAR(120) NULL,
  `email` VARCHAR(190) NULL,
  `telefon` VARCHAR(80) NULL,
  `naslov` VARCHAR(190) NULL,
  `posta` VARCHAR(20) NULL,
  `kraj` VARCHAR(120) NULL,
  `tip_karte` VARCHAR(80) NULL,
  `datum_rojstva` DATE NULL,
  `datum_vpisa` DATE NULL,
  `arhiviran` TINYINT(1) NOT NULL DEFAULT 0,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  KEY `idx_rd_members_name` (`priimek`, `ime`),
  KEY `idx_rd_members_clanska` (`clanska`),
  KEY `idx_rd_members_status` (`status`),
  KEY `idx_rd_members_arhiviran` (`arhiviran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_events` (
  `event_id` BIGINT UNSIGNED NOT NULL,
  `naslov` VARCHAR(190) NULL,
  `datum` DATE NULL,
  `tip` VARCHAR(60) NULL,
  `revir` VARCHAR(120) NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_rd_events_datum` (`datum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_member_fees` (
  `fee_year` INT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `state` VARCHAR(40) NOT NULL,
  `amount` DECIMAL(10,2) NULL,
  `updated_source_at` DATETIME NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fee_year`, `member_id`),
  KEY `idx_rd_member_fees_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_work_hours` (
  `work_year` INT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `hours_done` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_year`, `member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_licenses` (
  `license_year` INT UNSIGNED NOT NULL,
  `license_id` BIGINT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NULL,
  `st_karte` VARCHAR(80) NOT NULL,
  `vrsta_karte` VARCHAR(40) NULL,
  `ime` VARCHAR(120) NULL,
  `priimek` VARCHAR(120) NULL,
  `revir0` VARCHAR(120) NULL,
  `revir1` VARCHAR(120) NULL,
  `revir2` VARCHAR(120) NULL,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`license_year`, `license_id`, `archived`),
  KEY `idx_rd_licenses_number` (`st_karte`),
  KEY `idx_rd_licenses_member` (`member_id`),
  KEY `idx_rd_licenses_name` (`priimek`, `ime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_awards` (
  `award_id` BIGINT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `award_key` VARCHAR(80) NOT NULL,
  `award_date` DATE NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`award_id`),
  KEY `idx_rd_awards_member` (`member_id`),
  KEY `idx_rd_awards_date` (`award_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_officials` (
  `official_id` BIGINT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NULL,
  `body` VARCHAR(120) NULL,
  `role` VARCHAR(120) NULL,
  `mandate_start` INT NULL,
  `mandate_end` INT NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`official_id`),
  KEY `idx_rd_officials_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_membership_applications` (
  `application_id` BIGINT UNSIGNED NOT NULL,
  `priimek` VARCHAR(120) NULL,
  `ime` VARCHAR(120) NULL,
  `email` VARCHAR(190) NULL,
  `telefon` VARCHAR(80) NULL,
  `status` VARCHAR(40) NULL,
  `submitted_at` DATETIME NULL,
  `admin_confirmed_at` DATETIME NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `idx_rd_applications_name` (`priimek`, `ime`),
  KEY `idx_rd_applications_submitted` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_animal_observations` (
  `observation_id` BIGINT UNSIGNED NOT NULL,
  `observer_name` VARCHAR(190) NULL,
  `title` VARCHAR(190) NULL,
  `location_name` VARCHAR(190) NULL,
  `lat` DECIMAL(10,7) NULL,
  `lng` DECIMAL(10,7) NULL,
  `observed_at` DATETIME NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`observation_id`),
  KEY `idx_rd_observations_observed` (`observed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_yearly_recaps` (
  `recap_id` BIGINT UNSIGNED NOT NULL,
  `recap_year` INT UNSIGNED NOT NULL,
  `permit_number` VARCHAR(80) NOT NULL,
  `permit_type` VARCHAR(40) NOT NULL,
  `submitted_at` DATETIME NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`recap_id`),
  UNIQUE KEY `uq_rd_recaps_year_permit` (`recap_year`, `permit_number`, `permit_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_reminders` (
  `reminder_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(190) NULL,
  `reminder_time` DATETIME NULL,
  `done` TINYINT(1) NOT NULL DEFAULT 0,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reminder_id`),
  KEY `idx_rd_reminders_time` (`reminder_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_communication_groups` (
  `group_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `channel` VARCHAR(30) NULL,
  `member_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;

CREATE TABLE IF NOT EXISTS `rd_communication_log` (
  `message_id` BIGINT UNSIGNED NOT NULL,
  `channel` VARCHAR(30) NULL,
  `subject` VARCHAR(190) NULL,
  `recipient_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_by` VARCHAR(80) NULL,
  `created_at_source` DATETIME NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_slovenian_ci;
