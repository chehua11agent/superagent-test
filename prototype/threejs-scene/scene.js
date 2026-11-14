import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

/* ------------------------------------------------------------------ *
 * 雾港 · 三维小样
 * 一个无构建的 three.js 场景切片：地图、建筑、人物、道具全部程序化建模。
 * ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const GREYBOX = params.get('greybox') === '1';
const STILL = params.get('still') === '1';
const MOBILE = Math.min(window.innerWidth, window.innerHeight) < 560;

const webgl2 = (() => {
  try {
    const probe = document.createElement('canvas');
    return !!probe.getContext('webgl2');
  } catch (e) {
    return false;
  }
})();

if (!webgl2) {
  $('loader').hidden = true;
  $('fallback').hidden = false;
  throw new Error('WebGL 2 unavailable');
}

/* ------------------------------------------------------------------ *
 * Renderer / camera / controls
 * ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.6 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#4a3d46', 0.016);

const HOMES = {
  landscape: {
    pos: new THREE.Vector3(21.5, 14.4, 27.5),
    target: new THREE.Vector3(-0.4, 2.0, 0.8),
    fov: 42,
  },
  portrait: {
    pos: new THREE.Vector3(26, 17, 34),
    target: new THREE.Vector3(-1.5, 2.8, 0.8),
    fov: 50,
  },
};
const isPortrait = () => window.innerHeight > window.innerWidth * 1.12;
const homeConfig = () => (isPortrait() ? HOMES.portrait : HOMES.landscape);
const HOME = homeConfig();
const camera = new THREE.PerspectiveCamera(HOME.fov, window.innerWidth / window.innerHeight, 0.1, 3200);
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.6;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 58;
controls.minPolarAngle = 0.14;
controls.maxPolarAngle = Math.PI * 0.485;
controls.autoRotateSpeed = 0.42;
controls.update();

/* ------------------------------------------------------------------ *
 * Materials / small helpers
 * ------------------------------------------------------------------ */

const MATS = new Map();
const warmMats = [];
function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.02,
    flatShading: opts.flat ?? true,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
  if (opts.emissive === '#ff9d4d') warmMats.push(m);
  MATS.set(key, m);
  return m;
}

function mesh(geo, material, p = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(p.x || 0, p.y || 0, p.z || 0);
  m.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  m.scale.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
  m.castShadow = p.cast ?? true;
  m.receiveShadow = p.receive ?? true;
  return m;
}

function box(w, h, d, material, p = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, p);
}

function cyl(rt, rb, h, seg, material, p = {}) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, p);
}

function cone(r, h, seg, material, p = {}) {
  return mesh(new THREE.ConeGeometry(r, h, seg), material, p);
}

function sph(r, material, p = {}) {
  return mesh(new THREE.SphereGeometry(r, p.ws || 9, p.hs || 7), material, p);
}

function beamBetween(a, b, thick, material, depth = thick) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, depth), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261114);

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

const RADIAL = canvasTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

const SMOKE = canvasTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

const glowSprites = [];
function glowSprite(color, scale, opacity) {
  const m = new THREE.SpriteMaterial({
    map: RADIAL,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  m.userData.baseOpacity = opacity;
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  s.userData.isFx = true;
  glowSprites.push(s);
  return s;
}

/* ------------------------------------------------------------------ *
 * Sky, stars, celestial body
 * ------------------------------------------------------------------ */

const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color('#1b2742') },
    bottomColor: { value: new THREE.Color('#c1715b') },
    glowColor: { value: new THREE.Color('#ffb877') },
    glowStrength: { value: 0.5 },
    exponent: { value: 0.85 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform vec3 glowColor;
    uniform float glowStrength;
    uniform float exponent;
    varying vec3 vWorld;
    void main() {
      vec3 dir = normalize(vWorld - cameraPosition);
      float up = max(dir.y, 0.0);
      vec3 sky = mix(bottomColor, topColor, pow(up, exponent));
      float glow = exp(-abs(dir.y) * 9.0);
      sky = mix(sky, glowColor, glow * glowStrength);
      gl_FragColor = vec4(sky, 1.0);
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 18), skyMat);
sky.renderOrder = -10;
sky.userData.noGreybox = true;
scene.add(sky);

// stars
const starPositions = [];
for (let i = 0; i < 900; i++) {
  const a = rand() * Math.PI * 2;
  const y = 0.08 + rand() * 0.9;
  const r = Math.sqrt(1 - y * y);
  starPositions.push(Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
  color: '#d8e6ff',
  size: 1.6,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  fog: false,
  toneMapped: false,
});
const stars = new THREE.Points(starGeo, starMat);
stars.renderOrder = -9;
scene.add(stars);

const celestial = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: RADIAL,
    color: '#ffb877',
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  })
);
celestial.scale.setScalar(74);
celestial.position.set(-70, 30, -260);
celestial.userData.isFx = true;
scene.add(celestial);

/* ------------------------------------------------------------------ *
 * Lights
 * ------------------------------------------------------------------ */

const hemi = new THREE.HemisphereLight('#8397bd', '#2e2824', 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight('#ff9f5e', 3.1);
sun.position.set(-38, 18, -42);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
sun.shadow.camera.left = -32;
sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32;
sun.shadow.camera.bottom = -32;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 140;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight('#8fa9c9', 0.8);
fill.position.set(28, 18, 30);
scene.add(fill);

/* ------------------------------------------------------------------ *
 * Water
 * ------------------------------------------------------------------ */

// radial sea disc: dense rings near the harbour, fog swallows the far edge
const waterGeo = (() => {
  const radius = 900;
  const rings = MOBILE ? 40 : 56;
  const segs = MOBILE ? 88 : 128;
  const positions = [0, 0, 0];
  const indices = [];
  for (let i = 1; i <= rings; i++) {
    const r = 0.6 + radius * Math.pow(i / rings, 2.55);
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  const ringStart = (i) => 1 + (i - 1) * segs;
  for (let j = 0; j < segs; j++) {
    indices.push(0, 1 + ((j + 1) % segs), 1 + j);
  }
  for (let i = 1; i < rings; i++) {
    const a0 = ringStart(i);
    const a1 = ringStart(i + 1);
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      indices.push(a0 + j, a1 + j1, a1 + j);
      indices.push(a0 + j, a0 + j1, a1 + j1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
})();
const waterBase = new Float32Array(waterGeo.attributes.position.array);
const waterMat = new THREE.MeshStandardMaterial({
  color: '#2f6b74',
  emissive: '#173a45',
  emissiveIntensity: 0.95,
  roughness: 0.52,
  metalness: 0.0,
  flatShading: false,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = -0.55;
// keep the sea out of the shadow map: the island's long dusk shadow would
// otherwise black out the whole backdrop
water.receiveShadow = false;
water.userData.noPick = true;
scene.add(water);


const foamMat = new THREE.MeshBasicMaterial({
  color: '#cfe8e2',
  transparent: true,
  opacity: 0.1,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const foam = new THREE.Mesh(new THREE.RingGeometry(14.7, 16.3, 40), foamMat);
foam.rotation.x = -Math.PI / 2;
foam.position.y = -0.47;
foam.userData.isFx = true;
scene.add(foam);

/* ------------------------------------------------------------------ *
 * Pick registry
 * ------------------------------------------------------------------ */

const picks = [];
const PICKED = new Set();

function countTris(group) {
  let n = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (!g) return;
    const base = g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
    n += base * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}

// effects such as the lighthouse beam are huge; keep them out of the
// framing box so "focus" and the selection ring use the actual model bounds
function pickBounds(group) {
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  group.traverse((o) => {
    if (!o.isMesh || o.userData.isFx) return;
    part.setFromObject(o);
    box.union(part);
  });
  return box;
}

function addPick(group, info) {
  const tri = countTris(group);
  const entry = { ...info, group, tri };
  picks.push(entry);
  PICKED.add(group);
  group.traverse((o) => {
    if (o.isMesh && !o.userData.pickKey) o.userData.pickKey = info.key;
  });
  return entry;
}

/* ------------------------------------------------------------------ *
 * Island / terrain
 * ------------------------------------------------------------------ */

function freeSpot(x, z, pad = 0) {
  const r = Math.hypot(x, z);
  if (r > 13.6 - pad) return false;
  const blocked = [
    [-3.6, -7.2, 5.2, 4.4], // inn
    [-11.5, -3.0, 3.4, 3.4], // lighthouse
    [-9.0, 6.8, 3.2, 2.6], // stall
    [4.6, 18.0, 2.6, 8.0], // pier
    [9.2, 5.2, 3.0, 3.0], // campfire
    [2.0, 12.6, 1.8, 1.8], // signpost
    [1.6, 10.4, 1.6, 1.6], // lantern post
    [-0.6, 4.6, 1.6, 1.6], // lantern post
    [-3.4, -3.4, 2.2, 2.2], // inn front
  ];
  for (const [bx, bz, hx, hz] of blocked) {
    if (Math.abs(x - bx) < hx + pad && Math.abs(z - bz) < hz + pad) return false;
  }
  return true;
}

function buildIsland() {
  const group = new THREE.Group();

  const geo = new THREE.CylinderGeometry(15.2, 18.8, 6.8, 20, 3);
  geo.translate(0, -3.4, 0);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 0.001) {
      const a = Math.atan2(v.z, v.x);
      const k = 1 + 0.04 * Math.sin(a * 3 + 1.2) + 0.028 * Math.sin(a * 7 - 0.6);
      v.x *= k;
      v.z *= k;
      if (v.y > 3.0) v.y = 0.16 + 0.1 * Math.sin(a * 2.4 + 0.7);
      else if (v.y > 2.7) v.y += 0.04;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const island = new THREE.Mesh(geo, [
    mat('#495058'),
    mat('#55704e'),
    mat('#333840'),
  ]);
  island.castShadow = true;
  island.receiveShadow = true;
  group.add(island);

  // warm sand shelf around the landing
  const sand = new THREE.Mesh(new THREE.CircleGeometry(3.4, 9), mat('#77684f'));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(4.4, 0.2, 12.2);
  sand.receiveShadow = true;
  group.add(sand);

  // stepping-stone path: pier -> inn
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2, 0, 11.6),
    new THREE.Vector3(2.6, 0, 9.2),
    new THREE.Vector3(1.2, 0, 6.2),
    new THREE.Vector3(-0.6, 0, 3.6),
    new THREE.Vector3(-2.5, 0, 1.4),
    new THREE.Vector3(-3.2, 0, -2.2),
  ]);
  const stoneMats = [mat('#84745a'), mat('#8d7d61'), mat('#76674f')];
  for (let i = 0; i < 22; i++) {
    const p = path.getPoint(i / 21);
    const rr = 0.5 + rand() * 0.25;
    const st = mesh(
      new THREE.CylinderGeometry(rr, rr * 1.02, 0.1, 6),
      stoneMats[i % 3],
      { x: p.x + (rand() - 0.5) * 0.4, y: 0.22, z: p.z + (rand() - 0.5) * 0.4, ry: rand() * 3 }
    );
    st.receiveShadow = true;
    st.castShadow = false;
    group.add(st);
  }

  // grass tufts (instanced)
  const tuftGeo = new THREE.ConeGeometry(0.1, 0.38, 4);
  tuftGeo.translate(0, 0.19, 0);
  const tufts = new THREE.InstancedMesh(tuftGeo, mat('#4e6a49'), 90);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < 90 && guard++ < 800) {
    const a = rand() * Math.PI * 2;
    const r = 2.6 + rand() * 11.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!freeSpot(x, z, 0.2)) continue;
    dummy.position.set(x, 0.18, z);
    dummy.rotation.y = rand() * Math.PI;
    const s = 0.7 + rand() * 1.1;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    tufts.setMatrixAt(placed++, dummy.matrix);
  }
  tufts.count = placed;
  tufts.castShadow = false;
  tufts.receiveShadow = true;
  group.add(tufts);

  // shore rocks
  const rockMat = mat('#4a4d53');
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const r = 13.2 + rand() * 2.4;
    const s = 0.35 + rand() * 0.9;
    group.add(
      mesh(new THREE.DodecahedronGeometry(s, 0), rockMat, {
        x: Math.cos(a) * r,
        y: 0.15 + rand() * 0.1,
        z: Math.sin(a) * r,
        sy: 0.65,
        ry: rand() * 3,
      })
    );
  }

  // low bushes
  const bushMat = mat('#37503c');
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 5.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (!freeSpot(x, z, 1)) continue;
    group.add(mesh(new THREE.IcosahedronGeometry(0.5 + rand() * 0.45, 0), bushMat, {
      x, y: 0.34, z, sy: 0.7, ry: rand() * 3,
    }));
  }

  return group;
}

/* ------------------------------------------------------------------ *
 * Pier / boat
 * ------------------------------------------------------------------ */

function buildPier() {
  const group = new THREE.Group();
  const woodA = mat('#6d4c34');
  const woodB = mat('#5c3f2a');
  const woodDark = mat('#463022');
  const ropeMat = mat('#9a8363', { roughness: 1 });

  for (let i = 0; i < 14; i++) {
    const z = 11.4 + i * 0.94;
    group.add(box(3.7, 0.16, 0.86, i % 2 ? woodA : woodB, {
      x: 4.6 + (rand() - 0.5) * 0.06,
      y: 0.56,
      z,
      ry: (rand() - 0.5) * 0.025,
    }));
  }
  // stringers
  group.add(box(0.2, 0.24, 13.4, woodDark, { x: 3.3, y: 0.4, z: 18.1 }));
  group.add(box(0.2, 0.24, 13.4, woodDark, { x: 5.9, y: 0.4, z: 18.1 }));

  // piles
  for (const z of [11.8, 15.2, 18.6, 22.0, 24.7]) {
    for (const x of [3.15, 6.05]) {
      group.add(cyl(0.14, 0.17, 2.9, 7, woodDark, { x, y: -0.55, z }));
    }
  }

  // rail posts + sagging rope on the sea side
  const railZ = [12.1, 14.7, 17.3, 19.9, 22.5, 24.6];
  for (const z of railZ) {
    group.add(cyl(0.075, 0.09, 0.9, 6, woodDark, { x: 3.05, y: 1.02, z }));
  }
  const ropeCurve = new THREE.CatmullRomCurve3(
    railZ.map((z, i) => new THREE.Vector3(3.05, 1.38 - (i % 2 ? 0.11 : 0), z))
  );
  const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 26, 0.028, 4, false), ropeMat);
  rope.castShadow = true;
  group.add(rope);

  // bollard at the end
  group.add(cyl(0.24, 0.28, 0.7, 8, woodDark, { x: 5.9, y: 0.95, z: 24.1 }));
  group.add(sph(0.26, woodDark, { x: 5.9, y: 1.3, z: 24.1, sy: 0.5 }));

  // a hanging lantern on the last pile
  const lantern = new THREE.Group();
  lantern.position.set(6.15, 2.15, 24.55);
  lantern.add(cyl(0.02, 0.02, 0.5, 5, woodDark, { y: 0.35 }));
  const cage = new THREE.Group();
  cage.position.y = 0;
  cage.add(box(0.3, 0.36, 0.3, mat('#2e2a25'), { cast: true }));
  cage.add(box(0.2, 0.26, 0.2, mat('#ffd49a', { emissive: '#ffb35c', emissiveIntensity: 3 }), { cast: false }));
  cage.add(cone(0.26, 0.16, 4, mat('#2e2a25'), { y: 0.26 }));
  lantern.add(cage);
  lantern.add(glowSprite('#ffbd73', 1.5, 0.55));
  group.add(lantern);
  const pierLight = new THREE.PointLight('#ffbd73', 8, 9, 2);
  pierLight.position.set(6.15, 2.1, 24.5);
  group.add(pierLight);
  lanternLights.push({ light: pierLight, base: 8, phase: 2.1 });

  return group;
}

const lanternLights = [];

/* ------------------------------------------------------------------ *
 * Inn
 * ------------------------------------------------------------------ */

function buildInn() {
  const group = new THREE.Group();
  group.position.set(-3.6, 0, -7.2);
  group.rotation.y = 0.22;

  const stone = mat('#5a5751');
  const plaster = mat('#9c886e');
  const timber = mat('#3a2a20');
  const roofMat = mat('#583630');
  const gold = mat('#c1913f', { metalness: 0.35, roughness: 0.5 });

  group.add(box(7.6, 1.0, 5.8, stone, { y: 0.5 }));
  group.add(box(7.0, 2.9, 5.2, plaster, { y: 2.45 }));

  // timber framing
  for (const x of [-3.4, 3.4]) {
    for (const z of [-2.5, 2.5]) {
      group.add(box(0.18, 3.0, 0.18, timber, { x, y: 2.45, z }));
    }
  }
  for (const y of [1.06, 3.86]) {
    group.add(box(7.1, 0.16, 0.14, timber, { y, z: 2.56 }));
    group.add(box(7.1, 0.16, 0.14, timber, { y, z: -2.56 }));
  }
  // diagonal braces on the front
  group.add(beamBetween(new THREE.Vector3(-3.3, 1.1, 2.58), new THREE.Vector3(-1.4, 3.8, 2.58), 0.13, timber));
  group.add(beamBetween(new THREE.Vector3(3.3, 1.1, 2.58), new THREE.Vector3(1.6, 3.8, 2.58), 0.13, timber));

  // gable triangles
  const triShape = new THREE.Shape();
  triShape.moveTo(-3.5, 0);
  triShape.lineTo(3.5, 0);
  triShape.lineTo(0, 2.05);
  triShape.closePath();
  const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.16, bevelEnabled: false });
  for (const x of [-3.42, 3.42]) {
    const tri = new THREE.Mesh(triGeo, [plaster, plaster]);
    tri.position.set(x, 3.9, -2.58);
    tri.rotation.y = Math.PI / 2;
    tri.castShadow = true;
    tri.receiveShadow = true;
    group.add(tri);
  }

  // roof
  group.add(box(7.9, 0.26, 3.95, roofMat, { y: 4.84, z: 1.48, rx: 0.66 }));
  group.add(box(7.9, 0.26, 3.95, roofMat, { y: 4.84, z: -1.48, rx: -0.66 }));
  group.add(cyl(0.15, 0.15, 7.95, 6, mat('#402620'), { rx: 0, rz: Math.PI / 2, y: 6.09, z: 0 }));
  // roof edge trim
  group.add(box(7.95, 0.14, 0.14, mat('#3d241f'), { y: 4.3, z: 3.35 }));
  group.add(box(7.95, 0.14, 0.14, mat('#3d241f'), { y: 4.3, z: -3.35 }));

  // chimney
  group.add(box(0.85, 3.2, 0.85, stone, { x: 2.1, y: 6.4, z: -1.5 }));
  group.add(box(1.0, 0.2, 1.0, mat('#4d4a45'), { x: 2.1, y: 8.05, z: -1.5 }));

  // door
  group.add(box(1.25, 2.1, 0.16, mat('#33231a'), { y: 2.05, z: 2.62 }));
  group.add(box(0.1, 2.2, 0.2, timber, { x: -0.66, y: 2.05, z: 2.66 }));
  group.add(box(0.1, 2.2, 0.2, timber, { x: 0.66, y: 2.05, z: 2.66 }));
  group.add(box(1.5, 0.14, 0.2, timber, { y: 3.12, z: 2.66 }));
  // steps
  group.add(box(2.0, 0.34, 0.85, stone, { y: 0.32, z: 3.1 }));
  group.add(box(1.7, 0.3, 0.6, stone, { y: 0.62, z: 2.85 }));

  // windows
  const windowMat = mat('#ffbf7a', { emissive: '#ff9d4d', emissiveIntensity: 2.6, roughness: 0.5 });
  for (const x of [-2.0, 2.25]) {
    group.add(box(0.94, 1.06, 0.1, mat('#2c2018'), { x, y: 2.6, z: 2.61 }));
    group.add(box(0.8, 0.92, 0.07, windowMat, { x, y: 2.6, z: 2.67, cast: false }));
    group.add(box(0.06, 0.96, 0.09, timber, { x, y: 2.6, z: 2.7 }));
    group.add(box(0.86, 0.06, 0.09, timber, { x, y: 2.6, z: 2.7 }));
  }

  // side window
  group.add(box(0.1, 0.95, 0.85, mat('#2c2018'), { x: -3.5, y: 2.55, z: -0.9 }));
  group.add(box(0.07, 0.8, 0.7, windowMat, { x: -3.56, y: 2.55, z: -0.9, cast: false }));

  // hanging sign
  group.add(box(1.1, 0.08, 0.08, timber, { x: -2.4, y: 3.55, z: 2.95 }));
  group.add(cyl(0.025, 0.025, 0.55, 5, mat('#2a2a2a'), { x: -2.85, y: 3.28, z: 2.95 }));
  const signTex = canvasTexture(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#3b2a20';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c1913f';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#e3b978';
    ctx.textAlign = 'center';
    ctx.font = '600 52px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText('雾 灯', w / 2, 88);
    ctx.font = '500 24px Georgia, serif';
    ctx.fillStyle = '#d8c9ae';
    ctx.fillText('THE FOG LAMP', w / 2, 132);
  });
  const sign = box(0.92, 0.7, 0.06, mat('#5b3d2a'), { x: -2.85, y: 2.85, z: 2.95 });
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.64),
    new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })
  );
  signFace.position.set(-2.85, 2.85, 2.99);
  group.add(sign, signFace);

  // door lantern
  group.add(box(0.28, 0.34, 0.28, mat('#2e2a25'), { x: -1.2, y: 2.95, z: 3.0 }));
  group.add(box(0.18, 0.24, 0.18, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3.2 }), {
    x: -1.2, y: 2.95, z: 3.0, cast: false,
  }));
  const doorGlow = glowSprite('#ffb45e', 2.6, 0.5);
  doorGlow.position.set(-1.2, 2.95, 3.1);
  group.add(doorGlow);

  const doorLight = new THREE.PointLight('#ffb45e', 14, 12, 2);
  doorLight.position.set(-1.2, 2.8, 3.5);
  group.add(doorLight);
  lanternLights.push({ light: doorLight, base: 14, phase: 0.4 });

  // smoke anchor
  const smokeAnchor = new THREE.Object3D();
  smokeAnchor.position.set(2.1, 8.2, -1.5);
  group.add(smokeAnchor);
  group.userData.smokeAnchor = smokeAnchor;

  return group;
}

/* ------------------------------------------------------------------ *
 * Lighthouse
 * ------------------------------------------------------------------ */

let beaconGroup = null;
let beaconMat = null;

function buildLighthouse() {
  const group = new THREE.Group();
  group.position.set(-11.5, 0, -3.0);

  const stone = mat('#b6ad9b');
  const red = mat('#6e3732');
  const dark = mat('#2f3037');

  group.add(cyl(2.7, 3.3, 1.2, 9, mat('#4b4c50'), { y: 0.6 }));
  group.add(cyl(2.25, 2.65, 0.7, 9, mat('#5b5750'), { y: 1.4 }));

  group.add(cyl(1.28, 1.95, 8.4, 10, stone, { y: 5.45 }));
  // painted bands
  group.add(cyl(1.74, 1.79, 0.5, 10, red, { y: 3.2 }));
  group.add(cyl(1.5, 1.55, 0.5, 10, red, { y: 6.2 }));

  // door + window
  group.add(box(0.9, 1.7, 0.16, dark, { y: 2.55, z: 1.86 }));
  group.add(box(0.06, 1.75, 0.18, red, { y: 2.55, z: 1.9 }));
  group.add(box(0.55, 0.75, 0.1, mat('#ffcf8a', { emissive: '#ffb35c', emissiveIntensity: 2.2 }), {
    y: 5.1, z: 1.63, cast: false,
  }));

  // gallery
  group.add(cyl(2.0, 2.0, 0.22, 12, dark, { y: 9.75 }));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    group.add(cyl(0.045, 0.05, 0.72, 5, dark, {
      x: Math.cos(a) * 1.87,
      y: 10.2,
      z: Math.sin(a) * 1.87,
    }));
  }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.87, 0.045, 5, 28), dark);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 10.56;
  rail.castShadow = true;
  group.add(rail);

  // lamp room
  const lampGlass = mat('#ffd9a6', {
    emissive: '#ffbf6c',
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.9,
    roughness: 0.25,
  });
  group.add(cyl(1.08, 1.08, 1.55, 10, lampGlass, { y: 10.7, cast: false }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    group.add(box(0.07, 1.65, 0.07, dark, {
      x: Math.cos(a) * 1.06,
      y: 10.7,
      z: Math.sin(a) * 1.06,
    }));
  }
  group.add(cyl(1.2, 1.2, 0.18, 10, dark, { y: 11.52 }));
  group.add(cone(1.38, 1.15, 10, mat('#3a3b42'), { y: 12.15 }));
  group.add(sph(0.14, mat('#c1913f', { metalness: 0.5, roughness: 0.4 }), { y: 12.82 }));

  const lampGlow = glowSprite('#ffcf8a', 8.5, 0.55);
  lampGlow.position.y = 10.7;
  group.add(lampGlow);

  const lampLight = new THREE.PointLight('#ffcf8a', 40, 34, 2);
  lampLight.position.y = 10.7;
  group.add(lampLight);
  lanternLights.push({ light: lampLight, base: 40, phase: 1.7, steady: true });

  // rotating beam
  const beam = new THREE.Group();
  beam.position.y = 10.7;
  const beamTex = canvasTexture(16, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#ffd9a6',
    map: beamTex,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const beamMesh = new THREE.Mesh(new THREE.ConeGeometry(3.0, 34, 12, 1, true), beamMat);
  beamMesh.userData.isFx = true;
  beamMesh.rotation.z = Math.PI / 2;
  beamMesh.position.x = 17;
  beamMesh.raycast = () => {};
  beam.add(beamMesh);

  const spot = new THREE.SpotLight('#ffd9a6', 55, 62, 0.2, 0.85, 1.4);
  spot.position.set(0, 0, 0);
  spot.target.position.set(34, -1.4, 0);
  spot.castShadow = false;
  beam.add(spot, spot.target);
  group.add(beam);
  beaconGroup = beam;
  beaconMat = beamMat;

  return group;
}

/* ------------------------------------------------------------------ *
 * Fish stall
 * ------------------------------------------------------------------ */

function buildStall() {
  const group = new THREE.Group();
  group.position.set(-9.0, 0, 6.8);
  group.rotation.y = 0.42;

  const wood = mat('#6a4a33');
  const woodDark = mat('#463022');
  const canvasTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e7dcc4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#9a4338';
    for (let i = 0; i < 8; i += 2) ctx.fillRect((i * w) / 8, 0, w / 8, h);
    ctx.fillStyle = 'rgba(40,30,20,0.12)';
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 8);
  });
  canvasTex.wrapS = canvasTex.wrapT = THREE.RepeatWrapping;
  canvasTex.repeat.set(1.4, 1);
  const awningMat = new THREE.MeshStandardMaterial({ map: canvasTex, roughness: 0.95, side: THREE.DoubleSide });

  for (const x of [-1.75, 1.75]) {
    for (const z of [-1.15, 1.15]) {
      group.add(cyl(0.07, 0.08, 2.5, 6, woodDark, { x, y: 1.35, z }));
    }
  }
  group.add(box(3.7, 0.2, 1.4, wood, { y: 1.42 }));
  group.add(box(3.7, 0.85, 0.15, woodDark, { y: 0.98, z: 0.64 }));
  group.add(box(3.7, 0.55, 0.1, wood, { y: 1.15, z: 0.7 }));
  group.add(box(4.0, 0.1, 2.9, awningMat, { y: 2.55, z: 0.05, rx: 0.12 }));
  // awning valance
  for (let i = 0; i < 6; i++) {
    group.add(cone(0.22, 0.34, 4, i % 2 ? mat('#9a4338') : mat('#e7dcc4'), {
      x: -1.55 + i * 0.62,
      y: 2.4,
      z: 1.42,
      rx: Math.PI,
      cast: false,
    }));
  }
  // fish on the counter
  const fishMat = mat('#b9c2c3', { metalness: 0.35, roughness: 0.4 });
  const fishPink = mat('#c98d80', { metalness: 0.2, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const fish = new THREE.Group();
    const body = sph(0.16, i % 2 ? fishMat : fishPink, { sx: 1.9, sy: 0.55, sz: 0.8 });
    fish.add(body);
    fish.add(cone(0.09, 0.16, 4, i % 2 ? fishMat : fishPink, { x: 0.34, rz: -Math.PI / 2, sx: 1, sy: 1, sz: 0.4 }));
    fish.position.set(-1.4 + i * 0.62, 1.57, 0.08 + (rand() - 0.5) * 0.25);
    fish.rotation.y = (rand() - 0.5) * 0.5;
    group.add(fish);
  }
  // fish crates
  group.add(box(0.9, 0.4, 0.6, woodDark, { x: 1.15, y: 0.38, z: 1.55 }));
  group.add(box(0.9, 0.4, 0.6, woodDark, { x: 0.25, y: 0.38, z: 1.55 }));
  group.add(cyl(0.24, 0.3, 0.36, 8, mat('#8a6a43'), { x: -1.35, y: 0.35, z: 1.6 }));
  // hanging lantern
  group.add(cyl(0.02, 0.02, 0.4, 5, woodDark, { x: -1.6, y: 2.28, z: 1.05 }));
  group.add(box(0.26, 0.3, 0.26, mat('#2e2a25'), { x: -1.6, y: 2.0, z: 1.05 }));
  group.add(box(0.16, 0.2, 0.16, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3 }), {
    x: -1.6, y: 2.0, z: 1.05, cast: false,
  }));
  const stallLight = new THREE.PointLight('#ffb45e', 10, 9, 2);
  stallLight.position.set(-1.6, 1.95, 1.4);
  group.add(stallLight);
  lanternLights.push({ light: stallLight, base: 10, phase: 3.1 });

  return group;
}

/* ------------------------------------------------------------------ *
 * Props
 * ------------------------------------------------------------------ */

function makeBarrel(scale = 1) {
  const g = new THREE.Group();
  const wood = mat('#6b4a32');
  const dark = mat('#3f3a34', { metalness: 0.35, roughness: 0.6 });
  g.add(cyl(0.44 * scale, 0.4 * scale, 0.95 * scale, 10, wood, { y: 0.48 * scale }));
  const mid = cyl(0.48 * scale, 0.48 * scale, 0.5 * scale, 10, wood, { y: 0.48 * scale });
  mid.scale.set(1, 0.9, 1);
  g.add(mid);
  for (const y of [0.16, 0.48, 0.8]) {
    g.add(cyl(0.47 * scale, 0.47 * scale, 0.07 * scale, 10, dark, { y: y * scale }));
  }
  g.add(cyl(0.4 * scale, 0.4 * scale, 0.03, 10, wood, { y: 0.96 * scale }));
  return g;
}

function buildBarrels() {
  const g = new THREE.Group();
  const a = makeBarrel(1);
  a.position.set(-1.2, 0, 0.3);
  const b = makeBarrel(0.8);
  b.position.set(0.1, 0, -0.4);
  const c = makeBarrel(0.9);
  c.position.set(0.9, 0, 0.5);
  c.rotation.y = 0.5;
  g.add(a, b, c);
  // one lying on its side
  const d = makeBarrel(0.75);
  d.rotation.z = Math.PI / 2;
  d.position.set(2.0, 0.35, -0.2);
  g.add(d);
  return g;
}

function buildCrates() {
  const g = new THREE.Group();
  const wood = mat('#77553a');
  const trim = mat('#4a3222');
  function crate(s = 1) {
    const c = new THREE.Group();
    const w = 0.9 * s;
    c.add(box(w, w, w, wood, { y: w / 2 }));
    for (const [x, z] of [[w / 2, 0], [-w / 2, 0], [0, w / 2], [0, -w / 2]]) {
      c.add(box(0.07, w + 0.02, 0.07, trim, { x, y: w / 2, z }));
    }
    c.add(box(w + 0.04, 0.07, 0.07, trim, { y: w * 0.22 }));
    c.add(box(w + 0.04, 0.07, 0.07, trim, { y: w * 0.78 }));
    return c;
  }
  const c1 = crate(1);
  const c2 = crate(0.86);
  c1.position.set(0, 0, 0);
  c2.position.set(0.12, 1, 0.06);
  c2.rotation.y = 0.3;
  const c3 = crate(0.95);
  c3.position.set(1.15, 0, 0.55);
  c3.rotation.y = -0.18;
  const c4 = crate(0.75);
  c4.position.set(1.2, 0.62, 1.35);
  c4.rotation.y = 0.6;
  g.add(c1, c2, c3, c4);
  return g;
}

function buildChest() {
  const g = new THREE.Group();
  const wood = mat('#5c3d28');
  const metal = mat('#3b3b40', { metalness: 0.55, roughness: 0.45 });
  const gold = mat('#c1913f', { metalness: 0.6, roughness: 0.35 });
  g.add(box(1.15, 0.62, 0.72, wood, { y: 0.31 }));
  const lid = box(1.15, 0.18, 0.72, wood, { y: 0.76, rx: -0.18, z: 0.02 });
  g.add(lid);
  for (const x of [-0.43, 0.43]) {
    g.add(box(0.1, 0.72, 0.76, metal, { x, y: 0.38 }));
    g.add(box(0.1, 0.2, 0.76, metal, { x, y: 0.79 }));
  }
  g.add(box(0.22, 0.24, 0.06, gold, { y: 0.47, z: 0.38 }));
  g.add(box(0.12, 0.06, 0.3, metal, { y: 0.47, z: 0.38 }));
  return g;
}

function buildLanternPosts() {
  const g = new THREE.Group();
  const dark = mat('#35302a');
  const positions = [
    [1.6, 10.4],
    [-0.6, 4.6],
  ];
  for (const [x, z] of positions) {
    g.add(cyl(0.085, 0.11, 2.7, 7, dark, { x, y: 1.35, z }));
    g.add(box(0.08, 0.08, 0.62, dark, { x, y: 2.6, z: z + 0.01, ry: 0, rx: 0, rz: 0, sx: 1 }));
    g.add(cyl(0.02, 0.02, 0.28, 5, dark, { x, y: 2.48, z: z + 0.3 }));
    const cage = new THREE.Group();
    cage.position.set(x, 2.25, z + 0.3);
    cage.add(box(0.24, 0.3, 0.24, dark, {}));
    cage.add(box(0.15, 0.2, 0.15, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3.2 }), { cast: false }));
    cage.add(cone(0.2, 0.14, 4, dark, { y: 0.2 }));
    g.add(cage);
    const glow = glowSprite('#ffb45e', 1.6, 0.45);
    glow.position.set(x, 2.25, z + 0.3);
    g.add(glow);
    const light = new THREE.PointLight('#ffb45e', 8, 8, 2);
    light.position.set(x, 2.2, z + 0.4);
    g.add(light);
    lanternLights.push({ light, base: 8, phase: x + z });
  }
  return g;
}

function buildSignpost() {
  const g = new THREE.Group();
  const wood = mat('#5e4330');
  const dark = mat('#3b2a20');
  g.add(cyl(0.09, 0.12, 2.1, 7, dark, { y: 1.05 }));
  const tex = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b4b32';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#33251a';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = 'rgba(38,26,18,0.35)';
    for (let i = 0; i < 12; i++) ctx.fillRect(30, 20 + i * 18, w - 60, 2);
    ctx.fillStyle = '#e6d6b8';
    ctx.textAlign = 'center';
    ctx.font = '600 64px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText('雾 港', w / 2, 104);
    ctx.font = '500 30px Georgia, serif';
    ctx.fillStyle = '#d7bd90';
    ctx.fillText('MIST HARBOR', w / 2, 158);
    ctx.font = '400 24px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#b9a681';
    ctx.fillText('栈桥 · 旅店 →', w / 2, 208);
  });
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.88, 0.08), [
    wood, wood, wood, wood,
    material, material,
  ]);
  board.position.set(0.62, 1.9, 0.04);
  board.rotation.y = -0.22;
  board.castShadow = true;
  g.add(board);
  // arrow tip
  const tip = box(0.34, 0.34, 0.09, wood, { x: 1.62, y: 1.9, z: 0.04, ry: -0.22, rz: Math.PI / 4 });
  g.add(tip);
  return g;
}

function buildNet() {
  const g = new THREE.Group();
  const dark = mat('#4a3626');
  const a = new THREE.Vector3(-1.6, 0.05, -0.2);
  const b = new THREE.Vector3(1.6, 0.05, -0.2);
  g.add(beamBetween(a.clone().setY(0), a.clone().setY(2.3), 0.09, dark));
  g.add(beamBetween(b.clone().setY(0), b.clone().setY(2.3), 0.09, dark));
  g.add(beamBetween(new THREE.Vector3(-1.6, 2.3, -0.2), new THREE.Vector3(1.6, 2.3, -0.2), 0.08, dark));
  // net grid as line segments with slight sag
  const pts = [];
  const cols = 9;
  const rows = 8;
  const yTop = 2.25;
  const yBot = 0.45;
  for (let i = 0; i <= cols; i++) {
    const x = -1.55 + (i / cols) * 3.1;
    let prev = null;
    for (let j = 0; j <= rows; j++) {
      const y = yTop - (j / rows) * (yTop - yBot);
      const sag = Math.sin((i / cols) * Math.PI) * Math.sin((j / rows) * Math.PI) * 0.22;
      const p = new THREE.Vector3(x, y - sag, -0.18 + sag * 0.5);
      if (prev) pts.push(prev, p);
      prev = p;
    }
  }
  for (let j = 0; j <= rows; j++) {
    let prev = null;
    const y = yTop - (j / rows) * (yTop - yBot);
    for (let i = 0; i <= cols; i++) {
      const x = -1.55 + (i / cols) * 3.1;
      const sag = Math.sin((i / cols) * Math.PI) * Math.sin((j / rows) * Math.PI) * 0.22;
      const p = new THREE.Vector3(x, y - sag, -0.18 + sag * 0.5);
      if (prev) pts.push(prev, p);
      prev = p;
    }
  }
  const netGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const netMat = new THREE.LineBasicMaterial({ color: '#b8c6bb', transparent: true, opacity: 0.55 });
  g.add(new THREE.LineSegments(netGeo, netMat));
  // floats
  for (let i = 0; i < 5; i++) {
    g.add(sph(0.09, mat('#c1913f'), { x: -1.2 + i * 0.6, y: 0.4, z: -0.1, cast: false }));
  }
  return g;
}

function buildBoat() {
  const g = new THREE.Group();
  const wood = mat('#5c3e2a');
  const dark = mat('#3c2a1d');
  // hull: open-top half sphere, stretched
  const hullGeo = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
  const hull = new THREE.Mesh(hullGeo, mat('#4e3424', { side: THREE.DoubleSide }));
  hull.scale.set(0.85, 0.55, 1.9);
  hull.position.y = 0.05;
  hull.castShadow = true;
  g.add(hull);
  // rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 5, 20), wood);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.85, 1.9, 1);
  rim.position.y = 0.29;
  g.add(rim);
  // seats
  for (const z of [-0.6, 0.6]) {
    g.add(box(1.25, 0.1, 0.32, wood, { y: 0.28, z }));
  }
  g.add(box(1.3, 0.08, 0.26, dark, { y: 0.18, z: 0 }));
  // oars
  for (const [x, rz] of [[0.55, 0.25], [-0.55, -0.25]]) {
    g.add(beamBetween(new THREE.Vector3(x, 0.38, -1.4), new THREE.Vector3(x * 1.5, 0.22, 1.9), 0.06, wood));
  }
  // small lantern at the bow
  g.add(cyl(0.02, 0.02, 0.5, 5, dark, { y: 0.52, z: -1.55 }));
  g.add(box(0.2, 0.24, 0.2, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3 }), { y: 0.34, z: -1.55, cast: false }));
  const glow = glowSprite('#ffb45e', 1.2, 0.4);
  glow.position.set(0, 0.34, -1.55);
  g.add(glow);
  return g;
}

function buildCampfire() {
  const g = new THREE.Group();
  const stone = mat('#4c4b4d');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new THREE.DodecahedronGeometry(0.22 + rand() * 0.08, 0), stone, {
      x: Math.cos(a) * 1.05,
      y: 0.16,
      z: Math.sin(a) * 1.05,
      ry: rand() * 3,
      sy: 0.75,
    }));
  }
  const logMat = mat('#4a3322');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(beamBetween(
      new THREE.Vector3(Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55),
      new THREE.Vector3(Math.cos(a + Math.PI) * 0.5, 0.5, Math.sin(a + Math.PI) * 0.5),
      0.14,
      logMat
    ));
  }
  const flameMats = [
    new THREE.MeshBasicMaterial({ color: '#ff7a2f', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  ];
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const f = cone(0.42 - i * 0.08, 1.1 + i * 0.22, 6, flameMats[i], { y: 0.55 + i * 0.1 });
    f.castShadow = false;
    flames.push(f);
    g.add(f);
  }
  // embers
  const emberGeo = new THREE.BufferGeometry();
  const emberCount = 26;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.6;
    emberPos[i * 3] = Math.cos(a) * r;
    emberPos[i * 3 + 1] = rand() * 1.8;
    emberPos[i * 3 + 2] = Math.sin(a) * r;
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    color: '#ffb35c', size: 0.08, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.userData.isFx = true;
  g.add(embers);

  const fireLight = new THREE.PointLight('#ff9d4d', 24, 14, 2);
  fireLight.position.set(0, 1.0, 0);
  g.add(fireLight);
  lanternLights.push({ light: fireLight, base: 24, phase: 1.4, fire: true });

  const fireGlow = glowSprite('#ff8a3d', 5.5, 0.5);
  fireGlow.position.y = 1.1;
  g.add(fireGlow);

  // log seats
  for (const [x, z, ry] of [[-2.0, 0.6, 0.35], [2.0, -0.4, -0.4]]) {
    const log = cyl(0.32, 0.36, 1.8, 8, mat('#4d3625'), { x, y: 0.34, z, rz: Math.PI / 2, ry });
    log.rotation.set(0, ry, Math.PI / 2);
    g.add(log);
  }
  g.userData.flames = flames;
  g.userData.embers = embers;
  return g;
}

function buildCat() {
  const g = new THREE.Group();
  const fur = mat('#b57b45');
  const dark = mat('#6b4527');
  g.add(sph(0.3, fur, { y: 0.28, sx: 1.4, sy: 0.9, sz: 0.85 }));
  const head = new THREE.Group();
  head.position.set(0.4, 0.42, 0.02);
  head.add(sph(0.19, fur, {}));
  head.add(cone(0.08, 0.16, 4, dark, { x: -0.1, y: 0.17, rz: -0.15 }));
  head.add(cone(0.08, 0.16, 4, dark, { x: 0.1, y: 0.17, rz: 0.15 }));
  g.add(head);
  const tail = new THREE.Group();
  tail.position.set(-0.45, 0.34, 0);
  const tailSeg = cyl(0.035, 0.05, 0.7, 5, fur, { y: 0.3, rz: -0.35 });
  tail.add(tailSeg);
  g.add(tail);
  // paws
  for (const [x, z] of [[0.3, 0.16], [0.3, -0.16], [-0.3, 0.14], [-0.3, -0.14]]) {
    g.add(box(0.12, 0.12, 0.1, fur, { x, y: 0.06, z }));
  }
  g.userData.head = head;
  g.userData.tail = tail;
  return g;
}

function buildPine(scale = 1) {
  const g = new THREE.Group();
  const trunk = mat('#4a3525');
  const green = mat('#34503e');
  const green2 = mat('#3d5b46');
  g.add(cyl(0.12 * scale, 0.2 * scale, 1.4 * scale, 7, trunk, { y: 0.7 * scale }));
  const layers = [
    [1.5, 1.9, 1.9],
    [1.15, 1.6, 3.0],
    [0.75, 1.4, 3.9],
  ];
  for (let i = 0; i < 3; i++) {
    g.add(cone(layers[i][0] * scale, layers[i][1] * scale, 7, i % 2 ? green : green2, {
      y: layers[i][2] * scale,
      ry: i * 0.4,
    }));
  }
  return g;
}

function buildTrees() {
  const g = new THREE.Group();
  const spots = [
    [-13.1, 2.4, 1.15],
    [-12.2, 9.6, 0.95],
    [11.4, -8.2, 1.05],
    [12.8, -1.0, 0.9],
  ];
  for (const [x, z, s] of spots) {
    const t = buildPine(s);
    t.position.set(x, 0.18, z);
    t.rotation.y = rand() * Math.PI;
    g.add(t);
  }
  return g;
}

/* ------------------------------------------------------------------ *
 * Characters
 * ------------------------------------------------------------------ */

function makePerson(cfg = {}) {
  const {
    coat = '#3f5e63',
    coat2 = null,
    pants = '#2b2b33',
    skin = '#d5a37b',
    accent = '#c1913f',
    hat = null,
    scale = 1,
    cloak = false,
    apron = false,
  } = cfg;
  const g = new THREE.Group();
  const M = {
    coat: mat(coat, { roughness: 0.94 }),
    coat2: mat(coat2 || coat, { roughness: 0.94 }),
    pants: mat(pants),
    skin: mat(skin, { roughness: 0.9 }),
    accent: mat(accent, { metalness: 0.25, roughness: 0.55 }),
    dark: mat('#24242b'),
    boot: mat('#2a211b'),
  };

  const hip = new THREE.Group();
  hip.position.y = 0.98;
  g.add(hip);
  hip.add(box(0.5, 0.3, 0.34, M.pants, { y: 0.02 }));
  hip.add(box(0.56, 0.12, 0.38, M.dark, { y: 0.16 }));

  const torso = new THREE.Group();
  torso.position.y = 0.16;
  hip.add(torso);
  torso.add(box(0.6, 0.66, 0.36, M.coat, { y: 0.33 }));
  torso.add(box(0.7, 0.16, 0.4, M.coat2, { y: 0.63 }));
  torso.add(box(0.62, 0.1, 0.38, M.dark, { y: 0.06 }));
  if (cloak) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.66, 1.15, 8, 1, true), M.coat);
    c.position.y = -0.12;
    c.castShadow = true;
    c.receiveShadow = true;
    torso.add(c);
  }
  if (apron) {
    torso.add(box(0.48, 0.62, 0.04, mat('#cdbb9c'), { y: 0.22, z: 0.2, cast: false }));
    torso.add(box(0.48, 0.1, 0.05, M.dark, { y: 0.48, z: 0.21, cast: false }));
  }

  const head = new THREE.Group();
  head.position.y = 0.95;
  torso.add(head);
  head.add(sph(0.235, M.skin, { ws: 10, hs: 8 }));
  head.add(box(0.06, 0.06, 0.05, M.skin, { y: -0.02, z: 0.23, cast: false }));
  // eyes (tiny dark specks)
  head.add(box(0.045, 0.05, 0.035, M.dark, { x: -0.08, y: 0.03, z: 0.21, cast: false }));
  head.add(box(0.045, 0.05, 0.035, M.dark, { x: 0.08, y: 0.03, z: 0.21, cast: false }));

  if (hat === 'brim') {
    head.add(cyl(0.46, 0.48, 0.06, 11, M.dark, { y: 0.15 }));
    head.add(cyl(0.22, 0.27, 0.34, 9, M.dark, { y: 0.32 }));
    head.add(box(0.02, 0.09, 0.36, M.accent, { y: 0.18, z: 0.02 }));
  } else if (hat === 'cap') {
    head.add(mesh(new THREE.SphereGeometry(0.245, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.accent, { y: 0.03 }));
    head.add(box(0.34, 0.05, 0.2, M.accent, { y: 0.06, z: 0.2 }));
  } else if (hat === 'helmet') {
    head.add(mesh(new THREE.SphereGeometry(0.27, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.accent, { y: 0.02 }));
    head.add(box(0.27, 0.3, 0.06, M.accent, { y: 0.08, z: -0.2 }));
    head.add(box(0.05, 0.26, 0.34, M.accent, { y: 0.2, z: 0 }));
  } else if (hat === 'hood') {
    head.add(cone(0.3, 0.45, 8, M.coat2, { y: 0.2 }));
  }

  function makeArm(side) {
    const s = new THREE.Group();
    s.position.set(side * 0.41, 0.55, 0);
    torso.add(s);
    s.add(box(0.18, 0.5, 0.2, M.coat, { y: -0.22 }));
    const lower = new THREE.Group();
    lower.position.y = -0.46;
    s.add(lower);
    lower.add(box(0.15, 0.4, 0.17, M.coat2, { y: -0.19 }));
    lower.add(sph(0.075, M.skin, { y: -0.4, ws: 7, hs: 5 }));
    return { upper: s, lower };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  function makeLeg(side) {
    const s = new THREE.Group();
    s.position.set(side * 0.16, 0.02, 0);
    hip.add(s);
    s.add(box(0.22, 0.52, 0.25, M.pants, { y: -0.26 }));
    const lower = new THREE.Group();
    lower.position.y = -0.5;
    s.add(lower);
    lower.add(box(0.19, 0.42, 0.22, M.pants, { y: -0.2 }));
    lower.add(box(0.24, 0.14, 0.34, M.boot, { y: -0.43, z: 0.05 }));
    return { upper: s, lower };
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  g.scale.setScalar(scale);
  return { group: g, refs: { torso, head, armL, armR, legL, legR, hip } };
}

function buildLamplighter() {
  const { group, refs } = makePerson({
    coat: '#2f4f4c', coat2: '#3d5f59', pants: '#24262b',
    hat: 'brim', cloak: true, accent: '#c1913f', scale: 0.98,
  });
  group.position.set(5.5, 0.64, 13.2);
  group.rotation.y = -0.5;

  // staff + lantern
  const staff = new THREE.Group();
  staff.position.set(0.45, 0, 0.1);
  staff.add(cyl(0.035, 0.045, 2.2, 6, mat('#4a3524'), { y: 1.1 }));
  const lantern = new THREE.Group();
  lantern.position.set(0, 1.95, 0.28);
  lantern.add(cyl(0.015, 0.015, 0.3, 5, mat('#2f2a25'), { y: 0.2 }));
  lantern.add(box(0.24, 0.3, 0.24, mat('#2f2a25'), {}));
  lantern.add(box(0.15, 0.2, 0.15, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3.2 }), { cast: false }));
  lantern.add(cone(0.2, 0.14, 4, mat('#2f2a25'), { y: 0.22 }));
  lantern.add(glowSprite('#ffb45e', 1.7, 0.55));
  staff.add(lantern);
  const light = new THREE.PointLight('#ffb45e', 7, 8, 2);
  light.position.set(0, 2.0, 0.3);
  staff.add(light);
  lanternLights.push({ light, base: 7, phase: 0.9 });
  group.add(staff);

  group.userData.refs = refs;
  group.userData.lantern = lantern;
  return group;
}

function buildDockhand() {
  const { group, refs } = makePerson({
    coat: '#40536a', coat2: '#4c6278', pants: '#33322f',
    hat: 'cap', accent: '#a97c45', scale: 1,
  });
  // crate on the shoulder
  const crate = new THREE.Group();
  crate.position.set(-0.48, 1.8, 0.02);
  crate.rotation.y = 0.15;
  const wood = mat('#77553a');
  crate.add(box(0.62, 0.5, 0.5, wood, {}));
  for (const x of [-0.31, 0.31]) {
    crate.add(box(0.06, 0.54, 0.54, mat('#4a3222'), { x }));
  }
  group.add(crate);
  group.userData.refs = refs;
  group.userData.walk = { from: 14.0, to: 20.8, x: 4.9, y: 0.64, speed: 0.5 };
  group.position.set(4.9, 0.64, 15.5);
  group.rotation.y = 0;
  return group;
}

function buildFishmonger() {
  const { group, refs } = makePerson({
    coat: '#6d4437', coat2: '#7b4f40', pants: '#2f2b28',
    hat: 'cap', accent: '#cdbb9c', apron: true, scale: 0.96,
  });
  group.position.set(-9.0, 0.16, 5.9);
  group.rotation.y = 0.42;
  group.userData.refs = refs;
  group.userData.wave = true;
  return group;
}

function buildGuard() {
  const { group, refs } = makePerson({
    coat: '#4a515a', coat2: '#5a626b', pants: '#2c2f33',
    hat: 'helmet', accent: '#8b939c', scale: 1.02,
  });
  group.position.set(-1.9, 0.16, -3.3);
  group.rotation.y = 0.35;

  // spear
  const spear = new THREE.Group();
  spear.position.set(0.5, 0, 0.08);
  spear.add(cyl(0.028, 0.028, 2.35, 6, mat('#4f3b28'), { y: 1.17 }));
  spear.add(cone(0.08, 0.35, 5, mat('#9aa2aa', { metalness: 0.6, roughness: 0.4 }), { y: 2.5 }));
  group.add(spear);

  // round shield on the left arm
  const shield = new THREE.Group();
  shield.position.set(-0.52, 1.25, 0.12);
  shield.rotation.set(Math.PI / 2, 0, 0.2);
  shield.add(cyl(0.42, 0.42, 0.08, 12, mat('#6d4a32'), {}));
  shield.add(cyl(0.1, 0.1, 0.1, 8, mat('#8b939c', { metalness: 0.5, roughness: 0.45 }), { y: 0.05 }));
  group.add(shield);

  group.userData.refs = refs;
  return group;
}

/* ------------------------------------------------------------------ *
 * Build the world
 * ------------------------------------------------------------------ */

const island = buildIsland();
scene.add(island);
addPick(island, {
  key: 'map', type: 'scene', name: '雾港岛屿', en: 'Mist Harbor',
  desc: '二十条边的低多边形岛基，草坡、礁石和浅滩围出一块可以走动的港区。整座岛连同路径与草丛都在这一个组里。',
});

const pier = buildPier();
scene.add(pier);
addPick(pier, {
  key: 'pier', type: 'scene', name: '旧栈桥', en: 'The Old Pier',
  desc: '十四块木板、十根木桩和一条会微微下垂的缆绳，从岛脚一直伸进雾海。点击灯柱、船或海面都能看到各自的模型。',
});

const inn = buildInn();
scene.add(inn);
addPick(inn, {
  key: 'inn', type: 'build', name: '雾灯旅店', en: 'The Fog Lamp Inn',
  desc: '石基、木骨、坡屋顶与一座冒烟的烟囱。窗口和门灯是场景里最暖的两处光源，招牌上的字也是运行时画到贴图上的。',
});

const lighthouse = buildLighthouse();
scene.add(lighthouse);
addPick(lighthouse, {
  key: 'lighthouse', type: 'build', name: '港口灯塔', en: 'Harbor Light',
  desc: '十边锥塔、两道红环与一盏会扫过海面的旋转光束。光束是加色混合的锥体，雾里能看见它慢慢转。',
});

const stall = buildStall();
scene.add(stall);
addPick(stall, {
  key: 'stall', type: 'build', name: '渔市摊位', en: 'Fish Stall',
  desc: '条纹雨棚、木台、五条鱼和两个鱼箱。摊主站在柜台后面，会抬手朝你招揽。',
});

const barrels = buildBarrels();
barrels.position.set(-7.8, 0.18, -4.0);
scene.add(barrels);
addPick(barrels, {
  key: 'barrels', type: 'prop', name: '木桶', en: 'Barrels',
  desc: '四只不同大小的木桶：桶身是十边圆柱，箍是三道细圆环，其中一只侧躺在地上。',
});

const crates = buildCrates();
crates.position.set(6.5, 0.18, 11.2);
scene.add(crates);
addPick(crates, {
  key: 'crates', type: 'prop', name: '板条箱', en: 'Crate Stack',
  desc: '四只随意堆叠的板条箱，每只都有四角包边和上下两道横条。',
});

const chest = buildChest();
chest.position.set(-0.7, 0.18, -5.1);
chest.rotation.y = 0.5;
scene.add(chest);
addPick(chest, {
  key: 'chest', type: 'prop', name: '海员木箱', en: 'Sea Chest',
  desc: '铁包木的小箱子，箱盖单独建模，以后要做开合动画只需要给盖子一个铰链。',
});

const lanternPosts = buildLanternPosts();
lanternPosts.position.y = 0.18;
scene.add(lanternPosts);
addPick(lanternPosts, {
  key: 'lanterns', type: 'prop', name: '灯柱', en: 'Lantern Posts',
  desc: '两根路边的灯柱，灯笼里是一小块自发光灯芯，外面罩着深色木框，各自带一盏会闪的点光。',
});

const signpost = buildSignpost();
signpost.position.set(2.0, 0.18, 12.6);
signpost.rotation.y = 0.35;
scene.add(signpost);
addPick(signpost, {
  key: 'sign', type: 'prop', name: '路牌', en: 'Signpost',
  desc: '写着「雾港 / MIST HARBOR」的木牌：木纹、边框和字都是由 canvas 在运行时画出来的贴图。',
});

const net = buildNet();
net.position.set(-6.0, 0.18, 11.2);
net.rotation.y = 0.55;
scene.add(net);
addPick(net, {
  key: 'net', type: 'prop', name: '渔网', en: 'Fishing Net',
  desc: '两根木杆撑起的网，网线用 LineSegments 逐段生成，下缘挂着五颗木浮子。',
});

const boat = buildBoat();
boat.position.set(8.2, -0.3, 15.6);
boat.rotation.y = 0.24;
scene.add(boat);
addPick(boat, {
  key: 'boat', type: 'prop', name: '小划艇', en: 'Rowboat',
  desc: '系在栈桥边的小划艇，船身是一个压扁的下半球，随水面上下浮动，船头挂着一盏灯。',
});
const boatBaseY = boat.position.y;

const campfire = buildCampfire();
campfire.position.set(9.2, 0.18, 5.2);
scene.add(campfire);
addPick(campfire, {
  key: 'campfire', type: 'prop', name: '营火', en: 'Campfire',
  desc: '八块石头围出的火塘、三根交叉柴薪和三层加色火苗；火光会闪，旁边的两段木墩可以坐。',
});

const cat = new THREE.Group();
cat.position.set(-1.55, 0.18, -3.65);
cat.rotation.y = 1.9;
const catBarrel = makeBarrel(0.78);
cat.add(catBarrel);
const catMesh = buildCat();
catMesh.position.y = 0.74;
catMesh.rotation.y = 0.25;
cat.add(catMesh);
cat.userData = catMesh.userData;
scene.add(cat);
addPick(cat, {
  key: 'cat', type: 'prop', name: '旅店猫', en: 'Inn Cat',
  desc: '蹲在木桶上的橘猫，尾巴和头会轻轻摆。整只猫不到两百个三角面。',
});

const trees = buildTrees();
scene.add(trees);
addPick(trees, {
  key: 'trees', type: 'scene', name: '冷杉林', en: 'Fir Grove',
  desc: '四棵冷杉，树冠都是三层错开的七边锥体；树的位置避开了栈桥、帐篷和旅店的占地。',
});

const lamplighter = buildLamplighter();
scene.add(lamplighter);
addPick(lamplighter, {
  key: 'npc-lamplighter', type: 'person', name: '守夜人', en: 'The Lamplighter',
  desc: '长大衣、宽檐帽和一根挑着灯笼的手杖。呼吸时肩膀会微微起伏，灯笼也会跟着晃。',
});

const dockhand = buildDockhand();
scene.add(dockhand);
addPick(dockhand, {
  key: 'npc-dockhand', type: 'person', name: '搬运工', en: 'The Dockhand',
  desc: '肩上扛着木箱，沿栈桥来回走。腿和手臂是简单的步行循环，转弯时会整体转过去。',
});

const fishmonger = buildFishmonger();
scene.add(fishmonger);
addPick(fishmonger, {
  key: 'npc-fishmonger', type: 'person', name: '鱼贩', en: 'The Fishmonger',
  desc: '站在摊位后面，围裙、便帽；每隔几秒会抬起手臂招揽客人。',
});

const guard = buildGuard();
scene.add(guard);
addPick(guard, {
  key: 'npc-guard', type: 'person', name: '港区卫兵', en: 'The Watch',
  desc: '长矛加圆盾的港区守卫，站在旅店门口。头盔、矛尖和盾心的金属用同一套材质。',
});


/* ------------------------------------------------------------------ *
 * Birds
 * ------------------------------------------------------------------ */

const birds = [];
const birdMat = mat('#1d232c', { emissive: '#1d232c', emissiveIntensity: 0.1 });
for (let i = 0; i < 5; i++) {
  const b = new THREE.Group();
  const wingL = box(0.5, 0.03, 0.1, birdMat, { x: -0.25, rz: 0.25, cast: false });
  const wingR = box(0.5, 0.03, 0.1, birdMat, { x: 0.25, rz: -0.25, cast: false });
  b.add(wingL, wingR);
  b.userData = {
    radius: 22 + i * 5,
    height: 15 + i * 1.6,
    speed: 0.08 + i * 0.014,
    phase: i * 1.7,
    wings: [wingL, wingR],
  };
  scene.add(b);
  birds.push(b);
}

/* ------------------------------------------------------------------ *
 * Smoke
 * ------------------------------------------------------------------ */

const smokeSprites = [];
{
  const anchor = new THREE.Vector3();
  inn.userData.smokeAnchor.getWorldPosition(anchor);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.SpriteMaterial({
      map: SMOKE,
      color: '#bfc0bb',
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      toneMapped: false,
    });
    const s = new THREE.Sprite(m);
    s.position.copy(anchor);
    s.scale.setScalar(1);
    s.userData = { life: i / 9, speed: 0.11 + rand() * 0.04, drift: (rand() - 0.5) * 0.4, baseX: anchor.x, baseZ: anchor.z };
    scene.add(s);
    smokeSprites.push(s);
  }
}

/* ------------------------------------------------------------------ *
 * Motes
 * ------------------------------------------------------------------ */

const moteCount = 120;
const motePos = new Float32Array(moteCount * 3);
const moteSeed = [];
for (let i = 0; i < moteCount; i++) {
  const x = (rand() - 0.5) * 36;
  const y = 0.3 + rand() * 8;
  const z = (rand() - 0.5) * 34;
  motePos.set([x, y, z], i * 3);
  moteSeed.push(0.1 + rand() * 0.35);
}
const moteGeo = new THREE.BufferGeometry();
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const moteMat = new THREE.PointsMaterial({
  color: '#ffcf9a',
  size: 0.05,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});
const motes = new THREE.Points(moteGeo, moteMat);
motes.userData.isFx = true;
scene.add(motes);

/* ------------------------------------------------------------------ *
 * Mood system
 * ------------------------------------------------------------------ */

const MOODS = {
  dusk: {
    top: '#1b2742', bottom: '#d98a63', fog: '#433c47', fogDensity: 0.0145,
    sun: '#ff9f5e', sunI: 3.1, sunPos: [-38, 18, -42],
    hemiSky: '#8397bd', hemiGround: '#2e2824', hemiI: 1.15,
    water: '#2f6b74', exposure: 1.16, lantern: 1,
    stars: 0, celestialColor: '#ffb877', celestialOpacity: 0.95,
    celestialPos: [-70, 30, -260], celestialScale: 74,
  },
  night: {
    top: '#02060e', bottom: '#14304a', fog: '#0a1622', fogDensity: 0.0115,
    sun: '#9db9ea', sunI: 1.15, sunPos: [30, 40, -30],
    hemiSky: '#22344f', hemiGround: '#05080c', hemiI: 0.42,
    water: '#0a1f2a', exposure: 1.2, lantern: 1.8,
    stars: 1, celestialColor: '#dfe9ff', celestialOpacity: 0.85,
    celestialPos: [100, 84, -240], celestialScale: 34,
  },
  dawn: {
    top: '#4f6c92', bottom: '#e2b295', fog: '#8993a4', fogDensity: 0.018,
    sun: '#ffd4b0', sunI: 2.4, sunPos: [55, 22, -36],
    hemiSky: '#a2b7cd', hemiGround: '#3c3833', hemiI: 1.0,
    water: '#24545f', exposure: 1.06, lantern: 0.5,
    stars: 0, celestialColor: '#ffe1bd', celestialOpacity: 0.75,
    celestialPos: [120, 30, -250], celestialScale: 48,
  },
};

const mood = {
  name: 'dusk',
  cur: {
    top: new THREE.Color(), bottom: new THREE.Color(), fog: new THREE.Color(),
    fogDensity: 0, sun: new THREE.Color(), sunI: 0, sunPos: new THREE.Vector3(),
    hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0,
    water: new THREE.Color(), exposure: 1, lantern: 1, stars: 0,
    celestialColor: new THREE.Color(), celestialOpacity: 0, celestialScale: 30,
    celestialPos: new THREE.Vector3(),
  },
  target: null,
};

function moodTarget(name) {
  const m = MOODS[name];
  return {
    top: new THREE.Color(m.top), bottom: new THREE.Color(m.bottom), fog: new THREE.Color(m.fog),
    fogDensity: m.fogDensity, sun: new THREE.Color(m.sun), sunI: m.sunI,
    sunPos: new THREE.Vector3(...m.sunPos),
    hemiSky: new THREE.Color(m.hemiSky), hemiGround: new THREE.Color(m.hemiGround), hemiI: m.hemiI,
    water: new THREE.Color(m.water), exposure: m.exposure, lantern: m.lantern, stars: m.stars,
    celestialColor: new THREE.Color(m.celestialColor), celestialOpacity: m.celestialOpacity,
    celestialScale: m.celestialScale, celestialPos: new THREE.Vector3(...m.celestialPos),
  };
}

function dampNum(a, b, lambda, dt) {
  return THREE.MathUtils.damp(a, b, lambda, dt);
}

function applyMood() {
  const c = mood.cur;
  skyMat.uniforms.topColor.value.copy(c.top);
  skyMat.uniforms.bottomColor.value.copy(c.bottom);
  scene.fog.color.copy(c.fog);
  scene.fog.density = c.fogDensity;
  sun.color.copy(c.sun);
  sun.intensity = c.sunI;
  sun.position.copy(c.sunPos);
  hemi.color.copy(c.hemiSky);
  hemi.groundColor.copy(c.hemiGround);
  hemi.intensity = c.hemiI;
  waterMat.color.copy(c.water);
  renderer.toneMappingExposure = c.exposure;
  starMat.opacity = c.stars;
  celestial.material.color.copy(c.celestialColor);
  celestial.material.opacity = c.celestialOpacity;
  celestial.position.copy(c.celestialPos);
  celestial.scale.setScalar(c.celestialScale);
  for (const g of glowSprites) {
    g.material.opacity = g.material.userData.baseOpacity * (0.5 + 0.5 * c.lantern);
  }
  if (beaconMat) beaconMat.opacity = 0.06 + c.stars * 0.12;
}

function setMoodInstant(name) {
  mood.name = name;
  const t = moodTarget(name);
  Object.assign(mood.cur, t);
  mood.target = moodTarget(name);
  applyMood();
}

function tweenMood(name) {
  if (mood.name === name) return;
  mood.name = name;
  mood.target = moodTarget(name);
  document.querySelectorAll('.seg-btn').forEach((b) => {
    const on = b.dataset.mood === name;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

setMoodInstant('dusk');

/* ------------------------------------------------------------------ *
 * Interaction / UI
 * ------------------------------------------------------------------ */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.86, 1, 48),
  new THREE.MeshBasicMaterial({
    color: '#e3b978',
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })
);
ring.rotation.x = -Math.PI / 2;
ring.visible = false;
ring.renderOrder = 6;
ring.raycast = () => {};
scene.add(ring);

let ringBase = 1;
let selected = null;
let camTween = null;
let clockTime = 0;
let lastStamp = performance.now();

const TYPE_META = {
  scene: { label: '地图场景', color: '#78b9ad' },
  build: { label: '建筑', color: '#e3b978' },
  person: { label: '人物', color: '#d99a90' },
  prop: { label: '道具', color: '#9aa9c9' },
};

function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const ui = {
  card: $('card'),
  cardType: $('card-type'),
  cardName: $('card-name'),
  cardEn: $('card-en'),
  cardDesc: $('card-desc'),
  cardTris: $('card-tris'),
  drawer: $('drawer'),
  drawerList: $('drawer-list'),
  drawerFoot: $('drawer-foot'),
  btnAssets: $('btn-assets'),
  btnRotate: $('btn-rotate'),
  hint: $('hint'),
  assetCount: $('asset-count'),
};

function showCard(entry) {
  const meta = TYPE_META[entry.type];
  ui.cardType.textContent = meta.label;
  ui.cardType.style.color = meta.color;
  ui.cardName.textContent = entry.name;
  ui.cardEn.textContent = entry.en;
  ui.cardDesc.textContent = entry.desc;
  ui.cardTris.textContent = `≈ ${fmt(entry.tri)} 面`;
  ui.card.hidden = false;
}

function placeRing(entry) {
  const bbox = pickBounds(entry.group);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const maxXZ = Math.max(size.x, size.z);
  ringBase = THREE.MathUtils.clamp(maxXZ * 0.55, 0.7, 4.2);
  const y = Math.max(bbox.min.y + 0.06, -0.2);
  ring.position.set(center.x, y, center.z);
  ring.visible = true;
}

function selectEntry(entry, opts = {}) {
  if (!entry) return;
  selected = entry;
  showCard(entry);
  placeRing(entry);
  document.querySelectorAll('.asset-row').forEach((row) => {
    row.classList.toggle('is-on', row.dataset.key === entry.key);
  });
  if (opts.focus) focusOn(entry);
  if (opts.fromDrawer && window.innerWidth <= 760) closeDrawer();
}

function clearSelection() {
  selected = null;
  ui.card.hidden = true;
  ring.visible = false;
  document.querySelectorAll('.asset-row').forEach((row) => row.classList.remove('is-on'));
}

function focusOn(entry) {
  if (entry.key === 'map') {
    resetView();
    return;
  }
  const bbox = pickBounds(entry.group);
  const center = bbox.getCenter(new THREE.Vector3());
  const size = bbox.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z);
  const dist = THREE.MathUtils.clamp(radius * 2.6 + 3.5, 7, 33);
  const dir = camera.position.clone().sub(controls.target).normalize();
  dir.y = Math.max(dir.y, 0.32);
  dir.normalize();
  const pos = center.clone().addScaledVector(dir, dist);
  pos.y = Math.max(pos.y, center.y + 2.4);
  tweenCamera(pos, center.clone());
}

function tweenCamera(pos, target) {
  if (STILL) {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
    return;
  }
  camTween = {
    t: 0,
    dur: reduceMotion ? 0.001 : 0.9,
    p0: camera.position.clone(),
    t0: controls.target.clone(),
    p1: pos.clone(),
    t1: target.clone(),
  };
  controls.enabled = false;
}

function resetView() {
  clearSelection();
  const h = homeConfig();
  camera.fov = h.fov;
  camera.updateProjectionMatrix();
  tweenCamera(h.pos.clone(), h.target.clone());
}

function openDrawer() {
  ui.drawer.hidden = false;
  ui.btnAssets.setAttribute('aria-expanded', 'true');
  if (window.innerWidth <= 760) clearSelection();
}

function closeDrawer() {
  ui.drawer.hidden = true;
  ui.btnAssets.setAttribute('aria-expanded', 'false');
}

function toggleDrawer() {
  if (ui.drawer.hidden) openDrawer();
  else closeDrawer();
}

// drawer list
{
  const groups = { scene: [], build: [], person: [], prop: [] };
  for (const p of picks) groups[p.type].push(p);
  let total = 0;
  for (const t of ['scene', 'build', 'person', 'prop']) {
    const list = groups[t];
    if (!list.length) continue;
    const block = document.createElement('div');
    block.className = 'asset-group';
    const head = document.createElement('p');
    head.className = 'asset-group-head';
    head.innerHTML = `<span>${TYPE_META[t].label}</span><span>${list.length}</span>`;
    block.appendChild(head);
    for (const p of list) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'asset-row';
      row.dataset.key = p.key;
      row.innerHTML = `<span class="row-name">${p.name}</span><span class="row-en">${p.en}</span>`;
      row.addEventListener('click', () => selectEntry(p, { focus: true, fromDrawer: true }));
      block.appendChild(row);
      total += p.tri;
    }
    ui.drawerList.appendChild(block);
  }
  ui.assetCount.textContent = String(picks.length);
  ui.drawerFoot.textContent = `共 ${picks.length} 件 · 约 ${fmt(total)} 个三角面`;
}

// pointer picking
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  ui.hint.style.opacity = '0';
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const elapsed = performance.now() - down.t;
  down = null;
  if (moved > 6 || elapsed > 450) return;
  const entry = pickAt(e.clientX, e.clientY);
  if (entry) selectEntry(entry);
  else clearSelection();
});
canvas.addEventListener('pointerleave', () => {
  down = null;
});

let hoverAt = 0;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const now = performance.now();
  if (now - hoverAt < 90) return;
  hoverAt = now;
  const entry = pickAt(e.clientX, e.clientY);
  canvas.style.cursor = entry ? 'pointer' : 'grab';
});

canvas.addEventListener('dblclick', (e) => {
  const entry = pickAt(e.clientX, e.clientY);
  if (entry) {
    selectEntry(entry, { focus: true });
  }
});

function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(picks.map((p) => p.group), true);
  for (const hit of hits) {
    let o = hit.object;
    while (o && !o.userData.pickKey) o = o.parent;
    if (o) {
      const found = picks.find((p) => p.key === o.userData.pickKey);
      if (found) return found;
    }
  }
  return null;
}

// buttons
document.querySelectorAll('.seg-btn').forEach((b) => {
  b.addEventListener('click', () => tweenMood(b.dataset.mood));
});
ui.btnRotate.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  ui.btnRotate.setAttribute('aria-pressed', controls.autoRotate ? 'true' : 'false');
});
$('btn-reset').addEventListener('click', resetView);
ui.btnAssets.addEventListener('click', toggleDrawer);
$('btn-drawer-close').addEventListener('click', closeDrawer);
$('btn-card-close').addEventListener('click', clearSelection);
$('btn-focus').addEventListener('click', () => {
  if (selected) focusOn(selected);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    clearSelection();
    closeDrawer();
  } else if (e.key === 'r' || e.key === 'R') {
    resetView();
  }
});
let portraitState = isPortrait();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  const p = isPortrait();
  if (p !== portraitState) {
    portraitState = p;
    camera.fov = homeConfig().fov;
  }
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.6 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ *
 * Animation
 * ------------------------------------------------------------------ */

const personRefs = {
  lamplighter,
  dockhand,
  fishmonger,
  guard,
};

function animateIdle(person, t, phase = 0, amount = 1) {
  const r = person.userData.refs;
  if (!r) return;
  r.torso.scale.y = 1 + Math.sin(t * 1.5 + phase) * 0.012 * amount;
  r.torso.rotation.z = Math.sin(t * 0.7 + phase) * 0.018 * amount;
  r.head.rotation.y = Math.sin(t * 0.42 + phase) * 0.22 * amount;
  r.head.rotation.z = Math.sin(t * 0.7 + phase * 1.3) * 0.03 * amount;
  r.armL.upper.rotation.x = Math.sin(t * 1.1 + phase) * 0.035 * amount;
  r.armR.upper.rotation.x = Math.sin(t * 1.1 + phase + 1.4) * 0.035 * amount;
  r.legL.upper.rotation.x = 0;
  r.legR.upper.rotation.x = 0;
}

function updateDockhand(t) {
  const r = dockhand.userData.refs;
  const walk = dockhand.userData.walk;
  const span = walk.to - walk.from;
  const cycle = ((t * walk.speed) % 2 + 2) % 2;
  const p = cycle < 1 ? cycle : 2 - cycle;
  const z = walk.from + p * span;
  dockhand.position.set(walk.x, walk.y + Math.abs(Math.sin(t * 6.4)) * 0.035, z);
  const forward = cycle < 1;
  dockhand.rotation.y = forward ? 0 : Math.PI;
  const s = Math.sin(t * 6.4) * (forward ? 0.5 : -0.5);
  r.legL.upper.rotation.x = s;
  r.legR.upper.rotation.x = -s;
  r.legL.lower.rotation.x = Math.max(0, -s) * 0.5;
  r.legR.lower.rotation.x = Math.max(0, s) * 0.5;
  r.armL.upper.rotation.x = forward ? -0.85 : 0.4;
  r.armR.upper.rotation.x = forward ? 0.45 : -0.35;
  r.torso.rotation.y = Math.sin(t * 6.4) * 0.04;
  r.torso.scale.y = 1;
  r.head.rotation.y = 0;
}

function updateFishmonger(t) {
  const r = fishmonger.userData.refs;
  r.armR.upper.rotation.z = -2.0 + Math.sin(t * 1.6) * 0.22;
  r.armR.upper.rotation.x = -0.3;
  r.armR.lower.rotation.x = -0.4;
  r.armL.upper.rotation.x = -0.55;
  r.armL.lower.rotation.x = -0.7;
  r.head.rotation.y = 0.3 + Math.sin(t * 0.5) * 0.15;
}

function updateLamplighter(t) {
  const lantern = lamplighter.userData.lantern;
  lantern.rotation.z = Math.sin(t * 0.9) * 0.06;
  lantern.rotation.x = Math.sin(t * 0.7 + 1) * 0.04;
}

const flameBase = campfire.userData.flames.map((f) => f.scale.clone());
const emberAttr = campfire.userData.embers.geometry.attributes.position;
const emberOrigin = new Float32Array(emberAttr.array);
const emberSpeeds = Array.from({ length: emberAttr.count }, () => 0.25 + rand() * 0.5);

function updateFire(dt, t) {
  const flames = campfire.userData.flames;
  for (let i = 0; i < flames.length; i++) {
    const f = flames[i];
    const k = 1 + Math.sin(t * (7 + i * 1.7) + i * 2.1) * 0.13;
    f.scale.set(0.85 + i * 0.04, k, 0.85 + i * 0.04);
    f.rotation.y = t * (1.2 + i * 0.3);
    f.position.x = Math.sin(t * 2.2 + i) * 0.06;
    f.position.z = Math.cos(t * 1.8 + i * 1.4) * 0.06;
  }
  for (let i = 0; i < emberAttr.count; i++) {
    const y = emberOrigin[i * 3 + 1] + ((t * emberSpeeds[i]) % 2.0);
    emberAttr.array[i * 3 + 1] = y > 2.2 ? 0.05 : y;
    emberAttr.array[i * 3] = emberOrigin[i * 3] + Math.sin(t * 1.3 + i) * 0.12;
    emberAttr.array[i * 3 + 2] = emberOrigin[i * 3 + 2] + Math.cos(t * 1.1 + i) * 0.12;
  }
  emberAttr.needsUpdate = true;
}

function updateSmoke(dt) {
  const anchor = new THREE.Vector3();
  inn.userData.smokeAnchor.getWorldPosition(anchor);
  for (const s of smokeSprites) {
    s.userData.life += dt * s.userData.speed;
    if (s.userData.life > 1) s.userData.life -= 1;
    const l = s.userData.life;
    s.position.set(
      anchor.x + s.userData.drift * l * 3.2 + Math.sin(l * 9 + s.userData.drift * 10) * 0.22,
      anchor.y + l * 4.8,
      anchor.z + Math.cos(l * 7) * 0.35
    );
    const scale = 0.7 + l * 3.4;
    s.scale.setScalar(scale);
    s.material.opacity = Math.sin(Math.min(1, l * 1.15) * Math.PI) * 0.22;
  }
}

function updateWater(t) {
  const pos = waterGeo.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = waterBase[i];
    const z = waterBase[i + 2];
    arr[i + 1] =
      Math.sin(x * 0.28 + t * 1.05) * 0.16 +
      Math.sin(z * 0.22 - t * 0.82) * 0.14 +
      Math.sin((x + z) * 0.16 + t * 0.5) * 0.09;
  }
  pos.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

function updateBirds(t) {
  for (const b of birds) {
    const d = b.userData;
    const a = t * d.speed + d.phase;
    b.position.set(Math.cos(a) * d.radius, d.height + Math.sin(t * 0.4 + d.phase) * 1.2, Math.sin(a) * d.radius - 4);
    b.rotation.y = -a + Math.PI / 2;
    const flap = Math.sin(t * 4 + d.phase) * 0.25;
    d.wings[0].rotation.z = 0.25 + flap;
    d.wings[1].rotation.z = -0.25 - flap;
  }
}

function updateMotes(t) {
  const arr = moteGeo.attributes.position.array;
  for (let i = 0; i < moteCount; i++) {
    arr[i * 3 + 1] = 0.4 + ((moteOrigin[i * 3 + 1] + t * moteSeed[i]) % 9);
    arr[i * 3] = moteOrigin[i * 3] + Math.sin(t * 0.3 + i) * 0.8;
    arr[i * 3 + 2] = moteOrigin[i * 3 + 2] + Math.cos(t * 0.24 + i) * 0.8;
  }
  moteGeo.attributes.position.needsUpdate = true;
}
const moteOrigin = new Float32Array(motePos);

function updateLanterns(t) {
  const level = mood.cur.lantern;
  for (const l of lanternLights) {
    let flicker = 1;
    if (!l.steady) {
      flicker = 1 + Math.sin(t * 9 + l.phase) * 0.045 + Math.sin(t * 23 + l.phase * 3) * 0.025;
      if (l.fire) flicker += Math.sin(t * 17 + 1.3) * 0.06;
    }
    l.light.intensity = l.base * level * flicker;
  }
}

function updateMood(dt) {
  if (!mood.target) return;
  const c = mood.cur;
  const tgt = mood.target;
  const k = 1 - Math.exp(-4.2 * dt);
  c.top.lerp(tgt.top, k);
  c.bottom.lerp(tgt.bottom, k);
  c.fog.lerp(tgt.fog, k);
  c.fogDensity = dampNum(c.fogDensity, tgt.fogDensity, 4.2, dt);
  c.sun.lerp(tgt.sun, k);
  c.sunI = dampNum(c.sunI, tgt.sunI, 4.2, dt);
  c.sunPos.lerp(tgt.sunPos, k);
  c.hemiSky.lerp(tgt.hemiSky, k);
  c.hemiGround.lerp(tgt.hemiGround, k);
  c.hemiI = dampNum(c.hemiI, tgt.hemiI, 4.2, dt);
  c.water.lerp(tgt.water, k);
  c.exposure = dampNum(c.exposure, tgt.exposure, 4.2, dt);
  c.lantern = dampNum(c.lantern, tgt.lantern, 4.2, dt);
  c.stars = dampNum(c.stars, tgt.stars, 4.2, dt);
  c.celestialColor.lerp(tgt.celestialColor, k);
  c.celestialOpacity = dampNum(c.celestialOpacity, tgt.celestialOpacity, 4.2, dt);
  c.celestialScale = dampNum(c.celestialScale, tgt.celestialScale, 4.2, dt);
  c.celestialPos.lerp(tgt.celestialPos, k);
  applyMood();
}

function updateCamTween(dt) {
  if (!camTween) return;
  camTween.t += dt;
  const k = Math.min(1, camTween.t / camTween.dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(camTween.p0, camTween.p1, e);
  controls.target.lerpVectors(camTween.t0, camTween.t1, e);
  if (k >= 1) {
    camTween = null;
    controls.enabled = true;
    controls.update();
  }
}

/* ------------------------------------------------------------------ *
 * Greybox mode (before / after evidence)
 * ------------------------------------------------------------------ */

if (GREYBOX) {
  const clay = new THREE.MeshStandardMaterial({
    color: '#9a9791',
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });
  scene.traverse((o) => {
    if (o.userData.isFx) {
      o.visible = false;
    } else if (o.isMesh && !o.userData.noGreybox) {
      o.material = clay;
    } else if (o.isSprite || o.isPoints || o.isLineSegments) {
      o.visible = false;
    }
  });
  scene.fog.density = 0.011;
  scene.fog.color.set('#202226');
  skyMat.uniforms.topColor.value.set('#23252a');
  skyMat.uniforms.bottomColor.value.set('#6c6a65');
  skyMat.uniforms.glowColor.value.set('#8f8a82');
  skyMat.uniforms.glowStrength.value = 0.3;
  waterMat.color.set('#2a2f34');
  sun.color.set('#ffffff');
  sun.intensity = 2.4;
  hemi.intensity = 0.8;
  renderer.toneMappingExposure = 1.0;
}

/* ------------------------------------------------------------------ *
 * Loop
 * ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let firstFrame = true;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  clockTime += dt;
  const t = clockTime;

  if (camTween) updateCamTween(dt);
  controls.update();

  if (!GREYBOX) {
    updateWater(t);
    updateFire(dt, t);
    updateSmoke(dt);
    updateMotes(t);
    updateBirds(t);
    updateLanterns(t);
    updateMood(dt);

    animateIdle(lamplighter, t, 0.2, 0.8);
    updateLamplighter(t);
    animateIdle(fishmonger, t, 1.4, 0.7);
    updateFishmonger(t);
    animateIdle(guard, t, 2.6, 1);
    updateDockhand(t);

    // cat
    const catHead = cat.userData.head;
    const catTail = cat.userData.tail;
    catHead.rotation.y = Math.sin(t * 0.45) * 0.35;
    catHead.rotation.z = Math.sin(t * 0.35 + 1) * 0.06;
    catTail.rotation.z = Math.sin(t * 1.2) * 0.18;
    catTail.rotation.x = Math.sin(t * 0.8) * 0.12;

    // boat
    boat.position.y = boatBaseY + Math.sin(t * 0.75 + 1.2) * 0.055;
    boat.rotation.z = Math.sin(t * 0.55) * 0.022;
    boat.rotation.x = Math.sin(t * 0.42 + 0.6) * 0.014;

    // foam pulse
    foam.material.opacity = 0.07 + Math.sin(t * 0.9) * 0.025;
    foam.scale.setScalar(1 + Math.sin(t * 0.55) * 0.006);

    // lighthouse
    if (beaconGroup) beaconGroup.rotation.y = t * 0.12;

    // windows alive at night (shared warm material pulses very slightly)
    for (const m of warmMats) {
      m.emissiveIntensity = 2.2 + Math.sin(t * 1.3) * 0.12;
    }

    // stars twinkle
    starMat.size = 1.4 + Math.sin(t * 0.7) * 0.15;

    // selection ring
    if (ring.visible) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.06;
      ring.scale.set(ringBase * pulse, ringBase * pulse, 1);
      ring.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.18;
    }
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    window.setTimeout(() => $('loader').classList.add('is-done'), 260);
  }
  if (!STILL) requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// expose a tiny debug handle for browser QA (not used by the UI)
window.__mistHarbor = {
  scene,
  camera,
  controls,
  picks,
  water,
  sky,
  celestial,
  foam,
  select: (key, focus = true) => {
    const p = picks.find((x) => x.key === key);
    if (p) selectEntry(p, { focus });
  },
  screenPoint: (key) => {
    const p = picks.find((x) => x.key === key);
    if (!p) return null;
    const box = pickBounds(p.group);
    const c = box.getCenter(new THREE.Vector3()).project(camera);
    return {
      x: (c.x * 0.5 + 0.5) * window.innerWidth,
      y: (-c.y * 0.5 + 0.5) * window.innerHeight,
    };
  },
  bounds: (key) => {
    const p = picks.find((x) => x.key === key);
    if (!p) return null;
    const b = pickBounds(p.group);
    return { min: b.min.toArray(), max: b.max.toArray(), size: b.getSize(new THREE.Vector3()).toArray() };
  },
  setMood: (name) => {
    mood.target = moodTarget(name);
    mood.name = name;
    document.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.dataset.mood === name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  },
  heroView: () => {
    const h = homeConfig();
    camera.fov = h.fov;
    camera.updateProjectionMatrix();
    camera.position.copy(h.pos);
    controls.target.copy(h.target);
    controls.update();
  },
  renderOnce: () => renderer.render(scene, camera),
  still: STILL,
  settleMood: () => {
    if (mood.target) {
      Object.assign(mood.cur, mood.target);
      applyMood();
      updateLanterns(clockTime);
    }
  },
};
