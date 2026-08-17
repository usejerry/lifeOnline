import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryQuestLibraryDto } from './quest-library.dto';
import { QuestLibraryService } from './quest-library.service';

@Controller('me/quest-library')
@UseGuards(JwtAuthGuard)
export class QuestLibraryController {
  constructor(private readonly libraryService: QuestLibraryService) {}

  @Get()
  list(@CurrentUserId() userId: number, @Query() query: QueryQuestLibraryDto) {
    return this.libraryService.list(userId, query.kind);
  }

  @Put(':questId/save')
  save(
    @CurrentUserId() userId: number,
    @Param('questId', ParseIntPipe) questId: number,
  ) {
    return this.libraryService.save(userId, questId);
  }

  @Delete(':questId/save')
  unsave(
    @CurrentUserId() userId: number,
    @Param('questId', ParseIntPipe) questId: number,
  ) {
    return this.libraryService.unsave(userId, questId);
  }
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class CityBadgeController {
  constructor(private readonly libraryService: QuestLibraryService) {}

  @Get('city-badges')
  list(@CurrentUserId() userId: number) {
    return this.libraryService.cityBadges(userId);
  }
}
