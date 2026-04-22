# 《只因你太美》1 分钟致敬视频 · 设计契约

## 背景

基于既有 Remotion 工程（`my-remotion-video`）新增一个独立 composition，致敬"唱跳rap篮球"网络梗，时长 1 分钟，不改动现有 `ScaldCare` / `HelloWorld` 两个 composition。

## 目标

- 新增 composition `JiNiTaiMei`，时长 1800 帧（60 秒 @ 30fps），分辨率 1080×1920（竖屏）
- 视频由 10 个自包含场景串联，每个场景独立文件，互不耦合
- 不引入新的运行时依赖（仅使用 `remotion` 已有 API：AbsoluteFill / Series / interpolate / spring / useCurrentFrame / useVideoConfig）
- 通过项目既有 `npm run lint` 验证（新增文件零 error 零 warning）
- 不破坏既有 composition 的可编辑性

## 非目标

- 不配音频（BGM）——用户未提供素材
- 不使用真人形象 / 未授权图片（仅 Unicode emoji）
- 不修改现有 `ScaldCare` / `YoungCyclist` 的任何行为

## 技术契约

### Composition 注册（src/Root.tsx）

```tsx
<Composition
  id="JiNiTaiMei"
  component={JiNiTaiMei}
  durationInFrames={JINITAIMEI_DURATION_IN_FRAMES}
  fps={30}
  width={1080}
  height={1920}
/>
```

- `id` 必须严格为 `"JiNiTaiMei"`（Remotion Studio 侧边栏和 CLI 渲染命令依赖）
- `fps` 必须是 30
- `width × height` 必须是 `1080 × 1920`
- `durationInFrames` 必须从 `./JiNiTaiMei` 导出的 `JINITAIMEI_DURATION_IN_FRAMES` 常量引用
- 既有 `ScaldCare` / `HelloWorld` 两条 `<Composition>` 不得改变

### 主 composition（src/JiNiTaiMei.tsx）

- 导出 `JiNiTaiMei: React.FC`
- 导出 `JINITAIMEI_DURATION_IN_FRAMES: number`，值 = 1800（严格等）
- 使用 `<Series>` + `<Series.Sequence durationInFrames={...}>` 串联 10 个场景
- 场景顺序及各自帧长：

| 顺序 | 场景 | 帧 |
|------|------|----|
| 1 | JntmOpening | 90 |
| 2 | JntmTitle | 120 |
| 3 | JntmSing | 180 |
| 4 | JntmDance | 240 |
| 5 | JntmRap | 180 |
| 6 | JntmBasketball | 240 |
| 7 | JntmChicken | 210 |
| 8 | JntmBattle | 240 |
| 9 | JntmBaby | 180 |
| 10 | JntmOutro | 120 |
| 合计 | | **1800** |

### 场景规范

所有场景位于 `src/scenes/jntm/JntmXxx.tsx`，每个文件：

- 默认导出 `JntmXxx: React.FC`
- 使用 `AbsoluteFill` 作为根节点（覆盖全画面）
- 动画完全由 `useCurrentFrame()` 驱动（纯函数，不引入外部时间源，避免 Remotion flickering 告警）
- 可使用 `spring` / `interpolate`，不使用 `useState` / `useEffect` / `setTimeout` / `Date.now()`

### 内容契约（10 个场景各自主题）

| 场景 | 核心元素 |
|------|---------|
| Opening | 三个 ? + "你干嘛～哎哟～" |
| Title | "只因你太美" 逐字弹出 + JI NI TAI MEI 副标题 |
| Sing | 🎤 + 音符 ♪♫ 上升 + "唱" 字 |
| Dance | 💃🕺 等舞者 emoji 跳动 + "跳" 字 |
| Rap | 🎙️ + 频谱条 + 歌词字幕 + "RAP" 字 |
| Basketball | 🏀 弹跳 + 🕺 + "篮球" 字 |
| Chicken | 🐔 登场 + "鸡！" 字 + 羽毛飘 |
| Battle | 分屏 坤坤 vs 鸡鸡 + "VS" |
| Baby | 多个 "Baby" 节奏爆闪 |
| Outro | "只因你太美 · The End" |

## 验收断言

见 `docs/tasks/2026-04-jntm/tasks.yaml`。核心断言：

1. `npm run lint` 在新增文件上零 error 零 warning（既有 `YoungCyclist.tsx` 告警不计入）
2. `src/Root.tsx` 注册了 `JiNiTaiMei` composition 且参数契合上表
3. `JINITAIMEI_DURATION_IN_FRAMES === 1800`
4. 10 个场景文件都存在且导出命名正确
5. `ScaldCare` / `HelloWorld` 两条既有 Composition 在 Root.tsx 中依然存在，未被改动

## 红线

- 不得在任何场景中使用 `useState` / `useEffect`
- 不得使用 `setTimeout` / `setInterval` / `Date.now()` / `Math.random()`（破坏确定性渲染）
- 不得引入未使用的 import
- 不得使用真人图像 / 带版权的素材
