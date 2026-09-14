import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, QueryFailedError, Repository } from 'typeorm';
import { QueryMessageDto } from './message.dto';
import { UserMessage, UserMessageType } from './user-message.entity';

interface CreateMessageInput {
  userId: number;
  type: UserMessageType;
  title: string;
  content: string;
  businessId?: string;
  payload?: Record<string, unknown>;
  dedupKey?: string;
}

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(UserMessage)
    private readonly messageRepository: Repository<UserMessage>,
  ) {}

  async findAll(userId: number, query: QueryMessageDto) {
    const { page, pageSize, unreadOnly } = query;
    const [items, total] = await this.messageRepository.findAndCount({
      where: unreadOnly ? { userId, readAt: IsNull() } : { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async getUnreadCount(userId: number) {
    const count = await this.messageRepository.countBy({
      userId,
      readAt: IsNull(),
    });
    return { count };
  }

  async markAsRead(userId: number, id: number) {
    await this.messageRepository.update(
      { id, userId, readAt: IsNull() },
      { readAt: new Date() },
    );

    const message = await this.messageRepository.findOneBy({ id, userId });
    if (!message) throw new NotFoundException('消息不存在');
    return message;
  }

  async markAllAsRead(userId: number) {
    const result = await this.messageRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { affected: result.affected ?? 0 };
  }

  createDailySignInReminder(
    userId: number,
    businessDate: string,
    manager?: EntityManager,
  ) {
    return this.createMessage(
      {
        userId,
        type: UserMessageType.DAILY_SIGN_IN_REMINDER,
        title: '今天还没有签到',
        content: '来留下今天的脚印吧，完成签到还能获得成长积分。',
        businessId: businessDate,
        payload: { businessDate },
        dedupKey: businessDate,
      },
      manager,
    );
  }

  createQuestDeadlineReminder(
    userId: number,
    questRecordId: number,
    questTitle: string,
    deadlineAt: Date,
    reminderStage = 'before_deadline',
    manager?: EntityManager,
  ) {
    const deadline = deadlineAt.toISOString();
    return this.createMessage(
      {
        userId,
        type: UserMessageType.QUEST_DEADLINE_REMINDER,
        title: '支线即将截止',
        content: `“${questTitle}”即将截止，记得在截止前完成。`,
        businessId: String(questRecordId),
        payload: { questRecordId, deadlineAt: deadline },
        dedupKey: `${questRecordId}:${deadline}:${reminderStage}`,
      },
      manager,
    );
  }

  private async createMessage(
    input: CreateMessageInput,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(UserMessage)
      : this.messageRepository;
    const message = repository.create({
      ...input,
      businessId: input.businessId ?? null,
      payload: input.payload ?? null,
      dedupKey: input.dedupKey ?? null,
      readAt: null,
    });

    try {
      return await repository.save(message);
    } catch (error) {
      if (!this.isDuplicateEntry(error) || !input.dedupKey) throw error;
      return repository.findOneByOrFail({
        userId: input.userId,
        type: input.type,
        dedupKey: input.dedupKey,
      });
    }
  }

  private isDuplicateEntry(error: unknown) {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }
}
