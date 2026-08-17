import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Mood, Scene } from './quest.enums';

export class QueryQuestDto {
  @IsEnum(Mood)
  @IsOptional()
  mood?: Mood;

  @IsEnum(Scene)
  @IsOptional()
  scene?: Scene;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxMinutes?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  excludeId?: number;

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
}

export class RecommendationQueryDto {
  @IsEnum(Mood)
  mood!: Mood;

  @IsEnum(Scene)
  scene!: Scene;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  excludeId?: number;
}

export class NearbyQuestQueryDto {
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  @IsOptional()
  radius = 5000;

  @IsString()
  @IsOptional()
  cityAdcode?: string;
}
