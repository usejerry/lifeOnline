import {
  GrowthAssetType,
  GrowthBusinessType,
} from '../integral/integral-record.entity';
import { GrowthService } from './growth.service';
import { UserGrowth } from './user-growth.entity';

describe('GrowthService.addPoints', () => {
  it('收到 manager 时不再开启独立事务', async () => {
    const queryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      updateEntity: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      increment: jest.fn().mockResolvedValue({ affected: 1 }),
      findOneByOrFail: jest.fn().mockResolvedValue({
        id: 1,
        userId: 4,
        pointsBalance: 100,
        totalExp: 0,
        level: 1,
      }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const integralService = {
      addIntegral: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn(),
    };
    const service = new GrowthService(
      {} as never,
      integralService as never,
      dataSource as never,
    );

    await service.addPoints(
      4,
      '12',
      GrowthBusinessType.SIGN_IN,
      100,
      manager as never,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(UserGrowth);
    expect(queryBuilder.updateEntity).toHaveBeenCalledWith(false);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(integralService.addIntegral).toHaveBeenCalledWith(
      4,
      {
        assetType: GrowthAssetType.POINTS,
        balanceAfter: 100,
        businessType: GrowthBusinessType.SIGN_IN,
        businessId: '12',
        amount: 100,
      },
      manager,
    );
  });
});
