import { Module } from '@nestjs/common';
import { RangeController } from './range.controller';
import { RangeService } from './range.service';

@Module({
  controllers: [RangeController],
  providers: [RangeService],
})
export class RangeModule {}
