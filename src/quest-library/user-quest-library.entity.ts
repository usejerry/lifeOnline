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

@Entity('user_quest_library')
@Index('uk_user_quest_library', ['userId', 'questId'], { unique: true })
@Index('idx_library_user_saved', ['userId', 'savedAt'])
@Index('idx_library_user_discovered', ['userId', 'discoveredAt'])
export class UserQuestLibrary {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'quest_id', type: 'int', unsigned: true })
  questId!: number;

  @Column({ name: 'saved_at', type: 'datetime', nullable: true })
  savedAt!: Date | null;

  @Column({ name: 'discovered_at', type: 'datetime', nullable: true })
  discoveredAt!: Date | null;

  @Column({
    name: 'discovery_city_adcode',
    type: 'varchar',
    length: 12,
    nullable: true,
  })
  discoveryCityAdcode!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Quest, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quest_id' })
  quest!: Quest;
}
