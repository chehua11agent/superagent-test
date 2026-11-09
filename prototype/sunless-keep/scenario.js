/* =====================================================================
   THE SUNLESS KEEP — scenario data
   A complete short adventure for three 3rd-level characters, adapted
   from the structure of a classic 5e introductory dungeon.

   HOW TO MODIFY
   -------------
   1. Pregens: add or edit a character in PREGENS.
   2. Monsters: add a stat block in MONSTERS.
   3. Story: every scene lives in SCENES. A scene has read-aloud text,
      objectives, and interactions (checks / actions / branches).
   4. Fights: every battle lives in ENCOUNTERS, with a grid, terrain,
      enemy tokens, and a victory text.
   5. Learning: GLOSSARY entries are highlighted automatically anywhere
      they appear in prose (base form and common inflections).

   All prose, names and dialogue here are original. Monster numbers are
   the open 5e numbers used by the scenario; no book text is reproduced.
   ===================================================================== */

const PREGENS = [
  {
    id: 'bram', name: 'Bram', ancestry: 'Human', class: 'Fighter', level: 3,
    role: 'Front line · 28 HP · AC 18',
    short: 'A steady sword arm. Holds the line while the others work.',
    look: 'fighter',
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
    saves: ['str', 'con'],
    skills: ['athletics', 'perception', 'intimidation'],
    ac: 18, maxHp: 28, speed: 30, hitDie: 10, critRange: 19,
    acNote: 'Chain mail + shield',
    attacks: [
      { id: 'longsword', name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+3', type: 'slashing', range: 5, desc: 'A heavy blade. Reliable in a tight hall.' },
      { id: 'javelin', name: 'Javelin', ability: 'str', proficient: true, damage: '1d6+3', type: 'piercing', range: 30, desc: 'Thrown. Good for the first round of a fight.' }
    ],
    spells: [],
    features: [
      { id: 'second-wind', name: 'Second Wind', cost: 'bonus', kind: 'heal-self', heal: '1d10+3', uses: 1, reset: 'short', desc: 'Catch your breath and recover 1d10+3 HP.' },
      { id: 'action-surge', name: 'Action Surge', cost: 'free', kind: 'extra-action', uses: 1, reset: 'short', desc: 'Take one extra action this turn.' }
    ],
    slots: {},
    inventory: ['Potion of Healing'],
    prof: 2
  },
  {
    id: 'sable', name: 'Sable', ancestry: 'Halfling', class: 'Rogue', level: 3,
    role: 'Scout · 21 HP · AC 15',
    short: 'Quick hands and a quicker exit. Finds the way nobody else sees.',
    look: 'rogue',
    abilities: { str: 8, dex: 17, con: 12, int: 12, wis: 12, cha: 14 },
    saves: ['dex', 'int'],
    skills: ['stealth', 'sleight-of-hand', 'perception', 'persuasion', 'acrobatics'],
    ac: 15, maxHp: 21, speed: 30, hitDie: 8,
    acNote: 'Studded leather',
    attacks: [
      { id: 'shortbow', name: 'Shortbow', ability: 'dex', proficient: true, damage: '1d6+3', type: 'piercing', range: 80, desc: 'Quiet, fast, and easy to aim from cover.' },
      { id: 'dagger', name: 'Dagger', ability: 'dex', proficient: true, damage: '1d4+3', type: 'piercing', range: 5, desc: 'Close work. Better when the enemy is distracted.' }
    ],
    spells: [],
    features: [
      { id: 'cunning-action', name: 'Cunning Action', cost: 'bonus', kind: 'cunning', uses: 99, reset: 'turn', desc: 'Dash, Disengage or Hide as a bonus action.' }
    ],
    slots: {},
    inventory: ['Thieves\' tools', 'Potion of Healing'],
    prof: 2,
    sneak: '2d6'
  },
  {
    id: 'ilya', name: 'Ilya', ancestry: 'Elf', class: 'Wizard', level: 3,
    role: 'Artillery · 17 HP · AC 15',
    short: 'A scholar of fire and frost. Fragile, but ends fights early.',
    look: 'wizard',
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
    saves: ['int', 'wis'],
    skills: ['arcana', 'investigation', 'history'],
    ac: 15, maxHp: 17, speed: 30, hitDie: 6,
    acNote: 'Mage armor',
    attacks: [
      { id: 'fire-bolt', name: 'Fire Bolt', ability: 'int', proficient: true, damage: '1d10', type: 'fire', range: 120, spell: true, desc: 'A dart of flame. Sets dry things alight.' },
      { id: 'ray-of-frost', name: 'Ray of Frost', ability: 'int', proficient: true, damage: '1d8', type: 'cold', range: 60, spell: true, desc: 'Cold slows the target by 10 feet.' }
    ],
    spells: [
      { id: 'magic-missile', name: 'Magic Missile', level: 1, cost: 'action', kind: 'auto', range: 120, damage: '3d4+3', type: 'force', desc: 'Three darts, no attack roll, no miss.' },
      { id: 'burning-hands', name: 'Burning Hands', level: 1, cost: 'action', kind: 'save', aoe: true, saveAbility: 'dex', dc: 13, range: 15, damage: '3d6', type: 'fire', half: true, desc: 'A cone of flame. DEX save for half.' }
    ],
    features: [
      { id: 'arcane-recovery', name: 'Arcane Recovery', cost: 'rest', kind: 'recover-slots', uses: 1, reset: 'long', desc: 'On a short rest, recover two levels of spell slots.' }
    ],
    slots: { 1: { max: 4, used: 0 }, 2: { max: 2, used: 0 } },
    inventory: ['Spellbook', 'Potion of Healing'],
    prof: 2
  },
  {
    id: 'orsa', name: 'Orsa', ancestry: 'Dwarf', class: 'Cleric', level: 3,
    role: 'Support · 24 HP · AC 18',
    short: 'A quiet voice and a bright shield. Keeps the party standing.',
    look: 'cleric',
    abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
    saves: ['wis', 'cha'],
    skills: ['medicine', 'religion', 'insight'],
    ac: 18, maxHp: 24, speed: 25, hitDie: 8,
    acNote: 'Chain mail + shield',
    attacks: [
      { id: 'mace', name: 'Mace', ability: 'str', proficient: true, damage: '1d6+2', type: 'bludgeoning', range: 5, desc: 'A simple, heavy weapon. It does the job.' }
    ],
    spells: [
      { id: 'sacred-flame', name: 'Sacred Flame', level: 0, cost: 'action', kind: 'save', saveAbility: 'dex', dc: 13, range: 60, damage: '1d8', type: 'radiant', desc: 'Radiant fire. DEX save or take damage.' },
      { id: 'guiding-bolt', name: 'Guiding Bolt', level: 1, cost: 'action', kind: 'attack', ability: 'wis', range: 120, damage: '4d6', type: 'radiant', guiding: true, desc: 'On a hit, the next attack against the target has advantage.' },
      { id: 'cure-wounds', name: 'Cure Wounds', level: 1, cost: 'action', kind: 'heal', range: 5, heal: '1d8+3', target: 'ally', desc: 'Touch a wounded ally and restore 1d8+3 HP.' },
      { id: 'healing-word', name: 'Healing Word', level: 1, cost: 'bonus', kind: 'heal', range: 60, heal: '1d4+3', target: 'ally', desc: 'A word at range. Restores 1d4+3 HP as a bonus action.' },
      { id: 'bless', name: 'Bless', level: 1, cost: 'action', kind: 'buff', range: 30, target: 'allies', rounds: 3, desc: 'Three allies add 1d4 to attacks and saves for 3 rounds.' }
    ],
    features: [
      { id: 'channel-divinity', name: 'Preserve Life', cost: 'action', kind: 'channel-heal', uses: 1, reset: 'short', heal: 15, desc: 'Restore 15 HP divided among allies within 30 feet.' }
    ],
    slots: { 1: { max: 4, used: 0 }, 2: { max: 2, used: 0 } },
    inventory: ['Holy symbol', 'Potion of Healing'],
    prof: 2
  }
];

const MONSTERS = {
  giantRat: {
    key: 'giantRat', name: 'Giant Rat', ac: 12, hp: 7, speed: 30, size: 1, xp: 25,
    abilities: { str: 7, dex: 15, con: 11, int: 2, wis: 10, cha: 4 },
    attacks: [{ name: 'Bite', ability: 'dex', proficient: true, damage: '1d4+2', type: 'piercing', range: 5 }],
    ai: 'melee', cr: '1/8'
  },
  kobold: {
    key: 'kobold', name: 'Kobold', ac: 12, hp: 5, speed: 30, size: 1, xp: 25,
    abilities: { str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8 },
    attacks: [
      { name: 'Dagger', ability: 'dex', proficient: true, damage: '1d4+2', type: 'piercing', range: 5 },
      { name: 'Sling', ability: 'dex', proficient: true, damage: '1d4+2', type: 'bludgeoning', range: 30 }
    ],
    traits: ['Pack Tactics'], ai: 'melee', cr: '1/8'
  },
  goblin: {
    key: 'goblin', name: 'Goblin', ac: 15, hp: 7, speed: 30, size: 1, xp: 50,
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    attacks: [
      { name: 'Scimitar', ability: 'dex', proficient: true, damage: '1d6+2', type: 'slashing', range: 5 },
      { name: 'Shortbow', ability: 'dex', proficient: true, damage: '1d6+2', type: 'piercing', range: 80 }
    ],
    traits: ['Nimble Escape'], ai: 'skirmish', cr: '1/4'
  },
  hobgoblin: {
    key: 'hobgoblin', name: 'Hobgoblin Chief', ac: 18, hp: 18, speed: 30, size: 1, xp: 200,
    abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 10, cha: 9 },
    attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+1', type: 'slashing', range: 5 }],
    traits: ['Martial Advantage'], ai: 'melee', cr: '1'
  },
  twigBlight: {
    key: 'twigBlight', name: 'Twig Blight', ac: 13, hp: 4, speed: 20, size: 1, xp: 25,
    abilities: { str: 6, dex: 13, con: 12, int: 4, wis: 8, cha: 3 },
    attacks: [{ name: 'Claws', ability: 'dex', proficient: true, damage: '1d4+1', type: 'slashing', range: 5 }],
    resist: [], vuln: ['fire'], immune: [], ai: 'melee', cr: '1/8'
  },
  thrallTalen: {
    key: 'thrallTalen', name: 'Talen (thrall)', ac: 18, hp: 19, speed: 30, size: 1, xp: 100,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    attacks: [{ name: 'Longsword', ability: 'str', proficient: true, damage: '1d8+4', type: 'slashing', range: 5 }],
    traits: ['Barkskin'], ai: 'melee', cr: '1/2'
  },
  thrallShara: {
    key: 'thrallShara', name: 'Shara (thrall)', ac: 12, hp: 22, speed: 30, size: 1, xp: 100,
    abilities: { str: 8, dex: 14, con: 12, int: 15, wis: 12, cha: 10 },
    attacks: [{ name: 'Dagger', ability: 'dex', proficient: true, damage: '1d4+1', type: 'piercing', range: 5 }],
    spells: [{ name: 'Magic Missile', kind: 'auto', range: 60, damage: '3d4+3', type: 'force', uses: 2 }],
    traits: ['Barkskin'], ai: 'caster', cr: '1/2'
  },
  corvin: {
    key: 'corvin', name: 'Corvin the Outcast', ac: 16, hp: 27, speed: 30, size: 1, xp: 450,
    abilities: { str: 10, dex: 12, con: 12, int: 13, wis: 16, cha: 10 },
    attacks: [
      { name: 'Staff', ability: 'wis', proficient: true, damage: '1d6+2', type: 'bludgeoning', range: 5 },
      { name: 'Thorn Whip', ability: 'wis', proficient: true, damage: '1d6+3', type: 'piercing', range: 30 }
    ],
    spells: [
      { name: 'Entangle', kind: 'save', saveAbility: 'str', dc: 13, range: 60, rounds: 2, condition: 'restrained', desc: 'Roots grasp the target.' },
      { name: 'Cure Wounds', kind: 'heal', range: 5, heal: '1d8+3', target: 'ally', uses: 2 }
    ],
    traits: ['Barkskin'], ai: 'druid', cr: '2'
  },
  blackroot: {
    key: 'blackroot', name: 'The Blackroot', ac: 10, hp: 35, speed: 0, size: 2, xp: 450,
    abilities: { str: 18, dex: 6, con: 16, int: 1, wis: 10, cha: 1 },
    attacks: [],
    resist: ['piercing'], vuln: ['fire'], immune: ['necrotic', 'poison', 'psychic'],
    traits: ['Gulthias Tree', 'Thralls'], ai: 'tree', cr: '2'
  }
};

const GLOSSARY = {
  ancient: { pos: 'adj.', zh: '古老的；年代久远的', ex: 'An ancient fortress sank into the earth.' },
  ravine: { pos: 'n.', zh: '裂谷；深沟', ex: 'A knotted rope hangs into the ravine.' },
  descend: { pos: 'v.', zh: '下降；下去', ex: 'The stairs descend into darkness.' },
  narrow: { pos: 'adj.', zh: '狭窄的', ex: 'A narrow ledge runs along the wall.' },
  ledge: { pos: 'n.', zh: '岩架；壁架', ex: 'The rope ends at a narrow ledge.' },
  rubble: { pos: 'n.', zh: '碎石；瓦砾', ex: 'Rubble covers the old courtyard.' },
  stealth: { pos: 'n.', zh: '潜行；隐蔽', ex: 'Stealth is better than a loud fight.' },
  ambush: { pos: 'n./v.', zh: '伏击；埋伏', ex: 'Something waits in ambush under the leaves.' },
  merchant: { pos: 'n.', zh: '商人', ex: 'Her family were merchants in the village.' },
  reward: { pos: 'n./v.', zh: '报酬；奖赏', ex: 'The reward is a hundred gold pieces.' },
  rescue: { pos: 'v./n.', zh: '营救；救援', ex: 'The rescue party never came back.' },
  promise: { pos: 'n./v.', zh: '承诺；答应', ex: 'She made a promise to her mother.' },
  betray: { pos: 'v.', zh: '背叛；出卖', ex: 'The goblins betray everyone they meet.' },
  bargain: { pos: 'n./v.', zh: '交易；讨价还价', ex: 'A bargain can end a fight before it starts.' },
  surrender: { pos: 'v./n.', zh: '投降；放弃', ex: 'The chief will not surrender easily.' },
  prisoner: { pos: 'n.', zh: '囚犯；俘虏', ex: 'A prisoner waits in the dark cell.' },
  tunnel: { pos: 'n.', zh: '隧道；地道', ex: 'A tunnel opens behind the fallen wall.' },
  shrine: { pos: 'n.', zh: '神龛；圣殿', ex: 'The old shrine smells of dust and smoke.' },
  statue: { pos: 'n.', zh: '雕像', ex: 'A dragon statue guards the door.' },
  curse: { pos: 'n./v.', zh: '诅咒；咒骂', ex: 'The villagers say the ruins are cursed.' },
  disease: { pos: 'n.', zh: '疾病', ex: 'The white fruit is said to cure any disease.' },
  cure: { pos: 'v./n.', zh: '治愈；疗法', ex: 'Nothing seemed to cure the old man.' },
  poison: { pos: 'n./v.', zh: '毒；毒害', ex: 'The pale apple is poison to the touch.' },
  thorn: { pos: 'n.', zh: '刺；荆棘', ex: 'Thorns pull at your sleeves.' },
  briar: { pos: 'n.', zh: '荆棘丛；野蔷薇', ex: 'Pale briars cover the grove floor.' },
  root: { pos: 'n./v.', zh: '根；根源', ex: 'The roots move when you look away.' },
  fruit: { pos: 'n.', zh: '水果；果实', ex: 'A red fruit hangs from the black tree.' },
  harvest: { pos: 'n./v.', zh: '收获；收割', ex: 'The druid harvests the fruit each year.' },
  flame: { pos: 'n.', zh: '火焰', ex: 'The tree is afraid of flame.' },
  torch: { pos: 'n.', zh: '火把', ex: 'Light a torch before you go down.' },
  magical: { pos: 'adj.', zh: '魔法的；神奇的', ex: 'A magical lock seals the stone door.' },
  corpse: { pos: 'n.', zh: '尸体', ex: 'A corpse lies at the bottom of the pit.' },
  druid: { pos: 'n.', zh: '德鲁伊', ex: 'The druid speaks to the roots.' },
  thrall: { pos: 'n.', zh: '奴仆；被控制的人', ex: 'The tree keeps its thralls close.' },
  grove: { pos: 'n.', zh: '小树林；林地', ex: 'A hidden grove waits below the keep.' },
  twilight: { pos: 'n.', zh: '暮色；微光', ex: 'Violet fungus lights the twilight grove.' },
  summon: { pos: 'v.', zh: '召唤；召集', ex: 'He can summon roots from the floor.' },
  grasp: { pos: 'v.', zh: '抓住；紧握', ex: 'Roots grasp at your ankles.' },
  tremble: { pos: 'v.', zh: '颤抖；发抖', ex: 'The ground trembles under the tree.' },
  whisper: { pos: 'v./n.', zh: '低语；耳语', ex: 'The leaves whisper in the dark.' },
  echo: { pos: 'n./v.', zh: '回声；回荡', ex: 'Your steps echo in the empty hall.' },
  vanish: { pos: 'v.', zh: '消失；不见', ex: 'The kobolds vanish into the cracks.' },
  wounded: { pos: 'adj.', zh: '受伤的', ex: 'The wounded scout needs a healer.' },
  heal: { pos: 'v.', zh: '治疗；治愈', ex: 'Rest and a potion can heal these wounds.' },
  courage: { pos: 'n.', zh: '勇气', ex: 'It takes courage to go down alone.' },
  desperate: { pos: 'adj.', zh: '绝望的；拼命地', ex: 'A desperate mother will pay anything.' },
  hollow: { pos: 'adj.', zh: '空心的；空洞的', ex: 'A hollow sound comes from the well.' }
};

/* Scenario assembly and the rest of the data follow below. */

/* =====================================================================
   SCENES — the full flow, from the village to the ending
   ===================================================================== */

const SCENES = {
  oakvale: {
    id: 'oakvale', type: 'story', art: 'village',
    kicker: 'Oakvale · the Oak & Owl · night',
    title: 'A mother’s offer',
    sub: 'A rescue job, a cursed ravine, and two names you will not forget.',
    read: [
      { en: 'Rain has turned the Old Road to mud. Inside the Oak & Owl, the fire is low and the few farmers still awake keep their voices down. A woman sits alone at the corner table, her coat good wool, her eyes tired.', zh: '旧路被雨泡成了泥。橡木与猫头鹰酒馆里炉火将熄，几个还没睡的农夫低声说话。角落桌边独自坐着一位妇人，外套是上好的羊毛，眼神疲惫。' },
      { en: 'Her name is Lady Vane. She is a merchant, and she is desperate. “My son Talen and my daughter Shara went into the ravine a month ago,” she says. “They were looking for the white fruit — the one that is said to cure any disease. They never came back.”', zh: '她叫韦恩夫人，是个商人，也已经走投无路。“一个月前，我的儿子塔伦和女儿莎拉进了裂谷，”她说，“他们去找白果——传说能治好任何疾病的那种。再也没回来。”' },
      { en: '“Bring me their signet rings, or bring them home, and I will pay you well. The village says the place is cursed. Maybe it is. But I have no one else to send.”', zh: '“把他们的印章戒指带回来，或者把他们本人带回来，我付得起。”她说，“村里人说那地方受了诅咒。也许吧。可我没有人可以派了。”' }
    ],
    dm: 'A social opening. These checks change what you know and what you carry. The road waits whenever you are ready.',
    objectives: ['Learn what happened to the twins', 'Prepare for the descent'],
    interactions: [
      {
        id: 'ask', kind: 'check', label: 'Ask what happened to the twins', hint: 'Insight · DC 12', icon: 'WIS',
        skill: 'insight', ability: 'wis', dc: 12,
        success: { en: 'Her hands tremble when she says “white fruit”. She is afraid the twins went looking for a cure that does not exist.', zh: '她说“白果”时手在发抖。她怕两个孩子去找的，是一种根本不存在的解药。', clue: 'The white fruit may be a trap.' },
        fail: { en: 'She repeats the same story. You cannot tell what she is hiding — only that she is hiding something.', zh: '她把同样的话又说了一遍。你看不出她瞒了什么，只知道她确实瞒着事。' }
      },
      {
        id: 'bargain', kind: 'check', label: 'Negotiate the reward', hint: 'Persuasion · DC 13', icon: 'CHA',
        skill: 'persuasion', ability: 'cha', dc: 13,
        success: { en: 'She adds fifty gold to the reward and slides a potion across the table. “For the road,” she says.', zh: '她在报酬里加了五十金币，又把一瓶药水推过桌面。“路上用。”', gold: 50, item: 'Potion of Healing' },
        fail: { en: 'Her face closes. “The price is the price.” She still hires you, but the warmth is gone.', zh: '她的脸沉了下来。“价钱就是价钱。”她仍然雇了你，只是那点温度没了。' }
      },
      {
        id: 'history', kind: 'check', label: 'Ask about the ruins', hint: 'History · DC 12', icon: 'INT',
        skill: 'history', ability: 'int', dc: 12,
        success: { en: 'Long ago, a dragon cult carved a fortress into the rock below the road. The earth swallowed it in a single night. The ravine is the only way in.', zh: '很久以前，一个龙之教派在旧路下的岩层里凿出一座要塞。大地在一夜之间把它吞了进去。裂谷是唯一入口。', clue: 'The ruins were a dragon cult fortress.' },
        fail: { en: 'You have heard the name “Sunless Keep” before, but the old stories have worn down to rumor.', zh: '你听过“无光城塞”这个名字，但那些老故事早就磨成了传闻。' }
      },
      {
        id: 'supplies', kind: 'check', label: 'Buy supplies before you go', hint: 'Investigation · DC 10', icon: 'INT',
        skill: 'investigation', ability: 'int', dc: 10,
        success: { en: 'You buy rope, two torches and a flask of oil. The shopkeeper throws in a second potion when he hears where you are going.', zh: '你买了绳子、两支火把和一瓶油。店主听说你要去哪儿，又多塞了一瓶药水。', items: ['Rope', 'Torch', 'Oil flask', 'Potion of Healing'] },
        fail: { en: 'The shop is nearly bare. You find rope and one torch, and nothing else worth carrying.', zh: '店里几乎空了。你只找到绳子和一支火把，别的都不值得带。', items: ['Rope', 'Torch'] }
      }
    ],
    next: { label: 'Leave for the ravine', scene: 'ravine' }
  },

  ravine: {
    id: 'ravine', type: 'story', art: 'ravine',
    kicker: 'The Old Road · the ravine',
    title: 'A wound in the earth',
    sub: 'Fifty feet down, the ruins are waiting. Something down there is already awake.',
    read: [
      { en: 'The Old Road ends at a wound in the earth. Broken pillars lean over a narrow ravine, their carvings worn smooth by rain. A knotted rope hangs from one pillar and vanishes into the dark.', zh: '旧路在一道大地的伤口前断了。断裂的石柱歪在狭窄的裂谷边，雕纹被雨磨平。一根打着结的绳子从石柱垂下去，消失在黑暗里。' },
      { en: 'Fifty feet below, a ledge waits. Beyond it, stairs zigzag down into the ruins. The air smells of wet stone and something sweet, like fruit left to rot.', zh: '五十英尺下有一道岩架。再往里，石阶之字形向下伸进废墟。空气里有湿石头的气味，还有一点甜味，像放烂了的果子。' }
    ],
    dm: 'Exploration. Study the ledge and move quietly if you like; the descent starts the first fight either way.',
    objectives: ['Reach the ledge below', 'Deal with whatever is waiting in the rubble'],
    interactions: [
      {
        id: 'study', kind: 'check', label: 'Study the ledge from above', hint: 'Investigation · DC 12', icon: 'INT',
        skill: 'investigation', ability: 'int', dc: 12,
        success: { en: 'You find the remains of a camp: a cold fire, a torn bedroll, and a page in a careful hand. “The kobolds are not the worst thing down here. The tree is.”', zh: '你找到一处营地的残迹：冷掉的篝火、撕破的铺盖，还有一页字迹工整的纸。“狗头人不是这下面最糟的东西。那棵树才是。”', clue: 'A previous explorer warned about “the tree”.' },
        fail: { en: 'The wind moves the rope against the stone. You see nothing else from up here.', zh: '风把绳子吹得拍打岩壁。从上面再看不出别的。' }
      },
      {
        id: 'quiet', kind: 'check', label: 'Move quietly along the rim', hint: 'Stealth · DC 13 · group', icon: 'DEX', group: true,
        skill: 'stealth', ability: 'dex', dc: 13,
        success: { en: 'You move from pillar to pillar without a sound. Below, two rats are busy with something in the rubble. They do not look up.', zh: '你从一根石柱挪到另一根，没有发出声音。下面两只巨鼠正忙着翻碎石，没有抬头。', flag: 'surpriseRats' },
        fail: { en: 'A stone turns under your boot. Below, something stops moving. Then it starts moving toward the rope.', zh: '一块石头在你靴底打滑。下面有什么东西停住了，然后又朝绳子的方向动起来。' }
      },
      {
        id: 'climb', kind: 'check', label: 'Climb down the knotted rope', hint: 'Athletics · DC 10', icon: 'STR',
        skill: 'athletics', ability: 'str', dc: 10,
        success: { en: 'You climb down the rope, feet braced against the rock. The ledge is cold and gritty under your hands. Then the rubble moves.', zh: '你脚蹬岩壁，顺着绳子下去。岩架冰凉粗糙。然后碎石动了。', combat: 'rats' },
        fail: { en: 'Halfway down, the rope jerks. You hit the ledge hard, and the noise wakes everything in the rubble.', zh: '下到一半，绳子猛地一扯。你重重摔在岩架上，响声惊醒了碎石里的一切。', damage: { dice: '1d6', type: 'bludgeoning' }, combat: 'rats' }
      }
    ],
    next: null
  },

  citadelGate: {
    id: 'citadelGate', type: 'story', art: 'gate',
    kicker: 'The Sunless Keep · the ruined courtyard',
    title: 'Three kobolds and a locked door',
    sub: 'They are small. They are also behind a wall, and they saw you first.',
    read: [
      { en: 'The stairs end in a courtyard that should be open sky, but is not. A broken tower leans over cracked flagstones. A stone door stares back at you: a dragon carved in relief, its open mouth a keyhole.', zh: '石阶尽头是一处本该露天、却不见天的庭院。一座残塔歪在开裂的石板地上。一扇石门正对着你：浮雕是一条龙，张开的嘴就是锁孔。' },
      { en: 'Behind a low barricade, three kobolds watch you. Their slings are loaded, and their tails twitch. One of them hisses something in a language of clicks.', zh: '矮墙后面，三个狗头人盯着你。投石索已经上弹，尾巴不停抽动。其中一个用咔哒作响的语言嘶声说了句什么。' }
    ],
    dm: 'Social or stealth. Talking opens the kobold court; fighting skips it and costs you allies.',
    objectives: ['Get past the kobold guards', 'Find the way deeper into the keep'],
    interactions: [
      {
        id: 'parley', kind: 'check', label: 'Lower your weapons and talk', hint: 'Persuasion · DC 12', icon: 'CHA',
        skill: 'persuasion', ability: 'cha', dc: 12,
        success: { en: 'The kobolds lower their slings. A small one with a chipped horn steps forward. “You are not goblins,” she says. “Come. The queen will want to see you.”', zh: '狗头人放下了投石索。一个角上缺了口的小个子走上前。“你们不是地精，”她说，“来吧。女王会想见你们。”', next: 'koboldQueen' },
        fail: { en: 'The kobolds answer with stones. The talk is over.', zh: '狗头人用石头回答。谈话结束了。', combat: 'kobolds' }
      },
      {
        id: 'threaten', kind: 'check', label: 'Threaten them with steel', hint: 'Intimidation · DC 14', icon: 'CHA',
        skill: 'intimidation', ability: 'cha', dc: 14,
        success: { en: 'They scatter into the cracks. On the barricade you find an iron key and a scrap of a map. The courtyard is yours.', zh: '他们四散钻进裂缝。你在矮墙上找到一把铁钥匙和一小片地图。庭院归你了。', item: 'Iron key', flag: 'koboldsFled', next: 'goblinGate' },
        fail: { en: 'One of them laughs — a thin, brave sound — and the slings snap.', zh: '其中一个笑了，笑得又细又大胆，然后投石索响了。', combat: 'kobolds' }
      },
      {
        id: 'sneak', kind: 'check', label: 'Slip along the wall', hint: 'Stealth · DC 14 · group', icon: 'DEX', group: true,
        skill: 'stealth', ability: 'dex', dc: 14,
        success: { en: 'You slide from shadow to shadow and find a side passage. A key hangs on a nail by the door; you take it. The kobolds never turn around.', zh: '你在阴影之间移动，找到一条侧廊。门边钉子上挂着一把钥匙，你取了下来。狗头人始终没有回头。', flag: 'sneaked', item: 'Iron key', next: 'goblinGate' },
        fail: { en: 'A sling stone cracks against the wall beside your head. So much for quiet.', zh: '一颗石弹擦着你耳边砸在墙上。安静是谈不上了。', combat: 'kobolds' }
      },
      {
        id: 'attack', kind: 'action', label: 'Draw steel and charge', hint: 'Combat · 3 kobolds', icon: 'ATK',
        result: { en: 'You cross the courtyard at a run. The kobolds scatter behind their barricade and load again.', zh: '你冲过庭院。狗头人缩到矮墙后，重新上弹。', combat: 'kobolds' }
      }
    ],
    next: null
  },

  koboldQueen: {
    id: 'koboldQueen', type: 'story', art: 'throne',
    kicker: 'The Sunless Keep · the kobold court',
    title: 'Queen Sesh',
    sub: 'A queen without a dragon, and a key you need.',
    read: [
      { en: 'The kobolds lead you through a low hall where violet mushrooms glow in the cracks. At the end, a small figure sits on a throne made of broken statues. Her scales are pale, her horns painted with green dye.', zh: '狗头人领你穿过一条低矮的走廊，裂缝里亮着紫色蘑菇。尽头，一个瘦小的身影坐在用碎雕像拼成的王座上。她的鳞片发白，角上涂着绿染料。' },
      { en: 'An empty iron cage hangs from the ceiling. “My name is Sesh,” she says. “The goblins took something of mine. A white dragon. Small now, but a dragon still. Bring her back, and I will give you the key to their gate. Fail, and I will feed you to the mushrooms.”', zh: '天花板上吊着一只空铁笼。“我叫塞什，”她说，“地精抢走了我的东西。一条白龙。现在还小，但终究是龙。把她带回来，我就把地精大门的钥匙给你。做不到，我就把你们喂蘑菇。”' }
    ],
    dm: 'The kobolds can be allies or a dead end. What you ask for here changes what you carry into the last act.',
    objectives: ['Learn what Sesh knows about the twins', 'Get the key to the goblin gate'],
    interactions: [
      {
        id: 'askHumans', kind: 'check', label: 'Ask about the missing humans', hint: 'Insight · DC 13', icon: 'WIS',
        skill: 'insight', ability: 'wis', dc: 13,
        success: { en: 'Sesh’s tail goes still. “The tall ones? The goblins gave them to the Outcast. He lives below, with the tree. They do not come back.”', zh: '塞什的尾巴停住了。“那两个高个子？地精把他们交给了弃徒。他住在下面，和那棵树一起。他们回不来。”', clue: 'The Outcast has the twins.' },
        fail: { en: 'She tilts her head. “Humans are always losing humans. Ask the goblins.”', zh: '她歪了歪头。“人类总是在丢人类。去问地精。”' }
      },
      {
        id: 'askTree', kind: 'check', label: 'Ask about the tree below', hint: 'Arcana · DC 13', icon: 'INT',
        skill: 'arcana', ability: 'int', dc: 13,
        success: { en: '“The tree is older than the keep. It drinks blood and grows fruit. The Outcast calls it the Blackroot. Fire is the one thing it fears.”', zh: '“那棵树比城塞还老。它喝血，结果子。弃徒叫它黑根。它只怕一样东西：火。”', clue: 'The Blackroot fears fire.' },
        fail: { en: '“The tree is the tree,” she says, as if that explains anything. “Do not go into the grove.”', zh: '“树就是树。”她说，好像这就解释了一切，“别进那片林地。”' }
      },
      {
        id: 'deal', kind: 'check', label: 'Promise to find her dragon', hint: 'Persuasion · DC 12', icon: 'CHA',
        skill: 'persuasion', ability: 'cha', dc: 12,
        success: { en: 'Sesh flicks her tail. A guard brings an iron key, two potions and a clay flask of alchemist’s fire. “The key opens the goblin gate. Do not make me regret this.”', zh: '塞什甩了甩尾巴。一名卫兵送来铁钥匙、两瓶药水和一只装炼金火的陶瓶。“钥匙开地精大门。别让我后悔。”', items: ['Iron key', 'Potion of Healing', 'Potion of Healing', 'Alchemist’s fire'], flag: 'koboldAlly' },
        fail: { en: 'She gives you the key and nothing else. “Prove you are useful first.”', zh: '她只给了钥匙，别的什么也没有。“先证明你有用。”', item: 'Iron key' }
      },
      {
        id: 'refuse', kind: 'action', label: 'Refuse her bargain', hint: 'Leave without kobold help', icon: '—',
        result: { en: 'You tell her you will find your own way. She shrugs and flicks a key across the floor. “Then go. The goblins will be glad to meet you.”', zh: '你说你会自己找路。她耸耸肩，把一把钥匙弹过地面。“那就去吧。地精会很高兴见到你们。”', item: 'Iron key', next: 'goblinGate', flag: 'refusedKobolds' }
      }
    ],
    next: { label: 'Take the passage to the goblin gate', scene: 'goblinGate', hint: 'You can leave at any time; the key and the passage are enough.' }
  },

  goblinGate: {
    id: 'goblinGate', type: 'story', art: 'goblins',
    kicker: 'The Sunless Keep · the goblin gate',
    title: 'Caltrops and a gold ring',
    sub: 'A hobgoblin wears Talen’s ring on his sword hand.',
    read: [
      { en: 'The iron key turns in a lock shaped like a dragon’s mouth. Beyond, the corridor is strewn with caltrops and the stench of old meat. A barricade of mortared stone blocks half the hall.', zh: '铁钥匙插进龙嘴形状的锁里，转动了。门后走廊撒满铁蒺藜，满是旧肉的臭味。一道用灰浆砌起的矮墙堵住了半边大厅。' },
      { en: 'A hobgoblin in patchwork mail steps into the torchlight. In one hand is a curved blade. On the other, a gold ring with a maple leaf. Behind him, goblins argue over a pot.', zh: '一个穿拼凑锁甲的大地精走进火把光里。一只手握着弯刀，另一只手上有一枚刻着枫叶的金戒指。他身后，几个地精正为一口锅争吵。' }
    ],
    dm: 'A fight you can shape before it starts. Force, fear or stealth each change the enemy line-up.',
    objectives: ['Break through the goblin gate', 'Find out what happened to the twins'],
    interactions: [
      {
        id: 'charge', kind: 'action', label: 'Charge the barricade', hint: 'Combat · full guard', icon: 'ATK',
        result: { en: 'You go over the barricade before the goblins can nock another arrow.', zh: '地精还没来得及再搭一支箭，你已经翻过了矮墙。', combat: 'goblins' }
      },
      {
        id: 'intimidate', kind: 'check', label: 'Offer them one chance to run', hint: 'Intimidation · DC 15', icon: 'CHA',
        skill: 'intimidation', ability: 'cha', dc: 15,
        success: { en: 'Your voice fills the hall. Two goblins drop their blades and run. The hobgoblin does not.', zh: '你的声音灌满大厅。两个地精丢下刀跑了。大地精没有。', combat: 'goblinsFlee' },
        fail: { en: 'The hobgoblin spits. “Kill them.” The goblins stop arguing and pick up their blades.', zh: '大地精啐了一口。“杀了他们。”地精不再争吵，捡起了刀。', combat: 'goblins' }
      },
      {
        id: 'sneak', kind: 'check', label: 'Cross the caltrops in silence', hint: 'Stealth · DC 14 · group', icon: 'DEX', group: true,
        skill: 'stealth', ability: 'dex', dc: 14,
        success: { en: 'You cross the caltrops without a sound. Only the chief and one guard remain in your path.', zh: '你无声地穿过铁蒺藜。挡在路上的只剩首领和一名守卫。', combat: 'goblinsSneak' },
        fail: { en: 'A caltrop rings against stone. The hall goes quiet, and then very loud.', zh: '一枚铁蒺藜碰响了石头。大厅先是一静，然后炸开了。', combat: 'goblins' }
      }
    ],
    next: null
  },

  grove: {
    id: 'grove', type: 'story', art: 'grove',
    kicker: 'The Sunless Keep · the twilight grove',
    title: 'The Blackroot',
    sub: 'The tree is hungry. The man in the brown robe is patient.',
    read: [
      { en: 'The tunnel opens into a cavern that should not exist under a ruined keep. Pale briars cover the floor, and violet fungus glows on the walls. In the center stands a tree blacker than the shadows around it, its branches twisted like a hand.', zh: '隧道通向一个本不该存在于废墟之下的洞窟。苍白的荆棘铺满地面，墙上亮着紫色菌光。中央立着一棵树，比周围的影子还黑，枝条扭成一只手的形状。' },
      { en: 'Two figures stand beneath it: a young man in dented armor and a young woman in a torn blue robe. Their skin is grey and rough as bark. Between them waits an old man in a brown robe, a sickle in one hand and a staff in the other.', zh: '树下站着两个人：一个穿凹陷盔甲的年轻男子，一个穿破蓝袍的年轻女子。他们的皮肤灰暗粗糙，像树皮。两人之间等着一个穿棕袍的老人，一手镰刀，一手木杖。' },
      { en: '“You are late,” he says. “The tree is hungry.”', zh: '“你们来晚了，”他说，“树饿了。”' }
    ],
    dm: 'The last scene is a conversation and a fight. What you learn here can end the fight early — or make it winnable.',
    objectives: ['Free Talen and Shara', 'Destroy the Blackroot'],
    interactions: [
      {
        id: 'who', kind: 'check', label: 'Ask who he is', hint: 'Insight · DC 12', icon: 'WIS',
        skill: 'insight', ability: 'wis', dc: 12,
        success: { en: 'His voice is calm, but his eyes keep moving to the tree. He is not afraid of you. He is afraid of losing it.', zh: '他的声音很平静，但眼睛一直飘向那棵树。他不怕你们，他怕失去它。', clue: 'Corvin cares more about the tree than the fight.' },
        fail: { en: '“I am what the circle made me,” he says. “A gardener.”', zh: '“我是那个圈子造就的我，”他说，“一个园丁。”' }
      },
      {
        id: 'treeLore', kind: 'check', label: 'Recall what you know about the tree', hint: 'Arcana · DC 14', icon: 'INT',
        skill: 'arcana', ability: 'int', dc: 14,
        success: { en: 'The Blackroot feeds on blood and fear. Fire is the one thing it fears. Destroy the tree, and its thralls will be free.', zh: '黑根以血和恐惧为食。它唯一怕的是火。毁掉这棵树，它的奴仆就会自由。', clue: 'Destroy the Blackroot to free the thralls. Fire is its weakness.', flag: 'treeLore' },
        fail: { en: 'You know the shape of the old stories, but not enough to use them.', zh: '你记得老故事的轮廓，但还不够拿来用。' }
      },
      {
        id: 'letgo', kind: 'check', label: 'Tell him to let them go', hint: 'Persuasion · DC 15', icon: 'CHA',
        skill: 'persuasion', ability: 'cha', dc: 15,
        success: { en: 'He laughs. “The tree does not let go. But I will make you a deal: kneel, and I will spare one of them.” For a moment, his attention is on his own words.', zh: '他笑了。“树不会放手。但我跟你们做个交易：跪下，我就放过他们中的一个。”有那么一瞬，他的注意力全在自己的话上。', flag: 'corvinDistracted' },
        fail: { en: '“They are not prisoners,” he says. “They are supplicants.”', zh: '“他们不是囚犯，”他说，“他们是信徒。”' }
      },
      {
        id: 'attack', kind: 'action', label: 'Attack while he is still talking', hint: 'Combat · the grove', icon: 'ATK',
        result: { en: 'You move before he finishes the word. The briars tear at your legs, and the tree turns toward you.', zh: '他话没说完你就动了。荆棘撕扯你的腿，那棵树转向了你。', combat: 'boss' }
      },
      {
        id: 'kneel', kind: 'action', label: 'Kneel and accept his offer', hint: 'Ending · surrender', icon: '—',
        result: { ending: 'thrall' }
      }
    ],
    next: null
  },

  coda: {
    id: 'coda', type: 'story', art: 'dawn',
    kicker: 'The Old Road · dawn',
    title: 'What you carry back',
    sub: 'The tree is gone. The fruit is not.',
    read: [
      { en: 'The Blackroot comes apart with a sound like a wet branch snapping. The thralls fall to the ground, their grey skin already less grey. Corvin is gone, or dead, or folded into the dark.', zh: '黑根发出一声湿树枝折断般的脆响，裂开了。两个奴仆倒在地上，灰暗的皮肤已经不那么灰了。科尔文不见了，或者死了，或者折进了黑暗里。' },
      { en: 'Dawn finds you on the Old Road. Talen and Shara are alive, weak, leaning on each other. Erin walks beside them, complaining about goblin wine. Behind you, smoke rises from the ravine.', zh: '黎明时你们走在旧路上。塔伦和莎拉还活着，虚弱地互相搀扶。艾琳走在旁边，抱怨着地精的酒。身后，裂谷里升起烟。' },
      { en: 'Lady Vane is waiting at the gate of Oakvale. She does not speak when she sees her children. She only holds them. In your pack, the red fruit is warm.', zh: '韦恩夫人在橡谷门口等着。看到孩子时她一句话也没说，只是抱住他们。你的包里，那颗红果还是温的。' }
    ],
    dm: 'The adventure is over. The last choice is about what the fruit is worth — and who you are.',
    objectives: ['Decide what to do with the red fruit'],
    interactions: [
      {
        id: 'give', kind: 'action', label: 'Give the fruit to the Vanes', hint: 'Ending · mercy', icon: '—',
        result: { ending: 'good' }
      },
      {
        id: 'keep', kind: 'action', label: 'Keep the fruit and sell it', hint: 'Ending · profit', icon: '—',
        result: { ending: 'keep' }
      },
      {
        id: 'burn', kind: 'action', label: 'Burn the fruit in the inn fire', hint: 'Ending · refuse the bargain', icon: '—',
        result: { ending: 'burn' }
      }
    ],
    next: null
  }
};

/* =====================================================================
   ENCOUNTERS — grids are 5 ft squares. x grows east, y grows south.
   `difficult` costs 2 squares of movement; `cover` gives +2 AC vs ranged.
   ===================================================================== */

const VICTORY_RATS = {
  title: 'The ledge falls quiet',
  read: [
    { en: 'Two rats lie still in the rubble. The ledge is quiet again. Below, the stairs continue into the keep, and the sweet smell is stronger now.', zh: '两只巨鼠躺在碎石里不动了。岩架又安静下来。下面的石阶继续伸进城塞，那股甜味更浓了。' }
  ],
  next: 'citadelGate'
};

const VICTORY_KOBOLDS = {
  title: 'The courtyard is clear',
  read: [
    { en: 'The kobold guards are down. On the barricade you find an iron key and a clay flask of alchemist’s fire. The dragon-carved door is still locked, but the key is not for that door.', zh: '狗头人守卫倒下了。你在矮墙上找到一把铁钥匙和一只装炼金火的陶瓶。龙纹石门仍然锁着，但这把钥匙不是开那扇门的。' }
  ],
  items: ['Iron key', 'Alchemist’s fire'],
  next: 'goblinGate'
};

const VICTORY_GOBLINS = {
  title: 'The gate is broken',
  read: [
    { en: 'The hobgoblin falls. On his belt is a gold signet ring with a maple leaf — Talen’s. In a cage by the wall, a small gnome with wild hair watches you.', zh: '大地精倒下了。他腰带上有一枚刻着枫叶的金印章戒指——塔伦的。墙边笼子里，一个头发乱蓬蓬的小侏儒看着你。' },
    { en: '“About time,” she says. “I’m Erin. The goblins sold the others to the Outcast. He’s below, in the grove. And he has a tree that eats people.” She rubs her wrists. “The tree is called the Blackroot. Fire hurts it. I can tend your wounds if you rest.”', zh: '“总算来了，”她说，“我叫艾琳。地精把另外两个人卖给了弃徒。他在下面，那片林地里。他有一棵吃人的树。”她揉着手腕，“那棵树叫黑根。火能伤它。你们要是休息，我可以帮你们处理伤口。”' }
  ],
  items: ['Talen’s signet ring', 'Potion of Healing'],
  clue: 'The Outcast has the twins in the grove. The Blackroot fears fire.',
  flag: 'foundRing',
  rest: true,
  next: 'grove'
};

const ENCOUNTERS = {
  rats: {
    id: 'rats', name: 'The Ledge', subtitle: 'Rubble · two giant rats',
    intro: 'The rubble shifts. Two rats the size of dogs come out of the dark, teeth first.',
    grid: { w: 9, h: 7 },
    start: [[1, 2], [1, 3], [1, 4]],
    difficult: ['3,1', '4,2', '4,3', '5,4', '3,5', '7,5'],
    cover: [],
    walls: [],
    props: [{ type: 'pit', x: 4, y: 3 }],
    enemies: [
      { key: 'giantRat', name: 'Giant Rat A', x: 6, y: 2 },
      { key: 'giantRat', name: 'Giant Rat B', x: 6, y: 4 }
    ],
    objective: 'defeatAll',
    victory: VICTORY_RATS
  },

  kobolds: {
    id: 'kobolds', name: 'The Courtyard', subtitle: 'Barricade · three kobolds',
    intro: 'The kobolds loose their slings. Stones buzz past your ears.',
    grid: { w: 11, h: 8 },
    start: [[1, 2], [1, 3], [1, 4]],
    difficult: [],
    cover: ['7,3', '7,4', '7,5'],
    walls: ['5,1', '5,6'],
    props: [{ type: 'barricade', x: 7, y: 3 }, { type: 'barricade', x: 7, y: 4 }, { type: 'barricade', x: 7, y: 5 }],
    enemies: [
      { key: 'kobold', name: 'Kobold A', x: 8, y: 2 },
      { key: 'kobold', name: 'Kobold B', x: 8, y: 4 },
      { key: 'kobold', name: 'Kobold C', x: 8, y: 6 }
    ],
    objective: 'defeatAll',
    victory: VICTORY_KOBOLDS
  },

  goblins: {
    id: 'goblins', name: 'The Goblin Gate', subtitle: 'Caltrops · three goblins and a chief',
    intro: 'The hobgoblin points his blade. The goblins stop arguing and come at you.',
    grid: { w: 12, h: 8 },
    start: [[1, 2], [1, 3], [1, 4]],
    difficult: ['5,2', '5,3', '5,4', '5,5', '6,3', '6,4'],
    cover: ['8,3', '8,4', '8,5'],
    walls: ['3,1', '3,6'],
    props: [{ type: 'barricade', x: 8, y: 3 }, { type: 'barricade', x: 8, y: 4 }, { type: 'barricade', x: 8, y: 5 }, { type: 'caltrops', x: 5, y: 3 }, { type: 'caltrops', x: 6, y: 4 }],
    enemies: [
      { key: 'goblin', name: 'Goblin A', x: 9, y: 2 },
      { key: 'goblin', name: 'Goblin B', x: 9, y: 4 },
      { key: 'goblin', name: 'Goblin C', x: 9, y: 6 },
      { key: 'hobgoblin', name: 'Hobgoblin Chief', x: 10, y: 4 }
    ],
    objective: 'defeatAll',
    victory: VICTORY_GOBLINS
  },

  goblinsFlee: {
    id: 'goblinsFlee', name: 'The Goblin Gate', subtitle: 'Only the chief is left',
    intro: 'Two goblins run. The hobgoblin steps over them, unimpressed.',
    grid: { w: 12, h: 8 },
    start: [[1, 2], [1, 3], [1, 4]],
    difficult: ['5,2', '5,3', '5,4', '5,5', '6,3', '6,4'],
    cover: ['8,3', '8,4', '8,5'],
    walls: ['3,1', '3,6'],
    props: [{ type: 'caltrops', x: 5, y: 3 }, { type: 'caltrops', x: 6, y: 4 }],
    enemies: [
      { key: 'hobgoblin', name: 'Hobgoblin Chief', x: 10, y: 4 }
    ],
    objective: 'defeatAll',
    victory: VICTORY_GOBLINS
  },

  goblinsSneak: {
    id: 'goblinsSneak', name: 'The Goblin Gate', subtitle: 'The chief and one guard',
    intro: 'You come out of the caltrops behind the barricade. The chief turns last.',
    grid: { w: 12, h: 8 },
    start: [[1, 2], [1, 3], [1, 4]],
    difficult: ['5,2', '5,3', '5,4', '5,5', '6,3', '6,4'],
    cover: ['8,3', '8,4', '8,5'],
    walls: ['3,1', '3,6'],
    props: [{ type: 'caltrops', x: 5, y: 3 }, { type: 'caltrops', x: 6, y: 4 }],
    enemies: [
      { key: 'goblin', name: 'Goblin Guard', x: 9, y: 3 },
      { key: 'hobgoblin', name: 'Hobgoblin Chief', x: 10, y: 4 }
    ],
    objective: 'defeatAll',
    victory: VICTORY_GOBLINS
  },

  boss: {
    id: 'boss', name: 'The Twilight Grove', subtitle: 'The Blackroot · Corvin · two thralls',
    intro: 'The briars pull at your legs. The tree is not moving. It does not need to.',
    grid: { w: 13, h: 9 },
    start: [[1, 3], [1, 4], [1, 5]],
    difficult: ['3,2', '3,3', '3,4', '4,2', '4,4', '4,5', '5,5', '5,6', '6,2', '6,6', '7,6', '8,6', '9,2', '9,3', '10,2', '10,6', '11,3', '11,4', '11,5'],
    cover: [],
    walls: [],
    props: [{ type: 'fungus', x: 2, y: 2 }, { type: 'fungus', x: 11, y: 2 }, { type: 'fungus', x: 2, y: 7 }, { type: 'fungus', x: 11, y: 7 }],
    enemies: [
      { key: 'twigBlight', name: 'Twig Blight A', x: 5, y: 3 },
      { key: 'twigBlight', name: 'Twig Blight B', x: 10, y: 3 },
      { key: 'thrallTalen', name: 'Talen (thrall)', x: 6, y: 5 },
      { key: 'thrallShara', name: 'Shara (thrall)', x: 9, y: 6 },
      { key: 'corvin', name: 'Corvin the Outcast', x: 10, y: 5 },
      { key: 'blackroot', name: 'The Blackroot', x: 7, y: 3, size: 2 }
    ],
    objective: 'tree',
    victory: {
      title: 'The Blackroot falls',
      read: [
        { en: 'The tree comes apart from the inside. A sound goes through the cavern like a held breath let go. The thralls drop to the briars, their grey skin already less grey. Corvin is gone — or dead, or folded into the dark.', zh: '树从内部裂开。一声长响穿过洞窟，像一口憋了太久的气终于吐出来。两个奴仆倒在荆棘里，灰暗的皮肤已经不那么灰了。科尔文不见了——或者死了，或者折进了黑暗里。' }
      ],
      next: 'coda'
    }
  }
};

/* =====================================================================
   ENDINGS
   ===================================================================== */

const ENDINGS = {
  good: {
    id: 'good', kicker: 'Ending · mercy', title: 'The gate of Oakvale', art: 'dawn',
    read: [
      { en: 'You put the red fruit in Lady Vane’s hands. She does not ask what it cost. She breaks it open and gives half to each of her children, and the grey leaves their skin like a stain lifted from cloth.', zh: '你把红果放进韦恩夫人手里。她没有问代价。她掰开果子，给两个孩子各一半，灰色像布料上的污渍一样从他们皮肤上褪去。' },
      { en: 'Word of Oakvale spreads along the Old Road. Travelers start to nod at you in inns. The Vanes pay you three hundred gold, and Erin stays for a week, eating everything in the kitchen.', zh: '橡谷的消息沿着旧路传开。旅店里的旅人开始向你点头。韦恩家付了三百金币，艾琳留下来住了一周，把厨房里的东西吃了个遍。' }
    ],
    reward: { gold: 300, title: 'Friend of the Vane family', xp: 250 }
  },
  keep: {
    id: 'keep', kicker: 'Ending · profit', title: 'A warm fruit, a cold road', art: 'road',
    read: [
      { en: 'You keep the fruit. In the market at the next town, a collector in a grey coat pays five hundred gold and does not ask where it came from. The Vanes thank you for their children and do not invite you to stay.', zh: '你留下了果子。在下一座城的集市上，一个穿灰外套的收藏家付了五百金币，没问来路。韦恩家为孩子们道了谢，却没有留你住下。' },
      { en: 'The road is good. The pouch is heavy. Some nights you wonder whether the fruit could have saved someone else.', zh: '路很好走，钱袋很沉。有些夜里你会想，那颗果子本可以救别人。' }
    ],
    reward: { gold: 500, title: 'A heavy purse', xp: 200 }
  },
  burn: {
    id: 'burn', kicker: 'Ending · refusal', title: 'Nothing left to sell', art: 'fire',
    read: [
      { en: 'You drop the fruit into the inn fire. It burns with a sweet smell and a sound like a small animal. Lady Vane watches, and after a moment she nods. “Good,” she says. “Let that be the end of it.”', zh: '你把果子丢进酒馆的炉火。它烧起来，有股甜味，发出像小动物一样的声音。韦恩夫人看着，过了一会儿点点头。“好，”她说，“就让这事到此为止。”' },
      { en: 'The Vanes pay you two hundred gold. Erin says you are an idiot, then buys you a drink. In the morning, the Old Road is just a road again.', zh: '韦恩家付了你两百金币。艾琳说你是个白痴，然后请你喝了一杯。第二天早上，旧路又只是一条路了。' }
    ],
    reward: { gold: 200, title: 'A clean conscience', xp: 300 }
  },
  thrall: {
    id: 'thrall', kicker: 'Ending · surrender', title: 'The grove keeps you', art: 'grove',
    read: [
      { en: 'You kneel. Corvin smiles, and the roots are gentle as they take your wrists. The last thing you see clearly is the tree. It is beautiful, in the way a deep well is beautiful: dark, and patient, and waiting for you to fall in.', zh: '你跪下了。科尔文笑了，根须缠上手腕时轻得像在扶你。你最后看清的东西是那棵树。它很美，像一口深井那样美：黑暗、耐心，等着你掉进去。' },
      { en: 'Somewhere above, the Old Road keeps its muddy way toward Oakvale. The grove does not care. It has new supplicants now.', zh: '在某个上方，旧路继续泥泞地通向橡谷。林地不在乎。它现在有了新的信徒。' }
    ],
    reward: { gold: 0, title: 'The garden grows', xp: 0 }
  }
};

/* =====================================================================
   ASSEMBLY
   ===================================================================== */

const SCENARIO = {
  id: 'sunless-keep',
  title: 'The Sunless Keep',
  subtitle: 'A complete 5e adventure prototype',
  partySize: 3,
  startScene: 'oakvale',
  intro: {
    en: 'A month ago, two young adventurers went into the ruins below the Old Road. They never came back. Tonight, their mother offers you a way in.',
    zh: '一个月前，两个年轻冒险者进了旧路下的废墟，再没回来。今夜，他们的母亲给了你一条进去的路。'
  },
  pregens: PREGENS,
  monsters: MONSTERS,
  scenes: SCENES,
  encounters: ENCOUNTERS,
  endings: ENDINGS,
  glossary: GLOSSARY
};
