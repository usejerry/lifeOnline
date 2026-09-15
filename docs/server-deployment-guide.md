# LifeOnline 服务器更新部署手册（初学者版）

适用于已经部署过的 Ubuntu 服务器，使用本项目的 `compose.prod.yml`。以下默认单个后端实例，不是首次建库教程。更新期间容器重建可能造成短暂中断。

## 先选你要做的事

| 场景 | 阅读章节 | 更新的容器 |
| --- | --- | --- |
| 只改页面、前端代码 | 1 | `caddy` |
| 只改后端逻辑或依赖，没有改表 | 2 | `app` |
| 新增表、字段、索引，或修改表 | 3 | 先迁移 MySQL，再更新 `app` |
| 新增 Redis、修改配置、查看日志 | 4、5 | 按配置涉及的服务处理 |
| 安装依赖或启动失败 | 6 | 先看真正的错误，再处理 |

## 0. 执行前须知

服务器目录默认如下；如果实际不同，请替换下面命令里的目录：

```text
~/lifeOnline       后端，包含 compose.prod.yml、.env.prod、Caddyfile
~/lifeOnline-h5    前端，包含前端 Dockerfile
```

`~` 表示当前登录用户的家目录。所有 `docker compose` 命令都在后端目录执行。前端真实目录由后端 `.env.prod` 的 `FRONTEND_CONTEXT` 决定，默认 `../lifeOnline-h5`。

四个服务的职责：

| 服务 | 作用 |
| --- | --- |
| `app` | NestJS 后端接口、BullMQ 调度器和消费者 |
| `caddy` | 前端静态页面、HTTPS、转发后端请求；更新前端要重新构建它 |
| `db` | MySQL，保存用户和消息等业务数据 |
| `redis` | BullMQ 队列、任务和调度状态 |

只复制代码块里的命令，不要复制终端提示符、日志或 `✔`。按顺序执行，一步失败就先处理，不要继续下一步。

更新前，本地代码必须已经提交并推送到服务器正在使用的分支。每次拉取前执行 `git status --short`；如果有输出，先确认服务器上这些改动的用途，不要强制覆盖。下面使用 `git pull --ff-only`，遇到分支分叉会停止，避免自动产生合并。

常用参数：[Docker Compose 官方说明](https://docs.docker.com/reference/cli/docker/compose/up/)。

| 参数 | 含义 |
| --- | --- |
| `--env-file .env.prod` | 为 Compose 配置中的变量提供生产环境值 |
| `-f compose.prod.yml` | 使用生产配置，避免误用开发配置 |
| `-d` | 后台运行 |
| `--build` | 重新构建镜像，把代码和依赖打进去 |
| `--no-deps` | 只处理指定服务，不启动它的依赖；前提是依赖已经正常运行 |

## 1. 只更新前端

前提：后端、MySQL 和 Redis 已正常运行。

### 第一步：拉取前端代码

```bash
cd ~/lifeOnline-h5
git status --short
git pull --ff-only
```

### 第二步：重新构建前端容器

```bash
cd ~/lifeOnline
docker compose --env-file .env.prod -f compose.prod.yml up -d --build --no-deps caddy
```

前端 Dockerfile 会自动执行 `npm ci`、`npm run build`，再把产物放入 Caddy 镜像。无需在服务器手动执行 npm 安装。

### 第三步：检查

```bash
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 caddy
```

打开网站检查本次修改的页面。仍是旧页面时，Mac 按 `Command + Shift + R`，Windows 按 `Ctrl + Shift + R`。若仍未更新，检查是否拉取了正确分支、`FRONTEND_CONTEXT` 是否指向正确目录，再检查 CDN 或 Service Worker 缓存。

## 2. 只更新后端（不涉及表结构）

适用：修改接口、业务逻辑、添加依赖。若改了数据库 Entity 的字段或索引，先判断是否应走第 3 节。

### 第一步：拉取后端代码

```bash
cd ~/lifeOnline
git status --short
git pull --ff-only
git log -1 --oneline
```

### 第二步：重新构建后端容器

前提：MySQL、Redis 已运行，新版本需要的环境变量已经填好。

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --build --no-deps app
```

Dockerfile 会自动安装依赖和执行 `pnpm build`。单纯执行 `restart app` 不会更新镜像中的代码。

### 第三步：检查

```bash
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 -f app
```

确认启动成功，没有连接失败、缺少配置、表不存在等错误。按 `Ctrl + C` 退出日志查看，不会停止后台服务。通过网站验证登录和本次修改的功能；容器显示 `Up` 不代表业务一定正常。

## 3. 更新后端，并新增或修改数据库表

**Entity 修改不会自动更新正式数据库。生产环境必须保持 `DB_SYNCHRONIZE=false`，手动执行对应的 SQL 迁移。**

本项目迁移放在 `database/migrations/`。目前这套部署命令不会自动执行迁移，也不会自动记录哪些 SQL 已执行。记录每次执行的文件名、时间和结果，只执行本次尚未执行的迁移。

### 第一步：拉取代码，阅读本次迁移

```bash
cd ~/lifeOnline
git status --short
git pull --ff-only
ls database/migrations
```

例如查看消息表迁移：

```bash
less database/migrations/20260914_user_message.sql
```

按 `q` 退出。确认需要的旧表已经存在，按迁移说明和依赖顺序执行。不要一次性执行整个目录。

新增可空字段等兼容旧代码的迁移，通常可以先迁移再更新应用。删除字段、重命名字段、改变字段类型、增加非空约束等变更，需要单独确定数据转换和停机方案；不能套用“在线执行即可”。

### 第二步：先构建新镜像

```bash
docker compose --env-file .env.prod -f compose.prod.yml build app
```

这一步只构建，不替换正在运行的旧后端。构建失败时先修复，不要开始改表。

### 第三步：备份 MySQL

在同一个终端执行下面整段。备份放到仓库外的 `~/lifeOnline-backups`，文件名带时间且不覆盖同名文件。

```bash
mkdir -p ~/lifeOnline-backups
chmod 700 ~/lifeOnline-backups
backup_file=~/lifeOnline-backups/mysql_$(date +%Y%m%d_%H%M%S).sql
if (umask 077; set -C; docker compose --env-file .env.prod -f compose.prod.yml exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --routines --events --triggers "$MYSQL_DATABASE"' > "$backup_file"); then
  echo "备份命令成功：$backup_file"
  ls -lh "$backup_file"
else
  echo "备份失败，停止部署；不要把可能产生的残缺 SQL 当作有效备份。"
fi
```

这里调用的是 `db` 容器内的 `mysqldump`，无需在 Ubuntu 宿主机安装 MySQL 客户端。密码从容器环境读取，不要手工把真实密码贴入命令或截图。

检查备份末尾：

```bash
tail -n 5 "$backup_file"
```

确认命令成功、文件非空、末尾有完成信息后再继续。完整可靠性应通过在独立测试数据库恢复来验证。备份期间不要同时执行改表；`--single-transaction` 主要用于 InnoDB 一致性备份。此 SQL 不包含上传文件、Redis 数据和服务器配置，应另行备份并保留异地副本。[MySQL 备份说明](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)

### 第四步：执行本次迁移

下面只适用于尚未创建消息表的环境，是实际文件示例；以后部署替换成当次迁移文件名。

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"' < database/migrations/20260914_user_message.sql
```

紧接着执行：

```bash
echo $?
```

`0` 表示上一条命令成功，非 `0` 表示失败。成功时可能没有其他输出。

核对消息表：

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW CREATE TABLE user_message;"'
```

`20260914_user_message.sql` 是一次性建表脚本，重复执行会提示表已存在。若报错，不要删表重试：先核对表结构和执行记录。MySQL 的许多改表语句会隐式提交，迁移失败可能已有部分语句生效，不能假设全部自动回滚。

如果变更不兼容旧代码，需要维护窗口：构建成功后停止 `app`，确认所有写入来源已停止，再备份、迁移、启动新版。此时网站接口暂时不可用。

```bash
docker compose --env-file .env.prod -f compose.prod.yml stop app
```

### 第五步：启动已构建的新后端

只在迁移成功后执行：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --no-deps app
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 -f app
```

退出日志后验证接口和新字段/新表功能，并记录本次迁移成功。遇到错误先保留日志；恢复旧代码前要确认它兼容当前数据库。整库恢复会覆盖备份后的新数据，不能把“直接导回正式库”当成通用回滚步骤。

## 4. 常用配置及如何生效

### 4.1 编辑生产环境变量

```bash
cd ~/lifeOnline
nano .env.prod
```

保存：`Ctrl + O`，回车。退出：`Ctrl + X`。不要用示例文件覆盖现有 `.env.prod`，不要提交真实密码到 Git。

| 配置 | 本项目用途 |
| --- | --- |
| `DB_SYNCHRONIZE=false` | 禁止后端自动改正式表结构 |
| `REDIS_HOST=redis` | 后端连接 Compose 内的 Redis |
| `REDIS_PORT=6379` | Redis 内部端口 |
| `REDIS_PASSWORD` | Redis 与后端共同使用的密码 |
| `JWT_SECRET` | 登录令牌签名密钥；不要随意更换 |
| `SITE_ADDRESS` | `:80` 为 HTTP；正式域名用于 Caddy HTTPS |
| `FRONTEND_CONTEXT=../lifeOnline-h5` | 前端镜像的构建目录 |
| `PORT=3000` | 应与 Caddy 的后端目标端口一致 |

仅修改后端环境变量后，重建容器使其读取新值，无需重新构建代码镜像：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --no-deps --force-recreate app
```

`restart` 不会重新读取容器创建时的环境变量。已有 MySQL 数据卷的数据库密码，不能仅通过修改 `.env.prod` 完成更换，需要同步修改数据库账户。

### 4.2 第一次添加 Redis / BullMQ

生成随机密码：

```bash
openssl rand -hex 32
```

把结果填入 `.env.prod` 的 `REDIS_PASSWORD`，补齐 Redis 主机和端口。如果还新增了消息表，先完成第 3 节迁移，再执行：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --build app redis
```

这里没有 `--no-deps`，因此会按依赖关系启动必要服务。Redis 检查：

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
```

返回 `PONG` 表示 Redis 能使用容器配置的密码响应。仍需查看 `app` 日志，确认后端也连接成功。

应用启动会注册上海时区每天 20:00 的签到提醒。启动成功不代表已经发送提醒，也不要把重启当作历史漏发任务的补发方法。

若更换 Redis 密码，需要同步重建 `redis` 和 `app`，安排短暂维护窗口：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --force-recreate redis app
```

### 4.3 修改域名或 Caddy 配置

将域名解析到服务器，在 `.env.prod` 设置 `SITE_ADDRESS=你的实际域名`，确保云安全组及系统防火墙允许 80/443。不要公开 MySQL 3306 和 Redis 6379。

更改域名环境变量后：

```bash
docker compose --env-file .env.prod -f compose.prod.yml up -d --no-deps --force-recreate caddy
```

仅修改 `Caddyfile` 时，先验证再重载：

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose --env-file .env.prod -f compose.prod.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

验证失败就停止，不要执行下一条。容器重建后如未读到最新挂载文件，可用上面的 `--force-recreate caddy` 命令重新创建。

## 5. 常用查看命令

以下均在后端目录执行。

```bash
# 所有服务状态
docker compose --env-file .env.prod -f compose.prod.yml ps -a

# 后端最近日志
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 app

# Redis 最近日志
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 redis

# 前端和代理日志
docker compose --env-file .env.prod -f compose.prod.yml logs --tail=100 caddy

# 检查 Compose 配置，不打印解析后的密码
docker compose --env-file .env.prod -f compose.prod.yml config --quiet

# 容器当前资源占用
docker stats --no-stream

# 服务器磁盘空间
df -h

# 只重启已有后端，不更新代码和环境变量
docker compose --env-file .env.prod -f compose.prod.yml restart app
```

不要为了更新执行 `docker compose down -v`，`-v` 会删除相关数据卷，可能导致数据库、上传文件和 Redis 数据丢失。普通更新无需先 `down`。

## 6. 常见问题

### 6.1 终端一直显示 `>`，输入 exit 没用

按 `Ctrl + C` 取消未完成的命令。通常是引号未闭合或粘贴了日志。Mac 也是 Control 键。跟随日志时 `Ctrl + C` 只退出日志；其他前台命令中则会中断该命令。

### 6.2 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`

依赖发布太新，未通过 pnpm 发布时间策略。查看错误中的具体包和版本；优先等待或使用已验证、满足等待期的兼容版本，不要关闭全部安全检查。

更换版本应在本地执行 `pnpm add 包名@确认过的版本 --save-exact`，同时提交 `package.json` 和 `pnpm-lock.yaml`，通过构建和相关测试后再部署。不要只手动修改 package.json。

### 6.3 `ERR_PNPM_IGNORED_BUILDS`

表示某个依赖的安装脚本尚未明确配置。针对之前遇到的 `msgpackr-extract`，确认允许执行其脚本后，在现有 `pnpm-workspace.yaml` 的 `allowBuilds` 中追加对应项：

```yaml
allowBuilds:
  sqlite3: true
  unrs-resolver: false
  msgpackr-extract: true
```

保留其他设置，不要重复创建 `allowBuilds`。同步提交此文件，再重新构建。其他包报错时逐项判断，不能把所有包都默认允许。[pnpm 配置参考](https://pnpm.io/settings)

### 6.4 `ERR_PNPM_OUTDATED_LOCKFILE`

package.json 与锁文件不一致。本地执行 `pnpm install` 更新锁文件，检查改动并验证后提交；服务器拉取后重建。保留 Dockerfile 的 `--frozen-lockfile`。

### 6.5 `mysqldump: command not found`

使用第 3 节的 `docker compose exec -T db ...`，让命令在 MySQL 容器中执行。不要把报错日志再次粘贴执行。

### 6.6 Redis `NOAUTH`、`WRONGPASS` 或连接拒绝

核对生产配置中的密码是否一致、Redis 是否健康、是否已经重建受影响容器。应用容器内的 `127.0.0.1` 指向应用自己，本项目应连接 `redis:6379`。

### 6.7 更新后出现 502

先看 `app` 启动日志，确认后端没有因缺表、配置缺失而退出，再看 Caddy 日志。后端健康后若代理仍连接旧地址，可按第 4.3 节验证并重载 Caddy；必要时重建 Caddy 容器。

### 6.8 如何保留完整构建错误

```bash
docker compose --env-file .env.prod -f compose.prod.yml --progress plain build app
```

重点看最后的具体 `Error`。`CANCELED` 常常只是另一个构建步骤失败后被连带取消，不能仅凭它判断原因。日志发给别人前遮住凭据。

## 7. 后续部署习惯

- 本地先验证，再提交推送；服务器拉取对应分支，记录提交号。
- 后端依赖变更同时提交 package.json、锁文件及相关 pnpm 配置。前端依赖变更同时提交 package.json 和 package-lock.json。
- 本地与 Docker 应固定同一个经过验证的 pnpm 版本，避免 Corepack 自动选取新版本后出现策略差异；本手册不替项目决定具体版本。
- 表结构变更先备份，只执行尚未应用的迁移，保留执行记录。
- 本文按单实例编写。若以后部署多实例，更新命令要保留实际副本数，并配套验证代理分流、共享文件和数据库连接数；单机多容器不能抵御整台服务器故障。
- 每次更新后验证页面、登录和本次功能，不只看 Docker 构建成功。
