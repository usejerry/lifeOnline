import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestRecordService } from './quest-record.service';
import { QuestRecord } from './quest-record.entity';
import { Quest } from '../quest/quest.entity';
import { QuestRecordExpiryService } from './quest-record-expiry.service';
import { LocationService } from '../location/location.service';
import { AmapService } from '../location/amap.service';
import { QuestLibraryService } from '../quest-library/quest-library.service';
import { FindOperator } from 'typeorm';

describe('任务截止时间', () => {
  let service: QuestRecordService;
  const records = {
    findOneBy: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    update: jest.fn<
      Promise<{ affected: number }>,
      [
        Array<{
          id: number;
          userId: number;
          status: string;
          deadlineAt: FindOperator<Date>;
        }>,
        unknown,
      ]
    >(),
    findOne: jest.fn(),
  };
  const expiry = { expire: jest.fn().mockResolvedValue(0) };
  const amap = { reverseGeocode: jest.fn() };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T06:00:00Z'));
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        QuestRecordService,
        { provide: getRepositoryToken(QuestRecord), useValue: records },
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            findOneBy: jest
              .fn()
              .mockResolvedValue({ id: 1, title: '散步', durationMinutes: 20 }),
          },
        },
        { provide: QuestRecordExpiryService, useValue: expiry },
        { provide: LocationService, useValue: {} },
        { provide: AmapService, useValue: amap },
        {
          provide: QuestLibraryService,
          useValue: { clearSavedAfterAccept: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(QuestRecordService);
  });
  afterEach(() => jest.useRealTimers());

  it('接取时固定创建时间并返回时长加30分钟后的截止时间', async () => {
    records.findOneBy.mockResolvedValue(null);
    const result = await service.accept(7, { questId: 1 });
    expect(result.deadlineAt).toEqual(new Date('2026-09-14T06:50:00Z'));
    expect(records.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        createdAt: new Date('2026-09-14T06:00:00Z'),
        acceptedAt: new Date('2026-09-14T06:00:00Z'),
      }),
    );
    expect(expiry.expire).toHaveBeenCalledWith(7);
  });

  it('外部校验跨过截止时间时，最终更新使用新的时间并处理失败状态', async () => {
    records.findOneBy.mockResolvedValue({
      id: 3,
      userId: 7,
      targetLongitude: null,
      targetLatitude: null,
      weatherRuleSnapshot: null,
      deadlineAt: new Date('2026-09-14T06:01:00Z'),
    });
    amap.reverseGeocode.mockImplementation(() => {
      jest.setSystemTime(new Date('2026-09-14T06:01:00Z'));
      return Promise.resolve(null);
    });
    records.update.mockResolvedValue({ affected: 0 });
    await expect(
      service.complete(3, 7, { longitude: 0, latitude: 0 }),
    ).rejects.toThrow();
    const conditions = records.update.mock.calls[0][0];
    expect(conditions[0]).toEqual(
      expect.objectContaining({ id: 3, userId: 7, status: 'accepted' }),
    );
    expect(conditions[0].deadlineAt.type).toBe('moreThan');
    expect(conditions[0].deadlineAt.value).toEqual(
      new Date('2026-09-14T06:01:00Z'),
    );
    expect(expiry.expire).toHaveBeenCalledTimes(2);
  });

  it('查询当前任务前按用户处理过期记录，过期后返回空', async () => {
    records.findOne.mockResolvedValue(null);
    await expect(service.findActive(7)).resolves.toBeNull();
    expect(expiry.expire).toHaveBeenCalledWith(7);
    expect(records.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7, status: 'accepted' } }),
    );
  });
});
