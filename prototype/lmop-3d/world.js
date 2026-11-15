import * as THREE from './vendor/three.module.min.js';

/* ------------------------------------------------------------------ utils */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261115);
const rand = (a, b) => a + (b - a) * rng();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

export function polygonCentroid(poly) {
  let x = 0, y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* ------------------------------------------------------------------ palette */
const LIGHT_COLORS = {
  daylight: [0x77835a, 0x8c7b5a, 0x6c7d57],
  dim: [0x5d4c3a, 0x67523f, 0x584838],
  darkness: [0x41382f, 0x4a3d32, 0x39322b],
  bright: [0x8f8b62, 0x9a8760, 0x877d58],
};
const WATER = {
  'map-cragmaw-hideout': {
    width: 13,
    points: [[214, 54], [198, 50], [176, 48], [161, 60], [151, 83], [142, 104], [128, 128], [101, 149], [80, 164], [70, 170]],
    waterfall: { x: 216, y: 44, w: 18, h: 26 },
    branch: { width: 9, points: [[86, 100], [91, 116], [101, 132], [111, 146], [108, 160]] },
  },
  'map-redbrand-hideout': {
    planes: [{ x: 236, y: 100, w: 32, h: 88 }],
  },
  'map-wave-echo-cave': {
    planes: [
      { x: 122, y: 222, w: 36, h: 74 },
      { x: 402, y: 52, w: 96, h: 124 },
      { x: 154, y: 360, w: 40, h: 30 },
    ],
  },
};
const BRIDGE = {
  'map-cragmaw-hideout': [{ from: [145, 48], to: [191, 48], width: 8, planks: 14, height: 0.18 }],
  'map-redbrand-hideout': [
    { from: [74, 104], to: [111, 104], width: 5, planks: 10, height: 0.18 },
    { from: [74, 150], to: [111, 150], width: 5, planks: 10, height: 0.18 },
  ],
};
const OUTDOOR = new Set(['battlemap', 'site', 'town']);

/* ------------------------------------------------------------------ materials */
function canvasTexture(draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeFloorTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#8a7b64'; ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rng() - 0.5) * 26;
      img.data[i] += n; img.data[i + 1] += n * 0.9; img.data[i + 2] += n * 0.8;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(30,24,18,.22)'; ctx.lineWidth = 1;
    for (let i = 0; i <= s; i += s / 2) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
  }, 128);
}
function makeWaterTexture() {
  return canvasTexture((ctx, s) => {
    ctx.fillStyle = '#2b6d74'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(190,235,230,${0.04 + rng() * 0.08})`;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      const y = rng() * s;
      for (let x = 0; x <= s; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + i) * 3);
      ctx.stroke();
    }
  }, 128);
}
function makeWaterfallTexture() {
  return canvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, 'rgba(210,245,245,.85)');
    g.addColorStop(0.55, 'rgba(160,220,225,.45)');
    g.addColorStop(1, 'rgba(90,160,170,.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(240,255,255,${0.05 + rng() * 0.14})`;
      ctx.lineWidth = 1 + rng() * 2;
      const x = rng() * s;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rand(-6, 6), s); ctx.stroke();
    }
  }, 128);
}
export function makeLabelTexture(text, accent = '#f1cf8f') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '600 34px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 12;
  ctx.fillStyle = accent;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ builders */
function makeFloor(area, idx, cx, cz, texture) {
  const shape = new THREE.Shape();
  const pts = area.footprint;
  shape.moveTo(pts[0][0] - cx, -(pts[0][1] - cz));
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0] - cx, -(pts[i][1] - cz));
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const colors = LIGHT_COLORS[area.light] || LIGHT_COLORS.dim;
  const color = colors[idx % colors.length];
  const mat = new THREE.MeshStandardMaterial({
    color, map: texture.clone(), roughness: 0.98, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  mat.map.needsUpdate = true;
  mat.map.repeat.set(0.1, 0.1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02 + idx * 0.002;
  mesh.name = `floor-${area.no}`;
  return mesh;
}
function makeEdge(area, cx, cz) {
  const pts = area.footprint.map((p) => new THREE.Vector3(p[0] - cx, 0.09, p[1] - cz));
  const geo = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1b1410, transparent: true, opacity: 0.55 }));
  return line;
}
function makeWater(map, cx, cz) {
  const cfg = WATER[map.id];
  if (!cfg) return null;
  const group = new THREE.Group();
  const tex = makeWaterTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2f747b, map: tex, transparent: true, opacity: 0.78,
    roughness: 0.18, metalness: 0.15, side: THREE.DoubleSide,
    emissive: 0x0b2e33, emissiveIntensity: 0.6,
  });
  if (cfg.planes) {
    for (const p of cfg.planes) {
      const geo = new THREE.PlaneGeometry(p.w, p.h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(p.x + p.w / 2 - cx, 0.12, p.y + p.h / 2 - cz);
      mesh.renderOrder = 2;
      group.add(mesh);
    }
    group.userData.tex = tex;
    return group;
  }
  function ribbon(pts, width) {
  const verts = [], uvs = [], idx = [];
  let acc = 0;
  const w = width / 2;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    const nx = -ty, ny = tx;
    if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    verts.push(p[0] - cx + nx * w, 0.13, p[1] - cz + ny * w);
    verts.push(p[0] - cx - nx * w, 0.13, p[1] - cz - ny * w);
    uvs.push(0, acc / 18, 1, acc / 18);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return mesh;
  }
  const mainMesh = ribbon(cfg.points, cfg.width);
  group.add(mainMesh);
  if (cfg.branch) group.add(ribbon(cfg.branch.points, cfg.branch.width));
  // waterfall
  if (cfg.waterfall) {
    const f = cfg.waterfall;
    const fgeo = new THREE.PlaneGeometry(f.w, f.h, 1, 1);
    const fmat = new THREE.MeshBasicMaterial({
      map: makeWaterfallTexture(), transparent: true, opacity: 0.7,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const fall = new THREE.Mesh(fgeo, fmat);
    fall.position.set(f.x - cx, f.h / 2 + 0.5, f.y - cz);
    fall.rotation.y = Math.PI / 2.6;
    group.add(fall);
    group.userData.waterfall = fall;
    const pl = new THREE.PointLight(0x8fe8e8, 10, 45, 2);
    pl.position.set(f.x - cx, f.h / 2, f.y - cz);
    group.add(pl);
  }
  group.userData.water = mainMesh;
  group.userData.tex = tex;
  return group;
}
function makeBridge(cfgs, cx, cz) {
  if (!cfgs || !cfgs.length) return null;
  const group = new THREE.Group();
  for (const cfg of cfgs) {
    group.add(makeOneBridge(cfg, cx, cz));
  }
  return group;
}
function makeOneBridge(cfg, cx, cz) {
  const group = new THREE.Group();
  const a = new THREE.Vector3(cfg.from[0] - cx, 0, cfg.from[1] - cz);
  const b = new THREE.Vector3(cfg.to[0] - cx, 0, cfg.to[1] - cz);
  const dir = b.clone().sub(a); const len = dir.length(); dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4b2c, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3d2a19, roughness: 1 });
  for (let i = 0; i < cfg.planks; i++) {
    const t = (i + 0.5) / cfg.planks;
    const p = a.clone().lerp(b, t);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(cfg.width, 0.22, len / cfg.planks * 0.82), wood);
    plank.position.copy(p); plank.position.y = cfg.height;
    plank.rotation.y = Math.atan2(dir.x, dir.z);
    group.add(plank);
  }
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6), dark);
    rail.position.copy(a).lerp(b, 0.5).add(side.clone().multiplyScalar(s * (cfg.width / 2 - 0.2)));
    rail.position.y = cfg.height + 1.5;
    rail.rotation.z = Math.PI / 2; rail.rotation.y = Math.atan2(dir.x, dir.z);
    group.add(rail);
  }
  for (const s of [-1, 1]) for (const t of [0.1, 0.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3, 6), dark);
    post.position.copy(a.clone().lerp(b, t)).add(side.clone().multiplyScalar(s * (cfg.width / 2 - 0.2)));
    post.position.y = cfg.height + 1.4;
    group.add(post);
  }
  group.userData.center = a.clone().lerp(b, 0.5);
  return group;
}

/* ------------------------------------------------------------------ props */
function addFire(group, x, z, scale = 1, withLight = false) {
  const stones = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2b241e, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4, 0.8) * scale, 0), stoneMat);
    const a = (i / 7) * Math.PI * 2;
    s.position.set(x + Math.cos(a) * 1.9 * scale, 0.35, z + Math.sin(a) * 1.9 * scale);
    s.scale.y = 0.6; stones.add(s);
  }
  const coal = new THREE.Mesh(new THREE.SphereGeometry(1.15 * scale, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  coal.position.set(x, 0.35, z); coal.scale.y = 0.35; stones.add(coal);
  const flameTex = makeFireTexture();
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffb15a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(x, 2.2 * scale, z); flame.scale.set(1.8 * scale, 3.2 * scale, 1); stones.add(flame);
  if (withLight) {
    const light = new THREE.PointLight(0xff7a2a, 30, 55, 2);
    light.position.set(x, 3.2, z); stones.add(light);
    stones.userData.light = light;
  }
  stones.userData.flame = flame;
  stones.userData.kind = 'fire';
  group.add(stones);
  return stones;
}
function makeFireTexture() {
  return canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s / 2, s * 0.65, 2, s / 2, s * 0.55, s * 0.6);
    g.addColorStop(0, 'rgba(255,245,200,1)');
    g.addColorStop(0.25, 'rgba(255,170,75,.95)');
    g.addColorStop(0.6, 'rgba(220,90,30,.35)');
    g.addColorStop(1, 'rgba(220,60,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }, 128);
}
function makeBarrel(x, z, scale = 1) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.95 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x38332d, roughness: 0.8, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * scale, 0.95 * scale, 2.5 * scale, 10), wood);
  body.position.set(x, 1.25 * scale, z); g.add(body);
  for (const y of [0.55, 1.95]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02 * scale, 0.07, 4, 10), iron);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y * scale, z); g.add(ring);
  }
  return g;
}
function makeCrate(x, z, scale = 1) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a5936, roughness: 0.95 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 2.1 * scale, 2.1 * scale), mat);
  m.position.set(x, 1.05 * scale, z); m.rotation.y = rand(-0.2, 0.2);
  return m;
}
function makeTable(x, z, w = 7, d = 3) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), wood); top.position.set(x, 3, z); g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), wood);
    leg.position.set(x + sx * (w / 2 - 0.5), 1.5, z + sz * (d / 2 - 0.5)); g.add(leg);
  }
  return g;
}
function makeBed(x, z, rot = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4e4233, roughness: 1 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 6), mat);
  bed.position.set(x, 0.45, z); g.add(bed);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x8b7a5c, roughness: 1 }));
  pillow.position.set(x, 0.8, z - 2.1); g.add(pillow);
  return g;
}
function makeStalagmite(x, z, h = 5) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(rand(0.7, 1.6), h, 7), new THREE.MeshStandardMaterial({ color: 0x4a4037, roughness: 1 }));
  m.position.set(x, h / 2, z); return m;
}
function makeRock(x, z, s = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.8, 2) * s, 0), new THREE.MeshStandardMaterial({ color: 0x3b332b, roughness: 1 }));
  m.position.set(x, rand(0.4, 0.9) * s, z); m.scale.y = rand(0.5, 1.1); return m;
}
function makeBones(x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcfc3a8, roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, rand(1, 2.2), 5), mat);
    b.position.set(x + rand(-1.6, 1.6), 0.2, z + rand(-1.6, 1.6));
    b.rotation.z = rand(0, Math.PI); b.rotation.y = rand(0, Math.PI); g.add(b);
  }
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), mat);
  skull.position.set(x + 0.6, 0.4, z + 0.4); g.add(skull);
  return g;
}
function makeChest(x, z) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9ad62, metalness: 0.7, roughness: 0.35, emissive: 0x5a3a10, emissiveIntensity: 0.4 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.2), wood); box.position.set(x, 0.9, z); g.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 2.3), wood); lid.position.set(x, 1.95, z); g.add(lid);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.9, 2.3), gold); band.position.set(x, 0.95, z); g.add(band);
  return g;
}
function makeRack(x, z, rot = 0) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4c3523, roughness: 0.95 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x6a6a66, metalness: 0.6, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4, 0.25), wood); post.position.set(x + s * 3, 2, z); g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 0.18), wood); bar.position.set(x, 3.6, z); g.add(bar);
  for (let i = 0; i < 5; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.35), iron);
    w.position.set(x - 2.3 + i * 1.15, 2.2, z); w.rotation.z = i % 2 ? 0.06 : -0.05; g.add(w);
  }
  return g;
}
function makeAltar(x, z) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2.6), stone); base.position.set(x, 1, z); g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0x2a1515, roughness: 1 }));
  top.position.set(x, 2.15, z); g.add(top);
  return g;
}
function makeStatue(x, z) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f564a, roughness: 1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 3.4), stone); base.position.set(x, 0.6, z); g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 5, 8), stone); body.position.set(x, 3.6, z); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), stone); head.position.set(x, 6.7, z); g.add(head);
  return g;
}
function makeSacks(x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a583d, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(0.35, 0.58), 7, 5), mat);
    s.position.set(x + rand(-1.1, 1.1), rand(0.35, 0.55), z + rand(-1.0, 1.0)); s.scale.y = 1.2; g.add(s);
  }
  return g;
}


function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.42 * scale, 4 * scale, 6), new THREE.MeshStandardMaterial({ color: 0x4b3624, roughness: 1 }));
  trunk.position.set(x, 2 * scale, z); g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2e4628, roughness: 1, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((2.6 - i * 0.5) * scale, 3.4 * scale, 7), leaf);
    c.position.set(x, (4.2 + i * 1.7) * scale, z); g.add(c);
  }
  return g;
}
function makeCart(x, z, rot = 0) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3f27, roughness: 1 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 3.2), wood); bed.position.set(x, 1.6, z); g.add(bed);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.2, 0.25), wood); side.position.set(x, 2.2, z + s * 1.5); g.add(side);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.18, 5, 10), wood); wheel.position.set(x + s * 2.4, 1.1, z - 1.8); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  }
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.2), wood); shaft.position.set(x, 1.5, z + 3); g.add(shaft);
  g.rotation.y = rot; return g;
}
function makeHorse(x, z, dead = false) {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: dead ? 0x4a3a2a : 0x6a4b32, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 2.6, 3, 7), coat);
  body.rotation.z = Math.PI / 2; body.position.set(x, dead ? 0.7 : 2, z); g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.3, 2, 6), coat);
  neck.position.set(x, dead ? 1 : 2.8, z + 1.5); neck.rotation.x = dead ? 1.1 : 0.5; g.add(neck);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 2, 6), coat);
  head.position.set(x, dead ? 0.6 : 3.5, z + 2.2); head.rotation.x = 1.2; g.add(head);
  if (!dead) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 5), coat);
    leg.position.set(x + sx * 0.5, 1, z + sz * 1.1); g.add(leg);
  }
  return g;
}
function makeWell(x, z) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x655d50, roughness: 1 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 1.2, 12), stone); ring.position.set(x, 0.6, z); g.add(ring);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.7, 12), new THREE.MeshBasicMaterial({ color: 0x1a3038 })); water.rotation.x = -Math.PI / 2; water.position.set(x, 1.05, z); g.add(water);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a3420 })); post.position.set(x + s * 1.7, 2, z); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x4b3624 })); roof.position.set(x, 4.3, z); roof.rotation.y = Math.PI / 4; g.add(roof);
  return g;
}
function makeBoard(x, z, rot = 0) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b422a, roughness: 1 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4, 5), wood); post.position.set(x, 2, z); g.add(post);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2, 0.16), new THREE.MeshStandardMaterial({ color: 0x8a7450, roughness: 1 })); panel.position.set(x, 3.6, z); panel.rotation.y = rot; g.add(panel);
  return g;
}
function makeField(x, z, w = 20, d = 14) {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 1 })); soil.position.set(x, 0.07, z); g.add(soil);
  const crop = new THREE.MeshStandardMaterial({ color: 0x687d3b, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 4), crop);
    c.position.set(x + rand(-w / 2 + 1, w / 2 - 1), 0.6, z + rand(-d / 2 + 1, d / 2 - 1)); g.add(c);
  }
  return g;
}
function makeStall(x, z, rot = 0) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7a3f2e, roughness: 1 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 2), wood); table.position.set(x, 0.9, z); g.add(table);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), wood); post.position.set(x + s * 2, 1.6, z - 0.8); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 2.8), cloth); roof.position.set(x, 3.3, z - 0.8); roof.rotation.x = -0.15; g.add(roof);
  g.rotation.y = rot; return g;
}

/* ------------------------------------------------------------------ actors */
function makeGoblin(scale = 1) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x5b7a45, roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x3d2f22, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.4, 3, 6), cloth); body.position.y = 1.8; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 7, 5), skin); head.position.y = 3.35; g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.2, 4), skin);
    ear.position.set(s * 0.8, 3.45, 0.05); ear.rotation.z = s * 0.9; g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd26a }));
    eye.position.set(s * 0.28, 3.45, 0.72); g.add(eye);
  }
  const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.6, roughness: 0.4 }));
  dagger.position.set(0.9, 1.8, 0.25); dagger.rotation.z = 0.5; g.add(dagger);
  g.scale.setScalar(scale);
  g.userData = { kind: 'goblin', phase: rand(0, 6.28) };
  return g;
}
function makeWolf(scale = 1) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x57514a, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 2.2, 3, 6), fur);
  body.rotation.z = Math.PI / 2; body.position.y = 1.3; g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 6), fur); head.rotation.x = Math.PI / 2; head.position.set(0, 1.45, 1.8); g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 4), fur); ear.position.set(s * 0.35, 1.85, 1.65); g.add(ear);
    for (const f of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 0.25), fur);
      leg.position.set(s * 0.42, 0.55, f * 0.8); g.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.6, 4), fur); tail.position.set(0, 1.45, -1.8); tail.rotation.x = -1.2; g.add(tail);
  g.scale.setScalar(scale);
  g.userData = { kind: 'wolf', phase: rand(0, 6.28) };
  return g;
}
function makeBugbear(scale = 1) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2e231b, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 2.6, 3, 7), leather); body.position.y = 2.6; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 7, 5), fur); head.position.y = 4.8; g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 4), fur); ear.position.set(s * 2.5, 5, 0); ear.rotation.z = s * 1.0; g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffb34d }));
    eye.position.set(s * 0.35, 4.9, 0.9); g.add(eye);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 2.2, 2, 5), fur); arm.position.set(s * 1.35, 2.8, 0.2); arm.rotation.z = s * 0.3; g.add(arm);
  }
  const club = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 4.6, 6), new THREE.MeshStandardMaterial({ color: 0x4b3624, roughness: 1 }));
  club.position.set(1.9, 2.8, 0.7); club.rotation.z = -0.5; g.add(club);
  g.scale.setScalar(scale);
  g.userData = { kind: 'bugbear', phase: rand(0, 6.28) };
  return g;
}

function makeHumanoid({ color = 0x3d2f22, skin = 0x8a7a62, scale = 1, tall = 1, glowingEyes = false } = {}) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const flesh = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.75 * tall, 1.8 * tall, 3, 7), cloth); body.position.y = 2.3 * tall; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7 * tall, 7, 5), flesh); head.position.y = 4.1 * tall; g.add(head);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18 * tall, 1.3 * tall, 2, 5), flesh); arm.position.set(s * 0.85 * tall, 2.5 * tall, 0.05); arm.rotation.z = s * 0.1; g.add(arm);
    if (glowingEyes) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffc46a })); eye.position.set(s * 0.24 * tall, 4.2 * tall, 0.6 * tall); g.add(eye);
    }
  }
  g.scale.setScalar(scale);
  return g;
}
function makeSpider(scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0x221d1a, roughness: 0.6 })); body.position.y = 1.3; g.add(body);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 3.2, 4), legMat);
    leg.position.set(Math.cos(a) * 1.2, 1.1, Math.sin(a) * 1.2);
    leg.rotation.z = Math.PI / 2.6; leg.rotation.y = -a; g.add(leg);
  }
  g.scale.setScalar(scale); return g;
}
function makeDragon(scale = 1) {
  const g = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x3f6b36, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a4a28, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.8, 4.4, 3, 8), green); body.rotation.z = Math.PI / 2; body.position.y = 3; g.add(body);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 3, 2, 7), green); neck.position.set(0, 4.2, 3.2); neck.rotation.x = 0.6; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 7, 5), green); head.position.set(0, 5.8, 4.6); g.add(head);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(3.4, 7, 4), dark); wing.position.set(s * 2.8, 4.2, -0.5); wing.rotation.z = s * -1.15; wing.scale.z = 0.18; g.add(wing);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd36e })); eye.position.set(s * 0.5, 6.1, 5.2); g.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 5, 6), green); tail.position.set(0, 2.6, -4.4); tail.rotation.x = -1.1; g.add(tail);
  g.scale.setScalar(scale); return g;
}
function makeTwig(scale = 1) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3a26, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.6, 2, 5), wood); body.position.y = 1.5; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), wood); head.position.y = 2.9; g.add(head);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.3, 3), wood);
    branch.position.set(s * (0.5 + i * 0.18), 1.5 + i * 0.3, 0); branch.rotation.z = s * (0.8 + i * 0.2); g.add(branch);
  }
  g.scale.setScalar(scale); return g;
}
function makeStirge(scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), new THREE.MeshStandardMaterial({ color: 0x5a2a22, roughness: 0.8 })); body.position.y = 2; g.add(body);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3), new THREE.MeshStandardMaterial({ color: 0x3a1c18, side: THREE.DoubleSide })); wing.position.set(s * 0.5, 2.2, 0); wing.rotation.z = s * -1.2; g.add(wing);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x2a1a14 })); beak.position.set(0, 1.9, 0.45); beak.rotation.x = Math.PI / 2; g.add(beak);
  g.scale.setScalar(scale); return g;
}
function makeOwlbear(scale = 1) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x5d4a32, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 2.6, 3, 7), fur); body.position.y = 2.4; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), fur); head.position.set(0, 4.2, 0.7); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.7 })); beak.position.set(0, 4.1, 1.7); beak.rotation.x = Math.PI / 2; g.add(beak);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 4), fur); ear.position.set(s * 0.65, 5.1, 0.6); g.add(ear);
    const claw = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.2, 2, 5), fur); claw.position.set(s * 1.1, 1.2, 0.4); g.add(claw);
  }
  g.scale.setScalar(scale); return g;
}
function makeMonster(id, scale = 1) {
  const key = String(id).toLowerCase();
  if (key.includes('dragon')) return makeDragon(scale * 1.5);
  if (key.includes('owl')) return makeOwlbear(scale * 1.2);
  if (key.includes('spider')) return makeSpider(scale);
  if (key.includes('twig')) return makeTwig(scale);
  if (key.includes('stirge')) return makeStirge(scale * 1.4);
  if (key.includes('wolf')) return makeWolf(scale);
  if (key.includes('bugbear')) return makeBugbear(scale * 1.15);
  if (key.includes('skeleton')) return makeHumanoid({ color: 0x8a8172, skin: 0xcfc3a8, scale, tall: 0.95, glowingEyes: true });
  if (key.includes('zombie')) return makeHumanoid({ color: 0x3d4a32, skin: 0x7a8a62, scale, tall: 1, glowingEyes: true });
  if (key.includes('ghoul')) return makeHumanoid({ color: 0x4a3f36, skin: 0xa89a82, scale, tall: 0.95, glowingEyes: true });
  if (key.includes('goblin')) return makeGoblin(scale);
  if (key.includes('nezznar') || key.includes('iarno') || key.includes('mage') || key.includes('doppelganger')) return makeHumanoid({ color: 0x2a2230, skin: 0x6a5a6a, scale, tall: 1.05, glowingEyes: true });
  return makeHumanoid({ color: 0x3d2f22, skin: 0xa8845f, scale, tall: 1, glowingEyes: false });
}

function makeHero() {
  const g = new THREE.Group();
  const cloak = new THREE.MeshStandardMaterial({ color: 0x4b3224, roughness: 0.95 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2b3a31, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc49a70, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9da2a0, metalness: 0.7, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.9, 3, 8), cloth); body.position.y = 2.5; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 9, 7), skin); head.position.y = 4.5; g.add(head);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.7, 8), cloak); hood.position.y = 4.65; g.add(hood);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.7, 8, 1, true), cloak); cape.position.y = 2.2; g.add(cape);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.4, 2, 5), cloth);
    leg.position.set(s * 0.4, 0.85, 0); g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 1.2, 2, 5), cloth);
    arm.position.set(s * 0.95, 2.5, 0.1); arm.rotation.z = s * 0.15; g.add(arm);
  }
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.32), steel);
  sword.position.set(1.1, 2.2, 0.2); sword.rotation.z = 0.2; g.add(sword);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }));
  hilt.position.set(1.05, 3.8, 0.2); g.add(hilt);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x4c3523 }));
  torch.position.set(-1.05, 2.9, 0.25); torch.rotation.z = 0.25; g.add(torch);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeFireTexture(), color: 0xffb15a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(-1.2, 4.0, 0.3); flame.scale.set(1.1, 1.7, 1); g.add(flame);
  const light = new THREE.PointLight(0xff9a4a, 1.8, 30, 2);
  light.position.set(-1.2, 4.0, 0.3); g.add(light);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; g.add(shadow);
  g.userData = { kind: 'hero', flame, light, shadow, legL: g.children[5], legR: g.children[6] };
  return g;
}


function makeWalls(map, areas, cx, cz) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: map.kind === 'town' ? 0x6b5540 : map.kind === 'site' ? 0x564736 : 0x3a3027, roughness: 1, flatShading: true, emissive: 0x0b0907, emissiveIntensity: 0.5 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: map.kind === 'town' ? 0x7a6248 : 0x4a3d30, roughness: 1, flatShading: true, emissive: 0x0b0907, emissiveIntensity: 0.45 });
  const connSegs = (map.connections || []).map((c) => {
    const a = areas.find((x) => x.area_id === c.from), b = areas.find((x) => x.area_id === c.to);
    return a && b ? [a.centroid, b.centroid, c.type, c.width_ft || 5] : null;
  }).filter(Boolean);
  for (const area of areas) {
    const pts = area.footprint;
    const maxH = map.kind === 'town' ? 10 : map.kind === 'site' ? 8 : 16;
    const h = Math.min(maxH, Math.max(6, area.ceiling_ft || maxH)) * rand(0.82, 1.02);
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
      const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
      const len = Math.hypot(dx, dz);
      if (len < 3) continue;
      const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      // skip edges shared with another area
      let shared = false;
      for (const other of areas) {
        if (other === area) continue;
        if (pointInPolygon(mid[0], mid[1], other.footprint)) { shared = true; break; }
        if (pointInPolygon(mid[0] + 1, mid[1], other.footprint) || pointInPolygon(mid[0] - 1, mid[1], other.footprint)) { shared = true; break; }
      }
      if (shared) continue;
      // skip near a connection (doorway)
      let doorway = false;
      for (const [a, b] of connSegs) {
        if (distToSegment(mid[0], mid[1], a[0], a[1], b[0], b[1]) < 9) { doorway = true; break; }
      }
      if (doorway) continue;
      const geo = new THREE.BoxGeometry(len + 1, h, 1.4);
      const wall = new THREE.Mesh(geo, i % 3 === 0 ? edgeMat : wallMat);
      wall.position.set(mid[0] - cx, h / 2, mid[1] - cz);
      wall.rotation.y = Math.atan2(-dz, dx);
      group.add(wall);
      // rocky top
      if (rng() < 0.55) {
        const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.2, 3), 0), wallMat);
        cap.position.set(mid[0] - cx, h + rand(-0.4, 1.2), mid[1] - cz);
        cap.scale.y = rand(0.4, 0.8); group.add(cap);
      }
    }
  }
  // door / passage frames
  if (map.kind === 'dungeon') for (const c of map.connections || []) {
    if (!['door','gate','stairs','stone_steps','main_passage','tunnel','mine_tunnel','double_door','corridor','curtain'].includes(c.type)) continue;
    const a = areas.find((x) => x.area_id === c.from), b = areas.find((x) => x.area_id === c.to);
    if (!a || !b) continue;
    const w = c.type === 'double_door' ? 12 : c.type === 'curtain' ? 9 : 6;
    const mx = (a.centroid[0] + b.centroid[0]) / 2, mz = (a.centroid[1] + b.centroid[1]) / 2;
    const ang = Math.atan2(b.centroid[1] - a.centroid[1], b.centroid[0] - a.centroid[0]);
    const px = Math.cos(ang), pz = Math.sin(ang);
    const nx = -pz, nz = px;
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 10, 6), wallMat);
      post.position.set(mx - cx + nx * s * w / 2, 5, mz - cz + nz * s * w / 2);
      group.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 1.2, 1.6), edgeMat);
    lintel.position.set(mx - cx, 10, mz - cz); lintel.rotation.y = Math.atan2(-nz, nx);
    group.add(lintel);
  }
  return group;
}
function makeBush(x, z, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f3f26, roughness: 1, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.9, 1.8) * scale, 0), mat);
    b.position.set(x + rand(-1.5, 1.5) * scale, rand(0.5, 1.5) * scale, z + rand(-1.5, 1.5) * scale);
    b.scale.y = rand(0.6, 1); g.add(b);
  }
  return g;
}


function makeCaveMouth(cx, cz) {
  const g = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color: 0x3b3229, roughness: 1, flatShading: true, emissive: 0x0a0806, emissiveIntensity: 0.6 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.DoubleSide });
  const x = 86 - cx, z = 99 - cz;
  // dark opening
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), dark);
  hole.position.set(x, 6, z + 3.2); g.add(hole);
  // pillars / arch
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(7, 0), rock);
    p.position.set(x + s * 8.6, 4.5, z + 1); p.scale.set(0.72, 1.35, 0.9); p.rotation.y = rand(0, 6); g.add(p);
    const p2 = new THREE.Mesh(new THREE.DodecahedronGeometry(4.5, 0), rock);
    p2.position.set(x + s * 7.6, 10.8, z + 1); p2.scale.set(1.0, 0.7, 0.9); g.add(p2);
  }
  const lintel = new THREE.Mesh(new THREE.DodecahedronGeometry(8, 0), rock);
  lintel.position.set(x, 12.6, z + 1); lintel.scale.set(1.15, 0.5, 0.6); g.add(lintel);
  // path
  const path = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 34), new THREE.MeshStandardMaterial({ color: 0x4a3a29, roughness: 1 }));
  path.position.set(x, 0.06, z + 22); g.add(path);
  // torches
  for (const s of [-1, 1]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1c }));
    stick.position.set(x + s * 6.2, 2.5, z + 7); g.add(stick);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeFireTexture(), color: 0xffb15a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.set(x + s * 6.2, 5.4, z + 7); flame.scale.set(1.4, 2.2, 1); g.add(flame);
    g.userData.torches = g.userData.torches || [];
    g.userData.torches.push({ flame, phase: rand(0, 9) });
  }
  return g;
}


function makeRoof(area, cx, cz, map) {
  const shape = new THREE.Shape();
  const pts = area.footprint;
  shape.moveTo(pts[0][0] - cx, -(pts[0][1] - cz));
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0] - cx, -(pts[i][1] - cz));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: map.kind === 'town' ? 0x6a3e28 : 0x4a2f22, roughness: 0.95 }));
  mesh.position.y = 8.6;
  return mesh;
}

/* ------------------------------------------------------------------ build */
export function buildWorld({ map, crossref, rules, spawnNo = 1 }) {
  const group = new THREE.Group();
  const cx = map.canvas.width / 2;
  const cz = map.canvas.height / 2;
  const areas = [];
  const byId = new Map();
  const floorTex = makeFloorTexture();
  const rulesById = new Map((rules?.rules || []).map((r) => [r.id, r.title]));
  const crById = new Map((crossref?.records || []).map((r) => [r.record_id, r]));
  const outdoor = OUTDOOR.has(map.kind);

  // cave shell / outdoor ground
  const radius = Math.max(map.canvas.width, map.canvas.height) * 0.72;
  if (!outdoor) {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.04, 92, 40, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 1, side: THREE.BackSide })
    );
    shell.position.y = 45; group.add(shell);
    const ceiling = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 1, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 44; group.add(ceiling);
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(map.canvas.width * 2, map.canvas.height * 2),
      new THREE.MeshStandardMaterial({ color: 0x070605, roughness: 1 })
    );
    voidPlane.rotation.x = -Math.PI / 2; voidPlane.position.y = -0.7; group.add(voidPlane);
  } else {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(map.canvas.width * 2.2, map.canvas.height * 2.2),
      new THREE.MeshStandardMaterial({ color: map.kind === 'battlemap' ? 0x4b462f : 0x3f4a2f, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; group.add(ground);
  }

  if (map.kind !== 'battlemap') group.add(makeWalls(map, map.areas.map((a) => ({ ...a, centroid: polygonCentroid(a.footprint) })), cx, cz));
  if (map.id === 'map-cragmaw-hideout') { const mouth = makeCaveMouth(cx, cz); group.add(mouth); group.userData.caveMouth = mouth; }

  // floors + edges + labels
  map.areas.forEach((a, i) => {
    const floor = makeFloor(a, i, cx, cz, floorTex);
    group.add(floor);
    group.add(makeEdge(a, cx, cz));
    const centroid = polygonCentroid(a.footprint);
    const rec = crById.get(a.area_id);
    const area = {
      ...a,
      index: i,
      centroid,
      world: new THREE.Vector3(centroid[0] - cx, 0, centroid[1] - cz),
      record: rec,
      discovered: false,
      floor,
      label: null,
    };
    const labelTex = makeLabelTexture(`${a.no} · ${a.name}`, a.light === 'darkness' ? '#e8cf9f' : '#f1d79e');
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
    label.position.set(area.world.x, 7.2, area.world.z);
    label.scale.set(10, 2.5, 1);
    label.renderOrder = 5;
    group.add(label);
    area.label = label;
    areas.push(area);
    byId.set(a.area_id, area);
  });

  if (map.kind === 'town') {
    for (const area of areas) {
      if (/绿地|果园|农田|广场|小径|林地/.test(area.name)) continue;
      if ((area.ceiling_ft || 0) < 10) continue;
      group.add(makeRoof(area, cx, cz, map));
    }
  }

  // water + bridge
  const water = makeWater(map, cx, cz);
  if (water) group.add(water);
  const bridge = makeBridge(BRIDGE[map.id], cx, cz);
  if (bridge) group.add(bridge);

  // rocks / trees around the shell
  if (!outdoor) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand(-0.1, 0.1);
      const r = radius * rand(0.86, 0.98);
      const rock = makeRock(Math.cos(a) * r, Math.sin(a) * r, rand(1.2, 3.6));
      rock.position.y = rand(2, 10); group.add(rock);
    }
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2); const r = rand(radius * 0.35, radius * 0.8);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!pointInAny(x + cx, z + cz, map.areas)) continue;
      if (rand() < 0.5) group.add(makeStalagmite(x, z, rand(2, 7)));
      else group.add(makeRock(x, z, rand(0.4, 1.1)));
    }
  } else {
    for (let i = 0; i < 34; i++) {
      const a = rand(0, Math.PI * 2); const r = rand(radius * 0.72, radius * 1.02);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (pointInAny(x + cx, z + cz, map.areas)) continue;
      group.add(rand() < 0.65 ? makeTree(x, z, rand(0.7, 1.4)) : makeBush(x, z, rand(0.8, 1.6)));
    }
  }

  // props
  const props = [];
  for (const area of areas) {
    const list = Array.isArray(area.props) ? area.props : [];
    const spots = [];
    const radiusA = Math.min(28, Math.max(8, Math.sqrt(area.footprint.reduce((s, p) => s + Math.abs(p[0] - area.centroid[0]), 0) / area.footprint.length) * 0.55));
    for (let i = 0; i < Math.min(7, list.length); i++) {
      const angle = (i / Math.min(7, list.length)) * Math.PI * 2 + rand(-0.4, 0.4);
      const r = radiusA * rand(0.55, 1.0);
      let p = [area.world.x + Math.cos(angle) * r, area.world.z + Math.sin(angle) * r];
      if (area.no === 1 && /灌木|荆棘|树丛/.test(list[i])) p = [area.world.x + rand(-22, 22), area.world.z + rand(5, 18)];
      if (area.no === 8) p = [area.world.x + (p[0] - area.world.x) * 1.35, area.world.z + (p[1] - area.world.z) * 1.35];
      const label = list[i];
      spots.push({ label, x: p[0], z: p[1] });
    }
    for (const spot of spots) {
      const { label, x, z } = spot;
      let obj = null;
      if (/火坑|煤炭|火盆/.test(label)) obj = addFire(group, x, z, rand(0.8, 1.2));
      else if (/木桶|桶/.test(label)) { obj = new THREE.Group(); for (let i = 0; i < 3; i++) obj.add(makeBarrel(x + rand(-2, 2), z + rand(-2, 2), rand(0.8, 1.2))); }
      else if (/板条箱|麻袋|补给|货物|金库|宝箱|箱/.test(label)) { obj = new THREE.Group(); for (let i = 0; i < 3; i++) obj.add(rand() < 0.5 ? makeCrate(x + rand(-2.4, 2.4), z + rand(-2.4, 2.4), rand(0.6, 1)) : makeSacks(x + rand(-1.5, 1.5), z + rand(-1.5, 1.5))); }
      else if (/^桌|长桌|纸张|秤|柜台/.test(label)) obj = makeTable(x, z, rand(3, 7), rand(2, 3));
      else if (/床|铺盖/.test(label)) obj = makeBed(x, z, rand(-0.4, 0.4));
      else if (/石笋/.test(label)) obj = makeStalagmite(x, z, rand(3, 8));
      else if (/石柱/.test(label)) obj = makeStatue(x, z);
      else if (/骸骨|尸体/.test(label)) obj = makeBones(x, z);
      else if (/武器架|钩子/.test(label)) obj = makeRack(x, z, rand(-0.3, 0.3));
      else if (/祭坛/.test(label)) obj = makeAltar(x, z);
      else if (/雕像/.test(label)) obj = makeStatue(x, z);
      else if (/锁链|铁棍/.test(label)) obj = makeBones(x, z);
      else if (/灌木|荆棘|树丛/.test(label)) obj = makeBush(x, z, rand(0.7, 1.4));
      else if (/树|森林|果园|苹果树/.test(label)) obj = makeTree(x, z, rand(0.7, 1.3));
      else if (/马/.test(label)) obj = makeHorse(x, z, /死马/.test(label));
      else if (/车|货车|马车/.test(label)) obj = makeCart(x, z, rand(-0.4, 0.4));
      else if (/井/.test(label)) obj = makeWell(x, z);
      else if (/告示|牌/.test(label)) obj = makeBoard(x, z, rand(-0.3, 0.3));
      else if (/农田|田地/.test(label)) obj = makeField(x, z, rand(12, 24), rand(8, 16));
      else if (/摊位|市场/.test(label)) obj = makeStall(x, z, rand(-0.4, 0.4));
      else if (/建筑|房屋|小屋|农舍|酒馆|商店|旅舍|大厅|神殿|庄园|塔|工坊|住宅|小院|门廊|马厩/.test(label)) obj = null;
      else if (/水池|瀑布|桥/.test(label)) obj = null;
      else if (rand() < 0.45) obj = makeCrate(x, z, rand(0.5, 0.9));
      if (obj) { group.add(obj); props.push(obj); }
    }
  }

  // guaranteed central fire pit (area 8)
  const klargArea = map.id === 'map-cragmaw-hideout' ? areas.find((a) => a.no === 8) : null;
  if (klargArea) {
    const fire = addFire(group, klargArea.world.x, klargArea.world.z, 1.35, true);
    fire.userData.light.intensity = 50;
    fire.userData.light.distance = 75;
  }

  // monsters from crossref
  const monsters = [];
  for (const area of areas) {
    const list = area.record?.monsters || [];
    let slot = 0;
    for (const m of list) {
      const count = Math.min(4, Math.max(1, Number(m.count) || 1));
      for (let i = 0; i < count; i++) {
        const id = String(m.monster_id || '');
        const isBoss = /bugbear/.test(id) && area.no === 8 && map.id === 'map-cragmaw-hideout';
        const angle = (slot / Math.max(1, count)) * Math.PI * 2 + rand(-0.5, 0.5);
        const r = rand(4, 13);
        const obj = makeMonster(id, isBoss ? 1.45 : rand(0.9, 1.12));
        obj.position.set(area.world.x + Math.cos(angle) * r, 0, area.world.z + Math.sin(angle) * r);
        obj.rotation.y = rand(0, Math.PI * 2);
        obj.userData.base = obj.position.clone();
        obj.userData.area = area.no;
        obj.userData.name = m.monster_id || 'monster';
        group.add(obj); monsters.push(obj);
        if (isBoss) {
          const tex = makeLabelTexture('克拉格', '#ff9b6a');
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthTest: false }));
          sprite.position.set(obj.position.x, 8.2, obj.position.z);
          sprite.scale.set(11, 2.75, 1); sprite.renderOrder = 6; group.add(sprite);
          obj.userData.marker = sprite;
        }
        slot++;
      }
    }
  }

  // hero
  const hero = makeHero();
  const spawnArea = areas.find((a) => a.no === Number(spawnNo)) || areas.find((a) => a.no === 1) || areas[0];
  hero.position.copy(spawnArea.world).add(new THREE.Vector3(0, 0, 8));
  group.add(hero);

  // torches at key spots
  const torches = [];
  const torchSpots = map.id === 'map-cragmaw-hideout' ? [
    [areas.find((a) => a.no === 5)?.world, 2],
  ].filter(([v]) => v) : [];
  for (const [v, n] of torchSpots) {
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const x = v.x + Math.cos(angle) * 9, z = v.z + Math.sin(angle) * 9;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4, 5), new THREE.MeshStandardMaterial({ color: 0x3a2a1c }));
      stick.position.set(x, 2, z); group.add(stick);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeFireTexture(), color: 0xffae52, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.position.set(x, 4.3, z); flame.scale.set(1, 1.6, 1); group.add(flame);
      const light = new THREE.PointLight(0xff8a3a, 14, 42, 2); light.position.set(x, 4.5, z); group.add(light);
      torches.push({ light, flame, phase: rand(0, 10) });
    }
  }

  // walkable
  const connSegments = [];
  for (const c of map.connections || []) {
    const a = byId.get(c.from), b = byId.get(c.to);
    if (!a || !b) continue;
    connSegments.push([a.centroid, b.centroid]);
  }
  function findAreaAt(x, z) {
    const mx = x + cx, my = z + cz;
    let best = null;
    for (const a of areas) {
      if (!pointInPolygon(mx, my, a.footprint)) continue;
      if (!best || a.footprint.length > best.footprint.length) best = a;
    }
    return best;
  }
  function isWalkable(x, z) {
    if (x < -cx || x > cx || z < -cz || z > cz) return false;
    if (findAreaAt(x, z)) return true;
    const mx = x + cx, my = z + cz;
    for (const [a, b] of connSegments) {
      if (distToSegment(mx, my, a[0], a[1], b[0], b[1]) < 7) return true;
    }
    return false;
  }

  // animation
  const clock = new THREE.Clock();
  function update(dt) {
    const t = clock.getElapsedTime();
    if (water?.userData.tex) water.userData.tex.offset.y = -t * 0.18;
    if (water?.userData.waterfall) {
      const f = water.userData.waterfall;
      f.material.opacity = 0.58 + Math.sin(t * 2.4) * 0.1;
    }
    for (const m of monsters) {
      const p = m.userData.phase || 0;
      m.position.y = Math.sin(t * 1.3 + p) * 0.08;
      m.rotation.y += dt * 0.1 * Math.sin(p);
      if (m.userData.marker) m.userData.marker.position.y = 8.2 + Math.sin(t * 1.5 + p) * 0.3;
    }
    for (const tr of torches) {
      const f = 0.75 + Math.sin(t * 9 + tr.phase) * 0.15 + Math.sin(t * 23 + tr.phase * 2) * 0.08;
      tr.light.intensity = 14 * f;
      tr.flame.scale.set(1 * f, 1.6 * f, 1);
    }
    if (group.userData.caveMouth?.userData.torches) {
      for (const tr of group.userData.caveMouth.userData.torches) {
        const f = 0.75 + Math.sin(t * 9 + tr.phase) * 0.16 + Math.sin(t * 21 + tr.phase) * 0.08;
        if (tr.light) tr.light.intensity = 22 * f; tr.flame.scale.set(1.4 * f, 2.2 * f, 1);
      }
    }
    // fires added as prop groups
    group.traverse((o) => {
      if (o.userData?.kind === 'fire') {
        const f = 0.8 + Math.sin(t * 10 + o.position.x) * 0.15;
        if (o.userData.light) o.userData.light.intensity = 30 * f;
        if (o.userData.flame) o.userData.flame.scale.set(1.8 * f, 3.2 * f, 1);
      }
    });
    // labels: show discovered/current or near
    const px = hero.position.x, pz = hero.position.z;
    for (const a of areas) {
      const d = Math.hypot(px - a.world.x, pz - a.world.z);
      const opacity = a.discovered ? (d < 80 ? 0.9 : 0.35) : (d < 28 ? 0.7 : 0);
      a.label.material.opacity += (opacity - a.label.material.opacity) * Math.min(1, dt * 4);
    }
    // hero torch flicker
    if (hero.userData.light) hero.userData.light.intensity = 20 * (0.85 + Math.sin(t * 13) * 0.1);
    if (hero.userData.flame) hero.userData.flame.scale.set(1.1 * (0.9 + Math.sin(t * 15) * 0.08), 1.7, 1);
  }

  return { group, areas, byId, hero, monsters, water, bridge, isWalkable, findAreaAt, update, bounds: { cx, cz }, rulesById };
}

function pointInAny(x, y, areas) {
  return areas.some((a) => pointInPolygon(x, y, a.footprint));
}
