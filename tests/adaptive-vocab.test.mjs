import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  estimateVocabulary,
  fsrsUpdate,
  intervalFor,
  makeBelief,
  makeWordBank,
  normalQuantile,
  pCorrect,
  pickScreeningItem,
  retrievability,
  runScheduling,
  runScreening,
  simulateLearnerTrack,
  traceScreening
} from '../prototype/adaptive-vocab/sim.js';

test('词库难度随词频排序、价值随词频下降', () => {
  const words = makeWordBank(48);
  assert.equal(words.length, 48);
  for (let i = 1; i < words.length; i += 1) {
    assert.ok(words[i].b > words[i - 1].b, '难度应随 rank 上升');
    assert.ok(words[i].value < words[i - 1].value, '价值应随 rank 下降');
  }
});

test('正态分位数对称、单调', () => {
  assert.ok(Math.abs(normalQuantile(0.5)) < 1e-6);
  assert.ok(Math.abs(normalQuantile(0.1) + normalQuantile(0.9)) < 1e-6);
  assert.ok(normalQuantile(0.3) < normalQuantile(0.7));
});

test('FSRS 遗忘曲线与间隔公式', () => {
  const s = 10;
  assert.ok(Math.abs(retrievability(0, s) - 1) < 1e-12);
  assert.ok(Math.abs(retrievability(s, s) - 0.9) < 1e-9);
  assert.ok(Math.abs(intervalFor(s, 0.9) - s) < 1e-6);
  assert.ok(intervalFor(s, 0.8) > intervalFor(s, 0.9), '目标保持率低时间隔更长');
  assert.ok(retrievability(20, s) < retrievability(10, s));
});

test('FSRS 更新：答对变稳、答错变脆，D 在 1–10', () => {
  const base = { s: 5, d: 5 };
  const good = fsrsUpdate(base, true, 5);
  const again = fsrsUpdate(base, false, 5);
  assert.ok(good.s > base.s, '答对后稳定性应增加');
  assert.ok(again.s < base.s, '答错后稳定性应降低');
  assert.ok(good.d >= 1 && good.d <= 10);
  assert.ok(again.d >= 1 && again.d <= 10);
});

test('EAP：答对提高能力估计，答错降低能力估计', () => {
  const up = makeBelief();
  up.update(0, true);
  assert.ok(up.mean() > 0);
  const down = makeBelief();
  down.update(0, false);
  assert.ok(down.mean() < 0);
});

test('混合选题：前 5 题最大信息，之后贴边界；同种子可复现', () => {
  const words = makeWordBank(48);
  const unseen = words.map((w) => w.id);
  const a = pickScreeningItem({
    key: 'hybrid', step: 0, words, unseen, theta: 0, rng: () => 0.5, initialFixed: []
  });
  const b = pickScreeningItem({
    key: 'hybrid', step: 0, words, unseen, theta: 0, rng: () => 0.5, initialFixed: []
  });
  assert.equal(a, b);
  const p = pCorrect(0, words[a].b);
  assert.ok(p > 0.55 && p < 0.75, '第一题应落在信息量最大的区间附近');
  const late = pickScreeningItem({
    key: 'hybrid', step: 5, words, unseen, theta: 0, rng: () => 0.5, initialFixed: []
  });
  const pLate = pCorrect(0, words[late].b);
  assert.ok(Math.abs(pLate - 0.4) < 0.25, '第 6 题应贴近 0.4 目标答对率');
});

test('单个学习者轨迹：行数、概率、估计范围', () => {
  const t = traceScreening({ theta: 0.2, words: 48, items: 12, seed: 7 });
  assert.equal(t.rows.length, 12);
  assert.equal(t.discovered, t.rows.filter((r) => r.isUnknown).length);
  assert.ok(t.finalEstimate >= 0 && t.finalEstimate <= 48);
  for (const row of t.rows) {
    assert.ok(row.pPred > 0 && row.pPred < 1);
    assert.ok(Number.isFinite(row.thetaAfter));
  }
});

test('词汇量估计：极低/极高能力收敛到 0 / N', () => {
  const words = makeWordBank(48);
  assert.ok(estimateVocabulary(-6, words) < 0.1);
  assert.ok(estimateVocabulary(6, words) > 47.9);
});

test('筛选实验：混合策略优于现状，结果可复现', () => {
  const args = { learners: 100, words: 120, items: 16, seed: 7, methods: ['current', 'hybrid'] };
  const r1 = runScreening(args);
  const r2 = runScreening(args);
  assert.deepEqual(r1, r2);
  const by = Object.fromEntries(r1.result.map((x) => [x.key, x]));
  const current = by.current.points[11];
  const hybrid = by.hybrid.points[11];
  assert.ok(hybrid.mae < current.mae, '混合策略 12 题误差应更低');
  assert.ok(hybrid.precision > current.precision, '混合策略生词命中率应更高');
  for (const series of r1.result) {
    for (const p of series.points) {
      assert.ok(p.mae >= 0);
      assert.ok(p.precision >= 0 && p.precision <= 1);
      assert.ok(p.recall >= 0 && p.recall <= 1);
    }
  }
});

test('复习实验：FSRS 比固定阶梯省复习、无效复习更少', () => {
  const args = {
    learners: 24, words: 80, days: 60, budget: 6, seed: 11,
    shockRate: 0.0005, auditShare: 0.1, methods: ['fixed', 'fsrs']
  };
  const r = runScheduling(args);
  const by = Object.fromEntries(r.result.map((x) => [x.key, x]));
  assert.ok(by.fsrs.reviewsPerWord < by.fixed.reviewsPerWord);
  assert.ok(by.fsrs.waste < by.fixed.waste);
  for (const x of r.result) {
    assert.ok(x.retention > 0 && x.retention <= 1);
    assert.ok(x.reviewsPerWord > 0);
    assert.ok(x.waste >= 0 && x.waste <= 1);
    assert.ok(x.detection >= 0 && x.detection <= 1);
  }
});

test('强制巡检比例越高，保持率不升、无效复习上升', () => {
  const base = {
    learners: 24, words: 80, days: 60, budget: 6, seed: 11,
    shockRate: 0.0005, methods: ['three']
  };
  const zero = runScheduling({ ...base, auditShare: 0 }).result[0];
  const high = runScheduling({ ...base, auditShare: 0.3 }).result[0];
  assert.ok(zero.retention >= high.retention - 1e-9);
  assert.ok(zero.waste <= high.waste + 1e-9);
});

test('逐日轨迹：长度、保持率、复习数', () => {
  const track = simulateLearnerTrack({ theta: 0, words: 60, days: 20, budget: 6, seed: 3 });
  assert.equal(track.length, 20);
  for (const day of track) {
    assert.ok(day.retention >= 0 && day.retention <= 1);
    assert.ok(day.reviews >= 0 && day.reviews <= 6);
    assert.ok(day.correct >= 0 && day.correct <= day.reviews);
  }
});

test('clamp 边界', () => {
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(clamp(0.5, 0, 1), 0.5);
});
