import { foePortraitSVG, worldSVG } from './art.js';
import { playCue } from './audio.js';
import {
  createDemoSave,
  createNewSave,
  clearSave,
  loadSave,
  writeSave
} from './store.js';
import * as G from './game.js';
import * as S from './srs.js';
import { firstLetterHint } from './srs.js';
import {
  chip,
  esc,
  formatDateCN,
  gameIcon,
  icon,
  progressBar,
  ring,
  statChip,
  weekdayCN
} from './ui.js';

const app = {
  content: null,
  byId: {},
  save: null,
  today: null,
  story: null,
  review: null,
  boss: null,
  mapSelection: null,
  wordFilter: 'all',
  toastTimer: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];


function saveNow() {
  if (app.save) {
    app.today = G.todayOf(app.save);
    writeSave(app.save);
  }
}

function go(route) {
  const next = `#/${route}`;
  if (location.hash === next) render();
  else location.hash = next;
}

function routeName() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  if (!raw) return app.save ? 'home' : 'cover';
  return raw;
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function soundEnabled() {
  return app.save ? app.save.settings?.sound !== false : false;
}

function cue(name) {
  playCue(name, soundEnabled());
}

/** 鼠标/触摸移动时的 2–3 层视差；不改变布局，减少动效时自动停用。 */
function bindParallax(container) {
  if (!container) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const frame = $('.world-frame', container) || container;
  let frameId = 0;
  let pending = null;

  const apply = () => {
    frameId = 0;
    if (!pending) return;
    frame.style.setProperty('--px', pending.x.toFixed(3));
    frame.style.setProperty('--py', pending.y.toFixed(3));
    pending = null;
  };

  container.addEventListener(
    'pointermove',
    (event) => {
      if (document.body.classList.contains('reduce-motion')) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pending = {
        x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)),
        y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
      };
      if (!frameId) frameId = requestAnimationFrame(apply);
    },
    { passive: true }
  );
  container.addEventListener('pointerleave', () => {
    pending = { x: 0, y: 0 };
    if (!frameId) frameId = requestAnimationFrame(apply);
  });
}

function dayNumber() {
  if (!app.save) return 1;
  return Math.max(1, app.save.history.length + (app.save.day.completed ? 0 : 1));
}

function typeLabel(type) {
  return { spell: '法术', item: '道具', check: '检定' }[type] || '词卡';
}

function typeIcon(type) {
  return { spell: 'spark', item: 'bag', check: 'eye' }[type] || 'spark';
}

function sceneState(index) {
  if (!app.save) return 'locked';
  if (app.save.progress.chapterDone) return 'done';
  if (index < app.save.progress.sceneIndex) return 'done';
  if (index === app.save.progress.sceneIndex) return 'current';
  return 'locked';
}

function daysUntil(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d, 12).getTime();
  const today = app.today || G.todayOf(app.save);
  const [ty, tm, td] = today.split('-').map(Number);
  const base = new Date(ty, tm - 1, td, 12).getTime();
  const diff = Math.round((target - base) / 86400000);
  if (diff < 0) return '已逾期';
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${diff} 天后`;
}

/* ------------------------------------------------------------------ */
/* 壳                                                                  */
/* ------------------------------------------------------------------ */

function topbar(active) {
  const save = app.save;
  return `
    <header class="topbar">
      <a class="brand" href="#/home" aria-label="回到今日航程">
        <span class="brand-seal">拾</span>
        <span class="brand-text">拾词者<em>雾港</em></span>
      </a>
      <nav class="nav" aria-label="主导航">
        <a class="nav-link ${active === 'home' ? 'active' : ''}" href="#/home">今日</a>
        <a class="nav-link ${active === 'words' ? 'active' : ''}" href="#/words">词书</a>
        <a class="nav-link ${active === 'settings' ? 'active' : ''}" href="#/settings">设置</a>
      </nav>
      <div class="top-meta">
        <span class="top-chip">${icon('flame')}<b>${save.progress.streak}</b> 天</span>
        <span class="top-chip ${save.progress.hp <= 30 ? 'is-danger' : ''}">${icon('shield')}<b>${save.progress.hp}</b> HP</span>
        <span class="top-chip top-clue">${icon('key')}<b>${save.progress.clues}</b>/3</span>
      </div>
    </header>`;
}

function stageHud(scene, extra = '') {
  const save = app.save;
  const hp = save.progress.hp;
  return `
    <header class="stage-hud">
      <a class="icon-btn" href="#/home" aria-label="回到今日">${icon('back')}</a>
      <div class="hud-title">
        <span>第一章 · 雾港</span>
        <b>${scene ? `第 ${scene.ord} 幕 · ${esc(scene.title)}` : extra}</b>
      </div>
      <div class="hud-stats">
        <div class="hp-meter ${hp <= 30 ? 'is-danger' : ''}" title="生命值 ${hp}/100">
          ${icon('shield')}
          <div class="hp-track"><span style="width:${hp}%"></span></div>
          <b>${hp}</b>
        </div>
        <span class="hud-chip">${icon('key')}<b>${save.progress.clues}</b>/3</span>
        <span class="hud-chip hud-streak">${icon('flame')}<b>${save.progress.streak}</b> 天</span>
      </div>
    </header>`;
}

/* ------------------------------------------------------------------ */
/* 封面                                                                */
/* ------------------------------------------------------------------ */

function renderCover() {
  const hasSave = Boolean(app.save);
  const root = $('#app');
  root.innerHTML = `
    <main class="cover">
      ${worldSVG({ camera: 'map', time: 'night', weather: 'fog', className: 'cover-art', fit: 'slice' })}
      <div class="cover-veil"></div>
      <div class="cover-inner">
        <p class="eyebrow">CET-4 · 单词跑团 · 第一章原型</p>
        <h1 class="cover-title">拾词者</h1>
        <p class="cover-sub">雾 港</p>
        <p class="cover-tagline">每一道门、每一场雾、每一个敌人，都只能用单词解决。</p>
        <div class="cover-actions">
          <button class="btn btn-primary btn-lg" data-action="${hasSave ? 'continue' : 'new-game'}">${hasSave ? '继续航程' : '开始新的航程'}</button>
          <button class="btn btn-lg" data-action="demo-game">体验演示存档</button>
        </div>
        <p class="cover-note">15 分钟一天 · 12 个新词 · 3 幕剧情 · 本地存档</p>
      </div>
      <footer class="cover-foot">
        <span>第一章 · 雾港</span>
        <span>原型 v0.1 · 一款用英语玩的跑团游戏</span>
      </footer>
    </main>`;

  $('[data-action="new-game"]')?.addEventListener('click', () => {
    if (hasSave && !window.confirm('开始新的航程会覆盖当前存档，继续吗？')) return;
    app.save = createNewSave(new Date());
    app.today = G.todayOf(app.save);
    saveNow();
    app.story = null;
    app.review = null;
    app.boss = null;
    go('home');
  });
  $('[data-action="continue"]')?.addEventListener('click', () => go('home'));
  $('[data-action="demo-game"]')?.addEventListener('click', () => {
    if (hasSave && !window.confirm('演示存档会覆盖当前存档，继续吗？')) return;
    app.save = createDemoSave(new Date(), app.content.words);
    app.today = G.todayOf(app.save);
    saveNow();
    app.story = null;
    app.review = null;
    app.boss = null;
    toast('已载入演示存档：今天有 12 张到期卡。');
    go('home');
  });
  bindParallax($('.cover'));
}

/* ------------------------------------------------------------------ */
/* 首页                                                                */
/* ------------------------------------------------------------------ */

/** 地图上的航线：全图一条淡线，已走过的一段点亮。坐标与节点共用百分比。 */
function mapRouteSVG(chapter, save) {
  const points = chapter.scenes.map((scene) => [scene.map.x, scene.map.y]);
  const all = [...points, [8, 52]];
  const toPath = (list) => list.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  const count = save.progress.chapterDone
    ? all.length
    : Math.min(save.progress.sceneIndex + 1, points.length);
  const walked = all.slice(0, count);
  return `<svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path class="route-faint" d="${toPath(all)}"/>
    ${walked.length > 1 ? `<path class="route-walked" d="${toPath(walked)}"/>` : ''}
  </svg>`;
}

function renderHome() {
  const { today, plan, due, stats, nextDue } = G.planFor(app.save, app.content);
  app.today = today;
  const save = app.save;
  const chapter = app.content.chapter;
  const introducedToday = S.introducedOn(save, today);
  const scenesPlayed = save.day.scenesPlayed;
  const dueCount = due.length;
  const reviewCleared = dueCount === 0 || save.day.reviewCleared;
  const reviewDone = save.day.reviewCorrect + save.day.reviewWrong;
  const reviewTotal = reviewDone + dueCount;
  const reviewPct = reviewTotal ? (reviewDone / reviewTotal) * 100 : 100;
  const newPct = Math.min(100, (introducedToday / 12) * 100);
  const storyPct = Math.min(100, (scenesPlayed / 3) * 100);
  const chapterDone = save.progress.chapterDone;
  const atBoss = save.progress.sceneIndex >= G.CHAPTER_SCENES && !chapterDone;

  let cta;
  if (save.day.completed) {
    cta = { label: '查看今日战报', action: 'summary', tone: 'ghost' };
  } else if (dueCount > 0 && !reviewCleared) {
    cta = { label: `先清完复习 · ${dueCount} 张`, action: 'review', tone: 'primary' };
  } else if (chapterDone) {
    cta = { label: '第一章已净化 · 回看词书', action: 'words', tone: 'primary' };
  } else if (atBoss) {
    cta = { label: '挑战摆渡人', action: 'boss', tone: 'primary' };
  } else {
    cta = {
      label: save.day.started ? '继续今日航程' : '开始今日航程',
      action: 'story',
      tone: 'primary'
    };
  }

  const dailyTitle = save.day.completed
    ? '今天的雾已经散了。'
    : dueCount > 0 && !reviewCleared
      ? '先清账，再上路。'
      : chapterDone
        ? '雾港已经记住了你。'
        : atBoss
          ? '摆渡人还在雾口。'
          : '雾港还有三幕。';

  const dailyCopy = save.day.completed
    ? `今日复习 ${reviewDone} 张，剧情 ${scenesPlayed} 幕。明天还有 ${nextDue.tomorrowCount} 张卡到期。`
    : dueCount > 0 && !reviewCleared
      ? `记忆神殿里还压着 ${dueCount} 张到期卡。清完才会解锁新词。`
      : chapterDone
        ? '第一章 48 个词已经全部契约。可以继续复习，或等下一章开放。'
        : atBoss
          ? '12 幕已经走完。五问之后，雾才会裂开。'
          : `今天有 ${plan.newWords.length} 个新词、${Math.max(0, 3 - scenesPlayed)} 幕剧情，约 ${plan.estimatedMinutes} 分钟。`;

  const labelFrom = chapterDone ? 9 : Math.max(0, Math.min(save.progress.sceneIndex, 12) - 2);
  const labelTo = chapterDone ? 12 : Math.min(12, save.progress.sceneIndex + 1);

  const root = $('#app');
  root.innerHTML = `
    <main class="screen home">
      ${topbar('home')}
      <div class="home-wrap">
        <div class="home-head">
          <div>
            <p class="eyebrow">第 ${dayNumber()} 天 · ${weekdayCN(today)} · ${formatDateCN(today)}</p>
            <h1>今日航程</h1>
          </div>
          <p class="home-sub">${chapterDone ? '第一章 · 雾港 已净化' : `第一章 · 雾港 · ${Math.min(save.progress.sceneIndex, 12)}/12 幕`}</p>
        </div>

        <section class="home-hero">
          <div class="panel daily-card">
            <div class="panel-head">
              <span class="label">${icon('clock')} 15 分钟一天</span>
              <span class="badge ${dueCount > 65 ? 'warn' : ''}">${plan.estimatedMinutes} 分钟</span>
            </div>
            <h2 class="daily-title">${dailyTitle}</h2>
            <p class="daily-copy">${dailyCopy}</p>
            <div class="rings">
              ${ring({ percent: reviewPct, label: '复习', value: `${reviewDone}/${reviewTotal || 0}`, sub: '到期卡' })}
              ${ring({ percent: newPct, label: '新词', value: `${introducedToday}/12`, sub: '契约' })}
              ${ring({ percent: storyPct, label: '剧情', value: `${scenesPlayed}/3`, sub: '幕' })}
            </div>
            <div class="due-line ${dueCount ? 'has-due' : ''}">
              ${icon('eye')}
              <span>${dueCount ? `记忆神殿有 <b>${dueCount}</b> 张卡到期` : '记忆神殿今天没有到期卡'}</span>
              ${dueCount ? `<em>复习优先</em>` : ''}
            </div>
            <div class="cta-row">
              <button class="btn ${cta.tone === 'primary' ? 'btn-primary' : 'btn-ghost'} btn-lg" data-action="${cta.action}">${cta.label}</button>
              ${save.day.completed ? '<button class="btn btn-ghost" data-action="fast-forward">快进一天（演示）</button>' : ''}
            </div>
            <p class="daily-foot">${chapterDone ? '继续复习可以守住已掌握的词。' : '失败不卡关，只改写下一次相遇。'}</p>
          </div>

          <div class="panel map-panel">
            <div class="panel-head">
              <span class="label">${icon('map')} 雾港 · 章节地图</span>
              <span class="badge">${Math.min(save.progress.sceneIndex, 12)}/12 幕</span>
            </div>
            <div class="map-canvas" id="map-canvas">
              ${worldSVG({ camera: 'map', time: 'night', weather: 'fog', className: 'map-art', fit: 'meet' })}
              ${mapRouteSVG(chapter, save)}
              <div class="map-nodes">
                ${chapter.scenes
                  .map((scene, index) => {
                    const state = sceneState(index);
                    const labelled = index >= labelFrom && index <= labelTo;
                    const labelAbove = scene.map.y >= 74;
                    return `<button class="map-node ${state} ${labelled ? 'label-on' : ''} ${labelAbove ? 'label-above' : ''}" style="left:${scene.map.x}%;top:${scene.map.y}%" data-scene="${index}" aria-label="第 ${scene.ord} 幕 ${esc(scene.title)}">
                      <span>${scene.ord}</span><em>${esc(scene.title)}</em>
                    </button>`;
                  })
                  .join('')}
                <button class="map-node boss ${chapterDone ? 'done' : atBoss ? 'current' : 'locked'} ${chapterDone || atBoss ? 'label-on' : ''}" style="left:8%;top:52%" data-scene="boss" aria-label="章节终局 摆渡人的五问">
                  <span>渡</span><em>摆渡人</em>
                </button>
              </div>
            </div>
            <div class="map-detail" id="map-detail">${defaultMapDetail()}</div>
          </div>
        </section>

        <section class="stats-row" aria-label="进度数据">
          ${statCard('flame', save.progress.streak, '连续天数', '每天完成 3 幕 + 清空到期', 'warm')}
          ${statCard('shield', save.progress.hp, '生命值', '每章 100 · 失败扣血', save.progress.hp <= 30 ? 'danger' : '')}
          ${statCard('key', `${save.progress.clues}/3`, '线索', '影响支线与结局文本', '')}
          ${statCard('star', `${stats.mastered}/48`, '双证掌握', `会认不会写 ${stats.recognizedOnly} · 会拼 ${stats.spellingConfirmed}`, 'gold')}
        </section>

        <section class="panel chapter-strip">
          <div class="chapter current">
            <span class="ch-num">01</span>
            <div><b>雾港</b><small>出发、生存、方向</small></div>
            <span class="ch-progress">${chapterDone ? '已净化' : `${Math.min(save.progress.sceneIndex, 12)}/12`}</span>
          </div>
          ${[
            ['02', '回声集市', '交易、日常、人际'],
            ['03', '钟楼学园', '学习、工作、时间'],
            ['04', '静默图书馆', '知识、表达、证据'],
            ['05', '风蚀荒原', '环境、社会、变化'],
            ['06', '词塔之巅', '冲突、抉择、收束']
          ]
            .map(
              ([num, title, theme]) => `<div class="chapter locked">
                <span class="ch-num">${num}</span>
                <div><b>${title}</b><small>${theme}</small></div>
                <span class="ch-progress">${icon('lock')}</span>
              </div>`
            )
            .join('')}
        </section>
      </div>
    </main>`;

  bindHome();
}

function defaultMapDetail() {
  const save = app.save;
  const index = save.progress.sceneIndex;
  const scene = app.content.chapter.scenes[Math.min(index, 11)];
  if (save.progress.chapterDone) {
    return `<b>雾港 · 已净化</b><span>摆渡人的五问已经过去。十二幕的词都留在了你的词库里。</span>`;
  }
  if (index >= 12) {
    return `<b>摆渡人的五问</b><span>五张卡，答对三张即可净化本章。答错扣 HP，但不会卡关。</span>`;
  }
  return `<b>第 ${scene.ord} 幕 · ${esc(scene.title)}</b><span>${esc(scene.narration)}</span>`;
}

function statCard(iconName, value, label, sub, tone) {
  return `<div class="panel stat-card ${tone ? `tone-${tone}` : ''}">
    <span class="stat-icon">${icon(iconName)}</span>
    <div class="stat-body"><b>${value}</b><small>${label}</small></div>
    <p>${sub}</p>
  </div>`;
}

function bindHome() {
  $('[data-action="summary"]')?.addEventListener('click', () => go('summary'));
  $('[data-action="review"]')?.addEventListener('click', () => go('review'));
  $('[data-action="story"]')?.addEventListener('click', () => go('story'));
  $('[data-action="boss"]')?.addEventListener('click', () => go('boss'));
  $('[data-action="words"]')?.addEventListener('click', () => go('words'));
  $('[data-action="fast-forward"]')?.addEventListener('click', () => {
    G.advanceDay(app.save);
    saveNow();
    toast(`已快进到 ${formatDateCN(app.today)}。`);
    go('home');
  });
  $$('.map-node').forEach((node) => {
    node.addEventListener('click', () => {
      const key = node.dataset.scene;
      const detail = $('#map-detail');
      if (!detail) return;
      if (key === 'boss') {
        detail.innerHTML = `<b>摆渡人的五问</b><span>五张卡，答对三张即可净化本章。答错扣 HP，但不会卡关。</span>`;
        return;
      }
      const scene = app.content.chapter.scenes[Number(key)];
      if (!scene) return;
      const state = sceneState(Number(key));
      const stateText = state === 'done' ? '已经走过' : state === 'current' ? '正在这里' : '雾里还看不见';
      detail.innerHTML = `<b>第 ${scene.ord} 幕 · ${esc(scene.title)}</b><span>${state === 'locked' ? stateText : esc(scene.narration)}</span><em>${stateText}</em>`;
    });
  });
  bindParallax($('#map-canvas'));
}

/* ------------------------------------------------------------------ */
/* 复习                                                                */
/* ------------------------------------------------------------------ */

function reviewQueue() {
  const today = G.todayOf(app.save);
  const byId = G.wordsById(app.content);
  return S.dueWords(app.save, today, byId);
}

function renderReview() {
  if (!app.save) return renderCover();
  if (app.save.day.completed) return go('summary');
  const queue = reviewQueue();
  if (queue.length === 0) {
    app.save.day.reviewCleared = true;
    saveNow();
    return go('story');
  }
  const keep =
    app.review &&
    app.review.date === app.today &&
    Array.isArray(app.review.queue) &&
    app.review.queue.length > 0 &&
    queue.some((entry) => entry.id === app.review.queue[0]);
  if (!keep) {
    app.review = {
      date: app.today,
      queue: queue.map((entry) => entry.id),
      index: 0,
      feedback: null,
      bonus: null,
      correct: 0,
      wrong: 0,
      finished: false
    };
  } else {
    const remaining = new Set(queue.map((entry) => entry.id));
    app.review.queue = app.review.queue.filter((id) => remaining.has(id));
    if (app.review.index >= app.review.queue.length) {
      app.review.index = 0;
      app.review.feedback = null;
      app.review.bonus = null;
    }
  }

  const root = $('#app');
  root.innerHTML = `
    <main class="screen stage-screen review-screen">
      ${worldSVG({ camera: 'lighthouse', time: 'night', weather: 'fog', className: 'stage-art' })}
      <div class="stage-veil"></div>
      ${stageHud(null, '记忆神殿 · 复习')}
      <div class="review-wrap">
        <div class="review-head">
          <div><p class="eyebrow">记忆神殿</p><h1>到期复习</h1></div>
          <a class="text-link" href="#/home">先离开</a>
        </div>
        ${progressBar(((app.review.index + (app.review.feedback ? 1 : 0)) / app.review.queue.length) * 100)}
        <div class="panel review-card" id="review-body"></div>
      </div>
    </main>`;
  paintReview();
}

function paintReview() {
  const body = $('#review-body');
  if (!body) return;
  const state = app.review;
  if (!state) return;
  if (state.finished) {
    body.innerHTML = `
      <div class="finish-block">
        <span class="finish-mark">${icon('check')}</span>
        <p class="eyebrow">复习清空</p>
        <h2>记忆神殿安静了。</h2>
        <p class="finish-copy">答对 ${state.correct} 张，答错 ${state.wrong} 张。新词配额已经解锁。</p>
        <div class="finish-stats">
          ${statChip('check', state.correct, '认义答对')}
          ${statChip('x', state.wrong, '认义答错', 'danger')}
          ${statChip('spark', app.save.day.spellingBonusCorrect || 0, '拼写加试对', 'warm')}
          ${statChip('clock', app.save.progress.streak, '连续天数', 'warm')}
        </div>
        <button class="btn btn-primary btn-lg" data-action="review-finish">进入剧情</button>
      </div>`;
    $('[data-action="review-finish"]')?.addEventListener('click', () => {
      app.save.day.reviewCleared = true;
      saveNow();
      go('story');
    });
    return;
  }

  const wordId = state.queue[state.index];
  const word = app.byId[wordId];
  if (!word) {
    state.index += 1;
    if (state.index >= state.queue.length) state.finished = true;
    paintReview();
    return;
  }
  const feedback = state.feedback;
  const currentWord = app.save.words[word.id];
  const spellingStage = currentWord?.spelling?.stage ?? 0;
  const canBonus = Boolean(feedback?.correct && currentWord && !currentWord.known && spellingStage < 2);
  const options = S.meaningOptions(word, app.content.words, 4, 'review');
  let bonusHtml = '';
  if (state.bonus?.mode === 'input') {
    bonusHtml = `
      <div class="bonus-box">
        <p class="bonus-title">${icon('spark')} 拼写加试 · 写出「${esc(word.meanings[0])}」的英文</p>
        <form id="spelling-bonus-form" autocomplete="off">
          <div class="answer-row">
            <input id="spelling-answer" name="answer" type="text" inputmode="latin" spellcheck="false" autocapitalize="off" placeholder="输入英文…" required autofocus>
            <button class="btn btn-primary" type="submit">提交拼写</button>
          </div>
          <p class="hint-line">${icon('eye')} 加试不扣 HP；答错只把拼写轨回 1 天，认义不变。</p>
        </form>
        <p class="bonus-skip">不想写？直接点下面的「下一张」跳过，不影响认义复习。</p>
      </div>`;
  } else if (state.bonus?.mode === 'result') {
    bonusHtml = `
      <div class="bonus-box ${state.bonus.correct ? 'ok' : 'bad'}">
        <div class="feedback-head">${icon(state.bonus.correct ? 'check' : 'x')}${state.bonus.correct ? '拼写 +1 · 双证前进' : '会认不会写'}</div>
        <p class="feedback-answer">正确拼写：<b>${esc(word.lemma)}</b> ${esc(word.ipa)}</p>
        <p class="feedback-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
        <p class="feedback-note">认义不变；拼写轨现在 ${spellingStage}/2${state.bonus.correct ? '，下次间隔更长了。' : '，下次从 1 天重新来。'}</p>
      </div>`;
  } else if (canBonus) {
    bonusHtml = `<button class="btn btn-ghost" data-action="spelling-bonus">${icon('spark')} 拼写加试 · 写出这个词</button>`;
  }
  const card = `
    <div class="review-topline"><span>${icon('eye')} 认义检定 · 看英文，选中文</span><span>${state.index + 1} / ${state.queue.length}</span></div>
    <div class="word-stage">
      <p class="word-pos">${esc(word.pos)}</p>
      <h1 class="word-lemma">${esc(word.lemma)}</h1>
      <p class="word-ipa">${esc(word.ipa)}</p>
    </div>
    <div class="options" role="group" aria-label="选择中文释义">
      ${options
        .map((option, index) => {
          const isCorrect = option === word.meanings[0];
          let extra = '';
          if (feedback) {
            if (isCorrect) extra = 'correct';
            else if (index === feedback.selected) extra = 'wrong';
          }
          return `<button class="option ${extra}" data-index="${index}" ${feedback ? 'disabled' : ''}>${esc(option)}</button>`;
        })
        .join('')}
    </div>
    ${
      feedback
        ? `<div class="feedback ${feedback.correct ? 'ok' : 'bad'}">
            <div class="feedback-head">${icon(feedback.correct ? 'check' : 'x')}${feedback.correct ? '认义对上了' : '认义差一点'}</div>
            <p class="feedback-answer"><b>${esc(word.lemma)}</b> ${esc(word.ipa)} · ${esc(word.meanings.join('；'))}</p>
            <p class="feedback-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
            <div class="feedback-meta">
              <span>${icon('clock')} 认义下次：${esc(daysUntil(currentWord?.dueOn))}</span>
              <span>${icon('refresh')} 拼写 ${spellingStage}/2</span>
            </div>
            ${bonusHtml}
            <button class="btn btn-primary" data-action="review-next">${state.index + 1 >= state.queue.length ? '完成复习' : '下一张'}</button>
          </div>`
        : `<p class="review-hint">复习不展示例句与词根。想不起来就选一个，答案会摊开。</p>`
    }`;

  body.innerHTML = card;
  if (!feedback) {
    $$('.option', body).forEach((button) => {
      button.addEventListener('click', () => {
        if (state.feedback) return;
        const selected = Number(button.dataset.index);
        const choice = options[selected];
        const correct = choice === word.meanings[0];
        const current = app.save.words[word.id];
        if (current) {
          app.save.words[word.id] = S.review(current, correct, app.today);
        }
        if (correct) {
          app.save.day.reviewCorrect += 1;
          state.correct += 1;
        } else {
          app.save.day.reviewWrong += 1;
          state.wrong += 1;
        }
        if (reviewQueue().length === 0) app.save.day.reviewCleared = true;
        state.feedback = { correct, selected };
        saveNow();
        paintReview();
      });
    });
  } else {
    $('[data-action="spelling-bonus"]')?.addEventListener('click', () => {
      state.bonus = { mode: 'input' };
      paintReview();
    });
    $('#spelling-bonus-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#spelling-answer').value;
      const current = app.save.words[word.id];
      const correct = S.isCorrectAnswer(word, input);
      if (current) {
        app.save.words[word.id] = S.reviewSpelling(current, correct, app.today);
      }
      if (correct) app.save.day.spellingBonusCorrect += 1;
      else app.save.day.spellingBonusWrong += 1;
      state.bonus = { mode: 'result', correct };
      saveNow();
      paintReview();
    });
    $('[data-action="review-next"]')?.addEventListener('click', () => {
      state.index += 1;
      state.feedback = null;
      state.bonus = null;
      if (state.index >= state.queue.length) {
        state.finished = true;
        app.save.day.reviewCleared = true;
        saveNow();
      }
      paintReview();
    });
  }
}

function stageLabel(uw) {
  if (!uw) return '';
  if (uw.known) return '已认识';
  if (uw.stage === 3) return '16 天 · 认义满级';
  return `${[1, 3, 7, 16][uw.stage ?? 0]} 天间隔`;
}

function spellingLabel(uw) {
  if (!uw) return '—';
  if (uw.known) return '已认识';
  const stage = uw.spelling?.stage ?? 0;
  if (stage >= 2) return '会拼';
  return `${[1, 3, 7][stage] ?? 1} 天 / 会认不会写`;
}

/* ------------------------------------------------------------------ */
/* 剧情                                                                */
/* ------------------------------------------------------------------ */

function ensureStoryState(scene) {
  const save = app.save;
  const pending = G.pendingContractWords(save, scene);
  const reset =
    !app.story ||
    app.story.sceneId !== scene.id ||
    (app.story.stage === 'action' && pending.length > 0 && !save.outcome);
  if (reset) {
    app.story = {
      sceneId: scene.id,
      contractQueue: pending.map((id) => app.byId[id]).filter(Boolean),
      contractIndex: 0,
      stage: pending.length === 0 ? 'action' : 'reveal',
      selectedAction: null,
      feedback: null
    };
  }
  if (save.outcome && save.outcome.sceneId === scene.id) {
    app.story.stage = 'resolved';
  }
  if (app.story.stage === 'reveal' && app.story.contractIndex >= app.story.contractQueue.length) {
    app.story.stage = 'action';
  }
  return app.story;
}

function renderStory() {
  if (!app.save) return renderCover();
  if (app.save.day.completed) return go('summary');
  const today = G.todayOf(app.save);
  const byId = G.wordsById(app.content);
  const due = S.dueWords(app.save, today, byId);
  if (due.length > 0 && !app.save.day.reviewCleared) return go('review');
  if (app.save.progress.sceneIndex >= G.CHAPTER_SCENES) return go('boss');
  const scene = G.currentScene(app.save, app.content);
  if (!scene) return go('summary');
  const state = ensureStoryState(scene);
  app.save.day.started = true;
  saveNow();

  const root = $('#app');
  root.innerHTML = `
    <main class="screen stage-screen story-screen">
      ${worldSVG({ camera: scene.art.camera, time: scene.art.time, weather: scene.art.weather, className: 'stage-art' })}
      <div class="stage-veil"></div>
      ${stageHud(scene)}
      <div class="story-wrap">
        <div class="panel story-panel" id="story-panel"></div>
      </div>
    </main>`;
  paintStory(scene, state);
}

function paintStory(scene, state) {
  const panel = $('#story-panel');
  if (!panel) return;
  const save = app.save;
  const words = scene.featured_words.map((id) => app.byId[id]).filter(Boolean);

  if (state.stage === 'reveal') {
    const word = state.contractQueue[state.contractIndex];
    if (!word) {
      state.stage = 'action';
      return paintStory(scene, state);
    }
    const index = state.contractIndex;
    panel.innerHTML = `
      <div class="story-kicker">
        <span>${icon('spark')} 认义契约</span>
        <span>${index + 1} / ${state.contractQueue.length}</span>
      </div>
      <div class="contract-grid">
        <div class="contract-word">
          <p class="word-pos">${esc(word.pos)} · ${typeLabel(word.card_type)}</p>
          <h2 class="contract-lemma">${esc(word.lemma)}</h2>
          <p class="word-ipa">${esc(word.ipa)}</p>
          <p class="contract-meaning">${esc(word.meanings.join('；'))}</p>
          <p class="contract-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
        </div>
        <div class="contract-side">
          <p class="contract-tag">${icon(typeIcon(word.card_type))} ${esc(word.effect_text)}</p>
          <p class="contract-tip">先看一遍，再用它通过一次小测。契约结束后才进入旁白与词行动。</p>
          <div class="contract-actions">
            <button class="btn btn-primary btn-lg" data-action="contract-accept">记住了 · 接受检定</button>
            <button class="btn btn-ghost" data-action="contract-skip">这个词我已经认识</button>
          </div>
        </div>
      </div>`;
    $('[data-action="contract-accept"]')?.addEventListener('click', () => {
      state.stage = 'quiz';
      state.feedback = null;
      paintStory(scene, state);
    });
    $('[data-action="contract-skip"]')?.addEventListener('click', () => {
      state.stage = 'verify';
      state.feedback = null;
      paintStory(scene, state);
    });
    return;
  }

  if (state.stage === 'quiz') {
    const word = state.contractQueue[state.contractIndex];
    const options = S.meaningOptions(word, app.content.words, 4, 'contract');
    panel.innerHTML = `
      <div class="story-kicker"><span>认义检定</span><span>${state.contractIndex + 1} / ${state.contractQueue.length}</span></div>
      <p class="prompt-line">「<b class="inline-lemma">${esc(word.lemma)}</b>」最接近下面哪个意思？</p>
      <div class="options compact">
        ${options.map((option, index) => `<button class="option" data-index="${index}">${esc(option)}</button>`).join('')}
      </div>
      <p class="hint-line">${icon('eye')} 答错不会扣血，但会记录为一次未通过；这个词语仍然会在场景行动里再出现一次。</p>`;
    $$('.option', panel).forEach((button) => {
      button.addEventListener('click', () => {
        const selected = Number(button.dataset.index);
        const correct = options[selected] === word.meanings[0];
        G.contractWord(app.save, app.content, word.id, correct, app.today);
        state.feedback = { correct, word, selected };
        state.stage = 'contract-feedback';
        saveNow();
        paintStory(scene, state);
      });
    });
    return;
  }

  if (state.stage === 'contract-feedback') {
    const { correct, word } = state.feedback;
    panel.innerHTML = `
      <div class="story-kicker"><span>认义检定</span><span>${state.contractIndex + 1} / ${state.contractQueue.length}</span></div>
      <div class="feedback ${correct ? 'ok' : 'bad'}">
        <div class="feedback-head">${icon(correct ? 'check' : 'x')}${correct ? '契约成立' : '契约没有回应'}</div>
        <p class="feedback-answer"><b>${esc(word.lemma)}</b> ${esc(word.ipa)} · ${esc(word.meanings.join('；'))}</p>
        <p class="feedback-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
        <div class="feedback-meta"><span>${icon('clock')} 明日复习</span><span>${icon('refresh')} 1 天间隔</span></div>
        <button class="btn btn-primary" data-action="contract-next">${state.contractIndex + 1 >= state.contractQueue.length ? '进入这一幕' : '下一个词'}</button>
      </div>`;
    $('[data-action="contract-next"]')?.addEventListener('click', () => {
      state.contractIndex += 1;
      state.stage = state.contractIndex >= state.contractQueue.length ? 'action' : 'reveal';
      state.feedback = null;
      paintStory(scene, state);
    });
    return;
  }

  if (state.stage === 'verify') {
    const word = state.contractQueue[state.contractIndex];
    panel.innerHTML = `
      <div class="story-kicker"><span>拼写验证 · 已认识</span><span>${state.contractIndex + 1} / ${state.contractQueue.length}</span></div>
      <p class="prompt-line">看中文，写出英文。验证通过后，这个词不进入复习队列。</p>
      <div class="verify-meaning">${esc(word.meanings.join('；'))}</div>
      <form class="answer-form" id="verify-form" autocomplete="off">
        <label for="verify-answer">英文单词</label>
        <div class="answer-row">
          <input id="verify-answer" name="answer" type="text" inputmode="latin" spellcheck="false" autocapitalize="off" placeholder="输入英文…" required>
          <button class="btn btn-primary" type="submit">验证</button>
        </div>
        <p class="hint-line">${icon('eye')} 验证失败不会扣血，会照常进入契约。</p>
      </form>
      <button class="btn btn-ghost" data-action="verify-cancel">先不跳过</button>`;
    $('#verify-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#verify-answer').value;
      if (S.isCorrectAnswer(word, input)) {
        G.skipKnownWord(app.save, app.content, word.id, app.today);
        saveNow();
        toast(`已把 ${word.lemma} 移入词书 · 已认识`);
        state.contractIndex += 1;
        state.stage = state.contractIndex >= state.contractQueue.length ? 'action' : 'reveal';
        state.feedback = null;
        paintStory(scene, state);
      } else {
        state.stage = 'verify-feedback';
        state.feedback = { word, input };
        paintStory(scene, state);
      }
    });
    $('[data-action="verify-cancel"]')?.addEventListener('click', () => {
      state.stage = 'reveal';
      paintStory(scene, state);
    });
    return;
  }

  if (state.stage === 'verify-feedback') {
    const { word } = state.feedback;
    panel.innerHTML = `
      <div class="story-kicker"><span>拼写验证 · 已认识</span><span>没有对上</span></div>
      <div class="feedback bad">
        <div class="feedback-head">${icon('x')}还没有那么熟</div>
        <p class="feedback-answer">正确拼写：<b>${esc(word.lemma)}</b> ${esc(word.ipa)}</p>
        <p class="feedback-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
        <p class="feedback-note">先交给记忆神殿吧。契约仍按 1 天间隔进入复习。</p>
        <button class="btn btn-primary" data-action="verify-to-quiz">进入契约</button>
      </div>`;
    $('[data-action="verify-to-quiz"]')?.addEventListener('click', () => {
      state.stage = 'quiz';
      state.feedback = null;
      paintStory(scene, state);
    });
    return;
  }

  if (state.stage === 'action') {
    const actions = G.availableActions(app.save, scene);
    const selected = state.selectedAction
      ? actions.find((action) => action.id === state.selectedAction)
      : null;
    const knownTargets = scene.actions.length - actions.length;
    panel.innerHTML = `
      <div class="story-kicker"><span>${icon('map')} 第 ${scene.ord} 幕 · ${esc(scene.title)}</span><span>${knownTargets ? `${knownTargets} 个词已认识` : '拼写检定'}</span></div>
      <p class="narration">${esc(scene.narration)}</p>
      ${
        actions.length
          ? `<div class="action-list">
              ${actions
                .map((action) => {
                  const word = app.byId[action.target_word];
                  return `<button class="action-card ${selected?.id === action.id ? 'selected' : ''}" data-action="select-action" data-id="${action.id}">
                    <span class="action-icon">${icon(typeIcon(action.card_type))}</span>
                    <span class="action-main"><b>${esc(word.meanings[0])}</b><small>${esc(word.effect_text)}</small></span>
                    <span class="action-meta">${typeLabel(action.card_type)} · 拼出 · 难度 ${'◆'.repeat(action.difficulty || 1)}</span>
                  </button>`;
                })
                .join('')}
            </div>`
          : `<p class="hint-line">${icon('eye')} 这一幕的词都被标为“已认识”，只能硬闯。</p>`
      }
      ${
        selected
          ? `<form class="answer-form" id="action-form" autocomplete="off">
              <label for="action-answer">${esc(actionPrompt(selected, scene))}</label>
              <div class="answer-row">
                <input id="action-answer" name="answer" type="text" inputmode="latin" spellcheck="false" autocapitalize="off" placeholder="说出这张卡的英文…" required autofocus>
                <button class="btn btn-primary" type="submit">落词</button>
              </div>
              <p class="hint-line">${icon('eye')} 提示：${esc(firstLetterHint(app.byId[selected.target_word]))} · 卡面不显示英文</p>
            </form>`
          : `<p class="choose-hint">${actions.length ? '选择一张词卡。卡面只写中文语义与效果，英文要你自己回忆。' : ''}</p>`
      }
      <div class="story-footer">
        <button class="btn btn-ghost btn-sm" data-action="hard-blast">硬闯 · 不测试单词，HP -15</button>
        <span class="story-foot-note">失败会回 1 天间隔，但剧情永远有下一拍。</span>
      </div>`;
    $$('[data-action="select-action"]', panel).forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedAction = button.dataset.id;
        paintStory(scene, state);
      });
    });
    $('#action-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#action-answer').value;
      G.performAction(app.save, app.content, scene, selected, input, app.today);
      state.stage = 'resolved';
      state.feedback = null;
      saveNow();
      paintStory(scene, state);
    });
    $('[data-action="hard-blast"]')?.addEventListener('click', () => {
      G.hardBlast(app.save, scene, app.today);
      state.stage = 'resolved';
      state.feedback = null;
      saveNow();
      paintStory(scene, state);
    });
    return;
  }

  if (state.stage === 'resolved') {
    const outcome = app.save.outcome;
    if (!outcome) {
      state.stage = 'action';
      return paintStory(scene, state);
    }
    const word = outcome.wordId ? app.byId[outcome.wordId] : null;
    const battlePending = Boolean(scene.battle && !app.save.battle?.done);
    panel.innerHTML = `
      <div class="story-kicker"><span>${icon(outcome.correct ? 'spark' : 'flame')} 结算</span><span>第 ${scene.ord} 幕 · ${esc(scene.title)}</span></div>
      <div class="outcome ${outcome.correct ? 'ok' : 'bad'}">
        <div class="outcome-head">${icon(outcome.correct ? 'check' : 'x')}<span>${outcome.correct ? '拼写检定成功' : '拼写检定失败'}</span></div>
        <p class="outcome-text">${esc(outcome.text)}</p>
        <div class="outcome-chips">
          ${outcome.effectMessage ? chip(esc(outcome.effectMessage), 'ok') : ''}
          ${outcome.costMessage ? chip(esc(outcome.costMessage), outcome.exhausted ? 'danger' : 'warn') : ''}
          ${outcome.hard ? chip('硬闯', 'warn') : ''}
        </div>
        ${
          word
            ? `<p class="outcome-word">这张卡：<b>${esc(word.lemma)}</b> ${esc(word.ipa)} · ${esc(word.meanings.join('；'))}</p>`
            : `<p class="outcome-word">你没有碰任何一张词卡。</p>`
        }
        <div class="outcome-foot">
          <span>${outcome.correct ? '剧情向前推进。' : '剧情仍会向前。失败只改写下一次相遇。'}</span>
          <div class="outcome-actions">
            ${
              battlePending
                ? `<button class="btn btn-primary" data-action="start-battle">${app.save.battle ? '继续词卡战斗' : '进入词卡战斗'}</button>
                   <button class="btn btn-ghost" data-action="outcome-next">跳过战斗，继续剧情</button>`
                : `<button class="btn btn-primary" data-action="outcome-next">继续</button>`
            }
          </div>
        </div>
      </div>`;
    $('[data-action="outcome-next"]')?.addEventListener('click', () => {
      const result = G.finishScene(app.save, app.content, app.today);
      saveNow();
      app.story = null;
      if (result.next === 'boss') return go('boss');
      if (result.next === 'summary') return go('summary');
      return renderStory();
    });
    $('[data-action="start-battle"]')?.addEventListener('click', () => {
      G.startBattle(app.save, scene, app.today);
      saveNow();
      app.battle = { selectedCard: null, mode: null };
      go('battle');
    });
    return;
  }

  state.stage = 'action';
  paintStory(scene, state);
}

function actionPrompt(action, scene) {
  return esc(action.prompt);
}

/* ------------------------------------------------------------------ */
/* BOSS                                                                */
/* ------------------------------------------------------------------ */

function renderBoss() {
  if (!app.save) return renderCover();
  if (app.save.progress.chapterDone) return go('summary');
  if (app.save.progress.sceneIndex < G.CHAPTER_SCENES) return go('story');
  G.startBoss(app.save);
  saveNow();
  if (!app.boss) app.boss = { started: false, feedback: null };

  const root = $('#app');
  root.innerHTML = `
    <main class="screen stage-screen boss-screen">
      ${worldSVG({ camera: 'gate', time: 'dawn', weather: 'fog', className: 'stage-art' })}
      <div class="stage-veil"></div>
      ${stageHud(null, '章节终局 · 摆渡人的五问')}
      <div class="boss-wrap">
        <div class="panel boss-panel" id="boss-panel"></div>
      </div>
    </main>`;
  paintBoss();
}

function paintBoss() {
  const panel = $('#boss-panel');
  if (!panel) return;
  const save = app.save;
  const boss = save.boss;
  const chapter = app.content.chapter;
  const checks = chapter.boss;

  if (boss.done) {
    const won = boss.won;
    panel.innerHTML = `
      <div class="boss-result ${won ? 'ok' : 'bad'}">
        <p class="eyebrow">${won ? '章节净化' : '撤退'}</p>
        <h1>${won ? '雾从中间裂开了。' : '摆渡人把船撑回了雾里。'}</h1>
        <p class="boss-result-text">${esc(won ? checks.success_text : checks.failure_text)}</p>
        <div class="finish-stats">
          ${statChip('check', `${boss.hits}/5`, '答对')}
          ${statChip('shield', `${save.progress.hp}/100`, 'HP')}
          ${statChip('key', `${save.progress.clues}/3`, '线索')}
        </div>
        <div class="cta-row center">
          <button class="btn btn-primary btn-lg" data-action="boss-summary">查看今日战报</button>
          ${won ? '<button class="btn btn-ghost" data-action="boss-home">回到雾港</button>' : '<button class="btn btn-ghost" data-action="boss-retry">再试一次</button>'}
        </div>
      </div>`;
    $('[data-action="boss-summary"]')?.addEventListener('click', () => go('summary'));
    $('[data-action="boss-home"]')?.addEventListener('click', () => go('home'));
    $('[data-action="boss-retry"]')?.addEventListener('click', () => {
      G.resetBoss(app.save);
      saveNow();
      app.boss = { started: false, feedback: null };
      paintBoss();
    });
    return;
  }

  if (app.boss.feedback) {
    const { correct, word, mode = 'spell' } = app.boss.feedback;
    const finished = boss.index >= checks.check_word_ids.length;
    panel.innerHTML = `
      <div class="boss-topline"><span>摆渡人的五问</span><span>${boss.index} / ${checks.check_word_ids.length}</span></div>
      <div class="boss-dots">
        ${checks.check_word_ids.map((id, index) => {
          const result = boss.results[index];
          return `<span class="boss-dot ${result ? (result.correct ? 'hit' : 'miss') : index === boss.index ? 'active' : ''}"></span>`;
        }).join('')}
      </div>
      <div class="feedback ${correct ? 'ok' : 'bad'}">
        <div class="feedback-head">${icon(correct ? 'check' : 'x')}${correct ? '答对了' : '答错了 · HP -20'} · ${mode === 'recognize' ? '认出检定' : '拼写检定'}</div>
        <p class="feedback-answer"><b>${esc(word.lemma)}</b> ${esc(word.ipa)} · ${esc(word.meanings.join('；'))}</p>
        <p class="feedback-example">${esc(word.example_en)}<span>${esc(word.example_zh)}</span></p>
        <button class="btn btn-primary" data-action="boss-next">${finished ? '看结果' : '下一问'}</button>
      </div>`;
    $('[data-action="boss-next"]')?.addEventListener('click', () => {
      app.boss.feedback = null;
      paintBoss();
    });
    return;
  }

  if (!app.boss.started) {
    panel.innerHTML = `
      <p class="eyebrow">第一章 · 章节终局</p>
      <h1 class="boss-title">${esc(checks.title)}</h1>
      <p class="boss-intro">${esc(checks.intro)}</p>
      <div class="boss-rules">
        <span>${icon('eye')} 3 个认出 + 2 个拼出</span>
        <span>${icon('spark')} 认出：从四个拼写里选；拼出：自己输入</span>
        <span>${icon('shield')} 答错 HP -20</span>
        <span>${icon('check')} 答对 ${checks.required} 个即可净化</span>
      </div>
      <button class="btn btn-primary btn-lg" data-action="boss-start">开始五问</button>`;
    $('[data-action="boss-start"]')?.addEventListener('click', () => {
      app.boss.started = true;
      paintBoss();
    });
    return;
  }

  const wordId = checks.check_word_ids[boss.index];
  const word = app.byId[wordId];
  const mode = G.bossModeAt(app.content, boss.index);
  const dots = `
    <div class="boss-dots">
      ${checks.check_word_ids.map((id, index) => {
        const result = boss.results[index];
        return `<span class="boss-dot ${result ? (result.correct ? 'hit' : 'miss') : index === boss.index ? 'active' : ''}"></span>`;
      }).join('')}
    </div>`;
  if (mode === 'recognize') {
    const lemmaOptions = S.lemmaOptions(word, app.content.words, 4, 'boss');
    panel.innerHTML = `
      <div class="boss-topline"><span>摆渡人的五问</span><span>第 ${boss.index + 1} / ${checks.check_word_ids.length} 问</span></div>
      ${dots}
      <div class="boss-question">
        <p class="boss-label">认出检定 · ${esc(word.pos)} · 从四个拼写里选出正确的一个</p>
        <h2 class="boss-meaning">${esc(word.meanings.join('；'))}</h2>
        <div class="options boss-options" id="boss-options">
          ${lemmaOptions.map((lemma) => `<button class="option lemma-option" data-lemma="${esc(lemma)}">${esc(lemma)}</button>`).join('')}
        </div>
      </div>
      <div class="boss-side">${icon('spark')}<span>认出只证明“看得懂”，拼出才证明“写得出”。答错不卡关。</span></div>`;
    $$('.lemma-option', panel).forEach((button) => {
      button.addEventListener('click', () => {
        const result = G.bossCheck(app.save, app.content, button.dataset.lemma, app.today, 'recognize');
        cue(result.correct ? 'success' : 'fail');
        saveNow();
        app.boss.feedback = { correct: result.correct, word: result.word, mode: 'recognize' };
        paintBoss();
      });
    });
    return;
  }
  panel.innerHTML = `
    <div class="boss-topline"><span>摆渡人的五问</span><span>第 ${boss.index + 1} / ${checks.check_word_ids.length} 问</span></div>
    ${dots}
    <div class="boss-question">
      <p class="boss-label">拼写检定 · ${esc(word.pos)} · 自己写出它的英文</p>
      <h2 class="boss-meaning">${esc(word.meanings.join('；'))}</h2>
      <form class="answer-form" id="boss-form" autocomplete="off">
        <div class="answer-row">
          <input id="boss-answer" name="answer" type="text" inputmode="latin" spellcheck="false" autocapitalize="off" placeholder="输入英文…" required autofocus>
          <button class="btn btn-primary" type="submit">回答</button>
        </div>
        <p class="hint-line">${icon('eye')} 提示：${esc(firstLetterHint(word))}</p>
      </form>
    </div>
    <div class="boss-side">${icon('spark')}<span>拼写是产出；认出和拼出分开记录。答错不卡关。</span></div>`;
  $('#boss-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#boss-answer').value;
    const result = G.bossCheck(app.save, app.content, input, app.today, 'spell');
    cue(result.correct ? 'success' : 'fail');
    saveNow();
    app.boss.feedback = { correct: result.correct, word: result.word, mode: 'spell' };
    paintBoss();
  });
}

/* ------------------------------------------------------------------ */
/* 词卡战斗                                                            */
/* ------------------------------------------------------------------ */

function typeGlyph(type) {
  return { spell: 'staff', item: 'bag', check: 'quill' }[type] || 'quill';
}

function battleCostLabel(intent) {
  if (!intent) return '';
  if (intent.type === 'hp') return `HP -${intent.amount}`;
  if (intent.type === 'clue') return `线索 -${intent.amount || 1}`;
  if (intent.type === 'branch') return '路线改变';
  return '代价未知';
}

/** 战斗舞台：敌人立绘、受击/伤害数字与敌人血条。 */
function battleArenaInner(scene, battle) {
  const last = battle.lastOutcome;
  const rounds = scene.battle.rounds;
  const hpPercent = Math.max(0, Math.min(100, (battle.enemyHp / rounds) * 100));
  const hit = battle.phase === 'result' && Boolean(last?.correct);
  const miss = battle.phase === 'result' && Boolean(last && !last.correct);
  const defeated = battle.done && battle.won;
  const lost = battle.done && !battle.won;
  const damage = last?.mode === 'spell' ? 2 : 1;
  return `
    <div class="battle-flash ${hit ? 'ok' : miss ? 'bad' : ''}"></div>
    <div class="battle-foe ${hit ? 'is-hit' : ''} ${miss ? 'is-guarding' : ''} ${defeated ? 'is-defeated' : ''} ${lost ? 'is-lost' : ''}">
      ${foePortraitSVG()}
      ${hit ? `<span class="damage-float damage-enemy" aria-hidden="true">-${damage}</span>` : ''}
      <div class="foe-plate" aria-hidden="true">
        <span class="foe-name">${esc(scene.battle.enemy)}</span>
        <span class="foe-hp"><i style="width:${hpPercent}%"></i></span>
        <span class="foe-hp-text">${battle.enemyHp} / ${rounds}</span>
      </div>
    </div>
    ${miss ? `<span class="damage-float damage-player" aria-hidden="true">${battleCostLabel(last?.intent)}</span>` : ''}
    ${battle.done ? `<p class="battle-arena-note">${defeated ? '灯重新亮起。' : '雾把最后一盏灯按灭了。'}</p>` : ''}`;
}

function renderBattle() {
  if (!app.save) return renderCover();
  const battle = app.save.battle;
  if (!battle) return go('story');
  const scene = app.content.chapter.scenes.find((entry) => entry.id === battle.sceneId);
  if (!scene?.battle) return go('story');
  if (app.save.day.completed) return go('summary');
  if (!app.battle) app.battle = { selectedCard: null, mode: null };

  const root = $('#app');
  root.innerHTML = `
    <main class="screen stage-screen battle-screen">
      ${worldSVG({ camera: scene.art.camera, time: scene.art.time, weather: scene.art.weather, className: 'stage-art' })}
      <div class="stage-veil"></div>
      ${stageHud(null, `词卡战斗 · ${scene.battle.enemy}`)}
      <div class="battle-arena" id="battle-arena" aria-hidden="true"></div>
      <div class="battle-wrap">
        <div class="panel battle-panel" id="battle-panel"></div>
      </div>
    </main>`;
  paintBattle(scene);
}

function paintBattle(scene) {
  const panel = $('#battle-panel');
  if (!panel) return;
  const save = app.save;
  const battle = save.battle;
  if (!battle) return go('story');

  const arena = $('#battle-arena');
  if (arena) arena.innerHTML = battleArenaInner(scene, battle);

  if (battle.done) {
    panel.innerHTML = `
      <div class="battle-final ${battle.won ? 'ok' : 'bad'}">
        <p class="eyebrow">${battle.won ? '战斗胜利' : '战斗结束'}</p>
        <h1>${battle.won ? '战斗胜利。' : '战斗结束。'}</h1>
        <p class="battle-final-text">${esc(G.battleResultText(save, scene))}</p>
        <div class="finish-stats">
          ${statChip('check', `${battle.successes}`, '成功检定')}
          ${statChip('x', `${battle.failures}`, '失败', 'danger')}
          ${statChip('shield', `${save.progress.hp}/100`, 'HP')}
          ${statChip('key', `${save.progress.clues}/3`, '线索')}
        </div>
        <button class="btn btn-primary btn-lg" data-action="battle-finish">继续剧情</button>
      </div>`;
    $('[data-action="battle-finish"]')?.addEventListener('click', () => {
      const result = G.finishScene(save, app.content, app.today);
      saveNow();
      app.story = null;
      app.battle = null;
      if (result.next === 'boss') return go('boss');
      if (result.next === 'summary') return go('summary');
      return renderStory();
    });
    return;
  }

  const intent = scene.battle.intents[battle.round];
  const rounds = scene.battle.rounds;
  const cards = scene.featured_words.map((id) => app.byId[id]).filter(Boolean);
  const selected = app.battle?.selectedCard ? app.byId[app.battle.selectedCard] : null;

  if (battle.phase === 'result') {
    const last = battle.lastOutcome;
    const word = last ? app.byId[last.wordId] : null;
    panel.innerHTML = `
      <div class="battle-topline"><span>词卡战斗 · ${esc(scene.battle.enemy)}</span><span>第 ${battle.round + 1} / ${rounds} 回合</span></div>
      <div class="battle-round-result ${last?.correct ? 'ok' : 'bad'}">
        <div class="feedback-head">${icon(last?.correct ? 'check' : 'x')}${last?.correct ? '检定成功' : '检定失败'} · ${last?.mode === 'recognize' ? '认出' : '拼出'}</div>
        <p class="feedback-answer"><b>${esc(word?.lemma || '')}</b> ${esc(word?.ipa || '')} · ${esc(word?.meanings?.join('；') || '')}</p>
        <p class="battle-intent-line">敌人意图：${esc(intent.text)}</p>
        <p class="feedback-note">${esc(last?.message || '')}</p>
        <div class="battle-stats">
          <span>敌人 HP <b>${battle.enemyHp}</b> / ${rounds}</span>
          <span>成功 <b>${battle.successes}</b></span>
          <span>失败 <b>${battle.failures}</b></span>
          <span>你的 HP <b>${save.progress.hp}</b></span>
        </div>
        <button class="btn btn-primary" data-action="battle-next">下一回合</button>
      </div>`;
    $('[data-action="battle-next"]')?.addEventListener('click', () => {
      G.battleNext(save, scene);
      saveNow();
      app.battle = { selectedCard: null, mode: null };
      paintBattle(scene);
    });
    return;
  }

  let checkHtml = '<p class="battle-choose-hint">选一张词卡。卡面只写中文语义与效果，英文要你自己取出来。</p>';
  if (selected) {
    checkHtml = `
      <div class="battle-check">
        <p class="battle-check-title">「${esc(selected.meanings[0])}」· 选一种检定方式</p>
        <div class="battle-modes">
          <button class="btn btn-ghost" data-battle-mode="recognize">认出 · 4 选 1（低风险）</button>
          <button class="btn btn-primary" data-battle-mode="spell">拼出 · 输入（高风险，伤害 +1）</button>
        </div>
        ${
          app.battle.mode === 'recognize'
            ? `<div class="options battle-options">
                ${S.lemmaOptions(selected, app.content.words, 4, 'battle').map((lemma) => `<button class="option lemma-option" data-lemma="${esc(lemma)}">${esc(lemma)}</button>`).join('')}
              </div>`
            : ''
        }
        ${
          app.battle.mode === 'spell'
            ? `<form class="answer-form" id="battle-form" autocomplete="off">
                <label for="battle-answer">写出「${esc(selected.meanings[0])}」的英文</label>
                <div class="answer-row">
                  <input id="battle-answer" name="answer" type="text" inputmode="latin" spellcheck="false" autocapitalize="off" placeholder="输入英文…" required autofocus>
                  <button class="btn btn-primary" type="submit">打出这张卡</button>
                </div>
                <p class="hint-line">${icon('eye')} 提示：${esc(firstLetterHint(selected))} · 拼写成功伤害 +1</p>
              </form>`
            : ''
        }
      </div>`;
  }

  panel.innerHTML = `
    <div class="battle-topline"><span>${gameIcon('swords')} 词卡战斗 · ${esc(scene.battle.enemy)}</span><span>第 ${battle.round + 1} / ${rounds} 回合</span></div>
    <div class="battle-stats">
      <span>敌人 HP <b>${battle.enemyHp}</b> / ${rounds}</span>
      <span>成功 <b>${battle.successes}</b></span>
      <span>失败 <b>${battle.failures}</b></span>
      <span>你的 HP <b>${save.progress.hp}</b></span>
    </div>
    <p class="battle-intent-line">${gameIcon('swords')} 敌人意图：${esc(intent.text)}</p>
    <div class="battle-hand">
      ${cards.map((word, index) => `
        <button class="battle-card ${selected?.id === word.id ? 'selected' : ''}" data-card="${word.id}" data-type="${esc(word.card_type)}" aria-pressed="${selected?.id === word.id}">
          <span class="battle-card-head">
            <span class="battle-card-icon">${gameIcon(typeGlyph(word.card_type))}</span>
            <span class="battle-card-type">${typeLabel(word.card_type)}</span>
            <span class="battle-card-rune">${['I', 'II', 'III', 'IV'][index] || index + 1}</span>
          </span>
          <b>${esc(word.meanings[0])}</b>
          <small>${esc(word.effect_text)}</small>
          <span class="battle-card-foot">点击选取</span>
        </button>`).join('')}
    </div>
    ${checkHtml}`;
  $$('.battle-card', panel).forEach((button) => {
    button.addEventListener('click', () => {
      app.battle = { selectedCard: button.dataset.card, mode: null };
      paintBattle(scene);
    });
  });
  $$('[data-battle-mode]', panel).forEach((button) => {
    button.addEventListener('click', () => {
      app.battle.mode = button.dataset.battleMode;
      paintBattle(scene);
    });
  });
  $$('.lemma-option', panel).forEach((button) => {
    button.addEventListener('click', () => {
      const result = G.battleCheck(save, app.content, scene, selected.id, 'recognize', button.dataset.lemma, app.today);
      cue(result?.lastOutcome?.correct ? 'success' : 'fail');
      saveNow();
      app.battle = null;
      paintBattle(scene);
    });
  });
  $('#battle-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = G.battleCheck(save, app.content, scene, selected.id, 'spell', $('#battle-answer').value, app.today);
    cue(result?.lastOutcome?.correct ? 'success' : 'fail');
    saveNow();
    app.battle = null;
    paintBattle(scene);
  });
}

/* ------------------------------------------------------------------ */
/* 结算                                                                */
/* ------------------------------------------------------------------ */

function renderSummary() {
  if (!app.save) return renderCover();
  const { today } = G.prepareToday(app.save);
  app.today = today;
  const data = G.summaryData(app.save, app.content, today);
  const save = app.save;
  const day = data.day;
  const todayWords = Object.entries(save.words)
    .filter(([, uw]) => uw.introducedAt === today)
    .map(([id]) => app.byId[id])
    .filter(Boolean);
  const keywords = todayWords.slice(0, 3).map((word) => word.lemma);
  const report = [
    `【拾词者 · 雾港】第 ${dayNumber()} 天`,
    `复习 ${day.reviewCorrect + day.reviewWrong} · 新词 ${data.newWords} · 剧情 ${day.scenesPlayed} 幕`,
    `正确率 ${data.accuracy ?? '—'}% · HP ${save.progress.hp} · 线索 ${save.progress.clues}/3`,
    keywords.length ? `今日关键词：${keywords.join(' · ')}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const root = $('#app');
  root.innerHTML = `
    <main class="screen summary-screen">
      <div class="summary-art-wrap">${worldSVG({ camera: 'dock', time: 'dawn', weather: 'fog', className: 'summary-art' })}</div>
      <div class="summary-veil"></div>
      ${topbar('home')}
      <div class="summary-wrap">
        <div class="summary-head">
          <p class="eyebrow">第 ${dayNumber()} 天 · ${formatDateCN(today)}</p>
          <h1>${data.chapterDone ? '雾港 · 已净化' : save.boss?.done && !save.boss.won ? '今日航程 · 撤退' : '今日航程 · 完成'}</h1>
          <p>${data.chapterDone ? '十二幕的词都留在了你的词库里。' : '今天的雾已经走过。明天还有新的到期卡。'}</p>
        </div>

        <div class="summary-grid">
          <div class="panel report-main">
            <div class="panel-head"><span class="label">${icon('book')} 今日战报</span><span class="badge">${data.accuracy ?? '—'}% 正确率</span></div>
            <div class="report-stats">
              ${reportStat('eye', day.reviewCorrect + day.reviewWrong, '复习')}
              ${reportStat('spark', data.newWords, '新词')}
              ${reportStat('map', day.scenesPlayed, '剧情幕数')}
              ${reportStat('shield', `${save.progress.hp}`, '剩余 HP')}
            </div>
            <div class="report-rings">
              ${ring({ percent: data.accuracy ?? 0, label: '正确率', value: `${data.accuracy ?? '—'}%`, sub: '今日作答' })}
              ${ring({ percent: (data.newWords / 12) * 100, label: '新词', value: `${data.newWords}/12`, sub: '契约' })}
              ${ring({ percent: (day.scenesPlayed / 3) * 100, label: '剧情', value: `${Math.min(day.scenesPlayed, 3)}/3`, sub: '幕' })}
            </div>
            <div class="share-card">
              <div class="share-head">${icon('spark')} 战报卡 · 默认不展示完整词表</div>
              <pre id="report-text">${esc(report)}</pre>
              <div class="share-foot">${keywords.length ? `关键词：${keywords.map((word) => `<b>${esc(word)}</b>`).join(' · ')}` : '今天还没有契约新词。'}</div>
            </div>
            <div class="cta-row">
              <button class="btn btn-primary" data-action="copy-report">复制战报</button>
              <button class="btn btn-ghost" data-action="summary-words">打开词书</button>
            </div>
          </div>

          <aside class="panel report-side">
            <p class="eyebrow">下一步</p>
            <h2>${data.dueTomorrow ? `明天先复习 ${data.dueTomorrow} 张` : '明天没有到期卡'}</h2>
            <p class="side-copy">${data.chapterDone ? '第一章已净化。下一步可以继续复习，或等待第二章开放。' : save.progress.sceneIndex >= 12 ? '摆渡人还在雾口。可以再试一次。' : `下一幕：第 ${Math.min(save.progress.sceneIndex + 1, 12)} 幕 · ${esc(app.content.chapter.scenes[Math.min(save.progress.sceneIndex, 11)].title)}`}</p>
            <div class="side-stack">
              <span>${icon('clock')} 明日到期 <b>${data.dueTomorrow}</b> 张</span>
              <span>${icon('flame')} 连续 <b>${save.progress.streak}</b> 天</span>
              <span>${icon('star')} 双证 <b>${data.stats.mastered}</b> / 48</span>
              <span>${icon('eye')} 会认不会写 <b>${data.stats.recognizedOnly}</b></span>
              <span>${icon('key')} 线索 <b>${save.progress.clues}</b> / 3</span>
            </div>
            ${!data.chapterDone && save.progress.sceneIndex >= 12 && !save.boss?.won ? `<button class="btn btn-primary btn-block" data-action="summary-boss">再战摆渡人</button>` : ''}
            ${save.day.completed ? `<button class="btn btn-ghost btn-block" data-action="fast-forward">快进一天（原型演示）</button>` : ''}
            <button class="btn btn-ghost btn-block" data-action="summary-home">回到雾港</button>
            <p class="side-note">原型使用本地存档；快进按钮只用于体验第二天的复习队列。</p>
          </aside>
        </div>
      </div>
    </main>`;

  $('[data-action="copy-report"]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast('战报已复制到剪贴板。');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      toast('战报已复制到剪贴板。');
    }
  });
  $('[data-action="summary-words"]')?.addEventListener('click', () => go('words'));
  $('[data-action="summary-home"]')?.addEventListener('click', () => go('home'));
  $('[data-action="summary-boss"]')?.addEventListener('click', () => go('boss'));
  $('[data-action="fast-forward"]')?.addEventListener('click', () => {
    G.advanceDay(app.save);
    saveNow();
    toast(`已快进到 ${formatDateCN(app.today)}。`);
    go('home');
  });
}

function reportStat(iconName, value, label) {
  return `<div class="report-stat">${icon(iconName)}<b>${value}</b><small>${label}</small></div>`;
}

/* ------------------------------------------------------------------ */
/* 词书                                                                */
/* ------------------------------------------------------------------ */

function renderWords() {
  if (!app.save) return renderCover();
  const save = app.save;
  const filters = [
    ['all', '全部'],
    ['review', '复习中'],
    ['recognized', '会认不会写'],
    ['spelled', '会拼'],
    ['mastered', '双证'],
    ['known', '已认识'],
    ['locked', '未契约']
  ];
  const filter = app.wordFilter || 'all';
  const words = [...app.content.words].sort((a, b) => a.freq_rank - b.freq_rank);
  const visible = words.filter((word) => {
    const uw = save.words[word.id];
    if (filter === 'locked') return !uw;
    if (filter === 'all') return true;
    if (filter === 'known') return uw?.known;
    if (filter === 'mastered') return S.isMasteredWord(uw);
    if (filter === 'recognized') return Boolean(uw && !uw.known && (uw.stage ?? 0) > 0 && (uw.spelling?.stage ?? 0) < 2);
    if (filter === 'spelled') return Boolean(uw && !uw.known && (uw.spelling?.stage ?? 0) >= 2);
    if (filter === 'review') return Boolean(uw && !uw.known && !S.isMasteredWord(uw));
    return true;
  });
  const stats = S.masteryStats(save);

  const root = $('#app');
  root.innerHTML = `
    <main class="screen words-screen">
      ${topbar('words')}
      <div class="page-wrap">
        <div class="page-head">
          <div><p class="eyebrow">词书 · 雾港</p><h1>你带走的词</h1></div>
          <p class="page-sub">已认识 ${stats.known} · 会拼 ${stats.spellingConfirmed} · 会认不会写 ${stats.recognizedOnly} · 双证 ${stats.mastered} / 48</p>
        </div>
        <div class="word-filters">
          ${filters.map(([key, label]) => `<button class="filter-btn ${filter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`).join('')}
        </div>
        <div class="word-grid">
          ${visible.length === 0 ? '<div class="empty-state panel"><b>这一类还没有词。</b><span>去剧情里契约新词，或换一个筛选条件。</span></div>' : ''}
          ${visible
            .map((word) => {
              const uw = save.words[word.id];
              if (!uw) {
                return `<article class="panel word-card locked">
                  <div class="word-card-top"><span class="word-rank">${String(word.freq_rank).padStart(2, '0')}</span><span class="status-chip">未契约</span></div>
                  <h2 class="word-locked">? ? ?</h2>
                  <p class="word-locked-note">在剧情里与这个词契约后，才会出现在词书。</p>
                  <div class="word-card-foot"><span>${icon('lock')} 第 ${word.chapter} 章</span></div>
                </article>`;
              }
              const spellingStage = uw.spelling?.stage ?? 0;
              const mastered = S.isMasteredWord(uw);
              const status = uw.known ? 'known' : mastered ? 'mastered' : spellingStage < 2 && (uw.stage ?? 0) > 0 ? 'recognized' : 'review';
              const statusText = uw.known ? '已认识' : mastered ? '双证' : status === 'recognized' ? '会认不会写' : '复习中';
              return `<article class="panel word-card ${status}">
                <div class="word-card-top"><span class="word-rank">${String(word.freq_rank).padStart(2, '0')}</span><span class="status-chip ${status}">${statusText}</span></div>
                <h2>${esc(word.lemma)}</h2>
                <p class="word-ipa">${esc(word.ipa)} · ${esc(word.pos)}</p>
                <p class="word-meaning">${esc(word.meanings.join('；'))}</p>
                <p class="word-example">${esc(word.example_en)}</p>
                <div class="word-badges">
                  <span class="word-badge ${uw.stage >= 3 ? 'on' : ''}">认义 ${uw.stage ?? 0}/3</span>
                  <span class="word-badge ${spellingStage >= 2 ? 'on' : ''}">拼写 ${spellingStage}/2${spellingStage >= 2 ? ' · 会拼' : ''}</span>
                </div>
                <div class="word-card-foot">
                  <span>${icon('clock')} ${uw.known ? '不进入复习' : `认义 ${esc(daysUntil(uw.dueOn))}`}</span>
                  <span>${icon('spark')} ${uw.known ? '已认识' : `拼写 ${esc(daysUntil(uw.spelling?.dueOn))}`}</span>
                  ${uw.lapses ? `<span class="lapses">${icon('x')} 认义错 ${uw.lapses}</span>` : ''}
                  ${uw.spelling?.fails ? `<span class="lapses">${icon('x')} 拼写错 ${uw.spelling.fails}</span>` : ''}
                </div>
                ${uw.known ? `<button class="btn btn-ghost btn-sm word-undo" data-undo="${word.id}">撤销已认识</button>` : ''}
              </article>`;
            })
            .join('')}
        </div>
      </div>
    </main>`;

  $$('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      app.wordFilter = button.dataset.filter;
      renderWords();
    });
  });
  $$('[data-undo]').forEach((button) => {
    button.addEventListener('click', () => {
      if (G.undoKnownWord(app.save, button.dataset.undo, app.today)) {
        saveNow();
        toast('已撤销“已认识”，回到复习队列。');
        renderWords();
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* 设置                                                                */
/* ------------------------------------------------------------------ */

function renderSettings() {
  if (!app.save) return renderCover();
  const save = app.save;
  const root = $('#app');
  root.innerHTML = `
    <main class="screen settings-screen">
      ${topbar('settings')}
      <div class="page-wrap narrow">
        <div class="page-head">
          <div><p class="eyebrow">设置 · 原型</p><h1>航程偏好</h1></div>
          <p class="page-sub">这是可玩的单章原型，设置项只保留会影响当前体验的部分。</p>
        </div>

        <section class="panel settings-panel">
          <div class="setting-row">
            <div><b>每日新词</b><p>正式版可选 10 / 12 / 15 / 20；原型固定 12，以匹配每天 3 幕的节奏。</p></div>
            <span class="setting-value">12 <small>词 / 天</small></span>
          </div>
          <div class="setting-row">
            <div><b>习惯锚点</b><p>正式版会在锚点时间发送提醒；原型只保存时间，不发送通知。</p></div>
            <input type="time" id="anchor-time" value="${esc(save.settings.anchor || '21:00')}" aria-label="习惯锚点时间">
          </div>
          <div class="setting-row">
            <div><b>减少动效</b><p>关闭雾、雨、灯光的循环动画。也会自动遵循系统的“减少动态效果”设置。</p></div>
            <label class="switch">
              <input type="checkbox" id="reduce-motion" aria-label="减少动效" ${save.settings.reduceMotion ? 'checked' : ''}>
              <span></span>
            </label>
          </div>
          <div class="setting-row">
            <div><b>音效</b><p>点击与检定结果会播放简短提示音；全部由浏览器合成，不加载音频文件。</p></div>
            <label class="switch">
              <input type="checkbox" id="sound-on" aria-label="音效" ${save.settings.sound !== false ? 'checked' : ''}>
              <span></span>
            </label>
          </div>
          <div class="setting-row">
            <div><b>存档</b><p>进度保存在这台设备的 localStorage 中。清除后无法恢复。</p></div>
            <button class="btn btn-ghost btn-sm danger" data-action="reset-save">清除存档</button>
          </div>
        </section>

        <section class="panel settings-panel about-panel">
          <p class="eyebrow">关于这个原型</p>
          <p>第一章「雾港」共 12 幕、48 个词，按 4 天 × 3 幕组织。已实现：复习优先、1/3/7/16 天 SRS、词行动、HP/线索/分支代价、已认识验证、章节 BOSS、词书与战报复制。</p>
          <p>暂未实现：服务端账号、通知、异步挑战码、小队、10/12/15/20 档位切换、完整六章内容、真题词频管线。词表排序为原型占位，正式版按设计文档 5.2 生成。</p>
          <p class="about-credit">战斗图标来自 <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a>（作者 Lorc，CC BY 3.0）；守塔人立绘与其他图标为项目内联 SVG。完整许可见仓库 <code>game/ASSETS.md</code>。</p>
          <div class="about-actions">
            <button class="btn btn-ghost btn-sm" data-action="show-cover">查看封面</button>
            <a class="btn btn-ghost btn-sm" href="https://github.com/chehua11agent/superagent-test/pull/2" target="_blank" rel="noreferrer">设计文档 PR #2</a>
          </div>
        </section>
      </div>
    </main>`;

  $('#anchor-time')?.addEventListener('change', (event) => {
    app.save.settings.anchor = event.target.value;
    saveNow();
    toast('锚点时间已保存。');
  });
  $('#reduce-motion')?.addEventListener('change', (event) => {
    app.save.settings.reduceMotion = event.target.checked;
    document.body.classList.toggle('reduce-motion', app.save.settings.reduceMotion);
    saveNow();
  });
  $('#sound-on')?.addEventListener('change', (event) => {
    app.save.settings.sound = event.target.checked;
    saveNow();
    if (event.target.checked) cue('success');
    toast(event.target.checked ? '音效已开启。' : '音效已关闭。');
  });
  $('[data-action="reset-save"]')?.addEventListener('click', () => {
    if (!window.confirm('确定清除存档吗？这会删除全部进度，无法恢复。')) return;
    clearSave();
    app.save = null;
    app.story = null;
    app.review = null;
    app.boss = null;
    go('cover');
  });
  $('[data-action="show-cover"]')?.addEventListener('click', () => go('cover'));
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

function render() {
  if (!app.save) {
    renderCover();
    return;
  }
  const { today, changed } = G.prepareToday(app.save);
  app.today = today;
  if (changed) saveNow();
  document.body.classList.toggle('reduce-motion', Boolean(app.save.settings.reduceMotion));

  const route = routeName();
  switch (route) {
    case 'home':
      renderHome();
      break;
    case 'review':
      renderReview();
      break;
    case 'story':
      renderStory();
      break;
    case 'boss':
      renderBoss();
      break;
    case 'battle':
      renderBattle();
      break;
    case 'summary':
      renderSummary();
      break;
    case 'words':
      renderWords();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'cover':
      renderCover();
      break;
    default:
      go('home');
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

async function boot() {
  try {
    const [wordsResponse, chapterResponse] = await Promise.all([
      fetch('content/words.json', { cache: 'no-cache' }),
      fetch('content/chapter-1.json', { cache: 'no-cache' })
    ]);
    if (!wordsResponse.ok || !chapterResponse.ok) throw new Error('内容文件加载失败');
    const wordsData = await wordsResponse.json();
    const chapter = await chapterResponse.json();
    app.content = { words: wordsData.words, chapter, meta: wordsData };
    app.byId = G.wordsById(app.content);
    app.save = loadSave();
    if (app.save) {
      const { today, changed } = G.prepareToday(app.save);
      app.today = today;
      if (changed) saveNow();
    }
    window.__shici = app;
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!event.target.closest('button, a[href], .option')) return;
        cue('click');
      },
      { passive: true }
    );
    render();
  } catch (error) {
    console.error(error);
    $('#app').innerHTML = `
      <main class="screen error-screen">
        <div class="panel error-panel">
          <p class="eyebrow">加载失败</p>
          <h1>雾太厚了。</h1>
          <p>内容文件没有加载成功。请通过本地服务器打开（<code>npm run serve</code>），不要直接用 file:// 打开。</p>
          <pre>${esc(error.message)}</pre>
        </div>
      </main>`;
  }
}

window.addEventListener('hashchange', render);
boot();
