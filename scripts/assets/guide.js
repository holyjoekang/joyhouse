import * as THREE from 'three';
import { mats } from './materials.js';
import { hanokRoof } from './roof.js';
import { textPlane, SANS } from '../ui3d/text.js';
import { BEND } from './stream.js';
import { PATH as ALLEY } from './bukchon.js';

// 정문 오른쪽(동쪽) 안내판 둘: 전체 안내도 + 안내문. 그림과 글은 모두 house.json에서 그린다.
const WING = { central: '#c9b48a', west: '#b9a58c', east: '#a9b8a0', hall: '#d8cdb8' };

function siteMap(house, extra, here) {
  const S = house.site, W = S.x1 - S.x0, D = S.z0 - S.z1, cw = 1024, ch = Math.round(cw * D / W) + 120;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'), top = 110, k = cw / W;
  const P = (x, z) => [(x - S.x0) * k, top + (z - S.z1) * k];
  const rect = (b, fill, stroke) => {
    const [ax, ay] = P(Math.min(b[0], b[2]), Math.min(b[1], b[3])), [bx, by] = P(Math.max(b[0], b[2]), Math.max(b[1], b[3]));
    g.fillStyle = fill; g.fillRect(ax, ay, bx - ax, by - ay);
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.strokeRect(ax, ay, bx - ax, by - ay); }
    return [(ax + bx) / 2, (ay + by) / 2];
  };
  const line = (pts, color, w, dash = []) => {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.setLineDash(dash);
    g.beginPath(); pts.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](...P(x, z))); g.stroke(); g.setLineDash([]);
  };
  const label = (text, [x, y], size = 26, color = '#2b2418') => {
    g.font = `700 ${size}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(255,252,242,.9)'; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
  };

  g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, cw, ch);
  g.fillStyle = '#14213d'; g.font = `700 54px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(`${house.name.split(' - ')[0]} 전체 안내도`, 28, 56);
  g.fillStyle = '#cfdcb4'; g.fillRect(0, top, cw, ch - top);

  // 구역
  const F = house.farm;
  const farm = rect([F.cx - F.w / 2, F.cz - F.d / 2, F.cx + F.w / 2, F.cz + F.d / 2], '#e6dcc0', '#9d8c6c');
  for (let i = 0; i < 6; i++) rect([F.cx - 40 + (i % 2) * 42, F.cz - 60 + Math.floor(i / 2) * 44, F.cx - 2 + (i % 2) * 42, F.cz - 24 + Math.floor(i / 2) * 44], '#f3b25e');
  const zones = Object.fromEntries(house.outdoor.map(o => [o.id, o]));
  const bk = rect(zones.bukchon.box, '#d9c9a6', '#8a7553');
  rect(zones.rosegarden.box, '#e9b3bd', '#a5566a');
  rect([extra.pond.cx - extra.pond.w / 2, extra.pond.cz - extra.pond.d / 2, extra.pond.cx + extra.pond.w / 2, extra.pond.cz + extra.pond.d / 2], '#7fb6c2', '#4d7f8a');
  for (const r of house.rooms) rect(r.box, WING[r.wing] || '#cbbf9f', '#6d5a3d');
  g.fillStyle = '#8a7a63'; g.fillRect(...P(-86, -0.4), 172 * k, 0.8 * k + 2);   // 꽃담

  // 길: 개울 → 산책로·박석길·골목·스마트팜 길
  const bend = new THREE.SplineCurve(BEND.map(([x, z]) => new THREE.Vector2(x, z))).getPoints(80).map(v => [v.x, v.y]);
  line(bend, '#4d93b8', 9);
  line(bend.map(([x, z], i, a) => { const [px, pz] = a[Math.max(0, i - 1)], [nx, nz] = a[Math.min(a.length - 1, i + 1)], l = Math.hypot(nx - px, nz - pz) || 1; return [x + (nz - pz) / l * 6.5, z - (nx - px) / l * 6.5]; }), '#a08b6a', 5);
  const road = [[0, -60], [0, house.farm.cz - house.farm.d / 2 + 24]];
  line(road, '#a08b6a', 7);
  line([[-14, road[1][1]], [F.cx - F.w / 2, road[1][1]]], '#a08b6a', 7);
  line(ALLEY, '#a08b6a', 5);

  label('본채', P(0, -86), 30); label('북촌 골목', bk, 26); label('로즈가든', P(46, -35), 22); label('연못', P(extra.pond.cx, extra.pond.cz), 22);
  label('스마트팜', farm, 34); label('개울길', P(-30, 160), 28, '#1d5a7a'); label('잔디길', P(10, -28), 22); label('정문', P(-12, -6), 22);

  // 현 위치 + 방위
  const [hx, hy] = P(here.x, here.z);
  g.fillStyle = '#e0443a'; g.beginPath(); g.arc(hx, hy, 13, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke();
  label('현 위치', [hx + 62, hy + 4], 26, '#b3241b');
  const nx = cw - 70, ny = top + 70;
  g.fillStyle = '#14213d'; g.beginPath(); g.moveTo(nx, ny - 40); g.lineTo(nx + 18, ny + 14); g.lineTo(nx, ny + 4); g.lineTo(nx - 18, ny + 14); g.closePath(); g.fill();
  label('N', [nx, ny + 40], 28, '#14213d');

  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, aspect: ch / cw };
}

// 기둥 둘 + 기와 지붕을 얹은 안내판 틀
function stand(scene, face, x, z, w, h, blocks) {
  const g = new THREE.Group();
  face.position.set(0, 0.7 + h / 2, 0.08); g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.12), mats.darkWood);
  back.position.set(0, 0.7 + h / 2, 0); back.castShadow = true; g.add(back);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0 + h, 0.18), mats.darkWood);
    post.position.set(sx * (w / 2 + 0.2), (1.0 + h) / 2, -0.04); post.castShadow = true; g.add(post);
  }
  g.add(hanokRoof({ box: [-w / 2 - 0.3, 0.35, w / 2 + 0.3, -0.35], y: 1.0 + h, rise: 0.35, overhang: 0.25, lift: 0.08, ridgeCap: false }));
  g.position.set(x, 0, z);
  scene.add(g);
  blocks.push({ x0: x - w / 2 - 0.35, x1: x + w / 2 + 0.35, z0: z - 0.35, z1: z + 0.35 });
  return g;
}

export function buildGuide(scene, house, extra, { blocks, clickables }) {
  const here = { x: 12.2, z: 3.2 }, info = house.guide || {};
  const { tex, aspect } = siteMap(house, extra, here);
  const mw = 3.4, mh = mw * aspect;
  const map = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  const mapStand = stand(scene, map, here.x, here.z, mw, mh, blocks);
  mapStand.userData.exhibit = { kind: 'sign', title: '전체 안내도', body: info.mapNote || '', face: { x: here.x, z: here.z + 4, yaw: 0 } };
  clickables.push(mapStand);

  const lines = [{ text: info.title || '안내', size: 64, weight: 700, color: '#e6cf9f', gap: 14 }];
  if (info.intro) lines.push({ text: info.intro, size: 34, color: '#d9dce4', gap: 18 });
  for (const o of house.outdoor.filter(o => o.id !== 'gate')) lines.push({ text: `· ${o.name} — ${o.sub}`, size: 34, color: '#f2ede2', gap: 6 });
  for (const t of info.tips || []) lines.push({ text: t, size: 30, color: '#b8c0d0', gap: 4 });
  const board = textPlane({ width: 900, padding: 40, bg: '#14213d', border: '#c9a14a', radius: 12, lines }, 2.8, { lit: true });
  board.geometry.computeBoundingBox();
  const bh = board.geometry.boundingBox.max.y - board.geometry.boundingBox.min.y;
  const infoStand = stand(scene, board, here.x + 4.2, here.z, 2.8, bh, blocks);
  infoStand.userData.exhibit = { kind: 'sign', title: info.title || '안내', body: info.intro || '', face: { x: here.x + 4.2, z: here.z + 4, yaw: 0 } };
  clickables.push(infoStand);
}
