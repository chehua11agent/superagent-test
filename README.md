# superagent-test

dsh-superagent test repository.

## 拾词者 · 雾港（游戏原型）

用英语玩的文字跑团《拾词者》第一章可玩原型：12 幕、48 个 CET-4 词、1/3/7/16 天复习、词行动与章节 BOSS。

```bash
npm run serve   # http://127.0.0.1:4173/
npm test        # SRS / 内容 / 通关集成测试
npm run test:e2e # 8 个 Playwright 端到端测试
```

详细说明、已知边界与文件结构见 [`game/README.md`](game/README.md)。另有一个 10 词 / 3 幕 / 5 节点的内容位置样本：[`docs/sample-closing-notice.md`](docs/sample-closing-notice.md)，以及“认识 vs 会拼”的双鉴定设计提案：[`docs/dual-check-design.md`](docs/dual-check-design.md)。设计文档见 [PR #2](https://github.com/chehua11agent/superagent-test/pull/2)（`docs/cet4-vocab-rpg.md`，尚未合并）。
