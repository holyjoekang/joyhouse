import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane } from '../ui3d/text.js';

// 서 있는 안내판: 아직 채우지 않은 방, 이야기 한 토막(story)에 쓴다.
export function makeSign(item) {
  const group = new THREE.Group();
  const board = textPlane({ width: 900, padding: 48, bg: '#f7f1e3', border: '#8a6a3e', radius: 18, lines: [
    { text: item.title, size: 64, weight: 700, gap: 16 },
    { text: item.text || '', size: 40, color: '#4f473c' }] }, item.w || 1.8, { lit: true });
  const h = board.userData.height;
  board.position.y = 1.0 + h / 2;
  group.add(board);
  const back = new THREE.Mesh(new THREE.BoxGeometry((item.w || 1.8) + 0.1, h + 0.1, 0.06), mats.wood);
  back.position.set(0, 1.0 + h / 2, -0.04); back.castShadow = true;
  group.add(back);
  for (const x of [-(item.w || 1.8) / 2 + 0.1, (item.w || 1.8) / 2 - 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.08), mats.wood);
    leg.position.set(x, 0.52, -0.04); group.add(leg);
  }
  group.userData.exhibit = { kind: 'sign', title: item.title, body: item.text || '' };
  return group;
}
