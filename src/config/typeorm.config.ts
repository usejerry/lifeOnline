import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigEnum } from '../enum/config.enum';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.getOrThrow<string>(ConfigEnum.DB_HOST),
    port: configService.get<number>(ConfigEnum.DB_PORT, 3306),
    username: configService.getOrThrow<string>(ConfigEnum.DB_USER),
    password: configService.getOrThrow<string>(ConfigEnum.DB_PASSWORD),
    database: configService.getOrThrow<string>(ConfigEnum.DB_DATABASE),
    // MySQL 容器用 UTC 保存 DATETIME；读取和写入 Date 时也按 UTC 转换。
    timezone: 'Z',
    autoLoadEntities: true,
    entities: [Logs, Roles],
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
  }),
};
