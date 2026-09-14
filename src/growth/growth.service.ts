import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserGrowth } from './user-growth.entity';
import {
  GrowthAssetType,
  GrowthBusinessType,
} from '../integral/integral-record.entity';
import { IntegralService } from '../integral/integral.service';

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(UserGrowth)
    private readonly userGrowthRepository: Repository<UserGrowth>,
    private readonly integralService: IntegralService,
    private readonly dataSource: DataSource,
  ) {}

  async initUserGrowth(userId: number) {
    if (await this.getGrowth(userId)) {
      return;
    }
    await this.userGrowthRepository.save({
      userId,
      pointsBalance: 0,
      totalExp: 0,
      level: 1,
    });
  }

  async getGrowth(userId: number) {
    return this.userGrowthRepository.findOne({
      where: {
        userId,
      },
    });
  }

  async addPoints(
    userId: number,
    businessId: string,
    businessType: GrowthBusinessType,
    points: number,
    manager?: EntityManager,
  ) {
    if (!Number.isInteger(points) || points <= 0) {
      throw new BadRequestException('积分数量必须是正整数');
    }

    const execute = async (transactionManager: EntityManager) => {
      const userGrowthRepository = transactionManager.getRepository(UserGrowth);

      // 兼容历史用户：不存在时初始化，并发创建时忽略唯一键冲突。
      await userGrowthRepository
        .createQueryBuilder()
        .insert()
        .into(UserGrowth)
        .values({ userId, pointsBalance: 0, totalExp: 0, level: 1 })
        .orIgnore()
        .updateEntity(false)
        .execute();

      const updateResult = await userGrowthRepository.increment(
        { userId },
        'pointsBalance',
        points,
      );
      if (updateResult.affected !== 1) {
        throw new BadRequestException('用户成长数据不存在');
      }

      const userGrowth = await userGrowthRepository.findOneByOrFail({ userId });

      // 使用同一个 manager 写入流水，失败时余额更新也会回滚。
      await this.integralService.addIntegral(
        userId,
        {
          assetType: GrowthAssetType.POINTS,
          balanceAfter: userGrowth.pointsBalance,
          businessType,
          businessId,
          amount: points,
        },
        transactionManager,
      );

      return userGrowth;
    };

    return manager
      ? execute(manager)
      : this.dataSource.transaction((transactionManager) =>
          execute(transactionManager),
        );
  }
}
