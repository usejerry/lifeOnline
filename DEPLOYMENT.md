# Life Online 日常更新与部署手册

本文记录项目已经部署完成后，前端和后端日常更新时需要执行的命令。

## 1. 当前部署结构

```text
/home/ubuntu/
├── lifeOnline/       # 后端仓库，也是 Docker Compose 工作目录
└── lifeOnline-h5/    # 前端仓库
```

- 后端：NestJS，Compose 服务 `app`
- 前端：Vue/Vite，构建后由 Caddy 提供页面，Compose 服务 `caddy`
- 数据库：MySQL，Compose 服务 `db`
- 生产域名：`https://earthlifeonlie.cn`
- 后端生产配置：`~/lifeOnline/.env.prod`
- 前端生产配置：`~/lifeOnline-h5/.env.production.local`

以下命令都在服务器终端中执行。

## 2. 只更新后端

适用于只修改了 NestJS 后端代码的情况：

```bash
cd ~/lifeOnline

# 拉取 main 分支的最新代码
git pull --ff-only origin main

# 重新构建后端镜像，并更新 app 容器
docker compose --env-file .env.prod -f compose.prod.yml up -d --build app

# 检查状态和最近日志
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 app
```

`--ff-only` 表示只允许正常的快进更新，防止在生产服务器上意外创建合并提交。

## 3. 只更新前端

适用于只修改了 Vue/Vite 前端代码的情况：

```bash
cd ~/lifeOnline-h5

# 拉取前端最新代码
git pull --ff-only origin main

# compose.prod.yml 位于后端仓库，所以回到后端目录执行构建
cd ~/lifeOnline

# 重新构建前端，并更新 caddy 容器
docker compose --env-file .env.prod -f compose.prod.yml up -d --build caddy

# 检查状态和最近日志
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 caddy
```

前端的 Vite 环境变量会在**构建阶段**写入静态文件，因此修改 `.env.production.local` 后也必须重新构建 `caddy`。

## 4. 前后端一起更新

```bash
# 更新前端
cd ~/lifeOnline-h5
git pull --ff-only origin main

# 更新后端
cd ~/lifeOnline
git pull --ff-only origin main

# 重新构建并更新所有需要变化的服务
docker compose --env-file .env.prod -f compose.prod.yml up -d --build

# 检查容器状态
docker compose --env-file .env.prod -f compose.prod.yml ps
```

该命令不会删除 MySQL、上传文件或 Caddy 证书所在的数据卷。

## 5. 发布后验证

先检查页面和接口的 HTTP 状态码：

```bash
curl -fsS -o /dev/null -w 'frontend: %{http_code}\n' \
  https://earthlifeonlie.cn/

curl -fsS -o /dev/null -w 'backend: %{http_code}\n' \
  'https://earthlifeonlie.cn/api/v1/quests?page=1&pageSize=1'
```

正常情况下会看到 `200`。如果接口本身要求登录，也可能返回 `401` 或 `403`，这说明请求已经到达后端，只是鉴权未通过。

然后在浏览器中检查：

1. 首页能否正常打开和刷新。
2. 登录及主要接口是否正常。
3. 地图是否正常显示。
4. 图片上传和访问是否正常。
5. 本次更新的功能是否正常。

## 6. 修改环境变量后如何生效

### 后端 `.env.prod` 有修改

```bash
cd ~/lifeOnline
docker compose --env-file .env.prod -f compose.prod.yml up -d --force-recreate app
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 app
```

如果环境变量变化同时伴随代码变化，则执行：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --build --force-recreate app
```

### 前端 `.env.production.local` 有修改

```bash
cd ~/lifeOnline
docker compose --env-file .env.prod -f compose.prod.yml up -d --build caddy
```

如果浏览器仍然显示旧配置，可强制无缓存构建：

```bash
docker compose --env-file .env.prod -f compose.prod.yml build --no-cache caddy
docker compose --env-file .env.prod -f compose.prod.yml up -d caddy
```

随后使用浏览器无痕窗口测试，避免浏览器缓存干扰。

## 7. 涉及数据库结构变化时

普通代码更新不需要执行本节。只有新增表、字段、索引或修改数据库结构时，才需要先备份并执行经过确认的迁移脚本。

### 7.1 备份数据库

```bash
cd ~/lifeOnline
mkdir -p backups

docker compose --env-file .env.prod -f compose.prod.yml exec -T db \
  sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction "$MYSQL_DATABASE"' \
  > "backups/lifeonline-$(date +%Y%m%d-%H%M%S).sql"

ls -lh backups/
```

确认刚生成的 SQL 文件大小不是 `0`。

### 7.2 执行迁移

当前生产环境使用 `DB_SYNCHRONIZE=false`，实体变化不会自动修改数据库。迁移命令应根据本次发布提供的具体 SQL 文件执行，不要把旧迁移重复执行，也不要在不清楚脚本作用时直接执行。

## 8. 常用排查命令

所有命令先进入后端目录：

```bash
cd ~/lifeOnline
```

```bash
# 查看容器状态
docker compose --env-file .env.prod -f compose.prod.yml ps

# 持续查看后端日志，按 Ctrl+C 退出日志查看
docker compose --env-file .env.prod -f compose.prod.yml logs -f --tail=200 app

# 持续查看 Caddy/前端访问日志
docker compose --env-file .env.prod -f compose.prod.yml logs -f --tail=200 caddy

# 查看数据库日志
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=200 db

# 不重新构建，只重启后端
docker compose --env-file .env.prod -f compose.prod.yml restart app

# 查看服务器磁盘空间
df -h

# 查看服务器内存
free -h
```

## 9. 更新失败时回滚代码

更新前可以分别记录当前提交号：

```bash
cd ~/lifeOnline-h5 && git rev-parse HEAD
cd ~/lifeOnline && git rev-parse HEAD
```

保存输出的两个提交号。需要临时回滚时：

```bash
# 回滚前端代码
cd ~/lifeOnline-h5
git switch --detach <前端旧提交号>

# 回滚后端代码
cd ~/lifeOnline
git switch --detach <后端旧提交号>

# 按旧代码重新构建
docker compose --env-file .env.prod -f compose.prod.yml up -d --build
```

恢复到 `main` 最新版本：

```bash
cd ~/lifeOnline-h5
git switch main
git pull --ff-only origin main

cd ~/lifeOnline
git switch main
git pull --ff-only origin main
docker compose --env-file .env.prod -f compose.prod.yml up -d --build
```

代码回滚不会自动回滚数据库。包含数据库变更的版本必须提前准备数据库回滚方案。

## 10. 重要安全提醒

- **不要执行 `docker compose down -v`**：`-v` 会删除数据库、上传文件和 Caddy 证书等持久化数据。
- 不要把 `.env.prod`、`.env.production.local`、数据库密码或 API Key 提交到 Git。
- 不要在服务器上直接修改业务代码；应在本地修改、提交并推送，然后服务器执行 `git pull`。
- 如果 `git pull` 提示本地有修改，先执行 `git status` 和 `git diff` 检查，不要直接使用 `git reset --hard`。
- MySQL 的 `3306` 端口不需要向公网开放。

## 11. 最常用命令速查

```bash
# 只发后端
cd ~/lifeOnline && git pull --ff-only origin main
docker compose --env-file .env.prod -f compose.prod.yml up -d --build app

# 只发前端
cd ~/lifeOnline-h5 && git pull --ff-only origin main
cd ~/lifeOnline
docker compose --env-file .env.prod -f compose.prod.yml up -d --build caddy

# 前后端一起发
cd ~/lifeOnline-h5 && git pull --ff-only origin main
cd ~/lifeOnline && git pull --ff-only origin main
docker compose --env-file .env.prod -f compose.prod.yml up -d --build
```
