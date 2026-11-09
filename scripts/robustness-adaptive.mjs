// 多种子 / 压力测试：生成调研文档里的置信区间与 FSRS 条件收益。
// 运行：node scripts/robustness-adaptive.mjs
import { runScreening, runScheduling } from '../prototype/adaptive-vocab/sim.js';

function stat(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
  return { mean, sd, ci: 1.96 * sd / Math.sqrt(n) };
}

function fmt(x, digits = 2) {
  return Number(x).toFixed(digits);
}

const SCREEN_SEEDS = 20;
const screenRows = [];
for (let seed = 1; seed <= SCREEN_SEEDS; seed += 1) {
  const r = runScreening({ learners: 100, words: 120, items: 16, seed, methods: ['current', 'hybrid'] });
  const get = (key, item) => r.result.find((x) => x.key === key).points[item - 1];
  screenRows.push({
    c5: get('current', 5).mae,
    h5: get('hybrid', 5).mae,
    c12: get('current', 12).mae,
    h12: get('hybrid', 12).mae,
    cp: get('current', 12).precision,
    hp: get('hybrid', 12).precision
  });
}

console.log(`## 筛选（${SCREEN_SEEDS} seeds, 100 learners / 120 words / 16 items）`);
for (const [key, label] of [
  ['c5', '现状 5 题 MAE'], ['h5', '混合 5 题 MAE'],
  ['c12', '现状 12 题 MAE'], ['h12', '混合 12 题 MAE'],
  ['cp', '现状 12 题生词命中'], ['hp', '混合 12 题生词命中']
]) {
  const s = stat(screenRows.map((r) => r[key]));
  console.log(`| ${label} | ${fmt(s.mean, 2)} ± ${fmt(s.ci, 2)} |`);
}
const d5 = stat(screenRows.map((r) => r.c5 - r.h5));
const d12 = stat(screenRows.map((r) => r.c12 - r.h12));
console.log(`| 5 题差值（现状−混合） | ${fmt(d5.mean, 2)} ± ${fmt(d5.ci, 2)} 词 |`);
console.log(`| 12 题差值（现状−混合） | ${fmt(d12.mean, 2)} ± ${fmt(d12.ci, 2)} 词 |`);

const SCHED_SEEDS = 10;
console.log('');
console.log(`## 复习（${SCHED_SEEDS} seeds, 40 learners / 160 words / 90 days）`);
for (const trueModel of ['fsrs', 'exponential', 'power07']) {
  const rows = [];
  for (let seed = 1; seed <= SCHED_SEEDS; seed += 1) {
    const r = runScheduling({
      learners: 40, words: 160, days: 90, budget: 8, seed,
      shockRate: 0.0005, auditShare: 0.1, trueModel, methods: ['fixed', 'fsrs']
    });
    const get = (key) => r.result.find((x) => x.key === key);
    rows.push({ fixed: get('fixed'), fsrs: get('fsrs') });
  }
  for (const key of ['fixed', 'fsrs']) {
    const retention = stat(rows.map((r) => r[key].retention));
    const reviews = stat(rows.map((r) => r[key].reviewsPerWord));
    const waste = stat(rows.map((r) => r[key].waste));
    const silent = stat(rows.map((r) => r[key].silent));
    console.log(
      `| ${trueModel} / ${key} | 保持率 ${fmt(retention.mean * 100, 1)}% ± ${fmt(retention.ci * 100, 1)} | ` +
      `复习 ${fmt(reviews.mean, 2)} ± ${fmt(reviews.ci, 2)} | ` +
      `无效 ${fmt(waste.mean * 100, 1)}% | 静默 ${fmt(silent.mean * 100, 1)}% |`
    );
  }
}
