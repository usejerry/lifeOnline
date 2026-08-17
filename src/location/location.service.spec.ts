import { LocationService } from './location.service';

describe('LocationService', () => {
  const service = new LocationService();

  it('应以米为单位计算两个坐标的距离', () => {
    const distance = service.distanceInMeters(
      120.1488,
      30.2587,
      120.1603,
      30.2587,
    );
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(1200);
  });

  it('天气未取得时应允许普通内容安全降级', () => {
    expect(service.matchesWeather({ minTemperature: 20 }, null)).toBe(true);
  });
});
