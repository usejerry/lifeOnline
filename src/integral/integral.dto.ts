import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsLatitude,
  IsLongitude,
  IsString,
  Max,
  MaxLength,
  Min,
  isString,
  isInt,
} from 'class-validator';
import { GrowthBusinessType, GrowthAssetType } from './integral-record.entity';

export class AddIntegralDto {
  @IsEnum(GrowthAssetType)
  assetType!: GrowthAssetType; // 积分类型

  @IsEnum(GrowthBusinessType)
  businessType!: GrowthBusinessType; // 业务类型

  @IsString()
  businessId!: string; // 业务主键
  
  @IsInt()
  amount!: number; // 积分数量

  @IsInt()
  balanceAfter!: number; // 本次变动完成后的账户余额，用于审计和排查账目
}