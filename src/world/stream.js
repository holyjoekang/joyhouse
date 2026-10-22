import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { rng, stoneLantern } from './nature.js';
import { rippleNormal } from './pond.js';
import { textPlane } from '../ui3d/text.js';

// 개울: 대문 밖 남서쪽(미니맵 왼쪽 아래)을 굽이쳐 흐르는 시내. 동쪽 둑을 따라 산책로가 이어진다.
export const BEND = [[-93, 60], [-76, 64], [-58, 74], [-46, 92], [-52, 110], [-40, 128], [-18, 136], [0, 150], [6, 170], [24, 186], [52, 198]];
const PATH_OFF = 6.5, PATH_W = 2.4, ENTRY = [0, 12];
export const STREAM_SPOT = [];   // 메뉴 '개울길': 다리 앞 산책로에서 다리를 본다. buildStream이 채운다

// 굽은 선을 따라 띠를 깐다. off = 가운데선에서 옆으로 민 거리, w = 띠 폭
function ribbon(pts, off, w, y, vScale = 1) {
  const pos = [], nor = [], uv = [], idx = [];
  let dist = 0;
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dx, dz) || 1, nx = dz / l, nz = -dx / l;
    if (i) dist += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    for (const s of [-0.5, 0.5]) {
      const o = off + s * w;
      pos.push(p.x + nx * o, y, p.y + nz * o); nor.push(0, 1, 0); uv.push(s + 0.5, dist / w * vScale);
    }
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
// 띠의 옆 점: 가운데선 i번째 점에서 off만큼 민 자리
const side = (pts, i, off) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dx, dz) || 1;
  return [pts[i].x + dz / l * off, pts[i].y - dx / l * off, Math.atan2(dx, dz)];
};

export function buildStream(scene, { blocks, clickables, lights, plant, phone }) {
  const r = rng(23);
  const curve = new THREE.SplineCurve(BEND.map(([x, z]) => new THREE.Vector2(x, z)));
  const pts = curve.getSpacedPoints(Math.round(curve.getLength() / 1.5));
  const n = pts.length, width = i => 4.2 + Math.sin(i * 0.11) * 1.1;

  // 물: 모래 바닥 → 물살 두 겹. 위 겹은 법선맵이 아래로 흘러 물결이 흐른다.
  const bed = new THREE.Mesh(ribbon(pts, 0, 7.4, 0.012), new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 1 }));
  bed.receiveShadow = true; bed.userData.floor = 'outside';
  const flow = rippleNormal(); flow.repeat.set(1, 1);
  const water = new THREE.Mesh(ribbon(pts, 0, 5.2, 0.05, 0.35), new THREE.MeshStandardMaterial({
    color: 0x3f8c92, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.88,
    normalMap: flow, normalScale: new THREE.Vector2(0.55, 0.55),
  }));
  water.receiveShadow = true;
  scene.add(bed, water);
  for (let i = 0; i < n - 1; i += 2) {   // 물에는 못 들어간다. 다리 자리만 틔운다.
    if (Math.abs(i - BRIDGE(n)) < 3) continue;
    const a = pts[i], b = pts[Math.min(n - 1, i + 2)], h = 2.2;
    blocks.push({ x0: Math.min(a.x, b.x) - h, x1: Math.max(a.x, b.x) + h, z0: Math.min(a.y, b.y) - h, z1: Math.max(a.y, b.y) + h });
  }

  // 둑돌과 물속 바위
  const rocks = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
    if (r() < 0.35) continue;
    const [x, z] = side(pts, i, sg * (width(i) / 2 + 0.3 + r() * 0.7));
    rocks.push([x, z, 0.25 + r() * 0.45]);
  }
  for (let i = 0; i < n; i += 6) { const [x, z] = side(pts, i, (r() - 0.5) * 2.4); rocks.push([x, z, 0.3 + r() * 0.35]); }
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mats.stone, rocks.length);
  rocks.forEach(([x, z, k], i) => {
    m.compose(v.set(x, k * 0.15, z), q.setFromEuler(e.set(r(), r() * 6, r())), s.set(k * (1 + r() * 0.6), k * 0.55, k));
    stones.setMatrixAt(i, m);
  });
  stones.castShadow = stones.receiveShadow = true;
  scene.add(stones);

  // 갈대·창포: 물가에 무리 지어
  const reedList = [];
  for (let i = 0; i < n; i += 1) {
    if (r() < 0.55) continue;
    const sg = r() < 0.5 ? -1 : 1, [cx, cz] = side(pts, i, sg * (width(i) / 2 + 0.9 + r() * 1.4));
    for (let k = 0; k < (phone ? 4 : 9); k++) reedList.push([cx + (r() - 0.5) * 1.2, cz + (r() - 0.5) * 1.2, 0.7 + r() * 0.9]);
  }
  const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.035, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x6f8a3c, roughness: 0.9 }), reedList.length);
  const c = new THREE.Color();
  reedList.forEach(([x, z, h], i) => {
    m.compose(v.set(x, 0, z), q.setFromEuler(e.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3)), s.set(1, h, 1));
    reeds.setMatrixAt(i, m); reeds.setColorAt(i, c.setHSL(0.18 + r() * 0.08, 0.45, 0.28 + r() * 0.12));
  });
  reeds.castShadow = true;
  scene.add(reeds);

  // 산책로: 동쪽 둑의 박석길 + 대문 앞에서 내려오는 갈림길
  const walk = new THREE.Mesh(ribbon(pts, PATH_OFF, PATH_W, 0.022, 0.5), repeatFor(mats.path, PATH_W / 3, PATH_W / 1.5));
  walk.receiveShadow = true; walk.userData.floor = 'outside';
  scene.add(walk);
  let near = 0, best = 1e9;
  for (let i = 0; i < n; i++) { const [x, z] = side(pts, i, PATH_OFF), d = Math.hypot(x - ENTRY[0], z - ENTRY[1]); if (d < best) { best = d; near = i; } }
  const [jx, jz] = side(pts, near, PATH_OFF);
  const link = new THREE.QuadraticBezierCurve(new THREE.Vector2(...ENTRY), new THREE.Vector2(ENTRY[0] - 2, (ENTRY[1] + jz) / 2 + 4), new THREE.Vector2(jx, jz));
  const spur = new THREE.Mesh(ribbon(link.getSpacedPoints(Math.round(link.getLength() / 1.5)), 0, PATH_W, 0.021, 0.5), repeatFor(mats.path, PATH_W / 3, PATH_W / 1.5));
  spur.receiveShadow = true; spur.userData.floor = 'outside';
  scene.add(spur);

  // 나무다리: 개울 가운데쯤, 건너편 쉼터로
  const bi = BRIDGE(n), [bx, bz, yaw] = side(pts, bi, 0), bridge = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 8.4), repeatFor(mats.wood, 1, 4));
  deck.position.y = 0.32; deck.castShadow = deck.receiveShadow = true; deck.userData.floor = 'outside';
  bridge.add(deck);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 8.2), mats.darkWood);
    rail.position.set(sx * 1.05, 1.05, 0); bridge.add(rail);
    for (let k = -4; k <= 4; k += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), mats.darkWood);
      post.position.set(sx * 1.05, 0.66, k); post.castShadow = true; bridge.add(post);
    }
  }
  bridge.position.set(bx, 0, bz); bridge.rotation.y = yaw + Math.PI / 2;
  scene.add(bridge);
  const [vx, vz] = side(pts, bi - 14, PATH_OFF);
  STREAM_SPOT.splice(0, 3, vx, vz, Math.atan2(-(bx - vx), -(bz - vz)));

  // 벤치와 석등: 산책로 바깥쪽에 띄엄띄엄
  const lamps = [];
  for (let i = 8; i < n - 4; i += 18) {
    const [x, z, a] = side(pts, i, PATH_OFF + PATH_W / 2 + 0.9), g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.55), mats.wood);
    seat.position.y = 0.48; seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.06), mats.wood);
    back.position.set(0, 0.8, 0.26); back.rotation.x = -0.15; g.add(back);
    for (const lx of [-0.9, 0.9]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.5), mats.stone); leg.position.set(lx, 0.23, 0); g.add(leg); }
    g.position.set(x, 0, z); g.rotation.y = a + Math.PI / 2;   // 등받이는 바깥, 앉으면 개울이 보인다
    scene.add(g);
    blocks.push({ x0: x - 1.1, x1: x + 1.1, z0: z - 1.1, z1: z + 1.1 });
    const [lx, lz] = side(pts, i + 9, PATH_OFF + PATH_W / 2 + 0.7);
    lamps.push([lx, 0, lz]);
  }
  lights.gardenLamps(lamps);
  for (const [x, , z] of lamps) blocks.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
  const [sx, sz] = side(pts, bi, -9);
  const lantern = stoneLantern(scene, sx, sz, 0.9);
  lantern.children[lantern.children.length - 1].material = lights.glass;
  lights.add(sx, 1.45, sz, 0, 0.6);

  // 물가 나무: 건너편엔 단풍과 소나무, 산책로 쪽은 그늘만 드리울 만큼
  for (let i = 3; i < n; i += 5) {
    const far = r() < 0.7, off = far ? -(6 + r() * 9) : PATH_OFF + PATH_W / 2 + 3 + r() * 6;
    const [x, z] = side(pts, i, off);
    if (Math.hypot(x - sx, z - sz) < 4 || Math.hypot(x - bx, z - bz) < 6) continue;
    plant({ x, z, s: 0.8 + r() * 0.5, kind: r() < 0.55 ? 'maple' : 'pine', rot: r() * 6 });
  }

  // 들머리 안내판
  const sign = textPlane({ width: 768, padding: 36, bg: '#f7f1e3', radius: 16, lines: [
    { text: '개울길', size: 72, weight: 700, gap: 10 },
    { text: '물소리를 따라 걷는 산책로. 다리를 건너면 석등 쉼터.', size: 40, color: '#5b5245' }] }, 2.2, { lit: true });
  sign.position.set(ENTRY[0] + 3.4, 1.4, ENTRY[1] + 0.5);
  sign.rotation.y = -Math.PI / 2;
  scene.add(sign);
  sign.userData.exhibit = { kind: 'sign', title: '개울길', body: '대문 밖 남서쪽을 굽이쳐 흐르는 개울과, 동쪽 둑을 따라 이어지는 산책로입니다. 가운데 나무다리를 건너면 석등 쉼터가 있습니다.',
    face: { x: ENTRY[0] - 1, z: ENTRY[1] + 0.5, yaw: -Math.PI / 2 } };
  clickables.push(sign);

  // 물가 풀숲: 둑에서 산책로 사이
  const seg = pts.filter((_, i) => i % 3 === 0);
  const nearBank = (x, z) => {
    let d = 1e9; for (const p of seg) d = Math.min(d, Math.hypot(x - p.x, z - p.y));
    return d > 3.6 && d < 14 && Math.abs(d - PATH_OFF) > PATH_W / 2 + 0.2;
  };
  return {
    grass: { area: { x0: -95, x1: 60, z0: 50, z1: 200 }, avoid: (x, z) => !nearBank(x, z) },
    tick: dt => { flow.offset.y -= dt * 0.22; flow.offset.x += Math.sin(performance.now() * 0.0003) * dt * 0.01; },
  };
}
const BRIDGE = n => Math.round(n * 0.55);
