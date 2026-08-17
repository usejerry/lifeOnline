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
} from 'class-validator';
import { QuestRecordStatus } from './quest-record.entity';

export class CreateQuestRecordDto {
  @IsInt()
  @Min(1)
  questId!: number;

  /** POI 动态任务由前端把用户选中的目标一起提交；固定地点任务无需提交。 */
  @IsString()
  @MaxLength(80)
  @IsOptional()
  poiId?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  targetName?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  targetAddress?: string;

  @Type(() => Number)
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @Type(() => Number)
  @IsLatitude()
  @IsOptional()
  latitude?: number;
}

export class CompleteQuestRecordDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;

  @Type(() => Number)
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @Type(() => Number)
  @IsLatitude()
  @IsOptional()
  latitude?: number;
}

export class QueryQuestRecordDto {
  @IsEnum(QuestRecordStatus)
  @IsOptional()
  status: QuestRecordStatus = QuestRecordStatus.COMPLETED;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 10;
}
