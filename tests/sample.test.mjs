import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSample } from '../scripts/validate-sample.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sample = JSON.parse(
  await readFile(resolve(root, 'game/content/samples/closing-notice.json'), 'utf8')
);

test('小样本结构：10 词 / 3 幕 / 5 节点，全部校验通过', () => {
  const result = validateSample(sample);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(result.stats.words, 10);
  assert.equal(result.stats.acts, 3);
  assert.equal(result.stats.nodes, 5);
  assert.equal(result.stats.functionalWordSlots, 12);
});

test('10 个词都落在选项 / 判定 / 物品位，而不是只写进句子', () => {
  const expected = ['decline', 'refuse', 'ignore', 'resist', 'deny', 'object', 'reject', 'forbid', 'prohibit', 'oppose'];
  assert.deepEqual(sample.words.map((word) => word.en).sort(), [...expected].sort());
  const result = validateSample(sample);
  for (const row of result.table) {
    assert.ok(['option', 'check', 'item'].includes(row.kind), `${row.word} 缺少功能位置`);
    assert.ok(row.node && row.slot, `${row.word} 的位置不完整`);
  }
});

test('语义对照：decline/refuse 同节点，forbid 是物品，prohibit 是判定', () => {
  const byEn = Object.fromEntries(sample.words.map((word) => [word.en, word]));
  assert.equal(byEn.decline.primary_placement.node_id, byEn.refuse.primary_placement.node_id);
  assert.equal(byEn.forbid.primary_placement.kind, 'item');
  assert.equal(byEn.prohibit.primary_placement.kind, 'check');
  assert.equal(byEn.reject.primary_placement.kind, 'item');

  const n2 = sample.nodes.find((node) => node.id === 'n2');
  const n2Words = (n2.options || []).map((option) => option.word_id).filter(Boolean);
  assert.ok(n2Words.includes('w_decline'));
  assert.ok(n2Words.includes('w_refuse'));

  const notice = sample.nodes.flatMap((node) => node.items || []).find((item) => item.id === 'item_notice');
  assert.equal(notice.word_id, 'w_forbid');
  assert.equal(notice.id, 'item_notice');
  assert.equal(byEn.forbid.primary_placement.use_check, 'c_forbid');
});

test('物品要能被使用：注销章与闭馆通知都接到一次判定', () => {
  const items = sample.nodes.flatMap((node) => node.items || []);
  const stamp = items.find((item) => item.id === 'item_stamp');
  const notice = items.find((item) => item.id === 'item_notice');
  assert.ok(stamp && notice);
  const checks = sample.nodes.flatMap((node) => node.checks || []);
  assert.ok(checks.some((check) => check.id === 'c_reject' && check.word_id === 'w_reject'));
  assert.ok(checks.some((check) => check.id === 'c_forbid' && check.word_id === 'w_forbid'));
  assert.ok(checks.some((check) => check.id === 'c_prohibit' && check.word_id === 'w_prohibit'));
  const cForbid = checks.find((check) => check.id === 'c_forbid');
  assert.equal(cForbid.next_check, 'c_prohibit');
});

test('每个节点都有出口，所有 next 都指向存在的节点或结局', () => {
  const nodeIds = new Set(sample.nodes.map((node) => node.id));
  const endingIds = new Set(sample.endings.map((ending) => ending.id));
  const ok = (target) => nodeIds.has(target) || endingIds.has(target);
  for (const node of sample.nodes) {
    for (const option of node.options || []) {
      if (option.next) assert.ok(ok(option.next), `${node.id}/${option.id} next 非法`);
      if (option.end) assert.ok(endingIds.has(option.end), `${node.id}/${option.id} end 非法`);
    }
    for (const check of node.checks || []) {
      for (const key of ['next_success', 'next_failure']) {
        if (check[key]) assert.ok(ok(check[key]), `${node.id}/${check.id} ${key} 非法`);
      }
    }
  }
});
