---
command: adversarial-review
developer: chenrui
created_at: 2026-04-22T10:30:39Z
project_path: /Users/chat/Desktop/test/my-remotion-video
project_name: my-remotion-video
severity: painful
status: open
---

# adversarial-review 命令反馈：缺 tasks.yaml 时硬失败，应支持 no-contract 降级模式

## 触发场景

当前项目刚完成一个小任务（`/impl` 直接分支生成了 commit `b7e91a7`，未经 `/iterate` 所以没有 `docs/tasks/{sprint}/tasks.yaml`），开发者希望用 `/adversarial-review` 做独立评估。

按 `adversarial-review.md` 现行规范：
- Step 2（最小化加载）把 `docs/tasks/{sprint}/tasks.yaml` 的 verify 断言列为**必读**
- Step 3（机械化执行断言）是"在打分之前，先**实际跑一遍** tasks.yaml 里的每条 verify"
- 任何断言失败直接 Reject

**没有 tasks.yaml 时，命令没有清晰的 fallback 行为**。当前只能事后手工回填一份 tasks.yaml 再跑（本 session 就是这样做的，见 commit `20ed624`）。

## 观察到的问题

**adversarial-review 对 tasks.yaml 存在硬依赖**，这和 `/impl` 小任务分支不生成 tasks.yaml 的设计（见另一条 impl.md 反馈 A 方案）形成系统性冲突：

- 两者任一改动，都无法单独修复"小任务也能被独立评估"的需求
- 即便 /impl 侧的 A 方案落地，**历史积累的 commit**（从未跑过 /iterate 也没补合同）仍不可评估
- 其他项目引入本 harness 时，如果本来就没走 /iterate 习惯，adversarial-review 在他们那里等同于不可用

**更深层的问题**：adversarial-review 现在把"合同存在"和"能评估"绑死了，但评估的核心价值（D 维度：识别走捷径）其实**不强依赖合同**——合同主要支撑的是 A 功能性和 C 设计契合度。B 代码质量和 D 原创性完全可以从 diff + red-lines 独立判断。

## 期望行为

**方案 B（adversarial-review 支持 no-contract 降级模式）**：

检测到 `docs/tasks/{sprint}/tasks.yaml` 缺失时，不 Reject，而是进入 **no-contract 模式**。

### Step 2（最小化加载）的修改

从"必读 tasks.yaml"改为"**尝试读 tasks.yaml**"：

```markdown
### Step 2：最小化加载

**必须加载**（存在性硬约束）：
1. `.claude/knowledge/red-lines.md`
2. 本次评估范围的代码 diff (`git diff {range}`)
3. 涉及文件当前内容（只读最新版）

**优先加载**（若存在则加载，进入带合同模式；否则进入 no-contract 模式）：
4. `docs/tasks/{sprint}/tasks.yaml` 的 verify 断言
5. `docs/design/{name}.md` / `docs/consensus/` 契约文档
6. `docs/tasks/{sprint}/iterate-consensus.md`

**模式判定**：
- 以上 4-6 全部存在 → **contract 模式**（现行行为）
- 仅 4 缺失 → **no-contract 模式**（见下）
- 仅 5/6 缺失 → **partial-contract 模式**（按 no-contract 的权重但不降权 A，因为 tasks.yaml 的 desc 仍能作判据）
```

### Step 3（断言执行）的修改

```markdown
### Step 3：机械化执行验证

**contract 模式**：跑 tasks.yaml 所有 verify（现行行为）。任何失败 → Reject。

**no-contract 模式**：
- 跳过机械断言
- **仍必须跑**：`.claude/knowledge/red-lines.md` 里能机械化的全局断言
  （项目应在 red-lines.md 标明哪些条目可机械验证，例如 `verify: "! grep -rn 'System.out.println' src/"`）
- 跑**通用质量门**作为最低断言：
  - `npm run lint` / `mvn verify` / 项目 `project.yaml.quality_gate` 声明的命令
  - 失败 → 直接 Reject（不进入主观评分）
```

### Step 4（四维度打分）的修改 —— **这是 B 方案的关键**

不同模式下**权重重新分配**（总分仍为 100）：

| 维度 | contract 模式（现行） | no-contract 模式（新增） | 理由 |
|------|-------------------|---------------------|------|
| A 功能性 | 30 | **20** (-10) | 无 desc 可比对，降权 |
| B 代码质量 | 25 | **30** (+5) | 代码内在质量可独立判断，加权 |
| C 设计契合度 | 25 | **10** (-15) | 无契约，大幅降权（但仍不为 0：可对比已有代码风格/分层） |
| D 原创性/避免捷径 | 20 | **40** (+20) | **无合同时 D 维度风险最大**，最该盯 |
| 总分 | 100 | 100 | |

**核心直觉**：合同是护栏，没有护栏时 Evaluator 的怀疑度要**加强**而不是削弱。D 维度翻倍是有意的——没有合同的情况下，"走捷径"最容易滑过去。

### Step 4 的追问条目在 no-contract 模式下需加强

追加到 D 维度的怀疑式追问：

```
- 没有合同时，开发者有没有悄悄缩小了任务范围？（对比 commit message vs 实际 diff）
- 边界条件是凭直觉实现的，还是真的想过？找出 2 个"未显式处理"的边界
- 如果让你给这次改动写 tasks.yaml，你能给出 ≥ 5 条 verify 吗？给不出，说明代码对"什么算完成"模糊
```

### Step 5（报告模板）的修改

**no-contract 模式下报告顶部强制标注**：

```markdown
# 对抗式评估报告（⚠️ no-contract mode）

> 本次评估未找到 `docs/tasks/{sprint}/tasks.yaml`，Evaluator 在无合同模式下运行。
> 评估结果置信度**低于**带合同模式，尤其是 A 功能性 / C 设计契合度两个维度。
> 强烈建议：下次开发时让 /impl 生成最小合同（参见 impl.md 反馈 A 方案），
> 或事后用 /iterate --retrofit 回填合同再跑一次。
```

### Step 7（metrics）的修改

追加模式字段：

```jsonl
{"time":"...","mode":"contract|no-contract|partial-contract","score":76,...,"weight_profile":"D40B30A20C10","quality_gate_passed":true}
```

`/dashboard` 应显示 no-contract 模式的评估占比——**这是一个反向指标**，占比越高说明 harness 在小任务这条路径上越不健康，团队应考虑推动方案 A 落地。

## 建议改动

**目标文件**：`.claude/commands/adversarial-review.md`

**修改点**（按 md 章节）：

1. **Step 2 "最小化加载"**：拆"必须"和"优先"两档；新增模式判定逻辑
2. **Step 3 "机械化执行断言"**：三种模式的分岔行为
3. **Step 4 "四维度对抗式评分"**：新增权重表（contract vs no-contract vs partial）
4. **Step 4 追问条目**：no-contract 模式的 D 维度追加 3 条加强追问
5. **Step 5 报告模板**：no-contract 顶部强制警示 + 置信度说明
6. **Step 7 metrics**：事件 schema 追加 `mode` / `weight_profile` / `quality_gate_passed`
7. **硬约束（红线）**：追加两条：
   - "no-contract 模式下 D 维度权重不得低于 35（防止 Evaluator 在无合同时懈怠）"
   - "任何模式下 red-lines.md 的可机械化条目必须实跑，不得跳过"
8. **整体流程图**：在单 Evaluator 流程图上标出 contract / no-contract 分支

## 相关上下文

- 本次 session 任务：为 my-remotion-video 项目新增 JiNiTaiMei composition（小任务路径）
- 相关 commit：`b7e91a7`（小任务实现）+ `20ed624`（事后回填合同）
- 反馈互相依赖：
  - 本反馈（B 方案）可以**独立落地**，但落地后**效果更强的场景是**配合 impl.md 反馈（A 方案）同时生效
  - 即便只做 B 不做 A，历史积累的 no-contract commit 也终于有了评估通道
- 相关文件路径：
  - `.claude/commands/adversarial-review.md` Step 2/3/4/5/7 + 硬约束章节

## 本地临时绕行

本次 session 选择了**方案 A 的手工版**：让 AI 事后回填 tasks.yaml（commit `20ed624`）再跑评估。
该回填的 tasks.yaml 可作为 A 方案模板参考；本反馈是 B 方案（adversarial-review 侧的降级），
两者配合能系统性修复"小任务 + 独立评估"这条路径。

没有在本地直接改 `.claude/commands/adversarial-review.md`，遵守 /command-feedback 
红线 ①（命令修改走模板仓库 PR 流程）。
