import { BadRequestException, Injectable } from '@nestjs/common';
import { AddIntegralDto } from './integral.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  GrowthAssetType,
  GrowthBusinessType,
  GrowthLedger,
} from './integral-record.entity';

@Injectable()
export class IntegralService {
  constructor(
    @InjectRepository(GrowthLedger)
    private readonly growthLedgerRepository: Repository<GrowthLedger>,
  ) {}

  async addIntegral(
    userId: number,
    data: AddIntegralDto,
    manager?: EntityManager,
  ) {
    if (!Object.values(GrowthAssetType).includes(data.assetType)) {
      throw new BadRequestException('资产类型不存在');
    }

    if (!Object.values(GrowthBusinessType).includes(data.businessType)) {
      throw new BadRequestException('业务类型不存在');
    }

    if (!data.businessId) {
      throw new BadRequestException('业务主键不存在');
    }

    const growthLedgerRepository = manager
      ? manager.getRepository(GrowthLedger)
      : this.growthLedgerRepository;

    return growthLedgerRepository.save({
      userId,
      assetType: data.assetType,
      balanceAfter: data.balanceAfter,
      businessType: data.businessType,
      businessId: data.businessId,
      amount: data.amount,
    });
  }
}
