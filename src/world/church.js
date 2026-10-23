import * as THREE from 'three';
import { mats, repeatFor } from './materials.js';
import { textPlane } from '../ui3d/text.js';

// 작은 벽돌 교회: 100년 된 안동 하회교회를 본뜬 1920년대 시골 예배당.
// 붉은 벽돌 박공 예배당 + 정면 종탑(종루·뾰족 지붕·십자가) + 아치 창. 밤엔 창에 불이 켜진다.
// 자리·이름·글은 content/house.json 의 church. 정면(종탑)이 북쪽 농장 길을 본다.
function brickTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, 256, 256);   // 줄눈
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 16; row++) for (let col = -1; col < 5; col++) {
    const x = col * 64 + (row % 2) * 32, y = row * 16, v = r();
    g.fillStyle = `rgb(${150 + v * 40 | 0},${62 + v * 22 | 0},${44 + v * 16 | 0})`;
    g.fillRect(x + 1.5, y + 1.5, 61, 13);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

const box = (w, h, d, mat, x, y, z, parent) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m);
  return m;
};

// 아치 창: 창틀(벽돌 아치) + 유리(밤에 켜지는 등 유리). 벽 바깥면(nx, nz)을 본다.
function archWindow(g, glass, trimMat, x, y, z, yaw, w = 0.9, h = 1.7) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h - w / 2);
  shape.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); shape.lineTo(-w / 2, 0);
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), glass);
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12).scale(1.25, 1.12, 1), trimMat);
  const win = new THREE.Group();
  frame.position.set(0, -0.08, -0.01); win.add(frame, pane);
  for (const k of [-0.25, 0.25]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.02), mats.darkWood); bar.position.set(k * w * 0.9, h / 2, 0.01); win.add(bar); }
  win.position.set(x, y, z); win.rotation.y = yaw;
  g.add(win);
}

export function buildChurch(scene, spec, { blocks, clickables, lights }) {
  const { x: cx, z: fz } = spec;               // fz = 종탑 앞면(북쪽)
  const W = 8, D = 13, H = 4.6, T = 3.6, TH = 9.5;   // 예배당 폭·깊이·처마 높이, 종탑 폭·높이
  const g = new THREE.Group();
  const brickMap = brickTexture();
  const brick = (rx, ry) => { const m = new THREE.MeshStandardMaterial({ map: brickMap.clone(), roughness: 0.92 }); m.map.repeat.set(rx, ry); m.map.needsUpdate = true; return m; };
  const trim = new THREE.MeshStandardMaterial({ color: 0x8e3b2a, roughness: 0.9 });   // 진한 벽돌 테두리
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3d4652, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });   // 함석 지붕
  const white = new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.6 });
  const nz0 = fz + T, nz1 = nz0 + D, ncz = (nz0 + nz1) / 2;   // 예배당은 종탑 남쪽

  // 기단 + 예배당 벽
  box(W + 0.8, 0.45, D + T + 0.8, mats.stone, cx, 0.22, (fz + nz1) / 2, g);
  box(W, H, D, brick(W / 1.6, H / 0.8), cx, 0.45 + H / 2, ncz, g);
  // 박공 지붕(함석) + 박공 벽
  const pitch = 0.62, half = W / 2 + 0.5, slope = half / Math.cos(pitch);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.12, D + 1.0), roofMat);
    p.position.set(cx + s * half / 2, 0.45 + H + Math.tan(pitch) * half / 2 + 0.05, ncz);
    p.rotation.z = -s * pitch; p.castShadow = true; g.add(p);
  }
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * W / 2)]);
  for (const z of [nz0 + 0.01, nz1 - 0.01]) {
    const gable = new THREE.Mesh(new THREE.ShapeGeometry(tri), brick(W / 1.6, 2));
    gable.position.set(cx, 0.45 + H, z); gable.rotation.y = z < ncz ? Math.PI : 0; g.add(gable);
  }
  // 처마 아래 벽돌 띠, 모서리 기둥
  box(W + 0.12, 0.22, D + 0.12, trim, cx, 0.45 + H - 0.2, ncz, g);
  for (const sx of [-1, 1]) for (const z of [nz0, nz1]) box(0.5, H, 0.5, trim, cx + sx * W / 2, 0.45 + H / 2, z, g);

  // 아치 창: 양옆 넷씩, 뒷벽 둘. 밤엔 lights.glass 가 켜진다
  for (let i = 0; i < 4; i++) {
    const z = nz0 + 2 + i * (D - 4) / 3;
    archWindow(g, lights.glass, trim, cx - W / 2 - 0.02, 1.6, z, -Math.PI / 2);
    archWindow(g, lights.glass, trim, cx + W / 2 + 0.02, 1.6, z, Math.PI / 2);
  }
  for (const dx of [-1.6, 1.6]) archWindow(g, lights.glass, trim, cx + dx, 1.6, nz1 + 0.02, 0);

  // 종탑: 사각 벽돌 탑 + 종루(사방 아치 구멍) + 뾰족 지붕 + 십자가
  const tz = fz + T / 2;
  box(T, TH - 2.6, T, brick(T / 1.6, (TH - 2.6) / 0.8), cx, 0.45 + (TH - 2.6) / 2, tz, g);
  const belfryY = 0.45 + TH - 2.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.55, 2.2, 0.55, trim, cx + sx * (T / 2 - 0.27), belfryY + 1.1, tz + sz * (T / 2 - 0.27), g);
  box(T + 0.3, 0.3, T + 0.3, trim, cx, belfryY + 2.35, tz, g);
  box(T + 0.2, 0.18, T + 0.2, white, cx, belfryY - 0.05, tz, g);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 0.8, 16, 1, true), mats.brass);
  bell.material.side = THREE.DoubleSide;
  bell.position.set(cx, belfryY + 1.3, tz); g.add(bell);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(T * 0.78, 4.2, 4), roofMat);
  spire.rotation.y = Math.PI / 4; spire.position.set(cx, belfryY + 2.5 + 2.1, tz); spire.castShadow = true; g.add(spire);
  const crossY = belfryY + 2.5 + 4.2;
  box(0.14, 1.6, 0.14, white, cx, crossY + 0.75, tz, g);
  box(0.9, 0.14, 0.14, white, cx, crossY + 1.05, tz, g);

  // 정면: 아치 출입문(나무 두 짝) + 문 위 둥근 창 + 돌계단
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.85, 0); doorShape.lineTo(0.85, 0); doorShape.lineTo(0.85, 2.1); doorShape.absarc(0, 2.1, 0.85, 0, Math.PI, false); doorShape.lineTo(-0.85, 0);
  const door = new THREE.Mesh(new THREE.ShapeGeometry(doorShape, 16), mats.darkWood);
  door.position.set(cx, 0.45, fz - 0.02); door.rotation.y = Math.PI; g.add(door);
  const doorFrame = new THREE.Mesh(new THREE.ShapeGeometry(doorShape, 16).scale(1.2, 1.1, 1), trim);
  doorFrame.position.set(cx, 0.4, fz - 0.01); doorFrame.rotation.y = Math.PI; g.add(doorFrame);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), lights.glass);
  rose.position.set(cx, 0.45 + 4.4, fz - 0.02); rose.rotation.y = Math.PI; g.add(rose);
  const roseRim = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 24), white);
  roseRim.position.set(cx, 0.45 + 4.4, fz - 0.03); roseRim.rotation.y = Math.PI; g.add(roseRim);
  for (let i = 0; i < 3; i++) box(2.6 - i * 0.3, 0.15, 0.45, mats.stone, cx, 0.075 + i * 0.15, fz - 1.2 + i * 0.4, g);
  lights.add(cx, 2.9, fz - 0.6, 0, 0.8);   // 문 위 등
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), lights.glass);
  lamp.position.set(cx, 3.15, fz - 0.35); g.add(lamp);

  // 길: 농장 길(박석)에서 종탑 문까지 같은 박석 길
  const from = spec.pathFrom ?? 22.5, len = fz - 1.6 - from;
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, len), repeatFor(mats.path, 0.8, len / 3));
  walk.rotation.x = -Math.PI / 2; walk.position.set(cx, 0.025, from + len / 2);
  walk.receiveShadow = true; walk.userData.floor = 'outside';
  scene.add(walk);

  // 안내판(누르면 이야기와 신앙 쪽 연결)
  const sign = textPlane({ width: 768, padding: 36, bg: '#f7f1e3', radius: 16, lines: [
    { text: spec.name, size: 72, weight: 700, gap: 10 },
    { text: spec.sub, size: 40, color: '#5b5245' }] }, 2.2, { lit: true });
  sign.position.set(cx + 2.6, 1.4, fz - 3.2); sign.rotation.y = Math.PI;
  for (const lx of [-0.95, 0.95]) { const leg = box(0.12, 1.7, 0.12, mats.darkWood, lx, -0.55, 0.06, sign); leg.castShadow = true; }
  g.add(sign);
  const ex = { kind: 'sign', title: spec.name, body: spec.body, url: spec.url, face: { x: cx + 2.6, z: fz - 7, yaw: Math.PI } };
  sign.userData.exhibit = ex;
  door.userData.exhibit = { ...ex, face: { x: cx, z: fz - 5, yaw: Math.PI } };
  clickables.push(sign, door);

  scene.add(g);
  blocks.push({ x0: cx - W / 2 - 0.4, x1: cx + W / 2 + 0.4, z0: fz - 0.2, z1: nz1 + 0.4 });
  blocks.push({ x0: cx + 1.8, x1: cx + 3.4, z0: fz - 3.4, z1: fz - 3.0 });   // 안내판 다리
}
