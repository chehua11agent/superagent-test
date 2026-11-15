# 《凡戴尔的失落矿坑》四段结构化数据集

> 对象：D&D 5e（2014）入门模组《凡戴尔的失落矿坑》（Lost Mine of Phandelver，LMoP）的**结构化录入**。
> 数据：`data/lmop/`；校验：`node scripts/lmop-validate.mjs`；测试：`node --test tests/lmop.test.mjs`。
> 本库**不收录模组译文正文**，只保留名称、页码、分类、规则机械值与生成式摘要。

## 1. 这是什么

- 一本书一个数据集：四个分卷按页范围录入，合并为 `data/lmop/` 下的一个完整数据集。
- 每个分卷一个独立 JSON，字段按该分卷正文结构组织；`manifest.json` 是全书索引与校验清单。
- 记录带稳定 `id`；分卷内引用（场景、NPC、怪物、检定、奖励、物品等）可直接解析。
- 同一实体可能出现在多个分卷（如西达尔、哥布林、熊地精），`manifest.json` 的 `cross_part_entities` 已登记；跨分卷合并请按 `id` 去重。
- 现有游戏原型、CET-4 词表与 `data/phb`、`data/mm` 不受影响；这是新增的数据层。

## 2. 覆盖范围与数量

| 分卷 | 页范围 | 记录数 | 主要内容 |
|---|---|---:|---|
| `p001-015.json` | 书内 1–15 | 110 | 前言、主持游戏、PART 1 哥布林之矢 |
| `p016-033.json` | 书内 16–33 | 110 | PART 2 凡度林之役、红烙印大本营 |
| `p034-061.json` | 书内 34–52（TOC 标 34–61） | 137 | PART 3 黑蜘蛛之网 |
| `p062-090.json` | PDF 54–79（TOC 标 62–90） | 106 | PART 4 潮音洞之声、附录 A/B、备注 |

合计 **463 条**顶层记录：

| 类型 | 记录数 | 唯一数（按规范化 id） | 说明 |
|---|---:|---:|---|
| 章节 | 8 | 8 | 含前言、四部分、附录 A/B、备注 |
| 场景 | 65 | 65 | 城镇地点、野外地点、地下城区域 |
| NPC | 70 | 53 | 跨分卷重复的同一人物已登记 |
| 怪物 | 53 | 32 | 分卷内出现过即记录，含重复出现 |
| 检定 / 豁免 | 95 | 95 | DC、对抗检定、被动检定 |
| 奖励 | 103 | 103 | 货币、物品、XP、头衔、任务奖励 |
| 其它 | 69 | — | 阵营、物品、危险、地图、规则、术语、魔法物品、备注等 |

数量由 `scripts/lmop-validate.mjs` 硬校验，不是抽样。

## 3. 文件结构

```text
data/lmop/
  manifest.json     # 版本、来源、页码口径、计数、跨分卷实体、逐文件 SHA-256
  p001-015.json     # 前言与 PART 1
  p016-033.json     # PART 2
  p034-061.json     # PART 3
  p062-090.json     # PART 4 与附录
scripts/lmop-validate.mjs  # 全量校验器
tests/lmop.test.mjs        # 数据集与校验器测试
```

四个分卷分别保留原始录入结构，没有强行统一字段名：

| 分卷 | 顶层结构 | id 形式 | 页码字段 |
|---|---|---|---|
| 1 | `schemaVersion`、`module`、`source`、`chapters`… | `scene-…`、`npc-…` | `pages`（数组）、`page`、`pdfPage` |
| 2 | `meta`、`validation`、`chapters`… | `scene-…`、`npc-…`、`ch02-…` | `pages`（字符串区间） |
| 3 | `schema_version`、`meta`、`book`、`source`… | `lmop:scene:…` 等命名空间 id | `page_start`/`page_end`、`pdf_page` |
| 4 | `schema_version`、`dataset`、`source`、`page_map`… | `lmop:scene:…` 等命名空间 id | `pdf_page`、`toc_start_page` |

调用方应按记录类型而不是 id 前缀识别；`name_en` 是跨译名差异的稳定标识。

## 4. 页码口径（重要）

本 PDF 共 80 页，各分卷的页码基准不同，**不统一换算**：

| 分卷 | 任务/目录页码 | 记录实际页码 |
|---|---|---|
| 1 | 1–15 | 书内 1–15；PDF 2–16 |
| 2 | 16–33 | 书内 16–33；PDF 17–34 |
| 3 | 34–61 | 书内 34–52；PDF 35–53（正文在页脚 52 结束） |
| 4 | 62–90 | PDF 54–79（页脚约 53–78） |

每卷的精确说明在 `manifest.json` 的 `parts[].page_basis` 与 `page_convention`。引用页码时必须同时说明分卷。

## 5. 查询与校验

```bash
# 全量结构校验：计数、id、交叉引用、页码区间、文件指纹
node scripts/lmop-validate.mjs
npm run validate:lmop

# 数据集与校验器测试
node --test tests/lmop.test.mjs

# 看全书概览
node -e "const m=require('./data/lmop/manifest.json'); console.log(m.counts, m.parts.map(p=>p.title))"

# 找某类记录（示例：所有怪物名）
node -e "for(const f of ['p001-015','p016-033','p034-061','p062-090']){const d=require('./data/lmop/'+f+'.json'); console.log(f, (d.monsters||[]).map(m=>m.name).join('、'))}"
```

## 6. 来源与版权

- 来源：中文翻译版 PDF《凡度尔的失落矿坑》（80 页）；译文来自纯美苹果园，译者庞西瓦、琉璃、cherng9。
- 公开仓库只保留结构化字段、页码、规则机械值与生成式摘要；不收录原文段落、表格文本或完整描述。
- 模组版权归 Wizards of the Coast；中文整合仅用于学习交流，如涉侵权请于 24 小时内删除。
- 每个数据文件的 SHA-256 在 `manifest.json`；校验器会发现文件被改动而未更新清单的情况。

## 7. 已知边界

- **没有正文**：场景描述、NPC 对白、怪物特性全文都不在公开数据中；只保留 DM 运行所需的摘要与机械值。
- **字段不统一**：四个分卷由不同录入任务完成，字段命名与层级不同（见 §3）；这是为保留各段完整信息而做的取舍，消费方需按分卷适配。
- **跨分卷实体未合并**：同一人物/怪物可能在多个分卷各有一条记录，`cross_part_entities` 给出对应关系；合并时按 `id` 去重，并合并 `appearances`/`pages` 等出现信息。
- **译名不统一**：西达尔·荷温特/西达尔-荷温特、伊阿诺·阿布雷克/艾伯瑞克、雷霆树镇/雷树镇、潮音洞/回浪洞、爱嘉莎/阿嘉莎等；以各分卷记录为准，`name_en` 可作稳定键。
- **怪物数据卡不全**：赭色果冻怪、缚灵莫尔梅斯克等在正文出现但附录 B 没有数据卡；分卷记录保留名称与遭遇信息，不补写数据。
- **页码偏移**：PART 3/4 的任务页码来自 PDF 目录，与正文页脚相差约 1 / 9 页；以章节内容对齐，详见 §4。

## 8. 与旧 PR 的关系

本数据集整合自四个分卷 PR（#31–#34），四个分卷文件原样保留，新增 `manifest.json`、校验器与测试。合并本目录后，旧分卷 PR 可由维护者关闭；它们是同一批数据的来源记录。
