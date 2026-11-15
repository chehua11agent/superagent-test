import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, validate } from '../scripts/lmop-atlas-validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('真实地图/规则/对照数据通过全量校验', () => {
  const res = validate(load(root));
  assert.equal(res.ok, true, res.errors.join('\n'));
  assert.equal(res.counts.maps, 8);
  assert.equal(res.counts.areas, 89);
  assert.equal(res.records, 92);
  assert.equal(res.crossrefRecords, 93);
});

test('8 张示意 SVG 与图集文档存在且互相引用', () => {
  const maps = JSON.parse(fs.readFileSync(path.join(root, 'data/lmop/maps.json'), 'utf8'));
  const doc = fs.readFileSync(path.join(root, 'docs/content/lmop-atlas.md'), 'utf8');
  for (const m of maps.maps) {
    const svgPath = path.join(root, 'data/lmop/map-schematics', `${m.id}.svg`);
    assert.ok(fs.existsSync(svgPath), `missing ${svgPath}`);
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.match(svg, /<svg /);
    assert.ok(svg.includes(m.title), `SVG ${m.id} missing title`);
    assert.ok(doc.includes(m.title), `doc missing ${m.title}`);
    assert.ok(doc.includes(`map-schematics/${m.id}.svg`), `doc missing svg link ${m.id}`);
  }
  assert.match(doc, /规则与剧本对照/);
  assert.match(doc, /XP 与等级审计/);
});

test('负例：删除一个地图区域会被发现', () => {
  const data = load(root);
  data.maps.maps.find((m) => m.id === 'map-cragmaw-hideout').areas.pop();
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /missing area number|unreachable|connection endpoint/.test(e)));
});

test('负例：连接指向不存在的区域会被发现', () => {
  const data = load(root);
  data.maps.maps.find((m) => m.id === 'map-cragmaw-hideout').connections[0].to = 'scene-does-not-exist';
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /not an area/.test(e)));
});

test('负例：未知规则 ID 会被发现', () => {
  const data = load(root);
  data.maps.maps.find((m) => m.id === 'map-cragmaw-hideout').areas[0].rules.push('rule-not-real');
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /unknown rule/.test(e)));
});

test('负例：缺少对照记录会被发现', () => {
  const data = load(root);
  data.crossref.records = data.crossref.records.filter((r) => r.record_id !== 'scene-area-1-entrance');
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /missing source record|missing record/.test(e)));
});

test('负例：区域顶点越界会被发现', () => {
  const data = load(root);
  data.maps.maps.find((m) => m.id === 'map-cragmaw-hideout').areas[0].footprint[0] = [-5, 10];
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /outside canvas/.test(e)));
});

test('负例：等级审计累计值被篡改会被发现', () => {
  const data = load(root);
  data.crossref.level_audit.scenarios[0].cumulative_per_pc = 99999;
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /level_audit/.test(e)));
});

test('负例：重复区域 ID 会被发现', () => {
  const data = load(root);
  const m = data.maps.maps.find((x) => x.id === 'map-cragmaw-hideout');
  m.areas[1].area_id = m.areas[0].area_id;
  const res = validate(data);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => /duplicate area_id/.test(e)));
});

test('规则索引每条都被使用，且没有未解析引用', () => {
  const data = load(root);
  assert.deepEqual(data.crossref.coverage.rules_unused, []);
  assert.deepEqual(data.crossref.coverage.unresolved_checks, []);
  assert.deepEqual(data.crossref.coverage.unresolved_rewards, []);
  assert.equal(data.crossref.coverage.checks_mapped, data.crossref.coverage.checks_total);
  assert.equal(data.crossref.coverage.rewards_mapped, data.crossref.coverage.rewards_total);
});
