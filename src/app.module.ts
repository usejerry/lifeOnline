import { Module, Logger, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
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
