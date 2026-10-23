import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glow, body, instances, tuft, moss, motes, glowPath, rng } from './kit.js';

// D안 · 슈퍼트리 그로브(싱가포르 가든스 바이 더 베이): 16~34m 철골 나무 열한 그루.
// 줄기는 수직 정원, 꼭대기는 나팔처럼 벌어진 격자 우산. 큰 두 그루를 하늘길(OCBC 스카이웨이)이 잇고,
// 밤이면 격자에 불이 들어와 색이 바뀌는 빛의 쇼(가든 랩소디)를 한다.
const TREES = [
  [0, 3, 34], [-12, 19, 30], [13, 19, 31],
  [-19, -19, 22], [19, -17, 20], [-27, 6, 18], [28, 6, 19], [-21, 39, 24], [21, 41, 22], [0, 46, 26], [-7, -31, 16],
];
const SHOW = [[0xb04dff, 0xff4fb8], [0x2f8bff, 0x4ff2ff], [0x4dff7a, 0xffd84d], null];   // null = 무지개
const STEEL = new THREE.Color(0x7a6670);

function tube(pts, r) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 4); }

// 우산 격자 한 단위: 반지름 1, 높이 1. 갈비살 + 엇갈린 사선 + 고리
function canopyGeo() {
  const parts = [], N = 22, rad = t => 0.14 + 0.86 * t ** 1.7;
  for (let i = 0; i < N; i++) for (const twist of [0, 0.45, -0.45]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8, a = i / N * Math.PI * 2 + twist * t; pts.push(new THREE.Vector3(Math.cos(a) * rad(t), t, Math.sin(a) * rad(t))); }
    parts.push(tube(pts, twist ? 0.007 : 0.012));
  }
  for (const t of [0.35, 0.62, 0.84, 1]) parts.push(new THREE.TorusGeometry(rad(t), t === 1 ? 0.02 : 0.009, 4, 64).rotateX(Math.PI / 2).translate(0, t, 0));
  return mergeGeometries(parts.map(p => p.deleteAttribute('uv') && p.deleteAttribute('normal') && p));
}
// 줄기를 감는 철골: 반지름 1(아래) → 0.55(위), 높이 1
function trunkLatticeGeo() {
  const parts = [];
  for (let i = 0; i < 10; i++) for (const s of [1, -1]) {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const t = k / 16, a = i / 10 * Math.PI * 2 + s * t * 2.2, r = 1.06 - 0.47 * t; pts.push(new THREE.Vector3(Math.cos(a) * r, t, Math.sin(a) * r)); }
    parts.push(tube(pts, 0.025));
  }
  return mergeGeometries(parts.map(p => p.deleteAttribute('uv') && p.deleteAttribute('normal') && p));
}

export function build(g, { cx, cz, entry }, { blocks }) {
  const r = rng(64);
  const trees = TREES.map(([dx, dz, H]) => ({ x: cx + dx, z: cz + dz, H, base: 1 + H * 0.045, R: H * 0.3, top: H * 0.68 }));

  // 줄기(콘크리트 심) + 화단 받침
  const concrete = body(0x6e6a72, { flatShading: true });
  instances(g, new THREE.CylinderGeometry(0.55, 1, 1, 14).translate(0, 0.5, 0), concrete,
    trees.map(t => ({ x: t.x, z: t.z, sx: t.base, sy: t.top, sz: t.base }))).castShadow = true;
  instances(g, new THREE.CylinderGeometry(1, 1.08, 0.6, 24), body(0x5a5450),
    trees.map(t => ({ x: t.x, y: 0.3, z: t.z, sx: t.base * 2.3, sz: t.base * 2.3 })));
  for (const t of trees) { const b = t.base * 2.1; blocks.push({ x0: t.x - b, x1: t.x + b, z0: t.z - b, z1: t.z + b }); }

  // 격자: 나무마다 한 인스턴스. 색은 update()가 쇼에 맞춰 바꾼다
  const latMat = glow(0xffffff, { day: 1, night: 2.4, pulse: 0.15, speed: 2 });
  const canopy = instances(g, canopyGeo(), latMat, trees.map(t => ({ x: t.x, y: t.top, z: t.z, sx: t.R, sy: t.H - t.top, sz: t.R, c: STEEL })));
  const lattice = instances(g, trunkLatticeGeo(), latMat, trees.map(t => ({ x: t.x, z: t.z, sx: t.base, sy: t.top, sz: t.base, c: STEEL })));

  // 수직 정원: 줄기 겉에 붙은 풀포기와 꽃
  const plants = [], blooms = [];
  for (const t of trees) for (let i = 0; i < t.H * 5; i++) {
    const y = 1 + r() * (t.top - 1.5), a = r() * Math.PI * 2, rr = t.base * (1.05 - 0.45 * y / t.top);
    const spot = { x: t.x + Math.cos(a) * rr, y, z: t.z + Math.sin(a) * rr, s: 0.5 + r() * 0.7, rx: 1.1, ry: Math.PI / 2 - a, order: 'YXZ' };
    if (r() < 0.8) plants.push(spot);
    else blooms.push({ ...spot, s: 0.18 + r() * 0.15, c: [0xff5fa8, 0xffc04d, 0xc77dff][Math.floor(r() * 3)] });
  }
  instances(g, tuft(6, 0.06, 0.5), glow(0x3f9a4a, { tip: 0x9fe36b, day: 0.9, night: 0.9, pulse: 0.2, sway: 0.08 }), plants);
  instances(g, new THREE.IcosahedronGeometry(1, 1), glow(0xffffff, { day: 0.8, night: 1.8, pulse: 0.5, speed: 1.5 }), blooms);

  // 하늘길: 큰 두 그루를 잇는 휘어진 다리 + 빛 난간
  const [A, B] = [trees[1], trees[2]], hy = 18;
  const deck = new THREE.QuadraticBezierCurve3(new THREE.Vector3(A.x + 1.5, hy, A.z), new THREE.Vector3((A.x + B.x) / 2, hy - 1.2, (A.z + B.z) / 2 - 7), new THREE.Vector3(B.x - 1.5, hy, B.z));
  const dpts = deck.getSpacedPoints(40);
  instances(g, new THREE.BoxGeometry(1.9, 0.22, 1), body(0x8d8a90), dpts.slice(1).map((p, i) => {
    const q = dpts[i], dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z, l = Math.hypot(dx, dy, dz);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2, sz: l + 0.05, ry: Math.atan2(dx, dz), rx: -Math.atan2(dy, Math.hypot(dx, dz)), order: 'YXZ' };
  })).castShadow = true;
  const railMat = glow(0xd6f4ff, { day: 0.7, night: 2.2, pulse: 0.3, speed: 3 });
  for (const s of [-1, 1]) g.add(new THREE.Mesh(tube(dpts.map((p, i) => { const tg = deck.getTangentAt(i / 40); return new THREE.Vector3(p.x - tg.z * 0.8 * s, p.y + 1.1, p.z + tg.x * 0.8 * s); }), 0.035), railMat));

  // 광장 바닥: 이끼 + 디딤길 + 반딧불
  moss(g, { x: cx, z: cz + 8, r: 46, colors: ['#b04dff', '#2f8bff', '#4ff2ff', '#ff4fb8'], step: 0xd9b8ff, seed: 29, repeat: 12 });
  glowPath(g, [entry, [entry[0], entry[1] + 18], [cx - 5, cz - 12], [cx - 6, cz + 10], [cx, cz + 30]], glow(0xc9b8ff, { day: 0.8, night: 0.9, pulse: 0.2 }));
  motes(g, { count: 360, x: cx, z: cz + 8, r: 40, y0: 0.5, y1: 20, color: 0xfff1c9, size: 0.3, wander: 2.5, seed: 61, day: 0 });

  const c = new THREE.Color(), c2 = new THREE.Color(), show = (mode, i, t) => {
    const p = SHOW[mode];
    if (!p) return c2.setHSL((t * 0.06 + i / trees.length) % 1, 0.9, 0.55);
    return c2.set(p[0]).lerp(c.set(p[1]), 0.5 + 0.5 * Math.sin(t * 0.9 + i * 0.8));
  };
  const out = new THREE.Color(), prev = new THREE.Color();
  return {
    update(dt, t) {
      const lit = Math.min(1, (g.parent?.userData.lit ?? 0) * 1.2), seg = 14, mode = Math.floor(t / seg) % SHOW.length, f = Math.min(1, (t % seg) / 2.5);
      trees.forEach((_, i) => {
        prev.copy(show((mode + SHOW.length - 1) % SHOW.length, i, t));
        out.copy(prev).lerp(show(mode, i, t), f);
        out.multiplyScalar(0.8 + 0.25 * Math.sin(t * 2.4 + i * 1.3));   // 음악에 맞춰 숨쉬듯
        out.lerpColors(STEEL, out, lit);
        canopy.setColorAt(i, out); lattice.setColorAt(i, out);
      });
      canopy.instanceColor.needsUpdate = lattice.instanceColor.needsUpdate = true;
    },
  };
}
