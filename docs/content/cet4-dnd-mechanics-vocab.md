# CET-4 × DnD 5e 机制词汇表

> 任务来源：`DND-VOCAB-TASK.txt`（2026-11-08 上传）。  
> 产出：5 类 × 10 个机制 × 3 个词 = **150 词**；每类 3 个可玩点子。  
> 配套导入数据：[`data/cet4-dnd-vocab.json`](../../data/cet4-dnd-vocab.json)

## 0. 口径与校验

| 项目 | 口径 | 结果 |
|---|---|---|
| 词汇基准 | 公开《大学英语四级大纲单词表》CET4_edited.txt（4615 条 / 4530 个唯一词头） | 150/150 词命中，0 个超纲 |
| 规则基准 | DnD 5e（2014）六大属性、18 技能、战斗动作、状态、法术学派、装备 | 未获取 PHB 原文，按公开 5e 规则写作，未编造机制 |
| 难度 | 1 = 常见，2 = 中等，3 = 偏难（均在四级大纲内） | 1/2/3 三档均有 |
| 去重 | 同一个 `en` 只出现在一个机制里 | 150 个词全部唯一 |
| 结构 | 每类 8–10 个机制，每机制 2–4 个词 | 每类 10 个机制 × 3 个词 |

两条口径说明：

1. 任务示例里的 `dodge` / `evade` 不在四级大纲词表中，本表改用 `avoid` / `slip` / `escape` 等大纲词；机制名仍保留 Dodge。`forge` / `fake` 同理未采用。
2. 18 项技能没有逐条成表（受每类 8–10 条上限约束）：“隐匿”并入「敏捷与隐匿」条目，避免与战斗动作「躲藏 Hide」重复收词；洞悉、调查、游说、欺瞒各自成条。

## 1. 知识库核对（2026-11-08）

用户在本轮追问“知识库有没有搭建好、词够不够”。核对结果如下：

| 检查项 | 现状 |
|---|---|
| 仓库里的词表数据 | 整合前 `main` 只有 `README.md`；设计文档 [`cet4-vocab-rpg.md`](../design/cet4-vocab-rpg.md) 没有词表/知识库数据文件 |
| 本轮新增 | ① 首批 150 词的可玩映射（本文件 + `data/cet4-dnd-vocab.json`）；② 全量四级大纲知识库（`data/cet4-syllabus-kb.json`，4530 个唯一词头）；③ 两本素材 363 + 471 页 OCR（全文在工作区） |
| 设计文档目标 | 6 章 × 48 = 288 词；可玩映射 150 词，完成 52%，还差 138 词；大纲知识库另有 4530 词可用于后续扩表 |
| 四级大纲规模 | 4615 条 / 4530 个唯一词头；知识库已覆盖全部 4530 词，其中 3629 词在 OCR 书中定位到词条页（80.1%） |
| 两本素材 | 《英语四级 你还在背单词吗》363 页 + 《就这样过英语四级》471 页；页级 OCR 全部完成；清单见 `data/cet4-materials/`，全文在工作区；完整性见第 6 节 |
| 真题素材 | 素材文件夹标称 24 个文件，消息中当前列出 10 份真题 PDF（2023-12 至 2025-12） |
| 已做过的真题解析 | 设计文档附录 E 记录了 2023-12 第 1 套（19 页，约 79k 字符）的词频试跑 |

**结论：知识库已搭建到全量四级大纲词表。** 4530 个唯一词头全部有中文释义；其中 3629 词通过 OCR 在词汇书中定位到词条页。可玩映射仍是首批 150 词，距设计文档 288 词目标还差 138 词；若目标是“靠游戏过四级”，词库已覆盖大纲，但还需要把 4530 词按词频/玩法分层接入，150 词映射只是可玩切片。

另：本轮 150 词按机制可玩性选词，不是按 10 份真题的词频排序；真题词频排序与玩法分层属于后续工作。

## 2. 总表

难度：1 = 常见，2 = 中等，3 = 偏难。词汇列格式为 `英文（中文）`。

### 2.1 六大属性与 18 项技能

| 机制 | 词汇 | 难度 | 对应理由 | 能怎么玩 |
|---|---|---|---|---|
| 力量 Strength | strength（力量） | 1 | 力量属性本身决定推、拉、举、攀的运动检定。 | 卡牌：推开石门，strength 达标才能打开。 |
| 力量 Strength | force（力；强迫） | 2 | 表示施加的力，对应推撞与破门。 | 事件：用 force 推倒书架，制造掩体。 |
| 力量 Strength | muscle（肌肉；体力） | 2 | 肌肉量是力量的外在表现，常用于体力活或威吓。 | 对话：向铁匠展示 muscle，换取重武器试用。 |
| 敏捷与隐匿 Dexterity & Stealth | quick（快的；敏捷的） | 1 | 敏捷决定先攻与反应速度。 | 卡牌：quick 检定抢在陷阱合拢前跳出。 |
| 敏捷与隐匿 Dexterity & Stealth | balance（平衡） | 2 | 平衡感对应杂技检定，走独木桥、窄梁都靠它。 | 事件：balance 失败会从梁上滑落。 |
| 敏捷与隐匿 Dexterity & Stealth | silent（沉默的；无声的） | 2 | 隐匿（Stealth）的核心是移动时不发出声音。 | 解密：按 silent 提示选择无声路线绕过守卫。 |
| 体质 Constitution | endure（忍受；忍耐） | 2 | 体质检定用于长时间跋涉、憋气、耐寒。 | 事件：endure 三回合暴风雪才能抵达山洞。 |
| 体质 Constitution | resist（抵抗） | 2 | 体质豁免抵抗毒素、疾病与法术侵蚀。 | 卡牌：resist 毒素豁免，成功只受半伤。 |
| 体质 Constitution | tough（坚韧的；强壮的） | 2 | 高体质角色更耐打，对应更多生命值。 | 对话：用 tough 说服队长让你断后。 |
| 智力 Intelligence | intelligence（智力） | 1 | 智力属性支撑奥秘、历史、调查等知识检定。 | 卡牌：intelligence 检定解读古代符文。 |
| 智力 Intelligence | knowledge（知识） | 1 | 知识类检定（奥秘、历史、宗教）用来回忆怪物弱点与传说。 | 事件：knowledge 成功才知道巨魔怕火。 |
| 智力 Intelligence | logic（逻辑；推理） | 2 | 逻辑推理对应调查现场的因果判断。 | 解密：用 logic 排除错误嫌疑人。 |
| 感知 Wisdom | perceive（察觉） | 2 | 感知（Wisdom）的核心是察觉环境细节。 | 卡牌：perceive 发现草丛里的伏兵。 |
| 感知 Wisdom | notice（注意到） | 1 | 被动察觉决定你是否注意到异常。 | 事件：notice 失败会错过墙上的暗门。 |
| 感知 Wisdom | aware（意识到的） | 2 | 警觉状态影响是否被突袭。 | 对话：保持 aware，才能听出话里的威胁。 |
| 魅力 Charisma | appeal（吸引力；呼吁） | 2 | 魅力包含吸引力与个人风采。 | 卡牌：appeal 打动贵族，争取一次会面。 |
| 魅力 Charisma | confidence（信心） | 2 | 自信影响说服与威吓的可信度。 | 对话：用 confidence 压住对方的气势。 |
| 魅力 Charisma | influence（影响） | 2 | 魅力检定用于影响他人态度。 | 事件：influence 让守卫睁一只眼闭一只眼。 |
| 洞悉 Insight | judge（判断） | 1 | 判断对方意图是洞悉检定的核心动作。 | 对话：judge 他是否在拖延时间。 |
| 洞悉 Insight | reason（推理；理由） | 2 | 从话语中推理隐含信息，对应洞悉。 | 解密：用 reason 拼出对方隐瞒的交易地点。 |
| 洞悉 Insight | understand（理解） | 1 | 理解真实意思是看穿谎言的最后一步。 | 卡牌：understand 成功识破假契约。 |
| 调查 Investigation | investigate（调查） | 2 | 调查（Investigation）用于搜查现场、推断线索。 | 卡牌：investigate 找出密室的机关。 |
| 调查 Investigation | examine（检查） | 1 | 仔细检查物品是调查的常见检定。 | 事件：examine 尸体，发现中毒迹象。 |
| 调查 Investigation | evidence（证据） | 2 | 证据是调查获得的硬线索。 | 解密：把 evidence 拼进指控书。 |
| 游说 Persuasion | persuade（说服） | 2 | 游说（Persuasion）用道理与好处改变对方。 | 卡牌：persuade 让卫兵放行。 |
| 游说 Persuasion | convince（使信服） | 2 | 使对方相信某个事实，属于游说。 | 对话：convince 村民相信你不是怪物。 |
| 游说 Persuasion | argue（争论；论证） | 2 | 争论、论证可争取中立者支持。 | 事件：argue 说服议会推迟处刑。 |
| 欺瞒 Deception | deceive（欺骗） | 2 | 欺瞒（Deception）是主动说谎。 | 卡牌：deceive 冒充信使混进营地。 |
| 欺瞒 Deception | trick（哄骗；诡计） | 1 | 设套诱骗，是欺瞒的玩法化表达。 | 事件：trick 守卫离开岗位。 |
| 欺瞒 Deception | pretend（假装） | 2 | 假装身份或状态，是欺瞒的常见手段。 | 对话：pretend 自己是占卜师套话。 |

**可玩点子**

> 卡牌「破门」：面对石门，从 strength / force / muscle 中选一张；strength 稳开，force 会惊动守卫，muscle 省时但耗体力。

> 事件「审讯」：商人说谎，先用 judge / reason / understand 找破绽，再用 persuade / convince 或 deceive / trick 让他开口；选错词会拿到假线索。

> 解密「密室」：墙上三行线索分别指向 perceive / investigate / knowledge，拼出开关顺序；只拿一块信息无法开门。

### 2.2 战斗动作与回合

| 机制 | 词汇 | 难度 | 对应理由 | 能怎么玩 |
|---|---|---|---|---|
| 回合 Turn | turn（回合；转动） | 1 | 回合（Turn）是战斗行动的基本单位。 | 卡牌：一 turn 内选择 attack 或 help 作为主行动。 |
| 回合 Turn | order（顺序；命令） | 1 | 先攻（Initiative）决定行动顺序。 | 事件：order 排错会让敌人先手。 |
| 回合 Turn | action（行动） | 2 | 标准动作（Action）决定本回合能做什么。 | 解密：把 action 分配给攻击、帮助或使用物品。 |
| 攻击 Attack | attack（攻击） | 1 | 攻击（Attack）是战斗最核心的动作。 | 卡牌：attack 命中 AC 才造成伤害。 |
| 攻击 Attack | strike（打击） | 2 | 打击是攻击的具象动作。 | 事件：strike 铁链，放下吊桥。 |
| 攻击 Attack | aim（瞄准） | 1 | 瞄准是攻击前的叙述动作，用来选定目标，不单独构成规则动作。 | 卡牌：aim 先选目标，再决定 attack 还是 help。 |
| 闪避 Dodge | avoid（避开） | 2 | 闪避（Dodge）的核心是让攻击落空。 | 卡牌：avoid 一次攻击，答对完全闪开。 |
| 闪避 Dodge | slip（溜走；滑） | 2 | 滑步、溜走是躲开攻击轨迹的动作。 | 事件：slip 过守卫的擒抱。 |
| 闪避 Dodge | escape（逃脱） | 1 | 从攻击中脱身，是闪避的另一种说法。 | 卡牌：escape 一次擒抱，成功则脱身。 |
| 冲刺 Dash | dash（猛冲） | 2 | 冲刺（Dash）消耗动作换取额外移动。 | 卡牌：dash 两回合冲过开阔地。 |
| 冲刺 Dash | rush（冲；催促） | 1 | 猛冲强调速度与时机。 | 事件：rush 在城门关闭前挤进去。 |
| 冲刺 Dash | speed（速度） | 1 | 速度决定每回合移动距离。 | 解密：算 speed 判断能否在陷阱前抵达。 |
| 撤离 Disengage | withdraw（撤退） | 3 | 有秩序地后撤，对应撤离动作。 | 事件：withdraw 到走廊再关门。 |
| 撤离 Disengage | retreat（退却） | 3 | 撤退是整体战术动作。 | 对话：retreat 时用假情报拖住追兵。 |
| 撤离 Disengage | leave（离开） | 1 | 离开近战范围，对应撤离动作。 | 卡牌：leave 近战范围，避免借机攻击。 |
| 帮助 Help | help（帮助） | 1 | 帮助（Help）动作给同伴优势。 | 卡牌：help 让队友下一次 attack 有优势。 |
| 帮助 Help | aid（援助） | 2 | 援助是 Help 动作的叙事表达，规则上给予同伴优势。 | 事件：aid 队友挣脱束缚。 |
| 帮助 Help | assist（协助） | 3 | 协助检定，对应 Help 的另一种用法。 | 对话：assist 铁匠完成修剑。 |
| 躲藏 Hide | hide（躲藏） | 1 | 躲藏（Hide）是敏捷（隐匿）检定。 | 卡牌：hide 成功则敌人失去目标。 |
| 躲藏 Hide | cover（掩体；遮盖） | 2 | 掩体提供 AC 加值，是躲藏的前提。 | 事件：找 cover 才能安全施法。 |
| 躲藏 Hide | shadow（阴影） | 2 | 阴影是躲藏的天然环境。 | 解密：按 shadow 标记选择潜行路线。 |
| 准备 Ready | prepare（准备） | 1 | 准备（Ready）动作预设触发条件。 | 卡牌：prepare 一次攻击，敌人进门就触发。 |
| 准备 Ready | wait（等待） | 1 | 等待触发是准备动作的核心。 | 事件：wait 到守卫转身再行动。 |
| 准备 Ready | ready（准备好的） | 1 | 准备就绪状态决定能否反击。 | 对话：ready 回应伏击，避免被突袭。 |
| 搜索 Search | search（搜寻） | 1 | 搜索（Search）动作用察觉或调查找东西。 | 卡牌：search 找出藏在地砖下的钥匙。 |
| 搜索 Search | seek（寻找） | 2 | 主动寻找目标，对应搜索。 | 事件：seek 失踪的商队。 |
| 搜索 Search | scan（扫视） | 2 | 快速扫视环境，属于搜索的轻量版。 | 解密：scan 墙面找不同。 |
| 使用物品 Use an Object | use（使用） | 1 | 使用物品（Use an Object）是战斗中的交互动作。 | 卡牌：use 药水恢复生命。 |
| 使用物品 Use an Object | object（物件） | 2 | 物件是交互动作的目标。 | 事件：object 卡住机关齿轮。 |
| 使用物品 Use an Object | item（物品） | 2 | 物品栏决定你能使用什么。 | 解密：按 item 标签选择正确道具。 |

**可玩点子**

> 卡牌「闪避」：用 avoid / slip / escape 应对一次攻击，答对完全闪开；选错只减半伤害。

> 事件「伏击」：先攻 order 排错则敌人先手；玩家可用 prepare / wait 设伏，ready 决定能否反击。

> 卡牌「脱离」：被近身时打 withdraw / retreat / leave，选对才脱离且不吃借机攻击。

### 2.3 状态与豁免

| 机制 | 词汇 | 难度 | 对应理由 | 能怎么玩 |
|---|---|---|---|---|
| 中毒 Poisoned | poison（毒；毒害） | 2 | 中毒（Poisoned）状态影响攻击与检定。 | 卡牌：poison 状态下 attack 有劣势。 |
| 中毒 Poisoned | sick（生病的） | 1 | 生病是中毒的常见叙事表现。 | 事件：sick 的村民需要解药。 |
| 中毒 Poisoned | weak（虚弱的） | 1 | 虚弱是中毒后无法全力行动的叙事表现。 | 对话：weak 的证人说出错误线索。 |
| 恐惧 Frightened | fear（恐惧） | 1 | 恐惧（Frightened）使角色不敢靠近源头。 | 卡牌：fear 状态下不能主动接近敌人。 |
| 恐惧 Frightened | afraid（害怕的） | 1 | 害怕是恐惧状态的第一层。 | 事件：afraid 的士兵会后退。 |
| 恐惧 Frightened | alarm（惊恐；警报） | 3 | 惊恐会让队伍失去行动秩序。 | 解密：alarm 时只能选逃跑选项。 |
| 魅惑 Charmed | attract（吸引） | 2 | 被吸引是魅惑的入口。 | 事件：attract 目标靠近陷阱。 |
| 魅惑 Charmed | trust（信任） | 2 | 信任让目标接受你的说辞。 | 对话：用 trust 让守卫交出钥匙。 |
| 魅惑 Charmed | tempt（引诱） | 3 | 引诱对方做出违背本意的选择。 | 卡牌：tempt 敌人放下武器。 |
| 麻痹 Paralyzed | freeze（冻结；僵住） | 2 | 麻痹（Paralyzed）时身体无法动弹。 | 卡牌：freeze 状态下无法行动。 |
| 麻痹 Paralyzed | stiff（僵硬的） | 3 | 僵硬描述麻痹的体感。 | 事件：stiff 的手指握不住剑。 |
| 麻痹 Paralyzed | unable（不能的） | 2 | 无法行动是麻痹的规则结果。 | 解密：unable 标记决定谁能响应。 |
| 失明与耳聋 Blinded & Deafened | blind（失明的） | 2 | 失明（Blinded）时看不见，攻击与察觉都受影响。 | 卡牌：blind 后只能靠声音定位。 |
| 失明与耳聋 Blinded & Deafened | deaf（耳聋的） | 2 | 耳聋（Deafened）听不到声音与口令。 | 事件：deaf 时错过撤退号角。 |
| 失明与耳聋 Blinded & Deafened | sound（声音） | 2 | 声音是耳聋状态下缺失的信息。 | 解密：靠 sound 线索判断敌人位置。 |
| 力竭 Exhaustion | exhaust（使力竭） | 3 | 力竭（Exhaustion）分级累积，越高级惩罚越重。 | 卡牌：exhaust 升级后叠加惩罚。 |
| 力竭 Exhaustion | tired（疲惫的） | 1 | 疲惫是力竭的叙事表现。 | 事件：tired 时移动速度减半。 |
| 力竭 Exhaustion | energy（精力） | 2 | 体力是力竭机制消耗的资源。 | 解密：分配 energy 决定能走多远。 |
| 倒地 Prone | fall（跌倒） | 1 | 倒地（Prone）由摔倒或击倒造成。 | 卡牌：fall 后近战攻击对你有优势。 |
| 倒地 Prone | ground（地面） | 2 | 地面是倒地状态的位置。 | 事件：ground 上的角色要花移动起身。 |
| 倒地 Prone | lie（躺） | 2 | 躺倒描述倒地姿态。 | 对话：lie 着装死骗过敌人。 |
| 束缚 Restrained | bind（捆绑） | 2 | 束缚（Restrained）限制移动。 | 卡牌：bind 后 speed 变为 0。 |
| 束缚 Restrained | tie（系；绑） | 2 | 捆绑是束缚的具象手段。 | 事件：tie 住俘虏再搜身。 |
| 束缚 Restrained | limit（限制） | 2 | 限制行动是束缚的规则效果。 | 解密：limit 可选行动数量。 |
| 隐形 Invisible | invisible（看不见的） | 3 | 隐形（Invisible）使敌人难以命中，且可随时躲藏。 | 卡牌：invisible 状态下可随时 hide。 |
| 隐形 Invisible | vanish（消失） | 3 | 消失是隐形的叙事表达。 | 事件：vanish 混入人群。 |
| 隐形 Invisible | blend（融入；混合） | 3 | 融入环境是隐形的技巧。 | 解密：blend 进壁画，躲过巡逻。 |
| 豁免 Saving Throw | save（豁免；拯救） | 1 | 豁免（Saving Throw）是抵抗法术与状态的核心检定。 | 卡牌：save 成功只受半伤。 |
| 豁免 Saving Throw | throw（投掷） | 1 | 掷豁免骰是豁免动作的规则表达。 | 事件：throw 一次体质豁免对抗毒气。 |
| 豁免 Saving Throw | test（测试） | 1 | 豁免本质是一次能力测试。 | 解密：按 test 结果选分支。 |

**可玩点子**

> 事件「毒沼」：按 poison / sick / weak 描述中毒三阶段，玩家选对词才能配出解药。

> 卡牌「恐惧」：fear / afraid / alarm 三档，选错档位会多逃一回合。

> 解密「麻痹症状」：把 freeze / stiff / unable 与三张症状卡配对，错配会浪费回合。

### 2.4 法术与效果

| 机制 | 词汇 | 难度 | 对应理由 | 能怎么玩 |
|---|---|---|---|---|
| 伤害 Damage | damage（伤害） | 2 | 伤害（Damage）是法术最直接的效果。 | 卡牌：damage 掷伤害骰削减敌人 HP。 |
| 伤害 Damage | hurt（使受伤） | 1 | 造成痛苦是伤害的叙事层。 | 事件：hurt 目标会让其分心。 |
| 伤害 Damage | wound（创伤） | 2 | 伤口是伤害留下的持续影响。 | 对话：用 wound 交换情报。 |
| 治疗 Healing | heal（治疗） | 2 | 治疗（Healing）恢复生命值。 | 卡牌：heal 恢复 2d4 HP。 |
| 治疗 Healing | cure（治愈） | 2 | 治愈疾病与中毒是治疗的分支。 | 事件：cure 村民的瘟疫。 |
| 治疗 Healing | recover（恢复） | 2 | 恢复是治疗后的状态。 | 解密：recover 需要一次短休。 |
| 护盾 Shield | shield（护盾；保护） | 2 | 护盾（Shield）法术以反应提供 AC 加值。 | 卡牌：shield 提高 AC，可能让攻击落空。 |
| 护盾 Shield | protect（保护） | 2 | 防护法术保护目标免受伤害。 | 事件：protect 队友穿过火墙。 |
| 护盾 Shield | block（格挡；阻挡） | 2 | 格挡是护盾的具象动作。 | 对话：block 住门口的箭矢。 |
| 侦测 Detection | detect（侦测） | 2 | 侦测（Detection）法术揭示隐藏信息。 | 卡牌：detect 找出隐形生物。 |
| 侦测 Detection | reveal（揭示） | 2 | 揭示是侦测的结果。 | 事件：reveal 伪装成墙的密室。 |
| 侦测 Detection | discover（发现） | 1 | 发现隐藏事物对应侦测与调查。 | 解密：discover 符文顺序。 |
| 召唤 Summoning | call（呼唤） | 1 | 召唤（Summoning）以呼唤引来生物。 | 卡牌：call 一只狼助战。 |
| 召唤 Summoning | raise（唤起；举起） | 2 | 唤起、升起对应召唤与唤醒。 | 事件：raise 石像守卫。 |
| 召唤 Summoning | gather（聚集） | 2 | 聚集生物是召唤的群体版本。 | 解密：gather 三只动物开启机关。 |
| 控制 Control | control（控制） | 2 | 控制（Control）法术支配目标行动。 | 卡牌：control 让敌人转向攻击同伴。 |
| 控制 Control | command（命令） | 2 | 命令是控制法术的具体指令。 | 事件：command 目标放下武器。 |
| 控制 Control | obey（服从） | 2 | 服从是控制成功的结果。 | 对话：obey 才能让对方开门。 |
| 幻术 Illusion | imagine（想象） | 1 | 想象是幻术的认知基础。 | 事件：imagine 出声音引开守卫。 |
| 幻术 Illusion | false（虚假的） | 2 | 虚假是幻术的本质。 | 解密：false 线索与真线索配对。 |
| 幻术 Illusion | seem（似乎） | 2 | 幻术让感官觉得“似乎”为真。 | 卡牌：seem 的假象骗过巡逻。 |
| 防护 Protection | defend（防御） | 2 | 防护（Protection）用于防御与抵挡。 | 卡牌：defend 为队友提供豁免加值。 |
| 防护 Protection | safe（安全的） | 1 | 安全是防护法术的目标状态。 | 事件：safe 区域不受毒雾影响。 |
| 防护 Protection | secure（稳固的；安全的） | 3 | 加固、确保安全对应防护结界。 | 对话：secure 营地过夜。 |
| 传送 Teleportation | transport（传送；运输） | 3 | 传送（Teleportation）瞬间搬运目标。 | 卡牌：transport 自己跳出牢房。 |
| 传送 Teleportation | travel（旅行） | 1 | 远距离移动是传送的替代玩法。 | 事件：travel 三天抵达下一座城。 |
| 传送 Teleportation | distance（距离） | 2 | 距离是传送法术的关键参数。 | 解密：算 distance 选择落点。 |
| 变化 Transformation | change（变化） | 1 | 变化（Transformation）改变形态或属性。 | 卡牌：change 把木棍变成蛇。 |
| 变化 Transformation | transform（变形） | 3 | 变形是变化法术的核心。 | 事件：transform 成狼混入兽群。 |
| 变化 Transformation | shape（形状；塑造） | 2 | 形体改变对应变形术。 | 对话：shape 成守卫的样子。 |

**可玩点子**

> 卡牌「护盾」：shield / protect / block 分别对应法术护盾、防护结界、格挡；按来袭攻击类型选牌。

> 事件「幻术厅」：用 imagine / false / seem 识破假墙；选错会掉进陷坑。

> 解密「召唤阵」：call / raise / gather 对应召唤、唤起、聚集；按阵眼缺口选词，填错会召出敌对生物。

### 2.5 装备与物品

| 机制 | 词汇 | 难度 | 对应理由 | 能怎么玩 |
|---|---|---|---|---|
| 武器 Weapons | weapon（武器） | 2 | 武器（Weapon）决定攻击的伤害骰。 | 卡牌：weapon 决定 attack 的伤害。 |
| 武器 Weapons | sword（剑） | 1 | 剑是常见近战武器。 | 事件：sword 卡在石缝里。 |
| 武器 Weapons | sharp（锋利的） | 2 | 锋利决定武器能否切割绳索、皮甲等物件。 | 解密：sharp 武器才能割断绳索。 |
| 护甲 Armor | leather（皮革） | 3 | 皮甲是轻甲代表。 | 事件：leather 在沼泽里发霉。 |
| 护甲 Armor | heavy（重的） | 1 | 重甲提供高 AC，但需要力量支撑且不利于潜行。 | 对话：heavy 甲过不了窄门。 |
| 护甲 Armor | metal（金属） | 2 | 金属决定护甲的材质与重量。 | 卡牌：metal 重甲需要力量支撑。 |
| 工具 Tools | tool（工具） | 1 | 工具（Tool）用于开锁、伪造、修理。 | 卡牌：tool 开锁失败会触发警报。 |
| 工具 Tools | repair（修理） | 2 | 修理工具恢复装备耐久。 | 事件：repair 断掉的弓弦。 |
| 工具 Tools | fix（固定；修理） | 1 | 快速修理对应临时修补。 | 解密：fix 机关齿轮。 |
| 消耗品 Consumables | food（食物） | 1 | 口粮（Rations）是消耗品，维持生存。 | 卡牌：food 支撑一次长途跋涉。 |
| 消耗品 Consumables | water（水） | 1 | 饮水是长途旅行的消耗品。 | 事件：water 不够会力竭。 |
| 消耗品 Consumables | drink（喝；饮料） | 1 | 饮用动作使用药水或清水。 | 对话：drink 下药水前先辨味。 |
| 冒险装备 Adventuring Gear | rope（绳索） | 2 | 绳索是冒险装备的万能工具。 | 卡牌：rope 攀墙或捆人。 |
| 冒险装备 Adventuring Gear | torch（火把） | 2 | 火把提供光源与火焰伤害。 | 事件：torch 点燃蛛网。 |
| 冒险装备 Adventuring Gear | camp（营地） | 2 | 扎营是休息与补给场景。 | 解密：camp 位置决定夜间遭遇。 |
| 光源 Light | light（光；光源） | 1 | 光源（Light）决定昏暗与黑暗中的可见性。 | 卡牌：light 驱散黑暗劣势。 |
| 光源 Light | lamp（灯） | 2 | 提灯是可携带光源。 | 事件：lamp 照亮密室壁画。 |
| 光源 Light | bright（明亮的） | 1 | 明亮光照是光源等级。 | 事件：bright 光下容易暴露行踪。 |
| 货币 Currency | coin（硬币） | 2 | 硬币是货币的最小单位。 | 卡牌：coin 支付过路费。 |
| 货币 Currency | gold（金币；黄金） | 1 | 金币是主要计价单位。 | 事件：gold 不够买护甲。 |
| 货币 Currency | money（钱） | 1 | 钱是交易与贿赂的通用资源。 | 解密：money 分配决定能雇几个帮手。 |
| 容器 Containers | bag（包） | 1 | 背包是容器，限制携带量。 | 卡牌：bag 满则无法拾取新物品。 |
| 容器 Containers | box（箱子） | 1 | 箱子用于存放贵重物品。 | 事件：box 里有陷阱。 |
| 容器 Containers | pack（打包；背包） | 2 | 打包决定负重。 | 对话：pack 轻装才能追上盗贼。 |
| 坐骑 Mounts | horse（马） | 1 | 马是常见坐骑。 | 卡牌：horse 提供额外移动。 |
| 坐骑 Mounts | ride（骑乘） | 1 | 骑乘是坐骑玩法。 | 事件：ride 冲过战场。 |
| 坐骑 Mounts | carry（携带） | 1 | 负重与载物由力量决定。 | 解密：carry 上限决定带多少战利品。 |
| 魔法物品 Magic Items | magic（魔法） | 2 | 魔法物品（Magic Items）带超自然效果。 | 卡牌：magic 物品需鉴定。 |
| 魔法物品 Magic Items | power（力量；充能） | 1 | 充能、力量是魔法物品的资源。 | 事件：power 耗尽物品失效。 |
| 魔法物品 Magic Items | rare（稀有的） | 2 | 稀有度决定魔法物品获取难度。 | 对话：rare 物品要拿人情换。 |

**可玩点子**

> 卡牌「装备栏」：weapon / leather / tool 各一张，按任务需求出牌；带错类型会卡关。

> 事件「黑市」：用 coin / gold / money 讲价，选错词会暴露身份。

> 解密「补给」：food / water / drink 分配三天口粮，少一样就走不出沙漠。

## 3. 覆盖与边界

- **覆盖**：六大属性（含体质）、洞悉/调查/游说/欺瞒、隐匿（并入敏捷）、战斗动作与回合、9 种状态 + 豁免、法术效果（伤害/治疗/护盾/侦测/召唤/控制/幻术/防护/传送/变化）、装备与物品（武器/护甲/工具/消耗品/冒险装备/光源/货币/容器/坐骑/魔法物品）。
- **未逐条覆盖**：18 项技能的全部、所有状态（如石化/震慑/昏迷）、所有法术学派（如预言/死灵）、所有装备细类；这是每类 8–10 条上限下的取舍。
- **重复词**：0。若后续扩表需要复用同一个词，应在条目里注明复用理由。
- **机制准确性**：闪避=攻击者劣势；躲藏=敏捷（隐匿）检定；准备=预设触发；搜索=察觉或调查；使用物品=交互动作；状态与豁免按 5e 2014 规则描述。

## 4. JSON 导入说明

文件：[`data/cet4-dnd-vocab.json`](../../data/cet4-dnd-vocab.json)。顶层是 5 个分类对象，每个对象的结构与任务示例一致：

```json
{
  "category": "战斗动作与回合",
  "entries": [
    {
      "mechanism": "闪避 Dodge",
      "words": [
        { "en": "avoid", "zh": "避开", "level": 2, "why": "…", "use": "…" }
      ]
    }
  ],
  "ideas": ["…"]
}
```

> 注：本文件是首批 150 词的可玩切片；全量四级大纲知识库见第 5 节。

## 5. 四级大纲知识库（OCR）

- 数据：[`data/cet4-syllabus-kb.json`](../../data/cet4-syllabus-kb.json)
- 摘要：[`docs/cet4-syllabus-kb.md`](cet4-syllabus-kb.md)
- 规模：4530 个唯一大纲词头；4615 条词条（含重复义项）；中文释义取自公开《大学英语四级大纲单词表》。
- OCR：《英语四级 你还在背单词吗》363 页，正文 9–344 页，tesseract 5.5（eng，200 DPI，psm 3）；按 12 个 Unit 建页映射。
- 覆盖率：音标高置信定位 3629 / 4530（80.1%）；加上行首启发式 3761 / 4530（83.0%）；未定位的 769 词仍保留在知识库中，`book_pages` 与 `book_pages_loose` 为空。
- 与映射表的关系：150 个机制词全部在知识库中；131 个在 OCR 书中定位到词条页。
- 字段：`en`、`zh`、`unit`、`part`、`book_pages`（音标高置信）、`book_pages_loose`（行首启发式补充页）。
- 限制：OCR 启发式对短语/连字符词和噪声会漏检；单元定位数可能含同页派生词/例句词，不能当精确词数；知识库未做真题词频排序。

## 6. 两本素材的录入完整性

用户要求重新核对《英语四级 你还在背单词吗》和《就这样过英语四级》是否录入完毕。结论：两本书的**页级 OCR 已完整**；词级/题目级的结构化程度不同。

| 书 | 总页 | 已 OCR | 空白页 | 过短页 | 总字符 | 英文词 | 中文字 |
|---|---|---|---|---|---|---|---|
| 英语四级 你还在背单词吗 | 363 | 363 | 0 | 3 | 697,729 | 64,590 | 102,809 |
| 就这样过英语四级 | 471 | 471 | 0 | 6 | 755,775 | 73,859 | 194,478 |

- 《你还在背单词吗》：363 页全部 OCR，正文 9–344 页（336 页）完整；大纲知识库 4530 词，其中 3629 词在书中定位到词条页（80.1%），769 词未定位但仍保留在知识库。
- 《就这样过英语四级》：471 页全部 OCR，覆盖语法、写作、翻译、听力、阅读、18 条技巧与真题例证；页级文本已 OCR 并存入工作区，尚未拆成题目/答案结构。
- 原始全文：保存在票据工作区 `materials/`（363 + 471 页 JSONL），**未提交公开仓库**（上传素材/版权限制）；仓库只提交 [`manifest.json`](../../data/cet4-materials/manifest.json)，含页数、字符数与 SHA-256。
- 出题用途：book1 可做词卡、填空、用法辨析、例句改写；book2 可做语法选择题、改错、翻译练习、阅读/听力题干与解析生成。全文在工作区，可按页引用。
- 限制：机器 OCR 未人工校对；book2 未拆题目/答案；OCR 文本用于出题时需规则或人工校验。
- 详细核对：[`docs/cet4-materials-ingest.md`](cet4-materials-ingest.md)。
