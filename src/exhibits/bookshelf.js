import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { drawCard, texture } from '../ui3d/text.js';

// 책장: 가운데 두 칸에는 최근 읽은 책 표지가 앞을 보고, 나머지 칸에는 책등이 꽂힌다.
export function makeBookshelf(item, books = []) {
  const w = item.w || 8, h = item.h || 3.2, depth = 0.45, rows = 5;
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), mats.darkWood);
  back.position.set(0, h / 2, 0.025); group.add(back);
  for (const x of [-w / 2, w / 2]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, depth), mats.wood);
    s.position.set(x, h / 2, depth / 2); s.castShadow = true; group.add(s);
  }
  const rowH = h / rows;
  for (let i = 0; i <= rows; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, depth), mats.wood);
    s.position.set(0, i * rowH, depth / 2); s.receiveShadow = true; group.add(s);
  }

  // 책등
  const spines = [];
  let seed = 3;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const row of [0, 1, 4]) {
    let x = -w / 2 + 0.1;
    while (x < w / 2 - 0.15) {
      const bw = 0.04 + r() * 0.05, bh = rowH * (0.6 + r() * 0.3);
      spines.push([x + bw / 2, row * rowH + 0.025 + bh / 2, bw, bh]);
      x += bw + 0.004;
    }
  }
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.8 }), spines.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const pal = [0x7a2e2e, 0x2e4a7a, 0x2e6a4a, 0xc8b48a, 0x5a3e6a, 0x8a6a2e, 0x2a2a2a, 0xd8d0c0];
  spines.forEach(([x, y, bw, bh], i) => {
    m.makeScale(bw, bh, 1).setPosition(x, y, 0.2);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, c.setHex(pal[Math.floor(r() * pal.length)]));
  });
  group.add(inst);

  // 표지: 가운데 두 칸 (2, 3번째 줄)
  const loader = new THREE.TextureLoader();
  const per = Math.ceil(books.length / 2), cw = Math.min(0.5, (w - 0.4) / Math.max(per, 1) - 0.06), ch = cw * 1.45;
  books.forEach((b, i) => {
    const row = i < per ? 3 : 2, k = i % per;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    const fallback = () => { mat.map = texture(drawCard({ width: 256, padding: 18, bg: '#e9e1cf', radius: 0,
      minHeight: 371, lines: [{ text: b.title, size: 30, weight: 700 }, { text: b.author, size: 22, color: '#665' }] })); mat.needsUpdate = true; };
    if (b.cover) loader.load(b.cover, t => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.needsUpdate = true; }, undefined, fallback);
    else fallback();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, 0.03), [mats.ceiling, mats.ceiling, mats.ceiling, mats.ceiling, mat, mats.ceiling]);
    const x = -((per - 1) * (cw + 0.06)) / 2 + k * (cw + 0.06);
    cover.position.set(x, row * rowH + 0.03 + ch / 2, 0.3);
    cover.rotation.x = -0.08;
    group.add(cover);
  });

  const list = books.slice(0, 8).map(b => `· ${b.title}${b.author ? ` — ${b.author}` : ''}`).join('\n');
  group.userData.exhibit = {
    kind: 'portal', title: item.label || '나의 서재',
    body: `최근 읽은 책 ${books.length}권이 앞을 보고 꽂혀 있습니다.\n${list}`,
    url: item.url,
  };
  return group;
}
