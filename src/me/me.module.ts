import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestRecord } from '../quest-record/quest-record.entity';
import { User } from '../user/user.entity';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPreference } from './user-preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreference, QuestRecord])],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
