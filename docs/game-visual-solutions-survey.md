# 《拾词者 · 雾港》画面 / UI 现成方案调研

- 调研日期：2026-11-08
- 对象：`game/` 原型（PR #6，分支 `agent/game-code-scenes-441375a5a563`），线上 https://chehua11agent.github.io/superagent-test/game/
- 范围：GitHub 上可直接自托管 / 商用的开源引擎、UI 套件、图标与素材；不评估付费素材站、闭源引擎和美术外包。
- 本文只回答“有哪些现成方案、各自代价”，不替代设计决策。

## 0. 先给结论

1. **有现成方案，但没有一套能“一键换皮”同时解决“不直观”。** GitHub 上现成的是引擎、UI 组件和图标；真正缺的是与“雾港”暗色文学感一致的角色 / 卡面美术。
2. **不要为了画面全量换引擎。** 现有原型是零运行时依赖的 DOM + 程序化 SVG，带可访问性、25 个单元 / 内容测试和 10 个端到端用例；换 Phaser / WebGAL 等于重写交互层。
3. **推荐路线：A 原地游戏化 → B PixiJS 渲染层 → C 视觉小说引擎（暂不做）。**
   - A（1–3 天，不含美术外包）：保留现有界面，补图标、立绘 / 卡框、受击与伤害数字动效、音效。
   - B（1–2 周）：只在场景 / 战斗加一层 PixiJS canvas，文本和表单继续用 DOM。
   - C（2–4 周+）：换 WebGAL / Monogatari，剧情演出最“像游戏”，但卡牌战斗、SRS、词书都要重接。
4. **最快见效的三件事**：用 game-icons 统一图标；给战斗加“敌人立绘 + 卡牌打出 / 受击 / 伤害数字”；用 anime.js + howler.js 补动效与音效。
5. **长线（追加）**：现在这套没有硬内容上限；6 章 / 288 词 / 72 幕的文本数据不到 1 MB，GitHub Pages 的 1 GB 站点 / 100 GB 月流量远没到。真正的上限是编辑 / 资源 / 工程。不换引擎也能长线：内容数据化 + 构建 / 类型 + 资源管线 + 简易编辑器；要换且不想写代码，优先 GDevelop（事件表、HTML5、MIT），Godot 4 没有官方可视化脚本、Web 导出重。

## 1. 现状诊断：为什么“不直观”

基于线上首页与词卡战斗截图（PR #6 的 `docs/screenshots/after-home.png`、`after-battle.png`）：

| 现象 | 具体表现 | 影响 |
| --- | --- | --- |
| 场景里没有人 | 雾港是程序化 SVG 背景，战斗时只有一块半透明文字面板 | 玩家看不到“谁在打谁”，战斗像填表 |
| 卡牌只有字 | 手牌是“中文语义 + 效果”的文本框，没有卡面插画、类型 / 稀有度、打出动画 | “词卡战斗”缺少卡牌游戏的视觉语言 |
| 地图节点可读性弱 | 12 个镜头共用一个 SVG 世界，节点是数字圆点，和场景地标对应弱 | 玩家难以建立“我在哪、下一幕去哪”的空间感 |
| 镜头是静态的 | 12 幕用 SVG viewBox 切换镜头，有雾 / 雨 / 光束，但没有视差、粒子、转场 | 氛围有，动感弱 |
| 反馈偏文字 | 成功 / 失败主要靠颜色和文案，缺位移、缩放、伤害数字、音效 | 操作结果不够“打中” |
| 已有优势 | 统一的暗色视觉、排版、可访问性、离线单机、零运行时依赖 | 不应为“像游戏”全部推翻 |

> 注：“不直观”是设计判断，不是可用性测试结论；建议下一步找 3–5 人试玩验证，再决定 A 还是 B。

## 2. 三条路线

| 路线 | 做法 | 主要依赖 | 工作量 | 风险 | 适合 |
| --- | --- | --- | --- | --- | --- |
| A 原地游戏化 | 保留 DOM / SVG / CSS，补图标、立绘、卡框、动效、音效 | game-icons、Kenney、anime.js、howler.js | 1–3 天 | 素材风格不统一 | 想快速改善“不直观”，且不想动架构 |
| B 渲染层升级 | DOM 文本层 + PixiJS canvas 场景 / 战斗层 | PixiJS、@pixi/ui；或 Phaser | 1–2 周 | 双渲染坐标 / 响应式、包体增加 | 想要真正的角色 / 粒子 / 卡牌动效 |
| C 换叙事引擎 | 用 VN 引擎重做剧情层 | WebGAL 或 Monogatari | 2–4 周+ | 推翻现有交互 / 测试；战斗要重写 | 决定“剧情演出优先于卡牌玩法” |

## 3. 候选清单

### 3.1 2D 引擎 / 渲染器

| 项目 | Stars | 许可证 | 最近更新 | 提供什么 | 对本项目的判断 |
| --- | ---: | --- | --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs) | 48.7k | MIT | 2026-11 | WebGL / WebGPU 2D 渲染器；不管游戏逻辑 | **B 路线首选**：只替换渲染层，现有状态 / 路由 / DOM 可保留 |
| [Phaser](https://github.com/phaserjs/phaser) | 40.7k | MIT | 2026-08（v4.2.1） | 完整 2D 框架：场景、精灵、补间、输入、物理、音频 | 功能最全；对本项目偏重，等于重写界面 |
| [KAPLAY](https://github.com/kaplayjs/kaplay) | 1.8k | MIT | 2026-11 | 轻量 JS 游戏库，API 简单，内置场景 / UI | 适合 1–2 天做玩法 demo；长期复杂 UI 生态不足 |
| [Excalibur](https://github.com/excaliburjs/Excalibur) | 2.4k | BSD-2 | 2026-11 | TypeScript 2D 引擎 | 可用；社区和示例少于 Phaser |
| [LittleJS](https://github.com/KilledByAPixel/LittleJS) | 4.4k | MIT | 2026-11 | 极小 2D / 3D 引擎，无依赖 | 包体小；UI / 无障碍要自己补 |
| [melonJS](https://github.com/melonjs/melonJS) | 6.4k | MIT | 2026-11 | 完整 2D / 3D 引擎，WebGL / WebGPU | 功能全；社区小于 Phaser |

> 以上都是纯前端、可静态托管到 GitHub Pages 的库；引入后仍是静态站点，只是多一个 vendor 文件或 CDN 依赖，不需要后端。

### 3.2 游戏 UI 套件 / 组件

| 项目 | Stars | 许可证 | 最近更新 | 提供什么 | 对本项目的判断 |
| --- | ---: | --- | --- | --- | --- |
| [RPGUI](https://github.com/RonenNess/RPGUI) | 960 | zlib | 2023-10 | 老派 RPG 窗口 / 按钮 / 滑条 / 进度条，纯 CSS | 像素风与雾港气质冲突；**建议只借九宫格边框做法，不整体换皮** |
| [NES.css](https://github.com/nostalgic-css/NES.css) | 21.9k | MIT | 2024-01 | 8-bit 红白机风 CSS | 同上；适合彩蛋 / 小游戏，不适合主界面 |
| [98.css](https://github.com/jdan/98.css) | 11.6k | MIT | 2025-09 | Windows 98 风 CSS | 与本项目视觉无关 |
| [@pixi/ui](https://github.com/pixijs/ui) | 326 | MIT | 2026-10 | PixiJS 的按钮 / 滑条 / 滚动 / 布局组件 | 走 B 路线时配套使用 |

> 风格参考（**不可直接采用**）：[enotsixlm/game-ui-kits](https://github.com/enotsixlm/game-ui-kits)（9★，2026-07，**无许可证**）提供暗黑哥特 / 赛博 / 马力欧 / iOS / 像素五套单文件 HTML+CSS，其中暗黑哥特最接近雾港气质，demo 可看：https://enotsixlm.github.io/game-ui-kits/ 。它没有许可证，默认保留所有权利，只能看效果，不能复制进产品。

> 结论：**没有一套现成 CSS 皮肤能直接匹配“雾港”的暗色文学感。** 现有 `styles.css` 已经是定制设计系统，盲目套 RPGUI / NES.css 会降低质感；UI 层更值得做的是“游戏化组件”（卡框、状态条、伤害数字、按钮反馈），而不是换主题。

### 3.3 现成美术素材

| 来源 | 许可证 | 内容 | 对本项目的判断 |
| --- | --- | --- | --- |
| [game-icons/icons](https://github.com/game-icons/icons) | CC BY 3.0（需署名） | 4,000+ 单色 SVG 图标 | **最推荐**：词卡 / 技能 / 状态图标；单色可改色，但和现有线性图标混用前要先统一描边 / 实心风格 |
| [Kenney](https://kenney.nl/assets) | CC0 | UI Pack、Particle Pack、Audio、角色 / 场景素材 | 免费可商用；UI / 粒子 / 音效很适合，**角色偏干净卡通，和暗黑港口不搭** |
| [OpenGameArt](https://opengameart.org/) | 逐项（CC0 / CC BY / CC BY-SA） | 暗黑幻想 UI、角色、背景 | 有合适素材，但质量参差，需逐项核对许可证 |
| [itch.io 免费素材](https://itch.io/game-assets/free) | 逐项 | 暗黑风角色 / 背景 / UI | 选择多，许可证要逐个看；部分仅限非商用 |

> 说明：GitHub 原生托管的美术素材很少。上表只有 game-icons 是 GitHub 仓库；Kenney 是 CC0，可以直接把需要的文件 vendor 进仓库（保留 LICENSE / 致谢）。**暗黑港口的角色立绘没有现成的“即插即用”包**，要么用剪影 / 现有 SVG 延展，要么从 OpenGameArt / itch.io 选一套风格统一的素材，或走 AI 生成 / 外包（不在本次 GitHub 调研范围）。

### 3.4 视觉小说引擎（路线 C）

| 项目 | Stars | 许可证 | 最近更新 | 提供什么 | 对本项目的判断 |
| --- | ---: | --- | --- | --- | --- |
| [WebGAL](https://github.com/OpenWebGAL/WebGAL) | 4.0k | MPL-2.0 | 2026-10 | 网页端 VN 引擎 + 可视化编辑器；立绘 / 背景 / 对话 / 选项 / 存读档 / 自动 / 回想 | 剧情演出最现成；卡牌战斗、SRS、词书要作为自定义逻辑重写 |
| [Monogatari](https://github.com/Monogatari/Monogatari) | 895 | MIT | 2026-06 | 纯 JS 网页 VN 引擎，组件 / 动作 / 存档 | 比 WebGAL 轻，生态小；同样要重接战斗 |
| [Ren'Py](https://github.com/renpy/renpy) | 7.0k | MIT | 2026-11 | 成熟 VN 引擎，可导出 Web | Python 技术栈、Web 包体通常较大，与现有 JS 项目割裂 |

### 3.5 动效 / 音频补强

| 项目 | Stars | 许可证 | 最近更新 | 用途 |
| --- | ---: | --- | --- | --- |
| [anime.js](https://github.com/juliangarnier/anime) | 74.4k | MIT | 2026-11 | 卡牌打出、受击、HP 变化、页面转场 |
| [howler.js](https://github.com/goldfire/howler.js) | 25.4k | MIT | 2025-11 | 点击 / 成功 / 失败 / 环境音 |

## 4. 推荐落地顺序

### A. 原地游戏化（先做，1–3 天）

- [ ] 用 game-icons 补 / 换 `game/src/ui.js` 的图标（保留现有 20 个内联图标作为后备），在设置 / 关于页加 CC BY 署名。
- [ ] 战斗界面加“敌人 / 守望者立绘”（先用剪影或 CC0 素材）+ 卡牌九宫格框 + 打出 / 受击 / 伤害数字动效（anime.js）。
- [ ] 用 howler.js 加 3 个音效：点击、检定成功、检定失败。
- [ ] 首页 / 章节地图给现有 SVG 加 2–3 层视差（CSS transform 或 anime.js），给节点补地名标签、当前节点脉冲、已走过路径。
- [ ] 验收：同一场景 Before / After 截图；移动端无横向溢出；`prefers-reduced-motion` 下动效降级。

### B. PixiJS 渲染层（A 之后仍觉得“不像游戏”再做，1–2 周）

- 只在“雾港场景 + 词卡战斗”加一层 PixiJS canvas：角色立绘、雾 / 雨粒子、卡牌飞行、伤害数字。
- 文本、按钮、表单继续用 DOM；`@pixi/ui` 只用于 canvas 内的少量控件。
- 先做一个战斗场景 vertical slice，再扩到 12 幕；不要一次性重写全部界面。
- 代价：包体增加（gzip 前约几百 KB）；需要处理 canvas 与 DOM 的响应式坐标；测试要补 canvas 快照 / 交互用例。

### C. 视觉小说引擎（暂不做）

- 换 WebGAL / Monogatari 等于重写交互层：现有 25 个单元 / 内容测试、10 个 E2E、可访问性、离线单机、词书 / SRS 全部要重做。
- 只有在决定“剧情演出优先于卡牌玩法”时才值得；否则投入产出比低于 A / B。

## 5. 许可证红线

- **MIT / BSD / zlib / MPL-2.0**：可商用。MPL-2.0 是文件级 copyleft：修改 WebGAL 的源文件后，该文件需按 MPL 开源。
- **CC0**：无署名义务（Kenney）。
- **CC BY 3.0**：必须署名（game-icons）。建议在“关于 / 致谢”写：`Icons made by {作者}. Available on https://game-icons.net`。
- **CC BY-SA**：传染性，避免和闭源素材混用。
- **无许可证**（game-ui-kits）：默认保留所有权利，不要直接复制进产品。
- **itch.io / OpenGameArt**：逐个看 EULA；有些只允许非商用。

## 6. 参考链接

- 线上原型：https://chehua11agent.github.io/superagent-test/game/
- 现有实现：`game/src/art.js`（程序化 SVG）、`game/src/ui.js`（图标）、`game/styles.css`（视觉系统）
- RPGUI demo：https://ronenness.github.io/RPGUI/
- NES.css demo：https://nostalgic-css.github.io/NES.css/
- game-ui-kits demo：https://enotsixlm.github.io/game-ui-kits/
- WebGAL demo：https://demo.openwebgal.com/
- Monogatari：https://monogatari.io/
- game-icons：https://game-icons.net/
- Kenney：https://kenney.nl/assets
- PixiJS：https://pixijs.com/ ；@pixi/ui：https://pixijs.io/ui/
- Phaser examples：https://phaser.io/examples

## 7. 方法与限制

- Stars / 许可证 / 更新时间来自 GitHub API，2026-11-08 时点；之后会变化。
- 未实际接入任何引擎，未做性能 benchmark；工作量是原型级估算，不是排期承诺。
- 未评估付费素材、AI 生成美术和外包；这三条可能比“找现成素材”更适合暗黑港口，但不在本次 GitHub 调研范围。
- “不直观”的判断基于首页 / 战斗截图与代码结构，不是可用性测试；建议先做 3–5 人试玩再定 A / B。

## 8. 追加：长线引擎、Godot 与内容上限（2026-11-08 晚）

> 回答追加问题：“有没有更长远的引擎？我有 Godot 但不太会写。现在这个形式会有大小 / 内容上限吗？没有改引擎的方案吗？”

### 8.1 直接回答

- **有长线引擎，但“换引擎”和“内容变多”是两件事。** 现在这套没有硬内容上限；换引擎解决的是“编辑器 / 多平台 / 3D”，不是“装不下内容”。
- **不换引擎也有长线方案**：内容数据化 + 构建 / 类型 + 资源管线 + 简易编辑器；6 章 / 288 词够用。
- **Godot 你有，不代表要用。** Godot 4 官方移除了 3.x 的 VisualScript，官方脚本是 GDScript / C#，都要写代码；Web 导出要加载整个引擎 WASM，首屏明显比纯 HTML 重。对“不写代码”的人，GDevelop 的事件表更合适。
- **如果一定要换且不想写代码**：优先 **GDevelop**（可视化事件表、HTML5 导出、MIT 引擎）；剧情优先可看 **WebGAL**；Godot 留给“愿意学 GDScript + 要桌面 / 主机 / 3D”的场景。

### 8.2 现在这套会撞到内容上限吗？

| 维度 | 现状 | 边界 | 结论 |
| --- | --- | --- | --- |
| 文本 / 剧情数据 | `words.json` 24 KB + `chapter-1.json` 24 KB；12 幕 / 48 词 | 6 章 / 288 词 / 72 幕约 300–500 KB JSON | 远没到上限 |
| 渲染 | 单幕 SVG：78 星、18 条波浪、渐变 + CSS 动画 | 低端手机大量动画会掉帧；72 幕只渲染当前一幕 | 当前规模没问题；扩量要测低端机 |
| 资源 | 目前无图片 / 音频，全程序化 SVG | [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：站点 1 GB、月流量 100 GB（软限制）、单文件 100 MB | 图片 / 音频才是重量；压缩 + 懒加载 |
| 存档 | `localStorage` | 浏览器约 5 MB | 存档很小，够用；不能存资源 |
| 工程 | `main.js` 75 KB、`styles.css` 64 KB、`art.js` 13 KB；12 幕硬编码 | 单人维护会变困难 | **真正的“上限”在这里** |
| 服务端 | 纯静态、客户端权威 | 账号 / 同步 / 排行榜 / 异步挑战要后端 | 换引擎也解决不了 |

- GitHub Pages 的 1 GB / 100 GB 是软限制，超了可能被限速或要求迁走；文本游戏远没到，但大量未压缩音频 / 图片会先撞上。
- 结论：**6 章规模不需要换引擎**；需要的是把内容数据化、把工程 / 资源管线做起来。

### 8.3 不换引擎的长线方案（推荐）

- **内容数据化**：把 12 幕 / 镜头 / 节点从 `art.js`、`main.js` 抽到 JSON 或 TS 注册表；扩展现有 `scripts/validate*.mjs` 做 schema 校验。
- **构建 / 类型**：Vite + TypeScript（或 JSDoc 类型 + 原生 ESM），拆模块；输出仍是静态站点。
- **资源管线**：图片 WebP、音频 OGG、manifest + 预加载 / 懒加载；控制仓库与 Pages 体积。
- **简易编辑器**：本地 content editor（表单 / 预览 / 导出 JSON），让非程序员也能编内容；不引入引擎。
- 成本：约 1–2 周重构 + 持续工具；玩法、测试和现有视觉可保留。
- 适用：6 章 / 288 词、Web 优先、单人 / 小团队。

### 8.4 换引擎的长线选项

| 引擎 | 要写代码吗 | Web 导出 | 长线优势 | 坑 |
| --- | --- | --- | --- | --- |
| [GDevelop](https://github.com/4ian/GDevelop)（28.6k★，MIT 引擎，v5.6.287，2026-11） | 基本不用：事件表 + 行为；可插 JavaScript | HTML5 静态导出（`index.html`），可放 GitHub Pages / itch.io | 可视化编辑、2D/3D/多人、桌面/移动/Web；导出游戏可闭源 | 卡牌 / SRS 用事件表会臃肿；复杂逻辑仍要 JS；中文资料少 |
| [Godot](https://github.com/godotengine/godot)（119.8k★，MIT，4.7.2） | 要：GDScript / C#；4.x 无官方可视化脚本 | 可导出 Web，但引擎 WASM 重、首屏慢；多线程需 COOP/COEP（GitHub Pages 不能直接配），4.3+ 可单线程导出 | 2D/3D、桌面/移动/主机、成熟编辑器 | 对非程序员不友好；Web 是弱项 |
| [WebGAL](https://github.com/OpenWebGAL/WebGAL)（4.0k★，MPL-2.0） | 基本不用：可视化编辑器 / 脚本 | Web 原生 | 剧情 / 立绘 / 选项 / 存读档 / 回想 | 卡牌战斗 / SRS 要自己写 JS 或插件；不是通用引擎 |
| [Phaser](https://github.com/phaserjs/phaser) / [PixiJS](https://github.com/pixijs/pixijs) | 要 | Web 原生 | 留在 JS/Web、自主可控；PixiJS 可只做渲染层 | 没有编辑器；等于现在的路再加渲染层 |
| [Ren'Py](https://github.com/renpy/renpy)（7.0k★，MIT） | 要：Python | 可导出 Web，但包体大 | 成熟 VN 工作流 | 与现有 JS 栈割裂；卡牌要重写 |

- GDevelop 的 Web 导出是纯静态文件，GitHub Pages 可用；但多人 / 云存档仍要后端。
- Godot 4.3+ 的 single-threaded Web 导出可以避开 COOP/COEP，但性能略低；这是它在 GitHub Pages 上相对可行的路径。
- “不写代码”只对**编辑器内的常规逻辑**成立；卡牌战斗、SRS、存档迁移这类自定义系统，最终仍要写代码或写复杂事件表。

### 8.5 建议

1. **先不换引擎**：按 8.3 做数据化 + 构建 + 资源管线；这是 6 章规模投入产出比最高的方案。
2. **如果“必须可视化编辑 / 多平台”**：用 GDevelop 做 1 幕 + 1 场词卡战斗的 vertical slice（1–2 天），验证事件表能否承受 SRS / 卡牌逻辑；撑不住就回 Web。
3. **如果“剧情演出优先”**：WebGAL 的编辑器最省事；卡牌战斗单独用 JS 模块接。
4. **如果“3D / 主机 / Steam”**：再上 Godot，并准备学 GDScript（或让 AI 辅助写、你来调）；Web 只作为演示渠道。
5. **一句话**：不是“现在这套装不下内容”，而是“现在这套缺编辑 / 资源管线”；换引擎解决的是编辑器 / 多平台，不是内容上限。
