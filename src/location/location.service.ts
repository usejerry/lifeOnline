import { Injectable } from '@nestjs/common';

export interface WeatherRule {
  weatherCodes?: string[];
  weatherNames?: string[];
  minTemperature?: number;
  maxTemperature?: number;
}

export interface CurrentWeather {
  weather: string;
  temperature: number | null;
  weatherCode?: string;
}

@Injectable()
export class LocationService {
  /**
   * 使用 Haversine 公式计算两个经纬度点之间的球面距离。
   * 返回米，数据库中的解锁半径和完成半径也统一使用米，避免单位混乱。
   */
  distanceInMeters(
    fromLongitude: number,
    fromLatitude: number,
    toLongitude: number,
    toLatitude: number,
  ): number {
    const earthRadius = 6_371_000;
    const toRadians = (degree: number) => (degree * Math.PI) / 180;
    const latitudeDelta = toRadians(toLatitude - fromLatitude);
    const longitudeDelta = toRadians(toLongitude - fromLongitude);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(fromLatitude)) *
        Math.cos(toRadians(toLatitude)) *
        Math.sin(longitudeDelta / 2) ** 2;

    return Math.round(
      earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
    );
  }

  /** 天气服务不可用时返回 true，让普通探索流程可以安全降级。 */
  matchesWeather(rule: WeatherRule | null, weather: CurrentWeather | null) {
    if (!rule || !weather) return true;
    if (
      rule.weatherCodes?.length &&
      (!weather.weatherCode || !rule.weatherCodes.includes(weather.weatherCode))
    ) {
      return false;
    }
    if (
      rule.weatherNames?.length &&
      !rule.weatherNames.includes(weather.weather)
    ) {
      return false;
    }
    if (
      rule.minTemperature !== undefined &&
      (weather.temperature === null ||
        weather.temperature < rule.minTemperature)
    ) {
      return false;
    }
    if (
      rule.maxTemperature !== undefined &&
      (weather.temperature === null ||
        weather.temperature > rule.maxTemperature)
    ) {
      return false;
    }
    return true;
  }
}
