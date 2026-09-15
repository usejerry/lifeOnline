import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BUSINESS_TIME_ZONE,
  QUEST_DEADLINE_JOB,
  QUEST_DEADLINE_SCHEDULER,
  QUEST_DEADLINE_QUEUE,
} from './message.constants';

@Injectable()
export class QuestTimeoutReminderScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEST_DEADLINE_QUEUE)
    private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    // 固定调度器 ID，多个实例启动时共用同一份每分钟到期处理和提醒计划。
    await this.reminderQueue.upsertJobScheduler(
      QUEST_DEADLINE_SCHEDULER,
      {
        pattern: '0 * * * * *', // 每分钟执行一次
        tz: BUSINESS_TIME_ZONE,
      },
      {
        name: QUEST_DEADLINE_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 1_000,
        },
      },
    );
  }
}
