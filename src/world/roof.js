import * as THREE from 'three';
import { mats } from './materials.js';

// 팔작지붕을 줄인 우진각 곡면 지붕. 처마는 완만하고 용마루 쪽이 가파르며(오목한 곡면),
// 네 귀는 위로 들린다(앙곡). box = [x0, z0, x1, z1], y = 처마 높이.
export function hanokRoof({ box, y, rise, overhang = 2, lift = 0.6, ridgeCap = true }) {
  const X0 = Math.min(box[0], box[2]) - overhang, X1 = Math.max(box[0], box[2]) + overhang;
  const Z0 = Math.min(box[1], box[3]) - overhang, Z1 = Math.max(box[1], box[3]) + overhang;
  const alongX = X1 - X0 >= Z1 - Z0;
  const half = (alongX ? Z1 - Z0 : X1 - X0) / 2;
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  const top = y + rise;
  // 용마루 양 끝
  const r0 = alongX ? [Math.min(cx, X0 + half), cz] : [cx, Math.min(cz, Z0 + half)];
  const r1 = alongX ? [Math.max(cx, X1 - half), cz] : [cx, Math.max(cz, Z1 - half)];

  const faces = [
    [[X0, Z1], [X1, Z1], r0, r1],     // 남
    [[X1, Z0], [X0, Z0], r1, r0],     // 북
    [[X0, Z0], [X0, Z1], r0, r0],     // 서
    [[X1, Z1], [X1, Z0], r1, r1],     // 동
  ];
  if (!alongX) {                       // 세로로 긴 지붕은 용마루가 z 방향
    faces[0][2] = r1; faces[0][3] = r1;
    faces[1][2] = r0; faces[1][3] = r0;
    faces[2][2] = r0; faces[2][3] = r1;
    faces[3][2] = r1; faces[3][3] = r0;
  }

  const N = 16, M = 10, pos = [], uv = [], idx = [];
  for (const [e0, e1, q0, q1] of faces) {
    const base = pos.length / 3;
    const len = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
    for (let j = 0; j <= M; j++) {
      const v = j / M;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const ex = e0[0] + (e1[0] - e0[0]) * u, ez = e0[1] + (e1[1] - e0[1]) * u;
        const rx = q0[0] + (q1[0] - q0[0]) * u, rz = q0[1] + (q1[1] - q0[1]) * u;
        const corner = Math.pow(Math.abs(2 * u - 1), 3) * (1 - v) * (1 - v);
        pos.push(ex + (rx - ex) * v, y + rise * Math.pow(v, 1.5) + lift * corner, ez + (rz - ez) * v);
        uv.push(u * len / 1.2, v * half / 1.2);
      }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const group = new THREE.Group();
  const roof = new THREE.Mesh(geo, mats.tile);
  roof.castShadow = true; roof.receiveShadow = true;
  group.add(roof);

  if (ridgeCap) {
    const l = Math.max(0.6, Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) + 0.6);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? l : 0.36, 0.28, alongX ? 0.36 : l), mats.ridge);
    cap.position.set((r0[0] + r1[0]) / 2, top + 0.06, (r0[1] + r1[1]) / 2);
    cap.castShadow = true;
    group.add(cap);
  }
  return group;
}
