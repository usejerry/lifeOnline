import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { UserGrowth } from './user-growth.entity';
import { TypeOrmModule } from '@nestjs/typeorm';  
import { IntegralModule } from '../integral/integral.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserGrowth]),IntegralModule],
  controllers: [GrowthController],
  providers: [GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}
