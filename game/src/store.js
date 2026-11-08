// 本地存档（localStorage）。原型为单机、离线优先；正式版应由服务端权威计算 SRS / HP。
import { addDays, defaultSpelling, isMasteredWord, learningDay } from './srs.js';

export const STORAGE_KEY = 'shici.fog-harbor.save.v1';
export const SAVE_VERSION = 1;

export function emptyDay(date) {
  return {
    date,
    started: false,
    reviewCleared: false,
    scenesPlayed: 0,
    completed: false,
    contractCorrect: 0,
    contractWrong: 0,
    reviewCorrect: 0,
    reviewWrong: 0,
    storySuccess: 0,
    storyFail: 0,
    bossHits: 0,
    bossDone: false,
    hintsUsed: 0,
    spellingBonusCorrect: 0,
    spellingBonusWrong: 0
  };
}

export function createNewSave(now = new Date()) {
  const today = learningDay(now);
  return {
    version: SAVE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clockOffset: 0,
    demo: false,
    settings: {
      newPerDay: 12,
      anchor: '21:00',
      reduceMotion: false
    },
    progress: {
      chapter: 1,
      sceneIndex: 0,
      hp: 100,
      clues: 0,
      streak: 0,
      lastCompletedDate: null,
      chapterDone: false,
      bossAttempts: 0,
      bossWins: 0,
      branchFlags: {}
    },
    day: emptyDay(today),
    words: {},
    history: []
  };
}

/** 演示存档：把第一章前 3 幕标记为“昨天学过”，今天有 12 张到期卡。 */
export function createDemoSave(now, allWords) {
  const save = createNewSave(now);
  const today = save.day.date;
  const yesterday = addDays(today, -1);
  const stages = [0, 0, 1, 1, 2, 2, 0, 1, 2, 0, 1, 2];
  const spellingStages = [0, 0, 1, 0, 2, 2, 0, 1, 2, 2, 0, 1];
  const lapses = [0, 1, 0, 0, 2, 0, 0, 3, 0, 1, 0, 0];
  const first12 = [...allWords].sort((a, b) => a.freq_rank - b.freq_rank).slice(0, 12);
  first12.forEach((word, index) => {
    const stage = stages[index] ?? 0;
    const spelling = {
      stage: spellingStages[index] ?? 0,
      dueOn: today,
      passes: spellingStages[index] ?? 0,
      fails: 0
    };
    const userWord = {
      state: 'review',
      stage,
      dueOn: today,
      correctStreak: stage,
      lapses: lapses[index] ?? 0,
      lastResult: false,
      known: false,
      introducedAt: yesterday,
      spelling
    };
    userWord.state = isMasteredWord(userWord) ? 'mastered' : 'review';
    save.words[word.id] = userWord;
  });
  save.demo = true;
  save.progress.sceneIndex = 3;
  save.progress.hp = 90;
  save.progress.clues = 1;
  save.progress.streak = 1;
  save.progress.lastCompletedDate = yesterday;
  save.progress.chapterDone = false;
  save.day = emptyDay(today);
  save.history.push({
    date: yesterday,
    reviewed: 0,
    newWords: 12,
    scenes: 3,
    hp: 90,
    clues: 1,
    accuracy: null
  });
  return save;
}

export function virtualToday(save, now = new Date()) {
  return learningDay(now, save.clockOffset ?? 0);
}

/** 跨天重置：昨天完成则保 streak，未完成则断签（原型不做休整券）。 */
export function ensureDay(save, today) {
  if (save.day?.date === today) return false;
  if (save.progress.lastCompletedDate !== save.day?.date && save.progress.streak > 0) {
    save.progress.streak = 0;
  }
  save.day = emptyDay(today);
  return true;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    if (!parsed.progress || !parsed.day || !parsed.settings) return null;
    parsed.words = parsed.words || {};
    parsed.history = parsed.history || [];
    parsed.day.spellingBonusCorrect = parsed.day.spellingBonusCorrect ?? 0;
    parsed.day.spellingBonusWrong = parsed.day.spellingBonusWrong ?? 0;
    const today = learningDay(new Date());
    for (const [id, userWord] of Object.entries(parsed.words)) {
      if (!userWord.spelling) {
        userWord.spelling = defaultSpelling(today);
        userWord.state = isMasteredWord(userWord) ? 'mastered' : 'review';
      }
    }
    return parsed;
  } catch (error) {
    console.warn('读取存档失败，已忽略。', error);
    return null;
  }
}

export function writeSave(save) {
  save.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (error) {
    console.warn('写入存档失败。', error);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('清除存档失败。', error);
  }
}
