import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane, texture } from '../ui3d/text.js';

function seeded(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = (h >>> 0) % 2147483646 + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// 1단계 그림 자리: 작품의 색으로 붓질을 흉내 낸 그림. 2단계에서 실제 이미지(퍼블릭 도메인)로 바꾼다.
function painting(item, pxW, pxH) {
  const c = document.createElement('canvas');
  c.width = pxW; c.height = pxH;
  const ctx = c.getContext('2d');
  const pal = item.palette || ['#6b5a45', '#c9b38f', '#3e3328', '#e8dcc4'];
  const r = seeded(item.title || 'x');
  const g = ctx.createLinearGradient(0, 0, 0, pxH);
  g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1] || pal[0]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, pxW, pxH);
  const swirl = item.swirl ?? 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    let x = r() * pxW, y = r() * pxH;
    ctx.strokeStyle = pal[Math.floor(r() * pal.length)];
    ctx.globalAlpha = 0.35 + r() * 0.5;
    ctx.lineWidth = 2 + r() * 6;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const a = swirl * (Math.sin(x * 0.012) + Math.cos(y * 0.015)) * 1.6 + (item.flow || 0);
      x += Math.cos(a) * 7; y += Math.sin(a) * 7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

let poolTex = null;
function lightPool(w, h, artH) {
  if (!poolTex) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'), grd = g.createRadialGradient(128, 40, 4, 128, 90, 150);
    grd.addColorStop(0, 'rgba(255,236,200,0.75)'); grd.addColorStop(0.5, 'rgba(255,226,180,0.25)'); grd.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    poolTex = new THREE.CanvasTexture(c); poolTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  m.position.set(0, artH / 2 + 0.15 - h / 2, 0.012);
  return m;
}

export function makeFrame(item) {
  const w = item.w || 1.2, h = item.h || 0.9;
  const group = new THREE.Group();
  const tex = texture(painting(item, Math.round(512 * Math.min(2, w / h)), Math.round(512 * Math.min(2, h / w))));
  const artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, envMapIntensity: 0.25 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
  art.position.z = 0.03;
  group.add(art);
  if (item.src) {          // 실제 그림이 오면 갈아 끼운다
    new THREE.TextureLoader().load(item.src, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      artMat.map = t; artMat.needsUpdate = true;
    });
  }
  if (item.light !== false) {   // 그림 등: 놋쇠 막대 + 벽에 번지는 빛
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.min(w * 0.6, 1.2), 12), mats.brass);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, h / 2 + 0.22, 0.2);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), mats.brass);
    arm.rotation.x = Math.PI / 2.6; arm.position.set(0, h / 2 + 0.17, 0.1);
    group.add(bar, arm);
    group.add(lightPool(w * 1.5, h * 1.4, h));
  }
  const b = Math.max(0.09, Math.min(w, h) * 0.07), d = 0.1, frameMat = item.frame === 'dark' ? mats.darkWood : mats.gold;
  for (const [fw, fh, x, y] of [[w + 2 * b, b, 0, h / 2 + b / 2], [w + 2 * b, b, 0, -h / 2 - b / 2], [b, h, -w / 2 - b / 2, 0], [b, h, w / 2 + b / 2, 0]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, d), frameMat);
    bar.position.set(x, y, 0.04); bar.castShadow = true;
    group.add(bar);
  }
  const caption = [item.title, [item.artist, item.year].filter(Boolean).join(', ')].filter(Boolean);
  const label = textPlane({ width: 640, padding: 24, bg: '#f6f1e6', radius: 6, lines: [
    { text: caption[0] || '', size: 44, weight: 700, gap: 4 },
    { text: caption[1] || '', size: 32, color: '#6a5f50' }] }, 0.55, { lit: true });
  label.position.set(w / 2 - 0.27, -h / 2 - 0.12 - label.userData.height / 2, 0.02);
  group.add(label);

  group.userData.exhibit = {
    kind: 'artwork', title: item.title,
    body: [caption[1], item.where, item.note].filter(Boolean).join('\n'),
  };
  return group;
}
