-- MySQL 8；发布新代码前在维护窗口执行一次，暂停任务写入和 Worker。
-- 时间点按 UTC 存储。兼容开发环境已通过 synchronize 创建 deadline_at 的情况。
SET time_zone = '+00:00';
SET @deadline_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'quest_record' AND column_name = 'deadline_at'),
  'SELECT 1',
  'ALTER TABLE quest_record ADD COLUMN deadline_at DATETIME NULL'
);
PREPARE deadline_stmt FROM @deadline_ddl;
EXECUTE deadline_stmt;
DEALLOCATE PREPARE deadline_stmt;

SET @deadline_index_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'quest_record' AND index_name = 'idx_record_status_deadline_id'),
  'SELECT 1',
  'CREATE INDEX idx_record_status_deadline_id ON quest_record (status, deadline_at, id)'
);
PREPARE deadline_index_stmt FROM @deadline_index_ddl;
EXECUTE deadline_index_stmt;
DEALLOCATE PREPARE deadline_index_stmt;

-- 仅补进行中记录；历史时长没有快照，使用当前模板时长近似回填。
-- 大表请按主键范围分批执行下列回填和更新，以缩短事务锁持有时间。
UPDATE quest_record AS record
JOIN quest ON quest.id = record.quest_id
SET record.deadline_at = TIMESTAMPADD(MINUTE, quest.duration_minutes + 30, record.created_at)
WHERE record.status = 'accepted' AND record.deadline_at IS NULL;

UPDATE quest_record
SET status = 'abandoned', abandoned_at = deadline_at, updated_at = UTC_TIMESTAMP()
WHERE status = 'accepted' AND deadline_at <= UTC_TIMESTAMP();
