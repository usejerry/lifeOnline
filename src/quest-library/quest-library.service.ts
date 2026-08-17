import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AmapService } from '../location/amap.service';
import { LocationService } from '../location/location.service';
import { Quest } from '../quest/quest.entity';
import {
  QuestRecord,
  QuestRecordStatus,
} from '../quest-record/quest-record.entity';
import { DiscoverQuestDto, QuestLibraryKind } from './quest-library.dto';
import { UserQuestLibrary } from './user-quest-library.entity';

@Injectable()
export class QuestLibraryService {
  constructor(
    @InjectRepository(UserQuestLibrary)
    private readonly libraryRepository: Repository<UserQuestLibrary>,
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    @InjectRepository(QuestRecord)
    private readonly recordRepository: Repository<QuestRecord>,
    private readonly locationService: LocationService,
    private readonly amapService: AmapService,
  ) {}

  async save(userId: number, questId: number) {
    await this.requireQuest(questId);
    const item =
      (await this.libraryRepository.findOneBy({ userId, questId })) ??
      this.libraryRepository.create({ userId, questId });
    item.savedAt = item.savedAt ?? new Date();
    await this.libraryRepository.save(item);
    return { questId, saved: true, savedAt: item.savedAt };
  }

  async unsave(userId: number, questId: number) {
    const item = await this.libraryRepository.findOneBy({ userId, questId });
    if (!item) return { questId, saved: false };
    item.savedAt = null;
    // 收藏和发现共用一行；两个状态都没有时才真正删除，避免丢失发现记录。
    if (!item.discoveredAt) await this.libraryRepository.remove(item);
    else await this.libraryRepository.save(item);
    return { questId, saved: false };
  }

  async discover(userId: number, questId: number, dto: DiscoverQuestDto) {
    const quest = await this.requireQuest(questId);
    if (!quest.isHidden) {
      throw new ForbiddenException({
        code: 'QUEST_NOT_HIDDEN',
        message: '该支线不需要解锁',
      });
    }
    if (quest.fixedLongitude === null || quest.fixedLatitude === null) {
      throw new ForbiddenException({
        code: 'QUEST_LOCATION_NOT_CONFIGURED',
        message: '隐藏支线尚未配置解锁地点',
      });
    }
    const distanceM = this.locationService.distanceInMeters(
      dto.longitude,
      dto.latitude,
      quest.fixedLongitude,
      quest.fixedLatitude,
    );
    if (distanceM > quest.unlockRadiusM) {
      throw new ForbiddenException({
        code: 'HIDDEN_TOO_FAR',
        message: `距离解锁地点还有 ${distanceM} 米`,
      });
    }
    const city =
      dto.cityAdcode ??
      (await this.amapService.reverseGeocode(dto.longitude, dto.latitude))
        ?.cityAdcode ??
      null;
    const item =
      (await this.libraryRepository.findOneBy({ userId, questId })) ??
      this.libraryRepository.create({ userId, questId });
    item.discoveredAt = item.discoveredAt ?? new Date();
    item.discoveryCityAdcode = city;
    await this.libraryRepository.save(item);
    return {
      questId,
      discovered: true,
      discoveredAt: item.discoveredAt,
      distanceM,
    };
  }

  async list(userId: number, kind: QuestLibraryKind) {
    const items = await this.libraryRepository.find({
      where:
        kind === QuestLibraryKind.SAVED
          ? { userId, savedAt: Not(IsNull()) }
          : { userId, discoveredAt: Not(IsNull()) },
      relations: { quest: true },
      order:
        kind === QuestLibraryKind.SAVED
          ? { savedAt: 'DESC' }
          : { discoveredAt: 'DESC' },
    });
    return items.map((item) => ({
      questId: item.questId,
      savedAt: item.savedAt,
      discoveredAt: item.discoveredAt,
      quest: {
        id: item.quest.id,
        title: item.quest.title,
        durationMinutes: item.quest.durationMinutes,
        distanceLabel: item.quest.distanceLabel,
        locationName: item.quest.fixedLocationName,
      },
    }));
  }

  /** 城市徽章由已完成记录实时汇总，V0.2 不额外建徽章表。 */
  async cityBadges(userId: number) {
    const records = await this.recordRepository.find({
      where: {
        userId,
        status: QuestRecordStatus.COMPLETED,
        completedCityAdcode: Not(IsNull()),
      },
      order: { completedAt: 'ASC' },
    });
    const badges = new Map<
      string,
      {
        cityAdcode: string;
        cityName: string | null;
        completedCount: number;
        unlockedAt: Date | null;
      }
    >();
    records.forEach((record) => {
      const adcode = record.completedCityAdcode!;
      const badge = badges.get(adcode) ?? {
        cityAdcode: adcode,
        cityName: record.completedCityName,
        completedCount: 0,
        unlockedAt: record.completedAt,
      };
      badge.completedCount += 1;
      badges.set(adcode, badge);
    });
    return [...badges.values()];
  }

  async isDiscovered(userId: number, questId: number) {
    return Boolean(
      await this.libraryRepository.findOneBy({
        userId,
        questId,
        discoveredAt: Not(IsNull()),
      }),
    );
  }

  async clearSavedAfterAccept(userId: number, questId: number) {
    await this.unsave(userId, questId);
  }

  private async requireQuest(questId: number) {
    const quest = await this.questRepository.findOneBy({
      id: questId,
      enabled: true,
    });
    if (!quest) throw new NotFoundException('支线不存在或已下架');
    return quest;
  }
}
