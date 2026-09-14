import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMessage } from './user-message.entity';
import { BullModule } from '@nestjs/bullmq';
import { User } from '../user/user.entity';
import { UserSignIn } from '../sign-in/user-sign-in.entity';
import { MESSAGE_REMINDER_QUEUE } from './message.constants';
import { DailySignInReminderScheduler } from './daily-sign-in-reminder.scheduler';
import { DailySignInReminderProcessor } from './daily-sign-in-reminder.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMessage, User, UserSignIn]),
    BullModule.registerQueue({ name: MESSAGE_REMINDER_QUEUE }),
  ],
  controllers: [MessageController],
  providers: [
    MessageService,
    DailySignInReminderScheduler,
    DailySignInReminderProcessor,
  ],
  exports: [MessageService],
})
export class MessageModule {}
