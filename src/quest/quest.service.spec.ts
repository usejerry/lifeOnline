import { LocationService } from '../location/location.service';
import { LocationMode } from './quest.enums';
import { Quest } from './quest.entity';
import { QuestService } from './quest.service';

describe('QuestService.nearby', () => {
  it('falls back to Shangxiajiu when the user has no nearby quests', async () => {
    const quest = Object.assign(new Quest(), {
      id: 1,
      enabled: true,
      locationMode: LocationMode.FIXED,
      fixedLongitude: 113.24794,
      fixedLatitude: 23.11467,
      fixedLocationName: '上下九步行街',
      cityAdcode: '440100',
      unlockRadiusM: 5000,
      completionRadiusM: 300,
      weatherRule: null,
      isHidden: false,
    });
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([quest]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const amap = {
      configured: false,
      reverseGeocode: jest.fn().mockResolvedValue(null),
      getWeather: jest.fn().mockResolvedValue(null),
      searchNearbyPois: jest.fn().mockResolvedValue([]),
    };
    const service = new QuestService(
      repository as never,
      new LocationService(),
      amap as never,
    );

    const result = await service.nearby({
      longitude: 121.4737,
      latitude: 31.2304,
      radius: 5000,
    });

    expect(result.context.hasNearbyQuests).toBe(false);
    expect(result.context.mapCenter).toEqual({
      longitude: 113.24794,
      latitude: 23.11467,
    });
    expect(result.items).toHaveLength(1);
    expect(amap.searchNearbyPois).not.toHaveBeenCalled();
  });
});
