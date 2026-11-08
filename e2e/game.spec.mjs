import { test, expect } from '@playwright/test';

const SAVE_KEY = 'shici.fog-harbor.save.v1';
const errorsByPage = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  errorsByPage.set(page, errors);
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(errorsByPage.get(page) || []).toEqual([]);
});

async function expectHome(page) {
  await expect(page.getByRole('heading', { name: '今日航程' })).toBeVisible();
}

async function startNewGame(page) {
  await page.goto('/');
  await expect(page.locator('.cover-title')).toHaveText('拾词者');
  await page.getByRole('button', { name: '开始新的航程' }).click();
  await expectHome(page);
}

async function loadDemo(page) {
  await page.goto('/');
  await expect(page.locator('.cover-title')).toHaveText('拾词者');
  await page.getByRole('button', { name: '体验演示存档' }).click();
  await expectHome(page);
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 6000 });
}

async function pickOption(page, text) {
  const options = page.locator('.option');
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    if ((await options.nth(index).innerText()).trim() === text) {
      await options.nth(index).click();
      return;
    }
  }
  throw new Error(`找不到选项：${text}`);
}

async function reviewMeaning(page) {
  return page.evaluate(() => {
    const app = window.__shici;
    const id = app.review.queue[app.review.index];
    return app.byId[id].meanings[0];
  });
}

async function contractMeaning(page) {
  return page.evaluate(() => {
    const app = window.__shici;
    return app.story.contractQueue[app.story.contractIndex].meanings[0];
  });
}

async function finishReview(page) {
  for (let guard = 0; guard < 30; guard += 1) {
    if (await page.locator('[data-action="review-finish"]').isVisible().catch(() => false)) return;
    if (await page.locator('[data-action="review-next"]').isVisible().catch(() => false)) {
      await page.locator('[data-action="review-next"]').click();
      continue;
    }
    await pickOption(page, await reviewMeaning(page));
    await expect(page.locator('.feedback')).toBeVisible();
  }
  throw new Error('复习队列没有跑完');
}

async function finishContracts(page) {
  for (let guard = 0; guard < 30; guard += 1) {
    if (await page.locator('[data-action="contract-accept"]').isVisible().catch(() => false)) {
      await page.locator('[data-action="contract-accept"]').click();
      continue;
    }
    if (await page.locator('[data-action="contract-next"]').isVisible().catch(() => false)) {
      await page.locator('[data-action="contract-next"]').click();
      continue;
    }
    if (await page.locator('.option').first().isVisible().catch(() => false)) {
      await pickOption(page, await contractMeaning(page));
      await expect(page.locator('.feedback')).toBeVisible();
      continue;
    }
    return;
  }
  throw new Error('契约没有跑完');
}

async function playScene(page, { wrong = false, hard = false } = {}) {
  await finishContracts(page);
  if (hard) {
    await page.locator('[data-action="hard-blast"]').click();
  } else {
    await page.locator('.action-card').first().click();
    const lemma = await page.evaluate(() => {
      const app = window.__shici;
      const scene = app.content.chapter.scenes[app.save.progress.sceneIndex];
      const action = scene.actions.find((entry) => entry.id === app.story.selectedAction) || scene.actions[0];
      return app.byId[action.target_word].lemma;
    });
    await page.locator('#action-answer').fill(wrong ? 'not-the-word' : lemma);
    await page.locator('#action-form button[type="submit"]').click();
  }
  await expect(page.locator('.outcome')).toBeVisible();
  await page.locator('[data-action="outcome-next"]').click();
}

async function seedStory(page) {
  await loadDemo(page);
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key));
    for (const userWord of Object.values(save.words)) userWord.dueOn = '2099-01-01';
    save.progress.sceneIndex = 3;
    save.day.reviewCleared = true;
    save.day.scenesPlayed = 0;
    save.day.completed = false;
    save.day.started = true;
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/#/story');
  await expect(page.locator('[data-action="contract-accept"]')).toBeVisible();
}

async function seedBoss(page) {
  await loadDemo(page);
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key));
    const words = window.__shici.content.words;
    const today = save.day.date;
    for (const word of words) {
      if (!save.words[word.id]) {
        save.words[word.id] = {
          state: 'review',
          stage: 0,
          dueOn: today,
          correctStreak: 0,
          lapses: 0,
          lastResult: true,
          known: false,
          introducedAt: today
        };
      }
    }
    save.progress.sceneIndex = 12;
    save.progress.chapterDone = false;
    save.progress.hp = 90;
    save.progress.clues = 1;
    save.day.completed = false;
    save.day.scenesPlayed = 3;
    save.day.reviewCleared = true;
    save.boss = null;
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/#/boss');
  await expect(page.locator('[data-action="boss-start"]')).toBeVisible();
}

test('新游戏：3 幕 → 结算 → 快进后出现 12 张到期复习', async ({ page }) => {
  await startNewGame(page);
  await expect(page.locator('.daily-card')).toContainText('0/12');
  await page.locator('[data-action="story"]').click();
  await expect(page.locator('[data-action="contract-accept"]')).toBeVisible();

  for (let scene = 0; scene < 3; scene += 1) {
    await playScene(page);
  }

  await expect(page.getByRole('heading', { name: '今日航程 · 完成' })).toBeVisible();
  expect(await page.evaluate(() => window.__shici.save.progress.sceneIndex)).toBe(3);
  expect(await page.evaluate(() => window.__shici.save.day.completed)).toBe(true);

  await page.locator('[data-action="fast-forward"]').click();
  await expectHome(page);
  await expect(page.locator('.due-line')).toContainText('12');
  await page.locator('[data-action="review"]').click();
  await expect(page.getByRole('heading', { name: '到期复习' })).toBeVisible();
  await expect(page.locator('.review-card')).toContainText('1 / 12');
});

test('演示存档：复习优先，清空 12 张后才进入契约', async ({ page }) => {
  await loadDemo(page);
  await expect(page.locator('.daily-card')).toContainText('先清完复习');
  await page.locator('[data-action="review"]').click();
  await expect(page.getByRole('heading', { name: '到期复习' })).toBeVisible();
  await expect(page.locator('.review-card')).toContainText('1 / 12');

  await finishReview(page);
  await expect(page.locator('.finish-block')).toContainText('复习清空');
  await page.locator('[data-action="review-finish"]').click();
  await expect(page.locator('[data-action="contract-accept"]')).toBeVisible();
  await expect(page.locator('.story-kicker')).toContainText('认义契约');
});

test('已认识：验证通过后跳过，词书可以撤销', async ({ page }) => {
  await seedStory(page);
  await page.locator('[data-action="contract-skip"]').click();
  const lemma = await page.evaluate(() => {
    const app = window.__shici;
    return app.story.contractQueue[app.story.contractIndex].lemma;
  });
  await page.locator('#verify-answer').fill(lemma);
  await page.locator('#verify-form button[type="submit"]').click();
  await expect(page.locator('#toast')).toContainText('已把');
  expect(await page.evaluate(() => Object.values(window.__shici.save.words).some((word) => word.known))).toBe(true);

  await page.goto('/#/words');
  await page.locator('[data-filter="known"]').click();
  await expect(page.locator('.word-card.known')).toHaveCount(1);
  await page.locator('[data-undo]').first().click();
  await expect(page.locator('#toast')).toContainText('已撤销');
  expect(await page.evaluate(() => Object.values(window.__shici.save.words).some((word) => word.known))).toBe(false);
});

test('失败前进：答错扣 HP、SRS 回 1 天，剧情仍到下一幕', async ({ page }) => {
  await seedStory(page);
  await finishContracts(page);
  const before = await page.evaluate(() => window.__shici.save.progress.hp);
  await page.locator('.action-card').first().click();
  await page.locator('#action-answer').fill('not-the-word');
  await page.locator('#action-form button[type="submit"]').click();

  await expect(page.locator('.outcome.bad')).toBeVisible();
  const after = await page.evaluate(() => window.__shici.save.progress.hp);
  expect(after).toBeLessThan(before);
  const wordState = await page.evaluate(() => {
    const app = window.__shici;
    const scene = app.content.chapter.scenes[app.save.progress.sceneIndex];
    const action = scene.actions.find((entry) => entry.id === app.story.selectedAction);
    const word = app.save.words[action.target_word];
    return { stage: word.stage, spellingStage: word.spelling.stage, dueOn: word.dueOn, today: app.today };
  });
  expect(wordState.stage).toBe(0);
  expect(wordState.spellingStage).toBe(0);
  expect(wordState.dueOn > wordState.today).toBe(true);

  await page.locator('[data-action="outcome-next"]').click();
  await expect(page.locator('.hud-title')).toContainText('第 5 幕');
  expect(await page.evaluate(() => window.__shici.save.progress.sceneIndex)).toBe(4);
});

test('硬闯：不测试单词，固定 HP -15，仍然推进', async ({ page }) => {
  await seedStory(page);
  await finishContracts(page);
  const before = await page.evaluate(() => window.__shici.save.progress.hp);
  await page.locator('[data-action="hard-blast"]').click();
  await expect(page.locator('.outcome.bad')).toBeVisible();
  expect(await page.evaluate(() => window.__shici.save.progress.hp)).toBe(before - 15);
  await page.locator('[data-action="outcome-next"]').click();
  expect(await page.evaluate(() => window.__shici.save.progress.sceneIndex)).toBe(4);
});

test('拼写加试：认义对后可以加试拼写，词书出现双轨徽章', async ({ page }) => {
  await loadDemo(page);
  await page.locator('[data-action="review"]').click();
  await expect(page.getByRole('heading', { name: '到期复习' })).toBeVisible();
  await pickOption(page, await reviewMeaning(page));
  await expect(page.locator('[data-action="spelling-bonus"]')).toBeVisible();
  const beforeSpelling = await page.evaluate(() => {
    const app = window.__shici;
    const id = app.review.queue[app.review.index];
    return app.save.words[id].spelling.stage;
  });
  await page.locator('[data-action="spelling-bonus"]').click();
  const lemma = await page.evaluate(() => {
    const app = window.__shici;
    const id = app.review.queue[app.review.index];
    return app.byId[id].lemma;
  });
  await page.locator('#spelling-answer').fill(lemma);
  await page.locator('#spelling-bonus-form button[type="submit"]').click();
  await expect(page.locator('.bonus-box.ok')).toContainText('拼写 +1');
  const spellingStage = await page.evaluate(() => {
    const app = window.__shici;
    const id = app.review.queue[app.review.index];
    return app.save.words[id].spelling.stage;
  });
  expect(spellingStage).toBe(Math.min(beforeSpelling + 1, 2));

  await page.goto('/#/words');
  await page.locator('[data-filter="recognized"]').click();
  await expect(page.locator('.word-card').first()).toContainText('认义');
  await expect(page.locator('.word-badge').first()).toBeVisible();
});

test('BOSS：五问答对三问净化，结算显示已完成', async ({ page }) => {
  await seedBoss(page);
  await page.locator('[data-action="boss-start"]').click();
  for (let index = 0; index < 5; index += 1) {
    const check = await page.evaluate(() => {
      const app = window.__shici;
      const id = app.content.chapter.boss.check_word_ids[app.save.boss.index];
      return {
        lemma: app.byId[id].lemma,
        mode: app.content.chapter.boss.check_types?.[app.save.boss.index] || 'spell'
      };
    });
    if (check.mode === 'recognize') {
      const options = page.locator('.lemma-option');
      const count = await options.count();
      let clicked = false;
      for (let i = 0; i < count; i += 1) {
        if ((await options.nth(i).innerText()).trim() === check.lemma) {
          await options.nth(i).click();
          clicked = true;
          break;
        }
      }
      expect(clicked).toBe(true);
    } else {
      await page.locator('#boss-answer').fill(check.lemma);
      await page.locator('#boss-form button[type="submit"]').click();
    }
    if (await page.evaluate(() => window.__shici.save.boss.done)) break;
    await page.locator('[data-action="boss-next"]').click();
  }
  await expect(page.getByRole('heading', { name: '雾从中间裂开了。' })).toBeVisible();
  expect(await page.evaluate(() => window.__shici.save.progress.chapterDone)).toBe(true);
  await page.locator('[data-action="boss-summary"]').click();
  await expect(page.getByRole('heading', { name: '雾港 · 已净化' })).toBeVisible();
});

test('设置与重置：减少动效生效，清档回到封面', async ({ page }) => {
  await loadDemo(page);
  await page.getByRole('link', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '航程偏好' })).toBeVisible();

  await page.locator('#reduce-motion').check({ force: true });
  await expect(page.locator('body')).toHaveClass(/reduce-motion/);
  await page.locator('#anchor-time').fill('07:30');
  await page.locator('#anchor-time').blur();
  expect(await page.evaluate(() => window.__shici.save.settings.anchor)).toBe('07:30');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-action="reset-save"]').click();
  await expect(page.locator('.cover-title')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('shici.fog-harbor.save.v1'))).toBeNull();
});

test.describe('移动端', () => {
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('首页 CTA、复习选项、剧情契约都在首屏且无横向溢出', async ({ page }) => {
    await loadDemo(page);
    await expect(page.locator('[data-action="review"]')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    await page.locator('[data-action="review"]').click();
    await expect(page.locator('.word-lemma')).toBeVisible();
    await expect(page.locator('.option').last()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    await page.evaluate((key) => {
      const save = JSON.parse(localStorage.getItem(key));
      for (const userWord of Object.values(save.words)) userWord.dueOn = '2099-01-01';
      save.progress.sceneIndex = 3;
      save.day.reviewCleared = true;
      save.day.scenesPlayed = 0;
      save.day.completed = false;
      localStorage.setItem(key, JSON.stringify(save));
    }, SAVE_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    await page.goto('/#/story');
    await expect(page.locator('[data-action="contract-accept"]')).toBeInViewport();
    await expect(page.locator('[data-action="contract-skip"]')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
});
