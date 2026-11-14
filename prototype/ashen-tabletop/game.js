import { createWorld } from './world.js';
import {
  ACTS, HEROES, ITEMS, ENEMIES, POIS, SOCIAL_OPTIONS, RULES, STORY, EPILOGUES,
} from './data.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const d = (sides) => 1 + Math.floor(Math.random() * sides);
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/* ---------------- state ---------------- */

function cloneParty() {
  const party = {};
  for (const h of Object.values(HEROES)) {
    if (h.id === 'ada') continue;
    party[h.id] = {
      ...h,
      hp: h.hp, maxHp: h.maxHp, down: false, dead: false,
      deathSaves: { ok: 0, fail: 0 }, stable: false,
      conditions: [], frightened: 0, advNext: false, helpAdv: false, dodge: false,
      secondWind: h.id === 'bran' ? 1 : 0,
      slots: h.id === 'oren' ? 3 : 0,
      cardUses: {},
    };
  }
  return party;
}

const state = {
  phase: 'explore',
  party: cloneParty(),
  ada: { ...HEROES.ada, hp: 14, maxHp: 14, down: false, dead: false, ally: false, conditions: [], init: 2 },
  enemies: {},
  items: { potions: 1, oil: 1, badge: false },
  flags: {},
  explore: { attempted: {}, done: 0 },
  social: { resolved: false },
  rest: { used: {}, secondWind: false, arcane: false },
  activeHero: 'bran',
  targetId: 'knight',
  combat: null,
  busy: false,
  log: [],
  rulesTab: 'basics',
  worldPhase: null,
};

function resetEnemies() {
  state.enemies = {};
  for (const e of Object.values(ENEMIES)) {
    state.enemies[e.id] = { ...e, hp: e.maxHp, down: false, dead: false, fled: false, dodge: false };
  }
}
resetEnemies();

let world = null;
let bannerTimer = 0;
let toastTimer = 0;

/* ---------------- audio ---------------- */

let audio = null;
function ensureAudio() {
  if (audio) { if (audio.state === 'suspended') audio.resume(); return audio; }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
    return audio;
  } catch { return null; }
}
function tone(freq = 440, dur = 0.12, type = 'sine', gain = 0.04, when = 0) {
  const ctx = ensureAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function sfx(name) {
  if (name === 'dice') { tone(220, 0.07, 'triangle', 0.03); tone(140, 0.1, 'sine', 0.02, 0.03); }
  else if (name === 'hit') { tone(90, 0.16, 'sine', 0.05); tone(180, 0.05, 'square', 0.015); }
  else if (name === 'heal') { tone(523, 0.14, 'sine', 0.03); tone(784, 0.18, 'sine', 0.025, 0.08); }
  else if (name === 'roll') { tone(330, 0.08, 'triangle', 0.02); }
  else if (name === 'win') { [392, 523, 659].forEach((f, i) => tone(f, 0.3, 'sine', 0.03, i * 0.12)); }
  else if (name === 'lose') { [220, 174, 146].forEach((f, i) => tone(f, 0.4, 'triangle', 0.03, i * 0.16)); }
}

/* ---------------- helpers ---------------- */

function heroName(id) { return state.party[id]?.name || state.ada.name || state.enemies[id]?.name || id; }
function combatant(id) { return state.party[id] || (id === 'ada' ? state.ada : state.enemies[id]); }
function isEnemy(id) { return id === 'knight' || id === 'hound1' || id === 'hound2'; }
function isParty(id) { return id === 'bran' || id === 'vera' || id === 'oren'; }
function standingParty() { return ['bran', 'vera', 'oren'].map((id) => state.party[id]).filter((p) => !p.dead && !p.down); }
function allPartyOut() { return ['bran', 'vera', 'oren'].every((id) => state.party[id].dead || state.party[id].down); }
function livingEnemies() { return ['knight', 'hound1', 'hound2'].map((id) => state.enemies[id]).filter((e) => e && !e.dead && e.hp > 0); }
function currentCombatant() {
  const c = state.combat;
  if (!c || c.ended) return null;
  return combatant(c.order[c.turn]);
}
function isPlayerTurn() {
  const c = currentCombatant();
  return !!c && isParty(c.id) && !c.down && !state.busy;
}

function setBusy(v) {
  state.busy = v;
  document.querySelector('.hud')?.classList.toggle('is-busy', v);
  const status = $('#dice-status');
  if (status) status.textContent = v ? '骰子滚动中…' : 'd20 已在桌上';
}

function toast(text, kind = '') {
  const el = $('#toast');
  el.className = `toast ${kind}`;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1900);
}

function log(text, cls = '') {
  state.log.push({ text, cls });
  if (state.log.length > 40) state.log.shift();
  renderLog();
}

function renderLog() {
  const el = $('#story-log');
  el.innerHTML = state.log.slice(-18).map((l) => `<p class="${l.cls}">${l.text}</p>`).join('');
  el.scrollTop = el.scrollHeight;
}

function setAct(phase) {
  const idx = ACTS.findIndex((a) => a.id === phase);
  $$('#act-track .act').forEach((el, i) => {
    el.classList.toggle('is-on', i === idx);
    el.classList.toggle('is-done', i < idx);
  });
}

function showRoll({ title, values, used, mod = 0, dc, ac, success, text, auto = false }) {
  const el = $('#roll-banner');
  el.className = `roll-banner ${success === true ? 'is-good' : success === false ? 'is-bad' : ''}`;
  const valueText = values && values.length > 1 ? `${values.join(' / ')} → ${used}` : `${used}`;
  const target = dc ? `vs DC ${dc}` : ac ? `vs AC ${ac}` : '';
  el.innerHTML = `
    <p class="rb-top">${title}</p>
    <p class="rb-main">${auto ? `伤害 <b>${values[0]}</b>` : `d20 <b>${valueText}</b> ${mod ? `${sign(mod)} = ${used + mod}` : ''}`} <small>${target}</small></p>
    <p class="rb-sub">${text || ''}</p>`;
  el.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.hidden = true; }, 2100);
}

function updateActTrack() { setAct(state.phase); }

/* ---------------- world init ---------------- */

const SCENE_BY_PHASE = { explore: 'courtyard', social: 'hall', combat: 'hall', rest: 'beacon', level: 'beacon' };
function setWorldPhase(phase) {
  if (state.worldPhase === phase) return;
  state.worldPhase = phase;
  world.setPhase(phase);
  world.setScene(SCENE_BY_PHASE[phase] || 'courtyard');
  updateEnvButton();
}
function updateEnvButton() {
  const b = document.getElementById('btn-env');
  if (!b) return;
  const env = world.getEnvironment();
  b.textContent = env.label;
  b.title = `当前环境：${env.label} · 点击切换`;
}

world = createWorld({
  onPick: (pick) => {
    if (state.busy) return;
    if (pick.kind === 'dice') { freeRoll(); return; }
    if (pick.kind === 'token') { onTokenClick(pick.id); return; }
    if (pick.kind === 'prop') {
      if (pick.hotspot && state.phase === 'explore' && !state.explore.attempted[pick.id]) openPoi(pick.id);
      else openPropInfo(pick.id);
    }
  },
});

/* ---------------- DOM ---------------- */

const ui = {
  party: $('#party'),
  storyKicker: $('#story-kicker'),
  storyTitle: $('#story-title'),
  storyBody: $('#story-body'),
  storyActions: $('#story-actions'),
  hand: $('#hand'),
  handOwner: $('#hand-owner'),
  handHint: $('#hand-hint'),
  turnbar: $('#turnbar'),
  modal: $('#modal'),
  modalKicker: $('#modal-kicker'),
  modalTitle: $('#modal-title'),
  modalSub: $('#modal-sub'),
  modalBody: $('#modal-body'),
  modalActions: $('#modal-actions'),
  rules: $('#rules'),
  rulesTabs: $('#rules-tabs'),
  rulesBody: $('#rules-body'),
};

/* ---------------- render: party ---------------- */

function renderParty() {
  const rows = [];
  const ids = ['bran', 'vera', 'oren'];
  if (state.phase !== 'explore' && state.ada.ally && !state.ada.dead) ids.push('ada');
  for (const id of ids) {
    const h = combatant(id);
    if (!h) continue;
    const active = state.phase === 'combat' && state.combat && state.combat.order[state.combat.turn] === id;
    const pct = h.maxHp ? clamp(h.hp / h.maxHp, 0, 1) : 0;
    const cls = ['pc', h.down || h.dead ? 'is-down' : '', active ? 'is-on' : ''].filter(Boolean).join(' ');
    rows.push(`
      <button type="button" class="${cls}" data-hero="${id}" aria-label="${h.name}">
        <span class="pc-glyph">${h.glyph || '✦'}</span>
        <span class="pc-main">
          <span class="pc-name">${h.name}<em>${h.cls || (id === 'ada' ? '守夜人' : '')}</em></span>
          <span class="pc-meta">${h.down ? '倒地 · 死亡豁免' : h.tag || (id === 'ada' ? '守夜人' : '')}</span>
          <span class="hpbar"><i style="width:${pct * 100}%"></i></span>
        </span>
        <span class="pc-right">
          <span class="pc-hp">${h.hp}<small>/${h.maxHp}</small></span>
          <span class="pc-tag">AC ${h.ac}</span>
          <span class="pc-conditions">${conditionBadges(h)}</span>
        </span>
      </button>`);
  }
  const itemBits = [];
  if (state.items.potions > 0) itemBits.push(`<span class="item-pill">药水 ×${state.items.potions}</span>`);
  if (state.items.oil > 0) itemBits.push('<span class="item-pill">火油 ×1</span>');
  if (state.flags.badge) itemBits.push('<span class="item-pill">村徽</span>');
  if (state.flags.key) itemBits.push('<span class="item-pill">钥匙</span>');
  rows.push(`<div class="items-row">${itemBits.length ? itemBits.join('') : '<span>行囊空空</span>'}</div>`);
  ui.party.innerHTML = rows.join('');
  $$('.pc', ui.party).forEach((el) => {
    el.addEventListener('click', () => {
      if (state.busy) return;
      const id = el.dataset.hero;
      if (state.phase === 'combat' && state.combat) {
        if (isEnemy(id)) return;
        const cur = state.combat.order[state.combat.turn];
        if (id === cur) return;
      }
      openHeroInfo(id);
    });
  });
  syncTokens();
}

function conditionBadges(h) {
  const bits = [];
  if (h.frightened > 0) bits.push('<span class="cond">恐惧</span>');
  if (h.dodge) bits.push('<span class="cond">闪避</span>');
  if (h.advNext) bits.push('<span class="cond">隐匿</span>');
  if (h.helpAdv) bits.push('<span class="cond">受助</span>');
  return bits.join('');
}

/* ---------------- render: story ---------------- */

function setStory({ kicker, title, body, actions = [] }) {
  ui.storyKicker.textContent = kicker;
  ui.storyTitle.textContent = title;
  ui.storyBody.innerHTML = body;
  ui.storyActions.innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `choice ${a.primary ? 'is-primary' : ''} ${a.danger ? 'is-danger' : ''}`;
    btn.disabled = !!a.disabled;
    btn.innerHTML = `
      <span class="c-key">${a.key || '·'}</span>
      <span class="c-main"><span class="c-title">${a.title}</span><span class="c-sub">${a.sub || ''}</span></span>
      <span class="c-go">${a.go || '→'}</span>`;
    btn.addEventListener('click', () => { if (!state.busy) a.onClick?.(); });
    ui.storyActions.appendChild(btn);
  }
  ui.storyBody.scrollTop = 0;
}

/* ---------------- render: hand ---------------- */

function commonCards() {
  const cards = [];
  if (state.items.potions > 0) cards.push(ITEMS.potion);
  if (state.items.oil > 0) cards.push(ITEMS.oil);
  return cards;
}

function renderHand() {
  ui.hand.innerHTML = '';
  if (state.phase !== 'combat' || !state.combat) {
    ui.turnbar.hidden = true;
    ui.handOwner.textContent = state.phase === 'rest' ? '短休' : state.phase === 'level' ? '成长' : state.phase === 'social' ? '社交' : '探索';
    ui.handHint.textContent = state.phase === 'explore' ? '点调查点，或在右侧选择行动' : '骰子与规则都在这里';
    ui.hand.innerHTML = '<p class="hand-empty">这里会在战斗时变成手牌。</p>';
    return;
  }
  const c = state.combat;
  const cur = combatant(c.order[c.turn]);
  if (!cur || !isParty(cur.id)) {
    ui.handOwner.textContent = cur ? `${cur.name}的回合` : '战斗';
    ui.handHint.textContent = '敌人正在行动……';
    ui.hand.innerHTML = '<p class="hand-empty">等待敌人行动。</p>';
    return;
  }
  ui.handOwner.textContent = `${cur.name} · ${cur.cls}`;
  const target = combatant(state.targetId);
  ui.handHint.textContent = target && !target.dead ? `目标：${target.name} · AC ${target.ac}` : '选择目标';
  const dodge = {
    id: 'dodge', name: '闪避', en: 'Dodge', type: '动作', cost: 'A', kind: 'dodge',
    desc: '把注意力放在防守上：直到你的下回合，攻击你的检定有劣势。',
    foot: '攻击劣势', rule: 'SRD 5.1 · Dodge',
  };
  const cards = [...cur.cards, dodge, ...commonCards(), {
    id: 'end', name: '结束回合', en: 'End Turn', type: '战术', cost: '—', kind: 'end',
    desc: '结束当前角色的回合，交给你或敌人。', foot: '交棒',
  }];
  for (const card of cards) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `card ${card.type === '物品' ? 'is-item' : ''}`;
    btn.disabled = !canUseCard(cur, card);
    btn.dataset.card = card.id;
    const uses = cardUsesLeft(cur, card);
    btn.innerHTML = `
      <span class="card-top"><span class="card-type">${card.type}</span><span class="card-cost">${card.cost}</span></span>
      <span class="card-name">${card.name}</span>
      <span class="card-desc">${card.desc}</span>
      <span class="card-foot"><span class="card-uses">${uses}</span><span class="card-info" role="button" tabindex="0" aria-label="查看${card.name}说明">i</span></span>`;
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.card-info')) return;
      if (btn.disabled || state.busy) return;
      useCard(cur, card);
    });
    const info = $('.card-info', btn);
    info.addEventListener('click', (e) => { e.stopPropagation(); openCardInfo(cur, card); });
    info.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openCardInfo(cur, card); } });
    ui.hand.appendChild(btn);
  }
}

function cardUsesLeft(hero, card) {
  if (card.id === 'end') return '交棒';
  if (card.item) return card.item === 'potion' ? `×${state.items.potions}` : `×${state.items.oil}`;
  if (card.slots) return `位 ${hero.slots}`;
  if (card.uses) {
    const left = hero.cardUses[card.id] ?? card.uses;
    return `×${left}`;
  }
  if (card.kind === 'buff' || card.kind === 'help') {
    const left = hero.cardUses[card.id] ?? 1;
    return `×${left}`;
  }
  return '可用';
}

function canUseCard(hero, card) {
  if (state.busy || state.phase !== 'combat' || !state.combat || state.combat.ended) return false;
  const c = state.combat;
  if (c.order[c.turn] !== hero.id || hero.down) return false;
  if (card.kind === 'end') return true;
  if (card.cost === 'A' && c.actionUsed) return false;
  if (card.cost === 'B' && c.bonusUsed) return false;
  if (card.slots && hero.slots <= 0) return false;
  if (card.uses) {
    const left = hero.cardUses[card.id] ?? card.uses;
    if (left <= 0) return false;
  }
  if (card.kind === 'buff' || card.kind === 'help') {
    const left = hero.cardUses[card.id] ?? 1;
    if (left <= 0) return false;
  }
  if (card.item === 'potion' && state.items.potions <= 0) return false;
  if (card.item === 'oil' && state.items.oil <= 0) return false;
  if ((card.kind === 'attack' || card.kind === 'mm' || card.item === 'oil') && !livingEnemies().length) return false;
  return true;
}

/* ---------------- tokens ---------------- */

function syncTokens() {
  if (!world) return;
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    world.setTokenMeta(id, {
      name: h.name, hp: h.hp, maxHp: h.maxHp, down: h.down || h.dead,
      active: state.phase === 'combat' && state.combat && state.combat.order[state.combat.turn] === id,
      target: false,
    });
  }
  const ada = state.ada;
  world.setTokenMeta('ada', {
    name: `艾达${ada.ally ? ' · 盟友' : ''}`, hp: ada.hp, maxHp: ada.maxHp, down: ada.down || ada.dead,
    active: state.phase === 'combat' && state.combat && state.combat.order[state.combat.turn] === 'ada', target: false,
  });
  for (const id of ['knight', 'hound1', 'hound2']) {
    const e = state.enemies[id];
    if (!e) continue;
    world.setTokenMeta(id, {
      name: e.name, hp: Math.max(0, e.hp), maxHp: e.maxHp, down: e.dead,
      active: state.phase === 'combat' && state.combat && state.combat.order[state.combat.turn] === id,
      target: id === state.targetId,
    });
  }
  if (state.phase === 'combat' && state.combat) {
    const cur = state.combat.order[state.combat.turn];
    world.setActive(cur);
    world.setTarget(state.targetId);
  } else {
    world.setActive(state.phase === 'explore' ? state.activeHero : null);
    world.setTarget(null);
  }
}

function onTokenClick(id) {
  if (state.busy) return;
  if (state.phase === 'combat' && isEnemy(id)) {
    const e = state.enemies[id];
    if (!e || e.dead || e.hp <= 0) { toast('它已经倒下了。'); return; }
    state.targetId = id;
    syncTokens();
    renderHand();
    toast(`目标：${e.name}`);
    return;
  }
  if (state.phase === 'combat' && state.combat) {
    const cur = state.combat.order[state.combat.turn];
    if (isEnemy(id)) return;
    if (id === cur) return;
  }
  openHeroInfo(id);
}

/* ---------------- modal / rules ---------------- */

function openModal({ kicker, title, sub, body, actions = [] }) {
  ui.modalKicker.textContent = kicker || '';
  ui.modalTitle.textContent = title || '';
  ui.modalSub.textContent = sub || '';
  ui.modalBody.innerHTML = body || '';
  ui.modalActions.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.ghost ? 'btn--ghost' : ''}`;
    b.textContent = a.label;
    b.disabled = !!a.disabled;
    b.addEventListener('click', () => { if (!state.busy) a.onClick?.(); });
    ui.modalActions.appendChild(b);
  }
  ui.modal.hidden = false;
}
function closeModal() { ui.modal.hidden = true; }

function openCardInfo(hero, card) {
  const action = canUseCard(hero, card) ? [{
    label: '使用', onClick: () => { closeModal(); useCard(hero, card); },
  }] : [];
  openModal({
    kicker: `${hero.name} · ${card.type}`,
    title: card.name,
    sub: card.en || '',
    body: `<p>${card.desc}</p>
      <div class="stat-grid">
        <div class="stat"><b>${card.cost === 'A' ? '动作' : card.cost === 'B' ? '附赠' : card.cost === '—' ? '交棒' : card.cost}</b><span>行动消耗</span></div>
        <div class="stat"><b>${card.foot || '—'}</b><span>判定 / 效果</span></div>
        <div class="stat"><b>${card.uses ? (hero.cardUses[card.id] ?? card.uses) : card.slots ? hero.slots : '—'}</b><span>剩余</span></div>
      </div>
      ${card.rule ? `<span class="rule-ref">${card.rule}</span>` : ''}`,
    actions: [...action, { label: '关闭', ghost: true, onClick: closeModal }],
  });
}

function openHeroInfo(id) {
  const h = combatant(id);
  if (!h) return;
  const isPc = isParty(id) || id === 'ada';
  const cls = h.cls || (isPc ? '守夜人' : '灰烬造物');
  const stat = h.stats
    ? `<div class="stat-grid">
        ${Object.entries(h.stats).map(([k, v]) => `<div class="stat"><b>${v} <small>${sign(Math.floor((v - 10) / 2))}</small></b><span>${({ str: '力量', dex: '敏捷', con: '体质', int: '智力', wis: '感知', cha: '魅力' })[k]}</span></div>`).join('')}
      </div>`
    : '';
  const atk = isEnemy(id)
    ? `<p>攻击：+${h.atk} · ${h.dmg[0]}d${h.dmg[1]}${h.dmg[2] ? `+${h.dmg[2]}` : ''}${h.necro ? ' + 1d6 黯蚀' : ''}</p>`
    : h.atk ? `<p>攻击：<b>${h.atk.name}</b> ${sign(h.atk.mod)} · ${h.atk.dmg[0]}d${h.atk.dmg[1]}${h.atk.dmg[2] ? `+${h.atk.dmg[2]}` : ''} ${h.atk.type || ''}</p>` : '';
  const feature = h.feature || h.traits || '';
  const actions = [];
  if (state.phase === 'combat' && isEnemy(id) && !h.dead && h.hp > 0) {
    actions.push({ label: '选为目标', onClick: () => { state.targetId = id; closeModal(); syncTokens(); renderHand(); } });
  }
  actions.push({ label: '关闭', ghost: true, onClick: closeModal });
  openModal({
    kicker: isPc ? '角色 / 盟友' : '敌人',
    title: h.name,
    sub: `${cls} · HP ${h.hp}/${h.maxHp} · AC ${h.ac}`,
    body: `${stat}${atk}${feature ? `<p>${feature}</p>` : ''}${h.description ? `<p>${h.description}</p>` : ''}`,
    actions,
  });
}

const PROP_INFO = {
  brazier: ['守夜人的火盆', '石与铁打的火盆。雪落进去，火苗会短暂地矮下去。'],
  brazier2: ['熄灭的火盆', '另一只火盆。盆底积着冷灰和没烧完的炭。'],
  crates: ['补给箱', '几只钉着铁角的木箱。有人把能带走的都带走了，只剩空箱。'],
  cart: ['坏掉的板车', '轮子陷在雪里，车辕被利器劈开。它没能走到门口。'],
  gear: ['烧焦的装备', '一面缺了口的圆盾和一把卷刃的剑。斥候最后站在这里。'],
  gate: ['大门与门闩', '门从里面闩着。灰太厚，看不清门后的路。'],
  tracks: ['崖边的拖痕', '两道很深的雪沟从崖边一直通向侧窗。'],
  corpse: ['烧焦的斥候', '焦尸和冻土粘在一起，怀里似乎还压着什么。'],
};

function openPropInfo(id) {
  if (id === 'corpse' && state.phase === 'explore') { openPoi('corpse'); return; }
  if (id === 'tracks' && state.phase === 'explore') { openPoi('tracks'); return; }
  if (id === 'gate' && state.phase === 'explore') { openPoi('gate'); return; }
  const info = PROP_INFO[id];
  if (!info) { toast('这里没有更多可看的东西。'); return; }
  openModal({
    kicker: '场景物件', title: info[0], sub: '点击角色 / 敌人查看指示物说明',
    body: `<p>${info[1]}</p>`,
    actions: [{ label: '关闭', ghost: true, onClick: closeModal }],
  });
}

function renderRules() {
  ui.rulesTabs.innerHTML = RULES.map((r) => `<button type="button" class="rules-tab ${r.id === state.rulesTab ? 'is-on' : ''}" data-tab="${r.id}">${r.label}</button>`).join('');
  const tab = RULES.find((r) => r.id === state.rulesTab) || RULES[0];
  ui.rulesBody.innerHTML = `<h3>${tab.title}</h3>${tab.html}`;
  $$('.rules-tab', ui.rulesTabs).forEach((b) => b.addEventListener('click', () => {
    state.rulesTab = b.dataset.tab; renderRules();
  }));
}
function openRules() { ui.rules.hidden = false; renderRules(); }
function closeRules() { ui.rules.hidden = true; }

/* ---------------- dice ---------------- */

async function roll20(mode = 'normal') {
  const a = d(20);
  const b = mode === 'normal' ? null : d(20);
  const values = b ? [a, b] : [a];
  const used = mode === 'adv' ? Math.max(a, b) : mode === 'dis' ? Math.min(a, b) : a;
  sfx('roll');
  await world.roll(values, mode);
  sfx('dice');
  return { values, used, mode };
}

function rollDice([count, sides, bonus]) {
  let sum = 0;
  const parts = [];
  for (let i = 0; i < count; i++) { const v = d(sides); sum += v; parts.push(v); }
  return { sum: sum + bonus, parts, bonus, text: `${count}d${sides}${bonus ? `+${bonus}` : ''} = ${parts.join('+')}${bonus ? `+${bonus}` : ''}` };
}

async function freeRoll() {
  if (state.busy || state.phase === 'combat' && state.combat?.ended) return;
  setBusy(true);
  const r = await roll20('normal');
  showRoll({ title: '自由掷骰', values: r.values, used: r.used, mod: 0, success: null, text: '没有检定，只是让骰子落下来。' });
  log(`自由掷骰：d20 = ${r.used}`, 'log-roll');
  setBusy(false);
}

/* ---------------- exploration ---------------- */

function renderExplore() {
  state.phase = 'explore';
  ui.turnbar.hidden = true;
  setAct('explore');
  setWorldPhase('explore');
  const done = Object.keys(state.explore.attempted).length;
  const body = `${STORY.explore.body}
    <p class="quiet">已调查 <span class="dc">${done} / 2</span> 处。失败也会留下记录，能继续。</p>`;
  const actions = [];
  for (const p of POIS) {
    const attempted = !!state.explore.attempted[p.id];
    actions.push({
      key: p.id === 'gate' ? '门' : p.id === 'tracks' ? '痕' : '尸',
      title: attempted ? `${p.title} · 已调查` : p.title,
      sub: `${heroName(p.hero)} · ${p.skill} ${sign(p.mod)} · DC ${p.dc}`,
      disabled: attempted,
      onClick: () => openPoi(p.id),
    });
  }
  if (done >= 2) {
    actions.push({
      key: '入', title: '进入岗哨', sub: '两处线索已经够了。推开侧门，或者翻窗。', primary: true,
      onClick: enterGate,
    });
  }
  setStory({
    kicker: STORY.explore.kicker, title: STORY.explore.title, body, actions,
  });
  renderHand();
}

function openPoi(id) {
  const p = POIS.find((x) => x.id === id);
  if (!p || state.explore.attempted[id]) return;
  openModal({
    kicker: `调查点 · ${heroName(p.hero)}`,
    title: p.title,
    sub: `${p.skill} ${sign(p.mod)} · DC ${p.dc}`,
    body: `<p>${p.prompt}</p>
      <p class="quiet">检定失败不会卡住剧情，只是少一条线索。已调查的节点会变暗。</p>
      <span class="rule-ref">SRD 5.1 · Ability Check</span>`,
    actions: [
      { label: '开始检定', onClick: () => { closeModal(); runPoi(id); } },
      { label: '先不碰', ghost: true, onClick: closeModal },
    ],
  });
}

async function runPoi(id) {
  const p = POIS.find((x) => x.id === id);
  if (!p || state.busy) return;
  state.explore.attempted[id] = true;
  setBusy(true);
  log(`${heroName(p.hero)} 做${p.skill}检定，d20 ${sign(p.mod)} vs DC ${p.dc}`, 'log-roll');
  const r = await roll20('normal');
  const total = r.used + p.mod;
  const ok = total >= p.dc;
  showRoll({ title: `${heroName(p.hero)} · ${p.skill}检定`, values: r.values, used: r.used, mod: p.mod, dc: p.dc, success: ok, text: ok ? '成功' : '失败' });
  sfx(ok ? 'heal' : 'lose');
  log(`→ ${total} ${ok ? '成功' : '失败'}`, ok ? 'log-good' : 'log-bad');
  await wait(650);
  if (ok) {
    log(p.success, 'log-good');
    if (p.effect === 'gate') state.flags.sideWindow = true;
    if (p.effect === 'tracks') state.flags.tracks = true;
    if (p.effect === 'corpse') { state.items.badge = true; state.flags.badge = true; state.items.potions += 1; }
    toast(p.success.slice(0, 40) + '…', 'is-good');
  } else {
    log(p.fail, 'log-bad');
    toast(p.fail.slice(0, 34) + '…', 'is-bad');
  }
  state.explore.done = Object.keys(state.explore.attempted).length;
  world.setHotspot(id, { done: true, success: ok });
  renderParty();
  setBusy(false);
  renderExplore();
}

async function enterGate() {
  if (state.busy) return;
  setBusy(true);
  if (!state.flags.sideWindow) {
    log('侧窗没有查过。薇拉先翻进去，脚下的窗框吱呀一声。', 'log-roll');
    const r = await roll20('normal');
    const total = r.used + 3;
    const ok = total >= 13;
    showRoll({ title: '薇拉 · 敏捷豁免', values: r.values, used: r.used, mod: 3, dc: 13, success: ok, text: ok ? '稳住落地' : '窗框塌陷' });
    await wait(500);
    if (ok) log('薇拉稳住了。你们依次翻进侧窗。', 'log-good');
    else {
      const dmg = d(6);
      state.party.vera.hp = Math.max(0, state.party.vera.hp - dmg);
      log(`窗框塌了，薇拉受到 ${dmg} 点伤害。`, 'log-bad');
      world.floatAt('vera', `-${dmg}`, 'dmg');
      world.shake(0.3);
      if (state.party.vera.hp <= 0) state.party.vera.down = true;
    }
  } else {
    log('你们从没锁的侧窗翻进岗哨，避开了窗框的塌陷。', 'log-good');
  }
  state.phase = 'social';
  state.ada.ally = false;
  world.setAdaAlly(false);
  syncTokens();
  renderParty();
  setBusy(false);
  renderSocial();
}

/* ---------------- social ---------------- */

function renderSocial() {
  state.phase = 'social';
  ui.turnbar.hidden = true;
  setAct('social');
  setWorldPhase('social');
  world.setAdaAlly(!!state.ada.ally);
  syncTokens();
  const body = `${STORY.social.body}
    ${state.flags.truth ? '<p class="quiet">你已经看穿：她说的是「他」。楼梯上那个东西，是凯尔。</p>' : ''}
    ${state.social.resolved ? '<p class="quiet">她已经让开了路。楼梯上传来铁甲摩擦石面的声音。</p>' : ''}`;
  const actions = [];
  if (!state.social.resolved) {
    for (const opt of SOCIAL_OPTIONS) {
      if (opt.requires && !opt.requires(state.flags)) continue;
      actions.push({
        key: opt.id === 'badge' ? '徽' : opt.id === 'truth' ? '弟' : opt.id === 'persuade' ? '说' : opt.id === 'insight' ? '察' : opt.id === 'intimidate' ? '威' : '闯',
        title: opt.title,
        sub: opt.sub,
        danger: opt.id === 'intimidate' || opt.id === 'rush',
        onClick: () => runSocial(opt),
      });
    }
  } else {
    actions.push({
      key: '战', title: '进入岗哨', sub: '沿楼梯上去，面对灰烬骑士。', primary: true, onClick: startCombat,
    });
  }
  setStory({ kicker: STORY.social.kicker, title: STORY.social.title, body, actions });
  renderHand();
}

async function runSocial(opt) {
  if (state.busy || state.social.resolved) return;
  if (opt.check) {
    setBusy(true);
    log(`艾达 · ${escapeForLog(opt.title)}`, 'log-roll');
    const r = await roll20('normal');
    const total = r.used + opt.check.mod;
    const ok = total >= opt.check.dc;
    showRoll({
      title: `${heroName(opt.check.hero)} · ${opt.check.skill}检定`,
      values: r.values, used: r.used, mod: opt.check.mod, dc: opt.check.dc, success: ok,
      text: ok ? '成功' : '失败',
    });
    sfx(ok ? 'heal' : 'lose');
    log(`→ ${total} ${ok ? '成功' : '失败'}`, ok ? 'log-good' : 'log-bad');
    await wait(600);
    if (ok) {
      log(opt.successText, 'log-good');
      applyFlags(opt.flags || {});
    } else {
      log(opt.failText || '她没有被说动。', 'log-bad');
      applyFlags(opt.failFlags || {});
    }
    if (opt.id === 'insight' && ok) {
      // stay in social, reveal the truth option
      setBusy(false);
      renderSocial();
      return;
    }
    finishSocial();
    setBusy(false);
    return;
  }
  log(opt.successText, opt.id === 'rush' || opt.id === 'intimidate' ? 'log-bad' : 'log-good');
  applyFlags(opt.flags || {});
  finishSocial();
}

function finishSocial() {
  state.social.resolved = true;
  state.ada.ally = !!state.flags.ally;
  world.setAdaAlly(state.ada.ally);
  syncTokens();
  renderParty();
  renderSocial();
}

function applyFlags(flags) {
  Object.assign(state.flags, flags);
  if (flags.badge) state.flags.badge = true;
  if (flags.oil) state.items.oil = Math.max(state.items.oil, 1);
  if (flags.key) state.flags.key = true;
  if (flags.ally) state.ada.ally = true;
  if (flags.hostile) state.ada.ally = false;
}

function escapeForLog(text) { return String(text).replace(/[<>&]/g, ''); }

/* ---------------- combat ---------------- */

async function startCombat() {
  if (state.busy) return;
  setBusy(true);
  state.phase = 'combat';
  state.social.resolved = true;
  state.ada.ally = !!state.flags.ally;
  setWorldPhase('combat');
  world.setEnvironment('storm');
  updateEnvButton();
  world.setAdaAlly(state.ada.ally);
  resetEnemies();
  state.targetId = 'knight';
  state.combat = {
    order: [], init: {}, turn: -1, round: 1, actionUsed: false, bonusUsed: false,
    firstRoundAdv: !!state.flags.tracks, ash: false, ended: false,
  };
  const ids = ['bran', 'vera', 'oren'];
  if (state.ada.ally) ids.push('ada');
  ids.push('knight', 'hound1', 'hound2');
  for (const id of ids) {
    const c = combatant(id);
    const v = d(20) + (c.init || 0);
    state.combat.init[id] = v;
  }
  state.combat.order = ids.slice().sort((a, b) => state.combat.init[b] - state.combat.init[a]);
  log(`先攻：${state.combat.order.map((id) => `${heroName(id)} ${state.combat.init[id]}`).join(' · ')}`, 'log-roll');
  syncTokens();
  renderParty();
  renderCombat();
  log('雾从楼梯上漫下来。铁甲里没有人，只有一层还在烧的灰。', 'log-roll');
  await wait(450);
  if (state.combat.firstRoundAdv) log('拖痕让队伍记住了它的路线：第 1 轮攻击有优势。', 'log-good');
  if (state.ada.ally) log('艾达提前示警，骑士的嚎叫没有震住你们。', 'log-good');
  else {
    toast('灰烬骑士发出嚎叫', 'is-bad');
    log('灰烬骑士发出嚎叫：全体感知豁免 DC 13。', 'log-bad');
    for (const id of ['bran', 'vera', 'oren']) {
      const h = state.party[id];
      if (h.down || h.dead) continue;
      const v = d(20) + (h.saves?.wis ?? 0);
      if (v < 13) { h.frightened = 2; log(`${h.name} 失败（${v}），恐惧 2 轮：攻击劣势。`, 'log-bad'); }
      else log(`${h.name} 成功（${v}）。`, 'log-good');
    }
    world.playSkill('knight', 'howl', 'knight');
    world.shake(0.5);
    sfx('lose');
  }
  setBusy(false);
  nextTurn();
}

function renderCombat() {
  state.phase = 'combat';
  setAct('combat');
  setWorldPhase('combat');
  syncTokens();
  renderParty();
  renderTurnbar();
  const c = state.combat;
  if (!c) return;
  const cur = combatant(c.order[c.turn]);
  const curName = cur ? cur.name : '—';
  const body = `${STORY.combat.body}
    <p class="quiet">第 <span class="dc">${c.round}</span> 轮 · 当前：<b>${curName}</b>${isPlayerTurn() ? ' · 点击手牌行动' : ' · 敌人正在行动'}</p>
    ${state.flags.ally ? '<p class="quiet">艾达在队伍里：她会先救起倒地的人，否则用长矛攻击。</p>' : ''}
    <p class="quiet">点击敌人指示物切换目标；单击角色 / 道具可看说明。</p>`;
  const actions = [];
  if (isPlayerTurn()) {
    actions.push({ key: '结', title: '结束回合', sub: '把回合交给下一位。', primary: true, onClick: endPlayerTurn });
    actions.push({ key: '规', title: '查看规则书', sub: '攻击、豁免、优势与短休。', onClick: openRules });
  } else {
    actions.push({ key: '规', title: '查看规则书', sub: '战斗正在进行。', onClick: openRules });
  }
  setStory({ kicker: STORY.combat.kicker, title: STORY.combat.title, body, actions });
  renderHand();
}

function renderTurnbar() {
  const c = state.combat;
  if (state.phase !== 'combat' || !c) { ui.turnbar.hidden = true; return; }
  ui.turnbar.hidden = false;
  ui.turnbar.innerHTML = c.order.map((id, i) => {
    const ch = combatant(id);
    if (!ch) return '';
    const on = i === c.turn;
    const down = ch.down || ch.dead;
    return `<span class="turn-chip ${on ? 'is-on' : ''} ${isEnemy(id) ? 'is-enemy' : ''} ${down ? 'is-down' : ''}"><b>${c.init[id]}</b>${ch.name}</span>`;
  }).join('') + `<span class="turn-round">ROUND ${c.round}</span>`;
}

async function nextTurn() {
  const c = state.combat;
  if (!c || c.ended || state.busy) return;
  let guard = 0;
  while (guard++ < 24) {
    c.turn += 1;
    if (c.turn >= c.order.length) {
      c.turn = 0;
      c.round += 1;
      c.actionUsed = false;
      c.bonusUsed = false;
      for (const id of ['bran', 'vera', 'oren']) {
        const h = state.party[id];
        if (h.frightened > 0) h.frightened -= 1;
        h.dodge = false;
      }
      for (const e of Object.values(state.enemies)) e.dodge = false;
      log(`— 第 ${c.round} 轮 —`, 'log-roll');
    }
    const id = c.order[c.turn];
    const ch = combatant(id);
    if (!ch || ch.dead) continue;
    if (isEnemy(id) && ch.hp <= 0) continue;
    if (id === 'ada' && (!state.ada.ally || state.ada.dead)) continue;
    if (isEnemy(id) && !ch.dead) {
      syncTokens(); renderCombat();
      setBusy(true);
      setTimeout(() => enemyTurn(id), 650);
      return;
    }
    if (id === 'ada') {
      syncTokens(); renderCombat();
      setBusy(true);
      setTimeout(() => allyTurn(), 650);
      return;
    }
    // player
    state.activeHero = id;
    c.actionUsed = false;
    c.bonusUsed = false;
    if (ch.down) {
      syncTokens(); renderCombat();
      setBusy(true);
      setTimeout(() => deathSaveTurn(id), 500);
      return;
    }
    syncTokens(); renderCombat();
    return;
  }
}

function endPlayerTurn() {
  const c = state.combat;
  if (!c || state.busy || c.ended) return;
  if (!isPlayerTurn()) return;
  state.busy = true;
  c.actionUsed = true;
  c.bonusUsed = true;
  state.busy = false;
  nextTurn();
}

/* ---------------- player actions ---------------- */

function markAction(hero, card, { asBonus = false } = {}) {
  const c = state.combat;
  if (asBonus) c.bonusUsed = true;
  else if (card.cost === 'B') c.bonusUsed = true;
  else c.actionUsed = true;
  if (card.uses) {
    hero.cardUses[card.id] = (hero.cardUses[card.id] ?? card.uses) - 1;
  }
}

async function useCard(hero, card) {
  if (state.busy || !canUseCard(hero, card)) return;
  if (card.kind === 'end') { endPlayerTurn(); return; }
  if (card.kind === 'attack') { await useAttack(hero, card); return; }
  if (card.kind === 'mm') { await useMagicMissile(hero, card); return; }
  if (card.kind === 'heal') { useSecondWind(hero, card); return; }
  if (card.kind === 'buff') { useHide(hero, card); return; }
  if (card.kind === 'help') { useHelp(hero, card); return; }
  if (card.kind === 'dodge') { useDodge(hero, card); return; }
  if (card.item) { await useItem(hero, card); return; }
}

function attackMode(hero, target) {
  let adv = !!hero.advNext || !!hero.helpAdv || (state.combat.round === 1 && state.combat.firstRoundAdv);
  let dis = hero.frightened > 0 || !!target.dodge;
  if (adv && dis) { adv = false; dis = false; }
  return adv ? 'adv' : dis ? 'dis' : 'normal';
}

async function useAttack(hero, card) {
  const target = combatant(state.targetId);
  if (!target || target.dead || target.hp <= 0) { chooseTarget(); return; }
  setBusy(true);
  const mode = attackMode(hero, target);
  const r = await roll20(mode);
  const total = r.used + hero.atk.mod;
  const crit = r.used === 20 || (hero.id === 'bran' && r.used === 19);
  const hitFinal = r.used === 1 ? false : (crit || total >= target.ac);
  showRoll({
    title: `${hero.name} · ${card.name}`, values: r.values, used: r.used, mod: hero.atk.mod, ac: target.ac,
    success: hitFinal, text: crit ? '暴击！' : hitFinal ? '命中' : '未命中',
  });
  log(`${hero.name} 用${card.name}攻击${target.name}：d20 ${sign(hero.atk.mod)} = ${total} vs AC ${target.ac}${crit ? ' · 暴击' : ''}`, 'log-roll');
  const attackKind = hero.id === 'bran' ? 'sword' : hero.id === 'vera' ? 'bow' : 'fire';
  world.playSkill(hero.id, attackKind, target.id);
  hero.advNext = false; hero.helpAdv = false;
  await wait(600);
  if (hitFinal) {
    let dmg = rollDice(hero.atk.dmg);
    let extra = '';
    if (crit) {
      const critDmg = rollDice(hero.atk.dmg);
      dmg.sum += critDmg.sum;
      extra += ` + 暴击 ${critDmg.text}`;
    }
    if (card.sneak && (mode === 'adv' || standingParty().length >= 2)) {
      const sneak = rollDice([2, 6, 0]);
      dmg.sum += sneak.sum;
      extra += ` + 偷袭 ${sneak.text}`;
    }
    applyDamage(target, dmg.sum, hero.name);
    log(`伤害：${dmg.text}${extra} = ${dmg.sum}`, 'log-hit');
    world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
    world.shake(crit ? 0.7 : 0.35);
    sfx('hit');
  } else {
    log('落空。', 'log-bad');
    sfx('miss');
  }
  markAction(hero, card);
  await maybeEndCombat();
  setBusy(false);
  if (!state.combat.ended) { syncTokens(); renderCombat(); }
}

async function useMagicMissile(hero, card) {
  const target = combatant(state.targetId);
  if (!target || target.dead) { chooseTarget(); return; }
  if (hero.slots <= 0) return;
  setBusy(true);
  const dmg = rollDice([3, 4, 3]);
  hero.slots -= 1;
  showRoll({ title: `${hero.name} · 魔法飞弹`, values: [dmg.sum], used: dmg.sum, mod: 0, success: true, auto: true, text: '自动命中' });
  log(`${hero.name} 施放魔法飞弹：${dmg.text} = ${dmg.sum}，消耗 1 个法术位。`, 'log-hit');
  world.playSkill(hero.id, 'magic', target.id);
  applyDamage(target, dmg.sum, hero.name);
  world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
  world.shake(0.4);
  sfx('hit');
  markAction(hero, card);
  await wait(500);
  await maybeEndCombat();
  setBusy(false);
  if (!state.combat.ended) { syncTokens(); renderCombat(); }
}

function useSecondWind(hero, card) {
  if (state.busy) return;
  const heal = rollDice([1, 10, 3]);
  hero.hp = Math.min(hero.maxHp, hero.hp + heal.sum);
  log(`${hero.name} 使用回气：${heal.text}，恢复 ${heal.sum} HP。`, 'log-good');
  world.playSkill(hero.id, 'heal', hero.id);
  world.floatAt(hero.id, `+${heal.sum}`, 'heal');
  sfx('heal');
  markAction(hero, card);
  renderParty(); renderCombat();
}

function useHide(hero, card) {
  hero.advNext = true;
  hero.cardUses[card.id] = (hero.cardUses[card.id] ?? 1) - 1;
  log(`${hero.name} 隐入雪影：下一次攻击有优势。`, 'log-good');
  world.playSkill(hero.id, 'hide', hero.id);
  markAction(hero, card);
  renderParty(); renderCombat();
}

function useHelp(hero, card) {
  const ally = ['bran', 'vera', 'oren'].map((id) => state.party[id]).find((p) => p.id !== hero.id && !p.down && !p.dead);
  if (!ally) { toast('没有可以协助的队友。'); return; }
  ally.helpAdv = true;
  hero.cardUses[card.id] = (hero.cardUses[card.id] ?? 1) - 1;
  log(`${hero.name} 协助${ally.name}：${ally.name} 的下一次攻击有优势。`, 'log-good');
  world.playSkill(hero.id, 'help', ally.id);
  markAction(hero, card);
  renderParty(); renderCombat();
}

function useDodge(hero, card) {
  hero.dodge = true;
  markAction(hero, card);
  log(`${hero.name} 进入防御姿态：直到下回合，攻击他的检定有劣势。`, 'log-good');
  world.playSkill(hero.id, 'dodge', hero.id);
  renderParty(); renderCombat();
}

async function useItem(hero, card) {
  if (card.item === 'potion') {
    if (state.items.potions <= 0) return;
    state.items.potions -= 1;
    const heal = rollDice([2, 4, 2]);
    hero.hp = Math.min(hero.maxHp, hero.hp + heal.sum);
    log(`${hero.name} 喝下治疗药水：${heal.text}，恢复 ${heal.sum} HP。`, 'log-good');
    world.playSkill(hero.id, 'heal', hero.id);
    world.floatAt(hero.id, `+${heal.sum}`, 'heal');
    sfx('heal');
    markAction(hero, card);
    renderParty(); renderCombat();
    return;
  }
  if (card.item === 'oil') {
    if (state.items.oil <= 0) return;
    const knight = state.enemies.knight;
    if (!knight || knight.hp <= 0) { toast('骑士已经倒下了。'); return; }
    state.items.oil -= 1;
    setBusy(true);
    const dmg = rollDice([2, 6, 0]);
    showRoll({ title: `${hero.name} · 火油`, values: [dmg.sum], used: dmg.sum, mod: 0, success: true, auto: true, text: '火焰伤害' });
    log(`${hero.name} 把火油砸在灰烬骑士身上：${dmg.text} = ${dmg.sum} 火焰伤害。`, 'log-hit');
    world.playSkill(hero.id, 'oil', 'knight');
    applyDamage(knight, dmg.sum, hero.name);
    world.floatAt('knight', `-${dmg.sum}`, 'dmg');
    world.shake(0.4);
    sfx('hit');
    markAction(hero, card);
    await wait(500);
    await maybeEndCombat();
    setBusy(false);
    if (!state.combat.ended) { syncTokens(); renderCombat(); }
  }
}

/* ---------------- damage / healing ---------------- */

function applyDamage(target, amount, source) {
  if (!target || target.dead) return;
  target.hp = Math.max(0, target.hp - amount);
  log(`${target.name} 受到 ${amount} 点伤害（${source}），剩余 ${target.hp} HP。`, 'log-hit');
  if (target.hp <= 0) {
    if (isEnemy(target.id)) {
      target.dead = true;
      log(`${target.name} 倒下了。`, 'log-good');
      if (target.id === 'knight') {
        log('灰烬骑士的盔甲塌成一堆灰。两只猎犬夹着尾巴逃进雾里。', 'log-good');
        state.enemies.hound1.fled = true;
        state.enemies.hound2.fled = true;
      }
    } else {
      target.down = true;
      target.hp = 0;
      target.deathSaves = { ok: 0, fail: 0 };
      log(`${target.name} 倒地，开始死亡豁免。`, 'log-bad');
    }
  }
  syncTokens();
  renderParty();
  if (isEnemy(target.id) && target.id === 'knight' && target.hp <= 0) return;
  if (target.down) maybeDefeat();
}

function healCombatant(target, amount, source) {
  if (!target || target.dead) return;
  target.hp = Math.min(target.maxHp, Math.max(1, target.hp + amount));
  if (target.down) {
    target.down = false;
    target.stable = false;
    target.deathSaves = { ok: 0, fail: 0 };
    log(`${target.name} 被${source}唤醒，恢复 ${amount} HP。`, 'log-good');
  } else {
    log(`${source}：${target.name} 恢复 ${amount} HP。`, 'log-good');
  }
  world.floatAt(target.id, `+${amount}`, 'heal');
  syncTokens(); renderParty();
}

function chooseTarget() {
  const alive = livingEnemies();
  if (alive.length) {
    state.targetId = alive[0].id;
    world.setTarget(state.targetId);
    syncTokens(); renderHand();
    toast(`目标：${alive[0].name}`);
  }
}

/* ---------------- enemy turns ---------------- */

async function enemyTurn(id) {
  const c = state.combat;
  if (!c || c.ended) { setBusy(false); return; }
  const e = state.enemies[id];
  if (!e || e.dead || e.hp <= 0) { setBusy(false); nextTurn(); return; }
  if (id === 'knight' && !c.ash && e.hp <= 27) {
    await ashBurst(e);
    setBusy(false);
    if (await maybeEndCombat()) return;
    nextTurn();
    return;
  }
  await enemyAttack(e);
  setBusy(false);
  if (!state.combat.ended) {
    await wait(350);
    nextTurn();
  }
}

async function enemyAttack(e) {
  const party = standingParty();
  if (!party.length) { maybeDefeat(); return; }
  let target;
  if (e.id === 'knight') {
    target = party.slice().sort((a, b) => a.ac - b.ac)[0];
  } else {
    target = party[Math.floor(Math.random() * party.length)];
  }
  let mode = 'normal';
  if (e.id !== 'knight' && state.enemies.hound1.hp > 0 && state.enemies.hound2.hp > 0) mode = 'adv';
  if (target.dodge) mode = mode === 'adv' ? 'normal' : 'dis';
  const r = await roll20(mode);
  const total = r.used + e.atk;
  const crit = r.used === 20;
  const hit = r.used === 1 ? false : (crit || total >= target.ac);
  showRoll({
    title: `${e.name} · ${e.id === 'knight' ? '长剑' : '啃咬'}`,
    values: r.values, used: r.used, mod: e.atk, ac: target.ac,
    success: hit, text: crit ? '暴击！' : hit ? '命中' : '未命中',
  });
  log(`${e.name} 攻击${target.name}：d20 ${sign(e.atk)} = ${total} vs AC ${target.ac}${crit ? ' · 暴击' : ''}`, 'log-roll');
  world.playSkill(e.id, 'enemy', target.id);
  await wait(600);
  if (hit) {
    let dmg = rollDice(e.dmg);
    if (crit) { const c2 = rollDice(e.dmg); dmg.sum += c2.sum; }
    if (e.id === 'knight' && e.necro) {
      const nec = rollDice(e.necro);
      dmg.sum += nec.sum;
    }
    applyDamage(target, dmg.sum, e.name);
    world.floatAt(target.id, `-${dmg.sum}`, 'dmg');
    world.shake(0.45);
    sfx('hit');
  } else {
    log('落空。', 'log-bad');
    sfx('miss');
  }
}

async function ashBurst(e) {
  const c = state.combat;
  c.ash = true;
  toast('灰烬爆发', 'is-bad');
  log('灰烬骑士半血：灰烬爆发，全体敏捷豁免 DC 13。', 'log-bad');
  world.playSkill('knight', 'ash', 'knight');
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    if (h.down || h.dead) continue;
    const v = d(20) + (h.saves?.dex ?? 0);
    const ok = v >= 13;
    const dmg = rollDice([2, 6, 0]);
    const take = ok ? Math.floor(dmg.sum / 2) : dmg.sum;
    applyDamage(h, take, '灰烬爆发');
    log(`${h.name} ${ok ? '成功' : '失败'}（${v}），受到 ${take} 点伤害。`, ok ? 'log-good' : 'log-bad');
  }
  world.shake(0.7);
  sfx('hit');
  await wait(500);
  renderCombat();
}

/* ---------------- ally / death / combat end ---------------- */

async function allyTurn() {
  if (!state.ada.ally || state.ada.dead) { setBusy(false); nextTurn(); return; }
  const down = ['bran', 'vera', 'oren'].map((id) => state.party[id]).find((p) => p.down && !p.dead);
  if (down) {
    const heal = rollDice([1, 8, 2]);
    healCombatant(down, heal.sum, '艾达');
    log(`艾达把${down.name}扶起来：${heal.text}，恢复 ${heal.sum} HP。`, 'log-good');
    world.floatAt(down.id, `+${heal.sum}`, 'heal');
    sfx('heal');
  } else {
    const knight = state.enemies.knight;
    if (knight && !knight.dead) {
      const v = d(20) + 4;
      const crit = v - 4 === 20;
      const hit = v >= knight.ac;
      let dmg = 0;
      if (hit) { const rd = rollDice([1, 6, 2]); dmg = rd.sum + (crit ? rd.sum : 0); applyDamage(knight, dmg, '艾达'); }
      log(`艾达用长矛攻击灰烬骑士：d20+4 = ${v} vs AC ${knight.ac}，${hit ? `命中，${dmg} 伤害` : '落空'}。`, hit ? 'log-hit' : 'log-bad');
      if (hit) { world.floatAt('knight', `-${dmg}`, 'dmg'); world.shake(0.25); sfx('hit'); }
    }
  }
  setBusy(false);
  if (!state.combat.ended) { await wait(350); nextTurn(); }
}

async function deathSaveTurn(id) {
  const h = state.party[id];
  if (!h || !h.down || h.dead) { setBusy(false); nextTurn(); return; }
  const v = d(20);
  let text = '';
  if (v === 20) { h.hp = 1; h.down = false; h.deathSaves = { ok: 0, fail: 0 }; text = '自然 20！恢复 1 HP。'; }
  else if (v === 1) { h.deathSaves.fail += 2; text = '自然 1：记两次失败。'; }
  else if (v >= 10) { h.deathSaves.ok += 1; text = '成功一次。'; }
  else { h.deathSaves.fail += 1; text = '失败一次。'; }
  showRoll({ title: `${h.name} · 死亡豁免`, values: [v], used: v, mod: 0, dc: 10, success: v >= 10, text });
  log(`${h.name} 死亡豁免：d20 = ${v}，${text}（成功 ${h.deathSaves.ok} / 失败 ${h.deathSaves.fail}）`, 'log-roll');
  if (h.deathSaves.fail >= 3) { h.dead = true; h.down = true; log(`${h.name} 死了。`, 'log-bad'); }
  else if (h.deathSaves.ok >= 3) { h.stable = true; log(`${h.name} 稳定下来，但仍在昏迷。`, 'log-good'); }
  syncTokens(); renderParty();
  await wait(600);
  setBusy(false);
  if (allPartyOut()) { endDefeat(); return; }
  nextTurn();
}

async function maybeEndCombat() {
  const c = state.combat;
  if (!c || c.ended) return true;
  const knight = state.enemies.knight;
  if (!knight || knight.hp <= 0 || knight.dead) {
    c.ended = true;
    state.enemies.hound1.fled = true;
    state.enemies.hound2.fled = true;
    state.phase = 'rest';
    setAct('rest');
    setWorldPhase('rest');
    world.setAdaAlly(state.ada.ally);
    world.setActive(null); world.setTarget(null);
    syncTokens(); renderParty();
    sfx('win');
    toast('灰烬骑士倒下', 'is-good');
    log('战斗结束。雪落在烧空的铁甲上。', 'log-good');
    await wait(700);
    renderRest();
    return true;
  }
  if (allPartyOut()) { endDefeat(); return true; }
  return false;
}

function maybeDefeat() {
  if (allPartyOut()) { endDefeat(); return true; }
  return false;
}

function endDefeat() {
  if (state.combat) state.combat.ended = true;
  setBusy(false);
  sfx('lose');
  setWorldPhase('level');
  world.setActive(null); world.setTarget(null);
  state.phase = 'level';
  setAct('level');
  renderParty();
  setStory({
    kicker: '尾声 · 灰',
    title: '烽火没有点着',
    body: `<p>${EPILOGUES.defeat}</p>
      <p class="quiet">全队倒下。你们没有走到烽火盆前。</p>`,
    actions: [{ key: '重', title: '再试一次', sub: '重新铺开桌面。', primary: true, onClick: () => location.reload() }],
  });
  renderHand();
}

/* ---------------- rest / level ---------------- */

function renderRest() {
  state.phase = 'rest';
  ui.turnbar.hidden = true;
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    h.frightened = 0; h.dodge = false; h.advNext = false; h.helpAdv = false;
  }
  setAct('rest');
  setWorldPhase('rest');
  world.setAdaAlly(state.ada.ally);
  syncTokens();
  renderParty();
  const body = `${STORY.rest.body}
    <p class="quiet">每名角色可以花 1 个生命骰；布兰的回气、奥伦的奥术恢复也会在短休时恢复。</p>`;
  const actions = [];
  const hitDice = { bran: [1, 10, 1], vera: [1, 8, 1], oren: [1, 6, 1] };
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    if (h.dead) continue;
    const used = state.rest.used[id];
    actions.push({
      key: h.name[0],
      title: `${h.name} · 花 1 个生命骰`,
      sub: used ? '已经用过了' : `恢复 ${hitDice[id][1]} + 体质 HP`,
      disabled: used,
      onClick: () => {
        state.rest.used[id] = true;
        const rd = rollDice(hitDice[id]);
        healCombatant(h, rd.sum, '短休');
        log(`${h.name} 花生命骰：${rd.text}，恢复 ${rd.sum} HP。`, 'log-good');
        sfx('heal');
        renderRest();
      },
    });
  }
  if (state.party.bran.secondWind <= 0) {
    actions.push({
      key: '气', title: '布兰 · 回气恢复', sub: '短休后重新可用。',
      disabled: state.rest.secondWind,
      onClick: () => { state.rest.secondWind = true; state.party.bran.secondWind = 1; toast('回气已恢复'); renderRest(); },
    });
  }
  if (state.party.oren.slots < 3) {
    actions.push({
      key: '奥', title: '奥伦 · 奥术恢复', sub: '换回 1 个法术位。',
      disabled: state.rest.arcane,
      onClick: () => { state.rest.arcane = true; state.party.oren.slots = Math.min(3, state.party.oren.slots + 1); log('奥伦用奥术恢复换回 1 个法术位。', 'log-good'); renderRest(); },
    });
  }
  actions.push({ key: '升', title: '结束短休 · 前进', sub: '点起烽火，结算经验与升级。', primary: true, onClick: renderLevel });
  setStory({ kicker: STORY.rest.kicker, title: STORY.rest.title, body: STORY.rest.body, actions });
  renderHand();
}

function renderLevel() {
  state.phase = 'level';
  ui.turnbar.hidden = true;
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    h.frightened = 0; h.dodge = false; h.advNext = false; h.helpAdv = false;
  }
  setAct('level');
  setWorldPhase('level');
  world.setActive(null); world.setTarget(null);
  const epilogue = state.flags.mercy ? EPILOGUES.mercy : state.flags.ally ? EPILOGUES.friend : EPILOGUES.hostile;
  const levelGain = { bran: 7, vera: 6, oren: 5 };
  if (!state.leveled) {
    state.leveled = true;
    for (const id of ['bran', 'vera', 'oren']) {
      const h = state.party[id];
      h.maxHp += levelGain[id];
      h.hp = h.maxHp;
      if (id === 'bran') h.stats.str = 18;
      if (id === 'vera') h.stats.dex = 20;
      if (id === 'oren') h.stats.int = 20;
    }
    sfx('win');
  }
  renderParty();
  const body = `${STORY.level.body}
    <p>${epilogue}</p>
    <p class="quiet">升级：布兰 +7 HP、薇拉 +6 HP、奥伦 +5 HP；属性提升加在主属性。</p>
    <p class="quiet">本切片到此为止：五幕都走过了。要不要把它接进正式游戏，由你决定。</p>`;
  setStory({
    kicker: STORY.level.kicker, title: STORY.level.title, body,
    actions: [
      { key: '文', title: '去看 2D 文字版', sub: '同一个剧本的网页版。', onClick: () => window.open('/prototype/ashen-watch/', '_blank') },
      { key: '重', title: '再跑一遍', sub: '重新铺开桌面。', primary: true, onClick: () => location.reload() },
    ],
  });
  renderHand();
}

/* ---------------- wiring ---------------- */

function renderAll() {
  renderParty();
  if (state.phase === 'explore') renderExplore();
  else if (state.phase === 'social') renderSocial();
  else if (state.phase === 'combat') renderCombat();
  else if (state.phase === 'rest') renderRest();
  else if (state.phase === 'level') renderLevel();
}

$('#btn-env').addEventListener('click', () => {
  world.cycleEnvironment();
  updateEnvButton();
  toast(`环境：${world.getEnvironment().label}`);
});
$('#btn-rules').addEventListener('click', openRules);
$('#story-toggle').addEventListener('click', () => {
  const el = $('#story');
  const collapsed = el.classList.toggle('is-collapsed');
  $('#story-toggle').textContent = collapsed ? '展开' : '收起';
  $('#story-toggle').setAttribute('aria-label', collapsed ? '展开剧情' : '收起剧情');
});
$('#btn-rules-close').addEventListener('click', closeRules);
$('#btn-reset').addEventListener('click', () => world.resetCamera());
$('#btn-roll').addEventListener('click', freeRoll);
$('#btn-modal-close').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.dataset.closeModal !== undefined || e.target.classList.contains('modal-backdrop')) closeModal(); });
$('#btn-restart').addEventListener('click', () => {
  openModal({
    kicker: '重新开始', title: '重开这一局？', sub: '当前进度会丢失。',
    body: '<p>桌面会重新铺开，从幕一探索开始。</p>',
    actions: [
      { label: '重开', onClick: () => location.reload() },
      { label: '取消', ghost: true, onClick: closeModal },
    ],
  });
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeRules(); }
});
window.addEventListener('resize', () => {
  if (!state.combat && state.phase !== 'combat') return;
});

/* ---------------- boot ---------------- */

function init() {
  for (const id of ['bran', 'vera', 'oren']) {
    const h = state.party[id];
    world.setTokenMeta(id, { name: h.name, hp: h.hp, maxHp: h.maxHp, down: false, active: false, target: false });
  }
  world.setTokenMeta('ada', { name: '艾达', hp: state.ada.hp, maxHp: state.ada.maxHp, down: false, active: false, target: false });
  for (const id of ['knight', 'hound1', 'hound2']) {
    const e = state.enemies[id];
    world.setTokenMeta(id, { name: e.name, hp: e.hp, maxHp: e.maxHp, down: false, active: false, target: false });
  }
  world.setActive('bran');
  renderExplore();
  renderParty();
  log('灰从崖上落下来。门从里面闩着，塔顶的烽火盆是冷的。', 'log-roll');
}

init();

// Small debug handle for QA; not used by the UI.
window.__ashenTable = {
  state, world,
  click: (id) => onTokenClick(id),
  openPoi,
  poi: (id) => runPoi(id),
  enterGate,
  social: (id) => {
    const opt = SOCIAL_OPTIONS.find((o) => o.id === id);
    if (opt) runSocial(opt);
  },
  combat: startCombat,
  freeRoll,
  useCard: (heroId, cardId) => {
    const h = state.party[heroId];
    const card = h?.cards.find((c) => c.id === cardId);
    if (h && card) useCard(h, card);
  },
  endTurn: endPlayerTurn,
  finishRest: renderLevel,
  checkEnd: maybeEndCombat,
  rest: renderRest,
  level: renderLevel,
  rules: openRules,
  phase: () => state.phase,
};
