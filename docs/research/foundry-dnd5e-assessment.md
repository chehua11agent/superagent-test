# Foundry VTT dnd5e 深读：它到底是不是“现成系统”

> 调研日期：2026-11-18
> 触发：用户指出 `https://github.com/foundryvtt/dnd5e`，认为上一版调研“完全没理解”。
> 结论先说：**它确实是目前最完整的现成 5e 系统实现，不是数据 API；但它是一个 Foundry VTT 系统，不是可 `import` 的独立规则库。** 上一版调研把它归为“只能参考”，这个说法太窄：如果接受 Foundry 运行时，它就是首选底座；如果不接受，只能复用它的内容包与部分设计，不能直接跑它的规则代码。

## 1. 它提供了什么

`foundryvtt/dnd5e`（6.1.x，MIT）不是“5e 数据表”，而是完整的 Foundry 游戏系统：

| 层 | 内容 | 证据 |
| --- | --- | --- |
| 角色/生物 | Character / NPC / Group / Vehicle / Encounter / Faction 数据模型；属性、技能、豁免、AC、HP、先攻、死亡豁免、休息、负重、专长、多职业、升级 | `module/data/actor/character.mjs`、`module/data/actor/templates/*` |
| 物品/法术 | Race / Class / Subclass / Background / Spell / Weapon / Equipment / Consumable / Tool / Loot / Container / Feat / Facility 等物品类型 | `module/data/item/*` |
| 规则/掷骰 | d20 检定、攻击、豁免、伤害、暴击、优势/劣势、掩体、抗性/免疫/易伤、治疗、专注、死亡豁免、先攻 | `module/dice/d20-roll.mjs`、`damage-roll.mjs`、`module/documents/actor/actor.mjs` |
| 效果/状态 | ActiveEffect、Condition、Enchantment；状态与自动效果 | `module/data/active-effect/*` |
| 角色成长 | Advancement（属性提升、专长、技能、语言、生命值、ItemGrant 等） | `module/data/advancement/*`、`module/documents/advancement/*` |
| 内容 | 4,940 个 `packs/_source` 源文件：2014/2024 种族、职业、法术、物品、怪物、职业特性、效果、表格等；SRD 5.1/5.2（CC-BY-4.0） | `packs/_source/*`、`README.md` |
| 界面 | 角色卡、物品卡、升级流程、Compendium Browser、聊天卡、骰子配置对话框 | `module/applications/*`、`templates/*` |

这是一套**成品规则系统**，覆盖了我们自研规则核的数倍到数十倍。用户指出得对：不能把它描述成“没有现成系统”。

## 2. 为什么不能直接 `import` 进现在的静态网页

它的运行前提是 Foundry VTT 核心（商业软件，不开源），代码里到处是 Foundry 的基类/全局：

| 依赖 | 代码证据 | 后果 |
| --- | --- | --- |
| `Actor` 文档 | `module/documents/actor/actor.mjs:45`：`class Actor5e extends SystemDocumentMixin(foundry.documents.Actor)` | 没有 Foundry 的 Document 生命周期，Actor 无法实例化 |
| `Roll` | `module/dice/basic-roll.mjs:18`：`class BasicRoll extends Roll`；`d20-roll.mjs:15`、`damage-roll.mjs:16` 继续继承 | 骰子、检定、伤害都依赖 Foundry 的 Roll 解析/求值 |
| `TypeDataModel` / `fields` | `module/data/actor/character.mjs` 使用 `foundry.data.fields.*`、`foundry.utils.*` | 数据模型不能脱离 Foundry 的 DataModel 校验/迁移 |
| 初始化/Hook | `dnd5e.mjs` 用 `Hooks.once("init", ...)` 注册 `CONFIG.Actor.documentClass` 等 | 只能由 Foundry 启动流程加载 |
| 设置/本地化/UI | `game.settings`、`_loc`、`CONFIG.DND5E`、Application/Dialog/Sheet | 需要 Foundry 的运行时与界面栈 |
| 版本门槛 | `system.json`：`"minimum": "14.367"`，`"verified": "14"` | 必须配 Foundry VTT 14.x，`package.json` 的依赖全是构建工具，无运行时库 |

仓库没有独立 CLI/测试可在 Foundry 之外跑；`package.json` 的脚本是打包 CSS、LevelDB compendium、rollup 编译系统入口；`packs` 需要 Foundry 的 `foundryvtt-cli` 打包。它不发布 npm 包，也没有 headless API。

**换句话说：它不是一个“规则库”，而是一个“游戏系统的完整实现”。要获得它的规则，必须运行 Foundry；要脱离 Foundry，只能移植/重写。**

## 3. 哪部分可以复用

即使不采用 Foundry 运行时，也有两类可复用资产：

### 3.1 内容包（最实用）

- `packs/_source` 是 YAML 源文件，按 Foundry Item/Actor 结构组织；代码许可 MIT，SRD 内容 CC-BY-4.0。
- 可以离线解析，把种族/职业/背景/法术/物品/怪物转成我们自己的 JSON 数据；不依赖 Foundry。
- 注意：内容包不是简单字段表，机械效果大量放在 `system.advancement`、`system.activities`、ActiveEffect、ItemGrant 的 UUID 引用里；需要写转换器。
- 2024 内容与 2014 内容分目录（`*24`）；本项目目前是 2014/SRD 5.1 口径，转换时只能取对应子集。

### 3.2 数据模型与公式（参考/移植）

- AC/HP/先攻/技能/豁免/负重/休息/死亡豁免的字段与计算顺序，可以直接对照移植。
- 状态/效果/职业成长（Advancement）的设计比我们自研的“薄规则核”完整很多。
- 但全部移植等于重写一个 Foundry dnd5e；工作量以“月”计，不是一次 PR 能完成的。

## 4. 两条现实路线

### A. Foundry 原生：把游戏做成 Foundry 模块/世界

**做法**

1. 购买并运行 Foundry VTT 14.x（Foundry 核心是商业软件）。
2. 安装 dnd5e 6.1.x（`system.json` 的 manifest URL）。
3. 把《拾词者》做成 Foundry 模块/世界：
   - 用 dnd5e 的 Actor/Item/Compendium 做捏人、角色卡、升级、战斗；
   - SRD 内容直接来自系统 compendium；
   - 单词/SRS 作为一个模块：自定义 Journal/Item、宏、聊天卡，或在 `dnd5e` 的 d20 检定流程上挂钩做“单词挑战 + 加值”；
   - 3D/地图可以用 Foundry 的 Canvas 或外接页面。
4. 部署：Foundry 服务器（Node），不是 GitHub Pages；多人联机、账号、权限、模组生态都现成。

**优点**：规则完整性最高；SRD 内容现成；角色卡/战斗/升级/法术/物品/效果不用重写；MIT 系统代码 + CC-BY 内容。
**代价**：Foundry 许可与服务器；现有静态网页需要改成模块/世界（UI 范式变化大）；GitHub Pages 无法承载 Foundry；与 CET-4 学习流程的集成点要重新设计。

**当前环境缺失**：这里没有 Foundry 核心/许可，也没有 Foundry 服务器；无法下载并运行验证。要落 A，必须有人提供 Foundry 实例/许可，或至少一个可运行环境。

### B. 独立网页：复用内容与设计，保留自己的规则核

**做法**

1. 写一个 Foundry pack 转换器，把 `packs/_source` 的 SRD 2014 种族/职业/背景（后续法术/物品/怪物）导成中性 JSON。
2. 把数据接进现有 `game/src/rules`，扩展现有数据模型：
   - 先覆盖 races/classes/backgrounds；
   - 再补 spells/items/effects/activities；
   - 逐步对齐 AC/HP/先攻/伤害/抗性/专注/休息。
3. 保持零依赖、离线、GitHub Pages 可部署；单词/SRS 继续作为独立机制。

**优点**：不需要 Foundry 许可；部署轻；与现有 CET-4 原型/静态页面一致。
**代价**：规则完整度永远追不上 Foundry；需要自己维护转换器与规则实现；这是一个持续工程，不是一次重写。

## 5. B 路线的第一批落地（2026-11-18 晚些时候）

用户选择 B 后，已把 Foundry `packs/_source` 的第一批内容导入独立规则核：

- 319 法术、885 物品（277 武器/92 护甲）、340 怪物；源 commit 在 `game/src/rules/content/manifest.js`。
- 角色支持背包、Foundry 武器/护甲/盾牌、法术书；武器攻击走 `resolveWeaponAttack()`（d20 命中 + 伤害骰，暴击翻倍伤害骰）。
- 明确缺口：2014 背景/子种族包不完整；基础长剑等条目缺少双手伤害；法术位/施法效果、职业特性尚未接入。
- 详见 [`docs/design/foundry-content-import.md`](../design/foundry-content-import.md)。

## 6. 对 PR #40 的自我修正

PR #40 的规则核是 **B 路线的最小核心**：

- 它证明了“捏人 + 种族/职业/背景 + 修正层 + d20 + 单词加值”可以在零依赖静态页面里跑；
- 它不是 Foundry dnd5e 的替代品，也不应该被描述成“完整的 5e 后端”；
- 上一版调研说 Foundry “只能参考”，这是低估了它在 **A 路线** 中的价值；正确的说法是：**A 路线它是首选底座；B 路线只能复用内容包与设计，不能复用运行时代码。**

## 7. 已拍板：走 B 路线

用户已确认走 **B：独立网页**，不引入 Foundry 运行时。当前落地：

- 第一批内容导入完成（319 法术 / 885 物品 / 340 怪物）；
- 角色背包 + Foundry 武器/护甲/盾牌 + 法术书 + 武器伤害；
- 仍待补：法术位/施法效果、职业特性、2014 背景/子种族的完整映射、武器熟练自动判定、2024 内容是否引入。

A 路线仍保留为未来选项：如果以后接受 Foundry 许可/服务器，可以直接把本仓库的内容/规则映射到 Foundry 世界，而不是重写内容。

## 8. 代码证据索引

- 系统入口：`dnd5e.mjs`（`Hooks.once("init")` 注册 `CONFIG.Actor.documentClass` 等）
- 角色文档：`module/documents/actor/actor.mjs:45`（`extends foundry.documents.Actor`）
- 骰子：`module/dice/basic-roll.mjs:18`（`extends Roll`）、`d20-roll.mjs:15`、`damage-roll.mjs:16`
- 角色数据：`module/data/actor/character.mjs`（`foundry.data.fields`）
- 种族/职业/背景物品：`module/data/item/race.mjs`、`class.mjs`、`background.mjs`
- 系统声明：`system.json`（`minimum: 14.367`）
- 许可：`README.md`（代码 MIT；SRD 5.1/5.2 CC-BY-4.0）
- 内容源：`packs/_source/**`（4,940 个文件）
