# 详细设计 · studio-chat 后端

**Sprint**：`2026-04-studio-chat`
**范围**：后端任务 T001-T008（共 8 个）
**生成日期**：2026-04-23
**基础文档**：[`iterate-consensus.md`](../tasks/2026-04-studio-chat/iterate-consensus.md)
**栈**：Node.js + TypeScript 5.9 + Express 5 + @anthropic-ai/sdk + openai

---

## 0. 约定

- 所有新类型放在 `server/types.ts`（共享）和 `server/providers/types.ts`（provider 专用）
- 所有时间戳用 `number`（ms epoch），不要引入 Date 对象
- TypeScript 严禁 `any`（已有 red-line）
- 第三方 SDK 调用一律经 `providers/` 适配层，Express 路由不直接调 SDK
- 所有新错误用 Error 子类或 message 前缀 `[studio-chat] ...`，不用 error code 数字
- API 路径保持现有惯例 `/api/*`（不加 v1；整项目后续可专项治理）

---

## 1. 事件协议（T001 核心）

### 1.1 StudioEvent 联合类型

**原则**：
- 每个事件带 `type`、`ts`（毫秒）和可选 `turn`（属于哪一轮对话，从 0 开始）
- 前端 UI 渲染只读 `type + payload`，不做推断
- 事件顺序 = emit 顺序 = SSE 推送顺序 = events 数组顺序（用 index 做 id）

```ts
// server/types.ts

type EventBase = {ts: number; turn: number};

export type StudioEvent =
  // 轮次生命周期
  | (EventBase & {type: 'started'})                   // 新一轮开始
  | (EventBase & {type: 'done'; meta: CompositionMeta; summary: string})
  | (EventBase & {type: 'cancelled'; by: 'user'})
  | (EventBase & {type: 'error'; stage: ErrorStage; message: string})

  // LLM 流式内容（simplified view，不是所有 provider 都发全）
  | (EventBase & {type: 'thinking'; delta: string})   // Claude thinking channel
  | (EventBase & {type: 'token'; delta: string})      // text outside tool call
  | (EventBase & {type: 'tool_call_start'; name: string})
  | (EventBase & {type: 'tool_args_delta'; delta: string})
  | (EventBase & {type: 'tool_call_done'})

  // 验证与重试
  | (EventBase & {type: 'compile_check'; ok: boolean; errors?: string[]})
  | (EventBase & {type: 'retry'; attempt: number; reason: string})

  // 磁盘产物
  | (EventBase & {type: 'tsx_written'; path: string})

  // 用户输入回显
  | (EventBase & {type: 'user_feedback'; content: string});

export type ErrorStage = 'provider' | 'compile' | 'filesystem' | 'internal';
```

### 1.2 事件去重 / 幂等

- 事件由 `JobController` 单一线程产生，不会并发重复
- SSE 重连后按 `Last-Event-ID`（= event index）回放，不新增事件
- 同一 turn 内的 token delta 可能有 100-1000 条，前端自行拼接

### 1.3 环形缓冲

- `Job.events` 上限 **500 条**；超出后从头部弹出
- 一轮典型生成约 50-200 事件；500 够容纳 2-5 轮历史
- 超出后 SSE `?since=<n>` 若 `n` 已被弹出，返回 **410 Gone** + 一条 hint 事件，前端提示"历史已丢失，请重新订阅"
- 无持久化（服务重启丢失）— 与现有 Jobs 存储一致

---

## 2. ConversationTurn（T001 + T002）

### 2.1 类型

```ts
// server/types.ts

export type ConversationRole = 'user' | 'assistant';

export type ConversationTurn = {
  role: ConversationRole;
  content: string;             // user: 场景描述 / 反馈原文
                               // assistant: summary（LLM 返回的一句话）
  tsxPath?: string;            // assistant only: 这轮产物的相对路径
  ts: number;
};
```

### 2.2 首轮 vs 后续轮

| 轮次 | user.content | assistant.content |
|------|--------------|-------------------|
| turn=0（首次） | 原 scene 描述 | LLM 返回的 summary |
| turn=1..N（反馈） | 反馈文本 | LLM 返回的 summary |

### 2.3 组装 provider 消息（buildConversation）

```ts
// server/providers/prompts.ts — T002
export function buildConversation(
  input: GenerateInput,
  history: ConversationTurn[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // 首轮
  const firstUser = history.find(t => t.role === 'user');
  messages.push({role: 'user', content: buildUserMessage({...input, ...firstUser})});

  // 后续轮
  for (let i = 1; i < history.length; i++) {
    const t = history[i];
    if (t.role === 'assistant') {
      // 让模型看到"上次产出"——用 summary + 上次 tsx 的文件引用
      messages.push({role: 'assistant', content: `已生成视频：${t.content}（文件路径 ${t.tsxPath}）`});
    } else {
      // 用户反馈
      messages.push({role: 'user', content: buildFeedbackMessage(t.content)});
    }
  }
  return messages;
}

function buildFeedbackMessage(feedback: string): string {
  return `用户对上一次生成提出反馈，请基于【已有代码】作局部修改，不要完全重写：

${feedback}

请调用 emit_composition 工具返回修改后的完整 tsx。metadata.id 不变。`;
}
```

### 2.4 截断策略（Q5 默认：首轮 + 最近 2 轮）

超过 **12k tokens 估算**（粗略：中文字符 ÷ 2 + 英文字符 ÷ 4 = token 数）时截断：
- 保留：首轮 user + 最近 2 轮完整对（user+assistant 各一条）
- 丢弃：中间轮次
- 丢弃后插入一条系统级提示："（中间 N 轮对话已省略，保留了首轮需求和最近的反馈）"

实现位置：`providers/prompts.ts` 的 `buildConversation` 内部。

### 2.5 `Job.turn` 字段

- 起始值 0
- 每次 `feedback()` 调用递增 1
- 不回退（即使 cancel 也不会减）

---

## 3. Job 状态机（T001 + T005）

### 3.1 状态定义

| 状态 | 含义 | 入口 | 出口 |
|------|------|------|------|
| `generating` | LLM 调用进行中 | `start()` / `feedback()` | `done` / `compile_check.ok=false&超重试` / `cancel()` |
| `ready` | LLM 完成，tsx 已写入 | `done` 事件 | `rendering`（外部）/ `feedback()` |
| `cancelled` | 用户中断 | `cancel()` 期间 | `generating`（feedback 触发）/ 终态 |
| `rendering` | 渲染 mp4（不变） | POST `/render` | `rendered` / `error` |
| `rendered` | mp4 已就绪 | 渲染完成 | `generating`（feedback 再来一轮） |
| `error` | 致命失败 | 任何阶段的不可恢复错误 | `generating`（手动重试靠 feedback） |

### 3.2 转换表

```
   POST /jobs
       ↓
   generating ─── done ───→ ready ─── POST /render ───→ rendering ─→ rendered
       │                     │                             │             │
       │                     ├── feedback ─→ generating    │             ├── feedback ─→ generating
       │                     │                             │             │
       │ cancel              │ cancel                      │ error       │
       ↓                     ↓                             ↓             │
   cancelled            cancelled                        error           │
       │                     │                             │             │
       └─── feedback ────────┴── feedback ─→ generating ───┘             │
                                                                         │
       error                                                             │
       ↓                                                                 │
   error ────────────── feedback ─→ generating ──────────────────────────┘
```

### 3.3 不允许的转换

- `rendering` 中禁止 cancel（本 sprint 明确排除，见 iterate-consensus 1.2）
- `rendering` 中 feedback 返回 409 Conflict
- 任意状态的 POST `/render` 在状态 ≠ `ready` / `rendered` / `error` 时返回 400

---

## 4. JobController（T005 核心）

### 4.1 职责

- 持有单个 job 的运行时状态（conversation、events、AbortController、事件发射器）
- 暴露 `start()` / `cancel()` / `feedback()` 给路由层调用
- 事件发射：调用 `appendEvent()` 追加到 Job + 通知订阅者

### 4.2 API

```ts
// server/generator.ts — T005

export class JobController {
  readonly jobId: string;
  private controller: AbortController | null = null;  // 当前轮
  private listeners = new Set<(ev: StudioEvent) => void>();
  private running = false;

  constructor(jobId: string, private modelId: string) {}

  /** 首轮或反馈轮开始（返回立即，后台跑） */
  start(turn: number): void {
    if (this.running) throw new Error('already running');
    this.controller = new AbortController();
    this.running = true;
    this.#runLoop(turn).catch(err => {
      this.#emit({type: 'error', stage: 'internal', message: String(err), ts: Date.now(), turn});
    });
  }

  /** 幂等中断；若未在跑，no-op */
  cancel(): void {
    if (!this.running) return;
    this.controller?.abort();
    // 'cancelled' 事件在 #runLoop 的 catch 里 emit
  }

  /** 用户反馈；先中断再开新轮 */
  async feedback(content: string): Promise<void> {
    if (this.running) {
      this.cancel();
      await this.#waitForStop();
    }
    const job = getJob(this.jobId)!;
    const turn = job.turn + 1;
    updateJob(this.jobId, {turn, conversation: [
      ...job.conversation,
      {role: 'user', content, ts: Date.now()},
    ]});
    this.#emit({type: 'user_feedback', content, turn, ts: Date.now()});
    this.start(turn);
  }

  subscribe(fn: (ev: StudioEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private async #runLoop(turn: number): Promise<void> {
    this.#emit({type: 'started', turn, ts: Date.now()});

    const job = getJob(this.jobId)!;
    const provider = getProvider(this.modelId)!;

    const MAX_ATTEMPTS = 2;
    let previousError: string | undefined;
    let previousAttempt: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let tsxContent = '';
      let summary = '';
      let meta: CompositionMeta | undefined;

      try {
        // Provider streaming loop
        const iter = provider.adapter(provider.entry, {
          jobId: this.jobId,
          scene: job.scene,
          assets: job.assets,
          conversation: job.conversation,
          previousError,
          previousAttempt,
          signal: this.controller!.signal,
        });

        for await (const ev of iter) {
          if (this.controller!.signal.aborted) throw new AbortError();
          this.#emit({...ev, turn});
          if (ev.type === 'tool_call_done' && ev.result) {
            tsxContent = ev.result.tsxContent;
            summary = ev.result.summary;
            meta = ev.result.meta;
          }
        }
      } catch (err) {
        if (isAbortError(err)) {
          this.#emit({type: 'cancelled', by: 'user', turn, ts: Date.now()});
          updateJob(this.jobId, {status: 'cancelled'});
          this.running = false;
          return;
        }
        this.#emit({type: 'error', stage: 'provider', message: String(err), turn, ts: Date.now()});
        updateJob(this.jobId, {status: 'error', error: String(err)});
        this.running = false;
        return;
      }

      // 编译检查
      const errors = runChecks(tsxContent);
      this.#emit({type: 'compile_check', ok: !errors, errors, turn, ts: Date.now()});

      if (!errors) {
        // 写盘
        const tsxPath = await writeGeneratedComposition(this.jobId, tsxContent);
        invalidateBundle();
        this.#emit({type: 'tsx_written', path: tsxPath, turn, ts: Date.now()});

        // 对话入库
        updateJob(this.jobId, {
          status: 'ready',
          meta,
          summary,
          conversation: [
            ...getJob(this.jobId)!.conversation,
            {role: 'assistant', content: summary, tsxPath, ts: Date.now()},
          ],
        });

        this.#emit({type: 'done', meta: meta!, summary, turn, ts: Date.now()});
        this.running = false;
        return;
      }

      if (attempt === MAX_ATTEMPTS) {
        this.#emit({type: 'error', stage: 'compile', message: errors.join('\n'), turn, ts: Date.now()});
        updateJob(this.jobId, {status: 'error', error: errors.join('\n')});
        this.running = false;
        return;
      }

      this.#emit({type: 'retry', attempt: attempt + 1, reason: errors[0], turn, ts: Date.now()});
      previousError = errors.join('\n');
      previousAttempt = tsxContent;
    }
  }

  #emit(ev: StudioEvent): void {
    appendEvent(this.jobId, ev);
    for (const fn of this.listeners) fn(ev);
  }

  async #waitForStop(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (this.running && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 50));
    }
    if (this.running) throw new Error('cancel timeout');
  }
}

// 全局注册表
const controllers = new Map<string, JobController>();
export function getController(id: string): JobController | undefined { return controllers.get(id); }
export function registerController(c: JobController): void { controllers.set(c.jobId, c); }
export function disposeController(id: string): void { controllers.delete(id); }
```

### 4.3 生命周期

- **创建**：POST `/api/jobs` 时；`registerController(new JobController(id, modelId))` → `controller.start(0)`
- **反馈**：POST `/api/jobs/:id/feedback` 时；`controller.feedback(content)`
- **取消**：POST `/api/jobs/:id/cancel` 时；`controller.cancel()`
- **销毁**：job 进 terminal 终态（`error` 且无 feedback 迹象）后 5 分钟清理；或手动 DELETE `/api/jobs/:id`

### 4.4 并发约束

- 同一 jobId 同一时刻**最多一个** `#runLoop` 在跑（`running` flag 把关）
- `feedback()` 会 await 上一轮真正停下（检查 running=false）再开新轮，避免 controller 覆盖
- 不同 jobId 完全独立

---

## 5. Provider 适配器新签名（T003 + T004）

### 5.1 接口

```ts
// server/providers/types.ts

export type GenerateInput = {
  jobId: string;
  scene: string;
  assets: AssetInfo[];
  conversation: ConversationTurn[];   // 含本轮 user turn
  previousError?: string;             // 编译错误重试时携带
  previousAttempt?: string;
  signal: AbortSignal;                // 由 JobController 传入
};

/** Yield 的事件子集（subset of StudioEvent，不含 turn/ts，由 JobController 补齐） */
export type AdapterEvent =
  | {type: 'thinking'; delta: string}
  | {type: 'token'; delta: string}
  | {type: 'tool_call_start'; name: string}
  | {type: 'tool_args_delta'; delta: string}
  | {type: 'tool_call_done'; result?: {tsxContent: string; meta: CompositionMeta; summary: string}};

export type ProviderAdapter = (
  entry: ModelEntry,
  input: GenerateInput,
) => AsyncIterable<AdapterEvent>;
```

### 5.2 Anthropic 映射（T003）

```ts
// server/providers/anthropic.ts

export const anthropicAdapter: ProviderAdapter = async function* (entry, input) {
  const client = new Anthropic({apiKey: process.env[entry.envKey]});
  const stream = client.messages.stream({
    model: entry.model,
    max_tokens: 8000,
    system: [{type: 'text', text: SYSTEM_PROMPT, cache_control: {type: 'ephemeral'}}],
    tools: [TOOL_ANTHROPIC],
    tool_choice: {type: 'tool', name: TOOL_SCHEMA.name},
    messages: buildConversation(input, input.conversation),
  }, {signal: input.signal});

  let accumulatedArgs = '';

  for await (const ev of stream) {
    // ev.type 枚举见 Anthropic SDK types
    if (ev.type === 'content_block_start' && ev.content_block.type === 'tool_use') {
      yield {type: 'tool_call_start', name: ev.content_block.name};
    } else if (ev.type === 'content_block_delta') {
      if (ev.delta.type === 'text_delta') {
        yield {type: 'token', delta: ev.delta.text};
      } else if (ev.delta.type === 'input_json_delta') {
        accumulatedArgs += ev.delta.partial_json;
        yield {type: 'tool_args_delta', delta: ev.delta.partial_json};
      } else if (ev.delta.type === 'thinking_delta') {
        yield {type: 'thinking', delta: ev.delta.thinking};
      }
    } else if (ev.type === 'content_block_stop') {
      if (accumulatedArgs) {
        const parsed = JSON.parse(accumulatedArgs) as ToolArgs;
        yield {type: 'tool_call_done', result: {
          tsxContent: parsed.tsxContent,
          meta: {durationInFrames: parsed.durationInFrames, fps: parsed.fps, width: parsed.width, height: parsed.height},
          summary: parsed.summary,
        }};
        accumulatedArgs = '';
      }
    }
  }
};
```

**注意点**：
- Anthropic stream 会触发 AbortError 如果 signal 中断，直接向上冒泡即可
- `thinking_delta` 只在请求开启 extended thinking 时出现（本 sprint 不开启，保留类型但不会实际发）
- tool_use 只有一个，所以 `accumulatedArgs` 全局累积没问题

### 5.3 OpenAI-compat 映射 + MiniMax fallback（T004）

```ts
// server/providers/openai-compat.ts

export const openaiCompatAdapter: ProviderAdapter = async function* (entry, input) {
  const client = new OpenAI({apiKey: process.env[entry.envKey], baseURL: resolveBaseURL(entry.vendor)});

  const useStream = entry.vendor !== 'minimax' || canStreamMiniMax();

  if (!useStream) {
    // Fallback: 一次拿全量，伪装成 2 个大事件
    yield* runNonStreaming(client, entry, input);
    return;
  }

  try {
    const stream = await client.chat.completions.create({
      model: entry.model,
      stream: true,
      messages: buildConversation(input, input.conversation),
      tools: [TOOL_OPENAI],
      tool_choice: {type: 'function', function: {name: TOOL_SCHEMA.name}},
    }, {signal: input.signal});

    let toolCallStarted = false;
    let accumulatedArgs = '';

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (delta?.content) {
        yield {type: 'token', delta: delta.content};
      }

      const tc = delta?.tool_calls?.[0];
      if (tc) {
        if (!toolCallStarted && tc.function?.name) {
          toolCallStarted = true;
          yield {type: 'tool_call_start', name: tc.function.name};
        }
        if (tc.function?.arguments) {
          accumulatedArgs += tc.function.arguments;
          yield {type: 'tool_args_delta', delta: tc.function.arguments};
        }
      }

      if (choice.finish_reason === 'tool_calls') {
        const parsed = JSON.parse(accumulatedArgs) as ToolArgs;
        yield {type: 'tool_call_done', result: {
          tsxContent: parsed.tsxContent,
          meta: {durationInFrames: parsed.durationInFrames, fps: parsed.fps, width: parsed.width, height: parsed.height},
          summary: parsed.summary,
        }};
      }
    }
  } catch (err) {
    // MiniMax 兼容不良时 fallback
    if (entry.vendor === 'minimax' && isStreamIncompatibleError(err)) {
      markMiniMaxNoStream();
      yield* runNonStreaming(client, entry, input);
      return;
    }
    throw err;
  }
};

async function* runNonStreaming(client: OpenAI, entry: ModelEntry, input: GenerateInput): AsyncGenerator<AdapterEvent> {
  yield {type: 'tool_call_start', name: TOOL_SCHEMA.name};
  const response = await client.chat.completions.create({
    model: entry.model,
    messages: buildConversation(input, input.conversation),
    tools: [TOOL_OPENAI],
    tool_choice: {type: 'function', function: {name: TOOL_SCHEMA.name}},
  }, {signal: input.signal});
  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall) throw new Error('MiniMax fallback: 没有 tool_call');
  const parsed = JSON.parse(toolCall.function.arguments) as ToolArgs;
  yield {type: 'tool_args_delta', delta: toolCall.function.arguments};
  yield {type: 'tool_call_done', result: {
    tsxContent: parsed.tsxContent,
    meta: {durationInFrames: parsed.durationInFrames, fps: parsed.fps, width: parsed.width, height: parsed.height},
    summary: parsed.summary,
  }};
}

// 启发式：MiniMax 不兼容标志有几种 (400 invalid param / tools not supported / 连接挂起)
function isStreamIncompatibleError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  return /stream|tool.*(not|un)supported|invalid.*param/i.test(msg);
}

// 进程级记忆：避免每次都试 streaming 再 fallback
let miniMaxStreamFailed = false;
function canStreamMiniMax(): boolean { return !miniMaxStreamFailed; }
function markMiniMaxNoStream(): void { miniMaxStreamFailed = true; }
```

---

## 6. SSE 事件流（T006）

### 6.1 端点

```
GET /api/jobs/:id/events[?since=<n>]
```

- 404：job 不存在
- 410：`since` 指定的事件已被环形缓冲弹出
- 200：`text/event-stream` 长连接

### 6.2 Wire format

每条事件：
```
id: 42
event: studio
data: {"type":"token","delta":"...","turn":0,"ts":1714...}

```

说明：
- `id:` 是事件在 `Job.events[]` 中的 index（自然数）
- `event: studio` 统一事件类型名，客户端 `addEventListener('studio', ...)` 绑定
- `data:` 是 JSON 序列化的 StudioEvent
- 空行分隔

心跳：**每 15 秒**发一条注释行 `:heartbeat\n\n`，防代理/浏览器中间缓冲断连。

### 6.3 订阅逻辑

```ts
// server/routes/events.ts

router.get('/jobs/:id/events', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).end();

  const sinceRaw = req.query.since ?? req.header('Last-Event-ID');
  const since = sinceRaw ? parseInt(String(sinceRaw), 10) : 0;

  // 历史回放
  const firstAvailable = Math.max(0, job.events.length - EVENT_RING_CAP);
  if (since < firstAvailable) {
    return res.status(410).json({error: `事件 ${since} 已被缓冲弹出`, firstAvailable});
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',   // nginx 用
  });

  // 回放
  for (let i = since; i < job.events.length; i++) {
    writeEvent(res, i, job.events[i]);
  }

  // 活跃订阅（job 还在运行才有 controller）
  const controller = getController(job.id);
  let unsubscribe: (() => void) | null = null;
  if (controller) {
    const startIdx = job.events.length;
    unsubscribe = controller.subscribe(ev => {
      writeEvent(res, getJob(job.id)!.events.length - 1, ev);
    });
  }

  // 心跳
  const hb = setInterval(() => res.write(':heartbeat\n\n'), 15_000);

  req.on('close', () => {
    clearInterval(hb);
    unsubscribe?.();
  });
});

function writeEvent(res: Response, id: number, ev: StudioEvent): void {
  res.write(`id: ${id}\n`);
  res.write(`event: studio\n`);
  res.write(`data: ${JSON.stringify(ev)}\n\n`);
}
```

### 6.4 断线重连

客户端 `EventSource` 标准行为：
- 自动带 `Last-Event-ID` header
- 服务端用它定位 `since`
- 环形缓冲丢失的情况返回 410，客户端收到后应重建状态（重新查 `/api/jobs/:id` 拉最新 snapshot）

---

## 7. Cancel 路由（T007）

```ts
// server/routes/interact.ts
router.post('/jobs/:id/cancel', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({error: 'Job not found'});

  const controller = getController(job.id);
  if (!controller) {
    // 没有活跃 controller = 未在跑，幂等返回
    return res.json({ok: true, status: job.status});
  }
  controller.cancel();
  // 不等 cancel 完成；事件会在 SSE 里出现
  res.json({ok: true, status: 'cancelling'});
});
```

---

## 8. Feedback 路由（T008）

```ts
router.post('/jobs/:id/feedback', express.json(), async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({error: 'Job not found'});

  if (job.status === 'rendering') {
    return res.status(409).json({error: '渲染中不能反馈；先等渲染完成'});
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) return res.status(400).json({error: '缺少 content'});

  let controller = getController(job.id);
  if (!controller) {
    // 已被清理 → 重建（极少数情况）
    controller = new JobController(job.id, job.modelId!);
    registerController(controller);
  }

  res.status(202).json({ok: true, turn: job.turn + 1});

  // 异步启动新轮（内部处理 cancel 上一轮）
  controller.feedback(content).catch(err => {
    console.error('[studio-chat] feedback 失败:', err);
  });
});
```

---

## 9. 交互矩阵（cancel × feedback × 状态）

| 当前状态 | 收到 cancel | 收到 feedback | 收到 POST /render |
|---------|-----------|---------------|-----------------|
| generating | ✓ 打断；→ cancelled | ✓ 先 cancel 再新轮；→ generating (turn+1) | 400 |
| ready | no-op（200） | ✓ 新轮；→ generating (turn+1) | 200 → rendering |
| cancelled | no-op | ✓ 新轮；→ generating | 400 |
| rendering | 400（不支持） | 409 | 400（已在跑） |
| rendered | no-op | ✓ 新轮；→ generating | 200 → rendering (重渲染) |
| error | no-op | ✓ 重试；→ generating | 400 |

---

## 10. 错误分类

| stage | 触发 | 可恢复 | 用户该做什么 |
|-------|-----|-------|------------|
| `provider` | API key 无效、网络错误、rate limit、JSON 解析失败 | ⚠️ 部分可（重试 1 次内部） | 换模型 / 稍后反馈 |
| `compile` | 2 次都编译不过 | ❌ 此轮终止 | 反馈让它修 |
| `filesystem` | 磁盘写不了 tsx | ❌ | 检查磁盘权限 |
| `internal` | 未预期的 JS 错误 | ❌ | 看日志 |

错误事件必带 `stage + message`。前端根据 stage 显示不同 CTA。

---

## 11. 向后兼容

| 现有行为 | 变化 | 兼容性 |
|---------|-----|-------|
| POST `/api/jobs` | 响应 Job 多 `conversation`/`events`/`turn` 字段 | ✓ 加字段不破坏 |
| GET `/api/jobs/:id` | 响应多字段 | ✓ |
| GET `/api/jobs` | 列表里每个 Job 多字段 | ✓ |
| POST `/api/jobs/:id/render` | 行为不变 | ✓ |
| GET `/api/jobs/:id/download` | 行为不变 | ✓ |
| 生成完成判定 | 原：resolve promise；新：`done` 事件 + status=ready | ⚠️ 老客户端若靠轮询 status，仍然能用（ready 保留） |

---

## 12. 假设与待确认

iterate-consensus 里的 5 个 Q，本设计按以下默认展开：
- Q1 反馈不带素材 → `feedback` body 只 `{content}`
- Q2 scene 文本保留在表单 → 后端无关，前端负责
- Q3 MiniMax streaming 失败 fallback → §5.3 已实现（进程级记忆）
- Q4 默认"简洁"展示 → 后端不过滤，全量 emit；前端过滤
- Q5 截断策略：首 + 最近 2 轮 → §2.4 实现

如果 Q1-Q5 有变更，本设计需要同步更新。

---

## 13. 任务落地对照

| task | 主要修改 | 主要新增 |
|------|---------|---------|
| T001 | `server/types.ts`、`server/jobs.ts` | `StudioEvent`、`ConversationTurn`、`appendEvent` |
| T002 | `server/providers/prompts.ts` | `buildConversation`、`buildFeedbackMessage`、截断逻辑 |
| T003 | `server/providers/anthropic.ts` 重写 | AsyncIterable yield 模式 |
| T004 | `server/providers/openai-compat.ts` 重写 | streaming + MiniMax fallback 状态机 |
| T005 | `server/generator.ts` 重构 | `JobController` 类、controllers Map |
| T006 | `server/index.ts`（挂路由）、`server/types.ts`（heartbeat 常量） | `server/routes/events.ts` |
| T007 | — | `server/routes/interact.ts`（cancel 部分） |
| T008 | 上面同一文件 | feedback 部分 |

---

## 14. 不做的事（明确 scope out）

- 不做事件持久化到磁盘 / 数据库
- 不做多 conversation 历史版本管理（只保最新一版 tsx）
- 不做渲染期间的中断
- 不做 conversation 共享跨 job（每个 jobId 独立历史）
- 不做 token-level 费用统计（留给后续 sprint）
- 不做 WebSocket（SSE 足够）

---

**下一步建议**：
- 这份设计若有争议，改完再开工
- 否则开跑 `/run-tasks backend --sprint 2026-04-studio-chat`
