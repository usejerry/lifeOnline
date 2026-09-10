-- MySQL 8；仅用于 DB_SYNCHRONIZE=false 的环境，执行前备份。
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `userId` INT NOT NULL,
  `rememberMe` TINYINT NOT NULL DEFAULT 0,
  `userAgent` VARCHAR(512) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastUsedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_auth_sessions_user` (`userId`),
  INDEX `idx_auth_sessions_expiry` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `auth_refresh_tokens` (
  `tokenHash` VARCHAR(64) NOT NULL,
  `sessionId` VARCHAR(36) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  PRIMARY KEY (`tokenHash`),
  INDEX `idx_auth_refresh_session` (`sessionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
