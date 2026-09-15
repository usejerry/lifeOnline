export const MESSAGE_REMINDER_QUEUE = 'message-reminders';

export const DAILY_SIGN_IN_REMINDER_JOB = 'daily-sign-in-reminder';
export const DAILY_SIGN_IN_REMINDER_SCHEDULER =
  'daily-sign-in-reminder-at-20-shanghai';

// BullMQ 的 cron pattern 包含秒字段：秒、分、时、日、月、星期。
export const DAILY_SIGN_IN_REMINDER_PATTERN = '0 37 13 * * *';
export const BUSINESS_TIME_ZONE = 'Asia/Shanghai';

// 任务截止时间提醒队列
export const QUEST_DEADLINE_QUEUE = 'quest-deadline-reminders';
// 任务截止时间提醒任务名
export const QUEST_DEADLINE_JOB = 'scan-quest-deadlines';
// 任务截止时间提醒任务调度器
export const QUEST_DEADLINE_SCHEDULER = 'quest-deadline-every-minute';