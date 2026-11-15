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
