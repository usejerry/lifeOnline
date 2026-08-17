import { Controller, Get } from '@nestjs/common';
import { ThemeService } from './theme.service';

@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get('current')
  current() {
    return this.themeService.current();
  }
}
