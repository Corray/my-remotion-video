# 2026-04-jntm · Checklist

Sprint：2026-04-jntm
设计：[jntm.md](../../design/jntm.md)
共识：[iterate-consensus.md](./iterate-consensus.md)
Commit：`b7e91a7`

---

## T001 · 主 composition 骨架

- [x] 创建 `src/JiNiTaiMei.tsx`
- [x] 导出 `JiNiTaiMei: React.FC`
- [x] 导出 `JINITAIMEI_DURATION_IN_FRAMES`，值严格为 **1800**
- [x] 使用 `<Series>` 串联 10 个 `<Series.Sequence>`
- [x] 10 个子 duration 之和 = 1800

## T002 · 10 个场景文件

- [x] `src/scenes/jntm/JntmOpening.tsx`（90 帧）
- [x] `src/scenes/jntm/JntmTitle.tsx`（120 帧）
- [x] `src/scenes/jntm/JntmSing.tsx`（180 帧）
- [x] `src/scenes/jntm/JntmDance.tsx`（240 帧）
- [x] `src/scenes/jntm/JntmRap.tsx`（180 帧）
- [x] `src/scenes/jntm/JntmBasketball.tsx`（240 帧）
- [x] `src/scenes/jntm/JntmChicken.tsx`（210 帧）
- [x] `src/scenes/jntm/JntmBattle.tsx`（240 帧）
- [x] `src/scenes/jntm/JntmBaby.tsx`（180 帧）
- [x] `src/scenes/jntm/JntmOutro.tsx`（120 帧）
- [x] 每个文件默认导出 `JntmXxx: React.FC`
- [x] 每个场景以 `AbsoluteFill` 为根

## T003 · Root.tsx 注册

- [x] 在 `src/Root.tsx` 添加 `import {JiNiTaiMei, JINITAIMEI_DURATION_IN_FRAMES} from './JiNiTaiMei'`
- [x] 新增 `<Composition id="JiNiTaiMei" ... />` 条目，参数符合设计契约
- [x] 既有 `ScaldCare` 和 `HelloWorld` 两条 composition 保留未改

## T004 · 纯函数 / 确定性渲染

- [x] 所有新场景不使用 `useState` / `useEffect`
- [x] 所有新场景不使用 `setTimeout` / `setInterval` / `Date.now()` / `Math.random()`
- [x] 动画完全由 `useCurrentFrame()` 驱动

## T005 · Lint

- [x] `npm run lint` 在新增 11 个文件上零 error 零 warning
- [x] 既有 `YoungCyclist.tsx` 的历史告警未被新增代码触发

## T006 · 回滚可行性

- [x] 本次改动集中在一个 commit（`b7e91a7`），`git revert b7e91a7` 即可完整移除

---

**完成度**：T001-T006 全部勾选（6/6）
