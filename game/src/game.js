// 游戏会话逻辑：契约、词行动、代价、BOSS、每日结算。
// 所有函数直接修改传入的 save（便于本地存档），返回本次操作的结果供 UI 使用。
import {
  addDays,
  buildPlan,
  dueWords as srsDueWords,
  introduce,
  isCorrectAnswer,
  markKnown,
  masteryStats,
  nextDueSummary,
  nextNewWords,
  review,
  undoKnown
} from './srs.js';
import { ensureDay, virtualToday } from './store.js';

export const SCENES_PER_DAY = 3;
export const CHAPTER_SCENES = 12;

export function chapterOf(content) {
  return content.chapter;
}

export function wordsById(content) {
  const map = {};
  for (const word of content.words) map[word.id] = word;
  return map;
}

export function todayOf(save, now = new Date()) {
  return virtualToday(save, now);
}

export function prepareToday(save, now = new Date()) {
  const today = todayOf(save, now);
  const changed = ensureDay(save, today);
  return { today, changed };
}

export function planFor(save, content, now = new Date()) {
  const today = todayOf(save, now);
  const byId = wordsById(content);
  const plan = buildPlan(save, today, content.words, byId);
  const due = srsDueWords(save, today, byId);
  return {
    today,
    plan,
    due,
    stats: masteryStats(save),
    nextDue: nextDueSummary(save, today, byId),
    byId
  };
}

export function currentScene(save, content) {
  const index = save.progress.sceneIndex;
  if (index >= CHAPTER_SCENES) return null;
  return content.chapter.scenes[index] || null;
}

export function sceneByIndex(content, index) {
  return content.chapter.scenes[index] || null;
}

export function unlockStory(save, content, now = new Date()) {
  const { today } = prepareToday(save, now);
  const byId = wordsById(content);
  const due = srsDueWords(save, today, byId);
  if (due.length > 0) return { ok: false, due };
  save.day.reviewCleared = true;
  save.day.started = true;
  return { ok: true, due: [] };
}

export function isChapterComplete(save) {
  return Boolean(save.progress.chapterDone);
}

export function isDayFinished(save) {
  return Boolean(save.day.completed) || (save.progress.sceneIndex >= CHAPTER_SCENES && save.boss?.done);
}

/** 当前幕里还没契约的词（按 featured_words 顺序；已认识的跳过）。 */
export function pendingContractWords(save, scene) {
  return scene.featured_words
    .map((id) => id)
    .filter((id) => !save.words[id]);
}

export function contractWord(save, content, wordId, correct, today) {
  const word = wordsById(content)[wordId];
  if (!word) return null;
  const isNew = !save.words[wordId];
  if (isNew) {
    save.words[wordId] = introduce(today, correct);
    if (correct) save.day.contractCorrect += 1;
    else save.day.contractWrong += 1;
  }
  return { word, isNew, correct };
}

export function skipKnownWord(save, content, wordId, today) {
  const word = wordsById(content)[wordId];
  if (!word) return null;
  save.words[wordId] = markKnown(today);
  return { word, known: true };
}

export function undoKnownWord(save, wordId, today) {
  if (save.words[wordId]?.known) {
    save.words[wordId] = undoKnown(save.words[wordId], today);
    return true;
  }
  return false;
}

export function availableActions(save, scene) {
  return scene.actions.filter((action) => !save.words[action.target_word]?.known);
}

export function applyEffect(save, effect) {
  if (!effect) return '';
  switch (effect.type) {
    case 'clue': {
      const before = save.progress.clues;
      save.progress.clues = Math.min(3, before + (effect.amount || 1));
      return before === 3 ? '线索已满，这一条没有留下。' : `线索 +${save.progress.clues - before}（${save.progress.clues}/3）`;
    }
    case 'heal': {
      const before = save.progress.hp;
      save.progress.hp = Math.min(100, before + (effect.amount || 10));
      return `HP +${save.progress.hp - before}（${save.progress.hp}/100）`;
    }
    case 'shield':
      return '你获得了一层护盾。';
    case 'reveal':
      return '雾里显出了一条新的线索。';
    case 'damage':
      return '障碍碎开了。';
    default:
      return '';
  }
}

export function applyCost(save, cost, scene) {
  if (!cost) return { message: '', exhausted: false };
  if (cost.type === 'hp') {
    save.progress.hp = Math.max(0, save.progress.hp - (cost.amount || 10));
    if (save.progress.hp <= 0) {
      save.progress.hp = 50;
      const hadClue = save.progress.clues > 0;
      if (hadClue) save.progress.clues -= 1;
      return {
        message: hadClue ? '力竭：HP 回到 50，并失去 1 条线索。' : '力竭：HP 回到 50。',
        exhausted: true
      };
    }
    return { message: `HP -${cost.amount}（${save.progress.hp}/100）`, exhausted: false };
  }
  if (cost.type === 'clue') {
    const before = save.progress.clues;
    save.progress.clues = Math.max(0, before - (cost.amount || 1));
    return {
      message: before === 0 ? '线索已经空了，雾把痕迹抹得更干净。' : `线索 -${before - save.progress.clues}（${save.progress.clues}/3）`,
      exhausted: false
    };
  }
  if (cost.type === 'branch') {
    save.progress.branchFlags[scene.id] = true;
    return { message: '剧情走向改变：雾里多了一条你不想走的路。', exhausted: false };
  }
  return { message: '', exhausted: false };
}

export function performAction(save, content, scene, action, input, today) {
  const word = wordsById(content)[action.target_word];
  const correct = isCorrectAnswer(word, input);
  if (correct) {
    save.day.storySuccess += 1;
    const effectMessage = applyEffect(save, action.success.effect);
    save.outcome = {
      sceneId: scene.id,
      actionId: action.id,
      wordId: word.id,
      correct: true,
      text: action.success.text,
      effectMessage,
      costMessage: '',
      hard: false
    };
  } else {
    save.day.storyFail += 1;
    const current = save.words[word.id];
    if (current && !current.known) {
      save.words[word.id] = review(current, false, today);
    }
    const cost = applyCost(save, action.failure.cost, scene);
    save.outcome = {
      sceneId: scene.id,
      actionId: action.id,
      wordId: word.id,
      correct: false,
      text: action.failure.text,
      effectMessage: '',
      costMessage: cost.message,
      exhausted: cost.exhausted,
      hard: false
    };
  }
  return { correct, word, outcome: save.outcome };
}

export function hardBlast(save, scene, today) {
  save.day.storyFail += 1;
  save.progress.hp = Math.max(0, save.progress.hp - 15);
  let costMessage = 'HP -15。';
  let exhausted = false;
  if (save.progress.hp <= 0) {
    save.progress.hp = 50;
    exhausted = true;
    if (save.progress.clues > 0) save.progress.clues -= 1;
    costMessage = '硬闯失败，力竭：HP 回到 50，并失去 1 条线索。';
  } else {
    costMessage = `硬闯：HP -15（${save.progress.hp}/100）。`;
  }
  save.outcome = {
    sceneId: scene.id,
    actionId: 'hard',
    wordId: null,
    correct: false,
    text: '你没有去碰那些词。你低下头，硬扛着穿过这一拍。',
    effectMessage: '',
    costMessage,
    exhausted,
    hard: true
  };
  return save.outcome;
}

export function finishScene(save, content, today) {
  save.outcome = null;
  save.progress.sceneIndex += 1;
  save.day.scenesPlayed += 1;
  if (save.progress.sceneIndex >= CHAPTER_SCENES) {
    save.progress.sceneIndex = CHAPTER_SCENES;
    if (!save.boss) {
      save.boss = { index: 0, hits: 0, done: false, won: false, results: [] };
    }
    return { next: save.progress.chapterDone ? 'summary' : 'boss' };
  }
  if (save.day.scenesPlayed >= SCENES_PER_DAY) {
    markDayComplete(save, content, today);
    return { next: 'summary' };
  }
  return { next: 'story' };
}

export function markDayComplete(save, content, today) {
  if (save.day.completed) return;
  save.day.completed = true;
  save.progress.streak += 1;
  save.progress.lastCompletedDate = save.day.date;
  const accuracy = dayAccuracy(save);
  const newWords = Object.values(save.words).filter((uw) => uw.introducedAt === today).length;
  save.history.push({
    date: save.day.date,
    reviewed: save.day.reviewCorrect + save.day.reviewWrong,
    newWords,
    scenes: save.day.scenesPlayed,
    hp: save.progress.hp,
    clues: save.progress.clues,
    accuracy
  });
  if (save.history.length > 60) save.history = save.history.slice(-60);
}

export function dayAccuracy(save) {
  const correct = save.day.reviewCorrect + save.day.contractCorrect + save.day.storySuccess;
  const total = correct + save.day.reviewWrong + save.day.contractWrong + save.day.storyFail;
  return total === 0 ? null : Math.round((correct / total) * 100);
}

export function startBoss(save) {
  if (!save.boss || save.boss.done) {
    save.boss = { index: 0, hits: 0, done: false, won: false, results: [] };
  }
  return save.boss;
}

export function bossWord(save, content) {
  const boss = content.chapter.boss;
  const id = boss.check_word_ids[save.boss?.index ?? 0];
  return wordsById(content)[id] || null;
}

export function bossCheck(save, content, input, today) {
  const boss = content.chapter.boss;
  if (!save.boss || save.boss.done) return null;
  const wordId = boss.check_word_ids[save.boss.index];
  const word = wordsById(content)[wordId];
  const correct = isCorrectAnswer(word, input);
  if (correct) save.boss.hits += 1;
  else save.progress.hp = Math.max(0, save.progress.hp - boss.failure_hp);
  save.boss.results.push({ wordId, correct });
  save.boss.index += 1;

  let finished = false;
  if (save.progress.hp <= 0) {
    save.progress.hp = 50;
    if (save.progress.clues > 0) save.progress.clues -= 1;
    save.boss.done = true;
    save.boss.won = false;
    finished = true;
  } else if (save.boss.index >= boss.check_word_ids.length) {
    save.boss.done = true;
    save.boss.won = save.boss.hits >= boss.required;
    finished = true;
  }

  if (finished) {
    if (save.boss.won) {
      save.progress.chapterDone = true;
      save.progress.clues = Math.min(3, save.progress.clues + 1);
      save.progress.bossWins += 1;
    } else {
      save.progress.hp = Math.max(save.progress.hp, boss.retreat_hp);
      save.progress.bossAttempts += 1;
    }
    markDayComplete(save, content, today);
  }
  return { correct, word, finished, won: save.boss.won };
}

export function resetBoss(save) {
  save.boss = { index: 0, hits: 0, done: false, won: false, results: [] };
  save.outcome = null;
}

export function advanceDay(save, now = new Date()) {
  save.clockOffset = (save.clockOffset || 0) + 1;
  const today = virtualToday(save, now);
  ensureDay(save, today);
  save.outcome = null;
  return today;
}

export function summaryData(save, content, today) {
  const byId = wordsById(content);
  const plan = buildPlan(save, today, content.words, byId);
  return {
    day: save.day,
    accuracy: dayAccuracy(save),
    newWords: Object.values(save.words).filter((uw) => uw.introducedAt === today).length,
    dueTomorrow: nextDueSummary(save, today, byId).tomorrowCount,
    nextPlan: plan,
    chapterDone: Boolean(save.progress.chapterDone),
    sceneIndex: save.progress.sceneIndex,
    stats: masteryStats(save)
  };
}

export function newWordsRemainingInChapter(save, content) {
  return nextNewWords(save, content.words, 99).length;
}

export function sceneDayNumber(index) {
  return Math.floor(index / SCENES_PER_DAY) + 1;
}

export function chapterProgressLabel(save) {
  return `${Math.min(save.progress.sceneIndex, CHAPTER_SCENES)}/${CHAPTER_SCENES}`;
}

export function wordStatusLabel(uw) {
  if (!uw) return '未契约';
  if (uw.known) return '已认识';
  if (uw.state === 'mastered') return '已掌握';
  return '复习中';
}

export function dueLabel(uw) {
  if (!uw) return '—';
  if (uw.known) return '不进入复习';
  return uw.dueOn;
}
