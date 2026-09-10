import { Injectable } from '@nestjs/common';

@Injectable()
export class RangeService {
  getRange(param?: { num: number }) {
    console.log('RangeService getRange called with param:', param);
    const arr = Array.from({ length: param?.num || 1 }, (_, i) => i + 1);
    return {
      code: 200,
      data: arr,
      msg: 'success',
    };
  }
}
