# 5e 规则引擎与角色创建：现成方案调研

> 调研日期：2026-11-18
> 问题：有没有现成的系统，能直接提供「5e 捏人 + 种族数值 + 情境修正 + d20 检定」，并且能嵌进这个零依赖、离线优先的网页原型？
> 一句话结论：**数据有现成的，规则引擎没有可直接嵌入的**。最接近的是 Foundry VTT 的 dnd5e 系统（MIT），但它以 Foundry 运行时为前提；本仓库应该复用 SRD 数据、自己保留一层薄规则核。

## 0. 结论先行

| 候选 | 能提供什么 | 不能提供什么 | 能否直接嵌入本项目 |
| --- | --- | --- | --- |
| D&D 5e SRD API（5e-bits） | SRD 5.1 结构化数据：种族、职业、法术、怪物、装备、状态 | 角色创建流程、修正叠加、检定结算 | **数据可参考/转录；API 需联网，不适合离线** |
| Open5e | SRD + 多本第三方内容的 API 与站点 | 同样只是数据；不同文档许可不同 | **数据可参考；需逐文档核对许可** |
| Foundry VTT dnd5e | 完整的角色数据模型、状态、掷骰、角色卡自动化 | 独立可嵌入的规则库；没有 Foundry 运行时就不成立 | **只能当参考实现，不能直接搬** |
| 5etools | 聚合数据与网页 UI | 开源规则库、明确的再分发许可 | **不采用** |
| 自研规则核（本仓库） | 捏人、种族/职业/背景、修正层、检定、单词加值 | 法术/专长/完整战斗（后续补） | **已落地** |

## 1. 需求拆解

这个项目对“规则后端”的要求和通用 VTT 很不一样：

| 需求 | 对引擎的要求 |
| --- | --- |
| 5e 捏人 | 种族/子种族、职业、背景、属性生成、技能选择、语言、护甲 |
| 种族数值 | 属性加值、速度、黑暗视觉、抗性、武器/护甲熟练、每级 HP、幸运、自选加值 |
| 数值修正 | 基础值 + 种族 + 职业 + 装备 + 状态 + 力竭 + 情境；优势/劣势抵消；来源可追溯 |
| d20 检定 | 技能/属性/豁免/攻击/先攻；自然 1/20 规则；被动检定；成功率 |
| 单词机制 | 单词熟练只作为 +0–3 的概率因素，不能替代掷骰 |
| 自由捏人 | 自定义种族/职业/背景可以走同一套校验，不被内置列表锁死 |
| 运行环境 | 浏览器与 Node 共用、零依赖、离线可跑；未来可搬到服务端 |
| 失败前进 | 检定失败不等于卡关，代价由剧情层决定 |

这些要求里，“单词加值”和“失败前进”是任何现成 5e 引擎都不会有的；而“角色创建 + 修正叠加”本身并不复杂，适合自研一层薄核心。

## 2. 数据层：有现成的，优先复用

### 2.1 D&D 5e SRD API（5e-bits）

- 站点：<https://www.dnd5eapi.co/>；仓库：<https://github.com/5e-bits/5e-srd-api>
- 代码许可：MIT（仓库 `LICENSE.md`）。
- 数据来源：SRD 5.1（Systems Reference Document），Wizards of the Coast 以 **CC-BY-4.0** 发布。
- 内容：种族、子种族、职业、法术、怪物、装备、状态、规则条目等；提供 REST/GraphQL。
- 形态：**数据 API**，不是规则引擎。它不会告诉你“丘陵矮人 +2 体质后 AC 是多少”“中毒时豁免怎么掷”。
- 备注：旧的 `5e-bits/5e-database` 已归档并合并进 `5e-srd-api` 的 `packages/5e-database`。

适合：核对 SRD 数值、生成我们自己的数据表。
不适合：直接作为离线网页的运行时依赖（需要联网；也不解决角色创建/检定）。

### 2.2 Open5e

- 站点/API：<https://open5e.com/>、<https://api.open5e.com/>；仓库：<https://github.com/open5e/open5e-api>
- 代码许可：修改版 MIT；**SRD 与第三方内容不包含在该 MIT 授权内**，按每份文档自己的许可（CC-BY-4.0、OGL 等）处理。
- 内容比 SRD API 广（含第三方出版物），API v1 已进入维护，v2 为当前版本。
- 形态：同样是数据 API/站点，不是规则引擎。

适合：以后要扩怪物/法术/第三方内容时，逐文档核对许可后取用。
不适合：现在就把整套数据 vendoring 进仓库（许可与体积都不可控）。

### 2.3 5etools

- 站点：<https://5e.tools/>
- 它是数据聚合 + 网页工具，不是以“可嵌入规则库”为目标发布的开源项目；数据来自多本书，再分发许可并不统一。
- 本项目**不依赖 5etools 的数据或代码**，避免把许可风险带进仓库。

### 2.4 本仓库已有的 5e 资料

`docs/research/phb-story-dm-review.md` 已经盘点了 PHB 的种族/职业/背景/状态结构；`docs/content/cet4-dnd-mechanics-vocab.md` 把 5e 机制映射到 CET-4 词。这次的数据表以 **SRD 5.1** 为准，只录入规则数值，不抄 PHB 的叙事文本。

## 3. 规则实现层：为什么没有直接采用

### 3.1 Foundry VTT dnd5e（最接近的完整实现）

- 仓库：<https://github.com/foundryvtt/dnd5e>；许可：MIT；约 600+ stars。
- 它确实实现了 5e 的角色数据模型、状态、技能/豁免、掷骰、角色卡和大量自动化，是最有参考价值的实现。
- 但它不是独立库：
  - 运行前提是 Foundry VTT（商业软件）的 `Actor`/`Item`/`ActiveEffect`/`Document` 生命周期；
  - 大量逻辑与 UI、模组加载、设置系统耦合；
  - 没有面向普通网页的“import 一个函数就能创建角色/掷骰”的 API。
- 结论：**读它的数据形状与规则处理可以，但不能把它的代码当作本项目依赖**。

### 3.2 通用骰子库

`dice.js`、各种“roll expression”库只解决“解析 2d6+3 并掷骰”，不解决：

- 属性/种族/职业/背景如何组合；
- 熟练/专精/状态/情境如何叠加；
- 优势/劣势何时抵消；
- 角色卡如何派生与序列化。

这些正是这次要补的“规则核”，骰子只占其中很小一部分。

### 3.3 角色生成器

D&D Beyond 的角色生成器是商业闭源产品；Aurora Character Builder 是桌面应用 + 内容包生态，不是可嵌入网页的 JS 规则库。它们都无法满足“零依赖、离线、可改造种族/单词加值”的要求，因此只作为交互参考。

## 4. 决策：自研薄规则核 + SRD 数据子集

### 4.1 选择

| 层 | 决策 |
| --- | --- |
| 数据 | 按 SRD 5.1 转录子集：9 种族 + 子种族、12 职业、13 背景、18 技能、14 状态、12 种护甲 |
| 规则 | 自研纯函数规则核：`createCharacter` → `sheet`，`resolveCheck` → 结果 |
| 许可 | 只使用 SRD 5.1（CC-BY-4.0），保留署名；本项目对 SRD 做了中文化、子集裁剪与结构化改写。不复制 Foundry/Open5e/5etools 代码或非 SRD 文本 |
| 运行 | 零依赖 ES 模块，浏览器/Node 共用；未来可被 Node 服务端 import |
| 扩展 | `buildRules()` 注入自定义种族/职业/背景/状态/护甲；同一套校验 |

### 4.2 为什么不直接依赖 SRD API

- 正式游戏要离线/弱网可用；运行时拉 API 会引入可用性与延迟问题。
- 角色创建与检定是高频本地操作，没必要每次请求。
- 数据量很小（种族/职业/背景/护甲合计几十 KB），转录后可以版本化、可测试。
- 未来若要做服务端权威，规则核可以直接在 Node 里跑；API 只用于内容分发，不是运行时依赖。

### 4.3 代价

- SRD 数据需要自己维护；已用测试覆盖核心数学（属性、熟练、AC、HP、状态、优势、自然 1/20 等）。
- 法术/专长/多职业/完整装备需要后续补；当前明确不覆盖。
- 中文名称为本项目自译，不是官方译名；只影响展示，不影响数值。

## 5. 这次落地的范围

```text
game/src/rules/
  data/races.js         9 个 SRD 种族 + 子种族
  data/classes.js       12 个 SRD 职业（1 级机械数据）
  data/backgrounds.js   13 个 SRD 背景
  data/conditions.js    14 种状态 + 力竭表
  data/armor.js         12 种护甲 + 无甲 + 盾牌
  abilities.js          属性/调整值/熟练/购点/标准数组/4d6
  skills.js             18 项技能
  character.js          spec → sheet
  modifiers.js          修正层、优势/劣势
  conditions.js         状态与力竭结算
  checks.js             d20、被动检定、成功率
  word-bonus.js         SRS → 单词加值
  rules.js              SRD 规则集与房规注入
  index.js              公开 API
```

公开 API：`createCharacter`、`patchCharacter`、`addCondition`、`removeCondition`、`serializeCharacter`、`deserializeCharacter`、`resolveCheck`、`buildCheck`、`checkOdds`、`passiveScore`、`wordBonusFromMemory`、`buildRules`。

## 6. 和单词机制的结合

规则核只接受一个 0–3 的 `wordBonus`：

```js
wordBonusFromMemory({ stage: 3, spelling: { stage: 2 } }) // +3
```

- 认义 0/1/2/3 → 0/1/1/2；拼写 ≥2 再 +1；上限 +3。
- 规则核不知道 SRS 的 1/3/7/16 天排期，也不知道“词卡”；它只把单词熟练当成一个普通的 flat 修正，和掩体、协助、状态一样进入结算。
- `checkOdds()` 可以量化“多 +1 到底多多少成功率”；实验台会显示 +0/+1/+2/+3 的四条成功率条。

这条曲线是**产品参数**，不是 5e 规则；试玩后可以改常量，不影响角色创建与检定代码。

## 7. 后续建议

1. 先用实验台试玩：捏人是否够自由、种族/职业组合是否有趣、单词加值是否过强。
2. 定 HP 口径：5e 真实 HP 与现有 100 HP 叙事跑团是两套节奏，需要产品拍板。
3. 补武器/伤害：`resolveCheck` 先只算命中，下一步加武器数据与伤害掷骰。
4. 补法术：至少给每个施法职业 1–2 个 1 环法术，验证法术位/专注/DC。
5. 服务端权威：规则核保持纯函数，Node API 直接调用；SRS 与检定日志上移。
6. 若扩第三方内容：逐文档核对 Open5e 的许可，不要直接搬 5etools 数据。

## 8. 来源

- SRD 5.1（Wizards of the Coast，CC-BY-4.0）：<https://www.dndbeyond.com/srd>
- Creative Commons Attribution 4.0：<https://creativecommons.org/licenses/by/4.0/>
- 5e SRD API（MIT）：<https://github.com/5e-bits/5e-srd-api>、<https://www.dnd5eapi.co/>
- 5e-database（已归档）：<https://github.com/5e-bits/5e-database>
- Open5e API 与许可：<https://github.com/open5e/open5e-api>、<https://open5e.com/>
- Foundry VTT dnd5e（MIT）：<https://github.com/foundryvtt/dnd5e>
- 5etools（仅作参考，不采用数据）：<https://5e.tools/>
