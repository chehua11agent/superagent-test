# superagent-test

dsh-superagent test repository.

本仓库是《四级单词跑团》项目的资料与原型合集，按「文档 / 数据 / 原型」分类：

| 分类 | 目录 | 说明 |
| --- | --- | --- |
| 文档 | [`docs/`](docs/README.md) | 总体设计、玩法设计、规则/内容/画面调研、词汇与知识库说明 |
| 数据 | [`data/`](data/) | 150 个 DnD × CET-4 映射词、4530 个四级大纲词头、两本素材的录入清单 |
| 可玩原型 | [`game/`](game/) | 《拾词者 · 雾港》第一章：12 幕、48 个 CET-4 词 |

文档导航与分类见 [`docs/README.md`](docs/README.md)。核心入口：

- 总体设计：[`docs/design/cet4-vocab-rpg.md`](docs/design/cet4-vocab-rpg.md)
- 玩法设计：[双鉴定](docs/design/dual-check-design.md)、[剧情→词卡战斗](docs/design/story-card-combat-design.md)、[内容样本《闭馆通知》](docs/design/sample-closing-notice.md)
- 调研：[跑团规则书](docs/research/trpg-rules-survey.md)、[5e 玩家手册盘点](docs/research/phb-story-dm-review.md)、[画面/引擎](docs/research/game-visual-solutions-survey.md)、[Zork 式玩法与词汇测评](docs/research/zork-vocab-mastery-assessment.md)
- 词汇与知识库：[机制词汇表](docs/content/cet4-dnd-mechanics-vocab.md)、[四级大纲知识库](docs/content/cet4-syllabus-kb.md)、[素材录入核对](docs/content/cet4-materials-ingest.md)

## 可玩原型

用英语玩的文字跑团《拾词者》第一章：12 幕、48 个 CET-4 词、1/3/7/16 天复习、词行动与章节 BOSS。

```bash
npm run serve    # http://127.0.0.1:4173/
npm test         # SRS / 内容 / 通关集成测试
npm run test:e2e # Playwright 端到端测试
```

详细说明、操作方式、已知边界与文件结构见 [`game/README.md`](game/README.md)。

另有独立的**词汇实验室**（不接游戏，用来单独试 Zork 解析器 / ECDICT 词库 / FSRS 复习 / IRT 测评）：[`prototype/lexicon-lab/`](prototype/lexicon-lab/)。
