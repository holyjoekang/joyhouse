import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Two shared, unlit materials; no new shadow maps or textures per room.
const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
const box = new THREE.BoxGeometry(1, 1, 1);
const palettes = {
  grandhall: ['#34545c', '#bb9c65'], blueroom: ['#344c70', '#bda777'],
  redroom: ['#783e49', '#d0b18a'], maproom: ['#3f6860', '#c1b185'],
  oval: ['#364d59', '#b2a17b'], china: ['#743e36', '#c5a55b'],
  chapel: ['#626e80', '#d6c9a4'], ideas: ['#38696c', '#c8a76c'],
  vision: ['#424d72', '#c7ad75'], roots: ['#72604e', '#c4b18e'],
  family: ['#806164', '#d6bca0'],
};
export function finishRoom(room) {
  const palette = palettes[room.id];
  if (!palette) return;
  const w = room.maxX - room.minX, d = room.maxZ - room.minZ;
  const pieces = [];
  function part(x, y, z, sx, sy, sz, color) {
    const g = box.clone(); g.scale(sx, sy, sz); g.translate(x, y, z);
    const c = new THREE.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); pieces.push(g);
  }
  const x = (room.minX + room.maxX) / 2, z = (room.minZ + room.maxZ) / 2;
  const rw = w * 0.57, rd = d * 0.64;
  part(x, 0.016, z, rw, 0.012, rd, palette[0]);
  for (const side of [-1, 1]) {
    part(x + side * (rw / 2 - 0.12), 0.025, z, 0.045, 0.006, rd - 0.2, palette[1]);
    part(x, 0.025, z + side * (rd / 2 - 0.12), rw - 0.2, 0.006, 0.045, palette[1]);
  }
  const geometry = mergeGeometries(pieces); pieces.forEach(g => g.dispose());
  const rug = new THREE.Mesh(geometry, floorMaterial); rug.name = `room-finish-${room.id}`;
  room.items.add(rug);
}
