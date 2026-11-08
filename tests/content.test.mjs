import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../scripts/validate-content.mjs';
import { createNewSave } from '../game/src/store.js';
import * as G from '../game/src/game.js';
import * as S from '../game/src/srs.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wordsData = JSON.parse(await readFile(resolve(root, 'game/content/words.json'), 'utf8'));
const chapter = JSON.parse(await readFile(resolve(root, 'game/content/chapter-1.json'), 'utf8'));
const content = { words: wordsData.words, chapter, meta: wordsData };

test('内容校验：48 词 / 12 幕 / 1–2 行动 / 覆盖完整', () => {
  const result = validateContent(wordsData, chapter);
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(result.stats.words, 48);
  assert.equal(result.stats.scenes, 12);
  assert.equal(result.stats.actions, 23);
});

test('词表字段与章节覆盖', () => {
  const words = content.words;
  assert.equal(words.length, 48);
  assert.equal(new Set(words.map((word) => word.freq_rank)).size, 48);
  assert.equal(Math.min(...words.map((word) => word.freq_rank)), 1);
  assert.equal(Math.max(...words.map((word) => word.freq_rank)), 48);
  assert.equal(new Set(words.map((word) => word.id)).size, 48);
  for (const word of words) {
    assert.ok(word.lemma);
    assert.ok(word.ipa.startsWith('/'));
    assert.ok(word.meanings.length > 0);
    assert.ok(word.example_en.toLowerCase().includes(word.lemma.toLowerCase()));
  }
});

test('完美通关第一章：4 天 × 3 幕 + BOSS，48 词全部契约', () => {
  let now = new Date(2026, 10, 8, 10, 0);
  const save = createNewSave(now);
  let today = G.todayOf(save, now);
  let totalScenes = 0;
  let bossTried = false;

  for (let day = 0; day < 4; day += 1) {
    const byId = G.wordsById(content);
    for (const entry of S.dueWords(save, today, byId)) {
      save.words[entry.id] = S.review(entry.uw, true, today);
      save.day.reviewCorrect += 1;
    }
    save.day.reviewCleared = true;

    for (let sceneNo = 0; sceneNo < 3; sceneNo += 1) {
      const scene = G.currentScene(save, content);
      assert.ok(scene, `第 ${day + 1} 天第 ${sceneNo + 1} 幕应存在`);
      for (const wordId of G.pendingContractWords(save, scene)) {
        G.contractWord(save, content, wordId, true, today);
      }
      const action = G.availableActions(save, scene)[0];
      const target = byId[action.target_word];
      G.performAction(save, content, scene, action, target.lemma, today);
      assert.equal(save.outcome.correct, true);
      const result = G.finishScene(save, content, today);
      totalScenes += 1;
      if (result.next === 'boss') {
        bossTried = true;
        assert.equal(save.progress.sceneIndex, 12);
        break;
      }
    }

    if (bossTried) {
      G.startBoss(save);
      for (const wordId of chapter.boss.check_word_ids) {
        G.bossCheck(save, content, byId[wordId].lemma, today);
      }
      assert.equal(save.boss.won, true);
      assert.equal(save.progress.chapterDone, true);
      break;
    }

    assert.equal(save.day.completed, true, `第 ${day + 1} 天应完成`);
    now = new Date(now.getTime() + 86400000);
    today = G.advanceDay(save, now);
  }

  assert.equal(totalScenes, 12);
  assert.equal(Object.keys(save.words).length, 48);
  assert.equal(save.progress.streak, 4);
  assert.equal(save.progress.chapterDone, true);
});

test('失败前进：答错仍推进下一幕，并扣 HP / 回 1 天', () => {
  const now = new Date(2026, 10, 8, 10, 0);
  const save = createNewSave(now);
  const today = G.todayOf(save, now);
  const scene = G.currentScene(save, content);
  for (const wordId of G.pendingContractWords(save, scene)) {
    G.contractWord(save, content, wordId, false, today);
  }
  const action = G.availableActions(save, scene)[0];
  const targetWord = G.wordsById(content)[action.target_word];
  const hpBefore = save.progress.hp;
  const result = G.performAction(save, content, scene, action, 'definitely-wrong', today);
  assert.equal(result.correct, false);
  assert.ok(save.progress.hp < hpBefore);
  assert.equal(save.words[targetWord.id].dueOn, S.addDays(today, 1));
  assert.equal(save.words[targetWord.id].stage, 0);
  const next = G.finishScene(save, content, today);
  assert.equal(next.next, 'story');
  assert.equal(save.progress.sceneIndex, 1);
});
