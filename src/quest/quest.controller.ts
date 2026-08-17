import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiscoverQuestDto } from '../quest-library/quest-library.dto';
import { QuestLibraryService } from '../quest-library/quest-library.service';
import {
  NearbyQuestQueryDto,
  QueryQuestDto,
  RecommendationQueryDto,
} from './query-quest.dto';
import { QuestService } from './quest.service';

@Controller('quests')
export class QuestController {
  constructor(
    private readonly questService: QuestService,
    private readonly libraryService: QuestLibraryService,
  ) {}

  @Get('nearby')
  nearby(@Query() query: NearbyQuestQueryDto) {
    return this.questService.nearby(query);
  }

  @Post(':id/discover')
  @UseGuards(JwtAuthGuard)
  discover(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
    @Body() dto: DiscoverQuestDto,
  ) {
    return this.libraryService.discover(userId, id, dto);
  }

  @Get('recommendation')
  recommend(@Query() query: RecommendationQueryDto) {
    return this.questService.recommend(query);
  }

  @Get()
  findAll(@Query() query: QueryQuestDto) {
    return this.questService.findAll(query);
  }
}
