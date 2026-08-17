import { Controller, Get, Query, Logger } from '@nestjs/common';
import { RangeService } from './range.service';

@Controller('range')
export class RangeController {
  private readonly logger = new Logger(RangeController.name);
  constructor(private readonly rangeService: RangeService) {}

  @Get()
  getRange(@Query('num') num?: number) {
    this.logger.log('getRange constructor');
    return this.rangeService.getRange({ num: num || 1 });
  }
}
