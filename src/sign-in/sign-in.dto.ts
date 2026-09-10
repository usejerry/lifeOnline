import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class QuerySignInRecordsDto {
    
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;

    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    pageSize: number;
}   