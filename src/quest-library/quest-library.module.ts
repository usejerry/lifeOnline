import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationModule } from '../location/location.module';
import { Quest } from '../quest/quest.entity';
import { QuestRecord } from '../quest-record/quest-record.entity';
import {
  CityBadgeController,
  QuestLibraryController,
} from './quest-library.controller';
import { QuestLibraryService } from './quest-library.service';
import { UserQuestLibrary } from './user-quest-library.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserQuestLibrary, Quest, QuestRecord]),
    LocationModule,
  ],
  controllers: [QuestLibraryController, CityBadgeController],
  providers: [QuestLibraryService],
  exports: [QuestLibraryService],
})
export class QuestLibraryModule {}
