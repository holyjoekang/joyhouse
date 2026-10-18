import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane } from '../ui3d/text.js';

// 레드룸 가판대: 블로그 최신 글이 벽보처럼 붙는다. 카드 하나하나가 전시물이다.
export function makeNewsstand(item, posts = []) {
  const cols = 4, rows = 3, cw = 1.25, gap = 0.2;
  const w = cols * cw + (cols + 1) * gap, h = 4.6;
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), new THREE.MeshStandardMaterial({ color: 0x6e1f22, roughness: 0.8 }));
  board.position.y = 0.6 + h / 2; board.castShadow = true;
  group.add(board);
  const head = textPlane({ width: 1024, padding: 26, bg: '#2a1a14', radius: 10, align: 'center',
    lines: [{ text: item.label || '토리아빠의 50플러스 인사이트', size: 60, weight: 700, color: '#f0d49a' }] }, w * 0.8, { lit: true });
  head.position.set(0, 0.6 + h + 0.05 + head.userData.height / 2, 0.06);
  group.add(head);

  const cards = [];
  posts.slice(0, cols * rows).forEach((p, i) => {
    const date = p.date ? new Date(p.date) : null;
    const d = date && !isNaN(date) ? `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.` : '';
    const card = textPlane({ width: 512, padding: 30, bg: '#fbf7ee', radius: 8, minHeight: 540, lines: [
      { text: p.category || '', size: 24, color: '#9a3b3b', weight: 700, gap: 8 },
      { text: p.title.length > 44 ? p.title.slice(0, 43) + '…' : p.title, size: 34, weight: 700, gap: 10 },
      { text: (p.summary || '').slice(0, 56) + '…', size: 24, color: '#5b5245', gap: 10 },
      { text: d, size: 22, color: '#8a8070' }] }, cw, { lit: true });
    const r = Math.floor(i / cols), c = i % cols;
    card.position.set(-w / 2 + gap + cw / 2 + c * (cw + gap), 0.6 + h - 0.15 - card.userData.height / 2 - r * 1.42, 0.06);
    card.userData.exhibit = { kind: 'post', title: p.title, body: `${p.category} · ${d}\n${p.summary}`, url: p.url };
    group.add(card); cards.push(card);
  });
  group.userData.exhibit = { kind: 'portal', title: item.label || '토리아빠의 50플러스 인사이트',
    body: `네이버 블로그 최신 글 ${posts.length}편. 매일 아침 자동으로 바뀝니다.`, url: item.url };
  group.userData.cards = cards;
  return group;
}
