# 5e 录入数据校验报告（PHB / MM / LMOP）

> 校验日期：2026-11-15
> 范围：`data/phb`（1,558 条）、`data/mm`（450 条）、`data/lmop`（463 条）
> 结论：结构、计数、交叉引用与指纹校验全部通过；发现并修复 24 处字段/数值错误，另有若干引用精度与覆盖范围限制见 §5。

## 1. 背景与目标

本报告回应“检查录入是否有错误”。三个数据集各自带有来源快照、页码口径和结构校验器；本次在既有校验之外，逐字段回读源数据，检查录入转换是否忠实，并核对可机器验证的数值关系（计数、XP 合计、等级阈值）。

## 2. 方法与基准

| 数据集 | 比对基准 | 方法 |
|---|---|---|
| PHB | `data/phb/manifest.json` 记录的 5etools 中文镜像快照（`spells-phb.json`、`items-base.json`、`items.json`、`feats.json`、`backgrounds.json`、`classes/`、`deities.json` 等） | 361 条法术按名称逐字段比对环阶、学派、页码、施法时间、射程、成分、持续时间、专注、仪式、豁免、伤害类型、区域、目标、职业；259 件装备比对页码、重量、价格、伤害、AC、属性需求、隐匿、词条、射程；42 专长、20 背景、15 状态、195 神祇比对名称与页码；12 职业的 254 条职业特性与 233 条子职业特性比对名称、等级、归属 |
| MM | 5etools 中文镜像 `bestiary-mm.json` | 450 条怪物比对页码、体型、类型、阵营、AC、HP 与骰式、速度、六维、豁免、技能、CR、被动察觉、语言、抗性/免疫；动作比对命中、豁免 DC、触及/射程、伤害骰与类型 |
| LMOP | 中文翻译版 80 页 PDF（`lmop.pdf`） | 校验器全量复核 manifest、计数、id、交叉引用、页码区间；另抽取检定 DC、XP 奖励、附录 B 怪物数值与正文对照；复算 XP 汇总与等级阈值 |

辅助检查包括：源码与已提交数据的一致性（重新执行入库脚本后逐字节比对）、上限/下限与空值检查、跨文件引用检查。

## 3. 发现与修复

### 3.1 PHB 法术射程单位（4 条）

5etools 的距离类型为 `miles`，入库脚本只识别 `mile`，导致单位落成「尺」。

| 法术 | 原值 | 修正 |
|---|---|---|
| Clairvoyance（鹰眼术） | 1 尺 | 1 英里 |
| Control Weather（操控天气） | 半径 5 尺 | 半径 5 英里 |
| Meteor Swarm（陨石爆） | 1 尺 | 1 英里 |
| Project Image（投影术） | 500 尺 | 500 英里 |

修复：`scripts/phb-ingest.mjs` 的 `rangeLabel` 同时识别 `mile` 与 `miles`；重新生成 `data/phb/spells.json`。

### 3.2 PHB 远程武器射程字段（15 条）

源数据把射程写成 `"100/400"` 字符串；入库后整体放进 `range.normal`、`range.long` 恒为 `null`，调用方无法区分常规/最大射程。涉及吹箭、匕首、飞镖、手弩、手斧、重弩、标枪、轻弩、轻锤、长弓、网、短弓、投石索、矛、三叉戟。

修复：入库时拆为 `range: { normal: 100, long: 400 }`（数值）；重新生成 `data/phb/equipment.json`。

### 3.3 MM 动作的二段伤害（4 条）

动作解析只取首个命中伤害子句；「命中后另一次豁免，失败受额外伤害、成功减半」的第二段伤害没有进入 `parts`，与 `docs/content/mm-library.md` 对 `parts` 的说明不符。

| 怪物 | 动作 | 补充的伤害段 |
|---|---|---|
| Wyvern | Stinger | 7d6 毒素（DC 15 体质） |
| Arcanaloth | Claws | 3d6 毒素（DC 14 体质） |
| Swarm of Poisonous Snakes | Bites | 4d6 毒素（DC 10 体质） |
| Assassin | Shortsword | 7d6 毒素（DC 15 体质） |

修复：解析器把带「伤害减半」的豁免子句伤害补为独立 `part` 并写入 `save_dc`；持续伤害（每回合开始）、条件伤害（特定目标/状态）仍不合并，保持原有口径。

### 3.4 LMOP 第三部分 XP 汇总（1 条）

第三部分 26 条 XP 奖励合计 13,500；毒牙的「赶走 2,000」与「杀死 3,900」二选一：

- 赶走路线：13,500 − 3,900 = 9,600（原记录正确）
- 杀死路线：13,500 − 2,000 = **11,500**，原记录误写为 13,500

修复：`p034-061.json` 的 `xp_summary.kill_venomfang` 改为 11,500；`manifest.json` 指纹同步；`data/lmop/rules-crossref.json` 的 `level_audit` 与 `docs/content/lmop-atlas.md` 的 XP 表重新生成。等级结论不变：4 人队杀死毒牙累计 6,887.5 XP（5 级），5 人队 5,580 XP（4 级）。

修复分别位于：

- PHB：<https://github.com/chehua11agent/superagent-test/pull/29>
- MM：<https://github.com/chehua11agent/superagent-test/pull/30>
- LMOP 数据：<https://github.com/chehua11agent/superagent-test/pull/35>
- LMOP 图集/等级审计：<https://github.com/chehua11agent/superagent-test/pull/37>

## 4. 复核通过项

- **PHB 结构**：1,558 条 / 17 类、SRD 1,074 条，校验器通过；除上述射程外，361 条法术的环阶、学派、页码、施法时间、成分、持续时间、豁免、伤害类型、区域、目标、职业与源数据一致。
- **PHB 其余字段**：259 件装备的页码、重量、价格、伤害、AC、力量需求、隐匿、词条一致；42 专长、20 背景、15 状态、195 神祇的名称与页码一致（同名神祇按神系分别记录）；职业特性集合与源文件一致，子职业特性无缺失。
- **MM 结构**：450 条 / 14 类型 / 12 环境 / 37 传奇 / 83 施法者，校验器通过；核心数值（页码、AC、HP、速度、六维、豁免、技能、CR、被动察觉、语言、抗性/免疫）逐条一致。
- **MM 动作**：命中、DC、触及/射程一致；伤害段除上述 4 条外，其余 18 条差异属于条件伤害（特定目标/状态）、持续伤害（每回合开始）或眼魔射线等多选伤害，按现有聚合口径保留，未强行合并。
- **LMOP 结构**：463 条记录、4 分卷，manifest 计数、SHA-256、id、交叉引用与页码区间全部通过。
- **LMOP 数值**：26 条 XP 奖励逐条与正文一致（50/150/200/400/2,000/3,900/1,250/950/200/500 等）；抽检的 DC（阿嘉莎 15、古枭井 10、雷霆树门 10/15/20、克拉葛摩陷阱 10/20、后门 15/25、飞龙崖 10/15）与 PDF 一致；附录 B 抽检怪物（哥布林 AC15/HP7/CR1/4、青年绿龙 AC18/HP136/CR8、掘地兽 AC14/HP27/CR2 等）与 PDF 一致。

## 5. 限制与未覆盖

1. **PHB/MM 没有官方原书 PDF**：核对基准是 manifest 记录的 5etools 中文镜像快照，不是纸质原书。结构化字段的来源一致性可以验证；正文、译名与纸质原书的差异无法在此环境中核对。
2. **公开库不含正文**：PHB/MM 的 `prose` 策略为 `omitted`，本次没有、也无法逐句校对法术/怪物描述；`brief` 摘要由字段生成，未逐条人工润色。
3. **LMOP 页码口径**：PDF 目录与页脚存在偏移（PART 3 目录 34–61、页脚 34–52；PART 4 目录 62–90、实际 PDF 54–79）。数据集按分卷声明口径记录，本次未统一换算。
4. **LMOP 引用精度**：部分 check/reward 的 `page` 指向区域/场景起始页，而数值出现在下一页（例如古枭井 36 vs 实际 37、雷霆树区域 10 的 42 vs 43）。这属于既有引用约定，未改动；引用时建议以 `pdf_page` 与正文复核。
5. **抽样范围**：LMOP 的叙述性摘要与随机遭遇表按抽样核对，未逐句校验译文；MM 的动作文本解析未覆盖所有条件/持续伤害的组合语义。

## 6. 复现

```bash
# PHB
PHB_SOURCE_DIR=./source node scripts/phb-ingest.mjs
node scripts/phb-validate.mjs && node --test tests/phb.test.mjs

# MM
MM_SOURCE_DIR=./source node scripts/mm-ingest.mjs
node scripts/mm-validate.mjs && node --test tests/mm.test.mjs

# LMOP（含地图/规则对照）
node scripts/lmop-validate.mjs
node scripts/lmop-atlas-validate.mjs
node --test tests/lmop.test.mjs tests/lmop-atlas.test.mjs
```
