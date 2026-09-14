import { QueryFailedError } from 'typeorm';
import { GrowthBusinessType } from '../integral/integral-record.entity';
import { SignInService } from './sign-in.service';

describe('SignInService.signIn', () => {
  const createHarness = () => {
    const transactionalRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({ id: 12, userId: 4 }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepository),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (value: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const growthService = {
      addPoints: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SignInService(
      {} as never,
      growthService as never,
      dataSource as never,
    );

    return {
      growthService,
      manager,
      service,
      transactionalRepository,
    };
  };

  it('让签到和积分复用同一个事务 manager', async () => {
    const { growthService, manager, service } = createHarness();

    await expect(service.signIn(4)).resolves.toBe('签到成功');
    expect(growthService.addPoints).toHaveBeenCalledWith(
      4,
      '12',
      GrowthBusinessType.SIGN_IN,
      100,
      manager,
    );
  });

  it('积分写入失败时把错误抛出事务回调', async () => {
    const { growthService, service } = createHarness();
    growthService.addPoints.mockRejectedValueOnce(new Error('积分写入失败'));

    await expect(service.signIn(4)).rejects.toThrow('积分写入失败');
  });

  it('并发触发签到唯一键时按已签到处理', async () => {
    const { growthService, service, transactionalRepository } = createHarness();
    transactionalRepository.save.mockRejectedValueOnce(
      new QueryFailedError(
        'INSERT INTO user_sign_in ...',
        [],
        Object.assign(new Error('Duplicate entry'), {
          code: 'ER_DUP_ENTRY',
        }),
      ),
    );

    await expect(service.signIn(4)).resolves.toBe(false);
    expect(growthService.addPoints).not.toHaveBeenCalled();
  });
});
