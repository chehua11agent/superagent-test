/* 凡戴尔的失落矿坑 · 3D 桌面切片
   参考用户提供的 LMoP PDF 的开场结构（三猪小径伏击 / 克拉格巢穴），
   文本为本切片原创改写；角色为 Starter Set 预生成角色风格的四人小队。
   规则参考 SRD 5.1（CC-BY-4.0）。 */

export const INTRO = [
  {
    kicker: '序章 · 剑湾北地',
    title: '凡戴尔的\n失落矿坑',
    body: '无冬城以南，三猪小径。\n一车补给，四名冒险者，\n和一个先走一步的矮人。',
    note: 'LOST MINE OF PHANDELVER · 5E TABLETOP',
    eyes: false,
    camera: 'road',
  },
  {
    kicker: '十天前 · 无冬城',
    title: '一封短笺',
    body: '冈德伦·寻石者把一小袋金币推过桌面。\n「把车赶到凡达林，找巴特恩。路上别多问。」\n他和西尔达·霍尔温特先走一步。',
    note: '承接人：冈德伦 · 寻石者',
    letter: true,
    eyes: false,
    camera: 'wagon',
  },
  {
    kicker: '三猪小径 · 南行',
    title: '一车补给',
    body: '旧路在针叶林里拐来拐去。\n车轮碾过泥水，雨从午后就没有停。\n冈德伦的马蹄印在前，越走越浅。',
    note: '三猪小径 · 距凡达林还有一天',
    eyes: false,
    camera: 'trail',
  },
  {
    kicker: '路中央',
    title: '两匹死马',
    body: '两匹马横在路心。\n鞍袋被翻过，箭羽还在风里抖。\n黑羽，短箭——哥布林的手艺。',
    note: '侦察：路两侧的蕨丛有被压过的痕迹',
    eyes: false,
    camera: 'horses',
  },
  {
    kicker: '树影',
    title: '有什么东西在动',
    body: '左边的灌木轻轻晃了一下。\n不是风。\n树影深处，亮起两点、四点、六点黄绿色的光。',
    note: '哥布林伏击 · 先攻前的最后一刻',
    eyes: true,
    camera: 'ambush',
  },
];

export const HEROES = {
  darvin: {
    id: 'darvin', name: '达尔文', en: 'DARVIN', race: '人类', cls: '战士 1', tag: '人类 · 士兵',
    hp: 12, ac: 18, init: 1, speed: 30,
    atk: { name: '长剑', mod: 5, dmg: [1, 8, 3] },
    saves: { str: 5, con: 4 }, skills: { athletics: 5, perception: 2, intimidation: 3 },
    feature: '回气 · 1d10+1（短休恢复）',
    desc: '从无冬城的城卫队退下来，盔甲旧，剑还快。他接这趟活，是因为冈德伦给的定金够还三个月房租。',
    quote: '「先看路，再看树。树比路会骗人。」',
    color: '#c9a35d', glyph: '⚔',
    cards: [
      { id: 'darvin-attack', name: '长剑', cost: 'A', kind: 'attack', hint: 'd20 +5 对抗 AC；命中 1d8+3 挥砍。', desc: '战士的近战主攻。' },
      { id: 'darvin-second', name: '回气', cost: 'B', kind: 'heal', heal: [1, 10, 1], uses: 1, hint: '恢复 1d10+1 HP；短休恢复。', desc: '把牙咬紧，再站起来。' },
      { id: 'darvin-dodge', name: '闪避', cost: 'A', kind: 'dodge', hint: '直到下回合，攻击你的检定有劣势。' },
      { id: 'pot', name: '治疗药水', cost: 'A', kind: 'item', item: 'potion', hint: '恢复 2d4+2 HP。' },
    ],
  },
  barvin: {
    id: 'barvin', name: '巴文', en: 'BARVIN', race: '轻足半身人', cls: '游荡者 1', tag: '半身人 · 罪犯',
    hp: 9, ac: 14, init: 3, speed: 25,
    atk: { name: '短弓', mod: 5, dmg: [1, 6, 3] },
    saves: { dex: 5, int: 2 }, skills: { stealth: 7, perception: 3, persuasion: 3, deception: 3, survival: 3 },
    feature: '偷袭 · 有优势或队友在目标身边时 +1d6；幸运',
    desc: '凡达林来的半身人，嘴比箭快。她说自己只是「替人看看货」，但鞍袋里总多出几把不属于她的钥匙。',
    quote: '「别站在路中间。路中间的人先中箭。」',
    color: '#8fb38f', glyph: '➶',
    cards: [
      { id: 'barvin-attack', name: '短弓', cost: 'A', kind: 'attack', hint: 'd20 +5 对抗 AC；命中 1d6+3 穿刺；偷袭 +1d6。', sneak: true, desc: '轻弓，短箭，专挑甲缝。' },
      { id: 'barvin-hide', name: '隐匿', cost: 'B', kind: 'hide', uses: 2, hint: '藏进蕨丛；下一次攻击有优势。', desc: '半身人最擅长的，是不在。' },
      { id: 'barvin-help', name: '协助', cost: 'B', kind: 'help', hint: '选一名队友；其下一次攻击有优势。' },
      { id: 'pot', name: '治疗药水', cost: 'A', kind: 'item', item: 'potion', hint: '恢复 2d4+2 HP。' },
    ],
  },
  bruenor: {
    id: 'bruenor', name: '布鲁诺', en: 'BRUENOR', race: '丘陵矮人', cls: '牧师 1', tag: '矮人 · 侍僧',
    hp: 11, ac: 18, init: 0, speed: 25,
    atk: { name: '钉头锤', mod: 4, dmg: [1, 6, 2] },
    saves: { wis: 5, cha: 2 }, skills: { medicine: 5, religion: 5, insight: 5, perception: 3 },
    feature: '法术位 2 · 治疗伤口 / 祝福；黑暗视觉',
    desc: '摩拉丁的矮人牧师，胡子里藏着半块干面包。他不太喜欢森林，但更不喜欢让年轻人独自走进森林。',
    quote: '「矿坑可以再找。人要先活着回来。」',
    color: '#c98d72', glyph: '✚',
    cards: [
      { id: 'bruenor-attack', name: '钉头锤', cost: 'A', kind: 'attack', hint: 'd20 +4 对抗 AC；命中 1d6+2 钝击。', desc: '矮人的锤子，和脾气一样沉。' },
      { id: 'bruenor-heal', name: '治疗伤口', cost: 'A', kind: 'spell-heal', heal: [1, 8, 3], slot: true, hint: '消耗 1 个法术位；恢复 1d8+3 HP。', desc: '摩拉丁的微光落在伤口上。' },
      { id: 'bruenor-bless', name: '祝福', cost: 'A', kind: 'bless', slot: true, hint: '消耗 1 个法术位；3 轮内全队攻击 +1d4。', desc: '以矮人的方式念出祝词。' },
      { id: 'pot', name: '治疗药水', cost: 'A', kind: 'item', item: 'potion', hint: '恢复 2d4+2 HP。' },
    ],
  },
  aramil: {
    id: 'aramil', name: '阿拉米尔', en: 'ARAMIL', race: '高等精灵', cls: '法师 1', tag: '高等精灵 · 智者',
    hp: 8, ac: 12, init: 2, speed: 30,
    atk: { name: '火焰箭', mod: 5, dmg: [1, 10, 0] },
    saves: { int: 5, wis: 3 }, skills: { arcana: 5, history: 5, investigation: 5, perception: 3 },
    feature: '法术位 2 · 魔法飞弹；黑暗视觉',
    desc: '从无冬城的图书馆里跑出来的精灵。他坚持说矿坑的传闻「有学术价值」，但没人相信他只是为了学术。',
    quote: '「别碰那些刻痕。它们比哥布林更老。」',
    color: '#7f9dc9', glyph: '✦',
    cards: [
      { id: 'aramil-attack', name: '火焰箭', cost: 'A', kind: 'attack', spell: true, hint: 'd20 +5 对抗 AC；命中 1d10 火焰。', desc: '戏法。指尖的一点火星。' },
      { id: 'aramil-mm', name: '魔法飞弹', cost: 'A', kind: 'mm', slot: true, hint: '消耗 1 个法术位；自动命中 3d4+3。', desc: '三颗力场飞弹，不掷命中。' },
      { id: 'aramil-dodge', name: '闪避', cost: 'A', kind: 'dodge', hint: '直到下回合，攻击你的检定有劣势。' },
      { id: 'pot', name: '治疗药水', cost: 'A', kind: 'item', item: 'potion', hint: '恢复 2d4+2 HP。' },
    ],
  },
};

export const HERO_ORDER = ['darvin', 'barvin', 'bruenor', 'aramil'];

export const GOBLINS = {
  goblin1: { id: 'goblin1', name: '哥布林 A', hp: 7, maxHp: 7, ac: 15, init: 2, atk: 4, dmg: [1, 6, 2], side: 'enemy', tag: '克拉格哥布林' },
  goblin2: { id: 'goblin2', name: '哥布林 B', hp: 7, maxHp: 7, ac: 15, init: 2, atk: 4, dmg: [1, 6, 2], side: 'enemy', tag: '克拉格哥布林' },
  goblin3: { id: 'goblin3', name: '哥布林 C', hp: 7, maxHp: 7, ac: 15, init: 2, atk: 4, dmg: [1, 6, 2], side: 'enemy', tag: '克拉格哥布林' },
  goblin4: { id: 'goblin4', name: '哥布林 D', hp: 7, maxHp: 7, ac: 15, init: 2, atk: 4, dmg: [1, 6, 2], side: 'enemy', tag: '克拉格哥布林' },
};

export const STORY = {
  trail: {
    kicker: '第一幕 · 三猪小径',
    title: '两匹死马',
    body: '雨把路泡软了。两匹死马横在车辙里，鞍袋被割开，补给散在泥里。箭羽是黑的，箭杆削得很短——哥布林。',
    combat: '树影里传来短促的咕噜声。四个哥布林从蕨丛后探出弓。',
  },
  victory: {
    kicker: '第一幕 · 尾声',
    title: '泥地上的拖痕',
    body: '最后一个哥布林倒进蕨丛。雨还在下。泥地上有一道很宽的拖痕，向北通向崖壁下的一道裂口。',
  },
  cave: {
    kicker: '下一段 · 克拉格巢穴',
    title: '岩壁下的裂口',
    body: '溪水从岩缝里涌出来，冲出一条窄沟。裂口上方吊着两只死乌鸦，洞口深处有火光，也有哥布林的笑声。',
  },
};

export const RULES = [
  {
    id: 'checks', label: '检定',
    body: '<h3>属性检定</h3><p>需要不确定结果时，掷 d20 + 属性调整值（+ 熟练加值，如果熟练）。结果 ≥ DC 即成功。优势掷两枚取高，劣势取低。</p><h3>这次用到的</h3><ul><li><b>察觉 DC 12</b>：在哥布林放箭前发现树影里的伏兵。</li><li><b>先攻</b>：d20 + 敏捷调整值，决定行动顺序。</li></ul>',
  },
  {
    id: 'combat', label: '战斗',
    body: '<h3>攻击</h3><p>d20 + 攻击加值 对抗 AC。命中后掷伤害骰。自然 20 暴击，伤害骰翻倍；自然 1 必失。</p><h3>优势 / 劣势</h3><p>有优势掷两枚 d20 取高；劣势取低。隐匿、协助、包夹都可能带来优势。</p><h3>动作</h3><p>一轮一个动作：攻击、施法、闪避、协助、喝药水。移动与简单互动不额外占动作。</p>',
  },
  {
    id: 'goblins', label: '哥布林',
    body: '<h3>克拉格哥布林</h3><p>HP 7 · AC 15 · 弯刀 / 短弓 +4，1d6+2。身材小，会利用蕨丛和岩缝；受惊时会往林子里退。</p><p>本切片的哥布林伏击在树影里，发现他们需要 <b>察觉 DC 12</b>。</p>',
  },
  {
    id: 'rest', label: '倒地 / 短休',
    body: '<h3>0 HP</h3><p>角色倒地，开始死亡豁免：每回合掷 d20，10+ 成功，3 次成功稳定，3 次失败死亡。受到治疗即醒来。</p><h3>短休</h3><p>战斗后可以短休：花生命骰恢复 HP；战士回气、牧师法术位按短休恢复。</p>',
  },
  {
    id: 'source', label: '来源',
    body: '<h3>模组</h3><p>开场结构参考用户提供的《凡戴尔的失落矿坑》（Lost Mine of Phandelver）PDF：三猪小径伏击、克拉格巢穴。页面文字为本切片原创改写，不复刻模组原文。</p><h3>规则</h3><p>机制参考 SRD 5.1（CC-BY-4.0）。D&D / 龙与地下城是 Wizards of the Coast 的商标；本页为非官方同人演示，不使用官方美术。</p>',
  },
];

export const ENV_LABELS = { mist: '晨雾', rain: '阴雨', dusk: '黄昏', night: '夜' };

/* 单词检定 · 词库与词义
   每次检定从词库随机抽词；词卡面值 1–20 随机分配，词义掌握只加修正，不保证成功。 */
export const WORDS = [
  { word: 'trail', meaning: '小径' },
  { word: 'ambush', meaning: '伏击' },
  { word: 'goblin', meaning: '哥布林' },
  { word: 'wagon', meaning: '马车' },
  { word: 'horse', meaning: '马' },
  { word: 'cave', meaning: '洞穴' },
  { word: 'forest', meaning: '森林' },
  { word: 'rain', meaning: '雨' },
  { word: 'torch', meaning: '火把' },
  { word: 'sword', meaning: '剑' },
  { word: 'shield', meaning: '盾' },
  { word: 'heal', meaning: '治疗' },
  { word: 'danger', meaning: '危险' },
  { word: 'path', meaning: '道路' },
  { word: 'river', meaning: '河流' },
  { word: 'bridge', meaning: '桥' },
  { word: 'trap', meaning: '陷阱' },
  { word: 'scout', meaning: '侦察兵' },
  { word: 'rescue', meaning: '营救' },
  { word: 'escape', meaning: '逃脱' },
  { word: 'attack', meaning: '攻击' },
  { word: 'hide', meaning: '躲藏' },
  { word: 'search', meaning: '搜索' },
  { word: 'listen', meaning: '听' },
  { word: 'alert', meaning: '警觉' },
  { word: 'dark', meaning: '黑暗' },
  { word: 'light', meaning: '光' },
  { word: 'climb', meaning: '攀爬' },
  { word: 'strong', meaning: '强壮' },
  { word: 'weak', meaning: '虚弱' },
];

export const MAP_NODES = [
  { id: 'trail', label: '三猪小径', sub: '雨里的车辙', type: 'start', icon: '◎', x: 12, y: 50 },
  { id: 'horses', label: '两匹死马', sub: '鞍袋与黑羽箭', type: 'event', icon: '◇', x: 37, y: 24, check: '调查', ability: 'investigation', dc: 12, best: 'aramil' },
  { id: 'stream', label: '路旁浅溪', sub: '被雨冲淡的痕迹', type: 'event', icon: '◇', x: 37, y: 76, check: '生存', ability: 'survival', dc: 12, best: 'barvin' },
  { id: 'shade', label: '树影', sub: '蕨丛里的黄绿色眼睛', type: 'combat', icon: '⚔', x: 62, y: 22 },
  { id: 'wagon', label: '翻倒的补给车', sub: '散落的补给', type: 'treasure', icon: '▣', x: 62, y: 50 },
  { id: 'cliff', label: '崖壁捷径', sub: '湿滑的岩缝', type: 'event', icon: '◇', x: 62, y: 78, check: '运动', ability: 'athletics', dc: 13, best: 'darvin' },
  { id: 'cave', label: '克拉格巢穴', sub: '岩壁下的裂口', type: 'end', icon: '⌂', x: 87, y: 50 },
];
export const MAP_EDGES = [
  ['trail', 'horses'], ['trail', 'stream'],
  ['horses', 'shade'], ['horses', 'wagon'],
  ['stream', 'shade'], ['stream', 'cliff'],
  ['shade', 'cave'], ['wagon', 'cave'], ['cliff', 'cave'],
];


export const RULES_WORD = {
  id: 'word', label: '单词检定',
  body: `<h3>为什么不是 d20</h3>
    <p>单词检定把 d20 换成一张随机词卡：牌堆 20 张，词卡面值 1–20 随机分配；洗牌后抽一张，面值就是这次检定的“骰面”。</p>
    <h3>词义修正</h3>
    <ul><li>4 秒内选对：<b>+3</b></li><li>8 秒内选对：<b>+2</b></li><li>选错：<b>-2</b></li><li>超时：<b>-3</b></li></ul>
    <p>结果 = 词卡面值 + 词义修正 + 属性调整值，对抗 DC / AC。</p>
    <h3>随机性在哪</h3>
    <p>词卡面值、抽到的单词、四个选项的顺序、干扰项都随机；牌堆用完重洗、面值重排。认识单词会提高结果，但抽到低面值仍可能失败，不认识也可能靠高面值成功。</p>
    <h3>优势 / 劣势</h3>
    <p>优势抽两张词卡取高面值，劣势取低面值；只问其中一张的单词，词义修正只算一次。</p>
    <h3>模式</h3>
    <p>手牌区「检定 · 单词 / d20」可切回原来的 d20；敌人攻击与死亡豁免默认用 d20，避免替 DM 答题。</p>`,
};

/* 术语表：游戏里所有关键术语都能点开 */
export const GLOSSARY = {
  AC: { label: 'AC · 护甲等级', sub: 'Armor Class', body: '<p><b>AC 是“被打中的难度”</b>，不是生命值。攻击检定 <b>d20 + 攻击加值 ≥ 目标 AC</b> 就命中；不到就未命中。</p><p>AC 不减少伤害，只决定这一下有没有打中。护甲、盾牌、敏捷、掩体都可能提高 AC。</p><p class="quote">例：哥布林 AC 15。达尔文长剑 +5，d20 掷 10 → 15，命中；掷 9 → 14，未命中。</p>' },
  HP: { label: 'HP · 生命值', sub: 'Hit Points', body: '<p>角色能承受的伤害总量。受到伤害扣 HP；治疗恢复 HP。</p><p>HP 降到 0 会倒地，开始<b>死亡豁免</b>；被治疗到 1 HP 以上会醒来。HP 不是“血量条越厚越难命中”——难命中看 AC。</p>' },
  d20: { label: 'd20 · 二十面骰', sub: 'twenty-sided die', body: '<p>5e 的核心随机源：掷出 1–20，每个数概率相同。检定、攻击、豁免都用它。</p><p><b>优势</b>掷两枚取高，<b>劣势</b>掷两枚取低。自然 20 通常暴击，自然 1 通常必失。</p>' },
  DC: { label: 'DC · 难度等级', sub: 'Difficulty Class', body: '<p>非攻击检定的目标数：<b>d20 + 属性调整值（+ 熟练）≥ DC</b> 即成功。</p><p>例：察觉树影 DC 12；d20 + 察觉 3 掷出 9 以上成功。DC 越高越难。</p>' },
  '先攻': { label: '先攻 · Initiative', body: '<p>战斗开始时掷 <b>d20 + 敏捷调整值</b>，从高到低行动。同值时 DM 决定顺序。</p>' },
  '攻击加值': { label: '攻击加值 · Attack Bonus', body: '<p>攻击检定加在 d20 上的数：属性调整值 + 熟练加值 + 武器/其他加值。</p><p>例：达尔文长剑 +5，掷 d20 后加 5，再和 AC 比。</p>' },
  '伤害': { label: '伤害 · Damage', body: '<p>命中后掷伤害骰，扣目标 HP。例：长剑 1d8+3，掷 5 就是 8 点伤害。</p><p>暴击时伤害骰翻倍（加值不翻倍）。</p>' },
  '优势': { label: '优势 · Advantage', body: '<p>掷两枚 d20 取较高的一枚。隐匿、协助、有利地形或某些能力会给优势。</p><p>优势与劣势同时存在时互相抵消。</p>' },
  '劣势': { label: '劣势 · Disadvantage', body: '<p>掷两枚 d20 取较低的一枚。恐惧、闪避、恶劣环境可能造成劣势。</p>' },
  '豁免': { label: '豁免 · Saving Throw', body: '<p>抵抗法术、陷阱、恐惧等效果时掷 <b>d20 + 豁免加值 ≥ DC</b>。</p><p>例：哥布林嚎叫是感知豁免 DC 13；失败恐惧 2 轮，攻击劣势。</p>' },
  '暴击': { label: '暴击 · Critical Hit', body: '<p>攻击 d20 掷出自然 20（或冠军 19–20）即暴击：伤害骰掷两次相加，攻击加值只加一次。</p>' },
  '偷袭': { label: '偷袭 · Sneak Attack', body: '<p>游荡者的额外伤害：有优势或队友在目标身边时，命中后加 <b>1d6</b>（本切片）。</p>' },
  '协助': { label: '协助 · Help', body: '<p>用一个附赠动作帮队友：选一名队友，其下一次攻击有优势。适合让队友打高 AC 目标。</p>' },
  '隐匿': { label: '隐匿 · Hide', body: '<p>藏进掩体/阴影，下一次攻击有优势。本切片巴文可藏进蕨丛，2 次/短休。</p>' },
  '闪避': { label: '闪避 · Dodge', body: '<p>专注防御：直到你下回合开始，攻击你的检定有劣势。用动作换生存。</p>' },
  '祝福': { label: '祝福 · Bless', body: '<p>牧师法术：3 轮内全队攻击加 <b>1d4</b>。消耗 1 个法术位。</p>' },
  '法术位': { label: '法术位 · Spell Slot', body: '<p>施法的资源。法师/牧师本切片各有 2 个；施放魔法飞弹、治疗伤口、祝福会消耗 1 个。短休按本切片规则恢复。</p>' },
  '动作': { label: '动作 · Action', body: '<p>一轮一个主要动作：攻击、施法、闪避、协助、喝药水。用掉后手牌里的 A 类卡会变灰。</p>' },
  '附赠动作': { label: '附赠动作 · Bonus Action', body: '<p>一轮一个较小的动作：本切片的隐匿、协助、回气等。用掉后 B 类卡变灰。</p>' },
  '短休': { label: '短休 · Short Rest', body: '<p>战斗后休息：花生命骰恢复 HP；战士回气、牧师/法师法术位按本切片恢复。长休才回满所有资源。</p>' },
  '死亡豁免': { label: '死亡豁免 · Death Save', body: '<p>HP 0 时每回合掷 d20：10+ 成功，3 次成功稳定，3 次失败死亡；自然 20 直接回 1 HP，自然 1 算 2 次失败。受到治疗会醒来。</p>' },
  '生命骰': { label: '生命骰 · Hit Die', body: '<p>短休时用来恢复 HP 的骰子：战士 d10、游荡者/牧师 d8、法师 d6，加体质调整值。</p>' },
  '察觉': { label: '察觉 · Perception', body: '<p>发现隐藏事物：伏兵、脚印、暗门。d20 + 察觉调整值 ≥ DC。</p><p>例：树影伏兵察觉 DC 12。</p>' },
  '调查': { label: '调查 · Investigation', body: '<p>推理与搜查线索：翻鞍袋、找机关、判断痕迹。d20 + 调查调整值 ≥ DC。</p>' },
  '生存': { label: '生存 · Survival', body: '<p>追踪、辨路、野外知识。d20 + 生存调整值 ≥ DC。</p>' },
  '运动': { label: '运动 · Athletics', body: '<p>攀爬、推拉、跳跃等体力活。d20 + 运动调整值 ≥ DC。</p>' },
  '词卡面值': { label: '词卡面值 · Word Card', body: '<p>单词检定里替代 d20 的随机数：牌堆 20 张，每张随机分到 1–20 的面值。</p><p>面值 + 词义修正 + 属性值 = 结果；面值随机，所以认识词也可能失败。</p>' },
  '词义修正': { label: '词义修正 · Meaning Bonus', body: '<p>看词义的速度/正确性带来的修正：4 秒内对 +3、8 秒内对 +2、错 -2、超时 -3。</p>' },
  '节点': { label: '节点 · Node', body: '<p>探索地图上的一个地点；走到相邻节点就触发该节点的事件。节点只决定探索事件，不改变战斗距离或掩体。</p>' },
  '事件': { label: '事件 · Event', body: '<p>节点触发的内容：调查、生存、补给、攀爬、战斗、短休等。success/fail 会改变线索与战斗条件。</p>' },
  '治疗药水': { label: '治疗药水 · Potion of Healing', body: '<p>喝下恢复 2d4+2 HP，用一个动作。本切片初始 2 瓶，补给节点可能再找到。</p>' },
};

export const TERM_BAR = ['AC', 'HP', 'd20', 'DC', '优势', '劣势', '先攻', '攻击加值', '豁免', '法术位', '动作', '附赠动作', '短休', '死亡豁免', '词卡面值', '词义修正', '节点'];
