import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UserMessageType } from './user-message.entity';

export class CreateMessageDto {
  @IsEnum(UserMessageType)
  type!: UserMessageType;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(500)
  content!: string;

  @IsString()
  @MaxLength(64)
  @IsOptional()
  businessId?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  dedupKey?: string;
}

export class QueryMessageDto {
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
  pageSize = 20;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  unreadOnly = false;
}
