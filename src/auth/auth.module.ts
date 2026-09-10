import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { AuthSession } from './auth-session.entity';
import { AuthRefreshToken } from './auth-refresh-token.entity';
import { AuthSessionService } from './auth-session.service';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthSession, AuthRefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard, AuthSessionService, AuthCookieService],
  exports: [JwtModule, JwtAuthGuard, AuthSessionService, AuthCookieService],
})
export class AuthModule {}
