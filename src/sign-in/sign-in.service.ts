import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSignIn } from './user-sign-in.entity';
import { QuerySignInRecordsDto } from './sign-in.dto';
import { GrowthService } from '../growth/growth.service';
import { GrowthBusinessType ,GrowthAssetType} from '../integral/integral-record.entity';

@Injectable()
export class SignInService {
  constructor(
    @InjectRepository(UserSignIn)
    private readonly userSignInRepository: Repository<UserSignIn>,
    private readonly growthService: GrowthService,
  ) {}

  async signIn(userId: number) {
    // 检查用户是否已签到
    const { signedIn } = await this.isSignedIn(userId);
    if (signedIn) {
      return false;
    }
    try {   
    // checkInDate 是业务日期，统一按北京时间计算。
    const record = await this.userSignInRepository.save({
      userId,
      checkInDate: this.todayInShanghai(),
    });
    // 签到成功后，添加积分
    await this.growthService.addPoints(userId, record.id.toString(), GrowthBusinessType.SIGN_IN,100);
    } catch (error) {
      throw error;
    }
    return '签到成功';
  }
  private todayInShanghai(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
  // 是否已签到
  async isSignedIn(userId: number) {
    console.log(this.todayInShanghai());
    const existingSignIn = await this.userSignInRepository.findOne({
      where: {
        userId,
        checkInDate: this.todayInShanghai(),
      },
    });
    return {
      signedIn: Boolean(existingSignIn),
      record: existingSignIn,
    };
  }

  // 获取签到记录
  async getSignInRecords(userId: number, query: QuerySignInRecordsDto) {
    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const [records, total] = await this.userSignInRepository.findAndCount({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip,
      take,
    });
    return {
      records,
      total,
      page,
      pageSize,
    };
  }
}
