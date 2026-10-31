import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { plantTrees, rng } from './nature.js';
import { rippleNormal } from './pond.js';
import { textPlane } from '../ui3d/text.js';

// 올림픽공원(맨 남쪽, 개울과 스마트팜 너머). 첫 화면에는 없다 — 다가가거나 하늘에서 보거나 메뉴로 갈 때
// 이 파일을 받아, 한가한 틈마다 한 덩이씩 짓는다(평화의 문 → 호수 → 경기장 → 토성 → 나홀로나무 → 들꽃마루 → 나무·등).
// 땅 높이(ground)를 돌려주어 몽촌토성 둔덕과 나홀로나무 언덕을 걸어 오를 수 있다.
const idle = () => new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 150 }));
const smooth = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function inst(parent, geo, mat, spots, shadow = false) {
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  spots.forEach((o, i) => {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
    im.setMatrixAt(i, _m.compose(_p.set(o.x, o.y || 0, o.z), _q.setFromEuler(_e), _s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1)));
    if (o.c !== undefined) im.setColorAt(i, _c.set(o.c));
  });
  im.castShadow = shadow; im.receiveShadow = true;
  parent.add(im);
  return im;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
// 밤에 켜지는 등: 낮엔 은은한 색, 밤(lit)엔 1을 넘겨 빛번짐이 걸린다
function lampMat(color) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  m.userData.base = new THREE.Color(color);
  return m;
}

export async function buildOlympic(scene, spec, { blocks, clickables }) {
  const g = new THREE.Group();
  scene.add(g);
  const r = rng(1988), lamps = [], tick = [];
  const S = spec.spots;

  // ── 땅 높이: 몽촌토성(꺾인 선을 따라 솟은 둔덕) + 나홀로나무 언덕
  const ridge = S.fortress.line, RW = S.fortress.halfWidth, RH = S.fortress.height;
  const hill = S.loneTree;
  const segDist = (x, z, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  };
  const ground = (x, z) => {
    let d = 1e9;
    for (let i = 1; i < ridge.length; i++) d = Math.min(d, segDist(x, z, ridge[i - 1], ridge[i]));
    const a = RH * smooth(1 - d / RW) * (1 + 0.12 * Math.sin(x * 0.07 + z * 0.05));
    const h = Math.hypot(x - hill.x, z - hill.z) / hill.r;
    return Math.max(a, h < 1 ? hill.h * (1 - h * h) ** 2 : 0);
  };
  const grass = repeatFor(mats.grass, 40, 20);
  grass.color = new THREE.Color(0xb8c47e);   // 늦가을 잔디: 살짝 누렇게
  function terrain(x0, z0, x1, z1, step = 2) {
    const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, ground(p.getX(i), p.getZ(i)) - 0.06);   // 가장자리는 평지 밑으로 묻힌다
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, grass); m.receiveShadow = true; g.add(m);
  }

  // 안내판: 이름과 한 줄 소개, 누르면 이야기
  function sign(info) {
    const [x, z] = info.at, y = ground(x, z);
    const s = textPlane({ width: 768, padding: 34, bg: '#13314f', border: '#e8c35a', radius: 14, lines: [
      { text: info.name, size: 66, weight: 700, color: '#ffffff', gap: 8 }, { text: info.sub, size: 36, color: '#cfe0f0' }] }, 2.6, { lit: true });
    s.position.set(x, y + 1.6, z);
    s.rotation.y = info.yaw ?? Math.PI;
    for (const lx of [-1.1, 1.1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), std(0x22303e)); leg.position.set(lx, -0.65, -0.05); s.add(leg); }
    s.userData.exhibit = { kind: 'sign', title: info.name, body: info.body,
      face: { x: x + Math.sin(s.rotation.y) * 4, z: z + Math.cos(s.rotation.y) * 4, yaw: s.rotation.y } };
    g.add(s); clickables.push(s);
  }

  // ── 1. 평화의 광장과 세계평화의 문
  const pave = repeatFor(mats.path, 20, 10);
  {
    const P = S.plaza;
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d).rotateX(-Math.PI / 2), pave);
    plaza.position.set(P.x, 0.04, P.z); plaza.receiveShadow = true; g.add(plaza);
    // 큰길: 광장에서 남쪽 토성 앞까지, 동서로 가로지르는 길
    for (const [x, z, w, d] of S.roads) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), repeatFor(mats.path, w / 4, d / 4));
      road.position.set(x, 0.035, z); road.receiveShadow = true; g.add(road);
    }
    gate(g, S.gate, blocks, tick, lamps);
    // 광장 양옆 국기 게양대 줄
    const poles = [], flags = [], cols = [0xd33a2c, 0x2f5fb3, 0xf2c230, 0x2e8b4e, 0xffffff, 0x1b1b1b, 0xe86a1c, 0x6b3fa0];
    for (const side of [-1, 1]) for (let i = 0; i < 16; i++) {
      const x = P.x + side * (P.w / 2 - 3), z = P.z - P.d / 2 + 4 + i * (P.d - 8) / 15;
      poles.push({ x, y: 4.5, z });
      flags.push({ x: x - side * 0.75, y: 8.2, z, ry: Math.PI / 2, c: cols[(i * 3 + (side > 0 ? 1 : 0)) % cols.length] });
    }
    inst(g, new THREE.CylinderGeometry(0.05, 0.07, 9, 6), std(0xd8dde2, { metalness: 0.6, roughness: 0.4 }), poles);
    const flagGeo = new THREE.PlaneGeometry(1.5, 1.0, 6, 1);
    const fm = inst(g, flagGeo, std(0xffffff, { side: THREE.DoubleSide, roughness: 0.9 }), flags);
    fm.material.onBeforeCompile = sh => {   // 깃발 펄럭임
      sh.uniforms.uT = T;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nfloat k = (position.x + 0.75) / 1.5; transformed.z += sin(uT * 4.0 + position.x * 4.0 + instanceMatrix[3].z) * 0.12 * k;');
    };
    sign(S.signs.gate);
  }
  await idle();

  // ── 2. 88호수와 분수
  {
    const L = S.lake;
    const pts = Array.from({ length: 72 }, (_, i) => {
      const a = i / 72 * Math.PI * 2, w = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 5);
      return new THREE.Vector2(L.x + Math.cos(a) * L.rx * w, -(L.z + Math.sin(a) * L.rz * w));
    });
    const normal = rippleNormal(); normal.repeat.set(8, 6);
    const water = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts), 2).rotateX(-Math.PI / 2),
      std(0x46677a, { roughness: 0.05, metalness: 0.2, normalMap: normal, normalScale: new THREE.Vector2(0.3, 0.3) }));
    water.position.y = 0.05; water.receiveShadow = true; g.add(water);
    const rimPts = pts.map(p => new THREE.Vector2(L.x + (p.x - L.x) * 1.06, -L.z + (p.y + L.z) * 1.06));
    const rim = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(rimPts)).rotateX(-Math.PI / 2), std(0x9a9488));
    rim.position.y = 0.03; g.add(rim);
    tick.push(dt => { normal.offset.x += dt * 0.01; normal.offset.y += dt * 0.006; });
    // 분수: 가운데 큰 물기둥 + 둘레 작은 물줄기. 물보라는 반투명, 위아래로 숨쉰다
    const spray = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.55, depthWrite: false });
    const jets = [{ x: L.x, z: L.z, h: 12, r: 0.5 }];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; jets.push({ x: L.x + Math.cos(a) * 5, z: L.z + Math.sin(a) * 5, h: 5, r: 0.22 }); }
    const jetMeshes = jets.map((j, i) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(j.r, 1, 8, 1, true).translate(0, 0.5, 0), spray);
      m.position.set(j.x, 0.05, j.z); g.add(m);
      return [m, j, i];
    });
    tick.push((dt, t) => { for (const [m, j, i] of jetMeshes) m.scale.set(1, j.h * (0.85 + 0.15 * Math.sin(t * 1.6 + i)), 1); });
    for (let z = L.z - L.rz; z < L.z + L.rz; z += 4) {   // 물에는 못 들어간다
      const t = (z + 2 - L.z) / L.rz, half = L.rx * 0.95 * Math.sqrt(Math.max(0, 1 - t * t));
      if (half > 1) blocks.push({ x0: L.x - half, x1: L.x + half, z0: z, z1: z + 4 });
    }
    sign(S.signs.lake);
  }
  await idle();

  // ── 3. 체조경기장(KSPO 돔)과 엄지손가락, 조각공원
  {
    const D = S.dome;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(D.r, 48, 12, 0, Math.PI * 2, 0, 0.62), std(0xeef1f3, { roughness: 0.5, metalness: 0.15 }));
    const k = D.h / (D.r * (1 - Math.cos(0.62)));
    shell.scale.set(1, k, 1); shell.position.set(D.x, 4 - D.r * Math.cos(0.62) * k, D.z); shell.castShadow = true; g.add(shell);
    for (let i = 0; i < 24; i++) {   // 지붕 케이블 갈비
      const a = i / 24 * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(D.r, 0.12, 4, 24, 0.62), std(0x9aa3ab));
      rib.rotation.z = Math.PI / 2 - 0.62;
      const holder = new THREE.Group(); holder.add(rib);
      holder.rotation.y = a; holder.position.copy(shell.position); holder.scale.set(1, k, 1); g.add(holder);
    }
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(D.r * Math.sin(0.62), D.r * Math.sin(0.62) + 0.5, 4, 48, 1, true), std(0x7f8b96, { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }));
    wall.position.set(D.x, 2, D.z); g.add(wall);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(D.r * Math.sin(0.62) + 0.3, 0.25, 6, 48), lampMat(0x6fb6ff));
    ring.rotation.x = Math.PI / 2; ring.position.set(D.x, 4, D.z); g.add(ring); lamps.push([ring.material, 0.5, 2.0]);
    const R0 = D.r * Math.sin(0.62) * 0.8;
    blocks.push({ x0: D.x - R0, x1: D.x + R0, z0: D.z - R0, z1: D.z + R0 });
    sign(S.signs.dome);

    // 엄지손가락: 청동 엄지가 하늘로 선다
    const T0 = S.thumb, bronze = std(0x8a6a3a, { metalness: 0.75, roughness: 0.35 });
    const th = new THREE.Group();
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 3.6, 8, 20), bronze); finger.position.y = 3.4; finger.scale.set(1, 1, 0.85); th.add(finger);
    const nail = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, 1.0), std(0xa98450, { metalness: 0.8, roughness: 0.25 }));
    nail.position.set(0, 5.1, 0.55); nail.rotation.x = 1.25; nail.scale.set(1, 1, 0.4); th.add(nail);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 2.4), std(0x6d6a66)); base.position.y = 0.5; th.add(base);
    th.position.set(T0.x, 0, T0.z); th.rotation.y = 0.4; th.traverse(o => { o.castShadow = true; }); g.add(th);
    blocks.push({ x0: T0.x - 1.4, x1: T0.x + 1.4, z0: T0.z - 1.3, z1: T0.z + 1.3 });
    sign(S.signs.thumb);

    // 조각공원: 추상 조각 여섯 점
    const forms = [new THREE.TorusKnotGeometry(1.2, 0.35, 80, 10), new THREE.TorusGeometry(1.8, 0.4, 12, 32), new THREE.OctahedronGeometry(1.8),
      new THREE.CylinderGeometry(0.4, 0.8, 6, 6), new THREE.IcosahedronGeometry(1.6, 0), new THREE.TorusGeometry(1.2, 0.5, 8, 6)];
    const fmats = [bronze, std(0xd9d6cf), std(0xc2402e, { roughness: 0.5 }), std(0x30363c, { metalness: 0.7, roughness: 0.3 })];
    S.sculptures.forEach(([x, z], i) => {
      const m = new THREE.Mesh(forms[i % forms.length], fmats[i % fmats.length]);
      m.position.set(x, 3, z); m.rotation.set(r() * 3, r() * 3, 0); m.castShadow = true; g.add(m);
      const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), std(0x8f8a82)); ped.position.set(x, 0.5, z); g.add(ped);
      blocks.push({ x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1 });
    });
    sign(S.signs.sculpture);
  }
  await idle();

  // ── 4. 몽촌토성: 풀 덮인 흙성 둔덕과 그 위를 따라 걷는 오솔길
  {
    const xs = ridge.map(p => p[0]), zs = ridge.map(p => p[1]);
    terrain(Math.min(...xs) - RW - 2, Math.min(...zs) - RW - 2, Math.max(...xs) + RW + 2, Math.max(...zs) + RW + 2);
    const trail = [];
    for (let i = 1; i < ridge.length; i++) {
      const [ax, az] = ridge[i - 1], [bx, bz] = ridge[i], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.2);
      for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; trail.push({ x, y: ground(x, z) + 0.03, z, ry: Math.atan2(bx - ax, bz - az) }); }
    }
    inst(g, new THREE.PlaneGeometry(1.6, 1.3).rotateX(-Math.PI / 2), std(0xa8916a, { roughness: 1 }), trail);
    // 토성 비탈의 억새
    const reeds = [];
    for (let i = 0; i < 900; i++) {
      const s = ridge[1 + Math.floor(r() * (ridge.length - 1))], q = ridge[ridge.indexOf(s) - 1], t = r();
      const off = (r() < 0.5 ? -1 : 1) * (RW * (0.35 + r() * 0.5));
      const dx = s[0] - q[0], dz = s[1] - q[1], L = Math.hypot(dx, dz);
      const x = q[0] + dx * t - dz / L * off, z = q[1] + dz * t + dx / L * off;
      reeds.push({ x, y: ground(x, z), z, s: 0.8 + r() * 0.6, ry: r() * 6, c: r() < 0.5 ? 0xd8c9a0 : 0xc4b07c });
    }
    const reed = new THREE.ConeGeometry(0.35, 1.6, 5, 1, true).translate(0, 0.8, 0);
    inst(g, reed, std(0xffffff, { side: THREE.DoubleSide, roughness: 1 }), reeds);
    sign(S.signs.fortress);
  }
  await idle();

  // ── 5. 나홀로나무: 너른 풀 언덕 꼭대기의 한 그루
  {
    terrain(hill.x - hill.r, hill.z - hill.r, hill.x + hill.r, hill.z + hill.r);
    const y = ground(hill.x, hill.z), bark = std(0x4a3a2a, { roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 7, 10), bark);
    trunk.position.set(hill.x, y + 3.4, hill.z); trunk.castShadow = true; g.add(trunk);
    const leafM = std(0x7d8f3a, { roughness: 0.9, flatShading: true });
    const crown = [];
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, q = Math.sqrt(r()) * 5.2;
      crown.push({ x: hill.x + Math.cos(a) * q, y: y + 7.5 + r() * 5 - q * 0.35, z: hill.z + Math.sin(a) * q, s: 2.2 + r() * 1.4, c: r() < 0.6 ? 0x7d8f3a : 0x9a9a44 });
    }
    inst(g, new THREE.IcosahedronGeometry(1, 1), leafM, crown, true);
    for (let k = 0; k < 5; k++) {
      const a = k * 1.26 + r(), pts = [new THREE.Vector3(hill.x, y + 6, hill.z), new THREE.Vector3(hill.x + Math.cos(a) * 2.5, y + 8.5, hill.z + Math.sin(a) * 2.5),
        new THREE.Vector3(hill.x + Math.cos(a) * 4.2, y + 10, hill.z + Math.sin(a) * 4.2)];
      const b = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.22, 6), bark); b.castShadow = true; g.add(b);
    }
    blocks.push({ x0: hill.x - 0.9, x1: hill.x + 0.9, z0: hill.z - 0.9, z1: hill.z + 0.9 });
    sign({ ...S.signs.loneTree, at: [hill.x, hill.z - hill.r * 0.75] });
  }
  await idle();

  // ── 6. 들꽃마루: 늦가을 코스모스와 황화코스모스 꽃밭
  {
    const F = S.wildflowers, heads = [], stems = [];
    const cols = [0xf28cb8, 0xffffff, 0xd2357a, 0xf7b6d2, 0xf2a83a, 0xf5c242];
    for (let i = 0; i < F.count; i++) {
      const x = F.x0 + r() * (F.x1 - F.x0), z = F.z0 + r() * (F.z1 - F.z0);
      if (Math.abs(z - (F.z0 + F.z1) / 2) < 1.4 || Math.abs(x - (F.x0 + F.x1) / 2) < 1.4) continue;   // 꽃밭 가운데 십자 오솔길
      const yellow = (x - F.x0) / (F.x1 - F.x0) > 0.62, h = 0.7 + r() * 0.6;
      stems.push({ x, y: 0, z, sy: h });
      heads.push({ x, y: h, z, s: 0.8 + r() * 0.5, ry: r() * 6, rx: -1.3 + r() * 0.5, c: yellow ? cols[4 + (i % 2)] : cols[i % 4] });
    }
    inst(g, new THREE.CylinderGeometry(0.008, 0.012, 1, 3).translate(0, 0.5, 0), std(0x5b7a34), stems);
    inst(g, new THREE.CircleGeometry(0.06, 8), std(0xffffff, { side: THREE.DoubleSide, roughness: 0.8 }), heads);
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(F.x1 - F.x0, F.z1 - F.z0).rotateX(-Math.PI / 2), std(0x6f7a46, { roughness: 1 }));
    soil.position.set((F.x0 + F.x1) / 2, 0.02, (F.z0 + F.z1) / 2); g.add(soil);
    sign(S.signs.wildflowers);
  }
  await idle();

  // ── 7. 가로수(은행·단풍·느티)와 공원 등
  {
    const trees = [];
    for (const [kind, x0, z0, x1, z1, step] of S.avenues) {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
      for (let i = 0; i <= n; i++) trees.push({ kind, x: x0 + (x1 - x0) * i / n, z: z0 + (z1 - z0) * i / n, s: 0.9 + r() * 0.25, rot: r() * 6 });
    }
    for (const [kind, x, z, rad, n] of S.groves) for (let i = 0; i < n; i++) {
      const a = r() * 6.28, q = Math.sqrt(r()) * rad;
      trees.push({ kind, x: x + Math.cos(a) * q, z: z + Math.sin(a) * q, s: 0.8 + r() * 0.4, rot: r() * 6 });
    }
    plantTrees(g, trees.map(t => ({ ...t, y: ground(t.x, t.z) })), blocks);
    const posts = [], heads = [], lm = lampMat(0xfff0cc);
    for (const [x0, z0, x1, z1] of S.lampLines) {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 14));
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; posts.push({ x, y: 2.2, z }); heads.push({ x, y: 4.5, z }); }
    }
    inst(g, new THREE.CylinderGeometry(0.07, 0.1, 4.4, 6), std(0x2e3338, { metalness: 0.5, roughness: 0.5 }), posts);
    inst(g, new THREE.SphereGeometry(0.28, 12, 8), lm, heads);
    lamps.push([lm, 0.55, 2.4]);
  }

  return {
    ground,
    update(dt) {
      T.value += dt;
      const lit = scene.userData.lit ?? 0;
      for (const [m, day, night] of lamps) m.color.copy(m.userData.base).multiplyScalar(day + (night - day) * lit);
      for (const f of tick) f(dt, T.value);
    },
  };
}
const T = { value: 0 };

// 세계평화의 문: 네 기둥 위로 새가 날개를 펼친 듯한 지붕, 날개 밑면에는 오방색 단청 무늬. 문 앞에 성화.
function gate(g, G, blocks, tick, lamps) {
  const conc = std(0xe9e6df, { roughness: 0.75 }), W = G.w, D = G.d;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(2.2, G.h, 2.2), conc);
    col.position.set(G.x + sx * G.span / 2, G.h / 2, G.z + sz * (D / 2 - 2)); col.castShadow = true; g.add(col);
    blocks.push({ x0: col.position.x - 1.2, x1: col.position.x + 1.2, z0: col.position.z - 1.2, z1: col.position.z + 1.2 });
  }
  // 지붕 판: 가운데 낮고 양끝으로 치켜오른 날개. 위는 흰 콘크리트, 아래는 단청
  const wing = (offset, mat) => {
    const geo = new THREE.PlaneGeometry(W, D, 64, 4).rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (W / 2), v = p.getZ(i) / (D / 2); p.setY(i, G.h + 4.5 * u ** 4 + 0.6 * (1 - v * v) + offset); p.setZ(i, p.getZ(i) * (1 - 0.35 * u * u)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.position.set(G.x, 0, G.z); m.castShadow = true; g.add(m);
  };
  wing(0.9, conc);
  wing(0, new THREE.MeshStandardMaterial({ map: dancheong(), side: THREE.DoubleSide, roughness: 0.8 }));
  // 성화대: 문 앞 광장 쪽에 꺼지지 않는 불
  const [fx, fz] = G.flame;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 3, 16), std(0x6b6660)); ped.position.set(fx, 1.5, fz); g.add(ped);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.7, 0.8, 20, 1, true), std(0xb8913f, { metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }));
  bowl.position.set(fx, 3.4, fz); g.add(bowl);
  blocks.push({ x0: fx - 1.3, x1: fx + 1.3, z0: fz - 1.3, z1: fz + 1.3 });
  const fl = lampMat(0xff9a2e), core = lampMat(0xffe08a);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 10).translate(0, 1.3, 0), fl);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.7, 8).translate(0, 0.85, 0), core);
  flame.position.set(fx, 3.6, fz); inner.position.set(fx, 3.6, fz); g.add(flame, inner);
  lamps.push([fl, 1.6, 3.0], [core, 1.8, 3.2]);
  tick.push((dt, t) => { const s = 1 + 0.12 * Math.sin(t * 9) + 0.08 * Math.sin(t * 13.7); flame.scale.set(1, s, 1); inner.scale.set(1, 2 - s, 1); flame.rotation.y = t; });
}
// 날개 밑면 그림: 오방색 띠와 구름 무늬(캔버스로 그린다)
function dancheong() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#1f6f5c'; x.fillRect(0, 0, 1024, 128);
  const band = ['#c8372d', '#f2c230', '#2e4f9e', '#ffffff', '#1b1b1b'];
  band.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, 8 + i * 6, 1024, 4); x.fillRect(0, 120 - i * 6 - 4, 1024, 4); });
  for (let i = 0; i < 24; i++) {
    const cx = 22 + i * 43;
    x.fillStyle = band[i % 3]; x.beginPath(); x.arc(cx, 64, 16, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, 64, 8, 0, Math.PI * 2); x.fill();
    x.fillStyle = band[(i + 1) % 3]; x.beginPath(); x.arc(cx, 64, 4, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
}
