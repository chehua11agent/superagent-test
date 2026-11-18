import * as THREE from './vendor/three.module.min.js';
import { buildWorld } from './world.js';
import { buildRegion } from './region.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const canvas = $('#scene');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

const MAP_META = {
  'map-cragmaw-hideout': { spawn: 1, target: 8, targetName: '克拉格', objective: '沿暗溪深入，找到区域 8 的克拉格。', done: '已找到克拉格。原型：完整战斗在下一版接入。' },
  'map-redbrand-hideout': { spawn: 1, target: 12, targetName: '水晶之杖', objective: '穿过地窖与裂隙，找到区域 12 的水晶之杖。', done: '已找到水晶之杖的居所。原型：完整战斗在下一版接入。' },
  'map-cragmaw-castle': { spawn: 1, target: 14, targetName: '刚铎', objective: '穿过破败城堡，找到区域 14 的刚铎。', done: '已找到刚铎。原型：完整战斗在下一版接入。' },
  'map-wave-echo-cave': { spawn: 1, target: 19, targetName: '奈兹纳尔', objective: '深入潮音洞，找到区域 19 的奈兹纳尔。', done: '已找到奈兹纳尔。原型：完整战斗在下一版接入。' },
  'map-thundertree': { spawn: 2, target: 4, targetName: '莱多斯', objective: '穿过雷霆树镇废墟，找到区域 4 的莱多斯。', done: '已找到德鲁伊莱多斯。原型：完整战斗在下一版接入。' },
  'map-phandalin': { spawn: 18, target: 9, targetName: '镇长', objective: '在凡度林镇上找到镇长大厅。', done: '已找到镇长大厅。原型：完整对话在下一版接入。' },
  'map-road-to-phandalin': { spawn: 0, target: 0, targetName: '哥布林伏击', objective: '击退三猪小径上的哥布林伏击，检查马尸与货物。', done: '伏击已清理，追向克拉格莫窝点。' },
  'map-sword-coast-region': { region: true, objective: '拖动旋转剑湾桌面，滚轮缩放；点击地点查看地标、hex 与旅行距离。', done: '正在查看剑湾区域图。' },
};
const CAMPAIGN = [
  { id: 'c1-ambush', chapter: '第一章 · 哥布林之矢', scene: '场景 1 · 三猪小径', map: 'map-road-to-phandalin', target: 0, targetName: '哥布林伏击',
    objective: '击退三猪小径上的哥布林伏击，检查马尸与货物。', done: '伏击已清理，追向克拉格莫窝点。',
    outro: '哥布林把俘虏和货物拖向北方。你们沿着小径追上拖痕，来到山腹中的克拉格莫窝点。' },
  { id: 'c1-hideout', chapter: '第一章 · 哥布林之矢', scene: '场景 2 · 克拉格莫窝点', map: 'map-cragmaw-hideout', target: 8, targetName: '克拉格',
    objective: '穿过暗哨、狼舍与天桥，找到区域 8 的克拉格，救出西达尔。', done: '克拉格已击败，西达尔获救。',
    outro: '克拉格倒下，西达尔·荷温特获救。他告诉你：刚铎被带去了克拉格莫城堡。' },
];
const PLAYER_BASE = {
  level: 1, hp: 60, maxHp: 60, ac: 18, atk: 7, dmg: [2, 6, 4], potions: 4, xp: 0, speed: 30, prof: 2,
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
  saves: { str: 5, dex: 2, con: 2, int: 0, wis: 1, cha: 0 },
  skills: { athletics: 5, acrobatics: 4, sleight: 2, stealth: 4, investigation: 0, perception: 3, survival: 3, persuasion: 2, deception: 2, intimidation: 2, insight: 3, medicine: 1, nature: 1, religion: 0, history: 0, arcana: 0, animal: 3, performance: 2 },
};
const PLAYER_LEVEL2 = {
  level: 2, hp: 80, maxHp: 80, ac: 19, atk: 8, dmg: [2, 8, 4], potions: 5, xp: 200, speed: 30, prof: 3,
  abilities: { str: 18, dex: 16, con: 16, int: 10, wis: 12, cha: 10 },
  saves: { str: 6, dex: 3, con: 3, int: 0, wis: 1, cha: 0 },
  skills: { athletics: 7, acrobatics: 5, sleight: 3, stealth: 5, investigation: 0, perception: 4, survival: 4, persuasion: 3, deception: 3, intimidation: 3, insight: 4, medicine: 1, nature: 1, religion: 0, history: 0, arcana: 0, animal: 3, performance: 2 },
};
const MONSTER_STATS = {
  goblin: { ac: 15, hp: 7, atk: 4, dmg: [1, 6, 2], xp: 50 },
  'goblin-boss': { ac: 15, hp: 10, atk: 4, dmg: [1, 6, 2], xp: 100 },
  wolf: { ac: 13, hp: 11, atk: 4, dmg: [2, 4, 2], xp: 50 },
  'wolf-ripper': { ac: 14, hp: 18, atk: 5, dmg: [2, 6, 3], xp: 100 },
  bugbear: { ac: 16, hp: 27, atk: 4, dmg: [2, 8, 2], xp: 200 },
  skeleton: { ac: 13, hp: 13, atk: 4, dmg: [1, 6, 2], xp: 50 },
  zombie: { ac: 8, hp: 22, atk: 3, dmg: [1, 6, 1], xp: 50 },
  spider: { ac: 14, hp: 26, atk: 5, dmg: [1, 8, 3], xp: 200 },
  twig: { ac: 13, hp: 4, atk: 3, dmg: [1, 4, 1], xp: 25 },
};
const ABILITY_ZH = { str: '力量', dex: '敏捷', con: '体质', int: '智力', wis: '感知', cha: '魅力' };
const SKILLS = [
  ['athletics', '运动', 'str'], ['acrobatics', '体操', 'dex'], ['stealth', '隐匿', 'dex'], ['perception', '察觉', 'wis'],
  ['investigation', '调查', 'int'], ['survival', '生存', 'wis'], ['persuasion', '游说', 'cha'], ['deception', '欺瞒', 'cha'],
  ['intimidation', '威吓', 'cha'], ['insight', '洞悉', 'wis'], ['medicine', '医药', 'wis'], ['nature', '自然', 'int'],
  ['religion', '宗教', 'int'], ['history', '历史', 'int'], ['arcana', '奥秘', 'int'], ['animal', '驯兽', 'wis'],
  ['sleight', '巧手', 'dex'], ['performance', '表演', 'cha'],
];
function mod(score) { return Math.floor((score - 10) / 2); }
function signed(n) { return n >= 0 ? `+${n}` : `${n}`; }
function damageText(p = playerStats) { return `${p.dmg[0]}d${p.dmg[1]}${p.dmg[2] ? '+' + p.dmg[2] : ''}`; }
function playerStatsReset() { Object.assign(playerStats, PLAYER_BASE); }
function playerStatsLevel2() { Object.assign(playerStats, PLAYER_LEVEL2); }
const playerStats = { ...PLAYER_BASE };
let combat = null;
let selectedEnemy = 0;
function d20() { return 1 + Math.floor(Math.random() * 20); }
function rollDice(n, sides, bonus) { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * sides); return t + bonus; }
function monsterKey(id) {
  const k = String(id).replace(/^lmop:monster:/, '').replace(/^monster-/, '');
  if (k.includes('bugbear')) return 'bugbear';
  if (k.includes('wolf-ripper')) return 'wolf-ripper';
  if (k.includes('wolf')) return 'wolf';
  if (k.includes('goblin-boss')) return 'goblin-boss';
  if (k.includes('goblin')) return 'goblin';
  if (k.includes('skeleton')) return 'skeleton';
  if (k.includes('zombie')) return 'zombie';
  if (k.includes('spider')) return 'spider';
  if (k.includes('twig')) return 'twig';
  return 'goblin';
}
function monsterStats(id) { return MONSTER_STATS[monsterKey(id)] || MONSTER_STATS.goblin; }

const LIGHT_ZH = { daylight: '日光', bright: '明亮', dim: '微光', darkness: '黑暗', 'magical-darkness': '魔法黑暗' };
const KIND_ZH = { region: '区域图', battlemap: '战斗地图', dungeon: '地下城', site: '野外地点', town: '城镇' };
const MONSTER_NAMES = {
  goblin: '哥布林', 'goblin-boss': '哥布林头目', wolf: '狼', 'wolf-ripper': '裂皮', bugbear: '熊地精',
  skeleton: '骷髅', nothic: '大眼怪', 'redbrand-ruffian': '红烙印恶霸', 'rat-familiar': '老鼠魔宠',
  'iarno-albrek': '伊阿诺', 'goblin-droop': 'Droop', stirge: '蚊蝠', ghoul: '食尸鬼', zombie: '僵尸',
  'twig-blight': '枯枝怪', 'giant-spider': '巨蛛', 'young-green-dragon': '年轻绿龙', acolyte: '信徒',
  grick: '掘地兽', flameskull: '燃烧之颅', doppelganger: '变形怪', nezznar: '奈兹纳尔', spectator: '观察者眼魔',
  owlbear: '枭熊', hobgoblin: '大地精', orc: '兽人', ogre: '食人魔',
};
function monsterName(id) {
  const key = String(id).replace(/^lmop:monster:/, '').replace(/^monster-/, '');
  return MONSTER_NAMES[key] || key.replace(/-/g, ' ');
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const state = {
  started: false, mode: 'map', mapId: null,
  firstPerson: false, torch: true,
  currentArea: null, discovered: new Set(), targetHit: false,
  yaw: 0, pitch: 0.22, dist: 20,
  rYaw: 0.7, rPitch: 0.72, rDist: 500,
  keys: new Set(), touch: { x: 0, y: 0, active: false },
  introT: 0, moving: false, walkPhase: 0, lastAreaAt: 0, encounterTimer: null, chapterTimer: null,
  campaign: { active: true, index: 0, completed: new Set() }, modalAction: null, pendingEncounter: null,
  regionSite: null,
};

let mapsData, crossref, rules, rulesById, crById;
let map = null, world = null, player = null, region = null;
let renderer, scene, camera, cameraFill, sun, hemi, ambient;
let raycaster, pointerDownAt = null, pickerOpen = false;

function toastMsg(text, ms = 2400) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = text; t.classList.add('show');
  clearTimeout(toastMsg._t); toastMsg._t = setTimeout(() => t.classList.remove('show'), ms);
}
function showError(err) {
  console.error(err);
  $('#loading').classList.add('hidden');
  $('#error').classList.remove('hidden');
  $('#error-text').textContent = String(err?.message || err);
}
async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function boot() {
  const dataRoot = new URL('../../data/lmop/', location.href);
  [mapsData, crossref, rules] = await Promise.all([
    getJSON(new URL('maps.json', dataRoot)),
    getJSON(new URL('rules-crossref.json', dataRoot)),
    getJSON(new URL('rules.json', dataRoot)),
  ]);
  rulesById = new Map(rules.rules.map((r) => [r.id, r.title]));
  crById = new Map(crossref.records.map((r) => [r.record_id, r]));

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, params.get('qa') === '1' ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 30, 60);
  raycaster = new THREE.Raycaster();

  hemi = new THREE.HemisphereLight(0x9fb6c8, 0x1a120c, 1.35); scene.add(hemi);
  ambient = new THREE.AmbientLight(0x3a4a58, 0.72); scene.add(ambient);
  sun = new THREE.DirectionalLight(0xd9c7a4, 1.35); sun.position.set(-30, 60, 80); scene.add(sun);
  cameraFill = new THREE.DirectionalLight(0xa9c1d4, 0.9); scene.add(cameraFill); scene.add(cameraFill.target);

  buildScenePicker();
  bindUI();

  const initial = params.get('map') && mapsData.maps.some((m) => m.id === params.get('map')) ? params.get('map') : null;
  if (initial) {
    state.campaign.active = false;
    loadMap(initial, { initial: true, quiet: true });
  } else {
    state.campaign.active = true;
    loadCampaignStep(0, { initial: true, quiet: true });
  }
  if (params.get('intro') === '0') start();
  $('#loading').classList.add('hidden');
  animate();
}

function disposeGroup(g) {
  if (!g) return;
  scene.remove(g);
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
    }
  });
}

function setAtmosphere(kind) {
  if (kind === 'region') {
    scene.background = new THREE.Color(0x0b0907);
    scene.fog = new THREE.FogExp2(0x0b0907, 0.0035);
    hemi.intensity = 2.1; ambient.intensity = 1.15; sun.intensity = 2.7;
  } else if (kind === 'battlemap' || kind === 'site' || kind === 'town') {
    scene.background = new THREE.Color(0x101712);
    scene.fog = new THREE.FogExp2(0x101712, 0.0045);
    hemi.intensity = 1.55; ambient.intensity = 0.9; sun.intensity = 2.1;
  } else {
    scene.background = new THREE.Color(0x080706);
    scene.fog = new THREE.FogExp2(0x080706, 0.0135);
    hemi.intensity = 1.35; ambient.intensity = 0.72; sun.intensity = 1.35;
  }
}

function loadMap(mapId, { initial = false, quiet = false, campaign = false } = {}) {
  const next = mapsData.maps.find((m) => m.id === mapId);
  if (!next) return;
  if (world) { disposeGroup(world.group); world = null; player = null; }
  if (region) { disposeGroup(region.group); region = null; }
  clearTimeout(state.encounterTimer);
  closeSheet();
  combat = null;
  $('#combat').classList.add('hidden');
  $('#area-encounter').classList.add('hidden');
  state.modalAction = null;
  $('#modal').classList.add('hidden');
  state.campaign.active = !!campaign;
  map = next;
  state.mapId = mapId;
  state.mode = map.kind === 'region' ? 'region' : 'map';
  state.discovered = new Set();
  state.currentArea = null;
  state.targetHit = false;
  state.regionSite = null;
  state.firstPerson = false;
  state.keys.clear();
  state.pitch = map.kind === 'dungeon' ? 0.22 : 0.28;
  state.dist = map.kind === 'town' ? 58 : map.kind === 'site' || map.kind === 'battlemap' ? 42 : 20;
  setAtmosphere(map.kind);

  const meta = MAP_META[map.id] || { spawn: 1, target: 1, targetName: '场景', objective: '探索场景。', done: '已完成。' };
  if (state.mode === 'region') {
    region = buildRegion({ map });
    scene.add(region.group);
    state.rDist = region.radius * 1.5;
    state.rYaw = 0.55; state.rPitch = 0.98;
    updateRegionPanel(null);
    showModeUi();
    updateIntro();
    if (!initial && !quiet) toastMsg(`已切换到 ${map.title}`, 1800);
    updateBrand();
    return;
  }

  const forceSpawn = initial && params.get('spawn') !== null ? Number(params.get('spawn')) : null;
  world = buildWorld({ map, crossref, rules, spawnNo: forceSpawn || meta.spawn });
  scene.add(world.group);
  player = world.hero;
  if (map.id === 'map-redbrand-hideout') {
    const c = world.bounds;
    const spot = [[275, 110], [275, 180], [250, 110]].find(([x, z]) => world.isWalkable(x - c.cx, z - c.cz));
    if (spot) player.position.set(spot[0] - c.cx, 0, spot[1] - c.cz);
  }
  if (params.get('view') === 'first' && initial) state.firstPerson = true;
  if (params.get('torch') === '0' && initial) state.torch = false;
  applyTorch();
  $('#btn-view').textContent = state.firstPerson ? '第一人称' : '第三人称';

  const initialArea = world.findAreaAt(player.position.x, player.position.z);
  if (initialArea) markArea(initialArea, true);
  showModeUi();
  updateBrand();
  updateObjective();
  updateIntro();
  updatePlayerHud();
  drawMinimap();
  if (!initial && !quiet) toastMsg(`已切换到 ${map.title}`, 1800);
}

function applyTorch() {
  if (!player) return;
  if (player.userData.light) player.userData.light.visible = state.torch;
  if (player.userData.flame) player.userData.flame.visible = state.torch;
  $('#btn-torch').textContent = `火把 ${state.torch ? '开' : '关'}`;
}
function updateIntro() {
  if (!map) return;
  const meta = MAP_META[map.id] || {};
  const h = document.querySelector('.intro h1'); const sub = document.querySelector('.subtitle');
  if (h) h.textContent = state.campaign.active ? '第一章 · 哥布林之矢' : map.title;
  if (sub) sub.textContent = state.campaign.active ? '失落矿坑 · 章节竖切片 · 三猪小径 + 克拉格莫窝点' : meta.region ? '由结构化地图数据生成的 3D 区域沙盘' : '由结构化地图数据生成的 3D 场景';
  const stat = document.querySelector('.intro-card .stat b');
  if (stat) stat.textContent = state.campaign.active ? '2' : String((map.areas || []).length || (map.sites || []).length);
  const statLabel = document.querySelector('.intro-card .stat span');
  if (statLabel) statLabel.textContent = state.campaign.active ? '场景' : '区域';
  const line = $('#intro-sheet-line');
  if (line) line.textContent = `Lv.${playerStats.level} · HP ${playerStats.hp} · AC ${playerStats.ac} · 攻击 ${signed(playerStats.atk)} · 伤害 ${damageText()} · 药水 ${playerStats.potions}`;
}

function updateBrand() {
  if (!map) return;
  $('#brand-title').textContent = map.title;
  $('#brand-sub').textContent = state.campaign.active ? `${currentStep()?.chapter || '剧情'} · ${currentStep()?.scene || map.title_en}` : `${KIND_ZH[map.kind] || map.kind} · ${map.title_en}`;
  $('#btn-scenes').textContent = isTouchDevice ? '地图' : `地图 · ${map.title.length > 10 ? map.title.slice(0, 10) + '…' : map.title}`;
  $('#btn-story').textContent = state.campaign.active ? `第一章 ${state.campaign.index + 1}/${CAMPAIGN.length}` : '第一章';
  const cap = document.querySelector('.minimap-caption');
  if (cap) cap.textContent = `${map.title} · ${map.scale?.feet_per_square ? map.scale.feet_per_square + ' ft / 格' : '比例尺'}`;
}
function updateObjective() {
  if (!map) return;
  const step = state.campaign.active ? currentStep() : null;
  const meta = MAP_META[map.id] || {};
  if (step) {
    $('#objective-eyebrow').textContent = `第一章 · 场景 ${state.campaign.index + 1} / ${CAMPAIGN.length}`;
    $('#objective-text').textContent = state.targetHit ? (step.done || '目标已完成，前往下一章。') : step.objective;
  } else {
    $('#objective-eyebrow').textContent = '当前目标';
    $('#objective-text').textContent = state.targetHit ? (meta.done || '已完成。') : (meta.objective || '探索场景。');
  }
  if (state.mode === 'map') {
    const total = world?.areas.length || 0;
    $('#progress-fill').style.width = total ? `${(state.discovered.size / total) * 100}%` : '0%';
    $('#progress-text').textContent = `${state.discovered.size} / ${total}`;
  }
}
function showModeUi() {
  const isRegion = state.mode === 'region';
  $('#objective').classList.remove('hidden');
  $('#area-panel').classList.toggle('hidden', isRegion);
  $('#region-panel').classList.toggle('hidden', !isRegion);
  $('#minimap-wrap').classList.toggle('hidden', isRegion);
  $('#controls').classList.toggle('hidden', isRegion);
  $('#btn-view').classList.toggle('hidden', isRegion);
  $('#btn-torch').classList.toggle('hidden', isRegion);
  $('#btn-map').classList.toggle('hidden', isRegion);
  $('#touch-ui').classList.toggle('hidden', isRegion || !isTouchDevice);
  $('#btn-start').textContent = state.campaign.active ? '开始第一章' : isRegion ? '进入区域图' : '进入场景';
  $('#progress-fill').parentElement.classList.toggle('hidden', isRegion);
  $('#progress-text').parentElement.classList.toggle('hidden', isRegion);
  if (isRegion && window.matchMedia('(pointer: coarse)').matches) $('#touch-ui').classList.add('hidden');
  if (!state.started) {
    $('#objective').classList.add('hidden');
    $('#area-panel').classList.add('hidden');
    $('#region-panel').classList.add('hidden');
    $('#minimap-wrap').classList.add('hidden');
    $('#btn-sheet').classList.add('hidden');
  }
}

/* ---------------------------------------------------------------- UI */
function buildScenePicker() {
  const grid = $('#scene-grid');
  grid.innerHTML = '';
  for (const m of mapsData.maps) {
    const meta = MAP_META[m.id] || {};
    const count = (m.areas || []).length || (m.sites || []).length;
    const el = document.createElement('button');
    el.className = 'scene-item';
    el.dataset.mapId = m.id;
    el.innerHTML = `<b>${escapeHtml(m.title)}</b>
      <small>${KIND_ZH[m.kind] || m.kind} · 书内 p.${m.page} / PDF p.${m.pdf_page} · ${count} ${m.kind === 'region' ? '地点' : '区域'}</small>
      <p>${escapeHtml((m.layout || '').slice(0, 72))}${(m.layout || '').length > 72 ? '…' : ''}</p>
      <span class="badge">${m.kind === 'region' ? '3D 桌面' : '可走入'}</span>`;
    el.addEventListener('click', () => { closePicker(); state.campaign.active = false; loadMap(m.id); if (!state.started) start(); else toastMsg('自由探索 · ' + m.title, 1800); });
    grid.append(el);
  }
}
function openPicker() {
  pickerOpen = true;
  $('#scene-picker').classList.remove('hidden');
  for (const el of document.querySelectorAll('.scene-item')) el.classList.toggle('active', el.dataset.mapId === state.mapId);
}
function closePicker() {
  pickerOpen = false;
  $('#scene-picker').classList.add('hidden');
}
function toggleTorch() {
  state.torch = !state.torch; applyTorch();
  toastMsg(state.torch ? '火把已点亮' : '火把已熄灭', 1200);
}
function toggleView() {
  state.firstPerson = !state.firstPerson;
  $('#btn-view').textContent = state.firstPerson ? '第一人称' : '第三人称';
  toastMsg(state.firstPerson ? '第一人称视角' : '第三人称视角', 1200);
}
function resetPlayer() {
  if (!world || combat) return;
  const meta = MAP_META[map.id] || {};
  const a = world.areas.find((x) => x.no === meta.spawn) || world.areas[0];
  if (!a) return;
  const c = a.world;
  const candidates = [[c.x, c.z], [c.x + 6, c.z + 6], [c.x - 6, c.z + 6], [c.x, c.z + 10]];
  const spot = candidates.find(([x, z]) => world.isWalkable(x, z)) || [c.x, c.z];
  player.position.set(spot[0], 0, spot[1]);
  state.yaw = 0; state.pitch = map.kind === 'dungeon' ? 0.22 : 0.28; state.dist = map.kind === 'town' ? 58 : map.kind === 'site' || map.kind === 'battlemap' ? 42 : 20;
  toastMsg('已回到起点', 1200);
}

function bindUI() {
  $('#btn-scenes').addEventListener('click', openPicker);
  $('#scene-close').addEventListener('click', closePicker);
  $('#scene-picker').addEventListener('click', (e) => { if (e.target.id === 'scene-picker') closePicker(); });
  $('#btn-view').addEventListener('click', toggleView);
  $('#btn-torch').addEventListener('click', toggleTorch);
  $('#btn-map').addEventListener('click', () => { if (map) window.open(`../../data/lmop/map-schematics/${map.id}.svg`, '_blank'); });
  $('#btn-help').addEventListener('click', () => {
    $('#modal-eyebrow').textContent = '操作';
    $('#modal-title').textContent = state.mode === 'region' ? '剑湾区域图' : '在洞穴里';
    $('#modal-body').innerHTML = state.mode === 'region'
      ? '<p><b>拖动</b>旋转剑湾桌面，<b>滚轮</b>缩放；<b>点击地点</b>查看 hex、类型、对应场景与旅行距离。</p><p>区域图不是可走入的地下城，它是桌游式的 3D 沙盘。左上“地图”可切换到 8 张地图。</p>'
      : '<p><b>WASD / 方向键</b> 移动，<b>Shift</b> 疾走；拖动鼠标旋转视角，滚轮拉近拉远。</p><p><b>F</b> 开关火把，<b>R</b> 回到起点。走进不同区域会读取该区域的场景摘要、光照、出口、怪物与规则。</p><p>左上“地图”可切换 8 张地图；区域图是桌游式 3D 沙盘。</p>';
    $('#modal-close').textContent = '知道了';
    $('#modal').classList.remove('hidden');
  });
  $('#modal-close').addEventListener('click', () => {
    $('#modal').classList.add('hidden');
    const action = state.modalAction; state.modalAction = null;
    if (action) action();
  });
  $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) $('#modal').classList.add('hidden'); });
  $('#btn-start').addEventListener('click', startCampaign);
  $('#btn-free').addEventListener('click', () => {
    state.campaign.active = false;
    playerStatsReset();
    loadMap('map-cragmaw-hideout', { initial: true });
    start();
    toastMsg('自由探索模式', 1800);
  });
  $('#btn-story').addEventListener('click', resumeCampaign);
  $('#btn-sheet').addEventListener('click', toggleSheet);
  $('#sheet-close').addEventListener('click', closeSheet);
  $('#area-encounter').addEventListener('click', () => { if (state.pendingEncounter && !combat) startCombat(state.pendingEncounter); });
  $('#combat-attack').addEventListener('click', playerAttack);
  $('#combat-potion').addEventListener('click', usePotion);
  $('#combat-flee').addEventListener('click', combatFlee);

  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.started) return;
    dragging = true; pointerDownAt = { x: e.clientX, y: e.clientY }; lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add('dragging'); canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !state.started) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (state.mode === 'region') {
      state.rYaw -= dx * 0.006;
      state.rPitch = Math.max(0.18, Math.min(1.25, state.rPitch + dy * 0.004));
    } else {
      state.yaw -= dx * 0.006;
      state.pitch = Math.max(-0.08, Math.min(0.95, state.pitch + dy * 0.004));
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    const moved = pointerDownAt ? Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y) : 0;
    dragging = false; canvas.classList.remove('dragging'); pointerDownAt = null;
    if (state.mode === 'region' && moved < 6) pickRegionSite(e);
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; pointerDownAt = null; canvas.classList.remove('dragging'); });
  canvas.addEventListener('wheel', (e) => {
    if (!state.started) return;
    e.preventDefault();
    if (state.mode === 'region') state.rDist = Math.max(120, Math.min(1400, state.rDist + e.deltaY * 0.5));
    else state.dist = Math.max(12, Math.min(48, state.dist + e.deltaY * 0.02));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      state.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault();
    }
    if (e.code === 'KeyC') toggleSheet();
    if (e.code === 'KeyF') toggleTorch();
    if (e.code === 'KeyR') resetPlayer();
    if (e.code === 'Escape') { closePicker(); closeSheet(); }
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  window.addEventListener('blur', () => state.keys.clear());
  window.addEventListener('resize', resize);

  // touch
  const joystick = $('#joystick'), knob = $('#joystick-knob'), lookZone = $('#look-zone');
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760) {
    $('#touch-ui').classList.remove('hidden');
    $('#controls').classList.add('hidden');
    const stick = { id: null, cx: 0, cy: 0, r: 44 };
    const resetStick = () => { state.touch = { x: 0, y: 0, active: false }; knob.style.transform = 'translate(0,0)'; };
    joystick.addEventListener('pointerdown', (e) => {
      const r = joystick.getBoundingClientRect();
      stick.id = e.pointerId; stick.cx = r.left + r.width / 2; stick.cy = r.top + r.height / 2;
      state.touch.active = true; joystick.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    joystick.addEventListener('pointermove', (e) => {
      if (!state.touch.active || e.pointerId !== stick.id) return;
      let dx = e.clientX - stick.cx, dy = e.clientY - stick.cy;
      const d = Math.hypot(dx, dy); if (d > stick.r) { dx = dx / d * stick.r; dy = dy / d * stick.r; }
      state.touch.x = dx / stick.r; state.touch.y = -dy / stick.r;
      knob.style.transform = `translate(${dx}px,${dy}px)`; e.preventDefault();
    });
    const endStick = () => { resetStick(); };
    joystick.addEventListener('pointerup', endStick); joystick.addEventListener('pointercancel', endStick);
    let lookId = null, lx = 0, ly = 0;
    lookZone.addEventListener('pointerdown', (e) => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; lookZone.setPointerCapture?.(e.pointerId); e.preventDefault(); });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      if (state.mode === 'region') {
        state.rYaw -= (e.clientX - lx) * 0.008;
        state.rPitch = Math.max(0.18, Math.min(1.25, state.rPitch + (e.clientY - ly) * 0.005));
      } else {
        state.yaw -= (e.clientX - lx) * 0.008;
        state.pitch = Math.max(-0.08, Math.min(0.95, state.pitch + (e.clientY - ly) * 0.005));
      }
      lx = e.clientX; ly = e.clientY; e.preventDefault();
    });
    const endLook = () => { lookId = null; };
    lookZone.addEventListener('pointerup', endLook); lookZone.addEventListener('pointercancel', endLook);
  }
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, params.get('qa') === '1' ? 1 : 1.5));
}

function start() {
  if (state.started) return;
  state.started = true;
  $('#intro').classList.add('hidden');
  $('#loading').classList.add('hidden');
  $('#topbar').classList.remove('hidden');
  $('#btn-sheet').classList.remove('hidden');
  showModeUi();
  updatePlayerHud();
  updateObjective();
  if (state.mode === 'map') { if (state.currentArea) updatePanel(state.currentArea); drawMinimap(); }
  setTimeout(() => toastMsg(state.mode === 'region' ? '拖动旋转 · 滚轮缩放 · 点击地点' : isTouchDevice ? '左侧摇杆移动 · 右侧拖动视角 · 左上“地图”切换场景' : 'WASD 移动 · 拖动视角 · 左上“地图”切换场景', 3400), 500);
  if (state.campaign.active && state.mode === 'map') showChapterCard(currentStep());
  window.__LMOP3D_READY__ = true;
}




/* ---------------------------------------------------------------- character sheet */
function updatePlayerHud() {
  const b = $('#btn-sheet');
  if (!b) return;
  $('#ph-level').textContent = `Lv.${playerStats.level}`;
  $('#ph-main').textContent = `HP ${Math.max(0, playerStats.hp)}/${playerStats.maxHp} · AC ${playerStats.ac}`;
  $('#ph-sub').textContent = `攻击 ${signed(playerStats.atk)} · ${damageText()}`;
  b.title = `角色数值（C）· Lv.${playerStats.level}`;
}
function renderSheet() {
  if ($('#sheet').classList.contains('hidden')) return;
  const p = playerStats;
  $('#sheet-name').textContent = '冒险者';
  $('#sheet-sub').textContent = `Lv.${p.level} · 竖切片角色 · ${p.level >= 2 ? '第一章后半' : '第一章开场'}`;
  $('#sheet-hp-fill').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
  $('#sheet-hp-text').textContent = `HP ${Math.max(0, p.hp)} / ${p.maxHp}`;
  const vitals = [
    ['AC', p.ac], ['攻击', signed(p.atk)], ['伤害', damageText(p)], ['先攻', signed(mod(p.abilities.dex))],
    ['速度', `${p.speed} ft`], ['熟练', signed(p.prof)], ['被动察觉', 10 + (p.skills.perception ?? mod(p.abilities.wis))], ['药水', p.potions], ['XP', p.xp],
  ];
  $('#sheet-vitals').innerHTML = vitals.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  $('#sheet-abilities').innerHTML = Object.entries(p.abilities).map(([k, v]) => `<div><span>${ABILITY_ZH[k]}</span><b>${v}</b><i>${signed(mod(v))}</i></div>`).join('');
  $('#sheet-saves').innerHTML = Object.entries(p.saves).map(([k, v]) => `<div><span>${ABILITY_ZH[k]}</span><b>${signed(v)}</b><i>豁免</i></div>`).join('');
  $('#sheet-skills').innerHTML = SKILLS.map(([k, label, ab]) => `<div><span>${label} <em>${ABILITY_ZH[ab]}</em></span><b>${signed(p.skills[k] ?? mod(p.abilities[ab]))}</b></div>`).join('');
}
function openSheet() { if (!state.started) return; $('#sheet').classList.remove('hidden'); renderSheet(); updatePlayerHud(); }
function closeSheet() { $('#sheet').classList.add('hidden'); }
function toggleSheet() { if ($('#sheet').classList.contains('hidden')) openSheet(); else closeSheet(); }

/* ---------------------------------------------------------------- combat */
function combatLog(html) {
  const log = $('#combat-log');
  if (!log) return;
  const p = document.createElement('p');
  p.innerHTML = html;
  log.append(p);
  log.scrollTop = log.scrollHeight;
}
function livingEnemies() { return combat ? combat.enemies.filter((e) => e.alive) : []; }
function startCombat(area) {
  if (combat || !area || state.mode !== 'map' || !state.started) return;
  const objects = (world?.monsters || []).filter((m) => m.userData.area === area.no && m.visible && (m.userData.hp ?? 1) > 0);
  if (!objects.length) { area.cleared = true; completeTarget(area); return; }
  const enemies = objects.map((obj, i) => {
    const st = monsterStats(obj.userData.name);
    obj.userData.hp = st.hp;
    obj.userData.maxHp = st.hp;
    return { obj, name: monsterName(obj.userData.name), hp: st.hp, maxHp: st.hp, ac: st.ac, atk: st.atk, dmg: st.dmg, xp: st.xp, alive: true, idx: i };
  });
  combat = { area, enemies, turn: 'player', log: [] };
  selectedEnemy = 0;
  clearTimeout(state.encounterTimer);
  closeSheet();
  $('#area-panel').classList.add('hidden');
  $('#chapter-card').classList.add('hidden');
  $('#touch-ui').classList.add('hidden');
  $('#controls').classList.add('hidden');
  $('#combat').classList.remove('hidden');
  $('#combat-title').textContent = `遭遇 · ${area.name}`;
  $('#combat-log').innerHTML = '';
  combatLog(`<b>遭遇：</b>${enemies.map((e) => e.name).join('、')}。`);
  combatLog('你的回合：选择目标后点击「攻击」。');
  renderCombat();
}
function renderCombat() {
  if (!combat) return;
  const box = $('#combat-enemies');
  box.innerHTML = '';
  for (const [i, e] of combat.enemies.entries()) {
    const card = document.createElement('div');
    card.className = `combat-enemy${e.alive ? '' : ' dead'}${i === selectedEnemy && e.alive ? ' selected' : ''}`;
    card.innerHTML = `<b>${escapeHtml(e.name)}</b><small>AC ${e.ac} · 攻 ${signed(e.atk)} · ${e.dmg[0]}d${e.dmg[1]}+${e.dmg[2]}</small><small>HP ${e.hp}/${e.maxHp}</small><div class="hp-track"><i style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></i></div>`;
    if (e.alive) card.addEventListener('click', () => { selectedEnemy = i; renderCombat(); });
    box.append(card);
  }
  $('#combat-player').innerHTML = `Lv.${playerStats.level} · HP ${Math.max(0, playerStats.hp)} / ${playerStats.maxHp} · AC ${playerStats.ac}<small>攻击 ${signed(playerStats.atk)} · 伤害 ${damageText()} · 药水 ${playerStats.potions}</small>`;
  $('#combat-attack').textContent = `攻击 ${signed(playerStats.atk)} · ${damageText()}`;
  updatePlayerHud();
  renderSheet();
  const disabled = combat.turn !== 'player';
  $('#combat-attack').disabled = disabled;
  $('#combat-potion').disabled = disabled || playerStats.potions <= 0;
  $('#combat-flee').disabled = disabled;
  $('#combat-potion').textContent = `药水 ×${playerStats.potions}`;
}
function playerAttack() {
  if (!combat || combat.turn !== 'player') return;
  const alive = livingEnemies();
  if (!alive.length) return;
  let target = alive.find((e) => e.idx === selectedEnemy) || alive[0];
  selectedEnemy = target.idx;
  const r = d20();
  const crit = r === 20;
  const hit = crit || (r !== 1 && r + playerStats.atk >= target.ac);
  if (!hit) {
    combatLog(`<b>你</b> 攻击 ${target.name}：d20 ${r} + ${playerStats.atk} = ${r + playerStats.atk}，未命中（AC ${target.ac}）。`);
  } else {
    let dmg = rollDice(playerStats.dmg[0], playerStats.dmg[1], playerStats.dmg[2]);
    if (crit) dmg += rollDice(playerStats.dmg[0], playerStats.dmg[1], 0);
    target.hp = Math.max(0, target.hp - dmg);
    target.obj.userData.hp = target.hp;
    combatLog(`<b>你</b> 攻击 ${target.name}：d20 ${r}${crit ? '（暴击）' : ''} 命中，造成 ${dmg} 点伤害。`);
    if (target.hp <= 0) {
      target.alive = false; target.obj.visible = false;
      combatLog(`${target.name} 倒下了。`);
    }
  }
  if (!livingEnemies().length) {
    combat.turn = 'done'; renderCombat();
    combatLog('<b>遭遇结束：</b>敌人全部倒下。');
    setTimeout(() => endCombat(true), 620);
    return;
  }
  combat.turn = 'enemy'; renderCombat();
  setTimeout(enemyTurn, 720);
}
function enemyTurn() {
  if (!combat || combat.turn !== 'enemy') return;
  for (const e of livingEnemies()) {
    const r = d20();
    const hit = r === 20 || (r !== 1 && r + e.atk >= playerStats.ac);
    if (!hit) {
      combatLog(`${e.name} 攻击你：d20 ${r} + ${e.atk} = ${r + e.atk}，未命中（AC ${playerStats.ac}）。`);
    } else {
      const dmg = rollDice(e.dmg[0], e.dmg[1], e.dmg[2]) + (r === 20 ? rollDice(1, e.dmg[1], 0) : 0);
      playerStats.hp = Math.max(0, playerStats.hp - dmg);
      combatLog(`${e.name} 攻击你：d20 ${r}${r === 20 ? '（暴击）' : ''} 命中，造成 ${dmg} 点伤害。`);
    }
    if (playerStats.hp <= 0) break;
  }
  if (playerStats.hp <= 0) {
    combatLog('<b>你倒下了。</b>');
    renderCombat();
    setTimeout(() => endCombat(false), 700);
    return;
  }
  combat.turn = 'player';
  renderCombat();
  combatLog('你的回合。');
}
function usePotion() {
  if (!combat || combat.turn !== 'player' || playerStats.potions <= 0) return;
  const heal = rollDice(2, 4, 2);
  playerStats.potions--;
  playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + heal);
  updatePlayerHud(); renderSheet();
  combatLog(`<b>你</b> 喝下药水，恢复 ${heal} 点生命。`);
  combat.turn = 'enemy'; renderCombat();
  setTimeout(enemyTurn, 620);
}
function combatFlee() {
  if (!combat || combat.turn !== 'player') return;
  endCombat('flee');
}
function endCombat(result) {
  if (!combat) return;
  const c = combat;
  const area = c.area;
  combat = null;
  $('#combat').classList.add('hidden');
  $('#area-panel').classList.remove('hidden');
  showModeUi();
  updatePlayerHud();
  renderSheet();
  if (result === true) {
    area.cleared = true;
    for (const e of c.enemies) { e.alive = false; e.obj.visible = false; }
    const xp = c.enemies.reduce((s, e) => s + e.xp, 0);
    playerStats.xp += xp;
    playerStats.hp = playerStats.maxHp;
    playerStats.potions = Math.min(playerStats.level >= 2 ? PLAYER_LEVEL2.potions : PLAYER_BASE.potions, playerStats.potions + 1);
    const target = (state.campaign.active ? currentStep()?.target : MAP_META[map.id]?.target);
    showCombatReward(area, xp, area.no === target);
  } else if (result === 'flee') {
    toastMsg('你脱离了战斗；敌人仍在原地。', 2200);
    updatePanel(area);
  } else {
    playerStats.hp = playerStats.maxHp;
    playerStats.potions = playerStats.level >= 2 ? PLAYER_LEVEL2.potions : PLAYER_BASE.potions;
    $('#modal-eyebrow').textContent = '战斗失败';
    $('#modal-title').textContent = '你倒下了';
    $('#modal-body').innerHTML = '<p>你被击倒，但故事没有结束。回到章节起点，恢复生命与药水后再试。</p>';
    $('#modal-close').textContent = '回到起点';
    state.modalAction = () => { resetPlayer(); };
    $('#modal').classList.remove('hidden');
  }
}
function showCombatReward(area, xp, isTarget) {
  $('#modal-eyebrow').textContent = '战斗胜利';
  $('#modal-title').textContent = area.name;
  $('#modal-body').innerHTML = `<p>${escapeHtml(area.record?.summary || area.visual || '遭遇结束。')}</p>
    <p><b>+${xp} XP</b>${area.no === 8 ? ' · 克拉格的火坑旁找到了被绑的西达尔' : ' · 战场上有几枚银币和一把弯刀'}。短暂休息后生命与药水恢复。</p>
    ${isTarget ? '<p>本章目标已达成。</p>' : '<p>继续探索，或前往下一个区域。</p>'}`;
  $('#modal-close').textContent = '继续';
  state.modalAction = null;
  if (isTarget) state.modalAction = () => { completeTarget(area); };
  $('#modal').classList.remove('hidden');
}

/* ---------------------------------------------------------------- campaign */
function currentStep() { return CAMPAIGN[state.campaign.index] || null; }
function loadCampaignStep(i, { initial = false, quiet = false } = {}) {
  if (i < 0) i = 0;
  if (i >= CAMPAIGN.length) { finishCampaign(); return; }
  state.campaign.index = i;
  state.campaign.active = true;
  state.targetHit = false;
  const step = CAMPAIGN[i];
  playerStatsReset();
  if (i >= 1) playerStatsLevel2();
  loadMap(step.map, { initial, quiet: true, campaign: true });
  updateObjective();
  if (state.started) showChapterCard(step);
}
function startCampaign() {
  state.campaign.completed.clear();
  state.campaign.index = 0;
  state.campaign.active = true;
  playerStatsReset();
  loadCampaignStep(0, { initial: true, quiet: true });
  start();
  showChapterCard(CAMPAIGN[0]);
}
function resumeCampaign() {
  if (state.campaign.active) {
    showChapterCard(currentStep());
    toastMsg(`当前剧情：${currentStep()?.chapter || ''}`, 1600);
    return;
  }
  state.campaign.active = true;
  loadCampaignStep(state.campaign.index, { initial: true });
  if (!state.started) start();
}
function advanceCampaign() {
  const next = state.campaign.index + 1;
  state.campaign.completed.add(state.campaign.index);
  if (next >= CAMPAIGN.length) { finishCampaign(); return; }
  const fade = $('#fade');
  fade.classList.add('show');
  setTimeout(() => {
    loadCampaignStep(next, { quiet: true });
    fade.classList.remove('show');
  }, 420);
}
function showChapterCard(step) {
  if (!step) return;
  clearTimeout(state.chapterTimer);
  $('#chapter-eyebrow').textContent = `第一章 · 场景 ${state.campaign.index + 1} / ${CAMPAIGN.length} · ${step.scene || step.chapter}`;
  $('#chapter-title').textContent = step.chapter;
  $('#chapter-objective').textContent = step.objective;
  const card = $('#chapter-card');
  card.classList.remove('hidden');
  state.chapterTimer = setTimeout(() => card.classList.add('hidden'), 3600);
}
function showChapterComplete(step) {
  const last = state.campaign.index + 1 >= CAMPAIGN.length;
  $('#modal-eyebrow').textContent = `第一章 · 场景 ${state.campaign.index + 1} / ${CAMPAIGN.length} · 场景完成`;
  $('#modal-title').textContent = step.chapter;
  $('#modal-body').innerHTML = `<p>${escapeHtml(step.outro)}</p>
    <p>${last ? '第一章到此结束；第二章（凡度林 / 红烙印）待制作。完整存档与正式游戏接入仍在下一版。' : '点击前往下一段，地图、起点与探索进度会重置。'}</p>`;
  $('#modal-close').textContent = last ? '完成第一章' : '前往下一段';
  state.modalAction = last ? () => finishCampaign() : () => advanceCampaign();
  $('#modal').classList.remove('hidden');
}
function finishCampaign() {
  state.campaign.completed.add(state.campaign.index);
  $('#modal-eyebrow').textContent = '剧情完成';
  $('#modal-title').textContent = '第一章 · 哥布林之矢 完成';
  $('#modal-body').innerHTML = `<p>三猪小径的伏击已清理，克拉格莫窝点的克拉格已被击败，西达尔获救。他告诉你：刚铎被带去了克拉格莫城堡。</p>
    <p>第一章竖切片到此结束；第二章（凡度林 / 红烙印）待制作。现在可以重玩第一章，或自由探索其余地图。</p>`;
  $('#modal-close').textContent = '重玩第一章';
  state.modalAction = () => { startCampaign(); };
  $('#modal').classList.remove('hidden');
}

/* ---------------------------------------------------------------- map triggers */
function markArea(area, silent = false) {
  if (!area || state.mode !== 'map') return;
  state.currentArea = area;
  if (!area.discovered) {
    area.discovered = true; state.discovered.add(area.no);
    if (!silent) toastMsg(`发现区域 ${area.no} · ${area.name}`);
  }
  updatePanel(area);
  updateObjective();
  const living = (world?.monsters || []).filter((m) => m.userData.area === area.no && m.visible && (m.userData.hp ?? 1) > 0);
  const hasEncounter = !area.cleared && living.length > 0;
  const btn = $('#area-encounter');
  if (btn) {
    btn.classList.toggle('hidden', !hasEncounter);
    btn.textContent = hasEncounter ? `进入战斗 · ${living.length} 名敌人` : '进入战斗';
  }
  state.pendingEncounter = hasEncounter ? area : null;
  const step = state.campaign.active ? currentStep() : null;
  const meta = MAP_META[map.id] || {};
  const target = step ? step.target : meta.target;
  if (!hasEncounter && area.no === target && !state.targetHit) completeTarget(area);
  if (hasEncounter && !silent && area.no !== meta.spawn) {
    clearTimeout(state.encounterTimer);
    state.encounterTimer = setTimeout(() => {
      if (!combat && state.currentArea === area && !area.cleared) startCombat(area);
    }, 750);
  }
  drawMinimap();
}
function completeTarget(area) {
  if (!area || state.targetHit) return;
  const step = state.campaign.active ? currentStep() : null;
  const meta = MAP_META[map.id] || {};
  const target = step ? step.target : meta.target;
  if (area.no !== target) return;
  state.targetHit = true;
  updateObjective();
  clearTimeout(state.encounterTimer);
  state.encounterTimer = setTimeout(() => step ? showChapterComplete(step) : showEncounter(area), 420);
}
function updatePanel(area) {
  if (!state.started || state.mode !== 'map') return;
  $('#area-panel').classList.remove('hidden');
  $('#area-light').textContent = LIGHT_ZH[area.light] || area.light || '—';
  $('#area-no').textContent = area.no;
  $('#area-name').textContent = area.name;
  $('#area-summary').textContent = area.record?.summary || area.visual || '—';
  const tags = (area.record?.rule_ids || []).slice(0, 7).map((id) => `<span class="tag">${escapeHtml(rulesById.get(id) || id)}</span>`).join('');
  $('#area-rules').innerHTML = tags || '<span class="tag">无机械检定</span>';
  const conns = (map.connections || []).filter((c) => c.from === area.area_id || c.to === area.area_id);
  const exits = conns.map((c) => {
    const otherId = c.from === area.area_id ? c.to : c.from;
    const other = world.byId.get(otherId);
    return other ? `#${other.no} ${other.name}` : '外部';
  });
  $('#area-exits').textContent = exits.length ? [...new Set(exits)].join(' · ') : '—';
  const monsters = area.record?.monsters || [];
  $('#area-monsters').textContent = monsters.length ? monsters.map((m) => `${monsterName(m.monster_id)}${Number(m.count) > 1 ? ' ×' + m.count : ''}`).join(' · ') : '—';
  const living = (world?.monsters || []).filter((m) => m.userData.area === area.no && m.visible && (m.userData.hp ?? 1) > 0);
  $('#area-encounter').classList.toggle('hidden', !living.length || !!area.cleared);
  $('#area-encounter').textContent = living.length ? `进入战斗 · ${living.length} 名敌人` : '进入战斗';
}
function showEncounter(area) {
  const meta = MAP_META[map.id] || {};
  const monsters = (area.record?.monsters || []).map((m) => `${monsterName(m.monster_id)} ×${m.count}`).join('、');
  $('#modal-eyebrow').textContent = `区域 ${area.no} · 目标`;
  $('#modal-title').textContent = meta.targetName ? `到达 · ${meta.targetName}` : `到达 · ${area.name}`;
  $('#modal-body').innerHTML = `<p>${escapeHtml(area.record?.summary || area.visual || '')}</p>
    <p>${monsters ? `场景数据记录：${escapeHtml(monsters)}。` : ''}</p>
    <p>这是 3D 场景切片：区域触发、光照、出口、规则与怪物数据已经接通；完整战斗/对话在下一版接入。</p>`;
  $('#modal-close').textContent = '继续探索';
  state.modalAction = null;
  $('#modal').classList.remove('hidden');
}

/* ---------------------------------------------------------------- movement / draw */
function updateMovement(dt) {
  if (!state.started || state.mode !== 'map' || !player || combat) return;
  let ix = 0, iz = 0;
  if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) iz += 1;
  if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) iz -= 1;
  if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) ix += 1;
  if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) ix -= 1;
  ix += state.touch.x; iz += state.touch.y;
  const len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; }
  const moving = Math.abs(ix) + Math.abs(iz) > 0.05;
  state.moving = moving;
  if (!moving) return;
  const speed = (state.keys.has('ShiftLeft') || state.keys.has('ShiftRight') ? 23 : 14);
  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const v = forward.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize().multiplyScalar(speed * dt);
  const nx = player.position.x + v.x, nz = player.position.z + v.z;
  if (world.isWalkable(nx, nz)) { player.position.x = nx; player.position.z = nz; }
  else if (world.isWalkable(nx, player.position.z)) player.position.x = nx;
  else if (world.isWalkable(player.position.x, nz)) player.position.z = nz;
  const targetRot = Math.atan2(v.x, v.z);
  let delta = targetRot - player.rotation.y;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  player.rotation.y += delta * Math.min(1, dt * 12);
  state.walkPhase += dt * (speed / 8);
  player.position.y = Math.abs(Math.sin(state.walkPhase * 2)) * 0.08;
  const now = performance.now();
  if (now - state.lastAreaAt > 120) {
    state.lastAreaAt = now;
    const area = world.findAreaAt(player.position.x, player.position.z);
    if (area && area !== state.currentArea) markArea(area);
  }
}

function drawCamera() {
  if (state.mode === 'region' && region) {
    const p = new THREE.Vector3(
      Math.sin(state.rYaw) * Math.cos(state.rPitch) * state.rDist,
      Math.sin(state.rPitch) * state.rDist,
      Math.cos(state.rYaw) * Math.cos(state.rPitch) * state.rDist
    );
    camera.position.lerp(p, 0.2);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (!player) return;
  if (state.firstPerson) {
    player.visible = false;
    camera.position.set(player.position.x, 5.4, player.position.z);
    const dir = new THREE.Vector3(-Math.sin(state.yaw) * Math.cos(state.pitch), -Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
    camera.lookAt(camera.position.clone().add(dir));
  } else {
    player.visible = true;
    const d = state.dist;
    const cosP = Math.cos(state.pitch);
    const off = new THREE.Vector3(Math.sin(state.yaw) * d * cosP, d * Math.sin(state.pitch) + 7, Math.cos(state.yaw) * d * cosP);
    const target = new THREE.Vector3(player.position.x, 4.6, player.position.z);
    const desired = target.clone().add(off);
    const dir = desired.clone().sub(target);
    let camPos = desired;
    if (map.kind === 'dungeon') {
      for (let t = 1; t >= 0.45; t -= 0.05) {
        const p = target.clone().add(dir.clone().multiplyScalar(t));
        if (world.isWalkable(p.x, p.z)) { camPos = p; break; }
      }
    }
    camera.position.lerp(camPos, 0.35);
    camera.lookAt(target);
  }
  cameraFill.intensity = map && (map.kind === 'town' || map.kind === 'site' || map.kind === 'battlemap') ? 2.0 : 1.25;
  cameraFill.position.copy(camera.position);
  cameraFill.target.position.copy(player.position).add(new THREE.Vector3(0, 3, 0));
  cameraFill.target.updateMatrixWorld();
}

let last = performance.now();
function clockDelta() { const n = performance.now(); const d = Math.min(0.05, (n - last) / 1000); last = n; return d; }
function animate() {
  requestAnimationFrame(animate);
  const dt = clockDelta();
  state.introT = Math.min(1, state.introT + dt * 0.7);
  if (state.mode === 'map') { updateMovement(dt); world?.update(dt); }
  else region?.update(dt);
  drawCamera();
  renderer.render(scene, camera);
  if (state.started && state.mode === 'map') drawMinimapThrottled();
}
let lastMm = 0;
function drawMinimapThrottled() { const n = performance.now(); if (n - lastMm > 160) { lastMm = n; drawMinimap(); } }

function drawMinimap() {
  const mm = $('#minimap'); if (!mm || !map || !world || !player) return;
  const ctx = mm.getContext('2d'); const w = mm.width, h = mm.height;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#13100d'; ctx.fillRect(0, 0, w, h);
  const pad = 12;
  const scale = Math.min((w - pad * 2) / map.canvas.width, (h - pad * 2) / map.canvas.height);
  const ox = (w - map.canvas.width * scale) / 2, oy = (h - map.canvas.height * scale) / 2;
  const tx = (x) => ox + x * scale, ty = (y) => oy + y * scale;
  ctx.strokeStyle = 'rgba(217,173,98,.22)'; ctx.lineWidth = 1;
  for (const c of map.connections || []) {
    const a = world.byId.get(c.from), b = world.byId.get(c.to);
    if (!a || !b) continue;
    ctx.beginPath(); ctx.moveTo(tx(a.centroid[0]), ty(a.centroid[1])); ctx.lineTo(tx(b.centroid[0]), ty(b.centroid[1])); ctx.stroke();
  }
  for (const a of world.areas) {
    const isCurrent = state.currentArea === a;
    ctx.beginPath();
    a.footprint.forEach((p, i) => { const X = tx(p[0]), Y = ty(p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.fillStyle = isCurrent ? 'rgba(241,207,143,.48)' : a.discovered ? 'rgba(217,173,98,.18)' : 'rgba(120,110,95,.08)';
    ctx.strokeStyle = isCurrent ? '#f1cf8f' : a.discovered ? 'rgba(217,173,98,.5)' : 'rgba(217,173,98,.18)';
    ctx.lineWidth = isCurrent ? 1.6 : 1; ctx.fill(); ctx.stroke();
    ctx.fillStyle = a.discovered ? '#ead7b3' : 'rgba(234,215,179,.28)';
    ctx.font = `${a.no > 9 ? 8 : 9}px ui-sans-serif, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(a.no), tx(a.centroid[0]), ty(a.centroid[1]));
  }
  const px = tx(player.position.x + world.bounds.cx), py = ty(player.position.z + world.bounds.cz);
  const f = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(f.x, -f.z));
  ctx.fillStyle = '#73b9b2';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(0, 2); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(234,215,179,.55)'; ctx.font = '9px serif'; ctx.textAlign = 'center'; ctx.fillText('N', w - 12, 12);
  ctx.beginPath(); ctx.moveTo(w - 12, 15); ctx.lineTo(w - 9, 21); ctx.lineTo(w - 15, 21); ctx.closePath(); ctx.fill();
}

/* ---------------------------------------------------------------- region */
function pickRegionSite(event) {
  if (!region) return;
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(region.sites.map((s) => s.mesh), true);
  let node = hits[0]?.object;
  while (node && !node.userData?.site) node = node.parent;
  if (node?.userData?.site) updateRegionPanel(node.userData.site);
}
function updateRegionPanel(site) {
  if (!map) return;
  state.regionSite = site;
  const selected = $('#region-selected');
  const travel = $('#region-travel');
  if (!site) {
    selected.innerHTML = '点击地图上的地点查看详情；左上“地图”可切换 8 张地图。';
  } else {
    selected.innerHTML = `<b>${escapeHtml(site.name)}</b> · ${escapeHtml(site.name_en || '')}<br><span>${site.type} · hex ${site.hex.join(',')}</span>${site.note ? `<br>${escapeHtml(site.note)}` : ''}${site.scene_id ? `<br>对应场景：${escapeHtml(crById.get(site.scene_id)?.name || site.scene_id)}` : ''}`;
  }
  const from = site?.id || 'site-phandalin';
  const rows = (map.travel || []).filter((t) => t.from === from || t.to === from).map((t) => {
    const other = t.from === from ? t.to : t.from;
    const otherSite = (map.sites || []).find((s) => s.id === other);
    return `<div><span>${escapeHtml(otherSite?.name || other)}</span><b>${t.miles} mi</b></div>`;
  });
  const list = (map.sites || []).filter((s) => s.label).map((s) => `<button data-site="${s.id}">${escapeHtml(s.name)}</button>`).join('');
  travel.innerHTML = `<div class="region-site-list">${list}</div>${rows.length ? `<p class="eyebrow" style="margin-top:9px">旅行距离</p>${rows.join('')}` : ''}`;
  for (const b of travel.querySelectorAll('button[data-site]')) {
    b.addEventListener('click', () => { const s = map.sites.find((x) => x.id === b.dataset.site); if (s) updateRegionPanel(s); });
  }
}

/* ---------------------------------------------------------------- hooks */
function goTo(no) {
  if (state.mode !== 'map' || !world) return;
  const a = world.areas.find((x) => x.no === Number(no));
  if (a) { player.position.set(a.world.x, 0, a.world.z); markArea(a); }
}
function discoverAll() { if (world) world.areas.forEach((a) => markArea(a, true)); }
window.__LMOP3D__ = {
  state,
  get world() { return world; },
  get map() { return map; },
  get region() { return region; },
  get player() { return player; },
  get combat() { return combat; },
  get playerStats() { return playerStats; },
  winCombat: () => endCombat(true),
  maps: () => mapsData.maps,
  loadMap, goTo, discoverAll, start,
  selectSite: (id) => { const s = map?.sites?.find((x) => x.id === id); if (s) updateRegionPanel(s); },
};

boot().catch(showError);
