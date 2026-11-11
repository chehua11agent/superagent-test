import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
const context = {
  window: {},
  console,
  Date,
  Math,
  JSON,
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  }
};
vm.createContext(context);
for (const file of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'prototype/lexicon-lab', file), 'utf8'), context);
}
const L = context.window.LabEngine;

beforeEach(() => {
  L.resetAll();
});

test('词汇实验室：61 个示例词条，49 个 CET-4 标签', () => {
  assert.equal(L.words.length, 61);
  assert.equal(L.words.filter((word) => (word.tag || '').includes('cet4')).length, 49);
  assert.ok(L.words.every((word) => word.word && word.zh && word.band));
});

test('Zork 解析器：走完灯塔门厅到内厅，命令成功并写证据', () => {
  assert.equal(L.runCommand('look').ok, true);
  assert.equal(L.runCommand('take key').ok, true);
  const unlock = L.runCommand('unlock door with key');
  assert.equal(unlock.ok, true);
  assert.ok(unlock.events.some((event) => event.wordId === 'w_unlock' && event.skill === 'use'));
  assert.equal(L.runCommand('go north').ok, true);
  const read = L.runCommand('read logbook');
  assert.equal(read.ok, true);
  assert.ok(read.events.some((event) => event.wordId === 'w_read' && event.skill === 'use'));
  assert.ok(L.state().events.length >= 6);
});

test('Zork 解析器：未知命令不抛错，给出提示或建议', () => {
  const result = L.runCommand('key door');
  assert.equal(result.ok, false);
  assert.ok(result.message.length > 0);
  assert.ok(L.state().parser.log.length > 0);
});

test('FSRS：评分后下次间隔至少 1 天，到期队列减少', () => {
  const before = L.fsrsDue();
  assert.equal(before.length, 8);
  const result = L.fsrsReview(before[0].wordId, 3, new Date());
  assert.ok(result.interval >= 1);
  assert.ok(result.card.stability >= 0.1);
  assert.equal(L.fsrsDue().length, before.length - 1);
});

test('IRT：12 题自适应测评能给出 θ、SE、V̂、CI 和逐词概率', () => {
  L.startAssessment();
  let guard = 0;
  while (!L.state().assessment.done && guard < 20) {
    const item = L.state().assessment.currentItem;
    assert.ok(item && item.options.length === 4);
    L.answerAssessment(item.correctIndex);
    guard += 1;
  }
  const assessment = L.state().assessment;
  assert.equal(assessment.done, true);
  assert.equal(assessment.responses.length, 12);
  assert.ok(Number.isFinite(assessment.theta));
  assert.ok(assessment.se > 0);
  assert.ok(assessment.vhat >= 0 && assessment.vhat <= 61);
  assert.equal(assessment.perWord.length, 61);
  assert.ok(assessment.ci[0] <= assessment.ci[1]);
});

test('演示数据与重置：证据流、测评、复习都能重置', () => {
  L.seedDemo();
  const stats = L.stats();
  assert.equal(stats.assessed, true);
  assert.ok(stats.events > 0);
  assert.ok(stats.vhat > 0 && stats.vhat <= 61);
  L.resetAll();
  const reset = L.stats();
  assert.equal(reset.events, 0);
  assert.equal(reset.assessed, false);
  assert.equal(reset.words, 61);
});
