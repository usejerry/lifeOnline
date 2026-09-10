import { Injectable } from '@nestjs/common';

@Injectable()
export class IntegralService {
    addIntegral(userId: number) {
        return `添加积分${userId}`;
    }
}
