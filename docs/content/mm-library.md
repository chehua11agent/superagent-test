# 5e《怪物图鉴》结构化录入与分类库

> 对象：D&D 5e（2014）《怪物图鉴》（Monster Manual，MM）的**结构化目录与分类库**，供建遭遇、查怪物、按类型/CR/环境/族群筛选时准确调用。
> 数据：`data/mm/`；校验：`node scripts/mm-validate.mjs`；查询：`node scripts/mm-query.mjs`。
> 本库**不收录 MM 译文正文**，只保留名称、页码、分类、规则机械值与由字段生成的摘要。原因见 §6。

## 1. 这是什么

- 一本书一个库：PHB 库之外，MM 单独成库；后续可平行扩展 DMG、冒险模组。
- 一条怪物一个稳定 `id`（如 `mm:monster:adult-red-dragon`），`name_en` 是跨译名差异的稳定标识。
- 分类字段可直接检索：生物类型、体型、挑战等级段、栖息环境、怪物族群、传奇/施法/变形/反应等特性。
- 机械字段用于规则计算：AC、HP、速度、六维、豁免、技能、抗性/免疫/易伤、感官、语言、CR、动作命中/豁免/射程/伤害骰与类型。
- 本库是新的数据层，不改现有可玩原型与词表的任何调用方。

## 2. 覆盖范围与数量

| 维度 | 数量 | 说明 |
|---|---:|---|
| 怪物 | 450 | 5e 2014 MM 的 5etools 条目，含变体与同名变体（如吸血鬼施法者/战士、三种纳迦、三种蛇人混血） |
| 生物类型 | 14 | 异怪、野兽、天界生物、构装体、龙、元素、妖精、邪魔、巨人、类人生物、怪物、泥怪、植物、亡灵 |
| 体型 | 6 | 微型 37、小型 30、中型 196、大型 133、巨型 39、超巨型 15 |
| 挑战等级段 | 5 | CR 0–4（293）、5–10（96）、11–16（36）、17–20（12）、21+（13） |
| 栖息环境 | 11 + 未标注 | 极地、海岸、沙漠、森林、草原、丘陵、山地、沼泽、幽暗地域、水下、城市；85 条源数据未标注 |
| 怪物族群 | 10 | 色彩龙、金属龙、恐龙、魔冢、兽化人、巨灵、被活化的物件、眼魔、天使、斯芬克斯 |
| 传奇动作 | 37 | 有 `legendaryActions` 的条目 |
| 有巢穴 CR | 5 | 源数据在 `cr` 中带 `lair` 值：眼魔、死亡暴君、半巫妖、巫妖、木乃伊领主 |
| 施法者 | 83 | 有 `spellcasting` 数据块 |
| 变形生物 | 23 | `traitTags` 含 `Shapechanger` |
| 有反应动作 | 18 | 有 `reaction` 数据块 |

动作层面：1,181 条普通动作、111 条传奇动作、18 条反应动作、87 个施法数据块、744 条特质。数量由 `scripts/mm-validate.mjs` 硬校验；不是抽样。

## 3. 文件结构

```text
data/mm/
  manifest.json     # 版本、来源、版权口径、计数、逐文件 SHA-256
  taxonomy.json     # 七组分类树 + 六个维度的 id 索引 + 计数
  monsters.json     # 450 条怪物记录
```

记录公共字段：

```json
{
  "id": "mm:monster:adult-red-dragon",
  "type": "monster",
  "name": "成年红龙",
  "name_en": "Adult Red Dragon",
  "size": ["巨型"],
  "size_codes": ["huge"],
  "creature_type": "龙",
  "creature_type_code": "dragon",
  "alignment": "混乱邪恶",
  "armor_class": 19,
  "hit_points": 256,
  "challenge_rating": "17",
  "challenge_rating_numeric": 17,
  "challenge_rating_lair": null,
  "cr_tier": "cr-17-20",
  "environment": ["山地", "丘陵"],
  "environment_codes": ["mountain", "hill"],
  "group": ["色彩龙"],
  "group_codes": ["chromatic-dragon"],
  "source": { "book": "MM", "page": 98, "srd": true },
  "brief": "巨型 龙 · AC 19 · HP 256 · CR 17 · 山地/丘陵"
}
```

- `id`：稳定主键，格式 `mm:monster:<slug>`；不含中文，改译名不影响主键。
- `name`：5etools 中文镜像译名；`name_en`：英文原名，跨译名基准。
- `source.page`：**英文原版 MM 页码**，不是民间汉化 PDF 的书页。
- `source.srd`：是否在 SRD 5.1 范围内；只作版权标记，不表示本库只收 SRD。
- `brief`：由结构化字段生成的一行机械摘要，不是原文摘录。

分类与特性字段（节选）：

| 字段 | 说明 |
|---|---|
| `creature_type_code` / `creature_type` | 14 类生物类型代码/中文 |
| `creature_tags` | 源数据的类型标签，如「类地精」「任意种族」「泰坦」 |
| `size_codes` / `size` | 体型代码/中文 |
| `alignment_codes` / `alignment` | 阵营代码/中文；随机阵营会写成「50% 中立善良 / 50% 中立邪恶」 |
| `alignment_options` | 随机阵营的概率拆分（`alignment` + `chance`），非随机阵营为 null |
| `environment_codes` / `environment` | 5etools 环境标签；为空时分类归入「未标注」 |
| `group_codes` / `group` | 怪物族群代码/中文 |
| `trait_tags` | 源数据的英文特质标签，如 `Shapechanger`、`Magic Resistance`、`Legendary Resistances` |
| `is_legendary` / `is_spellcaster` / `is_shapechanger` / `has_reactions` / `has_lair` | 特性布尔标记 |
| `armor_class_variants` | 多形态 AC（如狼人），含 `value` / `from` / `condition` |
| `damage_*_details` | 带条件或注记的抗性/免疫/易伤（如「非银质武器且非魔法攻击」） |

动作字段：

```json
{
  "name": "啃咬",
  "name_en": "Bite",
  "attack": "近战武器",
  "attack_codes": ["mw"],
  "to_hit": 14,
  "save_dc": null,
  "save_ability": null,
  "reach_ft": 10,
  "range": null,
  "recharge": null,
  "uses": null,
  "legendary_cost": null,
  "damage_dice": ["2d10 + 8", "2d6"],
  "average_damage": [19, 7],
  "damage_types": ["穿刺", "火焰"],
  "parts": [
    { "damage_dice": "2d10 + 8", "average_damage": 19, "damage_type": "穿刺", "save_dc": null },
    { "damage_dice": "2d6", "average_damage": 7, "damage_type": "火焰", "save_dc": null }
  ]
}
```

- `attack`：`近战武器`、`远程武器`、`近战法术`、`远程法术`；多选时用「、」连接。
- `recharge`：`{ "min": 5, "max": 6, "label": "5-6" }`；`uses`：`{ "per_day": 3 }`。
- `damage_dice` / `average_damage` 按出现顺序一一对应；同一动作中重复的骰式会保留，用于「两次相同伤害」或「两种类型同骰」。
- `parts` 保留每段伤害的骰式、平均值、类型；`damage_types` 是去重后的类型集合。
- 选择型伤害（如至高天的「以下一种类型」）在对应 part 的 `damage_type_options` 中列出可选类型，`damage_types` 汇总这些选项。
- 传奇动作的 `legendary_cost` 为动作消耗（默认 1）。

施法数据块：

```json
{
  "name": "施法",
  "name_en": "Spellcasting",
  "ability": "智力",
  "save_dc": 20,
  "to_hit": 12,
  "caster_level": 18,
  "at_will": [],
  "daily": {},
  "levels": {
    "9": { "slots": 1, "spells": ["律令死亡"] }
  },
  "spell_count": 26
}
```

## 4. 分类树

`taxonomy.json` 的七组：

```text
图鉴总览：monster
生物类型：aberration, beast, celestial, construct, dragon, elemental, fey, fiend,
          giant, humanoid, monstrosity, ooze, plant, undead
体型：tiny, small, medium, large, huge, gargantuan
挑战等级：cr-0-4, cr-5-10, cr-11-16, cr-17-20, cr-21-plus
栖息环境：arctic, coastal, desert, forest, grassland, hill, mountain, swamp,
          underdark, underwater, urban, unmarked
怪物族群：chromatic-dragon, metallic-dragon, dinosaur, modron, lycanthrope,
          genie, animated-object, beholder, angel, sphinx
特性：legendary, lair, spellcaster, shapechanger, reactions
```

`taxonomy.indexes` 提供六个维度的 `分类 id -> 怪物 id 数组`，可直接给前端/查询工具做分面筛选；`taxonomy.counts` 提供各维度计数。

## 5. 查询与校验

```bash
# 17 CR 以上的龙
node scripts/mm-query.mjs --type dragon --cr-min 17

# 幽暗地域的中型怪物
node scripts/mm-query.mjs --environment 幽暗地域 --size 中型

# 色彩龙里的传奇怪物
node scripts/mm-query.mjs --group 色彩龙 --legendary

# 施法者，搜索带“火”的怪物/动作/法术
node scripts/mm-query.mjs --spellcaster --search 火

# 输出 JSON（含完整记录）
node scripts/mm-query.mjs --type undead --json --all

# 分类统计
node scripts/mm-query.mjs --stats

# 全量结构校验
node scripts/mm-validate.mjs
node --test tests/mm.test.mjs
```

查询工具和校验器都是纯 ESM、无依赖；`loadLibrary()` / `queryEntries()` 也可在 Node 脚本或前端构建期直接 import。

私有正文包（不提交）：

```json
// data/mm-private/text.json
{
  "mm:monster:adult-red-dragon": {
    "text": "如已获授权的正文……"
  }
}
```

```bash
node scripts/mm-query.mjs --type dragon --with-text --json
```

## 6. 来源、页码与版权

### 6.1 来源

- 结构化数据快照：`5e.kiwee.top`（5etools 非官方中文镜像），2026-11-15 抓取；中文译名由“不全书”汉化组提供。
- 英文名、页码、SRD 标记来自 5etools 数据；MM 2014 英文原版页码范围 12–350。
- 原始快照含完整译文，**不提交仓库**；仓库只提交本目录的派生结构化数据。
- 每个文件的 SHA-256 在 `manifest.json`；源快照的抓取地址与日期也在 manifest 中。
- 少量明显笔误按 MM 修正；伤害类型「暗蚀」统一写作「黯蚀」，射程单位「英尺」统一写作「尺」。其余保留镜像字段。

### 6.2 版权口径

- 本库不复制 MM 译文正文、特质/动作描述或表格文本；只保留名称、页码、分类、规则机械值与生成式摘要。
- 中文名是短标题，来自 5etools 镜像（CC BY-NC-SA 4.0，非官方、非商用）；本项目公开仓库为非商用测试仓库。
- 若后续商用：替换为 SRD 5.1 / 官方授权译名，或取得译名与数据的授权；机械值本身可按 SRD 5.1（CC BY 4.0）重建。
- 不把任何私有正文、用户上传 PDF 或未授权译文写进 `data/mm/`。

### 6.3 页码基准

`source.page` 是英文原版 MM 页码，不是民间汉化 PDF 的书页。转引时把「英文原版页码」和「汉化版书页」分开标注，不要互换。

## 7. 已知边界

- **不是规则全书**：不收录怪物描述、特质正文、动作正文、巢穴动作、区域效应与背景故事；这些需要授权的私有文本包或 SRD 文本。
- **环境标签是 5etools 分类**：不是 MM 书内「Monsters by Environment」的完整人工索引；85 条源数据没有 `environment` 字段，归入「未标注」。
- **`has_lair` 只表示 CR 有巢穴值**：源快照没有暴露巢穴动作字段；因此只有眼魔、巫妖等 5 条带 `lair` CR 的条目为 true，不代表所有有巢穴动作的龙/吸血鬼。
- **`save_dc` 取伤害/豁免片段中的第一个 DC**：擒抱逃脱 DC、二次豁免等不单独拆分；用 `parts` 与动作名称判断上下文。
- **`average_damage` 优先取源数据列出的平均值**：缺省时按骰式计算并向下取整；同一动作的重复骰式会保留。
- **译名不统一**：不同汉化/官方版本的译名可能不同；以 `name_en` 为稳定标识。
- **2024 版本不在范围**：本库固定 2014 MM；2024 重印条目不混入，`name_en` 相同时以 2014 条目为准。
