import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { textPlane } from '../ui3d/text.js';

// 스마트팜: 집 동남쪽 50m 밖, 가로 100m × 세로 200m. (2ha 스마트팜 설계안을 이 부지에 맞춰 돌려 놓았다)
// 북쪽부터 선별·포장/출하·저온저장·관리동 → 유리온실 6동(2열×3줄) → 양액·제어실·저수조. 둘레는 완충 녹지.
const std = o => new THREE.MeshStandardMaterial(o);
const M = {
  ground: std({ color: 0xdbe5d0, roughness: 1 }),
  green: std({ color: 0x7fae75, roughness: 1 }),
  road: std({ color: 0xd4c8a9, roughness: 1 }),
  soil: std({ color: 0x9d8c6c, roughness: 1 }),
  crop: std({ color: 0x3e8e56, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffad3f, emissive: 0xff7a00, emissiveIntensity: 0.72, transparent: true, opacity: 0.78, roughness: 0.28, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false }),
  frame: std({ color: 0x39464a, roughness: 0.5, metalness: 0.35 }),
  roof: std({ color: 0xd6e9f2, roughness: 0.6 }),
  wall: std({ color: 0xf2f5f0, roughness: 0.85 }),
  tank: std({ color: 0x5b9e9a, roughness: 0.5 }),
  water: std({ color: 0x4e9fc1, metalness: 0.15, roughness: 0.2 }),
  cold: std({ color: 0xb9cbd0, roughness: 0.7 }),
  dock: std({ color: 0x6b8990, roughness: 0.7 }),
  truck: std({ color: 0xe5e9e6, roughness: 0.6 }),
  cab: std({ color: 0x526a6a, roughness: 0.6 }),
  stall: std({ color: 0xf6f5ed, roughness: 1 }),
  post: std({ color: 0x526b51, roughness: 0.9 }),
  fence: std({ color: 0xe9e2d2, roughness: 0.8 }),
  steel: std({ color: 0x667b73, roughness: 0.4, metalness: 0.5 }),
  led: std({ color: 0xffffff, emissive: 0x66ff99, emissiveIntensity: 1.2 }),
};
const box = (scene, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
const flat = (scene, w, d, mat, x, z, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; m.userData.floor = 'outside'; scene.add(m); return m; };
function instanced(scene, geo, mat, list) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((p, i) => { q.setFromEuler(e.set(p.rx || 0, p.ry || 0, 0)); im.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y || 0, p.z), q, new THREE.Vector3(p.s || 1, p.s || 1, p.s || 1))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
  return im;
}
// 두 점을 잇는 철골 부재들을 한 번에 그린다
function beams(scene, list, r, mat) {
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, 1, 6), mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach(([a, b], i) => { const dir = b.clone().sub(a), len = dir.length(); q.setFromUnitVectors(up, dir.normalize()); im.setMatrixAt(i, m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1))); });
  im.castShadow = true; scene.add(im);
  return im;
}
// 건물 이름표: 처마 밑에 붙는 흰 판
const tag = (scene, text, w, x, y, z, ry = 0) => {
  const t = textPlane({ width: 720, padding: 22, bg: '#fffff8', fg: '#274536', radius: 10, align: 'center', lines: [{ text, size: 60, weight: 700 }] }, w, { lit: true });
  t.position.set(x, y, z); t.rotation.y = ry; scene.add(t); return t;
};

export function buildFarm(scene, F, { blocks, clickables, tickers, phone }) {
  const x0 = F.cx - F.w / 2, x1 = F.cx + F.w / 2, z0 = F.cz - F.d / 2, z1 = F.cz + F.d / 2;
  const gateZ = z0 + 24, spine = F.cx, X = dx => F.cx + dx, Z = dz => z0 + dz;
  const solid = (cx, cz, w, d) => blocks.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });

  // 바닥과 둘레 완충 녹지(3m)
  flat(scene, F.w, F.d, M.ground, F.cx, F.cz, 0.012);
  for (const z of [z0 + 1.5, z1 - 1.5]) flat(scene, F.w, 3, M.green, F.cx, z, 0.02);
  for (const x of [x0 + 1.5, x1 - 1.5]) flat(scene, 3, F.d - 6, M.green, x, F.cz, 0.02);

  // 집에서 오는 길: 정문 앞에서 남쪽으로 내려와 동쪽으로 간다
  const roadLen = x0 - F.road;
  flat(scene, 5, gateZ - 8, repeatFor(mats.gravel, 1.2, 3), F.road, (gateZ + 8) / 2 + 1.25, 0.03);
  flat(scene, roadLen, 5, repeatFor(mats.gravel, roadLen / 4, 1.2), F.road + roadLen / 2, gateZ, 0.03);

  // 안쪽 차량 동선: 길목 가로길, 남쪽 가로길, 가운데 길과 양옆 길로 고리를 이룬다
  const southZ = Z(172);
  flat(scene, X(41.5) - x0, 6, M.road, (x0 + X(41.5)) / 2, gateZ, 0.03);
  flat(scene, 83, 5, M.road, F.cx, southZ, 0.03);
  flat(scene, 6, southZ - gateZ, M.road, spine, (gateZ + southZ) / 2, 0.031);
  for (const dx of [-39, 39]) flat(scene, 5, southZ - gateZ, M.road, X(dx), (gateZ + southZ) / 2, 0.031);

  // 울타리와 경계 말뚝(20m마다). 서쪽 길목은 틔운다
  const posts = [], gap = [gateZ - 4, gateZ + 4];
  for (let x = x0; x <= x1; x += 4) posts.push({ x, z: z0, y: 0.6 }, { x, z: z1, y: 0.6 });
  for (let z = z0 + 4; z < z1; z += 4) { posts.push({ x: x1, z, y: 0.6 }); if (z < gap[0] || z > gap[1]) posts.push({ x: x0, z, y: 0.6 }); }
  instanced(scene, new THREE.BoxGeometry(0.15, 1.2, 0.15), M.fence, posts);
  const markers = [];
  for (let z = z0; z <= z1; z += 20) for (const x of [x0 + 0.6, x1 - 0.6]) markers.push({ x, z, y: 0.25 });
  instanced(scene, new THREE.BoxGeometry(0.35, 0.5, 0.35), M.post, markers);
  const rail = (ax, az, bx, bz) => {
    for (const y of [0.45, 0.95]) box(scene, Math.abs(bx - ax) || 0.08, 0.08, Math.abs(bz - az) || 0.08, M.fence, (ax + bx) / 2, y, (az + bz) / 2);
    blocks.push({ x0: Math.min(ax, bx) - 0.1, x1: Math.max(ax, bx) + 0.1, z0: Math.min(az, bz) - 0.1, z1: Math.max(az, bz) + 0.1 });
  };
  rail(x0, z0, x1, z0); rail(x0, z1, x1, z1); rail(x1, z0, x1, z1);
  rail(x0, z0, x0, gap[0]); rail(x0, gap[1], x0, z1);

  // 길목 간판 (누르면 설명)
  const sign = new THREE.Group(); sign.position.set(x0 - 2, 0, gap[0] - 1.5); sign.rotation.y = -Math.PI / 2;
  const board = textPlane({ width: 900, padding: 40, bg: '#1d5c45', fg: '#ffffff', border: '#dce9d8', radius: 14, align: 'center', lines: [
    { text: 'JOY SMART FARM · 2ha', size: 44, weight: 700, color: '#dce9d8', gap: 10 },
    { text: '조이 스마트팜', size: 78, weight: 700, gap: 10 },
    { text: '온실 6동 · 양액·관수 · 선별·포장 · 출하', size: 34, color: '#dce9d8' }] }, 4, { lit: true });
  board.position.y = 1.4 + board.userData.height / 2; sign.add(board);
  for (const x of [-1.8, 1.8]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), mats.darkWood); leg.position.set(x, 0.75, -0.05); sign.add(leg); }
  scene.add(sign);
  board.userData.exhibit = { kind: 'sign', title: '조이 스마트팜',
    body: '집 동남쪽 50m 밖, 가로 100m × 세로 200m(2ha)의 스마트팜입니다.\n온실 재배 · 환경제어 · 양액/관수 · 선별·출하를 한 고리로 잇습니다.\n북쪽: 선별·포장/출하동, 저온저장, 관리·작업자동\n가운데: 유리온실 6동(24m × 42m)\n남쪽: 양액·제어실, 저수조, 환경센서\n둘레 3m는 완충 녹지, 차량 동선이 온실을 고리처럼 돕니다.',
    face: { x: x0 - 8, z: gap[0] - 1.5, yaw: -Math.PI / 2 } };
  clickables.push(board);

  // ── 북쪽: 선별·포장/출하동 + 저온저장, 길목 가로길 쪽에 하역장
  const pk = { x: X(-16), z: Z(12), w: 22, d: 13, h: 6 };
  box(scene, pk.w, pk.h, pk.d, M.wall, pk.x, pk.h / 2, pk.z);
  box(scene, pk.w + 0.6, 0.8, pk.d + 0.6, M.roof, pk.x, pk.h + 0.4, pk.z);
  for (let dx = -8; dx <= 8; dx += 5.3) box(scene, 4, 3.2, 0.15, M.dock, pk.x + dx, 1.6, pk.z + pk.d / 2 + 0.08);
  tag(scene, '선별·포장 / 출하', 9, pk.x, 4.6, pk.z + pk.d / 2 + 0.1);
  solid(pk.x, pk.z, pk.w, pk.d);
  const cr = { x: X(-32), z: Z(12), w: 8, d: 11, h: 4.2 };
  box(scene, cr.w, cr.h, cr.d, M.cold, cr.x, cr.h / 2, cr.z);
  box(scene, cr.w + 0.4, 0.5, cr.d + 0.4, M.roof, cr.x, cr.h + 0.25, cr.z);
  tag(scene, '저온저장', 4.5, cr.x, 3.3, cr.z + cr.d / 2 + 0.1);
  solid(cr.x, cr.z, cr.w, cr.d);
  // 하역 대기 중인 소형 트럭
  for (const dx of [-10, 3]) {
    const tx = pk.x + dx, tz = pk.z + pk.d / 2 + 3;
    box(scene, 2.2, 1.9, 4, M.truck, tx, 1.3, tz);
    box(scene, 2.1, 1.3, 1.4, M.cab, tx, 1.0, tz + 2.7);
    solid(tx, tz + 0.7, 2.3, 5.5);
  }

  // 관리·작업자동과 주차장
  const of = { x: X(15), z: Z(12), w: 18, d: 12, h: 3.6 };
  box(scene, of.w, of.h, of.d, M.wall, of.x, of.h / 2, of.z);
  box(scene, of.w + 0.6, 0.4, of.d + 0.6, M.roof, of.x, of.h + 0.2, of.z);
  box(scene, of.w - 4, 1.2, 0.1, mats.glass, of.x, 1.9, of.z + of.d / 2 + 0.03);
  tag(scene, '관리·작업자동', 6, of.x, 3.1, of.z + of.d / 2 + 0.1);
  solid(of.x, of.z, of.w, of.d);
  for (let i = 0; i < 3; i++) flat(scene, 3, 5, M.stall, X(28.5 + i * 3.6), Z(12), 0.04);

  // ── 가운데: 유리온실 6동. 박공 지붕, 5m 간격 철골, 3m 간격 작물 줄
  const ghW = 24, ghL = 42, wallH = 7.4, ridgeH = 10.2, base = 0.4;
  const frames = [], beds = [], stems = [];
  let n = 1;
  for (const dz of [30, 78, 126]) for (const dx of [-19, 19]) {
    const gx = X(dx), gz0 = Z(dz), gz = gz0 + ghL / 2, ax = gx - ghW / 2, bx = gx + ghW / 2;
    box(scene, ghW, 0.35, ghL, M.soil, gx, 0.175, gz);
    const env = new THREE.Mesh(new THREE.BoxGeometry(ghW, wallH, ghL), M.glass); env.position.set(gx, base + wallH / 2, gz); scene.add(env);
    // 지붕 두 면: 용마루는 긴 쪽(남북)을 따라
    const v = (x, y, z) => new THREE.Vector3(x, y, z), top = base + wallH, rid = base + ridgeH;
    for (const ex of [ax, bx]) {
      const g = new THREE.BufferGeometry().setFromPoints([v(ex, top, gz0), v(gx, rid, gz0), v(gx, rid, gz0 + ghL), v(ex, top, gz0), v(gx, rid, gz0 + ghL), v(ex, top, gz0 + ghL)]);
      g.computeVertexNormals(); scene.add(new THREE.Mesh(g, M.glass));
    }
    // 박공 끝 삼각 벽
    for (const ez of [gz0, gz0 + ghL]) {
      const g = new THREE.BufferGeometry().setFromPoints([v(ax, top, ez), v(bx, top, ez), v(gx, rid, ez)]);
      g.computeVertexNormals(); scene.add(new THREE.Mesh(g, M.glass));
    }
    for (let z = gz0; z <= gz0 + ghL + 0.1; z += ghL / 8) {
      frames.push([v(ax, base, z), v(ax, top, z)], [v(bx, base, z), v(bx, top, z)], [v(ax, top, z), v(gx, rid, z)], [v(bx, top, z), v(gx, rid, z)]);
    }
    frames.push([v(gx, rid, gz0), v(gx, rid, gz0 + ghL)], [v(ax, top, gz0), v(ax, top, gz0 + ghL)], [v(bx, top, gz0), v(bx, top, gz0 + ghL)]);
    for (let x = ax + 2; x < bx - 1; x += 3) {
      beds.push({ x, z: gz });
      for (let z = gz0 + 2; z < gz0 + ghL - 1; z += phone ? 4 : 2.5) stems.push({ x, y: 1.0 + 0.45, z, ry: (x + z) % 3 });
    }
    tag(scene, `온실 ${n++}`, 5, gx, 5.4, gz0 - 0.05, Math.PI);
    solid(gx, gz, ghW, ghL);
  }
  beams(scene, frames, 0.12, M.frame);
  const bedGeo = new THREE.BoxGeometry(0.65, 0.55, ghL - 4);
  instanced(scene, bedGeo, M.crop, beds.map(b => ({ ...b, y: 0.35 + 0.275 })));
  instanced(scene, new THREE.BoxGeometry(0.35, 0.9, 0.35), M.crop, stems);

  // ── 남쪽: 양액·제어실, 저수조, 양액 탱크 3기, 환경센서 기둥
  const ut = { x: X(-18), z: Z(187), w: 17, d: 12, h: 3.2 };
  box(scene, ut.w, ut.h, ut.d, M.wall, ut.x, ut.h / 2, ut.z);
  box(scene, ut.w + 0.4, 0.5, ut.d + 0.4, M.roof, ut.x, ut.h + 0.25, ut.z);
  tag(scene, '양액·제어실', 6, ut.x, 2.6, ut.z - ut.d / 2 - 0.1, Math.PI);
  solid(ut.x, ut.z, ut.w, ut.d);
  const res = { x: X(8), z: Z(187) };
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 3.8, 40), M.tank); tank.position.set(res.x, 1.9, res.z); tank.castShadow = tank.receiveShadow = true; scene.add(tank);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.18, 40), M.water); water.position.set(res.x, 3.85, res.z); scene.add(water);
  tag(scene, '저수조', 3.5, res.x, 4.6, res.z - 7.3, Math.PI);
  solid(res.x, res.z, 14, 14);
  [0xd5c78b, 0x9bb4a0, 0xb6c8ce].forEach((c, i) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 20), std({ color: c, roughness: 0.6 }));
    t.position.set(X(21 + i * 3.4), 1.2, Z(187)); t.castShadow = true; scene.add(t);
  });
  solid(X(24.4), Z(187), 10, 3);
  const mx = X(36), mz = Z(185);
  box(scene, 0.4, 10, 0.4, M.steel, mx, 5, mz);
  box(scene, 3, 0.1, 0.1, M.steel, mx + 1.5, 9, mz); box(scene, 0.1, 0.1, 3, M.steel, mx, 8, mz + 1.5);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), M.led); lamp.position.set(mx, 10.2, mz); scene.add(lamp);
  tag(scene, '환경센서', 3.5, mx, 2.4, mz - 0.25, Math.PI);
  solid(mx, mz, 0.6, 0.6);
  let blink = 0;
  tickers.push(dt => { blink += dt; M.led.emissiveIntensity = 0.6 + Math.abs(Math.sin(blink * 2)) * 1.2; });

  // 온실 위를 오가며 작물을 살피는 드론
  const drone = new THREE.Group(); scene.add(drone);
  drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), M.wall));
  const props = [];
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.75), M.steel); arm.position.set(dx / 2, 0, dz / 2); arm.rotation.y = Math.atan2(dx, dz); drone.add(arm);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.06), M.steel); p.position.set(dx, 0.12, dz); drone.add(p); props.push(p);
  }
  let t = 0;
  tickers.push(dt => {
    t += dt;
    const u = (Math.sin(t * 0.08) + 1) / 2;
    drone.position.set(F.cx + Math.sin(t * 0.3) * 30, 14 + Math.sin(t * 1.3) * 0.4, Z(34) + u * 130);
    drone.rotation.y = t * 0.3;
    props.forEach(p => { p.rotation.y += dt * 40; });
  });
}
