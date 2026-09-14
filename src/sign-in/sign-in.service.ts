import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { UserSignIn } from './user-sign-in.entity';
import { QuerySignInRecordsDto } from './sign-in.dto';
import { GrowthService } from '../growth/growth.service';
import { GrowthBusinessType } from '../integral/integral-record.entity';

@Injectable()
export class SignInService {
  constructor(
    @InjectRepository(UserSignIn)
    private readonly userSignInRepository: Repository<UserSignIn>,
    private readonly growthService: GrowthService,
    private readonly dataSource: DataSource,
  ) {}

  async signIn(userId: number) {
    const checkInDate = this.todayInShanghai();

    return this.dataSource.transaction(async (manager) => {
      const userSignInRepository = manager.getRepository(UserSignIn);
      const existing = await userSignInRepository.findOneBy({
        userId,
        checkInDate,
      });
      if (existing) return false;

      let record: UserSignIn;
      try {
        record = await userSignInRepository.save({ userId, checkInDate });
      } catch (error) {
        // 唯一索引是并发签到的最终防线；重复请求按已签到处理。
        if (this.isDuplicateEntry(error)) return false;
        throw error;
      }

      await this.growthService.addPoints(
        userId,
        record.id.toString(),
        GrowthBusinessType.SIGN_IN,
        100,
        manager,
      );

      return '签到成功';
    });
  }

  private isDuplicateEntry(error: unknown) {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
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
