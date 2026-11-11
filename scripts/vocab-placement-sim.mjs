#!/usr/bin/env node
// 合成仿真：4,530 词题库上的自适应词汇量测评。
//
// 这不是真实题库的标定结果。它只回答「在理想 3PL 下，题量与误差的量级关系」。
// 模型与 PR #17 的 prototype/adaptive-vocab/sim.js 对齐：
//   b_i = Φ⁻¹((rank_i - 0.5) / N) * 1.0 + 0.3
//   a = 1.7, c = 0.2
//   θ ~ N(0, 1)，截断到 [-2.5, 2.5]
//   作答服从 3PL；EAP 网格 [-4, 4]，步长 0.05，先验 N(0, 1.2²)
//
// 用法：
//   node scripts/vocab-placement-sim.mjs
//   node scripts/vocab-placement-sim.mjs --items=25 --learners=100 --seeds=10
//   node scripts/vocab-placement-sim.mjs --mode=target --items=20
//
// 模式：
//   info    最大信息量（定位；默认）
//   target  目标答对率 0.40（扫生词）
//   random  随机抽题（基线）
//   hybrid5 前 5 题最大信息量，其余目标答对率 0.40（PR #17 的折中）

const N = 4530;
const A = 1.7;
const C = 0.2;
const GRID_STEP = 0.05;
const GRID_MIN = -4;
const GRID_MAX = 4;
const PRIOR_SD = 1.2;
const PROBE_TARGET = 0.4;
const HYBRID_INFO_COUNT = 5;

const B = new Float64Array(N);
for (let rank = 1; rank <= N; rank += 1) {
  B[rank - 1] = 0.3 + 1.0 * inverseNormal((rank - 0.5) / N);
}

const GRID = [];
for (let x = GRID_MIN; x <= GRID_MAX + 1e-9; x += GRID_STEP) GRID.push(x);
const PRIOR = (() => {
  const raw = GRID.map((x) => Math.exp(-0.5 * (x / PRIOR_SD) ** 2));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / sum);
})();

// 每个网格点的词汇量，最后一次 CI 用。
const V_AT_GRID = GRID.map((theta) => {
  let sum = 0;
  for (let i = 0; i < N; i += 1) sum += knowledgeProbability(theta, B[i]);
  return sum;
});

function probability(theta, b) {
  return C + (1 - C) / (1 + Math.exp(-A * (theta - b)));
}

// 3PL 的「答对」含猜对；词汇量要估的是「知道」而不是「答对」。
function knowledgeProbability(theta, b) {
  return 1 / (1 + Math.exp(-A * (theta - b)));
}

function information(theta, b) {
  const p = probability(theta, b);
  return (A * A * (1 - p) * ((p - C) / (1 - C)) ** 2) / p;
}

// Acklam 的 inverse normal CDF；够用且无依赖。
function inverseNormal(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const pLow = 0.02425;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
      / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
    / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalDraw(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function posteriorMeanSd(posterior) {
  let mean = 0;
  for (let i = 0; i < GRID.length; i += 1) mean += GRID[i] * posterior[i];
  let variance = 0;
  for (let i = 0; i < GRID.length; i += 1) variance += posterior[i] * (GRID[i] - mean) ** 2;
  return { mean, sd: Math.sqrt(variance) };
}

function credibleInterval(posterior) {
  const pairs = V_AT_GRID.map((value, index) => [value, posterior[index]])
    .sort((left, right) => left[0] - right[0]);
  let cumulative = 0;
  let low = pairs[pairs.length - 1][0];
  let high = low;
  for (const [value, weight] of pairs) {
    cumulative += weight;
    if (cumulative >= 0.05) {
      low = value;
      break;
    }
  }
  cumulative = 0;
  for (const [value, weight] of pairs) {
    cumulative += weight;
    if (cumulative >= 0.95) {
      high = value;
      break;
    }
  }
  return [low, high];
}

function pickItem({ mode, itemIndex, thetaHat, seen, selectionRng }) {
  let bestIndex = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < N; i += 1) {
    if (seen[i]) continue;
    let score;
    if (mode === 'info') score = information(thetaHat, B[i]);
    else if (mode === 'target') score = -Math.abs(probability(thetaHat, B[i]) - PROBE_TARGET);
    else if (mode === 'hybrid5') {
      score = itemIndex < HYBRID_INFO_COUNT
        ? information(thetaHat, B[i])
        : -Math.abs(probability(thetaHat, B[i]) - PROBE_TARGET);
    } else score = selectionRng();
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function runOne({ mode, items, learners, seed }) {
  const rng = mulberry32(seed);
  let mae = 0;
  let seSum = 0;
  let coverage = 0;
  let hitRate = 0;

  for (let learner = 0; learner < learners; learner += 1) {
    const theta = Math.max(-2.5, Math.min(2.5, normalDraw(rng)));
    const posterior = PRIOR.slice();
    const seen = new Uint8Array(N);
    // 选题用独立随机流，保证各策略共享同一组学习者/作答随机数（common random numbers）。
    const selectionRng = mulberry32(seed * 100000 + learner + 1);
    let hits = 0;

    for (let k = 0; k < items; k += 1) {
      const { mean: thetaHat } = posteriorMeanSd(posterior);
      const item = pickItem({ mode, itemIndex: k, thetaHat, seen, selectionRng });
      seen[item] = 1;
      if (B[item] > theta) hits += 1;
      const correct = rng() < probability(theta, B[item]) ? 1 : 0;
      let total = 0;
      for (let g = 0; g < GRID.length; g += 1) {
        const likelihood = correct ? probability(GRID[g], B[item]) : 1 - probability(GRID[g], B[item]);
        posterior[g] *= likelihood;
        total += posterior[g];
      }
      for (let g = 0; g < GRID.length; g += 1) posterior[g] /= total;
    }

    const { mean: thetaHat, sd } = posteriorMeanSd(posterior);
    seSum += sd;
    hitRate += hits / items;

    let vHat = 0;
    let vTrue = 0;
    for (let i = 0; i < N; i += 1) {
      vHat += knowledgeProbability(thetaHat, B[i]);
      vTrue += knowledgeProbability(theta, B[i]);
    }
    mae += Math.abs(vHat - vTrue);
    const [low, high] = credibleInterval(posterior);
    if (low <= vTrue && vTrue <= high) coverage += 1;
  }

  return {
    mae: mae / learners,
    se: seSum / learners,
    coverage: coverage / learners,
    hit: hitRate / learners
  };
}


function runAverage({ mode, items, learners, seeds }) {
  const totals = { mae: 0, se: 0, coverage: 0, hit: 0 };
  for (let seed = 1; seed <= seeds; seed += 1) {
    const result = runOne({ mode, items, learners, seed });
    totals.mae += result.mae;
    totals.se += result.se;
    totals.coverage += result.coverage;
    totals.hit += result.hit;
  }
  return {
    mae: totals.mae / seeds,
    se: totals.se / seeds,
    coverage: totals.coverage / seeds,
    hit: totals.hit / seeds
  };
}

function markdownRows(rows) {
  const header = '| 题量 | SE(θ) | V̂ MAE（词） | 90% CI 覆盖率 | 抽到生词比例 |\n| ---: | ---: | ---: | ---: | ---: |';
  const body = rows.map((row) => `| ${row.items} | ${row.se.toFixed(2)} | ${row.mae.toFixed(1)} | ${(row.coverage * 100).toFixed(0)}% | ${(row.hit * 100).toFixed(0)}% |`).join('\n');
  return `${header}\n${body}`;
}

function parseArgs(argv) {
  const args = { items: null, learners: 80, seeds: 5, mode: 'info' };
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    if (key === '--items') args.items = Number(value);
    else if (key === '--learners') args.learners = Number(value);
    else if (key === '--seeds') args.seeds = Number(value);
    else if (key === '--mode') args.mode = value;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.items) {
    const result = runAverage({ mode: args.mode, items: args.items, learners: args.learners, seeds: args.seeds });
    console.log(markdownRows([{ items: args.items, ...result }]));
    return;
  }

  const rows = [];
  for (const items of [10, 15, 20, 25, 30, 40, 60]) {
    const result = runAverage({ mode: 'info', items, learners: args.learners, seeds: args.seeds });
    rows.push({ items, ...result });
  }
  console.log('## 题量 vs 误差（最大信息量）\n');
  console.log(markdownRows(rows));

  console.log('\n## 20 题策略对比\n');
  const strategyRows = [];
  for (const [mode, label] of [['info', '最大信息量'], ['target', '目标答对率 0.4'], ['random', '随机抽题'], ['hybrid5', '前 5 题信息 + 其余 0.4']]) {
    const result = runAverage({ mode, items: 20, learners: args.learners, seeds: args.seeds });
    strategyRows.push({ mode, label, ...result });
  }
  console.log('| 策略 | V̂ MAE（词） | 生词命中率 | SE(θ) |\n| --- | ---: | ---: | ---: |');
  for (const row of strategyRows) {
    console.log(`| ${row.label} | ${row.mae.toFixed(1)} | ${(row.hit * 100).toFixed(0)}% | ${row.se.toFixed(3)} |`);
  }
}

main();
