// 5e SRD 护甲（SRD 5.1 / PHB 第 5 章“护甲”）。
// category 用于护甲熟练判断；dexCap = 0 表示重甲完全不添加敏捷调整值。
// 未列出的护甲（如兽皮、镶钉皮甲）按 SRD 数据补全。

export const SRD_ARMOR = [
  { id: 'none', name: '无甲', nameEn: 'Unarmored', category: 'none', baseAc: 10, dexCap: null },
  { id: 'padded', name: '布甲', nameEn: 'Padded', category: 'light', baseAc: 11, dexCap: null, stealthDisadvantage: true },
  { id: 'leather', name: '皮甲', nameEn: 'Leather', category: 'light', baseAc: 11, dexCap: null },
  { id: 'studded-leather', name: '镶钉皮甲', nameEn: 'Studded Leather', category: 'light', baseAc: 12, dexCap: null },
  { id: 'hide', name: '兽皮甲', nameEn: 'Hide', category: 'medium', baseAc: 12, dexCap: 2 },
  { id: 'chain-shirt', name: '锁子衫', nameEn: 'Chain Shirt', category: 'medium', baseAc: 13, dexCap: 2 },
  { id: 'scale-mail', name: '鳞甲', nameEn: 'Scale Mail', category: 'medium', baseAc: 14, dexCap: 2, stealthDisadvantage: true },
  { id: 'breastplate', name: '胸甲', nameEn: 'Breastplate', category: 'medium', baseAc: 14, dexCap: 2 },
  { id: 'half-plate', name: '半身板甲', nameEn: 'Half Plate', category: 'medium', baseAc: 15, dexCap: 2, stealthDisadvantage: true },
  { id: 'ring-mail', name: '环甲', nameEn: 'Ring Mail', category: 'heavy', baseAc: 14, dexCap: 0, stealthDisadvantage: true },
  { id: 'chain-mail', name: '链甲', nameEn: 'Chain Mail', category: 'heavy', baseAc: 16, dexCap: 0, strengthReq: 13, stealthDisadvantage: true },
  { id: 'splint', name: '板条甲', nameEn: 'Splint', category: 'heavy', baseAc: 17, dexCap: 0, strengthReq: 15, stealthDisadvantage: true },
  { id: 'plate', name: '板甲', nameEn: 'Plate', category: 'heavy', baseAc: 18, dexCap: 0, strengthReq: 15, stealthDisadvantage: true }
];

export const SHIELD_BONUS = 2;
export const ARMOR_BY_ID = Object.fromEntries(SRD_ARMOR.map((armor) => [armor.id, armor]));
