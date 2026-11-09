// 自适应生词筛选 / 复习调度：可复现的仿真内核。
// 浏览器与 Node 共用；不依赖任何第三方库。

export const FSRS_W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755
];

export const FSRS_FACTOR = 19 / 81;
export const FSRS_DECAY = -0.5;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

// Acklam 正态分位数近似，误差 < 1.2e-9。
export function normalQuantile(p) {
  const q = clamp(p, 1e-9, 1 - 1e-9);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const plow = 0.02425;
  let x;
  if (q < plow) {
    const r = Math.sqrt(-2 * Math.log(q));
    x = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  } else if (q <= 1 - plow) {
    const r = q - 0.5;
    const s = r * r;
    x = (((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r /
      (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
  } else {
    const r = Math.sqrt(-2 * Math.log(1 - q));
    x = -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) /
      ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }
  return x;
}

/** FSRS-4.5 的遗忘曲线：稳定性 S 是 R=0.9 的天数。 */
export function retrievability(elapsedDays, stability) {
  if (!(stability > 0)) return 0;
  return Math.pow(1 + FSRS_FACTOR * (elapsedDays / stability), FSRS_DECAY);
}

/** 达到目标保持率 r 所需的间隔天数。 */
export function intervalFor(stability, target = 0.9) {
  return (stability / FSRS_FACTOR) * (Math.pow(target, 1 / FSRS_DECAY) - 1);
}

/** 记忆状态只保留 S / D；elapsed 为距上次复习天数。 */
export function fsrsUpdate(state, correct, elapsed) {
  const s = Math.max(0.05, state.s);
  const d = clamp(state.d ?? 5, 1, 10);
  const r = retrievability(elapsed, s);
  const grade = correct ? 3 : 1;
  if (correct) {
    const inc = Math.exp(FSRS_W[8]) * (11 - d) * Math.pow(s, -FSRS_W[9]) *
      (Math.exp(FSRS_W[10] * (1 - r)) - 1) + 1;
    const nextS = s * Math.max(1, inc);
    const nextD = updateDifficulty(d, grade);
    return { s: clamp(nextS, 0.05, 36500), d: nextD };
  }
  const nextS = FSRS_W[11] * Math.pow(d, -FSRS_W[12]) *
    (Math.pow(s + 1, FSRS_W[13]) - 1) * Math.exp(FSRS_W[14] * (1 - r));
  const nextD = updateDifficulty(d, grade);
  return { s: clamp(nextS, 0.05, 36500), d: nextD };
}

function updateDifficulty(d, grade) {
  const d0 = FSRS_W[4];
  const next = d - FSRS_W[6] * (grade - 3);
  return clamp(FSRS_W[7] * d0 + (1 - FSRS_W[7]) * next, 1, 10);
}

/** r 的文档式名字，方便 UI 与报告引用。 */
export function recallProbability(elapsedDays, stability) {
  return retrievability(elapsedDays, stability);
}

// ---------------------------------------------------------------------------
// 词库与学习者
// ---------------------------------------------------------------------------

/** 词难度 b：越靠后的词越难；rank 1 是最常见词。 */
export function makeWordBank(size = 240) {
  const words = [];
  for (let i = 0; i < size; i += 1) {
    const rank = i + 1;
    const z = normalQuantile((rank - 0.5) / size);
    const b = 1.15 * z + 0.55;
    const value = 0.55 + 0.9 * (1 - rank / size);
    words.push({ id: i, rank, b, value });
  }
  return words;
}

export function makeLearner(theta, words) {
  const known = words.map((w) => w.b < theta);
  const trueVocabulary = known.filter(Boolean).length;
  return { theta, known, trueVocabulary };
}

export function pCorrect(theta, b) {
  return 0.2 + 0.8 * sigmoid(1.7 * (theta - b));
}

export function pMastery(theta, b) {
  return sigmoid(1.7 * (theta - b));
}

// ---------------------------------------------------------------------------
// 词汇量探针：EAP 能力估计 + 选题策略
// ---------------------------------------------------------------------------

export function makeThetaGrid(lo = -3, hi = 3, step = 0.1) {
  const grid = [];
  for (let x = lo; x <= hi + 1e-9; x += step) grid.push(Number(x.toFixed(4)));
  return grid;
}

export const THETA_GRID = makeThetaGrid();
const THETA_PRIOR_SD = 1.2;
const THETA_PRIOR = THETA_GRID.map((t) => Math.exp(-(t * t) / (2 * THETA_PRIOR_SD * THETA_PRIOR_SD)));
const PRIOR_SUM = THETA_PRIOR.reduce((a, b) => a + b, 0);

export function makeBelief() {
  const post = THETA_PRIOR.slice();
  let sum = PRIOR_SUM;
  return {
    post,
    mean() {
      let m = 0;
      for (let i = 0; i < THETA_GRID.length; i += 1) m += THETA_GRID[i] * post[i] / sum;
      return m;
    },
    sd() {
      const m = this.mean();
      let v = 0;
      for (let i = 0; i < THETA_GRID.length; i += 1) v += (THETA_GRID[i] - m) ** 2 * post[i] / sum;
      return Math.sqrt(v);
    },
    update(b, correct) {
      for (let i = 0; i < THETA_GRID.length; i += 1) {
        const p = pCorrect(THETA_GRID[i], b);
        post[i] *= correct ? p : 1 - p;
      }
      sum = post.reduce((a, b2) => a + b2, 0) || 1e-12;
    }
  };
}

/** 3PL Fisher 信息量；c=0.2，a=1.7。 */
export function fisherInfo(theta, b) {
  const p = pCorrect(theta, b);
  const c = 0.2;
  const q = (p - c) / (1 - c);
  return 1.7 * 1.7 * ((1 - p) / p) * q * q;
}

/** 估计词汇量：边界附近按概率求和，避免整数跳变。 */
export function estimateVocabulary(theta, words) {
  let v = 0;
  for (const w of words) v += pMastery(theta, w.b);
  return v;
}

export function vocabularyMAE(estimate, truth) {
  return Math.abs(estimate - truth);
}

export function screeningMethods() {
  return [
    { key: 'current', label: '现状：固定 3 词 + 随机' },
    { key: 'random', label: '均匀随机' },
    { key: 'easiest', label: '从最熟词开始' },
    { key: 'info50', label: '最大信息（目标 50%）' },
    { key: 'frontier40', label: '边界搜索（目标 40%）' },
    { key: 'frontier30', label: '猎生词（目标 30%）' },
    { key: 'hybrid', label: '混合：先估能力，再猎生词' },
    { key: 'soft', label: '单分数：信息 × 生词倾向' },
    { key: 'soft1', label: '单分数（更偏生词）' }
  ];
}

function pickByTarget(words, candidates, theta, target) {
  let best = null;
  let bestGap = Infinity;
  for (const i of candidates) {
    const gap = Math.abs(pCorrect(theta, words[i].b) - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

function pickMaxInfo(words, candidates, theta) {
  let best = null;
  let bestInfo = -1;
  for (const i of candidates) {
    const info = fisherInfo(theta, words[i].b);
    if (info > bestInfo) {
      bestInfo = info;
      best = i;
    }
  }
  return best;
}

function pickSoft(words, candidates, theta, lambda) {
  let best = null;
  let bestScore = -1;
  for (const i of candidates) {
    const p = pCorrect(theta, words[i].b);
    const score = fisherInfo(theta, words[i].b) * (1 + lambda * (1 - p));
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function pickScreeningItem({ key, step, words, unseen, theta, rng, initialFixed }) {
  if (key === 'current' && step < initialFixed.length) return initialFixed[step];
  if (key === 'random' || key === 'current') {
    return unseen[Math.floor(rng() * unseen.length)];
  }
  if (key === 'easiest') {
    return unseen.reduce((a, i) => (words[i].b < words[a].b ? i : a), unseen[0]);
  }
  if (key === 'info50') return pickMaxInfo(words, unseen, theta);
  if (key === 'frontier40') return pickByTarget(words, unseen, theta, 0.4);
  if (key === 'frontier30') return pickByTarget(words, unseen, theta, 0.3);
  if (key === 'hybrid') {
    return step < 5 ? pickMaxInfo(words, unseen, theta) : pickByTarget(words, unseen, theta, 0.4);
  }
  if (key === 'soft') return pickSoft(words, unseen, theta, 0.6);
  if (key === 'soft1') return pickSoft(words, unseen, theta, 1.2);
  return unseen[Math.floor(rng() * unseen.length)];
}

/**
 * 一次探针实验：每个学习者按同一策略抽 items 个词。
 * 返回每个 item 之后的平均绝对误差、生词命中率、生词召回率。
 */
export function runScreening({
  learners = 160,
  words: wordCount = 240,
  items = 24,
  seed = 7,
  methods = screeningMethods().map((m) => m.key)
} = {}) {
  const baseRng = mulberry32(seed);
  const words = makeWordBank(wordCount);
  const thetas = [];
  for (let l = 0; l < learners; l += 1) {
    const u1 = Math.max(1e-9, baseRng());
    const u2 = baseRng();
    thetas.push(clamp(1.15 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2), -1.6, 1.6));
  }
  const learnersData = thetas.map((theta) => makeLearner(theta, words));

  const byKey = new Map(screeningMethods().map((m) => [m.key, m]));
  const result = [];

  for (const key of methods) {
    const method = byKey.get(key);
    if (!method) continue;
    const methodSeed = seed + key.length * 7919 + key.charCodeAt(0) * 131 + (key.charCodeAt(1) || 0);
    const curves = Array.from({ length: items }, () => ({ mae: 0, precision: 0, recall: 0, unknown: 0 }));
    for (let li = 0; li < learnersData.length; li += 1) {
      const learner = learnersData[li];
      // 选题随机数按方法分开；作答随机数按学习者/题号共用（common random numbers），
      // 这样两个方法抽到同一个词时，对错也相同，比较的是选题策略而不是运气。
      const rng = mulberry32(methodSeed + li * 104729);
      const responseRng = mulberry32(seed + li * 7919);
      const belief = makeBelief();
      const seen = new Set();
      const initialFixed = new Set();
      if (key === 'current') {
        [0.12, 0.5, 0.88].forEach((q) => initialFixed.add(Math.floor(q * wordCount)));
      }
      let discoveredUnknown = 0;
      const totalUnknown = wordCount - learner.trueVocabulary;
      for (let step = 0; step < items; step += 1) {
        let pick = -1;
        const unseen = [];
        for (let i = 0; i < wordCount; i += 1) if (!seen.has(i)) unseen.push(i);
        pick = pickScreeningItem({
          key, step, words, unseen, theta: belief.mean(), rng,
          initialFixed: [...initialFixed]
        });
        if (pick < 0) break;
        seen.add(pick);
        const isUnknown = !learner.known[pick];
        const correct = responseRng() < pCorrect(learner.theta, words[pick].b);
        belief.update(words[pick].b, correct);
        if (isUnknown) discoveredUnknown += 1;
        const thetaHat = belief.mean();
        const vHat = estimateVocabulary(thetaHat, words);
        curves[step].mae += vocabularyMAE(vHat, learner.trueVocabulary);
        curves[step].precision += isUnknown ? 1 : 0;
        curves[step].recall += totalUnknown > 0 ? discoveredUnknown / totalUnknown : 0;
        curves[step].unknown += isUnknown ? 1 : 0;
      }
    }
    result.push({
      key,
      label: method.label,
      points: curves.map((p, i) => ({
        item: i + 1,
        mae: p.mae / learners,
        precision: p.precision / learners,
        recall: p.recall / learners
      }))
    });
  }
  return { words: wordCount, learners, items, result };
}

/**
 * 单个学习者的 12 题探针轨迹，用于交互演示。
 * 每一步都返回：选了哪个词、预测答对率、真实是否生词、答对/答错、更新后的能力与词汇量。
 */
export function traceScreening({ theta = 0, words: wordCount = 48, items = 12, seed = 7, method = 'hybrid' } = {}) {
  const rng = mulberry32(seed);
  const words = makeWordBank(wordCount);
  const learner = makeLearner(theta, words);
  const belief = makeBelief();
  const seen = new Set();
  const initialFixed = [0.12, 0.5, 0.88].map((q) => Math.floor(q * wordCount));
  const rows = [];
  let discovered = 0;
  let unknownTotal = wordCount - learner.trueVocabulary;
  for (let step = 0; step < items; step += 1) {
    const unseen = [];
    for (let i = 0; i < wordCount; i += 1) if (!seen.has(i)) unseen.push(i);
    const pick = pickScreeningItem({
      key: method, step, words, unseen, theta: belief.mean(), rng, initialFixed
    });
    if (pick < 0) break;
    seen.add(pick);
    const word = words[pick];
    const pPred = pCorrect(belief.mean(), word.b);
    const correct = rng() < pCorrect(learner.theta, word.b);
    const isUnknown = !learner.known[pick];
    if (isUnknown) discovered += 1;
    belief.update(word.b, correct);
    const thetaAfter = belief.mean();
    let lane = '边界';
    if (method === 'hybrid' && step < 5) lane = '估能力';
    else if (method === 'hybrid') lane = '猎生词';
    else if (method === 'current') lane = step < 3 ? '固定校准' : '随机';
    else if (method === 'info50' || method === 'soft' || method === 'soft1') lane = '最大信息';
    else if (method === 'random') lane = '随机';
    else if (method === 'easiest') lane = '从易到难';
    rows.push({
      step: step + 1,
      id: word.id + 1,
      rank: word.rank,
      b: word.b,
      pPred,
      isUnknown,
      correct,
      thetaAfter,
      vEstimate: estimateVocabulary(thetaAfter, words),
      lane
    });
  }
  return {
    theta,
    trueVocabulary: learner.trueVocabulary,
    unknownTotal,
    discovered,
    rows,
    finalTheta: belief.mean(),
    finalEstimate: estimateVocabulary(belief.mean(), words)
  };
}

// ---------------------------------------------------------------------------
// 复习调度：固定阶梯 / FSRS / 风险巡检
// ---------------------------------------------------------------------------

const FIXED_INTERVALS = [1, 3, 7, 16];

function makeDeck(theta, words, rng, mismatch = 0.35, shockRate = 0) {
  return words.map((w) => {
    const base = 2.4 * Math.exp(0.55 * (theta - w.b));
    const hidden = Math.exp((rng() * 2 - 1) * mismatch);
    const sTrue = clamp(base * hidden, 0.4, 90);
    return {
      id: w.id,
      b: w.b,
      value: w.value,
      sTrue,
      sHat: clamp(base, 0.4, 90),
      dHat: clamp(5.2 - 0.9 * (theta - w.b), 1, 10),
      dTrue: clamp(5.2 - 0.9 * (theta - w.b), 1, 10),
      last: 0,
      stage: 0,
      due: 1,
      lapses: 0,
      reviews: 0,
      lastResult: null,
      lastReviewDay: 0,
      forgotDetected: false,
      forgottenAt: null,
      shocks: shockRate
    };
  });
}

function trueRecall(card, day, trueModel = 'fsrs') {
  const elapsed = day - card.lastReviewDay;
  const s = Math.max(0.2, card.sTrue);
  if (trueModel === 'exponential') return Math.pow(0.9, elapsed / s);
  if (trueModel === 'power07') {
    const decay = -0.7;
    const factor = Math.pow(0.9, 1 / decay) - 1;
    return Math.pow(1 + factor * (elapsed / s), decay);
  }
  return retrievability(elapsed, s);
}

function trueUpdate(card, correct, elapsed, trueModel = 'fsrs') {
  if (card.sTrue <= 0) card.sTrue = 1;
  if (trueModel === 'fsrs') {
    const next = fsrsUpdate({ s: card.sTrue, d: card.dTrue }, correct, elapsed);
    card.sTrue = next.s;
    card.dTrue = next.d;
    return;
  }
  // 替代真实模型：只保留“成功变稳、失败变脆”的单调规则，
  // 用来检验推荐调度器是不是只在“真实世界也服从 FSRS”时占优。
  if (correct) {
    const spacing = 1 + 0.35 * Math.min(1, elapsed / Math.max(1, card.sTrue));
    card.sTrue = Math.min(3650, card.sTrue * 1.5 * spacing);
  } else {
    card.sTrue = Math.max(0.4, card.sTrue * 0.3);
  }
}

function modelUpdate(card, correct, elapsed) {
  const next = fsrsUpdate({ s: card.sHat, d: card.dHat }, correct, elapsed);
  card.sHat = next.s;
  card.dHat = next.d;
}

function fsrsDue(card, day) {
  return retrievability(day - card.lastReviewDay, card.sHat) <= 0.9;
}

function fixedDue(card, day) {
  return day >= card.due;
}

function cardScore(card, day) {
  const r = retrievability(day - card.lastReviewDay, card.sHat);
  const overdue = (day - card.lastReviewDay) / Math.max(0.5, card.sHat);
  return (1 - r) * (1 + 0.35 * Math.min(4, overdue)) * (1 + 0.8 * card.lapses) * card.value;
}

function auditScore(card, day) {
  const ratio = (day - card.lastReviewDay) / Math.max(0.5, card.sHat);
  return Math.pow(ratio, 1.35) * (1 + 1.6 * card.lapses) * card.value;
}

function applyResult(card, correct, day, algorithm, trueModel = 'fsrs') {
  const elapsed = day - card.lastReviewDay;
  card.reviews += 1;
  card.lastResult = correct;
  const before = card.stage;
  if (algorithm === 'fixed') {
    if (correct) card.stage = Math.min(card.stage + 1, FIXED_INTERVALS.length - 1);
    else {
      card.stage = 0;
      card.lapses += 1;
    }
    card.due = day + FIXED_INTERVALS[card.stage];
    if (correct && before === FIXED_INTERVALS.length - 1) card.mastered = true;
    trueUpdate(card, correct, elapsed, trueModel);
  } else {
    if (!correct) card.lapses += 1;
    modelUpdate(card, correct, elapsed);
    card.due = day + Math.max(1, Math.round(intervalFor(card.sHat, 0.9)));
    if (card.sHat > 60) card.mastered = true;
    trueUpdate(card, correct, elapsed, trueModel);
  }
  card.lastReviewDay = day;
  if (!correct) card.forgotDetected = true;
}

function selectItems(cards, day, budget, algorithm, rng, auditShare = 0.1) {
  const picks = [];
  const used = new Set();
  const push = (card) => {
    if (card && !used.has(card.id)) {
      used.add(card.id);
      picks.push(card);
    }
  };
  if (algorithm === 'fixed') {
    const due = cards.filter((c) => fixedDue(c, day) && !used.has(c.id));
    due.sort((a, b) => a.due - b.due || b.lapses - a.lapses || a.id - b.id);
    for (const c of due) if (picks.length < budget) push(c);
  } else if (algorithm === 'fsrs') {
    const due = cards.filter((c) => fsrsDue(c, day));
    due.sort((a, b) => retrievability(day - a.lastReviewDay, a.sHat) - retrievability(day - b.lastReviewDay, b.sHat));
    for (const c of due) if (picks.length < budget) push(c);
  } else if (algorithm === 'risk') {
    const due = cards.filter((c) => fsrsDue(c, day));
    due.sort((a, b) => cardScore(b, day) - cardScore(a, day));
    for (const c of due) if (picks.length < budget) push(c);
  } else if (algorithm === 'three') {
    // 到期复习优先；留出 auditShare 的巡检名额给“熟悉词”。
    const dueBudget = Math.max(1, budget - Math.round(budget * auditShare));
    const due = cards.filter((c) => fsrsDue(c, day));
    due.sort((a, b) => retrievability(day - a.lastReviewDay, a.sHat) - retrievability(day - b.lastReviewDay, b.sHat));
    for (const c of due) if (picks.length < dueBudget) push(c);
    const auditPool = cards.filter((c) => !used.has(c.id) && !fsrsDue(c, day));
    auditPool.sort((a, b) => cardScore(b, day) - cardScore(a, day));
    // 30% 均匀随机，避免巡检只盯模型已经怀疑的词，漏掉“意外遗忘”。
    while (picks.length < budget && auditPool.length) {
      const pick = rng() < 0.3
        ? auditPool.splice(Math.floor(rng() * auditPool.length), 1)[0]
        : auditPool.shift();
      if (pick && !used.has(pick.id)) push(pick);
    }
  }
  return picks;
}

export function schedulingMethods() {
  return [
    { key: 'fixed', label: '现状：1/3/7/16 固定阶梯' },
    { key: 'fsrs', label: 'FSRS：按到期日' },
    { key: 'risk', label: 'FSRS + 风险优先' },
    { key: 'three', label: 'FSRS + 三通道（复审巡检）' }
  ];
}

export function runScheduling({
  learners = 80,
  words: wordCount = 160,
  days = 90,
  budget = 10,
  seed = 11,
  mismatch = 0.35,
  shockRate = 0,
  auditShare = 0.1,
  trueModel = 'fsrs',
  methods = schedulingMethods().map((m) => m.key)
} = {}) {
  const words = makeWordBank(wordCount);
  const result = [];
  const methodMap = new Map(schedulingMethods().map((m) => [m.key, m]));

  for (const key of methods) {
    const method = methodMap.get(key);
    if (!method) continue;
    let sumRetention = 0;
    let sumReviews = 0;
    let sumWaste = 0;
    let sumDetected = 0;
    let sumEvents = 0;
    let sumSilent = 0;
    let sumWords = 0;
    const latencies = [];

    for (let l = 0; l < learners; l += 1) {
      const setupRng = mulberry32(seed + l * 9973);
      const u1 = Math.max(1e-9, setupRng());
      const u2 = setupRng();
      const theta = clamp(1.15 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2), -1.4, 1.4);
      const deck = makeDeck(theta, words, setupRng, mismatch, shockRate);
      const rng = mulberry32(seed + l * 104729 + key.length * 7919 + key.charCodeAt(0) * 31);
      for (let day = 1; day <= days; day += 1) {
        for (const card of deck) {
          if (shockRate > 0 && rng() < shockRate && card.sTrue > 2) card.sTrue *= 0.25;
          if (card.forgottenAt === null && trueRecall(card, day, trueModel) < 0.7) {
            card.forgottenAt = day;
            sumEvents += 1;
          }
        }
        const picks = selectItems(deck, day, budget, key, rng, auditShare);
        for (const card of picks) {
          const r = trueRecall(card, day, trueModel);
          const correct = rng() < r;
          sumWaste += r > 0.9 ? 1 : 0;
          if (!correct && card.forgottenAt !== null && !card.detectedEvent) {
            latencies.push(day - card.forgottenAt);
            sumDetected += 1;
            card.detectedEvent = true;
          }
          applyResult(card, correct, day, key === 'fixed' ? 'fixed' : 'fsrs', trueModel);
        }
      }
      for (const card of deck) {
        const r = trueRecall(card, days + 1, trueModel);
        sumRetention += r;
        sumReviews += card.reviews;
        sumWords += 1;
        if (r < 0.7 && !card.detectedEvent) sumSilent += 1;
      }
    }

    latencies.sort((a, b) => a - b);
    result.push({
      key,
      label: method.label,
      retention: sumRetention / sumWords,
      reviewsPerWord: sumReviews / sumWords,
      waste: sumWaste / Math.max(1, sumReviews),
      detection: sumEvents ? sumDetected / sumEvents : 0,
      events: sumEvents,
      medianLatency: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
      silent: sumSilent / sumWords
    });
  }
  return { learners, words: wordCount, days, budget, trueModel, result };
}

// ---------------------------------------------------------------------------
// 单学习者逐日轨迹：交互演示用
// ---------------------------------------------------------------------------

export function simulateLearnerTrack({ theta = 0, words: wordCount = 60, days = 30, budget = 8, seed = 3, algorithm = 'three', trueModel = 'fsrs' } = {}) {
  const rng = mulberry32(seed);
  const words = makeWordBank(wordCount);
  const deck = makeDeck(theta, words, rng, 0.3, 0);
  const timeline = [];
  for (let day = 1; day <= days; day += 1) {
    const picks = selectItems(deck, day, budget, algorithm, rng);
    let correctCount = 0;
    for (const card of picks) {
      const r = trueRecall(card, day, trueModel);
      const correct = rng() < r;
      if (correct) correctCount += 1;
      applyResult(card, correct, day, algorithm === 'fixed' ? 'fixed' : 'fsrs', trueModel);
    }
    const retention = deck.reduce((a, c) => a + trueRecall(c, day, trueModel), 0) / deck.length;
    timeline.push({
      day,
      reviews: picks.length,
      correct: correctCount,
      retention,
      avgStability: deck.reduce((a, c) => a + c.sHat, 0) / deck.length
    });
  }
  return timeline;
}
