/* 《灰烬岗哨》3D 桌面切片 —— 数据层
   剧本、角色与数值来自 prototype/ashen-watch/scenario.md；
   规则摘要参考 SRD 5.1（CC-BY-4.0）。 */

export const ACTS = [
  { id: 'explore', label: '探索', num: '一' },
  { id: 'social', label: '社交', num: '二' },
  { id: 'combat', label: '战斗', num: '三' },
  { id: 'rest', label: '短休', num: '四' },
  { id: 'level', label: '成长', num: '五' },
];

export const HEROES = {
  bran: {
    id: 'bran',
    name: '布兰',
    en: 'BRAN',
    cls: '战士 3 · 冠军',
    glyph: '⚔',
    tag: '前排',
    hp: 31,
    maxHp: 31,
    ac: 17,
    init: 1,
    stats: { str: 17, dex: 12, con: 14, int: 10, wis: 12, cha: 12 },
    saves: { str: 5, dex: 1, con: 4, int: 0, wis: 1, cha: 1 },
    skills: { athletics: 5, perception: 3, intimidation: 3 },
    atk: { name: '长剑', mod: 5, dmg: [1, 8, 3], type: '挥砍' },
    feature: '精通重击：攻击掷出 19–20 即暴击。',
    cards: [
      {
        id: 'bran-attack', name: '长剑', en: 'Longsword', type: '动作', cost: 'A',
        kind: 'attack', target: true,
        desc: 'd20 + 5 对抗目标 AC；命中造成 1d8 + 3 挥砍。19–20 暴击（伤害骰翻倍）。',
        foot: '+5 · 1d8+3',
        rule: 'SRD 5.1 · Making an Attack / Critical Hit',
      },
      {
        id: 'bran-secondwind', name: '回气', en: 'Second Wind', type: '附赠', cost: 'B',
        kind: 'heal', target: false, uses: 1,
        desc: '战士的韧性：恢复 1d10 + 3 生命。每场战斗一次，短休后恢复。',
        foot: '1d10+3',
        rule: 'SRD 5.1 · Fighter: Second Wind',
      },
    ],
  },
  vera: {
    id: 'vera',
    name: '薇拉',
    en: 'VERA',
    cls: '游荡者 3 · 盗贼',
    glyph: '➶',
    tag: '偷袭',
    hp: 24,
    maxHp: 24,
    ac: 14,
    init: 3,
    stats: { str: 8, dex: 20, con: 12, int: 12, wis: 14, cha: 14 },
    saves: { str: -1, dex: 7, con: 1, int: 1, wis: 2, cha: 2 },
    skills: { stealth: 7, survival: 4, persuasion: 4, insight: 2, deception: 4 },
    atk: { name: '短弓', mod: 7, dmg: [1, 6, 4], type: '穿刺' },
    feature: '偷袭：有优势或目标身边有队友时，额外 2d6。快手：药水 / 火油不消耗动作（每场一次）。',
    cards: [
      {
        id: 'vera-attack', name: '短弓', en: 'Shortbow', type: '动作', cost: 'A',
        kind: 'attack', target: true, sneak: true,
        desc: 'd20 + 7 对抗目标 AC；命中造成 1d6 + 4 穿刺。若有优势或目标身边有队友，额外 2d6 偷袭。',
        foot: '+7 · 1d6+4',
        rule: 'SRD 5.1 · Sneak Attack',
      },
      {
        id: 'vera-hide', name: '隐匿', en: 'Hide', type: '附赠', cost: 'B',
        kind: 'buff', target: false, uses: 1,
        desc: '躲进雪影与断墙。下一次攻击获得优势（掷两次 d20 取高）。',
        foot: '优势',
        rule: 'SRD 5.1 · Hiding / Advantage',
      },
      {
        id: 'vera-help', name: '协助', en: 'Help', type: '附赠', cost: 'B',
        kind: 'help', target: false, uses: 1,
        desc: '把敌人的破绽指给队友。选择一名队友，其下一次攻击获得优势。',
        foot: '队友优势',
        rule: 'SRD 5.1 · Help',
      },
    ],
  },
  oren: {
    id: 'oren',
    name: '奥伦',
    en: 'OREN',
    cls: '法师 3 · 塑能师',
    glyph: '✦',
    tag: '法术',
    hp: 20,
    maxHp: 20,
    ac: 12,
    init: 2,
    stats: { str: 8, dex: 14, con: 12, int: 19, wis: 12, cha: 10 },
    saves: { str: -1, dex: 2, con: 1, int: 6, wis: 3, cha: 0 },
    skills: { investigation: 6, insight: 3, arcana: 6, history: 6, perception: 3 },
    atk: { name: '火焰箭', mod: 6, dmg: [1, 10, 0], type: '火焰' },
    feature: '3 个法术位：魔法飞弹 3d4+3；短休时奥术恢复换回 1 个法术位。',
    cards: [
      {
        id: 'oren-firebolt', name: '火焰箭', en: 'Fire Bolt', type: '戏法', cost: 'A',
        kind: 'attack', target: true,
        desc: 'd20 + 6 对抗目标 AC；命中造成 1d10 火焰伤害。不消耗法术位。',
        foot: '+6 · 1d10',
        rule: 'SRD 5.1 · Spell Attack',
      },
      {
        id: 'oren-magicmissile', name: '魔法飞弹', en: 'Magic Missile', type: '法术', cost: 'A', slots: 1,
        kind: 'mm', target: true,
        desc: '三枚力场飞弹自动命中，造成 3d4 + 3 力场伤害。消耗 1 个法术位。',
        foot: '3d4+3',
        rule: 'SRD 5.1 · Magic Missile',
      },
    ],
  },
  ada: {
    id: 'ada',
    name: '艾达',
    en: 'ADA',
    cls: '守夜人 · NPC',
    glyph: '✚',
    tag: '盟友',
    hp: 14,
    maxHp: 14,
    ac: 13,
    init: 2,
    stats: { str: 12, dex: 14, con: 12, int: 10, wis: 13, cha: 10 },
    saves: { str: 2, dex: 3, con: 2, int: 0, wis: 2, cha: 0 },
    skills: { perception: 3, survival: 3, insight: 2 },
    atk: { name: '长矛', mod: 4, dmg: [1, 6, 2], type: '穿刺' },
    feature: '优先救起倒下的角色（治疗 1d8+2），否则用长矛攻击。',
    cards: [],
  },
};

export const ITEMS = {
  potion: {
    id: 'potion', name: '治疗药水', en: 'Potion of Healing', type: '物品', cost: 'A',
    kind: 'item', target: false, item: 'potion',
    desc: '喝下后恢复 2d4 + 2 生命。全队共 1 瓶；薇拉的快手可以把它当作附赠动作（每场一次）。',
    foot: '2d4+2',
    rule: 'SRD 5.1 · Potion of Healing',
  },
  oil: {
    id: 'oil', name: '火油', en: 'Flask of Oil', type: '物品', cost: 'A',
    kind: 'item', target: true, item: 'oil',
    desc: '把火油砸在灰烬骑士身上，造成 2d6 火焰伤害。只有 1 次；薇拉可以用快手不消耗动作。',
    foot: '2d6 火焰',
    rule: 'SRD 5.1 · Flask of Oil',
  },
};

export const ENEMIES = {
  knight: {
    id: 'knight',
    name: '灰烬骑士',
    en: 'ASH KNIGHT',
    glyph: '☠',
    hp: 55,
    maxHp: 55,
    ac: 16,
    init: 1,
    atk: 5,
    dmg: [1, 8, 3],
    necro: [1, 6, 0],
    traits: '长剑 +5，1d8+3 + 1d6 黯蚀。第 1 回合嚎叫；半血时灰烬爆发。',
    description: '铁甲里没有人，只有一层还在烧的灰。凯尔——艾达的弟弟。',
  },
  hound1: {
    id: 'hound1',
    name: '灰烬猎犬 A',
    en: 'ASH HOUND',
    glyph: '◆',
    hp: 11,
    maxHp: 11,
    ac: 12,
    init: 2,
    atk: 3,
    dmg: [1, 6, 1],
    traits: '啃咬 +3，1d6+1。另一只猎犬还活着时，攻击有优势（群战）。',
    description: '肋骨从烧裂的皮里露出来，眼睛像两块余烬。',
  },
  hound2: {
    id: 'hound2',
    name: '灰烬猎犬 B',
    en: 'ASH HOUND',
    glyph: '◆',
    hp: 11,
    maxHp: 11,
    ac: 12,
    init: 2,
    atk: 3,
    dmg: [1, 6, 1],
    traits: '啃咬 +3，1d6+1。另一只猎犬还活着时，攻击有优势（群战）。',
    description: '肋骨从烧裂的皮里露出来，眼睛像两块余烬。',
  },
};

export const POIS = [
  {
    id: 'gate',
    title: '大门与门闩',
    en: 'THE GATE',
    hero: 'oren',
    skill: '调查',
    skillKey: 'investigation',
    mod: 4,
    dc: 12,
    prompt: '奥伦蹲下检查门闩与窗框。灰很厚，但门闩是从里面落下的——侧窗也许没有锁。',
    success: '窗框上有一道新划痕，侧窗没锁。进去时你们不必再爬破门，也避开了侧窗的塌陷陷阱。',
    fail: '灰太厚，你只摸到一手冷铁。门闩在里面，别的看不出来。',
    effect: 'gate',
    position: [0.0, 1.3, -5.6],
  },
  {
    id: 'tracks',
    title: '崖边的拖痕',
    en: 'DRAG MARKS',
    hero: 'vera',
    skill: '生存',
    skillKey: 'survival',
    mod: 4,
    dc: 13,
    prompt: '薇拉沿着崖边伏下身。雪面被压出两道很深的沟，一直通向侧窗。',
    success: '拖痕很深，很慢——有东西把一个人拖了进去。你们记住了路线，战斗第一回合的攻击有优势。',
    fail: '灰把痕迹盖住了。你只看出有人在这里站过。',
    effect: 'tracks',
    position: [-5.9, 1.15, 0.6],
  },
  {
    id: 'corpse',
    title: '烧焦的斥候',
    en: 'BURNT SCOUT',
    hero: 'bran',
    skill: '运动',
    skillKey: 'athletics',
    mod: 5,
    dc: 12,
    prompt: '布兰抓住焦尸的肩甲。它和冻土粘在一起，像一截烧黑的树根。',
    success: '你搬开焦尸，下面压着一枚村子的铜徽和一瓶没碎的治疗药水。艾达会认得这枚徽章。',
    fail: '焦尸冻在地上。你没能翻动它，只闻到一股甜腻的焦味。',
    effect: 'corpse',
    position: [5.7, 1.1, 1.6],
  },
];

export const SOCIAL_OPTIONS = [
  {
    id: 'badge',
    title: '把村徽放到桌上',
    sub: '无需检定 · 需要探索时找到村徽',
    requires: (flags) => flags.badge,
    check: null,
    flags: { friendly: true, ally: true, key: true, oil: true, mercy: true },
    successText: '艾达看到铜徽，长矛垂了下去。她把钥匙和火油推给你们，只说了一句：“别杀他。”',
  },
  {
    id: 'truth',
    title: '「你弟弟去守烽火了，对吗？」',
    sub: '无需检定 · 需要洞察成功',
    requires: (flags) => flags.truth && !flags.truthSpent,
    check: null,
    flags: { friendly: true, ally: true, key: true, oil: true, mercy: true, truthSpent: true },
    successText: '艾达没有否认。她把钥匙和火油交给你们，请求你们别杀凯尔。',
  },
  {
    id: 'persuade',
    title: '「我们是来点烽火的。」',
    sub: '薇拉 · 说服 +4 · DC 13',
    requires: () => true,
    check: { hero: 'vera', skill: '说服', skillKey: 'persuasion', mod: 4, dc: 13 },
    flags: { friendly: true, ally: true, key: true, oil: true },
    successText: '艾达打量了你们很久，最后把长矛靠在墙边。她给你们钥匙和火油，愿意一起上去。',
    failText: '艾达没有放下长矛，但侧身让开了路。她不会帮你们，至少不会挡路。',
    failFlags: { neutral: true, key: true },
  },
  {
    id: 'insight',
    title: '观察她握矛的手',
    sub: '奥伦 · 洞悉 +3 · DC 12',
    requires: (flags) => !flags.truth,
    check: { hero: 'oren', skill: '洞悉', skillKey: 'insight', mod: 3, dc: 12 },
    flags: { truth: true },
    successText: '她的手在抖，但矛尖一直指着楼梯口。她说的是「他」，不是「它」。你知道上面是谁了。',
    failText: '她裹得太紧，你看不出更多。',
  },
  {
    id: 'intimidate',
    title: '「让开。」',
    sub: '布兰 · 威吓 +3 · DC 14',
    requires: () => true,
    check: { hero: 'bran', skill: '威吓', skillKey: 'intimidation', mod: 3, dc: 14 },
    flags: { hostile: true, key: true },
    successText: '艾达退进阴影里，把钥匙扔在雪上。她不会帮你们，也不会再拦你们。',
    failText: '艾达没有退。她把长矛横在楼梯口，眼神比灰还冷。',
    failFlags: { hostile: true, hostileFail: true },
  },
  {
    id: 'rush',
    title: '直接推门进去',
    sub: '无需检定 · 不和她谈',
    requires: () => true,
    check: null,
    flags: { hostile: true, rushed: true, key: true },
    successText: '你们没有停下。艾达退到楼梯阴影里，长矛始终没有放下。',
  },
];

export const RULES = [
  {
    id: 'basics',
    label: '检定与优势',
    title: '属性检定 · 优势',
    html: `<p>结果不确定、失败又有代价时，掷 <b>d20 + 属性调整值（+ 熟练加值，若熟练）</b>，与 <b>DC</b> 比较。≥ DC 成功。</p>
      <ul><li>本幕的 DC：容易 10、中等 12–13、困难 15。</li>
      <li>失败通常只是少一条线索，不会卡住剧情。</li></ul>
      <p>有<b>优势</b>时掷两次 d20 取高；有<b>劣势</b>时掷两次取低；两者同时存在时互相抵消。</p>
      <span class="cite">SRD 5.1 · Ability Checks / Difficulty Class / Advantage</span>`,
  },
  {
    id: 'combat',
    label: '战斗与骰子',
    title: '先攻 · 攻击 · 伤害',
    html: `<p><b>先攻</b>：战斗开始掷 d20 + 敏捷调整值，从高到低行动。</p>
      <ul>
        <li><b>攻击</b>：d20 + 命中加值 vs 目标 AC；命中后掷伤害骰。</li>
        <li><b>暴击</b>：d20 掷出 20（冠军 19–20），伤害骰翻倍；掷出 1 必定落空。</li>
        <li><b>偷袭</b>：游荡者在有优势、或目标身边有队友时，额外 2d6。</li>
        <li><b>豁免</b>：d20 + 属性调整值（+ 熟练）对抗 DC；成功通常减半或免除。</li>
      </ul>
      <span class="cite">SRD 5.1 · Initiative / Making an Attack / Damage / Saving Throws</span>`,
  },
  {
    id: 'death',
    label: '死亡与短休',
    title: '死亡豁免 · 短休 · 升级',
    html: `<p><b>0 HP</b> 时陷入昏迷。每次轮到你时掷 d20：10+ 成功一次；三次成功稳定；三次失败死亡；掷出 20 恢复 1 HP，掷出 1 记两次失败。</p>
      <p><b>短休</b>至少 1 小时：花生命骰恢复 HP；回气、奥术恢复等资源恢复。</p>
      <p><b>升级</b>：本演示把任务 XP 一次性发到 2,700，全队升到 4 级；属性提升自动加在主属性上。</p>
      <span class="cite">SRD 5.1 · Death Saving Throws / Short Rest / Level Advancement</span>`,
  },
  {
    id: 'script',
    label: '这一幕',
    title: '《灰烬岗哨》· 一幕剧本',
    html: `<p>边境岗哨的烽火三天没点。三名受雇的拾荒者上山，发现守夜人只剩一个，她的弟弟已经变成守在烽火前的灰烬骑士。</p>
      <p><b>探索</b>：大门 / 崖边拖痕 / 烧焦斥候，完成两处即可进入。<br>
      <b>社交</b>：守夜人艾达——村徽、说服、洞悉、威吓，结果直接改变战斗条件。<br>
      <b>战斗</b>：灰烬骑士 + 两只灰烬猎犬；先攻、AC、优势、法术位、死亡豁免都在这一场里。<br>
      <b>短休 / 成长</b>：点起烽火，花生命骰，升到 4 级。</p>
      <span class="cite">剧本与角色原创 · 机制参考 SRD 5.1（CC-BY-4.0）</span>`,
  },
  {
    id: 'source',
    label: '来源与许可',
    title: '来源与许可',
    html: `<p>机制摘要参考 <b>System Reference Document 5.1</b>（CC-BY-4.0）；不复制《玩家手册》译文、表格或美术。</p>
      <p>剧本、角色、地名、对话与画面为原创。“D&amp;D / 龙与地下城”是 Wizards of the Coast 的商标；本页只说明规则风格，不声称官方授权。</p>
      <span class="cite">SRD 5.1 · CC-BY-4.0</span>`,
  },
];

export const STORY = {
  explore: {
    kicker: '幕一 · 探索',
    title: '岗哨外',
    body: `<p>灰从崖上落下来，像一场不凉的雪。门从里面闩着，塔顶的烽火盆是冷的。</p>
      <p class="quiet">三处痕迹散在岗哨外。调查任意两处即可进入——失败只会少一条线索，不会卡住。</p>`,
  },
  social: {
    kicker: '幕二 · 社交',
    title: '守夜人艾达',
    body: `<p>楼梯口亮着一盏灯。一个裹着斗篷的女人用长矛指着你们，左手垂着，袖口是黑的。</p>
      <p class="quiet">艾达：守夜人，HP 14 / AC 13，长矛 +4、1d6+2。她的弟弟凯尔三天前上去点烽火，再也没有下来。</p>`,
  },
  combat: {
    kicker: '幕三 · 战斗',
    title: '灰烬骑士',
    body: `<p>雾从楼梯上漫下来。铁甲里没有人，只有一层还在烧的灰。</p>
      <p class="quiet">先攻已掷。点击敌人指示物切换目标；点击手牌使用动作。击败灰烬骑士即胜。</p>`,
  },
  rest: {
    kicker: '幕四 · 短休',
    title: '烽火',
    body: `<p>烽火点起来了。塔下传来钟声。</p>
      <p class="quiet">每名角色可以花 1 个生命骰恢复 HP；布兰的回气、奥伦的奥术恢复在短休时恢复。</p>`,
  },
  level: {
    kicker: '幕五 · 成长',
    title: '灰烬之后',
    body: `<p>战利品：80 gp、银短剑、治疗药水 ×1。任务 XP 2,700，全队升到 4 级。</p>`,
  },
};

export const EPILOGUES = {
  mercy: '艾达把凯尔的剑留在火盆边。村子看见烽火。',
  friend: '烽火点起；骑士的剑被立在火盆旁。',
  hostile: '艾达不在。烽火点起，塔里只剩你们。',
  defeat: '烽火没点着。村长第二天上山，只找到半枚烧化的徽章。',
};
