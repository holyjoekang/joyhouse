import * as THREE from 'three';
import { glow, body, instances, tuft, moss, motes, glowPath, matrixOf, rng } from './kit.js';

// C안 · 빛의 숲: 줄무늬로 빛나는 우산나무 아래 푸른 버섯 군락, 다가가면 몸을 말아 숨는
// 나선 꽃(헬리코라디언), 발밑에서 번지는 이끼, 땅에서 피어오르는 푸른 포자.
function frondGeo() {   // 늘어진 잎 한 장: 잎자루 y 0 → 잎끝 1, 끝으로 갈수록 +z로 처진다
  const pos = [], idx = [], N = 10;
  for (let i = 0; i <= N; i++) {
    const t = i / N, w = 0.16 * Math.sin(Math.PI * Math.min(1, t ** 0.7 * 1.02)) + 0.01;
    pos.push(-w, t, 0.4 * t * t, 0, t, 0.4 * t * t - 0.03, w, t, 0.4 * t * t);
    if (i) { const k = (i - 1) * 3; idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function spiralGeo() {   // 나선 지느러미: 아래 0 → 위 1, 위로 갈수록 좁아진다
  const pos = [], idx = [], N = 90;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t * Math.PI * 7, R = 0.08 + 0.55 * (1 - t) ** 0.8;
    pos.push(Math.cos(a) * 0.04, t, Math.sin(a) * 0.04, Math.cos(a) * R, t + 0.03, Math.sin(a) * R);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function build(g, { cx, cz, entry }, { blocks }) {
  const r = rng(88);
  const bark = body(0x22283a, { flatShading: true });
  const stripe = glow(0x3fa8ff, { tip: 0xb06bff, day: 0.45, night: 2.5, pulse: 0.5, speed: 0.7 });
  const free = (x, z) => Math.abs(x - entry[0]) > 2.5 || z > cz + 10;

  // 우산나무: 휘어 오른 줄기 + 줄기를 감는 빛 줄무늬 + 사방으로 늘어진 잎(잎끝이 빛난다)
  const fronds = [];
  const trees = [];
  for (let i = 0; i < 60 && trees.length < 16; i++) {
    const x = cx + (r() - 0.5) * 64, z = cz + (r() - 0.5) * 108;
    if (!free(x, z) || trees.some(t => Math.hypot(t.x - x, t.z - z) < 13)) continue;
    trees.push({ x, z, h: 11 + r() * 9, lean: r() * 6 });
  }
  for (const t of trees) {
    const top = new THREE.Vector3(t.x + Math.cos(t.lean) * 2, t.h, t.z + Math.sin(t.lean) * 2);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(t.x, 0, t.z), new THREE.Vector3(t.x - Math.cos(t.lean), t.h * 0.45, t.z - Math.sin(t.lean)), top]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.75, 8), bark); trunk.castShadow = true; g.add(trunk);
    const pts = [];
    for (let i = 0; i <= 60; i++) { const s = i / 60, p = curve.getPoint(s), a = s * 22; pts.push(new THREE.Vector3(p.x + Math.cos(a) * 0.74, p.y, p.z + Math.sin(a) * 0.74)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.06, 4), stripe));
    const R = 4.5 + t.h * 0.25;
    for (let k = 0; k < 16; k++) {
      const len = R * (0.75 + r() * 0.4);
      fronds.push({ x: top.x, y: top.y - 0.2, z: top.z, sx: len * 1.6, sy: len, sz: len, rx: 0.9 + r() * 0.5, ry: k / 16 * Math.PI * 2 + r() * 0.3, order: 'YXZ' });
    }
    blocks.push({ x0: t.x - 0.9, x1: t.x + 0.9, z0: t.z - 0.9, z1: t.z + 0.9 });
  }

  instances(g, frondGeo(), glow(0x0e3f48, { tip: 0x6ff6ff, day: 1.1, night: 1.3, pulse: 0.35, speed: 0.6, sway: 0.25 }), fronds);

  // 버섯: 작은 무리 + 사람 키를 넘는 큰 버섯 몇
  const caps = [], stems = [];
  const shroom = (x, z, s) => {
    stems.push({ x, z, sx: s * 0.18, sz: s * 0.18, sy: s, rz: (r() - 0.5) * 0.2 });
    caps.push({ x, y: s, z, sx: s * 0.7, sy: s * 0.35, sz: s * 0.7, c: [0x4fa3ff, 0x9a6bff, 0x3fe7ff, 0xff6fd8][Math.floor(r() * 4)] });
  };
  for (let k = 0; k < 40; k++) {
    const x0 = cx + (r() - 0.5) * 66, z0 = cz + (r() - 0.5) * 112;
    if (!free(x0, z0)) continue;
    for (let i = 0; i < 6 + r() * 8; i++) shroom(x0 + (r() - 0.5) * 3, z0 + (r() - 0.5) * 3, 0.2 + r() * r() * 0.8);
  }
  for (let k = 0; k < 7; k++) {
    const x = cx + (r() - 0.5) * 50, z = cz + (r() - 0.5) * 90;
    if (!free(x, z)) continue;
    shroom(x, z, 2.5 + r() * 2);
    blocks.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6 });
  }
  instances(g, new THREE.CylinderGeometry(1, 1.2, 1, 8).translate(0, 0.5, 0), glow(0xdff4ff, { tip: 0xa6d8ff, day: 0.6, night: 1.4, pulse: 0.2 }), stems);
  instances(g, new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow(0xffffff, { day: 0.55, night: 2.4, pulse: 0.45, speed: 1.4 }), caps);

  // 헬리코라디언: 다가가면 휙 말려 들어갔다가 천천히 다시 핀다
  const spirals = [];
  for (let i = 0; i < 400 && spirals.length < 110; i++) {
    const x = cx + (r() - 0.5) * 66, z = cz + (r() - 0.5) * 112;
    if (!free(x, z)) continue;
    spirals.push({ x, z, h: 2.2 + r() * 2.6, w: 1 + r() * 0.8, ry: r() * 6, k: 1 });
  }
  const heli = instances(g, spiralGeo(), glow(0xff9a3c, { tip: 0xffe36b, day: 0.65, night: 2.3, pulse: 0.3, speed: 1.0, sway: 0.15 }),
    spirals.map(s => ({ x: s.x, z: s.z, sx: s.w, sy: s.h, sz: s.w, ry: s.ry })));
  heli.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // 빛 풀
  const grass = [];
  for (let i = 0; i < 1800; i++) {
    const x = cx + (r() - 0.5) * 70, z = cz + (r() - 0.5) * 118;
    if (free(x, z)) grass.push({ x, z, s: 0.4 + r() * 0.9, ry: r() * 6 });
  }
  instances(g, tuft(5, 0.035), glow(0x2a7cff, { tip: 0x6ff7c8, day: 0.5, night: 1.7, pulse: 0.3, sway: 0.15 }), grass);

  moss(g, { x: cx, z: cz, r: 42, colors: ['#3fa8ff', '#5ff2ff', '#9a6bff', '#7dffb0'], step: 0x8fd8ff, seed: 19, repeat: 12 });
  glowPath(g, [entry, [entry[0], entry[1] + 16], [cx + 8, cz - 10], [cx - 6, cz + 12], [cx + 2, cz + 40]], glow(0xbfe6ff, { day: 0.8, night: 1.8, pulse: 0.2 }));
  motes(g, { count: 600, x: cx, z: cz, r: 40, y0: 0, y1: 16, color: 0x7fd4ff, size: 0.3, rise: 0.45, wander: 1.2, seed: 41, day: 0.15 });
  motes(g, { count: 160, x: cx, z: cz, r: 30, y0: 1, y1: 6, color: 0xc9a2ff, size: 0.55, wander: 3, seed: 42, day: 0 });

  return {
    update(dt, t, view) {
      let dirty = false;
      spirals.forEach((s, i) => {
        const near = Math.hypot(s.x - view.x, s.z - view.z) < 3.4;
        const goal = near ? 0.06 : 1, k = s.k + (goal - s.k) * Math.min(1, dt * (near ? 9 : 0.7));
        if (Math.abs(k - s.k) < 1e-4) return;
        s.k = k; dirty = true;
        heli.setMatrixAt(i, matrixOf({ x: s.x, z: s.z, sx: s.w * (0.4 + 0.6 * k), sy: s.h * k, sz: s.w * (0.4 + 0.6 * k), ry: s.ry + (1 - k) * 4 }));
      });
      if (dirty) heli.instanceMatrix.needsUpdate = true;
    },
  };
}
