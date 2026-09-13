import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { Profile } from './profile.entity';
import { UserService } from './user.service';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile]), GrowthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
