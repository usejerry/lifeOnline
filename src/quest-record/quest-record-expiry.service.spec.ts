import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestRecord } from './quest-record.entity';
import { QuestRecordExpiryService } from './quest-record-expiry.service';

describe('任务过期分批处理', () => {
  it('分批处理直到为空，更新复核状态及用户范围，重复执行不增加数量', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn<unknown, [string, unknown]>().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest
        .fn<unknown, [{ status: string; abandonedAt: () => string }]>()
        .mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
        .mockResolvedValueOnce([{ id: 3 }])
        .mockResolvedValue([]),
      // 第一批另一条任务被用户完成，条件更新只影响一条。
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const module = await Test.createTestingModule({
      providers: [
        QuestRecordExpiryService,
        {
          provide: getRepositoryToken(QuestRecord),
          useValue: { createQueryBuilder: () => query },
        },
      ],
    }).compile();
    const service = module.get(QuestRecordExpiryService);
    await expect(service.expire(7)).resolves.toBe(2);
    expect(query.whereInIds.mock.calls).toEqual([[[1, 2]], [[3]]]);
    expect(query.andWhere).toHaveBeenCalledWith('status = :status', {
      status: 'accepted',
    });
    expect(query.andWhere).toHaveBeenCalledWith('user_id = :userId', {
      userId: 7,
    });
    expect(
      query.andWhere.mock.calls.map((call) => call[0] as unknown),
    ).toContain('deadline_at <= :now');
    expect(query.set.mock.calls[0][0].abandonedAt()).toBe('deadline_at');
    await expect(service.expire(7)).resolves.toBe(0);
    expect(query.execute).toHaveBeenCalledTimes(2);
  });
});
