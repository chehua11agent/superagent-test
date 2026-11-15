import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLmopLibrary, validateLmopLibrary } from '../scripts/lmop-validate.mjs';

const library = await loadLmopLibrary();

test('四个分卷合并后的数据集通过全量校验', () => {
  const result = validateLmopLibrary(library);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(result.stats.totals.parts, 4);
  assert.equal(result.stats.totals.records, 463);
  assert.equal(result.stats.totals.scenes, 65);
  assert.equal(result.stats.totals.npcs, 70);
  assert.equal(result.stats.totals.monsters, 53);
  assert.equal(result.stats.totals.checks, 95);
  assert.equal(result.stats.totals.rewards, 103);
});

test('manifest 记录每个分卷的页码口径与文件指纹', () => {
  const { manifest, parts } = library;
  assert.equal(manifest.schema_version, 'lmop-v1');
  assert.equal(manifest.parts.length, 4);
  assert.deepEqual(
    manifest.parts.map((part) => part.order),
    [1, 2, 3, 4]
  );
  for (const part of manifest.parts) {
    assert.ok(part.page_basis.length > 0, `分卷 ${part.order} 缺少页码口径`);
    assert.ok(part.page_bounds?.printed || part.page_bounds?.pdf, `分卷 ${part.order} 缺少页码区间`);
    const entry = parts.get(part.id);
    assert.ok(entry, `分卷 ${part.order} 缺少文件`);
    assert.match(part.sha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(
    manifest.parts.reduce((sum, part) => sum + part.records, 0),
    manifest.counts.records
  );
});

test('跨分卷重复实体已登记且能在对应分卷找到', () => {
  const { manifest } = library;
  const byId = new Map(manifest.cross_part_entities.map((entity) => [entity.id, entity]));
  assert.equal(byId.size, 31);
  assert.deepEqual(byId.get('monster-goblin').parts, [1, 3, 4]);
  assert.deepEqual(byId.get('npc-sildar-hallwinter').parts, [1, 2, 3]);
  for (const entity of byId.values()) {
    assert.equal(entity.segment_ids.length, entity.parts.length, entity.id);
  }
});

test('校验器能发现计数、引用与页码错误', () => {
  const manifest = structuredClone(library.manifest);
  const parts = new Map();
  for (const [id, entry] of library.parts) {
    parts.set(id, { raw: entry.raw, data: structuredClone(entry.data) });
  }

  const first = parts.get('lmop:part:1').data;
  first.scenes[0].pages = [999];
  first.scenes[0].chapterId = 'chapter-does-not-exist';
  manifest.parts[0].counts.scenes -= 1;
  manifest.counts.scenes += 1;

  const result = validateLmopLibrary({ manifest, parts });
  assert.ok(result.errors.some((error) => /页码/.test(error)), '应报告页码越界');
  assert.ok(result.errors.some((error) => /引用不存在/.test(error)), '应报告交叉引用缺失');
  assert.ok(result.errors.some((error) => /scenes 数量/.test(error)), '应报告计数不一致');
  assert.ok(result.errors.some((error) => /manifest\.counts\.scenes/.test(error)), '应报告合计不一致');
});

test('数据文件只保留摘要，不包含成段正文', () => {
  const longTexts = [];
  for (const [id, entry] of library.parts) {
    const walk = (value, path) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
      } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (key === 'text' && typeof child === 'string' && child.length > 500) {
            longTexts.push(`${id} ${path}.text (${child.length} 字)`);
          }
          walk(child, `${path}.${key}`);
        }
      }
    };
    walk(entry.data, id);
  }
  assert.deepEqual(longTexts, [], `发现疑似成段正文：${longTexts.join('; ')}`);
});
