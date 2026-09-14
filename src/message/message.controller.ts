import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryMessageDto } from './message.dto';
import { MessageService } from './message.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  findAll(@CurrentUserId() userId: number, @Query() query: QueryMessageDto) {
    return this.messageService.findAll(userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUserId() userId: number) {
    return this.messageService.getUnreadCount(userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUserId() userId: number) {
    return this.messageService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messageService.markAsRead(userId, id);
  }
}
