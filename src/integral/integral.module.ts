import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegralController } from './integral.controller';
import { IntegralService } from './integral.service';
import { GrowthLedger } from './integral.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GrowthLedger])],
  controllers: [IntegralController],
  providers: [IntegralService],
})
export class IntegralModule {}
