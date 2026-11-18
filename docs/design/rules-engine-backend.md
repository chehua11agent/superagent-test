# 5e 规则后端：捏人与数值修正

> 状态：**原型已落地**（纯规则核 + 一个可运行的实验台）。
> 范围：角色创建（种族/职业/背景/属性/技能）、派生数值、状态与情境修正、d20 检定、单词加值钩子。
> 不包含：法术位/施法效果、专长、多职业、完整战斗/休息流程、服务端 API。见文末“边界”；Foundry 内容导入见 [`foundry-content-import.md`](foundry-content-import.md)。
> 更新：2026-11-18

## 1. 这次要解决什么

用户在飞书里指出三件事：

1. 没有**捏人**（角色创建）系统；
2. 种族数值没有实现；
3. 数值**基于各种情况的修正**没有实现；
4. 先写后端，不要先管画面；顺便查一下有没有现成系统。

因此这一版的交付物是“规则核”，不是正式游戏的界面：

```text
浏览器 / Node / 未来的服务端
        │
        ▼
game/src/rules/                 ← 纯 ES 模块，零依赖
  ├─ data/                      ← SRD 5.1 数据子集（种族/职业/背景/状态/护甲）
  ├─ abilities.js               ← 属性、调整值、熟练加值、购点/标准数组/4d6
  ├─ skills.js                  ← 18 项技能
  ├─ character.js               ← spec（构建输入）→ sheet（派生角色卡）
  ├─ modifiers.js               ← 修正层、优势/劣势结算
  ├─ conditions.js              ← 14 种状态 + 力竭 1–6 级
  ├─ checks.js                  ← d20 检定、被动检定、成功率
  ├─ word-bonus.js              ← SRS 熟练 → 单词加值（0–3）
  └─ rules.js                   ← SRD 规则集 + 房规数据注入
        │
        ▼
game/rules-lab.html + js/css    ← 开发用实验台（可打开、可掷骰、可导出 JSON）
```

**“后端”在这里定义为规则/领域层**：它不碰 DOM，不依赖 localStorage，浏览器与 Node 测试共用同一份代码；以后要加 Node 服务端，直接 import 即可。没有为了“后端”先引入一个当前项目并不存在的服务端进程。

## 2. 核心模型：spec 与 sheet

规则核把“角色”拆成两层：

- **spec**：构建输入，可序列化。包含名字、等级、种族/子种族、职业、背景、基础属性、自选技能、专长、护甲、状态、力竭、临时效果等。
- **sheet**：派生结果，每次从 spec 重算。包含最终属性、调整值、AC、HP、速度、先验、豁免、18 项技能、被动感知、施法 DC、熟练、特性、抗性、防御面板等。

```js
import { createCharacter, resolveCheck, wordBonusFromMemory } from './game/src/rules/index.js';

const { spec, sheet } = createCharacter({
  name: '石祷者',
  level: 1,
  race: 'dwarf',
  subrace: 'hill-dwarf',
  class: 'cleric',
  background: 'acolyte',
  abilityMethod: 'point-buy',
  baseAbilities: { str: 12, dex: 14, con: 13, int: 10, wis: 15, cha: 8 },
  extraLanguages: ['兽人语', '龙语'],
  skillChoices: ['history', 'medicine'],
  armor: 'scale-mail',
  shield: true,
  conditions: ['poisoned']
});

console.log(sheet.armorClass);        // 18
console.log(sheet.abilityScores.wis); // 16（基础 15 + 丘陵矮人 +1）
console.log(sheet.skills.medicine.total); // 5

const result = resolveCheck({ spec, sheet }, {
  kind: 'skill',
  skill: 'perception',
  dc: 15,
  wordBonus: wordBonusFromMemory({ stage: 2, spelling: { stage: 1 } }) // +1
});
console.log(result.formula);
// 1d20(4) + 3（感知） + 1（单词·认识） = 8 vs DC 15 → 失败
```

关键约束：

- **派生值不是真相**。基础属性、装备、状态是真相；AC/HP/技能加值全部重算，不把 buff 写回基础值。
- **所有修正带来源**。检定结果会拆成“属性 / 熟练 / 专精 / 情境 / 单词 / 状态 / 种族”逐项展示。
- **可序列化**。`serializeCharacter()` 只保存 spec；`deserializeCharacter()` 重新计算 sheet，旧存档升级只需迁移 spec。

## 3. 捏人：支持到什么程度

| 维度 | 已实现 |
| --- | --- |
| 属性生成 | 27 点购点、标准数组 15/14/13/12/10/8、4d6 去最低、自由填写 3–18 |
| 种族 | SRD 9 个种族 + 子种族（丘陵/山地矮人、高等/木/卓尔精灵、轻足/壮实半身人、森林/岩石侏儒） |
| 种族数值 | 属性加值（含半精灵自选 +1×2）、速度、体型、黑暗视觉、语言、技能/武器/护甲熟练、抗性、对抗特定效果的豁免优势、每级 HP、半身人幸运、龙裔血统选择 |
| 职业 | SRD 12 个职业的 1 级机械数据：生命骰、豁免熟练、技能选择、护甲/武器/工具熟练、施法属性、无甲防御（野蛮人/武僧）、专精（游荡者 1 级） |
| 背景 | SRD 13 个背景：固定技能、工具、语言数量、叙事特性 |
| 语言 | 自动语言 + 可选的额外语言（数量按种族/背景校验） |
| 装备 | SRD 12 种护甲 + 无甲 + 盾牌：AC 公式、敏捷上限、力量需求、隐匿劣势、未受训惩罚；另可装备 Foundry 物品（AC/敏捷上限/力量/隐匿） |
| Foundry 内容 | 319 法术 / 885 物品（277 武器、92 护甲）/ 340 怪物；背包、武器伤害、法术书、内容浏览 |
| 状态 | 14 种状态 + 力竭 1–6 级 |
| 临时效果 | 任意 `{target, type, value}` 修正；内置祝福/护盾术/指引三个示例 |
| 房规 | `buildRules({ races, classes, backgrounds, conditions, armor })` 覆盖或追加；种族/职业/背景也可以直接传对象 |
| 序列化 | 版本化 JSON，只存 spec |

“自由”是刻意保留的：内置 SRD 只是默认数据；自定义种族、职业、背景可以走同一套校验和派生流程。实验台里的“月族”就是一个用 30 行数据加进规则集的示例。

## 4. 修正层：数值如何“基于情况变化”

一条修正的形状：

```js
{ source: 'cover', label: '半掩体', target: 'attack', type: 'flat', value: 2 }
{ source: 'help',  label: '协助',   target: 'skill.stealth', type: 'advantage' }
{ source: 'poisoned', label: '中毒', target: 'abilityCheck', type: 'disadvantage' }
```

`target` 可以是：

- 通用：`all`（只作用于检定）、`abilityCheck`、`abilityCheck.dex`、`skill.stealth`、`save`、`save.dex`、`attack`、`initiative`；
- 派生：`ac`、`speed`、`hpMax`。

结算顺序：

1. 基础值（属性调整值 / 基础 AC / 种族速度）；
2. 熟练与专精（专精 = 2×熟练，不是“再加一次熟练”）；
3. 所有 flat 修正求和；
4. 优势/劣势：多个优势不叠加、多个劣势不叠加，同时存在则抵消为普通掷骰；
5. 自然 1/20 规则：只有攻击有“自然 1 必失手、自然 20 必命中并暴击”；属性检定与豁免没有自动成功/失败。

已接入的“情况”：

- **状态**：中毒（攻击/属性检定劣势）、束缚（敏捷豁免劣势）、麻痹/昏迷（力量/敏捷豁免自动失败）、目盲（需要视觉的检定自动失败）、隐形（攻击优势）、倒地（近战/远程攻防差异）等；
- **力竭**：1 级检定劣势、2 级速度减半、3 级攻击/豁免劣势、4 级 HP 上限减半、5 级速度 0、6 级死亡；
- **环境/情境**：协助（优势）、半掩体 +2、四分之三掩体 +5、DM 裁定的临时加值/劣势；
- **种族/装备**：丘陵矮人每级 +1 HP、半身人自然 1 重投、未受训护甲的力量/敏捷检定、豁免与攻击劣势、厚重护甲的隐匿劣势、重甲力量不足速度 −10；
- **法术/临时效果**：任意 flat 修正可以挂到 AC、攻击、豁免、技能等目标上。

## 5. d20 检定与“单词只提高概率”

`resolveCheck()` 返回可直接渲染的完整结果：

```js
{
  natural: 12,
  total: 19,
  dc: 15,
  success: true,
  margin: 4,
  mode: 'disadvantage',
  advantageSources: [...],
  disadvantageSources: [{ source: 'condition:poisoned', label: '中毒' }],
  autoFail: false,
  breakdown: [
    { key: 'ability', label: '敏捷', value: 2 },
    { key: 'proficiency', label: '熟练', value: 2 },
    { key: 'word', label: '单词·熟练', value: 2 }
  ],
  formula: '1d20(12) + 2（敏捷） + 2（熟练） + 2（单词·熟练） = 18 vs DC 15 → 成功',
  rolls: [12],
  luckReroll: false
}
```

单词机制只通过一个数字进入规则核：

```js
wordBonusFromMemory({ stage, spelling: { stage } })
// 认义 0/1/2/3 → 0/1/1/2；拼写 ≥2 再 +1；上限 +3
```

- 规则核不依赖 SRS 的实现，只消费 0–3 的加值；SRS 的 1/3/7/16 天排期保持不变。
- `checkOdds()` 穷举 d20（优势/劣势穷举 400 种组合），让“单词每 +1 到底提高多少成功率”可量化；实验台实时显示 +0/+1/+2/+3 的成功率条。
- 即使 +3，也不会自动成功：DC 高于“20 + 全部加值”时仍会失败。这满足“单词提升成功概率，但不完全决定结果”。

默认曲线（0/1/1/2 + 拼写 1，上限 3）是**占位设计**，需要试玩后调整；可以只改 `word-bonus.js` 的常量，不影响角色/检定逻辑。

## 6. 怎么跑、怎么验证

```bash
npm test                 # 61 个测试：SRS/内容/集成 + 36 个规则核测试
npm run serve            # http://127.0.0.1:4173/rules-lab.html
```

规则测试覆盖：属性调整值、熟练分段、购点预算、标准数组、种族/子种族叠加、半精灵自选、自定义种族、技能/专精、AC/力量需求/未受训、HP、无甲防御、状态与力竭、优势抵消、自然 1/20、半身人幸运、种族豁免优势、被动检定、单词概率、序列化、非法输入；以及 Foundry 内容层（法术/物品/怪物、背包、武器伤害、护甲 AC、内容搜索）。

## 7. 与现有游戏的关系

当前 `game/` 的玩家流程（复习 → 剧情 → 词卡战斗 → BOSS）**没有改**；这一版是并行落地的规则核 + 实验台。

下一步接入时，建议按这个顺序：

1. **先确定产品口径**：现有原型是“100 HP + fail-forward 的叙事跑团”，5e 是“10 左右 HP + 命中/伤害/法术位”。两者可以混合，但不能默认混；需要拍板（见第 9 节）。
2. **把角色 spec 接进存档**：`save.character = serializeCharacter(character)`；迁移旧存档时给默认角色。
3. **把词行动/战斗的“拼写检定”改为 `resolveCheck()`**：DC 由场景给，单词加值来自该词的 SRS 状态；失败仍走 fail-forward 代价，不照搬 5e 的“掉 0 HP”。
4. **接入装备/武器/伤害**：武器、护甲、背包与 `resolveWeaponAttack()` 已接入 Foundry 内容层；下一步补武器熟练的自动判定、双手/远程细节与更多物品效果。
5. **服务端权威**：规则核是纯函数，可直接被 Node API 调用；届时把 SRS、角色、检定日志放服务端，客户端只渲染。

## 8. 边界（诚实说明）

- 有法术目录/法术书（319 个），但没有法术位、专注消耗与法术效果结算；施法仍只算 DC 与攻击加值。
- 没有专长、多职业、种族变体（如变体人类）、背景个性表。
- 有 Foundry 物品背包与武器伤害；但没有完整负重/容器/消耗品充能/休息/死亡豁免。
- Foundry 2014 背景/子种族包不完整；现有 13 背景与 9 种族仍以本仓库手写 SRD 数据为准。
- 武器熟练目前由调用方传 `proficient`；职业武器类别尚未自动判定。
- 武器熟练目前不自动判定：攻击检定的 `proficient` 由调用方传入（实验台有“武器熟练”勾选）。
- 工具熟练只展示，不参与检定；部分种族特性（石工慧眼、阳光敏感、龙裔吐息、半兽人野蛮攻击）只记录文本，尚未机械化。
- 技能选择要求“选满且不与背景/种族重复”；5e 允许重复时换一个技能，这里用明确报错代替。
- 专精只实现 1 级游荡者；游荡者 6 级、吟游诗人 3 级的额外专精未实现。
- 规则核是客户端可执行的纯 JS；正式版仍需服务端权威结算（见 `docs/research/5e-rules-engine-survey.md` 的结论）。

## 9. 需要拍板的产品问题

1. **单词加值曲线**：默认 +0/1/1/2，拼写再 +1，上限 +3。是否改成“熟练时给优势”或更低/更高？
2. **HP 采用哪套**：5e 真实 HP（1 级 7–12）会显著改变现有 100 HP 的叙事节奏；是“5e 捏人 + 现有 HP 叙事”，还是全面 5e 化？
3. **属性生成默认值**：正式游戏用标准数组（稳定、可教学）还是购点（更自由）？
4. **种族/职业范围**：首发只要 SRD 9 种族/12 职业，还是允许自定义种族作为卖点？
5. **等级上限**：原型只做到 1 级机械数据；正式版是否按 1–5 级做一章？

## 10. 参考

- SRD 5.1（CC-BY-4.0）：https://www.dndbeyond.com/srd
- Creative Commons BY 4.0：https://creativecommons.org/licenses/by/4.0/
- 现成系统调研：`docs/research/5e-rules-engine-survey.md`
- 现有玩法设计：`docs/design/cet4-vocab-rpg.md`、`docs/design/dual-check-design.md`、`docs/design/story-card-combat-design.md`
