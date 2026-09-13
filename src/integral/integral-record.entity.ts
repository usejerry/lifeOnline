import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';

/** 流水对应的资产类型。积分可消费，成长值用于升级。 */
export enum GrowthAssetType {
  POINTS = 'points',
  EXP = 'exp',
}

/** 产生流水的业务场景。 */
export enum GrowthBusinessType {
  SIGN_IN = 'sign_in',
  QUEST = 'quest',
  ACHIEVEMENT = 'achievement',
  EXCHANGE = 'exchange',
}


@Entity('growth_ledger')
@Unique('uq_growth_ledger_business', [
  'userId',
  'assetType',
  'businessType',
  'businessId',
])
@Index('idx_growth_ledger_user_asset_created', [
  'userId',
  'assetType',
  'createdAt',
])
export class GrowthLedger {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'asset_type', type: 'varchar', length: 20 })
  assetType!: GrowthAssetType;

  /** 正数表示增加，负数表示扣除。 */
  @Column({ type: 'int' })
  amount!: number;

  /** 本次变动完成后的账户余额，用于审计和排查账目。 */
  @Column({ name: 'balance_after', type: 'int', unsigned: true })
  balanceAfter!: number;

  @Column({ name: 'business_type', type: 'varchar', length: 30 })
  businessType!: GrowthBusinessType;

  /** 统一使用字符串，以兼容数字主键和 UUID 等不同业务主键。 */
  @Column({ name: 'business_id', type: 'varchar', length: 64 })
  businessId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
