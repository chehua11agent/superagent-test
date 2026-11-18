// 5e SRD 背景数据（SRD 5.1 / PHB 第 4 章）。
// 背景提供固定技能熟练、工具/语言与叙事特性；数值部分由角色创建流程合并。

export const SRD_BACKGROUNDS = [
  {
    id: 'acolyte',
    name: '侍僧',
    nameEn: 'Acolyte',
    skillProficiencies: ['insight', 'religion'],
    toolProficiencies: [],
    languageChoices: 2,
    feature: { name: '信仰庇护', description: '你可以在同信仰的神殿与团体中获得免费治疗与照料。' }
  },
  {
    id: 'charlatan',
    name: '骗子',
    nameEn: 'Charlatan',
    skillProficiencies: ['deception', 'sleight-of-hand'],
    toolProficiencies: ['易容工具', '伪造工具'],
    languageChoices: 0,
    feature: { name: '假身份', description: '你拥有一个可信的第二身份、人脉与伪装道具。' }
  },
  {
    id: 'criminal',
    name: '罪犯',
    nameEn: 'Criminal',
    skillProficiencies: ['deception', 'stealth'],
    toolProficiencies: ['一种赌具', '盗贼工具'],
    languageChoices: 0,
    feature: { name: '犯罪联络人', description: '你认识地下世界的一位可靠联络人。' }
  },
  {
    id: 'entertainer',
    name: '艺人',
    nameEn: 'Entertainer',
    skillProficiencies: ['acrobatics', 'performance'],
    toolProficiencies: ['易容工具', '一种乐器'],
    languageChoices: 0,
    feature: { name: '大众偶像', description: '在小镇或村落表演时，你能获得免费食宿与当地人的好感。' }
  },
  {
    id: 'folk-hero',
    name: '民间英雄',
    nameEn: 'Folk Hero',
    skillProficiencies: ['animal-handling', 'survival'],
    toolProficiencies: ['一种工匠工具', '陆运工具'],
    languageChoices: 0,
    feature: { name: '乡野好客', description: '平民愿意为你提供藏身之处与简单帮助。' }
  },
  {
    id: 'guild-artisan',
    name: '公会工匠',
    nameEn: 'Guild Artisan',
    skillProficiencies: ['insight', 'persuasion'],
    toolProficiencies: ['一种工匠工具'],
    languageChoices: 1,
    feature: { name: '公会成员', description: '你的公会将提供食宿、政治支持与工坊使用权。' }
  },
  {
    id: 'hermit',
    name: '隐士',
    nameEn: 'Hermit',
    skillProficiencies: ['medicine', 'religion'],
    toolProficiencies: ['草药工具'],
    languageChoices: 1,
    feature: { name: '顿悟', description: '你独居时获得了一个改变人生的秘密或启示。' }
  },
  {
    id: 'noble',
    name: '贵族',
    nameEn: 'Noble',
    skillProficiencies: ['history', 'persuasion'],
    toolProficiencies: ['一种赌具'],
    languageChoices: 1,
    feature: { name: '特权地位', description: '贵族身份让平民对你更友好，也让你更容易获得接见。' }
  },
  {
    id: 'outlander',
    name: '化外之民',
    nameEn: 'Outlander',
    skillProficiencies: ['athletics', 'survival'],
    toolProficiencies: ['一种乐器'],
    languageChoices: 1,
    feature: { name: '流浪者', description: '你能在荒野中找到足够的食物与水源，并记住地形。' }
  },
  {
    id: 'sage',
    name: '智者',
    nameEn: 'Sage',
    skillProficiencies: ['arcana', 'history'],
    toolProficiencies: [],
    languageChoices: 2,
    feature: { name: '研究者', description: '当你知道某个信息的来源时，你可以轻易找到它。' }
  },
  {
    id: 'sailor',
    name: '水手',
    nameEn: 'Sailor',
    skillProficiencies: ['athletics', 'perception'],
    toolProficiencies: ['领航工具', '水运工具'],
    languageChoices: 0,
    feature: { name: '船运通行', description: '你可以为队伍安排免费船只搭乘，并了解港口。' }
  },
  {
    id: 'soldier',
    name: '士兵',
    nameEn: 'Soldier',
    skillProficiencies: ['athletics', 'intimidation'],
    toolProficiencies: ['一种赌具', '陆运工具'],
    languageChoices: 0,
    feature: { name: '军阶', description: '你的军衔让士兵对你保持基本尊重，也能调用部分军需。' }
  },
  {
    id: 'urchin',
    name: '流浪儿',
    nameEn: 'Urchin',
    skillProficiencies: ['sleight-of-hand', 'stealth'],
    toolProficiencies: ['易容工具', '盗贼工具'],
    languageChoices: 0,
    feature: { name: '城市秘密', description: '你熟悉城市暗道，能以两倍速度穿行并找到捷径。' }
  }
];

export const BACKGROUND_BY_ID = Object.fromEntries(SRD_BACKGROUNDS.map((bg) => [bg.id, bg]));
