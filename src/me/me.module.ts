import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestRecord } from '../quest-record/quest-record.entity';
import { User } from '../user/user.entity';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPreference } from './user-preference.entity';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreference, QuestRecord]),GrowthModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
