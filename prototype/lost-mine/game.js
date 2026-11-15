import { createWorld } from './world.js';
import { INTRO, HEROES, HERO_ORDER, GOBLINS, STORY, RULES, RULES_WORD, WORDS, MAP_NODES, MAP_EDGES, ENV_LABELS } from './data.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const d = (n) => 1 + Math.floor(Math.random() * n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
const esc = (s) => String(s).replace(/[<>&]/g, '');
const sleep = wait;
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let wordDeck = [];
let wordActive = false;
let wordTimerRaf = 0;

const state = {
  screen: 'intro', introStep: 0,
  selected: [], party: {}, goblins: {},
  combat: null, busy: false, targetId: null,
  surprised: false, log: [], shortRest: false, ended: false,
  checkMode: 'word',
  route: { visited: ['trail'], current: 'trail' },
  clues: { horses: false, stream: false, cliff: false },
};

let world = null;
let bannerTimer = 0;

function setBusy(v) {
  state.busy = v;
  $('#hud').classList.toggle('is-busy', v);
}
function log(text, cls = '') {
  state.log.push({ text, cls });
  if (state.log.length > 120) state.log.shift();
  const el = $('#story-log');
  if (el) {
    const line = document.createElement('div');
    line.className = `log-line ${cls}`;
    line.textContent = text;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    while (el.children.length > 60) el.removeChild(el.firstChild);
  }
}
function toast(text, cls = '') {
  const el = $('#toast');
  el.textContent = text;
  el.className = `toast ${cls}`;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2200);
}
function setAct(act) {
  $$('#act-track .act').forEach((e) => e.classList.toggle('is-on', e.dataset.act === act));
}
function showRoll({ title, values, used, mod = 0, ac = null, success = true, text = '', auto = false, word = null, meaning = null, wordBonus = 0, wordCorrect = null }) {
  const el = $('#roll-banner');
  const dice = auto ? `<span class="die">${used}</span>` : values.map((v) => `<span class="die ${v === used ? 'is-used' : ''}">${v}</span>`).join('');
  const wordLine = word ? `<p class="roll-word"><b>${esc(word)}</b> = ${esc(meaning || '')} <span class="${wordCorrect ? 'is-good' : 'is-bad'}">${wordCorrect ? '正确' : '错误'}</span> · 词义 ${sign(wordBonus)}</p>` : '';
  el.innerHTML = `<p class="roll-title">${esc(title)}</p><div class="roll-row">${dice}<span class="roll-math">${auto ? '' : `${sign(mod)}${ac !== null ? ` vs AC ${ac}` : ''}`}</span><span class="roll-total ${success ? 'is-good' : 'is-bad'}">${used}</span></div><p class="roll-text">${esc(text)}</p>${wordLine}`;
  el.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.hidden = true; }, 2400);
}
function openModal({ kicker = '', title = '', sub = '', body = '', actions = [] }) {
  $('#modal-kicker').textContent = kicker;
  $('#modal-title').textContent = title;
  $('#modal-sub').textContent = sub;
  $('#modal-body').innerHTML = body;
  const box = $('#modal-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.ghost ? 'btn-ghost' : 'btn-primary'}`;
    b.textContent = a.label;
    b.addEventListener('click', () => { if (a.keep !== true) closeModal(); a.onClick?.(); });
    box.appendChild(b);
  }
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; }

function renderParty() {
  const box = $('#party');
  box.innerHTML = '';
  for (const id of state.selected) {
    const h = state.party[id];
    if (!h) continue;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `pc ${h.active ? 'is-on' : ''} ${h.down ? 'is-down' : ''}`;
    const pct = Math.max(0, Math.min(100, (h.hp / h.maxHp) * 100));
    card.innerHTML = `<span class="pc-glyph">${h.glyph}</span>
      <span class="pc-main"><span class="pc-name">${h.name} <em>${h.cls}</em></span><span class="pc-meta">${h.tag}</span><span class="hpbar"><i style="width:${pct}%"></i></span></span>
      <span class="pc-right"><span class="pc-hp">${h.hp}<small>/${h.maxHp}</small></span><span class="pc-tag">AC ${h.ac}</span></span>`;
    card.addEventListener('click', () => openHeroInfo(h));
    box.appendChild(card);
  }
  if (!state.selected.length) {
    box.innerHTML = '<p class="party-empty">队伍还没有选定。</p>';
  }
}
function renderHand() {
  const hand = $('#hand');
  hand.innerHTML = '';
  if (state.screen !== 'trail') {
    $('#hand-owner').textContent = state.screen === 'cave' ? '洞穴' : '三猪小径';
    $('#hand-hint').textContent = state.screen === 'cave' ? '第一幕结束。' : '先观察树林，或直接前进';
    hand.innerHTML = '<p class="hand-empty">战斗时这里会变成手牌。</p>';
    return;
  }
  if (!state.combat || state.combat.ended) {
    $('#hand-owner').textContent = '三猪小径';
    $('#hand-hint').textContent = '打开探索地图，选下一个节点';
    hand.innerHTML = '<p class="hand-empty">路线图决定下一个事件；战斗时这里会变成手牌。</p>';
    return;
  }
  const c = state.combat;
  const cur = c.order[c.turn];
  if (!isPlayerTurn()) {
    $('#hand-owner').textContent = '哥布林在行动';
    $('#hand-hint').textContent = '等它们动完';
    hand.innerHTML = '<p class="hand-empty">哥布林正在树影里移动……</p>';
    return;
  }
  const h = state.party[cur];
  $('#hand-owner').textContent = `${h.name} · ${h.cls}`;
  $('#hand-hint').textContent = `目标：${state.goblins[state.targetId]?.name || '—'} · AC ${state.goblins[state.targetId]?.ac || '—'}`;
  for (const card of h.cards) {
    const usable = canUseCard(h, card);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `card ${usable ? '' : 'is-disabled'}`;
    btn.innerHTML = `<span class="card-cost">${card.cost}</span><span class="card-name">${card.name}</span><span class="card-hint">${card.hint}</span><span class="card-foot">${cardFoot(h, card)}</span><span class="card-info" role="button" tabindex="0" aria-label="查看 ${card.name} 说明">i</span>`;
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.card-info')) return;
      useCard(h, card);
    });
    btn.querySelector('.card-info').addEventListener('click', (e) => { e.stopPropagation(); openCardInfo(h, card); });
    hand.appendChild(btn);
  }
}
function cardFoot(h, card) {
  if (card.slot) return `法术位 ${h.slots}`;
  if (card.uses) return `次数 ${h.cardUses[card.id] ?? 0}`;
  if (card.kind === 'item') return `药水 ${state.items.potions}`;
  if (card.kind === 'attack') return '可用';
  return '可用';
}
function canUseCard(h, card) {
  if (!h || h.down || h.dead || state.busy) return false;
  const c = state.combat;
  if (!c || c.ended) return false;
  if (card.cost === 'A' && c.actionUsed) return false;
  if (card.cost === 'B' && c.bonusUsed) return false;
  if (card.slot && h.slots <= 0) return false;
  if (card.uses && (h.cardUses[card.id] ?? 0) <= 0) return false;
  if (card.kind === 'item' && state.items.potions <= 0) return false;
  if (card.kind === 'heal' && h.hp >= h.maxHp && !h.down) return false;
  return true;
}
function openCardInfo(h, card) {
  openModal({
    kicker: `${h.name} · ${h.cls}`, title: card.name, sub: card.hint,
    body: `<p>${card.desc || ''}</p><p class="quiet">费用：${card.cost === 'A' ? '动作' : '附赠动作'}${card.slot ? ' · 消耗 1 个法术位' : ''}${card.uses ? ` · 每短休 ${card.uses} 次` : ''}</p>`,
    actions: [{ label: '关闭', ghost: true, onClick: closeModal }],
  });
}
function openHeroInfo(h) {
  openModal({
    kicker: h.side === 'enemy' ? '敌人' : `${h.race} · ${h.cls}`, title: h.name,
    sub: h.side === 'enemy' ? `HP ${h.hp}/${h.maxHp} · AC ${h.ac}` : `HP ${h.hp}/${h.maxHp} · AC ${h.ac}`,
    body: `<p>${h.desc || h.tag || ''}</p>${h.quote ? `<p class="quote">${h.quote}</p>` : ''}${h.feature ? `<p class="quiet">${h.feature}</p>` : ''}`,
    actions: [{ label: '关闭', ghost: true, onClick: closeModal }],
  });
}

/* ---------------- intro ---------------- */

function openIntro(i = 0) {
  state.screen = 'intro';
  state.introStep = Math.max(0, Math.min(INTRO.length - 1, i));
  $('#select').hidden = true;
  $('#hud').hidden = true;
  const intro = $('#intro');
  intro.hidden = false;
  intro.classList.remove('is-out');
  world.setMode('intro');
  renderIntro();
}
function renderIntro() {
  const beat = INTRO[state.introStep];
  $('#intro-kicker').textContent = beat.kicker;
  $('#intro-title').innerHTML = beat.title.replace(/\n/g, '<br>');
  $('#intro-body').textContent = beat.body;
  $('#intro-note').textContent = beat.note || '';
  const letter = $('#intro-letter');
  letter.hidden = !beat.letter;
  const dots = $('#intro-dots');
  dots.innerHTML = INTRO.map((_, i) => `<i class="${i === state.introStep ? 'is-on' : ''}"></i>`).join('');
  $('#btn-intro-next').innerHTML = state.introStep === INTRO.length - 1 ? '进入队伍选择 <span>→</span>' : '继续 <span>→</span>';
  world.setIntroStep(state.introStep);
  // restart entry animations
  const main = $('.intro-main');
  main.querySelectorAll(':scope > *').forEach((el) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
}
function nextIntro() {
  if (state.introStep >= INTRO.length - 1) { openSelect(); return; }
  state.introStep += 1;
  renderIntro();
}

/* ---------------- select ---------------- */

function openSelect() {
  state.screen = 'select';
  state.selected = [];
  $('#intro').classList.add('is-out');
  setTimeout(() => { $('#intro').hidden = true; }, 500);
  $('#select').hidden = false;
  $('#select').classList.remove('is-out');
  $('#hud').hidden = true;
  world.setMode('select');
  world.setSelected([]);
  renderHeroPool();
  updateSelect();
}
function renderHeroPool() {
  const pool = $('#hero-pool');
  pool.innerHTML = '';
  for (const id of HERO_ORDER) {
    const h = HEROES[id];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hero-choice';
    card.dataset.id = id;
    card.innerHTML = `<span class="hero-glyph">${h.glyph}</span>
      <div class="hero-top"><span class="hero-name">${h.name}</span><span class="hero-en">${h.en}</span></div>
      <p class="hero-meta">${h.race} · ${h.cls}</p>
      <div class="hero-stats"><span>HP ${h.hp}</span><span>AC ${h.ac}</span><span>${h.tag.split(' · ')[1] || ''}</span></div>
      <p class="hero-desc">${h.desc}</p>
      <p class="hero-quote">${h.quote}</p>`;
    card.addEventListener('click', () => toggleHero(id));
    pool.appendChild(card);
  }
}
function toggleHero(id) {
  if (state.selected.includes(id)) state.selected = state.selected.filter((x) => x !== id);
  else {
    if (state.selected.length >= 3) { toast('队伍已满 3 人，先取消一名。'); return; }
    state.selected.push(id);
  }
  world.setSelected(state.selected);
  world.selectHero(id, state.selected.includes(id));
  updateSelect();
}
function updateSelect() {
  $('#select-count').textContent = state.selected.length;
  $$('.hero-choice').forEach((el) => {
    const on = state.selected.includes(el.dataset.id);
    el.classList.toggle('is-picked', on);
    el.classList.toggle('is-locked', !on && state.selected.length >= 3);
  });
  $('#btn-start').disabled = state.selected.length !== 3;
}

/* ---------------- party / trail ---------------- */

function buildParty() {
  state.party = {};
  for (const id of state.selected) {
    const h = HEROES[id];
    state.party[id] = {
      ...h, hp: h.hp, maxHp: h.hp, slots: h.cls.includes('牧师') || h.cls.includes('法师') ? 2 : 0,
      cardUses: {}, down: false, dead: false, active: false, dodge: false, advNext: false, helpAdv: false,
      side: 'party', target: false,
    };
    for (const card of h.cards) if (card.uses) state.party[id].cardUses[card.id] = card.uses;
  }
  state.goblins = {};
  for (const [id, g] of Object.entries(GOBLINS)) {
    state.goblins[id] = { ...g, hp: g.hp, maxHp: g.maxHp, down: false, dead: false, active: false, target: false, side: 'enemy', desc: '克拉格部族的哥布林，短弓与弯刀。' };
    world.setTokenMeta(id, { name: g.name, hp: g.hp, maxHp: g.maxHp });
  }
  for (const [id, h] of Object.entries(state.party)) world.setTokenMeta(id, { name: h.name, hp: h.hp, maxHp: h.hp });
}
function showHud() {
  $('#hud').hidden = false;
}
function setStory({ kicker, title, body, actions = [] }) {
  $('#story-kicker').textContent = kicker;
  $('#story-title').textContent = title;
  $('#story-body').innerHTML = body;
  const box = $('#story-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `choice ${a.primary ? 'primary' : ''}`;
    b.innerHTML = `<span class="c-key">${a.key || '→'}</span><span class="c-main"><span class="c-title">${a.title}</span><span class="c-sub">${a.sub || ''}</span></span><span class="c-go">→</span>`;
    b.addEventListener('click', a.onClick);
    box.appendChild(b);
  }
}
function startTrail() {
  if (state.selected.length !== 3) return;
  buildParty();
  $('#select').classList.add('is-out');
  setTimeout(() => { $('#select').hidden = true; }, 400);
  showHud();
  state.screen = 'trail';
  state.route = { visited: ['trail'], current: 'trail' };
  world.setSelected(state.selected);
  world.setMode('trail');
  setAct('trail');
  renderParty();
  renderHand();
  renderStoryTrail();
  $('#turnbar').hidden = true;
  world.setEnvironment('rain');
  updateEnvButton();
  log('三猪小径。雨把车辙泡成了泥。', 'log-roll');
  openMap();
}
function renderStoryTrail() {
  state.screen = 'trail';
  setAct('trail');
  setStory({
    kicker: STORY.trail.kicker,
    title: STORY.trail.title,
    body: `<p>${STORY.trail.body}</p><p class="quiet">地图上有两条岔路：去两匹死马，或去路旁浅溪。走到哪里，就触发哪个事件；树影节点会进入哥布林伏击。</p>`,
    actions: [
      { key: '图', title: '打开探索地图', sub: '选择下一个节点', primary: true, onClick: openMap },
      { key: '规', title: '查看规则书', sub: '检定、地图与战斗。', onClick: openRules },
    ],
  });
  renderHand();
}

/* ---------------- exploration map ---------------- */

function nodeById(id) { return MAP_NODES.find((n) => n.id === id); }
function neighborsOf(id) { return MAP_EDGES.filter((e) => e.includes(id)).map((e) => e[0] === id ? e[1] : e[0]); }
function availableNodes() {
  if (state.combat && !state.combat.ended) return [];
  const cur = state.route.current;
  return neighborsOf(cur).filter((id) => !state.route.visited.includes(id));
}
function openMap() {
  if (state.combat && !state.combat.ended) { toast('战斗结束后再看地图。'); return; }
  if (state.screen === 'cave') { toast('第一幕已经结束。'); return; }
  renderMap();
  $('#map').hidden = false;
}
function closeMap() { $('#map').hidden = true; }
function renderMap() {
  const nodes = $('#map-nodes');
  const lines = $('#map-lines');
  lines.innerHTML = '';
  nodes.innerHTML = '';
  const visited = state.route.visited;
  const current = state.route.current;
  const avail = availableNodes();
  for (const [a, b] of MAP_EDGES) {
    const A = nodeById(a), B = nodeById(b);
    if (!A || !B) continue;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', A.x); line.setAttribute('y1', A.y);
    line.setAttribute('x2', B.x); line.setAttribute('y2', B.y);
    if (visited.includes(a) && visited.includes(b)) line.classList.add('is-open');
    lines.appendChild(line);
  }
  for (const n of MAP_NODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `map-node is-${n.type}`;
    btn.style.left = `${n.x}%`;
    btn.style.top = `${n.y}%`;
    btn.dataset.id = n.id;
    const isVisited = visited.includes(n.id);
    const isCurrent = current === n.id;
    const isAvail = avail.includes(n.id);
    btn.classList.toggle('is-visited', isVisited && !isCurrent);
    btn.classList.toggle('is-current', isCurrent);
    btn.classList.toggle('is-available', isAvail);
    btn.classList.toggle('is-locked', !isVisited && !isCurrent && !isAvail);
    btn.innerHTML = `<span class="mn-icon">${n.icon}</span><span class="mn-title">${n.label}</span><span class="mn-sub">${n.sub}</span>`;
    btn.addEventListener('click', () => {
      if (!isAvail) {
        if (isCurrent) toast('你在这里。');
        else if (isVisited) toast('这个节点已经探索过了。');
        else toast('只能走到相邻且已解锁的节点。');
        return;
      }
      travelTo(n.id);
    });
    nodes.appendChild(btn);
  }
  const cur = nodeById(current);
  $('#map .map-head h2').textContent = cur && cur.id !== 'trail' ? `三猪小径 · ${cur.label}` : '三猪小径';
}
function travelTo(id) {
  if (!availableNodes().includes(id)) return;
  closeMap();
  state.route.visited.push(id);
  state.route.current = id;
  state.screen = 'trail';
  runNode(id);
}
function bestFor(ability) {
  return state.selected.map((id) => state.party[id])
    .filter((h) => h && !h.dead)
    .sort((a, b) => (b.skills[ability] || 0) - (a.skills[ability] || 0))[0];
}
function rollNodeCheck({ label, ability, dc }) {
  const best = bestFor(ability);
  const mod = best?.skills[ability] || 0;
  return roll20('normal', { label }).then((r) => {
    const total = r.used + mod;
    const ok = total >= dc;
    showRoll({ title: `${best?.name || '队伍'} · ${label}`, values: r.values, used: r.wordMode ? r.card : r.used, mod: mod + (r.bonus || 0), ac: dc, success: ok, text: ok ? '成功' : '失败', word: r.word, meaning: r.meaning, wordBonus: r.bonus || 0, wordCorrect: r.correct });
    log(`${best?.name || '队伍'} ${label}：${checkText(r)} + ${abilityName(ability)} ${sign(mod)} = ${total} vs DC ${dc}${ok ? ' · 成功' : ' · 失败'}`, ok ? 'log-good' : 'log-bad');
    if (r.wordMode) log(`词义：${r.word} = ${r.meaning} · ${r.correct ? '正确' : '错误'}`, r.correct ? 'log-good' : 'log-bad');
    return { r, total, ok, best, mod };
  });
}
function abilityName(key) {
  return { investigation: '调查', survival: '生存', athletics: '运动', perception: '察觉' }[key] || key;
}
function afterNode(kicker, title, body) {
  state.screen = 'trail';
  setAct('trail');
  setStory({
    kicker, title, body,
    actions: [
      { key: '图', title: '继续探索', sub: '回到分支地图，选下一个节点', primary: true, onClick: openMap },
      { key: '规', title: '查看规则书', sub: '检定、优势与短休。', onClick: openRules },
    ],
  });
  renderParty();
  renderHand();
}
async function nodeHorses() {
  setBusy(true);
  const { ok } = await rollNodeCheck({ label: '调查马尸', ability: 'investigation', dc: 12 });
  state.clues.horses = ok;
  await wait(450);
  setBusy(false);
  afterNode('事件 · 两匹死马', ok ? '被翻过的鞍袋' : '雨里的鞍袋', `<p>${ok ? '两匹马都中了三箭。西尔达的灰马鞍袋里有一张被雨泡皱的便条：<b>“先回凡达林。若我们没到，找巴特恩。”</b> 冈德伦的矮种马不在，泥地上有一道很宽的拖痕。' : '泥水糊住了鞍袋，你只摸到一手冷铁和断箭。拖痕被雨冲得很淡，但树影的方向还有东西在动。'}</p><p class="quiet">分支：可以继续去树影，也可以绕去翻倒的补给车。</p>`);
}
async function nodeStream() {
  setBusy(true);
  const { ok } = await rollNodeCheck({ label: '生存 · 浅溪', ability: 'survival', dc: 12 });
  state.clues.stream = ok;
  await wait(450);
  setBusy(false);
  afterNode('事件 · 路旁浅溪', ok ? '被水冲淡的拖痕' : '什么也没找到', `<p>${ok ? '你在溪边的软泥里找到两道很深的拖痕，还有一小片铁甲上的红漆。有人被拖向树影，而且不止一个。' : '雨把泥地冲成一片糊。你只看见几根被踩断的蕨草，方向说不准。'}</p><p class="quiet">${ok ? '拖痕让队伍记住了伏击位置：战斗第 1 轮攻击有优势。' : '至少溪水可以补满水袋。'}</p>`);
}
function nodeWagon() {
  state.items.potions += 1;
  world.playSkill(state.selected[0], 'heal', state.selected[0]);
  log('在翻倒的补给车里找到 1 瓶治疗药水。', 'log-good');
  afterNode('事件 · 翻倒的补给车', '散落的补给', '<p>车辕断了，箱子摔在蕨丛里。你从湿透的麻布下摸出一瓶还完好的治疗药水，另外还有几枚被泥裹住的银币。</p><p class="quiet">补给 +1 治疗药水。拖痕往树影方向去了。</p>');
}
async function nodeCliff() {
  setBusy(true);
  const { ok, best } = await rollNodeCheck({ label: '运动 · 崖壁', ability: 'athletics', dc: 13 });
  await wait(400);
  if (!ok) {
    const dmg = d(4);
    if (best) { best.hp = Math.max(1, best.hp - dmg); world.floatAt(best.id, `-${dmg}`, 'dmg'); log(`${best.name} 从湿岩上滑下，受到 ${dmg} 点伤害。`, 'log-bad'); }
  }
  state.clues.cliff = ok;
  setBusy(false);
  renderParty();
  afterNode('事件 · 崖壁捷径', ok ? '岩缝上的视野' : '湿滑的岩壁', `<p>${ok ? '你们从一条被树根遮住的岩缝爬上去，能从高处看见崖壁下的裂口：溪水、两只哥布林哨兵、还有洞口的火光。' : '岩壁比看上去滑。有人摔了下来，好在只是擦伤；你们退回溪边，仍能沿拖痕去树影。'}</p><p class="quiet">${ok ? '捷径已记住：之后到巢穴入口时不会迷路。' : '下次可以换条路。'}</p>`);
}
async function nodeShade() {
  setBusy(true);
  const { ok } = await rollNodeCheck({ label: '察觉 · 树影', ability: 'perception', dc: 12 });
  state.surprised = !ok;
  await wait(500);
  setBusy(false);
  await startCombat(state.surprised);
}
function nodeCave() {
  shortRest();
}
function runNode(id) {
  if (id === 'horses') return nodeHorses();
  if (id === 'stream') return nodeStream();
  if (id === 'wagon') return nodeWagon();
  if (id === 'cliff') return nodeCliff();
  if (id === 'shade') return nodeShade();
  if (id === 'cave') return nodeCave();
}

/* ---------------- combat ---------------- */

function isPlayerTurn() {
  const c = state.combat;
  return !!c && !c.ended && ['darvin', 'barvin', 'bruenor', 'aramil'].includes(c.order[c.turn]);
}
function orderedGoblins() { return Object.values(state.goblins).filter((g) => !g.dead && g.hp > 0); }
function standingParty() { return Object.values(state.party).filter((p) => !p.down && !p.dead && p.hp > 0); }
function goblinName(id) { return state.goblins[id]?.name || id; }
function heroName(id) { return state.party[id]?.name || state.goblins[id]?.name || id; }

async function startCombat(surprised = false) {
  if (state.combat) return;
  const c = { order: [], init: {}, turn: -1, round: 1, actionUsed: false, bonusUsed: false, ended: false, surprised: !!surprised, tracksAdv: !!state.clues.stream };
  state.combat = c;
  state.surprised = !!surprised;
  state.targetId = orderedGoblins()[0]?.id || null;
  world.revealGoblins(true);
  setAct('trail');
  for (const id of state.selected) {
    const h = state.party[id];
    c.init[id] = d(20) + (h.init || 0);
    world.setTokenMeta(id, { name: h.name, hp: h.hp, maxHp: h.maxHp, active: false, target: false });
  }
  for (const g of orderedGoblins()) {
    c.init[g.id] = d(20) + (g.init || 0);
    world.setTokenMeta(g.id, { name: g.name, hp: g.hp, maxHp: g.maxHp, active: false, target: false });
  }
  c.order = [...state.selected, ...orderedGoblins().map((g) => g.id)].sort((a, b) => c.init[b] - c.init[a]);
  log(`先攻：${c.order.map((id) => `${heroName(id)} ${c.init[id]}`).join(' · ')}`, 'log-roll');
  renderParty();
  setBusy(true);
  if (surprised) {
    renderCombat();
    toast('哥布林伏击！', 'is-bad');
    log('哥布林从蕨丛里先放了一轮箭。', 'log-bad');
    $('#story-body').insertAdjacentHTML('beforeend', '<p class="quiet bad">伏击：哥布林先手。</p>');
    await wait(500);
    for (const g of orderedGoblins()) await goblinAttack(g, true);
    c.surprised = false;
    setBusy(false);
  }
  setBusy(false);
  nextTurn();
}
function renderCombat() {
  const c = state.combat;
  if (!c || c.ended) return;
  const cur = c.order[c.turn];
  const curName = cur ? heroName(cur) : '哥布林伏击';
  $('#story-kicker').textContent = STORY.trail.kicker;
  $('#story-title').textContent = '三猪小径 · 伏击';
  const living = orderedGoblins().length;
  $('#story-body').innerHTML = `<p>${STORY.trail.combat}</p><p class="quiet">第 <b>${c.round}</b> 轮 · 当前：<b>${curName}</b>${isPlayerTurn() ? ' · 点手牌行动' : ' · 哥布林正在行动'}</p><p class="quiet">剩 ${living} 只哥布林。点哥布林切换目标；点角色看说明。</p>`;
  const box = $('#story-actions');
  box.innerHTML = '';
  const end = { key: '结', title: isPlayerTurn() ? '结束回合' : '等待哥布林', sub: isPlayerTurn() ? '把回合交给下一位。' : '敌人正在行动。', primary: true, onClick: isPlayerTurn() ? endTurn : null };
  const rules = { key: '规', title: '查看规则书', sub: '攻击、优势、豁免与短休。', onClick: openRules };
  for (const a of [end, rules]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `choice ${a.primary ? 'primary' : ''}`;
    b.disabled = !a.onClick;
    b.innerHTML = `<span class="c-key">${a.key}</span><span class="c-main"><span class="c-title">${a.title}</span><span class="c-sub">${a.sub}</span></span><span class="c-go">→</span>`;
    if (a.onClick) b.addEventListener('click', a.onClick);
    box.appendChild(b);
  }
  renderParty();
  renderTurnbar();
  renderHand();
  setActiveState(cur);
  if (state.targetId && !state.goblins[state.targetId]?.dead) world.setTarget(state.targetId);
  else { state.targetId = orderedGoblins()[0]?.id || null; world.setTarget(state.targetId); }
}
function setActiveState(id) {
  for (const h of Object.values(state.party)) h.active = h.id === id;
  for (const g of Object.values(state.goblins)) g.active = g.id === id;
  world.setActive(id);
  for (const [id2, h] of Object.entries(state.party)) world.setTokenMeta(id2, { name: h.name, hp: h.hp, maxHp: h.maxHp });
  for (const [id2, g] of Object.entries(state.goblins)) world.setTokenMeta(id2, { name: g.name, hp: g.hp, maxHp: g.maxHp });
}
function renderTurnbar() {
  const c = state.combat;
  const bar = $('#turnbar');
  if (!c || c.ended) { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = '';
  for (const id of c.order) {
    const isG = id.startsWith('goblin');
    const t = isG ? state.goblins[id] : state.party[id];
    if (!t || t.dead || t.hp <= 0) continue;
    const chip = document.createElement('span');
    chip.className = `turn-chip ${id === c.order[c.turn] ? 'is-active' : ''} ${isG ? 'is-enemy' : ''} ${t.down ? 'is-down' : ''}`;
    chip.innerHTML = `<b>${c.init[id]}</b>${t.name}`;
    bar.appendChild(chip);
  }
  const r = document.createElement('span');
  r.className = 'turn-round'; r.textContent = `ROUND ${c.round}`;
  bar.appendChild(r);
}
function nextTurn() {
  const c = state.combat;
  if (!c || c.ended) return;
  if (!orderedGoblins().length) { void victory(); return; }
  if (!standingParty().length) { defeat(); return; }
  let guard = 0;
  while (guard++ < 40) {
    c.turn += 1;
    if (c.turn >= c.order.length) {
      c.turn = 0;
      c.round += 1;
      if (c.bless > 0) c.bless -= 1;
    }
    const id = c.order[c.turn];
    const isG = id.startsWith('goblin');
    const t = isG ? state.goblins[id] : state.party[id];
    if (t && !t.dead && t.hp > 0) break;
  }
  const id = c.order[c.turn];
  const isG = id.startsWith('goblin');
  c.actionUsed = false; c.bonusUsed = false;
  if (isG) {
    setBusy(true);
    renderCombat();
    void wait(450).then(() => enemyTurn(state.goblins[id]));
    return;
  }
  const h = state.party[id];
  if (h.down) {
    setBusy(true);
    renderCombat();
    void deathSave(h);
    return;
  }
  setBusy(false);
  renderCombat();
  log(`轮到 ${h.name}。`, 'log-good');
}
function endTurn() {
  if (state.busy || !isPlayerTurn()) return;
  const c = state.combat;
  c.actionUsed = true; c.bonusUsed = true;
  nextTurn();
}
async function enemyTurn(g) {
  if (!g || g.dead || g.hp <= 0) { setBusy(false); nextTurn(); return; }
  const party = standingParty();
  if (!party.length) { setBusy(false); defeat(); return; }
  await goblinAttack(g, false);
  setBusy(false);
  if (!state.combat.ended) nextTurn();
}
async function goblinAttack(g, surprise = false) {
  const party = standingParty();
  if (!party.length) return;
  const target = party[Math.floor(Math.random() * party.length)];
  let mode = 'normal';
  if (target.dodge) mode = 'dis';
  const r = await roll20(mode, { dice: true });
  const total = r.used + g.atk;
  const crit = r.used === 20;
  const hit = r.used === 1 ? false : (crit || total >= target.ac);
  showRoll({ title: `${g.name} · 短弓`, values: r.values, used: r.used, mod: g.atk, ac: target.ac, success: hit, text: crit ? '暴击！' : hit ? '命中' : '未命中' });
  log(`${g.name} 短弓射向${target.name}：d20 ${sign(g.atk)} = ${total} vs AC ${target.ac}${crit ? ' · 暴击' : ''}`, 'log-roll');
  world.playSkill(g.id, 'bow', target.id);
  await wait(500);
  if (hit) {
    let dmg = rollDice(g.dmg);
    if (crit) dmg.sum += rollDice(g.dmg).sum;
    applyDamage(target, dmg.sum, g.name);
    world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
    world.shake(0.35);
    sfx('hit');
  } else { log('箭擦着耳朵过去。', 'log-bad'); sfx('miss'); }
}
function applyDamage(target, amount, source) {
  if (!target || target.dead) return;
  target.hp = Math.max(0, target.hp - amount);
  log(`${target.name} 受到 ${amount} 点伤害（${source}）。`, 'log-bad');
  if (target.hp <= 0) {
    target.hp = 0;
    if (target.side === 'enemy' || target.id?.startsWith('goblin')) {
      target.dead = true;
      world.playSkill(target.id, 'die', target.id);
      world.setTokenMeta(target.id, { name: `${target.name} 倒地`, hp: 0, maxHp: target.maxHp });
      setTimeout(() => { const t = world.goblins.get(target.id); if (t) { t.group.visible = false; t.label.style.display = 'none'; } }, 450);
      log(`${target.name} 倒下。`, 'log-good');
    } else {
      target.down = true;
      target.active = false;
      world.setTokenMeta(target.id, { name: `${target.name} 倒地`, hp: 0, maxHp: target.maxHp });
      log(`${target.name} 倒地，开始死亡豁免。`, 'log-bad');
      sfx('lose');
    }
  }
  renderParty();
}
async function deathSave(h) {
  const r = await roll20('normal', { dice: true });
  if (r.used === 20) { h.hp = 1; h.down = false; log(`${h.name} 自然 20！睁开了眼。`, 'log-good'); world.floatAt(h.id, '+1', 'heal'); }
  else {
    h.deathOk = (h.deathOk || 0) + (r.used >= 10 ? 1 : 0);
    h.deathFail = (h.deathFail || 0) + (r.used === 1 ? 2 : r.used < 10 ? 1 : 0);
    log(`${h.name} 死亡豁免：${r.used}（成功 ${h.deathOk || 0}/3，失败 ${h.deathFail || 0}/3）`, r.used >= 10 ? 'log-good' : 'log-bad');
    if (h.deathOk >= 3) log(`${h.name} 稳定下来。`, 'log-good');
    if (h.deathFail >= 3) { h.dead = true; h.down = false; log(`${h.name} 停止了呼吸。`, 'log-bad'); }
  }
  setBusy(false);
  renderParty();
  if (!standingParty().length) { defeat(); return; }
  nextTurn();
}
async function victory() {
  const c = state.combat;
  if (!c || c.ended) return;
  c.ended = true;
  setBusy(false);
  state.targetId = null;
  setAct('trail');
  renderParty();
  $('#turnbar').hidden = true;
  $('#story-kicker').textContent = STORY.victory.kicker;
  $('#story-title').textContent = STORY.victory.title;
  $('#story-body').innerHTML = `<p>${STORY.victory.body}</p><p class="quiet">战斗结束。回到分支地图，可以继续去巢穴入口。</p>`;
  const box = $('#story-actions');
  box.innerHTML = '';
  const a1 = { key: '图', title: '继续探索', sub: '回到分支地图，选下一个节点', primary: true, onClick: openMap };
  const a2 = { key: '规', title: '查看规则书', sub: '短休与死亡豁免。', onClick: openRules };
  for (const a of [a1, a2]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = `choice ${a.primary ? 'primary' : ''}`;
    b.innerHTML = `<span class="c-key">${a.key}</span><span class="c-main"><span class="c-title">${a.title}</span><span class="c-sub">${a.sub}</span></span><span class="c-go">→</span>`;
    b.addEventListener('click', a.onClick); box.appendChild(b);
  }
  renderHand();
  toast('四个哥布林倒下', 'is-good');
  log('战斗结束。雨还在下。', 'log-good');
  sfx('win');
}
function shortRest() {
  if (state.screen !== 'trail') return;
  state.shortRest = true;
  for (const h of Object.values(state.party)) {
    if (h.dead) continue;
    if (h.down) { h.down = false; h.hp = 1; }
    const die = h.cls.includes('战士') ? 10 : h.cls.includes('游荡者') ? 8 : h.cls.includes('牧师') ? 8 : 6;
    const heal = d(die) + (h.cls.includes('战士') ? 1 : h.cls.includes('牧师') ? 3 : 1);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    h.slots = h.cls.includes('牧师') || h.cls.includes('法师') ? 2 : h.slots;
    h.cardUses = {};
    for (const card of h.cards) if (card.uses) h.cardUses[card.id] = card.uses;
    log(`${h.name} 短休，恢复 ${heal} HP。`, 'log-good');
  }
  state.items.potions = Math.max(state.items.potions, 1);
  renderParty();
  world.setMode('cave');
  state.screen = 'cave';
  setAct('cave');
  $('#story-kicker').textContent = STORY.cave.kicker;
  $('#story-title').textContent = STORY.cave.title;
  $('#story-body').innerHTML = `<p>${STORY.cave.body}</p><p class="quiet">第一幕结束。克拉格巢穴的战斗留给下一段切片。</p>`;
  const box = $('#story-actions');
  box.innerHTML = '';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'choice primary';
  b.innerHTML = '<span class="c-key">再</span><span class="c-main"><span class="c-title">从头再来</span><span class="c-sub">重新选择队伍</span></span><span class="c-go">→</span>';
  b.addEventListener('click', () => location.reload()); box.appendChild(b);
  renderHand();
  $('#turnbar').hidden = true;
  log('你们沿拖痕走到崖壁下。溪水从裂口里涌出来。', 'log-roll');
}
function defeat() {
  const c = state.combat;
  if (c) c.ended = true;
  setBusy(false);
  state.screen = 'cave';
  world.setMode('cave');
  setAct('cave');
  $('#story-kicker').textContent = '第一幕 · 灰';
  $('#story-title').textContent = '雨没有停';
  $('#story-body').innerHTML = '<p>最后一个冒险者倒在泥里。哥布林把补给拖进树影，雨很快盖住了痕迹。</p><p class="quiet">全队倒下。三猪小径的第一幕以失败告终。</p>';
  const box = $('#story-actions'); box.innerHTML = '';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'choice primary';
  b.innerHTML = '<span class="c-key">再</span><span class="c-main"><span class="c-title">重新来过</span><span class="c-sub">重新选择队伍</span></span><span class="c-go">→</span>';
  b.addEventListener('click', () => location.reload()); box.appendChild(b);
  renderParty(); renderHand(); $('#turnbar').hidden = true;
}

/* ---------------- cards / dice ---------------- */

async function useCard(h, card) {
  if (!canUseCard(h, card)) return;
  const c = state.combat;
  if (card.kind === 'attack') return useAttack(h, card);
  if (card.kind === 'mm') return useMagicMissile(h, card);
  if (card.kind === 'heal') return useHeal(h, card);
  if (card.kind === 'spell-heal') return useSpellHeal(h, card);
  if (card.kind === 'bless') return useBless(h, card);
  if (card.kind === 'hide') return useHide(h, card);
  if (card.kind === 'help') return useHelp(h, card);
  if (card.kind === 'dodge') return useDodge(h, card);
  if (card.kind === 'item') return useItem(h, card);
  if (card.kind === 'end') return endTurn();
}
function markAction(h, card) {
  const c = state.combat;
  if (card.cost === 'A') c.actionUsed = true;
  if (card.cost === 'B') c.bonusUsed = true;
  if (card.slot) h.slots -= 1;
  if (card.uses) h.cardUses[card.id] = (h.cardUses[card.id] ?? 0) - 1;
}
function attackMode(h, target) {
  if (h.dodge) return 'dis';
  if (state.combat?.tracksAdv && state.combat.round === 1) return 'adv';
  if (h.advNext || h.helpAdv) return 'adv';
  return 'normal';
}
async function useAttack(h, card) {
  const target = state.goblins[state.targetId];
  if (!target || target.dead) { toast('先选一个目标。'); return; }
  setBusy(true);
  const mode = attackMode(h, target);
  const r = await roll20(mode, { label: card.name });
  const blessBonus = state.combat.bless > 0 ? d(4) : 0;
  const total = r.used + h.atk.mod + blessBonus;
  const natural = r.wordMode ? r.card : r.used;
  const crit = natural === 20;
  const hit = natural === 1 ? false : (crit || total >= target.ac);
  showRoll({ title: `${h.name} · ${card.name}`, values: r.values, used: r.wordMode ? r.card : r.used, mod: h.atk.mod + (r.bonus || 0) + (typeof blessBonus !== 'undefined' ? blessBonus : 0), ac: target.ac, success: hit, text: crit ? '暴击！' : hit ? '命中' : '未命中', word: r.word, meaning: r.meaning, wordBonus: r.bonus || 0, wordCorrect: r.correct });
  log(`${h.name} 用${card.name}攻击${target.name}：${checkText(r)}${blessBonus ? ` + 祝福 ${blessBonus}` : ''} + 攻击 ${sign(h.atk.mod)} = ${total} vs AC ${target.ac}${crit ? ' · 暴击' : ''}`, 'log-roll');
  if (r.wordMode) log(`词义：${r.word} = ${r.meaning} · ${r.correct ? '正确' : '错误'}`, r.correct ? 'log-good' : 'log-bad');
  const kind = h.id === 'darvin' || h.id === 'bruenor' ? 'sword' : h.id === 'barvin' ? 'bow' : 'fire';
  world.playSkill(h.id, kind, target.id);
  h.advNext = false; h.helpAdv = false;
  await wait(520);
  if (hit) {
    let dmg = rollDice(h.atk.dmg);
    let extra = '';
    if (crit) { const c2 = rollDice(h.atk.dmg); dmg.sum += c2.sum; extra += ` + 暴击 ${c2.text}`; }
    if (h.id === 'barvin') {
      const sneak = rollDice([1, 6, 0]); dmg.sum += sneak.sum; extra += ` + 偷袭 ${sneak.text}`;
    }
    applyDamage(target, dmg.sum, h.name);
    world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
    world.shake(crit ? 0.6 : 0.3);
    sfx('hit');
    log(`伤害：${dmg.text}${extra} = ${dmg.sum}`, 'log-hit');
  } else { log('没有命中。', 'log-bad'); sfx('miss'); }
  markAction(h, card);
  await wait(300);
  setBusy(false);
  renderParty(); renderHand();
  if (!orderedGoblins().length) { victory(); return; }
  renderCombat();
  if (!state.combat.ended) { /* keep turn; action used */ }
}
async function useMagicMissile(h, card) {
  const target = state.goblins[state.targetId];
  if (!target || target.dead) return;
  if (h.slots <= 0) return;
  setBusy(true);
  const dmg = rollDice([3, 4, 3]);
  markAction(h, card);
  showRoll({ title: `${h.name} · 魔法飞弹`, values: [dmg.sum], used: dmg.sum, mod: 0, success: true, auto: true, text: '自动命中' });
  log(`${h.name} 施放魔法飞弹：${dmg.text} = ${dmg.sum}，消耗 1 个法术位。`, 'log-hit');
  world.playSkill(h.id, 'magic', target.id);
  applyDamage(target, dmg.sum, h.name);
  world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
  world.shake(0.3);
  await wait(500);
  setBusy(false);
  renderParty(); renderHand();
  if (!orderedGoblins().length) { victory(); return; }
  renderCombat();
}
function useHeal(h, card) {
  if (state.busy) return;
  const heal = rollDice(card.heal);
  h.hp = Math.min(h.maxHp, h.hp + heal.sum);
  if (h.down) { h.down = false; h.hp = Math.max(1, h.hp); }
  log(`${h.name} 使用${card.name}：${heal.text}，恢复 ${heal.sum} HP。`, 'log-good');
  world.playSkill(h.id, 'heal', h.id);
  world.floatAt(h.id, `+${heal.sum}`, 'heal');
  markAction(h, card);
  renderParty(); renderHand();
}
function useSpellHeal(h, card) {
  if (state.busy) return;
  if (h.slots <= 0) return;
  const heal = rollDice([1, 8, 3]);
  const target = standingParty().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || h;
  target.hp = Math.min(target.maxHp, target.hp + heal.sum);
  if (target.down) { target.down = false; target.hp = Math.max(1, target.hp); }
  markAction(h, card);
  log(`${h.name} 施放治疗伤口：${heal.text}，${target.name} 恢复 ${heal.sum} HP。`, 'log-good');
  world.playSkill(h.id, 'heal', target.id);
  world.floatAt(target.id, `+${heal.sum}`, 'heal');
  renderParty(); renderHand();
}
function useBless(h, card) {
  if (state.busy) return;
  if (h.slots <= 0) return;
  markAction(h, card);
  state.combat.bless = 3;
  log(`${h.name} 施放祝福：3 轮内全队攻击 +1d4。`, 'log-good');
  world.playSkill(h.id, 'help', h.id);
  renderParty(); renderHand();
}
function useHide(h, card) {
  if (state.busy) return;
  markAction(h, card);
  h.advNext = true;
  log(`${h.name} 藏进蕨丛：下一次攻击有优势。`, 'log-good');
  world.playSkill(h.id, 'hide', h.id);
  renderParty(); renderHand();
}
function useHelp(h, card) {
  if (state.busy) return;
  const ally = state.selected.map((id) => state.party[id]).find((p) => p.id !== h.id && !p.down && !p.dead);
  if (!ally) { toast('没有可协助的队友。'); return; }
  markAction(h, card);
  ally.helpAdv = true;
  log(`${h.name} 协助${ally.name}：下一次攻击有优势。`, 'log-good');
  world.playSkill(h.id, 'help', ally.id);
  renderParty(); renderHand();
}
function useDodge(h, card) {
  if (state.busy) return;
  markAction(h, card);
  h.dodge = true;
  log(`${h.name} 进入防御：直到下回合，攻击他的检定有劣势。`, 'log-good');
  world.playSkill(h.id, 'dodge', h.id);
  renderParty(); renderHand();
}
async function useItem(h, card) {
  if (state.busy) return;
  if (state.items.potions <= 0) return;
  state.items.potions -= 1;
  const heal = rollDice([2, 4, 2]);
  h.hp = Math.min(h.maxHp, h.hp + heal.sum);
  if (h.down) { h.down = false; h.hp = Math.max(1, h.hp); }
  markAction(h, card);
  log(`${h.name} 喝下治疗药水：${heal.text}，恢复 ${heal.sum} HP。`, 'log-good');
  world.playSkill(h.id, 'heal', h.id);
  world.floatAt(h.id, `+${heal.sum}`, 'heal');
  renderParty(); renderHand();
}


/* ---------------- word check ---------------- */

function buildWordDeck() {
  const pool = shuffle(WORDS).slice(0, 20);
  const values = shuffle([...Array(20).keys()].map((i) => i + 1));
  wordDeck = shuffle(pool.map((w, i) => ({ ...w, value: values[i] })));
}
function drawWordCard() {
  if (!wordDeck.length) buildWordDeck();
  return wordDeck.pop();
}
function checkText(r) {
  if (!r || !r.wordMode) return 'd20';
  return `词卡 ${r.card} + 词义 ${sign(r.bonus)}`;
}
function wordCheck(mode = 'normal', label = '检定') {
  if (wordActive) return Promise.resolve({ values: [10], used: 10, card: 10, bonus: 0, word: '—', meaning: '—', correct: false, wordMode: true });
  const c1 = drawWordCard();
  const c2 = mode === 'normal' ? null : drawWordCard();
  const correctMeaning = c1.meaning;
  const distractorPool = shuffle(WORDS.filter((w) => w.meaning !== correctMeaning).map((w) => w.meaning)).slice(0, 3);
  const options = shuffle([correctMeaning, ...distractorPool]);
  const modal = $('#word-modal');
  $('#word-kicker').textContent = `单词检定 · ${label}`;
  $('#word-word').textContent = c1.word;
  const optBox = $('#word-options');
  optBox.innerHTML = '';
  const result = $('#word-result');
  result.hidden = true;
  result.innerHTML = '';
  const bar = $('#word-timer-bar');
  bar.style.transform = 'scaleX(1)';
  modal.hidden = false;
  wordActive = true;
  const started = performance.now();
  const limit = 8000;
  return new Promise((resolve) => {
    let done = false;
    const finish = (picked) => {
      if (done) return;
      done = true;
      wordActive = false;
      cancelAnimationFrame(wordTimerRaf);
      const elapsed = (performance.now() - started) / 1000;
      const correct = picked === correctMeaning;
      let bonus = correct ? (elapsed <= 4 ? 3 : 2) : -2;
      if (picked === null) bonus = -3;
      const base = mode === 'adv' ? Math.max(c1.value, c2.value) : mode === 'dis' ? Math.min(c1.value, c2.value) : c1.value;
      const used = base + bonus;
      [...optBox.children].forEach((b) => {
        b.disabled = true;
        if (b.textContent === correctMeaning) b.classList.add('is-correct');
        if (picked !== null && b.textContent === picked && !correct) b.classList.add('is-wrong');
      });
      bar.style.transform = 'scaleX(0)';
      result.innerHTML = `<p class="${correct ? 'is-good' : 'is-bad'}">${correct ? '正确' : '错误'} · <b>${c1.word}</b> = ${c1.meaning}</p><p>词卡 <b>${base}</b>${mode !== 'normal' ? `（${mode === 'adv' ? '优势取高' : '劣势取低'}）` : ''} + 词义 <b>${sign(bonus)}</b> = <b>${used}</b></p>`;
      result.hidden = false;
      setTimeout(() => {
        modal.hidden = true;
        resolve({ values: [base], used, card: base, bonus, word: c1.word, meaning: c1.meaning, correct, wordMode: true });
      }, 1100);
    };
    for (const meaning of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'word-option';
      b.textContent = meaning;
      b.addEventListener('click', () => finish(meaning));
      optBox.appendChild(b);
    }
    const tick = () => {
      if (done) return;
      const elapsed = performance.now() - started;
      const remain = Math.max(0, 1 - elapsed / limit);
      bar.style.transform = `scaleX(${remain})`;
      if (remain <= 0) { finish(null); return; }
      wordTimerRaf = requestAnimationFrame(tick);
    };
    wordTimerRaf = requestAnimationFrame(tick);
  });
}

/* ---------------- dice ---------------- */

const QA = new URLSearchParams(location.search).has('qa');
async function roll20(mode = 'normal', opts = {}) {
  if (state.checkMode === 'word' && !opts.dice) {
    return await wordCheck(mode, opts.label || '检定');
  }
  const a = d(20), b = d(20);
  const values = mode === 'normal' ? [a] : [a, b];
  let used;
  if (mode === 'adv') used = Math.max(a, b);
  else if (mode === 'dis') used = Math.min(a, b);
  else used = a;
  const res = await world.roll(values, mode);
  if (Array.isArray(res)) used = mode === 'adv' ? Math.max(...res) : mode === 'dis' ? Math.min(...res) : res[0];
  else if (typeof res === 'number') used = res;
  return { values, used };
}
function rollDice([n, faces, mod]) {
  const rolls = [];
  let sum = 0;
  for (let i = 0; i < n; i++) { const v = d(faces); rolls.push(v); sum += v; }
  sum += mod || 0;
  return { sum, text: `${n}d${faces}${mod ? sign(mod) : ''} = ${rolls.join('+')}${mod ? `+${mod}` : ''}` };
}
function sfx(kind) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = sfx.ctx || (sfx.ctx = new Ctx());
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const map = { hit: [140, 0.06], miss: [220, 0.04], win: [520, 0.12], lose: [90, 0.16], heal: [660, 0.1] };
    const [freq, dur] = map[kind] || [300, 0.05];
    o.frequency.value = freq; o.type = kind === 'hit' ? 'square' : 'sine';
    g.gain.setValueAtTime(0.04, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* no audio */ }
}
async function freeRoll() {
  if (state.busy) return;
  const v = d(20);
  const res = await world.roll([v], 'normal');
  const used = Array.isArray(res) ? res[0] : (typeof res === 'number' ? res : v);
  showRoll({ title: '自由掷骰', values: [v], used, mod: 0, success: used >= 10, text: used >= 10 ? '高' : '低' });
}

/* ---------------- world callbacks ---------------- */

function onPick(id, kind) {
  if (state.screen !== 'trail') return;
  if (state.goblins[id]) {
    state.targetId = id;
    world.setTarget(id);
    if (state.combat) renderHand();
    return;
  }
  const h = state.party[id];
  if (h) openHeroInfo(h);
}
function onPickHero(id) {
  if (state.screen !== 'select') return;
  toggleHero(id);
}
world = createWorld({ onPick, onPickHero, onDice: freeRoll });

world.setMode('intro');
world.setIntroStep(0);
setEnvironmentDefault();

/* ---------------- story / log / UI ---------------- */

function setEnvironmentDefault() { try { world.setEnvironment('rain', true); } catch {} }
function updateEnvButton() {
  const b = $('#btn-env');
  if (!b) return;
  const e = world.getEnvironment();
  b.textContent = ENV_LABELS[e.name] || e.label;
  b.title = `当前环境：${ENV_LABELS[e.name] || e.label} · 点击切换`;
}
function updateCheckMode() {
  const b = $('#btn-check-mode');
  if (!b) return;
  b.textContent = state.checkMode === 'word' ? '检定 · 单词' : '检定 · d20';
  $('#dice-status').textContent = state.checkMode === 'word' ? '词卡已洗好 · 20 张' : 'd20 已在桌上';
}
function renderRules() {
  const allRules = [...RULES, RULES_WORD];
  const tabs = $('#rules-tabs');
  tabs.innerHTML = '';
  allRules.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `rules-tab ${i === 0 ? 'is-on' : ''}`; b.textContent = r.label;
    b.addEventListener('click', () => {
      $$('.rules-tab').forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on');
      $('#rules-body').innerHTML = r.body;
    });
    tabs.appendChild(b);
  });
  $('#rules-body').innerHTML = allRules[0].body;
}
function openRules() {
  renderRules();
  $('#rules').hidden = false;
}
function closeRules() { $('#rules').hidden = true; }

/* ---------------- bindings ---------------- */

$('#btn-intro-next').addEventListener('click', nextIntro);
$('#btn-intro-skip').addEventListener('click', openSelect);
$('#btn-select-back').addEventListener('click', () => openIntro(INTRO.length - 1));
$('#btn-start').addEventListener('click', startTrail);
$('#btn-route').addEventListener('click', openMap);
$('#btn-map-close').addEventListener('click', closeMap);
$('#btn-check-mode').addEventListener('click', () => {
  state.checkMode = state.checkMode === 'word' ? 'dice' : 'word';
  updateCheckMode();
  toast(state.checkMode === 'word' ? '检定：单词卡' : '检定：d20');
});
$('#btn-rules').addEventListener('click', openRules);
$('#btn-rules-close').addEventListener('click', closeRules);
$('#btn-reset').addEventListener('click', () => world.resetCamera());
$('#btn-modal-close').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.dataset.closeModal !== undefined || e.target.classList.contains('modal-backdrop')) closeModal(); });
$('#btn-restart').addEventListener('click', () => {
  openModal({
    kicker: '重新开始', title: '重开这一局？', sub: '队伍和进度会丢失。',
    body: '<p>回到开场故事，再选一次队伍。</p>',
    actions: [{ label: '重开', onClick: () => location.reload() }, { label: '取消', ghost: true, onClick: closeModal }],
  });
});
$('#btn-env').addEventListener('click', () => { world.cycleEnvironment(); updateEnvButton(); });
$('#btn-roll').addEventListener('click', freeRoll);
$('#story-toggle').addEventListener('click', () => {
  const el = $('#story');
  const c = el.classList.toggle('is-collapsed');
  $('#story-toggle').textContent = c ? '展开' : '收起';
  $('#story-toggle').setAttribute('aria-label', c ? '展开剧情' : '收起剧情');
});
$('#story-toggle').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#story-toggle').click(); } });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeRules(); } });

/* ---------------- init ---------------- */

state.items = { potions: 2 };
renderRules();
updateCheckMode();
openIntro(0);
updateEnvButton();
setTimeout(() => { if (document.getElementById('loader')?.classList.contains('is-done')) { /* noop */ } }, 600);

// expose for QA / debugging
window.__lmop = {
  state, world,
  get phase() { return state.screen; },
  openIntro, openSelect, toggleHero, startTrail, startCombat, openMap, closeMap, travelTo, nodeHorses, nodeStream, nodeWagon, nodeCliff, nodeShade, nodeCave,
  useCard, endTurn, freeRoll,
  selectAll: () => { state.selected = [...HERO_ORDER.slice(0, 3)]; world.setSelected(state.selected); updateSelect(); },
  win: () => { for (const g of Object.values(state.goblins)) { g.hp = 0; g.dead = true; } victory(); },
  shortRest, cave: shortRest,
  openCave: shortRest,
};
