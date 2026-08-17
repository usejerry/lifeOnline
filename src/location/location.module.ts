import { Module } from '@nestjs/common';
import { AmapProxyController } from './amap-proxy.controller';
import { AmapService } from './amap.service';
import { LocationService } from './location.service';

@Module({
  controllers: [AmapProxyController],
  providers: [AmapService, LocationService],
  exports: [AmapService, LocationService],
})
export class LocationModule {}
