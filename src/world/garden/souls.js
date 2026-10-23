import * as THREE from 'three';
import { glow, body, instances, strand, tuft, moss, motes, glowPath, rng } from './kit.js';

// A안 · 영혼의 나무: 가운데 거대한 버드나무에 분홍·보랏빛 덩굴이 땅까지 드리우고,
// 하얀 씨앗 정령(아토키리나)이 둘레를 떠다닌다. 뿌리 고리와 이끼가 밤에 숨쉬듯 빛난다.
export function build(g, { cx, cz, entry }, { blocks }) {
  const r = rng(71);
  const bark = body(0x3b2d3d, { flatShading: true });

  // 줄기: 비틀린 원기둥
  const trunkGeo = new THREE.CylinderGeometry(1.5, 3.4, 17, 20, 16);
  const p = trunkGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 8.5, a = y * 0.09, x = p.getX(i), z = p.getZ(i), b = 1 + 0.12 * Math.sin(y * 0.8 + Math.atan2(z, x) * 5);
    p.setXYZ(i, (x * Math.cos(a) - z * Math.sin(a)) * b, p.getY(i), (x * Math.sin(a) + z * Math.cos(a)) * b);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeo, bark);
  trunk.position.set(cx, 8.5, cz); trunk.castShadow = true;
  g.add(trunk);
  blocks.push({ x0: cx - 3.4, x1: cx + 3.4, z0: cz - 3.4, z1: cz + 3.4 });

  const veinMat = glow(0xff6fd8, { tip: 0xa98bff, day: 0.5, night: 2.6, pulse: 0.45, speed: 0.9 });
  // 줄기를 감아 오르는 빛줄기
  for (let k = 0; k < 4; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = k * Math.PI / 2 + t * 5.5, rad = 3.3 - t * 1.8; pts.push(new THREE.Vector3(cx + Math.cos(a) * rad, t * 16, cz + Math.sin(a) * rad)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.07, 5), veinMat));
  }

  // 뿌리: 땅 위로 드러나 굽이치는 굵은 뿌리 + 빛나는 뿌리 고리
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + r() * 0.3, len = 7 + r() * 6;
    const curve = new THREE.CatmullRomCurve3([0, 0.35, 0.7, 1].map(t => new THREE.Vector3(cx + Math.cos(a + t * 0.5) * (2.6 + t * len), 1.4 * (1 - t) ** 2 + 0.1, cz + Math.sin(a + t * 0.5) * (2.6 + t * len))));
    const root = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.55, 6), bark);
    root.castShadow = true; g.add(root);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.06, 4).translate(0, 0.5, 0), veinMat));
  }
  const ringMat = glow(0xd56bff, { tip: 0x6fe9ff, day: 0.35, night: 2.2, pulse: 0.5, speed: 0.6 });
  for (const [rad, arc] of [[6, 4.6], [9.5, 5.2], [13.5, 5.6], [18, 4.2]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.08, 4, 120, arc), ringMat);
    ring.rotation.set(-Math.PI / 2, 0, r() * 6); ring.position.set(cx, 0.1, cz); g.add(ring);
  }

  // 가지: 줄기 꼭대기에서 사방으로 뻗어 아래로 휜다. 가지마다 덩굴을 드리운다.
  const hang = [];
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2 + r() * 0.25, reach = 13 + r() * 6, top = 15.5 + r() * 2;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cx + Math.cos(a) * 1.2, top - 1, cz + Math.sin(a) * 1.2),
      new THREE.Vector3(cx + Math.cos(a) * reach * 0.55, top + 4 + r() * 2, cz + Math.sin(a) * reach * 0.55),
      new THREE.Vector3(cx + Math.cos(a) * reach, top - 4 - r() * 2, cz + Math.sin(a) * reach));
    const br = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.45, 6), bark);
    br.castShadow = true; g.add(br);
    for (let i = 0; i < 70; i++) {
      const t = 0.15 + r() * 0.85, q = curve.getPoint(t), len = Math.max(1.5, q.y - 0.4 - r() * r() * 6);
      hang.push({ x: q.x + (r() - 0.5) * 1.6, y: q.y, z: q.z + (r() - 0.5) * 1.6, sx: 1, sz: 1, sy: len });
    }
  }
  instances(g, strand(0.045, 0.018), glow(0xff7ad9, { tip: 0x8a7bff, day: 0.55, night: 2.4, pulse: 0.35, speed: 0.7, sway: 0.7, hang: true }), hang);

  // 둘레의 빛 고사리와 꽃봉오리
  const ferns = [], buds = [];
  for (let i = 0; i < 1400; i++) {
    const a = r() * Math.PI * 2, d = 18 + r() * 18, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (Math.abs(x - entry[0]) < 2.2 && z < cz) continue;   // 들어오는 길은 틔운다
    ferns.push({ x, z, s: 0.5 + r() * 1.1, ry: r() * 6 });
  }
  instances(g, tuft(7, 0.045), glow(0x4fd6c8, { tip: 0xc6ff9a, day: 0.5, night: 1.7, pulse: 0.3, sway: 0.18 }), ferns);
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 26;
    buds.push({ x: cx + Math.cos(a) * d, y: 0.5 + r() * 0.6, z: cz + Math.sin(a) * d, s: 0.09 + r() * 0.12, sy: 1.4, c: r() < 0.6 ? 0xff9be6 : 0xb79bff });
  }
  instances(g, new THREE.SphereGeometry(1, 10, 8), glow(0xffffff, { day: 0.7, night: 3, pulse: 0.6, speed: 1.7 }), buds);

  moss(g, { x: cx, z: cz, r: 36, colors: ['#ff6fd8', '#b07bff', '#6fe9ff', '#7a5cff'], step: 0xff9de6, seed: 13 });
  glowPath(g, [entry, [entry[0], entry[1] + 14], [cx - 6, cz - 22], [cx - 3, cz - 8]], glow(0xe9d8ff, { day: 0.8, night: 1.8, pulse: 0.2 }));
  motes(g, { count: 520, x: cx, z: cz, r: 26, y0: 1, y1: 15, color: 0xeafcff, size: 0.42, wander: 2.2, seed: 21, day: 0.35 });
  motes(g, { count: 260, x: cx, z: cz, r: 34, y0: 0.2, y1: 3, color: 0xff8be0, size: 0.18, rise: 0.25, wander: 0.8, seed: 22, day: 0 });
  return { update() {} };
}
