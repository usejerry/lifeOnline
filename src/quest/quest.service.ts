import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AmapService } from '../location/amap.service';
import { LocationService } from '../location/location.service';
import {
  NearbyQuestQueryDto,
  QueryQuestDto,
  RecommendationQueryDto,
} from './query-quest.dto';
import { LocationMode, Scene } from './quest.enums';
import { Quest } from './quest.entity';
import { INITIAL_QUESTS } from './quest.seed';

const SHANGXIAJIU_COORDINATES = {
  longitude: 113.24794,
  latitude: 23.11467,
};

@Injectable()
export class QuestService implements OnModuleInit {
  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    private readonly locationService: LocationService,
    private readonly amapService: AmapService,
  ) {}

  async onModuleInit() {
    // ponytail: startup seeding is enough for this learning app; use a migration/seed command before multi-instance deployment.
    // 按标题补齐种子数据，已有 V0.1 数据库升级后也能得到 V0.2 地图示例任务。
    const existingTitles = new Set(
      (await this.questRepository.find({ select: { title: true } })).map(
        (quest) => quest.title,
      ),
    );
    const missing = INITIAL_QUESTS.filter(
      (quest) => quest.title && !existingTitles.has(quest.title),
    );
    if (missing.length) {
      await this.questRepository.save(this.questRepository.create(missing));
    }
  }

  async findAll(query: QueryQuestDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.baseQuery();

    if (query.mood) qb.andWhere('quest.mood = :mood', { mood: query.mood });
    if (query.scene && query.scene !== Scene.ANY) {
      qb.andWhere('quest.scene IN (:...scenes)', {
        scenes: [query.scene, Scene.ANY],
      });
    }
    if (query.maxMinutes) {
      qb.andWhere('quest.durationMinutes <= :maxMinutes', {
        maxMinutes: query.maxMinutes,
      });
    }

    const [items, total] = await qb
      .orderBy('quest.sortOrder', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map((item) => this.toResponse(item)),
      page,
      pageSize,
      total,
    };
  }

  async recommend(query: RecommendationQueryDto) {
    const attempts = [
      { useScene: true, useDuration: true },
      { useScene: false, useDuration: true },
      { useScene: false, useDuration: false },
    ];

    for (const attempt of attempts) {
      const qb = this.baseQuery().andWhere('quest.mood = :mood', {
        mood: query.mood,
      });
      // 今日推荐没有地图选点步骤，只推荐不限地点任务；地图任务统一从探索页接取。
      qb.andWhere('quest.locationMode = :locationMode', {
        locationMode: LocationMode.ANYWHERE,
      });
      if (query.excludeId) {
        qb.andWhere('quest.id != :excludeId', { excludeId: query.excludeId });
      }
      if (attempt.useDuration) {
        qb.andWhere('quest.durationMinutes <= :maxMinutes', {
          maxMinutes: query.maxMinutes,
        });
      }
      if (attempt.useScene && query.scene !== Scene.ANY) {
        qb.andWhere('quest.scene IN (:...scenes)', {
          scenes: [query.scene, Scene.ANY],
        });
      }

      const quest = await qb.orderBy('RAND()').getOne();
      if (quest) return this.toResponse(quest);
    }

    throw new NotFoundException({
      code: 'QUEST_NOT_FOUND',
      message: '暂时没有合适的支线',
    });
  }

  async nearby(query: NearbyQuestQueryDto) {
    const quests = await this.questRepository
      .createQueryBuilder('quest')
      .where('quest.enabled = :enabled', { enabled: true })
      .andWhere('quest.locationMode != :anywhere', {
        anywhere: LocationMode.ANYWHERE,
      })
      .orderBy('quest.sortOrder', 'ASC')
      .getMany();

    const nearby = await this.findNearbyItems(quests, query);
    const hasNearbyQuests = nearby.items.length > 0;
    const result = hasNearbyQuests
      ? nearby
      : await this.findNearbyItems(quests, {
          ...query,
          ...SHANGXIAJIU_COORDINATES,
          cityAdcode: '440100',
        });

    return {
      items: result.items,
      context: {
        cityAdcode: result.location?.cityAdcode ?? null,
        cityName: result.location?.cityName ?? null,
        weather: result.weather,
        mapWebServiceConfigured: this.amapService.configured,
        hasNearbyQuests,
        mapCenter: hasNearbyQuests
          ? { longitude: query.longitude, latitude: query.latitude }
          : SHANGXIAJIU_COORDINATES,
      },
    };
  }

  private async findNearbyItems(quests: Quest[], query: NearbyQuestQueryDto) {
    const location = query.cityAdcode
      ? { cityAdcode: query.cityAdcode, cityName: null, address: null }
      : await this.amapService.reverseGeocode(query.longitude, query.latitude);
    // 高德无法识别当前坐标时直接触发广州回退，避免继续请求空城市或境外 POI。
    if (!query.cityAdcode && !location) {
      return { items: [], location: null, weather: null };
    }
    const weather = location?.cityAdcode
      ? await this.amapService.getWeather(location.cityAdcode)
      : null;
    const items: Array<Record<string, unknown>> = [];

    for (const quest of quests) {
      // 有天气规则的内容只有在取得天气且匹配时才展示，防止把限定内容错误推荐出来。
      if (
        quest.weatherRule &&
        (!weather ||
          !this.locationService.matchesWeather(quest.weatherRule, weather))
      ) {
        continue;
      }

      if (
        quest.locationMode === LocationMode.FIXED &&
        quest.fixedLongitude !== null &&
        quest.fixedLatitude !== null
      ) {
        if (
          query.cityAdcode &&
          quest.cityAdcode &&
          query.cityAdcode !== quest.cityAdcode
        ) {
          continue;
        }
        const distanceM = this.locationService.distanceInMeters(
          query.longitude,
          query.latitude,
          quest.fixedLongitude,
          quest.fixedLatitude,
        );
        // 隐藏任务只有进入解锁半径后才下发，半径之外不会泄露任务和坐标。
        if (distanceM <= query.radius && distanceM <= quest.unlockRadiusM) {
          items.push(
            this.toMapResponse(quest, {
              longitude: quest.fixedLongitude,
              latitude: quest.fixedLatitude,
              name: quest.fixedLocationName,
              address: null,
              poiId: null,
              distanceM,
            }),
          );
        }
      }

      if (quest.locationMode === LocationMode.POI_TYPE && quest.poiType) {
        const pois = await this.amapService.searchNearbyPois(
          query.longitude,
          query.latitude,
          quest.poiType,
          Math.min(query.radius, quest.unlockRadiusM),
        );
        pois.forEach((poi) => {
          const distanceM = this.locationService.distanceInMeters(
            query.longitude,
            query.latitude,
            poi.longitude,
            poi.latitude,
          );
          items.push(this.toMapResponse(quest, { ...poi, distanceM }));
        });
      }
    }

    items.sort((a, b) => Number(a.distanceM) - Number(b.distanceM));
    return { items, location, weather };
  }

  private baseQuery(): SelectQueryBuilder<Quest> {
    return (
      this.questRepository
        .createQueryBuilder('quest')
        .where('quest.enabled = :enabled', { enabled: true })
        // 隐藏任务不能通过普通列表或随机推荐提前泄露，只能靠 discover 解锁。
        .andWhere('quest.isHidden = :isHidden', { isHidden: false })
    );
  }

  private toResponse(quest: Quest) {
    return {
      id: quest.id,
      mood: quest.mood,
      title: quest.title,
      durationMinutes: quest.durationMinutes,
      durationLabel: `约${quest.durationMinutes}分钟`,
      distanceLabel: quest.distanceLabel,
      scene: quest.scene,
      settingLabel: quest.settingLabel,
      prompt: quest.prompt,
      locationMode: quest.locationMode,
      isHidden: quest.isHidden,
      weeklyThemeId: quest.weeklyThemeId,
    };
  }

  private toMapResponse(
    quest: Quest,
    target: {
      poiId: string | null;
      name: string | null;
      address: string | null;
      longitude: number;
      latitude: number;
      distanceM: number;
    },
  ) {
    return {
      ...this.toResponse(quest),
      markerId: `${quest.id}:${target.poiId ?? 'fixed'}`,
      poiId: target.poiId,
      targetName: target.name,
      targetAddress: target.address,
      longitude: target.longitude,
      latitude: target.latitude,
      distanceM: target.distanceM,
      distanceLabel:
        target.distanceM < 1000
          ? `${target.distanceM}m`
          : `${(target.distanceM / 1000).toFixed(1)}km`,
      completionRadiusM: quest.completionRadiusM,
      requiresDiscovery: quest.isHidden,
    };
  }
}
