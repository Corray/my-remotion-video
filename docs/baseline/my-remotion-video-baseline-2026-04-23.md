# my-remotion-video · 项目基线

**基线日期**：2026-04-23
**基线 commit**：`f60904c` (Record feedback: impl+adversarial-review A+B combo for small-task eval)
**仓库**：`Corray/my-remotion-video`
**上次基线**：无（首次生成；`--refresh` 回退为全量）

> **注意**：本项目不是 Java/Spring 项目，不适用原 `/init-baseline` 模板中的 DDD/sxp-framework 段落。以下内容按 Node.js + TypeScript + Remotion 技术栈重新组织。

---

## 1. 产品简介

这个仓库同时承担两个角色：

**角色 A — Remotion 视频作品集**（项目最初形态）
用 [Remotion 4.0.438](https://remotion.dev) 做的 React-based 视频工程。目前收录三个成片 composition：
- `ScaldCare`（`src/Main.tsx`）— 烫伤护理教程视频，1080×1920 竖屏
- `JiNiTaiMei`（`src/JiNiTaiMei.tsx`）— 蔡徐坤致敬视频，10 个 Series.Sequence 分段
- `HelloWorld`（`src/YoungCyclist.tsx`）— 骑行小人 demo，1920×1080 横屏

**角色 B — AI 视频生成 Studio**（2026-04-23 新增）
面向非开发者的"文字描述 → 视频"工具，封装成一个本地网页：
- 用户在浏览器里输入场景描述 + 上传素材
- 后端调 LLM（支持 Claude / GPT / MiniMax / DeepSeek 四家）生成一份完整的 Remotion Composition TSX
- 生成结果自动注册进 Remotion Studio，通过 `@remotion/player` 做浏览器内实时预览
- 一键渲染 mp4 并下载

两个角色共存：Studio 生成的 composition 也会出现在 Remotion Studio (`npm run dev`) 里，可以手工编辑和 CLI 渲染。

---

## 2. 技术栈

### 运行时 & 核心
| 类别 | 选择 | 版本 |
|------|------|------|
| 语言 | TypeScript | 5.9.3 |
| React | — | 19.2.3 |
| 视频引擎 | Remotion | 4.0.438 |
| Node 执行器 | `tsx` (开发) / `node` (生产) | tsx 4.21 |

### Remotion 相关
- `remotion` 4.0.438 — 核心 API（`AbsoluteFill`、`useCurrentFrame`、`interpolate`、`spring`、`Sequence`、`Series`、`staticFile` 等）
- `@remotion/cli` 4.0.438 — `remotion studio` / `remotion bundle` 命令
- `@remotion/bundler` 4.0.438 — 程序化打包（Studio 后端使用）
- `@remotion/renderer` 4.0.438 — 程序化渲染 mp4（Studio 后端使用）
- `@remotion/player` 4.0.438 — 浏览器内预览（Studio 前端使用）
- `@remotion/tailwind-v4` 4.0.438 — Tailwind v4 webpack override（已在 `remotion.config.ts` 启用）
- `@remotion/zod-types` 4.0.438 — schema 类型
- `tailwindcss` 4.0.0

### Studio 后端
- `express` 5.2.1 — HTTP 服务
- `multer` 2.1.1 — multipart 文件上传
- `cors` 2.8.6
- `dotenv` 17.4.2 — `.env` 加载
- `@anthropic-ai/sdk` 0.90.x — Claude provider
- `openai` 最新 — 通用 OpenAI 协议 provider（OpenAI / MiniMax / DeepSeek 共用）

### Studio 前端
- `vite` 8.0.10 — 开发服务器
- `@vitejs/plugin-react` 6.0.1
- `@remotion/player` — 预览

### 开发工具
- `concurrently` 9.2.1 — 并行跑后端和前端
- `eslint` 9.19.0 + `@remotion/eslint-config-flat`
- `prettier` 3.8.1

---

## 3. 仓库结构

```
my-remotion-video/
├── src/                           # Remotion 视频源码
│   ├── index.ts                   # registerRoot 入口
│   ├── Root.tsx                   # 注册所有 Composition（含 GENERATED_COMPS）
│   ├── Main.tsx                   # ScaldCare 主 composition
│   ├── JiNiTaiMei.tsx             # JiNiTaiMei 主 composition
│   ├── YoungCyclist.tsx           # HelloWorld composition
│   ├── Nurse.tsx                  # ScaldCare 子组件
│   ├── index.css
│   ├── scenes/                    # ScaldCare 和 JiNiTaiMei 的分场景
│   │   ├── Intro.tsx / Outro.tsx / Warning.tsx / ...
│   │   └── jntm/Jntm{Opening|Title|Sing|Dance|...}.tsx
│   ├── HelloWorld/                # HelloWorld 子组件
│   └── generated/                 # ⭐ AI 生成的 composition
│       ├── index.ts               # 自动维护的注册表
│       └── gen-<ts>-<hex>.tsx     # 每个任务一个
│
├── server/                        # Studio 后端（Express）
│   ├── index.ts                   # 启动：注册中间件 + 路由 + 健康检查
│   ├── paths.ts                   # 共享路径常量
│   ├── types.ts                   # Job / AssetInfo / CompositionMeta
│   ├── jobs.ts                    # 内存 Job 存储
│   ├── registry.ts                # 维护 src/generated/index.ts
│   ├── bundler.ts                 # 缓存 Remotion bundle + renderMedia
│   ├── compile-check.ts           # ts.transpileModule 语法检查 + 导出校验
│   ├── generator.ts               # 编排：provider 调用 + 失败重试
│   ├── providers/                 # LLM provider 抽象
│   │   ├── types.ts               # 接口定义
│   │   ├── prompts.ts             # SYSTEM_PROMPT + TOOL_SCHEMA + buildUserMessage
│   │   ├── anthropic.ts           # Claude（tool_use）
│   │   ├── openai-compat.ts       # OpenAI/MiniMax/DeepSeek（function calling）
│   │   └── index.ts               # REGISTRY + listAvailableModels + getDefaultModelId
│   ├── routes/
│   │   ├── jobs.ts                # POST /api/jobs, GET /api/jobs, DELETE /api/jobs/:id
│   │   ├── render.ts              # POST /api/jobs/:id/render, GET .../download
│   │   └── models.ts              # GET /api/models
│   └── tsconfig.json
│
├── app/                           # Studio 前端（Vite + React 19）
│   ├── index.html
│   ├── main.tsx                   # createRoot 入口
│   ├── App.tsx                    # 唯一 UI 组件：表单 + 历史 + Player + 下载
│   ├── styles.css                 # 暗色 GitHub 风主题
│   ├── vite.config.ts             # 暴露 __PROJECT_ROOT__ 常量；proxy /api → 3001
│   └── tsconfig.json
│
├── public/                        # Remotion staticFile() 根
│   └── generated/<jobId>/         # 用户上传的素材
│
├── out/                           # 渲染产物（mp4）
│
├── docs/                          # 文档
│   ├── baseline/                  # 项目基线（本文件）
│   ├── consensus/ design/ tasks/  # Harness 工作流产物
│   ├── workspace/                 # journal.md 等
│   └── project.yaml
│
├── .claude/                       # Claude Code harness
│   ├── commands/                  # /impl, /iterate, /design, /run-tasks 等
│   └── knowledge/                 # ⚠️ 当前模板偏 Java，不适用本项目
│
├── remotion.config.ts             # Tailwind v4 override
├── package.json                   # scripts: dev / build / studio / studio:server / studio:web
├── tsconfig.json                  # 仅 include src/**/*
└── .env.example                   # 4 家 provider 的 key 模板
```

---

## 4. 运行入口

```bash
# Remotion Studio（查看/编辑已有 composition）
npm run dev                          # remotion studio → localhost:3000

# AI 生成 Studio（场景→视频网页）
npm run studio                       # 并行起两个：
                                     #   - Express 后端 @ localhost:3001
                                     #   - Vite 前端 @ localhost:5173

# CLI 渲染
npx remotion render <CompId> out/x.mp4

# Lint / 类型检查
npm run lint                         # eslint src/ + tsc
```

---

## 5. API 概要（Studio 后端）

| Method | Path | 作用 |
|--------|------|------|
| GET | `/api/health` | 服务健康 + 可用模型数量 |
| GET | `/api/models` | `{available, disabled, defaultModelId}` — 按 env key 存在与否过滤 |
| GET | `/api/jobs` | 全部 job 列表（按 createdAt 倒序） |
| GET | `/api/jobs/:id` | 单个 job 详情 |
| POST | `/api/jobs` (multipart) | 创建 job：fields `scene` / `modelId`，files `assets[]`；202 立即返回，后台跑 LLM |
| DELETE | `/api/jobs/:id` | 删除生成的 composition tsx（不清 public 素材） |
| POST | `/api/jobs/:id/render` | 启动 bundle+render；202 返回，通过轮询 `GET /api/jobs/:id` 看 `renderProgress` |
| GET | `/api/jobs/:id/download` | 返回 `out/<jobId>.mp4` 文件下载 |

---

## 6. 核心数据模型

### `Job`（`server/types.ts`）

```ts
type Job = {
  id: string;                // "gen-<timestamp>-<hex>"，符合 Remotion Composition id 规则
  status: 'generating' | 'ready' | 'rendering' | 'rendered' | 'error';
  scene: string;             // 用户输入的场景描述
  assets: AssetInfo[];       // 上传的素材（保存在 public/generated/<id>/）
  modelId?: string;          // 如 "anthropic/claude-sonnet-4-6"
  attempts?: number;         // provider 实际调用次数（含重试）
  meta?: CompositionMeta;    // {durationInFrames, fps, width, height}
  summary?: string;          // LLM 生成的一句话描述
  error?: string;
  renderProgress?: number;   // 0..1
  mp4Path?: string;
  createdAt: number; updatedAt: number;
};
```

### `ModelEntry`（`server/providers/types.ts`）
```ts
type ModelEntry = {
  id: string;                // "<vendor>/<model>"，前端用这个做 select value
  label: string;             // 人类可读
  vendor: 'anthropic' | 'openai' | 'minimax' | 'deepseek';
  model: string;             // 实际传给 API 的 model 名
  envKey: string;            // 必须存在的环境变量
};
```

### 生成 TSX 契约（所有 provider 输出格式）

LLM 通过 `emit_composition` 工具返回，内容写到 `src/generated/<jobId>.tsx`：

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, ... } from 'remotion';

export const metadata = {
  id: '<jobId>',              // 必须与文件名的 jobId 一致
  durationInFrames: number,
  fps: number,
  width: number,
  height: number,
};

export const Composition: React.FC = () => { ... };
```

**强制约束**：
- 只允许 import `react` 和 `remotion`
- 必须命名导出 `metadata` + `Composition`（组件名固定）
- 不使用 Tailwind class、setTimeout、CSS transitions（只能用 frame 驱动）
- 素材引用统一用 `staticFile('generated/<jobId>/<filename>')`

---

## 7. 关键数据流

### 生成流
```
POST /api/jobs (scene + assets + modelId)
  ↓
save assets → public/generated/<jobId>/
  ↓
job.status = 'generating'（202 立即返回 response）
  ↓ (后台异步)
generator.generateWithRetry()
  ↓
provider.adapter(entry, input)            // 调 LLM tool call
  ↓
compile-check.ts (transpileModule + export check)
  ↓ 失败
重试一次（把 previousError + previousAttempt 塞进 prompt）
  ↓ 成功
registry.writeGeneratedComposition()       // 写 tsx + 重写 src/generated/index.ts
  ↓
bundler.invalidateBundle()
  ↓
job.status = 'ready'
```

### 渲染流
```
POST /api/jobs/:id/render
  ↓
job.status = 'rendering'（202 立即返回）
  ↓ (后台异步)
bundler.ensureBundle() → 缓存的 serveUrl 或 @remotion/bundler bundle()
  ↓
selectComposition({serveUrl, id: jobId})
  ↓
renderMedia({codec: 'h264', outputLocation: out/<jobId>.mp4, onProgress})
  ↓
job.renderProgress 每帧更新
  ↓
job.status = 'rendered'; job.mp4Path 就位
```

### 前端加载生成的 composition
```
用户点历史里某条 job（status === 'ready'）
  ↓
const url = `/@fs${__PROJECT_ROOT__}/src/generated/${jobId}.tsx?t=${Date.now()}`
await import(/* @vite-ignore */ url)
  ↓
拿到 { Composition } → <Player component={Composition} ... />
```
**注意**：不使用 `import.meta.glob`——那是编译时快照，新生成的文件不在里面。

---

## 8. Provider 矩阵

| Vendor | 默认模型 | 可覆盖 env | baseURL env | 结构化输出方式 |
|--------|---------|-----------|-------------|--------------|
| anthropic | `claude-sonnet-4-6` | `ANTHROPIC_MODEL` | — (SDK 写死) | Anthropic tool_use + `tool_choice` 强制 |
| openai | `gpt-5` | `OPENAI_MODEL` | `OPENAI_BASE_URL` | OpenAI function calling + `tool_choice: function` |
| minimax | `MiniMax-Text-01` | `MINIMAX_MODEL` | `MINIMAX_BASE_URL`（默认 `api.minimax.chat/v1`） | 同 OpenAI 协议（走 openai SDK） |
| deepseek | `deepseek-chat` | `DEEPSEEK_MODEL` | `DEEPSEEK_BASE_URL`（默认 `api.deepseek.com/v1`） | 同 OpenAI 协议 |

**默认选择优先级**：anthropic > openai > deepseek > minimax（仅以"存在 key"为条件，与生成质量经验顺序一致）。

**Prompt 缓存**：Anthropic 适配器对 `SYSTEM_PROMPT` 开启了 `cache_control: ephemeral`。OpenAI 协议不开启（多家兼容性考虑）。

---

## 9. 已知约束 / 技术债

### 架构层
- **Job 仅存内存**（`server/jobs.ts`）— 服务重启 = 历史列表丢失。`.env` 改动必须重启 `npm run studio` 才能生效（`tsx watch` 不监听 `.env`）。
- **Bundle 缓存粒度粗**：每次新生成 composition 都会让整个 Remotion bundle 失效，下次渲染要重新打包 ~10-30 秒。
- **素材不做类型校验**：目前只口头约束用户传图/音频，后端没限制 MIME。
- **没有 auth / rate limit**：仅适合本机使用，绝不能直接暴露到公网（执行 LLM 生成的任意代码 = 任意命令执行风险）。

### 生成质量层
- **LLM 不会"画画"**：场景描述里"一个女孩在樱花树下"这类，LLM 只能写彩色 div 堆积的几何简笔画。当前方向对"图文卡片/kinetic typography/数据动画/素材拼贴"效果好，对"角色场景类视频"不适合。（2026-04-23 session feedback）
- **模型质量分层明显**：Claude > GPT > DeepSeek > MiniMax（经验排序）。MiniMax 的 `MiniMax-Text-01` 需要付费套餐，普通账号可能 2061 报错；用户目前用 `MiniMax-M2.7` 覆盖。
- **重试上限 2 次**：如果两次都编译不过，直接把 job 标记 error。没有更细的 fallback（比如切换到更强的模型）。

### Remotion 约束
- **Composition id 只允许 `a-z/A-Z/0-9/CJK/-`**（**不允许下划线**）— jobId 格式 `gen-<timestamp>-<hex>` 已对齐。
- **生成的 tsx 只能 import `react` 和 `remotion`** — 强约束在 SYSTEM_PROMPT 里；无法自动化执行。
- **Tailwind v4 虽然在 `remotion.config.ts` 里启用了，但生成的 composition 禁止用 class 名，只能 inline style**（避免打包出意外）。

### 前端约束
- Vite 的 `import.meta.glob` 是编译时快照 — 已用 `/@fs/` + 动态 import 绕开。
- `Player` 在 1080×1920 @ 30fps 上渲染重 composition（>100 div/帧）会卡，只影响预览，不影响 mp4 导出。

### Harness 层
- `.claude/knowledge/` 下的 `backend/sxp-framework.md`、`testing/standards.md` 等是 Java/Spring 模板的遗留 — **不适用本项目**。`/impl` `/review` 如果无脑加载这些，建议按 TypeScript/React/Remotion 场景重写。
- `docs/design/jntm.md`、`docs/tasks/2026-04-jntm/` 是上一轮 JiNiTaiMei 的产物，与 Studio 功能无关。

---

## 10. 外部依赖（Studio 运行必须）

| 依赖 | 必需性 | 说明 |
|------|-------|-----|
| Node.js ≥ 18 | 必需 | tsx / @remotion/renderer 要求 |
| Chrome / Chromium | 必需（渲染时） | `@remotion/renderer` 用 Puppeteer |
| 至少一个 LLM API key | 必需 | 否则 /api/models 返回 available=[] |
| ffmpeg | 通常自带 | `@remotion/renderer` 打包了，一般不用装 |

---

## 11. 环境变量约定

见 `.env.example`。按需启用：

```
ANTHROPIC_API_KEY= / ANTHROPIC_MODEL=
OPENAI_API_KEY= / OPENAI_MODEL= / OPENAI_BASE_URL=
MINIMAX_API_KEY= / MINIMAX_MODEL= / MINIMAX_BASE_URL=
DEEPSEEK_API_KEY= / DEEPSEEK_MODEL= / DEEPSEEK_BASE_URL=
PORT=                 # 默认 3001
```

**不要 commit `.env`**（已在 `.gitignore`）。

---

## 12. 后续迭代切入点（参考）

- **生成质量路线**：① 强化素材驱动（上传图→LLM 拼贴），② 接图像生成 pipeline（Midjourney / 即梦 / 通义万相 → LLM 编排），③ 模板化（预写常用场景，LLM 只挑 + 填文案）
- **工程健壮度**：job 持久化（SQLite / 文件 JSON），bundle 按 composition 粒度缓存，生成结果的运行时错误捕获
- **多人场景**：auth + 按用户隔离 job/素材目录；渲染队列（目前没有并发控制）
- **Remotion Harness**：重写 `.claude/knowledge/` 面向 TS/React/Remotion（动画 API、Sequence/Series 模式、素材管理），让 `/impl` 真正能加载有用上下文

---

> **人工补充项**（请核实/修改）：
>
> - `docs/project.yaml` 的 `name`、`description`、`stack`、`baseline_commit`
> - 本文件第 9 节"已知约束"中是否有遗漏
> - `.claude/knowledge/` 是否清理历史 Java 模板
