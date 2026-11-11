# 词汇实验室（Lexicon Lab）

一个独立的单页实验台，用来亲手试《拾词者》调研里提到的四件事：Zork 式解析器、ECDICT 词库、FSRS 复习、IRT 测评。

**它不是游戏，也不接 `game/`。** 没有复杂画面、没有后端；所有状态都在浏览器的 `localStorage` 里，点右上角“重置”就清空。

## 跑起来

在仓库根目录：

```bash
python3 -m http.server 4190
# 打开 http://127.0.0.1:4190/prototype/lexicon-lab/
```

也可以用任意静态服务器；不需要安装依赖。

## 五个页面

| 页面 | 回答的问题 | 你能亲手试什么 |
| --- | --- | --- |
| 总览 | 这四个东西怎么拼起来 | 看数据流、概念解释，跳到各实验 |
| Zork 解析器 | 打字命令怎么变成游戏行动 | 输入 `take key` / `unlock door with key`，看解析轨迹和写入词库的证据 |
| 词库 / ECDICT | 一个词条里有什么 | 搜词、筛词频带、点开词条看 ECDICT 字段与证据；做 5 题看中文打英文 |
| FSRS 复习 | 什么时候该复习 | 对 8 张卡评 Again/Hard/Good/Easy，看 S/D 与下次间隔 |
| IRT 测评 | 十几道题怎么估词汇量 | 做 12 题自适应四选一，看 θ、SE、预估认识数与分带覆盖 |

## 数据

- `data.js`：61 个示例词。音标、中文释义、BNC/当代词频、CET-4 等标签来自 [ECDICT](https://github.com/skywind3000/ECDICT)（MIT）；游戏词的简义与例句来自本仓库 `game/content/words.json`。
- 其中 49 个词被 ECDICT 标注为 `cet4`；其余是游戏/解析器用到的词（如 `key`、`door`、`lantern`）。
- 词频排名取 ECDICT 的 `frq`，越小越高频；IRT 的题目难度先验按词频带粗估，不是真实标定。

## 这个原型不做什么

- **不是完整 Zork**：只有 2 个房间、8 个命令，用来验证“语言即操作”和证据采集。
- **FSRS 是简化演示**：用 FSRS-4.5 默认权重，没有用真实评分数据拟合；间隔只是“评分 → 稳定性 → 天数”的演示。
- **IRT 是迷你版**：只有 61 个示例词，3PL 参数 `a=1.7, c=0.25`，难度 `b` 按词频带给先验；不是 4,530 词，也没有用 py-irt 做真实标定。
- **没有音频、账号、服务端**；所有状态只在本机。
- **没有接进游戏**：正式版要做的迁移与验收见 `docs/research/zork-vocab-mastery-assessment.md`。

## 对应调研

- 调研文档：`docs/research/zork-vocab-mastery-assessment.md`（PR #23）
- 参考的算法实验台：`prototype/adaptive-vocab/`（PR #17）
