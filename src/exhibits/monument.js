import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane } from '../ui3d/text.js';

// 명예의 전당: 그랜드 홀 한가운데의 기념 조각상.
// 바닥 인레이 → 검은 대리석 3단 기단 → 팔각 받침(면마다 커리어 동판) → 월계관을 든 금빛 입상.
const std = o => new THREE.MeshStandardMaterial(o);
const M = {
  black: std({ color: 0x15171a, roughness: 0.18, metalness: 0.2 }),
  green: std({ color: 0x1d3b31, roughness: 0.2, metalness: 0.15 }),
  white: mats.column,
  gilt: std({ color: 0xe0b45a, roughness: 0.22, metalness: 1, emissive: 0x2a1a04, emissiveIntensity: 0.35 }),
  bronze: std({ color: 0x6b4a2a, roughness: 0.35, metalness: 0.9 }),
  velvet: std({ color: 0x6e0f1c, roughness: 0.85 }),
};
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const oct = (r0, r1, h) => new THREE.CylinderGeometry(r1, r0, h, 8, 1).rotateY(Math.PI / 8);

const PLINTH = 1.0, PLINTH_H = 1.25;   // 팔각 받침 외접 반지름·높이
const BASE = 0.9;                       // 기단 윗면 높이

function inlay(g) {
  for (const [r0, r1, mat, y] of [[2.9, 3.05, M.gilt, 0.012], [2.2, 2.9, M.green, 0.01], [2.1, 2.2, M.gilt, 0.012], [0, 2.1, M.black, 0.008]]) {
    const ring = mesh(new THREE.RingGeometry(r0, r1, 96), mat, 0, y, 0);
    ring.rotation.x = -Math.PI / 2; g.add(ring);
  }
  for (let i = 0; i < 16; i++) {                                   // 나침반 별 무늬
    const a = i / 16 * Math.PI * 2, s = i % 2 ? 0.25 : 0.45;
    const ray = mesh(new THREE.PlaneGeometry(0.07, s), M.gilt, Math.sin(a) * (2.5), 0.014, Math.cos(a) * 2.5);
    ray.rotation.set(-Math.PI / 2, 0, -a); g.add(ray);
  }
}

function base(g) {
  let y = 0;
  for (const [r, h, mat] of [[2.0, 0.3, M.black], [1.65, 0.3, M.green], [1.35, 0.3, M.black]]) {
    g.add(mesh(oct(r, r, h), mat, 0, y + h / 2, 0));
    g.add(mesh(oct(r + 0.02, r + 0.02, 0.035), M.gilt, 0, y + h - 0.017, 0));   // 단마다 금 띠
    y += h;
  }
  const top = BASE + PLINTH_H;
  g.add(mesh(oct(PLINTH, PLINTH, PLINTH_H), M.black, 0, BASE + PLINTH_H / 2, 0));
  g.add(mesh(oct(PLINTH + 0.08, PLINTH + 0.08, 0.12), M.gilt, 0, BASE + 0.06, 0));
  g.add(mesh(oct(PLINTH + 0.1, PLINTH + 0.1, 0.14), M.gilt, 0, top + 0.07, 0));
  g.add(mesh(oct(PLINTH * 0.75, PLINTH * 0.8, 0.12), M.white, 0, top + 0.2, 0));
  return top + 0.26;
}

// 동판: 팔각 받침의 면 하나에 붙인다 (i=0 이 정면 남쪽)
function plaque(g, i, lines, w = 0.62) {
  const card = textPlane({ width: 620, padding: 34, bg: '#3a2a16', fg: '#f3dfa8', border: '#e0b45a', radius: 10, align: 'center', lines }, w, { lit: true });
  const apothem = PLINTH * Math.cos(Math.PI / 8) + 0.012, a = i / 8 * Math.PI * 2;
  card.position.set(Math.sin(a) * apothem, BASE + PLINTH_H / 2, Math.cos(a) * apothem);
  card.rotation.y = a;
  g.add(card);
}

// 금빛 입상: 옷자락은 회전체, 한 팔로 월계관을 높이 든다
function statue(g, y0) {
  const robe = new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.4, 0.15], [0.3, 0.7], [0.24, 1.15], [0.27, 1.45], [0.2, 1.62], [0.09, 1.7], [0, 1.72]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
  const fig = new THREE.Group(); fig.position.y = y0; g.add(fig);
  fig.add(mesh(robe, M.gilt));
  fig.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16), M.gilt, 0, 1.76, 0));
  fig.add(mesh(new THREE.SphereGeometry(0.15, 32, 24), M.gilt, 0, 1.94, 0.01));
  const arm = (side, rx, rz, len) => {
    const a = mesh(new THREE.CylinderGeometry(0.045, 0.06, len, 12), M.gilt);
    a.geometry.translate(0, len / 2, 0); a.position.set(side * 0.22, 1.52, 0); a.rotation.set(rx, 0, rz); fig.add(a); return a;
  };
  arm(1, 0, -0.35, 0.95);                     // 오른팔: 하늘로
  arm(-1, 0.35, 2.7, 0.6);                    // 왼팔: 가슴께로 내려 책을 안는다
  const book = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.07), M.gilt, -0.16, 1.18, 0.2); book.rotation.z = 0.3; fig.add(book);
  const wreath = new THREE.Group(); wreath.position.set(0.55, 2.42, 0); fig.add(wreath);
  wreath.add(mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 40), M.gilt));
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2, leaf = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.gilt, Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0);
    leaf.scale.set(1.6, 0.7, 0.6); leaf.rotation.z = a + Math.PI / 2; wreath.add(leaf);
  }
  wreath.userData.tick = (dt, t) => { wreath.rotation.y = Math.sin(t * 0.6) * 0.25; };
  // 머리 위 후광
  const halo = mesh(new THREE.TorusGeometry(0.26, 0.012, 8, 48), M.gilt, 0, 1.98, -0.12); fig.add(halo);
  return y0 + 2.6;
}

// 차단봉 7개와 붉은 벨벳 줄 (정면 남쪽은 열어 둔다)
function ropes(g) {
  const R = 2.55, posts = [];
  for (let i = 1; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.sin(a) * R, z = Math.cos(a) * R;
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24), M.gilt, x, 0.02, z));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 12), M.gilt, x, 0.5, z));
    g.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), M.gilt, x, 1.0, z));
    posts.push(new THREE.Vector3(x, 0.92, z));
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const [p, q] = [posts[i], posts[i + 1]], mid = p.clone().lerp(q, 0.5); mid.y -= 0.22;
    g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p, mid, q), 20, 0.025, 8), M.velvet));
  }
}

export function makeMonument(item, eras = []) {
  const g = new THREE.Group();
  inlay(g);
  const top = base(g);
  const head = statue(g, top);
  ropes(g);

  plaque(g, 0, [
    { text: 'HALL OF FAME', size: 30, weight: 700, color: '#e0b45a', gap: 8 },
    { text: '명예의 전당', size: 62, weight: 700, font: 'serif', gap: 10 },
    { text: '삼성SDS 1996 – 2026', size: 34, gap: 6 },
    { text: '30년의 길', size: 34, color: '#d8c08a' }]);
  eras.slice(0, 7).forEach((e, k) => plaque(g, k + 1, [
    { text: `${e.start.slice(0, 4)} – ${e.end ? e.end.slice(0, 4) : '현재'}`, size: 34, color: '#e0b45a', gap: 10 },
    { text: e.name, size: 52, weight: 700, font: 'serif', gap: 10 },
    { text: e.role, size: 32, color: '#d8c08a' }]));

  // 조각상을 비추는 스포트라이트 (천장 높이 9m)
  const spot = new THREE.SpotLight(0xffe6b0, 60, 12, Math.PI / 9, 0.5, 1.2);
  spot.position.set(0, 8.6, 1.2); spot.target.position.set(0, top + 1, 0);
  g.add(spot, spot.target);
  const glow = new THREE.PointLight(0xffd890, 4, 4, 2); glow.position.set(0, head - 0.2, 1.0); g.add(glow);

  g.userData.footprint = [4.2, 4.2];
  g.userData.exhibit = {
    kind: 'monument', title: '명예의 전당 — 삼성SDS 30년',
    body: eras.map(e => `${e.start.slice(0, 7).replace('-', '.')} – ${e.end ? e.end.slice(0, 7).replace('-', '.') : '현재'}  ${e.name} · ${e.role}`).join('\n'),
    url: 'https://holyjoekang.github.io/joyhouse/gallery.html#career',
  };
  return g;
}
