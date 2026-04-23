# 迭代共识 · studio-chat · 流式交互终端

**Sprint**：`2026-04-studio-chat`
**生成日期**：2026-04-23
**基线**：`docs/baseline/my-remotion-video-baseline-2026-04-23.md` (commit `f60904c`)
**需求来源**：manual
**触发**：用户 `/impl` → 判大任务 → 转 `/iterate`

---

## 1. 迭代范围

### 1.1 需求清单（做什么）

**R1 · 实时交互终端**
在 Studio 前端右侧（或下方）增加一个"终端式"面板，展示正在发生的 LLM 交互流程：
- 正在思考的内容（Claude thinking，如果模型支持）
- 正在生成的 token 增量
- tool call 调用时机和参数累积
- 编译检查结果 / 重试事件
- 最终产出的 composition meta

**R2 · 实时中断**
生成过程中可点击「中断」按钮终止 LLM 调用，job 状态回到 `cancelled`，用户可以重新描述。

**R3 · 反馈迭代**
生成完成后（或中断后）用户可以在终端底部输入反馈文本（例如"把女孩换成一只猫"、"时长改 5 秒"、"去掉爱心"），触发同一 job 的下一轮生成：
- 复用同一 `jobId`（不新建 job）
- 保留 conversation 历史让模型理解"在此基础上修改"
- 覆盖写入同一个 tsx 文件
- Player 实时切到新版本预览

### 1.2 明确排除（本 sprint 不做）

- ❌ **分叉/分支版本**：每次反馈只保留最新一版，不保留历史版本（磁盘简单、Player 只预览最新）
- ❌ **暂停/恢复**：中断 = 终止；要继续靠反馈再发起
- ❌ **渲染中反馈**：只支持"生成阶段"的反馈；mp4 渲染中不能中断
- ❌ **多人协作**：单机单用户假设不变
- ❌ **事件持久化**：events 仅存内存，服务重启丢失（与现有 jobs 存储方式一致）

---

## 2. 影响分析

### 2.1 模块影响

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| `server/providers/types.ts` | **改造** | `ProviderAdapter` 从返回 `Promise<GenerateResult>` 改为返回 `AsyncIterable<Event>`，最终 `Event` 类型 `done` 承载 result |
| `server/providers/prompts.ts` | **改造** | 新增 `buildConversation(input, history)` 支持多轮；旧 `buildUserMessage` 作为首轮的 helper 保留 |
| `server/providers/anthropic.ts` | **重写** | 用 `client.messages.stream()` 替代 `client.messages.create()`，yield 事件 |
| `server/providers/openai-compat.ts` | **重写** | `stream: true`，迭代 chunks，处理 tool_call delta 累积 |
| `server/providers/index.ts` | 不变 | REGISTRY 结构不变 |
| `server/generator.ts` | **重构** | 从函数改成 `JobController`：维护 AbortController + 事件 bus + conversation 历史；支持 `start()` / `cancel()` / `feedback(text)` |
| `server/types.ts` | **扩展** | `Job` 加 `conversation: Turn[]`、`events: Event[]`（环形缓冲，限长）、状态枚举加 `cancelled` |
| `server/jobs.ts` | 小改 | 加事件追加辅助 |
| `server/routes/jobs.ts` | 小改 | POST /api/jobs 触发 start() 后立即返回，事件通过 SSE 推送 |
| `server/routes/events.ts` **(NEW)** | 新增 | `GET /api/jobs/:id/events` — SSE；支持 `?since=<eventIndex>` 断线重连 |
| `server/routes/interact.ts` **(NEW)** | 新增 | `POST /api/jobs/:id/cancel`、`POST /api/jobs/:id/feedback` |
| `server/index.ts` | 小改 | 挂载新路由 |
| `app/App.tsx` | **大改** | 拆分出下面几个子组件；不再显示"生成中…"spinner，替换为 TerminalPanel |
| `app/useJobEvents.ts` **(NEW)** | 新增 | React hook，封装 EventSource + 自动断线重连 |
| `app/TerminalPanel.tsx` **(NEW)** | 新增 | 滚动终端样式 UI，渲染事件；支持「简洁/详细」切换 |
| `app/ChatInput.tsx` **(NEW)** | 新增 | 中断按钮 + 反馈 textarea + 回车提交 |
| `app/types.ts` **(NEW)** | 新增 | 前后端共享的 Event / Turn 类型定义（手写避免引入 monorepo 工具） |

**估算 blast radius**：17 个文件（7 新增 + 10 修改），其中 3 个核心重写（generator.ts / 两个 provider）。

### 2.2 不受影响的模块

- `src/`（Remotion 视频源）完全不动
- `server/registry.ts`、`server/bundler.ts`、`server/compile-check.ts` 不动（仍是"收到 tsx → 写文件 → 构建"）
- `server/routes/render.ts`、`server/routes/models.ts` 不动
- `docs/project.yaml`、`docs/baseline/` 不动

### 2.3 测试层影响

项目当前**没有测试框架**（只有 `npm run lint` = eslint + tsc）。本 sprint 必须引入测试基建：
- `vitest` — 前后端共用单测框架（轻量，Vite 原生，TS 原生）
- `@testing-library/react` + `happy-dom` — 前端组件测试
- `playwright` — E2E（为满足"前端任务必须 ≥1 条 E2E"的硬约束）
- 测试脚本入口：`npm test`（vitest）、`npm run test:e2e`（playwright）

---

## 3. 接口变更

### 3.1 新增接口

| Method | Path | 作用 | 幂等 |
|--------|------|------|------|
| GET | `/api/jobs/:id/events` | SSE 流；`Content-Type: text/event-stream`；每事件 `id:` 字段等于事件 index，供重连用 `?since=<n>` 或标准 `Last-Event-ID` 头 | ✓ |
| POST | `/api/jobs/:id/cancel` | 中断当前生成；body 空；返回 `{ok: true, status: 'cancelled'}` | ✓（已 cancelled 也返回 ok） |
| POST | `/api/jobs/:id/feedback` | 用户反馈触发下一轮；body `{content: string}`；返回 202；事件流会出现新 `user_feedback` + `started` | ✗ |

### 3.2 修改接口

**`POST /api/jobs`**：行为变化，非 breaking
- 请求不变（`scene` + `modelId` + `assets`）
- 响应字段扩展：`Job` 结构含 `conversation: []`、`events: []`
- 行为：返回后**立即开始**emit events（客户端可立即订阅 SSE）

**`GET /api/jobs/:id`**：返回值扩展
- 新增 `conversation` 数组（turn 列表）
- 新增 `events` 数组（最近 N 条，全量靠 SSE 拉）

**这两个扩展对现有客户端无破坏**（JSON 多字段向后兼容）。

### 3.3 废弃接口

无。

### 3.4 Breaking Change 标注

**无外部 breaking**（Studio 是本机工具，无下游）。

**内部 breaking**（需要配合改）：
- `ProviderAdapter` 签名从 `Promise<GenerateResult>` → `AsyncIterable<Event>`
  - 影响：所有 provider 实现必须同步升级
  - 缓解：老的 `generateWithRetry()` 签名废弃，改名 `JobController`

---

## 4. 数据模型变更

### 4.1 类型新增 / 扩展

```ts
// server/types.ts
export type JobStatus =
  | 'generating' | 'ready' | 'rendering' | 'rendered'
  | 'cancelled'          // ⭐ 新增
  | 'error';

export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;             // 用户：输入文本；助手：summary（不存全量 tsx，太大）
  tsxSnapshot?: string;        // 助手轮次：这轮产出的 tsx 路径片段
  timestamp: number;
};

export type StudioEvent =
  | {type: 'started'; turn: number; ts: number}
  | {type: 'thinking'; delta: string; ts: number}         // Claude thinking
  | {type: 'token'; delta: string; ts: number}            // free-form text
  | {type: 'tool_call_start'; name: string; ts: number}
  | {type: 'tool_args_delta'; delta: string; ts: number}
  | {type: 'tool_call_done'; ts: number}
  | {type: 'compile_check'; ok: boolean; errors?: string[]; ts: number}
  | {type: 'retry'; attempt: number; reason: string; ts: number}
  | {type: 'tsx_written'; path: string; ts: number}
  | {type: 'ready'; meta: CompositionMeta; summary: string; ts: number}
  | {type: 'user_feedback'; content: string; turn: number; ts: number}
  | {type: 'cancelled'; ts: number}
  | {type: 'error'; message: string; ts: number};

// Job 扩展
export type Job = {
  // ...existing...
  conversation: ConversationTurn[];
  events: StudioEvent[];          // 环形缓冲，cap = 500
  turn: number;                   // 当前轮次（0 = 第一次生成，1+ = 反馈后）
};
```

### 4.2 无数据库迁移

Jobs 仍是内存 Map，重启清空。

### 4.3 磁盘侧变化

- `src/generated/<jobId>.tsx` 每轮覆盖写入（语义：该 jobId 的"当前版本"）
- `public/generated/<jobId>/` 素材只在 POST /api/jobs 时写入一次，反馈轮次复用同一目录

---

## 5. 冲突检测

| 潜在冲突 | 分析 | 决策 |
|---------|------|------|
| 现有 `generateWithRetry` 的重试事件 vs 新的事件流 | 重试是 generator 的内部行为，应该作为 event（`retry`）发出，而不是静默重试 | ✅ 让 retry 事件可见，用户能看到"第 2 次尝试中" |
| Bundle cache 失效 vs 反馈多轮 | 每次反馈都重写 tsx → `invalidateBundle()` → 下次渲染要重新打包 | ⚠️ 用户如果生成 5 轮再渲染，就是 5 次 bundle 失效（反正最后才渲染一次，无影响） |
| 并发多个 job | 多个生成任务可同时进行，各自独立事件流 | ✅ 每个 job 独立 JobController，无冲突 |
| 同一 job 并发操作 | 用户生成中又发 feedback | ⚠️ 策略：feedback 先触发 cancel 上一轮再开始新轮；防止两轮 LLM 同时跑 |
| 流式 tool call 的 JSON 解析 | tool_args_delta 一个字符一个字符来，JSON 未完成时不能解析 | ✅ generator 只在 `tool_call_done` 整体解析；前端按 delta 文本方式展示 |
| OpenAI-compat 三家的 streaming 差异 | OpenAI 标准格式 SSE；MiniMax/DeepSeek 号称兼容但可能有个别字段差异 | ⚠️ MVP 先保证 OpenAI + DeepSeek 可跑；MiniMax 用 try/catch fallback，失败回退到非流式（见 Q3） |
| 基线文档约束"Job 存内存" | 新增 events 环形缓冲仍在内存，一致 | ✅ 无冲突 |

---

## 6. 风险点 / 产品确认

### 6.1 需产品/开发者确认（阻塞项）

| ID | 问题 | 默认方案 | 阻塞 |
|----|------|---------|------|
| Q1 | 反馈是否支持上传新素材？ | 默认**不支持**（feedback 只是文本；新素材要重新起 job） | T008 / T103 |
| Q2 | 中断后自动回到"可重新输入"状态，还是保留上次 scene 文本让用户编辑再提交？ | 默认**保留**上次输入在表单里 | T104 |
| Q3 | MiniMax streaming 如果不兼容，fallback 策略？ | 默认 fallback 到非流式（一次返回全部，伪装成 2 个大事件：`started` + `tool_call_done`），UI 体验降级但不崩 | T004 |
| Q4 | 终端面板显示粒度默认值？ | 默认**简洁**（只显示阶段事件 + tool call 参数 + 编译结果），右上角按钮可切到详细（每个 token delta） | T102 |
| Q5 | 反馈对话的 max_tokens / 历史长度限制？ | 默认保留全部 conversation，但如果总 token 估算超过 4w（Claude）/ 2w（其它），自动截断最老的几轮，保留最新 2 轮和首轮 | T005 |

### 6.2 风险点

- **Playwright 首次安装慢**：`npx playwright install chromium` 要下载 ~200MB，T000 里要明确说明
- **SSE 在某些代理后可能被缓冲**：本地使用不触发；如将来上云要加 nginx 配置
- **前端终端滚动性能**：500 个事件的 DOM 可能卡，需要虚拟化或只保留最近 200 条显示（其余折叠）
- **LLM 费用上升**：多轮对话等于每次发送越来越长的历史。对开发者直观的提示：终端底部显示本 job 累计 token 数
- **反馈时的 prompt engineering**：让 LLM 理解"基于上次代码修改"而不是"重新写一版"需要 system prompt 里加明确指引（见 T002）

---

## 7. 基线更新建议

sprint 完成后需要更新 `docs/baseline/my-remotion-video-baseline-2026-04-23.md`：

1. 第 4 节「运行入口」加 `npm test` / `npm run test:e2e`
2. 第 5 节「API 概要」加 3 个新路由
3. 第 6 节「核心数据模型」Job 结构加 conversation/events/turn
4. 第 7 节「关键数据流」新增"反馈多轮流"
5. 第 9 节「已知约束」加 streaming 相关注意事项

建议 /run-tasks 完成后手工跑 `/init-baseline --refresh` 再做一轮。

---

## 8. 实现顺序建议（拓扑序）

```
T000 (Setup: vitest + playwright)
  ├─→ T001 (Event 类型 + Job 扩展)
  │     ├─→ T002 (prompts 多轮改造)
  │     │     ├─→ T003 (Anthropic streaming)
  │     │     └─→ T004 (OpenAI-compat streaming)
  │     │           └─→ T005 (JobController 重构)
  │     │                 ├─→ T006 (SSE endpoint)
  │     │                 └─→ T007/T008 (cancel + feedback endpoints)
  │     │                       ├─→ T101 (useJobEvents hook)
  │     │                       │     ├─→ T102 (TerminalPanel)
  │     │                       │     └─→ T103 (ChatInput)
  │     │                       │           └─→ T104 (App.tsx 整合)
  │     │                       └─→ T201/T202/T203 (测试)
```

T000 必须最先；T005 是整个后端的 keystone；T104 是前端的 keystone。

---

**下一步**：检查完 checklist.md + tasks.yaml → 回答 Q1-Q5 → 执行 `/run-tasks` 或手动接 `/design`
