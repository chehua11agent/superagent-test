# 《四级单词跑团》规则书与 GitHub 基建调研

| 项目 | 内容 |
| --- | --- |
| 调研日期 | 2026-11-08 |
| 版本 | v1.0 |
| 范围 | 市面跑团规则书、单人/轻量规则、GitHub 开源项目 |
| 需求依据 | 飞书聊天中的 10 条设计原则 + [设计文档 PR #2](https://github.com/chehua11agent/superagent-test/pull/2) 0.3 的六条硬约束 |
| 一句话结论 | 没有一本跑团书能同时满足"15 分钟 + SRS + 词即行动 + 开放世界"；以 **Ironsworn** 为骨架，借 Fate/PbtA/Blades/24XX 各一层；GitHub 没有现成成品，但有可组合的基建 |

---

## 0. 结论先行

### 0.1 五个直接答案

| 问题 | 结论 |
| --- | --- |
| 最值得读的一本跑团书 | **Ironsworn**：免费、单人、GM-less、fail-forward、progress track、oracle，几乎是为"离线单人文字跑团"准备的 |
| 哪个机制最适合"单词检定" | **Ironsworn 的 strong hit / weak hit / miss**：正好对应"答对 / 答对但有代价 / 答错"，比二元对错更适合学习 |
| "词即法术/道具/检定"从哪来 | 保留现有 D&D 5e 词汇分类（`spell` / `item` / `check`）；只借分类，不搬 d20+AC、先攻、法术位 |
| 15 分钟和 SRS 从哪来 | 跑团书不提供 SRS。节拍借 **24XX** 的"一局一任务"和单人 journaling 的每日开场；**1/3/7/16 的调度必须自研** |
| GitHub 有没有 | **没有可直接用的 CET-4 跑团成品**；有 SRD 数据、叙事引擎、SRS 库、CET-4 词库，可以拼出来 |

### 0.2 一句话建议

> 用 **Ironsworn** 做世界与判定的骨架，用 **Fate 的 aspect** 表达"词卡"，用 **Blades 的 clock** 表达章节/线索压力，用 **24XX** 控制 15 分钟节拍；SRS、词表、六章结构保持自研。D&D 5e 只当"词汇分类词典"，CoC 只当"线索结构"参考。

---

## 1. 需求拆成两层

### 1.1 世界层（最初 10 条原则）

| # | 原则 | 对规则书的要求 |
| --- | --- | --- |
| 1 | 先好玩，再学习 | 规则本身要能撑住"愿意待着的世界"，不能只是学习外壳 |
| 2 | 先给答案，再考 | 新词先展示、再测试；规则不能一上来就惩罚 |
| 3 | 奖励来自熟练 | 同一个词反复出现要有递增回报，需要"熟练度/资产"概念 |
| 4 | 犯错是发育的道路 | 失败要产生反馈与后续，而不是读档重来 |
| 5 | 自由是路径多 | 同一目标至少三条解法，规则要支持"多种行动方式" |
| 6 | 信息必须拼凑 | 规则要能"一次只给一块信息"，需要线索/揭示机制 |
| 7 | 世界要回应 | 需要反应掷骰、代价、势力/front 等"世界会动"的工具 |
| 8 | 空间要用图表达 | 需要位置/距离/地图的轻量表达，而不是纯数字 |
| 9 | 场景要能复用 | 需要场景模板、遭遇表、oracle，而不是一次性剧情 |
| 10 | 离线、单机、跨平台 | 规则要能被本地状态机执行，不依赖真人 GM 或在线服务 |

### 1.2 学习层（设计文档六条硬约束）

| # | 约束 | 跑团书能解决吗 |
| --- | --- | --- |
| 1 | 每天 15 分钟：5 分钟 SRS + 10 分钟剧情 | **不能**。书能给"一场景多长"，给不了"SRS 5 分钟" |
| 2 | 1/3/7/16 间隔、10–20 新词/天、复习优先 | **不能**。这是学习调度，不是跑团规则 |
| 3 | 单词即行动，失败有 HP/线索/分支代价 | **能借语法**。三档结果、clock、harm 都是现成的 |
| 4 | 6 章 × 30–50 词，按 CET-4 词频排序 | **不能**。这是内容管线，书只提供章节/战役结构 |
| 5 | 习惯锚点、进度可见、异步/社交、已认识跳过 | **部分能**。journaling 的每日 prompt、progress track 可参考 |
| 6 | 避开：一次背太多、只读不测、没有复习、剧情过重 | **不能**。这是产品约束，需要自研与验收 |

### 1.3 关键判断

> **跑团书解决"世界如何回应玩家"，不解决"单词如何进入长期记忆"。**
> 把 SRS、词表、六章结构都寄托在某一本跑团书上，会找不到；正确做法是"书管叙事与判定，自研管学习与调度"。

---

## 2. 候选规则书逐个看

### 2.1 Ironsworn（首选骨架）

| 项 | 内容 |
| --- | --- |
| 作者/年份 | Shawn Tomkin，2018；ENNIE"最佳免费游戏" |
| 模式 | 单人 / 双人 / 多人，**GM-less**，低准备 |
| 核心机制 | action roll（d6 + 属性 vs 2d10）→ **strong hit / weak hit / miss**；vow + progress track；oracle；Pay the Price |
| 基调 | 北欧低魔、誓言与荒野；可无痛换皮成"词境" |

**为什么适合**

- **为单人设计**：不需要真人 GM，规则本身就假设"你自己提问、自己裁定"，天然适合离线 App。
- **三档结果**：`strong hit` = 干净成功，`weak hit` = 成功但有代价，`miss` = 失败且局势恶化。这正好映射"秒答对 / 答对但超时或用提示 / 答错"，比"对/错"更有叙事张力。
- **progress track**：10 格进度条，可做 6 章进度、单章 48 词进度、BOSS 战进度。
- **oracle**：一张张随机表，回答"接下来发生什么""NPC 想要什么"，正好满足"信息拼凑"和"场景复用"。
- **数字化友好**：moves/oracles/assets 有 JSON 数据（[dataforged](https://github.com/rsek/dataforged)、[datasworn](https://github.com/rsek/datasworn)），也有 Foundry 实现。
- **免费**：官网可免费下载；SRD、asset cards、oracle tables 以 CC BY 4.0 开放商用。

**哪里不适合**

- 不是学习系统：没有词表、没有 SRS、没有"CET-4 词频"。
- 完整规则仍有 200 多页；15 分钟一局只能取 3–5 个核心 move，其余要裁掉。
- 战斗/旅程 moves 偏多，直接搬会让"剧情过重"，违反第 6 条避坑。

**具体取哪几块**

- `Face Danger`（面对危险）→ 单词检定的通用外壳
- `Compel`（说服/威胁/欺骗）→ 交谈类词行动
- `Gather Information`（收集信息）→ 线索类词行动
- `Enter the Fray` / `Strike` / `Clash` / `End the Fight` → 合并成一个"战斗场景"流程
- `Ask the Oracle` → 场景生成、NPC 反应、分支选择
- `Pay the Price` → 失败代价表（HP/线索/分支三选一）
- progress track → 章节/BOSS 进度

**许可**：全文 CC BY-NC-SA 4.0（非商业）；SRD、asset cards、oracle tables 为 CC BY 4.0（商业可用，需署名）。详见[官方许可说明](https://tomkinpress.com/pages/licensing)。

**获取**：[ironswornrpg.com](https://www.ironswornrpg.com/) 免费下载；《Ironsworn: Starforged》付费，但其 Reference Guide 以 CC BY 4.0 开放。

---

### 2.2 Fate Core / Fate Accelerated（词卡表达最佳）

| 项 | 内容 |
| --- | --- |
| 核心 | **aspect**（短句/标签）、invoke / compel、4dF、consequence |
| 适合 | "一个词 = 一个可 invoke 的 aspect"；"词库"就是角色卡上的 aspect 列表；compel 可以制造"词义用错/被词反噬"的剧情代价 |
| 不适合 | 太自由，缺程序化世界；需要裁判；4dF 随机对"回忆测试"没有意义 |
| 取哪块 | aspect 的词卡表达；"熟练 = 免费 invoke"；compel 的"词有代价" |
| 许可 | Fate Core 文本 CC BY 3.0，SRD 免费（[faterpg.com/licensing](https://www.faterpg.com/licensing/)） |

**用法示例**：把 `barrier` 写成 aspect「屏障（barrier）」，熟练后每天第一次 invoke 免费；答错时 GM/系统 compel 它，让屏障反过来困住玩家——这就是"失败有剧情代价"。

---

### 2.3 Dungeon World / PbtA（失败代价语法）

| 项 | 内容 |
| --- | --- |
| 核心 | 2d6 + 属性：**10+ / 7–9 / 6-**；GM moves；fronts |
| 适合 | 7–9 的"部分成功"是失败代价的现成语法；fronts 可做章节威胁；"fiction first"适合文字叙事 |
| 不适合 | 必须有人当 GM；职业/战斗 moves 对词汇游戏太重；d6 随机与"答对"冲突 |
| 取哪块 | 三档结果、GM moves 的"代价清单"、fronts（每章一个威胁） |
| 许可 | 规则文本 CC BY（署名），可商用改编（[dungeonworld.com](https://www.dungeonworld.com/)） |

**注意**：PbtA 是"家族"，不是一本统一规则书；Dungeon World 是最容易读、最适合奇幻的一本。其他 PbtA（Apocalypse World、Masks 等）不必看。

---

### 2.4 Blades in the Dark（资源与时钟）

| 项 | 内容 |
| --- | --- |
| 核心 | d6 pool：1–3 / 4–5 / 6；stress / trauma；**progress clock**；flashback；downtime |
| 适合 | 4/6/8 格 clock 做"章节进度/线索/追兵"；stress 做"HP 之外的压力"；flashback 做"复习旧词"；downtime 做"每日 SRS" |
| 不适合 | 为团伙犯罪设计，默认多人 + GM；Duskwall 设定受版权保护；15 分钟一局偏重 |
| 取哪块 | clock、stress、downtime 的"回合间行动" |
| 许可 | SRD 为 CC BY 3.0（"Forged in the Dark"）；不可用 Duskwall 设定、logo、标题（[许可说明](https://bladesinthedark.com/licensing)） |

**用法示例**：一章的"污染度"用 8 格 clock；每次答错填 1 格，填满触发章节 BOSS 提前出现——比单纯扣 HP 更有"世界在动"的感觉。

---

### 2.5 Cairn（轻量 OSR 探索）

| 项 | 内容 |
| --- | --- |
| 核心 | d20 roll-under、无职业、物品栏、探索回合、危险战斗 |
| 适合 | 轻、免费、适合"探索/交谈/战斗"的开放世界；探索程序（回合、遭遇、反应）可直接做场景模板；失败代价天然是 HP/装备/位置 |
| 不适合 | d20 二元判定；没有词学习层；战斗太致命，不适合每天 15 分钟的连续剧情 |
| 取哪块 | 探索回合、反应掷骰、场景/遭遇表、物品栏（词卡=物品） |
| 许可 | 全文 CC BY-SA 4.0（**传染**：改编发布需同许可） |
| 获取 | [cairn.press](https://cairn.press/) / [GitHub](https://github.com/yochaigal/cairn) |

---

### 2.6 24XX（15 分钟节拍参照）

| 项 | 内容 |
| --- | --- |
| 核心 | 一页规则、d6 pool、"一局一任务"、职业/技能即标签 |
| 适合 | 15 分钟节拍的最佳参照：一次 session = 一个 job；场景少而完整 |
| 不适合 | 没有长期进度/SRS；世界很薄 |
| 取哪块 | session 结构、场景数量、判定档位 |
| 许可 | CC BY 4.0（[itch.io](https://jasontocci.itch.io/24xx)） |

**关键启发**：24XX 的一局通常只有 3–5 个场景。你们的"每天 3 个场景 × 4 新词"正好可以套这个结构，而不是一章 12 个场景一次跑完。

---

### 2.7 Thousand Year Old Vampire / Quill（每日习惯参照）

| 项 | 内容 |
| --- | --- |
| 核心 | 单人 journaling：每次一个 prompt，写日志；资源有限（memories / ink） |
| 适合 | 把"每天 15 分钟"变成习惯锚点；prompt 驱动，不需要 GM；"记忆"资源与 SRS 天然相似 |
| 不适合 | 没有战斗/探索程序；写作量大；不适合"自由行动" |
| 取哪块 | 每日开场 prompt、日志/回顾、资源消耗 |
| 许可 | 商业书，不能复制文本；只能学结构 |
| 获取 | [thousandyearoldvampire.com](https://thousandyearoldvampire.com/)；Quill（Trollish Delver） |

**关键启发**：每天打开 App 的第一屏可以是一句"今日词境"prompt（如"雾港的钟又响了，你今天只能带走 12 个词"），比冷冰冰的"今日复习 37 张"更能形成习惯。

---

### 2.8 D&D 5e SRD（词表底座，不是玩法底座）

| 项 | 内容 |
| --- | --- |
| 适合 | 六属性 / 18 技能 / 状态 / 法术 / 装备的分类，正好是 `DND-VOCAB-TASK.txt` 要的 100–150 词框架；SRD 5.1/5.2 以 CC BY 4.0 开放 |
| 不适合 | d20+AC、先攻、法术位、CR 战斗经济、3 小时 session；与 15 分钟 + 单词判定冲突 |
| 取哪块 | 词汇分类、DC 的"难度"直觉（可作词难度）、状态/法术的效果标签 |
| 许可 | SRD CC BY 4.0；PHB 本身受版权保护；不可用商标/美术（[dndbeyond.com/srd](https://www.dndbeyond.com/srd)） |

**结论**：D&D 5e 是"最好的词汇分类学"，但不是"最好的玩法骨架"。你们已经用 `spell/item/check` 做了正确的事，继续保留；不要为了"像 D&D"而加入先攻和法术位。

---

### 2.9 Call of Cthulhu 7e（不推荐）

| 项 | 内容 |
| --- | --- |
| 适合 | 调查/线索/理智的氛围；"线索"机制与设计文档第 4 章的线索资源相似 |
| 不适合 | d100 技能、理智、长时间调查；不开放；与"每天 15 分钟、6 章"不匹配 |
| 取哪块 | 线索/调查的结构（可参考，不必用规则） |
| 许可 | 不开放；中文版可购买，但不能复制文本（[chaosium.com](https://www.chaosium.com/)） |

---

### 2.10 阅读顺序（如果只有两个晚上）

| 优先级 | 书/部分 | 读什么 | 预计 |
| --- | --- | --- | --- |
| 1 | Ironsworn | 核心 moves、Ask the Oracle、progress track、Pay the Price | 2–3 小时 |
| 2 | Dungeon World | Moves 章节：10+ / 7–9 / 6- 与 GM moves | 1 小时 |
| 3 | Blades in the Dark SRD | clock、stress、downtime | 1 小时 |
| 4 | Fate Core | aspect、invoke、compel | 1 小时 |
| 5 | 24XX | 一页规则与"一局一任务"结构 | 15 分钟 |
| 6 | Cairn | 探索回合、反应掷骰、遭遇表 | 1 小时 |
| 7 | D&D 5e SRD | 只扫技能/状态/法术/装备词表，不通读 | 1 小时 |

> 先读第 1 本，能跑起来再读 2–4；5–7 是查阅型，不必通读。

### 2.11 候选总表

图例：● 适合 ／ ◐ 部分适合 ／ ○ 不适合

| 规则书 | 单人/GM-less | 15 分钟 | 词即行动 | 失败代价 | 开放世界 | 许可友好 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ironsworn | ● | ◐ | ◐ | ● | ● | ● | **首选骨架** |
| Fate Core | ◐ | ● | ● | ◐ | ◐ | ● | 借 aspect |
| Dungeon World | ○ | ◐ | ◐ | ● | ◐ | ● | 借三档结果 |
| Blades in the Dark | ○ | ○ | ◐ | ● | ◐ | ● | 借 clock/stress |
| Cairn | ◐ | ● | ○ | ● | ● | ◐ | 借探索程序 |
| 24XX | ◐ | ● | ○ | ◐ | ○ | ● | 借节拍 |
| Thousand Year Old Vampire | ● | ● | ○ | ◐ | ○ | ○ | 借每日 prompt |
| D&D 5e SRD | ○ | ○ | ◐ | ◐ | ◐ | ● | 只借词汇分类 |
| CoC 7e | ○ | ○ | ○ | ◐ | ◐ | ○ | 只借线索结构 |

---

## 3. 推荐组合：一本骨架 + 四种借法

### 3.1 组合

| 层 | 用什么 | 来源 |
| --- | --- | --- |
| 世界与判定 | 三档结果、oracle、progress track | Ironsworn |
| 词卡 | aspect / asset 的"可 invoke 标签" | Fate + 现有 `spell/item/check` |
| 失败代价 | strong/weak/miss + Pay the Price | Ironsworn / PbtA |
| 章节压力 | 4/6/8 格 clock、stress | Blades |
| 15 分钟节拍 | 一局一任务、3–5 场景 | 24XX |
| 每日习惯 | 开场 prompt、日志回顾 | Thousand Year Old Vampire / Quill |
| 词表与 SRS | 自研；可选 ts-fsrs | 设计文档 + ts-fsrs |

### 3.2 需求 → 机制映射

| 需求 | 机制 | 来源 | 在本项目怎么写 |
| --- | --- | --- | --- |
| 每天 15 分钟 | 3 拍场景：旁白 → 词行动 → 后果 | 24XX / Ironsworn | 每场景 1–2 个词行动，硬上限；3 场景 ≈ 10 分钟 |
| SRS 1/3/7/16 | 外部调度器 | 自研 / ts-fsrs | 答对升档，答错回 1 天；复习清空前锁新词 |
| 词即行动 | 词卡三类型 | D&D SRD + 设计文档 | `spell` / `item` / `check`，每张卡绑定 `effect_tag` |
| 失败代价 | strong / weak / miss | Ironsworn / PbtA | 秒答对 = strong；答对但超时/用提示 = weak；答错 = miss |
| HP / 线索 / 分支 | harm / clock / clue | Ironsworn / Blades / CoC | HP = harm；线索 = 3 格 clock；分支 = miss 的 `next` |
| 6 章 | vow + progress track | Ironsworn | 6 章 = 6 个 vow；48 词 = 48 格进度 |
| 开放世界 | oracle + fronts | Ironsworn / Dungeon World | 每章 1 个 front；场景用 oracle 生成，不写死 |
| 场景复用 | 探索回合 / 遭遇表 | Cairn | 大厅/矿道/集市各一套模板，换皮不换程序 |
| 熟练奖励 | aspect invoke / asset | Fate / Ironsworn | mastered 词 = 每日一次免费 invoke / 永久 asset |
| 先教后考 | 契约 | 设计文档 | 新词先展示（英文+音标+例句），再 4 选 1 |
| 信息拼凑 | oracle / clue | Ironsworn / CoC | 每次只给一块信息，线索可丢可找回 |
| 已认识跳过 | 验证后标记 `known` | 设计文档 | 跳过词不进 SRS，不给经验 |

### 3.3 一个 10 分钟场景怎么跑

> **场景**：矿道落石。旁白两句，给出两个词行动：`avoid`（闪避）或 `balance`（保持平衡）。

1. **选择**：玩家选 `avoid`（卡面只显示中文"闪避"和效果，不显示英文）。
2. **回忆**：输入 `avoid`。
3. **结算**：
   - 5 秒内答对 → **strong hit**：干净通过，额外获得线索"矿工记号"。
   - 答对但超时/用了提示 → **weak hit**：通过，但 HP -10，SRS 正常升档。
   - 答错 → **miss**：HP -15，进入"被碎石掩埋"代价分支；SRS 回 1 天；下一场景仍可继续（fail-forward）。
4. **推进**：无论哪种结果都进入下一拍，不卡死。

**与设计文档对齐**：每章 12 场景 × 4 新词；每天 12 新词 = 3 场景；一章约 4 天；6 章约 24 天。

### 3.4 不要搬的东西

- ❌ **d20 + AC / 先攻 / 法术位 / CR**：把 15 分钟拖成 3 小时，而且和"单词答对"冲突。
- ❌ **CoC 的 d100 / 理智**：氛围合适，系统不合适；线索结构可借，规则不要。
- ❌ **Foundry / MapTool 的多人地图与回合制**：与"离线单机、文字优先"目标相反。
- ❌ **长篇模组/战役书**：为人类 GM、3–4 小时 session 设计，剧情受版权保护，也不能复用。
- ❌ **经验值/等级门槛**：设计文档已明确 XP 只做展示；不要让"刷词"变成数值游戏。

---

## 4. GitHub 有哪些

### 4.1 结论

- **没有可直接用的"四级单词跑团"成品**。搜 `vocabulary RPG`、`word RPG`、`CET4 game`，能找到的多是个人 demo（0–12 星），例如 `wordspire-tower`、`word-quest-toeic-rpg`、`RPG-ChineseGame`，都还不能当底座。
- **规则书全文在 GitHub 上合法开源的只有少数**（Cairn、Fate SRD、24XX 等）；D&D 5e、CoC、Blades 的完整商业书没有合法公开仓库，搜到的"完整 PDF"多为侵权扫描件，不要用。
- **有可组合的基建**：规则数据、叙事引擎、SRS 库、CET-4 词库都齐全，缺的是"把它们接起来"的中间层。
- **VTT（Foundry/MapTool）不是单机离线文字游戏的底座**：它们为多人联机地图设计，重、闭源或许可证不匹配。
- **AI DM 项目很早期**（多为 0–12 星），且设计原则明确"AI 是加分项不是必需品"，不建议作为核心依赖。

### 4.2 规则与数据

| 项目 | 用途 | 许可 | ★（约） |
| --- | --- | --- | --- |
| [5e-bits/5e-database](https://github.com/5e-bits/5e-database) | D&D 5e SRD 的 JSON 数据库 | MIT | 943 |
| [open5e/open5e-api](https://github.com/open5e/open5e-api) | 5e SRD API，可查法术/状态/装备 | 修改版 MIT；SRD 内容 CC BY 4.0 | 220 |
| [rsek/dataforged](https://github.com/rsek/dataforged) | Ironsworn/Starforged 的 moves/oracles/assets JSON | 数据 CC BY 4.0 | 223 |
| [yochaigal/cairn](https://github.com/yochaigal/cairn) | Cairn 全文源文件 | CC BY-SA 4.0 | 205 |
| [fate-srd/fate-srd-content](https://github.com/fate-srd/fate-srd-content) | Fate SRD 内容 | Fate 文本 CC BY 3.0 | 63 |

> `dataforged` 已有后继 `datasworn`（预发布，版本间可能有 breaking change），新项目可以评估，但生产环境优先用稳定的 `dataforged`。

### 4.3 引擎与规则实现

| 项目 | 用途 | 许可 | ★（约） |
| --- | --- | --- | --- |
| [inkle/ink](https://github.com/inkle/ink) | 叙事脚本语言，适合分支剧情 | MIT | 5008 |
| [y-lohse/inkjs](https://github.com/y-lohse/inkjs) | Ink 的 JavaScript 运行时，可进 PWA | MIT | 664 |
| [YarnSpinnerTool/YarnSpinner](https://github.com/YarnSpinnerTool/YarnSpinner) | 对话系统（Unity/C#） | MIT | 2871 |
| [klembot/twinejs](https://github.com/klembot/twinejs) | 互动小说原型工具 | GPL-3.0 | 2942 |
| [ben/foundry-ironsworn](https://github.com/ben/foundry-ironsworn) | Foundry 的 Ironsworn 系统实现 | 见仓库 | 81 |
| [foundryvtt/dnd5e](https://github.com/foundryvtt/dnd5e) | Foundry 的 5e 系统实现 | MIT | 610 |
| [Miskatonic-Investigative-Society/CoC7-FoundryVTT](https://github.com/Miskatonic-Investigative-Society/CoC7-FoundryVTT) | CoC7 的 Foundry 系统（含中文） | GPL-3.0 | 170 |
| [RPTools/maptool](https://github.com/RPTools/maptool) | 开源 VTT | AGPL-3.0 | 931 |
| [evennia/evennia](https://github.com/evennia/evennia) | Python MUD/文字世界框架 | BSD-3 | 2119 |

> Foundry VTT 本体是商业软件，其 GitHub 仓库只是 issue tracker，不是源码；不要把它当开源底座。

### 4.4 学习、SRS 与词库

| 项目 | 用途 | 许可 | ★（约） |
| --- | --- | --- | --- |
| [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | TypeScript 的 FSRS 调度 | MIT | 860 |
| [open-spaced-repetition/fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki) | FSRS 算法参考实现 | MIT | 4127 |
| [ankitects/anki](https://github.com/ankitects/anki) | 复习模型/数据模型参考 | AGPL-3.0 | 32667 |
| [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) | 英汉词典库，带 `cet4` 等考试标签 | MIT | 8572 |
| [RealKai42/qwerty-learner](https://github.com/RealKai42/qwerty-learner) | 单词练习交互、CET-4 词库参考 | GPL-3.0 | 23723 |
| [mahavivo/english-wordlists](https://github.com/mahavivo/english-wordlists) | 常用英语词表 | **无许可** | 2540 |

> `qwerty-learner` 是 GPL-3.0：参考交互可以，直接复制代码进闭源产品要注意传染性。
> `english-wordlists` 没有许可证：不能直接商用，只能用于内部比对。

### 4.5 建议技术组合（对齐设计文档 8.1）

设计文档已经定了 **PWA（React/Next.js）+ Node/TS + PostgreSQL**，因此：

| 需求 | 选择 | 理由 |
| --- | --- | --- |
| 剧情脚本 | **Ink + inkjs** | MIT；编剧友好；分支/变量强；JS 运行时能进 PWA；离线可跑 |
| 世界状态 | TypeScript 自研状态机 | 场景图、HP/线索/clock 都是小状态，不需要重型引擎 |
| 判定 | 自研 `resolveWordAction()` | 输入是"词是否正确/是否用提示/耗时"，输出 strong/weak/miss + 代价 |
| SRS | 自研固定 1/3/7/16；可选 ts-fsrs | 设计文档已固定档位；FSRS 可作为二期个性化 |
| 词库 | ECDICT（`cet4` 标签）+ 真题词频 | MIT；可离线；和现有词频管线一致 |
| 存储 | IndexedDB + Postgres | 离线优先，登录后云同步 |
| 地图 | SVG/Canvas 轻量绘制 | 满足"空间用图表达"，不引入 VTT |

**不建议**：Foundry/MapTool（多人 VTT）、Unity + Yarn Spinner（除非确定做 Unity 客户端）、AI DM 作为核心（离线目标冲突）。

---

## 5. 许可与版权红线

> 以下是工程判断，不是法律意见；商用前让法务确认。

| 来源 | 许可 | 可以做什么 | 必须/不能 |
| --- | --- | --- | --- |
| D&D 5e SRD 5.1/5.2 | CC BY 4.0 | 商用、改编、翻译 | 署名；不能用商标/美术；PHB 正文不在 SRD 内 |
| Ironsworn 全文 | CC BY-NC-SA 4.0 | 非商业改编 | 署名、同许可、非商业 |
| Ironsworn SRD / assets / oracles | CC BY 4.0 | 商业改编 | 署名；不能暗示官方 |
| Starforged Reference Guide | CC BY 4.0 | 商业改编 | 署名 |
| Fate Core | CC BY 3.0 | 商用改编 | 署名 |
| Dungeon World | CC BY | 商用改编 | 署名 |
| Blades SRD | CC BY 3.0 | 商用改编 | 署名；不能用 Duskwall/logo/标题；用 Forged in the Dark logo 需按声明 |
| Cairn | CC BY-SA 4.0 | 商用改编 | 署名 + **同许可**（传染） |
| 24XX | CC BY 4.0 | 商用改编 | 署名 |
| CoC 7e | 不开放 | 只能参考 | 不能复制文本/设定/商标 |
| CET-4 真题/词汇 PDF | 版权 | 内部研究 | 不入库、不再分发（与 PR #2 的处理一致） |
| ECDICT | MIT | 商用 | 保留版权声明 |
| qwerty-learner | GPL-3.0 | 参考/隔离使用 | 衍生分发需 GPL |
| mahavivo/english-wordlists | 无许可 | 不能合法复用 | 仅参考 |
| Foundry VTT | 商业许可 | 购买使用 | 不是开源；不能打包再分发 |
| MapTool | AGPL-3.0 | 商用/自建 | 分发修改需 AGPL |

**三条底线**

1. **不把真题/PDF 提交进仓库**；只保留派生词表与词频结果（沿用 PR #2 的做法）。
2. **不复制商业规则书正文**（D&D PHB、CoC、Blades 设定、Ironsworn 全文的非商业部分）。
3. **按来源逐一署名**；CC BY 的署名要写清作者、作品、许可链接。

---

## 6. 建议的下一步（三个小实验）

| # | 实验 | 产出 | 验证什么 |
| --- | --- | --- | --- |
| 1 | 用 Ironsworn 核心 moves 改写第 1 章 3 个场景，纸面跑一局 15 分钟 | 一页"场景→词行动→strong/weak/miss"脚本 | 三档结果是否比"对/错"更好玩、是否仍能在 15 分钟内完成 |
| 2 | 用 Ink 写一个 5 场景 demo，接 inkjs | 可点击的 PWA 原型 | 分支/变量/离线是否够用；是否需要自研状态机 |
| 3 | 用 ECDICT + 真题词频生成 288 词候选表 | 6 章 × 48 词 CSV | 词频递增、词性/难度配平、与设计文档 5.x 的管线一致 |

三个实验都通过后，再决定是否把"规则层"写进设计文档；否则保持设计文档现状，不提前引入跑团规则。

---

## 7. 参考链接

**规则书与许可**

- Ironsworn 官网（免费下载）：https://www.ironswornrpg.com/
- Ironsworn 许可说明：https://tomkinpress.com/pages/licensing
- Fate 许可：https://www.faterpg.com/licensing/
- Fate SRD：https://fate-srd.com/
- Dungeon World：https://www.dungeonworld.com/
- Blades in the Dark 许可：https://bladesinthedark.com/licensing
- D&D 5e SRD：https://www.dndbeyond.com/srd
- Cairn：https://cairn.press/
- 24XX：https://jasontocci.itch.io/24xx
- Thousand Year Old Vampire：https://thousandyearoldvampire.com/
- Call of Cthulhu：https://www.chaosium.com/

**GitHub**

- 5e-database：https://github.com/5e-bits/5e-database
- open5e-api：https://github.com/open5e/open5e-api
- dataforged：https://github.com/rsek/dataforged
- datasworn：https://github.com/rsek/datasworn
- Cairn：https://github.com/yochaigal/cairn
- ink：https://github.com/inkle/ink
- inkjs：https://github.com/y-lohse/inkjs
- ts-fsrs：https://github.com/open-spaced-repetition/ts-fsrs
- ECDICT：https://github.com/skywind3000/ECDICT
- qwerty-learner：https://github.com/RealKai42/qwerty-learner

---

## 附录 A：术语速查

| 术语 | 含义 | 在本项目里对应什么 |
| --- | --- | --- |
| move | 一次"触发规则"的行动描述 | 一次词行动（选择词卡 → 回忆 → 结算） |
| strong hit | 干净成功 | 秒答对，无代价，可额外奖励 |
| weak hit | 成功但有代价 | 答对但超时/用提示，扣 HP 或丢线索 |
| miss | 失败，局势恶化 | 答错，进入代价分支，SRS 回 1 天 |
| progress track | 10 格进度条 | 章节进度、BOSS 进度 |
| oracle | 随机表，回答"接下来发生什么" | 场景生成、NPC 反应、分支选择 |
| aspect | 角色/场景上的短标签，可 invoke | 词卡（`barrier` = 屏障 aspect） |
| clock | 4/6/8 格进度钟 | 污染度、追兵、线索 |
| stress | 压力资源，可换加骰 | HP 之外的第二资源（可选） |
| fronts | 章节级威胁/势力 | 每章的 BOSS 与倒计时 |
| fail-forward | 失败也推进剧情 | 答错必有一个可继续的 `next` |
| GM-less | 无需真人主持 | 单机 App 自己当裁判 |
| SRD | 系统参考文档，开放许可的规则子集 | 可合法复用的规则数据 |
