# Zork 式玩法、词库掌握度与快速词汇测评

| 项目 | 内容 |
| --- | --- |
| 调研日期 | 2026-11-11 |
| 版本 | v1.0 |
| 范围 | 解析式文字冒险（Zork / IF）、词库与掌握度建模、快速词汇测评、GitHub 可复用项目 |
| 需求依据 | 飞书 2026-11-11「zork 的原理也挺好……测出玩家对单词的掌握情况」；[设计文档](../design/cet4-vocab-rpg.md) §3 / §5.2 / §6.7 / §8.2；[双鉴定](../design/dual-check-design.md)；PR #17 的自适应抽词调研 |
| 一句话结论 | Zork 值得借的是「世界模型 + 宽容解析器」，不是整台 Z-machine；词库应做成「4,530 词全局题库 + 每词多能力证据流」；一次测评只能估总量与分带覆盖，不能逐词验证——在合成题库上，20–25 题可把 4,530 词的估计误差压到约 5–6%，逐词真相仍要靠后续游戏证据。 |

---

## 0. 结论先行

### 0.1 四个问题，四句话

| 问题 | 结论 |
| --- | --- |
| Zork 的原理能不能用？ | **能，但只借两层**：房间/物体/状态的世界模型，以及「动词 + 名词」的宽容解析器。不要为它换掉现有 DOM/JS/SRS，也不要用 Zork 的品牌或关卡。 |
| 要不要做词库系统？ | **要，而且要比现在大**：现在词书只覆盖第一章 48 词；应扩到全部 4,530 个四级大纲词头，记录「认义 / 回忆 / 拼写 / 语境 / 听辨」五种证据，而不是一个 `stage`。 |
| GitHub 有没有专业的？ | **有专业件，没有整车**。ECDICT（8.6k★，MIT）可当词库数据底座；qwerty-learner（23.7k★，GPL-3.0）可参考词书与听写交互；Anki + FSRS 是成熟的调度方案；py-irt / catsim / pyBKT 可做离线标定。没有现成的「CET-4 + 游戏遥测 + 逐词掌握度 + 自适应测评」成品。 |
| 怎么快速一次性测出掌握情况？ | **测总量用 20–25 题自适应四选一（约 3–4 分钟）；测覆盖面用 50 题是/否（约 5 分钟）；逐词状态靠后续游戏证据补**。一次测评输出的是「4,530 个词的预测概率 + 分带覆盖率 + 置信区间」，不是 4,530 个已验证事实。 |

### 0.2 推荐组合

1. **玩法**：在现有选择式剧情上加 1–2 个 `parser-lite` 场景（如灯塔、图书馆），用 20–30 个核心动词 + 目标名词做「理解才能行动」的谜题；不做全量 Zork 克隆。
2. **词库**：`words`（全局 4,530 词 + 游戏 288 词）→ `user_word_skills`（每词 × 每能力）→ `word_events`（追加式证据流）；ECDICT 补音标、中文释义、BNC/当代词频、词形变化。
3. **测评**：开局或第一次打开词书时做一次 20 题定位测；章节边界做 6 题巡检；「想看得更细」时提供 50 题快速扫描。测评只负责「种子先验」，不负责「判决」。
4. **调度**：先保留 1/3/7/16 固定阶梯；FSRS 按 PR #17 的结论走影子模式，用真实答题数据校准后再替换。

### 0.3 明确不做

- 不把整台 Z-machine / Inform 7 嵌进现有游戏；不为「像 Zork」重写交互层。
- 不把一次测评的预测当成「已掌握」；不因此跳过 BOSS 抽查。
- 不用 CET-4 单题库去宣称「总英语词汇量」；两者是两个口径。
- 不直接复制 GPL/AGPL 代码（qwerty-learner、Anki）到本仓库；只参考设计与数据格式。
- 不使用 Zork 名称、角色、关卡或 Infocom 商标；「Zork 式」只作为设计参照。

---

## 1. 需求与现状

### 1.1 原始问题拆解

需求方这句话里有几个不同的问题，混在一起会得出错误方案：

| # | 原话 | 真正要回答的 | 合适的交付 |
| --- | --- | --- | --- |
| 1 | 「zork 的原理也挺好」 | 解析式文字冒险的哪些原理适合「用英语玩」 | 玩法调研 + 一个可试的垂直切片 |
| 2 | 「你肯定也要做一个词库系统」 | 全局词库 + 个人词库，分别存什么 | 数据模型 + 词书界面 |
| 3 | 「统计我对单词的认识情况」 | 掌握度怎么定义、怎么更新、怎么展示 | 多能力状态 + 证据流 + 指标 |
| 4 | 「github 有没有专业的」 | 哪些开源项目能直接用，哪些只能参考 | 项目清单 + 复用边界 |
| 5 | 「怎么快速的一次性……测出掌握情况」 | 一次测评能测多少、测多准、怎么选题 | 测评协议 + 仿真 + 验收指标 |

### 1.2 现有系统已经有什么

| 资产 | 现状 | 对本调研的意义 |
| --- | --- | --- |
| 词表 | 第一章 48 词，`freq_rank` 为占位排序；正式版计划 6 章 × 48 = 288 词 | 游戏内容词表，不等于词库 |
| 大纲知识库 | `data/cet4-syllabus-kb.json`：4,530 个唯一四级词头，含中文释义、Unit/Part、页码；OCR 定位率 80.1% | 全局词库的天然底座 |
| 用户词状态 | `user_words`：`stage`、`due_on`、`spelling.stage`、`known`、`lapses` | 已有双轨雏形，但只有 48 词、粒度粗 |
| 事件记录 | 设计文档 8.2 有 `review_events` / `story_events`，原型只存每日汇总 | 缺「每词每次作答」的证据流 |
| 复习调度 | 认义 1/3/7/16 天；拼写 1/3/7 天；双证 `mastered` | 可保留；PR #17 已给出 FSRS 影子方案 |
| 词书 | 只展示已契约的 48 词；筛「复习中 / 会认不会写 / 会拼 / 双证 / 已认识 / 未契约」 | 交互可复用，数据范围要扩 |
| 测评 | 原型里只有零散小测；PR #11 的探针是「固定 3 词 + 随机 1 词」；PR #17 有独立算法实验台 | 需要产品化的测评协议，不是再做一个实验台 |

### 1.3 三个缺口

1. **范围缺口**：词书只覆盖「剧情里出现过的词」，而需求方要的是「我对单词的认识情况」——默认应覆盖整个四级词表。
2. **证据缺口**：现在只有「认义 stage / 拼写 stage」两个计数，没有每次作答的时间、提示、来源、题型；无法回答「我为什么认为这个词会」。
3. **测量缺口**：没有开局定位测，也没有定期巡检；新词从第一章第 1 个开始，无法按真实水平跳过低频熟词。

---

## 2. Zork 式玩法

### 2.1 Zork 是什么，哪五条值得借

Zork 1977–1979 年起源于 MIT，1979 年的论文把它定义为「计算机化的奇幻模拟游戏」；1980 年 Infocom 发行 Zork I，使用 ZIL 编写、Z-machine 执行。它的核心不是「文字多」，而是**一个可操作的世界 + 一个能听懂人话的解析器**。Montfort (2003) 把这类作品当作一种「可操作的叙事」来读；对本项目来说，重点是叙事由玩家的语言行动推进，而不是由选项按钮推进。

| # | 原理 | Zork 的做法 | 对本项目 | 可记录的学习证据 |
| --- | --- | --- | --- | --- |
| 1 | 世界模型 | 房间、物体、状态、出口；拿取/打开/阅读会改变世界 | 用「港口—灯塔—图书馆」等小房间图承载剧情；每个目标词绑定一个可操作对象 | 词在语境中被遇到/被操作 |
| 2 | 宽容解析器 | 动词 + 名词 + 介词；同义词、代词、部分命令 | 玩家用英文命令行动；同义词与模糊匹配；永不因「没猜中动词」卡死 | 目标词的产出性使用 |
| 3 | 可供性 | 描述暗示可做的事；`examine` 给线索 | 场景描述里埋目标词；物体名就是词卡入口 | 词义理解 → 行动成功 |
| 4 | 探索与谜题门控 | 锁、光源、宝物；非线性地图 | 用「理解」当钥匙，而不是数值门槛；同一谜题至少两条解法 | 多次相遇、不同语境 |
| 5 | 宽容设计 | 「不被迫输入 exact verb」「不突然死亡」「不进入不可通关状态」 | 解析失败不扣 HP；给建议；可以点击组句；永不卡关 | 失败也被记录为「见过」，不是「不会」 |

Graham Nelson 在《The Craft of Adventure》里把冒险游戏概括为「a crossword at war with a narrative」，并列出「玩家权利」：不必输入 exact verb、要有合理同义词、要有像样的解析器、不能无预警地杀死玩家、不能把游戏关死。这些原则比任何具体关卡都更适合本项目。

### 2.2 为什么它和词汇游戏天然契合

普通单词卡考的是「看到词能不能选对意思」；Zork 式玩法考的是「能不能用这个词做成一件事」。两者对应不同的能力：

| 玩法 | 认知动作 | 证据强度 | 适合的词 |
| --- | --- | --- | --- |
| 4 选 1 认义 | 英文形 → 中文义 | 弱（有 25% 猜对） | 所有词，尤其是新词 |
| 中文 → 输入英文 | 义 → 形 | 中（拼写/回忆） | 剧情行动、BOSS |
| 解析器命令 | 义 + 用法 + 句法 → 行动 | 强（产出性使用） | 动词、名词、介词短语 |
| 语境填空 | 句法 + 搭配 → 选词 | 中强 | 中后期、近义词 |
| 听辨/听写 | 音 → 义/形 | 中 | 有音频后 |

Zork 式玩法还能解决「只读不测」：玩家不是读完一段英文再答题，而是**必须理解命令才能推进**。这和设计文档「单词即行动」的原则一致，只是把「点选中文语义」升级成「用英文做事」。

### 2.3 不要照搬的部分

| Zork 的做法 | 为什么不能直接搬 | 本项目的替代 |
| --- | --- | --- |
| 几百个动词的完整词库 | 认知负担大；玩家在学英语，不是在学 MUD 命令 | 20–30 个核心动词 + 目标名词；其余用同义词/点击补 |
| 必须精确拼写 | 手滑、移动端键盘、大小写都会惩罚学习动机 | 模糊匹配、同义词、动词/名词 chips、确认式补全 |
| 迷宫、负重、光源管理 | 与单词学习无关的琐碎操作 | 小房间图、无负重、光源只作一次剧情道具 |
| 突然死亡/不可通关 | 违反「失败不卡关」原则 | 解析失败只给提示；错误行动有代价但不回档 |
| 长段英文描述 | 移动端阅读负担；超出学习者水平 | 每屏 1–3 句；关键词可点；先给答案再考 |
| 纯键盘输入 | 手机端摩擦大；中文输入法会干扰 | 「点击组句」为主，键盘输入为可选的高级模式 |

> 一句话：**借 Zork 的「世界回应语言」，不借它的「刁难玩家」。**

### 2.4 实现路线比较

| 方案 | 解析器 | Web/移动 | 与现有 JS/JSON/SRS 集成 | 许可证 | 判断 |
| --- | --- | --- | --- | --- | --- |
| [Inform 7](https://github.com/ganelson/inform) | 成熟，自然语言式规则 | Z-machine/Glulx，可用 [Parchment](https://github.com/curiousdannii/parchment) / [ifvms.js](https://github.com/curiousdannii/ifvms.js) 跑在浏览器 | 中：内容在 I7 里，词表/遥测要另接 | Artistic-2.0 | 解析器最强，但等于另起一套内容与状态层；暂不选 |
| [Dialog](https://github.com/Dialog-IF/dialog) | 现代、紧凑的解析式 IF 语言 | Z-machine / Å-machine，有 Web 解释器 | 中 | 自定义（仓库标 NOASSERTION），商用前需核对 | 适合做独立 IF，不适合嵌入现有游戏 |
| [Ink](https://github.com/inkle/ink) | 无解析器，分支叙事 | 官方 JS runtime，易嵌入 | 高 | MIT | 适合剧情分支，不解决「动词 + 名词」 |
| [Twine](https://github.com/klembot/twinejs) | 无解析器，选择式 | HTML，易嵌入 | 高 | GPL-3.0 | 只作叙事参考；GPL 代码不直接并入 |
| **自定义 parser-lite** | 自己写 200–500 行核心 | DOM/原生，移动端友好 | 最高：直接读写现有 JSON、SRS、埋点 | 自有 | **推荐先做垂直切片** |
| LLM 意图解析 | 自由文本理解强 | 需 API 或本地模型 | 中 | 取决于模型 | 可做「兜底自由命令」，不能作为唯一路径；成本/延迟/离线是风险 |

现有原型是零运行时依赖的 DOM + 程序化 SVG，内容在 JSON，SRS 与存档都在客户端。换成 Inform 7 会把「内容、状态、UI、遥测」拆成两套；而本项目的核心资产恰恰是现有的词表、SRS 与测试。**所以先做 parser-lite，不换引擎。**

### 2.5 推荐的 parser-lite 垂直切片

目标不是做完整 Zork，而是用 1–2 个场景验证「英文命令 → 世界回应 → 学习证据」这条链路。

#### 语法

```text
command  := verb (object)? (preposition object)?
verb     := 规范动词 | 同义词
object   := 名词短语 | it | all
```

例子：

- `unlock door with brass key`
- `open the door`（同义）
- `use key on door`（同义）
- `lower lantern`
- `read logbook`
- `look` / `examine door` / `inventory`

#### 数据结构（建议放 `game/content/parser/`）

```json
{
  "rooms": [
    {
      "id": "lighthouse_gate",
      "desc": "The brass key is cold. The door is locked.",
      "objects": ["door", "brass_key"],
      "exits": { "north": "lighthouse_hall" }
    }
  ],
  "objects": [
    {
      "id": "brass_key",
      "aliases": ["key", "brass key"],
      "wordId": "w_brass",
      "state": "inventory"
    }
  ],
  "commands": [
    {
      "verb": "unlock",
      "aliases": ["open", "use"],
      "targetWordId": "w_unlock",
      "requires": { "objectState": "locked", "inventory": "brass_key" },
      "effect": "open_door",
      "narration": "The lock yields with a soft click."
    }
  ]
}
```

#### 解析流程

```text
parse(input, state):
  1. 归一化：小写、去标点、压缩空白
  2. 分词；先匹配动词（含同义词），再匹配名词/介词
  3. 解析名词：可见物体 → 背包 → 房间特征；支持 it / all
  4. 解析失败：
       - 未知动词 → 给 3 个建议，不扣 HP
       - 未知名词 → 给可见物体列表 + 目标词释义
       - 歧义 → 反问一句，不猜
  5. 检查 affordance：动词 + 对象 + 前置条件
  6. 执行效果：改状态、叙事、写事件
  7. 若命令用到目标词：记 context/recall 证据
```

#### 交互

- **桌面/键盘**：输入框 + `look` 提示 + 上一条命令历史。
- **移动端**：动词 chips + 名词 chips + 「组句」按钮；键盘输入可选。
- **永不卡关**：连续 3 次解析失败，显示「直接行动」按钮（消耗 1 点线索或小 HP），剧情继续。
- **学习提示**：第一次遇到目标词时给词卡；第二次只给首字母；第三次要求自己打。

#### 埋点

| 事件 | 字段 | 用途 |
| --- | --- | --- |
| `command_attempt` | `raw`、`verb`、`object`、`room`、`session` | 解析成功率 |
| `parse_fail` | `reason`（unknown_verb / unknown_noun / ambiguous / precondition） | 找出「猜动词」点 |
| `suggestion_used` | `suggested_verb`、`chosen` | 提示是否有效 |
| `action_success` | `command`、`target_word`、`latency_ms` | 产出性使用证据 |
| `word_encounter` | `word_id`、`context` | 见过/语境暴露 |

#### 一个场景样例：灯塔门

- 目标词：`unlock`、`brass`、`key`、`lower`、`lantern`、`logbook`。
- 玩家看到：「The door is locked. A brass key hangs by the frame.」
- 玩家输入 `unlock door with brass key` → 门开，`unlock` 记一次产出性使用。
- 玩家输入 `open door` → 同义通过；`unlock` 记「见过」，不记产出。
- 玩家输入 `use key` → 解析为 `unlock door with key`，给一次确认提示。
- 玩家输入 `key door` → 解析失败，建议 `unlock door with key`；不扣 HP。
- 门后是 `read logbook` 与 `lower lantern`；`lower` 用错对象时给 affordance 提示。

#### 成本与验收

| 项 | 估计 |
| --- | --- |
| parser-lite 核心 + 测试 | 3–5 人日 |
| 一个 3 房间垂直切片（含内容） | 5–8 人日 |
| 接入现有剧情/词表/埋点 | 2–3 人日 |
| 验收 | 解析成功率 ≥85%；目标词命令成功率 ≥70%；提示使用率 <30%；无死局；7 天词义保持率不低于选择式场景 |

> 先做垂直切片，用真实玩家数据回答「像 Zork 是否更好玩」；不要先做全量章节。

---

## 3. 词库与掌握度系统

### 3.1 「掌握」不是一个布尔值

同一个词，玩家可能「看到认识、听不出、写不出、在句子里不会用」。把多种能力压成一个 `mastered`，会导致两个错误：

- 认义到 3 就被当成「会了」，但 BOSS 一让拼写就露馅；
- 拼写错了，把已经稳固的认义也打回 1 天，复习预算被浪费。

建议把「掌握」拆成六种能力，各自有独立证据与标签：

| 能力 | 证据 | 题型 | 现有系统 | 建议 |
| --- | --- | --- | --- | --- |
| 认义 recognition | 英 → 中选对 | 4 选 1 | 有（`stage`） | 保留；加反应时与提示 |
| 回忆 recall | 中 → 英选对/写出 | 4 选 1 / 输入 | 部分（拼写轨） | 与拼写分开；先认形再拼写 |
| 拼写 spelling | 中 → 英精确输入 | 输入 | 有（`spelling.stage`） | 保留；允许常见变体 |
| 语境 context | 句中选词/填空 | 完形 | 无 | 中后期接入 |
| 听辨 listening | 音 → 义/形 | 听选/听写 | 无 | 有音频后接入 |
| 产出 use | 解析器命令/造句 | 命令 | 无 | parser-lite 接入后记录 |

界面上不要显示一个「掌握度 73%」就完事；要能回答「哪条能力、凭什么、多久前」。

### 3.2 数据模型 v2

现有 `user_words` 一行一个词，适合 MVP，但不适合多能力与证据回溯。建议拆成三张表：

```sql
-- 1) 全局词条：4,530 个四级词头 + 288 个游戏词 + 可选扩展
CREATE TABLE words (
  id             TEXT PRIMARY KEY,          -- 'w_abandon'
  lemma          TEXT NOT NULL,
  surface_forms  TEXT[] NOT NULL DEFAULT '{}',
  pos            TEXT,
  senses         JSONB NOT NULL,            -- [{zh, en, example}]
  ipa            TEXT,
  audio_url      TEXT,
  freq_rank      INT,                       -- 1 = 最高频；来源需记录
  freq_source    TEXT,                      -- 'bnc' | 'frq' | 'coca' | 'wordfreq'
  band           SMALLINT,                  -- 1k / 2k / 3k / 4k / 5k+
  cefr           TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}', -- cet4, chapter:1, ...
  difficulty_b   REAL,                      -- IRT 难度先验
  discrimination_a REAL DEFAULT 1.7,
  guessing_c     REAL DEFAULT 0.25,
  source         TEXT,
  license        TEXT
);

-- 2) 用户 × 词 × 能力
CREATE TABLE user_word_skills (
  user_id        UUID,
  word_id        TEXT,
  skill          TEXT CHECK (skill IN ('recognize','recall','spell','context','listen','use')),
  p_mastery      REAL NOT NULL DEFAULT 0,   -- 0..1，模型估计
  confidence     REAL,                      -- 0..1，证据量/后验宽度
  stage          SMALLINT,                  -- 兼容现有 1/3/7/16 阶梯
  stability      REAL,                      -- FSRS S（可选）
  difficulty     REAL,                      -- FSRS D（可选）
  due_on         DATE,
  lapses         INT NOT NULL DEFAULT 0,
  evidence_count INT NOT NULL DEFAULT 0,
  last_evidence_at TIMESTAMPTZ,
  known_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  known_source   TEXT,                      -- self | verified | inferred
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word_id, skill)
);

-- 3) 追加式证据流：不更新、不删除
CREATE TABLE word_events (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL,
  word_id        TEXT NOT NULL,
  skill          TEXT NOT NULL,
  source         TEXT NOT NULL,             -- placement | contract | review | story | boss | audit | parser
  correct        BOOLEAN,
  score          REAL,                      -- 0..1，允许部分对
  latency_ms     INT,
  hint_count     SMALLINT NOT NULL DEFAULT 0,
  answer         TEXT,
  item_id        TEXT,                      -- 测评题 id
  session_id     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

另有 `assessment_sessions`（`mode`、`theta`、`se`、`item_count`、`started_at`）与 `assessment_items`（题目、选项、正确答案、参数）用于复现与标定。

**关键约束：**

- 事件只追加；`user_word_skills` 是可重算的物化视图，坏了可以从事件重建。
- 所有答题接口带 `idempotency_key`，离线补交不重复扣 stage。
- 词条表带 `source/license`；不同来源的释义/词频不混用。
- 4,530 词的 `zh` 释义来自大纲词表；ECDICT 只补音标、词频、词形，不覆盖大纲释义。

### 3.3 掌握度估计与标签

#### 两种估计，别混用

| 场景 | 方法 | 输出 | 用途 |
| --- | --- | --- | --- |
| 一次测评 / 冷启动 | IRT（3PL）+ EAP | `θ`、`SE`、每词 `P_know_i` | 给全库一个先验，决定先学哪些 |
| 日常答题 | 简单贝叶斯/计数更新 | 每词每能力的 `p_mastery`、`evidence_count` | 词书展示、复习排序、审计 |

MVP 不需要把 IRT 跑在每次答题上。可先用「先验 + Beta 更新」：

```text
p = (prior_alpha + correct) / (prior_alpha + prior_beta + attempts)
prior_alpha = 1 + 3 * p0
prior_beta  = 1 + 3 * (1 - p0)
```

其中 `p0` 来自测评的 `P_know_i(θ̂)`。这样既用上了测评，又不会把一次猜对当成真会。

如果不想上 IRT，Elo（Pelánek, 2016）或 BKT（Corbett & Anderson, 1995）是更轻的替代；但 MVP 用「先验 + 计数」就够了，不必引入知识追踪。

#### 标签

| 标签 | 条件 | 是否算「已掌握」 | UI 文案 |
| --- | --- | --- | --- |
| 未测 | 无证据，`p < 0.5` | 否 | 未测 |
| 待验证 | 无直接证据，`0.5 ≤ p < 0.8` | 否 | 待验证 |
| 见过 | 只有语境暴露，无答题 | 否 | 见过 |
| 认得 | 认义证据 ≥1，`p ≥ 0.6` | 否 | 认得 |
| 会认不会写 | 认义 `p ≥ 0.7`，拼写 `p < 0.5` | 否 | 会认不会写 |
| 会写 | 拼写证据 ≥2，`p ≥ 0.7` | 否 | 会写 |
| 双证 | 认义 `stage ≥3` 且拼写 `stage ≥2` | 是 | 双证 |
| 已认识（已验证） | 通过「已认识」验证 | 是 | 已认识 |
| 预估认识 | 测评 `p ≥ 0.8`，无直接证据 | **否** | 预估认识 · 待验证 |

**「预估认识」必须和「已验证」分开显示。** 否则玩家会以为系统已经确认，BOSS 抽查时产生「你不是说我会吗」的挫败。

### 3.4 GitHub 上有哪些专业件

> Stars 为 2026-11-11 通过 GitHub API 读取的近似值；许可证以仓库为准，商用前逐项核对。

#### 词库与词频

| 项目 | Stars | 许可证 | 能提供什么 | 怎么用 |
| --- | ---: | --- | --- | --- |
| [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) | 8.6k | MIT | 约 10 万条英汉词条；音标、中文释义、BNC/当代词频、CET-4 等考试标签、动词/名词变形 | **首选数据底座**：按 `tag=cet4` 与 4,530 词头对齐，补音标/词频/变形；大纲释义仍以现有知识库为准 |
| [rspeer/wordfreq](https://github.com/rspeer/wordfreq) | 1.8k | 代码 Apache-2.0；数据源许可需逐项核对 | 40+ 语言的 Zipf 词频；数据约 2021 年快照 | 作为 ECDICT 词频的交叉校验；不直接再分发数据 |
| [dwyl/english-words](https://github.com/dwyl/english-words) | 12.3k | Unlicense | 479k 英文词形（无释义） | 拼写校验/词形候选；不适合当学习词库 |
| [RealKai42/qwerty-learner](https://github.com/RealKai42/qwerty-learner) | 23.7k | GPL-3.0 | CET-4/CET-6/TOEFL 等词书 JSON、听写、复习、键盘交互 | **参考交互与数据格式**；GPL 代码不直接并入本仓库 |
| [open-spaced-repetition/fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki) | 4.1k | MIT | FSRS 调度器 + 优化器 + Anki 集成 | 先读算法与参数；不直接替换现有 SRS |
| [ankitects/anki](https://github.com/ankitects/anki) | 32.7k | AGPL-3.0 | 成熟 SRS、牌组、统计；23.10 起内置 FSRS | 只借概念与交互；AGPL 代码不并入 |
| [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | 865 | MIT | TypeScript 版 FSRS | 如果上 FSRS，这是最适合 Web 的库 |
| [fasiha/ebisu](https://github.com/fasiha/ebisu) | 339 | Unlicense | 贝叶斯间隔重复 | 小数据场景的备选；不如 FSRS 生态成熟 |

#### 测评与心理测量

| 项目 | Stars | 许可证 | 能提供什么 | 怎么用 |
| --- | ---: | --- | --- | --- |
| [nd-ball/py-irt](https://github.com/nd-ball/py-irt) | 176 | MIT | Python 贝叶斯 IRT（1PL/2PL/3PL） | 离线标定题目参数；不跑在浏览器 |
| [douglasrizzo/catsim](https://github.com/douglasrizzo/catsim) | 155 | BSD-3-Clause | 计算机自适应测验仿真（选题、停止、能力估计） | 离线仿真与对照；运行时用自研轻量 EAP |
| [CAHLR/pyBKT](https://github.com/CAHLR/pyBKT) | 292 | MIT | 贝叶斯知识追踪 | 如果要做「技能习得曲线」，可作离线基线；MVP 不需要 |
| [gasparl/lextale](https://github.com/gasparl/lextale) | 7 | BSD-2-Clause | LexTALE 的 JavaScript/PsychoPy 实现 | 参考是/否题与计分；标准题序不要改 |

#### 解析式 IF / 叙事引擎

| 项目 | Stars | 许可证 | 能提供什么 | 怎么用 |
| --- | ---: | --- | --- | --- |
| [historicalsource/zork1](https://github.com/historicalsource/zork1) | 3.0k | MIT | Zork I 的 ZIL 源码 | 研究世界模型/谜题结构；**不要复用 Zork 品牌与关卡** |
| [ganelson/inform](https://github.com/ganelson/inform) | 1.7k | Artistic-2.0 | Inform 7 编译器与核心 | 如果未来要做完整 IF，可作独立分支 |
| [Dialog-IF/dialog](https://github.com/Dialog-IF/dialog) | 39 | 自定义 | 现代解析式 IF 语言 | 同上；商用前核对许可 |
| [inkle/ink](https://github.com/inkle/ink) | 5.0k | MIT | 分支叙事脚本 + JS runtime | 剧情分支；不提供解析器 |
| [klembot/twinejs](https://github.com/klembot/twinejs) | 2.9k | GPL-3.0 | 选择式叙事编辑器 | 参考；GPL 代码不并入 |
| [curiousdannii/parchment](https://github.com/curiousdannii/parchment) | 494 | MIT | 浏览器里的 Z-machine/Glulx 解释器 | 只有决定跑 Z-code 时才需要 |
| [curiousdannii/ifvms.js](https://github.com/curiousdannii/ifvms.js) | 101 | MIT | JS 版 IF 虚拟机 | 同上 |

#### 结论

**没有「CET-4 + 游戏 + 逐词掌握度 + 自适应测评」的现成整车。** 可直接复用的是数据（ECDICT）、调度库（ts-fsrs）、算法（IRT/CAT）与交互参考（qwerty-learner）；真正要自研的是「词库与游戏内容的绑定、证据流、测评协议、词书界面」。

### 3.5 推荐架构

```text
┌─────────────────────────────────────────────────────┐
│ 内容层：4,530 大纲词 + 288 游戏词 + 例句/音频/标签      │
│ 数据源：大纲知识库（释义）+ ECDICT（音标/词频/变形）    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 题目层：评测题（4 选 1 / 是-否 / 拼写 / 完形）          │
│ 参数：b（难度）、a（区分度）、c（猜对率）               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 用户层：user_word_skills（每词 × 每能力）              │
│ 证据：word_events（追加式）                           │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 应用层：词书 / 测评 / 复习队列 / BOSS 抽查 / 统计       │
└─────────────────────────────────────────────────────┘
```

#### 冷启动难度先验

没有真实作答数据时，用词频分位给 `b`：

```text
b_i = Φ⁻¹((rank_i - 0.5) / N) * 1.0 + 0.3
```

- `rank` 越小（越高频）→ `b` 越低 → 越容易。
- 初始 `a = 1.7`、`c = 0.25`（四选一）；是/否题 `c` 需按假词校正。
- 每个词带累计 200–300 条真实作答后，用 py-irt 按词带/词族标定；不要对 4,530 个词各自独立标定。
- 词频来源必须记录（BNC / 当代语料 / SUBTLEX / wordfreq），不同来源的 `rank` 不能混排；SUBTLEX 与 BNC 的词频差异可能很大（Brysbaert & New, 2009）。

#### 复用边界

| 对象 | 可直接用 | 只能参考 | 不要做 |
| --- | --- | --- | --- |
| ECDICT | 数据（MIT），保留来源与许可 | — | 不把 ECDICT 释义覆盖大纲释义 |
| qwerty-learner | — | 词书结构、听写交互 | 不复制 GPL 代码 |
| Anki / FSRS | ts-fsrs（MIT） | 调度概念、统计界面 | 不嵌入 AGPL 代码 |
| py-irt / catsim | 离线标定/仿真 | 选题与停止规则 | 不把 Python 运行时塞进浏览器 |
| LexTALE JS | 是/否题实现（BSD-2） | 计分与题序 | 不改标准题序 |
| Zork 源码 | 研究（MIT） | 世界模型/谜题 | 不用 Zork 品牌与关卡 |

### 3.6 词书界面（建议）

词书从「本章 48 词」扩成「我的四级词库」：

- **概览**：4,530 词中「已验证 / 学习中 / 预估认识 / 未测」四块；预估总量与区间；按 1k–4k+ 分带覆盖率。
- **筛选**：能力（认义/回忆/拼写/语境）、状态、词带、来源（测评/剧情/复习/BOSS/解析器）、最近证据时间。
- **单词卡**：lemma、音标、大纲释义、`P_know`、最近 3 条证据、到期日、「为什么我认为我会」。
- **操作**：标记已认识（必须验证）、撤销、加入复习、查看例句、听发音。
- **增长**：每周新增已验证词、保持率、待验证词、审计失败率。
- **诚实**：预估认识用虚线/问号；已验证用实心；未测不显示为「不会」。

### 3.7 数据质量与隐私

- **释义歧义**：大纲释义很短（如「vt.丢弃；放弃，抛弃」），自动生成 4 选 1 干扰项容易语义重叠；前 500 题人工审，其余抽检。
- **多义词**：一个词条只考主义；`senses` 保留多义，后续可按语境出题。
- **词形**：用 ECDICT `exchange` 映射；题干用 lemma，拼写接受常见变体。
- **假词**：是/否题必须混入 20% 假词，计分按 LexTALE 的 `% correctav`。
- **频率**：BNC 与当代语料差异大；同一词表内固定一个来源，跨来源只做分带粗排。
- **隐私**：原型本地存储；正式版如需账号，只存学习数据，不存答题原文中的个人信息；提供导出/删除。
- **版权**：不提交真题原文、付费词表、受版权保护的例句；ECDICT 数据保留 MIT 声明；Zork 只作研究，不使用其商标与关卡。

---

## 4. 快速词汇测评

### 4.1 先定义「测什么」

「一次性测出尽可能多的词」有四种不同目标，不能用一个测试同时满足：

| 目标 | 问题 | 需要的输出 | 合适的测试 |
| --- | --- | --- | --- |
| 定位 | 我大概在什么水平？ | `θ`、`SE`、分带覆盖率 | 20–25 题自适应四选一 |
| 估总量 | 我认识多少词？ | `V̂` + 置信区间 | 30–60 题，跨词带抽样 |
| 找生词 | 哪些词该先学？ | 生词列表/命中率 | 40 题，目标答对率 0.4 |
| 逐词验证 | 这个词到底会不会？ | 每词证据 | 只能靠长期游戏证据；一次测试做不到 |

**关键区分：**

- **CET-4 口径**：4,530 个大纲词里会多少。适合本游戏。
- **总英语词汇量口径**：包含 5k–20k 词带。CET-4 题库只覆盖到 4.5k，对高水平玩家会「顶天」，不能拿它估 15,000 词。
- 本项目的默认指标应是「CET-4 覆盖率」，不是「总词汇量」；后者需要另建 14k/20k 词带题库。Nation (2006) 的覆盖研究显示，读懂一般文章通常需要 8,000–9,000 词族（约 98% 覆盖率）；4,530 个四级词是起点，不是终点。

### 4.2 现成工具与证据

| 工具/方法 | 规模 | 时间 | 测什么 | 证据 | 局限 |
| --- | --- | --- | --- | --- | --- |
| [Vocabulary Size Test (VST)](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/vocabulary-tests/the-vocabulary-size-test/Vocabulary-Size-Test-information-and-specifications.pdf) | 14k 版 140 题（每 1,000 词带 10 题）；20k 版 100 题 | 较长（140 题） | 书面接受性词汇量 | 标准化、4 选 1、总分 ×100/×200；Nation & Beglar (2007) | 长；官方明确说「每个词带题太少，不能可靠测每个词带」；不测听力/产出 |
| [LexTALE](https://www.lextale.com/) | 60 题（40 真词 + 20 假词） | 约 5 分钟 | 接受性词汇知识 | 5 分钟、对英语水平有良好预测力；Lemhöfer & Broersma (2012) | 是/否有过度声称；只测认词，不测拼写/用法 |
| 是/否 + 假词 | 50–100 题 | 4–8 分钟 | 快速广度 | Meara & Buxton (1987)；LexTALE 计分 | 需要校正猜对；对低频词不敏感 |
| 计算机自适应测验（CAT） | 20–30 题 | 约 3–6 分钟 | `θ` / 词汇量 | Weiss (1982)；波兰 PVST（2025）用 IRT+CAT，1,475 人验证；印尼 CAT（2023）；Kremmel (2022) 比较两种 CAT 算法 | 依赖题库标定；模型假设不成立时会自信地错 |
| Half-Life Regression (HLR) | — | — | 复习调度 | Settles & Meeder (2016)，Duolingo | 不是一次性测评工具 |
| FSRS | — | — | 复习调度 | Su et al. (2023)；Anki 23.10 内置 | 同上；PR #17 已说明其条件性 |
| 自评「认识/不认识」 | 100+ 词 | 1 分钟 | 主观熟悉度 | 快 | 系统性高估；不能当测评分数 |

### 4.3 为什么 20 题能估 4,530 词

不是因为「20 题覆盖了 4,530 词」，而是因为假设所有词共享一个潜在能力 `θ`，每个词的难度 `b_i` 已知，题目只是用来估计 `θ`。

#### 3PL 模型

```text
P_correct_i(θ) = c_i + (1 − c_i) · σ(a_i(θ − b_i))
P_know_i(θ)    = σ(a_i(θ − b_i))
```

- `P_correct` 是「答对」的概率，含猜对；`P_know` 是「真的知道」的概率，不含猜对。
- `a_i`：区分度；`b_i`：难度；`c_i`：猜对率（四选一 0.25）。参数估计细节见 Baker & Kim (2004)。
- `σ(x) = 1 / (1 + e^(−x))`。

#### 信息量与选题

```text
I_i(θ) = a_i² · (1 − P_correct_i) / P_correct_i · ((P_correct_i − c_i) / (1 − c_i))²
```

- 最大信息量在「答对率约 60%（含猜对）」附近，不是最难的题。
- 20 题的总信息量约为单题峰值的 20 倍；`SE(θ) ≈ 1 / sqrt(Σ I_i)`。
- 在 `a=1.7, c=0.2` 的设定下，20 题通常把 `SE(θ)` 压到 0.32–0.35；12 题通常更宽（约 0.4 以上）。

#### 词汇量估计

```text
V̂ = Σ_{i=1}^{N} P_know_i(θ̂)
```

- 注意：这里用的是 `P_know`，不是 `P_correct`。四选一有 25% 猜对；如果直接对 `P_correct` 求和，在低水平端最多会把约 `c_i × N`（四选一约 1,100 词）算成认识。
- `N = 4,530` 时，`V̂` 是「四级词库内认识多少词」，不是总英语词汇量。
- 置信区间：从 `θ` 的后验抽 1,000 个点，每个点算一次 `V̂`，取 5%/95% 分位；不要用 `±1.96×SE` 直接套，因为 `V̂` 对 `θ` 是非线性的。
- 每词先验：`p0_i = P_know_i(θ̂)`；`p0 ≥ 0.8` 记「预估认识」，`p0 ≤ 0.2` 记「大概率不会」，中间记「待验证」。

#### 三个必须说清的假设

1. **单维性**：所有题测同一个 `θ`。如果听力、拼写、语境混在一起，`θ` 的含义会被污染。
2. **局部独立**：同一词带/同一词族的题不能高度相关；否则信息量被高估。
3. **题目参数已知/校准**：`b_i` 不准，`θ̂` 就会偏；冷启动用词频先验，必须用真实数据再校准。

> 结论：20 题能给你一个**可用的先验**，不能给你 4,530 个**已验证事实**。把先验当事实，是这类系统最常见的错误。

### 4.4 推荐协议

#### A. 3–4 分钟定位测（默认）

| 项 | 设定 |
| --- | --- |
| 题量 | 20 题（可提前停在 16 题） |
| 题型 | 英文 → 4 选 1 中文；干扰项同词性、邻近词带 |
| 抽样 | 第 1–4 题每个词带 1 题；之后最大信息量；每带至少 2 题、最多 8 题 |
| 排除 | 当前章节 48 词（避免剧透）；最近 30 天做过的题 |
| 停止 | `SE(θ) ≤ 0.30` 或 20 题或 4 分钟 |
| 输出 | `θ̂`、`SE`、`V̂`、90% CI、分带覆盖率、`P_know_i` 全库先验 |
| 后续 | 不直接改剧情；只给词书和复习排序播种 |

#### B. 5–6 分钟广度扫描（可选）

| 项 | 设定 |
| --- | --- |
| 题量 | 50 题：40 真词 + 10 假词（是/否） |
| 抽样 | 按词带分层；真假词混排；每卷内题序固定，同一用户 30 天内换卷 |
| 计分 | LexTALE 式 `% correctav`：真词正确率与假词正确率各占一半 |
| 附加 | 10 题中→英拼写，估计「会认不会写」比例 |
| 输出 | 广度分、过度声称指数、拼写样本正确率、疑似生词列表 |
| 用途 | 玩家主动想看「详细档案」时；不作为默认开局 |

#### C. 1 分钟巡检（每 1–2 周）

| 项 | 设定 |
| --- | --- |
| 题量 | 6 题 |
| 抽样 | 50% 来自「预估认识/已认识」的审计；50% 来自「待验证」边界词 |
| 目的 | 发现「预测会、实际不会」；更新 `p_mastery`，不重排剧情 |
| 失败处理 | 不扣 HP；标为「待复习」，下次剧情自然复现 |

#### D. 游戏内证据（持续，不占额外时间）

- 契约、复习、词行动、BOSS、解析器命令都写 `word_events`。
- 同一词的不同能力分别记；不要用一次 4 选 1 覆盖拼写。
- 事件驱动更新，不要求玩家「再测一次」。

### 4.5 选题、估计、停止（伪代码）

```text
function placement(bank, user):
  theta = 0; se = 1.2; seen = {}
  for k in 1..20:
    if k <= 4:
      item = pick_one_per_band(bank, seen)
    else:
      item = argmax_{i not in seen, quota_ok(i)} I_i(theta)
    y = ask(item)
    posterior = update_eap(posterior, item, y)
    theta, se = mean_sd(posterior)
    seen.add(item)
    if k >= 16 and se <= 0.30: break
  V = sum(P_know_i(theta) for i in bank)
  CI = quantile([sum(P_know_i(t) for i in bank) for t in posterior_draws], [0.05, 0.95])
  return {theta, se, V, CI, band_coverage, per_word_prior}
```

**EAP 更新**（网格 `[-4, 4]`，步长 0.05，先验 `N(0, 1.2²)`）：

```text
post(θ) ∝ prior(θ) · Π P_correct_i(θ)^{y_i} · (1 − P_correct_i(θ))^{1−y_i}
θ̂ = Σ θ · post(θ)
SE = sqrt(Σ post(θ) · (θ − θ̂)²)
```

**扫描模式**（目标答对率 0.4）：

```text
item = argmin_{i not in seen} |P_correct_i(θ̂) − 0.40|
```

- 这会把题集中在「半会半不会」的词上，生词命中率高，但 `V̂` 的误差更大。
- 不要把「定位」和「扫生词」混成一个分数；两者的选题目标相反。

### 4.6 合成仿真：20 题大概能测多准

用与 PR #17 相同的 3PL 设定（`a=1.7`、`c=0.2`），把题库从 120 扩到 4,530，`b` 按词频分位生成；模拟 80 名学习者 × 5 个种子，最大信息量选题。注意 `V̂` 用 `P_know`（不含猜对），不是 `P_correct`：

| 题量 | `SE(θ)` | `V̂` 平均绝对误差（词） | 90% CI 覆盖率 | 抽到生词比例 |
| ---: | ---: | ---: | ---: | ---: |
| 10 | 0.50 | 386 | 90% | 40% |
| 15 | 0.40 | 311 | 91% | 38% |
| 20 | 0.35 | 270 | 89% | 36% |
| 25 | 0.31 | 245 | 89% | 36% |
| 30 | 0.28 | 218 | 90% | 31% |
| 40 | 0.24 | 189 | 90% | 32% |
| 60 | 0.19 | 148 | 91% | 30% |

读法：

- **20–25 题**在合成题库上把误差压到约 245–270 词，即 4,530 的 ~5.4–6.0%；90% CI 覆盖率约 90%，说明区间不是装饰。
- 30–40 题把误差降到 ~4–5%；60 题 ~3.3%。继续加题的边际收益递减。
- 这是**合成数据**：`b` 由词频分位生成、作答服从 3PL、没有疲劳/猜测/题目质量问题。真实误差会更大；这些数字是「上限」，不是承诺。

同一 20 题下换选题策略（80 名学习者 × 5 种子）：

| 策略 | `V̂` MAE（词） | 生词命中率 | `SE(θ)` |
| --- | ---: | ---: | ---: |
| 最大信息量 | **270** | 36% | **0.345** |
| 目标答对率 0.4 | 351 | **85%** | 0.474 |
| 随机抽题 | 350 | 58% | 0.481 |
| 前 5 题信息 + 其余 0.4 | 322 | 78% | 0.434 |

结论：

- **定位用最大信息量**；**扫生词用 0.4**；两者不要混。
- 「前 5 题信息 + 其余 0.4」是 12 题/120 词场景的折中（PR #17），在 4,530 词、20 题的定位场景里不如纯信息量；如果产品只允许一次测试，先明确它到底要「估准」还是「找生词」。

复现：`node scripts/vocab-placement-sim.mjs`（见附录 A）。

### 4.7 与 PR #17 的关系

PR #17 已经给出可运行的算法实验台与调研，核心结论对本节仍然成立：

| 指标（PR #17，合成数据，120 词库） | 现状（固定 3 + 随机） | 混合策略（前 5 信息 + 0.4） |
| --- | ---: | ---: |
| 5 题词汇量 MAE | 17.79 ± 0.73 | **15.16 ± 0.58（−17.8%）** |
| 12 题词汇量 MAE | 13.27 ± 0.37 | **12.02 ± 0.42（−9.4%）** |
| 12 题生词命中率 | 62.0% ± 2.0% | **90.9% ± 1.6%** |

本节的增量：

1. 把题库扩到 4,530，给出「20–25 题」这一档的误差量级，而不是只到 12 题。
2. 明确「定位」和「扫生词」应拆成两个模式；PR #17 的混合策略更适合题量很少（5–12 题）的场景。
3. 把测评输出定义为「全库先验 + 置信区间 + 分带覆盖」，而不是一个词汇量数字。
4. 把「预估认识」与「已验证」分开，避免 BOSS 抽查时翻车。

### 4.8 把测评接进游戏

#### 放在哪

- **不要**在封面后立刻塞 20 题；先让玩家玩完第一幕（约 5 分钟），建立「这个词有用」的体验。
- 入口放在：第一幕结算后的「词灵试炼」、词书首页的「测一测我的词库」、章节边界。
- 可跳过；跳过不给惩罚，只给默认先验（`θ=0`、`V̂` 约一半）。

#### 怎么播种

| 测评结果 | 词库状态 | 剧情行为 |
| --- | --- | --- |
| `P ≥ 0.8` | 预估认识 | 不强制契约；允许「已认识」验证；BOSS 可抽查 |
| `0.2 < P < 0.8` | 待验证 | 正常契约；复习时优先 |
| `P ≤ 0.2` | 未测/大概率不会 | 正常契约；作为新词优先 |
| 任何状态 | 都不改剧情分支 | 剧情仍按 48 词顺序；测评只影响词书与复习排序 |

#### 防剧透与防刷分

- 测评题库排除当前章节 48 词；同一用户 30 天内不重复同一题。
- 题目不显示「这是四级词/这是第几章」；避免用元信息猜答案。
- 一次测评只算一次先验；重复测评取最近一次，但保留历史用于标定。
- 不做「测评分数换奖励」；否则玩家会刷题，污染证据。

#### BOSS 与审计

- BOSS 的 3 认出 + 2 拼出保留；额外抽 10% 的「预估认识/已认识」词做审计（最多 1 个）。
- 审计失败：改回「待复习」，不扣 HP；记录 `audit_failed`。
- 审计成功率是测评质量的核心指标：如果低于 80%，说明 `P_know` 高估，需要重新校准 `b` 或降低阈值。

### 4.9 验证与指标

| 阶段 | 做什么 | 通过标准 |
| --- | --- | --- |
| 离线仿真 | 用 `scripts/vocab-placement-sim.mjs` 复跑 10–60 题 | 20 题 MAE ≤ 7%；25 题 ≤ 6%；CI 覆盖率 85–95% |
| 小样本试测 | 10–20 名玩家，同一天做本测评 + VST/LexTALE 子集 | 与外部测显著相关（r ≥ 0.6）；完成率 ≥ 80%；中位时间 ≤ 4 分钟 |
| 影子模式 | 测评只记录、不影响游戏 | 预测 `P_know` 与实际契约/复习正确率的校准曲线接近对角线 |
| 灰度 | 50% 玩家启用播种 | 不降低 D1/D7；词书打开率、复习完成率不降 |
| A/B | 播种 vs 不播种 | 7 天新词正确率、词书使用、跳过率有正向或中性结果 |

**不要**用「仿真 MAE 小」证明「学习效果更好」；仿真只证明估计器在假设成立时有效。

---

## 5. 落地路线

| 阶段 | 内容 | 工作量 | 依赖 | 风险 |
| --- | --- | --- | --- | --- |
| P0 | `word_events` + `user_word_skills`；4,530 词全库表；20 题定位测原型；词书概览/筛选 | 1–2 周 | 现有存档迁移；ECDICT 导入 | 题目质量；移动端时长 |
| P1 | 题目生成与人工审 500 题；50 题扫描；6 题巡检；参数标定；分带覆盖 | 2–4 周 | P0 数据；真实作答 | 标定数据不足；释义歧义 |
| P2 | parser-lite 垂直切片（灯塔/图书馆）；FSRS 影子模式；按 `P_know` 调整新词顺序 | 3–6 周 | P0/P1；内容生产 | 解析器挫败；FSRS 条件性 |
| 暂不做 | 全量 Zork 克隆；全库逐词验证；总英语 20k 词带；LLM 解析器作为主路径 | — | — | 成本/收益不匹配 |

**建议顺序**：先把「证据流 + 全库词书 + 20 题定位」做出来，再决定要不要上 parser-lite。否则 Zork 场景会产生大量证据，却没有地方存、没有东西用。

---

## 6. 风险与开放问题

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 模型假设不成立 | 单维 `θ`、局部独立、参数已知；真实玩家有听力/拼写/语境差异 | 分能力建模；校准曲线；审计；不要把 `P_know` 当事实 |
| 合成数据乐观 | 本调研的 MAE 来自 3PL 合成数据，未含疲劳/猜测/题目缺陷 | 小样本试测；影子模式；用真实数据重跑 |
| 题目质量 | 大纲释义短、近义词多、干扰项可能也正确 | 人工审前 500 题；同词性/同词带；排除语义重叠 |
| 过度声称 | 是/否题「看着眼熟就点会」 | 假词；`% correctav`；审计；置信度 |
| 测评疲劳 | 开局 20 题可能劝退 | 第一幕后；可跳过；3 分钟内；进度条 |
| 解析器挫败 | 猜动词、输入法、歧义 | 同义词/模糊匹配/chips；不扣 HP；建议；垂直切片先验证 |
| 内容成本 | 每个 parser 场景要写物体/命令/状态 | 3 房间切片；复用词表；模板化 |
| 许可证/商标 | qwerty GPL、Anki AGPL、Zork 商标 | 只参考；不复制代码；不使用 Zork 品牌 |
| 隐私 | 学习数据、答题记录 | 本地优先；最小化；导出/删除 |
| 指标误导 | 用「测得多」代替「学得会」 | 以 7 天保持率、审计成功率、校准为准 |

**开放问题（需要产品/需求方决定）：**

1. 词库的默认口径是「CET-4 4,530 词」还是「总英语词汇量」？前者可落地，后者要另建 14k/20k 题库。
2. 测评放在第一幕前、第一幕后，还是只放在词书里？
3. 是否接受「预估认识」这种不确定状态，还是只显示已验证？
4. parser-lite 先做哪个场景？灯塔（物体/门/光）还是图书馆（阅读/分类/检索）？
5. 是否允许玩家看到「P_know」的具体百分比？还是只显示标签？

---

## 7. 参考

### 7.1 论文、标准与书

- Lebling, P. D., Blank, M. S., & Anderson, T. A. (1979). *Zork: A Computerized Fantasy Simulation Game.* Computer, 12(4), 51–59. <https://doi.org/10.1109/MC.1979.1658697>
- Montfort, N. (2003). *Twisty Little Passages: An Approach to Interactive Fiction.* MIT Press. <https://doi.org/10.7551/mitpress/6936.001.0001>
- Nelson, G. (1995). *The Craft of Adventure* (2nd ed.). <https://ifarchive.org/if-archive/info/Craft.Of.Adventure.txt>
- *The Z-Machine Standards Document, Version 1.1* (2014). <https://inform-fiction.org/zmachine/standards/z1point1/>
- Nation, I. S. P., & Beglar, D. (2007). *A vocabulary size test.* The Language Teacher, 31(7), 9–13. 说明与规格：<https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/vocabulary-tests/the-vocabulary-size-test/Vocabulary-Size-Test-information-and-specifications.pdf>
- Nation, I. S. P. (2006). *How large a vocabulary is needed for reading and listening?* Canadian Modern Language Review, 63(1), 59–82. <https://doi.org/10.3138/cmlr.63.1.59>
- Lemhöfer, K., & Broersma, M. (2012). *Introducing LexTALE: A quick and valid Lexical Test for Advanced Learners of English.* Behavior Research Methods, 44(2), 325–343. <https://doi.org/10.3758/s13428-011-0146-0>
- Meara, P., & Buxton, B. (1987). *An alternative to multiple choice vocabulary tests.* Language Testing, 4(2), 142–154. <https://doi.org/10.1177/026553228700400202>
- Weiss, D. J. (1982). *Improving measurement quality and efficiency with adaptive testing.* Applied Psychological Measurement, 6(4), 473–492. <https://doi.org/10.1177/014662168200600408>
- Baker, F. B., & Kim, S.-H. (2004). *Item Response Theory: Parameter Estimation Techniques* (2nd ed.). CRC Press. <https://doi.org/10.1201/9781482276725>
- Fokin, D., Płużyczka, M., & Golovin, G. (2025). *The Polish vocabulary size test: A novel adaptive test for receptive vocabulary assessment.* Behavior Research Methods, 57(9). <https://doi.org/10.3758/s13428-025-02775-3>
- Wulansari, A. D., Kirana, D. P., & Mufanti, R. (2023). *Development of a Computerized-Adaptive Test to Measure English Vocabulary Size with IRT.* IJOLAE, 5(3), 277–294. <https://doi.org/10.23917/ijolae.v5i3.22953>
- Kremmel, B. (2022). *Does One Size Fit All? Comparing Two Computer-Adaptive Algorithms for a Diagnostic Vocabulary Test.* In *Vocabulary Theory, Patterning and Teaching* (pp. 46–62). <https://doi.org/10.21832/9781788923750-006>
- Settles, B., & Meeder, B. (2016). *A Trainable Spaced Repetition Model for Language Learning.* ACL 2016, 1848–1858. <https://doi.org/10.18653/v1/P16-1174>
- Su, J., Ye, J., Nie, L., et al. (2023). *Optimizing Spaced Repetition Schedule by Capturing the Dynamics of Memory.* IEEE TKDE, 35(10), 10085–10097. <https://doi.org/10.1109/TKDE.2023.3251721>
- Pelánek, R. (2016). *Applications of the Elo rating system in adaptive educational systems.* Computers & Education, 98, 169–179. <https://doi.org/10.1016/j.compedu.2016.03.017>
- Corbett, A. T., & Anderson, J. R. (1995). *Knowledge tracing: Modeling the acquisition of procedural knowledge.* User Modeling and User-Adapted Interaction, 4(4), 253–278. <https://doi.org/10.1007/BF01099821>
- Brysbaert, M., & New, B. (2009). *Moving beyond Kučera and Francis: A critical evaluation of current word frequency norms...* Behavior Research Methods, 41(4), 977–990. <https://doi.org/10.3758/BRM.41.4.977>
- Anki 23.10 release notes（FSRS 内置）: <https://docs.ankiweb.net/releases/changes/changes/23.10>

### 7.2 GitHub 项目

- ECDICT: <https://github.com/skywind3000/ECDICT>
- wordfreq: <https://github.com/rspeer/wordfreq>
- qwerty-learner: <https://github.com/RealKai42/qwerty-learner>
- Anki: <https://github.com/ankitects/anki>
- FSRS4Anki: <https://github.com/open-spaced-repetition/fsrs4anki>
- ts-fsrs: <https://github.com/open-spaced-repetition/ts-fsrs>
- py-fsrs: <https://github.com/open-spaced-repetition/py-fsrs>
- fsrs-rs: <https://github.com/open-spaced-repetition/fsrs-rs>
- Ebisu: <https://github.com/fasiha/ebisu>
- py-irt: <https://github.com/nd-ball/py-irt>
- catsim: <https://github.com/douglasrizzo/catsim>
- pyBKT: <https://github.com/CAHLR/pyBKT>
- LexTALE JS: <https://github.com/gasparl/lextale>
- Zork I source: <https://github.com/historicalsource/zork1>
- Inform 7: <https://github.com/ganelson/inform>
- Dialog: <https://github.com/Dialog-IF/dialog>
- Ink: <https://github.com/inkle/ink>
- Twine: <https://github.com/klembot/twinejs>
- Parchment: <https://github.com/curiousdannii/parchment>
- ifvms.js: <https://github.com/curiousdannii/ifvms.js>
- ZILF: <https://github.com/taradinoc/zilf>
- Sharpee（TypeScript 解析式 IF 平台）: <https://github.com/ChicagoDave/sharpee>

### 7.3 在线工具

- LexTALE: <https://www.lextale.com/>
- Test Your Vocab: <https://testyourvocab.com/>
- MyVocab（自适应词汇量测试）: <https://www.myvocab.info/>
- Vocabulary Size Test 资源页: <https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/vocabulary-tests/vocabulary-size-test>

### 7.4 仓库内文档

- [设计文档](../design/cet4-vocab-rpg.md)
- [双鉴定设计](../design/dual-check-design.md)
- [剧情 → 词卡战斗](../design/story-card-combat-design.md)
- [四级大纲知识库](../content/cet4-syllabus-kb.md)
- [自适应生词筛选与 FSRS 调研（PR #17，分支 `agent/adaptive-srs-research-076ffc76f00e`）](https://github.com/chehua11agent/superagent-test/blob/agent/adaptive-srs-research-076ffc76f00e/docs/research/adaptive-vocab-scheduling.md)
- [自适应算法实验台（PR #17）](https://chehua11agent.github.io/superagent-test/prototype/adaptive-vocab/)

---

## 附录 A：合成仿真复现

脚本：[`scripts/vocab-placement-sim.mjs`](../../scripts/vocab-placement-sim.mjs)

```bash
node scripts/vocab-placement-sim.mjs
# 或指定题量/人数/种子
node scripts/vocab-placement-sim.mjs --items=25 --learners=100 --seeds=10
```

模型假设（与 PR #17 对齐）：

- 题库 `N=4,530`，`b_i = Φ⁻¹((rank_i−0.5)/N)·1.0 + 0.3`；
- `a=1.7`，`c=0.2`（PR #17 原型的保守取值；四选一理论值是 0.25）；
- 学习者 `θ ~ N(0,1)`，截断到 `[−2.5, 2.5]`；
- 作答服从 3PL；
- 选题：最大信息量（或目标答对率 0.4 / 随机 / 混合）；
- 估计：EAP，网格 `[-4, 4]`，步长 0.05，先验 `N(0, 1.2²)`；
- 指标：`V̂` MAE、`SE(θ)`、90% CI 覆盖率、生词命中率。

**这不是真实题库的标定结果。** 它只回答「在理想 3PL 下，题量与误差的量级关系」；真实误差取决于题目质量、参数校准、玩家猜测与疲劳。

---

## 附录 B：题目样例

### B.1 四选一（定位测）

> **abandon**
> A. 放弃；抛弃  B. 到达；抵达  C. 平衡；余额  D. 争吵；争论
>
> 正确答案 A；干扰项来自同词性、邻近词带。

### B.2 是/否（扫描）

> 判断下面是不是一个真实的英语单词：
>
> 1. `plausible`（是）
> 2. `plausable`（否，常见拼写错误）
> 3. `brimful`（是）
> 4. `glorpish`（否，假词）

计分按 `% correctav`：真词正确率与假词正确率各占一半；不要只算总正确率。

### B.3 拼写（深度）

> 中文：**放弃；抛弃**
> 请输入英文：`________`
>
> 接受：`abandon`；不接受：`abandan`、`abandone`（可给一次「接近」提示，但不自动判对）。

### B.4 解析器命令（产出）

> 房间：**灯塔门厅**
> 描述：`The door is locked. A brass key hangs by the frame. A lantern sits on the table.`
>
> 目标词：`unlock`、`brass`、`key`、`lower`、`lantern`
>
> 可用命令：`unlock door with brass key`、`lower lantern`、`read logbook`
>
> 解析失败示例：`key door` → 建议 `unlock door with key`；不扣 HP。

---

## 附录 C：术语

| 术语 | 含义 |
| --- | --- |
| IRT | Item Response Theory，项目反应理论；用题目参数与潜在能力建模作答 |
| 3PL | 三参数 Logistic 模型：区分度 `a`、难度 `b`、猜对率 `c` |
| EAP | Expected A Posteriori，期望后验；在能力网格上做贝叶斯更新 |
| CAT | Computerized Adaptive Testing，计算机自适应测验 |
| `θ` | 学习者潜在能力；本项目的「四级词库内水平」 |
| `b_i` | 第 i 个词的难度 |
| `V̂` | 词汇量估计；`Σ P_know_i(θ̂)` |
| `SE` | 标准误；`θ̂` 的不确定性 |
| FSRS | Free Spaced Repetition Scheduler，自由间隔重复调度器 |
| HLR | Half-Life Regression，半衰期回归 |
| BKT | Bayesian Knowledge Tracing，贝叶斯知识追踪 |
| parser-lite | 轻量「动词 + 名词」解析器；不是完整 IF 引擎 |
