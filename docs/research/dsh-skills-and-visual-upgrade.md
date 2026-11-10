# DSH 技能调研 + 画面 / 卡片资产化升级方案

- 日期：2026-11-11
- 仓库：`chehua11agent/superagent-test`
- 对象：`game/`《拾词者 · 雾港》与 `prototype/sunless-keep/`
- 需求来源：飞书内部讨论（2026-11-10）。原话大意：`dsh-engineering-skills` 是什么、有没有用；有没有帮我们保持稳定、把人物 / 怪物 / 道具卡片化资产化的技能；画面上真需要升级，还有没有别的方案，现在这版画面不好看。
- 配套原型：[`prototype/visual-directions/`](../../prototype/visual-directions/)（可运行，非正式界面）

> 本文只回答“有什么、值不值得、代价是什么”。方向选型仍需要人来拍板；原型只做到“能看、能对比”的垂直切片，不是已接入的正式界面。

## 0. 结论先行

1. **`dsh-engineering-skills` 是真的，内容也不是水货**，但它是从大型 Python / agent 系统里提炼的通用工程纪律，不是游戏开发包。6 个技能里，对当前项目直接有用的约 2 个（代码审查、CI 诊断），人物 / 怪物 / 道具 / 美术 / 画面相关的为 0。
2. **更匹配我们的是 `gamedev-skills/awesome-gamedev-agent-skills`**（Apache-2.0，约 8.1k stars，77 个技能）。其中 `create-game-assets`（资产清单 / 来源 / 许可 / QA）、`game-ui-ux`（HUD / 响应式 / 焦点）、`game-feel`（打击感 / 动效）、`genres/card-game`、`genres/rpg` 与我们有直接关系；`web-engines/pixijs-rendering` 只在走 PixiJS 时用。**按需装 4–6 个，不要全量装 77 个。**
3. **稳定性的最大缺口不是“缺一个技能”，而是仓库没有 CI。** 现有 25 个单元 / 内容测试和 10 个 Playwright E2E 只靠本地跑；PR #10 也记录了“仓库没有 CI workflow”。先补 GitHub Actions，再谈用 `ci-diagnosis-and-fix` 这类技能。
4. **卡片化 / 资产化的关键不是“再画一批图”**，而是：统一的实体数据模型 + 一个卡片渲染器 + 带许可 / 来源 / 焦点的资产清单 + 校验脚本。原型已经用同一套数据渲染了人物 / 怪物 / 道具三类实体卡，以及词卡手牌。
5. **画面瓶颈是美术资产与构图，不是 CSS。** 现有 `styles.css` 的纸感、噪点、暗色、金色细线已经是定制设计系统；继续堆 CSS 收益很低。给出 A–E 五条路线，推荐先用 **A（旧版画 / 图版）** 做一个战斗垂直切片，验证后再决定 **B（委托或 AI 立绘 + 暗场电影感）**。
6. **不推荐**为了画面换 Phaser / WebGAL / 3D 引擎；也不推荐装整套“游戏工作室”多 agent 框架。当前是一个单机、DOM + SVG、25 个测试的保护得还不错的原型，重写的投入产出比很低。

## 1. `dsh-engineering-skills` 是什么

| 项 | 值 |
| --- | --- |
| 仓库 | [`chenyinrusi/dsh-engineering-skills`](https://github.com/chenyinrusi/dsh-engineering-skills) |
| 许可 | MIT |
| Stars | 1（2026-11-11 查询） |
| 创建 / 最近推送 | 2026-08-16 / 2026-08-16 |
| 形态 | 6 个纯 Markdown `SKILL.md`；另有 PyPI 安装器，只做拷贝，无运行时依赖 |
| 安装 | `pip install dsh-engineering-skills` + `dsh-engineering-skills install ~/.dsh/skills`；或直接拷贝 `skills/*` |

六个技能：

| 技能 | 内容 | 对我们的判断 |
| --- | --- | --- |
| `code-review-methodology` | 三遍 / 18 维审查；E2E 选择器、迁移、跨模块一致性；P0–P3 分级 | **有用（部分）**。18 维里“任务生命周期 / SSE / DAG / 分布式”偏 agent 系统；但“改公共符号先 grep 全部调用方”“测试选择器先对源码 grep”“每个状态变更追到持久化”“E2E 默认值”这些角度对 `game/` 和卡片渲染器都成立。 |
| `ci-diagnosis-and-fix` | GitHub Actions 批量变红时的定位流程；依赖版本、`$GITHUB_OUTPUT`、Playwright webServer 等 | **有前提有用**。我们先得有自己的 CI；有了之后，它的“同 commit 多 workflow 同时红 ≈ 依赖 / 环境问题”和 Playwright webServer 注意事项能省时间。示例偏 Python。 |
| `redundancy-and-boundary-audit` | 仓库级 A/B/C 重复分类、边界与命名保真、报告交付 | **低**。当前仓库小；等实体数据、卡片渲染、5e 规则层增多后，可用来防“词卡 / 实体卡 / 战斗卡”三套实现漂移。 |
| `repo-analysis` | 跨仓库模式提取 → 映射 → 价值判断 | **低**。方法本身不错，但我们已经在做同类调研；不需要为此装一个技能。 |
| `release-engineering` | PyPI / GitHub release / twine / 数据文件打包 | **无关**。我们是静态网页，不发 Python 包。 |
| `shell-safety` | 禁用交互式命令、超时、预检 | **低**。当前 harness 已限制交互、命令有超时；我们也没有 `more` / `pause` 场景。 |

**质量判断**：不是“AI 生成的空话”。内容来自真实事故（shell 卡死、PyPI 数据文件被 glob 压平、CI 批量红），有具体规则和反例；比大多数“角色提示词”扎实。但它**只有 1 star、8 月后没更新**，也没有游戏 / 美术 / 资产领域内容，不能把它当成“对我们这套开发有帮助过的技能”的证据。

**安装建议**：不要全量装。第三方 skill 本质上是会进入 agent 上下文的提示词，等于让别人的流程影响我们每一次任务；装到 `~/.dsh/skills` 还会影响所有项目。若要用，最多装 `code-review-methodology` 和 `ci-diagnosis-and-fix`，先读一遍全文，再按我们的栈改写（去掉 SSE / DAG / PyPI 相关段落）。本 ticket 没有安装或启用任何第三方 skill。

## 2. 更匹配的技能包（按需选，不要整套装）

以下均为 2026-11-11 的 GitHub 元数据；“契合度”是相对《拾词者》这个 DOM + SVG 单机原型的判断，不是通用评分。

| 包 | 许可 / stars | 提供什么 | 契合度 | 建议 |
| --- | --- | --- | --- | --- |
| [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache-2.0 / 8,142 | 77 个 portable Agent Skills：资产、UI/UX、打击感、卡牌 / RPG 类型、PixiJS / Phaser / three.js 等 | **最高** | 只取 `create-game-assets`、`game-ui-ux`、`game-feel`、`genres/card-game`、`genres/rpg`；走 PixiJS 再加 `web-engines/pixijs-rendering` |
| [`yuntaojinghong/dsh-game-art-guide`](https://github.com/yuntaojinghong/dsh-game-art-guide) | MIT / 1 | 10 种美术风格的配色、UI / 动画规范、中文字体排版、游戏类型要点 | 中 | 当成美术前置检查清单读；内容偏通用，不能替代具体 art direction |
| [`HYClub/deepseek-harness-game-studios`](https://github.com/HYClub/deepseek-harness-game-studios) | MIT / 20 | 从 Claude Code Game Studios 移植的 83 skills、49 agents、14 rules、19 hooks | 低（过重） | 一个人做 15 分钟循环原型，不需要“49 个 agent 的游戏工作室”；上游 [`Donchitos/Claude-Code-Game-Studios`](https://github.com/Donchitos/Claude-Code-Game-Studios)（MIT，37,950）可作参考 |
| [`ybuild-ai/ai-game-art-pipeline-skill`](https://github.com/ybuild-ai/ai-game-art-pipeline-skill) | MIT / 306 | 把 AI 图 / 视频转成可用的游戏资产：切图、去背、规格、导入 | 中（有前提） | 只有当我们确定用 AI 出图、且有图像生成工具时才需要；它不解决“风格统一” |
| [`SAXEM1997/specpowers`](https://github.com/SAXEM1997/specpowers) | MIT / 6 | SDD + TDD 的六阶段工作流（OpenSpec + Superpowers） | 中 | 想强化“先规格、再测试”的流程时可试；对当前小原型偏重 |
| [`82c86b8z86-stack/dsh-engineering-workflow`](https://github.com/82c86b8z86-stack/dsh-engineering-workflow) | MIT / 7 | 需求澄清 → 计划 → TDD → 并行 subagent → 验证收尾的五阶段 | 中 | 同上；适合多人 / 多模块，不是画面问题的解 |
| [`akatz-ai/diorama-card-studio`](https://github.com/akatz-ai/diorama-card-studio) | MIT / 1 | 动态 diorama 卡、全息箔卡效果 | 低 | 卡面“炫技”可参考，但我们的方向是旧版画 / 文学感，不建议全息箔 |
| [`yancongya/layered-card-parallax`](https://github.com/yancongya/layered-card-parallax) | MIT / 1 | 把平面卡图拆层做 2.5D 视差 / 悬停辉光 | 低 | 只有确定“卡面要动”时再试；会增加资产制作成本 |
| [`vinvcn/mattpocock-skills-zh-CN`](https://github.com/vinvcn/mattpocock-skills-zh-CN) | MIT / 5,674 | Matt Pocock 工程 / 生产力技能的简体中文版 | 中 | 工程纪律类可参考；不是游戏 / 画面技能 |
| [`Sev7eEn7/dsh-sieve`](https://github.com/Sev7eEn7/dsh-sieve) | MIT / 111 | 上下文裁剪、token 优化 | 无关 | 与本项目问题无关 |

**必须说清楚的一点**：技能是方法论 / 提示词，不会自己产出美术。`create-game-assets` 能做的是“逼你先定 art direction、先做资产清单、先验一张 hero asset、记录来源和许可”；它不能替代画师、图像生成工具或素材采购。把技能当成“画面升级方案”会再次落空。

**安装方式**（以 `awesome-gamedev-agent-skills` 为例）：

```bash
# 不要装全部 77 个；按目录挑，保留 references/ 和 scripts/
mkdir -p ~/.dsh/skills
cp -R <repo>/skills/disciplines/create-game-assets ~/.dsh/skills/
cp -R <repo>/skills/disciplines/game-ui-ux ~/.dsh/skills/
cp -R <repo>/skills/genres/card-game ~/.dsh/skills/
```

DSH 是否加载 `~/.dsh/skills` 取决于当前 profile 的 skills 配置；本项目当前会话只注册了飞书 / GitHub 两个内置技能。**安装前先读全文，安装后用 `git diff` / 文件清单确认只多了预期目录**。第三方 skill 可能包含与项目无关甚至有害的指令，不要闭眼装整套。

## 3. 保持稳定性：先补 CI，再谈技能

### 3.1 现状

- `npm test`：25 个 SRS / 内容 / 通关集成用例；
- `npm run validate` / `validate:sample`：48 词 / 12 幕 / 23 行动、10 词功能位置；
- `npm run test:e2e`：10 条 Playwright 用例，收集 `pageerror` 与 console error；
- **没有 `.github/workflows`**（2026-11-11 查询 404），所有检查靠本地；
- 存档在 `localStorage`，`store.js` 的字段 / 版本变化没有迁移测试；
- 内容 JSON 没有 schema 校验，新增实体 / 卡片字段只能靠人眼。

### 3.2 建议顺序（与技能无关，但比技能更有效）

1. **加 CI**（半天）：
   ```yaml
   # .github/workflows/ci.yml
   name: ci
   on: [pull_request, push]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm test
         - run: npm run validate
         - run: npm run validate:sample
         - run: npx playwright install --with-deps chromium
         - run: npm run test:e2e
         - uses: actions/upload-artifact@v4
           if: failure()
           with: { name: playwright-report, path: playwright-report/ }
   ```
   注意：`playwright.config.mjs` 已有 `webServer`，不要在 workflow 里再手动起服务器，否则端口冲突（`ci-diagnosis-and-fix` 里也提到这一点）。
2. **存档版本迁移测试**（半天）：`store.js` 加 `schemaVersion`，补“旧存档 → 新字段”的用例；这是玩家最容易感知、也最难靠 E2E 覆盖的破坏。
3. **内容 / 实体 schema 校验**（1 天）：用 `scripts/validate.mjs` 扩展或加 `scripts/validate-entities.mjs`，校验 id 唯一、kind 枚举、stats 数字、`art.src` 存在、`license / source` 非空。
4. **视觉回归**（方向定了再做）：Playwright 截 3 个关键屏（封面、战斗、图鉴）作为基线；方向未定前截了也会天天改。

### 3.3 技能在其中的位置

- `code-review-methodology`：把它的“公共符号全仓 grep”“测试选择器对源码 grep”“每个状态变更追到持久化”三条抄进我们的 review 清单即可，不必安装。
- `ci-diagnosis-and-fix`：CI 建好、第一次批量红的时候再用；
- `specpowers` / `dsh-engineering-workflow`：想上 TDD / 规格门槛时再评估，当前优先级低于 CI。

**结论**：稳定性不是“装一个技能”能解决的；CI + 存档迁移 + schema 校验是实打实的工程动作。

## 4. 人物 / 怪物 / 道具的卡片化与资产化

### 4.1 现在的问题

- 人物、怪物、道具目前是**散落的文本 + 代码**：敌人在 `chapter-1.json` / `game.js`，NPC 在旁白里，道具效果在剧情行动里，插画在 `art.js` 的程序化 SVG 与少量内联图标里；
- 词卡有一套样式，但没有“实体卡”概念；同一个“守塔人”在剧情、战斗、图鉴里无法共享一张卡；
- 没有资产清单：图来自哪里、什么许可、焦点 / 尺寸 / 是否可商用，都没有统一记录；
- 改一个实体要改多处，容易漂移。

### 4.2 建议的数据模型

新增 `game/content/entities.json`（或按 `characters / monsters / items / places` 分文件），每张卡是一个可校验实体：

```json
{
  "schemaVersion": 1,
  "entities": [
    {
      "id": "monster.fog-keeper",
      "kind": "monster",
      "name": "雾中守塔人",
      "nameEn": "The Fog Keeper",
      "rarity": "rare",
      "tags": ["fog", "lighthouse", "boss"],
      "stats": { "hp": 45, "ac": 13, "threat": 3 },
      "abilities": [
        { "name": "雾墙", "text": "每回合结束，雾墙推进一格；被吞没时，下一次检定劣势。", "trigger": "round-end" }
      ],
      "quote": "灯还亮着，但守塔人已经很久没有回答。",
      "art": {
        "src": "assets/art/monster-fog-keeper.webp",
        "focus": "50% 26%",
        "alt": "雾中灯塔与守塔人的剪影",
        "license": "CC0",
        "source": "Met Open Access, object 382738"
      },
      "appearsIn": ["chapter-1/act-4"],
      "words": ["guide", "signal", "warn", "reflect"],
      "source": { "system": "5e SRD 5.1", "license": "CC BY 4.0", "note": "数值为原型平衡，不是 SRD 原文" }
    }
  ]
}
```

要点：

- **一张卡 = 一个实体**，不是一段 HTML；`kind` 决定卡面变体（人物 / 怪物 / 道具 / 地点 / 词卡）；
- `art` 里带 `license / source / focus`，和图片一起进仓库；
- `appearsIn` / `words` 让剧情、战斗、词书、复习能反查“这张卡在哪出现”；
- 数值可以是原型自定，但要在 `source` 里说清楚哪些来自 SRD / 哪些是自调，避免版权和“伪官方”问题。

### 4.3 渲染与资产管线

1. **渲染器** `game/src/cards.js`：`renderCard(entity, { variant, size })` + 一个 `renderCardGrid`；卡面 CSS 用 token，不在 JS 里拼大段样式。
2. **资产清单** `game/assets/manifest.json`：
   ```json
   {
     "assets": [
       { "id": "art.monster.fog-keeper", "file": "art/monster-fog-keeper.webp",
         "width": 900, "height": 1200, "license": "CC0",
         "source": "https://www.metmuseum.org/art/collection/search/382738",
         "author": "Henry Farrer", "status": "placeholder" }
     ]
   }
   ```
3. **校验** `scripts/validate-entities.mjs`：id 唯一、kind 枚举、stats 类型、`art.src` 文件存在、`license / source` 非空、`appearsIn` 指向存在的幕；CI 里跑。
4. **接入点**（按顺序）：
   - 先做“图鉴 / 档案”页：不改战斗，先把实体卡渲染出来，风险最低；
   - 战斗：玩家 / 敌人卡 + 道具卡复用同一渲染器；词卡保持现有手牌样式；
   - 剧情：NPC 对话框头部放一张小卡（头像 + 名字 + 一句话）；
   - 词书：词卡与实体卡共享卡框，但保留 SRS 数据。
5. **素材来源**：
   - 现有内容（守塔人、拾词者、提灯、透镜、旧灯塔）先做 5–8 张；
   - 5e SRD 5.1（CC BY 4.0）可查怪物 / 道具数值，Open5e 等镜像可用；**不要**从盗版 PDF / 未授权站点抓取；
   - 公版画（Met Open Access CC0、Rider-Waite 1909 PD）可做占位或正式风格；每张记录作者 / 标题 / 年份 / 对象页；
   - 委托 / AI 生成必须写清许可与“是否允许商用”，并保留来源。

### 4.4 分阶段与工作量

| 阶段 | 内容 | 工作量 | 风险 |
| --- | --- | --- | --- |
| P0 | `entities.json` + `cards.js` + 图鉴页 + 5 张卡 | 2–3 天 | 数据模型一次定不全，先用 5 张验证 |
| P1 | 战斗玩家 / 敌人 / 道具卡复用；剧情 NPC 小卡 | 2–4 天 | 与现有 `main.js` 路由 / 状态耦合，需补 E2E |
| P2 | `manifest.json` + 校验 + 署名页 + 图片压缩 | 1–2 天 | 许可 / 来源遗漏；用脚本卡住 |
| P3 | 5e SRD 数据导入 / 扩章 / 简易编辑器 | 按内容量 | 翻译与平衡，不建议先做 |

**验收**：同一实体在剧情、战斗、图鉴里出现的是同一张卡；缺 `license` 的图让 CI 失败；新增一张卡只改 JSON，不改页面代码。

## 5. 画面升级：先诊断，再选路线

### 5.1 为什么现在“不好看”

用当前 `main` 的战斗截图对照（`game/screenshots/after-battle.png`，1440×1000）：

| 现象 | 具体表现 | 后果 |
| --- | --- | --- |
| 场景没有主体 | 程序化 SVG 是空的海岸 / 灯塔剪影，战斗面板占了半屏 | 像“带背景的网页表单”，不像一场战斗 |
| 卡牌只有字 | 手牌是“中文语义 + 效果”的圆角文本框，没有卡面、类型图形、稀有度、打出动效 | “词卡战斗”缺少卡牌游戏的语言 |
| 人物不在画面里 | 战斗只有文字面板；PR #10 试过程序化剪影，但剪影本身粗糙 | 玩家看不到“谁在打谁” |
| 层级平 | 场景、面板、手牌亮度接近，缺少焦点与景深 | 眼睛不知道先看哪 |
| 已有优点 | 纸感噪点、暗色、金色细线、衬线标题、可访问性都已经是定制设计 | **不要推翻重来**；问题是美术与构图 |

关键判断：**这不是“CSS 再调调”能解决的**。现有样式已经做到“暗色文学感”，但场景里没有真实图像、卡面没有插画，继续换渐变 / 阴影只会得到“更精致的空壳”。PR #10 的路线（程序化人物剪影）证明了：没有美术资产时，代码画人物的上限很低。

### 5.2 五条路线

| 路线 | 做法 | 美术依赖 | 工作量 | 质量上限 | 风险 |
| --- | --- | --- | --- | --- | --- |
| **A 旧版画 / 图版** | 保留 DOM/CSS；公版铜版画 / 蚀刻做场景与卡图；纸面装裱、双线框、档案编号；卡面用版画 + 衬线 | 公版图（0 预算）或 5–10 张委托 | 2–4 天做垂直切片 | 高（“一本可玩的旧书”） | 风格偏西方 /  archival；需要 curation 与统一处理 |
| **B 暗场电影 + 立绘** | 满幅场景、角色立绘、雾 / 光、卡框发光；可先 CSS，后加 PixiJS 粒子 | 12 幕场景 + 6 人物 + 10 道具（委托 / AI） | 1–2 周 + 美术 | 最高（最像“游戏”） | 美术成本 / 一致性；AI 许可与风格漂移 |
| **C 朱墨木刻 / 纸艺** | 高对比木刻、单色海报、硬边、纸纹；程序化或阈值化处理 | 低（可用现有图做阈值） | 3–5 天 | 中高（风格强，但细节少） | 容易变成“滤镜”；长时间看会疲劳 |
| **D PixiJS 2.5D** | DOM 文本层 + PixiJS 场景 / 卡牌层；视差、雾粒子、卡牌飞行 | 仍需 A / B 的美术 | 1–2 周 | 中高（动效强） | 双渲染坐标 / 响应式 / 测试成本；包体增加 |
| **E 换 VN 引擎** | WebGAL / Monogatari 重做剧情层 | 立绘 + 背景 | 2–4 周+ | 剧情演出最强 | 推翻现有交互 / 测试 / 词卡战斗，不建议现在做 |

### 5.3 推荐

**先用 A 做一个战斗垂直切片**：一张场景图 + 3–4 张实体卡 + 现有手牌 + 现有数值，不改引擎、不改 SRS。它能在 2–4 天内回答两个问题：

1. “旧版画 + 纸面档案”是不是我们要的气质？
2. 卡面插画 + 卡框 + 版式，能不能让“词卡战斗”看起来像卡牌游戏？

如果 A 通过，再用 B 给**关键角色 / BOSS / 封面**做 5–8 张委托或 AI 立绘，逐步替换公版占位；不要一次性重画 12 幕。C 可以作为“低成本皮肤”备选，D 只在确定要粒子 / 视差时再加，E 不建议。

### 5.4 动效与可访问性

- 动效只做“有信息”的：选中卡抬起、出牌飞行、命中数字、HP 条变化、雾层缓慢漂移；不做无意义的常驻闪烁。
- 所有动效在 `prefers-reduced-motion` 下降级；当前 `styles.css` 已有该开关，原型也保留。
- 移动端先保证 390×844 无横向溢出、手牌可点、字号可读；原型已按这个视口检查。

## 6. 配套原型：三个方向

**入口**：[`prototype/visual-directions/`](../../prototype/visual-directions/)（打开 `index.html`；PR 描述里有截图与本地打开方式）

- **A · 旧版画**：纸面、双线装裱、档案编号、公版铜版画；卡面像图版 / 档案卡。
- **B · 夜航**：同一套结构，暗场、满幅海图、金色细线、发光卡框；最接近现在雾港的气质。
- **C · 朱墨木刻**：粗黑边、朱砂、硬投影、高对比；成本最低，风格最硬。

原型里同时演示了：

- 人物 / 怪物 / 道具三类实体卡（同一套数据，不同卡面变体）；
- 词卡手牌 + 选中 + 出牌 + 伤害数字 + HP 变化；
- 桌面 1440×1000 与移动 390×844；
- 资产清单 / 数据模型说明（页面下半部分）。

**它不是**：正式界面、最终美术、完整战斗、接入 `game/` 的实现。插画是公版占位（Met Open Access CC0、Rider-Waite 1909 PD），只用于方向对比；正式版要按实体重绘 / 委托，并保留来源与许可。

## 7. 建议的下一步

1. **先拍板画面方向**：A / B / C 里选一个（或明确“都不要”），再看要不要走 B 的委托 / AI 立绘。方向没定之前，不建议继续改 `game/` 的正式界面。
2. **并行加 CI**：与画面方向无关，越早越好；加完再谈 `ci-diagnosis-and-fix`。
3. **卡片化 P0**：`entities.json` + `cards.js` + 图鉴页；先做 5 张（拾词者、守塔人、雾中龙、透镜、旧灯塔），不碰战斗逻辑。
4. **美术资产策略**：公版占位 / 委托 / AI 三选一；无论哪种，先写 `assets/manifest.json` 和署名页。
5. **一个垂直切片**：战斗屏 + 4 张手牌 + 3 张实体卡，先在原型里改到满意，再回 `game/` 实现。

## 8. 需要人拍板的问题

1. 画面方向选 **A（旧版画）/ B（暗场电影）/ C（朱墨木刻）**？还是都不对，想要别的参考？
2. 美术预算：**公版占位先做**，还是直接**委托 / AI 立绘**？如果 AI，许可与风格一致性谁负责？
3. 是否先加 **CI**（不依赖画面方向）？
4. 卡片化先做 **图鉴** 还是直接进 **战斗**？

## 附录：本次核对的信息

- `dsh-engineering-skills`：MIT，1 star，6 个技能，2026-08-16 后未更新；内容为通用工程纪律，无游戏 / 美术 / 资产技能。
- `awesome-gamedev-agent-skills`：Apache-2.0，8,142 stars，77 个 portable Agent Skills；`create-game-assets`、`game-ui-ux`、`game-feel`、`genres/card-game`、`genres/rpg`、`web-engines/pixijs-rendering` 与我们有直接关系。
- `dsh-game-art-guide`：MIT，1 star；10 种风格 / 配色 / UI / 动画 / 中文字体检查清单。
- `HYClub/deepseek-harness-game-studios`：MIT，20 stars；上游 `Donchitos/Claude-Code-Game-Studios` MIT，37,950 stars；对当前原型过重。
- `ybuild-ai/ai-game-art-pipeline-skill`：MIT，306 stars；AI 图 → 游戏资产管线，需图像生成工具。
- `specpowers`：MIT，6 stars；SDD + TDD 六阶段。
- `dsh-engineering-workflow`：MIT，7 stars；五阶段工程工作流。
- `vinvcn/mattpocock-skills-zh-CN`：MIT，5,674 stars；工程 / 生产力技能中文版。
- `dsh-sieve`：MIT，111 stars；上下文 / token 优化，与本项目无关。
- 公版图版：Met Open Access（CC0）：Joseph Vernet《A Sea Storm》（1752–64，object 811690）、Henry Farrer《Lighthouse》（1880，object 382738）、Hendrick Goltzius《The Dragon Devouring the Companions of Cadmus》（1588，object 399874）；Rider-Waite-Smith Tarot（1909，Public Domain）：The Hermit / Ace of Pentacles。
- 仓库现状：无 `.github/workflows`；25 个单元 / 内容测试 + 10 个 Playwright E2E；`game/screenshots/` 保存了上一轮 Before / After。
