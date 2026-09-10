# Refresh Token 实现与学习顺序

## 运行

前后端同时升级，旧的无 sid JWT 需重新登录。开发环境 DB_SYNCHRONIZE=true 时启动 Nest 自动建表；生产关闭 synchronize，先执行 database/migrations/20260909_auth_sessions.sql。

当前支持同域部署：浏览器访问 Vite /api 代理，生产访问 Caddy /api 代理。生产使用 HTTPS，NODE_ENV=production 自动开启 Secure Cookie。不开放跨域 CORS；如果改为跨域域名，需要重新设计来源白名单、CSRF 和 Cookie 配置，不能直接允许任意凭证跨域。

前端依赖 Web Locks（HTTPS / localhost 安全上下文），串行处理多标签页刷新。不支持时拒绝自动轮换并返回错误，避免静默降级产生重放。测试登录请使用 localhost，不要使用普通 HTTP 局域网 IP。

## 凭证

- Access Token：HS256 JWT，含 sub、sid、username，最多 900 秒，且不超过会话剩余时间。前端 localStorage 的 access_token 保存 JSON { token, expiresAt }，页面重载后有效则复用；过期或缺失时才刷新。localStorage 可由页面脚本读取，需要防范 XSS；本地时间判断仅用于减少请求，最终有效性由后端判断。
- Refresh Token：32 字节密码学随机数，Cookie 名 refresh_token，HttpOnly、SameSite=Strict、Path=/api/v1/auth；生产 Secure。
- 记住我：会话固定 7 天并设置持久 Cookie；未勾选固定 2 小时、不设置 Cookie Max-Age。浏览器可能恢复会话 Cookie，服务端到期时间才是最终边界。
- 数据库只存 Refresh Token 的 SHA-256 哈希，原文只经 Set-Cookie 交给浏览器。
- 登录/刷新/退出响应禁止缓存。Cookie 认证操作必须携带 X-Auth-Request: 1，拒绝 Sec-Fetch-Site: cross-site；结合不开放 CORS 和 Strict Cookie 防跨站请求。

## 接口（完整前缀 /api/v1）

| 接口 | 认证 | 行为 |
| --- | --- | --- |
| POST /user/login | 密码 + 自定义请求头 | 创建会话，响应体返回 accessToken、expiresIn、user，Cookie 返回刷新凭证 |
| POST /auth/refresh | Cookie + 自定义请求头 | 锁会话行，旧凭证标记已使用，生成新凭证 |
| POST /auth/logout | Cookie + 自定义请求头 | 幂等撤销该 Cookie 对应会话，并清 Cookie |
| POST /auth/logout-all | Access Token + 自定义请求头 | 撤销当前用户全部会话并清 Cookie |
| GET /auth/sessions | Access Token | 仅返回自己的有效会话，不暴露刷新哈希 |
| DELETE /auth/sessions/:id | Access Token + 自定义请求头 | 只能撤销自己的会话 |

## 请求过期后的顺序

1. JwtAuthGuard 校验 JWT，过期返回 401 / ACCESS_TOKEN_EXPIRED，业务尚未执行。
2. Axios 同一标签页复用 refreshPromise，多标签页通过 Web Locks 串行访问刷新 Cookie。
3. 刷新事务先锁会话，再锁凭证，避免同一凭证重复消费。
4. 返回新 Access Token，并 Set-Cookie 轮换 Refresh Token。
5. 原请求换新 Authorization 后重发一次，不递归。
6. SESSION_INVALID / ACCESS_TOKEN_INVALID 清理登录状态；403、网络错误、500 不触发自动刷新或强制退出。
7. 页面重载时先读取 localStorage，有效则直接访问业务接口；过期或缺失时刷新。受保护路由等待恢复完成再判断登录状态。

## 撤销与轮换的细节

Guard 每次查询共享数据库的会话和用户状态，因此撤销、禁用用户会在下一次请求生效。修改密码后撤销用户全部会话。

重放旧 Refresh Token 会撤销该会话。事务中返回失败标记、提交撤销，再在事务外抛 401；不能在事务内直接抛错，否则撤销也被回滚。

严格轮换的代价：服务端已提交刷新但网络丢失响应，客户端可能仍持有旧 Cookie；下一次刷新会触发重放检测并要求重新登录。这版不设置宽限窗口。

历史凭证在会话有效期间保留，用于检测重放。运维可每天清理已过期会话及其凭证（先删凭证再删会话，使用事务）；尚未安装定时任务：

```sql
START TRANSACTION;
DELETE t FROM auth_refresh_tokens t
JOIN auth_sessions s ON s.id = t.sessionId WHERE s.expiresAt < NOW();
DELETE FROM auth_sessions WHERE expiresAt < NOW();
COMMIT;
```

## 学习入口

验证命令：后端 `pnpm test:auth`（读取 .env 连接本地 MySQL，需有创建测试数据库权限，创建独立随机命名数据库并在结束时删除，不修改业务库）；前端 `npm run test:auth`。前端用例通过 Axios adapter 验证请求行为，不等同于真实浏览器 Cookie 测试。

1. user/user.controller.ts：响应体与 Set-Cookie 的区别。
2. auth/auth-session.service.ts：会话创建、事务轮换、重放撤销。
3. auth/jwt-auth.guard.ts：验签 + 会话校验。
4. 前端 src/api/http.ts：内存、锁、401、重试。
5. 前端 src/stores/auth.ts：页面恢复、退出；ProfileView 提供退出和退出全部设备按钮。

会话管理 API 和前端 API 方法已提供，设备列表页面留待后续实现。
