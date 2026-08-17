import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogEnum } from '../enum/config.enum';

@Module({
  imports: [
    ConfigModule,
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (!configService.get<boolean>(LogEnum.LOG_ON, true)) {
          return { silent: true };
        }

        const fileTransport = new DailyRotateFile({
          dirname: 'logs',
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '14d',
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        });

        fileTransport.on('error', (error) => {
          console.error('日志文件写入失败', error);
        });

        return {
          level: configService.get<string>(LogEnum.LOG_LEVEL, 'info'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
          ),
          transports: [
            new winston.transports.Console({
              format:
                process.env.NODE_ENV === 'production'
                  ? winston.format.json()
                  : nestWinstonModuleUtilities.format.nestLike('NestDemo', {
                      colors: true,
                      prettyPrint: true,
                      processId: true,
                    }),
            }),
            fileTransport,
          ],
        };
      },
    }),
  ],
})
export class LogsModule {}
