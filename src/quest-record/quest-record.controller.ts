import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CompleteQuestRecordDto,
  CreateQuestRecordDto,
  QueryQuestRecordDto,
} from './quest-record.dto';
import { QuestRecordService } from './quest-record.service';

interface UploadedQuestImage {
  buffer: Buffer;
  originalname: string;
}

const uploadDirectory = join(process.cwd(), 'uploads', 'quests');

@Controller('quest-records')
@UseGuards(JwtAuthGuard)
export class QuestRecordController {
  constructor(private readonly recordService: QuestRecordService) {}

  @Post()
  accept(@CurrentUserId() userId: number, @Body() dto: CreateQuestRecordDto) {
    return this.recordService.accept(userId, dto);
  }

  @Get('active')
  findActive(@CurrentUserId() userId: number) {
    return this.recordService.findActive(userId);
  }

  @Get()
  findAll(
    @CurrentUserId() userId: number,
    @Query() query: QueryQuestRecordDto,
  ) {
    return this.recordService.findAll(userId, query);
  }

  @Patch(':id/abandon')
  abandon(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
  ) {
    return this.recordService.abandon(id, userId);
  }

  @Post(':id/complete')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
        ) {
          callback(new BadRequestException('图片仅支持 jpg、png、webp'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
    @Body() dto: CompleteQuestRecordDto,
    @UploadedFile() file?: UploadedQuestImage,
  ) {
    const filename = file
      ? `${randomUUID()}${extname(file.originalname).toLowerCase()}`
      : undefined;
    const filePath = filename ? join(uploadDirectory, filename) : undefined;

    if (filePath && file) {
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(filePath, file.buffer);
    }

    try {
      return await this.recordService.complete(
        id,
        userId,
        dto,
        filename ? `/uploads/quests/${filename}` : undefined,
      );
    } catch (error) {
      if (filePath) await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }
}
