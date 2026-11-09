/* =====================================================================
   THE SUNLESS KEEP — application / UI
   Plain browser JavaScript. No build step. Open index.html directly, or
   serve the folder. Scenario content lives in scenario.js.
   ===================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SAVE_KEY = 'sunless-keep-save-v1';

const state = {
  screen: 'title',
  sceneId: null,
  party: [],
  picked: [],
  flags: {},
  clues: [],
  inventory: [],
  gold: 0,
  xp: 0,
  visited: [],
  checksDone: {},
  results: [],
  pendingNext: null,
  pendingCombat: null,
  combat: null,
  aftermath: null,
  endingId: null,
  showZh: false,
  sound: false,
  mapZoom: 1,
  selectedId: null,
  moveMode: false,
  attackMode: null,
  pendingSpell: null,
  aiPending: false,
  stats: { checks: 0, successes: 0, damage: 0, kills: 0, rests: 0 },
  startedAt: null,
  log: []
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function skillLabel(s) { return Rules.SKILL_LABEL[s] || cap(s); }
function partyAlive() { return state.party.filter((p) => !p.dead); }
function currentScene() { return state.scenes?.[state.sceneId] || SCENARIO.scenes[state.sceneId]; }
function getChar(id) { return state.party.find((p) => p.id === id); }
function itemsCount() {
  const m = {};
  state.inventory.forEach((i) => { m[i] = (m[i] || 0) + 1; });
  return m;
}
function hasItem(name) { return state.inventory.includes(name); }
function consumeItem(name) {
  const i = state.inventory.indexOf(name);
  if (i >= 0) { state.inventory.splice(i, 1); return true; }
  return false;
}
function addItem(name, n = 1) { for (let i = 0; i < n; i++) state.inventory.push(name); }
function addXp(n) { state.xp = Math.max(0, state.xp + (n || 0)); }
function addClue(text) {
  if (!text) return;
  const i = state.clues.findIndex((c) => c === text || c.includes(text) || text.includes(c));
  if (i >= 0) {
    if (text.length > state.clues[i].length) state.clues[i] = text;
    return;
  }
  state.clues.push(text);
  toast('Clue added to your journal.');
}
function setFlag(name) { if (name) state.flags[name] = true; }

function toast(text, ms = 2200) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

/* ---------------- persistence ---------------- */
function saveGame() {
  if (state.screen === 'combat') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, sceneId: state.sceneId, party: state.party, flags: state.flags, clues: state.clues,
      inventory: state.inventory, gold: state.gold, xp: state.xp, visited: state.visited,
      checksDone: state.checksDone, endingId: state.endingId, stats: state.stats,
      startedAt: state.startedAt, sound: state.sound, showZh: state.showZh
    }));
  } catch (e) { /* storage may be unavailable */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !Array.isArray(d.party) || !d.party.length) return null;
    return d;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function resumeGame() {
  const d = loadGame();
  if (!d) { startNew(); return; }
  state.sceneId = d.sceneId; state.party = d.party; state.flags = d.flags || {};
  state.clues = d.clues || []; state.inventory = d.inventory || []; state.gold = d.gold || 0;
  state.xp = d.xp || 0; state.visited = d.visited || []; state.checksDone = d.checksDone || {};
  state.endingId = d.endingId || null; state.stats = d.stats || state.stats;
  state.startedAt = d.startedAt || Date.now(); state.sound = !!d.sound; state.showZh = !!d.showZh;
  document.body.classList.toggle('show-zh', state.showZh);
  if (state.endingId) { renderEnding(state.endingId); return; }
  if (!state.sceneId) state.sceneId = SCENARIO.startScene;
  state.screen = 'scene';
  renderScene();
}

/* ---------------- top bar ---------------- */
function renderHud() {
  const strip = $('#partyStrip');
  if (!state.party.length) { strip.innerHTML = ''; }
  else {
    strip.innerHTML = state.party.map((p) => {
      const cls = p.dead ? 'down' : p.down ? 'low' : (p.hp <= p.maxHp * 0.34 ? 'low' : '');
      return `<button class="pchip ${cls}" data-sheet="${p.id}" title="Open character sheet">
        <span class="dot"></span><b>${esc(p.name)}</b><span class="hp">${p.dead ? 'dead' : p.down ? 'dying' : `${p.hp}/${p.maxHp}`}</span>
      </button>`;
    }).join('');
  }
  const zh = $('#zhBtn'); if (zh) { zh.classList.toggle('on', state.showZh); zh.setAttribute('aria-pressed', state.showZh); }
  const snd = $('#soundBtn'); if (snd) { snd.classList.toggle('on', state.sound); snd.setAttribute('aria-pressed', state.sound); }
  strip.querySelectorAll('[data-sheet]').forEach((b) => b.addEventListener('click', () => openSheet(getChar(b.dataset.sheet))));
}

function openSheet(pc) {
  if (!pc) return;
  const mods = Rules.ABILITIES.map((a) => `<div class="st"><b>${Rules.sign(Rules.abilityMod(pc, a))}</b><span>${a}</span></div>`).join('');
  const skills = (pc.skills || []).map((s) => `${skillLabel(s)} ${Rules.sign(Rules.skillMod(pc, s))}`).join(' · ');
  openModal(`<div class="modal">
    <div class="kicker">${esc(pc.ancestry)} · ${esc(pc.class)} · level ${pc.level}</div>
    <h3>${esc(pc.name)}</h3>
    <div class="m-sub">${esc(pc.acNote || '')} · Speed ${pc.speed} ft.</div>
    <div class="sheet" style="margin-top:10px">
      <div class="hpbig">${pc.hp}<span> / ${pc.maxHp} HP</span></div>
      <div class="bars"><i style="width:${Math.max(0, Math.min(100, (pc.hp / pc.maxHp) * 100))}%"></i></div>
      <div class="stats">${mods}</div>
      <div class="kv"><span>Armor Class</span><b>${pc.ac}</b></div>
      <div class="kv"><span>Proficiency</span><b>+${pc.prof}</b></div>
      <div class="kv"><span>Skills</span><b style="font-family:var(--sans);font-weight:400">${esc(skills)}</b></div>
      <div class="kv"><span>Hit Dice</span><b>${pc.hitDiceLeft ?? pc.level}d${pc.hitDie}</b></div>
      ${pc.attacks?.length ? `<div class="kv"><span>Attacks</span><b style="font-family:var(--sans);font-weight:400">${pc.attacks.map((a) => esc(a.name)).join(' · ')}</b></div>` : ''}
      ${pc.spells?.length ? `<div class="kv"><span>Spells</span><b style="font-family:var(--sans);font-weight:400">${pc.spells.map((s) => esc(s.name)).join(' · ')}</b></div>` : ''}
      ${pc.conditions?.length ? `<div class="conds">${pc.conditions.map((c) => `<span class="cond-chip">${esc(c.name)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="m-actions"><button class="btn small" data-close>Close</button></div>
  </div>`);
}

/* ---------------- modal + dice ---------------- */
function openModal(html, onClose) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-back">${html}</div>`;
  const close = () => { root.innerHTML = ''; if (onClose) onClose(); };
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const back = root.querySelector('.modal-back');
  if (back) back.addEventListener('click', (e) => { if (e.target === back) close(); });
  return close;
}

function rollModal(title, subtitle, rows, verdict, onContinue, extra = '') {
  const dice = rows.map((r) => `<div class="die">${r.die ?? '—'}<span class="tag">${esc(r.tag || 'd20')}</span></div>`).join('');
  const math = rows.map((r) => `<div>${esc(r.label)}: <b>${r.die}</b> ${Rules.sign(r.mod)}${r.extra ? ` + ${r.extra}` : ''} = <b>${r.total}</b>${r.dc ? ` <span class="vs">vs DC ${r.dc}</span>` : ''} ${r.ok != null ? `<span class="${r.ok ? 'win' : 'lose'}">${r.ok ? 'success' : 'failure'}</span>` : ''}</div>`).join('');
  openModal(`<div class="modal">
    <h3>${esc(title)}</h3>
    <div class="m-sub">${esc(subtitle || '')}</div>
    <div class="dice-row">${dice}</div>
    <div class="math">${math}${extra}</div>
    <div class="math" style="margin-top:8px"><span class="${verdict.ok ? 'win' : 'lose'}">${esc(verdict.text)}</span></div>
    <div class="m-actions"><button class="btn primary small" data-continue>Continue</button></div>
  </div>`, onContinue);
  const btn = $('[data-continue]');
  if (btn) btn.addEventListener('click', () => { $('#modalRoot').innerHTML = ''; onContinue && onContinue(); });
}

function pickActor(interaction, onPick) {
  const isGroup = !!interaction.group;
  const rows = state.party.map((p) => {
    const m = Rules.skillMod(p, interaction.skill);
    return `<button class="act" data-pick="${p.id}">
      <span class="act-ico">${esc(p.name.slice(0, 2).toUpperCase())}</span>
      <span class="act-body"><span class="act-label">${esc(p.name)} · ${esc(p.class)}</span>
      <span class="act-meta">${esc(skillLabel(interaction.skill))} <b>${Rules.sign(m)}</b> · ${p.hp}/${p.maxHp} HP</span></span>
    </button>`;
  }).join('');
  openModal(`<div class="modal">
    <h3>${isGroup ? 'Group check' : 'Who makes the check?'}</h3>
    <div class="m-sub">${esc(skillLabel(interaction.skill))} · DC ${interaction.dc}${isGroup ? ' · at least half the party must succeed' : ''}</div>
    <div class="actions" style="margin-top:10px">${rows}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div>
  </div>`);
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
    $('#modalRoot').innerHTML = '';
    onPick(b.dataset.pick);
  }));
}

function showCheckRoll(interaction, actorId) {
  const actor = getChar(actorId);
  if (!actor) return;
  const r = Rules.check(actor, interaction.skill, interaction.dc);
  state.stats.checks++;
  if (r.ok) state.stats.successes++;
  const outcome = r.ok ? interaction.success : interaction.fail;
  rollModal(
    `${skillLabel(interaction.skill)} check`,
    `${actor.name} · DC ${interaction.dc}`,
    [{ label: actor.name, die: r.die, mod: Rules.skillMod(actor, interaction.skill) + (r.extra ? 0 : 0), extra: r.extra || '', total: r.total, dc: interaction.dc, ok: r.ok }],
    { ok: r.ok, text: r.ok ? 'Success' : 'Failure' },
    () => applyOutcome(outcome, interaction, actor)
  );
}

function showGroupRoll(interaction) {
  const party = state.party.filter((p) => !p.dead);
  const rows = party.map((p) => {
    const r = Rules.check(p, interaction.skill, interaction.dc);
    return { p, r };
  });
  const successes = rows.filter((x) => x.r.ok).length;
  const ok = successes >= Math.ceil(party.length / 2);
  state.stats.checks++;
  if (ok) state.stats.successes++;
  const htmlRows = rows.map((x) => `<div>${esc(x.p.name)}: <b>${x.r.die}</b> ${Rules.sign(Rules.skillMod(x.p, interaction.skill))} = <b>${x.r.total}</b> <span class="vs">vs DC ${interaction.dc}</span> <span class="${x.r.ok ? 'win' : 'lose'}">${x.r.ok ? 'success' : 'failure'}</span></div>`).join('');
  openModal(`<div class="modal">
    <h3>${esc(skillLabel(interaction.skill))} — group check</h3>
    <div class="m-sub">At least ${Math.ceil(party.length / 2)} of ${party.length} must succeed.</div>
    <div class="math" style="margin-top:12px">${htmlRows}<div style="margin-top:8px"><span class="${ok ? 'win' : 'lose'}">${ok ? 'The party succeeds.' : 'The party fails.'}</span></div></div>
    <div class="m-actions"><button class="btn primary small" data-continue>Continue</button></div>
  </div>`);
  $('[data-continue]').addEventListener('click', () => {
    $('#modalRoot').innerHTML = '';
    applyOutcome(ok ? interaction.success : interaction.fail, interaction, null);
  });
}

/* ---------------- glossary / prose ---------------- */
const GLOSS_KEYS = Object.keys(SCENARIO.glossary).sort((a, b) => b.length - a.length);
const GLOSS_SET = new Set(GLOSS_KEYS);
function stemCandidate(w) {
  const l = w.toLowerCase();
  const tries = [l];
  if (l.endsWith('s')) tries.push(l.slice(0, -1));
  if (l.endsWith('es')) tries.push(l.slice(0, -2));
  if (l.endsWith('ed')) tries.push(l.slice(0, -2), l.slice(0, -1));
  if (l.endsWith('ing')) tries.push(l.slice(0, -3), l.slice(0, -3) + 'e');
  return tries;
}
function glossKeyFor(w) {
  for (const t of stemCandidate(w)) if (GLOSS_SET.has(t)) return t;
  return null;
}
function prose(text) {
  const safe = esc(text);
  return safe.replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, (m) => {
    const key = glossKeyFor(m);
    if (!key) return m;
    return `<span class="w-term" data-w="${key}" tabindex="0">${m}</span>`;
  });
}
let popEl = null;
function hideWordPop() { if (popEl) { popEl.remove(); popEl = null; } }
function showWordPop(el) {
  hideWordPop();
  const key = el.dataset.w;
  const g = SCENARIO.glossary[key];
  if (!g) return;
  popEl = document.createElement('div');
  popEl.className = 'word-pop';
  popEl.innerHTML = `<b>${esc(key)}</b><div class="pos">${esc(g.pos)} · ${esc(g.zh)}</div><div>Hear it, then read the example:</div><div class="ex">${esc(g.ex)}</div>`;
  document.body.appendChild(popEl);
  const r = el.getBoundingClientRect();
  const w = popEl.offsetWidth, h = popEl.offsetHeight;
  let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = r.top - h - 8;
  popEl.style.left = `${left}px`; popEl.style.top = `${top}px`;
  if (state.sound) speak(`${key}. ${g.ex}`);
}
document.addEventListener('click', (e) => {
  const term = e.target.closest?.('.w-term');
  if (term) { showWordPop(term); return; }
  if (popEl && !e.target.closest('.word-pop')) hideWordPop();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { hideWordPop(); const back = $('.modal-back'); if (back) $('#modalRoot').innerHTML = ''; }
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('w-term')) {
    e.preventDefault(); showWordPop(document.activeElement);
  }
});

function speak(text) {
  if (!('speechSynthesis' in window)) { toast('Read-aloud is not available in this browser.'); return; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.92; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { toast('Read-aloud failed.'); }
}

/* ---------------- drawers ---------------- */
function openDrawer(kind) {
  const title = $('#drawerTitle'), body = $('#drawerBody');
  if (kind === 'words') {
    title.textContent = 'Words';
    const keys = GLOSS_KEYS.slice().sort();
    body.innerHTML = `<p style="font-size:11px;color:var(--dim);line-height:1.55;margin-bottom:8px">Click a highlighted word in the story for its meaning and an example. Click a word here to hear it.</p>` +
      keys.map((k) => `<div class="word-row" data-say="${k}"><div class="ww">${esc(k)}</div><div class="wz">${esc(SCENARIO.glossary[k].zh)}<div style="color:var(--dim);font-family:var(--serif);margin-top:2px">${esc(SCENARIO.glossary[k].ex)}</div></div><div class="ws">${esc(SCENARIO.glossary[k].pos)}</div></div>`).join('');
    body.querySelectorAll('[data-say]').forEach((r) => r.addEventListener('click', () => { const k = r.dataset.say; speak(`${k}. ${SCENARIO.glossary[k].ex}`); }));
  } else {
    title.textContent = 'Journal';
    const scene = state.sceneId ? SCENARIO.scenes[state.sceneId] : null;
    const items = itemsCount();
    body.innerHTML = `
      <div class="entry"><h4>Current chapter</h4><p>${scene ? esc(scene.title) : 'The road'}</p><div class="tags"><span class="badge">${esc(scene?.kicker || '')}</span></div></div>
      <div class="entry"><h4>Objectives</h4><p>${scene?.objectives ? scene.objectives.map(esc).join('<br>') : '—'}</p></div>
      <div class="entry"><h4>Clues</h4><p>${state.clues.length ? state.clues.map((c) => `• ${esc(c)}`).join('<br>') : 'None yet. Ask questions. Look closely.'}</p></div>
      <div class="entry"><h4>Pack</h4><p>${Object.keys(items).length ? Object.entries(items).map(([n, c]) => `${esc(n)}${c > 1 ? ` ×${c}` : ''}`).join('<br>') : 'Nothing but the clothes on your back.'}</p>
      <div class="tags"><span class="badge hot">${state.gold} gp</span><span class="badge">${state.xp} XP</span></div></div>
      <div class="entry"><h4>Path so far</h4><p>${state.visited.length ? state.visited.map((id) => esc(SCENARIO.scenes[id]?.title || id)).join(' → ') : '—'}</p></div>
      <div class="entry"><h4>Rules at the table</h4><p>d20 + ability modifier vs DC; attacks vs AC. Advantage rolls twice and keeps the higher. Fire hurts the Blackroot. A short rest spends Hit Dice.</p></div>`;
  }
  $('#drawerBack').classList.add('open');
  $('#drawer').classList.add('open');
}
function closeDrawer() { $('#drawerBack').classList.remove('open'); $('#drawer').classList.remove('open'); }

/* ---------------- title / select ---------------- */
function renderTitle() {
  state.screen = 'title';
  state.combat = null;
  const save = loadGame();
  const hasSave = !!save && save.sceneId && !save.endingId;
  const cont = hasSave ? `<button class="btn primary" id="continueBtn">Continue · ${esc(SCENARIO.scenes[save.sceneId]?.title || 'your journey')}</button>` : '';
  setScreen(`
    <div class="center-wrap">
      <div class="title-card">
        <div class="title-art">${artTitle()}</div>
        <div class="title-copy">
          <div class="kicker">A complete 5e adventure · level 3</div>
          <h1>The Sunless Keep</h1>
          <p class="lede">${esc(SCENARIO.intro.en)}</p>
          <div class="badges">
            <span class="badge hot">3 pillars: explore · talk · fight</span>
            <span class="badge">d20 checks &amp; saves</span>
            <span class="badge">initiative &amp; grid combat</span>
            <span class="badge">spells, conditions, death saves</span>
            <span class="badge">English read-aloud + 中文</span>
          </div>
          <div class="title-actions">
            ${cont}
            <button class="btn ${hasSave ? 'ghost' : 'primary'}" id="newBtn">${hasSave ? 'Start a new party' : 'Create your party'}</button>
            <button class="btn ghost" id="howBtn">How to play</button>
          </div>
        </div>
      </div>
    </div>`);
  const c = $('#continueBtn'); if (c) c.addEventListener('click', resumeGame);
  $('#newBtn').addEventListener('click', startNew);
  $('#howBtn').addEventListener('click', showHowTo);
  renderHud();
}

function showHowTo() {
  openModal(`<div class="modal">
    <h3>How to play</h3>
    <div class="m-sub">You control a party of three. The rules are 5e’s.</div>
    <div class="entry"><h4>1. The story</h4><p>Read the English. Click any highlighted word for Chinese and an example. Choose an approach; when it needs a roll, pick who tries it.</p></div>
    <div class="entry"><h4>2. Checks</h4><p>Roll d20 + ability modifier (+ proficiency if trained). Meet or beat the DC. Advantage rolls twice and keeps the higher die.</p></div>
    <div class="entry"><h4>3. Combat</h4><p>Each round, every combatant acts in initiative order. On a character’s turn: move, take one action (attack, cast, dash, dodge, hide…), and sometimes a bonus action. Attacks roll d20 + modifier vs AC.</p></div>
    <div class="entry"><h4>4. The last fight</h4><p>The Blackroot is an object, not a soldier. Its thralls and the druid protect it. Fire is its weakness. Destroying the tree frees the thralls.</p></div>
    <div class="entry"><h4>5. Rest</h4><p>After a fight you can take a short rest: spend Hit Dice to recover HP and reset short-rest features. You cannot rest in the middle of a fight.</p></div>
    <div class="m-actions"><button class="btn primary small" data-close>Got it</button></div>
  </div>`);
}

function startNew() {
  clearSave();
  state.sceneId = null; state.party = []; state.picked = [];
  state.flags = {}; state.clues = []; state.inventory = []; state.gold = 0; state.xp = 0;
  state.visited = []; state.checksDone = {}; state.results = []; state.pendingNext = null;
  state.pendingCombat = null; state.combat = null; state.aftermath = null; state.endingId = null;
  state.stats = { checks: 0, successes: 0, damage: 0, kills: 0, rests: 0 };
  state.startedAt = Date.now();
  renderSelect();
}

function renderSelect() {
  state.screen = 'select';
  setScreen(`
    <div class="select-wrap">
      <div class="select-head">
        <div>
          <div class="kicker">Step 1 · build the party</div>
          <h2>Choose three adventurers</h2>
          <p>Each brings a different answer to a locked door, a nervous kobold or a tree that eats people. Pick any three; you will control all of them.</p>
        </div>
        <div class="select-count"><b id="pickCount">0</b> / 3 chosen</div>
      </div>
      <div class="party-grid" id="partyGrid">
        ${SCENARIO.pregens.map(pregenCard).join('')}
      </div>
      <div class="select-foot">
        <div class="hint" style="font-size:11px;color:var(--dim);max-width:620px;line-height:1.5">The adventure is one complete story: village → ravine → kobold court → goblin gate → the grove. Expect 20–35 minutes.</div>
        <button class="btn primary" id="beginBtn" disabled>Begin the adventure</button>
      </div>
    </div>`);
  $$('.pcard').forEach((card) => card.addEventListener('click', () => {
    const id = card.dataset.id;
    if (state.picked.includes(id)) state.picked = state.picked.filter((x) => x !== id);
    else if (state.picked.length < SCENARIO.partySize) state.picked.push(id);
    else { toast('Pick exactly three. Click one selected card to swap it out.'); return; }
    $$('.pcard').forEach((c) => c.classList.toggle('picked', state.picked.includes(c.dataset.id)));
    $('#pickCount').textContent = state.picked.length;
    $('#beginBtn').disabled = state.picked.length !== SCENARIO.partySize;
  }));
  $('#beginBtn').addEventListener('click', beginAdventure);
  renderHud();
}

function pregenCard(p) {
  return `<article class="pcard" data-id="${p.id}" tabindex="0" role="button" aria-pressed="false">
    <span class="picked-tag">Chosen</span>
    <div class="p-art">${classIcon(p.look)}</div>
    <div class="p-class">${esc(p.ancestry)} · ${esc(p.class)}</div>
    <h3>${esc(p.name)}</h3>
    <div class="p-role">${esc(p.role)}</div>
    <p>${esc(p.short)}</p>
    <div class="pstats">
      <div class="pstat"><b>${p.ac}</b><span>AC</span></div>
      <div class="pstat"><b>${p.maxHp}</b><span>HP</span></div>
      <div class="pstat"><b>+${p.prof}</b><span>Prof</span></div>
    </div>
  </article>`;
}

function beginAdventure() {
  if (state.picked.length !== SCENARIO.partySize) return;
  state.party = state.picked.map((id) => {
    const base = SCENARIO.pregens.find((p) => p.id === id);
    const p = clone(base);
    p.hp = p.maxHp;
    p.slots = p.slots || {};
    Object.values(p.slots).forEach((s) => { s.used = 0; });
    p.features = (p.features || []).map((f) => ({ ...f, usesMax: f.uses }));
    p.hitDiceLeft = p.level;
    p.conditions = [];
    p.deathSaves = { s: 0, f: 0 };
    p.down = false; p.dead = false;
    return p;
  });
  const inv = [];
  state.party.forEach((p) => (p.inventory || []).forEach((i) => inv.push(i)));
  // a shared pack; duplicates are kept (two potions are two potions)
  state.inventory = inv;
  state.gold = 0; state.xp = 0; state.visited = [];
  state.stats = { checks: 0, successes: 0, damage: 0, kills: 0, rests: 0 };
  state.startedAt = Date.now();
  goScene(SCENARIO.startScene);
}

function setScreen(html) {
  $('#screen').innerHTML = html;
  window.scrollTo(0, 0);
}

/* ---------------- art ---------------- */
function svgWrap(inner, w = 800, h = 360, capText = '') {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(capText)}">${inner}</svg>`;
}
function artTitle() {
  return svgWrap(`
    <defs>
      <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16211c"/><stop offset=".55" stop-color="#0c120f"/><stop offset="1" stop-color="#070a08"/></linearGradient>
      <radialGradient id="glow1" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#7f6aa6" stop-opacity=".34"/><stop offset="1" stop-color="#7f6aa6" stop-opacity="0"/></radialGradient>
      <linearGradient id="cliff1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20261f"/><stop offset="1" stop-color="#0a0d0a"/></linearGradient>
    </defs>
    <rect width="800" height="360" fill="url(#sky1)"/>
    <rect width="800" height="360" fill="url(#glow1)"/>
    <path d="M0 0h180l60 90 40 80-40 190H0Z" fill="url(#cliff1)"/>
    <path d="M800 0H650l-55 80-30 90 30 190h205Z" fill="url(#cliff1)"/>
    <g stroke="#39443a" stroke-width="2" opacity=".8">
      <path d="M120 40v110M160 70v90M640 30v120M690 60v100"/>
      <path d="M100 150l40-30 40 30M620 150l40-30 40 30"/>
    </g>
    <g stroke="#6f5d8c" stroke-width="9" opacity=".55"><path d="M400 360V210"/><path d="M400 250c-70-38-110-70-150-122M400 250c70-38 110-70 150-122M400 300c-50-22-88-40-120-70M400 300c50-22 88-40 120-70"/></g>
    <g fill="#0b0f0c" stroke="#b1965f" stroke-opacity=".35">
      <path d="M330 180l30-26 30 26-8 60h-44Z"/><path d="M380 150l36-30 36 30-10 74h-52Z"/><path d="M440 180l30-26 30 26-8 60h-44Z"/>
    </g>
    <g fill="#d6b877" opacity=".8"><circle cx="300" cy="250" r="2"/><circle cx="500" cy="230" r="2"/><circle cx="450" cy="285" r="1.5"/><circle cx="350" cy="300" r="1.5"/></g>
    <path d="M0 330h800v30H0Z" fill="#060807"/>
  `, 800, 360, 'A dark ravine, broken pillars and a glow below');
}

function classIcon(kind) {
  const c = { fighter: '#c9a45c', rogue: '#87a875', wizard: '#a58cc9', cleric: '#72b7a4' }[kind] || '#c9a45c';
  const inner = {
    fighter: `<path d="M32 10v34M22 18h20M26 44h12" stroke="${c}" stroke-width="3" fill="none"/><circle cx="32" cy="8" r="4" fill="${c}"/>`,
    rogue: `<path d="M20 38L42 16M38 12l6 6M22 36l-4 8 8-4" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="18" cy="44" r="3" fill="${c}"/>`,
    wizard: `<path d="M32 10v34M26 10h12M24 44h16" stroke="${c}" stroke-width="3" fill="none"/><circle cx="32" cy="9" r="5" fill="none" stroke="${c}" stroke-width="3"/><path d="M26 24h12" stroke="${c}" stroke-width="2"/>`,
    cleric: `<path d="M32 12v30M22 22h20" stroke="${c}" stroke-width="4" fill="none"/><path d="M20 44h24" stroke="${c}" stroke-width="3"/>`
  }[kind] || '';
  return `<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="56" fill="none"/>${inner}</svg>`;
}

/* ---------------- boot & global controls ---------------- */
function bindGlobal() {
  $('#zhBtn').addEventListener('click', () => {
    state.showZh = !state.showZh;
    document.body.classList.toggle('show-zh', state.showZh);
    renderHud(); saveGame();
  });
  $('#soundBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    if (!state.sound && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    renderHud(); saveGame();
  });
  $('#journalBtn').addEventListener('click', () => openDrawer('journal'));
  $('#wordsBtn').addEventListener('click', () => openDrawer('words'));
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBack').addEventListener('click', closeDrawer);
  $('#restartBtn').addEventListener('click', () => {
    openModal(`<div class="modal">
      <h3>Restart?</h3>
      <div class="m-sub">This clears the local save and starts a new party.</div>
      <div class="m-actions"><button class="btn small" data-close>Cancel</button><button class="btn danger small" id="confirmRestart">Restart</button></div>
    </div>`);
    $('#confirmRestart').addEventListener('click', () => { clearSave(); state.pendingNext = null; state.combat = null; startNew(); });
  });
}

function boot() {
  bindGlobal();
  const saved = loadGame();
  if (saved) { state.showZh = !!saved.showZh; document.body.classList.toggle('show-zh', state.showZh); }
  renderTitle();
}

window.addEventListener('DOMContentLoaded', boot);
let _resizeT = null;
window.addEventListener('resize', () => {
  if (!state.combat || state.screen !== 'combat') return;
  clearTimeout(_resizeT);
  _resizeT = setTimeout(() => { if (state.combat && state.screen === 'combat') renderCombat(); }, 180);
});

/* =====================================================================
   STORY FLOW
   ===================================================================== */

function goScene(id) {
  if (!id || !SCENARIO.scenes[id]) { renderTitle(); return; }
  state.sceneId = id;
  state.screen = 'scene';
  state.results = [];
  state.pendingNext = null;
  state.pendingCombat = null;
  if (!state.visited.includes(id)) state.visited.push(id);
  saveGame();
  renderScene();
}

function currentSceneData() { return SCENARIO.scenes[state.sceneId]; }

function renderScene() {
  const s = currentSceneData();
  if (!s) { renderTitle(); return; }
  const doneForScene = state.checksDone[s.id] || {};
  const readHtml = s.read.map((p, i) => `<div class="p">${prose(p.en)}${p.zh ? `<div class="zh">${esc(p.zh)}</div>` : ''}</div>`).join('');
  const ttsText = s.read.map((p) => p.en).join(' ');
  const objectives = (s.objectives || []).map((o) => `<div class="obj">${esc(o)}</div>`).join('');
  const results = state.results.map((r) => `<div class="check-result ${r.ok ? 'ok' : 'bad'}">
      <div class="cr-head"><span>${esc(r.title)}</span><b>${r.ok ? 'Success' : 'Failure'}</b></div>
      <p>${prose(r.en)}</p>${r.zh ? `<div class="zh">${esc(r.zh)}</div>` : ''}
    </div>`).join('');
  const interactions = (s.interactions || []).map((x) => {
    const done = Object.prototype.hasOwnProperty.call(doneForScene, x.id);
    return `<button class="act ${done ? 'done' : ''} ${x.kind === 'action' ? 'branch' : ''}" data-act="${x.id}" ${done ? 'data-done="1"' : ''}>
      <span class="act-ico">${esc(x.icon || (x.kind === 'check' ? 'd20' : '—'))}</span>
      <span class="act-body">
        <span class="act-label">${esc(x.label)}</span>
        <span class="act-meta">${esc(x.hint || '')}${done ? ' · already tried' : ''}</span>
      </span>
    </button>`;
  }).join('');
  const pending = state.pendingCombat
    ? `<button class="btn primary" id="startCombatBtn">Roll initiative</button>`
    : state.pendingNext
      ? `<button class="btn primary" id="pendingNextBtn">Continue</button>`
      : '';
  const next = s.next ? `<button class="btn ${state.pendingCombat ? 'ghost' : 'primary'}" id="nextSceneBtn">${esc(s.next.label)}</button>` : '';
  const distracted = state.flags.corvinDistracted
    ? `<div class="dm-note">Corvin is still talking. Your first attack against him has advantage.</div>` : '';
  const treeLore = state.flags.treeLore
    ? `<div class="dm-note">You know the tree’s weakness: fire. Its thralls are tied to it.</div>` : '';

  setScreen(`
    <div class="scene">
      <div class="scene-main">
        <div class="scene-head">
          <div class="kicker">${esc(s.kicker)}</div>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.sub || '')}</p>
        </div>
        <div class="readaloud">
          ${readHtml}
          <button class="tts-btn" id="ttsBtn">▶ Read aloud</button>
        </div>
        ${s.dm ? `<div class="dm-note">${esc(s.dm)}</div>` : ''}
        ${objectives ? `<div class="interact-title">Objectives</div><div class="objectives">${objectives}</div>` : ''}
        ${distracted}${treeLore}
        <div class="interact-title">What do you do?</div>
        <div class="actions">${interactions}</div>
        ${results ? `<div class="interact-title">At the table</div>${results}` : ''}
        <div class="scene-nav">
          <div class="hint">${s.id === 'coda' ? 'Your choice ends the story.' : 'You can try each approach once. The story moves on either way.'}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${pending}${next}</div>
        </div>
      </div>
      ${sceneArt(s.art)}
    </div>`);

  $('#ttsBtn').addEventListener('click', () => speak(ttsText));
  $$('[data-act]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.done) return;
    const x = s.interactions.find((i) => i.id === b.dataset.act);
    if (x) handleInteraction(x);
  }));
  const scb = $('#startCombatBtn');
  if (scb) scb.addEventListener('click', () => {
    const id = state.pendingCombat; state.pendingCombat = null; startCombat(id);
  });
  const pnb = $('#pendingNextBtn');
  if (pnb) pnb.addEventListener('click', () => {
    const id = state.pendingNext; state.pendingNext = null; goScene(id);
  });
  const nsb = $('#nextSceneBtn');
  if (nsb) nsb.addEventListener('click', () => {
    if (state.pendingCombat) { toast('Finish this first.'); return; }
    goScene(currentSceneData().next.scene);
  });
  renderHud();
}

function handleInteraction(x) {
  if (x.kind === 'action') {
    const r = x.result || {};
    if (r.ending) {
      applyOutcome(r, x, null, true);
      return;
    }
    applyOutcome(r, x, null, true);
    return;
  }
  if (x.group) {
    showGroupRoll(x);
    return;
  }
  pickActor(x, (id) => showCheckRoll(x, id));
}

function applyOutcome(outcome, interaction, actor, forcedOk) {
  if (!outcome) return;
  const ok = forcedOk != null ? forcedOk : outcome === interaction.success;
  const scene = currentSceneData();
  if (scene) {
    state.checksDone[scene.id] = state.checksDone[scene.id] || {};
    state.checksDone[scene.id][interaction.id] = ok ? 'success' : 'fail';
  }
  if (outcome.clue) addClue(outcome.clue);
  if (outcome.flag) setFlag(outcome.flag);
  if (outcome.flags) outcome.flags.forEach(setFlag);
  if (outcome.item) addItem(outcome.item);
  if (outcome.items) outcome.items.forEach((i) => addItem(i));
  if (outcome.gold) state.gold += outcome.gold;
  if (outcome.xp) addXp(outcome.xp);
  if (outcome.damage) {
    const target = actor || state.party[0];
    const amount = Rules.rollExpr(outcome.damage.dice).total;
    target.hp = Math.max(1, target.hp - amount);
    state.stats.damage += amount;
    toast(`${target.name} takes ${amount} ${outcome.damage.type || ''} damage.`);
  }
  if (outcome.heal) {
    const target = actor || state.party[0];
    const amount = Rules.rollExpr(outcome.heal).total;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    toast(`${target.name} recovers ${amount} HP.`);
  }
  state.results.push({ title: interaction.label, ok, en: outcome.en || 'Your choice closes this part of the story.', zh: outcome.zh || '你的选择为这一段故事画上句号。' });
  if (state.results.length > 5) state.results.shift();
  if (outcome.combat) state.pendingCombat = outcome.combat;
  if (outcome.next) state.pendingNext = outcome.next;
  if (outcome.ending) {
    state.results.push({ title: 'The story ends', ok: ok, en: 'Your choice closes this story. See what it made.', zh: '你的选择为这个故事收尾。看看它带来了什么。' });
    state.pendingEnding = outcome.ending;
  }
  saveGame();
  renderScene();
  if (outcome.ending) {
    setTimeout(() => {
      openModal(`<div class="modal">
        <h3>Ending</h3>
        <div class="m-sub">The last choice is made.</div>
        <div class="m-actions"><button class="btn primary small" data-close id="goEnding">See the ending</button></div>
      </div>`);
      const b = $('#goEnding');
      if (b) b.addEventListener('click', () => { $('#modalRoot').innerHTML = ''; showEnding(outcome.ending); });
    }, 350);
  }
}

function startCombat(id) {
  const enc = SCENARIO.encounters[id];
  if (!enc) return;
  state.screen = 'combat';
  state.combat = Rules.buildCombat(enc, state.party, state.flags);
  state.lastEncounterId = id;
  state.selectedId = Rules.current(state.combat)?.id || state.combat.combatants.find((c) => c.side === 'pc')?.id || null;
  state.manualSelect = false;
  state.moveMode = false; state.attackMode = null; state.pendingSpell = null;
  renderCombat();
  scheduleAI();
}

/* =====================================================================
   AFTERMATH / ENDINGS / DEFEAT
   ===================================================================== */

function showAftermath(combat) {
  const v = combat.victory || {};
  const xp = combat.combatants.filter((c) => c.side === 'enemy').reduce((a, c) => a + (SCENARIO.monsters[c.key]?.xp || 0), 0) + (v.xp || 0);
  addXp(xp);
  state.stats.kills += combat.combatants.filter((c) => c.side === 'enemy' && c.dead).length;
  if (v.items) v.items.forEach((i) => addItem(i));
  if (v.clue) addClue(v.clue);
  if (v.flag) setFlag(v.flag);
  state.aftermath = { victory: v, xp };
  state.combat = null;
  const t = $('#toast'); if (t) t.classList.remove('show');
  state.screen = 'aftermath';
  state.restUsed = false;
  saveGame();
  renderAftermath();
}

function renderAftermath() {
  const a = state.aftermath;
  if (!a) { renderTitle(); return; }
  const v = a.victory;
  const read = (v.read || []).map((p) => `<p>${prose(p.en)}</p>${p.zh ? `<p style="font-family:var(--sans);font-size:11.5px;color:var(--dim);line-height:1.6">${esc(p.zh)}</p>` : ''}`).join('');
  const items = (v.items || []).map((i) => `<span class="badge hot">${esc(i)}</span>`).join('');
  setScreen(`
    <div class="ending">
      <div class="e-art">${artAftermath()}</div>
      <div class="kicker">Victory · ${esc(SCENARIO.encounters[state.lastEncounterId]?.name || '')}</div>
      <h2>${esc(v.title || 'The fight is over')}</h2>
      <div class="e-sub">XP earned: ${a.xp}${items ? ` · Loot: ${items}` : ''}</div>
      <div class="e-body">${read}</div>
      <div class="scene-nav" style="justify-content:center;gap:8px">
        ${v.next === 'coda' ? '' : `<button class="btn ${state.restUsed ? 'ghost' : 'primary'}" id="restBtn" ${state.restUsed ? 'disabled' : ''}>Take a short rest</button>`}
        <button class="btn ${state.restUsed ? 'primary' : 'ghost'}" id="afterNext">Continue</button>
      </div>
      <div class="hint" style="text-align:center;font-size:10.5px;color:var(--dim);margin-top:8px">A short rest spends one Hit Die per character and resets short-rest features.</div>
    </div>`);
  const _restBtn = $('#restBtn');
  if (_restBtn) _restBtn.addEventListener('click', () => {
    if (state.restUsed) return;
    const log = [];
    Rules.shortRest(state.party, log);
    state.stats.rests++;
    state.restUsed = true;
    state.results = [];
    renderAftermath();
    toast(log[0] || 'The party rests.');
    saveGame();
  });
  $('#afterNext').addEventListener('click', () => {
    const next = v.next;
    state.aftermath = null;
    if (next) goScene(next);
    else renderTitle();
  });
  renderHud();
}

function showEnding(id) {
  state.endingId = id;
  state.screen = 'ending';
  const e = SCENARIO.endings[id];
  if (!e) { renderTitle(); return; }
  if (!state.flags[`ending-${id}`]) {
    setFlag(`ending-${id}`);
    if (e.reward?.gold) state.gold += e.reward.gold;
    if (e.reward?.xp) addXp(e.reward.xp);
  }
  saveGame();
  renderEnding(id);
}

function renderEnding(id) {
  const e = SCENARIO.endings[id];
  if (!e) { renderTitle(); return; }
  state.endingId = id;
  state.screen = 'ending';
  const read = e.read.map((p) => `<p>${prose(p.en)}</p>${p.zh ? `<p style="font-family:var(--sans);font-size:11.5px;color:var(--dim);line-height:1.6">${esc(p.zh)}</p>` : ''}`).join('');
  const total = state.stats.checks || 0;
  const rate = total ? Math.round((state.stats.successes / total) * 100) : 0;
  setScreen(`
    <div class="ending">
      <div class="e-art">${sceneArt(e.art).replace('class="scene-art"', 'class="e-inner"')}</div>
      <div class="kicker">${esc(e.kicker)}</div>
      <h2>${esc(e.title)}</h2>
      <div class="e-body">${read}</div>
      <div class="stats-grid">
        <div class="stat-card"><b>${state.gold}</b><span>gold</span></div>
        <div class="stat-card"><b>${state.xp}</b><span>XP</span></div>
        <div class="stat-card"><b>${rate}%</b><span>checks passed</span></div>
        <div class="stat-card"><b>${state.stats.kills}</b><span>foes defeated</span></div>
      </div>
      <div class="summary-list">
        <div class="summary-row"><span>Party</span><b>${state.party.map((p) => `${esc(p.name)} ${p.hp}/${p.maxHp}`).join(' · ')}</b></div>
        <div class="summary-row"><span>Checks</span><b>${state.stats.successes} / ${total}</b></div>
        <div class="summary-row"><span>Short rests</span><b>${state.stats.rests}</b></div>
        <div class="summary-row"><span>Clues found</span><b>${state.clues.length}</b></div>
        <div class="summary-row"><span>Words in the story</span><b>${Object.keys(SCENARIO.glossary).length}</b></div>
        <div class="summary-row"><span>Title earned</span><b>${esc(e.reward?.title || '—')}</b></div>
      </div>
      <div class="scene-nav" style="justify-content:center">
        <button class="btn primary" id="againBtn">Play again</button>
        <button class="btn ghost" id="titleBtn">Back to title</button>
      </div>
    </div>`);
  $('#againBtn').addEventListener('click', () => { clearSave(); startNew(); });
  $('#titleBtn').addEventListener('click', () => { renderTitle(); });
  renderHud();
}

function renderDefeat() {
  state.screen = 'defeat';
  setScreen(`
    <div class="ending">
      <div class="e-art">${artDefeat()}</div>
      <div class="kicker">The party falls</div>
      <h2>${esc(state.party.some((p) => p.dead) ? 'The dark keeps its own' : 'The dark closes over you')}</h2>
      <div class="e-body"><p>Your last torch gutters out. Somewhere above, the Old Road goes on without you. The story does not end here — it can be retried from the last fight.</p><p>Retry the encounter with the party restored. The scenario and your choices stay as they are.</p></div>
      <div class="scene-nav" style="justify-content:center">
        <button class="btn primary" id="retryBtn">Retry the fight</button>
        <button class="btn ghost" id="defeatTitle">Back to title</button>
      </div>
    </div>`);
  $('#retryBtn').addEventListener('click', () => {
    state.party.forEach((p) => { p.hp = p.maxHp; p.down = false; p.dead = false; p.conditions = []; p.deathSaves = { s: 0, f: 0 }; p.slots = p.slots || {}; Object.values(p.slots).forEach((s) => { s.used = 0; }); (p.features || []).forEach((f) => { f.uses = f.usesMax ?? f.uses; }); });
    if (!state.inventory.some((i) => i === 'Potion of Healing')) { state.inventory.push('Potion of Healing', 'Potion of Healing'); }
    const id = state.lastEncounterId; state.combat = null; startCombat(id);
  });
  $('#defeatTitle').addEventListener('click', () => renderTitle());
  renderHud();
}

/* =====================================================================
   SCENE ART
   ===================================================================== */

function sceneArt(kind, capText = '') {
  const art = {
    village: artVillage, ravine: artRavine, gate: artGate, throne: artThrone,
    goblins: artGoblins, grove: artGrove, dawn: artDawn, road: artRoad, fire: artFire
  }[kind] || artVillage;
  return `<div class="scene-art">${art()}<div class="art-cap">${esc(capText || kind)}</div></div>`;
}

function artVillage() {
  return svgWrap(`
    <defs><linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101b22"/><stop offset="1" stop-color="#080b0a"/></linearGradient>
    <radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f0c879" stop-opacity=".75"/><stop offset="1" stop-color="#f0c879" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="url(#vsky)"/>
    <g opacity=".35" stroke="#9fb3ad" stroke-width="1"><path d="M40 10l-16 70M140 0l-12 52M250 12l-18 80M360 0l-14 60M500 8l-16 72M640 0l-12 54M740 10l-18 80"/></g>
    <circle cx="610" cy="74" r="30" fill="#b9c7b6" opacity=".22"/><circle cx="610" cy="74" r="22" fill="#d7ddc3" opacity=".18"/>
    <path d="M0 260c90-20 150-6 230-14 80-8 120-30 210-26 80 4 120 26 210 20 70-4 110-16 150-8v128H0Z" fill="#0a0f0c"/>
    <g fill="#121a15" stroke="#2a352b" stroke-width="1.5">
      <path d="M70 250v-90h120v90Z"/><path d="M50 160l80-58 80 58Z"/>
      <path d="M300 252v-74h100v74Z"/><path d="M284 178l66-46 66 46Z"/>
      <path d="M560 250v-100h120v100Z"/><path d="M542 150l78-56 78 56Z"/>
    </g>
    <g fill="#f0c879">
      <rect x="94" y="190" width="18" height="22" rx="1" opacity=".8"/><rect x="128" y="190" width="18" height="22" rx="1" opacity=".55"/>
      <rect x="326" y="196" width="16" height="18" rx="1" opacity=".65"/>
      <rect x="590" y="186" width="20" height="24" rx="1" opacity=".8"/><rect x="636" y="186" width="20" height="24" rx="1" opacity=".6"/>
    </g>
    <circle cx="103" cy="200" r="34" fill="url(#lamp)" opacity=".55"/><circle cx="600" cy="198" r="38" fill="url(#lamp)" opacity=".5"/>
    <path d="M430 250v-64" stroke="#3d4a3c" stroke-width="4"/><path d="M390 186h80l-10 26h-60Z" fill="#221d13" stroke="#c9a45c" stroke-opacity=".5"/>
    <text x="430" y="204" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#d9c08a">OAK &amp; OWL</text>
    <path d="M0 314h800" stroke="#1d251e" stroke-width="2"/><path d="M0 330h800" stroke="#0a0d0b" stroke-width="20"/>
  `, 800, 360, 'Oakvale at night · the Oak & Owl');
}

function artRavine() {
  return svgWrap(`
    <defs><linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111b17"/><stop offset="1" stop-color="#070a08"/></linearGradient>
    <linearGradient id="rcliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232a22"/><stop offset="1" stop-color="#0a0d0a"/></linearGradient></defs>
    <rect width="800" height="360" fill="url(#rsky)"/>
    <path d="M0 0h230l50 70 28 110-20 90-18 90H0Z" fill="url(#rcliff)"/>
    <path d="M800 0H590l-46 64-20 96 18 100 20 100h238Z" fill="url(#rcliff)"/>
    <g stroke="#3c4a3d" stroke-width="2" fill="none" opacity=".85">
      <path d="M120 50v90M160 80v70M660 40v100M700 70v80"/><path d="M100 140l24-20 26 20M620 140l26-20 26 20"/>
    </g>
    <path d="M400 0v110" stroke="#5a4a2e" stroke-width="3"/>
    <path d="M400 110c-6 20 6 40 0 60s6 40 0 60" stroke="#c9a45c" stroke-width="2.5" fill="none" opacity=".65"/>
    <g opacity=".9"><path d="M400 360l-12-50 24 0Z" fill="#141915"/><path d="M388 310h24" stroke="#5c4f35" stroke-width="4"/></g>
    <g fill="#0b0f0c" stroke="#b1965f" stroke-opacity=".3"><path d="M300 210l40-34 40 34-10 80h-60Z"/><path d="M470 190l34-28 34 28-8 74h-52Z"/></g>
    <circle cx="400" cy="300" r="70" fill="#7f6aa6" opacity=".06"/>
    <path d="M0 326h800" stroke="#1b231c" stroke-width="3"/>
  `, 800, 360, 'The ravine · a rope into the dark');
}

function artGate() {
  return svgWrap(`
    <defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171c19"/><stop offset="1" stop-color="#080b09"/></linearGradient></defs>
    <rect width="800" height="360" fill="url(#gsky)"/>
    <path d="M0 260h800v100H0Z" fill="#0a0e0b"/>
    <g stroke="#2d372e" stroke-width="2" fill="#121813">
      <path d="M70 260V80h150v180Z"/><path d="M70 80l75-50 75 50"/><path d="M95 260V150h100v110"/>
    </g>
    <g fill="#1a2119" stroke="#3a4639"><path d="M300 260V120l100-70 100 70v140Z"/></g>
    <path d="M330 260V170a70 70 0 0 1 140 0v90Z" fill="#0c110d" stroke="#3f4b3d" stroke-width="2"/>
    <g stroke="#b1965f" stroke-opacity=".55" fill="none" stroke-width="2">
      <path d="M400 100c-26 22-26 50 0 74 26-24 26-52 0-74Z"/><path d="M372 174h56"/><circle cx="400" cy="158" r="4"/>
    </g>
    <g fill="#161c16" stroke="#4a5748"><path d="M500 260v-34h120v34Z"/><path d="M510 226h20v-18h-20Z"/><path d="M560 226h20v-14h-20Z"/></g>
    <g fill="#1a2119" stroke="#39463a"><path d="M640 250l10-40 12 40Z"/><path d="M600 250l8-34 10 34Z"/><path d="M700 250l9-36 11 36Z"/></g>
    <g fill="#c9a45c" opacity=".8"><circle cx="655" cy="238" r="3"/><circle cx="615" cy="242" r="2.5"/><circle cx="715" cy="240" r="2.5"/></g>
    <path d="M0 320h800" stroke="#1b221b" stroke-width="2"/>
  `, 800, 360, 'The citadel gate · a dragon-carved door');
}

function artThrone() {
  return svgWrap(`
    <defs><radialGradient id="tglow" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#7f6aa6" stop-opacity=".4"/><stop offset="1" stop-color="#7f6aa6" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="#090c0a"/><rect width="800" height="360" fill="url(#tglow)"/>
    <g fill="#141a15" stroke="#2f3a2f"><path d="M0 260h800v100H0Z"/><path d="M60 260V70l60-40 60 40v190Z"/><path d="M620 260V90l60-40 60 40v170Z"/></g>
    <g fill="#7f6aa6" opacity=".7"><circle cx="120" cy="180" r="4"/><circle cx="150" cy="214" r="3"/><circle cx="100" cy="228" r="2.5"/><circle cx="660" cy="170" r="4"/><circle cx="700" cy="210" r="3"/><circle cx="640" cy="230" r="2.5"/><circle cx="380" cy="120" r="2"/><circle cx="440" cy="96" r="1.6"/></g>
    <g fill="#1a211b" stroke="#4a5747"><path d="M300 270v-80h120v80Z"/><path d="M300 190l60-44 60 44Z"/><path d="M330 270v-50h60v50Z"/></g>
    <g stroke="#3d4a3d" stroke-width="2" fill="none"><path d="M470 60v70M430 90v40M510 90v40"/><path d="M430 130h80l-10 40h-60Z"/></g>
    <g fill="#9c86bf"><path d="M400 176l14 30 32 6-24 22 6 32-28-16-28 16 6-32-24-22 32-6Z" opacity=".8"/></g>
    <g fill="#c9a45c" opacity=".9"><circle cx="360" cy="238" r="3"/><circle cx="452" cy="246" r="3"/><circle cx="392" cy="258" r="2"/></g>
    <path d="M0 320h800" stroke="#1a211b" stroke-width="2"/>
  `, 800, 360, 'The kobold court · Queen Sesh');
}

function artGoblins() {
  return svgWrap(`
    <defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191512"/><stop offset="1" stop-color="#080a08"/></linearGradient></defs>
    <rect width="800" height="360" fill="url(#hsky)"/>
    <path d="M0 250h800v110H0Z" fill="#0b0d0a"/>
    <g stroke="#2c352c" stroke-width="2" fill="#121712"><path d="M40 250V40h120v210Z"/><path d="M640 250V40h120v210Z"/></g>
    <g fill="#e08954" opacity=".85"><path d="M180 120c10-22 26-22 36 0 2 14-10 26-18 26s-20-12-18-26Z"/><path d="M590 120c10-22 26-22 36 0 2 14-10 26-18 26s-20-12-18-26Z"/></g>
    <g opacity=".2" fill="#e08954"><circle cx="198" cy="124" r="46"/><circle cx="608" cy="124" r="46"/></g>
    <g fill="#171d17" stroke="#4a5747"><path d="M470 270v-52h130v52Z"/><path d="M490 218h20v-16h-20Z"/><path d="M540 218h20v-14h-20Z"/></g>
    <g fill="#8b3f33" opacity=".7"><path d="M600 190l28-10 10 26-28 10Z"/></g>
    <g fill="#1c241c" stroke="#3d4a3d"><path d="M330 260l-10-44 36 6 10 38Z"/><path d="M360 220l26-34 16 8-22 40Z"/></g>
    <g fill="#c06a52"><circle cx="345" cy="208" r="5"/><circle cx="362" cy="194" r="3"/></g>
    <g fill="#cf6d5d" opacity=".75"><path d="M110 245l6-34 6 34Z"/><path d="M130 245l4-24 5 24Z"/><path d="M700 248l5-30 6 30Z"/></g>
    <path d="M0 314h800" stroke="#1a211a" stroke-width="2"/>
  `, 800, 360, 'The goblin gate · a hobgoblin and a gold ring');
}

function artGrove() {
  return svgWrap(`
    <defs><radialGradient id="gglow" cx=".5" cy=".5" r=".62"><stop offset="0" stop-color="#6e4f8f" stop-opacity=".34"/><stop offset=".7" stop-color="#3a2a4c" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="#070a08"/><rect width="800" height="360" fill="url(#gglow)"/>
    <path d="M0 300c120-30 200-16 300-26 100-10 190-26 280-20 90 6 150 20 220 16v90H0Z" fill="#0a0d0a"/>
    <g stroke="#050706" stroke-width="18" stroke-linecap="round" fill="none">
      <path d="M400 360V150M400 210c-70-40-100-90-130-140M400 210c70-40 100-90 130-140M400 260c-50-20-90-40-120-80M400 260c50-20 90-40 120-80M400 180c-30-20-50-40-60-70M400 180c30-20 50-40 60-70"/>
    </g>
    <g stroke="#2a1f33" stroke-width="3" fill="none" opacity=".9">
      <path d="M400 360V150M400 210c-70-40-100-90-130-140M400 210c70-40 100-90 130-140M400 260c-50-20-90-40-120-80M400 260c50-20 90-40 120-80"/>
    </g>
    <g fill="#7f6aa6" opacity=".75"><circle cx="170" cy="250" r="5"/><circle cx="210" cy="286" r="3"/><circle cx="620" cy="240" r="5"/><circle cx="660" cy="280" r="3"/><circle cx="300" cy="300" r="2.5"/><circle cx="520" cy="310" r="2"/></g>
    <g fill="#1b211b" stroke="#3a4639"><path d="M300 300l-10-34 24 4 10 30Z"/><path d="M500 300l-8-30 22 4 10 26Z"/></g>
    <g fill="#161c16" stroke="#3a4639"><path d="M370 250l14-24 16 24Z"/><path d="M420 256l14-24 16 24Z"/></g>
    <g fill="#d6b877" opacity=".8"><circle cx="378" cy="234" r="3"/><circle cx="428" cy="240" r="3"/></g>
    <path d="M0 330h800" stroke="#141a15" stroke-width="2"/>
  `, 800, 360, 'The Twilight Grove · the Blackroot');
}

function artDawn() {
  return svgWrap(`
    <defs><linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f5b4a"/><stop offset=".55" stop-color="#2a2a20"/><stop offset="1" stop-color="#0c0f0b"/></linearGradient>
    <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f3d7a0" stop-opacity=".85"/><stop offset="1" stop-color="#f3d7a0" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="url(#dsky)"/>
    <circle cx="560" cy="160" r="76" fill="url(#sun)" opacity=".8"/><circle cx="560" cy="160" r="30" fill="#f6dfb0" opacity=".55"/>
    <path d="M0 280c120-24 220-8 330-18 100-10 190-24 280-18 80 6 130 16 190 12v104H0Z" fill="#0b0f0c"/>
    <g fill="#11170f" stroke="#2b352b"><path d="M120 280V190h150v90Z"/><path d="M104 190l90-46 90 46"/><path d="M600 280V200h110v80Z"/><path d="M590 200l66-38 66 38"/></g>
    <g fill="#d6b877" opacity=".8"><rect x="150" y="218" width="16" height="20"/><rect x="190" y="218" width="16" height="20"/><rect x="640" y="224" width="16" height="18"/></g>
    <g fill="#0d120d"><path d="M330 280v-50l10-20 10 20v50Z"/><path d="M390 280v-44l9-18 9 18v44Z"/><path d="M450 280v-38l8-16 8 16v38Z"/></g>
    <path d="M0 330h800" stroke="#1a2119" stroke-width="2"/>
  `, 800, 360, 'Dawn · the road back to Oakvale');
}

function artRoad() {
  return svgWrap(`
    <defs><linearGradient id="rds" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3125"/><stop offset="1" stop-color="#0d100b"/></linearGradient></defs>
    <rect width="800" height="360" fill="url(#rds)"/>
    <circle cx="650" cy="90" r="50" fill="#e7c98d" opacity=".25"/>
    <path d="M0 260c160-20 280-4 420-18 100-10 240-24 380-10v128H0Z" fill="#0c0f0a"/>
    <path d="M280 360c40-80 90-140 160-180 50-28 90-40 130-50" stroke="#5e5038" stroke-width="18" fill="none" opacity=".6"/>
    <g fill="#151a13" stroke="#3a4437"><path d="M180 240l30-14 10 34-34 8Z"/><circle cx="190" cy="278" r="12"/><circle cx="228" cy="274" r="12"/></g>
    <g fill="#0f140f"><path d="M500 280l8-46 16 0 8 46Z"/><path d="M470 280l6-40 12 0 6 40Z"/></g>
    <path d="M0 330h800" stroke="#171d16" stroke-width="2"/>
  `, 800, 360, 'The Old Road · a heavy purse');
}

function artFire() {
  return svgWrap(`
    <defs><radialGradient id="fireglow" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#f0a24d" stop-opacity=".7"/><stop offset="1" stop-color="#f0a24d" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="#0a0c09"/>
    <rect x="250" y="120" width="300" height="210" rx="10" fill="#12110c" stroke="#3a3122"/>
    <path d="M270 320c20-60 40-80 60-120 30 44 26 66 50 96 20-20 28-44 34-70 40 50 34 80 26 94Z" fill="#c57a3c" opacity=".85"/>
    <path d="M320 320c10-34 22-48 34-70 18 26 16 42 30 58 12-12 18-26 22-42 22 28 18 46 14 54Z" fill="#e0a45c"/>
    <circle cx="400" cy="260" r="120" fill="url(#fireglow)"/>
    <g fill="#1a1a13"><rect x="70" y="240" width="120" height="80"/><rect x="620" y="240" width="120" height="80"/></g>
    <g fill="#d6b877" opacity=".7"><circle cx="400" cy="200" r="2"/><circle cx="360" cy="170" r="1.5"/><circle cx="450" cy="160" r="1.5"/></g>
    <path d="M0 330h800" stroke="#181a12" stroke-width="2"/>
  `, 800, 360, 'The inn fire · the last choice');
}

function artAftermath() {
  const map = { rats: artRavine, kobolds: artGate, goblins: artGoblins, goblinsFlee: artGoblins, goblinsSneak: artGoblins, boss: artGrove };
  return (map[state.lastEncounterId] || artDawn)();
}
function artDefeat() {
  return svgWrap(`
    <defs><radialGradient id="dgl" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#5b4a6e" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="360" fill="#060806"/><rect width="800" height="360" fill="url(#dgl)"/>
    <g stroke="#121712" stroke-width="2"><path d="M0 300c140-40 240-20 380-36 120-14 260-8 420-24"/></g>
    <g fill="#0d110d"><path d="M380 300l-14-40 28 0Z"/><path d="M330 300l-10-28 20 0Z"/><path d="M440 300l-10-26 20 0Z"/></g>
    <g fill="#3b4a3a" opacity=".5"><circle cx="300" cy="230" r="2"/><circle cx="500" cy="210" r="2"/><circle cx="420" cy="250" r="1.5"/></g>
  `, 800, 360, 'The dark closes');
}

/* =====================================================================
   COMBAT
   ===================================================================== */

function renderCombat() {
  const c = state.combat;
  if (!c) { renderTitle(); return; }
  if (c.status === 'victory') { handleVictory(c); return; }
  if (c.status === 'defeat') { renderDefeat(); return; }
  const cur = Rules.current(c);
  if (!cur) { renderTitle(); return; }
  if (!state.selectedId || !state.manualSelect) state.selectedId = cur.id;
  const selected = c.byId[state.selectedId] || cur;
  const isPC = cur.side === 'pc';
  const awaiting = c.awaitingDeathSave === cur.id;

  setScreen(`
    <div class="combat">
      <div class="map-panel">
        <div class="map-top">
          <div>
            <div class="enc-name">${esc(c.name)}</div>
            <div class="round">Round ${c.round} · ${esc(cur.name)}'s turn</div>
          </div>
          <div class="map-tools">
            <button class="abtn" data-cmd="zoomin" title="Zoom in">+</button>
            <button class="abtn" data-cmd="zoomout" title="Zoom out">−</button>
            <button class="abtn" data-cmd="zoomreset" title="Reset zoom">1:1</button>
          </div>
        </div>
        <div class="map-viewport" id="mapViewport">
          <div class="map-stage" id="mapStage" style="transform:scale(${state.mapZoom})">${combatMap(c)}</div>
        </div>
      </div>
      <div class="combat-side">
        <div class="initiative">
          <h4>Initiative</h4>
          <div class="init-list">${initiativeRows(c)}</div>
        </div>
        <div id="sheetHost">${combatSheet(selected, c)}</div>
        <div class="combat-log" id="combatLog">${(c.log || []).slice(-9).reverse().map((l) => `<div class="line ${esc(l.cls)}">${l.text}</div>`).join('')}</div>
      </div>
    </div>
    <div class="actionbar" id="actionbar">${actionBar(c, cur, isPC, awaiting)}</div>`);

  bindCombat(c, cur);
  renderHud();
  scheduleAI();
}

function initiativeRows(c) {
  return c.order.map((id, i) => {
    const m = c.byId[id];
    const now = i === c.turnIndex;
    return `<div class="init-row ${now ? 'now' : ''} ${m.dead ? 'dead' : ''}">
      <span class="num">${m.initiative}</span>
      <span class="nm">${esc(m.name)}</span>
      <span class="hpt">${m.side === 'pc' ? `${m.hp}/${m.maxHp}` : m.dead ? 'down' : m.hp}</span>
    </div>`;
  }).join('');
}

function combatSheet(m, c) {
  if (!m) return '';
  const conds = (m.conditions || []).map((x) => `<span class="cond-chip">${esc(x.name)}</span>`).join('') +
    (m.down ? '<span class="cond-chip">dying</span>' : '') + (m.dead ? '<span class="cond-chip">dead</span>' : '') +
    (m.hidden ? '<span class="cond-chip">hidden</span>' : '') + (m.dodging ? '<span class="cond-chip">dodging</span>' : '') +
    (m.bless > 0 ? `<span class="cond-chip">bless ${m.bless}</span>` : '');
  if (m.side === 'enemy') {
    return `<div class="sheet">
      <div class="sh-head"><div><h4>${esc(m.name)}</h4><div class="sh-sub">${esc((SCENARIO.monsters[m.key]?.cr ? `CR ${SCENARIO.monsters[m.key].cr} · ` : '') + (m.traits || []).join(' · '))}</div></div><div class="lvl">enemy</div></div>
      <div class="hpbig">${m.hp}<span> / ${m.maxHp} HP</span></div>
      <div class="bars"><i style="width:${Math.max(0, (m.hp / m.maxHp) * 100)}%;background:linear-gradient(90deg,#9c4b3a,#c06a52)"></i></div>
      <div class="kv"><span>Armor Class</span><b>${m.ac}</b></div>
      <div class="kv"><span>Speed</span><b>${m.speed} ft.</b></div>
      ${(m.resist || []).length ? `<div class="kv"><span>Resists</span><b>${esc(m.resist.join(', '))}</b></div>` : ''}
      ${(m.vuln || []).length ? `<div class="kv"><span>Vulnerable</span><b style="color:var(--warn)">${esc(m.vuln.join(', '))}</b></div>` : ''}
      ${(m.immune || []).length ? `<div class="kv"><span>Immune</span><b>${esc(m.immune.join(', '))}</b></div>` : ''}
      ${conds ? `<div class="conds">${conds}</div>` : ''}
    </div>`;
  }
  const stats = Rules.ABILITIES.map((a) => `<div class="st"><b>${Rules.sign(Rules.abilityMod(m, a))}</b><span>${a}</span></div>`).join('');
  const slotText = Object.entries(m.slots || {}).map(([lv, s]) => `L${lv} ${s.max - s.used}/${s.max}`).join(' · ');
  return `<div class="sheet">
    <div class="sh-head"><div><h4>${esc(m.name)}</h4><div class="sh-sub">${esc(m.class)} · AC ${m.ac} · Speed ${m.speed}</div></div><div class="lvl">level ${m.level}</div></div>
    <div class="hpbig">${m.hp}<span> / ${m.maxHp} HP</span></div>
    <div class="bars"><i style="width:${Math.max(0, (m.hp / m.maxHp) * 100)}%"></i></div>
    <div class="stats">${stats}</div>
    <div class="kv"><span>Movement left</span><b>${Rules.speedLeft(m)} ft.</b></div>
    <div class="kv"><span>Action</span><b>${m.actionUsed ? 'used' : 'ready'}</b></div>
    <div class="kv"><span>Bonus action</span><b>${m.bonusUsed ? 'used' : 'ready'}</b></div>
    ${slotText ? `<div class="kv"><span>Spell slots</span><b>${esc(slotText)}</b></div>` : ''}
    ${conds ? `<div class="conds">${conds}</div>` : ''}
  </div>`;
}

function actionBar(c, cur, isPC, awaiting) {
  if (c.status !== 'active') return '';
  if (!isPC) return `<div class="turn-note"><b>${esc(cur.name)}</b> is acting…</div>`;
  if (awaiting) return `<div class="turn-note"><b>${esc(cur.name)} is dying.</b> Roll a death save to see if they hold on.</div>
    <div class="ab-row"><button class="abtn end" data-cmd="deathsave">Roll death save</button></div>`;
  const canAct = !cur.down && !cur.dead;
  const atkDisabled = cur.actionUsed ? 'disabled' : '';
  const moveDisabled = Rules.speedLeft(cur) <= 0 ? 'disabled' : '';
  const features = (cur.features || []).filter((f) => f.kind !== 'recover-slots');
  return `
    <div class="ab-row">
      <span class="ab-label">Turn · ${esc(cur.name)} · ${Rules.speedLeft(cur)} ft. movement left</span>
      <button class="abtn ${state.moveMode ? 'active' : ''}" data-cmd="move" ${moveDisabled}>Move</button>
      <button class="abtn ${state.attackMode ? 'active' : ''}" data-cmd="attack" ${atkDisabled}>Attack</button>
      <button class="abtn spell" data-cmd="spell" ${cur.actionUsed && cur.bonusUsed ? 'disabled' : ''}>Spell</button>
      <button class="abtn" data-cmd="item">Item</button>
      <button class="abtn" data-cmd="feature" ${features.length ? '' : 'disabled'}>Feature</button>
      <button class="abtn end" data-cmd="end">End turn</button>
    </div>
    <div class="ab-row">
      <span class="ab-label">Action options</span>
      <button class="abtn" data-cmd="dash" ${atkDisabled}>Dash</button>
      <button class="abtn" data-cmd="dodge" ${atkDisabled}>Dodge</button>
      <button class="abtn" data-cmd="disengage" ${atkDisabled}>Disengage</button>
      <button class="abtn" data-cmd="hide" ${atkDisabled}>Hide</button>
      <button class="abtn" data-cmd="help" ${atkDisabled}>Help</button>
      <span class="turn-note" style="margin-left:auto">${state.moveMode ? 'Click a highlighted square to move.' : state.attackMode ? 'Click an enemy in range.' : state.pendingSpell ? 'Click a target for the spell.' : 'Move + one action + possible bonus action.'}</span>
    </div>`;
}

function combatMap(c) {
  const vw = window.innerWidth || 1200;
  const availW = vw > 1100 ? Math.min(1040, vw * 0.64) : Math.max(300, vw - 48);
  const availH = Math.max(280, (window.innerHeight || 800) - 300);
  const cell = Math.max(42, Math.min(96, Math.floor(Math.min(availW / c.w, availH / c.h))));
  const W = c.w * cell, H = c.h * cell;
  const reach = (state.moveMode && Rules.current(c)?.side === 'pc') ? Rules.reachable(c, Rules.current(c)) : new Map();
  let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" id="battleMap">`;
  out += `<defs>
    <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a211b"/><stop offset="1" stop-color="#101510"/></linearGradient>
    <radialGradient id="torch" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e0a45c" stop-opacity=".22"/><stop offset="1" stop-color="#e0a45c" stop-opacity="0"/></radialGradient>
  </defs>`;
  out += `<rect width="${W}" height="${H}" fill="url(#floor)"/>`;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if ((x + y) % 2 === 0) out += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#ffffff" opacity=".012"/>`;
  }
  for (let x = 0; x <= c.w; x++) out += `<line x1="${x * cell}" y1="0" x2="${x * cell}" y2="${H}" stroke="#9aa88e" stroke-opacity=".07"/>`;
  for (let y = 0; y <= c.h; y++) out += `<line x1="0" y1="${y * cell}" x2="${W}" y2="${y * cell}" stroke="#9aa88e" stroke-opacity=".07"/>`;
  for (const k of c.walls || []) {
    const [x, y] = k.split(',').map(Number);
    out += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#070a08" stroke="#37412f" stroke-width="2"/><path d="M${x * cell + 8} ${y * cell + cell - 8}l${cell - 16}-${cell - 16}" stroke="#2a3326" stroke-width="2"/>`;
  }
  for (const k of c.difficult || []) {
    const [x, y] = k.split(',').map(Number);
    out += `<g stroke="#7f6aa6" stroke-opacity=".4" stroke-width="1.6" fill="none"><path d="M${x * cell + 10} ${y * cell + cell - 8}c8-16 14-22 22-30M${x * cell + 22} ${y * cell + cell - 8}c8-12 12-20 18-28M${x * cell + 34} ${y * cell + cell - 8}c6-12 12-18 16-24"/></g>`;
  }
  for (const k of c.cover || []) {
    const [x, y] = k.split(',').map(Number);
    out += `<rect x="${x * cell + 8}" y="${y * cell + 14}" width="${cell - 16}" height="${cell - 24}" rx="2" fill="#3a3021" stroke="#6b5838" stroke-width="2"/><path d="M${x * cell + 12} ${y * cell + 30}h${cell - 24}M${x * cell + 12} ${y * cell + 42}h${cell - 24}" stroke="#221c12" stroke-width="2"/>`;
  }
  for (const p of c.props || []) {
    const x = p.x * cell, y = p.y * cell;
    if (p.type === 'barricade') out += `<rect x="${x + 6}" y="${y + 18}" width="${cell - 12}" height="${cell - 30}" fill="#3b3324" stroke="#6e5b3a" stroke-width="2"/><path d="M${x + 10} ${y + 30}h${cell - 20}M${x + 10} ${y + 40}h${cell - 20}" stroke="#211b10" stroke-width="2"/>`;
    if (p.type === 'caltrops') out += `<g fill="#8b8b78" opacity=".8"><path d="M${x + 14} ${y + 40}l4-10 4 10Z"/><path d="M${x + 28} ${y + 44}l4-10 4 10Z"/><path d="M${x + 40} ${y + 36}l4-10 4 10Z"/></g>`;
    if (p.type === 'fungus') out += `<g fill="#7f6aa6" opacity=".65"><circle cx="${x + 16}" cy="${y + 20}" r="6"/><circle cx="${x + 36}" cy="${y + 34}" r="9"/><circle cx="${x + 44}" cy="${y + 14}" r="4"/></g><circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * .7}" fill="url(#torch)"/>`;
    if (p.type === 'pit') out += `<rect x="${x + 8}" y="${y + 8}" width="${cell - 16}" height="${cell - 16}" rx="6" fill="#050706" stroke="#2c342a" stroke-width="2"/><path d="M${x + 16} ${y + 20}l8 8M${x + 26} ${y + 18}l6 6" stroke="#20261f" stroke-width="2"/>`;
  }
  if (state.moveMode) {
    for (const k of reach.keys()) {
      const [x, y] = k.split(',').map(Number);
      out += `<rect class="move-cell" data-tile="${k}" x="${x * cell + 2}" y="${y * cell + 2}" width="${cell - 4}" height="${cell - 4}" rx="3" fill="#c9a45c" fill-opacity=".16" stroke="#c9a45c" stroke-opacity=".55" stroke-width="1.2" style="cursor:pointer"/>`;
    }
  }
  for (const m of c.combatants) {
    if (m.dead && m.side === 'enemy') { out += tokenSvg(m, cell, c); continue; }
    out += tokenSvg(m, cell, c);
  }
  out += `</svg>`;
  return out;
}

function tokenSvg(m, cell, c) {
  const size = m.size || 1;
  const cx = (m.x + size / 2) * cell;
  const cy = (m.y + size / 2) * cell;
  const isPC = m.side === 'pc';
  const active = Rules.current(c) === m;
  const selected = state.selectedId === m.id;
  const col = isPC ? { bram: '#c9a45c', sable: '#87a875', ilya: '#a58cc9', orsa: '#72b7a4' }[m.id] || '#c9a45c' : '#b4553f';
  const r = cell * 0.26 * size;
  const hpPct = Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100));
  const canTarget = (state.attackMode || state.pendingSpell) && m.side === 'enemy' && !m.dead;
  const targetableAlly = state.pendingSpell && m.side === 'pc' && !m.dead;
  const ring = canTarget || targetableAlly ? `stroke="#e08954" stroke-width="3"` : active ? `stroke="#e8c983" stroke-width="2.4"` : selected ? `stroke="#c9a45c" stroke-width="1.8"` : `stroke="${col}" stroke-opacity=".5" stroke-width="1.6"`;
  let body = '';
  if (m.key === 'blackroot') {
    body = `<g stroke="${m.dead ? '#3a3f36' : '#050706'}" fill="none" stroke-linecap="round">
      <path d="M${cx} ${cy + r * 1.05}V${cy - r * .25}" stroke-width="${cell * .22}"/>
      <path d="M${cx} ${cy + r * .1}c-${r * .7} -${r * .35} -${r * .95} -${r * .8} -${r * 1.05} -${r * 1.25}M${cx} ${cy + r * .1}c${r * .7} -${r * .35} ${r * .95} -${r * .8} ${r * 1.05} -${r * 1.25}M${cx} ${cy - r * .2}c-${r * .45} -${r * .25} -${r * .6} -${r * .55} -${r * .7} -${r * .95}M${cx} ${cy - r * .2}c${r * .45} -${r * .25} ${r * .6} -${r * .55} ${r * .7} -${r * .95}" stroke-width="${cell * .11}"/>
      <path d="M${cx} ${cy - r * 1.2}c-${r * .55} -${r * .05} -${r * .85} -${r * .45} -${r * .65} -${r * .9}c${r * .1} -${r * .25} ${r * .45} -${r * .35} ${r * .65} -${r * .12}c${r * .2} -${r * .23} ${r * .55} -${r * .13} ${r * .65} ${r * .12}c${r * .2} ${r * .45} -${r * .1} ${r * .85} -${r * .65} ${r * .9}Z" fill="${m.dead ? '#2a2e27' : '#050706'}" stroke="#3a2a4c" stroke-width="1.5" stroke-opacity=".7"/>
    </g>`;
  } else {
    const initials = isPC ? m.name.slice(0, 1) : m.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
    body = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${m.dead ? '#2a2e27' : isPC ? '#1c241d' : '#2a1b18'}" stroke="${col}" stroke-opacity="${m.dead ? .3 : .9}" stroke-width="2"/>
      <text x="${cx}" y="${cy + r * .28}" text-anchor="middle" font-family="Georgia,serif" font-size="${r * .9}" fill="${m.dead ? '#555' : col}" opacity=".95">${esc(initials)}</text>`;
  }
  const name = m.name.length > 15 ? m.name.slice(0, 14) + '…' : m.name;
  const cond = (m.conditions || []).map((x) => x.name.slice(0, 3)).join(' ');
  return `<g class="tok ${isPC ? 'pc' : 'enemy'} ${m.down || m.dead ? 'down' : ''} ${active ? 'active' : ''}" data-tok="${m.id}">
    <ellipse class="base" cx="${cx}" cy="${cy + r * .78}" rx="${r * 1.02}" ry="${r * .3}" fill="#0a0c09" stroke="${col}" stroke-opacity=".55" stroke-width="1.2" ${active ? 'stroke="#e8c983"' : ''}/>
    ${body}
    <rect class="hpbar-bg" x="${cx - r}" y="${cy - r - 9}" width="${r * 2}" height="4" rx="2"/>
    <rect class="hpbar" x="${cx - r}" y="${cy - r - 9}" width="${(r * 2) * hpPct / 100}" height="4" rx="2"/>
    <text class="nameplate" x="${cx}" y="${cy + r * 1.45}" text-anchor="middle">${esc(name)}</text>
    ${cond ? `<text class="cond" x="${cx}" y="${cy + r * 1.45 + 10}" text-anchor="middle">${esc(cond)}</text>` : ''}
  </g>`;
}

function bindCombat(c, cur) {
  const cmd = (name, fn) => { const b = $(`[data-cmd="${name}"]`); if (b) b.addEventListener('click', fn); };
  cmd('zoomin', () => { state.mapZoom = Math.min(1.7, state.mapZoom + 0.12); renderCombat(); });
  cmd('zoomout', () => { state.mapZoom = Math.max(0.6, state.mapZoom - 0.12); renderCombat(); });
  cmd('zoomreset', () => { state.mapZoom = 1; renderCombat(); });
  cmd('move', () => { state.moveMode = !state.moveMode; state.attackMode = null; state.pendingSpell = null; renderCombat(); });
  cmd('attack', () => openAttackPicker(cur));
  cmd('spell', () => openSpellPicker(cur));
  cmd('item', () => openItemPicker(cur));
  cmd('feature', () => openFeaturePicker(cur));
  cmd('dash', () => { cur.dash = true; cur.actionUsed = true; c.push(`${cur.name} takes the Dash action.`, ''); renderCombat(); });
  cmd('dodge', () => { cur.dodging = true; cur.actionUsed = true; c.push(`${cur.name} takes the Dodge action.`, ''); renderCombat(); });
  cmd('disengage', () => { cur.disengaged = true; cur.actionUsed = true; c.push(`${cur.name} disengages.`, ''); renderCombat(); });
  cmd('hide', () => {
    const dc = 10 + Math.max(...c.combatants.filter((x) => x.side === 'enemy' && !x.dead).map((x) => Rules.abilityMod(x, 'wis')));
    const r = Rules.check(cur, 'stealth', dc);
    cur.actionUsed = true;
    if (r.ok) cur.hidden = true;
    c.push(`${cur.name} tries to hide (${r.total} vs ${dc}) — ${r.ok ? 'success' : 'failure'}.`, r.ok ? 'heal' : '');
    renderCombat();
  });
  cmd('help', () => {
    const ally = c.combatants.find((x) => x.side === 'pc' && !x.dead && !x.down && x !== cur && Rules.minDistance(x, cur) <= 1);
    if (!ally) { toast('No ally within 5 feet to help.'); return; }
    ally.helped = true; cur.actionUsed = true;
    c.push(`${cur.name} helps ${ally.name}. ${ally.name} has advantage on the next attack.`, 'heal');
    renderCombat();
  });
  cmd('end', () => {
    state.moveMode = false; state.attackMode = null; state.pendingSpell = null; state.manualSelect = false;
    Rules.endTurn(c);
    finishAction(c);
  });
  cmd('deathsave', () => {
    const pc = c.awaitingDeathSave ? c.byId[c.awaitingDeathSave] : cur;
    const res = Rules.deathSave(c, pc);
    const die = res.die || 0;
    rollModal('Death saving throw', `${pc.name} · 10 or higher succeeds`, [{ label: pc.name, die: die || '—', mod: 0, total: die || '—' }], { ok: pc.deathSaves.f < 3, text: res.text }, () => {
      if (c.status === 'active') {
        c.awaitingDeathSave = null;
        Rules.endTurn(c);
      }
      finishAction(c);
    });
    renderCombat();
  });

  const map = $('#battleMap');
  if (map) {
    map.addEventListener('click', (e) => {
      const tok = e.target.closest('[data-tok]');
      if (tok) {
        const id = tok.dataset.tok;
        const target = c.byId[id];
        if (!target) return;
        if (state.pendingSpell && target.side === 'enemy') { resolveSpellTarget(c, cur, target); return; }
        if (state.attackMode && target.side === 'enemy') { resolveAttackTarget(c, cur, target); return; }
        state.selectedId = id; state.manualSelect = true;
        renderCombat();
        return;
      }
      const cell = e.target.closest('[data-tile]');
      if (cell && state.moveMode) {
        const [x, y] = cell.dataset.tile.split(',').map(Number);
        const r = Rules.move(c, cur, x, y);
        if (!r.ok) toast(r.reason || 'Cannot move there.');
        state.selectedId = cur.id;
        renderCombat();
      }
    });
  }
}

function openAttackPicker(c) {
  const atks = c.attacks || [];
  if (!atks.length) { toast('No weapon attack available.'); return; }
  const rows = atks.map((a) => {
    const bonus = Rules.abilityMod(c, a.ability) + Rules.prof(c);
    return `<button class="act" data-atk="${a.id}">
      <span class="act-ico">d20</span>
      <span class="act-body"><span class="act-label">${esc(a.name)}</span>
      <span class="act-meta">${Rules.sign(bonus)} to hit · ${esc(a.damage)} ${esc(a.type)} · ${a.range > 5 ? `${a.range} ft. range` : 'melee'}</span></span>
    </button>`;
  }).join('');
  openModal(`<div class="modal"><h3>Attack</h3><div class="m-sub">${esc(c.name)} · choose a weapon</div><div class="actions" style="margin-top:10px">${rows}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
  $$('[data-atk]').forEach((b) => b.addEventListener('click', () => {
    $('#modalRoot').innerHTML = '';
    state.attackMode = b.dataset.atk; state.moveMode = false; state.pendingSpell = null;
    renderCombat();
    toast('Choose an enemy in range.');
  }));
}

function resolveAttackTarget(c, attacker, target) {
  const atk = (attacker.attacks || []).find((a) => a.id === state.attackMode);
  if (!atk) return;
  const r = Rules.actionAttack(c, attacker, target, atk, {});
  state.attackMode = null;
  state.selectedId = target.id;
  if (r.ok && target.lastHit) floatText(target.id, `-${r.damage}`, 'dmg');
  if (r.ok) state.stats.damage += r.damage;
  finishAction(c);
}

function openSpellPicker(c) {
  const spells = c.spells || [];
  if (!spells.length) { toast('No spells prepared.'); return; }
  const rows = spells.map((s) => {
    const slot = s.level > 0 ? c.slots?.[s.level] : null;
    const left = s.level === 0 ? 'cantrip' : slot ? `${slot.max - slot.used}/${slot.max} slots` : 'no slots';
    const disabled = s.level > 0 && (!slot || slot.used >= slot.max) ? 'opacity:.4;pointer-events:none' : '';
    return `<button class="act" data-spell="${esc(s.name)}" style="${disabled}">
      <span class="act-ico">${s.level === 0 ? '✦' : 'L' + s.level}</span>
      <span class="act-body"><span class="act-label">${esc(s.name)} <span style="color:var(--dim);font-size:9px">${esc(s.cost === 'bonus' ? 'bonus action' : 'action')}</span></span>
      <span class="act-meta">${esc(s.desc || '')} · <b>${esc(left)}</b></span></span>
    </button>`;
  }).join('');
  const caster = c;
  openModal(`<div class="modal"><h3>Cast a spell</h3><div class="m-sub">${esc(caster.name)} · spell save DC ${caster.spells.find((s) => s.dc)?.dc || 13}</div><div class="actions" style="margin-top:10px">${rows}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
  $$('[data-spell]').forEach((b) => b.addEventListener('click', () => {
    const spell = spells.find((s) => s.name === b.dataset.spell);
    $('#modalRoot').innerHTML = ''; 
    if (spell.target === 'ally' || spell.kind === 'heal') { openAllyPicker(`Cast ${spell.name} on…`, (ally) => doSpell(state.combat, caster, spell, ally)); return; }
    if (spell.kind === 'buff' || spell.aoe) { doSpell(state.combat, caster, spell, null); return; }
    state.pendingSpell = spell.name; state.moveMode = false; state.attackMode = null;
    renderCombat();
    toast('Choose a target for the spell.');
  }));
}

function resolveSpellTarget(c, caster, target) {
  const spell = (caster.spells || []).find((s) => s.name === state.pendingSpell);
  if (!spell) return;
  doSpell(c, caster, spell, target);
}

function doSpell(c, caster, spell, target) {
  const r = Rules.actionSpell(c, caster, spell, target);
  state.pendingSpell = null;
  if (!r.ok) { toast(r.reason || 'The spell fails.'); renderCombat(); return; }
  if (target && target.lastHit) floatText(target.id, `-${target.lastHit.amount}`, 'dmg');
  if (spell.kind === 'heal' && target) floatText(target.id, `+${Math.min(target.maxHp, target.hp)}`, 'heal');
  finishAction(c);
}

function openAllyPicker(title, cb) {
  const rows = state.party.map((p) => `<button class="act" data-ally="${p.id}" ${p.dead ? 'disabled' : ''}>
    <span class="act-ico">${esc(p.name.slice(0, 1))}</span>
    <span class="act-body"><span class="act-label">${esc(p.name)}</span><span class="act-meta">${p.hp}/${p.maxHp} HP · AC ${p.ac}</span></span>
  </button>`).join('');
  openModal(`<div class="modal"><h3>${esc(title)}</h3><div class="actions" style="margin-top:10px">${rows}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
  $$('[data-ally]').forEach((b) => b.addEventListener('click', () => {
    $('#modalRoot').innerHTML = '';
    const p = getChar(b.dataset.ally); if (p) cb(p);
  }));
}

function openItemPicker(c) {
  const items = itemsCount();
  const rows = Object.entries(items).map(([name, n]) => {
    const usable = name === 'Potion of Healing' || name === 'Alchemist’s fire';
    return `<button class="act" data-item="${esc(name)}" ${usable ? '' : 'style="opacity:.45"'}>
      <span class="act-ico">${n > 1 ? '×' + n : '1'}</span>
      <span class="act-body"><span class="act-label">${esc(name)}</span>
      <span class="act-meta">${name === 'Potion of Healing' ? 'Action · heal 2d4+2 HP' : name === 'Alchemist’s fire' ? 'Action · ranged attack · 1d4 fire' : 'Not usable in this fight'}</span></span>
    </button>`;
  }).join('');
  openModal(`<div class="modal"><h3>Use an item</h3><div class="m-sub">The party’s shared pack</div><div class="actions" style="margin-top:10px">${rows || '<p style="color:var(--dim);font-size:12px">Empty.</p>'}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
  $$('[data-item]').forEach((b) => b.addEventListener('click', () => {
    const name = b.dataset.item;
    $('#modalRoot').innerHTML = '';
    if (name === 'Potion of Healing') {
      openAllyPicker('Drink or administer the potion…', (ally) => {
        if (!consumeItem('Potion of Healing')) return;
        const r = Rules.usePotion(state.combat, c, ally);
        if (!r.ok) { addItem('Potion of Healing'); toast(r.reason || 'Cannot use it now.'); renderCombat(); return; }
        floatText(ally.id, '+potion', 'heal');
        finishAction(state.combat);
      });
    } else if (name === 'Alchemist’s fire') {
      state.pendingSpell = null; state.attackMode = null; state.moveMode = false;
      state.pendingItem = 'Alchemist’s fire';
      renderCombat();
      toast('Choose an enemy to throw the flask at.');
    } else toast('That item has no use in this fight.');
  }));
}

function openFeaturePicker(c) {
  const features = (c.features || []).filter((f) => f.kind !== 'recover-slots');
  if (!features.length) { toast('No features left.'); return; }
  const rows = features.map((f) => `<button class="act" data-feat="${f.id}" ${f.uses === 0 ? 'style="opacity:.4"' : ''}>
    <span class="act-ico">${esc(f.cost === 'bonus' ? 'B' : 'A')}</span>
    <span class="act-body"><span class="act-label">${esc(f.name)}</span><span class="act-meta">${esc(f.desc)} · ${f.uses == null ? 'at will' : `${f.uses} left`}</span></span>
  </button>`).join('');
  openModal(`<div class="modal"><h3>Class features</h3><div class="actions" style="margin-top:10px">${rows}</div>
    <div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
  $$('[data-feat]').forEach((b) => b.addEventListener('click', () => {
    const f = features.find((x) => x.id === b.dataset.feat);
    $('#modalRoot').innerHTML = '';
    if (f.kind === 'cunning') {
      openModal(`<div class="modal"><h3>Cunning Action</h3><div class="actions" style="margin-top:10px">
        <button class="act" data-cun="dash"><span class="act-ico">D</span><span class="act-body"><span class="act-label">Dash</span><span class="act-meta">Double movement as a bonus action</span></span></button>
        <button class="act" data-cun="disengage"><span class="act-ico">E</span><span class="act-body"><span class="act-label">Disengage</span><span class="act-meta">Move without opening yourself</span></span></button>
        <button class="act" data-cun="hide"><span class="act-ico">H</span><span class="act-body"><span class="act-label">Hide</span><span class="act-meta">Stealth check as a bonus action</span></span></button>
      </div><div class="m-actions"><button class="btn small" data-close>Cancel</button></div></div>`);
      $$('[data-cun]').forEach((x) => x.addEventListener('click', () => {
        $('#modalRoot').innerHTML = '';
        const combat = state.combat;
        if (x.dataset.cun === 'dash') { c.dash = true; c.bonusUsed = true; combat.push(`${c.name} dashes as a bonus action.`, ''); }
        if (x.dataset.cun === 'disengage') { c.disengaged = true; c.bonusUsed = true; combat.push(`${c.name} disengages as a bonus action.`, ''); }
        if (x.dataset.cun === 'hide') { const dc = 10 + Math.max(...combat.combatants.filter((y) => y.side === 'enemy' && !y.dead).map((y) => Rules.abilityMod(y, 'wis'))); const r = Rules.check(c, 'stealth', dc); c.bonusUsed = true; if (r.ok) c.hidden = true; combat.push(`${c.name} hides as a bonus action (${r.total} vs ${dc}) — ${r.ok ? 'success' : 'failure'}.`, r.ok ? 'heal' : ''); }
        renderCombat();
      }));
      return;
    }
    const r = Rules.useFeature(state.combat, c, f);
    if (!r.ok) { toast(r.reason || 'Cannot use that now.'); renderCombat(); return; }
    finishAction(state.combat);
  }));
}

function finishAction(c) {
  state.moveMode = false; state.attackMode = null; state.pendingSpell = null; state.pendingItem = null;
  if (c.status === 'victory') { handleVictory(c); return; }
  if (c.status === 'defeat') { renderDefeat(); return; }
  renderCombat();
}

function floatText(id, text, cls) {
  const el = document.querySelector(`[data-tok="${id}"]`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = `floaty ${cls}`;
  d.textContent = text;
  d.style.left = `${r.left + r.width / 2 - 10}px`;
  d.style.top = `${r.top + r.height / 2 - 10}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

function scheduleAI() {
  const c = state.combat;
  if (!c || c.status !== 'active' || state.aiPending) return;
  const cur = Rules.current(c);
  if (!cur || cur.side !== 'enemy') return;
  if (c.awaitingDeathSave) return;
  state.aiPending = true;
  setTimeout(() => {
    state.aiPending = false;
    if (!state.combat || state.combat !== c || c.status !== 'active') return;
    const now = Rules.current(c);
    if (!now || now.side !== 'enemy') { renderCombat(); return; }
    Rules.enemyTurn(c, now);
    if (c.status === 'victory') { handleVictory(c); return; }
    if (c.status === 'defeat') { renderDefeat(); return; }
    renderCombat();
    scheduleAI();
  }, 780);
}

function handleVictory(c) {
  if (state.victoryHandled === c.id + c.round) return;
  state.victoryHandled = c.id + c.round;
  state.aiPending = false;
  setTimeout(() => {
    if (state.combat !== c) return;
    showAftermath(c);
    state.victoryHandled = null;
  }, 650);
}

/* map click for thrown items */
document.addEventListener('click', (e) => {
  const c = state.combat;
  if (!c || !state.pendingItem) return;
  const tok = e.target.closest?.('[data-tok]');
  if (!tok) return;
  const target = c.byId[tok.dataset.tok];
  const cur = Rules.current(c);
  if (!target || !cur || cur.side !== 'pc' || target.side !== 'enemy') return;
  if (!consumeItem('Alchemist’s fire')) { state.pendingItem = null; return; }
  const r = Rules.throwAlchemistsFire(c, cur, target);
  state.pendingItem = null;
  if (r.ok && target.lastHit) floatText(target.id, `-${target.lastHit.amount}`, 'dmg');
  finishAction(c);
}, true);
