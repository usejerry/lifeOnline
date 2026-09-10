import { Module } from '@nestjs/common';
import { SignInService } from './sign-in.service';
import { SignInController } from './sign-in.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSignIn } from './user-sign-in.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSignIn])],
  providers: [SignInService],
  controllers: [SignInController]
})
export class SignInModule {}
