# Home Compass · Austin 私人购房决策台

React + TypeScript 静态 PWA → GitHub Pages；Supabase → 登录与私人数据；Cloudflare Worker → 待接入的采集调度。

## 当前实际完成范围

- 响应式总览、真实指标列表、候选房源新增/状态更新/删除、地图路线链接、成本试算。
- Supabase 账号密码登录、用户白名单与 RLS、房源 JSON 导出/恢复。
- 相对路径 PWA manifest、图标、应用外壳缓存、GitHub Pages Actions 部署。
- **未接入真实市场数据。Worker 仅为调度骨架，cron 默认关闭。** 不会生成假的市场评分。
- 区域自动排名、逐源 CSV 导入、房源并排比较、预算设置持久化、编辑已有笔记、离线私人笔记及买租比较尚未实现。

## 本地运行

安装 Node.js 22.12+，执行：

```sh
npm ci
cp .env.example .env
npm run dev
```

在 `.env` 设置 Supabase URL 和 publishable key。此 key 用于公开客户端，所有数据必须通过数据库 RLS 授权。**绝不能填 service_role / secret key 到任何 VITE_ 变量。** 未配置时显示无数据预览，成本试算仍可使用。

```sh
npm test
npm run worker:check
npm run build
```

## Supabase 配置

1. 新建 Free 项目，在 SQL Editor 执行 `supabase/migrations/001_initial.sql`。
2. 关闭 Authentication 中公开注册。通过管理后台创建自己的邮箱/密码用户（确认邮箱或 admin auto-confirm）。
3. 获取用户 UUID，在 SQL Editor 执行 `insert into public.app_members(user_id) values ('真实UUID');`。
4. 复制项目 URL、publishable key 到本地 `.env` 和 GitHub Repository Variables。
5. 用本人账号验证可增删房源；无账号、未加入白名单账号和其他用户都不应读取/改写私人房源。

本版本使用密码登录，没有 OAuth 回调路径依赖。浏览器保存 Supabase 会话；退出会清空 UI 中的私人记录。Service Worker 不缓存 Supabase 响应，不持久化私人笔记；仅应用外壳和计算器可离线使用。通勤锚点、成本输入为本次会话临时值。

## GitHub Pages 发布（由 Zhenwei 执行 push）

建议仓库名 `austin-home-compass`。尚未创建远程仓库，也未执行任何 push。

1. GitHub Free 使用 **public** 仓库才能免费使用 Pages。页面与前端源代码公开，真实私人数据只存 Supabase。
2. 创建 `xiaobaofamily/austin-home-compass` 仓库，不初始化 README。
3. Settings → Pages → Source 选择 **GitHub Actions**。
4. Settings → Secrets and variables → Actions → **Variables** 添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. 本地检查后提交并 push（具体路径见交付消息；若还未 commit）：

```sh
git add .
git commit -m "Initialize Austin home decision PWA"
git push -u origin main
```

Actions 自动从 Pages 配置取得 base_path，构建并部署 `dist/`。无 History API 路由，因此没有子路径刷新 404。Manifest / Service Worker 作用域均相对于仓库路径。使用免费 github.io 域名，不需要购买域名。

预期地址：`https://xiaobaofamily.github.io/austin-home-compass/`，**仅部署成功后才存在**。

### 上线验收

- 仓库子路径下 JS / CSS / manifest / 图标和 Service Worker 均返回 200。
- Chrome 安装 PWA；iPhone 添加到主屏幕。
- 首次加载完成后断网，刷新可加载外壳并使用成本试算；退出后私人记录不残留。
- 通过本人登录验证增删、恢复备份；尝试匿名请求数据库应无法读取记录。

## Cloudflare Worker（未启用采集）

`worker/wrangler.jsonc` 中 `crons: []` 且 `INGESTION_ENABLED=false`，避免空跑被误判为数据更新。

下一步需逐源检查官方公开下载路径、使用条件、区域字段覆盖、文件大小和 **免费 cron 10ms CPU**。全国 CSV、gzip 解压、PDF 分析不能预先保证免费 Worker 承载。若超限，保留手工导入或选择适合批处理的执行环境；不绕过来源访问控制。

适配器通过验证后，再设置真实定时与启用开关。服务端凭据使用：

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.jsonc
```

Supabase URL 为公开配置，可写入 Worker vars；server key 不进仓库、GitHub Pages、日志或聊天。当前 `/` 状态接口明确返回 `not_configured`，不提供公开手动触发写入入口。

## 免费层与备份

只存目标地区指标及私人房源，不存全国原始数据、房源照片。Supabase 免费层无自动数据库备份，需定期导出；低活跃可能暂停，不能保证定时任务可永续免费运行。JSON 备份仅覆盖房源及笔记，市场指标需重新采集。

## 官方参考

- https://vite.dev/guide/static-deploy#github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://developers.cloudflare.com/workers/platform/limits/
- https://supabase.com/pricing
