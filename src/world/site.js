import * as THREE from 'three';
import { mats } from './materials.js';
import { hanokRoof } from './roof.js';
import { textPlane } from '../ui3d/text.js';

export function buildSite(scene, house, timeline, { shadows }) {
  const blocks = [], clickables = [];

  // 하늘: 지평선은 밝고 위로 갈수록 푸른 반구
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x5d8fd0) }, bottom: { value: new THREE.Color(0xe9eef2) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 p; void main(){ float h = max(p.y, 0.); gl_FragColor = vec4(mix(bottom, top, pow(h, .55)), 1.); }',
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xe4eeff, 0x8d7b5c, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(70, 110, 30);
  sun.target.position.set(0, 0, -55);
  scene.add(sun, sun.target);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 90, bottom: -90, near: 10, far: 300 });
    sun.shadow.bias = -0.0004;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -50);
  ground.receiveShadow = true;
  ground.userData.floor = 'outside';
  scene.add(ground);

  // 박석 길과 앞마당
  const pathTex = mats.path.clone();
  pathTex.map = mats.path.map.clone(); pathTex.map.repeat.set(1, 10); pathTex.map.needsUpdate = true;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 62), pathTex);
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, -29);
  path.receiveShadow = true; path.userData.floor = 'outside';
  scene.add(path);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(22, 6), mats.path);
  court.rotation.x = -Math.PI / 2; court.position.set(0, 0.025, -57);
  court.receiveShadow = true; court.userData.floor = 'outside';
  scene.add(court);

  const gate = sotdaemun(scene, house.plaque, blocks);
  flowerWall(scene, blocks);
  milestones(scene, timeline, clickables);
  trees(scene, blocks);
  roseGarden(scene, clickables, blocks);

  return {
    blocks, clickables, sky,
    update(dt, player) {
      sky.position.set(player.x, 0, player.z);
      gate.update(dt);
    },
    gate,
  };
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
      if (!opening || open >= 1) return;
      open = Math.min(1, open + dt / 2.2);
      const e = 1 - Math.pow(1 - open, 3);
      leaves.forEach(({ hinge, s }) => { hinge.rotation.y = -s * e * Math.PI * 0.55; });
      if (open > 0.6) gateBlock.x0 = gateBlock.x1 = 99;   // 열리면 지나갈 수 있다
    },
  };
}

// 꽃담: 대문 양옆으로 이어지는 낮은 담. 기와 지붕선을 얹는다.
function flowerWall(scene, blocks) {
  for (const s of [-1, 1]) {
    const len = 80, cx = s * (6.1 + len / 2);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, 0.5), mats.plaster);
    wall.position.set(cx, 1.1, 0); wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.9), mats.ridge);
    cap.position.set(cx, 2.35, 0); scene.add(cap);
    // 꽃무늬 띠
    const band = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 0.52), new THREE.MeshStandardMaterial({ color: 0x9a5a3c, roughness: 0.9 }));
    band.position.set(cx, 1.5, 0); scene.add(band);
    blocks.push({ x0: Math.min(cx - len / 2, cx + len / 2), x1: Math.max(cx - len / 2, cx + len / 2), z0: -0.35, z1: 0.35 });
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

// 소나무 숲: 줄기 + 층진 잎
function trees(scene, blocks) {
  const spots = [];
  let s = 42;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const x = (r() < 0.5 ? -1 : 1) * (12 + r() * 75), z = 6 - r() * 115;
    if (Math.abs(x) < 80 && z < -54 && z > -100) continue;              // 집 자리는 비운다
    if (x > 30 && x < 62 && z < -22 && z > -48) continue;               // 로즈가든
    spots.push([x, z, 0.8 + r() * 0.7]);
    blocks.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4 });
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.35, 4, 7), mats.wood, spots.length);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x3f6a3a, roughness: 0.9 }), spots.length * 2);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z, k], i) => {
    m.makeScale(k, k, k).setPosition(x, 2 * k, z); trunk.setMatrixAt(i, m);
    m.makeScale(k, k, k).setPosition(x, 4.6 * k, z); leaf.setMatrixAt(i * 2, m);
    m.makeScale(k * 0.75, k * 0.8, k * 0.75).setPosition(x, 6.4 * k, z); leaf.setMatrixAt(i * 2 + 1, m);
  });
  trunk.castShadow = leaf.castShadow = true;
  scene.add(trunk, leaf);
}

// 로즈가든: 꽃밭 넷, 벤치, 토리 코너 표지. 잔디길에서 디딤돌로 이어진다.
function roseGarden(scene, clickables, blocks) {
  const cx = 46, cz = -35;
  const bed = new THREE.MeshStandardMaterial({ color: 0x5a3f2a, roughness: 1 });
  const flowers = [];
  let s = 9;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 5), bed);
    b.position.set(cx + dx, 0.15, cz + dz); b.receiveShadow = true;
    scene.add(b);
    blocks.push({ x0: cx + dx - 4, x1: cx + dx + 4, z0: cz + dz - 2.5, z1: cz + dz + 2.5 });
    for (let i = 0; i < 60; i++) flowers.push([cx + dx + (r() - 0.5) * 7.4, cz + dz + (r() - 0.5) * 4.4, r()]);
  }
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.18, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), flowers.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const palette = [0xc8323c, 0xe86a8a, 0xf2b8c6, 0xf6f0e8, 0xd94060];
  flowers.forEach(([x, z, k], i) => {
    m.makeTranslation(x, 0.45 + k * 0.3, z); bloom.setMatrixAt(i, m);
    bloom.setColorAt(i, c.setHex(palette[i % palette.length]));
  });
  scene.add(bloom);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.8), mats.wood);
  bench.position.set(cx, 0.5, cz - 9); bench.castShadow = true;
  scene.add(bench);
  const sign = textPlane({ width: 768, padding: 36, bg: '#f7f1e3', radius: 16, lines: [
    { text: '로즈가든 · 토리 코너', size: 64, weight: 700, gap: 10 },
    { text: '토리와 반려의 추억을 2단계에서 이곳에 둡니다.', size: 40, color: '#5b5245' }] }, 2.2, { lit: true });
  sign.position.set(cx, 1.6, cz + 9.5);
  scene.add(sign);
  sign.userData.exhibit = { kind: 'sign', title: '로즈가든 · 토리 코너', body: '꽃밭, 벤치, 토리 조형물. 구글 포토 「토리」 앨범에서 고른 사진을 2단계에 겁니다.',
    face: { x: cx, z: cz + 13, yaw: 0 } };
  clickables.push(sign);

  const stones = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.5, 0.08, 10), mats.stone, 26);
  for (let i = 0; i < 26; i++) {
    m.makeTranslation(3.6 + i * 1.2, 0.04, -36 + Math.sin(i * 0.6) * 0.5);
    stones.setMatrixAt(i, m);
  }
  stones.receiveShadow = true;
  scene.add(stones);
}
