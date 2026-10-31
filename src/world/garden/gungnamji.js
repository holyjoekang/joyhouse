import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { U, glow, instances, tuft, rng } from './kit.js';
import { mats } from '../materials.js';
import { stoneLantern } from '../nature.js';
import { rippleNormal } from '../pond.js';
import { textPlane } from '../../ui3d/text.js';

// 부여 궁남지(宮南池): 둥근 못 가운데 섬과 정자(포룡정), 섬으로 건너는 나무다리(포룡교),
// 물가를 두른 능수버들, 연잎과 연꽃, 갈대. 둑길을 따라 석등이 선다. 고즈넉함이 주제라 빛나는 것은 석등뿐이다.
// 버들가지·갈대는 꼭짓점 셰이더로 바람에 흔들린다(U.time 공용 시계).
function swayMat(color, amp, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, ...o });
  m.onBeforeCompile = sh => {
    sh.uniforms.uT = U.time;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      float ph = 0.0;
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17;
      #endif
      float k = clamp(${amp > 0 ? '-position.y' : 'position.y'}, 0.0, 1.0);
      float sw = k * k * ${Math.abs(amp).toFixed(3)};
      mvPosition.x += sin(uT * 0.9 + ph) * sw;
      mvPosition.z += sin(uT * 0.7 + ph * 1.6) * sw * 0.6;
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'sway' + amp;
  return m;
}

// 둘레 모양: 타원에 잔물결을 얹은 자연스러운 물가. a(각도) → 반지름 배수
const wobble = a => 1 + 0.06 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 7 + 2.1);
function rimPts(cx, cz, rx, rz, off = 0, n = 96) {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2, w = wobble(a);
    return new THREE.Vector2(cx + Math.cos(a) * (rx * w + off), cz + Math.sin(a) * (rz * w + off));
  });
}
// 평면 모양(x,z) → 땅에 눕힌 지오메트리. holes 는 안쪽 구멍
function flat(pts, holes = [], y = 0) {
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, -p.y)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p.x, -p.y))));
  return new THREE.ShapeGeometry(sh, 2).rotateX(-Math.PI / 2).translate(0, y, 0);
}

const GRAVEL = new THREE.MeshStandardMaterial({ color: 0xc9b894, roughness: 1 });

export function build(g, { cx, cz, entry, w, d }, { blocks }) {
  const r = rng(1400);
  const rx = Math.min(w / 2 - 17, 24), rz = Math.min(d / 2 - 38, 38);
  const isl = { x: cx, z: cz + 2, r: 6.5 };

  // 물: 짙은 녹갈색, 잔물결 법선맵 두 장을 흘린다
  const normal = rippleNormal(); normal.repeat.set(10, 16);
  const water = new THREE.Mesh(flat(rimPts(cx, cz, rx, rz), [], 0.05), new THREE.MeshStandardMaterial({
    color: 0x3c5244, roughness: 0.06, metalness: 0.15, normalMap: normal, normalScale: new THREE.Vector2(0.25, 0.25) }));
  water.receiveShadow = true; g.add(water);
  // 물가 흙둑과 둑길(마사토)
  g.add(new THREE.Mesh(flat(rimPts(cx, cz, rx, rz, 1.6), [rimPts(cx, cz, rx, rz)], 0.035),
    new THREE.MeshStandardMaterial({ color: 0x6b5a42, roughness: 1 })));
  const path = new THREE.Mesh(flat(rimPts(cx, cz, rx, rz, 7.5), [rimPts(cx, cz, rx, rz, 4.5)], 0.03), GRAVEL);
  path.receiveShadow = true; g.add(path);
  // 들머리에서 둑길까지 곧은 길
  const lead = new THREE.Mesh(new THREE.PlaneGeometry(3.2, cz - rz - 4.5 - entry[1]).rotateX(-Math.PI / 2), mats.gravel);
  lead.material = GRAVEL;
  lead.position.set(cx, 0.03, (entry[1] + cz - rz - 4.5) / 2); g.add(lead);

  // 물가 돌: 흙둑을 따라 띄엄띄엄 놓인 자연석
  const rocks = [];
  for (const p of rimPts(cx, cz, rx, rz, 0.5, 150)) if (r() < 0.55)
    rocks.push({ x: p.x + (r() - 0.5) * 0.6, y: 0.05, z: p.y + (r() - 0.5) * 0.6, sx: 0.4 + r() * 0.6, sy: 0.25 + r() * 0.3, sz: 0.4 + r() * 0.5, ry: r() * 6 });
  instances(g, new THREE.DodecahedronGeometry(1, 0), mats.stone, rocks).receiveShadow = true;

  // 섬: 돌로 쌓은 둘레 + 풀 언덕
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r + 0.4, 0.8, 40), mats.stoneWall);
  rim.position.set(isl.x, 0.25, isl.z); rim.castShadow = rim.receiveShadow = true; g.add(rim);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(isl.r, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.grass);
  mound.scale.y = 0.08; mound.position.set(isl.x, 0.62, isl.z); mound.receiveShadow = true; g.add(mound);

  pavilion(g, isl.x, isl.z, blocks);
  const fields = paddies(g, { cx, cz, w, d, rx, rz, entry }, r, blocks);
  lamps(g, cx, cz, rx, rz, fields, r);
  const bridgeZ0 = cz - rz * wobble(-Math.PI / 2) - 0.5, bridgeZ1 = isl.z - isl.r + 0.3;
  bridge(g, cx, bridgeZ0, bridgeZ1, r);

  // 능수버들: 물가를 두르고 섬에도 두 그루. 둑길 안쪽, 물 쪽으로 기운다
  const willows = [];
  for (let i = 0, n = 20; i < n; i++) {
    const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.15;
    if (Math.abs(a - Math.PI * 1.5) < 0.12) continue;   // 다리 들머리는 비워 둔다
    const wv = wobble(a), off = 2.4 + r() * 1.6;
    willows.push({ x: cx + Math.cos(a) * (rx * wv + off), z: cz + Math.sin(a) * (rz * wv + off), lean: a + Math.PI, s: 0.85 + r() * 0.35 });
  }
  willows.push({ x: isl.x - 3.8, z: isl.z + 3, lean: 2.4, s: 0.7 }, { x: isl.x + 4, z: isl.z + 2.2, lean: 0.6, s: 0.65 });
  willowGrove(g, willows, r, blocks);

  // 연잎·연꽃: 물가 다섯 군데에 무리 지어
  const pads = [], leaves = [], buds = [], flowers = [];
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.4, R = 0.62 + r() * 0.18;
    const px = cx + Math.cos(a) * rx * R, pz = cz + Math.sin(a) * rz * R;
    for (let i = 0; i < 150; i++) {
      const q = Math.sqrt(r()) * 9, b = r() * 6.28, x = px + Math.cos(b) * q * 1.3, z = pz + Math.sin(b) * q;
      if (Math.hypot((x - cx) / rx, (z - cz) / rz) > 0.9 || Math.hypot(x - isl.x, z - isl.z) < isl.r + 1.5 || Math.abs(x - cx) < 2.5 && z < isl.z) continue;
      const s = 0.5 + r() * 0.7;
      if (r() < 0.75) pads.push({ x, y: 0.07, z, s, ry: r() * 6 });
      else leaves.push({ x, y: 0.5 + r() * 0.9, z, s: s * 1.1, ry: r() * 6, rx: (r() - 0.5) * 0.3 });
      if (r() < 0.12) (r() < 0.6 ? flowers : buds).push({ x: x + 0.3, y: 0.7 + r() * 0.7, z, s: 0.8 + r() * 0.4, ry: r() * 6 });
    }
  }
  const padGeo = new THREE.CircleGeometry(0.55, 16, 0.25, Math.PI * 2 - 0.35).rotateX(-Math.PI / 2);
  instances(g, padGeo, new THREE.MeshStandardMaterial({ color: 0x4e6e34, roughness: 0.55, side: THREE.DoubleSide }), pads);
  // 물 위로 솟은 연잎: 얕은 그릇 모양 + 줄기
  const bowl = new THREE.SphereGeometry(0.6, 16, 6, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38).translate(0, 0.45, 0);
  instances(g, bowl, new THREE.MeshStandardMaterial({ color: 0x5f8a3c, roughness: 0.6, side: THREE.DoubleSide }), leaves);
  const stem = new THREE.CylinderGeometry(0.02, 0.025, 1, 4).translate(0, -0.5, 0);
  instances(g, stem, mats.hedge, leaves.concat(flowers, buds).map(o => ({ ...o, sy: o.y, s: 1, sx: 1, sz: 1, rx: 0 })));
  // 연꽃: 꽃잎 여덟 장을 컵처럼, 꽃봉오리는 끝이 뾰족한 알
  const petal = new THREE.SphereGeometry(0.16, 8, 6).scale(0.55, 1, 0.25).translate(0, 0.16, 0);
  const flowerGeo = mergeGeometries(Array.from({ length: 10 }, (_, i) => petal.clone().rotateX(i < 5 ? 0.35 : 0.85).rotateY(i * 1.26)));
  instances(g, flowerGeo, new THREE.MeshStandardMaterial({ color: 0xf3c3d0, roughness: 0.5, emissive: 0x3a1420, emissiveIntensity: 0.15 }), flowers);
  instances(g, new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1.6, 1), new THREE.MeshStandardMaterial({ color: 0xe48aa4, roughness: 0.5 }), buds);

  // 갈대·부들: 물가 흙둑에 포기로
  const reeds = [];
  for (const p of rimPts(cx, cz, rx, rz, 0.2, 220)) {
    if (r() < 0.45 || Math.abs(p.x - cx) < 3 && p.y < cz) continue;
    reeds.push({ x: p.x + (r() - 0.5) * 1.2, z: p.y + (r() - 0.5) * 1.2, s: 1.0 + r() * 1.1, ry: r() * 6, c: r() < 0.3 ? 0x9a9a5a : 0x6f8a44 });
  }
  const reedGeo = tuft(7, 0.035, 0.25); reedGeo.computeVertexNormals();
  instances(g, reedGeo, swayMat(0xffffff, -0.25, { roughness: 0.9 }), reeds);

  // 석등: 둑길 바깥 가장자리를 따라 여덟 기
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4, wv = wobble(a);
    stoneLantern(g, cx + Math.cos(a) * (rx * wv + 8.4), cz + Math.sin(a) * (rz * wv + 8.4), 0.85);
  }

  // 물에는 못 들어간다: 4m 띠마다 타원 안쪽을 막되, 다리 통로와 섬은 비운다
  for (let z = cz - rz + 2; z < cz + rz - 2; z += 4) {
    const t = (z + 2 - cz) / rz, half = rx * 0.92 * Math.sqrt(Math.max(0, 1 - t * t));
    if (half < 1) continue;
    let cuts = [[cx - half, cx + half]];
    const gap = (a, b) => { cuts = cuts.flatMap(([u, v]) => (b <= u || a >= v) ? [[u, v]] : [[u, a], [b, v]].filter(([p, q]) => q - p > 0.3)); };
    if (z + 4 > bridgeZ0 && z < bridgeZ1) gap(cx - 1.25, cx + 1.25);
    const dz = Math.max(0, Math.abs(z + 2 - isl.z) - 2);
    if (dz < isl.r) { const hx = Math.sqrt(isl.r * isl.r - dz * dz); gap(isl.x - hx, isl.x + hx); }
    for (const [x0, x1] of cuts) blocks.push({ x0, x1, z0: z, z1: z + 4 });
  }

  return {
    update(dt) {
      normal.offset.x += dt * 0.006;
      normal.offset.y += dt * 0.004;
    },
  };
}

// 섬 위 육모정자: 장대석 기단, 기둥 여섯, 난간, 기와 육모지붕과 절병통
function pavilion(g, x, z, blocks) {
  const p = new THREE.Group(), R = 2.9, red = new THREE.MeshStandardMaterial({ color: 0x7a2e22, roughness: 0.7 });
  const green = new THREE.MeshStandardMaterial({ color: 0x2f6a5a, roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.7, R + 0.8, 0.6, 6), mats.stoneWall);
  base.position.y = 0.9; base.castShadow = base.receiveShadow = true; p.add(base);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.14, 6), mats.wood);
  floor.position.y = 1.27; p.add(floor);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, a2 = (i + 1) / 6 * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 3.1, 12), red);
    post.position.set(Math.cos(a) * R, 2.85, Math.sin(a) * R); post.castShadow = true; p.add(post);
    if (i === 4) continue;   // 다리 쪽(북)은 난간 없이 드나든다
    const mx = (Math.cos(a) + Math.cos(a2)) / 2 * R, mz = (Math.sin(a) + Math.sin(a2)) / 2 * R;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(R, 0.08, 0.08), mats.darkWood);
    rail.position.set(mx, 1.95, mz); rail.rotation.y = -(a + a2) / 2 + Math.PI / 2; p.add(rail);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(R, 0.32, 0.22), green);
    lintel.position.set(mx, 4.3, mz); lintel.rotation.y = rail.rotation.y; p.add(lintel);
  }
  // 지붕: 육각뿔을 오목하게 휘고 처마 끝을 들어 올린다
  const roof = new THREE.ConeGeometry(R + 1.6, 2.4, 6, 6, true);
  const pos = roof.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = (1.2 - y) / 2.4, px = pos.getX(i), pz = pos.getZ(i);
    const corner = Math.abs(Math.cos(Math.atan2(pz, px) * 3));   // 모서리일수록 1
    pos.setY(i, y - Math.sin(t * Math.PI) * 0.35 + (t > 0.85 ? (t - 0.85) * 4 * corner * 0.9 : 0));
  }
  roof.computeVertexNormals();
  const roofM = new THREE.Mesh(roof, mats.tile); roofM.position.y = 5.55; roofM.castShadow = true; p.add(roofM);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.7, 8), mats.ridge); knob.position.y = 6.95; p.add(knob);
  const plate = textPlane({ width: 512, padding: 16, bg: '#2a1d14', border: '#c9a14a', radius: 6, align: 'center',
    lines: [{ text: '포룡정 抱龍亭', size: 48, weight: 700, color: '#e8c77a', font: 'serif' }] }, 1.1, { lit: true });
  plate.position.set(0, 4.05, -R * 0.87 - 0.13); plate.rotation.y = Math.PI; p.add(plate);
  p.position.set(x, 0, z); g.add(p);
  // 밤이면 처마 밑에서 정자를 비추는 따뜻한 조명 (실제 광원 하나)
  // 광원 대신: 처마 밑 천장 판이 밤에 따뜻하게 빛나고, 마루와 물에 빛이 고인다(덧셈 재질 — 낮엔 0)
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(R + 0.2, 6).rotateX(Math.PI / 2), glow(0xffc98a, { day: 0.35, night: 1.8, pulse: 0.02 }));
  ceil.position.y = 4.45; p.add(ceil);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(R + 6, 32).rotateX(-Math.PI / 2), poolMat(0xffb060, 0.5));
  pool.position.y = 0.07; p.add(pool);
  const up = null;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; blocks.push({ x0: x + Math.cos(a) * R - 0.2, x1: x + Math.cos(a) * R + 0.2, z0: z + Math.sin(a) * R - 0.2, z1: z + Math.sin(a) * R + 0.2 }); }
  return up;
}

// 섬으로 건너는 나무다리: 물 위 0.7m, 너비 2.2m, 3m마다 받침 기둥, 양쪽 난간
function bridge(g, x, z0, z1, r) {
  const len = z1 - z0, b = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, len), mats.wood);
  deck.position.set(0, 0.72, len / 2); deck.castShadow = deck.receiveShadow = true; b.add(deck);
  const spots = [], rails = [];
  for (let s = 0; s <= len; s += 3) for (const sx of [-1, 1]) {
    spots.push({ x: x + sx * 1.0, y: 0.32, z: z0 + s });
    rails.push({ x: x + sx * 1.05, y: 1.2, z: z0 + s });
  }
  instances(g, new THREE.CylinderGeometry(0.13, 0.15, 0.9, 8), mats.darkWood, spots);
  instances(g, new THREE.BoxGeometry(0.1, 0.9, 0.1), mats.darkWood, rails);
  for (const sx of [-1, 1]) for (const y of [1.6, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), mats.darkWood);
    rail.position.set(sx * 1.05, y, len / 2); b.add(rail);
  }
  b.position.set(x, 0, z0); g.add(b);
}

// 능수버들: 굽은 줄기와 가지, 둥근 수관에서 땅 가까이까지 늘어지는 가지 수백 가닥
function willowGrove(g, list, r, blocks) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3c2e, roughness: 1 });
  const crown = [], strands = [];
  const trunks = new THREE.Group();
  for (const t of list) {
    const h = 6.5 * t.s, lx = Math.cos(t.lean), lz = Math.sin(t.lean);
    const pts = [0, 0.35, 0.7, 1].map(k => new THREE.Vector3(t.x + lx * k * k * 2.2 * t.s, k * h, t.z + lz * k * k * 2.2 * t.s));
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.32 * t.s, 7), bark);
    trunk.castShadow = true; trunks.add(trunk);
    const top = pts[3];
    for (let k = 0; k < 4; k++) {   // 큰 가지 넷
      const a = k * 1.57 + r() * 0.8;
      const bpts = [top.clone().add(new THREE.Vector3(0, -1.2, 0)), top.clone().add(new THREE.Vector3(Math.cos(a) * 1.8, 0.9, Math.sin(a) * 1.8)),
        top.clone().add(new THREE.Vector3(Math.cos(a) * 3.2, 1.0, Math.sin(a) * 3.2))];
      trunks.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bpts), 6, 0.13 * t.s, 5), bark));
    }
    const R = 3.8 * t.s;
    for (let i = 0; i < 6; i++)   // 수관 덩이: 가지 끝의 잎 뭉치
      crown.push({ x: top.x + (r() - 0.5) * R * 1.2, y: top.y + 0.6 + r() * 1.2, z: top.z + (r() - 0.5) * R * 1.2, sx: 1.3 * t.s, sy: 0.7 * t.s, sz: 1.3 * t.s, ry: r() * 6, c: r() < 0.5 ? 0x8aa84a : 0x7b9a3e });
    for (let i = 0; i < 300; i++) {   // 늘어진 가지: 수관 둘레 바깥쪽일수록 길다
      const q = Math.sqrt(r()), a = r() * 6.28, sx = top.x + Math.cos(a) * q * R, sz = top.z + Math.sin(a) * q * R;
      const sy = top.y + 1.4 - q * q * 1.6 + r() * 0.4, len = Math.min(sy - 0.4, 2.5 + q * 4.5 + r() * 1.2);
      strands.push({ x: sx, y: sy, z: sz, sx: 1, sy: len, sz: 1, ry: a + Math.PI / 2, c: [0x9cba52, 0x86a843, 0xb3c862][i % 3] });
    }
    blocks.push({ x0: t.x - 0.45, x1: t.x + 0.45, z0: t.z - 0.45, z1: t.z + 0.45 });
  }
  g.add(trunks);
  const blob = new THREE.IcosahedronGeometry(1, 1);
  const cm = instances(g, blob, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), crown);
  cm.castShadow = true;
  // 가지 한 가닥: 위 0 → 아래 -1 로 늘어진 가는 띠(잎이 달린 듯 위아래로 가늘다)
  const ribbon = new THREE.PlaneGeometry(0.09, 1, 1, 6).translate(0, -0.5, 0);
  const rp = ribbon.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setX(i, rp.getX(i) * (0.5 + 0.5 * Math.sin((rp.getY(i) + 1) * Math.PI * 0.9)));
  instances(g, ribbon, swayMat(0xffffff, 0.45), strands);
}

// 연지(蓮池): 못 둘레 바깥을 채운 연밭. 9×7m 논배미마다 물을 대고 연잎과 연꽃이 빽빽하다. 사이는 흙길.
function paddies(g, { cx, cz, w, d, rx, rz, entry }, r, blocks) {
  const x0 = cx - w / 2 + 2, z0 = cz - d / 2 + 6, PW = 9, PD = 7, GAP = 1.8;
  const plots = [], leaves = [], flowers = [], buds = [], seedpods = [];
  for (let x = x0; x + PW < cx + w / 2 - 1; x += PW + GAP) for (let z = z0; z + PD < cz + d / 2 - 2; z += PD + GAP) {
    const mx = x + PW / 2, mz = z + PD / 2;
    if (Math.hypot((mx - cx) / (rx + 13), (mz - cz) / (rz + 13)) < 1) continue;   // 못과 둑길 자리
    if (Math.abs(mx - cx) < PW / 2 + 2.5 && mz < cz) continue;                     // 들머리 길
    plots.push({ x: mx, y: 0.04, z: mz, sx: PW, sz: PD, sy: 1 });
    blocks.push({ x0: x, x1: x + PW, z0: z, z1: z + PD });
    for (let i = 0; i < 44; i++) {
      const lx = x + 0.5 + r() * (PW - 1), lz = z + 0.5 + r() * (PD - 1), s = 0.7 + r() * 0.6;
      leaves.push({ x: lx, y: 0.75 + r() * 0.7, z: lz, s, ry: r() * 6, rx: (r() - 0.5) * 0.5, c: r() < 0.5 ? 0x5f8a3c : 0x6c9644 });
      const q = r();
      if (q < 0.16) flowers.push({ x: lx + 0.4, y: 1.1 + r() * 0.8, z: lz, s: 1.1 + r() * 0.5, ry: r() * 6, c: r() < 0.7 ? 0xf3b6c8 : 0xfbf4ee });
      else if (q < 0.24) buds.push({ x: lx + 0.4, y: 1.0 + r() * 0.8, z: lz, s: 1.2, ry: 0 });
      else if (q < 0.28) seedpods.push({ x: lx + 0.3, y: 1.2 + r() * 0.5, z: lz, s: 1, ry: r() * 6 });
    }
  }
  const mud = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  instances(g, mud, new THREE.MeshStandardMaterial({ color: 0x3d4a36, roughness: 0.35, metalness: 0.05 }), plots);
  // 논배미 둑: 낮은 흙둑 테두리
  const banks = plots.flatMap(p => [{ x: p.x, y: 0.08, z: p.z - PD / 2, sx: PW, sz: 0.35 }, { x: p.x, y: 0.08, z: p.z + PD / 2, sx: PW, sz: 0.35 },
    { x: p.x - PW / 2, y: 0.08, z: p.z, sx: 0.35, sz: PD }, { x: p.x + PW / 2, y: 0.08, z: p.z, sx: 0.35, sz: PD }]).map(o => ({ ...o, sy: 0.16 }));
  instances(g, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x75664c, roughness: 1 }), banks);
  const bowl = new THREE.SphereGeometry(0.62, 16, 6, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4).translate(0, 0.47, 0);
  instances(g, bowl, swayMat(0xffffff, -0.08, { roughness: 0.6 }), leaves);
  const stem = new THREE.CylinderGeometry(0.02, 0.025, 1, 4).translate(0, -0.5, 0);
  instances(g, stem, mats.hedge, leaves.concat(flowers, buds, seedpods).map(o => ({ x: o.x, y: o.y, z: o.z, sy: o.y })));
  instances(g, LOTUS(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0x2a0e16, emissiveIntensity: 0.2 }), flowers);
  instances(g, new THREE.SphereGeometry(0.11, 8, 6).scale(1, 1.7, 1), new THREE.MeshStandardMaterial({ color: 0xe07f9c, roughness: 0.5 }), buds);
  instances(g, new THREE.CylinderGeometry(0.16, 0.07, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x8f9a4a, roughness: 0.7 }), seedpods);
  return { plots, PW, PD, GAP };
}
let _lotus = null;
const LOTUS = () => _lotus ??= mergeGeometries(Array.from({ length: 12 }, (_, i) => new THREE.SphereGeometry(0.16, 8, 6)
  .scale(0.55, 1, 0.25).translate(0, 0.16, 0).rotateX(i < 6 ? 0.3 : 0.85).rotateY(i * 1.05 + (i < 6 ? 0 : 0.5))));

// 밤 조명: 둑길과 연밭 길에 청사초롱(위 파랑·아래 빨강 비단 초롱)을 단 등주, 못과 연밭에 연화등.
// 광원은 쓰지 않는다 — 등은 빛번짐(bloom), 땅에는 빛 웅덩이, 물에는 길게 늘어진 반영으로 켜진 듯 보이게.
function lamps(g, cx, cz, rx, rz, { plots, PW, PD }, r) {
  const posts = [], arms = [], spots = [], pools = [], streaks = [];
  const add = (x, z, face, nearWater) => {
    posts.push({ x, y: 1.3, z });
    const ax = x + Math.sin(face) * 0.35, az = z + Math.cos(face) * 0.35;
    arms.push({ x: ax, y: 2.55, z: az, ry: face });
    spots.push({ x: x + Math.sin(face) * 0.65, y: 2.2, z: z + Math.cos(face) * 0.65 });
    pools.push({ x, y: 0.05, z, s: 0.9 });
    if (nearWater) streaks.push(nearWater);
  };
  for (let i = 0, n = 26; i < n; i++) {   // 둑길 바깥 가장자리, 초롱은 물 쪽으로
    const a = i / n * Math.PI * 2 + 0.06;
    if (Math.abs(a - Math.PI * 1.5) < 0.12) continue;
    const wv = wobble(a), ca = Math.cos(a), sa = Math.sin(a);
    const x = cx + ca * (rx * wv + 7.9), z = cz + sa * (rz * wv + 7.9);
    const ex = cx + ca * (rx * wv - 2.2), ez = cz + sa * (rz * wv - 2.2);
    add(x, z, Math.atan2(cx - x, cz - z), { x: ex, y: 0.06, z: ez, ry: Math.atan2(cx - ex, cz - ez) });
  }
  plots.forEach((p, i) => { if (i % 3 === 0) add(p.x - PW / 2 - 0.9, p.z - PD / 2 - 0.9, r() * 6, null); });   // 연밭 길 모퉁이
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.7 });
  instances(g, new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), iron, posts);
  instances(g, new THREE.BoxGeometry(0.05, 0.05, 0.75), iron, arms);
  // 청사초롱: 위는 청(靑), 아래는 홍(紅). 낮엔 비단색, 밤엔 속불이 비쳐 번진다
  const half = h => new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12).translate(0, h, 0);
  instances(g, half(0.13), glow(0x3a64c8, { day: 0.8, night: 2.4, pulse: 0.03, speed: 2.1 }), spots);
  instances(g, half(-0.13), glow(0xd2402e, { day: 0.8, night: 2.6, pulse: 0.03, speed: 2.1 }), spots);
  instances(g, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12).translate(0, 0.29, 0), iron, spots);
  instances(g, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12).translate(0, -0.29, 0), iron, spots);
  instances(g, new THREE.CircleGeometry(2.4, 20).rotateX(-Math.PI / 2), poolMat(0xff9a6a, 0.45), pools);
  const streak = new THREE.PlaneGeometry(0.6, 7).rotateX(-Math.PI / 2).translate(0, 0, 3.5);
  instances(g, streak, poolMat(0xff8a6a, 0.7, true), streaks);

  // 연화등: 못 위에 떠 있는 것과 연밭 길가에 놓인 것. 분홍·흰 연꽃 모양 등이 밤에 은은하게 빛난다
  const lot = [];
  for (let i = 0; i < 18; i++) {
    const a = r() * 6.28, q = 0.45 + r() * 0.4;
    const x = cx + Math.cos(a) * rx * q, z = cz + Math.sin(a) * rz * q;
    if (Math.abs(x - cx) < 2.5 && z < cz) continue;
    lot.push({ x, y: 0.12, z, s: 2.6, ry: r() * 6, c: r() < 0.7 ? 0xff9cc0 : 0xfff0e6 });
  }
  plots.forEach((p, i) => { if (i % 4 === 1) lot.push({ x: p.x + PW / 2 + 0.9, y: 0.1, z: p.z, s: 2.2, ry: r() * 6, c: i % 8 === 1 ? 0xfff0e6 : 0xff9cc0 }); });
  instances(g, LOTUS(), glow(0xffffff, { day: 0.85, night: 2.2, pulse: 0.08, speed: 0.7 }), lot);
}
// 가운데가 밝고 가장자리로 스러지는 덧셈 재질. lit(밤 정도)에 비례한다
function poolMat(color, k, streak = false) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLit = U.lit; sh.uniforms.uT = U.time;
    sh.vertexShader = 'varying vec2 vUv2;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = 'uniform float uLit;\nuniform float uT;\nvarying vec2 vUv2;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );',
      `vec2 q = vUv2 - 0.5;
      float f = ${streak ? "smoothstep(0.5, 0.0, abs(q.x)) * smoothstep(-0.5, 0.4, q.y) * (0.75 + 0.25 * sin(vUv2.y * 40.0 - uT * 2.0))" : "smoothstep(0.5, 0.0, length(q))"};
      vec4 diffuseColor = vec4(diffuse * f * f * ${k.toFixed(2)} * uLit, 1.0);`);
  };
  m.customProgramCacheKey = () => 'pool' + streak + k;
  return m;
}
