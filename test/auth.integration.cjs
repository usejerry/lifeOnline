// pnpm build && node --test test/auth.integration.cjs
// 独立临时数据库，绝不对 .env 的业务数据库同步或写入。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { TypeOrmModule } = require('@nestjs/typeorm');
const { ValidationPipe } = require('@nestjs/common');
const { HttpAdapterHost } = require('@nestjs/core');
const { DataSource } = require('typeorm');
const { JwtService } = require('@nestjs/jwt');
const request = require('supertest');
const { AuthModule } = require('../dist/auth/auth.module');
const { UserModule } = require('../dist/user/user.module');
const {
  AuthSessionService,
  hashRefreshToken,
} = require('../dist/auth/auth-session.service');
const { AuthSession } = require('../dist/auth/auth-session.entity');
const { AuthRefreshToken } = require('../dist/auth/auth-refresh-token.entity');
const { User } = require('../dist/user/user.entity');
const { UserService } = require('../dist/user/user.service');
const {
  ResponseInterceptor,
} = require('../dist/common/interceptors/response.interceptor');
const {
  AllExceptionsFilter,
} = require('../dist/common/filters/all-exceptions.filter');

test('refresh token HTTP + MySQL transaction integration', async (t) => {
  const env = parseEnv(readFileSync('.env', 'utf8'));
  const connection = {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };
  const admin = await mysql.createConnection(connection);
  const database = `auth_test_${randomBytes(8).toString('hex')}`;
  assert.match(database, /^auth_test_[0-9a-f]{16}$/);
  let app;
  await admin.query(`CREATE DATABASE \`${database}\``);
  try {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-only-secret-'.repeat(5),
              NODE_ENV: 'development',
            }),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          ...connection,
          username: connection.user,
          database,
          retryAttempts: 1,
          entities: [__dirname + '/../dist/**/*.entity.js'],
          synchronize: true,
        }),
        AuthModule,
        UserModule,
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    await app.init();
    const server = app.getHttpServer();
    const db = app.get(DataSource);
    const sessions = app.get(AuthSessionService);
    const jwt = app.get(JwtService);
    const users = app.get(UserService);
    await users.createUser({
      username: 'auth_test',
      email: 'auth@example.test',
      password: 'testing-password',
    });
    const user = await db.manager.findOneByOrFail(User, {
      username: 'auth_test',
    });
    const cookieOf = (response) =>
      response.headers['set-cookie'][0].split(';')[0];
    const tokenOf = (response) => response.body.data.accessToken;
    const login = (rememberMe = true) =>
      request(server)
        .post('/api/v1/user/login')
        .set('X-Auth-Request', '1')
        .send({
          account: 'auth_test',
          password: 'testing-password',
          rememberMe,
        })
        .expect(200);
    const refresh = (cookie) =>
      request(server)
        .post('/api/v1/auth/refresh')
        .set('X-Auth-Request', '1')
        .set('Cookie', cookie);
    const list = (token) =>
      request(server)
        .get('/api/v1/auth/sessions')
        .auth(token, { type: 'bearer' });

    await t.test(
      'login cookie, expiry, no raw token in body/database',
      async () => {
        const response = await login();
        assert.equal(response.body.data.expiresIn, 900);
        assert.equal(response.body.data.refreshToken, undefined);
        assert.equal(response.body.data.session, undefined);
        assert.match(response.headers['set-cookie'][0], /HttpOnly/);
        assert.match(response.headers['set-cookie'][0], /SameSite=Strict/);
        assert.match(response.headers['set-cookie'][0], /Path=\/api\/v1\/auth/);
        assert.match(response.headers['set-cookie'][0], /Max-Age=/);
        assert.equal(response.headers['cache-control'], 'no-store');
        const raw = cookieOf(response).split('=')[1];
        assert.ok(
          await db.manager.findOneBy(AuthRefreshToken, {
            tokenHash: hashRefreshToken(raw),
          }),
        );
        const ephemeral = await login(false);
        assert.doesNotMatch(
          ephemeral.headers['set-cookie'][0],
          /Max-Age=|Expires=/,
        );
        const payload = jwt.decode(tokenOf(ephemeral));
        const session = await db.manager.findOneByOrFail(AuthSession, {
          id: payload.sid,
        });
        assert.ok(
          Math.abs(session.expiresAt - session.createdAt - 7200000) < 1000,
        );
      },
    );

    await t.test(
      'rotation, replay commits revocation, old access denied',
      async () => {
        const first = await login();
        const second = await refresh(cookieOf(first)).expect(200);
        assert.notEqual(cookieOf(first), cookieOf(second));
        await list(tokenOf(second)).expect(200);
        await refresh(cookieOf(first)).expect(401);
        await list(tokenOf(second)).expect(401);
        await refresh(cookieOf(second)).expect(401);
      },
    );

    await t.test('concurrent consumption has only one winner', async () => {
      const first = await login();
      const results = await Promise.all([
        refresh(cookieOf(first)),
        refresh(cookieOf(first)),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
      const winner = results.find((r) => r.status === 200);
      await list(tokenOf(winner)).expect(401);
    });

    await t.test(
      'expired access is recoverable, invalid token is not',
      async () => {
        const first = await login();
        const { sub, sid } = jwt.decode(tokenOf(first));
        const expired = await jwt.signAsync({ sub, sid }, { expiresIn: -1 });
        const response = await list(expired).expect(401);
        assert.equal(response.body.code, 'ACCESS_TOKEN_EXPIRED');
        const refreshed = await refresh(cookieOf(first)).expect(200);
        await list(tokenOf(refreshed)).expect(200);
        const invalid = await list('not-a-jwt').expect(401);
        assert.equal(invalid.body.code, 'ACCESS_TOKEN_INVALID');
      },
    );

    await t.test(
      'logout is idempotent and revokes access and refresh',
      async () => {
        const first = await login();
        for (let i = 0; i < 2; i++)
          await request(server)
            .post('/api/v1/auth/logout')
            .set('X-Auth-Request', '1')
            .set('Cookie', cookieOf(first))
            .expect(200);
        await list(tokenOf(first)).expect(401);
        await refresh(cookieOf(first)).expect(401);
      },
    );

    await t.test(
      'cannot revoke another user session; list excludes hashes',
      async () => {
        const first = await login();
        const other = await users.createUser({
          username: 'other_user',
          password: 'testing-password',
        });
        const otherUser = await db.manager.findOneByOrFail(User, {
          id: other.id,
        });
        const foreign = await sessions.create(otherUser, false, 'test');
        await request(server)
          .delete(`/api/v1/auth/sessions/${foreign.session.id}`)
          .set('X-Auth-Request', '1')
          .auth(tokenOf(first), { type: 'bearer' })
          .expect(404);
        await sessions.validate(otherUser.id, foreign.session.id);
        const response = await list(tokenOf(first)).expect(200);
        assert.ok(
          response.body.data.every(
            (s) => !('tokenHash' in s) && s.id !== foreign.session.id,
          ),
        );
      },
    );

    await t.test(
      'CSRF, expired sessions and disabled users are rejected',
      async () => {
        const first = await login();
        await request(server)
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookieOf(first))
          .expect(403);
        await request(server)
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookieOf(first))
          .set('X-Auth-Request', '1')
          .set('Sec-Fetch-Site', 'cross-site')
          .expect(403);
        const { sid } = jwt.decode(tokenOf(first));
        await db.manager.update(AuthSession, sid, {
          expiresAt: new Date(Date.now() - 1000),
        });
        await refresh(cookieOf(first)).expect(401);
        const second = await login();
        await db.manager.update(User, user.id, { status: 'disabled' });
        await list(tokenOf(second)).expect(401);
        await refresh(cookieOf(second)).expect(401);
        await db.manager.update(User, user.id, { status: 'active' });
      },
    );

    await t.test(
      'logout-all and password change revoke all sessions',
      async () => {
        const first = await login();
        const second = await login();
        await request(server)
          .post('/api/v1/auth/logout-all')
          .set('X-Auth-Request', '1')
          .auth(tokenOf(first), { type: 'bearer' })
          .expect(200);
        await list(tokenOf(second)).expect(401);
        await refresh(cookieOf(second)).expect(401);
        const third = await login();
        await users.updateUser(user.id, { password: 'new-testing-password' });
        await list(tokenOf(third)).expect(401);
        await refresh(cookieOf(third)).expect(401);
      },
    );
  } finally {
    if (app) await app.close();
    await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
  }
});
