import * as THREE from './vendor/three.module.min.js';
import { makeLabelTexture, mulberry32 } from './world.js';

const rng = mulberry32(424242);
const rand = (a, b) => a + (b - a) * rng();

const TYPE_COLORS = {
  city: 0xe0c07a, town: 0xd9ad62, ruins: 0x9a8464, point_of_interest: 0x73b9b2,
  peak: 0x8d8270, mountains: 0x77705f, hills: 0x8c8352, forest: 0x37502e,
  marsh: 0x4a5438, trail: 0xb98a4a, road: 0x9a5a32,
};

function hexPos(c, r) {
  return [c * 9.6, r * 8.35 + (c % 2 ? 4.17 : 0)];
}
function siteAt(map, id) {
  return (map.sites || []).find((s) => s.id === id);
}
function distHex(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function terrainColor(c, r, map) {
  const p = [c, r];
  const coast = c < 3.2 + Math.sin(r * 0.35) * 0.6;
  if (coast) return 0x3f7f95;
  const marsh = distHex(p, [10, 31]) < 4.5;
  if (marsh) return 0x6a7a52;
  const neverwinter = distHex(p, [16, 12]) < 7.2;
  const krypt = distHex(p, [22, 27]) < 3.2;
  if (neverwinter || krypt) return 0x4f7042;
  const mountain = distHex(p, [18, 25]) < 5.4 || distHex(p, [20, 20]) < 3.6 || distHex(p, [11, 8]) < 3.2 || distHex(p, [22, 12]) < 3.6;
  if (mountain) return 0x8f8574;
  if (distHex(p, [22, 12]) < 4.8) return 0x9a9060;
  return 0x7a8a5e;
}

function buildHexTile() {
  const geo = new THREE.CylinderGeometry(5.4, 5.4, 0.22, 6);
  geo.rotateY(Math.PI / 6);
  return geo;
}
function markerSite(site, x, z) {
  const g = new THREE.Group();
  const type = site.type;
  if (type === 'city' || type === 'town') {
    const color = TYPE_COLORS[type];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x3a2f22, roughness: 1 }));
    base.position.set(x, 0.35, z); g.add(base);
    for (let i = 0; i < (type === 'city' ? 6 : 4); i++) {
      const h = rand(2.5, 5.5);
      const b = new THREE.Mesh(new THREE.BoxGeometry(rand(1.2, 2.4), h, rand(1.2, 2.4)), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      b.position.set(x + rand(-2.8, 2.8), h / 2 + 0.5, z + rand(-2.8, 2.8)); g.add(b);
    }
  } else if (type === 'ruins') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8c7a5e, roughness: 1 });
    for (let i = 0; i < 6; i++) {
      const h = rand(1.5, 4.5);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(rand(0.35, 0.7), rand(0.5, 0.9), h, 6), mat);
      c.position.set(x + rand(-3.5, 3.5), h / 2, z + rand(-3.5, 3.5)); g.add(c);
    }
  } else if (type === 'peak' || type === 'mountains') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, rand(7, 11), 6), new THREE.MeshStandardMaterial({ color: 0x7b7362, roughness: 1, flatShading: true }));
    cone.position.set(x, 3.6, z); g.add(cone);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0xd8d4c6, roughness: 0.9 }));
    snow.position.set(x, 8.4, z); g.add(snow);
  } else if (type === 'forest') {
    for (let i = 0; i < 7; i++) {
      const th = rand(2, 4);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, th, 5), new THREE.MeshStandardMaterial({ color: 0x4a3322 }));
      trunk.position.set(x + rand(-4, 4), th / 2, z + rand(-4, 4)); g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(rand(1, 1.8), rand(2.5, 4), 6), new THREE.MeshStandardMaterial({ color: 0x2e4628, roughness: 1, flatShading: true }));
      leaf.position.set(trunk.position.x, th + 1.6, trunk.position.z); g.add(leaf);
    }
  } else if (type === 'hills') {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(rand(2, 4), 7, 5), new THREE.MeshStandardMaterial({ color: 0x847b50, roughness: 1 }));
      m.position.set(x + rand(-4, 4), 0.2, z + rand(-4, 4)); m.scale.y = 0.4; g.add(m);
    }
  } else if (type === 'marsh') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 1 });
    for (let i = 0; i < 10; i++) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, rand(1, 2.6), 3), mat);
      reed.position.set(x + rand(-4, 4), 0.8, z + rand(-4, 4)); reed.rotation.z = rand(-0.3, 0.3); g.add(reed);
    }
  } else {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0x8f8a78, roughness: 1 }));
    stone.position.set(x, 1.6, z); g.add(stone);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 5), new THREE.MeshStandardMaterial({ color: 0x73b9b2, emissive: 0x1b4c4a, emissiveIntensity: 0.8 }));
    orb.position.set(x, 3.6, z); g.add(orb);
  }
  if (site.label) {
    const tex = makeLabelTexture(site.name, type === 'city' ? '#f4e1b8' : '#ead7b3');
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthTest: false }));
    label.position.set(x, type === 'peak' ? 14 : 11, z);
    label.scale.set(44, 11, 1); label.renderOrder = 6;
    g.add(label);
  }
  g.userData.site = site;
  return g;
}

export function buildRegion({ map }) {
  const group = new THREE.Group();
  const W = map.canvas.width, H = map.canvas.height;
  const cx = W * 9.6 / 2, cz = H * 8.35 / 2;
  const world = (c, r) => { const [x, z] = hexPos(c, r); return [x - cx, z - cz]; };

  // table
  const table = new THREE.Mesh(new THREE.BoxGeometry(W * 9.6 + 80, 2.5, H * 8.35 + 80), new THREE.MeshStandardMaterial({ color: 0x15110d, roughness: 1 }));
  table.position.set(0, -1.6, 0); group.add(table);

  // hex tiles
  const geo = buildHexTile();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const inst = new THREE.InstancedMesh(geo, mat, W * H);
  inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let idx = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const [x, z] = world(c, r);
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.96, 1, 0.96);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
      color.setHex(terrainColor(c, r, map));
      inst.setColorAt(idx, color);
      idx++;
    }
  }
  inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // routes
  for (const route of map.routes || []) {
    const pts = (route.points || []).map(([c, r]) => {
      const [x, z] = world(c, r); return new THREE.Vector3(x, 0.45, z);
    });
    if (pts.length < 2) continue;
    const color = route.type === 'road' ? 0x9a5a32 : 0xc39a5a;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = a.distanceTo(b);
      const geoRoad = new THREE.CylinderGeometry(route.type === 'road' ? 0.8 : 0.55, route.type === 'road' ? 0.8 : 0.55, len, 5);
      const m = new THREE.Mesh(geoRoad, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      m.position.copy(a).lerp(b, 0.5); m.position.y = 0.4;
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      if (route.type === 'trail') m.scale.set(0.55, 1, 0.55);
      group.add(m);
    }
  }

  // sites
  const sites = [];
  for (const site of map.sites || []) {
    const [x, z] = world(site.hex[0], site.hex[1]);
    const marker = markerSite(site, x, z);
    group.add(marker);
    sites.push({ data: site, mesh: marker, world: new THREE.Vector3(x, 0, z) });
  }

  // compass
  const compass = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.3, 5, 16), new THREE.MeshStandardMaterial({ color: 0xd9ad62 }));
  ring.rotation.x = Math.PI / 2; compass.add(ring);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 3), new THREE.MeshStandardMaterial({ color: 0xd9ad62 }));
  arrow.position.y = 0.8; compass.add(arrow);
  compass.position.set(W * 9.6 / 2 - 24, 0.8, -H * 8.35 / 2 + 20);
  group.add(compass);

  const titleTex = makeLabelTexture('剑湾 · SWORD COAST', '#f1cf8f');
  const title = new THREE.Sprite(new THREE.SpriteMaterial({ map: titleTex, transparent: true, opacity: 0.95, depthTest: false }));
  title.position.set(0, 16, -H * 8.35 / 2 + 18);
  title.scale.set(90, 22, 1); title.renderOrder = 8; group.add(title);

  function update(dt) {
    const t = performance.now() / 1000;
    for (const s of sites) {
      if (s.data.type === 'peak' || s.data.type === 'point_of_interest') s.mesh.rotation.y += dt * 0.05;
    }
  }
  return { group, sites, update, center: new THREE.Vector3(0, 0, 0), radius: Math.max(W * 9.6, H * 8.35) * 0.55, map };
}
