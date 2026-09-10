import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('auth_sessions')
export class AuthSession {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Index()
  @Column()
  userId!: number;

  @Column({ default: false })
  rememberMe!: boolean;

  @Column({ type: 'varchar', length: 512, default: '' })
  userAgent!: string;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;

  @Column({ type: 'datetime', precision: 3 })
  lastUsedAt!: Date;

  @Index()
  @Column({ type: 'datetime', precision: 3 })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  revokedAt!: Date | null;
}
