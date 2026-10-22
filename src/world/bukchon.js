import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { hanokRoof } from './roof.js';
import { plantTrees } from './nature.js';
import { textPlane } from '../ui3d/text.js';

// 북촌 골목: 대문 밖 서쪽 언덕. 동쪽 입구(낮음)에서 S자 골목이 서쪽 전망대(높음)까지 오르고,
// 길가 한옥마다 지인 기업 하나씩. 언덕 둘레는 막돌 축대로 받친다.
const ZONE = { x0: -90, x1: -16, z0: 8, z1: 46 };
const TOP = 6;
// 골목 가운데 선 (동 → 서)
export const PATH = [[-12, 20], [-30, 20], [-40, 30], [-56, 32], [-64, 22], [-80, 20]];
const WIDTH = 4;
// 상점 자리: 가운데, 정면이 보는 쪽(+1 남 / -1 북)
const LOTS = [
  { x: -24, z: 13.5, face: 1 },
  { x: -46, z: 40, face: -1 },
  { x: -48, z: 22, face: 1 },
  { x: -73, z: 30, face: -1 },
  { x: -72, z: 12.5, face: 1 },
];
const LOT_W = 9, LOT_D = 6;

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const inZone = (x, z) => x > ZONE.x0 && x < ZONE.x1 && z > ZONE.z0 && z < ZONE.z1;
// 언덕 높이: 서쪽으로 갈수록 높다. 언덕 밖은 0.
export function bukchonGround(x, z) {
  return inZone(x, z) ? TOP * smooth((x - ZONE.x1) / (ZONE.x0 + 6 - ZONE.x1)) : 0;
}
const hAt = x => TOP * smooth((x - ZONE.x1) / (ZONE.x0 + 6 - ZONE.x1));

export function buildBukchon(scene, street, { blocks, clickables, lights }) {
  hill(scene);
  retainingWalls(scene, blocks);
  alley(scene);
  const shops = street?.shops || [];
  LOTS.forEach((lot, i) => hanokShop(scene, lot, shops[i] || { name: `[지인 기업 ${i + 1}]` }, { blocks, clickables, lights }));
  overlook(scene, blocks);
  entrySign(scene, clickables);
  lanterns(scene, lights);
  plantTrees(scene, [[-34, 40], [-60, 42], [-84, 40], [-84, 11], [-58, 12], [-36, 11]]
    .map(([x, z], i) => ({ x, z, y: hAt(x), s: 0.8 + (i % 3) * 0.15, kind: i % 2 ? 'pine' : 'maple', rot: i })), blocks);
}

function hill(scene) {
  const W = ZONE.x1 - ZONE.x0, D = ZONE.z1 - ZONE.z0;
  const geo = new THREE.PlaneGeometry(W, D, W, Math.round(D / 2));
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + (ZONE.x0 + ZONE.x1) / 2;
    p.setY(i, hAt(x) + 0.01);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, repeatFor(mats.grass, W / 400, D / 400));
  m.position.set((ZONE.x0 + ZONE.x1) / 2, 0, (ZONE.z0 + ZONE.z1) / 2);
  m.receiveShadow = true; m.userData.floor = 'outside';
  scene.add(m);
}

// 축대: 언덕 북·남·서쪽 가장자리. 높이가 무릎을 넘는 곳부터는 걸어 오를 수 없다.
function retainingWalls(scene, blocks) {
  const cache = {}, matFor = h => (cache[Math.ceil(h)] ||= repeatFor(mats.stoneWall, 1, Math.ceil(h) / 2));
  const seg = 2;
  for (let x = ZONE.x0; x < ZONE.x1; x += seg) {
    const h = hAt(x + seg / 2) + 0.35;
    if (h < 0.45) continue;
    for (const z of [ZONE.z0, ZONE.z1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(seg, h, 0.6), matFor(h));
      w.position.set(x + seg / 2, h / 2, z); w.castShadow = w.receiveShadow = true;
      scene.add(w);
    }
  }
  const hw = TOP + 0.35;
  const west = new THREE.Mesh(new THREE.BoxGeometry(0.6, hw, ZONE.z1 - ZONE.z0 + 0.6), repeatFor(mats.stoneWall, 19, 3));
  west.position.set(ZONE.x0, hw / 2, (ZONE.z0 + ZONE.z1) / 2); west.castShadow = west.receiveShadow = true;
  scene.add(west);
  const xEdge = -26;   // 여기서 동쪽은 축대가 낮아 넘어 다닐 수 있다
  for (const z of [ZONE.z0, ZONE.z1]) blocks.push({ x0: ZONE.x0, x1: xEdge, z0: z - 0.3, z1: z + 0.3 });
  blocks.push({ x0: ZONE.x0 - 0.3, x1: ZONE.x0 + 0.3, z0: ZONE.z0, z1: ZONE.z1 });
}

// 골목: 박석 띠 + 높이가 0.18m 오를 때마다 돌계단 한 단
function alley(scene) {
  const pts = [];
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  pts.push([...PATH[PATH.length - 1]]);
  const pos = [], uv = [], idx = [];
  let run = 0;
  pts.forEach(([x, z], i) => {
    const [px, pz] = pts[Math.max(0, i - 1)], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1;
    const ox = -dz / l * WIDTH / 2, oz = dx / l * WIDTH / 2;
    if (i) run += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    const y = hAt(x) + 0.04;
    pos.push(x + ox, hAt(x + ox) + 0.04, z + oz, x - ox, hAt(x - ox) + 0.04, z - oz);
    uv.push(0, run / WIDTH, 1, run / WIDTH);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    pts[i].push(y, dx / l, dz / l);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, repeatFor(mats.path, 1.3, 1.3));
  m.receiveShadow = true; m.userData.floor = 'outside';
  scene.add(m);

  const steps = [];
  let last = 0;
  for (const [x, z, y, tx, tz] of pts) if (y - last >= 0.18) { steps.push([x, z, y, Math.atan2(tx, tz)]); last = y; }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(WIDTH, 0.12, 0.32), mats.stone, steps.length);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  steps.forEach(([x, z, y, a], i) => { q.setFromAxisAngle(up, a); im.setMatrixAt(i, mm.compose(new THREE.Vector3(x, y, z), q, one)); });
  im.castShadow = im.receiveShadow = true;
  scene.add(im);
}

// 한옥 상점: 막돌 기단 + 회벽 몸채 + 기둥 + 창호 + 기와지붕 + 처마 밑 현판
function hanokShop(scene, lot, shop, { blocks, clickables, lights }) {
  const { x, z, face } = lot, W = LOT_W, D = LOT_D;
  const base = Math.max(hAt(x - W / 2), hAt(x + W / 2)) + 0.45;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (face < 0) g.rotation.y = Math.PI;   // 정면을 언제나 그룹의 +z 쪽에 짓고 돌린다
  scene.add(g);
  const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };

  add(new THREE.BoxGeometry(W + 0.6, base, D + 0.6), repeatFor(mats.stoneWall, W / 2, base / 2), 0, base / 2, 0);
  const H = 2.8;
  add(new THREE.BoxGeometry(W - 0.6, H, D - 1.4), repeatFor(mats.plaster, 2, 1), 0, base + H / 2, -0.5);
  for (let i = 0; i <= 3; i++) add(new THREE.BoxGeometry(0.24, H, 0.24), mats.darkWood, -W / 2 + 0.3 + i * (W - 0.6) / 3, base + H / 2, D / 2 - 0.5);
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + 0.3 + (i + 0.5) * (W - 0.6) / 3;
    add(new THREE.PlaneGeometry((W - 0.6) / 3 - 0.5, H - 0.7), mats.paperDoor, cx, base + (H - 0.7) / 2 + 0.15, D / 2 - 1.19);
  }
  add(new THREE.BoxGeometry(W, 0.12, 1.1), mats.wood, 0, base + 0.06, D / 2 - 0.55);   // 툇마루
  g.add(hanokRoof({ box: [-W / 2 + 0.3, -D / 2 + 0.3, W / 2 - 0.3, D / 2 - 0.3], y: base + H, rise: 1.6, overhang: 0.9, lift: 0.35 }));

  const plaque = textPlane({ width: 900, padding: 26, bg: '#14213d', border: '#b08d57', radius: 10, align: 'center', lines: [
    { text: shop.name, size: 78, weight: 700, color: '#e6cf9f', gap: 6 },
    ...(shop.sub ? [{ text: shop.sub, size: 40, color: '#d9dce4' }] : [])] }, 3.6, { lit: true });
  plaque.position.set(0, base + H - 0.15 - plaque.userData.height / 2, D / 2 - 0.3);
  g.add(plaque);

  // 처마 끝 양쪽에 청사초롱
  lights.chorong([-1, 1].map(s => [x + s * (W / 2 - 0.7), base + H - 0.3, z + face * (D / 2 + 0.25), hAt(x)]));

  const front = z + face * (D / 2 + 1.6);
  g.userData.exhibit = { kind: 'company', title: shop.name, body: shop.body || '이 자리에는 지인의 기업 소개가 들어갑니다.',
    url: shop.url, mode: 'tab', face: { x, z: front, yaw: face > 0 ? 0 : Math.PI } };
  clickables.push(g);
  blocks.push({ x0: x - W / 2 - 0.3, x1: x + W / 2 + 0.3, z0: z - D / 2 - 0.3, z1: z + D / 2 + 0.3 });
}

// 전망대: 골목 끝 서쪽 마루. 사모정 한 채와 돌난간, 동쪽으로 집이 내려다보인다.
function overlook(scene, blocks) {
  const [cx, cz] = PATH[PATH.length - 1], y = hAt(cx), S = 5;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(S + 1, 0.3, S + 1), repeatFor(mats.stoneWall, 3, 0.3));
  deck.position.set(cx - 2, y + 0.15, cz); deck.receiveShadow = true; deck.userData.floor = 'outside';
  scene.add(deck);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.8, 10), mats.darkWood);
    p.position.set(cx - 2 + dx * S / 2, y + 1.7, cz + dz * S / 2); p.castShadow = true; scene.add(p);
    blocks.push({ x0: p.position.x - 0.2, x1: p.position.x + 0.2, z0: p.position.z - 0.2, z1: p.position.z + 0.2 });
  }
  scene.add(hanokRoof({ box: [cx - 2 - S / 2, cz - S / 2, cx - 2 + S / 2, cz + S / 2], y: y + 3.1, rise: 1.6, overhang: 0.8, lift: 0.35 }));
  const sign = textPlane({ width: 640, padding: 24, bg: '#14213d', radius: 10, align: 'center',
    lines: [{ text: '전망대', size: 72, weight: 700, color: '#e6cf9f' }] }, 1.4, { lit: true });
  sign.position.set(cx - 2 + S / 2 + 0.02, y + 2.75, cz); sign.rotation.y = Math.PI / 2;
  scene.add(sign);
}

function entrySign(scene, clickables) {
  const g = new THREE.Group();
  g.position.set(-13, 0, 16.6);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), mats.stone);
  post.position.y = 1.3; post.castShadow = true; g.add(post);
  const board = textPlane({ width: 800, padding: 36, bg: '#f7f1e3', border: '#8a6a3e', radius: 14, lines: [
    { text: '북촌 골목', size: 80, weight: 700, color: '#14213d', gap: 10 },
    { text: '함께 걸어온 벗들의 일터. 언덕 위 전망대까지 이어집니다.', size: 38, color: '#4f473c' }] }, 2.2, { lit: true });
  board.position.set(0, 2.0, 0.27);
  g.add(board);
  g.rotation.y = Math.PI / 2 - 0.5;
  g.userData.exhibit = { kind: 'sign', title: '북촌 골목', body: '지인들의 기업이 한옥 한 채씩 자리한 언덕 골목. 현판을 누르면 소개가 열립니다.' };
  scene.add(g); clickables.push(g);
}

// 골목 초롱: 나무 기둥에 팔을 내어 청사초롱을 단다
function lanterns(scene, lights) {
  const spots = [[-20, 22.6], [-33.2, 26.8], [-44, 33.6], [-56, 27.9], [-68, 23.8], [-77, 17.6]];
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), mats.darkWood, spots.length);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.08, 0.08), mats.darkWood, spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    const y = hAt(x);
    post.setMatrixAt(i, m.makeTranslation(x, y + 1.35, z));
    arm.setMatrixAt(i, m.makeTranslation(x + 0.24, y + 2.62, z));
  });
  post.castShadow = arm.castShadow = true;
  scene.add(post, arm);
  lights.chorong(spots.map(([x, z]) => [x + 0.45, hAt(x) + 2.0, z, hAt(x)]));
}
