import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { UserSignIn } from '../sign-in/user-sign-in.entity';
import { User } from '../user/user.entity';
import {
  BUSINESS_TIME_ZONE,
  DAILY_SIGN_IN_REMINDER_JOB,
  MESSAGE_REMINDER_QUEUE,
} from './message.constants';
import { MessageService } from './message.service';

interface UserIdRow {
  id: number | string;
}

export interface DailySignInReminderResult {
  businessDate: string;
  processedUsers: number;
}

const USER_BATCH_SIZE = 200;

@Processor(MESSAGE_REMINDER_QUEUE, { concurrency: 1 })
export class DailySignInReminderProcessor extends WorkerHost {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly messageService: MessageService,
  ) {
    super();
  }

  async process(
    job: Job<Record<string, never>, DailySignInReminderResult, string>,
  ): Promise<DailySignInReminderResult> {
    if (job.name !== DAILY_SIGN_IN_REMINDER_JOB) {
      throw new Error(`不支持的消息任务：${job.name}`);
    }

    const businessDate = this.dateInShanghai();
    let lastUserId = 0;
    let processedUsers = 0;

    while (true) {
      // 使用 ID 游标分页，避免用户数量较多时一次性加载全部记录。
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'id')
        .leftJoin(
          UserSignIn,
          'sign_in',
          'sign_in.user_id = user.id AND sign_in.check_in_date = :businessDate',
          { businessDate },
        )
        .where('user.status = :status', { status: 'active' })
        .andWhere('user.id > :lastUserId', { lastUserId })
        .andWhere('sign_in.id IS NULL')
        .orderBy('user.id', 'ASC')
        .limit(USER_BATCH_SIZE)
        .getRawMany<UserIdRow>();

      if (users.length === 0) break;

      for (const user of users) {
        const userId = Number(user.id);
        await this.messageService.createDailySignInReminder(
          userId,
          businessDate,
        );
        processedUsers += 1;
      }

      lastUserId = Number(users.at(-1)!.id);
    }

    return { businessDate, processedUsers };
  }

  private dateInShanghai(now = new Date()) {
    // 签到表保存的是上海业务日期，不能直接使用服务器所在时区计算。
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
}
