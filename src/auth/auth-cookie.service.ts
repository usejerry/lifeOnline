import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, CookieOptions } from 'express';
import { AuthSession } from './auth-session.entity';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}
  private readonly name = 'refresh_token';

  // 同域部署：自定义头无法由跨站表单设置；不开放跨域 CORS。
  assertRequest(request: Request) {
    if (
      request.get('x-auth-request') !== '1' ||
      request.get('sec-fetch-site') === 'cross-site'
    ) {
      throw new ForbiddenException('不允许的认证请求来源');
    }
  }

  read(request: Request) {
    return request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.name}=`))
      ?.slice(this.name.length + 1);
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    };
  }

  set(response: Response, token: string, session: AuthSession) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(this.name, token, {
      ...this.options(),
      ...(session.rememberMe
        ? { maxAge: Math.max(0, session.expiresAt.getTime() - Date.now()) }
        : {}),
    });
  }

  clear(response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    response.clearCookie(this.name, this.options());
  }
}
