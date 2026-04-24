# 2026-04-jntm · 迭代共识文档

> 回填：此任务原本走的是 `/impl` 小任务分支（未经 `/iterate`），为支持 `/adversarial-review` 事后回填共识与断言。

## 目标

在既有 Remotion 工程新增独立 composition `JiNiTaiMei`，呈现一个 60 秒的"致敬经典网络梗"视频。

## 范围

- **新增**：`src/JiNiTaiMei.tsx` + `src/scenes/jntm/Jntm{Opening,Title,Sing,Dance,Rap,Basketball,Chicken,Battle,Baby,Outro}.tsx`（共 11 个新文件）
- **修改**：`src/Root.tsx`（仅新增 `<Composition>` 声明，既有两条不动）
- **不涉及**：`src/Main.tsx`、`src/Nurse.tsx`、`src/scenes/` 下既有的烫伤急救场景、`src/YoungCyclist.tsx`

## 影响分析

| 维度 | 影响 |
|------|------|
| 既有 composition `ScaldCare` | **零影响**（独立 composition） |
| 既有 composition `HelloWorld` | **零影响**（独立 composition） |
| 运行时依赖 | 零新增（仅用 remotion 已有 API） |
| 打包产物 | 新增代码 ~1200 行，新增一个可渲染的 composition 条目 |
| Lint / TypeCheck | 新增文件自身零 warn 零 error；既有 `YoungCyclist.tsx` 的历史告警未受影响 |
| 回滚 | `git revert b7e91a7` 即可完全移除 |

## 关键决策

1. **为什么不复用既有场景组件？** 既有场景（DegreeCard / WrongDetail / Step 等）是"烫伤急救"业务语义，耦合了文案 Props；直接复用会让两个视频产生隐式耦合。用独立目录 `scenes/jntm/` 更清爽。
2. **为什么不抽公共基类？** 十个场景各自风格差异较大（频谱条 / 分屏 / 弹跳 / 飞行粒子），抽象会成为 premature abstraction——留作未来第三次新增视频时再做决定。
3. **为什么不加 Audio？** 用户没提供素材，强行配 `staticFile('bgm.mp3')` 会在 BGM 缺失时报错或播放既有烫伤视频的 BGM（语义错位）。
4. **为什么不用 `/iterate`？** 初次对话阶段 AI 判定小任务（blast radius = 2：Root.tsx + 新增目录；不影响既有 composition）——属于 `/impl` 小任务流程的合理范围。事后用户需要 `/adversarial-review`，故回填 tasks.yaml 补齐合同。

## 人工介入记录

- 初版 lint 出现 2 个未使用 import（`interpolate` in Dance/Rap），自愈一轮修复 → 无需人工
- Commit 前用户二次确认（"需要"），非阻断

## 已知遗留

- 没有配音频（BGM / 旁白）——若需增强，后续 `/impl "为 JiNiTaiMei 配一段 15 秒循环 BGM"` 一句话即可
- 没有为这个 composition 定义 `defaultProps` / Zod schema，因为它无 props
