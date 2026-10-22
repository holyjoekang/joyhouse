import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { hanokRoof } from './roof.js';
import { buildSky } from './sky.js';
import { plantTrees, grassField, hedges, flowerBeds, stoneLantern, mountains, rng } from './nature.js';
import { buildPond, toriStatue } from './pond.js';
import { buildStream } from './stream.js';
import { textPlane } from '../ui3d/text.js';
import { buildFarm } from './farm.js';
import { buildBukchon, bukchonGround } from './bukchon.js';
import { createLights } from './lights.js';

const POND = { cx: -46, cz: -35, w: 14, d: 10 };
const ROSE = { cx: 46, cz: -35 };
const PAVILION = { cx: 24, cz: -17 };   // 정관헌: 앞뜰 오른쪽 커피 정자

export function buildSite(scene, renderer, house, timeline, { shadows, phone }) {
  const blocks = [], clickables = [], tickers = [];

  // 해 자리는 처음 값일 뿐, atmosphere.js 가 지금 시각·날씨에 맞춰 옮긴다
  const sunDir = new THREE.Vector3(0.62, 0.5, 0.6).normalize();
  const sky = buildSky(scene, renderer, sunDir);
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x6b5a40, 0.55);
  scene.add(hemi);
  const lights = createLights(scene, { phone });
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.2);
  sun.target.position.set(0, 0, -50);
  sun.position.copy(sunDir).multiplyScalar(160).add(sun.target.position);
  scene.add(sun, sun.target);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 100, bottom: -100, near: 20, far: 400 });
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.04;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), repeatFor(mats.grass, 3, 3));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -50);
  ground.receiveShadow = true;
  ground.userData.floor = 'outside';
  scene.add(ground);

  // 박석 길 + 경계석, 앞마당 마사토
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 62), repeatFor(mats.path, 2, 20));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, -29);
  path.receiveShadow = true; path.userData.floor = 'outside';
  scene.add(path);
  for (const x of [-3.1, 3.1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 52), mats.stone);
    curb.position.set(x, 0.06, -28); curb.receiveShadow = true; scene.add(curb);
  }
  const court = new THREE.Mesh(new THREE.PlaneGeometry(50, 7), repeatFor(mats.gravel, 12, 2));
  court.rotation.x = -Math.PI / 2; court.position.set(0, 0.015, -56.5);
  court.receiveShadow = true; court.userData.floor = 'outside';
  scene.add(court);

  const gate = sotdaemun(scene, house.plaque, blocks);
  flowerWall(scene, blocks);
  milestones(scene, timeline, clickables);

  // 생울타리: 잔디길 양옆, 연못·로즈가든 디딤돌 자리는 틔운다
  // 대문에서 이어지는 첫 구간은 덕수궁 돌담길, 집 쪽은 생울타리
  doldam(scene, [[5.6, -3, 6.6, -9.5], [5.6, -13.5, 6.6, -21], [-6.6, -3, -5.6, -21]], blocks);
  hedges(scene, [
    [5.6, -21, 6.6, -33, 0.9], [5.6, -39, 6.6, -52, 0.9],
    [-6.6, -27, -5.6, -52, 0.9],
  ], blocks);
  flowerBeds(scene, [
    [7.2, -2.2, 13, -3.8, [0xd94060, 0xf6f0e8, 0x9a5ac8]], [-13, -2.2, -7.2, -3.8, [0xd94060, 0xf6f0e8, 0x9a5ac8]],
  ]);
  for (const x of [-9.5, 9.5]) {
    const g = stoneLantern(scene, x, -53.2);
    g.children[g.children.length - 1].material = lights.glass;   // 화사석 불빛도 밤에만 켠다
    lights.add(x, 1.61, -53.2, 0, 0.6);
  }
  nightLights(scene, lights, blocks);

  // 나무: 소나무 숲, 앞마당 은행나무 한 쌍, 대문 곁 느티나무, 집 둘레 단풍
  const r = rng(42), spots = [];
  const ok = (x, z) => !(Math.abs(x) < 84 && z < -52 && z > -98) && !(Math.abs(x) < 9) &&
    !(Math.hypot(x - POND.cx, z - POND.cz) < 15) && !(Math.hypot(x - ROSE.cx, z - ROSE.cz) < 15) && !(Math.hypot(x - PAVILION.cx, z - PAVILION.cz) < 11) && !(z > -1 && z < 1.5) &&
    !(x < -10 && z > 1.5);   // 대문 밖 서쪽은 북촌 골목 자리
  for (let i = 0; i < 160 && spots.length < 70; i++) {
    const x = (r() < 0.5 ? -1 : 1) * (14 + r() * 76), z = 10 - r() * 120;
    if (ok(x, z)) spots.push({ x, z, s: 0.8 + r() * 0.5, kind: r() < 0.72 ? 'pine' : 'maple', rot: r() * 6 });
  }
  for (const x of [-15.5, 15.5]) spots.push({ x, z: -50.5, s: 1.25, kind: 'ginkgo', rot: x });
  spots.push({ x: 15, z: -7, s: 1.6, kind: 'zelkova', rot: 2 });
  for (const [x, z] of [[-30, -58], [30, -58], [-80, -60], [80, -60], [-26, -100], [26, -100]]) spots.push({ x, z, s: 1.0, kind: 'maple', rot: x });
  const plantLater = [];
  tickers.push(buildPond(scene, POND, blocks, clickables, s => plantLater.push(s)));
  const stream = buildStream(scene, { blocks, clickables, lights, phone, plant: s => plantLater.push(s) });
  tickers.push(stream.tick);
  plantTrees(scene, [...spots, ...plantLater], blocks);

  roseGarden(scene, clickables, blocks);
  jeonggwanheon(scene, blocks);
  steppingStones(scene, [[3.6, -11.5], [PAVILION.cx, -11.5]]);
  steppingStones(scene, [[3.6, -36], [ROSE.cx - 10, -36]]);
  steppingStones(scene, [[-3.6, -24], [POND.cx + 3, -24]]);
  mountains(scene);
  buildBukchon(scene, house.street, { blocks, clickables, lights });
  lights.build();
  if (house.farm) buildFarm(scene, house.farm, { blocks, clickables, tickers, phone });

  // 풀잎: 잔디길 양쪽 앞뜰
  const avoid = (x, z) => Math.abs(x) < 3.3 || (Math.abs(x) > 5.4 && Math.abs(x) < 6.8) ||
    Math.hypot(x - POND.cx, z - POND.cz) < 13 || Math.hypot(x - ROSE.cx, z - ROSE.cz) < 13 ||
    (Math.abs(x - PAVILION.cx) < 7 && Math.abs(z - PAVILION.cz) < 5.5) ||
    (Math.abs(Math.abs(x) - 4.2) < 0.5 && true && false);
  tickers.push(grassField(scene, [{ x0: -34, x1: 34, z0: -54, z1: -1 }], phone ? 16000 : 70000, avoid));
  tickers.push(grassField(scene, [stream.grass.area], phone ? 8000 : 30000, stream.grass.avoid));

  return {
    blocks, clickables, sky, sun, hemi, lights,
    groundAt: bukchonGround,
    update(dt) {
      // 해는 움직이지 않으므로 그림자 지도는 한 번만 그린다. 대문이 열리는 동안만 다시 그린다.
      if (gate.update(dt)) renderer.shadowMap.needsUpdate = true;
      tickers.forEach(t => t(dt));
    },
    gate,
  };
}

// 밤 조명 자리: 잔디길 가로등, 대문 밖 길목, 꽃담 등, 대문 초롱, 정관헌 펜던트, 집 정면 초롱
function nightLights(scene, lights, blocks) {
  const lamps = [[-8.5, 0, 5], [8.5, 0, 5]];
  for (const z of [-8.3, -21.6, -35, -48.3]) lamps.push([-4.9, 0, z], [4.9, 0, z]);
  lights.gardenLamps(lamps);
  for (const [x, , z] of lamps) blocks.push({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 });
  const wall = [];
  for (let k = 1; k <= 7; k++) for (const s of [-1, 1]) wall.push([s * 12 * k, 0, 0.37], [s * 12 * k, 0, -0.37]);
  lights.wallLamps(wall);
  lights.chorong([[-2.4, 4.45, 1.35], [2.4, 4.45, 1.35], [-2.4, 4.45, -1.35], [2.4, 4.45, -1.35]]);
  const { cx, cz } = PAVILION;
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), lights.glass);
  pendant.position.set(cx, 3.25, cz);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), mats.brass);
  chain.position.set(cx, 3.6, cz);
  scene.add(pendant, chain);
  lights.add(cx, 3.25, cz, 0.36, 1.1);
  for (const x of [-4.5, 4.5]) lights.add(x, 6.9, -55.2, 0, 1.2);
}

function steppingStones(scene, [[x0, z0], [x1, z1]]) {
  const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.15);
  const stones = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 9), mats.stone, n);
  const m = new THREE.Matrix4(), r = rng(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    m.makeRotationY(r() * 3).setPosition(x0 + (x1 - x0) * t + (r() - 0.5) * 0.2, 0.05, z0 + (z1 - z0) * t + Math.sin(i * 0.7) * 0.35);
    stones.setMatrixAt(i, m);
  }
  stones.receiveShadow = true;
  scene.add(stones);
}

// 솟을대문: 가운데 칸이 높이 솟은 대문. 처음 들어설 때 문짝이 안으로 열린다.
function sotdaemun(scene, plaque, blocks) {
  const g = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.4, 5.2, 0.4);
  for (const x of [-2.7, 2.7]) {
    const p = new THREE.Mesh(postGeo, mats.wood); p.position.set(x, 2.6, 0); p.castShadow = true; g.add(p);
    blocks.push({ x0: x - 0.3, x1: x + 0.3, z0: -0.3, z1: 0.3 });
  }
  for (const x of [-6, 6]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.8, 0.36), mats.wood); p.position.set(x, 1.9, 0); p.castShadow = true; g.add(p);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.35, 0.45), mats.wood);
  lintel.position.set(0, 5.1, 0); g.add(lintel);
  // 옆 칸 벽(문간채)
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.6, 0.3), mats.plaster);
    w.position.set(s * 4.35, 1.8, 0); w.castShadow = true; w.receiveShadow = true; g.add(w);
    blocks.push({ x0: s > 0 ? 2.7 : -6.1, x1: s > 0 ? 6.1 : -2.7, z0: -0.35, z1: 0.35 });
  }
  g.add(hanokRoof({ box: [-3.2, 0.9, 3.2, -0.9], y: 5.3, rise: 1.7, overhang: 0.6, lift: 0.35 }));
  g.add(hanokRoof({ box: [-6.4, 0.9, -2.9, -0.9], y: 3.8, rise: 1.2, overhang: 0.5, lift: 0.25, ridgeCap: false }));
  g.add(hanokRoof({ box: [2.9, 0.9, 6.4, -0.9], y: 3.8, rise: 1.2, overhang: 0.5, lift: 0.25, ridgeCap: false }));

  // 현판
  const board = textPlane({ width: 1024, padding: 40, bg: '#2a1d14', border: '#c9a14a', radius: 10,
    align: 'center', lines: [
      { text: plaque.split('—')[0].trim(), size: 120, weight: 700, color: '#e8c77a', font: 'serif', gap: 4 },
      { text: (plaque.split('—')[1] || '').trim(), size: 54, color: '#d9b979', font: 'serif' },
    ] }, 3.2, { lit: true });
  board.position.set(0, 4.25, 0.26);
  g.add(board);

  // 문짝 두 장: 경첩을 축으로 돈다
  const leaves = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 2.5, 0, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.12), mats.darkWood);
    leaf.position.set(-s * 1.25, 1.75, 0);
    leaf.castShadow = true;
    hinge.add(leaf);
    // 문고리
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), mats.gold);
    ring.position.set(-s * 2.2, 1.6, 0.09);
    hinge.add(ring);
    g.add(hinge); leaves.push({ hinge, s });
  }
  const gateBlock = { x0: -2.5, x1: 2.5, z0: -0.2, z1: 0.2 };
  blocks.push(gateBlock);
  scene.add(g);

  let open = 0, opening = false;
  return {
    open() { opening = true; },
    update(dt) {
      if (!opening || open >= 1) return false;
      open = Math.min(1, open + dt / 2.2);
      const e = 1 - Math.pow(1 - open, 3);
      leaves.forEach(({ hinge, s }) => { hinge.rotation.y = -s * e * Math.PI * 0.55; });
      if (open > 0.6) gateBlock.x0 = gateBlock.x1 = 99;   // 열리면 지나갈 수 있다
      return true;
    },
  };
}

// 꽃담: 아랫단은 막돌, 윗단은 회벽에 기와를 얹는다. 대문 양옆으로 이어진다.
function flowerWall(scene, blocks) {
  for (const s of [-1, 1]) {
    const len = 80, cx = s * (6.1 + len / 2), x0 = Math.min(cx - len / 2, cx + len / 2), x1 = Math.max(cx - len / 2, cx + len / 2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.6), repeatFor(mats.stoneWall, len / 3, 0.3));
    base.position.set(cx, 0.45, 0); base.castShadow = base.receiveShadow = true;
    scene.add(base);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 1.3, 0.5), repeatFor(mats.plaster, len / 3, 0.45));
    wall.position.set(cx, 1.55, 0); wall.castShadow = wall.receiveShadow = true;
    scene.add(wall);
    const band = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.52), new THREE.MeshStandardMaterial({ color: 0x9a5a3c, roughness: 0.9 }));
    band.position.set(cx, 1.6, 0); scene.add(band);
    scene.add(hanokRoof({ box: [x0, -0.25, x1, 0.25], y: 2.2, rise: 0.45, overhang: 0.35, lift: 0.04 }));
    blocks.push({ x0, x1, z0: -0.4, z1: 0.4 });
  }
}

// 잔디길 이정표: 대문 쪽이 1960s, 집 쪽이 2030s. 왼쪽 = 연대, 오른쪽 = 커리어 시기(eras)
function milestones(scene, timeline, clickables) {
  const zOf = year => -5 - (year - 1960) / (2035 - 1960) * 50;
  const post = new THREE.BoxGeometry(0.5, 1.5, 0.5);
  for (let y = 1960; y <= 2030; y += 10) {
    const z = zOf(y);
    const p = new THREE.Mesh(post, mats.stone); p.position.set(-4.2, 0.75, z); p.castShadow = true;
    scene.add(p);
    const label = textPlane({ width: 512, padding: 22, bg: '#f2ede2', radius: 8, align: 'center',
      lines: [{ text: `${y}s`, size: 96, weight: 700, color: '#3a3128' }] }, 1.1, { lit: true });
    label.position.set(-3.93, 1.15, z); label.rotation.y = Math.PI / 2;
    scene.add(label);
    p.userData.exhibit = { kind: 'milestone', title: `${y}년대`,
      body: '이 이정표에는 2단계에서 그 시절의 사진과 사건을 겁니다.', face: { x: -1.5, z, yaw: Math.PI / 2 } };
    clickables.push(p);
  }
  (timeline?.eras || []).forEach(e => {
    const year = Number(e.start.slice(0, 4)) + Number(e.start.slice(5, 7)) / 12;
    const z = zOf(year);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.25, 0.45), mats.stone);
    p.position.set(4.2, 0.62, z); p.castShadow = true;
    scene.add(p);
    const label = textPlane({ width: 640, padding: 22, bg: '#f2ede2', radius: 8, align: 'center',
      lines: [{ text: e.name, size: 60, weight: 700, color: '#3a3128', gap: 6 }, { text: e.start.slice(0, 4), size: 44, color: '#6b5e4c' }] }, 1.3, { lit: true });
    label.position.set(3.95, 1.0, z); label.rotation.y = -Math.PI / 2;
    scene.add(label);
    p.userData.exhibit = { kind: 'milestone', title: e.name,
      body: `${e.start.replace('-', '. ')} – ${e.end ? e.end.replace('-', '. ') : '지금'} · ${e.role}`,
      face: { x: 1.5, z, yaw: -Math.PI / 2 } };
    clickables.push(p);
  });
}

// 로즈가든: 장미 덤불 네 화단, 한가운데 토리 동상, 벤치 둘
function roseGarden(scene, clickables, blocks) {
  const { cx, cz } = ROSE;
  const r = rng(9);
  const bush = [], blooms = [];
  for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 5.4), mats.stone);
    curb.position.set(cx + dx, 0.15, cz + dz); curb.receiveShadow = true; scene.add(curb);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(8, 0.32, 5), new THREE.MeshStandardMaterial({ color: 0x3e2c1e, roughness: 1 }));
    soil.position.set(cx + dx, 0.17, cz + dz); scene.add(soil);
    blocks.push({ x0: cx + dx - 4.2, x1: cx + dx + 4.2, z0: cz + dz - 2.7, z1: cz + dz + 2.7 });
    for (let i = 0; i < 26; i++) {
      const x = cx + dx + (r() - 0.5) * 7, z = cz + dz + (r() - 0.5) * 4, s = 0.35 + r() * 0.25;
      bush.push([x, z, s]);
      for (let k = 0; k < 6; k++) blooms.push([x + (r() - 0.5) * s * 1.6, 0.5 + s * 1.2 + r() * s * 0.6, z + (r() - 0.5) * s * 1.6]);
    }
  }
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mats.hedge, bush.length);
  const rose = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.09, 1), new THREE.MeshStandardMaterial({ roughness: 0.45 }), blooms.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const palette = [0xb81d2c, 0xd8344a, 0xf0a0b4, 0xfbeee8, 0xe25a7a];
  bush.forEach(([x, z, s], i) => { m.makeScale(s * 1.1, s * 1.3, s * 1.1).setPosition(x, 0.32 + s, z); leaves.setMatrixAt(i, m); });
  blooms.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); rose.setMatrixAt(i, m); rose.setColorAt(i, c.setHex(palette[i % palette.length])); });
  leaves.castShadow = leaves.receiveShadow = true;
  scene.add(leaves, rose);
  toriStatue(scene, cx, cz, clickables);
  for (const z of [cz - 9, cz + 9]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.6), mats.wood);
    seat.position.set(cx, 0.48, z); seat.castShadow = true; scene.add(seat);
    for (const x of [-1.1, 1.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.5), mats.stone);
      leg.position.set(cx + x, 0.23, z); scene.add(leg);
    }
  }
  const sign = textPlane({ width: 768, padding: 36, bg: '#f7f1e3', radius: 16, lines: [
    { text: '로즈가든 · 토리 코너', size: 64, weight: 700, gap: 10 },
    { text: '장미 화단 넷과 토리 동상. 2단계에 토리 사진을 둘레에 겁니다.', size: 40, color: '#5b5245' }] }, 2.2, { lit: true });
  sign.position.set(cx - 10.5, 1.4, cz - 1);
  sign.rotation.y = -Math.PI / 2;
  scene.add(sign);
}

// 돌담길: 막돌 담에 기와를 얹는다. box = [x0, z0, x1, z1]
function doldam(scene, boxes, blocks) {
  for (const [x0, z0, x1, z1] of boxes) {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.7, d), repeatFor(mats.stoneWall, d / 2, 0.6));
    wall.position.set(cx, 0.85, cz); wall.castShadow = wall.receiveShadow = true;
    scene.add(wall);
    scene.add(hanokRoof({ box: [x0, z0, x1, z1], y: 1.7, rise: 0.4, overhang: 0.25, lift: 0.04 }));
    blocks.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
  }
}

// 정관헌: 덕수궁의 서양식 열주 정자. 가는 기둥 + 놋쇠 주두 + 난간 + 기와지붕, 가운데 찻상.
function jeonggwanheon(scene, blocks) {
  const { cx, cz } = PAVILION, W = 11, D = 7;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.3, D + 0.8), repeatFor(mats.stoneWall, 3, 0.2));
  base.position.set(cx, 0.15, cz); base.castShadow = base.receiveShadow = true;
  scene.add(base);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), repeatFor(mats.wood, W / 2, D / 2));
  floor.position.set(cx, 0.33, cz); floor.receiveShadow = true;
  scene.add(floor);

  const spots = [];
  for (let i = 0; i <= 6; i++) { const x = cx - W / 2 + i * W / 6; spots.push([x, cz - D / 2], [x, cz + D / 2]); }
  for (const z of [cz - D / 6, cz + D / 6]) spots.push([cx - W / 2, z], [cx + W / 2, z]);
  const m = new THREE.Matrix4();
  const put = (geo, mat, y) => {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([x, z], i) => im.setMatrixAt(i, m.makeTranslation(x, y, z)));
    im.castShadow = true; scene.add(im);
  };
  put(new THREE.CylinderGeometry(0.11, 0.13, 3.2, 12), mats.marble, 1.96);
  put(new THREE.CylinderGeometry(0.26, 0.12, 0.35, 12), mats.brass, 3.65);
  put(new THREE.BoxGeometry(0.34, 0.12, 0.34), mats.darkWood, 0.42);

  // 난간: 앞(남)쪽 가운데는 드나들 수 있게 틔운다
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (const y of [0.75, 1.25]) {
      const r = new THREE.Mesh(alongX ? new THREE.BoxGeometry(len, 0.07, 0.07) : new THREE.BoxGeometry(0.07, 0.07, len), mats.brass);
      r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); scene.add(r);
    }
    blocks.push({ x0: Math.min(x0, x1) - 0.1, x1: Math.max(x0, x1) + 0.1, z0: Math.min(z0, z1) - 0.1, z1: Math.max(z0, z1) + 0.1 });
  };
  rail(cx - W / 2, cz - D / 2, cx + W / 2, cz - D / 2);
  rail(cx - W / 2, cz - D / 2, cx - W / 2, cz + D / 2);
  rail(cx + W / 2, cz - D / 2, cx + W / 2, cz + D / 2);
  rail(cx - W / 2, cz + D / 2, cx - W / 6, cz + D / 2);
  rail(cx + W / 6, cz + D / 2, cx + W / 2, cz + D / 2);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), mats.darkWood);
  lintel.position.set(cx, 3.92, cz); scene.add(lintel);
  scene.add(hanokRoof({ box: [cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2], y: 4.05, rise: 2.4, overhang: 1.1, lift: 0.4 }));

  // 찻상과 의자 둘
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), mats.darkWood);
  table.position.set(cx, 1.08, cz); table.castShadow = true; scene.add(table);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.72, 8), mats.darkWood);
  leg.position.set(cx, 0.7, cz); scene.add(leg);
  for (const s of [-1, 1]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), mats.wood);
    seat.position.set(cx + s * 1.1, 0.8, cz); seat.castShadow = true; scene.add(seat);
  }
  blocks.push({ x0: cx - 1.5, x1: cx + 1.5, z0: cz - 0.7, z1: cz + 0.7 });

  const sign = textPlane({ width: 768, padding: 36, bg: '#14213d', radius: 12, lines: [
    { text: '정관헌 靜觀軒', size: 64, weight: 700, color: '#e6cf9f', gap: 10 },
    { text: '덕수궁의 서양식 열주 정자. 고요히 바라보며 커피 한 잔.', size: 38, color: '#d9dce4' }] }, 2.6, { lit: true });
  sign.position.set(cx, 3.35, cz + D / 2 + 0.08);
  scene.add(sign);
}
