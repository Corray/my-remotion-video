# chenrui · workspace journal

---
## 2026-04-22 — ScaldCare 暖化改造

### 做了什么
- 给 `Nurse` 角色新增 `mood` 属性（warm/caring/concerned/cheer/urgent），眉毛+嘴型+腮红+手臂摆动随情绪变化
- 给 `Nurse` 新增 `hearts` 漂浮爱心装饰，`bubbleDelay` 可配置气泡弹出时机
- 把小护士从原来只在 SectionTitle + Outro 出现，扩展到 Intro / CauseGrid / DegreeCard / WrongDetail / WhyCool / Step / BlisterCare / SpecialCase / Recovery 全部内容场景
- 每个场景根据情绪选择不同 mood 和个性化口语气泡（"别怕 我带你学"、"先冲！别犹豫"、"慢慢会好的" 等）
- 把标题文案从生硬书面（"第 一 步 / 重 要 提 醒 / 正 确 的"）改成口语陪伴感（"咱先来 / 说点真心话 / 划重点啦"）
- Intro / Recovery / Outro 加 `hearts` 心形漂浮装饰

### 文件变更
- src/Nurse.tsx（扩展 mood/hearts/bubbleDelay）
- src/Main.tsx（所有 DegreeCard/WrongDetail/Step/SpecialCase 配置加 nurseSpeech + nurseMood，SectionTitle 文案软化）
- src/scenes/Intro.tsx / CauseGrid.tsx / DegreeCard.tsx / WrongDetail.tsx / WhyCool.tsx / Step.tsx / BlisterCare.tsx / SpecialCase.tsx / Recovery.tsx（新增 Nurse 嵌入 + 文案软化）
- src/scenes/SectionTitle.tsx / Outro.tsx（支持 mood / hearts）

### 验证
- tsc 本次改动 0 新增错误（仅有基线预存在的 YoungCyclist.tsx 错误）
- remotion bundle 成功
- 单帧渲染 Intro/CauseGrid/DegreeCard/WrongDetail/Step/Recovery/Outro/SectionTitle 视觉全部正常

### 遗留
- YoungCyclist.tsx 的 TS 错误是基线旧问题，和此次任务无关；如后续要打包 HelloWorld composition 需要修
