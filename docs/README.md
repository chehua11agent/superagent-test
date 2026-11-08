# 文档索引

本目录按用途分为三类：**设计**、**调研**、**内容与数据**。项目总览见仓库根目录的 [`README.md`](../README.md)。

历史 PR 编号只作为内容来源记录；这些旧 PR 已由整合后的新 PR 取代。

## 设计

| 文档 | 内容 |
| --- | --- |
| [`design/cet4-vocab-rpg.md`](design/cet4-vocab-rpg.md) | 《四级单词跑团》总体设计文档：6 章 × 48 词、每日复习 + 剧情循环、SRS、单词即行动、技术方案与验收标准 |
| [`design/dual-check-design.md`](design/dual-check-design.md) | 「认识 vs 会拼」双鉴定设计提案：认义 / 拼写双轨、复习加试、BOSS 混检 |
| [`design/story-card-combat-design.md`](design/story-card-combat-design.md) | 剧情 → 词卡战斗 → 复习的可组合故事单元设计 |
| [`design/sample-closing-notice.md`](design/sample-closing-notice.md) | 10 词 / 3 幕 / 5 节点的内容位置样本《闭馆通知》：每个词都落在选项、判定或物品上 |

## 调研

| 文档 | 内容 |
| --- | --- |
| [`research/trpg-rules-survey.md`](research/trpg-rules-survey.md) | 跑团规则书与 GitHub 基建调研：Ironsworn / Fate / PbtA / Blades 的取舍、许可边界、技术组合 |
| [`research/phb-story-dm-review.md`](research/phb-story-dm-review.md) | 5e《玩家手册》剧情设定、DM 指引与故事发展盘点 |
| [`research/game-visual-solutions-survey.md`](research/game-visual-solutions-survey.md) | 游戏画面 / UI 现成方案与长线引擎调研：三条可视化路线、候选清单、许可证边界 |

## 内容与数据

| 文档 | 内容 |
| --- | --- |
| [`content/cet4-dnd-mechanics-vocab.md`](content/cet4-dnd-mechanics-vocab.md) | DnD 5e 机制 × CET-4 词汇映射：5 类机制、150 词、可玩点子与知识库核对 |
| [`content/cet4-syllabus-kb.md`](content/cet4-syllabus-kb.md) | 四级大纲知识库的 OCR 方法、覆盖与限制 |
| [`content/cet4-materials-ingest.md`](content/cet4-materials-ingest.md) | 两本四级素材的页级录入完整性核对与出题素材用法 |

机器可读数据在 [`data/`](../data/)：

| 文件 | 内容 |
| --- | --- |
| [`cet4-dnd-vocab.json`](../data/cet4-dnd-vocab.json) | 150 个映射词的同源导入数据 |
| [`cet4-syllabus-kb.json`](../data/cet4-syllabus-kb.json) | 4530 个唯一四级大纲词头（释义、Unit、Part、页码） |
| [`cet4-materials/manifest.json`](../data/cet4-materials/manifest.json) | 两本扫描书的页数、字符数与 SHA-256 清单；全文因版权不公开 |

## 来源

本目录整合自以下旧 PR（均已关闭，由新 PR 取代）：

- PR #2：`docs/cet4-vocab-rpg.md`
- PR #3：`docs/cet4-dnd-mechanics-vocab.md`、`docs/cet4-syllabus-kb.md`、`docs/cet4-materials-ingest.md` 与 `data/`
- PR #4：`docs/trpg-rules-survey.md`
- PR #5：`docs/phb-story-dm-review.md`
- PR #6：`docs/dual-check-design.md`、`docs/story-card-combat-design.md`、`docs/sample-closing-notice.md`
- PR #7：`docs/game-visual-solutions-survey.md`
