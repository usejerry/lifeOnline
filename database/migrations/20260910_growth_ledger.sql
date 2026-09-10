CREATE TABLE `growth_ledger` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `asset_type` VARCHAR(20) NOT NULL,
  `amount` INT NOT NULL,
  `balance_after` INT UNSIGNED NOT NULL,
  `business_type` VARCHAR(30) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_growth_ledger_business` (
    `user_id`,
    `asset_type`,
    `business_type`,
    `business_id`
  ),
  KEY `idx_growth_ledger_user_asset_created` (
    `user_id`,
    `asset_type`,
    `created_at`
  ),
  CONSTRAINT `fk_growth_ledger_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
