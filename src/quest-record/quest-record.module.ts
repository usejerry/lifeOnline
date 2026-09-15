import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from '../quest/quest.entity';
import { QuestRecordController } from './quest-record.controller';
import { QuestRecord } from './quest-record.entity';
import { QuestRecordService } from './quest-record.service';
import { LocationModule } from '../location/location.module';
import { QuestLibraryModule } from '../quest-library/quest-library.module';
import { QuestRecordExpiryService } from './quest-record-expiry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, QuestRecord]),
    LocationModule,
    QuestLibraryModule,
  ],
  controllers: [QuestRecordController],
  providers: [QuestRecordService, QuestRecordExpiryService],
})
export class QuestRecordModule {}
