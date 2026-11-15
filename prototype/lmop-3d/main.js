import * as THREE from './vendor/three.module.min.js';
import { buildWorld, polygonCentroid } from './world.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const canvas = $('#scene');
const state = {
  started: false,
  firstPerson: false,
  torch: true,
  currentArea: null,
  discovered: new Set(),
  klargFound: false,
  yaw: 0,
  pitch: 0.22,
  dist: 20,
  keys: new Set(),
  touch: { x: 0, y: 0, active: false },
  introT: 0,
  moving: false,
  walkPhase: 0,
  lastAreaAt: 0,
};

const MONSTER_NAMES = {
  'goblin': '哥布林', 'goblin-boss': '哥布林头目', 'wolf': '狼', 'wolf-ripper': '裂皮',
  'bugbear': '熊地精', 'skeleton': '骷髅', 'nothic': '大眼怪', 'redbrand-ruffian': '红烙印恶霸',
  'rat-familiar': '老鼠魔宠', 'iarno-albrek': '伊阿诺', 'goblin-droop': 'Droop',
};
const LIGHT_ZH = { daylight: '日光', bright: '明亮', dim: '微光', darkness: '黑暗', 'magical-darkness': '魔法黑暗' };

function monsterName(id) {
  const key = String(id).replace(/^lmop:monster:/, '').replace(/^monster-/, '');
  return MONSTER_NAMES[key] || key.replace(/-/g, ' ');
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
  const [maps, crossref, rules] = await Promise.all([
    getJSON(new URL('maps.json', dataRoot)),
    getJSON(new URL('rules-crossref.json', dataRoot)),
    getJSON(new URL('rules.json', dataRoot)),
  ]);
  const map = maps.maps.find((m) => m.id === 'map-cragmaw-hideout');
  if (!map) throw new Error('maps.json 中找不到 map-cragmaw-hideout');
  const cross = crossref.records || [];

  // ---------------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, params.get('qa') === '1' ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080706);
  scene.fog = new THREE.FogExp2(0x080706, 0.0135);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
  camera.position.set(0, 20, 40);

  scene.add(new THREE.HemisphereLight(0x9fb6c8, 0x1a120c, 1.35));
  scene.add(new THREE.AmbientLight(0x3a4a58, 0.72));
  const sun = new THREE.DirectionalLight(0xd9c7a4, 1.35);
  sun.position.set(-30, 60, 80); scene.add(sun);
  const cameraFill = new THREE.DirectionalLight(0xa9c1d4, 0.9);
  scene.add(cameraFill); scene.add(cameraFill.target);

  const world = buildWorld({ map, crossref: { records: cross }, rules });
  scene.add(world.group);

  const entranceArea = world.areas.find((a) => a.no === 1);
  if (entranceArea) {
    const light = new THREE.PointLight(0xffe1ad, 90, 130, 2);
    light.position.set(entranceArea.world.x, 18, entranceArea.world.z + 18);
    scene.add(light);
  }

  // ---------------------------------------------------------------- player
  const player = world.hero;
  const spawnNo = Number(params.get('spawn')) || 1;
  const spawnArea = world.areas.find((a) => a.no === spawnNo) || entranceArea || world.areas[0];
  if (spawnArea) {
    const c = spawnArea.world;
    const candidates = [[c.x, c.z], [c.x + 6, c.z + 6], [c.x - 6, c.z + 6], [c.x + 6, c.z - 6], [c.x - 6, c.z - 6]];
    const spot = candidates.find(([x, z]) => world.isWalkable(x, z)) || [c.x, c.z];
    player.position.set(spot[0], 0, spot[1]);
  }
  player.rotation.y = Math.PI;
  state.yaw = 0;

  // ---------------------------------------------------------------- UI
  const topbar = $('#topbar'), objective = $('#objective'), panel = $('#area-panel');
  const minimapWrap = $('#minimap-wrap'), controls = $('#controls'), toast = $('#toast');
  const modal = $('#modal');
  const mm = $('#minimap');
  const mmCtx = mm.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

  function toastMsg(text, ms = 2400) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastMsg._t);
    toastMsg._t = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function markArea(area, silent = false) {
    if (!area) return;
    state.currentArea = area;
    if (!area.discovered) {
      area.discovered = true;
      state.discovered.add(area.no);
      if (!silent) toastMsg(`发现区域 ${area.no} · ${area.name}`);
    }
    updatePanel(area);
    updateProgress();
    if (area.no === 8 && !state.klargFound) {
      state.klargFound = true;
      updateProgress();
      setTimeout(() => showEncounter(area), 420);
    }
    drawMinimap();
  }

  function updateProgress() {
    const total = world.areas.length;
    const n = state.discovered.size;
    $('#progress-fill').style.width = `${(n / total) * 100}%`;
    $('#progress-text').textContent = `${n} / ${total}`;
    $('#objective-text').textContent = state.klargFound
      ? '已找到克拉格。原型：战斗系统将在下一版接入。'
      : '沿暗溪深入，找到区域 8 的克拉格。';
  }

  function updatePanel(area) {
    if (!state.started) return;
    panel.classList.remove('hidden');
    $('#area-light').textContent = LIGHT_ZH[area.light] || area.light;
    $('#area-no').textContent = area.no;
    $('#area-name').textContent = area.name;
    $('#area-summary').textContent = area.record?.summary || area.visual || '—';
    const ruleIds = area.record?.rule_ids || [];
    const rulesById = world.rulesById;
    const tags = ruleIds.slice(0, 7).map((id) => `<span class="tag">${escapeHtml(rulesById.get(id) || id)}</span>`).join('');
    $('#area-rules').innerHTML = tags || '<span class="tag">无机械检定</span>';

    const conns = (map.connections || []).filter((c) => c.from === area.area_id || c.to === area.area_id);
    const exits = conns.map((c) => {
      const otherId = c.from === area.area_id ? c.to : c.from;
      const other = world.byId.get(otherId);
      return other ? `#${other.no} ${other.name}` : '外部';
    });
    $('#area-exits').textContent = exits.length ? [...new Set(exits)].join(' · ') : '—';

    const monsters = area.record?.monsters || [];
    const mText = monsters.length
      ? monsters.map((m) => `${monsterName(m.monster_id)}${Number(m.count) > 1 ? ' ×' + m.count : ''}`).join(' · ')
      : '—';
    $('#area-monsters').textContent = mText;
  }

  function showEncounter(area) {
    const monsters = area.record?.monsters || [];
    const list = monsters.map((m) => `${monsterName(m.monster_id)} ×${m.count}`).join('、');
    $('#modal-eyebrow').textContent = '区域 8 · 遭遇';
    $('#modal-title').textContent = '克拉格与裂皮';
    $('#modal-body').innerHTML = `
      <p>熊地精<b>克拉格</b>、宠物狼<b>裂皮</b>与两名哥布林守在火坑旁。${list ? `场景数据记录：${escapeHtml(list)}。` : ''}</p>
      <p>这是 3D 场景切片：区域触发、光照、出口、规则与怪物数据已经接通；完整战斗与存档在下一版接入。</p>`;
    $('#modal-close').textContent = '继续探索';
    modal.classList.remove('hidden');
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function drawMinimap() {
    const w = mm.width, h = mm.height;
    mmCtx.clearRect(0, 0, w, h);
    mmCtx.fillStyle = '#13100d'; mmCtx.fillRect(0, 0, w, h);
    const pad = 12;
    const scale = Math.min((w - pad * 2) / map.canvas.width, (h - pad * 2) / map.canvas.height);
    const ox = (w - map.canvas.width * scale) / 2;
    const oy = (h - map.canvas.height * scale) / 2;
    const tx = (x) => ox + x * scale;
    const ty = (y) => oy + y * scale;

    // connections
    mmCtx.strokeStyle = 'rgba(217,173,98,.22)';
    mmCtx.lineWidth = 1;
    for (const c of map.connections || []) {
      const a = world.byId.get(c.from), b = world.byId.get(c.to);
      if (!a || !b) continue;
      mmCtx.beginPath(); mmCtx.moveTo(tx(a.centroid[0]), ty(a.centroid[1])); mmCtx.lineTo(tx(b.centroid[0]), ty(b.centroid[1])); mmCtx.stroke();
    }
    // areas
    for (const a of world.areas) {
      const isCurrent = state.currentArea === a;
      mmCtx.beginPath();
      a.footprint.forEach((p, i) => { const X = tx(p[0]), Y = ty(p[1]); i ? mmCtx.lineTo(X, Y) : mmCtx.moveTo(X, Y); });
      mmCtx.closePath();
      mmCtx.fillStyle = isCurrent ? 'rgba(241,207,143,.48)' : a.discovered ? 'rgba(217,173,98,.18)' : 'rgba(120,110,95,.08)';
      mmCtx.strokeStyle = isCurrent ? '#f1cf8f' : a.discovered ? 'rgba(217,173,98,.5)' : 'rgba(217,173,98,.18)';
      mmCtx.lineWidth = isCurrent ? 1.6 : 1;
      mmCtx.fill(); mmCtx.stroke();
      mmCtx.fillStyle = a.discovered ? '#ead7b3' : 'rgba(234,215,179,.28)';
      mmCtx.font = `${a.no > 9 ? 8 : 9}px ui-sans-serif, system-ui`;
      mmCtx.textAlign = 'center'; mmCtx.textBaseline = 'middle';
      mmCtx.fillText(String(a.no), tx(a.centroid[0]), ty(a.centroid[1]));
    }
    // player
    const px = tx(player.position.x + world.bounds.cx), py = ty(player.position.z + world.bounds.cz);
    const f = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    mmCtx.save(); mmCtx.translate(px, py); mmCtx.rotate(Math.atan2(f.x, -f.z));
    mmCtx.fillStyle = '#73b9b2';
    mmCtx.beginPath(); mmCtx.moveTo(0, -6); mmCtx.lineTo(4, 5); mmCtx.lineTo(0, 2); mmCtx.lineTo(-4, 5); mmCtx.closePath(); mmCtx.fill();
    mmCtx.restore();
    // north
    mmCtx.fillStyle = 'rgba(234,215,179,.55)'; mmCtx.font = '9px serif'; mmCtx.textAlign = 'center';
    mmCtx.fillText('N', w - 12, 12);
    mmCtx.beginPath(); mmCtx.moveTo(w - 12, 15); mmCtx.lineTo(w - 9, 21); mmCtx.lineTo(w - 15, 21); mmCtx.closePath(); mmCtx.fill();
  }

  const initialArea = world.findAreaAt(player.position.x, player.position.z);
  if (initialArea) markArea(initialArea, true);

  function draw() {
    if (!state.started) return;
    const t = performance.now() / 1000;
    const e = reduceMotion ? 1 : Math.min(1, state.introT);
    const d = state.dist * (0.72 + 0.28 * e);
    if (state.firstPerson) {
      player.visible = false;
      camera.position.set(player.position.x, 5.4 + Math.sin(t * 1.5) * 0.03, player.position.z);
      const dir = new THREE.Vector3(-Math.sin(state.yaw) * Math.cos(state.pitch), -Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
      camera.lookAt(camera.position.clone().add(dir));
    } else {
      player.visible = true;
      const cosP = Math.cos(state.pitch);
      const off = new THREE.Vector3(
        Math.sin(state.yaw) * d * cosP,
        d * Math.sin(state.pitch) + 7,
        Math.cos(state.yaw) * d * cosP
      );
      const target = new THREE.Vector3(player.position.x, 4.6, player.position.z);
      const desired = target.clone().add(off);
      const dir = desired.clone().sub(target);
      let camPos = desired;
      for (let t = 1; t >= 0.45; t -= 0.05) {
        const p = target.clone().add(dir.clone().multiplyScalar(t));
        if (world.isWalkable(p.x, p.z)) { camPos = p; break; }
      }
      camera.position.lerp(camPos, 0.35);
      camera.lookAt(target);
      cameraFill.position.copy(camera.position);
      cameraFill.target.position.copy(target);
      cameraFill.target.updateMatrixWorld();
    }
  }

  function updateMovement(dt) {
    if (!state.started) return;
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
    if (!moving) {
      player.rotation.y += (0 - 0) * dt;
      return;
    }
    const speed = (state.keys.has('ShiftLeft') || state.keys.has('ShiftRight') ? 23 : 14) * (state.firstPerson ? 1 : 1);
    const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const v = forward.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize().multiplyScalar(speed * dt);
    const nx = player.position.x + v.x, nz = player.position.z + v.z;
    if (world.isWalkable(nx, nz)) {
      player.position.x = nx; player.position.z = nz;
    } else if (world.isWalkable(nx, player.position.z)) {
      player.position.x = nx;
    } else if (world.isWalkable(player.position.x, nz)) {
      player.position.z = nz;
    }
    const targetRot = Math.atan2(v.x, v.z);
    let delta = targetRot - player.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    player.rotation.y += delta * Math.min(1, dt * 12);
    state.walkPhase += dt * (speed / 8);
    player.position.y = Math.abs(Math.sin(state.walkPhase * 2)) * 0.08;

    // area trigger (throttled)
    const now = performance.now();
    if (now - state.lastAreaAt > 120) {
      state.lastAreaAt = now;
      const area = world.findAreaAt(player.position.x, player.position.z);
      if (area && area !== state.currentArea) markArea(area);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clockDelta());
    state.introT = Math.min(1, state.introT + dt * 0.7);
    updateMovement(dt);
    world.update(dt);
    draw();
    renderer.render(scene, camera);
    if (state.started) drawMinimapThrottled();
  }
  let last = performance.now();
  function clockDelta() { const n = performance.now(); const d = (n - last) / 1000; last = n; return d; }
  let lastMm = 0;
  function drawMinimapThrottled() {
    const n = performance.now();
    if (n - lastMm > 160) { lastMm = n; drawMinimap(); }
  }

  // ---------------------------------------------------------------- controls
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.started) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('dragging');
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !state.started) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    state.yaw -= dx * 0.006;
    state.pitch = Math.max(-0.08, Math.min(0.95, state.pitch + dy * 0.004));
  });
  const stopDrag = () => { dragging = false; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!state.started) return;
    e.preventDefault();
    state.dist = Math.max(12, Math.min(48, state.dist + e.deltaY * 0.02));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      state.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault();
    }
    if (e.code === 'KeyF') toggleTorch();
    if (e.code === 'KeyR') resetPlayer();
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  window.addEventListener('blur', () => state.keys.clear());

  function toggleTorch() {
    state.torch = !state.torch;
    if (world.hero.userData.light) world.hero.userData.light.visible = state.torch;
    if (world.hero.userData.flame) world.hero.userData.flame.visible = state.torch;
    $('#btn-torch').textContent = `火把 ${state.torch ? '开' : '关'}`;
    toastMsg(state.torch ? '火把已点亮' : '火把已熄灭', 1200);
  }
  function toggleView() {
    state.firstPerson = !state.firstPerson;
    $('#btn-view').textContent = state.firstPerson ? '第一人称' : '第三人称';
    toastMsg(state.firstPerson ? '第一人称视角' : '第三人称视角', 1200);
  }
  function resetPlayer() {
    const a = entranceArea || world.areas[0];
    if (!a) return;
    const c = a.world;
    const candidates = [[c.x, c.z], [c.x + 6, c.z + 6], [c.x - 6, c.z + 6], [c.x, c.z + 10]];
    const spot = candidates.find(([x, z]) => world.isWalkable(x, z)) || [c.x, c.z];
    player.position.set(spot[0], 0, spot[1]);
    state.yaw = 0; state.pitch = 0.22; state.dist = 20;
    toastMsg('已回到洞口', 1200);
  }

  $('#btn-view').addEventListener('click', toggleView);
  $('#btn-torch').addEventListener('click', toggleTorch);
  $('#btn-map').addEventListener('click', () => window.open('../../data/lmop/map-schematics/map-cragmaw-hideout.svg', '_blank'));
  $('#btn-help').addEventListener('click', () => {
    $('#modal-eyebrow').textContent = '操作';
    $('#modal-title').textContent = '在洞穴里';
    $('#modal-body').innerHTML = '<p><b>WASD / 方向键</b> 移动，<b>Shift</b> 疾走；拖动鼠标旋转视角，滚轮拉近拉远。</p><p><b>F</b> 开关火把，<b>R</b> 回到洞口。走进不同区域会读取该区域的场景摘要、光照、出口、怪物与规则。</p><p>目标：沿暗溪找到区域 8 的克拉格。手机端会出现左侧摇杆与右侧视角拖动区。</p>';
    $('#modal-close').textContent = '知道了';
    modal.classList.remove('hidden');
  });
  $('#modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  // touch
  const joystick = $('#joystick'), knob = $('#joystick-knob'), lookZone = $('#look-zone');
  if (isTouch) {
    $('#touch-ui').classList.remove('hidden');
    controls.classList.add('hidden');
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
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      e.preventDefault();
    });
    const endStick = () => { resetStick(); };
    joystick.addEventListener('pointerup', endStick); joystick.addEventListener('pointercancel', endStick);
    let lookId = null, lx = 0, ly = 0;
    lookZone.addEventListener('pointerdown', (e) => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; lookZone.setPointerCapture?.(e.pointerId); e.preventDefault(); });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      state.yaw -= (e.clientX - lx) * 0.008;
      state.pitch = Math.max(-0.08, Math.min(0.95, state.pitch + (e.clientY - ly) * 0.005));
      lx = e.clientX; ly = e.clientY; e.preventDefault();
    });
    const endLook = () => { lookId = null; };
    lookZone.addEventListener('pointerup', endLook); lookZone.addEventListener('pointercancel', endLook);
  }

  // resize
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, params.get('qa') === '1' ? 1 : 1.5));
  }
  window.addEventListener('resize', resize);

  // start
  function start() {
    if (state.started) return;
    state.started = true;
    $('#intro').classList.add('hidden');
    $('#loading').classList.add('hidden');
    topbar.classList.remove('hidden');
    objective.classList.remove('hidden');
    controls.classList.remove('hidden');
    minimapWrap.classList.remove('hidden');
    if (state.currentArea) updatePanel(state.currentArea);
    updateProgress();
    drawMinimap();
    setTimeout(() => toastMsg('WASD 移动 · 拖动视角 · 找到区域 8 的克拉格', 3200), 500);
    window.__LMOP3D_READY__ = true;
  }
  $('#btn-start').addEventListener('click', start);
  if (params.get('intro') === '0') start();
  if (params.get('view') === 'first') { state.firstPerson = true; $('#btn-view').textContent = '第一人称'; }
  if (params.get('torch') === '0') { state.torch = false; $('#btn-torch').textContent = '火把 关'; }
  if (!state.torch && world.hero.userData.light) { world.hero.userData.light.visible = false; }
  if (!state.torch && world.hero.userData.flame) { world.hero.userData.flame.visible = false; }

  // debug hooks for QA / screenshots
  window.__LMOP3D__ = {
    state, world, scene, camera, renderer, player,
    discoverAll() { world.areas.forEach((a) => markArea(a, true)); },
    goTo(no) { const a = world.areas.find((x) => x.no === Number(no)); if (a) { player.position.set(a.world.x, 0, a.world.z); markArea(a); } },
    start,
  };

  $('#loading').classList.add('hidden');
  if (params.get('intro') === '0') {
    // scene is ready; start already called
  }
  animate();
}

boot().catch(showError);
