#!/usr/bin/env node
// Validate data/lmop/maps.json, rules.json and rules-crossref.json against the four part files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PARTS = ['p001-015', 'p016-033', 'p034-061', 'p062-090'];
export function load(root) {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  return {
    maps: read('data/lmop/maps.json'),
    rules: read('data/lmop/rules.json'),
    crossref: read('data/lmop/rules-crossref.json'),
    parts: Object.fromEntries(PARTS.map((p) => [p, read(`data/lmop/${p}.json`)])),
  };
}

export function validate({ maps, rules, crossref, parts }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const ruleIds = new Set(rules.rules.map((r) => r.id));
  if (rules.rules.length < 40) err(`rules: expected >= 40, got ${rules.rules.length}`);
  if (ruleIds.size !== rules.rules.length) err('rules: duplicate ids');

  // -------------------------------------------------- maps
  if (maps.maps.length !== 8) err(`maps: expected 8, got ${maps.maps.length}`);
  const mapIds = new Set();
  const areaIdsGlobal = new Set();
  const mapAreaIndex = new Map();
  for (const m of maps.maps) {
    for (const f of ['id', 'title', 'kind', 'scale', 'canvas']) if (!m[f]) err(`map ${m.id ?? '?'}: missing ${f}`);
    if (mapIds.has(m.id)) err(`duplicate map id ${m.id}`);
    mapIds.add(m.id);
    const { width, height } = m.canvas;
    const numbers = new Set();
    for (const a of m.areas || []) {
      if (!a.area_id) err(`map ${m.id}: area missing area_id`);
      if (areaIdsGlobal.has(a.area_id)) err(`duplicate area_id ${a.area_id}`);
      areaIdsGlobal.add(a.area_id);
      mapAreaIndex.set(a.area_id, { map: m, area: a });
      if (m.kind !== 'region') {
        if (typeof a.no !== 'number') err(`map ${m.id} area ${a.area_id}: missing numeric no`);
        else if (numbers.has(a.no)) err(`map ${m.id}: duplicate area no ${a.no}`);
        else numbers.add(a.no);
      }
      if (!Array.isArray(a.footprint) || a.footprint.length < 3) err(`map ${m.id} area ${a.no}: footprint needs >=3 points`);
      else {
        for (const p of a.footprint) {
          if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) err(`map ${m.id} area ${a.no}: bad point ${JSON.stringify(p)}`);
          else if (p[0] < 0 || p[0] > width || p[1] < 0 || p[1] > height) err(`map ${m.id} area ${a.no}: point ${p} outside canvas ${width}x${height}`);
        }
      }
      if (typeof a.ceiling_ft !== 'number' || a.ceiling_ft < 0) err(`map ${m.id} area ${a.no}: bad ceiling`);
      if (!a.light) err(`map ${m.id} area ${a.no}: missing light`);
      if (!Array.isArray(a.rules) || a.rules.length === 0) warn(`map ${m.id} area ${a.no}: no rule_ids`);
      for (const rid of a.rules || []) if (!ruleIds.has(rid)) err(`map ${m.id} area ${a.no}: unknown rule ${rid}`);
    }
    if (m.kind === 'dungeon' || m.kind === 'town') {
      const expected = (m.areas || []).length;
      if (numbers.size !== expected) err(`map ${m.id}: ${numbers.size} numbered areas vs ${expected} areas`);
      for (let i = 1; i <= expected; i++) if (!numbers.has(i)) err(`map ${m.id}: missing area number ${i}`);
    }
    // connections
    const nodes = new Set((m.areas || []).map((a) => a.area_id));
    const adj = new Map([...nodes].map((n) => [n, new Set()]));
    const externals = new Set();
    const seenPairs = new Set();
    for (const c of m.connections || []) {
      const pair = [c.from, c.to].sort().join('|');
      if (seenPairs.has(pair)) err(`map ${m.id}: duplicate connection ${c.from} <-> ${c.to}`);
      seenPairs.add(pair);
      for (const end of [c.from, c.to]) {
        if (!end) err(`map ${m.id}: connection missing endpoint`);
        else if (!nodes.has(end)) {
          if (end.startsWith('external:')) externals.add(end); else err(`map ${m.id}: connection endpoint ${end} is not an area`);
        }
      }
      if (c.from && c.to && c.from === c.to) err(`map ${m.id}: self connection ${c.from}`);
      if (adj.has(c.from) && adj.has(c.to)) { adj.get(c.from).add(c.to); adj.get(c.to).add(c.from); }
      if (externals.has(c.from) && adj.has(c.to)) adj.get(c.to).add(c.from);
      if (externals.has(c.to) && adj.has(c.from)) adj.get(c.from).add(c.to);
      if (!c.type) err(`map ${m.id}: connection ${c.from}->${c.to} missing type`);
    }
    if ((m.kind === 'dungeon' || m.kind === 'site' || m.kind === 'town' || m.kind === 'battlemap') && nodes.size > 0) {
      const starts = [...externals].filter((e) => (m.connections || []).some((c) => c.from === e || c.to === e));
      const startArea = (m.connections || []).find((c) => c.from?.startsWith('external:') && nodes.has(c.to))?.to
        || (m.connections || []).find((c) => c.to?.startsWith('external:') && nodes.has(c.from))?.from
        || [...nodes][0];
      const seen = new Set([startArea]);
      const queue = [startArea];
      while (queue.length) {
        const n = queue.shift();
        for (const nb of adj.get(n) || []) if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
      }
      const unreachable = [...nodes].filter((n) => !seen.has(n));
      if (unreachable.length) err(`map ${m.id}: unreachable areas from ${startArea}: ${unreachable.join(', ')}`);
      if (m.kind !== 'battlemap' && nodes.size > 1 && starts.length === 0) warn(`map ${m.id}: no explicit external entrance`);
    }
    if (m.kind === 'region') {
      for (const s of m.sites || []) if (!Array.isArray(s.hex) || s.hex.length !== 2) err(`region site ${s.id}: bad hex`);
      for (const t of m.travel || []) if (!(t.miles > 0)) err(`region travel ${t.from}->${t.to}: bad miles`);
    }
  }
  const counts = { maps: maps.maps.length, areas: maps.maps.reduce((s, m) => s + (m.areas?.length || 0), 0),
    sites: maps.maps.reduce((s, m) => s + (m.sites?.length || 0), 0),
    connections: maps.maps.reduce((s, m) => s + (m.connections?.length || 0), 0) };
  for (const [k, v] of Object.entries(counts)) {
    const cv = k === 'sites' ? (maps.counts?.region_sites ?? maps.counts?.sites) : maps.counts?.[k];
    if (cv !== v) err(`maps.counts.${k}: ${cv} != ${v}`);
  }

  // -------------------------------------------------- records from parts
  const records = new Map();
  const add = (id, rec) => {
    if (!id) return;
    if (records.has(id)) err(`duplicate source record ${id}`);
    records.set(id, rec);
  };
  for (const part of PARTS) {
    for (const s of parts[part].scenes || []) {
      add(s.id, { id: s.id, page: recPage(s, part), pageText: recPageText(s), type: s.type, part });
      for (const a of s.areas || []) add(a.id, { id: a.id, page: recPage(a, part), pageText: recPageText(a), type: a.type, part });
    }
  }
  function recPageText(rec) {
    if (Array.isArray(rec.pages)) return rec.pages.join('-');
    if (typeof rec.pages === 'string') return rec.pages;
    if (rec.page != null) return String(rec.page);
    if (rec.page_start != null) return `${rec.page_start}${rec.page_end && rec.page_end !== rec.page_start ? '-' + rec.page_end : ''}`;
    if (rec.pdf_page != null) return String(rec.pdf_page);
    return null;
  }
  function recPage(rec, part) {
    if (part === 'p062-090') return rec.pdf_page ?? null;
    if (Array.isArray(rec.pages)) return Number(String(rec.pages[0]).match(/\d+/)?.[0]);
    if (typeof rec.pages === 'string') return Number(rec.pages.match(/\d+/)?.[0]);
    if (rec.page != null) return Number(rec.page);
    if (rec.page_start != null) return Number(rec.page_start);
    return null;
  }
  for (const id of areaIdsGlobal) {
    if (id.startsWith('external:')) continue;
    const rec = records.get(id);
    if (!rec) { err(`map area ${id} has no source scene/area record`); continue; }
    const a = mapAreaIndex.get(id).area;
    if (a.page != null && rec.page != null && a.page !== rec.page) {
      // PART 4 source records use PDF pages, and the map layer normalises to PDF pages.
      if (rec.pageText && String(rec.pageText).split(/\D+/).includes(String(a.page))) { /* page is within the source range */ }
      else if (id.startsWith('lmop:scene:area-') && a.page === rec.page) { /* ok */ }
      else warn(`map area ${id}: map page ${a.page} != source page ${rec.page}`);
    }
  }
  // every source scene that declares a map must be represented by an area
  for (const part of PARTS) for (const s of parts[part].scenes || []) {
    if (s.mapId && !mapAreaIndex.has(s.id) && !(s.areas?.length || s.childSceneIds?.length)) warn(`source scene ${s.id} references ${s.mapId} but has no map area`);
  }

  // -------------------------------------------------- crossref
  const cr = crossref;
  if (!cr.records || !Array.isArray(cr.records)) err('crossref: missing records');
  const crIds = new Set();
  for (const r of cr.records) {
    if (crIds.has(r.record_id)) err(`crossref: duplicate record ${r.record_id}`);
    crIds.add(r.record_id);
    if (!Array.isArray(r.rule_ids) || r.rule_ids.length === 0) err(`crossref: ${r.record_id} has no rule_ids`);
    for (const rid of r.rule_ids || []) if (!ruleIds.has(rid)) err(`crossref: ${r.record_id} unknown rule ${rid}`);
    for (const c of r.checks || []) for (const rid of c.rule_ids || []) if (!ruleIds.has(rid)) err(`crossref: check ${c.check_id} unknown rule ${rid}`);
  }
  if (!crIds.has('module:lmop')) err('crossref: missing module:lmop record');
  for (const id of records.keys()) if (!crIds.has(id)) err(`crossref: missing source record ${id}`);
  for (const id of crIds) if (id !== 'module:lmop' && !records.has(id)) err(`crossref: extra record ${id}`);
  const cov = cr.coverage || {};
  if (cov.checks_mapped !== cov.checks_total) err(`crossref: ${cov.checks_mapped}/${cov.checks_total} checks mapped`);
  if ((cov.unresolved_checks || []).length) err(`crossref: unresolved checks ${cov.unresolved_checks.join(', ')}`);
  if (cov.rewards_mapped !== cov.rewards_total) err(`crossref: ${cov.rewards_mapped}/${cov.rewards_total} rewards mapped`);
  if ((cov.unresolved_rewards || []).length) err(`crossref: unresolved rewards ${cov.unresolved_rewards.join(', ')}`);
  if ((cov.rules_unused || []).length) err(`crossref: unused rules ${cov.rules_unused.join(', ')}`);
  const sumKinds = Object.values(cov.checks_by_kind || {}).reduce((s, n) => s + n, 0);
  if (sumKinds !== cov.checks_total) err(`crossref: checks_by_kind sums ${sumKinds} != ${cov.checks_total}`);
  for (const rid of cov.rules_used || []) if (!ruleIds.has(rid)) err(`crossref: used rule ${rid} missing from rules.json`);
  const allChecks = PARTS.flatMap((p) => parts[p].checks || []);
  if (allChecks.length !== cov.checks_total) err(`crossref: checks_total ${cov.checks_total} != source ${allChecks.length}`);
  const allRewards = PARTS.flatMap((p) => parts[p].rewards || []);
  if (allRewards.length !== cov.rewards_total) err(`crossref: rewards_total ${cov.rewards_total} != source ${allRewards.length}`);
  // map area coverage in crossref
  for (const [id, { map, area }] of mapAreaIndex) {
    if (id.startsWith('external:')) continue;
    const r = cr.records.find((x) => x.record_id === id);
    if (!r) err(`crossref: map area ${id} (${map.id} #${area.no}) missing record`);
    else if (!r.map_id) err(`crossref: record ${id} not linked to a map`);
  }

  // -------------------------------------------------- level audit
  const la = cr.level_audit;
  if (!la) err('crossref: missing level_audit');
  else {
    if (la.inputs.part1_per_pc !== 350) err(`level_audit: part1_per_pc ${la.inputs.part1_per_pc} != 350`);
    for (const s of la.scenarios) {
      const total = s.part1_per_pc + s.part2_per_pc + s.part3_per_pc + s.part4_per_pc;
      if (Math.abs(total - s.cumulative_per_pc) > 0.2) err(`level_audit: ${s.party_size}p/${s.part3_path} sum ${total} != ${s.cumulative_per_pc}`);
      const lv = la.thresholds.filter((t) => s.cumulative_per_pc >= t.xp).length;
      if (lv !== s.level_by_xp) err(`level_audit: ${s.party_size}p/${s.part3_path} level ${s.level_by_xp} != ${lv}`);
    }
    if (!/里程碑/.test(la.finding || '')) warn('level_audit: finding lacks milestone guidance');
  }

  return { ok: errors.length === 0, errors, warnings, counts, records: records.size, crossrefRecords: cr.records.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const res = validate(load(root));
  console.log('《凡戴尔的失落矿坑》地图与规则对照校验');
  console.log(`  地图 ${res.counts.maps} 张、区域 ${res.counts.areas} 个、区域点 ${res.counts.sites} 个、连接 ${res.counts.connections} 条`);
  console.log(`  源记录 ${res.records} 条、对照记录 ${res.crossrefRecords} 条`);
  if (res.warnings.length) { console.log('警告:'); for (const w of res.warnings) console.log('  -', w); }
  if (!res.ok) { console.error('错误:'); for (const e of res.errors) console.error('  -', e); process.exit(1); }
  console.log('通过：地图几何、连接、规则、对照、XP/等级审计均一致。');
}
