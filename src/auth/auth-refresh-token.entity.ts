import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('auth_refresh_tokens')
export class AuthRefreshToken {
  // 只存 SHA-256 哈希，数据库泄漏不能直接拿来刷新。
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  sessionId!: string;

  @Column({ type: 'datetime', precision: 3 })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  usedAt!: Date | null;
}
