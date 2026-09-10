 import { IsNumber } from 'class-validator';

 export class RangeDto {
    @IsNumber()
  num!: number;
}