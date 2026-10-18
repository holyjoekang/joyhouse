import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats } from './materials.js';

export function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 꼭짓점을 조금씩 흔들어 공·원기둥을 덜 기계적으로
function jitter(geo, amount, r) {
  const p = geo.attributes.position;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [(r() - 0.5) * amount, (r() - 0.5) * amount, (r() - 0.5) * amount]);
    const d = seen.get(key);
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

// 나무 한 그루 = 줄기 지오메트리 + 잎 지오메트리. 같은 모양을 InstancedMesh로 여러 번 심는다.
function pineShape(seed) {
  const r = rng(seed);
  const trunk = [], leaves = [];
  let x = 0, z = 0, y = 0, rad = 0.32;
  const lean = r() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {               // 굽은 줄기 다섯 마디
    const h = 1.5 + r() * 0.6, nx = x + Math.cos(lean) * (0.25 + r() * 0.3), nz = z + Math.sin(lean) * (0.2 + r() * 0.3);
    const seg = new THREE.CylinderGeometry(rad * 0.82, rad, h, 9, 1, true);
    const dx = nx - x, dz = nz - z, len = Math.hypot(dx, h, dz);
    seg.translate(0, h / 2, 0);
    seg.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, h, dz).normalize())));
    seg.scale(1, len / h, 1);
    seg.translate(x, y, z);
    trunk.push(seg);
    x = nx; z = nz; y += h; rad *= 0.82;
    if (i >= 2) {                              // 위쪽 마디마다 납작한 솔잎 층
      for (let k = 0; k < 2; k++) {
        const a = r() * Math.PI * 2, d = 0.6 + r() * 1.3;
        const s = 1.4 + r() * 1.1;
        const c = jitter(new THREE.IcosahedronGeometry(1, 2), 0.25, r);
        c.scale(s * 1.5, s * 0.45, s * 1.3);
        c.translate(x + Math.cos(a) * d, y + (r() - 0.3) * 0.6, z + Math.sin(a) * d);
        leaves.push(c);
      }
    }
  }
  const crown = jitter(new THREE.IcosahedronGeometry(1, 2), 0.3, r);
  crown.scale(2.6, 0.9, 2.4); crown.translate(x, y + 0.3, z);
  leaves.push(crown);
  return { trunk: mergeGeometries(trunk), leaves: mergeGeometries(leaves) };
}

function broadleafShape(seed) {
  const r = rng(seed);
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 4.2, 8);
  trunk.translate(0, 2.1, 0);
  const leaves = [];
  for (let k = 0; k < 7; k++) {
    const a = r() * Math.PI * 2, d = r() * 1.6, s = 1.3 + r() * 0.9;
    const c = jitter(new THREE.IcosahedronGeometry(1, 2), 0.3, r);
    c.scale(s, s * 0.85, s);
    c.translate(Math.cos(a) * d, 4.6 + r() * 1.8, Math.sin(a) * d);
    leaves.push(c);
  }
  return { trunk, leaves: mergeGeometries(leaves) };
}

const LEAF = {
  pine: new THREE.MeshStandardMaterial({ color: 0x2f4f2a, map: mats.leaf.map, roughness: 0.9 }),
  maple: new THREE.MeshStandardMaterial({ color: 0xc8401f, map: mats.leaf.map, roughness: 0.85 }),
  ginkgo: new THREE.MeshStandardMaterial({ color: 0xe8b830, map: mats.leaf.map, roughness: 0.85 }),
  zelkova: new THREE.MeshStandardMaterial({ color: 0x5f7f34, map: mats.leaf.map, roughness: 0.9 }),
};

// spots: [{x, z, s, kind}] → 종류별 InstancedMesh
export function plantTrees(scene, spots, blocks) {
  const kinds = {
    pine: [pineShape(11), pineShape(29)],
    maple: [broadleafShape(5)],
    ginkgo: [broadleafShape(17)],
    zelkova: [broadleafShape(41)],
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [kind, shapes] of Object.entries(kinds)) {
    shapes.forEach((shape, vi) => {
      const list = spots.filter((s, i) => s.kind === kind && i % shapes.length === vi);
      if (!list.length) return;
      const trunk = new THREE.InstancedMesh(shape.trunk, mats.bark, list.length);
      const leaves = new THREE.InstancedMesh(shape.leaves, LEAF[kind], list.length);
      list.forEach((s, i) => {
        q.setFromAxisAngle(up, s.rot || 0);
        m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
        trunk.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
        blocks.push({ x0: s.x - 0.45, x1: s.x + 0.45, z0: s.z - 0.45, z1: s.z + 0.45 });
      });
      trunk.castShadow = leaves.castShadow = true;
      leaves.receiveShadow = true;
      scene.add(trunk, leaves);
    });
  }
}

// 바람에 흔들리는 풀잎. 꼭짓점 셰이더에서 시간과 자리마다 다르게 휜다.
export function grassField(scene, areas, count, avoid) {
  const blade = new THREE.BufferGeometry();
  const w = 0.045, h = 0.34;
  const verts = [-w, 0, 0, w, 0, 0, -w * 0.7, h * 0.4, 0, w * 0.7, h * 0.4, 0, -w * 0.35, h * 0.75, 0, w * 0.35, h * 0.75, 0, 0, h, 0];
  blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(7).fill([0, 1, 0]).flat(), 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.25 });
  const uTime = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 ip = instanceMatrix[3];
      float k = position.y / ${h.toFixed(2)};
      float sway = sin(uTime * 1.6 + ip.x * 0.31 + ip.z * 0.23) * 0.5 + sin(uTime * 3.1 + ip.x * 1.7) * 0.15;
      transformed.x += sway * 0.12 * k * k;
      transformed.z += sway * 0.06 * k * k;`);
  };
  const inst = new THREE.InstancedMesh(blade, mat, count);
  const r = rng(77), m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const total = areas.reduce((a, b) => a + (b.x1 - b.x0) * (b.z1 - b.z0), 0);
  let n = 0, tries = 0;
  while (n < count && tries++ < count * 3) {
    let t = r() * total, a = areas[0];
    for (const ar of areas) { const s = (ar.x1 - ar.x0) * (ar.z1 - ar.z0); if (t < s) { a = ar; break; } t -= s; }
    const x = a.x0 + r() * (a.x1 - a.x0), z = a.z0 + r() * (a.z1 - a.z0);
    if (avoid(x, z)) continue;
    q.setFromAxisAngle(up, r() * Math.PI);
    const s = 0.7 + r() * 0.8;
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + r() * 0.6), s));
    inst.setMatrixAt(n, m);
    inst.setColorAt(n, c.setHSL(0.21 + r() * 0.07, 0.5 + r() * 0.2, 0.1 + r() * 0.09));
    n++;
  }
  inst.count = n;
  inst.receiveShadow = true;
  inst.frustumCulled = false;
  scene.add(inst);
  return dt => { uTime.value += dt; };
}

// 회양목 생울타리
export function hedges(scene, rows, blocks) {
  const geos = rows.map(([x0, z0, x1, z1, h]) => {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
    const g = new RoundedBoxGeometry(w, h, d, 3, 0.35);
    g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    blocks.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), mats.hedge);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
}

// 꽃밭: 흙 둔덕 위에 색색 꽃송이
export function flowerBeds(scene, beds, seed = 3) {
  const r = rng(seed);
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 });
  const pts = [];
  for (const [x0, z0, x1, z1, palette] of beds) {
    const g = new THREE.Mesh(new RoundedBoxGeometry(Math.abs(x1 - x0), 0.25, Math.abs(z1 - z0), 2, 0.1), soil);
    g.position.set((x0 + x1) / 2, 0.06, (z0 + z1) / 2); g.receiveShadow = true;
    scene.add(g);
    const n = Math.round(Math.abs((x1 - x0) * (z1 - z0)) * 9);
    for (let i = 0; i < n; i++) pts.push([x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), palette[Math.floor(r() * palette.length)], r()]);
  }
  const leaf = new THREE.InstancedMesh(jitter(new THREE.IcosahedronGeometry(0.16, 1), 0.04, r), mats.hedge, pts.length);
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.075, 1), new THREE.MeshStandardMaterial({ roughness: 0.55 }), pts.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  pts.forEach(([x, z, col, k], i) => {
    m.makeScale(1, 0.8 + k * 0.6, 1).setPosition(x, 0.25 + k * 0.1, z); leaf.setMatrixAt(i, m);
    m.makeTranslation(x + (k - 0.5) * 0.06, 0.42 + k * 0.18, z); bloom.setMatrixAt(i, m);
    bloom.setColorAt(i, c.setHex(col));
  });
  leaf.receiveShadow = true;
  scene.add(leaf, bloom);
}

// 석등: 받침 · 팔각 기둥 · 불창(은은한 불빛) · 지붕돌
export function stoneLantern(scene, x, z, s = 1) {
  const g = new THREE.Group();
  const parts = [
    [new THREE.CylinderGeometry(0.42, 0.5, 0.3, 8), 0.15], [new THREE.CylinderGeometry(0.14, 0.17, 0.9, 8), 0.75],
    [new THREE.CylinderGeometry(0.38, 0.3, 0.16, 8), 1.28], [new THREE.CylinderGeometry(0.26, 0.26, 0.5, 8), 1.61],
    [new THREE.ConeGeometry(0.55, 0.4, 8), 2.06], [new THREE.SphereGeometry(0.11, 8, 6), 2.33],
  ];
  parts.forEach(([geo, y]) => { const p = new THREE.Mesh(geo, mats.stone); p.position.y = y; p.castShadow = true; g.add(p); });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  glow.position.y = 1.61; g.add(glow);
  g.position.set(x, 0, z); g.scale.setScalar(s);
  scene.add(g);
  return g;
}

// 배산임수: 집 뒤와 옆을 두르는 먼 산. 안개가 산을 푸르게 지운다.
export function mountains(scene) {
  const segs = 160, pos = [], idx = [];
  const r = rng(91);
  const peaks = Array.from({ length: 9 }, () => [r() * Math.PI * 2, 30 + r() * 70, 0.15 + r() * 0.35]);
  for (let i = 0; i <= segs; i++) {
    const a = i / segs * Math.PI * 2;
    let h = 18;
    for (const [pa, ph, pw] of peaks) { const d = Math.atan2(Math.sin(a - pa), Math.cos(a - pa)); h += ph * Math.exp(-(d * d) / (pw * pw)); }
    h += Math.sin(a * 23) * 4 + Math.sin(a * 57) * 2;
    if (Math.sin(a) > 0.5) h *= 0.35;                       // 남쪽(정문 쪽)은 낮게 트인다
    const R = 520;
    pos.push(Math.cos(a) * (R - 90), -2, Math.sin(a) * (R - 90) - 60, Math.cos(a) * R, h, Math.sin(a) * R - 60);   // 안쪽 산자락 → 바깥 능선
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x55704c, roughness: 1, side: THREE.DoubleSide }));
  scene.add(mesh);
}
