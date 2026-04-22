# My Remotion Video

基于 [Remotion](https://www.remotion.dev/) 的视频项目，使用 React + TypeScript + Tailwind CSS v4 构建。

## 环境要求

- **Node.js** ≥ 18（推荐 LTS 版本）
- **包管理器**：npm / pnpm / yarn / bun 任选其一
- **系统依赖**：Remotion 在首次渲染时会自动下载 Chrome Headless Shell，需保持网络畅通
  - macOS：无需额外安装
  - Linux：可能需要安装 Chrome 运行所需的系统库（参考 [Remotion 官方文档](https://www.remotion.dev/docs/miscellaneous/linux-dependencies)）
  - Windows：无需额外安装

## 技术栈

### 运行时依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| `remotion` | 4.0.438 | Remotion 核心库 |
| `@remotion/cli` | 4.0.438 | Remotion CLI 工具（提供 studio/bundle/render 命令） |
| `@remotion/zod-types` | 4.0.438 | Remotion 的 Zod 类型扩展（用于 Props schema） |
| `@remotion/tailwind-v4` | 4.0.438 | Remotion 的 Tailwind v4 集成 |
| `react` | 19.2.3 | React |
| `react-dom` | 19.2.3 | React DOM |
| `tailwindcss` | 4.0.0 | Tailwind CSS v4 |
| `zod` | 4.3.6 | Schema 校验 |

### 开发时依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| `typescript` | 5.9.3 | TypeScript |
| `@types/react` | 19.2.7 | React 类型定义 |
| `@types/web` | 0.0.166 | Web API 类型定义 |
| `eslint` | 9.19.0 | 代码检查 |
| `@remotion/eslint-config-flat` | 4.0.438 | Remotion 官方 ESLint 配置 |
| `prettier` | 3.8.1 | 代码格式化 |

## 安装

```bash
npm install
```

## 常用命令

**启动 Remotion Studio（预览 & 调试）**

```bash
npm run dev
```

启动后打开 http://localhost:3000 进行预览。

**打包（生成可部署的 bundle）**

```bash
npm run build
```

**渲染视频**

```bash
npx remotion render
```

渲染 MP4 到 `out/` 目录，也可指定 composition ID 与输出路径：

```bash
npx remotion render <composition-id> out/video.mp4
```

**代码检查**

```bash
npm run lint
```

会同时跑 ESLint 和 TypeScript 类型检查。

**升级 Remotion**

```bash
npm run upgrade
```

## 项目结构

```
src/
├── Root.tsx              # Remotion 入口，注册所有 Composition
├── Main.tsx              # 主 Composition
├── Nurse.tsx             # 子场景组件
├── YoungCyclist.tsx      # 子场景组件
└── scenes/               # 场景资源目录
```

## 相关文档

- [Remotion 基础教程](https://www.remotion.dev/docs/the-fundamentals)
- [Tailwind v4 集成](https://www.remotion.dev/docs/tailwind-v4)
- [渲染视频](https://www.remotion.dev/docs/render)

## License

部分场景下商用需要购买 Remotion 企业许可，详见 [Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
