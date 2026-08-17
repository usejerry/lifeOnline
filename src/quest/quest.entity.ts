import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LocationMode, Mood, Scene } from './quest.enums';

@Entity('quest')
@Index('idx_quest_recommendation', [
  'enabled',
  'mood',
  'scene',
  'durationMinutes',
])
export class Quest {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  mood!: Mood;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ name: 'duration_minutes', type: 'smallint', unsigned: true })
  durationMinutes!: number;

  @Column({ name: 'distance_label', type: 'varchar', length: 30 })
  distanceLabel!: string;

  @Column({ type: 'varchar', length: 20 })
  scene!: Scene;

  @Column({ name: 'setting_label', type: 'varchar', length: 30 })
  settingLabel!: string;

  @Column({ type: 'varchar', length: 300 })
  prompt!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** V0.2：决定该任务是否需要在地图上寻找或到店完成。 */
  @Column({
    name: 'location_mode',
    type: 'varchar',
    length: 20,
    default: LocationMode.ANYWHERE,
  })
  locationMode!: LocationMode;

  @Column({ name: 'city_adcode', type: 'varchar', length: 12, nullable: true })
  cityAdcode!: string | null;

  @Column({ name: 'fixed_longitude', type: 'double', nullable: true })
  fixedLongitude!: number | null;

  @Column({ name: 'fixed_latitude', type: 'double', nullable: true })
  fixedLatitude!: number | null;

  @Column({
    name: 'fixed_location_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  fixedLocationName!: string | null;

  @Column({ name: 'poi_type', type: 'varchar', length: 80, nullable: true })
  poiType!: string | null;

  @Column({
    name: 'unlock_radius_m',
    type: 'int',
    unsigned: true,
    default: 3000,
  })
  unlockRadiusM!: number;

  @Column({
    name: 'completion_radius_m',
    type: 'int',
    unsigned: true,
    default: 300,
  })
  completionRadiusM!: number;

  /** 示例：{ "weatherCodes": ["1", "2"], "minTemperature": 10 }。 */
  @Column({ name: 'weather_rule', type: 'json', nullable: true })
  weatherRule!: Record<string, unknown> | null;

  @Column({ name: 'is_hidden', default: false })
  isHidden!: boolean;

  @Column({
    name: 'weekly_theme_id',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  weeklyThemeId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
