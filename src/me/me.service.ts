import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QuestRecord,
  QuestRecordStatus,
} from '../quest-record/quest-record.entity';
import { User } from '../user/user.entity';
import { UpdatePreferenceDto } from './update-preference.dto';
import { UserPreference } from './user-preference.entity';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(QuestRecord)
    private readonly recordRepository: Repository<QuestRecord>,
  ) {}

  async getMe(userId: number) {
    const [user, preference, completedQuestCount] = await Promise.all([
      this.userRepository.findOneBy({ id: userId }),
      this.preferenceRepository.findOneBy({ userId }),
      this.recordRepository.countBy({
        userId,
        status: QuestRecordStatus.COMPLETED,
      }),
    ]);

    if (!user) throw new NotFoundException('用户不存在');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      preference: preference
        ? {
            mood: preference.mood,
            availableMinutes: preference.availableMinutes,
            scene: preference.scene,
            onboarded: true,
            onboardedAt: preference.onboardedAt,
          }
        : null,
      stats: { completedQuestCount },
    };
  }

  async savePreference(userId: number, dto: UpdatePreferenceDto) {
    const existing = await this.preferenceRepository.findOneBy({ userId });
    const preference = this.preferenceRepository.create({
      ...existing,
      ...dto,
      userId,
      onboardedAt: existing?.onboardedAt ?? new Date(),
    });

    const saved = await this.preferenceRepository.save(preference);
    return {
      mood: saved.mood,
      availableMinutes: saved.availableMinutes,
      scene: saved.scene,
      onboardedAt: saved.onboardedAt,
    };
  }
}
