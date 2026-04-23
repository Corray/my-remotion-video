# 迭代任务清单 · studio-chat · 流式交互终端

**基于**：`iterate-consensus.md`
**生成日期**：2026-04-23
**机器文件**：`./tasks.yaml`（/run-tasks 执行）

## 准备

- [ ] **T000** 引入测试基建（vitest + playwright）
  - 角色：test
  - 描述：安装 `vitest`、`@testing-library/react`、`happy-dom`、`@playwright/test`；创建 `vitest.config.ts` 覆盖 server/ + app/；创建 `playwright.config.ts`；`package.json` 加 `test` 和 `test:e2e` 两个 script；跑一个空壳冒烟用例确保基建就绪
  - 验证摘要：`npm test` 和 `npm run test:e2e` 都能绿；详见 `tasks.yaml#T000`

## 后端

- [ ] **T001** 事件协议 + Job 结构扩展
  - 角色：backend
  - 描述：在 `server/types.ts` 新增 `StudioEvent` 联合类型、`ConversationTurn` 类型；扩展 `Job` 加 `conversation`、`events`、`turn` 字段；`JobStatus` 加 `'cancelled'`；`server/jobs.ts` 加 `appendEvent(id, ev)` 辅助函数（环形缓冲 cap=500）
  - 验证摘要：文件含所有新类型，单测覆盖 appendEvent 环形逻辑；详见 `tasks.yaml#T001`

- [ ] **T002** prompts 多轮对话改造
  - 角色：backend
  - 描述：在 `server/providers/prompts.ts` 新增 `buildConversation(input, history)` 函数，输入 `ConversationTurn[]` 返回 OpenAI/Anthropic 的 messages 数组；system prompt 增加"后续反馈基于已有代码修改"的指令段；保留旧 `buildUserMessage` 作为首轮 helper
  - 验证摘要：单测覆盖首轮、单次反馈、多次反馈三种情况；详见 `tasks.yaml#T002`

- [ ] **T003** Anthropic streaming 适配器
  - 角色：backend
  - 描述：重写 `server/providers/anthropic.ts`，用 `client.messages.stream()` 替代；yield `StudioEvent`（`thinking` / `token` / `tool_call_start` / `tool_args_delta` / `tool_call_done`）；签名改为 `AsyncIterable`；用 Mock SDK 写单测
  - 验证摘要：Mock Anthropic SDK 的单测覆盖流式路径 + cancel 中途退出；详见 `tasks.yaml#T003`

- [ ] **T004** OpenAI-compat streaming 适配器
  - 角色：backend
  - 描述：重写 `server/providers/openai-compat.ts`，`stream: true`；累积 tool_call delta；三家共用；MiniMax fallback 到非流式（try/catch 后走一次 `create()`）
  - 验证摘要：Mock openai SDK 的单测覆盖 OpenAI 路径 + MiniMax fallback 路径；详见 `tasks.yaml#T004`

- [ ] **T005** JobController + generator 重构
  - 角色：backend
  - 描述：`server/generator.ts` 从函数改为 `JobController` 类：持有 AbortController、conversation 历史、事件 bus；暴露 `start()` / `cancel()` / `feedback(text)`；把编译检查 + 重试循环嵌入事件流（emit `compile_check` / `retry`）；全局 `Map<jobId, JobController>` 便于路由查找
  - 验证摘要：单测覆盖 start/cancel/feedback 三条路径 + 重试行为；详见 `tasks.yaml#T005`

- [ ] **T006** SSE 事件路由
  - 角色：backend
  - 描述：新建 `server/routes/events.ts`：`GET /api/jobs/:id/events`；支持 `?since=<n>` 和 `Last-Event-ID` 头做断线重连；每事件 `id: <index>\ndata: <json>\n\n`；job 活跃时订阅 JobController bus，job 已终结时只回放 events 历史
  - 验证摘要：启动 server 后用 curl 订阅模拟 job 的流并断言事件序列；详见 `tasks.yaml#T006`

- [ ] **T007** Cancel 路由
  - 角色：backend
  - 描述：新建 `server/routes/interact.ts`，`POST /api/jobs/:id/cancel`：查找 JobController → 调 `cancel()` → 更新 job.status；重复 cancel 也返回 ok；挂到 /api 路由下
  - 验证摘要：HTTP 断言 cancel 返回 200 + job 状态变 cancelled；详见 `tasks.yaml#T007`

- [ ] **T008** Feedback 路由
  - 角色：backend
  - 描述：同一 `interact.ts` 加 `POST /api/jobs/:id/feedback`；body `{content: string}`；行为：先 `cancel()` 当前轮（若在跑）→ 调 `feedback(content)` → turn++ → emit `user_feedback` 事件；返回 202
  - 验证摘要：HTTP 断言 feedback 触发新 turn 并产生新 tsx_written 事件；详见 `tasks.yaml#T008`

## 前端

- [ ] **T101** useJobEvents React hook
  - 角色：frontend
  - 描述：新建 `app/useJobEvents.ts`；封装 EventSource；参数 `jobId`、`enabled`；返回 `{events, status, connected}`；自动断线重连（指数 backoff）；unmount 关闭
  - 验证摘要：vitest + happy-dom 用 Mock EventSource 测挂载/事件累积/卸载关闭；详见 `tasks.yaml#T101`

- [ ] **T102** TerminalPanel 组件
  - 角色：frontend
  - 描述：新建 `app/TerminalPanel.tsx`；受控接收 `events: StudioEvent[]`；按事件类型渲染不同颜色/前缀（`>` 用户 / `✦` 助手 / `!` 编译错误 / `↻` 重试）；右上角「简洁/详细」切换；自动滚底；超过 200 条折叠最老的
  - 验证摘要：vitest 组件测试 + Playwright E2E 可视；详见 `tasks.yaml#T102`

- [ ] **T103** ChatInput 组件
  - 角色：frontend
  - 描述：新建 `app/ChatInput.tsx`；包含「中断」按钮（job.status === 'generating' 时可点）+ 反馈 textarea + 「发送」按钮（Cmd/Ctrl+Enter 快捷键）；未生成时禁用中断；反馈提交后清空 textarea
  - 验证摘要：vitest 组件测试 + Playwright E2E；详见 `tasks.yaml#T103`

- [ ] **T104** App.tsx 整合 + 重构
  - 角色：frontend
  - 描述：把右栏（现"预览/渲染"）重构：上半 Player（保留），下半 TerminalPanel + ChatInput；`useJobEvents(activeId)` 订阅；去掉现有"生成中..."spinner；Q2 默认：cancel 后保留 scene 文本
  - 验证摘要：Playwright E2E 完整跑通 生成→中断→反馈→再生成→渲染；详见 `tasks.yaml#T104`

## 测试

- [ ] **T201** Provider streaming 集成测试
  - 角色：test
  - 描述：写一个 Mock HTTP server 模拟 Anthropic 和 OpenAI 的 streaming 响应，跑通 JobController → adapter → 事件流的端到端；验证 cancel 在途中能真正终止连接
  - 验证摘要：`npm test -- providers.integration`；详见 `tasks.yaml#T201`

- [ ] **T202** SSE 回放 + 断线重连
  - 角色：test
  - 描述：启动真实 express，curl 订阅 /events 中途断开再用 `?since=N` 重连，断言事件无丢失无重复
  - 验证摘要：`npm test -- sse.e2e`；详见 `tasks.yaml#T202`

- [ ] **T203** 完整 UI E2E
  - 角色：test
  - 描述：Playwright 启动 `npm run studio`，打开 5173，用 Mock Anthropic key 全流程：输入 scene → 订阅 events → 看 TerminalPanel 出现事件 → 中断 → 发反馈 → 断言新轮事件 → 渲染 mp4 → 下载
  - 验证摘要：`npm run test:e2e`；详见 `tasks.yaml#T203`

## 产品确认（阻塞项）

- [ ] **Q1**：反馈是否支持上传新素材？（默认否，阻塞 T008 / T103）
- [ ] **Q2**：中断后表单保留/清空 scene 文本？（默认保留，阻塞 T104）
- [ ] **Q3**：MiniMax streaming 不兼容时 fallback 到非流式？（默认是，阻塞 T004）
- [ ] **Q4**：终端面板默认粒度（简洁 vs 详细）？（默认简洁，阻塞 T102）
- [ ] **Q5**：conversation 历史长度截断策略？（默认超限保留首+最新 2 轮，阻塞 T005）
