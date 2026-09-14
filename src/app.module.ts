import { Module, Logger, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { typeOrmConfig } from './config/typeorm.config';
import { RangeModule } from './range/range.module';
import { UserModule } from './user/user.module';
import { LogsModule } from './logs/logs.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { QuestModule } from './quest/quest.module';
import { QuestRecordModule } from './quest-record/quest-record.module';
import { LocationModule } from './location/location.module';
import { ThemeModule } from './theme/theme.module';
import { QuestLibraryModule } from './quest-library/quest-library.module';
import { SignInModule } from './sign-in/sign-in.module';
import { IntegralModule } from './integral/integral.module';
import { GrowthModule } from './growth/growth.module';
import { MessageModule } from './message/message.module';
import { ConfigEnum } from './enum/config.enum';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.prod'
          : process.env.NODE_ENV === 'development'
            ? ['.env.dev', '.env']
            : '.env',
      validationSchema: Joi.object({
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_DATABASE: Joi.string().required(),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        REDIS_HOST: Joi.string().default('127.0.0.1'),
        REDIS_PORT: Joi.number().port().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        JWT_SECRET: Joi.string().min(64).required(),
        LOG_ON: Joi.boolean().default(true),
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
          .default('info'),
        // JS API 安全密钥只保存在后端，用于代理高德地图请求。
        AMAP_SECURITY_CODE: Joi.string().length(32).optional(),
        // Web 服务 Key 与 JS API Key 是两类 Key；逆地理编码、天气和 POI 查询使用它。
        AMAP_WEB_SERVICE_KEY: Joi.string().length(32).allow('').optional(),
      }),
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        prefix: 'life-online',
        connection: {
          host: configService.get<string>(ConfigEnum.REDIS_HOST, '127.0.0.1'),
          port: configService.get<number>(ConfigEnum.REDIS_PORT, 6379),
          password:
            configService.get<string>(ConfigEnum.REDIS_PASSWORD) || undefined,
          // Worker 必须持续等待 Redis 恢复，不能因为一次网络抖动耗尽请求重试。
          maxRetriesPerRequest: null,
        },
      }),
    }),
    AuthModule,
    UserModule,
    MeModule,
    QuestModule,
    QuestRecordModule,
    LocationModule,
    ThemeModule,
    QuestLibraryModule,
    RangeModule,
    LogsModule,
    RolesModule,
    SignInModule,
    IntegralModule,
    GrowthModule,
    MessageModule,
  ],
  controllers: [],
  providers: [
    Logger,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
  exports: [Logger],
})
export class AppModule {}
