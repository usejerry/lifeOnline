import {
  All,
  BadRequestException,
  Controller,
  Param,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ConfigEnum } from '../enum/config.enum';

/**
 * 高德 JS API 2.0 安全密钥代理。
 * 浏览器只访问本站 /_AMapService，真正的安全密钥永远不会下发到前端。
 */
@Controller('_AMapService')
export class AmapProxyController {
  constructor(private readonly configService: ConfigService) {}

  @All('*path')
  async proxy(
    @Param('path') path: string | string[],
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const securityCode = this.configService.get<string>(
      ConfigEnum.AMAP_SECURITY_CODE,
    );
    if (!securityCode) {
      throw new ServiceUnavailableException({
        code: 'AMAP_PROXY_NOT_CONFIGURED',
        message: '高德地图安全代理尚未配置',
      });
    }

    const normalizedPath = (
      Array.isArray(path) ? path.join('/') : (path ?? '')
    ).replace(/^\/+/, '');
    // 只接受高德 JS API 会使用的 v3/v4 相对路径，阻止绝对 URL 形成开放代理。
    if (!/^v[34]\/[a-zA-Z0-9_./-]+$/.test(normalizedPath)) {
      throw new BadRequestException('不支持的地图代理路径');
    }
    // 地图样式走 webapi.amap.com；矢量底图瓦片必须走 fmap01.amap.com。
    // 若把瓦片请求发到 restapi.amap.com，JS API 仍会显示 Logo，但底图会空白。
    const targetBase = normalizedPath.startsWith('v4/map/styles')
      ? 'https://webapi.amap.com/'
      : normalizedPath.startsWith('v3/vectormap')
        ? 'https://fmap01.amap.com/'
        : 'https://restapi.amap.com/';
    const target = new URL(normalizedPath, targetBase);

    Object.entries(request.query).forEach(([key, value]) => {
      // 即使客户端伪造 jscode，也始终以服务器保存的密钥为准。
      if (key === 'jscode' || value === undefined) return;
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        // Express 的 query 也可能包含嵌套对象；地图接口只需要普通字符串参数。
        if (typeof item === 'string') target.searchParams.append(key, item);
      });
    });
    target.searchParams.set('jscode', securityCode);

    try {
      const upstream = await fetch(target, {
        signal: AbortSignal.timeout(8000),
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get('content-type');
      if (contentType) response.setHeader('content-type', contentType);
      response.setHeader(
        'cache-control',
        upstream.headers.get('cache-control') ?? 'no-store',
      );
      response.status(upstream.status).send(body);
    } catch {
      throw new ServiceUnavailableException({
        code: 'MAP_PROVIDER_UNAVAILABLE',
        message: '地图服务暂时不可用，请稍后重试',
      });
    }
  }
}
