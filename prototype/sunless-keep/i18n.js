/* =====================================================================
   THE SUNLESS KEEP — Chinese localisation
   Set state.showZh = true (default) to use these strings. English prose
   stays above its Chinese translation; UI chrome switches to Chinese.
   Add a scene/ending here if you add one to scenario.js.
   ===================================================================== */

const ZH = {
  ui: {
    journal: '日志', words: '词表', readAloud: '朗读', restart: '重来',
    continue: '继续', createParty: '创建队伍', newParty: '新队伍', howTo: '怎么玩',
    level3: '完整 5e 冒险 · 3 级',
    badgePillars: '探索 · 交涉 · 战斗', badgeChecks: 'd20 检定与豁免',
    badgeInit: '先攻与网格战斗', badgeSpells: '法术、状态、死亡豁免', badgeBilingual: '英文朗读 + 中文对照',
    begin: '开始冒险', chosen: '已选', pickThree: '选择三名冒险者',
    pickSub: '每个人对锁着的门、紧张的狗头人、吃人的树都有不同答案。任选三人；你会同时操控他们。',
    pickCount: '已选', picked: '人', expect: '这是一个完整故事：村庄 → 裂谷 → 狗头人王庭 → 地精大门 → 林地。约 20–35 分钟。',
    ac: 'AC', hp: 'HP', prof: '熟练', level: '等级',
    objectives: '目标', whatDo: '你要做什么？', atTable: '掷骰结果',
    tried: '已尝试', tryOnce: '每种方法只能试一次。故事无论如何都会继续。',
    codaHint: '你的选择将结束这个故事。', readAloud: '▶ 朗读', zhInline: '中文对照',
    zhOn: '中文 ✓', dm: '城主提示',
    initiative: '先攻', round: '第', turn: '回合', enemy: '敌人',
    move: '移动', attack: '攻击', spell: '法术', item: '物品', feature: '特性', endTurn: '结束回合',
    dash: '疾跑', dodge: '闪避', disengage: '脱离', hide: '躲藏', help: '协助',
    actionOptions: '动作选项', action: '动作', bonusAction: '附赠动作', movementLeft: '剩余移动',
    spellSlots: '法术位', acLong: '护甲等级', speed: '速度', resists: '抗性', vulnerable: '易伤', immune: '免疫',
    hpLong: '生命值', dying: '濒死', dead: '死亡', stable: '稳定', hidden: '隐藏', dodging: '闪避中', blessed: '受祝福',
    turnOf: '回合', clickSquare: '点一个高亮格子来移动。', clickEnemy: '点一个范围内的敌人。', clickTarget: '点一个法术目标。',
    turnHint: '移动 + 一个动作 + 可能的附赠动作。',
    whoCheck: '谁来检定？', groupCheck: '团队检定', atLeastHalf: '至少一半队伍成员成功。',
    success: '成功', failure: '失败', cancel: '取消', close: '关闭', gotIt: '知道了',
    castSpell: '施放法术', chooseWeapon: '选择武器', useItem: '使用物品', classFeatures: '职业特性',
    chooseEnemy: '选择一个范围内的敌人。', chooseTarget: '选择一个法术目标。', potionOn: '把药水给谁？',
    drinkPotion: '喝下或喂下药水…', cunning: '灵巧动作', cunningDash: '疾跑', cunningDisengage: '脱离', cunningHide: '躲藏',
    cunningDashD: '附赠动作，移动翻倍', cunningDisengageD: '附赠动作，安全离开', cunningHideD: '附赠动作，隐匿检定',
    rollInit: '掷先攻', rest: '短休', restHint: '短休让每名角色花一枚生命骰，并恢复短休特性。',
    restDone: '已经休息过了。', continueAfter: '继续',
    victory: '胜利', xpEarned: '获得经验', loot: '战利品',
    party: '队伍', checks: '检定', shortRests: '短休次数', cluesFound: '线索', wordsInStory: '词汇', titleEarned: '获得称号',
    gold: '金币', xp: '经验', checksPassed: '检定成功率', foesDefeated: '击败敌人',
    playAgain: '再玩一次', backToTitle: '回到标题',
    defeatKicker: '队伍倒下了', defeatTitle: '黑暗合拢', retry: '重试这场战斗',
    defeatBody: '最后一支火把熄灭了。旧路还在你上方继续，但故事不必在这里结束——可以从最后一场战斗重来。',
    journalTitle: '日志', wordsTitle: '词表',
    currentChapter: '当前章节', pathSoFar: '走过的路', pack: '行囊', rulesAtTable: '桌上的规则',
    noClues: '还没有线索。多问，多观察。', emptyPack: '除了身上的东西，什么都没有。',
    rulesSummary: 'd20 + 属性调整值 对抗 DC；攻击对抗 AC。优势掷两次取高。火能伤黑根。短休花生命骰。',
    wordHint: '点故事里带下划线的词，看中文和例句；点词表里的词可以听发音。',
    journal: '日志', words: '词表', readAloud: '朗读', restart: '重来',
    continue2: '继续', chinese: '中文 ✓', en: '英文', back: '返回',
    deathSave: '死亡豁免', dyingHint: '正在濒死。掷一次死亡豁免，看能不能撑住。',
    rollDeath: '掷死亡豁免', tenOrHigher: '10 或更高成功',
    heal: '治疗', damage: '伤害', attackRoll: '攻击检定',
    cover: '掩体', difficult: '困难地形', moveHint: '点高亮格移动', attackHint: '点敌人攻击',
    charSheet: '角色卡', closeSheet: '关闭角色卡', featureLeft: '剩余', atWill: '随意使用',
    spellSlotsShort: '法术位', noSpells: '没有准备法术。', noWeapons: '没有可用武器。',
    noAlly: '5 英尺内没有可以协助的队友。', noItem: '这场战斗里用不上。', noFeature: '没有可用特性。',
    empty: '空。', targetFirst: '先选一个目标。',
    endTitle: '结局', seeEnding: '看结局', choiceMade: '最后一个选择已经做出。',
    yourChoiceEnds: '你的选择为这个故事收尾。看看它带来了什么。',
    beforeYou: '你面前',
    statCheck: '属性检定', save: '豁免', attack: '攻击', damageRoll: '伤害',
    notYourTurn: '还没轮到你。', outOfRange: '超出范围。', noLine: '没有视线。',
    advantage: '优势', disadvantage: '劣势', critical: '暴击', miss: '未命中', hit: '命中'
  },
  skills: {
    athletics: '运动', acrobatics: '体操', 'sleight-of-hand': '巧手', stealth: '隐匿',
    arcana: '奥秘', history: '历史', investigation: '调查', nature: '自然', religion: '宗教',
    'animal-handling': '驯兽', insight: '洞悉', medicine: '医药', perception: '察觉', survival: '生存',
    deception: '欺瞒', intimidation: '威吓', performance: '表演', persuasion: '说服'
  },
  abilities: { str: '力', dex: '敏', con: '体', int: '智', wis: '感', cha: '魅' },
  pregens: {
    bram: { ancestry: '人类', class: '战士', role: '前排 · 28 HP · AC 18', short: '沉稳的剑手。队友做事时，他守住阵线。' },
    sable: { ancestry: '半身人', class: '游荡者', role: '斥候 · 21 HP · AC 15', short: '手快，脚更快。别人看不见的路，她能找到。' },
    ilya: { ancestry: '精灵', class: '法师', role: '火力 · 17 HP · AC 15', short: '火焰与寒霜的学者。脆弱，但能早早结束战斗。' },
    orsa: { ancestry: '矮人', class: '牧师', role: '支援 · 24 HP · AC 18', short: '安静的声音，明亮的神盾。让队伍站得住。' }
  },
  scenes: {
    oakvale: {
      title: '母亲的委托', kicker: '橡谷 · 橡木与猫头鹰酒馆 · 夜',
      sub: '一桩营救委托，一道被诅咒的裂谷，和两个你忘不掉的名字。',
      dm: '社交开场。这些检定会改变你知道什么、带着什么。准备好就上路。',
      objectives: ['弄清双胞胎出了什么事', '为下裂谷做准备'],
      labels: {
        ask: { label: '问双胞胎出了什么事', hint: '洞悉 · DC 12' },
        bargain: { label: '谈谈报酬', hint: '说服 · DC 13' },
        history: { label: '打听废墟的来历', hint: '历史 · DC 12' },
        supplies: { label: '出发前买补给', hint: '调查 · DC 10' }
      },
      next: '动身去裂谷'
    },
    ravine: {
      title: '大地上的伤口', kicker: '旧路 · 裂谷',
      sub: '往下五十英尺就是废墟。下面的东西已经醒了。',
      dm: '探索。可以先观察岩架、悄悄靠近；不管怎样，下去都会开打。',
      objectives: ['到达下面的岩架', '处理碎石里的东西'],
      labels: {
        study: { label: '从上面观察岩架', hint: '调查 · DC 12' },
        quiet: { label: '沿着崖边悄悄移动', hint: '隐匿 · DC 13 · 团队' },
        climb: { label: '顺着打结的绳子爬下去', hint: '运动 · DC 10' }
      }
    },
    citadelGate: {
      title: '三个狗头人和一扇锁着的门', kicker: '无光城塞 · 废墟庭院',
      sub: '他们很小，但他们躲在墙后，而且先看到了你。',
      dm: '可以交涉或潜行。谈下去会进入狗头人王庭；打起来就跳过那里，也失去他们的帮助。',
      objectives: ['通过狗头人守卫', '找到继续深入的路'],
      labels: {
        parley: { label: '放下武器，试着交谈', hint: '说服 · DC 12' },
        threaten: { label: '用刀剑吓退他们', hint: '威吓 · DC 14' },
        sneak: { label: '贴着墙溜过去', hint: '隐匿 · DC 14 · 团队' },
        attack: { label: '拔剑冲上去', hint: '战斗 · 3 个狗头人' }
      }
    },
    koboldQueen: {
      title: '塞什女王', kicker: '无光城塞 · 狗头人王庭',
      sub: '一条没有龙的女王，一把你需要的钥匙。',
      dm: '狗头人可以是盟友，也可以是死路。你在这里问什么，会改变最后一幕你带着什么。',
      objectives: ['弄清塞什知道的双胞胎下落', '拿到地精大门的钥匙'],
      labels: {
        askHumans: { label: '问失踪的人类', hint: '洞悉 · DC 13' },
        askTree: { label: '问下面的那棵树', hint: '奥秘 · DC 13' },
        deal: { label: '答应帮她找龙', hint: '说服 · DC 12' },
        refuse: { label: '拒绝她的交易', hint: '不靠狗头人帮忙' }
      },
      next: '拿着钥匙，走向地精大门'
    },
    goblinGate: {
      title: '铁蒺藜与金戒指', kicker: '无光城塞 · 地精大门',
      sub: '一个大地精手上戴着塔伦的戒指。',
      dm: '这场战斗开打前你可以改变局面。强攻、威吓或潜行，敌人配置都不一样。',
      objectives: ['突破地精大门', '查明双胞胎的下落'],
      labels: {
        charge: { label: '冲过矮墙', hint: '战斗 · 完整守军' },
        intimidate: { label: '给他们一次逃跑的机会', hint: '威吓 · DC 15' },
        sneak: { label: '无声穿过铁蒺藜', hint: '隐匿 · DC 14 · 团队' }
      }
    },
    grove: {
      title: '黑根', kicker: '无光城塞 · 暮光林地',
      sub: '树饿了。棕袍老人很有耐心。',
      dm: '最后一幕先是谈话，再是战斗。你在这里知道的事，能让战斗早点结束——或者变得能打。',
      objectives: ['救出塔伦和莎拉', '毁掉黑根'],
      labels: {
        who: { label: '问他是谁', hint: '洞悉 · DC 12' },
        treeLore: { label: '回想关于这棵树的传说', hint: '奥秘 · DC 14' },
        letgo: { label: '叫他放了他们', hint: '说服 · DC 15' },
        attack: { label: '趁他还在说话动手', hint: '战斗 · 林地' },
        kneel: { label: '跪下，接受他的提议', hint: '结局 · 投降' }
      }
    },
    coda: {
      title: '你带回去的东西', kicker: '旧路 · 黎明',
      sub: '树没了，果子还在。',
      dm: '冒险结束了。最后一个选择关于这颗果子值什么——以及你是谁。',
      objectives: ['决定红果怎么处理'],
      labels: {
        give: { label: '把果子交给韦恩家', hint: '结局 · 仁慈' },
        keep: { label: '留下果子，卖掉它', hint: '结局 · 利益' },
        burn: { label: '把果子丢进酒馆的火里', hint: '结局 · 拒绝交易' }
      }
    }
  },
  encounters: {
    rats: { name: '岩架', subtitle: '碎石 · 两只巨鼠', intro: '碎石动了。两只狗那么大的老鼠从黑暗里钻出来，牙先到。', victory: '岩架安静了' },
    kobolds: { name: '庭院', subtitle: '矮墙 · 三个狗头人', intro: '狗头人松开投石索。石头擦着耳边飞过。', victory: '庭院清空了' },
    goblins: { name: '地精大门', subtitle: '铁蒺藜 · 三个地精和首领', intro: '大地精挥刀一指。地精不再争吵，朝你扑来。', victory: '大门被攻破' },
    goblinsFlee: { name: '地精大门', subtitle: '只剩首领', intro: '两个地精跑了。大地精跨过他们，毫不在意。', victory: '大门被攻破' },
    goblinsSneak: { name: '地精大门', subtitle: '首领和一名守卫', intro: '你从铁蒺藜后走出来。首领最后才转身。', victory: '大门被攻破' },
    boss: { name: '暮光林地', subtitle: '黑根 · 科尔文 · 两个奴仆', intro: '荆棘缠住你的腿。树没有动。它不需要动。', victory: '黑根倒下了' }
  },
  endings: {
    good: { kicker: '结局 · 仁慈', title: '橡谷之门' },
    keep: { kicker: '结局 · 利益', title: '温暖的果子，寒冷的路' },
    burn: { kicker: '结局 · 拒绝', title: '没有东西可卖' },
    thrall: { kicker: '结局 · 投降', title: '林地留下你' }
  }
};

/* Combat-log templates. Each [regex, replacement]; unmatched lines stay
   in English so a rule term is never silently lost. */
const ZH_LOG_RULES = [
  [/^Initiative: (.*)\.$/, '先攻：$1。'],
  [/^It is (.+)'s turn\.$/, '轮到 $1。'],
  [/^— Round (\d+) —$/, '— 第 $1 轮 —'],
  [/^(.+) moves (\d+) ft\.$/, '$1 移动 $2 英尺。'],
  [/^(.+) moves\.$/, '$1 移动。'],
  [/^(.+) attacks (.+): (\d+) vs AC (\d+) — miss\.$/, '$1 攻击 $2：$3 对 AC $4 — 未命中。'],
  [/^(.+) hits (.+) \((\d+) vs AC (\d+)\) for (\d+) (\w+) damage( — critical!)?\.$/, (m) => `${m[1]} 命中 ${m[2]}（${m[3]} 对 AC ${m[4]}），造成 ${m[5]} 点${m[6]}伤害${m[7] ? ' — 暴击！' : '。'}`],
  [/^(.+) is defeated\.$/, '$1 被击败。'],
  [/^(.+) falls unconscious and is dying\.$/, '$1 倒下，陷入昏迷和濒死。'],
  [/^(.+) regains consciousness\.$/, '$1 恢复意识。'],
  [/^(.+) regains (\d+) HP \((\d+)\/(\d+)\)\.$/, '$1 恢复 $2 点生命（$3/$4）。'],
  [/^(.+) succeeds on a death save \((\d+)\/3\)\.$/, '$1 死亡豁免成功（$2/3）。'],
  [/^(.+) fails a death save \((\d+)\/3\)\.$/, '$1 死亡豁免失败（$2/3）。'],
  [/^(.+) is stable but unconscious\.$/, '$1 稳定下来，但仍昏迷。'],
  [/^(.+) dies\.$/, '$1 死亡。'],
  [/^(.+) takes the Dash action\.$/, '$1 使用疾跑动作。'],
  [/^(.+) takes the Dodge action\.$/, '$1 使用闪避动作。'],
  [/^(.+) disengages\.$/, '$1 脱离。'],
  [/^(.+) tries to hide \((\d+) vs (\d+)\) — (success|failure)\.$/, (m) => `${m[1]} 尝试躲藏（${m[2]} 对 ${m[3]}）— ${m[4] === 'success' ? '成功' : '失败'}。`],
  [/^(.+) helps (.+)\. (.+) has advantage on the next attack\.$/, '$1 协助 $2。$3 的下一次攻击有优势。'],
  [/^(.+) dashes as a bonus action\.$/, '$1 用附赠动作疾跑。'],
  [/^(.+) disengages as a bonus action\.$/, '$1 用附赠动作脱离。'],
  [/^(.+) hides as a bonus action \((\d+) vs (\d+)\) — (success|failure)\.$/, (m) => `${m[1]} 用附赠动作躲藏（${m[2]} 对 ${m[3]}）— ${m[4] === 'success' ? '成功' : '失败'}。`],
  [/^(.+) uses Action Surge\. One more action this turn\.$/, '$1 使用动作如潮。本回合多一个动作。'],
  [/^(.+) uses Preserve Life \((\d+) HP to divide\)\.$/, '$1 使用引导神力：维持生命（$2 点生命可分配）。'],
  [/^(.+) casts (.+)\. (.+) takes (\d+) (\w+) damage\.$/, '$1 施放 $2。$3 受到 $4 点$5伤害。'],
  [/^(.+) casts (.+) on (.+)\.$/, '$1 对 $2 施放 $3。'],
  [/^(.+) casts (.+)\. (\d+) (ally gains|allies gain) \+1d4 to attacks and saves\.$/, (m) => `${m[1]} 施放 ${m[2]}。${m[3]} 名盟友的攻击和豁免获得 +1d4。`],
  [/^(.+) (saves|fails) against (.+?)( and takes (\d+) (\w+) damage)?( and takes no damage)?\.$/, (m) => `${m[1]} 对抗 ${m[3]}：${m[2] === 'saves' ? '豁免成功' : '豁免失败'}${m[5] ? `，受到 ${m[5]} 点${m[6]}伤害` : ''}。`],
  [/^(.+) is restrained by roots!$/, '$1 被根须束缚！'],
  [/^(.+) resists (.+)'s Entangle\.$/, '$1 抵抗了 $2 的纠缠术。'],
  [/^(.+) is immune to (\w+) damage\.$/, '$1 免疫$2伤害。'],
  [/^(.+) burns for (\d+) fire damage\.$/, '$1 受到 $2 点火焰灼烧伤害。'],
  [/^(.+) is still talking — the attack has advantage\.$/, '$1 还在说话——这次攻击有优势。'],
  [/^Sneak Attack adds (\d+)\.$/, '偷袭额外造成 $1 点伤害。'],
  [/^Martial Advantage adds (\d+)\.$/, '军事优势额外造成 $1 点伤害。'],
  [/^(.+) has no clear line of sight to (.+)\.$/, '$1 到 $2 没有清晰视线。'],
  [/^(.+) is out of range\.$/, '$1 超出范围。'],
  [/^The Blackroot dies\. Its thralls fall free, and the briars go still\.$/, '黑根死了。它的奴仆倒下并恢复自由，荆棘静止了。'],
  [/^The last enemy falls\. The fight is over\.$/, '最后一个敌人倒下。战斗结束。'],
  [/^The party falls\. The dark closes over you\.$/, '队伍倒下了。黑暗合拢。'],
  [/^(.+) is stable and unconscious\.$/, '$1 稳定但昏迷。'],
  [/^It is (.+)'s turn\. Roll a death save\.$/, '轮到 $1。掷一次死亡豁免。']
];

ZH.attacks = {
  'Longsword': '长剑', 'Javelin': '标枪', 'Shortbow': '短弓', 'Dagger': '匕首',
  'Fire Bolt': '火焰箭', 'Ray of Frost': '寒霜射线', 'Mace': '钉头锤', 'Bite': '啃咬',
  'Claws': '爪击', 'Staff': '木杖', 'Thorn Whip': '荆棘鞭', 'Scimitar': '弯刀', 'Sling': '投石索'
};
ZH.spells = {
  'Magic Missile': { name: '魔法飞弹', desc: '三枚飞弹，不需要攻击检定，不会落空。' },
  'Burning Hands': { name: '燃烧之手', desc: '锥形火焰。敏捷豁免成功减半。' },
  'Sacred Flame': { name: '圣火', desc: '神圣火焰。敏捷豁免失败则受伤。' },
  'Guiding Bolt': { name: '引导之光', desc: '命中后，下一次对该目标的攻击有优势。' },
  'Cure Wounds': { name: '治疗伤口', desc: '触碰受伤的盟友，恢复 1d8+3 生命。' },
  'Healing Word': { name: '治疗真言', desc: '远程附赠动作，恢复 1d4+3 生命。' },
  'Bless': { name: '祝福术', desc: '三名盟友 3 轮内攻击与豁免 +1d4。' },
  'Entangle': { name: '纠缠术', desc: '根须抓住目标。' }
};
ZH.features = {
  'Second Wind': { name: '回气', desc: '调整呼吸，恢复 1d10+3 生命。' },
  'Action Surge': { name: '动作如潮', desc: '本回合多做一个动作。' },
  'Cunning Action': { name: '灵巧动作', desc: '附赠动作：疾跑、脱离或躲藏。' },
  'Arcane Recovery': { name: '奥术恢复', desc: '短休时恢复两级法术位。' },
  'Preserve Life': { name: '维持生命', desc: '将 15 点生命分配给 30 英尺内的盟友。' }
};
ZH.items = {
  'Potion of Healing': { name: '治疗药水', desc: '动作 · 恢复 2d4+2 生命' },
  'Alchemist’s fire': { name: '炼金火', desc: '动作 · 远程攻击 · 1d4 火焰伤害' },
  'Alchemist\'s fire': { name: '炼金火', desc: '动作 · 远程攻击 · 1d4 火焰伤害' },
  'Iron key': { name: '铁钥匙', desc: '打开地精大门' },
  'Rope': { name: '绳子', desc: '50 英尺长的结绳' },
  'Torch': { name: '火把', desc: '照亮黑暗' },
  'Oil flask': { name: '油瓶', desc: '易燃' },
  'Talen’s signet ring': { name: '塔伦的印章戒指', desc: '韦恩家的枫叶印章' },
  'Thieves\' tools': { name: '盗贼工具', desc: '开锁与拆陷阱' },
  'Holy symbol': { name: '圣徽', desc: '牧师的法器' },
  'Spellbook': { name: '法术书', desc: '法师的笔记' }
};
ZH.conditions = {
  restrained: '束缚', dodging: '闪避', hidden: '隐藏', dying: '濒死', stable: '稳定',
  dead: '死亡', burning: '灼烧', bless: '祝福', prone: '倒地', poisoned: '中毒'
};

ZH.damageTypes = { slashing: '挥砍', piercing: '穿刺', bludgeoning: '钝击', fire: '火焰', cold: '寒冷', radiant: '光耀', force: '力场', poison: '毒素', necrotic: '黯蚀', psychic: '心灵' };
ZH.traits = { 'Pack Tactics': '群体战术', 'Nimble Escape': '灵巧逃脱', 'Martial Advantage': '军事优势', 'Barkskin': '树皮术', 'Gulthias Tree': '古树', 'Thralls': '奴仆' };

ZH.acNotes = { 'Chain mail + shield': '链甲 + 盾牌', 'Studded leather': '镶钉皮甲', 'Mage armor': '法师护甲' };

ZH.clues = {
  'The white fruit may be a trap.': '白果可能是个陷阱。',
  'The ruins were a dragon cult fortress.': '废墟曾是一座龙之教派的要塞。',
  'A previous explorer warned about “the tree”.': '之前的探险者警告过“那棵树”。',
  'The Outcast has the twins.': '弃徒抓走了双胞胎。',
  'The Blackroot fears fire.': '黑根怕火。',
  'The Outcast has the twins in the grove. The Blackroot fears fire.': '弃徒把双胞胎带到了林地。黑根怕火。',
  'Corvin cares more about the tree than the fight.': '科尔文更在乎树，而不是这场战斗。',
  'Destroy the Blackroot to free the thralls. Fire is its weakness.': '毁掉黑根就能解放奴仆；火是它的弱点。'
};

ZH.rewardTitles = {
  'Friend of the Vane family': '韦恩家的朋友',
  'A heavy purse': '沉甸甸的钱袋',
  'A clean conscience': '清白的良心',
  'The garden grows': '园子长大了'
};

ZH.art = { village: '村庄', ravine: '裂谷', gate: '城门', throne: '王庭', goblins: '地精大门', grove: '林地', dawn: '黎明', road: '旧路', fire: '炉火' };

ZH.monsterNames = {
  giantRat: '巨鼠', kobold: '狗头人', goblin: '地精', hobgoblin: '大地精首领',
  twigBlight: '枯枝怪', thrallTalen: '塔伦（奴仆）', thrallShara: '莎拉（奴仆）',
  corvin: '科尔文·弃徒', blackroot: '黑根', 'Goblin Guard': '地精守卫'
};
