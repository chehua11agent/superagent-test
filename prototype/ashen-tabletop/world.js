import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

/* 《灰烬岗哨》3D 桌面切片 —— 世界层
   雪地岗哨、角色 / 怪物指示物、可交互道具、3D d20、场景标签。 */

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const QA = new URLSearchParams(location.search).has('qa');

export function createWorld({ onPick } = {}) {
  const canvas = document.getElementById('scene');

  const webgl2 = (() => {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
  })();
  if (!webgl2) {
    document.getElementById('loader').hidden = true;
    document.getElementById('fallback').hidden = false;
    throw new Error('WebGL 2 unavailable');
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !QA;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#101923', 0.015);

  const HOMES = {
    landscape: {
      pos: new THREE.Vector3(16.5, 13.6, 20.5),
      target: new THREE.Vector3(0, 1.0, 0.4),
      fov: 42,
    },
    portrait: {
      pos: new THREE.Vector3(26, 18, 33),
      target: new THREE.Vector3(0, 1.4, 4.4),
      fov: 52,
    },
  };
  const isPortrait = () => window.innerHeight > window.innerWidth * 1.12;
  const homeConfig = () => (isPortrait() ? HOMES.portrait : HOMES.landscape);
  const HOME = homeConfig();

  const camera = new THREE.PerspectiveCamera(HOME.fov, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 12;
  controls.maxDistance = 54;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.update();

  /* ---------------- helpers ---------------- */

  const MATS = new Map();
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
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      depthWrite: opts.depthWrite ?? true,
    });
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

  const box = (w, h, d, material, p = {}) => mesh(new THREE.BoxGeometry(w, h, d), material, p);
  const cyl = (rt, rb, h, seg, material, p = {}) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, p);
  const cone = (r, h, seg, material, p = {}) => mesh(new THREE.ConeGeometry(r, h, seg), material, p);
  const sph = (r, material, p = {}) => mesh(new THREE.SphereGeometry(r, p.ws || 9, p.hs || 7), material, p);

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
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261114);

  function canvasTexture(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
  }

  const radialTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.24, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });

  const stoneTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#44474c'; ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      const y = row * 32;
      ctx.fillStyle = row % 2 ? '#4d5055' : '#484b50';
      ctx.fillRect(0, y + 2, w, 28);
      ctx.fillStyle = '#2a2c30';
      ctx.fillRect(0, y, w, 2);
      const offset = row % 2 ? 32 : 0;
      for (let x = offset; x < w + 64; x += 64) {
        ctx.fillStyle = '#2c2e33';
        ctx.fillRect(x, y + 2, 2, 28);
      }
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.015 + rand() * 0.035})`;
        ctx.fillRect(rand() * w, y + 4 + rand() * 22, 4 + rand() * 14, 2);
      }
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, [2, 2]);

  const woodTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a3423'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const x = i * 32;
      ctx.fillStyle = i % 2 ? '#523a27' : '#46301f';
      ctx.fillRect(x + 1, 0, 30, h);
      ctx.fillStyle = '#2b1d13';
      ctx.fillRect(x, 0, 2, h);
      for (let j = 0; j < 18; j++) {
        ctx.strokeStyle = `rgba(20,12,7,${0.08 + rand() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(x + 4 + rand() * 24, 0);
        ctx.bezierCurveTo(x + 4 + rand() * 24, h * 0.3, x + 4 + rand() * 24, h * 0.7, x + 4 + rand() * 24, h);
        ctx.stroke();
      }
    }
  }, [2, 1]);

  const snowTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#dfe7ee'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const v = 210 + Math.floor(rand() * 40);
      ctx.fillStyle = `rgba(${v},${v + 4},${v + 8},${0.08 + rand() * 0.25})`;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 2);
    }
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = `rgba(130,150,170,${0.05 + rand() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 10 + rand() * 26, 4 + rand() * 10, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [3, 3]);

  const bannerTex = canvasTexture(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#5b1f22'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,180,120,0.14)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c39858'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(w / 2, 38); ctx.lineTo(w - 38, 92); ctx.lineTo(w / 2, 146); ctx.lineTo(38, 92); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, 92, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c39858'; ctx.font = '700 34px "Noto Serif SC", serif'; ctx.textAlign = 'center';
    ctx.fillText('烬', w / 2, 105);
    ctx.strokeStyle = 'rgba(40,20,20,0.6)'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.moveTo(10 + i * 35, 0); ctx.lineTo(20 + i * 35, h); ctx.stroke();
    }
  });

  const sigilTex = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(230,176,106,0.7)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, 66); ctx.lineTo(w - 62, 164); ctx.lineTo(62, 164); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,176,106,0.55)';
    ctx.font = '600 44px "Noto Serif SC", serif'; ctx.textAlign = 'center'; ctx.fillText('灰', w / 2, h / 2 + 18);
  });

  const glowSprites = [];
  const lanterns = [];
  function glowSprite(color, scale, opacity) {
    const m = new THREE.SpriteMaterial({
      map: radialTex, color: new THREE.Color(color), transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    m.userData.baseOpacity = opacity;
    const s = new THREE.Sprite(m);
    s.scale.setScalar(scale);
    s.userData.isFx = true;
    glowSprites.push(s);
    return s;
  }

  /* ---------------- sky / moon / stars ---------------- */

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color('#050811') },
      bottomColor: { value: new THREE.Color('#1a2735') },
      glowColor: { value: new THREE.Color('#8fa8c4') },
      glowStrength: { value: 0.3 },
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 glowColor; uniform float glowStrength; varying vec3 vWorld;
      void main(){ vec3 dir = normalize(vWorld - cameraPosition); float up = max(dir.y, 0.0); vec3 sky = mix(bottomColor, topColor, pow(up, 0.7)); float glow = exp(-abs(dir.y) * 7.0); sky = mix(sky, glowColor, glow * glowStrength); gl_FragColor = vec4(sky, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 18), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.08 + rand() * 0.9;
    const r = Math.sqrt(1 - y * y);
    starPos.push(Math.cos(a) * r * 400, y * 400, Math.sin(a) * r * 400);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#cfe0f4', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false, fog: false, toneMapped: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  scene.add(stars);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex, color: '#dfe9ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  moon.scale.setScalar(38);
  moon.position.set(-100, 92, -230);
  moon.userData.isFx = true;
  scene.add(moon);
  const moonGlow = glowSprite('#a8c4ff', 90, 0.18);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  /* ---------------- lights ---------------- */

  const hemi = new THREE.HemisphereLight('#8299bd', '#252830', 1.18);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight('#b6cef2', 3.1);
  moonLight.position.set(-28, 34, 6);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -26;
  moonLight.shadow.camera.right = 26;
  moonLight.shadow.camera.top = 26;
  moonLight.shadow.camera.bottom = -26;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 100;
  moonLight.shadow.bias = -0.0006;
  moonLight.shadow.normalBias = 0.03;
  scene.add(moonLight, moonLight.target);

  const fill = new THREE.DirectionalLight('#a5b2c8', 0.95);
  fill.position.set(20, 12, 26);
  scene.add(fill);

  /* ---------------- table / base / ground ---------------- */

  const tableTex = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#171310'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#1b1612' : '#191410';
      ctx.fillRect(0, i * 44, w, 42);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, i * 44 + 42, w, 2);
      for (let j = 0; j < 24; j++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`;
        ctx.beginPath(); ctx.moveTo(rand() * w, i * 44 + rand() * 42); ctx.lineTo(rand() * w, i * 44 + rand() * 42); ctx.stroke();
      }
    }
  }, [2, 2]);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.95, color: '#6a6157' }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -1.05;
  table.receiveShadow = true;
  scene.add(table);

  const groundGroup = new THREE.Group();
  const baseGeo = new THREE.CylinderGeometry(13.2, 15.2, 2.6, 18, 3);
  baseGeo.translate(0, -1.3, 0);
  const bp = baseGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 0.001) {
      const a = Math.atan2(v.z, v.x);
      const k = 1 + 0.035 * Math.sin(a * 3 + 0.8) + 0.025 * Math.sin(a * 7 - 1.2);
      v.x *= k; v.z *= k;
      if (v.y > 1.2) v.y = 0.1 + 0.06 * Math.sin(a * 2.3);
    }
    bp.setXYZ(i, v.x, v.y, v.z);
  }
  baseGeo.computeVertexNormals();
  const base = new THREE.Mesh(baseGeo, [
    mat('#353a40'),
    mat('#eaf1f7', { map: snowTex, roughness: 0.86 }),
    mat('#252a30'),
  ]);
  base.castShadow = true;
  base.receiveShadow = true;
  groundGroup.add(base);

  const snowMat = mat('#eaf1f7', { map: snowTex, roughness: 0.88 });
  const rockMat = mat('#4f555c', { map: stoneTex, roughness: 0.95 });

  // snow drifts
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 3.2 + rand() * 9.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 8 && z > -8 && z < 8) continue;
    const s = 0.5 + rand() * 1.3;
    const drift = mesh(new THREE.SphereGeometry(s, 7, 5), snowMat, { x, y: 0.1, z, sy: 0.34, ry: rand() * 3 });
    drift.castShadow = false;
    groundGroup.add(drift);
  }

  // path stones
  const pathMat = mat('#596068', { map: stoneTex, roughness: 0.95 });
  for (let i = 0; i < 16; i++) {
    const z = 6.2 - i * 0.72;
    const x = Math.sin(i * 0.52) * 0.7;
    const st = mesh(new THREE.BoxGeometry(1.5 - rand() * 0.35, 0.08, 0.58), pathMat, {
      x, y: 0.16, z, ry: (rand() - 0.5) * 0.3,
    });
    st.receiveShadow = true; st.castShadow = false;
    groundGroup.add(st);
  }

  // rocks / cliff outcrops
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = 11 + rand() * 3.2;
    const s = 0.5 + rand() * 1.5;
    groundGroup.add(mesh(new THREE.DodecahedronGeometry(s, 0), rockMat, {
      x: Math.cos(a) * r, y: 0.1 + rand() * 0.2, z: Math.sin(a) * r,
      sy: 0.6 + rand() * 0.3, ry: rand() * 3,
    }));
  }

  // dead pines / stakes
  function deadTree(x, z, s = 1) {
    const g = new THREE.Group();
    const wood = mat('#3b2d23');
    g.add(cyl(0.13 * s, 0.22 * s, 3.2 * s, 6, wood, { y: 1.6 * s }));
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      const y = 1.2 + rand() * 2.0;
      g.add(beamBetween(
        new THREE.Vector3(0, y * s, 0),
        new THREE.Vector3(Math.cos(a) * (0.9 + rand() * 0.9) * s, (y + 0.7 + rand() * 0.9) * s, Math.sin(a) * (0.9 + rand() * 0.9) * s),
        0.08 * s, wood
      ));
    }
    g.position.set(x, 0.1, z);
    return g;
  }
  for (const [x, z, s] of [[-11.6, 4.6, 1.05], [11.9, -2.2, 0.9], [-10.5, -7.3, 0.8], [10.8, 7.0, 1.0]]) {
    groundGroup.add(deadTree(x, z, s));
  }

  // snow-capped rocks near gate
  for (const [x, z, s] of [[-7.2, -3.2, 0.8], [7.6, -3.6, 1.0], [-8.4, 1.8, 0.6]]) {
    groundGroup.add(mesh(new THREE.DodecahedronGeometry(s, 0), rockMat, { x, y: 0.2, z, sy: 0.7, ry: rand() * 3 }));
    groundGroup.add(mesh(new THREE.SphereGeometry(s * 0.82, 7, 4), snowMat, { x, y: 0.45 + s * 0.2, z, sy: 0.25 }));
  }

  scene.add(groundGroup);

  /* ---------------- gatehouse ---------------- */

  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, -8);

  const wallMat = mat('#7e8185', { map: stoneTex, roughness: 0.92 });
  const wallDark = mat('#5e6165', { map: stoneTex, roughness: 0.95 });
  const snowCapMat = mat('#edf3f8', { map: snowTex, roughness: 0.85 });
  const beamMat = mat('#3b2a1d', { map: woodTex, roughness: 0.92 });

  // gate body: two wall sections + lintel
  gateGroup.add(box(7.2, 4.6, 1.3, wallMat, { x: -5.25, y: 2.3, z: 0 }));
  gateGroup.add(box(7.2, 4.6, 1.3, wallMat, { x: 5.25, y: 2.3, z: 0 }));
  gateGroup.add(box(3.5, 1.0, 1.3, wallDark, { y: 4.1, z: 0 }));
  // crenellations
  for (let i = 0; i < 8; i++) {
    const x = -8.2 + i * 2.34;
    gateGroup.add(box(1.0, 0.9, 1.3, wallMat, { x, y: 5.05, z: 0 }));
    gateGroup.add(box(1.14, 0.12, 1.42, snowCapMat, { x, y: 5.54, z: 0 }));
  }
  // wall snow cap
  gateGroup.add(box(16.4, 0.12, 1.45, snowCapMat, { y: 4.66, z: 0 }));
  // buttresses
  for (const x of [-8.6, -1.8, 1.8, 8.6]) {
    gateGroup.add(box(1.1, 3.8, 1.9, wallDark, { x, y: 1.9, z: 0.25 }));
  }
  // gate doors
  const doorMat = mat('#5b3f2b', { map: woodTex, roughness: 0.9 });
  const ironMat = mat('#2c2e32', { metalness: 0.5, roughness: 0.55 });
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(side * 0.8, 0, 0.72);
    leaf.add(box(1.55, 3.5, 0.16, doorMat, { y: 1.75 }));
    for (const y of [0.7, 1.8, 2.9]) leaf.add(box(1.5, 0.1, 0.2, ironMat, { y }));
    for (let i = 0; i < 5; i++) leaf.add(box(0.06, 3.3, 0.18, beamMat, { x: -0.65 + i * 0.33, y: 1.75 }));
    leaf.add(cyl(0.06, 0.06, 0.3, 6, ironMat, { x: side * 0.55, y: 1.6, z: 0.13, rz: Math.PI / 2 }));
    gateGroup.add(leaf);
  }
  // gate arch stones
  gateGroup.add(box(4.0, 0.5, 1.5, wallDark, { y: 3.6, z: 0.02 }));
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    gateGroup.add(box(0.55, 0.42, 1.35, wallDark, {
      x: Math.cos(a) * 1.9, y: 3.35 + Math.sin(a) * 0.55, z: 0.05, rz: a + Math.PI / 2,
    }));
  }
  // side window on the left wall
  const win = new THREE.Group();
  win.position.set(-4.3, 2.4, 0.72);
  win.add(box(0.95, 1.1, 0.1, mat('#20242a'), {}));
  win.add(box(0.72, 0.86, 0.06, mat('#07090c'), { z: 0.06 }));
  win.add(box(0.05, 0.9, 0.1, ironMat, { z: 0.1 }));
  win.add(box(0.78, 0.05, 0.1, ironMat, { z: 0.1 }));
  win.add(box(0.55, 0.75, 0.05, beamMat, { x: -0.55, z: 0.12, rz: 0.35 }));
  gateGroup.add(win);

  // banners
  for (const x of [-6.8, 6.8]) {
    const pole = cyl(0.05, 0.06, 3.3, 6, beamMat, { x, y: 4.2, z: 0.8 });
    gateGroup.add(pole);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 2.1, 6, 8),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.9, side: THREE.DoubleSide })
    );
    banner.position.set(x + 0.78, 4.0, 0.82);
    banner.castShadow = true;
    gateGroup.add(banner);
  }

  // central watchtower
  const tower = new THREE.Group();
  tower.position.set(0, 0, -2.1);
  tower.add(box(4.2, 9.8, 4.2, wallMat, { y: 4.9 }));
  tower.add(box(4.6, 0.3, 4.6, wallDark, { y: 9.9 }));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i === 0 || i === 3 || j === 0 || j === 3) {
        tower.add(box(0.95, 0.9, 0.95, wallMat, { x: -1.55 + i * 1.03, y: 10.5, z: -1.55 + j * 1.03 }));
      }
    }
  }
  tower.add(box(4.75, 0.14, 4.75, snowCapMat, { y: 11.0 }));
  // arrow slits
  for (const [x, z, ry] of [[-2.11, -1, 0], [2.11, 1, 0], [-1, -2.11, Math.PI / 2], [1, 2.11, Math.PI / 2]]) {
    tower.add(box(0.16, 1.0, 0.1, mat('#07090c'), { x, y: 6.2, z, ry }));
  }
  // beacon bowl (cold)
  tower.add(cyl(0.9, 1.15, 0.55, 10, ironMat, { y: 11.35 }));
  tower.add(cyl(0.72, 0.72, 0.16, 10, mat('#24252a'), { y: 11.55 }));
  tower.add(sph(0.55, mat('#33343a'), { y: 11.6 }));
  gateGroup.add(tower);

  // tower-side small window (social entrance)
  gateGroup.add(box(0.18, 1.4, 0.9, mat('#07090c'), { x: -2.12, y: 5.1, z: -1.4 }));

  // icicles
  for (let i = 0; i < 18; i++) {
    const x = -8 + rand() * 16;
    const len = 0.25 + rand() * 0.55;
    gateGroup.add(cone(0.06 + rand() * 0.04, len, 5, mat('#cfe4ee', { transparent: true, opacity: 0.8 }), {
      x, y: 4.45 - len / 2, z: 0.7, rx: Math.PI,
    }));
  }

  // warm lantern above the gate
  const gateLantern = new THREE.Group();
  gateLantern.position.set(0, 3.9, 1.0);
  gateLantern.add(cyl(0.03, 0.03, 0.5, 5, ironMat, { y: 0.3 }));
  gateLantern.add(box(0.35, 0.45, 0.35, ironMat, {}));
  gateLantern.add(box(0.24, 0.3, 0.24, mat('#ffd8a0', { emissive: '#ffb35c', emissiveIntensity: 3 }), { cast: false }));
  gateLantern.add(glowSprite('#ffb45e', 2.2, 0.5));
  const gateLight = new THREE.PointLight('#ffb45e', 18, 11, 2);
  gateLight.position.set(0, 0.1, 0.3);
  gateLantern.add(gateLight);
  lanterns.push({ light: gateLight, base: 18, phase: 3.4 });
  gateGroup.add(gateLantern);

  // cold beacon on the tower (the signal fire is still out)
  const beacon = new THREE.Group();
  beacon.position.set(0, 11.5, -2.1);
  beacon.add(cyl(0.65, 0.8, 0.4, 10, ironMat, { y: 0 }));
  beacon.add(sph(0.45, mat('#6f8fa8', { emissive: '#6f8fa8', emissiveIntensity: 0.5 }), { y: 0.25, sy: 0.4 }));
  const beaconGlow = glowSprite('#6f8fa8', 2.4, 0.22);
  beaconGlow.position.y = 0.35;
  beacon.add(beaconGlow);
  gateGroup.add(beacon);
  const beaconLight = new THREE.PointLight('#9fc8ff', 16, 12, 2);
  beaconLight.position.set(0, 12.2, -2.1);
  gateGroup.add(beaconLight);
  lanterns.push({ light: beaconLight, base: 16, phase: 2.6, steady: true });

  scene.add(gateGroup);

  /* ---------------- props ---------------- */

  const pickables = [];
  const props = new Map();

  function registerProp(group, id, pickable = true) {
    if (pickable) {
      group.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'prop', id }; });
      pickables.push(group);
    }
    props.set(id, group);
    return group;
  }

  // brazier
  function makeBrazier(x, z, lit = true) {
    const g = new THREE.Group();
    const stone = mat('#55575c', { map: stoneTex });
    g.add(cyl(0.75, 0.95, 0.25, 8, stone, { y: 0.42 }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(cyl(0.06, 0.09, 0.8, 5, ironMat, { x: Math.cos(a) * 0.55, y: 0.05, z: Math.sin(a) * 0.55 }));
    }
    g.add(cyl(0.55, 0.75, 0.35, 8, ironMat, { y: 0.72 }));
    g.add(sph(0.32, mat('#2a1c14'), { y: 0.88, sy: 0.5 }));
    if (lit) {
      const flameMat = new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const flame = cone(0.42, 1.2, 6, flameMat, { y: 1.35 });
      flame.castShadow = false;
      g.add(flame);
      const inner = cone(0.24, 0.8, 5, new THREE.MeshBasicMaterial({ color: '#ffd38a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), { y: 1.25 });
      g.add(inner);
      g.userData.flames = [flame, inner];
      const light = new THREE.PointLight('#ff9a4c', 24, 13, 2);
      light.position.y = 1.4;
      g.add(light);
      lanterns.push({ light, base: 24, phase: z + x });
      const glow = glowSprite('#ff8a3a', 4.0, 0.42);
      glow.position.y = 1.3;
      g.add(glow);
    }
    g.position.set(x, 0.05, z);
    return g;
  }


  const brazier1 = makeBrazier(5.4, -3.4, true);
  scene.add(brazier1); registerProp(brazier1, 'brazier');
  const brazier2 = makeBrazier(-6.0, -4.8, true);
  scene.add(brazier2); registerProp(brazier2, 'brazier2');

  // wall torches
  for (const [x, z] of [[-1.7, -7.2], [1.7, -7.2]]) {
    const g = new THREE.Group();
    g.add(cyl(0.05, 0.06, 0.65, 5, beamMat, { y: 3.0, rx: 0.4 }));
    g.add(box(0.22, 0.3, 0.22, ironMat, { y: 3.3, z: 0.2 }));
    g.add(sph(0.16, mat('#ffb35c', { emissive: '#ff8a3a', emissiveIntensity: 3 }), { y: 3.32, z: 0.22 }));
    const light = new THREE.PointLight('#ff9a4c', 10, 8, 2);
    light.position.set(0, 3.3, 0.5);
    g.add(light);
    lanterns.push({ light, base: 10, phase: x });
    const torchGlow = glowSprite('#ff9a4c', 1.8, 0.35);
    torchGlow.position.set(0, 3.3, 0.3);
    g.add(torchGlow);
    g.position.set(x, 0, z + 0.7);
    scene.add(g);
  }

  // broken cart
  const cart = new THREE.Group();
  cart.position.set(-7.1, 0.1, 2.4);
  cart.rotation.set(0.1, 0.4, -0.16);
  cart.add(box(3.2, 0.18, 1.7, beamMat, { y: 1.0 }));
  for (let i = 0; i < 6; i++) cart.add(box(0.42, 0.1, 1.65, woodMat(), { x: -1.35 + i * 0.55, y: 1.12 }));
  for (const x of [-1.2, 1.2]) {
    const wheel = new THREE.Group();
    wheel.position.set(x, 0.72, 0.85);
    wheel.rotation.x = Math.PI / 2;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 6, 10), beamMat));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      wheel.add(box(0.08, 1.1, 0.08, beamMat, { rz: a }));
    }
    cart.add(wheel);
  }
  cart.add(box(0.14, 0.14, 2.2, beamMat, { x: -1.3, y: 0.95, z: -1.3, rz: 0.4 }));
  scene.add(cart); registerProp(cart, 'cart');

  function woodMat() { return mat('#4a3423', { map: woodTex, roughness: 0.95 }); }

  // crates / barrels near gate
  const crateGroup = new THREE.Group();
  function crate(x, z, s = 1, ry = 0) {
    const g = new THREE.Group();
    g.add(box(0.85 * s, 0.85 * s, 0.85 * s, woodMat(), { y: 0.42 * s }));
    for (const [dx, dz] of [[0.44, 0], [-0.44, 0], [0, 0.44], [0, -0.44]]) {
      g.add(box(0.06 * s, 0.86 * s, 0.06 * s, mat('#2d1f15'), { x: dx * s, y: 0.42 * s, z: dz * s }));
    }
    g.position.set(x, 0.1, z); g.rotation.y = ry;
    return g;
  }
  crateGroup.add(crate(-2.9, -5.4, 1.05, 0.3));
  crateGroup.add(crate(-2.2, -4.6, 0.8, -0.2));
  crateGroup.add(crate(2.8, -5.3, 0.9, 0.7));
  function barrel(x, z, s = 1) {
    const g = new THREE.Group();
    g.add(cyl(0.4 * s, 0.36 * s, 0.9 * s, 9, woodMat(), { y: 0.45 * s }));
    for (const y of [0.2, 0.7]) g.add(cyl(0.42 * s, 0.42 * s, 0.06 * s, 9, ironMat, { y: y * s }));
    g.position.set(x, 0.1, z);
    return g;
  }
  crateGroup.add(barrel(4.1, -4.5, 0.9));
  crateGroup.add(barrel(4.8, -3.9, 0.7));
  scene.add(crateGroup); registerProp(crateGroup, 'crates');

  // corpse (investigation)
  const corpse = new THREE.Group();
  corpse.position.set(5.7, 0.12, 1.6);
  corpse.rotation.y = -0.6;
  const bodyMat = mat('#3a312b', { roughness: 1 });
  corpse.add(sph(0.5, bodyMat, { y: 0.28, sx: 1.4, sy: 0.5, sz: 0.8 }));
  corpse.add(sph(0.24, mat('#c8b08c'), { x: 0.6, y: 0.36, z: 0.12 }));
  corpse.add(box(0.22, 0.1, 0.35, mat('#24201c'), { x: 0.8, y: 0.26, z: 0.05 }));
  corpse.add(box(0.9, 0.12, 0.16, bodyMat, { x: -0.35, y: 0.2, z: 0.42, rz: 0.4 }));
  corpse.add(box(0.9, 0.12, 0.16, bodyMat, { x: -0.35, y: 0.2, z: -0.42, rz: -0.4 }));
  for (let i = 0; i < 6; i++) corpse.add(box(0.1, 0.06, 0.3, mat('#c8b08c'), { x: 1.0 + rand() * 0.8, y: 0.12, z: -0.4 + rand() * 0.8, ry: rand() * 3 }));
  scene.add(corpse); registerProp(corpse, 'corpse');

  // drag marks
  const drag = new THREE.Group();
  const dragMat = mat('#8d9aa5', { roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = -5.8 + t * 3.0;
    const z = 0.7 - t * 5.8;
    const strip = box(0.22, 0.02, 0.9, dragMat, { x, y: 0.18, z, ry: 0.2 + t * 0.3 });
    strip.castShadow = false;
    drag.add(strip);
  }
  scene.add(drag); registerProp(drag, 'tracks');

  // broken shield / sword near corpse
  const gear = new THREE.Group();
  gear.position.set(4.3, 0.2, 2.7);
  gear.rotation.y = 0.5;
  gear.add(cyl(0.42, 0.42, 0.08, 10, mat('#5b4a36'), { rx: Math.PI / 2 }));
  gear.add(cyl(0.08, 0.08, 0.1, 8, ironMat, { rx: Math.PI / 2, z: 0.04 }));
  gear.add(box(0.08, 0.1, 1.7, mat('#8b939c', { metalness: 0.5, roughness: 0.5 }), { x: 0.8, y: 0.05, z: 0.3, ry: 0.7 }));
  scene.add(gear); registerProp(gear, 'gear');

  // stakes / palisade at the edges
  for (const [x, z, s] of [[-10.2, 2.4, 1], [-9.8, 1.2, 0.8], [10.2, 4.4, 0.9]]) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      g.add(cone(0.14, 1.6 + rand() * 0.5, 4, beamMat, { x: -1.2 + i * 0.7, y: 0.8, z: rand() * 0.3, rz: 0.1 + rand() * 0.16 }));
    }
    g.position.set(x, 0.1, z); g.scale.setScalar(s);
    scene.add(g); registerProp(g, `stakes-${x}`);
  }

  /* ---------------- dice tray ---------------- */

  const tray = new THREE.Group();
  tray.position.set(0, 0.28, 8.2);
  tray.add(box(4.8, 0.16, 2.8, woodMat(), { y: 0 }));
  tray.add(box(4.4, 0.05, 2.4, mat('#2b1d22', { roughness: 1 }), { y: 0.1 }));
  for (const [x, z, w, d] of [[0, 1.36, 4.8, 0.12], [0, -1.36, 4.8, 0.12], [2.36, 0, 0.12, 2.8], [-2.36, 0, 0.12, 2.8]]) {
    tray.add(box(w, 0.16, d, woodMat(), { x, y: 0.16, z }));
  }
  tray.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'dice' }; });
  pickables.push(tray);
  scene.add(tray);

  // a candle at the table edge lifts the dice and the party
  const candle = new THREE.Group();
  candle.position.set(3.1, 0.25, 8.8);
  candle.add(cyl(0.12, 0.16, 0.12, 8, mat('#2c2e32', { metalness: 0.5 }), { y: 0.06 }));
  candle.add(cyl(0.05, 0.06, 0.5, 7, mat('#d8d0bd'), { y: 0.36 }));
  candle.add(cone(0.09, 0.26, 6, new THREE.MeshBasicMaterial({ color: '#ffd38a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), { y: 0.78 }));
  const candleLight = new THREE.PointLight('#ffb36a', 16, 10, 2);
  candleLight.position.y = 0.9;
  candle.add(candleLight);
  const candleGlow = glowSprite('#ffb36a', 2.2, 0.4);
  candleGlow.position.y = 0.8;
  candle.add(candleGlow);
  lanterns.push({ light: candleLight, base: 16, phase: 1.1 });
  scene.add(candle);

  const TRAY_TOP = tray.position.y + 0.13;
  const DICE_RADIUS = 0.52;

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
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#c9a36a', transparent: true, opacity: 0.55 }));
    group.add(edge);

    const pos = geo.attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const faces = [];
    for (let f = 0; f < 20; f++) {
      a.fromBufferAttribute(pos, f * 3);
      b.fromBufferAttribute(pos, f * 3 + 1);
      c.fromBufferAttribute(pos, f * 3 + 2);
      const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
      const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      if (normal.dot(centroid) < 0) normal.negate();
      faces.push({ normal: normal.clone(), centroid: centroid.clone() });

      const inset = (p) => p.clone().addScaledVector(new THREE.Vector3().subVectors(centroid, p), 0.17).addScaledVector(normal, 0.006);
      const dg = new THREE.BufferGeometry();
      const p1 = inset(a), p2 = inset(b), p3 = inset(c);
      dg.setAttribute('position', new THREE.Float32BufferAttribute([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z], 3));
      // UVs: triangle region in the number texture
      dg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0.88, 0.08, 0.08, 0.92, 0.08], 2));
      const dm = new THREE.MeshBasicMaterial({
        map: numberTexture(f + 1), transparent: true, side: THREE.DoubleSide,
        depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2,
      });
      const decal = new THREE.Mesh(dg, dm);
      decal.renderOrder = 3;
      decal.userData.noPick = true;
      group.add(decal);
    }
    group.userData.faces = faces;
    group.userData.radius = radius;
    return group;
  }

  const dice = [buildD20(), buildD20()];
  dice[0].position.set(-0.95, TRAY_TOP + 0.46, 8.2);
  dice[1].position.set(0.95, TRAY_TOP + 0.46, 8.2);
  dice[0].rotation.set(0.3, 0.8, 0.1);
  dice[1].rotation.set(0.7, -0.4, 0.2);
  for (const d of dice) scene.add(d);

  // park second die by default
  dice[1].visible = false;

  function faceFor(n) {
    // numbers map to faces sequentially; face index is n-1
    return dice[0].userData.faces[n - 1];
  }

  function orientDie(die, value) {
    const face = die.userData.faces[value - 1];
    const q = new THREE.Quaternion().setFromUnitVectors(face.normal, new THREE.Vector3(0, 1, 0));
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    die.quaternion.copy(q).multiply(spin);
    die.position.y = TRAY_TOP + die.userData.radius * 0.86;
  }

  /* ---------------- character minis ---------------- */

  const tokens = new Map();
  const tagLayer = document.getElementById('tags');

  const SIDE_RING = {
    bran: '#c9a35d', vera: '#7ba08b', oren: '#7f9dc9', ada: '#c98d72',
    knight: '#b34a3f', hound1: '#8b5b4d', hound2: '#8b5b4d',
  };

  function makeBase(radius, color) {
    const g = new THREE.Group();
    g.add(cyl(radius, radius * 1.06, 0.12, 16, mat('#2b3037', { metalness: 0.4, roughness: 0.5 }), { y: 0.06 }));
    g.add(mesh(new THREE.TorusGeometry(radius * 0.93, 0.035, 5, 20), mat(color, { metalness: 0.4, roughness: 0.45, emissive: color, emissiveIntensity: 0.18 }), { rx: Math.PI / 2, y: 0.13 }));
    return g;
  }

  function person(cfg = {}) {
    const {
      skin = '#cf9f79', coat = '#41505b', coat2 = null, pants = '#25262b',
      accent = '#b98d55', hat = null, scale = 1, cloak = false, armor = false,
      hair = '#2a211c',
    } = cfg;
    const g = new THREE.Group();
    const M = {
      coat: mat(coat, { roughness: 0.92 }),
      coat2: mat(coat2 || coat, { roughness: 0.92 }),
      pants: mat(pants, { roughness: 0.95 }),
      skin: mat(skin, { roughness: 0.9 }),
      accent: mat(accent, { metalness: 0.35, roughness: 0.5 }),
      dark: mat('#1e2026', { roughness: 0.9 }),
      boot: mat('#241d17', { roughness: 0.95 }),
      hair: mat(hair, { roughness: 0.95 }),
      metal: mat('#777c82', { metalness: 0.65, roughness: 0.42 }),
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
      c.position.y = -0.12; c.castShadow = true; c.receiveShadow = true;
      torso.add(c);
    }
    const head = new THREE.Group(); head.position.y = 0.92; torso.add(head);
    head.add(sph(0.225, M.skin, { ws: 10, hs: 8 }));
    head.add(box(0.045, 0.05, 0.035, M.dark, { x: -0.08, y: 0.03, z: 0.2, cast: false }));
    head.add(box(0.045, 0.05, 0.035, M.dark, { x: 0.08, y: 0.03, z: 0.2, cast: false }));
    head.add(box(0.05, 0.06, 0.05, M.skin, { y: -0.02, z: 0.22, cast: false }));
    if (hat === 'hood') {
      head.add(cone(0.3, 0.42, 8, M.coat2, { y: 0.18 }));
    } else if (hat === 'helm') {
      head.add(mesh(new THREE.SphereGeometry(0.255, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.metal, { y: 0.02 }));
      head.add(box(0.22, 0.12, 0.06, M.dark, { y: 0.03, z: 0.21, cast: false }));
      head.add(box(0.05, 0.28, 0.36, M.accent, { y: 0.18, z: 0 }));
    } else {
      head.add(sph(0.232, M.hair, { y: 0.045, sz: 1.02 }));
    }

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
    return { group: g, refs: { torso, head, armL, armR, legL, legR, hip }, M };
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

  function makeToken(id, mini, { base = 0.62, color = '#c9a35d' } = {}) {
    const g = new THREE.Group();
    g.add(makeBase(base, color));
    g.add(mini);
    g.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'token', id }; });
    const label = document.createElement('div');
    label.className = 'token-tag';
    label.dataset.id = id;
    tagLayer.appendChild(label);
    tokens.set(id, { id, group: g, mini, label, hp: 1, maxHp: 1, down: false, active: false, target: false, side: 'party' });
    pickables.push(g);
    scene.add(g);
    return g;
  }

  // Bran
  {
    const p = person({ coat: '#4a5158', coat2: '#7c2d2d', pants: '#2c2d33', armor: true, accent: '#c9a35d', hat: 'helm', cloak: true, scale: 1.02 });
    addSword(p.refs.armR.lower, 1, 1.1);
    addShield(p.refs.armL.lower, -1);
    p.group.rotation.y = 0.15;
    makeToken('bran', p.group, { base: 0.66, color: SIDE_RING.bran });
    tokens.get('bran').group.position.set(-3.3, 0.12, 4.6);
  }
  // Vera
  {
    const p = person({ coat: '#405346', coat2: '#26352c', pants: '#2a2824', hat: 'hood', accent: '#b98d55', cloak: true, scale: 0.9, skin: '#d3a47f' });
    const bow = new THREE.Group();
    bow.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 5, 12, Math.PI * 1.4), beamMat));
    bow.rotation.set(Math.PI / 2, 0.2, 0.4);
    bow.position.set(0.25, 1.4, -0.25);
    p.group.add(bow);
    p.group.rotation.y = -0.2;
    makeToken('vera', p.group, { base: 0.56, color: SIDE_RING.vera });
    tokens.get('vera').group.position.set(0.1, 0.12, 4.9);
  }
  // Oren
  {
    const p = person({ coat: '#33445f', coat2: '#4d6687', pants: '#23262e', accent: '#b98d55', cloak: true, scale: 1.0, skin: '#d9b08a' });
    const staff = new THREE.Group();
    staff.add(cyl(0.035, 0.045, 2.2, 6, beamMat, { y: 1.1 }));
    const orb = sph(0.14, mat('#9fc8e6', { emissive: '#6db6e8', emissiveIntensity: 2.5 }), { y: 2.2 });
    staff.add(orb);
    const staffGlow = glowSprite('#78b8e6', 1.2, 0.42);
    staffGlow.position.y = 2.2;
    staff.add(staffGlow);
    staff.position.set(0.5, 0, 0.1);
    p.group.add(staff);
    p.group.rotation.y = 0.3;
    makeToken('oren', p.group, { base: 0.58, color: SIDE_RING.oren });
    tokens.get('oren').group.position.set(3.4, 0.12, 4.7);
  }
  // Ada
  {
    const p = person({ coat: '#4d4a43', coat2: '#37352f', pants: '#2a2924', hat: 'hood', accent: '#b98d55', cloak: true, scale: 0.94, skin: '#caa07b' });
    const spear = new THREE.Group();
    spear.add(cyl(0.028, 0.028, 2.3, 6, beamMat, { y: 1.15 }));
    spear.add(cone(0.08, 0.32, 5, mat('#9aa1a8', { metalness: 0.6 }), { y: 2.45 }));
    spear.position.set(0.5, 0, 0.05);
    p.group.add(spear);
    p.group.rotation.y = 0.1;
    makeToken('ada', p.group, { base: 0.58, color: SIDE_RING.ada });
    tokens.get('ada').group.position.set(-2.9, 0.12, -2.8);
    tokens.get('ada').side = 'npc';
    tokens.get('ada').group.visible = false;
  }
  // Ash knight
  {
    const g = new THREE.Group();
    const plate = mat('#2b2d33', { metalness: 0.55, roughness: 0.5 });
    const plate2 = mat('#3a3c42', { metalness: 0.6, roughness: 0.45 });
    const emberMat = mat('#c75a33', { emissive: '#ff6a2a', emissiveIntensity: 2.2, roughness: 0.6 });
    g.scale.setScalar(1.18);
    const p = person({ coat: '#25272c', coat2: '#3b3d43', pants: '#1b1c20', accent: '#6d7078', hat: 'helm', armor: true, scale: 1.25, skin: '#8b8177' });
    // replace/add horned helm + ember cracks
    p.refs.head.add(cone(0.09, 0.5, 5, plate2, { x: -0.2, y: 0.25, z: -0.02, rz: 0.4 }));
    p.refs.head.add(cone(0.09, 0.5, 5, plate2, { x: 0.2, y: 0.25, z: -0.02, rz: -0.4 }));
    for (let i = 0; i < 8; i++) {
      const c = box(0.035, 0.2 + rand() * 0.3, 0.02, emberMat, { x: -0.3 + rand() * 0.6, y: 0.2 + rand() * 0.6, z: 0.19, rz: (rand() - 0.5) * 1.2 });
      p.refs.torso.add(c);
    }
    const great = new THREE.Group();
    great.add(box(0.08, 1.9, 0.2, mat('#4a4c52', { metalness: 0.6, roughness: 0.4 }), { y: 0.95 }));
    great.add(box(0.42, 0.08, 0.24, plate2, { y: 0.04 }));
    great.rotation.z = -0.16;
    great.position.set(0.55, 0.2, 0.1);
    p.group.add(great);
    p.group.rotation.y = 0.1;
    g.add(p.group);
    g.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'token', id: 'knight' }; });
    const label = document.createElement('div');
    label.className = 'token-tag is-enemy';
    label.dataset.id = 'knight';
    tagLayer.appendChild(label);
    tokens.set('knight', { id: 'knight', group: g, label, hp: 55, maxHp: 55, down: false, side: 'enemy' });
    g.position.set(0.4, 0.12, -2.2);
    g.visible = false;
    pickables.push(g);
    scene.add(g);
  }
  // Hounds
  for (const [id, x] of [['hound1', -2.6], ['hound2', 3.1]]) {
    const g = new THREE.Group();
    const fur = mat('#2c2724', { roughness: 0.95 });
    const ember = mat('#d36a35', { emissive: '#ff6a2a', emissiveIntensity: 2 });
    g.add(sph(0.38, fur, { y: 0.55, sx: 1.6, sy: 0.8, sz: 0.8 }));
    const head = new THREE.Group(); head.position.set(0.58, 0.62, 0); g.add(head);
    head.add(sph(0.22, fur, { sx: 1.25, sy: 0.9, sz: 0.9 }));
    head.add(cone(0.06, 0.24, 4, fur, { x: -0.12, y: 0.18, rz: -0.25 }));
    head.add(cone(0.06, 0.24, 4, fur, { x: 0.12, y: 0.18, rz: 0.25 }));
    head.add(sph(0.035, ember, { x: -0.08, y: 0.03, z: 0.18, cast: false }));
    head.add(sph(0.035, ember, { x: 0.08, y: 0.03, z: 0.18, cast: false }));
    for (const [dx, dz] of [[-0.35, -0.2], [-0.35, 0.2], [0.4, -0.2], [0.4, 0.2]]) {
      g.add(box(0.12, 0.55, 0.12, fur, { x: dx, y: 0.28, z: dz }));
      g.add(box(0.15, 0.08, 0.18, mat('#1b1918'), { x: dx, y: 0.04, z: dz + 0.05 }));
    }
    const tail = cyl(0.03, 0.06, 0.7, 5, fur, { x: -0.62, y: 0.62, z: 0, rz: -0.8 });
    g.add(tail);
    for (let i = 0; i < 4; i++) {
      g.add(box(0.32, 0.025, 0.03, ember, { x: -0.1 + i * 0.13, y: 0.68, z: 0.19, rz: 0.2 }));
    }
    g.traverse((o) => { if (o.isMesh) o.userData.pick = { kind: 'token', id }; });
    const label = document.createElement('div');
    label.className = 'token-tag is-enemy';
    label.dataset.id = id;
    tagLayer.appendChild(label);
    tokens.set(id, { id, group: g, label, hp: 11, maxHp: 11, down: false, side: 'enemy' });
    g.position.set(x, 0.12, -2.6);
    g.rotation.y = id === 'hound1' ? 0.3 : -0.3;
    g.visible = false;
    pickables.push(g);
    scene.add(g);
  }

  // selection rings
  const activeRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.82, 40), new THREE.MeshBasicMaterial({ color: '#e6b06a', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  activeRing.rotation.x = -Math.PI / 2; activeRing.visible = false; activeRing.renderOrder = 4; activeRing.raycast = () => {};
  scene.add(activeRing);
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.74, 0.86, 40), new THREE.MeshBasicMaterial({ color: '#d3645a', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  targetRing.rotation.x = -Math.PI / 2; targetRing.visible = false; targetRing.renderOrder = 4; targetRing.raycast = () => {};
  scene.add(targetRing);

  function ringForToken(token, ring) {
    if (!token) { ring.visible = false; return; }
    const p = token.group.position;
    ring.position.set(p.x, 0.24, p.z);
    ring.visible = true;
    const s = token.side === 'enemy' && token.id !== 'knight' ? 0.8 : 1;
    ring.scale.setScalar(s);
  }

  /* ---------------- hotspots ---------------- */

  const hotspots = new Map();
  const hotspotData = {
    gate: { pos: [0.0, 0.3, -5.6], title: '大门与门闩' },
    tracks: { pos: [-5.9, 0.3, 0.6], title: '崖边的拖痕' },
    corpse: { pos: [5.7, 0.3, 1.6], title: '烧焦的斥候' },
  };
  for (const [id, data] of Object.entries(hotspotData)) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 28), new THREE.MeshBasicMaterial({ color: '#8db6c9', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const gem = mesh(new THREE.OctahedronGeometry(0.27, 0), mat('#b9e2f2', { emissive: '#7ccdee', emissiveIntensity: 3.2 }), { y: 0.95 });
    gem.castShadow = false;
    g.add(gem);
    const glow = glowSprite('#7fb3cf', 2.8, 0.7);
    glow.position.y = 0.95;
    g.add(glow);
    g.position.set(...data.pos);
    g.traverse((o) => { if (o.isMesh || o.isSprite) o.userData.pick = { kind: 'prop', id, hotspot: true }; });
    const label = document.createElement('div');
    label.className = 'prop-tag';
    label.textContent = data.title;
    tagLayer.appendChild(label);
    hotspots.set(id, { group: g, ring, gem, glow, label, title: data.title, done: false, success: false });
    g.userData.hotspot = true;
    pickables.push(g);
    scene.add(g);
  }

  /* ---------------- snowfall / embers ---------------- */

  const snowCount = 700;
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (rand() - 0.5) * 30;
    snowPos[i * 3 + 1] = rand() * 16;
    snowPos[i * 3 + 2] = (rand() - 0.5) * 30 - 2;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMatPts = new THREE.PointsMaterial({ color: '#e8f2fb', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  const snowfall = new THREE.Points(snowGeo, snowMatPts);
  snowfall.userData.isFx = true;
  scene.add(snowfall);

  const emberGeo = new THREE.BufferGeometry();
  const emberCount = 90;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (rand() - 0.5) * 20;
    emberPos[i * 3 + 1] = 0.4 + rand() * 8;
    emberPos[i * 3 + 2] = -8 + rand() * 14;
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({ color: '#e78a52', size: 0.045, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.userData.isFx = true;
  scene.add(embers);

  /* ---------------- interaction ---------------- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;

  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; hideHint(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const dt = performance.now() - down.t;
    down = null;
    if (moved > 6 || dt > 450) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) onPick?.({ ...hit });
  });
  canvas.addEventListener('pointerleave', () => { down = null; });

  let hoverAt = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - hoverAt < 90) return;
    hoverAt = now;
    canvas.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
  });

  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      let o = hit.object;
      while (o && !o.userData.pick) o = o.parent;
      if (o?.userData.pick) return o.userData.pick;
    }
    return null;
  }

  function hideHint() {
    const h = document.getElementById('table-hint');
    if (h) h.style.opacity = '0';
  }

  /* ---------------- labels ---------------- */

  const tmpVec = new THREE.Vector3();
  function projectToScreen(x, y, z) {
    tmpVec.set(x, y, z).project(camera);
    return {
      x: (tmpVec.x * 0.5 + 0.5) * window.innerWidth,
      y: (-tmpVec.y * 0.5 + 0.5) * window.innerHeight,
      visible: tmpVec.z < 1 && tmpVec.z > -1,
    };
  }

  function updateLabels() {
    for (const t of tokens.values()) {
      if (!t.group.visible) { t.label.style.display = 'none'; continue; }
      const p = t.group.position;
      const s = projectToScreen(p.x, p.y + (t.side === 'enemy' && t.id !== 'knight' ? 1.35 : 2.65), p.z);
      t.label.style.display = s.visible ? '' : 'none';
      if (s.visible) {
        t.label.style.left = `${s.x}px`;
        t.label.style.top = `${s.y}px`;
      }
    }
    for (const h of hotspots.values()) {
      if (!h.group.visible) { h.label.style.display = 'none'; continue; }
      const p = h.group.position;
      const s = projectToScreen(p.x, p.y + 1.25, p.z);
      h.label.style.display = s.visible ? '' : 'none';
      if (s.visible) {
        h.label.style.left = `${s.x}px`;
        h.label.style.top = `${s.y}px`;
      }
    }
  }

  /* ---------------- animation ---------------- */

  let clockTime = 0;
  let shake = 0;
  let last = performance.now();
  let firstFrame = true;
  let rolling = null;

  function animateDice(dt) {
    if (!rolling) return;
    rolling.t += dt;
    const k = Math.min(1, rolling.t / rolling.dur);
    for (let i = 0; i < rolling.count; i++) {
      const d = dice[i];
      const a = rolling.start[i];
      const e = k * k;
      d.position.x = a.x + (rolling.end[i].x - a.x) * e;
      d.position.z = a.z + (rolling.end[i].z - a.z) * e;
      d.position.y = a.y + Math.sin(k * Math.PI) * a.lift - k * 0.12;
      d.rotation.x += dt * (8 + i * 2);
      d.rotation.y += dt * (11 + i * 3);
      d.rotation.z += dt * (6 + i);
    }
    if (k >= 1) {
      const values = rolling.values;
      for (let i = 0; i < rolling.count; i++) {
        orientDie(dice[i], values[i]);
      }
      const resolve = rolling.resolve;
      rolling = null;
      setTimeout(() => resolve(), 120);
    }
  }

  function animate() {
    const now = performance.now();
    const rawDt = Math.max(0, (now - last) / 1000);
    const dt = Math.min(rawDt, 0.05);
    last = now;
    clockTime += dt;
    const t = clockTime;

    updateCam(Math.min(rawDt, 0.4));
    controls.update();
    animateDice(Math.min(rawDt, 0.4));

    // snow
    const sp = snowGeo.attributes.position.array;
    for (let i = 0; i < snowCount; i++) {
      sp[i * 3 + 1] -= dt * (0.7 + (i % 7) * 0.06);
      sp[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.15;
      if (sp[i * 3 + 1] < 0.1) {
        sp[i * 3 + 1] = 15;
        sp[i * 3] = (rand() - 0.5) * 30;
        sp[i * 3 + 2] = (rand() - 0.5) * 30 - 2;
      }
    }
    snowGeo.attributes.position.needsUpdate = true;

    // embers
    const ep = emberGeo.attributes.position.array;
    for (let i = 0; i < emberCount; i++) {
      ep[i * 3 + 1] += dt * (0.25 + (i % 5) * 0.07);
      if (ep[i * 3 + 1] > 9) ep[i * 3 + 1] = 0.3;
    }
    emberGeo.attributes.position.needsUpdate = true;

    // braziers
    for (const l of lanterns) {
      l.light.intensity = l.base * (0.9 + Math.sin(t * 9 + l.phase) * 0.06 + Math.sin(t * 23 + l.phase) * 0.03);
    }
    for (const p of [brazier1, brazier2]) {
      if (p.userData.flames) {
        p.userData.flames[0].scale.y = 1 + Math.sin(t * 8.2) * 0.12;
        p.userData.flames[0].rotation.y = t * 1.1;
        p.userData.flames[1].scale.y = 1 + Math.sin(t * 10.6 + 1) * 0.14;
      }
    }

    // hotspot pulse
    for (const h of hotspots.values()) {
      if (!h.group.visible) continue;
      const pulse = 1 + Math.sin(t * 2.3) * 0.08;
      h.ring.scale.setScalar(pulse);
      h.gem.position.y = 0.95 + Math.sin(t * 1.6) * 0.08;
      h.gem.rotation.y = t * 0.8;
    }
    if (activeRing.visible) {
      activeRing.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.2;
      activeRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04);
    }
    if (targetRing.visible) {
      targetRing.material.opacity = 0.5 + Math.sin(t * 3.2) * 0.2;
    }

    // camera shake (visual only, CSS transform on the canvas)
    if (shake > 0.001) {
      shake = Math.max(0, shake - dt * 1.6);
      const k = shake * shake;
      canvas.style.transform = `translate(${Math.sin(t * 41) * k * 14}px, ${Math.sin(t * 53) * k * 8}px)`;
    } else if (canvas.style.transform) {
      canvas.style.transform = '';
    }

    // tokens breathing
    for (const tk of tokens.values()) {
      if (!tk.group.visible) continue;
      const baseY = 0.12;
      tk.group.position.y = baseY + Math.sin(t * 1.3 + tk.group.position.x) * 0.008;
    }

    updateLabels();
    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      setTimeout(() => document.getElementById('loader')?.classList.add('is-done'), 260);
    }
  }

  let raf = requestAnimationFrame(function loop() {
    animate();
    raf = requestAnimationFrame(loop);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = homeConfig().fov;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- public API ---------------- */

  function setPhase(phase) {
    const isExplore = phase === 'explore';
    const isSocial = phase === 'social';
    const isCombat = phase === 'combat';
    for (const h of hotspots.values()) h.group.visible = isExplore;
    tokens.get('ada').group.visible = isSocial || (isCombat && tokens.get('ada').ally) || ((phase === 'rest' || phase === 'level') && tokens.get('ada').ally);
    tokens.get('knight').group.visible = isCombat;
    tokens.get('hound1').group.visible = isCombat;
    tokens.get('hound2').group.visible = isCombat;
    if (!isCombat) {
      activeRing.visible = false;
      targetRing.visible = false;
    }
    // camera subtle framing per phase
    if (isCombat) {
      if (isPortrait()) tweenCamera(new THREE.Vector3(23, 17.5, 29), new THREE.Vector3(0, 1.2, -1.2), 0.9);
      else tweenCamera(new THREE.Vector3(13.5, 11.5, 18.5), new THREE.Vector3(0, 1.1, -1.2), 0.9);
    } else if (isExplore) {
      tweenCamera(HOME.pos.clone(), HOME.target.clone(), 0.9);
    }
  }

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

  function setToken(id, state) {
    const t = tokens.get(id);
    if (!t) return;
    Object.assign(t, state);
    const pct = t.maxHp ? clamp(t.hp / t.maxHp, 0, 1) : 0;
    const cls = ['token-tag', t.side === 'enemy' ? 'is-enemy' : '', t.side === 'npc' ? 'is-ally' : '', t.down ? 'is-down' : '', t.active ? 'is-on' : '', t.target ? 'is-target' : ''].filter(Boolean).join(' ');
    t.label.className = cls;
    t.label.innerHTML = `${t.name || ''}<span class="t-hp"><i style="width:${pct * 100}%"></i></span>`;
  }

  function setTokenMeta(id, meta) {
    const t = tokens.get(id);
    if (!t) return;
    t.name = meta.name || t.name;
    setToken(id, { hp: meta.hp ?? t.hp, maxHp: meta.maxHp ?? t.maxHp, down: meta.down ?? t.down, active: meta.active ?? t.active, target: meta.target ?? t.target });
  }

  function setActive(id) {
    for (const t of tokens.values()) {
      t.active = t.id === id;
      if (t.active) ringForToken(t, activeRing);
    }
    activeRing.visible = !!id && !!tokens.get(id)?.group.visible;
  }

  function setTarget(id) {
    for (const t of tokens.values()) t.target = t.id === id;
    const t = tokens.get(id);
    if (t) { ringForToken(t, targetRing); targetRing.visible = true; }
    else targetRing.visible = false;
  }

  function setHotspot(id, state) {
    const h = hotspots.get(id);
    if (!h) return;
    Object.assign(h, state);
    h.label.classList.toggle('is-done', !!h.done);
    h.ring.material.color.set(h.done ? (h.success ? '#84b98c' : '#8b6f6f') : '#a5d2e4');
    h.gem.material.color.set(h.done ? (h.success ? '#84b98c' : '#8b6f6f') : '#8db6c9');
    h.glow.material.color.set(h.done ? (h.success ? '#84b98c' : '#8b6f6f') : '#7fb3cf');
  }

  function setAdaAlly(ally) {
    const t = tokens.get('ada');
    t.ally = !!ally;
    t.side = ally ? 'npc' : 'npc';
    t.label.classList.toggle('is-ally', !!ally);
  }

  function roll(values, mode = 'normal') {
    return new Promise((resolve) => {
      if (rolling) { resolve(null); return; }
      const count = mode === 'normal' ? 1 : 2;
      dice[0].visible = true;
      dice[1].visible = count > 1;
      const start = dice.map((d, i) => ({ x: (i === 0 ? -0.95 : 0.95), y: TRAY_TOP + 0.46, z: 8.2, lift: 1.4 + rand() * 0.5 }));
      const end = dice.slice(0, count).map((d, i) => ({
        x: (i === 0 ? -0.95 : 0.95) + (rand() - 0.5) * 0.6,
        z: 8.2 + (rand() - 0.5) * 0.6,
      }));
      for (let i = 0; i < count; i++) {
        dice[i].visible = true;
        dice[i].position.set(start[i].x, start[i].y, start[i].z);
      }
      rolling = { t: 0, dur: QA ? 0.18 : 1.1, count, values, start, end, resolve };
    });
  }

  function scatterDice() {
    dice[0].visible = true;
    dice[1].visible = false;
    orientDie(dice[0], 20);
    dice[0].position.set(-0.95, TRAY_TOP + 0.46, 8.2);
  }
  scatterDice();

  function shakeIt(amount = 0.3) { shake = Math.min(1, shake + amount); }

  function floatAt(tokenId, text, cls = '') {
    const t = tokens.get(tokenId);
    if (!t) return;
    const s = projectToScreen(t.group.position.x, t.group.position.y + 2.7, t.group.position.z);
    if (!s.visible) return;
    const el = document.createElement('div');
    el.className = `float-text ${cls}`;
    el.textContent = text;
    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;
    tagLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function resetCamera() {
    const h = homeConfig();
    camera.fov = h.fov;
    camera.updateProjectionMatrix();
    tweenCamera(h.pos.clone(), h.target.clone(), 0.9);
  }

  return {
    scene, camera, controls, tokens, hotspots, dice, tray,
    setPhase, setToken, setTokenMeta, setActive, setTarget, setHotspot, setAdaAlly,
    roll, shake: shakeIt, floatAt, resetCamera, setHome: resetCamera,
    scatterDice,
    get phaseHomes() { return HOMES; },
  };
}
