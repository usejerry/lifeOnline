import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeController } from './theme.controller';
import { ThemeService } from './theme.service';
import { WeeklyTheme } from './weekly-theme.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyTheme])],
  controllers: [ThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
