import { Controller, Post, UseGuards,Body } from '@nestjs/common';
import { SignInService } from './sign-in.service';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuerySignInRecordsDto } from './sign-in.dto';


@Controller('sign-in')
@UseGuards(JwtAuthGuard)
export class SignInController {
    constructor(private readonly signInService: SignInService) {}
    
    // 签到
    @Post()
    signIn(@CurrentUserId() userId: number) {
        return this.signInService.signIn(userId);
    }

    // 检查是否签到
    @Post('check')
    isSignedIn(@CurrentUserId() userId: number) {
        return this.signInService.isSignedIn(userId);   
    }

    // 获取签到记录
    @Post('record')
    getSignInRecords(@CurrentUserId() userId: number, @Body() body: QuerySignInRecordsDto) {
        return this.signInService.getSignInRecords(userId, body);
    }
}
