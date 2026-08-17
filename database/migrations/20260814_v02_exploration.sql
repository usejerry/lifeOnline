-- V0.2 探索感：生产环境一次性升级脚本（MySQL 8）
-- 执行前请备份数据库；开发环境由 TypeORM synchronize 自动同步，不要重复执行本脚本。

CREATE TABLE `weekly_theme` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '周主题主键',
  `title` VARCHAR(80) NOT NULL COMMENT '主题标题',
  `subtitle` VARCHAR(120) NULL COMMENT '主题副标题',
  `description` VARCHAR(500) NULL COMMENT '主题说明',
  `cover_url` VARCHAR(500) NULL COMMENT '主题封面地址',
  `start_at` DATETIME NOT NULL COMMENT '生效时间',
  `end_at` DATETIME NOT NULL COMMENT '结束时间',
  `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `idx_weekly_theme_current` (`enabled`, `start_at`, `end_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周探索主题';

ALTER TABLE `quest`
  ADD COLUMN `location_mode` VARCHAR(20) NOT NULL DEFAULT 'anywhere' COMMENT 'anywhere/fixed/poi_type',
  ADD COLUMN `city_adcode` VARCHAR(12) NULL COMMENT '任务所属城市行政区划码',
  ADD COLUMN `fixed_longitude` DOUBLE NULL COMMENT '固定目标经度',
  ADD COLUMN `fixed_latitude` DOUBLE NULL COMMENT '固定目标纬度',
  ADD COLUMN `fixed_location_name` VARCHAR(120) NULL COMMENT '固定地点名称',
  ADD COLUMN `poi_type` VARCHAR(80) NULL COMMENT '高德 POI 类型编码',
  ADD COLUMN `unlock_radius_m` INT UNSIGNED NOT NULL DEFAULT 3000 COMMENT '地图展示/隐藏任务解锁半径（米）',
  ADD COLUMN `completion_radius_m` INT UNSIGNED NOT NULL DEFAULT 300 COMMENT '允许完成半径（米）',
  ADD COLUMN `weather_rule` JSON NULL COMMENT '天气限定规则',
  ADD COLUMN `is_hidden` TINYINT NOT NULL DEFAULT 0 COMMENT '是否隐藏任务',
  ADD COLUMN `weekly_theme_id` INT UNSIGNED NULL COMMENT '所属周主题',
  ADD INDEX `idx_quest_explore` (`enabled`, `location_mode`, `city_adcode`, `is_hidden`),
  ADD CONSTRAINT `fk_quest_weekly_theme`
    FOREIGN KEY (`weekly_theme_id`) REFERENCES `weekly_theme` (`id`) ON DELETE SET NULL;

CREATE TABLE `user_quest_library` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户 ID',
  `quest_id` INT UNSIGNED NOT NULL COMMENT '任务 ID',
  `saved_at` DATETIME NULL COMMENT '收藏时间，NULL 表示未收藏',
  `discovered_at` DATETIME NULL COMMENT '隐藏任务发现时间',
  `discovery_city_adcode` VARCHAR(12) NULL COMMENT '发现城市行政区划码',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_quest_library` (`user_id`, `quest_id`),
  INDEX `idx_library_user_saved` (`user_id`, `saved_at`),
  INDEX `idx_library_user_discovered` (`user_id`, `discovered_at`),
  CONSTRAINT `fk_library_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_library_quest` FOREIGN KEY (`quest_id`) REFERENCES `quest` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户任务收藏与发现记录';

ALTER TABLE `quest_record`
  ADD COLUMN `target_poi_id` VARCHAR(80) NULL COMMENT '接取时选中的高德 POI ID',
  ADD COLUMN `target_name` VARCHAR(120) NULL COMMENT '目标名称快照',
  ADD COLUMN `target_address` VARCHAR(255) NULL COMMENT '目标地址快照',
  ADD COLUMN `target_longitude` DOUBLE NULL COMMENT '目标经度快照',
  ADD COLUMN `target_latitude` DOUBLE NULL COMMENT '目标纬度快照',
  ADD COLUMN `completion_radius_m` INT UNSIGNED NULL COMMENT '完成半径快照（米）',
  ADD COLUMN `completed_longitude` DOUBLE NULL COMMENT '实际完成经度',
  ADD COLUMN `completed_latitude` DOUBLE NULL COMMENT '实际完成纬度',
  ADD COLUMN `distance_m` INT UNSIGNED NULL COMMENT '完成点距目标的距离（米）',
  ADD COLUMN `completed_city_adcode` VARCHAR(12) NULL COMMENT '完成城市行政区划码',
  ADD COLUMN `completed_city_name` VARCHAR(80) NULL COMMENT '完成城市名称',
  ADD COLUMN `weather_snapshot` JSON NULL COMMENT '完成时天气快照',
  ADD COLUMN `weather_rule_snapshot` JSON NULL COMMENT '接取时天气规则快照',
  ADD COLUMN `weekly_theme_id_snapshot` INT UNSIGNED NULL COMMENT '接取时周主题 ID 快照',
  ADD INDEX `idx_record_user_city_completed` (`user_id`, `completed_city_adcode`, `completed_at`);
