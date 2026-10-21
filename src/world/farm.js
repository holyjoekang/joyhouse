import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { rng } from './nature.js';
import { textPlane } from '../ui3d/text.js';

// 스마트팜: 집 동남쪽 50m 밖, 가로 100m × 세로 200m.
// 북쪽부터 관제센터·태양광 → 유리온실 7동 → 노지 작물밭. 정문 앞에서 길이 이어진다.
const std = o => new THREE.MeshStandardMaterial(o);
const M = {
  soil: std({ color: 0x6b4f36, roughness: 1 }),
  lawn: std({ color: 0x8fb86a, roughness: 1 }),
  glass: std({ color: 0xcfe6f2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
  white: std({ color: 0xf4f4f0, roughness: 0.5 }),
  steel: std({ color: 0x9aa3ab, roughness: 0.35, metalness: 0.8 }),
  panel: std({ color: 0x1b2a4a, roughness: 0.15, metalness: 0.6 }),
  led: std({ color: 0xd06bff, emissive: 0xb040ff, emissiveIntensity: 1.2 }),
  crop: [std({ color: 0x4f9a3a, roughness: 0.9 }), std({ color: 0x7cc04a, roughness: 0.9 }), std({ color: 0xc23a3a, roughness: 0.7 })],
  fence: std({ color: 0xe9e2d2, roughness: 0.8 }),
};
const box = (scene, w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
const flat = (scene, w, d, mat, x, z, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; m.userData.floor = 'outside'; scene.add(m); return m; };
function instanced(scene, geo, mat, list) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((p, i) => { q.setFromEuler(e.set(p.rx || 0, p.ry || 0, 0)); im.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y || 0, p.z), q, new THREE.Vector3(p.s || 1, p.s || 1, p.s || 1))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
  return im;
}

export function buildFarm(scene, F, { blocks, clickables, tickers, phone }) {
  const x0 = F.cx - F.w / 2, x1 = F.cx + F.w / 2, z0 = F.cz - F.d / 2, z1 = F.cz + F.d / 2;
  const gateZ = z0 + 24, spine = F.cx;

  // 바닥: 잔디 마당, 집에서 오는 길, 안쪽 십자 길
  flat(scene, F.w, F.d, M.lawn, F.cx, F.cz, 0.012);
  const roadLen = x0 - F.road;   // 정문 앞에서 남쪽으로 내려와 동쪽으로 간다
  flat(scene, 5, gateZ - 8, repeatFor(mats.gravel, 1.2, 3), F.road, (gateZ + 8) / 2 + 1.25, 0.03);
  flat(scene, roadLen, 5, repeatFor(mats.gravel, roadLen / 4, 1.2), F.road + roadLen / 2, gateZ, 0.03);
  flat(scene, spine - x0, 5, repeatFor(mats.gravel, 12, 1.2), (x0 + spine) / 2, gateZ, 0.03);
  flat(scene, 5, F.d - 4, repeatFor(mats.gravel, 1.2, 48), spine, F.cz, 0.03);

  // 울타리: 4m마다 기둥, 가로대 둘. 서쪽 길목은 틔운다
  const posts = [], gap = [gateZ - 4, gateZ + 4];
  for (let x = x0; x <= x1; x += 4) posts.push({ x, z: z0, y: 0.6 }, { x, z: z1, y: 0.6 });
  for (let z = z0 + 4; z < z1; z += 4) { posts.push({ x: x1, z, y: 0.6 }); if (z < gap[0] || z > gap[1]) posts.push({ x: x0, z, y: 0.6 }); }
  instanced(scene, new THREE.BoxGeometry(0.15, 1.2, 0.15), M.fence, posts);
  const rail = (ax, az, bx, bz) => {
    for (const y of [0.45, 0.95]) box(scene, Math.abs(bx - ax) || 0.08, 0.08, Math.abs(bz - az) || 0.08, M.fence, (ax + bx) / 2, y, (az + bz) / 2);
    blocks.push({ x0: Math.min(ax, bx) - 0.1, x1: Math.max(ax, bx) + 0.1, z0: Math.min(az, bz) - 0.1, z1: Math.max(az, bz) + 0.1 });
  };
  rail(x0, z0, x1, z0); rail(x0, z1, x1, z1); rail(x1, z0, x1, z1);
  rail(x0, z0, x0, gap[0]); rail(x0, gap[1], x0, z1);

  // 길목 간판 (누르면 설명)
  const sign = new THREE.Group(); sign.position.set(x0 - 2, 0, gap[0] - 1.5); sign.rotation.y = -Math.PI / 2;
  const board = textPlane({ width: 900, padding: 40, bg: '#1f3b2c', fg: '#eaf5e2', border: '#9ad07a', radius: 14, align: 'center', lines: [
    { text: 'JOY SMART FARM', size: 44, weight: 700, color: '#9ad07a', gap: 10 },
    { text: '조이 스마트팜', size: 78, weight: 700, gap: 10 },
    { text: '100m × 200m · 관제센터 · 유리온실 7동 · 노지 작물밭', size: 34, color: '#cfe3c4' }] }, 4, { lit: true });
  board.position.y = 1.4 + board.userData.height / 2; sign.add(board);
  for (const x of [-1.8, 1.8]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.15), mats.darkWood); leg.position.set(x, 0.75, -0.05); sign.add(leg); }
  scene.add(sign);
  board.userData.exhibit = { kind: 'sign', title: '조이 스마트팜',
    body: '집 동남쪽 50m 밖, 가로 100m × 세로 200m의 스마트팜입니다.\n관제센터가 온도·습도·CO₂·양액을 원격으로 맞추고, 태양광으로 전기를 얻습니다.\n유리온실 7동과 노지 작물밭, 드론이 작물을 살핍니다.',
    face: { x: x0 - 8, z: gap[0] - 1.5, yaw: -Math.PI / 2 } };
  clickables.push(board);

  // 관제센터(수직농장): 흰 건물, 보라색 LED 띠, 옥상 기상 관측 기둥
  const hq = { x: x0 + 22, z: z0 + 12, w: 28, d: 14, h: 8 };
  box(scene, hq.w, hq.h, hq.d, M.white, hq.x, hq.h / 2, hq.z);
  for (const y of [2.2, 4.6, 7.0]) box(scene, hq.w + 0.05, 0.5, hq.d + 0.05, M.led, hq.x, y, hq.z);
  box(scene, hq.w - 4, 1.4, 0.1, mats.glass, hq.x, 3.4, hq.z + hq.d / 2 + 0.03);
  const hqSign = textPlane({ width: 900, padding: 26, bg: '#ffffff', fg: '#1f3b2c', radius: 8, align: 'center', lines: [{ text: 'SMART FARM CONTROL CENTER', size: 56, weight: 700 }] }, 12, { lit: true });
  hqSign.position.set(hq.x, 6.0, hq.z + hq.d / 2 + 0.06); scene.add(hqSign);
  blocks.push({ x0: hq.x - hq.w / 2, x1: hq.x + hq.w / 2, z0: hq.z - hq.d / 2, z1: hq.z + hq.d / 2 });
  const mast = box(scene, 0.15, 6, 0.15, M.steel, hq.x + hq.w / 2 - 2, hq.h + 3, hq.z);
  const vane = new THREE.Group(); vane.position.set(mast.position.x, hq.h + 6, hq.z); scene.add(vane);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, cup = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), M.steel); cup.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); vane.add(cup); }
  tickers.push(dt => { vane.rotation.y += dt * 4; });

  // 물탱크
  for (const i of [0, 1]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.5, 24), i ? M.white : M.steel);
    t.position.set(hq.x + hq.w / 2 + 5 + i * 4, 2.25, hq.z + 4); t.castShadow = true; scene.add(t);
  }
  blocks.push({ x0: hq.x + hq.w / 2 + 3, x1: hq.x + hq.w / 2 + 11, z0: hq.z + 2, z1: hq.z + 6 });

  // 태양광: 동쪽 마당, 남쪽으로 기울인 패널
  const solar = [], legs = [];
  for (let gx = spine + 6; gx <= x1 - 5; gx += 4.5) for (let gz = z0 + 6; gz <= z0 + 38; gz += 5) {
    solar.push({ x: gx, y: 1.4, z: gz, rx: -0.5 }); legs.push({ x: gx, y: 0.6, z: gz });
  }
  instanced(scene, new THREE.BoxGeometry(4, 0.08, 2.4), M.panel, solar);
  instanced(scene, new THREE.BoxGeometry(0.12, 1.2, 0.12), M.steel, legs);

  // 유리온실 7동: 반원 지붕 터널, 흰 아치 뼈대, 안에 보라 LED와 작물 줄
  const ghZ = z0 + 60, ghLen = 48;
  const R = 4.5, houses = [x0 + 8, x0 + 18.5, x0 + 29, x0 + 39.5, spine + 10, spine + 21, spine + 32];
  const arch = new THREE.TorusGeometry(R, 0.08, 6, 24, Math.PI), ribs = [], beds = [];
  for (const gx of houses) {
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, ghLen, 32, 1, true, -Math.PI / 2, Math.PI), M.glass);
    tunnel.rotation.x = Math.PI / 2; tunnel.position.set(gx, 1.2, ghZ + ghLen / 2); scene.add(tunnel);
    for (const ez of [ghZ, ghZ + ghLen]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 32, 0, Math.PI), M.glass); cap.position.set(gx, 1.2, ez); scene.add(cap); }
    for (const sx of [-R, R]) box(scene, 0.06, 1.2, ghLen, M.glass, gx + sx, 0.6, ghZ + ghLen / 2);
    for (let z = ghZ; z <= ghZ + ghLen; z += 4) ribs.push({ x: gx, y: 1.2, z });
    for (const bx of [-2.2, 0, 2.2]) for (let z = ghZ + 2; z < ghZ + ghLen - 1; z += 1.2) beds.push({ x: gx + bx, y: 0.45, z, s: 0.9 + ((z * 7 + bx) % 3) * 0.05 });
    box(scene, 0.25, 0.08, ghLen - 2, M.led, gx, 4.6, ghZ + ghLen / 2);
    blocks.push({ x0: gx - R, x1: gx + R, z0: ghZ, z1: ghZ + ghLen });
  }
  instanced(scene, arch, M.white, ribs);
  instanced(scene, new THREE.BoxGeometry(1.2, 0.5, 1.0), M.soil, beds.map(b => ({ ...b, y: 0.25, s: 1 })));
  instanced(scene, new THREE.IcosahedronGeometry(0.35, 0), M.crop[1], beds.map(b => ({ ...b, y: 0.65 })));

  // 노지 작물밭: 밭고랑과 작물, 서쪽은 잎채소, 동쪽은 토마토
  const r = rng(7), fz0 = ghZ + ghLen + 10, fz1 = z1 - 6, step = phone ? 2.4 : 1.5;
  for (const [fx0, fx1, ci] of [[x0 + 4, spine - 5, 0], [spine + 5, x1 - 4, 2]]) {
    flat(scene, fx1 - fx0, fz1 - fz0, M.soil, (fx0 + fx1) / 2, (fz0 + fz1) / 2, 0.025);
    const plants = [];
    for (let x = fx0 + 1; x < fx1; x += step) for (let z = fz0 + 1; z < fz1; z += 1.1) plants.push({ x: x + (r() - 0.5) * 0.15, y: 0.3, z, ry: r() * 6, s: 0.8 + r() * 0.4 });
    instanced(scene, new THREE.IcosahedronGeometry(0.4, 0), M.crop[0], plants);
    if (ci === 2) instanced(scene, new THREE.SphereGeometry(0.12, 6, 5), M.crop[2], plants.filter((_, i) => i % 3 === 0).map(p => ({ ...p, y: 0.55, x: p.x + 0.2 })));
  }

  // 작물을 살피는 드론
  const drone = new THREE.Group(); scene.add(drone);
  drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), M.white));
  const props = [];
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.75), M.steel); arm.position.set(dx / 2, 0, dz / 2); arm.rotation.y = Math.atan2(dx, dz); drone.add(arm);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.06), M.steel); p.position.set(dx, 0.12, dz); drone.add(p); props.push(p);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.led); lamp.position.y = -0.12; drone.add(lamp);
  let t = 0;
  tickers.push(dt => {
    t += dt;
    const u = (Math.sin(t * 0.08) + 1) / 2;
    drone.position.set(F.cx + Math.sin(t * 0.3) * (F.w / 2 - 12), 7 + Math.sin(t * 1.3) * 0.4, fz0 + 4 + u * (fz1 - fz0 - 8));
    drone.rotation.y = t * 0.3;
    props.forEach(p => { p.rotation.y += dt * 40; });
  });
}
