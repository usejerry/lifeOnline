import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestRecord, QuestRecordStatus } from './quest-record.entity';

@Injectable()
export class QuestRecordExpiryService {
  constructor(
    @InjectRepository(QuestRecord)
    private readonly records: Repository<QuestRecord>,
  ) {}

  async expire(userId?: number): Promise<number> {
    const now = new Date();
    let affected = 0;
    // 更新后记录会退出 accepted 集合，每批重新取最早到期的记录，无需 OFFSET。
    while (true) {
      const query = this.records
        .createQueryBuilder('record')
        .select(['record.id'])
        .where('record.status = :status', {
          status: QuestRecordStatus.ACCEPTED,
        })
        .andWhere('record.deadlineAt <= :now', { now })
        .orderBy('record.deadlineAt', 'ASC')
        .addOrderBy('record.id', 'ASC')
        .take(200);
      if (userId !== undefined)
        query.andWhere('record.userId = :userId', { userId });
      const batch = await query.getMany();
      if (!batch.length) return affected;

      // 再次校验状态和截止时间，不能覆盖用户并发完成的记录。
      const update = this.records
        .createQueryBuilder()
        .update(QuestRecord)
        .set({
          status: QuestRecordStatus.ABANDONED,
          abandonedAt: () => 'deadline_at',
        })
        .whereInIds(batch.map((record) => record.id))
        .andWhere('status = :status', { status: QuestRecordStatus.ACCEPTED })
        .andWhere('deadline_at <= :now', { now });
      if (userId !== undefined)
        update.andWhere('user_id = :userId', { userId });
      affected += (await update.execute()).affected ?? 0;
    }
  }
}
