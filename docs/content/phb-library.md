# 5e《玩家手册》结构化录入与分类库

> 对象：D&D 5e（2014）《玩家手册》（PHB）的**结构化目录**，供后续建卡、查法术、查装备、查神祇与怪物时准确调用。
> 数据：`data/phb/`；校验：`node scripts/phb-validate.mjs`；查询：`node scripts/phb-query.mjs`。
> 本库**不收录 PHB 译文正文**，只保留名称、页码、分类、机械字段和由字段生成的摘要。原因见 §6。

## 1. 这是什么

- 一本书一个库：先完成 PHB，后续可平行扩展 DMG、MM、冒险模组。
- 一条记录一个稳定 `id`（如 `phb:spell:fireball`），`name_en` 是跨译名差异的稳定标识。
- 分类字段可直接检索：法术按环阶/学派/职业，装备按类别/伤害/AC，职业按子职业/特性等级。
- 机械字段用于规则计算；正文描述按版权要求留在私有文本包（§7），不进入公开仓库。
- 现有可玩原型与词表不需要改；本库是新的数据层，不改任何调用方。

## 2. 覆盖范围与数量

| 分类 | 数量 | 说明 |
|---|---:|---|
| 种族 | 9 | 矮人、精灵、半身人、人类、龙裔、侏儒、半精灵、半兽人、提夫林 |
| 亚种 | 10 | 9 个 PHB 亚种 + 1 个人类变体；亚种只存增量，父种族值在 `parent_values` |
| 职业 | 12 | 生命骰、豁免、熟练、起始装备、施法、职业表、特性列表 |
| 子职业 | 40 | 野蛮人 2、吟游诗人 2、牧师 7、德鲁伊 2、战士 3、武僧 3、圣武士 3、游侠 2、游荡者 3、术士 2、魔契师 3、法师 8 |
| 职业特性 | 487 | 职业特性 + 子职业特性 + 少量职业表占位（`is_placeholder`） |
| 背景 | 20 | 13 个核心背景 + 6 个变体 + 1 个自定义背景 |
| 专长 | 42 | 先决条件、属性加值、可结构化的熟练/法术等 |
| 法术 | 361 | 戏法 27；1–9 环 334；学派、职业表、施法时间、射程、成分、持续时间、豁免、伤害骰、区域 |
| 装备 | 259 | 武器、护甲、盾牌、冒险用品、工具、乐器、套组、坐骑、载具、贸易商品、食物、货币等 |
| 状态 | 15 | PHB 附录 A |
| 属性/技能/动作/语言 | 6 / 18 / 20 / 18 | 规则检索用；语言含标准、异族、秘密语言 |
| 神祇 | 195 | 9 个神系：被遗忘的国度、灰鹰、龙枪、艾伯伦、非人类、凯尔特、埃及、希腊、北欧 |
| 位面 | 31 | 主位面、过渡位面、内层、外层、半位面；名称/分类/阵营/一句说明 |
| 野兽与魔宠 | 15 | PHB 附录 D 的 15 种生物；AC、HP、速度、六维、CR、动作要点 |

合计 **1,558 条**记录（含规则子类）。数量由 `scripts/phb-validate.mjs` 硬校验；不是“抽样”。

## 3. 文件结构

```text
data/phb/
  manifest.json         # 版本、来源、版权口径、计数、逐文件 SHA-256
  taxonomy.json         # 分类树与各类计数（给前端/查询用）
  races.json            # race + subrace
  classes.json          # 12 个职业
  subclasses.json       # 40 个子职业
  class-features.json   # 487 条职业/子职业特性
  backgrounds.json      # 13 核心 + 6 变体 + 1 自定义
  feats.json            # 42 个专长
  spells.json           # 361 个法术
  equipment.json        # 259 件装备/物品
  conditions.json       # 15 个状态
  rules.json            # abilities / skills / actions / languages
  deities.json          # 195 位神祇
  planes.json           # 31 个位面
  monsters.json         # 15 种附录 D 生物
```

记录公共字段：

```json
{
  "id": "phb:spell:fireball",
  "type": "spell",
  "name": "火球术",
  "name_en": "Fireball",
  "source": { "book": "PHB", "page": 241, "srd": true },
  "brief": "3 环 · 塑能 · 1 动作 · 150 尺 · V · S · M · 瞬时 · 敏捷豁免 · 8d6 火焰 · 球状"
}
```

- `id`：稳定主键，格式 `phb:<type>:<slug>`；不含中文，改译名不影响主键。
- `name`：5etools 中文镜像译名；`name_en`：英文原名，作为跨译名基准。
- `source.page`：**英文原版 PHB 页码**，不是 288 页民间汉化 PDF 的书页（§6.3）。
- `source.srd`：该条是否在 SRD 5.1 范围内；只作版权标记，不表示本库只收 SRD。
- `brief`：由结构化字段生成的一行机械摘要，不是原文摘录。

分类特有字段（节选）：

| 类型 | 关键字段 |
|---|---|
| `spell` | `level`、`school`/`school_zh`、`classes`/`class_names`、`casting_time`、`range`、`components`、`duration`、`concentration`、`saving_throw`、`damage.dice`、`damage.types`、`damage.scaling`、`area`、`targets`、`ritual` |
| `class` | `hit_die`、`saving_throws`、`proficiencies`、`starting_equipment`、`multiclassing`、`spellcasting`、`tables`（5etools 的额外数值表，如法术位/狂暴次数；等级/熟练加值/特性见 `features` 的 `level`）、`features`、`subclasses` |
| `subclass` | `class`、`features`、`short_name` |
| `class-feature` | `class`、`subclass`、`level`、`is_placeholder` |
| `race`/`subrace` | `size`、`speed`、`darkvision_ft`、`ability`/`ability_bonuses`、`languages`、`resistances`、`traits`、技能/武器/护甲/工具熟练、`subraces` / `parent_race`、`parent_values`、`ability_replaces_parent` |
| `background` | `skill_proficiencies`、`tool_proficiencies`、`language_proficiencies`、`equipment`、`feature`、`is_variant`、`variant_of` |
| `feat` | `prerequisite`、`ability`、`grants`（属性、熟练、法术、战技等 5etools 可结构化部分） |
| `item` | `category`、`subtype`、`damage`、`range`、`armor_class`、`strength`、`stealth_disadvantage`、`properties`、`weight_lb`、`cost_cp`/`cost_gp`、`pack_contents` |
| `deity` | `pantheon`、`alignment`、`domains`、`province`、`symbol` |
| `monster` | `size`、`creature_type`、`alignment`、`armor_class`、`hit_points`、`speed`、`abilities`、`skills`、`senses`、`challenge_rating`、`actions`（含命中/伤害/豁免 DC） |

## 4. 分类树

`taxonomy.json` 的六组：

```text
角色创建：race, subrace, class, subclass, class-feature, background, feat
规则参考：ability, skill, action, condition, language
魔法：spell
装备：item
世界：deity, plane
生物：monster
```

法术另有三个横切维度：`level`（0–9）、`school`（8 学派）、`classes`（12 职业中的施法职业）。
装备的 `category`：`weapon`、`armor`、`shield`、`pack`、`gear`、`tool`、`gaming-set`、`focus`、`mount`、`vehicle`、`tack`、`trade-good`、`food-drink`、`currency`。

## 5. 查询与校验

```bash
# 法师 1 环法术
node scripts/phb-query.mjs --type spell --class wizard --level 1

# 塑能学派中含“火”的法术
node scripts/phb-query.mjs --type spell --school 塑能 --search 火

# 武器里的剑
node scripts/phb-query.mjs --type item --category weapon --search 剑

# 法师职业及其子职业
node scripts/phb-query.mjs --type class --search 法师 --json
node scripts/phb-query.mjs --type subclass --class wizard --all

# 只看计数
node scripts/phb-query.mjs --stats

# 全量结构校验
node scripts/phb-validate.mjs
node --test tests/phb.test.mjs
```

查询工具和校验器都是纯 ESM、无依赖；`loadLibrary()` / `queryEntries()` 也可在 Node 脚本或前端构建期直接 import。

## 6. 来源、页码与版权

### 6.1 来源

- 结构化数据快照：`5e.kiwee.top`（5etools 非官方中文镜像），2026-11-15 抓取；中文译名由“不全书”汉化组提供。
- 英文名、页码、SRD 标记来自 5etools 数据；PHB 2014 共 320 页（英文原版）。
- 原始快照含完整译文，**不提交仓库**；仓库只提交本目录的派生结构化数据。
- 每个文件的 SHA-256 在 `manifest.json`；源快照的抓取地址与日期也在 manifest 中。
- 少量明显笔误按 PHB 修正（例如 5etools 把 Attack 动作写成“1 分钟”，本库改为“1 动作”）；其余保留镜像字段。

### 6.2 版权口径

- 本库不复制 PHB 译文正文、表格文本或法术/专长描述；只保留名称、页码、分类、规则机械值与生成式摘要。
- 中文名是短标题，来自 5etools 镜像（CC BY-NC-SA 4.0，非官方、非商用）；本项目公开仓库为非商用测试仓库。
- 若后续商用：替换为 SRD 5.1 / 官方授权译名，或取得译名与数据的授权；机械值本身可按 SRD 5.1（CC BY 4.0）重建。
- 不把任何私有正文、用户上传 PDF 或未授权译文写进 `data/phb/`。

### 6.3 页码基准（重要）

- 本库 `page` = **英文原版 PHB 页码**，5etools 的 `page` 字段。
- 本项目此前的《玩家手册》复盘用的是 288 页民间汉化 PDF 的**书页**；该书 `PDF 页 = 书页 + 3`，与英文原版页码**不能直接互换**。
- 例：火球术在本库是 p.241（英文原版）；在 288 页汉化 PDF 里应按汉化版自身页码查找，不能拿 241 去翻。引用时请注明“英文原版页码”。
- PHB 附录 D 的 15 种生物在英文原版 p.304–311；5etools 只有 MM 页码，因此本库对 `monster.source.page` 置 `null`，并在 `note` 说明。

## 7. 私有正文包（可选）

公开库不含描述。若需要“完整正文”调用，在**不提交**的 `data/phb-private/text.json` 放：

```json
{
  "phb:spell:fireball": { "text": "……" },
  "phb:feat:actor": { "text": "……" }
}
```

```bash
node scripts/phb-query.mjs --type spell --search 火球 --with-text
```

`scripts/phb-query.mjs` 只在显式 `--with-text` 时合并；`phb-validate.mjs` 不读取该文件；`.gitignore` 已忽略 `data/phb-private/`。
这样“结构公开、正文私有”，既有完整调用能力，又不把译文带进公开仓库。

## 8. 已知边界

- **没有正文**：法术效果、专长效果、职业特性效果、背景特性、状态效果、神祇/位面描述都不在公开库；需要时走 §7 私有正文包。
- **专长只部分结构化**：5etools 对 42 个专长只编码了属性、先决条件、少量熟练/法术/战技；大量效果在描述文本里，`grants` 为空不代表专长没有效果。
- **怪物动作是“要点”**：从 5etools 动作文本提取命中、伤害骰、豁免 DC、触及/射程；多段伤害（如毒蛇的 1 穿刺 + 2d4 毒素）拆到 `actions[].parts`（每段平均值/骰子/类型/豁免 DC），聚合字段同时保留。完整动作描述仍需正文包。
- **职业特性含表驱动条目**：如战斗大师的“额外战技/额外卓越骰”按 5etools 的特性条目入库，数量会多于“正文小标题数”；`is_placeholder` 标出纯占位。
- **亚种是增量**：`ability`/`speed`/`darkvision_ft`/`resistances`/熟练为空表示继承父种族；父值在 `parent_values`，调用方需合并（`brief` 已给出合并后的可读摘要）。变体人类是例外：`ability_replaces_parent: true`，其属性替换而非叠加父种族。
- **译名不统一**：5etools/不全书译名与项目既有 150 词词表可能不同（如 Acrobatics：5etools“特技”、词表“杂技”）。用 `name_en` 作为稳定键；需要项目统一译名时在展示层映射。
- **不含 DMG/MM 内容**：魔法物品、怪物图鉴、魔法物品表、变体规则不在本库；后续按同一 schema 平行扩展。
- **不含 2024 版**：本库只收 2014 PHB；5etools 镜像同时含 2024 条目，已在入库时按 `source === "PHB"` 过滤。
- **不含饰品 d100 表**：100 条饰品是成段创作文本，公开库不复制；需要时进私有正文包。
- **不含背景的性格/理想/牵绊/缺点表**：这些是成段创作文本，公开库只存背景的技能/语言/装备/特性名。

## 9. 复现与扩展

```bash
# 1) 取源快照（不提交）
mkdir -p source/spells source/class source/bestiary
# 需要：spells/spells-phb.json、spells/sources.json、races.json、backgrounds.json、
#       feats.json、items-base.json、items.json、conditionsdiseases.json、
#       deities.json、languages.json、skills.json、actions.json、
#       class/class-*.json、bestiary/bestiary-mm.json

# 2) 生成 data/phb/
PHB_SOURCE_DIR=./source node scripts/phb-ingest.mjs

# 3) 校验 + 测试
node scripts/phb-validate.mjs
node --test tests/phb.test.mjs
```

扩展下一本书时，复制 `scripts/phb-ingest.mjs` 的 builder 模式，新增 `data/dmg/`、`data/mm/` 与对应 `taxonomy` 组；不同书共享 `source`、`brief`、`id` 约定，调用方可以按 `source.book` 过滤。

## 10. 本次校验

- `phb-validate.mjs` 通过：1,558 条、17 类、跨引用全解析、无 `{@...}` 标签残留、无超长正文字段。
- `phb.test.mjs` 12 项全过：计数、火球术、法师子职业、种族熟练与变体人类、亚种增量、背景变体、装备、怪物动作、查询过滤、无正文泄漏。
- 页码区间抽查：种族 18–42、职业 46–112、子职业 49–119、背景 126–141、专长 165–170、法术 211–289、状态 290–292、神祇 294–299；均在 PHB 2014 范围内。
- 与 PHB 目录对照：9 种族 / 12 职业 / 40 子职业 / 13 核心背景 / 42 专长 / 15 状态 / 15 附录 D 生物 / 361 法术。
