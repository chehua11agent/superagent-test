import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const QA = new URLSearchParams(location.search).has('qa');
const canvas = document.getElementById('scene');
const tagLayer = document.getElementById('tags');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !QA;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10171a');
scene.fog = new THREE.FogExp2('#162024', 0.026);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, 5.2, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 34;
controls.maxPolarAngle = Math.PI * 0.47;
controls.target.set(0, 1.2, 0.6);

const isPortrait = () => window.innerHeight > window.innerWidth * 1.12;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

const grassTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#26332b'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const g = 38 + Math.random() * 55;
    ctx.fillStyle = `rgba(${g * 0.7 | 0},${g},${g * 0.75 | 0},${0.25 + Math.random() * 0.45})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 3 + Math.random() * 7);
  }
});
grassTex.repeat.set(4, 4);

const dirtTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#4b3c2c'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const g = 55 + Math.random() * 65;
    ctx.fillStyle = `rgba(${g + 20},${g * 0.85 | 0},${g * 0.6 | 0},${0.2 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 3);
  }
});
dirtTex.repeat.set(5, 1);

const woodTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#5a3f29'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = i % 3 ? '#3a281a' : '#7a5a3a';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const y = i * 18 + Math.sin(x * 0.03 + i) * 4;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
});

const stoneTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#4a4a48'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 46) {
    for (let x = (y / 46) % 2 ? -40 : 0; x < w; x += 92) {
      ctx.fillStyle = `rgba(${65 + Math.random() * 25 | 0},${68 + Math.random() * 25 | 0},${64 + Math.random() * 22 | 0},0.9)`;
      ctx.fillRect(x + 2, y + 2, 88, 42);
    }
  }
  ctx.strokeStyle = 'rgba(20,22,20,0.55)'; ctx.lineWidth = 3;
  for (let y = 0; y < h; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
});
stoneTex.repeat.set(3, 3);

const canvasTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#6e5b43'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${35 + rand(0, 30) | 0},${28 + rand(0, 25) | 0},20,0.45)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, i * 7); ctx.lineTo(w, i * 7 + rand(-4, 4)); ctx.stroke();
  }
});

function mat(color, opts = {}) {
  const { roughness = 0.9, metalness = 0, map = null, emissive = null, emissiveIntensity = 1 } = opts;
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness, map,
    emissive: emissive || '#000000', emissiveIntensity,
    flatShading: false,
  });
}
function box(w, h, d, material, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  return m;
}
function cyl(rt, rb, h, seg, material, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  return m;
}
function cone(r, h, seg, material, o = {}) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  return m;
}
function sph(r, material, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.ws || 10, o.hs || 8), material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.sy) m.scale.y = o.sy;
  if (o.sx) m.scale.x = o.sx;
  if (o.sz) m.scale.z = o.sz;
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  return m;
}
function glowSprite(color, size = 1, opacity = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(0.25, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffffff', transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size);
  s.userData.isFx = true;
  return s;
}

/* ---------------- sky / lights / rain ---------------- */

const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color('#152025') },
    bottomColor: { value: new THREE.Color('#6b7567') },
    glowColor: { value: new THREE.Color('#d4b47a') },
    glowStrength: { value: 0.18 },
  },
  vertexShader: `varying vec3 vWorld; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vWorld=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 glowColor; uniform float glowStrength; varying vec3 vWorld;
    void main(){ vec3 dir=normalize(vWorld-cameraPosition); float up=max(dir.y,0.0); vec3 sky=mix(bottomColor,topColor,pow(up,0.7)); float glow=exp(-abs(dir.y)*7.0); sky=mix(sky,glowColor,glow*glowStrength); gl_FragColor=vec4(sky,1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 28, 16), skyMat);
sky.renderOrder = -10; scene.add(sky);

const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 260; i++) {
  const a = rand() * Math.PI * 2, y = 0.2 + rand() * 0.7;
  const r = Math.sqrt(1 - y * y);
  starPos.push(Math.cos(a) * r * 120, y * 120, Math.sin(a) * r * 120);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: '#c7d8df', size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -9; scene.add(stars);

const hemi = new THREE.HemisphereLight('#9fb6b8', '#1c241d', 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#f0d8a8', 2.0);
sun.position.set(-18, 28, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#7d9aa8', 0.65);
fill.position.set(20, 12, 24);
scene.add(fill);

const rainCount = 1100;
const rainPos = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPos[i * 3] = rand(-22, 22);
  rainPos[i * 3 + 1] = rand(0.5, 18);
  rainPos[i * 3 + 2] = rand(-18, 18);
}
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.PointsMaterial({ color: '#c7d9df', size: 0.045, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
const rain = new THREE.Points(rainGeo, rainMat);
rain.userData.isFx = true;
scene.add(rain);

/* ---------------- select stage ---------------- */

const selectStage = new THREE.Group();
selectStage.visible = false;
scene.add(selectStage);

const daisMat = mat('#2b3330', { roughness: 0.95, map: stoneTex });
const dais = cyl(8.2, 8.6, 0.35, 32, daisMat, { y: 0.16 });
dais.receiveShadow = true;
selectStage.add(dais);
selectStage.add(cyl(7.7, 7.7, 0.04, 32, mat('#33402f', { roughness: 1, map: grassTex }), { y: 0.35 }));
for (let i = 0; i < 26; i++) {
  const a = rand() * Math.PI * 2, r = rand(6.5, 10.5);
  const z = Math.sin(a) * r;
  if (z > 2.4) continue;
  const p = pine(rand(-1, 1), rand(-1, 1), rand(0.7, 1.3));
  p.position.set(Math.cos(a) * r, 0, z);
  selectStage.add(p);
}
for (let i = 0; i < 20; i++) {
  const a = rand() * Math.PI * 2, r = rand(5.5, 10);
  selectStage.add(sph(rand(0.15, 0.35), mat('#384436', { roughness: 1 }), { x: Math.cos(a) * r, y: 0.42, z: Math.sin(a) * r, sy: 0.35 }));
}

const SELECT_POS = [-5.2, -1.75, 1.75, 5.2];
const PEDESTALS = [];
for (let i = 0; i < 4; i++) {
  const x = SELECT_POS[i];
  const p = new THREE.Group();
  p.position.set(x, 0, 0);
  p.add(cyl(0.72, 0.86, 0.5, 8, mat('#3c403c', { map: stoneTex, roughness: 0.9 }), { y: 0.55 }));
  p.add(cyl(0.58, 0.58, 0.08, 8, mat('#6b5c45', { roughness: 0.8 }), { y: 0.83 }));
  const ringMat = new THREE.MeshBasicMaterial({ color: '#d6b06a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 28), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.86;
  p.add(ring);
  const light = new THREE.PointLight('#ffd9a0', 8, 7, 2);
  light.position.set(0, 3.1, 1.2);
  p.add(light);
  p.userData.ring = ring;
  p.userData.light = light;
  selectStage.add(p);
  PEDESTALS.push(p);
}
for (let i = 0; i < 3; i++) {
  const l = new THREE.PointLight('#a9c6c8', 5, 18, 2);
  l.position.set(-6 + i * 6, 5.5, 4);
  selectStage.add(l);
}

/* ---------------- trail ---------------- */

const trail = new THREE.Group();
trail.visible = false;
scene.add(trail);
const trailGround = box(34, 0.35, 26, mat('#384338', { roughness: 1, map: grassTex }), { y: -0.05, z: -1 });
trailGround.receiveShadow = true;
trail.add(trailGround);
// road
const road = box(34, 0.035, 5.6, mat('#5b4a37', { roughness: 1, map: dirtTex }), { y: 0.14, z: 0.5 });
road.receiveShadow = true;
trail.add(road);
for (let i = 0; i < 16; i++) {
  trail.add(box(rand(1.2, 3.4), 0.02, rand(0.15, 0.5), mat('#3a2f23', { roughness: 1 }), { x: rand(-15, 15), y: 0.16, z: rand(-2.2, 3.2), ry: rand(-0.4, 0.4), cast: false }));
}
// pines and rocks
for (let i = 0; i < 34; i++) {
  const a = rand() * Math.PI * 2, r = rand(9, 17);
  const pz = Math.sin(a) * r - 1;
  if (pz > 4.2) continue;
  const p = pine(rand(-1, 1), rand(-1, 1), rand(0.75, 1.5));
  p.position.set(Math.cos(a) * r, 0, pz);
  trail.add(p);
}
for (let i = 0; i < 18; i++) {
  const a = rand() * Math.PI * 2, r = rand(6, 14);
  trail.add(sph(rand(0.2, 0.55), mat('#3f4740', { map: stoneTex, roughness: 0.95 }), { x: Math.cos(a) * r, y: 0.32, z: Math.sin(a) * r, sy: rand(0.4, 0.8) }));
}
for (let i = 0; i < 40; i++) {
  trail.add(bush(rand(-11, 11), rand(-5.4, 5.2), rand(0.55, 1.2)));
}

const wagon = buildWagon();
wagon.position.set(-4.2, 0.15, 2.7); wagon.rotation.y = -0.12; trail.add(wagon);
const horses = [
  deadHorse(-0.3, 0.4, 0.25),
  deadHorse(2.6, 0.9, -0.2),
];
for (const h of horses) trail.add(h);
for (const [x, z] of [[-1.2, 0.1], [1.0, 0.7], [3.4, 0.4], [-3.6, 1.1]]) {
  trail.add(box(0.02, 0.02, 0.75, mat('#2a2118'), { x, y: 0.19, z, ry: rand(-0.5, 0.5), cast: false }));
}
// crows
for (const [x, z] of [[0.2, 0.0], [3.0, 1.2]]) {
  const c = new THREE.Group();
  c.add(sph(0.11, mat('#141616'), { y: 0.08, sz: 1.5 }));
  c.add(cone(0.035, 0.12, 4, mat('#2b2b26'), { y: 0.02, z: 0.2, rx: Math.PI / 2 }));
  c.position.set(x, 1.02, z); c.rotation.y = rand(-1, 1); trail.add(c);
}
// broken arrows
for (let i = 0; i < 10; i++) {
  trail.add(cyl(0.008, 0.008, rand(0.5, 0.9), 4, mat('#b9a47d'), { x: rand(-7, 7), y: 0.2, z: rand(-2, 3), rz: rand(-0.2, 0.2), rx: Math.PI / 2, cast: false }));
}

// goblin eyes in the brush (intro)
const eyeGroups = [];
const EYE_SPOTS = [[-6.2, -3.2], [5.4, -2.7], [-0.6, -5.1], [3.7, -4.6]];
for (const [x, z] of EYE_SPOTS) {
  const g = new THREE.Group();
  for (const dx of [-0.16, 0.16]) {
    const e = sph(0.055, mat('#d8e46a', { emissive: '#b8c93a', emissiveIntensity: 4 }), { x: dx, y: 0.28, z: 0, cast: false });
    g.add(e);
    const gl = glowSprite('#d8e46a', 0.55, 0.65); gl.position.set(dx, 0.28, 0); g.add(gl);
  }
  g.position.set(x, 0, z); g.visible = false; trail.add(g); eyeGroups.push(g);
}

// a cold camp fire / overturned crate near wagon
for (let i = 0; i < 3; i++) {
  trail.add(box(rand(0.5, 0.8), 0.04, 0.4, mat('#4a6068'), { x: -5.5 + i * 0.35, y: 0.17, z: 0.8 + i * 0.1, ry: rand(-0.5, 0.5), cast: false }));
}
// rain is global

/* ---------------- cave ---------------- */

const cave = new THREE.Group();
cave.visible = false;
scene.add(cave);
const rockMat = mat('#42433f', { map: stoneTex, roughness: 0.95 });
cave.add(box(26, 0.4, 18, mat('#354138', { roughness: 1, map: grassTex }), { y: -0.05, z: -2 }));
cave.add(box(24, 8.5, 2.2, rockMat, { y: 4.2, z: -8.2 }));
cave.add(box(5.2, 4.6, 1.0, mat('#0c100d'), { y: 2.3, z: -6.9 }));
for (const x of [-3.5, 3.5]) {
  cave.add(box(1.8, 4.8, 2.6, rockMat, { x, y: 2.4, z: -6.3, ry: x * 0.04 }));
  cave.add(box(1.3, 1.2, 2.7, rockMat, { x, y: 4.55, z: -6.3 }));
}
cave.add(box(5.6, 1.4, 2.7, rockMat, { y: 4.7, z: -6.3 }));
cave.add(box(18, 0.15, 2.0, mat('#2a2820', { roughness: 1 }), { y: 0.18, z: -5.4 }));
// side cliff chunks
for (const [x, z, s] of [[-8.5, -5.0, 2.2], [8.2, -4.6, 1.9], [-6.8, -3.2, 1.2], [7.6, -2.8, 1.4]]) {
  cave.add(box(s, s * 1.4, s, rockMat, { x, y: s * 0.6, z, ry: rand(-0.4, 0.4) }));
}
// sentries at the mouth
for (const x of [-2.2, 2.2]) {
  const g = new THREE.Group();
  const skin = mat('#7da24f', { roughness: 0.9 }), leather = mat('#3d2f22');
  g.add(box(0.3, 0.4, 0.22, leather, { y: 0.75 }));
  g.add(sph(0.19, skin, { y: 1.12 }));
  for (const sx of [-1, 1]) g.add(cone(0.09, 0.26, 4, skin, { x: sx * 0.18, y: 1.15, rz: sx * -1.1 }));
  g.add(box(0.08, 0.3, 0.08, skin, { x: -0.22, y: 0.78 }));
  g.add(box(0.08, 0.3, 0.08, skin, { x: 0.22, y: 0.78 }));
  g.add(cyl(0.025, 0.03, 1.25, 5, mat('#3a2b1d'), { x: 0.35, y: 0.72, rz: -0.1 }));
  g.position.set(x, 0, -4.6); g.rotation.y = x > 0 ? -0.2 : 0.2; cave.add(g);
}
for (let i = 0; i < 18; i++) {
  cave.add(bush(rand(-10, 10), rand(-3, 5), rand(0.5, 1.1)));
}
const stream = box(2.2, 0.03, 13, mat('#223a40', { roughness: 0.2, metalness: 0.1, emissive: '#0d2024', emissiveIntensity: 0.5 }), { x: 2.2, y: 0.14, z: 1 });
cave.add(stream);
for (let i = 0; i < 8; i++) {
  cave.add(sph(rand(0.2, 0.55), rockMat, { x: rand(-8, 8), y: 0.25, z: rand(-2, 5), sy: 0.5 }));
}
// cave torches
for (const x of [-2.9, 2.9]) {
  cave.add(cyl(0.05, 0.06, 1.4, 5, mat('#3a2b1d'), { x, y: 1.3, z: -5.2 }));
  cave.add(sph(0.14, mat('#ffb35c', { emissive: '#ff8a3a', emissiveIntensity: 3 }), { x, y: 2.1, z: -5.2, cast: false }));
  const gl = glowSprite('#ff9a4c', 1.8, 0.5); gl.position.set(x, 2.1, -5.2); cave.add(gl);
  const l = new THREE.PointLight('#ff9a4c', 20, 10, 2); l.position.set(x, 2.2, -4.9); cave.add(l);
}

/* ---------------- helpers for scenery ---------------- */

function pine(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.12 * s, 0.18 * s, 2.4 * s, 6, mat('#3c2d20', { roughness: 1 }), { y: 1.2 * s }));
  for (let i = 0; i < 4; i++) {
    const y = 1.4 * s + i * 0.7 * s;
    const r = (1.1 - i * 0.18) * s;
    const c = cone(r, 1.35 * s, 7, mat(i % 2 ? '#22362b' : '#1c2c24', { roughness: 0.95 }), { y, x: x * 0.02, cast: true });
    g.add(c);
  }
  return g;
}
function bush(x, z, s = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    g.add(sph(s * rand(0.3, 0.5), mat(i % 2 ? '#293d2e' : '#223427', { roughness: 1 }), { x: rand(-0.3, 0.3) * s, y: 0.25 * s, z: rand(-0.3, 0.3) * s, sy: 0.55 }));
  }
  g.position.set(x, 0, z);
  return g;
}
function deadHorse(x, z, ry) {
  const g = new THREE.Group();
  const hide = mat('#2f2b27', { roughness: 0.95 });
  g.add(sph(0.55, hide, { y: 0.55, sz: 1.7, sy: 0.55 }));
  g.add(sph(0.3, hide, { x: 0.9, y: 0.45, z: 0.55, sy: 0.8 }));
  g.add(cyl(0.09, 0.11, 0.75, 5, hide, { x: 0.92, y: 0.35, z: 0.85, rx: 0.5 }));
  for (const [dx, dz] of [[-0.55, -0.3], [-0.5, 0.3], [0.55, -0.3], [0.5, 0.3]]) {
    g.add(box(0.1, 0.55, 0.1, hide, { x: dx, y: 0.2, z: dz, rz: rand(-0.3, 0.3) }));
  }
  g.add(box(0.5, 0.08, 0.7, mat('#513828', { roughness: 0.9 }), { y: 0.85, z: 0.1 }));
  g.position.set(x, 0.15, z); g.rotation.y = ry;
  return g;
}
function buildWagon() {
  const g = new THREE.Group();
  const wood = mat('#4a3422', { map: woodTex, roughness: 0.95 });
  g.add(box(3.8, 0.25, 1.9, wood, { y: 0.9 }));
  g.add(box(3.8, 0.6, 0.16, wood, { y: 1.25, z: 0.95 }));
  g.add(box(3.8, 0.6, 0.16, wood, { y: 1.25, z: -0.95 }));
  g.add(box(0.16, 0.7, 1.9, wood, { x: -1.88, y: 1.28 }));
  // canopy
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.4, 12, 1, true, 0, Math.PI), mat('#6a5f4d', { roughness: 0.95, map: canvasTex }));
  canopy.rotation.z = Math.PI / 2; canopy.rotation.y = Math.PI / 2;
  canopy.position.set(0, 1.66, 0); canopy.castShadow = true;
  g.add(canopy);
  // wheels
  for (const [x, z] of [[-1.25, 1.05], [1.25, 1.05], [-1.25, -1.05], [1.25, -1.05]]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 5, 12), mat('#2f2418', { roughness: 0.9 }));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(x, 0.5, z);
    wheel.castShadow = true;
    g.add(wheel);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.add(box(0.05, 0.86, 0.05, mat('#3b2a1c'), { x, y: 0.5, z, rx: a, ry: Math.PI / 2 }));
    }
  }
  g.add(box(0.18, 0.9, 0.18, mat('#3b2a1c'), { x: 2.0, y: 0.9, z: 0.85, rz: -0.2 }));
  // crates / sacks
  for (const [x, z, s] of [[-1.1, 0.1, 0.55], [-0.0, 0.2, 0.45], [1.0, -0.1, 0.5]]) {
    g.add(box(s, s, s, mat('#5b422a', { roughness: 1 }), { x, y: 1.05 + s / 2, z }));
  }
  for (const [x, z] of [[0.5, 0.55], [1.6, 0.4]]) {
    g.add(sph(0.24, mat('#7a6244', { roughness: 1 }), { x, y: 1.1, z, sy: 0.7 }));
  }
  return g;
}

/* ---------------- characters ---------------- */


function person(cfg = {}) {
  const { skin = '#cf9f79', coat = '#41505b', coat2 = null, pants = '#25262b', accent = '#b98d55', hat = null, scale = 1, cloak = false, armor = false, hair = '#2a211c' } = cfg;
  const g = new THREE.Group();
  const M = {
    coat: mat(coat, { roughness: 0.92 }), coat2: mat(coat2 || coat, { roughness: 0.92 }), pants: mat(pants, { roughness: 0.95 }),
    skin: mat(skin, { roughness: 0.9 }), accent: mat(accent, { metalness: 0.35, roughness: 0.5 }), dark: mat('#1e2026', { roughness: 0.9 }),
    boot: mat('#241d17', { roughness: 0.95 }), hair: mat(hair, { roughness: 0.95 }), metal: mat('#777c82', { metalness: 0.65, roughness: 0.42 }),
  };
  const hip = new THREE.Group(); hip.position.y = 0.92; g.add(hip);
  hip.add(box(0.46, 0.28, 0.32, M.pants, { y: 0.02 }));
  hip.add(box(0.52, 0.1, 0.36, M.dark, { y: 0.15 }));
  const torso = new THREE.Group(); torso.position.y = 0.15; hip.add(torso);
  torso.add(box(0.56, 0.64, 0.34, M.coat, { y: 0.32 }));
  torso.add(box(0.66, 0.14, 0.38, M.coat2, { y: 0.61 }));
  torso.add(box(0.58, 0.08, 0.36, M.dark, { y: 0.05 }));
  if (armor) {
    torso.add(box(0.6, 0.34, 0.38, M.metal, { y: 0.34 }));
    torso.add(box(0.3, 0.22, 0.4, M.metal, { x: -0.33, y: 0.54 }));
    torso.add(box(0.3, 0.22, 0.4, M.metal, { x: 0.33, y: 0.54 }));
  }
  if (cloak) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.62, 1.05, 8, 1, true), M.coat2);
    c.position.y = -0.12; c.castShadow = true; c.receiveShadow = true; torso.add(c);
  }
  const head = new THREE.Group(); head.position.y = 0.92; torso.add(head);
  head.add(sph(0.225, M.skin, { ws: 10, hs: 8 }));
  head.add(box(0.045, 0.05, 0.035, M.dark, { x: -0.08, y: 0.03, z: 0.2, cast: false }));
  head.add(box(0.045, 0.05, 0.035, M.dark, { x: 0.08, y: 0.03, z: 0.2, cast: false }));
  head.add(box(0.05, 0.06, 0.05, M.skin, { y: -0.02, z: 0.22, cast: false }));
  if (hat === 'hood') head.add(cone(0.3, 0.42, 8, M.coat2, { y: 0.18 }));
  else if (hat === 'helm') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.255, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.metal); helm.position.y = 0.02; head.add(helm);
    head.add(box(0.22, 0.12, 0.06, M.dark, { y: 0.03, z: 0.21, cast: false }));
    head.add(box(0.05, 0.28, 0.36, M.accent, { y: 0.18, z: 0 }));
  } else head.add(sph(0.232, M.hair, { y: 0.045, sz: 1.02 }));
  function arm(side) {
    const s = new THREE.Group(); s.position.set(side * 0.39, 0.55, 0); torso.add(s);
    s.add(box(0.17, 0.48, 0.19, M.coat, { y: -0.21 }));
    const low = new THREE.Group(); low.position.y = -0.44; s.add(low);
    low.add(box(0.14, 0.38, 0.16, M.coat2, { y: -0.18 }));
    low.add(sph(0.072, M.skin, { y: -0.38, ws: 7, hs: 5 }));
    return { upper: s, lower: low };
  }
  const armL = arm(-1), armR = arm(1);
  function leg(side) {
    const s = new THREE.Group(); s.position.set(side * 0.15, 0.02, 0); hip.add(s);
    s.add(box(0.21, 0.5, 0.24, M.pants, { y: -0.25 }));
    const low = new THREE.Group(); low.position.y = -0.48; s.add(low);
    low.add(box(0.18, 0.4, 0.21, M.pants, { y: -0.19 }));
    low.add(box(0.23, 0.13, 0.32, M.boot, { y: -0.41, z: 0.04 }));
    return { upper: s, lower: low };
  }
  const legL = leg(-1), legR = leg(1);
  g.scale.setScalar(scale);
  const refs = { torso, head, armL, armR, legL, legR, hip, M };
  g.userData.refs = refs;
  return { group: g, refs, M };
}
function addSword(parent, side = 1, scale = 1) {
  const g = new THREE.Group();
  g.add(box(0.045, 1.15 * scale, 0.09, mat('#9aa1a8', { metalness: 0.6, roughness: 0.35 }), { y: 0.5 * scale }));
  g.add(box(0.28, 0.05, 0.09, mat('#b98d55', { metalness: 0.5 }), { y: 0.02 }));
  g.add(box(0.05, 0.22, 0.07, mat('#3b2a1d'), { y: -0.13 }));
  g.rotation.z = side * -0.2;
  parent.add(g);
  return g;
}
function addShield(parent, side = -1) {
  const g = new THREE.Group();
  g.add(cyl(0.4, 0.4, 0.07, 12, mat('#5c4632'), { rx: Math.PI / 2 }));
  g.add(cyl(0.1, 0.1, 0.09, 8, mat('#9aa1a8', { metalness: 0.5 }), { rx: Math.PI / 2, z: 0.05 }));
  g.position.set(side * 0.52, 0.3, 0.2);
  g.rotation.set(Math.PI / 2, 0, 0.15);
  parent.add(g);
  return g;
}

const tokens = new Map();
const goblins = new Map();
const heroBuilders = {
  darvin: () => {
    const p = person({ coat: '#4a5158', coat2: '#7c2d2d', pants: '#2c2d33', armor: true, accent: '#c9a35d', hat: 'helm', cloak: true, scale: 1.05 });
    addSword(p.refs.armR.lower, 1, 1.05); addShield(p.refs.armL.lower, -1);
    return p;
  },
  barvin: () => {
    const p = person({ coat: '#405346', coat2: '#26352c', pants: '#2a2824', hat: 'hood', accent: '#b98d55', cloak: true, scale: 0.72, skin: '#d3a47f' });
    const bow = new THREE.Group();
    bow.add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 5, 12, Math.PI * 1.4), mat('#5a4128')));
    bow.rotation.set(Math.PI / 2, 0.2, 0.4);
    bow.position.set(0.25, 1.35, -0.2);
    p.group.add(bow);
    return p;
  },
  bruenor: () => {
    const p = person({ coat: '#4d4a43', coat2: '#37352f', pants: '#2a2924', hat: 'helm', accent: '#c9a35d', cloak: true, scale: 0.84, skin: '#caa07b' });
    const beard = box(0.24, 0.38, 0.12, mat('#6b4a30', { roughness: 1 }), { y: 1.42, z: 0.22 });
    p.group.add(beard);
    p.refs.armR.lower.add(cyl(0.035, 0.045, 1.2, 6, mat('#3b2a1d'), { y: 0.25 }));
    p.refs.armR.lower.add(box(0.22, 0.16, 0.16, mat('#7a7c7a', { metalness: 0.5 }), { y: 0.86 }));
    p.refs.armL.lower.add(cyl(0.38, 0.38, 0.07, 12, mat('#5c4632'), { rx: Math.PI / 2, z: 0.04 }));
    return p;
  },
  aramil: () => {
    const p = person({ coat: '#33445f', coat2: '#4d6687', pants: '#23262e', accent: '#b98d55', cloak: true, scale: 1.0, skin: '#d9b08a', hat: 'hood' });
    const staff = new THREE.Group();
    staff.add(cyl(0.035, 0.045, 2.0, 6, mat('#4a3422'), { y: 1.0 }));
    staff.add(sph(0.13, mat('#9fc8e6', { emissive: '#6db6e8', emissiveIntensity: 2.5 }), { y: 2.02 }));
    staff.position.set(0.55, 0, 0.05);
    p.group.add(staff);
    for (const side of [-1, 1]) {
      const ear = cone(0.07, 0.22, 4, mat('#d9b08a'), { x: side * 0.21, y: 1.55, z: 0, rz: side * 0.6 });
      p.group.add(ear);
    }
    return p;
  },
};

function makeToken(id, mini, { base = 0.62, color = '#c9a35d' } = {}) {
  const g = new THREE.Group();
  const b = new THREE.Group();
  b.add(cyl(base, base * 1.06, 0.11, 16, mat('#2b3037', { metalness: 0.35, roughness: 0.5 }), { y: 0.055 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(base * 0.93, 0.032, 5, 20), mat(color, { metalness: 0.4, roughness: 0.45, emissive: color, emissiveIntensity: 0.18 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.12; b.add(rim);
  g.add(b); g.add(mini);
  g.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'token', id }; });
  const label = document.createElement('div');
  label.className = 'token-tag'; label.dataset.id = id;
  tagLayer.appendChild(label);
  tokens.set(id, {
    id, group: g, mini, label, baseY: 0.12, hp: 1, maxHp: 1, down: false, active: false, target: false,
    refs: mini.userData.refs || null, side: 'party',
  });
  scene.add(g);
  return g;
}

function buildGoblin(id, index) {
  const g = new THREE.Group();
  const M = {
    skin: mat('#86b057', { roughness: 0.9 }),
    leather: mat('#3d2f22', { roughness: 0.95 }),
    dark: mat('#1b1d17', { roughness: 0.9 }),
    metal: mat('#7d7b6e', { metalness: 0.5, roughness: 0.5 }),
  };
  const body = new THREE.Group();
  body.position.y = 0.72;
  body.add(box(0.34, 0.42, 0.24, M.leather, { y: 0.12 }));
  body.add(box(0.36, 0.08, 0.26, M.dark, { y: 0.34 }));
  const head = new THREE.Group(); head.position.y = 0.52; body.add(head);
  head.add(sph(0.2, M.skin, { ws: 8, hs: 6 }));
  for (const side of [-1, 1]) {
    head.add(cone(0.11, 0.3, 4, M.skin, { x: side * 0.2, y: 0.04, z: 0, rz: side * -1.1 }));
  }
  head.add(sph(0.035, M.dark, { x: -0.08, y: 0.03, z: 0.18, cast: false }));
  head.add(sph(0.035, M.dark, { x: 0.08, y: 0.03, z: 0.18, cast: false }));
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.23, 0.28, 0); body.add(arm);
    arm.add(box(0.1, 0.32, 0.1, M.skin, { y: -0.14 }));
    const leg = new THREE.Group(); leg.position.set(side * 0.11, 0, 0); body.add(leg);
    leg.add(box(0.12, 0.28, 0.13, M.leather, { y: -0.14 }));
  }
  const weapon = new THREE.Group();
  weapon.add(cyl(0.025, 0.035, 0.55, 5, M.dark, { y: 0.2 }));
  weapon.add(box(0.05, 0.35, 0.07, M.metal, { y: 0.52 }));
  weapon.position.set(0.45, 0.9, 0.15); weapon.rotation.z = 0.25;
  g.add(body); g.add(weapon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.6, 20), new THREE.MeshBasicMaterial({ color: '#c46a4a', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  g.userData.ring = ring;
  g.scale.setScalar(1.3);
  const label = document.createElement('div');
  label.className = 'token-tag is-enemy'; label.dataset.id = id;
  tagLayer.appendChild(label);
  goblins.set(id, { id, group: g, label, baseY: 0.1, hp: 7, maxHp: 7, active: false, target: false, side: 'enemy' });
  scene.add(g);
  return g;
}

const selectMinis = new Map();
const SELECT_IDS = ['darvin', 'barvin', 'bruenor', 'aramil'];
for (let i = 0; i < SELECT_IDS.length; i++) {
  const id = SELECT_IDS[i];
  const p = heroBuilders[id]();
  p.group.position.set(SELECT_POS[i], 0.88, 0);
  p.group.rotation.y = 0.1;
  p.group.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'hero', id }; });
  selectStage.add(p.group);
  selectMinis.set(id, { id, group: p.group, refs: p.refs, selected: false, home: SELECT_POS[i] });
}
for (const id of SELECT_IDS) {
  const p = heroBuilders[id]();
  p.group.rotation.y = 0.15;
  makeToken(id, p.group, { base: id === 'barvin' ? 0.55 : id === 'bruenor' ? 0.6 : 0.64, color: id === 'barvin' ? '#8fb38f' : id === 'bruenor' ? '#c98d72' : id === 'aramil' ? '#7f9dc9' : '#c9a35d' });
  tokens.get(id).group.visible = false;
}
const GOBLIN_IDS = ['goblin1', 'goblin2', 'goblin3', 'goblin4'];
const GOBLIN_POS = [[-3.6, -1.4], [3.2, -1.2], [-1.2, -2.8], [1.5, -2.6]];
for (let i = 0; i < GOBLIN_IDS.length; i++) {
  const id = GOBLIN_IDS[i];
  buildGoblin(id, i);
  goblins.get(id).group.position.set(GOBLIN_POS[i][0], 0.1, GOBLIN_POS[i][1]);
  goblins.get(id).group.rotation.y = rand(-0.5, 0.5);
  goblins.get(id).group.visible = false;
}

/* ---------------- dice tray / d20 ---------------- */

const diceRig = new THREE.Group();
scene.add(diceRig);
const tray = new THREE.Group();
tray.position.set(-5.0, 0.23, 4.4);
tray.add(box(4.4, 0.15, 2.6, mat('#3a2a1d', { map: woodTex, roughness: 0.9 }), { y: 0 }));
tray.add(box(4.0, 0.06, 2.2, mat('#1d2420', { roughness: 0.85 }), { y: 0.1 }));
for (const [x, z, w, d] of [[-2.0, 0, 0.16, 2.4], [2.0, 0, 0.16, 2.4], [0, 1.1, 4.0, 0.16], [0, -1.1, 4.0, 0.16]]) {
  tray.add(box(w, 0.2, d, mat('#5a4128', { map: woodTex }), { x, y: 0.17, z }));
}
tray.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'dice' }; });
diceRig.add(tray);
const TRAY_TOP = tray.position.y + 0.13;
const DICE_RADIUS = 0.48;

function numberTexture(n) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8,10,13,0.82)';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,176,106,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f4e6c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${n > 9 ? 58 : 62}px Georgia, "Noto Serif SC", serif`;
    ctx.fillText(String(n), w / 2, h / 2 + 2);
  });
}
function buildD20(radius = DICE_RADIUS) {
  const geo = new THREE.IcosahedronGeometry(radius, 0);
  const baseMat = mat('#4b4a47', { roughness: 0.55, metalness: 0.15, emissive: '#0b0a08', emissiveIntensity: 0.4 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, baseMat);
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#c9a36a', transparent: true, opacity: 0.55 })));
  const pos = geo.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const faces = [];
  for (let f = 0; f < 20; f++) {
    a.fromBufferAttribute(pos, f * 3); b.fromBufferAttribute(pos, f * 3 + 1); c.fromBufferAttribute(pos, f * 3 + 2);
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    if (normal.dot(centroid) < 0) normal.negate();
    faces.push({ normal: normal.clone(), centroid: centroid.clone() });
    const inset = (p) => p.clone().addScaledVector(new THREE.Vector3().subVectors(centroid, p), 0.17).addScaledVector(normal, 0.006);
    const p1 = inset(a), p2 = inset(b), p3 = inset(c);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z], 3));
    dg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0.88, 0.08, 0.08, 0.92, 0.08], 2));
    const decal = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: numberTexture(f + 1), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    decal.renderOrder = 3; decal.userData.noPick = true; group.add(decal);
  }
  group.userData.faces = faces; group.userData.radius = radius;
  return group;
}
const dice = [buildD20(), buildD20()];
dice[0].position.set(-0.95, TRAY_TOP + 0.44, 0.0);
dice[1].position.set(0.95, TRAY_TOP + 0.44, 0.0);
dice[0].rotation.set(0.3, 0.8, 0.1);
dice[1].rotation.set(0.7, -0.4, 0.2);
for (const d of dice) { d.position.add(tray.position); diceRig.add(d); }
dice[1].visible = false;
let rolling = null;
function faceFor(n) { return dice[0].userData.faces[n - 1]; }
function orientDie(die, value) {
  const face = die.userData.faces[value - 1];
  const q = new THREE.Quaternion().setFromUnitVectors(face.normal, new THREE.Vector3(0, 1, 0));
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
  die.quaternion.copy(q).multiply(spin);
  die.position.y = tray.position.y + die.userData.radius * 0.86;
}
function roll(values, mode = 'normal') {
  if (rolling) return Promise.resolve(null);
  return new Promise((resolve) => {
    const count = values.length > 1 ? 2 : 1;
    const start = [];
    for (let i = 0; i < count; i++) {
      const base = tray.position;
      start.push(new THREE.Vector3(base.x + (i ? 0.95 : -0.95), TRAY_TOP + 0.5, base.z));
      dice[i].visible = true; dice[i].position.copy(start[i]); dice[i].rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    }
    if (count === 1) dice[1].visible = false;
    rolling = { t: 0, dur: QA ? 0.18 : 1.05, count, values, start, resolve };
  });
}
function finishRoll() {
  const values = rolling.values;
  const count = rolling.count;
  const result = count > 1 ? (values[0] === values[1] ? values[0] : values) : values[0];
  for (let i = 0; i < count; i++) orientDie(dice[i], Array.isArray(result) ? result[i] : result);
  const res = rolling.resolve; rolling = null;
  res(result);
}
function scatterDice() {
  dice[0].position.set(tray.position.x - 0.95, TRAY_TOP + 0.44, tray.position.z);
  dice[1].position.set(tray.position.x + 0.95, TRAY_TOP + 0.44, tray.position.z);
  dice[0].quaternion.identity(); dice[1].quaternion.identity();
  dice[1].visible = false;
}

/* ---------------- camera / modes ---------------- */

let camTween = null;
function tweenCamera(pos, target, dur = 0.8) {
  camTween = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone() };
}
function updateCam(dt) {
  if (!camTween) return;
  camTween.t += dt;
  const k = Math.min(1, camTween.t / camTween.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(camTween.p0, camTween.p1, e);
  controls.target.lerpVectors(camTween.t0, camTween.t1, e);
  if (k >= 1) camTween = null;
}
const HOMES = {
  select: { landscape: { pos: new THREE.Vector3(0, 4.7, 11.8), target: new THREE.Vector3(0, 1.2, 0), fov: 42 }, portrait: { pos: new THREE.Vector3(0, 6.4, 24), target: new THREE.Vector3(0, 1.35, 0), fov: 56 } },
  trail: { landscape: { pos: new THREE.Vector3(13.2, 10.4, 17.0), target: new THREE.Vector3(0, 1.0, 0.4), fov: 43 }, portrait: { pos: new THREE.Vector3(17.5, 12.5, 22.5), target: new THREE.Vector3(0, 1.2, 1.6), fov: 51 } },
  cave: { landscape: { pos: new THREE.Vector3(8.8, 5.6, 11.5), target: new THREE.Vector3(0, 2.1, -4.0), fov: 44 }, portrait: { pos: new THREE.Vector3(12.5, 7.5, 16), target: new THREE.Vector3(0, 2.3, -2.6), fov: 53 } },
};
const HOME = (mode) => { const h = HOMES[mode] || HOMES.trail; return isPortrait() ? h.portrait : h.landscape; };
const INTRO_CAM = {
  road: { pos: new THREE.Vector3(12, 8.2, 17), target: new THREE.Vector3(-3, 1.2, 2) },
  wagon: { pos: new THREE.Vector3(7.0, 4.6, 10.5), target: new THREE.Vector3(-4.2, 1.4, 2.7) },
  trail: { pos: new THREE.Vector3(14, 9.8, 17), target: new THREE.Vector3(0, 1.0, 0.2) },
  horses: { pos: new THREE.Vector3(4.8, 3.5, 8.5), target: new THREE.Vector3(1.2, 0.9, 0.6) },
  ambush: { pos: new THREE.Vector3(5.0, 3.2, 9.0), target: new THREE.Vector3(-1.5, 0.8, -2.0) },
};

let mode = 'intro';
let selected = [];
let introStep = 0;

function setVisibility() {
  selectStage.visible = mode === 'select';
  trail.visible = mode === 'intro' || mode === 'trail';
  cave.visible = mode === 'cave';
  diceRig.visible = mode === 'trail';
  for (const t of tokens.values()) t.group.visible = mode === 'trail' && selected.includes(t.id);
  for (const g of goblins.values()) g.group.visible = mode === 'trail' && g.revealed;
  for (const e of eyeGroups) e.visible = mode === 'intro' && introStep >= 4;
  for (const t of tokens.values()) t.label.style.display = mode === 'trail' && selected.includes(t.id) ? '' : 'none';
  for (const g of goblins.values()) g.label.style.display = mode === 'trail' && g.revealed ? '' : 'none';
}
function setMode(next) {
  mode = next;
  if (next === 'trail' && selected.length) placeTrailParty();
  setVisibility();
  const h = HOME(next);
  camera.fov = h.fov; camera.updateProjectionMatrix();
  tweenCamera(h.pos.clone(), h.target.clone(), 0.9);
}
function setIntroStep(i) {
  introStep = i;
  const step = ['road', 'wagon', 'trail', 'horses', 'ambush'][i] || 'trail';
  const c = INTRO_CAM[step];
  const portrait = isPortrait();
  const p = portrait ? c.pos.clone().multiplyScalar(1.25) : c.pos.clone();
  const t = c.target.clone();
  tweenCamera(p, t, 1.0);
  setVisibility();
}
function setSelected(ids) {
  selected = ids.slice();
  for (const m of selectMinis.values()) {
    const on = ids.includes(m.id);
    m.selected = on;
    m.group.position.z = on ? 0.55 : 0;
    m.group.rotation.y = on ? 0.35 : 0.1;
    const p = PEDESTALS[SELECT_IDS.indexOf(m.id)];
    if (p) {
      p.userData.ring.material.opacity = on ? 0.9 : 0;
      p.userData.light.intensity = on ? 18 : 8;
    }
  }
  if (mode === 'trail') setVisibility();
}
function placeTrailParty() {
  const slots = [[-2.4, 3.2, 0.15], [0.1, 3.8, -0.1], [2.5, 3.2, 0.2]];
  selected.forEach((id, i) => {
    const t = tokens.get(id);
    if (!t) return;
    t.group.position.set(slots[i][0], t.baseY, slots[i][1]);
    t.group.rotation.y = slots[i][2];
  });
}
function setTarget(id) {
  for (const g of goblins.values()) { const r = g.group.userData.ring; if (r) { r.material.opacity = g.id === id ? 0.9 : 0.42; r.material.color.set(g.id === id ? '#ff8a5a' : '#c46a4a'); } }
  for (const t of tokens.values()) { t.target = t.id === id; t.group.children[0]?.children[1]?.material?.color?.set(t.target ? '#c46a4a' : '#c9a35d'); }
  for (const g of goblins.values()) { g.target = g.id === id; }
  targetRing.visible = !!id;
  if (id) {
    const t = tokens.get(id) || goblins.get(id);
    if (t) { targetRing.position.set(t.group.position.x, 0.14, t.group.position.z); targetRing.visible = true; }
  }
  updateLabels();
}
function setActive(id) {
  for (const g of goblins.values()) { const r = g.group.userData.ring; if (r) { r.material.opacity = g.id === id ? 0.9 : 0.42; r.material.color.set(g.id === id ? '#ffd08a' : '#c46a4a'); } }
  for (const t of tokens.values()) t.active = t.id === id;
  for (const g of goblins.values()) g.active = g.id === id;
  activeRing.visible = !!id;
  if (id) {
    const t = tokens.get(id) || goblins.get(id);
    if (t) { activeRing.position.set(t.group.position.x, 0.14, t.group.position.z); activeRing.visible = true; }
  }
  updateLabels();
}
function setTokenMeta(id, meta = {}) {
  const t = tokens.get(id) || goblins.get(id);
  if (!t) return;
  Object.assign(t, meta);
  t.label.textContent = meta.name ?? t.label.textContent;
  updateLabels();
}
function revealGoblins(on = true) {
  for (const g of goblins.values()) { g.revealed = on; g.group.visible = mode === 'trail' && on; g.label.style.display = mode === 'trail' && on ? '' : 'none'; }
  for (const e of eyeGroups) e.visible = mode === 'intro' && introStep >= 4 && !on;
}
function selectHero(id, on) {
  const m = selectMinis.get(id);
  if (!m) return;
  m.selected = on;
  m.group.position.z = on ? 0.55 : 0;
  m.group.rotation.y = on ? 0.35 : 0.1;
  const p = PEDESTALS[SELECT_IDS.indexOf(id)];
  p.userData.ring.material.opacity = on ? 0.9 : 0;
  p.userData.light.intensity = on ? 18 : 8;
}

/* ---------------- labels / rings ---------------- */

const activeRing = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.9, 30), new THREE.MeshBasicMaterial({ color: '#d6b06a', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
activeRing.rotation.x = -Math.PI / 2; activeRing.visible = false; scene.add(activeRing);
const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.94, 30), new THREE.MeshBasicMaterial({ color: '#c46a4a', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
targetRing.rotation.x = -Math.PI / 2; targetRing.visible = false; scene.add(targetRing);

const tmpV = new THREE.Vector3();
function updateLabels() {
  if (mode !== 'trail') return;
  for (const t of [...tokens.values(), ...goblins.values()]) {
    if (!t.group.visible) { t.label.style.opacity = '0'; continue; }
    t.label.style.opacity = '1';
    tmpV.copy(t.group.position); tmpV.y += 1.75;
    if (t.side === 'enemy') tmpV.y += 0.0;
    tmpV.project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
    t.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    t.label.classList.toggle('is-active', !!t.active);
    t.label.classList.toggle('is-target', !!t.target);
  }
}
function updateLabelsOld() {}

/* ---------------- environment ---------------- */

const ENV_DEFS = {
  mist: { label: '晨雾', top: '#2a3838', bottom: '#9a9f8e', glow: '#e0caa0', glowS: 0.28, fog: '#7b8074', fogD: 0.035, sunC: '#f0e6c8', sunI: 2.6, hemiC: '#c0cfc8', hemiG: '#303a2e', hemiI: 1.25, fillI: 0.7, exp: 1.22, rain: 0.2, stars: 0 },
  rain: { label: '阴雨', top: '#1c2a2c', bottom: '#778172', glow: '#c3c9b4', glowS: 0.24, fog: '#4d5a52', fogD: 0.022, sunC: '#e3ddc4', sunI: 2.9, hemiC: '#a9beb8', hemiG: '#293228', hemiI: 1.2, fillI: 0.75, exp: 1.24, rain: 0.85, stars: 0 },
  dusk: { label: '黄昏', top: '#142234', bottom: '#a87550', glow: '#ffb36a', glowS: 0.4, fog: '#54443a', fogD: 0.018, sunC: '#ffc087', sunI: 2.4, hemiC: '#bd9a84', hemiG: '#2a211c', hemiI: 1.0, fillI: 0.75, exp: 1.22, rain: 0.12, stars: 0.15 },
  night: { label: '夜', top: '#03060d', bottom: '#101a24', glow: '#8ba8c8', glowS: 0.2, fog: '#0b1218', fogD: 0.026, sunC: '#9db6d8', sunI: 0.8, hemiC: '#6f839b', hemiG: '#151a1d', hemiI: 0.55, fillI: 0.4, exp: 1.0, rain: 0.55, stars: 0.9 },
};
function envSnapshot(def) {
  return {
    top: new THREE.Color(def.top), bottom: new THREE.Color(def.bottom), glow: new THREE.Color(def.glow),
    glowS: def.glowS, fog: new THREE.Color(def.fog), fogD: def.fogD,
    sunC: new THREE.Color(def.sunC), sunI: def.sunI, hemiC: new THREE.Color(def.hemiC), hemiG: new THREE.Color(def.hemiG),
    hemiI: def.hemiI, fillI: def.fillI, exp: def.exp, rain: def.rain, stars: def.stars,
  };
}
let envState = null;
const envKeys = ['glowS', 'fogD', 'sunI', 'hemiI', 'fillI', 'exp', 'rain', 'stars'];
const envColors = ['top', 'bottom', 'glow', 'fog', 'sunC', 'hemiC', 'hemiG'];
function applyEnv(e) {
  if (!e) return;
  skyMat.uniforms.topColor.value.copy(e.top);
  skyMat.uniforms.bottomColor.value.copy(e.bottom);
  skyMat.uniforms.glowColor.value.copy(e.glow);
  skyMat.uniforms.glowStrength.value = e.glowS;
  scene.fog.color.copy(e.fog); scene.fog.density = e.fogD;
  sun.color.copy(e.sunC); sun.intensity = e.sunI;
  hemi.color.copy(e.hemiC); hemi.groundColor.copy(e.hemiG); hemi.intensity = e.hemiI;
  fill.intensity = e.fillI;
  renderer.toneMappingExposure = e.exp;
  rainMat.opacity = 0.16 + 0.5 * e.rain;
  rain.visible = e.rain > 0.03;
  starMat.opacity = e.stars;
}
function setEnvironment(name, instant = false) {
  const def = ENV_DEFS[name] || ENV_DEFS.rain;
  const t = envSnapshot(def);
  if (!envState) { envState = { name: ENV_DEFS[name] ? name : 'rain', cur: envSnapshot(def), target: t }; applyEnv(envState.cur); return envState.name; }
  envState.name = ENV_DEFS[name] ? name : 'rain'; envState.target = t;
  if (instant) { envState.cur = envSnapshot(def); applyEnv(envState.cur); }
  return envState.name;
}
function updateEnv(dt) {
  if (!envState) return;
  const k = Math.min(1, dt * 2.2);
  for (const key of envKeys) envState.cur[key] += (envState.target[key] - envState.cur[key]) * k;
  for (const key of envColors) envState.cur[key].lerp(envState.target[key], k);
  applyEnv(envState.cur);
}
function cycleEnvironment() {
  const order = ['rain', 'mist', 'dusk', 'night'];
  const i = order.indexOf(envState?.name);
  const next = order[(i + 1) % order.length];
  setEnvironment(next);
  return next;
}
function getEnvironment() { return { name: envState?.name || 'rain', label: ENV_DEFS[envState?.name || 'rain'].label }; }

/* ---------------- VFX ---------------- */

const fxLayer = new THREE.Group();
scene.add(fxLayer);
const effects = [];
function fxMat(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
}
function burstAt(pos, color, count = 10, power = 1) {
  const g = new THREE.Group(), m = fxMat(color, 0.9), parts = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rand() * 0.04, 5, 4), m);
    p.position.copy(pos);
    const a = rand() * Math.PI * 2, e = rand() * Math.PI - Math.PI / 2;
    const v = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) * 0.9 + 0.35, Math.sin(a) * Math.cos(e)).multiplyScalar(rand(0.8, 2.2) * power);
    g.add(p); parts.push({ m: p, v });
  }
  fxLayer.add(g);
  effects.push({ kind: 'burst', t: 0, dur: 0.5 + rand() * 0.15, group: g, mat: m, parts });
}
function flashAt(pos, color, size = 3.0) {
  const sp = glowSprite(color, size, 0.9); sp.position.copy(pos); fxLayer.add(sp);
  effects.push({ kind: 'flash', t: 0, dur: 0.22, sprite: sp, size });
}
function ringAt(pos, color, size = 1, dur = 0.55) {
  const m = fxMat(color, 0.8);
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.32 * size, 0.46 * size, 28), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos.x, 0.22, pos.z); fxLayer.add(mesh);
  effects.push({ kind: 'ring', t: 0, dur, mesh, mat: m, size });
}
function slashAt(pos, color) {
  const m = fxMat(color, 0.9);
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.055, 4, 18, Math.PI * 1.2), m);
  mesh.position.copy(pos); mesh.rotation.set(Math.PI / 2, rand() * Math.PI, rand() * 0.7); mesh.scale.setScalar(0.7);
  fxLayer.add(mesh);
  effects.push({ kind: 'slash', t: 0, dur: 0.3, mesh, mat: m });
}
function projectileAt(from, to, color, size = 0.1, dur = 0.42, arc = 0.8) {
  const m = fxMat(color, 1);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), m);
  const gl = glowSprite(color, size * 8, 0.65); mesh.add(gl);
  mesh.position.copy(from); fxLayer.add(mesh);
  effects.push({ kind: 'proj', t: 0, dur, mesh, mat: m, from: from.clone(), to: to.clone(), color, arc });
}
function beamAt(from, to, color) {
  const dir = to.clone().sub(from), len = dir.length();
  if (len < 0.01) return;
  const m = fxMat(color, 0.8);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 5), m);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  fxLayer.add(mesh);
  effects.push({ kind: 'beam', t: 0, dur: 0.32, mesh, mat: m });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.t += dt; const k = Math.min(1, e.t / e.dur);
    if (e.kind === 'proj') {
      const p = e.from.clone().lerp(e.to, k); p.y += Math.sin(k * Math.PI) * e.arc;
      e.mesh.position.copy(p);
      if (k >= 1) { fxLayer.remove(e.mesh); flashAt(e.to, e.color, 2.4); burstAt(e.to, e.color, 10, 1); effects.splice(i, 1); }
    } else if (e.kind === 'burst') {
      e.mat.opacity = 0.9 * (1 - k);
      for (const p of e.parts) { p.v.y -= 0.9 * dt; p.m.position.addScaledVector(p.v, dt); }
      if (k >= 1) { fxLayer.remove(e.group); effects.splice(i, 1); }
    } else if (e.kind === 'flash') {
      e.sprite.material.opacity = 0.9 * (1 - k);
      e.sprite.scale.setScalar(e.size * (0.7 + k * 0.7));
      if (k >= 1) { fxLayer.remove(e.sprite); effects.splice(i, 1); }
    } else if (e.kind === 'ring' || e.kind === 'slash' || e.kind === 'beam') {
      e.mat.opacity = 0.85 * (1 - k);
      if (e.kind === 'ring') e.mesh.scale.setScalar(1 + k * 2.6 * e.size);
      if (e.kind === 'slash') e.mesh.scale.setScalar(0.7 + k * 1.3);
      if (k >= 1) { fxLayer.remove(e.mesh); effects.splice(i, 1); }
    }
  }
}
function startAction(id, kind) {
  const t = tokens.get(id); if (t) t.action = { t: 0, dur: 0.5, kind };
}
function updateActions(dt) {
  for (const tk of tokens.values()) {
    if (!tk.action) continue;
    const a = tk.action; a.t += dt; const k = Math.min(1, a.t / a.dur), p = Math.sin(k * Math.PI), r = tk.refs;
    if (r) {
      r.armR.upper.rotation.x = 0; r.armL.upper.rotation.x = 0; r.torso.rotation.y = 0; r.torso.rotation.x = 0; r.hip.position.y = 0.92;
      if (a.kind === 'sword') { r.armR.upper.rotation.x = -1.55 * p; r.torso.rotation.y = 0.34 * p; }
      else if (a.kind === 'bow') { r.armL.upper.rotation.x = -1.25 * p; r.armR.upper.rotation.x = -1.15 * p; r.torso.rotation.y = -0.18 * p; }
      else if (a.kind === 'fire' || a.kind === 'magic') { r.armR.upper.rotation.x = -1.7 * p; r.armL.upper.rotation.x = -0.5 * p; }
      else if (a.kind === 'hide') { r.torso.rotation.x = 0.35 * p; r.hip.position.y = 0.92 - 0.12 * p; }
      else if (a.kind === 'help' || a.kind === 'heal') { r.armR.upper.rotation.x = -1.5 * p; r.armL.upper.rotation.x = -1.2 * p; }
      else if (a.kind === 'dodge') { r.torso.rotation.z = 0.18 * p; }
    }
    if (k >= 1) {
      if (r) { r.armR.upper.rotation.x = 0; r.armL.upper.rotation.x = 0; r.torso.rotation.y = 0; r.torso.rotation.x = 0; r.torso.rotation.z = 0; r.hip.position.y = 0.92; }
      tk.action = null;
    }
  }
}
function playSkill(actorId, kind, targetId = null) {
  const a = tokens.get(actorId) || goblins.get(actorId);
  const b = tokens.get(targetId) || goblins.get(targetId) || a;
  const ap = a ? a.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)) : new THREE.Vector3();
  const bp = b ? b.group.position.clone().add(new THREE.Vector3(0, 0.75, 0)) : ap.clone();
  startAction(actorId, kind);
  switch (kind) {
    case 'sword': slashAt(bp, '#ffe0b0'); flashAt(bp, '#ffd08a', 2.8); burstAt(bp, '#ffd08a', 8, 0.8); shake(0.35); break;
    case 'bow': projectileAt(ap, bp, '#e0c99a', 0.07, 0.34, 0.35); shake(0.12); break;
    case 'fire': projectileAt(ap, bp, '#ff9a4c', 0.18, 0.5, 1.0); flashAt(bp, '#ff7a3a', 4); burstAt(bp, '#ff7a3a', 14, 1.1); shake(0.3); break;
    case 'magic': for (let i = 0; i < 3; i++) setTimeout(() => projectileAt(ap.clone().add(new THREE.Vector3((i - 1) * 0.25, 0.1 * i, 0)), bp.clone().add(new THREE.Vector3((i - 1) * 0.18, 0, 0)), '#8fdcff', 0.12, 0.38, 0.8), i * 90); flashAt(bp, '#9fe4ff', 4); burstAt(bp, '#9fe4ff', 14, 1.1); shake(0.22); break;
    case 'hide': burstAt(ap, '#8a8f95', 18, 1.2); ringAt(a.group.position, '#8fb38f', 1.2); break;
    case 'help': beamAt(ap, bp, '#e6c27a'); ringAt(b.group.position, '#e6c27a', 1.1); break;
    case 'dodge': ringAt(a.group.position, '#7f9dc9', 1.5); burstAt(ap, '#9fc8ff', 8, 0.6); break;
    case 'heal': ringAt(b.group.position, '#86c69a', 1.4); burstAt(bp, '#a8e0b0', 16, 0.8); break;
    case 'goblin': slashAt(bp, '#d05a45'); flashAt(bp, '#d05a45', 2.4); burstAt(bp, '#d05a45', 9, 0.9); shake(0.3); break;
    case 'die': burstAt(bp, '#a06a4a', 24, 1.4); ringAt(b.group.position, '#a06a4a', 1.7); break;
    default: burstAt(bp, '#d6b06a', 6, 0.5);
  }
}

/* ---------------- interaction ---------------- */

let onPick = () => {}, onPickHero = () => {}, onDice = () => {};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
function pickables() {
  const arr = [];
  for (const t of tokens.values()) if (t.group.visible) arr.push(t.group);
  for (const g of goblins.values()) if (g.group.visible) arr.push(g.group);
  if (mode === 'trail') { arr.push(tray); arr.push(...dice); }
  if (mode === 'select') for (const m of selectMinis.values()) arr.push(m.group);
  return arr;
}
function onDown(e) { down = { x: e.clientX, y: e.clientY }; }
function onUp(e) {
  if (!down) return;
  const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
  down = null;
  if (moved > 8) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables(), true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && !obj.userData.pick) obj = obj.parent;
  if (!obj) return;
  const p = obj.userData.pick;
  if (p.kind === 'hero') onPickHero(p.id);
  else if (p.kind === 'dice') { if (!rolling) onDice(); }
  else if (p.kind === 'token') onPick(p.id, 'token');
}
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointerup', onUp);

/* ---------------- animate ---------------- */

const clock = new THREE.Clock();
let last = performance.now(), shakeAmt = 0, firstFrame = true;
function shake(v = 0.3) { shakeAmt = Math.min(1, shakeAmt + v); }
function animate() {
  const now = performance.now();
  const rawDt = Math.max(0, (now - last) / 1000);
  const dt = Math.min(rawDt, 0.05);
  last = now;
  const t = clock.getElapsedTime();
  updateCam(Math.min(rawDt, 0.4));
  controls.update();
  updateEnv(dt);
  updateEffects(dt);
  updateActions(dt);
  // rain
  const rp = rainGeo.attributes.position.array;
  const rainSpeed = 6 + (envState?.cur.rain || 0.5) * 10;
  for (let i = 0; i < rainCount; i++) {
    rp[i * 3 + 1] -= dt * rainSpeed * (0.7 + (i % 7) * 0.06);
    rp[i * 3] += dt * 1.2;
    if (rp[i * 3 + 1] < 0.1) { rp[i * 3 + 1] = 14 + rand(0, 6); rp[i * 3] = rand(-22, 22); rp[i * 3 + 2] = rand(-18, 18); }
    if (rp[i * 3] > 22) rp[i * 3] = -22;
  }
  rainGeo.attributes.position.needsUpdate = true;
  // eyes
  for (const e of eyeGroups) { if (e.visible) { const k = 0.75 + Math.sin(t * 4 + e.position.x) * 0.25; e.children.forEach((c) => { if (c.material && c.material.emissiveIntensity !== undefined) c.material.emissiveIntensity = 3 * k; }); } }
  // select idle
  for (const m of selectMinis.values()) {
    m.group.position.y = 0.88 + Math.sin(t * 1.2 + SELECT_POS[SELECT_IDS.indexOf(m.id)]) * 0.012;
    if (m.selected) m.group.rotation.y += dt * 0.6;
  }
  // tokens bob
  for (const tk of [...tokens.values(), ...goblins.values()]) {
    if (!tk.group.visible) continue;
    tk.group.position.y = tk.baseY + Math.sin(t * 1.4 + tk.group.position.x) * 0.008;
  }
  if (activeRing.visible) { activeRing.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.2; activeRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04); }
  if (targetRing.visible) targetRing.material.opacity = 0.5 + Math.sin(t * 3.2) * 0.2;
  if (shakeAmt > 0.001) {
    shakeAmt = Math.max(0, shakeAmt - dt * 1.6);
    const k = shakeAmt * shakeAmt;
    canvas.style.transform = `translate(${Math.sin(t * 41) * k * 12}px, ${Math.sin(t * 53) * k * 7}px)`;
  } else if (canvas.style.transform) canvas.style.transform = '';
  if (rolling) {
    rolling.t += Math.min(rawDt, 0.4);
    const k = Math.min(1, rolling.t / rolling.dur);
    const e = 1 - Math.pow(1 - k, 3);
    for (let i = 0; i < rolling.count; i++) {
      const s = rolling.start[i];
      dice[i].position.x = s.x + (tray.position.x - s.x) * e;
      dice[i].position.z = s.z + (tray.position.z - s.z) * e;
      dice[i].position.y = s.y + Math.sin(e * Math.PI) * 1.2 + (TRAY_TOP + 0.3 - s.y) * e;
      dice[i].rotation.x += dt * (5 + i * 2);
      dice[i].rotation.z += dt * 4;
    }
    if (k >= 1) finishRoll();
  }
  updateLabels();
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; setTimeout(() => document.getElementById('loader')?.classList.add('is-done'), 280); }
}
function loop() { animate(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  const h = HOME(mode); camera.fov = h.fov; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- API ---------------- */

function resetCamera() {
  const h = HOME(mode); camera.fov = h.fov; camera.updateProjectionMatrix();
  tweenCamera(h.pos.clone(), h.target.clone(), 0.9);
}
function floatAt(id, text, cls = '') {
  const t = tokens.get(id) || goblins.get(id);
  if (!t) return;
  const v = t.group.position.clone(); v.y += 2.0; v.project(camera);
  const el = document.createElement('div');
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  tagLayer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

setEnvironment('rain', true);
setMode('intro');
setIntroStep(0);

export function createWorld(opts = {}) {
  onPick = opts.onPick || (() => {});
  onPickHero = opts.onPickHero || (() => {});
  onDice = opts.onDice || (() => {});
  return {
    scene, camera, controls, tokens, goblins, dice, tray,
    setMode, setIntroStep, setSelected, selectHero, setVisibility, placeTrailParty,
    setTokenMeta, setActive, setTarget, revealGoblins,
    roll, scatterDice, shake, floatAt, playSkill, resetCamera,
    setEnvironment, cycleEnvironment, getEnvironment,
    get mode() { return mode; },
    get selected() { return selected.slice(); },
    get introStep() { return introStep; },
    faceFor,
  };
}
