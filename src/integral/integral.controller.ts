import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { IntegralService } from './integral.service';
import { AddIntegralDto } from './integral.dto';


@Controller('integral')
@UseGuards(JwtAuthGuard)
// 积分模块控制器
export class IntegralController {
}
