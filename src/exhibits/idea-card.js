import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane } from '../ui3d/text.js';

// 아이디어 카드: 위는 사진, 아래는 번호·제목·테마. 누르면 2D 상세 쪽(idea.html?id=…)으로 들어간다.
const PX = 560, PAD = 30, PHOTO_H = 330;

async function cover(src) {
  const img = new Image();
  img.src = src;
  try { await img.decode(); } catch { return null; }
  // 사진을 카드 안쪽 폭 × PHOTO_H 칸에 꽉 차게 잘라 둔다
  const c = document.createElement('canvas'); c.width = PX - PAD * 2; c.height = PHOTO_H;
  const s = Math.max(c.width / img.width, c.height / img.height);
  const w = img.width * s, h = img.height * s;
  c.getContext('2d').drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  return c;
}

export async function makeIdeaCard(item) {
  const g = new THREE.Group(), w = item.w || 1.2;
  const image = item.img ? await cover(item.img) : null;
  const card = textPlane({ width: PX, padding: PAD, bg: '#f7f3ea', radius: 0, image, imageHeight: image ? PHOTO_H : 0, minHeight: 760, lines: [
    { text: item.kicker || '', size: 24, color: item.accent || '#1f6f5a', weight: 700, gap: 8 },
    { text: item.title, size: 44, weight: 700, gap: 10 },
    { text: item.text || '', size: 26, color: '#4a4338' }] }, w, { lit: true });
  card.position.z = 0.03; g.add(card);
  const h = card.userData.height, b = 0.05;
  const accent = new THREE.MeshStandardMaterial({ color: item.accent || '#1f6f5a', roughness: 0.6 });
  for (const [fw, fh, x, y, m] of [[w + 2 * b, b, 0, h / 2 + b / 2, accent], [w + 2 * b, b, 0, -h / 2 - b / 2, mats.darkWood],
    [b, h, -w / 2 - b / 2, 0, mats.darkWood], [b, h, w / 2 + b / 2, 0, mats.darkWood]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.05), m);
    f.position.set(x, y, 0.03); g.add(f);
  }
  g.userData.exhibit = { kind: 'portal', title: item.title, body: item.note || item.text || '', url: item.url, mode: item.mode || 'overlay' };
  return g;
}
