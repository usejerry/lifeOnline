import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RangeService {
  constructor(private readonly dataSource: DataSource) {}
  async getRange(param?: { num: number }) {
    return this.dataSource.manager.transaction(async (manager) => {  
      console.log(manager,3232) 
      const arr = Array.from({ length: param?.num || 1 }, (_, i) => i + 1);
      return {
        code: 200,
        data: arr,
        msg: 'success',
      };  
    })
    
  }
}
