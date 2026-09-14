import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BUSINESS_TIME_ZONE,
  DAILY_SIGN_IN_REMINDER_JOB,
  DAILY_SIGN_IN_REMINDER_PATTERN,
  DAILY_SIGN_IN_REMINDER_SCHEDULER,
  MESSAGE_REMINDER_QUEUE,
} from './message.constants';

@Injectable()
export class DailySignInReminderScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(MESSAGE_REMINDER_QUEUE)
    private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    // upsert 使用固定调度器 ID，多实例同时启动也只会保留一份每日计划。
    await this.reminderQueue.upsertJobScheduler(
      DAILY_SIGN_IN_REMINDER_SCHEDULER,
      {
        pattern: DAILY_SIGN_IN_REMINDER_PATTERN,
        tz: BUSINESS_TIME_ZONE,
      },
      {
        name: DAILY_SIGN_IN_REMINDER_JOB,
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
