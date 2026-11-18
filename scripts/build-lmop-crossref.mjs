#!/usr/bin/env node
// Build data/lmop/rules-crossref.json from the four part files, maps.json and rules.json.
// Deterministic: run after editing any of those inputs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const parts = ['p001-015', 'p016-033', 'p034-061', 'p062-090'];
const partData = Object.fromEntries(parts.map((p) => [p, read(`data/lmop/${p}.json`)]));
const mapsData = read('data/lmop/maps.json');
const rulesData = read('data/lmop/rules.json');
const RULE_IDS = new Set(rulesData.rules.map((r) => r.id));

const PART_NO = { 'p001-015': 1, 'p016-033': 2, 'p034-061': 3, 'p062-090': 4 };
const SOCIAL_SKILLS = new Set(['说服', '欺瞒', '威吓', '唬弄', '游说', '表演', '洞察']);
const TEXT = (o) => [o.check, o.label, o.context, o.trigger, o.purpose, o.success, o.failure, o.notes, o.note, o.details, o.description].filter(Boolean).join(' ');
const uniq = (a) => [...new Set(a)];

function pageOf(rec, part) {
  if (part === 'p062-090') return rec.pdf_page ?? rec.page ?? null;
  if (Array.isArray(rec.pages)) return rec.pages.join('-');
  if (typeof rec.pages === 'string') return rec.pages;
  if (rec.page != null) return rec.page;
  if (rec.page_start != null) return rec.page_end && rec.page_end !== rec.page_start ? `${rec.page_start}-${rec.page_end}` : rec.page_start;
  return null;
}
function pageStart(rec, part) {
  const p = pageOf(rec, part);
  if (p == null) return null;
  const m = String(p).match(/\d+/);
  return m ? Number(m[0]) : null;
}
function areaNoOf(rec) {
  return rec.area_no ?? rec.areaNumber ?? (rec.type === 'area' ? null : null) ?? null;
}
function kindOf(rec) {
  return rec.kind ?? rec.type ?? 'scene';
}
function isArea(rec) {
  return rec.type === 'area' || rec.area_no != null || rec.areaNumber != null;
}

// ---------------------------------------------------------------- records
const records = new Map();
const recordOrder = [];
addRecord('module:lmop', {
  record_id: 'module:lmop', record_type: 'module', part: 'all', part_no: 0,
  name: '全局规则与游荡怪物', name_en: 'Module-wide rules', kind: 'module', page: null, page_start: null,
  parent_scene_id: null, area_no: null, map_id: null, map_area_no: null,
  checks: [], hazards: [], monsters: [], rewards: [], rule_ids: [], child_records: [],
});
function addRecord(id, rec) {
  if (!id) return;
  if (records.has(id)) throw new Error(`duplicate record id: ${id}`);
  records.set(id, rec);
  recordOrder.push(rec);
}

for (const part of parts) {
  const d = partData[part];
  for (const s of d.scenes || []) {
    addRecord(s.id, {
      record_id: s.id,
      record_type: isArea(s) ? 'area' : 'scene',
      part,
      part_no: PART_NO[part],
      name: s.name ?? s.title ?? s.id,
      name_en: s.name_en ?? null,
      kind: kindOf(s),
      page: pageOf(s, part),
      page_start: pageStart(s, part),
      parent_scene_id: s.parentSceneId ?? s.parent_scene_id ?? null,
      area_no: areaNoOf(s),
      map_id: null,
      map_area_no: null,
      checks: [],
      hazards: [],
      monsters: [],
      rewards: [],
      rule_ids: [],
      child_records: [],
    });
    for (const a of s.areas || []) {
      addRecord(a.id, {
        record_id: a.id,
        record_type: 'area',
        part,
        part_no: PART_NO[part],
        name: a.name ?? a.id,
        name_en: a.name_en ?? null,
        kind: a.type ?? 'area',
        page: pageOf(a, part),
        page_start: pageStart(a, part),
        parent_scene_id: s.id,
        area_no: areaNoOf(a),
        map_id: null,
        map_area_no: null,
        checks: [],
        hazards: [],
        monsters: [],
        rewards: [],
        rule_ids: [],
        child_records: [],
      });
      records.get(s.id).child_records.push(a.id);
    }
  }
}

// link explicit parent records (p001/p016 area scenes are top-level, not nested)
for (const r of recordOrder) {
  if (r.parent_scene_id && records.has(r.parent_scene_id)) {
    const parent = records.get(r.parent_scene_id);
    if (!parent.child_records.includes(r.record_id)) parent.child_records.push(r.record_id);
  }
}

// map area -> record
const mapAreaByRecord = new Map();
for (const m of mapsData.maps) {
  for (const a of m.areas || []) {
    if (!a.area_id || a.area_id.startsWith('external:')) continue;
    const rec = records.get(a.area_id);
    if (!rec) throw new Error(`map ${m.id} area ${a.no} references missing record ${a.area_id}`);
    rec.map_id = m.id;
    rec.map_area_no = a.no;
    rec.map_area_name = a.name;
    rec.map_kind = m.kind;
    rec.map_page = m.page;
    mapAreaByRecord.set(a.area_id, a);
  }
}

// ---------------------------------------------------------------- rule mapping
function rulesForText(t) {
  const out = [];
  const has = (re) => re.test(t);
  if (has(/优势/)) out.push('rule-advantage');
  if (has(/劣势/)) out.push('rule-advantage');
  if (has(/掩护|掩蔽/)) out.push('rule-cover');
  if (has(/困难地形|碎石|荆棘|瓦砾/)) out.push('rule-difficult-terrain');
  if (has(/密门|暗门/)) out.push('rule-secret-door');
  if (has(/锁|盗贼工具/)) out.push('rule-lock');
  if (has(/破门|破坏|强行打开|砸开|撬开/)) out.push('rule-break-object');
  if (has(/陷阱|陷坑|机关/)) out.push('rule-trap');
  if (has(/束缚|捆|锁链|铁链/)) out.push('rule-restrained');
  if (has(/中毒|毒气|毒素/)) out.push('rule-poisoned');
  if (has(/倒地|摔倒|击倒/)) out.push('rule-prone');
  if (has(/坠落|掉下|摔下/)) out.push('rule-falling');
  if (has(/火焰|燃烧|火坑|绿火/)) out.push('rule-fire');
  if (has(/突袭/)) out.push('rule-surprise');
  if (has(/洪水|冲走|淹没/)) out.push('rule-flood');
  if (has(/水下|池|涉水|游泳|水流/)) out.push('rule-water');
  if (has(/黑暗视觉/)) out.push('rule-darkvision');
  if (has(/黑暗|光源|微光|照明/)) out.push('rule-light');
  if (has(/死亡|稳定伤势|0 HP|昏迷/)) out.push('rule-death');
  if (has(/恐慌|恐惧/)) out.push('rule-frightened');
  if (has(/飞行|飞翔/)) out.push('rule-flying');
  if (has(/NPC|队员/)) out.push('rule-npc-party');
  if (has(/治疗|药水/)) out.push('rule-healing');
  if (has(/卷轴/)) out.push('rule-spell-scroll');
  return out;
}
function rulesForCheck(c) {
  let kind = String(c.kind || '').toLowerCase().replace(/-/g, '_');
  if (!kind.includes('saving') && /豁免/.test(TEXT(c))) kind = 'saving_throw';
  const out = [];
  if (kind.includes('procedure')) out.push('rule-random-encounter');
  else if (kind.includes('saving')) out.push('rule-saving-throw');
  else if (kind.includes('passive')) out.push('rule-passive-check');
  else if (kind.includes('contest')) out.push('rule-contest');
  else out.push('rule-ability-check');
  if (c.dc != null) out.push('rule-dc');
  if (c.opposed_by || c.opposedBy || kind.includes('contest')) out.push('rule-contest');
  const skill = c.skill || '';
  if (skill.includes('潜行')) out.push('rule-stealth');
  if (skill.includes('驯养动物')) out.push('rule-animal-handling');
  if (skill.includes('运动') && /攀|爬|烟道|裂谷|悬崖/.test(TEXT(c))) out.push('rule-climb');
  if (SOCIAL_SKILLS.has(skill) || /说服|欺瞒|威吓|唬弄|谈判/.test(TEXT(c))) out.push('rule-social');
  if (skill) out.push('rule-skill');
  if (/盗贼工具|开锁/.test(TEXT(c))) out.push('rule-tool', 'rule-lock');
  if (/集体|全体|每位角色|至少一位|全队|所有人/.test(TEXT(c))) out.push('rule-group-check');
  out.push(...rulesForText(TEXT(c)));
  return uniq(out).filter((id) => RULE_IDS.has(id));
}
function rulesForHazard(h) {
  const out = ['rule-trap', 'rule-saving-throw', 'rule-dc'];
  const t = TEXT(h);
  if (h.condition) out.push('rule-condition');
  if (/束缚/.test(h.condition || '')) out.push('rule-restrained');
  if (/中毒/.test(h.condition || '')) out.push('rule-poisoned');
  if (/倒地/.test(h.condition || '')) out.push('rule-prone');
  if (/火焰/.test(h.damage || '') || /火焰/.test(t)) out.push('rule-fire');
  if (/坠落/.test(t)) out.push('rule-falling');
  if (/洪水|冲走/.test(t)) out.push('rule-flood', 'rule-water');
  if (/钝击/.test(h.damage || '')) out.push('rule-falling');
  out.push(...rulesForText(t));
  return uniq(out).filter((id) => RULE_IDS.has(id));
}
function rulesForReward(r) {
  const out = [];
  const t = JSON.stringify(r);
  if (r.type === 'xp' || r.kind === 'xp' || r.xp > 0) out.push('rule-xp');
  if (/\d+\s*(gp|sp|cp|pp|金币|银币|铜币)|宝石|货币/.test(t) || ['currency', 'gold', 'treasure', 'loot'].includes(r.type)) out.push('rule-treasure');
  if (/魔法|魔杖|法杖|卷轴|药水|\+1/.test(t) || r.type === 'magic_item') out.push('rule-magic-item');
  if (/卷轴/.test(t)) out.push('rule-spell-scroll');
  if (/同调/.test(t) || /boots-of-striding|gauntlets-of-ogre|staff-of-spider|wand-of-magic-missiles|staff-of-defense|ring-of-protection/.test(t)) out.push('rule-attunement');
  if (/治疗药水/.test(t)) out.push('rule-healing');
  return uniq(out).filter((id) => RULE_IDS.has(id));
}
function rulesForMonster(t) {
  const out = ['rule-monster-stat'];
  if (/飞行|fly|wing/i.test(t)) out.push('rule-flying');
  if (/法术|spell|施法/i.test(t)) out.push('rule-spellcasting');
  return uniq(out).filter((id) => RULE_IDS.has(id));
}

const questTargets = new Map();
for (const part of parts) {
  for (const ch of partData[part].chapters || []) {
    for (const q of ch.quests || []) {
      if (q.id && q.target_scene_id) questTargets.set(q.id, q.target_scene_id);
    }
  }
}

// ---------------------------------------------------------------- checks
let checksTotal = 0;
const checksByKind = {};
for (const part of parts) {
  for (const c of partData[part].checks || []) {
    checksTotal += 1;
    const sceneId = c.sceneId ?? c.scene_id ?? null;
    const areaId = c.area_id ?? c.areaId ?? null;
    const target = areaId && records.has(areaId) ? areaId : sceneId;
    const resolved = target && records.has(target) ? target : 'module:lmop';
    const rec = records.get(resolved);
    let kind = String(c.kind || (c.check ? 'ability_check' : 'ability_check')).toLowerCase().replace(/-/g, '_');
    const labelText = String(c.check ?? c.label ?? c.context ?? c.purpose ?? c.trigger ?? '');
    if (kind === 'ability_check' && /豁免/.test(labelText)) kind = 'saving_throw';
    checksByKind[kind] = (checksByKind[kind] || 0) + 1;
    const check = {
      check_id: c.id,
      kind,
      ability: c.ability ?? null,
      skill: c.skill ?? null,
      dc: c.dc ?? null,
      label: c.check ?? c.label ?? c.context ?? c.purpose ?? c.trigger ?? null,
      success: c.success ?? null,
      failure: c.failure ?? null,
      notes: c.notes ?? c.note ?? null,
    };
    const ruleIds = rulesForCheck(c);
    check.rule_ids = ruleIds;
    rec.checks.push(check);
    rec.rule_ids.push(...ruleIds);
  }
}

// ---------------------------------------------------------------- hazards
let hazardsTotal = 0;
for (const part of parts) {
  for (const h of partData[part].hazards || []) {
    hazardsTotal += 1;
    const sceneId = h.sceneId ?? h.scene_id ?? null;
    if (!sceneId || !records.has(sceneId)) throw new Error(`hazard ${h.id} unresolved scene ${sceneId}`);
    const rec = records.get(sceneId);
    const ruleIds = rulesForHazard(h);
    rec.hazards.push({ hazard_id: h.id, name: h.name ?? null, damage: h.damage ?? null, condition: h.condition ?? null, rule_ids: ruleIds });
    rec.rule_ids.push(...ruleIds);
  }
}

// ---------------------------------------------------------------- rewards
let rewardsTotal = 0;
const unassignedRewards = [];
for (const part of parts) {
  for (const r of partData[part].rewards || []) {
    rewardsTotal += 1;
    const sceneId = r.sceneId ?? r.scene_id ?? null;
    const areaId = r.area_id ?? r.areaId ?? null;
    let target = areaId && records.has(areaId) ? areaId : sceneId;
    if ((!target || !records.has(target)) && r.quest_id && questTargets.has(r.quest_id)) target = questTargets.get(r.quest_id);
    const ruleIds = rulesForReward(r);
    if (!target || !records.has(target)) {
      unassignedRewards.push({ reward_id: r.id, type: r.type ?? null, scene_id: sceneId, area_id: areaId, rule_ids: ruleIds });
      target = 'module:lmop';
    }
    const rec = records.get(target);
    rec.rewards.push({
      reward_id: r.id,
      type: r.type ?? r.kind ?? null,
      amount: r.amount ?? null,
      currency: r.currency ?? null,
      condition: r.condition ?? null,
      xp: r.xp ?? null,
      rule_ids: ruleIds,
    });
    rec.rule_ids.push(...ruleIds);
  }
}

// ---------------------------------------------------------------- monster appearances
const appearanceIndex = new Map();
for (const part of parts) {
  for (const m of partData[part].monsters || []) {
    for (const ap of m.appearances || []) {
      const sid = ap.scene_id ?? ap.sceneId ?? null;
      const aid = ap.area_id ?? ap.areaId ?? null;
      const target = aid && records.has(aid) ? aid : sid;
      if (!target || !records.has(target)) continue;
      if (!appearanceIndex.has(target)) appearanceIndex.set(target, []);
      appearanceIndex.get(target).push({
        monster_id: m.id,
        count: parseCount(ap.count ?? ap.qty ?? 1),
        notes: ap.notes ?? ap.note ?? null,
      });
    }
  }
}

// ---------------------------------------------------------------- monsters
function parseCount(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const plus = v.match(/^(\d+)\s*\+\s*[A-Za-z\u4e00-\u9fa5]/);
    if (plus) return Number(plus[1]) + 1;
    const m = v.match(/\d+/);
    if (m) return Number(m[0]);
  }
  return 1;
}
const monsterIds = new Set();
for (const part of parts) for (const m of partData[part].monsters || []) if (m.id) monsterIds.add(m.id);
const missingStatBlocks = new Set();
const MISSING_MONSTER_IDS = { 'Ochre Jelly': 'lmop:monster:ochre-jelly', 'Mormesk the Wraith': 'lmop:monster:wraith' };
function addMonster(rec, monsterId, count, notes, nameEn, name) {
  if (!monsterId && nameEn && MISSING_MONSTER_IDS[nameEn]) monsterId = MISSING_MONSTER_IDS[nameEn];
  if (!monsterId) return;
  const found = rec.monsters.find((m) => m.monster_id === monsterId);
  if (found) {
    found.count = (found.count || 0) + (count || 1);
    if (notes) found.notes = [found.notes, notes].filter(Boolean).join('；');
  } else {
    rec.monsters.push({ monster_id: monsterId, count: count || 1, notes: notes || null, rule_ids: rulesForMonster(notes || monsterId) });
  }
  if (!monsterIds.has(monsterId)) { missingStatBlocks.add(monsterId); rec.rule_ids.push('rule-monster-stat'); }
  rec.rule_ids.push('rule-monster-stat');
}
for (const rec of recordOrder) {
  const apps = appearanceIndex.get(rec.record_id);
  if (apps && apps.length) {
    for (const ap of apps) addMonster(rec, ap.monster_id, ap.count, ap.notes);
    continue;
  }
  if (rec.child_records.length > 0) continue;
  const raw = rawRecord(rec);
  if (raw?.encounter?.groups) {
    for (const g of raw.encounter.groups) addMonster(rec, g.monsterId ?? g.monster_id, parseCount(g.count), g.deployment ?? g.notes);
  }
  if (Array.isArray(raw?.encounters)) {
    for (const e of raw.encounters) addMonster(rec, e.monster_id ?? e.monsterId, parseCount(e.count), e.note ?? e.notes, e.name_en, e.name);
  }
  if (Array.isArray(raw?.monsters)) {
    for (const m of raw.monsters) addMonster(rec, m.monster_id ?? m.monsterId, parseCount(m.count), m.notes);
  }
  if (Array.isArray(raw?.monster_ids)) {
    for (const id of raw.monster_ids) addMonster(rec, id, 1, null);
  }
}
function rawRecord(rec) {
  const d = partData[rec.part];
  if (!d) return null;
  for (const s of d.scenes || []) {
    if (s.id === rec.record_id) return s;
    for (const a of s.areas || []) if (a.id === rec.record_id) return a;
  }
  return null;
}

// ---------------------------------------------------------------- scene-level rules
for (const rec of recordOrder) {
  const raw = rawRecord(rec);
  rec.summary = raw?.summary ?? null;
  const t = `${rec.kind} ${raw?.summary ?? ''} ${(raw?.features || []).map((f) => (typeof f === 'string' ? f : JSON.stringify(f))).join(' ')}`;
  if (/town|shop|tavern|inn/.test(rec.kind) || raw?.rumors || raw?.quests) rec.rule_ids.push('rule-social');
  if (raw?.quests || raw?.quest_ids || /任务/.test(t)) rec.rule_ids.push('rule-quest');
  if (/travel|wilderness|road|trail/.test(rec.kind) || /旅行|道路|路程|跋涉/.test(t)) rec.rule_ids.push('rule-travel');
  if (/random|encounter/.test(t)) rec.rule_ids.push('rule-random-encounter');
  if (/休息|safe rest|安全休息/.test(t)) rec.rule_ids.push('rule-rest');
  if (/施法|法师|spell/.test(t)) rec.rule_ids.push('rule-spellcasting');
  if (/魔法物品|魔杖|法杖|卷轴/.test(t)) rec.rule_ids.push('rule-magic-item');
  if (rec.monsters.length > 0) rec.rule_ids.push('rule-monster-stat', 'rule-initiative', 'rule-action');
  // map-authored rules
  const ma = mapAreaByRecord.get(rec.record_id);
  if (ma) rec.rule_ids.push(...(ma.rules || []));
  rec.rule_ids = uniq(rec.rule_ids).filter((id) => RULE_IDS.has(id)).sort();
  rec.checks.sort((a, b) => String(a.check_id).localeCompare(String(b.check_id)));
  rec.rewards.sort((a, b) => String(a.reward_id).localeCompare(String(b.reward_id)));
  rec.monsters.sort((a, b) => String(a.monster_id).localeCompare(String(b.monster_id)));
  rec.hazards.sort((a, b) => String(a.hazard_id).localeCompare(String(b.hazard_id)));
  rec.mechanics_summary = summaryOf(rec);
}
function summaryOf(rec) {
  const bits = [];
  if (rec.checks.length) bits.push(`${rec.checks.length} 项检定/豁免`);
  if (rec.hazards.length) bits.push(`${rec.hazards.length} 项危险`);
  if (rec.monsters.length) bits.push(`${rec.monsters.reduce((s, m) => s + (Number(m.count) || 1), 0)} 只怪物`);
  if (rec.rewards.length) bits.push(`${rec.rewards.length} 项奖励`);
  return bits.length ? bits.join('；') : '无检定/战斗；按场景描述与探索规则运行';
}

// ---------------------------------------------------------------- coverage
const assignedCheckIds = new Set();
for (const rec of recordOrder) for (const c of rec.checks) assignedCheckIds.add(c.check_id);
const allCheckIds = new Set();
for (const part of parts) for (const c of partData[part].checks || []) allCheckIds.add(c.id);
const unresolvedChecks = [...allCheckIds].filter((id) => !assignedCheckIds.has(id));
const assignedRewardIds = new Set();
for (const rec of recordOrder) for (const r of rec.rewards) assignedRewardIds.add(r.reward_id);
const allRewardIds = new Set();
for (const part of parts) for (const r of partData[part].rewards || []) allRewardIds.add(r.id);
const unresolvedRewards = [...allRewardIds].filter((id) => !assignedRewardIds.has(id) && !unassignedRewards.some((x) => x.reward_id === id));
const usedRules = new Set();
for (const rec of recordOrder) for (const id of rec.rule_ids) usedRules.add(id);
const unusedRules = rulesData.rules.map((r) => r.id).filter((id) => !usedRules.has(id));
const recordsWithoutMechanics = recordOrder.filter((r) => r.checks.length + r.hazards.length + r.monsters.length + r.rewards.length === 0).map((r) => r.record_id);
const dcDist = {};
for (const rec of recordOrder) for (const c of rec.checks) if (c.dc != null) dcDist[c.dc] = (dcDist[c.dc] || 0) + 1;

const coverage = {
  records_total: recordOrder.length,
  records_with_mechanics: recordOrder.length - recordsWithoutMechanics.length,
  records_without_checks_monsters_rewards: recordsWithoutMechanics,
  records_with_rules_only: recordsWithoutMechanics.filter((id) => (records.get(id)?.rule_ids.length || 0) > 0),
  checks_total: checksTotal,
  checks_mapped: assignedCheckIds.size,
  unresolved_checks: unresolvedChecks,
  checks_by_kind: checksByKind,
  dc_distribution: dcDist,
  hazards_total: hazardsTotal,
  rewards_total: rewardsTotal,
  rewards_mapped: assignedRewardIds.size,
  global_rewards: unassignedRewards,
  global_reward_note: '未绑定到具体场景/区域的全局奖励（如开场护送报酬）挂在 module:lmop 上。',
  unresolved_rewards: unresolvedRewards,
  monsters_total: recordOrder.reduce((s, r) => s + r.monsters.length, 0),
  missing_stat_blocks: [...new Set([...missingStatBlocks, 'lmop:monster:ochre-jelly', 'lmop:monster:wraith'])].sort(),
  missing_stat_block_note: '赭色果冻怪与缚灵在正文出现但附录B未给数据卡；XP按《怪物图鉴》估算。',
  rules_total: rulesData.rules.length,
  rules_used: [...usedRules].sort(),
  rules_unused: unusedRules,
};

// ---------------------------------------------------------------- XP / level audit
const levelThresholds = [0, 300, 900, 2700, 6500, 14000];
const p1XpPerPc = (partData['p001-015'].rewards || [])
  .filter((r) => r.type === 'xp' && (r.per === '每名 PC' || r.per === 'per PC'))
  .reduce((s, r) => s + Number(r.amount || 0), 0);
const sumXp = (part) => (partData[part].rewards || []).filter((r) => r.type === 'xp' || r.kind === 'xp' || Number(r.xp) > 0).reduce((s, r) => s + Number(r.amount || r.xp || 0), 0);
const p2Total = sumXp('p016-033');
const p3Drive = partData['p034-061'].xp_summary?.drive_off_venomfang ?? sumXp('p034-061');
const p3Kill = partData['p034-061'].xp_summary?.kill_venomfang ?? sumXp('p034-061');
const p4Listed = sumXp('p062-090');
const p4Monsters = 11550; // appendix-B encounters incl. MM estimates for ochre jelly (450) and wraith (1800)
const scenarios = [];
for (const party of [4, 5]) {
  for (const path of ['drive_off', 'kill']) {
    const p1 = p1XpPerPc;
    const p2 = p2Total / party;
    const p3 = (path === 'drive_off' ? p3Drive : p3Kill) / party;
    const p4 = (p4Listed + p4Monsters) / party;
    const total = p1 + p2 + p3 + p4;
    const level = levelThresholds.reduce((lv, th, i) => (total >= th ? i + 1 : lv), 1);
    scenarios.push({ party_size: party, part3_path: path, part1_per_pc: round1(p1), part2_per_pc: round1(p2), part3_per_pc: round1(p3), part4_per_pc: round1(p4), cumulative_per_pc: round1(total), level_by_xp: level });
  }
}
function round1(n) { return Math.round(n * 10) / 10; }
const levelAudit = {
  thresholds: levelThresholds.map((xp, i) => ({ level: i + 1, xp })),
  milestones: [
    { after: 'part1', target_level: 2, note: '模组明示：275 XP 应足够升到 2 级（另有 75 XP 里程碑，合计 350/PC）。' },
    { after: 'part2', target_level: 3, note: '模组设想角色在第二章结束时达到 3 级。' },
    { after: 'part3', target_level: 4, note: '模组明示：第三章开始时角色可能已达 3 级，第四章为 4 级设计。' },
    { after: 'part4', target_level: 5, note: '入门套装预设终局 5 级；XP 是否足够取决于队伍人数与是否杀死毒牙。' }
  ],
  inputs: {
    part1_per_pc: p1XpPerPc,
    part2_total: p2Total,
    part3_drive_off_total: p3Drive,
    part3_kill_total: p3Kill,
    part4_listed_total: p4Listed,
    part4_monster_total: p4Monsters,
    part4_monster_note: '含附录B遭遇的9300 XP；赭色果冻怪450与缚灵1800按《怪物图鉴》估算，因模组附录未给数据卡。'
  },
  scenarios,
  finding: '按标准“队伍平分 XP”计算：第二部分结束时稳定到 3 级；第三部分结束稳定到 4 级；终局 5 级只在 4 人队且杀死毒牙时由 XP 自然达到。若队伍 5 人或只赶走毒牙，建议在战役结束时使用里程碑升到 5 级，以符合入门套装的预设终局。'
};

// ---------------------------------------------------------------- output
const out = {
  schema_version: 'lmop-crossref-v1',
  generated_at: '2026-11-15',
  source: 'data/lmop/p001-015.json, p016-033.json, p034-061.json, p062-090.json, maps.json, rules.json',
  note: '本文件由 scripts/build-lmop-crossref.mjs 生成；不要手改。',
  coverage,
  level_audit: levelAudit,
  records: recordOrder.map((r) => ({
    record_id: r.record_id,
    record_type: r.record_type,
    part: r.part,
    part_no: r.part_no,
    name: r.name,
    name_en: r.name_en,
    kind: r.kind,
    page: r.page,
    parent_scene_id: r.parent_scene_id,
    area_no: r.area_no,
    map_id: r.map_id,
    map_area_no: r.map_area_no,
    map_area_name: r.map_area_name,
    summary: r.summary,
    rule_ids: r.rule_ids,
    mechanics_summary: r.mechanics_summary,
    checks: r.checks,
    hazards: r.hazards,
    monsters: r.monsters,
    rewards: r.rewards,
    child_records: r.child_records
  }))
};

fs.writeFileSync(path.join(root, 'data/lmop/rules-crossref.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote data/lmop/rules-crossref.json: ${out.records.length} records, ${checksTotal} checks, ${rewardsTotal} rewards, ${hazardsTotal} hazards`);
console.log('rules used', out.coverage.rules_used.length, 'unused', out.coverage.rules_unused.length);
if (out.coverage.rules_unused.length) console.log('unused:', out.coverage.rules_unused.join(', '));
if (out.coverage.missing_stat_blocks.length) console.log('missing stat blocks:', out.coverage.missing_stat_blocks.join(', '));
console.log('level scenarios:', scenarios.map((s) => `${s.party_size}p/${s.part3_path}: ${s.cumulative_per_pc} XP -> L${s.level_by_xp}`).join(' | '));
