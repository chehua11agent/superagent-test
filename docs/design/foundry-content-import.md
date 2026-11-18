# Foundry dnd5e SRD 内容导入

> 状态：**第一批已落地**（法术 / 物品 / 怪物 + 角色背包/武器/护甲/法术书）。
> 目标：不引入 Foundry 运行时，把 `foundryvtt/dnd5e` 的 `packs/_source` 内容转成独立网页可用的数据，并逐步补规则。
> 更新：2026-11-18

## 1. 导入了什么

来源：[`foundryvtt/dnd5e`](https://github.com/foundryvtt/dnd5e) `6.1.x`，commit 记录在 `game/src/rules/content/manifest.js`。

| 内容 | 数量 | 文件 |
| --- | --- | --- |
| 法术（2014） | 319 | `game/src/rules/content/spells.js` |
| 物品（2014） | 885（含 277 武器、92 护甲/盾牌） | `game/src/rules/content/items.js` |
| 怪物（2014） | 340 | `game/src/rules/content/monsters.js` |
| 清单/许可 | — | `manifest.js`、`NOTICE.md` |

运行时**不依赖** Foundry、YAML 或网络：生成的是普通 ES 模块，浏览器和 Node 测试共用。

## 2. 数据形状

### 法术

```js
{
  id, foundryId, name, level, school, schoolName,
  activation, duration, range, target,
  components: { vocal, somatic, material, materials },
  properties, concentration, ritual,
  damage: [{ formula: '1d10', type: 'fire' }],
  description, source
}
```

### 物品

```js
{
  id, foundryId, name, kind: 'weapon'|'armor'|'equipment'|...,
  weight, priceGp, rarity, attunement, description, source,
  weapon: { category, mode, damage, versatile, properties, range, attackAbility },
  armor: { category, baseAc, dexCap, strength, stealthDisadvantage }
}
```

### 怪物

```js
{
  id, foundryId, name, creatureType, size, cr, crLabel,
  ac, hp: { max, formula }, speed,
  abilities, savingThrows, skills, senses, languages,
  resistances, immunities, vulnerabilities, conditionImmunities,
  traits: [{ name, description }],
  actions: [{ name, description, attack: { ability, toHit, range, damage } }],
  source
}
```

## 3. 已接入的规则

### 3.1 角色背包与装备

`createCharacter` 的 spec 新增（全部可选）：

```js
{
  inventory: ['longsword', 'chain-mail', 'shield', 'explorers-pack'],
  weapon: 'longsword',
  armorItem: 'chain-mail',
  shieldItem: 'shield',
  spells: ['bless', 'fire-bolt']
}
```

- `inventory`：解析成 `sheet.inventory.items`，并汇总重量/价值。
- `weapon`：解析成 `sheet.weapon`（伤害、属性、攻击属性、武器属性）。
- `armorItem` / `shieldItem`：用 Foundry 物品的 AC/敏捷上限/力量需求/隐匿劣势参与派生 AC；优先于旧的 `armor` 字段。
- `spells`：解析成 `sheet.spells` 与 `sheet.spellbook`（按环级分组）。
- 未知 id 抛 `CONTENT_UNKNOWN`。
- 序列化只保存这些 id；反序列化时重新解析，不把内容快照写进角色存档。

### 3.2 武器攻击

```js
import { resolveWeaponAttack, rollWeaponDamage } from './game/src/rules/index.js';

const { check, damage } = resolveWeaponAttack(character, {
  weaponId: 'longsword',
  targetAc: 15,
  proficient: true,
  rng
});
// check: 与 resolveCheck 相同的 d20 结果
// damage: 命中时 1d8+力量；暴击时 2d8+力量；未命中为 null
```

- 攻击检定仍走 `resolveCheck`（优势/劣势、状态、单词加值、自然 1/20）。
- 伤害公式支持 `NdM±K`；暴击只翻倍伤害骰，不翻倍加值。
- 默认加攻击属性调整值；可传 `addAbility: false` 关闭。
- 武器熟练仍由调用方传 `proficient`（职业武器类别尚未自动判定）。

### 3.3 内容浏览与实验台

`game/rules-lab.html` 新增第 4 个面板：

- 法术 / 物品 / 怪物三个页签，支持名称/描述搜索；
- 法术可加入/移出法术书；
- 物品可加入背包、装备为武器/护甲/盾牌；
- 怪物显示 CR、AC、HP、属性、动作与特性；
- 角色卡显示背包、法术书与当前武器；
- 攻击检定面板可选择武器，命中后直接掷伤害。

## 4. 转换器

`scripts/import-foundry-srd.py`（开发时工具，需要 Python 3 + PyYAML）：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/dnd5e.git /tmp/dnd5e
git -C /tmp/dnd5e sparse-checkout set packs/_source/races packs/_source/classes packs/_source/backgrounds \
  packs/_source/classfeatures packs/_source/spells packs/_source/items packs/_source/monsters
python3 scripts/import-foundry-srd.py --source /tmp/dnd5e
```

生成 `game/src/rules/content/*.js`。转换规则：

- HTML → 纯文本；`@UUID[...]`、`[[/attack]]` 等 Foundry 富文本标记清理；
- weapon 的 `simpleM/simpleR/martialM/martialR` → 类别/近战远程；
- armor 的 `light/medium/heavy/shield` → AC/敏捷上限/力量/隐匿劣势；
- 怪物 AC：优先 `attributes.ac.flat`；否则从已装备护甲/盾牌 + 敏捷计算；
- 怪物攻击：武器基础伤害 + 攻击属性调整 + 职业熟练加值（按 CR 表）；
- id 优先用 `system.identifier`，重复时加 `_id` 前 6 位，保证稳定可引用。

## 5. 授权与署名

- 系统代码：MIT（Foundry dnd5e）。
- SRD 5.1/5.2 内容：Wizards of the Coast，CC-BY-4.0。
- 本仓库做了中文化/结构化/裁剪以外的**英文化保留**：法术/物品/怪物名称与描述保留英文，未翻译；数值字段来自 SRD 内容。署名见 `game/src/rules/content/NOTICE.md` 与实验台页脚。
- 未使用 5etools 数据；未复制 Foundry 的运行时代码。

## 6. 已知缺口（下一步）

- **背景**：Foundry 2014 背景包只有 `acolyte`；本仓库仍用自己的 13 个背景。后续可合并 2024 `origins24` 或保持自研。
- **种族/职业**：Foundry 2014 种族包只有部分子种族（丘陵矮人、高等精灵、岩石侏儒、轻足半身人），不完整；本轮没有替换现有种族/职业数据，只导入内容层。后续可按 `advancement` 映射补齐。
- **武器双手伤害**：Foundry 源里部分武器（如基础长剑）缺少 `versatile` 数值；转换器不臆造，只保留源数据。魔法长剑等条目有 `1d10`。
- **法术施放**：目前是法术目录 + 法术书，不计算法术位、专注、法术效果；下一步加 slot table 与 `castSpell`。
- **怪物**：AC/HP/动作已结构化；传奇动作、施法、效果、充能等未完全机械化。
- **职业特性**：`packs/_source/classfeatures` 275 个文件已下载但尚未导入；下一步与职业等级/特性列表合并。
- **2024 内容**：当前只导入 2014 子集；`*24` 目录未导入，避免 2014/2024 规则混用。
- **中文**：内容名称/描述为英文；UI 标签为中文。后续可加 i18n 词典。

## 7. 为什么不是直接跑 Foundry

见 [`docs/research/foundry-dnd5e-assessment.md`](../research/foundry-dnd5e-assessment.md)：`Actor5e extends foundry.documents.Actor`、`D20Roll extends BasicRoll`、数据模型依赖 `foundry.data.fields`，`system.json` 要求 Foundry 14.367+。不引入 Foundry 的前提下，能安全复用的是**内容包 + 数据形状 + 公式**；运行时代码不能直接 `import`。

## 8. 测试

`tests/rules.test.mjs` 新增内容层测试：

- 法术/物品/怪物数量与已知条目；
- 筛选/搜索；
- 角色背包、重量/价值、武器、护甲 AC、法术书；
- Foundry 护甲参与 AC 与未受训惩罚；
- 武器伤害与暴击；
- 武器攻击命中/未命中；
- 未知内容 id；
- 内容 id 的序列化/反序列化。

总计 `npm test`：61 项通过（原有 25 + 规则核 36）。
