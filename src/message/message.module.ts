import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMessage } from './user-message.entity';
import { BullModule } from '@nestjs/bullmq';
import { User } from '../user/user.entity';
import { UserSignIn } from '../sign-in/user-sign-in.entity';
import { QuestRecord } from '../quest-record/quest-record.entity';
import {
  MESSAGE_REMINDER_QUEUE,
  QUEST_DEADLINE_QUEUE,
} from './message.constants';
import { DailySignInReminderScheduler } from './daily-sign-in-reminder.scheduler';
import { DailySignInReminderProcessor } from './daily-sign-in-reminder.processor';
import { QuestTimeoutReminderScheduler } from './quest-timeout-reminder.scheduler';
import { QuestTimeoutReminderProcessor } from './quest-timeout-reminder.processor';
import { QuestRecordExpiryService } from '../quest-record/quest-record-expiry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMessage, User, UserSignIn, QuestRecord]),
    BullModule.registerQueue(
      { name: MESSAGE_REMINDER_QUEUE },
      { name: QUEST_DEADLINE_QUEUE },
    ),
  ],
  controllers: [MessageController],
  providers: [
    QuestRecordExpiryService,
    MessageService,
    DailySignInReminderScheduler,
    DailySignInReminderProcessor,
    QuestTimeoutReminderProcessor,
    QuestTimeoutReminderScheduler,
  ],
  exports: [MessageService],
})
export class MessageModule {}
