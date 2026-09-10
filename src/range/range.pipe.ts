import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class RangePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    let { num } = value;
    if(num < 1) {
      num = -10;
    }
    console.log('RangePipe transform:', num); 
    return { num };
  }
}
