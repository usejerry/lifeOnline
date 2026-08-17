import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { WeeklyTheme } from './weekly-theme.entity';

@Injectable()
export class ThemeService implements OnModuleInit {
  constructor(
    @InjectRepository(WeeklyTheme)
    private readonly themeRepository: Repository<WeeklyTheme>,
  ) {}

  async onModuleInit() {
    if (await this.themeRepository.count()) return;
    const startAt = new Date();
    startAt.setHours(0, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + 7);
    await this.themeRepository.save(
      this.themeRepository.create({
        title: '慢下来的一天',
        subtitle: '本周主题',
        description: '不用赶路，留意那些平时被忽略的城市声音。',
        startAt,
        endAt,
        enabled: true,
      }),
    );
  }

  async current() {
    const now = new Date();
    const theme = await this.themeRepository.findOne({
      where: {
        enabled: true,
        startAt: LessThanOrEqual(now),
        endAt: MoreThanOrEqual(now),
      },
      order: { startAt: 'DESC' },
    });
    return theme
      ? {
          id: theme.id,
          title: theme.title,
          subtitle: theme.subtitle,
          description: theme.description,
          coverUrl: theme.coverUrl,
          startAt: theme.startAt,
          endAt: theme.endAt,
        }
      : null;
  }
}
