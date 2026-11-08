// 间隔重复（SRS）：设计文档 3.2–3.5 的纯函数实现。
// 1 / 3 / 7 / 16 天固定阶梯；答对升一档，答错回到 1 天，16 天封顶。

export const INTERVALS = [1, 3, 7, 16];
export const DEFAULT_NEW_PER_DAY = 12;
export const MAX_NEW_PER_DAY = 20;
export const MIN_NEW_PER_DAY = 10;
export const LEARNING_DAY_BOUNDARY_HOUR = 4;

/** 本地日期 → YYYY-MM-DD */
export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 以本地中午为基准加减天数，避开夏令时边界。 */
export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  return toISO(dt);
}

/** 学习日：本地 04:00 之前仍算前一天。offset 用于原型里的“快进一天”。 */
export function learningDay(now = new Date(), offsetDays = 0) {
  const d = new Date(now.getTime());
  if (d.getHours() < LEARNING_DAY_BOUNDARY_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return addDays(toISO(d), offsetDays);
}

function frequencyOf(wordsById, wordId) {
  return wordsById?.[wordId]?.freq_rank ?? Number.MAX_SAFE_INTEGER;
}

/** 新词契约完成：无论对错都排 1 天。 */
export function introduce(today, correct) {
  return {
    state: 'review',
    stage: 0,
    dueOn: addDays(today, INTERVALS[0]),
    correctStreak: 0,
    lapses: 0,
    lastResult: Boolean(correct),
    known: false,
    introducedAt: today
  };
}

/** 一次复习结果 → 新的 user_word。不修改入参。 */
export function review(userWord, correct, today) {
  const next = { ...userWord };
  if (correct) {
    next.stage = Math.min((userWord.stage ?? 0) + 1, 3);
    next.correctStreak = (userWord.correctStreak ?? 0) + 1;
    next.lastResult = true;
  } else {
    next.stage = 0;
    next.correctStreak = 0;
    next.lapses = (userWord.lapses ?? 0) + 1;
    next.lastResult = false;
  }
  next.state = next.stage === 3 ? 'mastered' : 'review';
  next.dueOn = addDays(today, INTERVALS[next.stage]);
  return next;
}

export function markKnown(today) {
  return {
    state: 'known',
    stage: 0,
    dueOn: addDays(today, INTERVALS[0]),
    correctStreak: 0,
    lapses: 0,
    lastResult: true,
    known: true,
    knownAt: today
  };
}

export function undoKnown(userWord, today) {
  return {
    ...userWord,
    state: 'review',
    known: false,
    stage: 0,
    dueOn: addDays(today, INTERVALS[0])
  };
}

export function isDue(userWord, today) {
  return Boolean(userWord) && !userWord.known && userWord.dueOn <= today;
}

/** 今日到期卡，按设计文档 3.4 排序。 */
export function dueWords(save, today, wordsById) {
  return Object.entries(save.words)
    .filter(([, uw]) => isDue(uw, today))
    .map(([id, uw]) => ({ id, uw, word: wordsById[id] }))
    .filter((entry) => Boolean(entry.word))
    .sort((a, b) => {
      if (a.uw.dueOn !== b.uw.dueOn) return a.uw.dueOn < b.uw.dueOn ? -1 : 1;
      if (a.uw.lapses !== b.uw.lapses) return b.uw.lapses - a.uw.lapses;
      const fa = frequencyOf(wordsById, a.id);
      const fb = frequencyOf(wordsById, b.id);
      if (fa !== fb) return fa - fb;
      return a.id < b.id ? -1 : 1;
    });
}

/** 下一批新词：当前章按 freq_rank 升序，跳过已契约/已认识。 */
export function nextNewWords(save, allWords, limit = DEFAULT_NEW_PER_DAY) {
  return allWords
    .filter((w) => w.chapter === (save.progress?.chapter ?? 1))
    .filter((w) => !save.words[w.id])
    .sort((a, b) => a.freq_rank - b.freq_rank)
    .slice(0, limit);
}

export function introducedOn(save, today) {
  return Object.values(save.words).filter((uw) => uw.introducedAt === today).length;
}

export function remainingNewToday(save, today, newPerDay = DEFAULT_NEW_PER_DAY) {
  return Math.max(0, newPerDay - introducedOn(save, today));
}

export function buildPlan(save, today, allWords, wordsById) {
  const all = allWords.filter((w) => w.chapter === (save.progress?.chapter ?? 1));
  const due = dueWords(save, today, wordsById);
  const budget = Math.min(
    Math.max(save.settings?.newPerDay ?? DEFAULT_NEW_PER_DAY, MIN_NEW_PER_DAY),
    MAX_NEW_PER_DAY
  );
  const remaining = remainingNewToday(save, today, budget);
  const newWords = nextNewWords(save, all, remaining);
  return {
    due,
    newWords,
    newBudget: budget,
    remainingToday: remaining,
    reviewPending: due.length > 0,
    estimatedMinutes: Math.round(5 + (newWords.length / 12) * 10)
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

/** 生成 4 选 1 的中文释义选项；同一道题每次顺序一致。 */
export function meaningOptions(word, allWords, count = 4, seedKey = '') {
  const correct = word.meanings[0];
  const pool = [];
  for (const other of allWords) {
    if (!other || other.id === word.id) continue;
    const meaning = other.meanings?.[0];
    if (meaning && meaning !== correct && !pool.includes(meaning)) pool.push(meaning);
  }
  const rand = mulberry32(hashString(`${word.id}:${seedKey}`));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const options = [correct, ...pool.slice(0, Math.max(1, count - 1))];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

export function normalizeAnswer(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.!?。！？,，;；:：'"“”‘’]+$/g, '')
    .replace(/\s+/g, ' ');
}

export function isCorrectAnswer(word, input) {
  return normalizeAnswer(input) === normalizeAnswer(word.lemma);
}

export function firstLetterHint(word) {
  const letters = word.lemma.replace(/[^a-z]/gi, '');
  return `${letters.slice(0, 1).toUpperCase()}… · ${letters.length} 个字母`;
}

export function nextDueSummary(save, today, wordsById) {
  const tomorrow = addDays(today, 1);
  let tomorrowCount = 0;
  let weekCount = 0;
  const weekEnd = addDays(today, 7);
  for (const [id, uw] of Object.entries(save.words)) {
    if (uw.known || !wordsById[id]) continue;
    if (uw.dueOn === tomorrow) tomorrowCount += 1;
    if (uw.dueOn > today && uw.dueOn <= weekEnd) weekCount += 1;
  }
  return { tomorrowCount, weekCount };
}

export function masteryStats(save) {
  const values = Object.values(save.words);
  return {
    mastered: values.filter((uw) => uw.state === 'mastered').length,
    reviewing: values.filter((uw) => uw.state === 'review').length,
    known: values.filter((uw) => uw.known).length,
    learning: values.length
  };
}
