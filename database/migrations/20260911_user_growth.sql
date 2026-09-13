-- MySQL 8；用于 DB_SYNCHRONIZE=false 的环境，执行前备份。
-- 在部署使用 UserGrowth 的代码前执行，要求 user 表已存在。
-- 一次性建表迁移；若开发环境已自动建表，请先核对表结构，不要重复执行。
-- 这里只创建表，不重置或推算历史积分；成长记录由应用初始化。

CREATE TABLE `user_growth` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `points_balance` INT NOT NULL DEFAULT 0,
  `total_exp` INT NOT NULL DEFAULT 0,
  `level` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_growth_user` (`user_id`),
  CONSTRAINT `fk_user_growth_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
