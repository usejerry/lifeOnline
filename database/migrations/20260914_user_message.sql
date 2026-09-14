-- MySQL 8；用于 DB_SYNCHRONIZE=false 的正式环境，执行前备份。
-- 在部署消息中心代码前执行，要求 user 表已存在。
-- 消息到达投递时间后才写入本表；队列任务仍由后续 BullMQ 调度保存。

CREATE TABLE `user_message` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '接收消息的用户 ID',
  `type` VARCHAR(40) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(100) NOT NULL COMMENT '消息标题',
  `content` VARCHAR(500) NOT NULL COMMENT '消息正文',
  `business_id` VARCHAR(64) NULL COMMENT '签到日期或支线记录 ID 等业务标识',
  `payload` JSON NULL COMMENT '前端跳转所需的结构化参数',
  `dedup_key` VARCHAR(160) NULL COMMENT '同类消息幂等键',
  `read_at` DATETIME(6) NULL COMMENT '阅读时间，NULL 表示未读',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_message_dedup` (`user_id`, `type`, `dedup_key`),
  KEY `idx_user_message_inbox` (`user_id`, `read_at`, `created_at`),
  CONSTRAINT `fk_user_message_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='用户站内消息';
