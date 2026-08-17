import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestController } from './quest.controller';
import { Quest } from './quest.entity';
import { QuestService } from './quest.service';
import { LocationModule } from '../location/location.module';
import { QuestLibraryModule } from '../quest-library/quest-library.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest]),
    LocationModule,
    QuestLibraryModule,
  ],
  controllers: [QuestController],
  providers: [QuestService],
})
export class QuestModule {}
