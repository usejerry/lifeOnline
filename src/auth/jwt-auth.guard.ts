import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthSessionService } from './auth-session.service';

export interface JwtUser {
  sub: number;
  sid: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessions: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('请先登录');
    }

    let payload: JwtUser;
    try {
      payload = await this.jwtService.verifyAsync<JwtUser>(token, {
        algorithms: ['HS256'],
      });
    } catch (error) {
      const expired =
        error instanceof Error && error.name === 'TokenExpiredError';
      throw new UnauthorizedException({
        code: expired ? 'ACCESS_TOKEN_EXPIRED' : 'ACCESS_TOKEN_INVALID',
        message: expired ? '访问凭证已过期' : '访问凭证无效',
      });
    }
    request.user = await this.sessions.validate(payload.sub, payload.sid);
    return true;
  }
}
