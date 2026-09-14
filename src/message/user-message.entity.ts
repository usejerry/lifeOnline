import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum UserMessageType {
  DAILY_SIGN_IN_REMINDER = 'daily_sign_in_reminder',
  QUEST_DEADLINE_REMINDER = 'quest_deadline_reminder',
}

@Entity('user_message')
@Index('idx_user_message_inbox', ['userId', 'readAt', 'createdAt'])
@Index('uq_user_message_dedup', ['userId', 'type', 'dedupKey'], {
  unique: true,
})
export class UserMessage {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 40 })
  type!: UserMessageType;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  content!: string;

  /** 关联的业务记录，例如签到日期或 quest_record.id。 */
  @Column({ name: 'business_id', type: 'varchar', length: 64, nullable: true })
  businessId!: string | null;

  /** 前端打开消息时需要的结构化参数。 */
  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  /**
   * 同一用户、同一类型下的幂等键。
   * 签到提醒使用业务日期，支线提醒使用“记录 ID + 截止时间 + 提醒阶段”。
   */
  @Column({ name: 'dedup_key', type: 'varchar', length: 160, nullable: true })
  dedupKey!: string | null;

  @Column({ name: 'read_at', type: 'datetime', precision: 6, nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
