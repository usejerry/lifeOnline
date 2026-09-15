import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import {
  QuestRecord,
  QuestRecordStatus,
} from '../quest-record/quest-record.entity';
import { QUEST_DEADLINE_JOB, QUEST_DEADLINE_QUEUE } from './message.constants';
import { MessageService } from './message.service';
import { QuestRecordExpiryService } from '../quest-record/quest-record-expiry.service';

export interface QuestTimeoutReminderResult {
  processedRecords: number;
  expiredRecords: number;
}

@Processor(QUEST_DEADLINE_QUEUE, { concurrency: 1 })
export class QuestTimeoutReminderProcessor extends WorkerHost {
  constructor(
    @InjectRepository(QuestRecord)
    private readonly recordRepository: Repository<QuestRecord>,
    private readonly messageService: MessageService,
    private readonly expiryService: QuestRecordExpiryService,
  ) {
    super();
  }

  async process(
    job: Job<Record<string, never>, QuestTimeoutReminderResult, string>,
  ): Promise<QuestTimeoutReminderResult> {
    if (job.name !== QUEST_DEADLINE_JOB) {
      throw new Error(`不支持的消息任务：${job.name}`);
    }

    const expiredRecords = await this.expiryService.expire();
    // 在循环外固定时间窗口，避免扫描过程中范围不断变化。
    const now = new Date();
    const reminderBefore = new Date(now.getTime() + 10 * 60_000);

    let lastId = 0;
    let lastDeadline: Date | null = null;
    let processedRecords = 0;

    while (true) {
      const query = this.recordRepository
        .createQueryBuilder('record')
        .where('record.status = :status', {
          status: QuestRecordStatus.ACCEPTED,
        })
        .andWhere('record.deadlineAt > :now', { now })
        .andWhere('record.deadlineAt <= :reminderBefore', {
          reminderBefore,
        })
        .orderBy('record.deadlineAt', 'ASC')
        .addOrderBy('record.id', 'ASC')
        .limit(200);
      if (lastDeadline) {
        query.andWhere(
          '(record.deadlineAt > :lastDeadline OR (record.deadlineAt = :lastDeadline AND record.id > :lastId))',
          { lastDeadline, lastId },
        );
      }
      const records = await query.getMany();

      if (records.length === 0) break;

      for (const record of records) {
        if (!record.deadlineAt) continue;

        // 扫描可能耗时，发送前复核，减少过期或已完成任务的提醒。
        const current = await this.recordRepository.findOneBy({
          id: record.id,
          userId: record.userId,
          status: QuestRecordStatus.ACCEPTED,
        });
        if (
          !current?.deadlineAt ||
          current.deadlineAt.getTime() <= Date.now() ||
          current.deadlineAt.getTime() !== record.deadlineAt.getTime()
        )
          continue;

        await this.messageService.createQuestDeadlineReminder(
          record.userId,
          record.id,
          record.questTitleSnapshot,
          record.deadlineAt,
          'before_10_minutes',
        );

        processedRecords += 1;
      }

      const lastRecord = records.at(-1);
      if (!lastRecord) break;
      lastId = lastRecord.id;
      lastDeadline = lastRecord.deadlineAt;
    }

    return { processedRecords, expiredRecords };
  }
}
