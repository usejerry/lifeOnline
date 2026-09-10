import { Controller, Post, Body, Logger } from '@nestjs/common';
import { RangeService } from './range.service';
import { RangePipe } from './range.pipe';
import { RangeDto } from './range.dto';

@Controller('range')
export class RangeController {
  private readonly logger = new Logger(RangeController.name);
  constructor(private readonly rangeService: RangeService) {}

  @Post()
  getRange(@Body(new RangePipe()) body: RangeDto) {
    return this.rangeService.getRange(body);
  }
} 
