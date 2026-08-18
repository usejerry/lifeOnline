import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from '../enum/config.enum';
import { CurrentWeather } from './location.service';

interface AmapResponse<T> {
  status: string;
  info: string;
  infocode: string;
  regeocode?: T;
  lives?: T[];
  pois?: T[];
}

interface RegeocodeResult {
  formatted_address: string | string[];
  addressComponent: {
    adcode: string | string[];
    city: string | string[];
    province: string;
  };
}

interface WeatherResult {
  weather: string;
  temperature: string;
}

interface PoiResult {
  id: string;
  name: string;
  address: string | string[];
  location: string;
  type: string;
}

@Injectable()
export class AmapService {
  private readonly logger = new Logger(AmapService.name);
  private readonly webServiceKey?: string;

  constructor(configService: ConfigService) {
    this.webServiceKey = configService.get<string>(
      ConfigEnum.AMAP_WEB_SERVICE_KEY,
    );
  }

  get configured() {
    return Boolean(this.webServiceKey);
  }

  /** 逆地理编码用于把完成位置保存为城市；没配置 Web 服务 Key 时返回 null。 */
  async reverseGeocode(longitude: number, latitude: number) {
    const result = await this.request<RegeocodeResult>('v3/geocode/regeo', {
      location: `${longitude},${latitude}`,
      extensions: 'base',
    });
    const regeocode = result?.regeocode;
    if (!regeocode) return null;
    const component = regeocode.addressComponent;
    if (typeof component.adcode !== 'string' || !component.adcode) return null;
    const city = Array.isArray(component.city)
      ? component.province
      : component.city;
    return {
      address: Array.isArray(regeocode.formatted_address)
        ? null
        : regeocode.formatted_address,
      cityAdcode: component.adcode,
      cityName: city,
    };
  }

  async getWeather(cityAdcode: string): Promise<CurrentWeather | null> {
    const result = await this.request<WeatherResult>('v3/weather/weatherInfo', {
      city: cityAdcode,
      extensions: 'base',
    });
    const live = result?.lives?.[0];
    return live
      ? {
          weather: live.weather,
          temperature: Number.isFinite(Number(live.temperature))
            ? Number(live.temperature)
            : null,
        }
      : null;
  }

  async searchNearbyPois(
    longitude: number,
    latitude: number,
    poiType: string,
    radiusM: number,
  ) {
    const result = await this.request<PoiResult>('v5/place/around', {
      location: `${longitude},${latitude}`,
      types: poiType,
      radius: String(Math.min(radiusM, 50000)),
      page_size: '3',
    });
    return (result?.pois ?? []).flatMap((poi) => {
      const [poiLongitude, poiLatitude] = poi.location.split(',').map(Number);
      if (!Number.isFinite(poiLongitude) || !Number.isFinite(poiLatitude))
        return [];
      return [
        {
          poiId: poi.id,
          name: poi.name,
          address: Array.isArray(poi.address)
            ? poi.address.join('')
            : poi.address,
          longitude: poiLongitude,
          latitude: poiLatitude,
          type: poi.type,
        },
      ];
    });
  }

  private async request<T>(path: string, query: Record<string, string>) {
    if (!this.webServiceKey) return null;
    const url = new URL(`https://restapi.amap.com/${path}`);
    Object.entries({ ...query, key: this.webServiceKey }).forEach(
      ([key, value]) => url.searchParams.set(key, value),
    );
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = (await response.json()) as AmapResponse<T>;
      if (!response.ok || body.status !== '1') {
        this.logger.warn(
          `高德 Web 服务调用失败：${body.infocode} ${body.info}`,
        );
        return null;
      }
      return body;
    } catch (error) {
      this.logger.warn(`高德 Web 服务暂时不可用：${String(error)}`);
      return null;
    }
  }
}
