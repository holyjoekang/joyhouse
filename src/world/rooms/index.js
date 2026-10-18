import * as THREE from 'three';
import { makeFrame } from '../../exhibits/frame.js';
import { makeBookshelf } from '../../exhibits/bookshelf.js';
import { makeGlobe } from '../../exhibits/globe.js';
import { makeNewsstand } from '../../exhibits/newsstand.js';
import { makePortal } from '../../exhibits/portal-door.js';
import { makeSign } from '../../exhibits/sign.js';

// 방 하나를 content/rooms/<id>.json대로 꾸민다. 방 파일이 없으면 '2단계' 안내판을 세운다.
// 새 전시물 종류는 BUILDERS에 한 줄 더하면 된다.
const BUILDERS = {
  frame: async item => makeFrame(item),
  sign: async item => makeSign(item),
  portal: async item => makePortal(item),
  bookshelf: async (item, ctx) => makeBookshelf(item, (await ctx.data(item.source))?.books || []),
  globe: async (item, ctx) => makeGlobe(item, await ctx.data(item.land), (await ctx.data(item.source))?.pins || []),
  newsstand: async (item, ctx) => makeNewsstand(item, (await ctx.data(item.source))?.posts || []),
};

const FACING = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 };
const WALL = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };
const INSET = 0.22;    // 벽 두께(0.2) + 틈

// 벽에 거는 자리: 벽 안쪽 면, 방 안을 바라보게
function onWall(room, wall, t) {
  const [nx, nz] = WALL[wall];
  const x = wall === 'west' ? room.minX + INSET : wall === 'east' ? room.maxX - INSET : room.minX + (room.maxX - room.minX) * t;
  const z = wall === 'north' ? room.minZ + INSET : wall === 'south' ? room.maxZ - INSET : room.maxZ - (room.maxZ - room.minZ) * t;
  return { x, z, yaw: Math.atan2(nx, nz), nx, nz };
}

export async function furnish(room, spec, ctx) {
  const items = spec?.items || (room.wing === 'hall' ? [] : [{
    type: 'sign', x: 0.5, z: 0.5, facing: 'south',
    title: `${room.name} — ${room.sub}`, text: '이 방은 2단계에서 채웁니다.',
  }]);
  for (const item of items) {
    const build = BUILDERS[item.type];
    if (!build) { console.warn('모르는 전시물', item.type); continue; }
    let obj;
    try { obj = await build(item, ctx); } catch (e) { console.warn(room.id, item.type, e); continue; }
    let x, z, yaw, nx, nz;
    if (item.wall) ({ x, z, yaw, nx, nz } = onWall(room, item.wall, item.t ?? 0.5));
    else {
      x = room.minX + (room.maxX - room.minX) * (item.x ?? 0.5);
      z = room.maxZ - (room.maxZ - room.minZ) * (item.z ?? 0.5);
      yaw = FACING[item.facing || 'south'];
      nx = Math.sin(yaw); nz = Math.cos(yaw);
    }
    obj.position.set(x, item.wall && item.y !== undefined ? item.y : 0, z);
    obj.rotation.y = yaw;
    obj.traverse(o => { if (o.isMesh) o.castShadow = false; });   // 실내에는 햇빛 그림자가 들지 않는다
    room.items.add(obj);

    // 다가가 볼 자리: 전시물 앞, 크기에 맞춘 거리
    const dist = Math.max(2.8, (item.w || 1.5) * 0.85);
    const viewY = item.y !== undefined ? Math.min(item.y, 3.2) : 1.6;
    const face = { x: x + nx * dist, z: z + nz * dist, yaw, y: viewY };
    obj.traverse(o => { if (o.userData.exhibit) o.userData.exhibit.face ||= face; });
    ctx.clickables.push(obj);
    obj.traverse(o => { if (o.userData.tick) ctx.tickers.push(o.userData.tick); });
  }
}
