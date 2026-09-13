import { Module } from '@nestjs/common';
import { SignInService } from './sign-in.service';
import { SignInController } from './sign-in.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSignIn } from './user-sign-in.entity';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserSignIn]), GrowthModule],
  providers: [SignInService],
  controllers: [SignInController]
})
export class SignInModule {}
