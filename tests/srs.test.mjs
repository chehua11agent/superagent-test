import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVALS,
  addDays,
  buildPlan,
  dueWords,
  introduce,
  isCorrectAnswer,
  learningDay,
  markKnown,
  meaningOptions,
  nextNewWords,
  normalizeAnswer,
  review,
  toISO
} from '../game/src/srs.js';

const TODAY = '2026-11-08';

test('契约答对/答错都进入 stage 0，1 天后复习', () => {
  for (const correct of [true, false]) {
    const word = introduce(TODAY, correct);
    assert.equal(word.state, 'review');
    assert.equal(word.stage, 0);
    assert.equal(word.dueOn, addDays(TODAY, 1));
    assert.equal(word.lastResult, correct);
    assert.equal(word.known, false);
  }
});

test('1/3/7/16 天阶梯：答对升档，16 天封顶', () => {
  let word = introduce(TODAY, true);
  word = review(word, true, TODAY);
  assert.equal(word.stage, 1);
  assert.equal(word.dueOn, addDays(TODAY, 3));
  word = review(word, true, TODAY);
  assert.equal(word.stage, 2);
  assert.equal(word.dueOn, addDays(TODAY, 7));
  word = review(word, true, TODAY);
  assert.equal(word.stage, 3);
  assert.equal(word.dueOn, addDays(TODAY, 16));
  assert.equal(word.state, 'mastered');
  word = review(word, true, TODAY);
  assert.equal(word.stage, 3);
  assert.equal(word.dueOn, addDays(TODAY, 16));
  assert.deepEqual(INTERVALS, [1, 3, 7, 16]);
});

test('答错立即回到 1 天，lapses +1，状态回到 review', () => {
  let word = introduce(TODAY, true);
  word = review(word, true, TODAY);
  word = review(word, true, TODAY);
  word = review(word, true, TODAY);
  assert.equal(word.stage, 3);
  word = review(word, false, TODAY);
  assert.equal(word.stage, 0);
  assert.equal(word.state, 'review');
  assert.equal(word.dueOn, addDays(TODAY, 1));
  assert.equal(word.lapses, 1);
  assert.equal(word.correctStreak, 0);
});

test('逾期复习答对不补罚，按今天 + 下一档间隔', () => {
  const overdue = { ...introduce(TODAY, true), stage: 1, dueOn: addDays(TODAY, -5) };
  const next = review(overdue, true, TODAY);
  assert.equal(next.stage, 2);
  assert.equal(next.dueOn, addDays(TODAY, 7));
});

test('学习日以本地 04:00 为界', () => {
  assert.equal(learningDay(new Date(2026, 10, 8, 3, 59)), '2026-11-07');
  assert.equal(learningDay(new Date(2026, 10, 8, 4, 1)), '2026-11-08');
  assert.equal(learningDay(new Date(2026, 10, 8, 23, 59)), '2026-11-08');
});

test('到期队列按 due、lapses、freq_rank 排序，known 不进入', () => {
  const byId = {
    b: { id: 'b', freq_rank: 2, meanings: ['二'] },
    a: { id: 'a', freq_rank: 1, meanings: ['一'] },
    c: { id: 'c', freq_rank: 3, meanings: ['三'] },
    d: { id: 'd', freq_rank: 4, meanings: ['四'] }
  };
  const save = {
    words: {
      a: { state: 'review', stage: 0, dueOn: TODAY, lapses: 0, known: false },
      b: { state: 'review', stage: 1, dueOn: TODAY, lapses: 0, known: false },
      c: { state: 'review', stage: 0, dueOn: addDays(TODAY, -1), lapses: 2, known: false },
      d: { state: 'review', stage: 3, dueOn: TODAY, lapses: 0, known: true }
    }
  };
  const due = dueWords(save, TODAY, byId);
  assert.deepEqual(due.map((entry) => entry.id), ['c', 'a', 'b']);
});

test('复习优先：到期未清时计划仍返回新词，但 UI/闸门阻止进入剧情', () => {
  const words = Array.from({ length: 16 }, (_, index) => ({
    id: `w${index + 1}`,
    chapter: 1,
    freq_rank: index + 1,
    meanings: [`义${index + 1}`]
  }));
  const save = {
    progress: { chapter: 1 },
    settings: { newPerDay: 12 },
    words: {
      w1: { state: 'review', stage: 0, dueOn: TODAY, known: false },
      w2: { state: 'review', stage: 1, dueOn: TODAY, known: false }
    }
  };
  const byId = Object.fromEntries(words.map((word) => [word.id, word]));
  const plan = buildPlan(save, TODAY, words, byId);
  assert.equal(plan.due.length, 2);
  assert.equal(plan.reviewPending, true);
  assert.equal(plan.newWords.length, 12);
  assert.equal(plan.newWords[0].id, 'w3');
});

test('新词只取当前章 freq_rank 升序，跳过已契约', () => {
  const words = [
    { id: 'w3', chapter: 1, freq_rank: 3, meanings: ['三'] },
    { id: 'w1', chapter: 1, freq_rank: 1, meanings: ['一'] },
    { id: 'w2', chapter: 2, freq_rank: 2, meanings: ['二'] }
  ];
  const save = { progress: { chapter: 1 }, words: { w3: { state: 'review' } } };
  assert.deepEqual(nextNewWords(save, words, 12).map((word) => word.id), ['w1']);
  assert.equal(nextNewWords({ ...save, words: { w1: { state: 'review' }, w3: { state: 'review' } } }, words, 12).length, 0);
});

test('已认识不进入到期队列；撤销后回到复习', () => {
  const known = markKnown(TODAY);
  assert.equal(known.state, 'known');
  assert.equal(known.known, true);
  const save = { words: { a: known } };
  const byId = { a: { id: 'a', freq_rank: 1, meanings: ['一'] } };
  assert.equal(dueWords(save, TODAY, byId).length, 0);
});

test('4 选 1 释义选项稳定、包含正确答案', () => {
  const word = { id: 'w1', meanings: ['一'] };
  const all = [
    word,
    { id: 'w2', meanings: ['二'] },
    { id: 'w3', meanings: ['三'] },
    { id: 'w4', meanings: ['四'] },
    { id: 'w5', meanings: ['五'] }
  ];
  const first = meaningOptions(word, all, 4, 'review');
  const second = meaningOptions(word, all, 4, 'review');
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(new Set(first).size, 4);
  assert.ok(first.includes('一'));
});

test('答案归一化：大小写、首尾空格与句末标点', () => {
  assert.equal(normalizeAnswer('  Arrive. '), 'arrive');
  assert.equal(normalizeAnswer('BARGAIN!'), 'bargain');
  assert.equal(isCorrectAnswer({ lemma: 'avoid' }, ' Avoid '), true);
  assert.equal(isCorrectAnswer({ lemma: 'avoid' }, 'evade'), false);
});

test('日期计算跨月与闰年', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(toISO(new Date(2026, 0, 1, 12)), '2026-01-01');
});
