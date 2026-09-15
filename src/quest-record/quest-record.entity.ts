import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Quest } from '../quest/quest.entity';
import { User } from '../user/user.entity';

export enum QuestRecordStatus {
  ACCEPTED = 'accepted',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('quest_record')
@Index('idx_record_status_deadline_id', ['status', 'deadlineAt', 'id'])
@Index('idx_record_user_status_created', ['userId', 'status', 'createdAt'])
export class QuestRecord {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'quest_id', type: 'int', unsigned: true })
  questId!: number;

  @Column({ name: 'quest_title_snapshot', type: 'varchar', length: 120 })
  questTitleSnapshot!: string;

  /** 以下 target_* 字段是接取瞬间的目标快照，任务后台修改后也不会影响进行中记录。 */
  @Column({
    name: 'target_poi_id',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  targetPoiId!: string | null;

  @Column({ name: 'target_name', type: 'varchar', length: 120, nullable: true })
  targetName!: string | null;

  @Column({
    name: 'target_address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  targetAddress!: string | null;

  @Column({ name: 'target_longitude', type: 'double', nullable: true })
  targetLongitude!: number | null;

  @Column({ name: 'target_latitude', type: 'double', nullable: true })
  targetLatitude!: number | null;

  @Column({
    name: 'completion_radius_m',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  completionRadiusM!: number | null;

  @Column({ type: 'varchar', length: 20, default: QuestRecordStatus.ACCEPTED })
  status!: QuestRecordStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'accepted_at', type: 'datetime' })
  acceptedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'abandoned_at', type: 'datetime', nullable: true })
  abandonedAt!: Date | null;

  @Column({ name: 'completed_longitude', type: 'double', nullable: true })
  completedLongitude!: number | null;

  @Column({ name: 'completed_latitude', type: 'double', nullable: true })
  completedLatitude!: number | null;

  @Column({ name: 'distance_m', type: 'int', unsigned: true, nullable: true })
  distanceM!: number | null;

  @Column({
    name: 'completed_city_adcode',
    type: 'varchar',
    length: 12,
    nullable: true,
  })
  completedCityAdcode!: string | null;

  @Column({
    name: 'completed_city_name',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  completedCityName!: string | null;

  @Column({ name: 'weather_snapshot', type: 'json', nullable: true })
  weatherSnapshot!: {
    weather: string;
    temperature: number | null;
    weatherCode?: string;
  } | null;

  @Column({ name: 'weather_rule_snapshot', type: 'json', nullable: true })
  weatherRuleSnapshot!: Record<string, unknown> | null;

  @Column({
    name: 'weekly_theme_id_snapshot',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  weeklyThemeIdSnapshot!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // 任务截止时间
  @Column({ name: 'deadline_at', type: 'datetime', nullable: true })
  deadlineAt!: Date | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Quest, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'quest_id' })
  quest!: Quest;
}
