# superagent-test

dsh-superagent test repository.

本仓库是《四级单词跑团》项目的资料与原型合集，按「文档 / 数据 / 原型」分类：

| 分类 | 目录 | 说明 |
| --- | --- | --- |
| 文档 | [`docs/`](docs/README.md) | 总体设计、玩法设计、规则/内容/画面调研、词汇与知识库说明 |
| 数据 | [`data/`](data/) | 150 个 DnD × CET-4 映射词、4530 个四级大纲词头、两本素材的录入清单 |
| 可玩原型 | [`game/`](game/) | 《拾词者 · 雾港》第一章：12 幕、48 个 CET-4 词 |
| 5e 剧本原型 | [`prototype/sunless-keep/`](prototype/sunless-keep/) | 一个完整 5e 剧本：进村接任务 → 裂谷 → 地城 → 两族交涉 → 树庭 BOSS → 结局；默认 DM 对话模式 + 神经语音 |

文档导航与分类见 [`docs/README.md`](docs/README.md)。核心入口：

- 总体设计：[`docs/design/cet4-vocab-rpg.md`](docs/design/cet4-vocab-rpg.md)
- 玩法设计：[双鉴定](docs/design/dual-check-design.md)、[剧情→词卡战斗](docs/design/story-card-combat-design.md)、[内容样本《闭馆通知》](docs/design/sample-closing-notice.md)
- 调研：[跑团规则书](docs/research/trpg-rules-survey.md)、[5e 玩家手册盘点](docs/research/phb-story-dm-review.md)、[画面/引擎](docs/research/game-visual-solutions-survey.md)
- 词汇与知识库：[机制词汇表](docs/content/cet4-dnd-mechanics-vocab.md)、[四级大纲知识库](docs/content/cet4-syllabus-kb.md)、[素材录入核对](docs/content/cet4-materials-ingest.md)

## 可玩原型

用英语玩的文字跑团《拾词者》第一章：12 幕、48 个 CET-4 词、1/3/7/16 天复习、词行动与章节 BOSS。

```bash
npm run serve    # http://127.0.0.1:4173/
npm test         # SRS / 内容 / 通关集成测试
npm run test:e2e # Playwright 端到端测试
```

详细说明、操作方式、已知边界与文件结构见 [`game/README.md`](game/README.md)。

## 5e 剧本原型《无光城塞》

按 5e 规则跑一个完整短剧本：3 名 3 级角色，从村庄接任务开始，经过探索、社交、两族对峙、地城战斗，到最终树庭 BOSS 和多结局收尾。默认是 DM 对话模式：DM 一段段讲、你一段段选，掷骰结果由 DM 接着讲；可切回文档阅读。规则层包含检定/豁免、优劣势、AC、先攻、网格移动、法术位、状态、死亡豁免与短休；文本层提供全中文界面、47 个 CET-4 重点词，以及 71 段预生成的 Edge 神经语音（Ryan）。

在线试玩：<https://chehua11agent.github.io/superagent-test/prototype/sunless-keep/>

说明、规则边界与改法见 [`prototype/sunless-keep/README.md`](prototype/sunless-keep/README.md)。
