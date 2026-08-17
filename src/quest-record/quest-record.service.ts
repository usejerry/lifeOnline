import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from '../quest/quest.entity';
import { LocationMode } from '../quest/quest.enums';
import { AmapService } from '../location/amap.service';
import {
  CurrentWeather,
  LocationService,
  WeatherRule,
} from '../location/location.service';
import { QuestLibraryService } from '../quest-library/quest-library.service';
import {
  CompleteQuestRecordDto,
  CreateQuestRecordDto,
  QueryQuestRecordDto,
} from './quest-record.dto';
import { QuestRecord, QuestRecordStatus } from './quest-record.entity';

@Injectable()
export class QuestRecordService {
  constructor(
    @InjectRepository(QuestRecord)
    private readonly recordRepository: Repository<QuestRecord>,
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    private readonly locationService: LocationService,
    private readonly amapService: AmapService,
    private readonly libraryService: QuestLibraryService,
  ) {}

  async accept(userId: number, dto: CreateQuestRecordDto) {
    const [quest, active] = await Promise.all([
      this.questRepository.findOneBy({ id: dto.questId, enabled: true }),
      this.recordRepository.findOneBy({
        userId,
        status: QuestRecordStatus.ACCEPTED,
      }),
    ]);

    if (!quest) throw new NotFoundException('支线不存在或已下架');
    if (active) {
      throw new ConflictException({
        code: 'ACTIVE_QUEST_EXISTS',
        message: '你已有一条进行中的支线',
      });
    }

    if (
      quest.isHidden &&
      !(await this.libraryService.isDiscovered(userId, quest.id))
    ) {
      throw new ForbiddenException({
        code: 'HIDDEN_QUEST_NOT_DISCOVERED',
        message: '请先在地图上发现这条隐藏支线',
      });
    }

    if (
      quest.locationMode === LocationMode.POI_TYPE &&
      (dto.longitude === undefined ||
        dto.latitude === undefined ||
        !dto.targetName)
    ) {
      throw new BadRequestException({
        code: 'LOCATION_REQUIRED',
        message: '该支线需要先选择一个目标地点',
      });
    }

    const target =
      quest.locationMode === LocationMode.FIXED
        ? {
            longitude: quest.fixedLongitude,
            latitude: quest.fixedLatitude,
            name: quest.fixedLocationName,
            address: null,
            poiId: null,
          }
        : quest.locationMode === LocationMode.POI_TYPE
          ? {
              longitude: dto.longitude!,
              latitude: dto.latitude!,
              name: dto.targetName!,
              address: dto.targetAddress ?? null,
              poiId: dto.poiId ?? null,
            }
          : null;

    const saved = await this.recordRepository.save(
      this.recordRepository.create({
        userId,
        questId: quest.id,
        questTitleSnapshot: quest.title,
        targetPoiId: target?.poiId ?? null,
        targetName: target?.name ?? null,
        targetAddress: target?.address ?? null,
        targetLongitude: target?.longitude ?? null,
        targetLatitude: target?.latitude ?? null,
        completionRadiusM: target ? quest.completionRadiusM : null,
        weatherRuleSnapshot: quest.weatherRule,
        weeklyThemeIdSnapshot: quest.weeklyThemeId,
        status: QuestRecordStatus.ACCEPTED,
        acceptedAt: new Date(),
      }),
    );
    await this.libraryService.clearSavedAfterAccept(userId, quest.id);
    return this.toResponse(saved);
  }

  async findActive(userId: number) {
    const record = await this.recordRepository.findOne({
      where: { userId, status: QuestRecordStatus.ACCEPTED },
      relations: { quest: true },
      order: { createdAt: 'DESC' },
    });
    return record ? this.toResponse(record) : null;
  }

  async findAll(userId: number, query: QueryQuestRecordDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await this.recordRepository.findAndCount({
      where: { userId, status: query.status },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: items.map((item) => this.toResponse(item)),
      page,
      pageSize,
      total,
    };
  }

  async abandon(id: number, userId: number) {
    const result = await this.recordRepository.update(
      { id, userId, status: QuestRecordStatus.ACCEPTED },
      { status: QuestRecordStatus.ABANDONED, abandonedAt: new Date() },
    );
    if (!result.affected) this.invalidState();
    return this.toResponse(
      (await this.recordRepository.findOneBy({ id, userId }))!,
    );
  }

  async complete(
    id: number,
    userId: number,
    dto: CompleteQuestRecordDto,
    imageUrl?: string,
  ) {
    const record = await this.recordRepository.findOneBy({
      id,
      userId,
      status: QuestRecordStatus.ACCEPTED,
    });
    if (!record) this.invalidState();

    const needsLocation =
      record.targetLongitude !== null && record.targetLatitude !== null;
    if (
      needsLocation &&
      (dto.longitude === undefined || dto.latitude === undefined)
    ) {
      throw new BadRequestException({
        code: 'LOCATION_REQUIRED',
        message: '请允许定位后再完成这条支线',
      });
    }

    const distanceM = needsLocation
      ? this.locationService.distanceInMeters(
          dto.longitude!,
          dto.latitude!,
          record.targetLongitude!,
          record.targetLatitude!,
        )
      : null;
    if (
      distanceM !== null &&
      record.completionRadiusM !== null &&
      distanceM > record.completionRadiusM
    ) {
      throw new ConflictException({
        code: 'LOCATION_TOO_FAR',
        message: `当前位置距离目标还有 ${distanceM} 米`,
      });
    }

    const location =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? await this.amapService.reverseGeocode(dto.longitude, dto.latitude)
        : null;
    const weatherRule = record.weatherRuleSnapshot as WeatherRule | null;
    let weather: CurrentWeather | null = null;
    if (weatherRule) {
      if (!this.amapService.configured || !location?.cityAdcode) {
        throw new ServiceUnavailableException({
          code: 'MAP_PROVIDER_UNAVAILABLE',
          message: '天气校验服务暂时不可用，请稍后重试',
        });
      }
      weather = await this.amapService.getWeather(location.cityAdcode);
      if (!weather) {
        throw new ServiceUnavailableException({
          code: 'MAP_PROVIDER_UNAVAILABLE',
          message: '天气校验服务暂时不可用，请稍后重试',
        });
      }
      if (!this.locationService.matchesWeather(weatherRule, weather)) {
        throw new ConflictException({
          code: 'WEATHER_NOT_MATCHED',
          message: '当前天气不符合这条支线的完成条件',
        });
      }
    }

    const result = await this.recordRepository.update(
      { id, userId, status: QuestRecordStatus.ACCEPTED },
      {
        status: QuestRecordStatus.COMPLETED,
        note: dto.note?.trim() || null,
        imageUrl: imageUrl || null,
        completedLongitude: dto.longitude ?? null,
        completedLatitude: dto.latitude ?? null,
        distanceM,
        completedCityAdcode: location?.cityAdcode ?? null,
        completedCityName: location?.cityName ?? null,
        weatherSnapshot: weather,
        completedAt: new Date(),
      },
    );
    if (!result.affected) this.invalidState();
    return this.toResponse(
      (await this.recordRepository.findOneBy({ id, userId }))!,
    );
  }

  private invalidState(): never {
    throw new ConflictException({
      code: 'QUEST_RECORD_STATE_INVALID',
      message: '支线不存在或当前状态不能执行此操作',
    });
  }

  private toResponse(record: QuestRecord) {
    return {
      id: record.id,
      questId: record.questId,
      questTitle: record.questTitleSnapshot,
      status: record.status,
      note: record.note,
      imageUrl: record.imageUrl,
      acceptedAt: record.acceptedAt,
      completedAt: record.completedAt,
      abandonedAt: record.abandonedAt,
      target:
        record.targetLongitude === null
          ? null
          : {
              poiId: record.targetPoiId,
              name: record.targetName,
              address: record.targetAddress,
              longitude: record.targetLongitude,
              latitude: record.targetLatitude,
              completionRadiusM: record.completionRadiusM,
            },
      completion: record.completedAt
        ? {
            longitude: record.completedLongitude,
            latitude: record.completedLatitude,
            distanceM: record.distanceM,
            cityAdcode: record.completedCityAdcode,
            cityName: record.completedCityName,
            weather: record.weatherSnapshot,
          }
        : null,
      ...(record.quest
        ? {
            quest: {
              id: record.quest.id,
              mood: record.quest.mood,
              title: record.quest.title,
              durationMinutes: record.quest.durationMinutes,
              distanceLabel: record.quest.distanceLabel,
              scene: record.quest.scene,
              settingLabel: record.quest.settingLabel,
              prompt: record.quest.prompt,
            },
          }
        : {}),
    };
  }
}
