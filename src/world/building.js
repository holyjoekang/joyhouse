import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, repeatFor } from './materials.js';
import { hanokRoof } from './roof.js';
import { textPlane } from '../ui3d/text.js';

const T = 0.2;              // 벽 두께
const DOOR_H = 2.9;
const EAVE = { central: 9, west: 4.5, east: 4.5, hall: 4.5 };
const WALL_MAT = { central: mats.marble, west: mats.plaster, east: mats.plaster, hall: mats.plaster };

function rect(box) {
  return { minX: Math.min(box[0], box[2]), maxX: Math.max(box[0], box[2]),
           minZ: Math.min(box[1], box[3]), maxZ: Math.max(box[1], box[3]) };
}
const inside = (r, x, z, m = 0) => x > r.minX - m && x < r.maxX + m && z > r.minZ - m && z < r.maxZ + m;

// 방 상자 하나의 네 벽. n = 방 안쪽을 향하는 법선
function sidesOf(r) {
  return [
    { name: 'north', axis: 'x', fixed: r.minZ, a: r.minX, b: r.maxX, n: [0, 1] },
    { name: 'south', axis: 'x', fixed: r.maxZ, a: r.minX, b: r.maxX, n: [0, -1] },
    { name: 'west', axis: 'z', fixed: r.minX, a: r.minZ + T, b: r.maxZ - T, n: [1, 0] },
    { name: 'east', axis: 'z', fixed: r.maxX, a: r.minZ + T, b: r.maxZ - T, n: [-1, 0] },
  ];
}

// 벽 조각: 축 방향 [a, b], 높이 [y0, y1]. 벽은 방 경계에서 안쪽으로 T만큼.
function piece(side, a, b, y0, y1) {
  const len = b - a, h = y1 - y0;
  const off = side.fixed + (side.axis === 'x' ? side.n[1] : side.n[0]) * T / 2;
  const g = side.axis === 'x' ? new THREE.BoxGeometry(len, h, T) : new THREE.BoxGeometry(T, h, len);
  const c = (a + b) / 2;
  if (side.axis === 'x') g.translate(c, (y0 + y1) / 2, off); else g.translate(off, (y0 + y1) / 2, c);
  // 대리석 결이 벽 크기에 맞게 늘어나지 않도록 UV를 m 단위로
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(len, T) / 3, uv.getY(i) * h / 3);
  return g;
}

function blockOf(side, a, b) {
  const o = side.fixed, d = (side.axis === 'x' ? side.n[1] : side.n[0]) * T;
  const p = [o, o + d].sort((m, n) => m - n);
  return side.axis === 'x' ? { x0: a, x1: b, z0: p[0], z1: p[1] } : { x0: p[0], x1: p[1], z0: a, z1: b };
}

export function buildBuilding(scene, house, { family }) {
  const rooms = new Map();
  const blocks = [], clickables = [], floors = [];
  house.rooms.forEach(rm => {
    const r = rect(rm.box);
    const group = new THREE.Group();       // 전시물만 담는다(멀면 숨김)
    group.name = rm.id;
    scene.add(group);
    rooms.set(rm.id, { ...rm, ...r, cx: (r.minX + r.maxX) / 2, cz: (r.minZ + r.maxZ) / 2,
      items: group, neighbors: new Set() });
  });
  const roomAt = (x, z, m = 0) => [...rooms.values()].find(r => inside(r, x, z, m));
  house.doors.forEach(d => {
    if (rooms.has(d.a) && rooms.has(d.b)) { rooms.get(d.a).neighbors.add(d.b); rooms.get(d.b).neighbors.add(d.a); }
  });
  const locked = d => {
    const acc = id => (rooms.get(id)?.access) || 'guest';
    return !family && acc(d.a) !== acc(d.b);
  };

  const geos = new Map();                 // 재질별로 모아 한 번에 합친다
  const add = (mat, g) => { if (!geos.has(mat)) geos.set(mat, []); geos.get(mat).push(g); };
  const posts = [], windows = [], paperDoors = [];

  for (const rm of rooms.values()) {
    const wallMat = WALL_MAT[rm.wing], eave = EAVE[rm.wing];
    for (const side of sidesOf(rm)) {
      const mid = (side.a + side.b) / 2;
      const ox = side.axis === 'x' ? mid : side.fixed - side.n[0] * 0.6;
      const oz = side.axis === 'x' ? side.fixed - side.n[1] * 0.6 : mid;
      const exterior = !roomAt(ox, oz);
      const H = rm.height, top = exterior ? Math.max(H, eave) : H;

      // 이 벽에 난 문
      const gaps = house.doors.filter(d => (d.a === rm.id || d.b === rm.id)).filter(d => {
        const [x, z] = d.at;
        return side.axis === 'x' ? Math.abs(z - side.fixed) < 0.3 && x >= side.a - 0.5 && x <= side.b + 0.5
                                 : Math.abs(x - side.fixed) < 0.3 && z >= side.a - 0.5 && z <= side.b + 0.5;
      }).map(d => {
        const c = side.axis === 'x' ? d.at[0] : d.at[1], w = d.w || 2.4;
        return { d, a: Math.max(side.a, c - w / 2), b: Math.min(side.b, c + w / 2) };
      }).sort((p, q) => p.a - q.a);

      let cur = side.a;
      for (const g of gaps) {
        if (g.a > cur + 0.01) { add(wallMat, piece(side, cur, g.a, 0, top)); blocks.push(blockOf(side, cur, g.a)); }
        const dh = g.d.a === 'outside' ? 3.6 : DOOR_H;
        add(wallMat, piece(side, g.a, g.b, dh, top));
        if (locked(g.d) && rm.access === 'family') closedDoor(side, g, rm);
        cur = g.b;
      }
      if (side.b > cur + 0.01) { add(wallMat, piece(side, cur, side.b, 0, top)); blocks.push(blockOf(side, cur, side.b)); }

      if (!exterior) continue;
      // 바깥벽 장식: 센트럴은 높은 유리창, 양 윙·회랑은 나무 기둥과 띠살문
      const step = rm.wing === 'central' ? 4 : 3;
      const free = t => !gaps.some(g => t > g.a - 1.2 && t < g.b + 1.2) && !roomAt(
        side.axis === 'x' ? t : side.fixed - side.n[0] * 0.6, side.axis === 'x' ? side.fixed - side.n[1] * 0.6 : t);
      const count = Math.floor((side.b - side.a) / step);
      const start = (side.a + side.b) / 2 - (count - 1) * step / 2;
      for (let k = 0; k < count; k++) {
        const t = start + k * step;
        if (!free(t)) continue;
        if (rm.wing === 'central') windows.push({ side, t, w: 1.7, h: 3.4, y: 1.2 });
        else paperDoors.push({ side, t, w: 1.8, h: 2.3, y: 0.5, inner: rm.wing === 'hall' });
      }
      if (rm.wing !== 'central') {
        for (let t = side.a; t <= side.b + 0.01; t += step) {
          if (!roomAt(side.axis === 'x' ? t : side.fixed - side.n[0] * 0.6, side.axis === 'x' ? side.fixed - side.n[1] * 0.6 : t)) posts.push({ side, t, h: eave });
        }
      }
    }

    // 바닥과 천장
    const w = rm.maxX - rm.minX, d = rm.maxZ - rm.minZ;
    const floorMat = rm.id === 'grandhall' ? repeatFor(mats.checker, w / 4, d / 4)
      : repeatFor(mats.woodFloor, w / 4, d / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(rm.cx, 0.01, rm.cz);
    floor.receiveShadow = true;
    floor.userData.floor = rm.id;
    scene.add(floor); floors.push(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(rm.cx, rm.height, rm.cz);
    scene.add(ceil);
  }

  function closedDoor(side, g, rm) {
    const w = g.b - g.a, c = (g.a + g.b) / 2;
    const W = mats.darkWood, P = mats.paperDoor;
    const door = new THREE.Mesh(new THREE.BoxGeometry(side.axis === 'x' ? w : 0.12, DOOR_H, side.axis === 'x' ? 0.12 : w),
      side.axis === 'x' ? [W, W, W, W, P, P] : [P, P, W, W, W, W]);
    const off = side.fixed + (side.axis === 'x' ? side.n[1] : side.n[0]) * T / 2;
    if (side.axis === 'x') door.position.set(c, DOOR_H / 2, off); else door.position.set(off, DOOR_H / 2, c);
    door.userData.exhibit = {
      kind: 'locked', title: `${rm.name} — 가족 열쇠가 필요합니다`,
      body: '이 방에는 가족 사진과 글이 있어 가족만 들어갈 수 있습니다. 가족 열쇠(암호)는 마지막 단계에서 현관의 3D 자물쇠로 엽니다.',
      face: faceOf(side, c, -1),
    };
    scene.add(door); clickables.push(door);
    blocks.push(blockOf(side, g.a, g.b));
    // 문 위 자물쇠 표지 (문 바깥쪽 = 방 밖에서 보이게)
    const sign = textPlane({ width: 512, padding: 26, bg: '#2b2118', fg: '#f1d9a0', radius: 14,
      lines: [{ text: '가족 전용', size: 52, weight: 700 }] }, 1.2);
    const n = side.axis === 'x' ? [0, side.n[1]] : [side.n[0], 0];
    sign.position.set(door.position.x - n[0] * 0.4, DOOR_H + 0.35, door.position.z - n[1] * 0.4);
    sign.rotation.y = Math.atan2(-n[0], -n[1]);
    scene.add(sign);
  }

  for (const [mat, list] of geos) {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // 바깥 장식: 같은 모양은 InstancedMesh 하나로
  const placeOnSide = (list, geo, mat, y, out) => {
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    list.forEach((it, i) => {
      const { side, t } = it;
      const nx = side.axis === 'x' ? 0 : side.n[0], nz = side.axis === 'x' ? side.n[1] : 0;
      const x = side.axis === 'x' ? t : side.fixed - nx * out;
      const z = side.axis === 'x' ? side.fixed - nz * out : t;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-nx, -nz));
      m.compose(new THREE.Vector3(x, y(it), z), q, s);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = true;
    scene.add(inst);
  };
  if (windows.length) {
    placeOnSide(windows, new THREE.BoxGeometry(1.7, 3.4, 0.06), mats.glass, it => it.y + it.h / 2, 0.03);
    placeOnSide(windows, new THREE.BoxGeometry(2.1, 0.25, 0.3), mats.marble, it => it.y + it.h + 0.15, 0.1);
  }
  if (paperDoors.length) {
    placeOnSide(paperDoors, new THREE.PlaneGeometry(1.8, 2.3), mats.paperDoor, it => it.y + it.h / 2, 0.02);
    // 안쪽 창호는 회랑에만 (전시실 벽은 그림 자리로 비운다)
    const inner = paperDoors.filter(p => p.inner);
    if (inner.length) placeOnSide(inner, new THREE.PlaneGeometry(1.8, 2.3), mats.paperDoor, it => it.y + it.h / 2, -T - 0.02);
  }
  if (posts.length) placeOnSide(posts, new THREE.BoxGeometry(0.32, 4.5, 0.32), mats.wood, () => 2.25, 0.18);

  // 지붕: 센트럴은 크게, 양 윙과 회랑은 낮게
  scene.add(hanokRoof({ box: [-24, -60, 24, -96], y: 9, rise: 6.5, overhang: 2.6, lift: 0.9 }));
  scene.add(hanokRoof({ box: [-72, -66, -36, -90], y: 4.5, rise: 4, overhang: 1.8, lift: 0.6 }));
  scene.add(hanokRoof({ box: [36, -66, 72, -90], y: 4.5, rise: 4, overhang: 1.8, lift: 0.6 }));
  scene.add(hanokRoof({ box: [-36, -75, -25.4, -81], y: 4.5, rise: 1.8, overhang: 1, lift: 0.25 }));
  scene.add(hanokRoof({ box: [25.4, -75, 36, -81], y: 4.5, rise: 1.8, overhang: 1, lift: 0.25 }));

  portico(scene, blocks);
  return { rooms, blocks, clickables, floors, roomAt };
}

// 정면 포르티코: 대리석 기둥 6개 + 작은 기와지붕 + 청사초롱
function portico(scene, blocks) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(19, 0.12, 6), mats.marble);
  slab.position.set(0, 0.06, -57.2);
  slab.receiveShadow = true;
  scene.add(slab);
  const colGeo = new THREE.CylinderGeometry(0.38, 0.45, 7.6, 24);
  const capGeo = new THREE.BoxGeometry(1.1, 0.35, 1.1);
  for (const x of [-7.2, -4.7, -2.3, 2.3, 4.7, 7.2]) {
    const col = new THREE.Mesh(colGeo, mats.marble);
    col.position.set(x, 3.9, -55.4);
    col.castShadow = true; col.receiveShadow = true;
    scene.add(col);
    for (const y of [0.3, 7.85]) {
      const cap = new THREE.Mesh(capGeo, mats.marble);
      cap.position.set(x, y, -55.4); cap.castShadow = true;
      scene.add(cap);
    }
    blocks.push({ x0: x - 0.5, x1: x + 0.5, z0: -55.9, z1: -54.9 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.6, 0.7), mats.marble);
  beam.position.set(0, 8.3, -55.4);
  scene.add(beam);
  scene.add(hanokRoof({ box: [-8.6, -54.6, 8.6, -60], y: 8.6, rise: 2.2, overhang: 0.9, lift: 0.45 }));

  const lantern = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 12);
  for (const x of [-8.4, 8.4]) {
    const l = new THREE.Mesh(lantern, mats.lantern);
    l.position.set(x, 6.9, -54.6);
    scene.add(l);
  }
}

// 벽 앞 dist(m)에서 벽을 바라보는 자리. sign = +1 방 안쪽, -1 바깥쪽
export function faceOf(side, t, sign = 1, dist = 3.2) {
  const nx = side.axis === 'x' ? 0 : side.n[0] * sign, nz = side.axis === 'x' ? side.n[1] * sign : 0;
  const x = side.axis === 'x' ? t : side.fixed;
  const z = side.axis === 'x' ? side.fixed : t;
  return { x: x + nx * dist, z: z + nz * dist, yaw: Math.atan2(nx, nz) };
}
