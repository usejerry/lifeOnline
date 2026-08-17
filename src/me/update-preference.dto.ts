import { IsEnum, IsIn } from 'class-validator';
import { Mood, Scene } from '../quest/quest.enums';

export class UpdatePreferenceDto {
  @IsEnum(Mood)
  mood!: Mood;

  @IsIn([5, 20, 60])
  availableMinutes!: number;

  @IsEnum(Scene)
  scene!: Scene;
}
