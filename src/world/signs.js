import * as THREE from 'three';
import { mats } from './materials.js';
import { hanokRoof } from './roof.js';
import { SANS, SERIF } from '../ui3d/text.js';
import { LOTS, PATH as ALLEY } from './bukchon.js';
import { SPUR } from './stream.js';

// 솟대 이정표와 입구 구조 안내판(한지 족자형). 글·자리는 모두 house.json(signposts, miniGuides)에서 읽는다.
const canvasTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// 화살표 나무판 한 면: 오른쪽(right) 또는 왼쪽을 가리킨다
function fingerFace({ text, sub }, right) {
  const W = 640, H = 220, tip = 70, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.beginPath();
  if (right) { g.moveTo(8, 8); g.lineTo(W - tip, 8); g.lineTo(W - 8, H / 2); g.lineTo(W - tip, H - 8); g.lineTo(8, H - 8); }
  else { g.moveTo(tip, 8); g.lineTo(W - 8, 8); g.lineTo(W - 8, H - 8); g.lineTo(tip, H - 8); g.lineTo(8, H / 2); }
  g.closePath(); g.fillStyle = '#efe2c4'; g.fill(); g.lineWidth = 12; g.strokeStyle = '#5b3d24'; g.stroke();
  const cx = right ? (W - tip) / 2 + 4 : (W + tip) / 2 - 4;
  g.textAlign = 'center'; g.fillStyle = '#2b2016';
  g.font = `700 84px ${SERIF}`; g.fillText(text, cx, sub ? 112 : 140);
  if (sub) { g.font = `40px ${SANS}`; g.fillStyle = '#5b4a36'; g.fillText(sub, cx, 178); }
  return canvasTex(c);
}

function sotdae(post) {
  const g = new THREE.Group(), ink = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mats.darkWood); stick.position.y = 0.25; g.add(stick);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), ink); body.scale.set(1.6, 0.6, 0.7); body.position.y = 0.55; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.22, 6), ink); neck.position.set(0.2, 0.66, 0); neck.rotation.z = -0.6; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), ink); head.position.set(0.28, 0.76, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), mats.wood); beak.position.set(0.37, 0.75, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
  g.position.y = post; g.traverse(o => { o.castShadow = true; });
  return g;
}

// 솟대 이정표: 통나무 기둥, 화살표 판은 실제 목적지 쪽을 가리킨다
function signpost(scene, sp, { blocks, clickables }) {
  const g = new THREE.Group(), H = 3.3;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, H, 10), mats.wood); post.position.y = H / 2; post.castShadow = true; g.add(post);
  g.add(sotdae(H));
  sp.arrows.forEach((a, i) => {
    const to = a.to === 'stream' ? (v => [v.x, v.y])(SPUR.at(0.45)) : a.to;
    const dx = to[0] - sp.x, dz = to[1] - sp.z, yaw = Math.atan2(-dz, dx), L = 1.6, Hh = L * 220 / 640;
    const arm = new THREE.Group(); arm.rotation.y = yaw; arm.position.y = 2.75 - i * 0.55;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, Hh * 0.92, 0.05), mats.wood); plank.position.x = 0.12 + L * 0.45; plank.castShadow = true; arm.add(plank);
    for (const [side, right] of [[1, true], [-1, false]]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(L, Hh), new THREE.MeshStandardMaterial({ map: fingerFace(a, right), transparent: true, alphaTest: 0.5, roughness: 0.85 }));
      face.position.set(0.12 + L / 2, 0, side * 0.03); if (side < 0) face.rotation.y = Math.PI;
      arm.add(face);
    }
    g.add(arm);
  });
  g.position.set(sp.x, 0, sp.z);
  scene.add(g);
  blocks.push({ x0: sp.x - 0.3, x1: sp.x + 0.3, z0: sp.z - 0.3, z1: sp.z + 0.3 });
  g.userData.exhibit = { kind: 'sign', title: sp.title || '이정표', body: sp.arrows.map(a => `${a.text} — ${a.sub || ''}`).join('\n') };
  clickables.push(g);
}

// 구역 구조도: 스마트팜 / 북촌 골목
function areaMap(kind, house, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), ink = '#3b2d1f', red = '#b8312a', f = W / 14;
  const label = (s, x, y, size = f * 0.8, color = ink, w = 400) => { g.font = `${w} ${size}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y); };
  const box = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(x, y, w, h); };
  g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
  if (kind === 'farm') {
    box(W * .12, H * .04, W * .8, H * .12, '#e8dcc0'); label('선별 · 저장 · 관리동', W * .52, H * .1);
    g.strokeStyle = '#a08b6a'; g.lineWidth = f * .35; g.beginPath();
    g.moveTo(0, H * .2); g.lineTo(W * .92, H * .2); for (const x of [.12, .52, .92]) { g.moveTo(W * x, H * .2); g.lineTo(W * x, H * .84); }
    g.moveTo(W * .12, H * .84); g.lineTo(W * .92, H * .84); g.stroke();
    for (let i = 0; i < 6; i++) { const x = W * (.16 + (i % 2) * .4), y = H * (.24 + Math.floor(i / 2) * .2); box(x, y, W * .32, H * .15, '#f6cf98'); label(`온실 ${i + 1} · 방울토마토`, x + W * .16, y + H * .075, f * .62); }
    box(W * .12, H * .87, W * .8, H * .09, '#cfe0e6'); label('양액 · 저수조', W * .52, H * .915);
    g.fillStyle = red; g.beginPath(); g.arc(f * .55, H * .2, f * .45, 0, 7); g.fill(); label('현 위치', f * 1.9, H * .2 - f * .9, f * .7, red, 700);
  } else {
    const X = v => (v + 90) / 76 * W, Z = v => (v - 6) / 42 * H;
    g.strokeStyle = '#a08b6a'; g.lineWidth = f * .45; g.lineCap = g.lineJoin = 'round'; g.beginPath();
    [[-14, 20], ...ALLEY].forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](Math.min(X(x), W), Z(z))); g.stroke();
    const shops = house.street?.shops || [];
    LOTS.forEach((l, i) => { box(X(l.x) - W * .08, Z(l.z) - H * .07, W * .16, H * .14, '#d9c9a6'); label((shops[i]?.name || `벗 ${i + 1}`).replace(/\[|\]/g, '').slice(0, 9), X(l.x), Z(l.z), f * .5); });
    g.fillStyle = ink; g.beginPath(); g.moveTo(X(-87), Z(24)); g.lineTo(X(-84), Z(24) - f); g.lineTo(X(-81), Z(24)); g.fill(); label('전망대', X(-84), Z(24) + f * .7, f * .6, ink, 700);
    g.fillStyle = red; g.beginPath(); g.arc(W - f * .6, Z(20), f * .45, 0, 7); g.fill(); label('현 위치', W - f * 1.6, Z(20) + f * 1.1, f * .7, red, 700);
  }
  return c;
}

// 한지 족자형 안내판: 기둥 둘 + 맞배 기와, 한지 판에 먹선 구조도와 낙관
function miniGuide(scene, mg, house, { blocks, clickables }) {
  const PW = 900, PH = 1000, c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ead2'; g.fillRect(0, 0, PW, PH); g.strokeStyle = '#8a6a3e'; g.lineWidth = 18; g.strokeRect(9, 9, PW - 18, PH - 18);
  g.fillStyle = '#2b2016'; g.font = `700 76px ${SERIF}`; g.textAlign = 'center'; g.fillText(mg.title, PW / 2, 110);
  if (mg.sub) { g.font = `34px ${SANS}`; g.fillStyle = '#5b4a36'; g.fillText(mg.sub, PW / 2, 160); }
  g.drawImage(areaMap(mg.kind, house, 760, 760), 70, 190);
  g.fillStyle = '#b8312a'; g.fillRect(PW - 96, PH - 96, 56, 56);
  g.fillStyle = '#f3ead2'; g.font = `700 30px ${SERIF}`; g.fillText('朝', PW - 68, PH - 56);
  const w = 1.6, h = w * PH / PW, grp = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.9 }));
  face.position.set(0, 0.75 + h / 2, 0.05); grp.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.06), mats.darkWood); back.position.set(0, 0.75 + h / 2, 0); back.castShadow = true; grp.add(back);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95 + h, 0.1), mats.darkWood); p.position.set(s * (w / 2 + 0.14), (0.95 + h) / 2, 0); p.castShadow = true; grp.add(p); }
  grp.add(hanokRoof({ box: [-w / 2 - 0.3, 0.3, w / 2 + 0.3, -0.3], y: 0.95 + h, rise: 0.32, overhang: 0.2, lift: 0.06, ridgeCap: false }));
  grp.position.set(mg.x, 0, mg.z); grp.rotation.y = mg.yaw || 0;
  scene.add(grp);
  blocks.push({ x0: mg.x - 1.1, x1: mg.x + 1.1, z0: mg.z - 1.1, z1: mg.z + 1.1 });
  grp.userData.exhibit = { kind: 'sign', title: mg.title, body: mg.note || mg.sub || '' };
  clickables.push(grp);
}

export function buildSigns(scene, house, ctx) {
  (house.signposts || []).forEach(sp => signpost(scene, sp, ctx));
  (house.miniGuides || []).forEach(mg => miniGuide(scene, mg, house, ctx));
}
