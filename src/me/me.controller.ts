import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeService } from './me.service';
import { UpdatePreferenceDto } from './update-preference.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  getMe(@CurrentUserId() userId: number) {
    return this.meService.getMe(userId);
  }

  @Put('preference')
  savePreference(
    @CurrentUserId() userId: number,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.meService.savePreference(userId, dto);
  }
}
