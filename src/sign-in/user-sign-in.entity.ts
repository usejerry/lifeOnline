import {
  Column,
  CreateDateColumn,
  Entity,
  Unique,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_sign_in')
@Unique('UQ_user_sign_in_user_date', ['userId', 'checkInDate'])
export class UserSignIn {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;
  
  @Column({ name: 'check_in_date', type: 'date'})
  checkInDate!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
