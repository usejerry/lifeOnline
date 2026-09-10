import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DataSource, EntityManager, IsNull, MoreThan } from 'typeorm';
import { User } from '../user/user.entity';
import { AuthSession } from './auth-session.entity';
import { AuthRefreshToken } from './auth-refresh-token.entity';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly db: DataSource,
    private readonly jwt: JwtService,
  ) {}

  private invalid() {
    return new UnauthorizedException({
      code: 'SESSION_INVALID',
      message: '登录已失效，请重新登录',
    });
  }

  private async issue(
    manager: EntityManager,
    session: AuthSession,
    username: string,
  ) {
    const refreshToken = randomBytes(32).toString('base64url');
    const remaining = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000,
    );
    if (remaining <= 0) throw this.invalid();
    const expiresIn = Math.min(ACCESS_TOKEN_SECONDS, remaining);
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, sid: session.id, username, jti: randomUUID() },
      { expiresIn, algorithm: 'HS256' },
    );
    await manager.insert(AuthRefreshToken, {
      tokenHash: hashRefreshToken(refreshToken),
      sessionId: session.id,
      expiresAt: session.expiresAt,
      usedAt: null,
    });
    return { accessToken, expiresIn, refreshToken, session };
  }

  create(user: User, rememberMe: boolean, userAgent: string) {
    return this.db.transaction(async (manager) => {
      const now = new Date();
      const session = await manager.save(
        AuthSession,
        manager.create(AuthSession, {
          id: randomUUID(),
          userId: user.id,
          rememberMe,
          userAgent: userAgent.slice(0, 512),
          createdAt: now,
          lastUsedAt: now,
          expiresAt: new Date(
            now.getTime() + (rememberMe ? 7 * 86400 : 7200) * 1000,
          ),
          revokedAt: null,
        }),
      );
      return this.issue(manager, session, user.username);
    });
  }

  async refresh(raw: string | undefined) {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) throw this.invalid();
    const tokenHash = hashRefreshToken(raw);
    const result = await this.db.transaction(async (manager) => {
      const lookup = await manager.findOneBy(AuthRefreshToken, { tokenHash });
      if (!lookup) return null;
      // 同一会话的刷新串行执行；退出更新同一行也会等待此锁。
      const session = await manager.findOne(AuthSession, {
        where: { id: lookup.sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt.getTime() <= Date.now()
      )
        return null;
      const token = await manager.findOne(AuthRefreshToken, {
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!token) return null;
      const user = await manager.findOneBy(User, { id: session.userId });
      if (
        token.usedAt ||
        token.expiresAt.getTime() <= Date.now() ||
        !this.userValid(user, session)
      ) {
        await manager.update(AuthSession, session.id, {
          revokedAt: new Date(),
        });
        // 返回后在事务外抛出异常，否则撤销操作会被回滚。
        return null;
      }
      await manager.update(AuthRefreshToken, tokenHash, { usedAt: new Date() });
      await manager.update(AuthSession, session.id, { lastUsedAt: new Date() });
      return this.issue(manager, session, user!.username);
    });
    if (!result) throw this.invalid();
    return result;
  }

  private userValid(user: User | null, session: AuthSession) {
    return (
      user?.status === 'active' &&
      (!user.passwordChangedAt ||
        user.passwordChangedAt.getTime() <= session.createdAt.getTime())
    );
  }

  async validate(userId: number, sid: string) {
    if (!Number.isInteger(userId) || typeof sid !== 'string')
      throw this.invalid();
    const session = await this.db.manager.findOneBy(AuthSession, {
      id: sid,
      userId,
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    )
      throw this.invalid();
    const user = await this.db.manager.findOneBy(User, { id: userId });
    if (!this.userValid(user, session)) throw this.invalid();
    return { sub: userId, sid, username: user!.username };
  }

  async logout(raw: string | undefined) {
    if (!raw) return;
    const token = await this.db.manager.findOneBy(AuthRefreshToken, {
      tokenHash: hashRefreshToken(raw),
    });
    if (token)
      await this.db.manager.update(
        AuthSession,
        { id: token.sessionId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
  }

  async revokeAll(userId: number) {
    await this.db.manager.update(
      AuthSession,
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revoke(userId: number, id: string) {
    const result = await this.db.manager.update(
      AuthSession,
      { id, userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!result.affected) throw new NotFoundException('会话不存在');
  }

  async list(userId: number, sid: string) {
    const sessions = await this.db.manager.find(AuthSession, {
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    return sessions.map(
      ({ id, userAgent, createdAt, lastUsedAt, expiresAt }) => ({
        id,
        userAgent,
        createdAt,
        lastUsedAt,
        expiresAt,
        current: id === sid,
      }),
    );
  }
}
