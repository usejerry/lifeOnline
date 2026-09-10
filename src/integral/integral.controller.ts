import { Controller, UseGuards, Post } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { IntegralService } from './integral.service';


@Controller('integral')
@UseGuards(JwtAuthGuard)
// 积分模块控制器
export class IntegralController {
    constructor(private readonly integralService: IntegralService) {}

    // 添加积分
    @Post('add')
    addIntegral(@CurrentUserId() userId: number) {
        return this.integralService.addIntegral(userId);
    }
}
