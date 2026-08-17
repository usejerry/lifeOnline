import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mood, Scene } from '../quest/quest.enums';
import { User } from '../user/user.entity';

@Entity('user_preference')
export class UserPreference {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @Column({ type: 'varchar', length: 20 })
  mood!: Mood;

  @Column({ name: 'available_minutes', type: 'smallint', unsigned: true })
  availableMinutes!: number;

  @Column({ type: 'varchar', length: 20 })
  scene!: Scene;

  @Column({ name: 'onboarded_at', type: 'datetime' })
  onboardedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
