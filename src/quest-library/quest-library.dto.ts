import { Type } from 'class-transformer';
import { IsEnum, IsLatitude, IsLongitude, IsOptional } from 'class-validator';

export enum QuestLibraryKind {
  SAVED = 'saved',
  DISCOVERED = 'discovered',
}

export class QueryQuestLibraryDto {
  @IsEnum(QuestLibraryKind)
  kind!: QuestLibraryKind;
}

export class DiscoverQuestDto {
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @IsOptional()
  cityAdcode?: string;
}
