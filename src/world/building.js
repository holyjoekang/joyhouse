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

// 벽 면에 붙는 얇은 판(벽지·징두리·몰딩·문틀·기단). off = 벽 경계에서 판 가운데까지(+ 방 안쪽, − 바깥쪽)
function slab(side, a, b, y0, y1, thick, off) {
  const len = b - a, h = y1 - y0, c = (a + b) / 2;
  const o = side.fixed + (side.axis === 'x' ? side.n[1] : side.n[0]) * off;
  const g = side.axis === 'x' ? new THREE.BoxGeometry(len, h, thick) : new THREE.BoxGeometry(thick, h, len);
  if (side.axis === 'x') g.translate(c, (y0 + y1) / 2, o); else g.translate(o, (y0 + y1) / 2, c);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i) * h / 3);
  return g;
}

// 방마다 벽 빛깔과 마감. 센트럴은 흰 징두리 판벽, 양 윙은 나무 머름.
const STYLE = {
  grandhall: { wall: 0xf7f3ea, coffer: true, lights: 2 }, blueroom: { wall: 0x93abd0, curtain: 'fabricBlue' },
  redroom: { wall: 0xb24e48, curtain: 'fabricRed' }, maproom: { wall: 0xc4cba8 }, oval: { wall: 0xefe0b4 },
  stairs: { wall: 0xf2ede2 },
};
const linings = new Map();
function lining(color) {
  if (!linings.has(color)) { const m = repeatFor(mats.marble, 1, 1); m.color.setHex(color); linings.set(color, m); }
  return linings.get(color);
}

function blockOf(side, a, b) {
  const o = side.fixed, d = (side.axis === 'x' ? side.n[1] : side.n[0]) * T;
  const p = [o, o + d].sort((m, n) => m - n);
  return side.axis === 'x' ? { x0: a, x1: b, z0: p[0], z1: p[1] } : { x0: p[0], x1: p[1], z0: a, z1: b };
}

export function buildBuilding(scene, house, { family, specs = {} }) {
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
      // 바깥벽 판정: 벽 바로 밖 세 점(¼·½·¾)이 모두 어느 방에도 속하지 않을 때. 한 점은 경계선에 떨어질 수 있다.
      const outside = t => !roomAt(side.axis === 'x' ? t : side.fixed - side.n[0] * 0.6, side.axis === 'x' ? side.fixed - side.n[1] * 0.6 : t);
      const exterior = [0.25, 0.5, 0.75].every(k => outside(side.a + (side.b - side.a) * k));
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

      const st = STYLE[rm.id] || {}, central = rm.wing === 'central';
      const lin = lining(st.wall || (central ? 0xf4f0e6 : 0xf3e8d2));
      const trim = central ? mats.trim : mats.darkWood;
      // 방 안쪽 마감: 벽지, 징두리 판벽, 걸레받이, 허리띠, 천장 몰딩
      const finish = (a, b) => {
        add(lin, slab(side, a, b, 0, H, 0.01, T + 0.005));
        add(trim, slab(side, a, b, 0, 0.95, 0.025, T + 0.02));
        add(trim, slab(side, a, b, 0, 0.16, 0.05, T + 0.03));
        add(trim, slab(side, a, b, 0.92, 1.0, 0.06, T + 0.035));
        add(trim, slab(side, a, b, H - 0.22, H, 0.14, T + 0.075));
      };
      let cur = side.a;
      for (const g of gaps) {
        const dh = g.d.a === 'outside' ? 3.6 : DOOR_H;
        if (g.a > cur + 0.01) { add(wallMat, piece(side, cur, g.a, 0, top)); blocks.push(blockOf(side, cur, g.a)); finish(cur, g.a); if (exterior) outerBase(side, cur, g.a); }
        add(wallMat, piece(side, g.a, g.b, dh, top));
        add(lin, slab(side, g.a, g.b, dh, H, 0.01, T + 0.005));
        add(trim, slab(side, g.a, g.b, H - 0.22, H, 0.14, T + 0.075));
        // 문틀: 양옆 기둥 + 머리
        add(trim, slab(side, g.a - 0.16, g.a, 0, dh + 0.16, 0.06, T + 0.03));
        add(trim, slab(side, g.b, g.b + 0.16, 0, dh + 0.16, 0.06, T + 0.03));
        add(trim, slab(side, g.a - 0.16, g.b + 0.16, dh, dh + 0.16, 0.06, T + 0.03));
        if (locked(g.d) && rm.access === 'family') closedDoor(side, g, rm);
        cur = g.b;
      }
      if (side.b > cur + 0.01) { add(wallMat, piece(side, cur, side.b, 0, top)); blocks.push(blockOf(side, cur, side.b)); finish(cur, side.b); if (exterior) outerBase(side, cur, side.b); }
      if (exterior && central) {
        add(mats.column, slab(side, side.a - 0.3, side.b + 0.3, 9.0, 9.5, 0.55, -0.2));    // 처마 아래 코니스
        add(mats.column, slab(side, side.a, side.b, 6.4, 6.62, 0.2, -0.08));               // 층 띠
      }

      if (!exterior) continue;
      // 바깥벽 장식: 센트럴은 높은 유리창, 양 윙·회랑은 나무 기둥과 띠살문
      const step = rm.wing === 'central' ? 4 : 3;
      // 벽에 거는 전시물(책장·포털·액자) 자리는 창을 내지 않는다
      const hung = (specs[rm.id]?.items || []).filter(it => it.wall === side.name).map(it => {
        const c = side.axis === 'x' ? rm.minX + (rm.maxX - rm.minX) * (it.t ?? 0.5) : rm.maxZ - (rm.maxZ - rm.minZ) * (it.t ?? 0.5);
        return [c, (it.w || 2.6) / 2 + 1.1];
      });
      const free = t => !hung.some(([c, hw]) => Math.abs(t - c) < hw) && !gaps.some(g => t > g.a - 1.2 && t < g.b + 1.2) && !roomAt(
        side.axis === 'x' ? t : side.fixed - side.n[0] * 0.6, side.axis === 'x' ? side.fixed - side.n[1] * 0.6 : t);
      const count = Math.floor((side.b - side.a) / step);
      const start = (side.a + side.b) / 2 - (count - 1) * step / 2;
      for (let k = 0; k < count; k++) {
        const t = start + k * step;
        if (!free(t)) continue;
        if (rm.wing === 'central') { windows.push({ side, t, w: 1.7, h: 3.4, y: 1.2 }); innerWindow(side, t, rm); }
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
    const floorMat = rm.id === 'grandhall' || rm.id === 'stairs' ? repeatFor(mats.stoneFloor, w / 4, d / 4)
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
    const st = STYLE[rm.id] || {};
    if (st.coffer) {                                  // 우물반자: 3.2m 격자 들보
      for (let x = rm.minX + 3.2; x < rm.maxX - 0.5; x += 3.2) { const g = new THREE.BoxGeometry(0.3, 0.4, d - 0.4); g.translate(x, rm.height - 0.2, rm.cz); add(mats.trim, g); }
      for (let z = rm.minZ + 3.6; z < rm.maxZ - 0.5; z += 3.6) { const g = new THREE.BoxGeometry(w - 0.4, 0.4, 0.3); g.translate(rm.cx, rm.height - 0.2, z); add(mats.trim, g); }
    }
    const n = st.lights ?? (rm.wing === 'hall' ? 0 : 1);
    for (let i = 0; i < n; i++) {
      const lamp = rm.wing === 'central' ? chandelier(rm.height > 7 ? 1.5 : 1) : hanjiLamp();
      lamp.position.set(rm.cx, rm.height, n > 1 ? rm.minZ + d * (i + 1) / (n + 1) : rm.cz);
      rm.items.add(lamp);
    }
  }

  // 센트럴 바깥벽 창의 안쪽: 밝은 하늘빛 유리 + 창틀·살 + 양옆 커튼 + 커튼 상자
  function innerWindow(side, t, rm) {
    const st = STYLE[rm.id] || {}, cur = mats[st.curtain || 'fabricCream'];
    const a = t - 0.85, b = t + 0.85, y0 = 1.2, y1 = 4.6;
    add(mats.daylight, slab(side, a, b, y0, y1, 0.005, T + 0.012));
    add(mats.trim, slab(side, a - 0.12, b + 0.12, y0 - 0.12, y0, 0.08, T + 0.05));
    add(mats.trim, slab(side, a - 0.12, b + 0.12, y1, y1 + 0.12, 0.08, T + 0.05));
    add(mats.trim, slab(side, a - 0.12, a, y0, y1, 0.08, T + 0.05));
    add(mats.trim, slab(side, b, b + 0.12, y0, y1, 0.08, T + 0.05));
    add(mats.trim, slab(side, t - 0.03, t + 0.03, y0, y1, 0.04, T + 0.03));
    for (const y of [2.33, 3.46]) add(mats.trim, slab(side, a, b, y - 0.03, y + 0.03, 0.04, T + 0.03));
    const top = Math.min(rm.height - 0.3, y1 + 0.7);
    add(cur, slab(side, a - 0.75, a - 0.05, 0.05, top, 0.1, T + 0.12));
    add(cur, slab(side, b + 0.05, b + 0.75, 0.05, top, 0.1, T + 0.12));
    add(mats.trim, slab(side, a - 0.9, b + 0.9, top, top + 0.28, 0.22, T + 0.14));
  }

  // 바깥 기단: 막돌 0.45m
  function outerBase(side, a, b) {
    // 모서리에서만 0.6m 내밀어 이웃 방(회랑) 안으로 들어가지 않게
    const out = (t) => { const nx = side.axis === 'x' ? 0 : side.n[0], nz = side.axis === 'x' ? side.n[1] : 0;
      return !roomAt(side.axis === 'x' ? t : side.fixed - nx * 0.3, side.axis === 'x' ? side.fixed - nz * 0.3 : t); };
    const a2 = out(a - 0.3) ? a - 0.6 : a, b2 = out(b + 0.3) ? b + 0.6 : b;
    add(mats.stoneWall, slab(side, a2, b2, 0, 0.45, 0.6, -0.3));
    const o = side.fixed, n = side.axis === 'x' ? side.n[1] : side.n[0];
    const p = [o, o - n * 0.6].sort((m, k) => m - k);
    blocks.push(side.axis === 'x' ? { x0: a, x1: b, z0: p[0], z1: p[1] } : { x0: p[0], x1: p[1], z0: a, z1: b });
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

// 정면 열주랑: 덕수궁 석조전처럼 센트럴 정면 전체에 이오니아식 대리석 기둥 12개.
// 그 위에 정관헌처럼 기와지붕을 얹어 동서양을 한 몸에 담는다.
function portico(scene, blocks) {
  const step = new THREE.Mesh(new THREE.BoxGeometry(50, 0.12, 6), mats.marble);
  step.position.set(0, 0.06, -57.2);
  step.receiveShadow = true;
  scene.add(step);
  const stylobate = new THREE.Mesh(new THREE.BoxGeometry(49, 0.14, 4.6), mats.marble);
  stylobate.position.set(0, 0.19, -57.6);
  stylobate.receiveShadow = true;
  scene.add(stylobate);

  const xs = [2.3, 6.7, 11.1, 15.5, 19.9, 23.8].flatMap(x => [-x, x]);
  const n = xs.length, m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const inst = (geo, at) => {
    const im = new THREE.InstancedMesh(geo, mats.marble, n * at.length);
    let i = 0;
    for (const x of xs) for (const [dx, y, rot] of at) {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rot || 0);
      im.setMatrixAt(i++, m.compose(new THREE.Vector3(x + dx, y, -55.4), q, one));
    }
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  };
  inst(new THREE.CylinderGeometry(0.36, 0.44, 7.3, 24), [[0, 4.0]]);               // 기둥 몸
  inst(new THREE.BoxGeometry(1.1, 0.22, 1.1), [[0, 0.37]]);                         // 주초
  inst(new THREE.TorusGeometry(0.46, 0.08, 8, 24), [[0, 0.56, Math.PI / 2]]);       // 아래 쇠시리
  inst(new THREE.BoxGeometry(1.2, 0.18, 0.8), [[0, 7.75]]);                         // 주두 판
  inst(new THREE.CylinderGeometry(0.19, 0.19, 0.82, 16), [[-0.5, 7.6, Math.PI / 2], [0.5, 7.6, Math.PI / 2]]);   // 소용돌이(볼류트)
  for (const x of xs) blocks.push({ x0: x - 0.55, x1: x + 0.55, z0: -55.95, z1: -54.85 });

  // 엔타블러처: 들보 + 치아 장식 띠 + 처마돌림
  const beam = new THREE.Mesh(new THREE.BoxGeometry(49, 0.55, 0.9), mats.marble);
  beam.position.set(0, 8.12, -55.4); beam.castShadow = true;
  scene.add(beam);
  const dentil = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), mats.marble, 150);
  for (let i = 0; i < 150; i++) dentil.setMatrixAt(i, m.makeTranslation(-24.2 + i * 0.326, 7.92, -54.92));
  scene.add(dentil);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(49.6, 0.2, 1.2), mats.marble);
  cornice.position.set(0, 8.48, -55.4);
  scene.add(cornice);
  scene.add(hanokRoof({ box: [-24.6, -54.6, 24.6, -60], y: 8.6, rise: 2.2, overhang: 0.9, lift: 0.45 }));

  const lantern = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 12);
  for (const x of [-4.5, 4.5]) {
    const l = new THREE.Mesh(lantern, mats.lantern);
    l.position.set(x, 6.9, -55.2);
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

// 샹들리에: 놋쇠 고리 둘 + 팔 + 전구, 천장에서 사슬로
function chandelier(k = 1) {
  const g = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2 * k, 6), mats.brass);
  chain.position.y = -0.6 * k; g.add(chain);
  const body = new THREE.Group(); body.position.y = -1.35 * k; g.add(body);
  for (const [r, y, n] of [[0.75, 0, 8], [0.45, 0.35, 6]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.03 * k, 8, 40), mats.brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = y * k; body.add(ring);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07 * k, 10, 8), mats.bulb);
      bulb.position.set(Math.cos(a) * r * k, (y + 0.1) * k, Math.sin(a) * r * k); body.add(bulb);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * k, 0.03 * k, 0.08 * k, 8), mats.brass);
      cup.position.set(Math.cos(a) * r * k, (y + 0.02) * k, Math.sin(a) * r * k); body.add(cup);
    }
  }
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.16 * k, 16, 12), mats.brass);
  drop.position.y = -0.15 * k; body.add(drop);
  return g;
}

// 한지 등: 나무 살에 한지를 바른 네모 등
function hanjiLamp() {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), mats.darkWood);
  cord.position.y = -0.4; g.add(cord);
  const shade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), new THREE.MeshStandardMaterial({ color: 0xfff3d8, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 1 }));
  shade.position.y = -1.15; g.add(shade);
  for (const y of [-0.8, -1.5]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), mats.darkWood);
    f.position.y = y; g.add(f);
  }
  return g;
}
