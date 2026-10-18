import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { createRouter } from './core/router.js';
import { isFamily } from './core/access.js';
import { buildSite } from './world/site.js';
import { buildBuilding } from './world/building.js';
import { furnish } from './world/rooms/index.js';
import { makeCollider } from './nav/collide.js';
import { createWalker, EYE } from './nav/walk.js';
import { Hud } from './ui3d/hud.js';
import { createPanel } from './ui3d/panel.js';
import { createMenu } from './ui3d/menu.js';
import { createMinimap } from './ui3d/minimap.js';
import { loadTextures } from './world/materials.js';
import { createPost } from './core/post.js';
import { createOverlay, openTab } from './portal/overlay.js';

const cache = new Map();
function data(path) {
  if (!path) return Promise.resolve(null);
  if (!cache.has(path)) cache.set(path, fetch(path, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return cache.get(path);
}

const canvas = document.getElementById('world');
const engine = createEngine(canvas);
const { renderer, scene, camera } = engine;
const family = isFamily();

const house = await data('content/house.json');
const timeline = await data('data/timeline.json');

const specs = Object.fromEntries(await Promise.all(house.rooms
  .filter(r => r.stage === 1 && r.wing !== 'hall' && (r.access !== 'family' || family))
  .map(async r => [r.id, await data(`content/rooms/${r.id}.json`)])));
const site = buildSite(scene, renderer, house, timeline, { shadows: renderer.shadowMap.enabled, phone: engine.phone });
const building = buildBuilding(scene, house, { family, specs });
const clickables = [...site.clickables, ...building.clickables];
const tickers = [];

const OUTDOOR = Object.fromEntries(house.outdoor.map(o => [o.id, o]));
const GROUP = { central: '센트럴 · 현재', west: '웨스트윙 · 과거', east: '이스트윙 · 미래', hall: '회랑' };

// 방 꾸미기: 방마다 content/rooms/<id>.json (없으면 2단계 안내판). 잠긴 가족 방은 비워 둔다.
await Promise.all([...building.rooms.values()].map(async room => {
  if (room.access === 'family' && !family) return;
  const spec = specs[room.id] || null;
  await furnish(room, spec, { data, clickables, tickers, blocks: building.blocks });
}));

// 이동
const collider = makeCollider([...building.blocks, ...site.blocks], house.site);
const hud = new Hud();
const walker = createWalker(camera, collider, house.start, { onFade: v => hud.fade(v) });

function whereIs(x, z) {
  const r = building.roomAt(x, z);
  if (r) return { id: r.id, name: r.name, sub: r.sub, group: GROUP[r.wing], room: r };
  const o = house.outdoor.find(o => {
    const [x0, z0, x1, z1] = o.box;
    return x > Math.min(x0, x1) && x < Math.max(x0, x1) && z > Math.min(z0, z1) && z < Math.max(z0, z1);
  });
  return o ? { id: o.id, name: o.name, sub: o.sub, group: '야외' } : { id: null, name: 'Joyhouse 정원', sub: '정문에서 잔디길을 따라 집으로', group: '야외' };
}

// 방으로 가기: 방 가운데, 북쪽(안쪽)을 바라보게. 잠긴 방은 문 앞 안내만.
function goRoom(id) {
  const r = building.rooms.get(id);
  if (r) {
    if (r.access === 'family' && !family) {
      panel.show({ kind: 'locked', title: `${r.name} — 가족 열쇠가 필요합니다`, body: '이 방은 가족만 들어갈 수 있습니다. 가족 열쇠는 마지막 단계에서 현관의 3D 자물쇠로 엽니다.' });
      return;
    }
    // 들어오는 문(이 방을 b로 가진 첫 문) 안쪽 2.6m에 서서 방 안을 본다
    const d = house.doors.find(d => d.b === id);
    if (d) {
      const [x, z] = d.at, e = 0.3;
      const n = Math.abs(z - r.maxZ) < e ? [0, -1] : Math.abs(z - r.minZ) < e ? [0, 1] : Math.abs(x - r.minX) < e ? [1, 0] : [-1, 0];
      walker.go(x + n[0] * 2.6, z + n[1] * 2.6, Math.atan2(-n[0], -n[1]), 0);
    } else walker.go(r.cx, r.cz, 0, 0);
    return;
  }
  const o = OUTDOOR[id];
  if (o) {
    const [x0, z0, x1, z1] = o.box;
    walker.go((x0 + x1) / 2, Math.max(z0, z1) + (id === 'gate' ? 6 : -2), 0, 0);
  }
}

// 3D UI
const panel = createPanel(hud);
const entries = [
  ...house.outdoor.map(o => ({ id: o.id, name: o.name, sub: o.sub, group: '야외' })),
  ...['central', 'west', 'east'].flatMap(w => house.rooms.filter(r => r.wing === w)
    .map(r => ({ id: r.id, name: r.name, sub: r.sub, group: GROUP[w], locked: r.access === 'family' && !family }))),
];
const menu = createMenu(hud, entries, e => goRoom(e.id));
const minimap = createMinimap(hud, renderer, scene, house.site, () => walker.view);

let label = null, hint = null, here = undefined;
function setLabel(w) {
  const fs = hud.fs, spec = { bg: '#fbf6ea', padding: 12, radius: 12, lines: [
    { text: w.group, size: fs * 0.62, color: '#9a6a2e', weight: 700, gap: 2 },
    { text: w.name, size: fs * 1.05, weight: 700, gap: 2 },
    { text: w.sub || '', size: fs * 0.75, color: '#6a6258' }] };
  const pw = Math.min(300, hud.w * 0.5);
  if (!label) { label = hud.slab(spec, pw, { depth: 12 }); label.userData.passThrough = true; }
  else hud.setSlab(label, spec, pw);
  hud.place(label, 16, 16, 40);
}
hud.add(new THREE.Group(), () => { if (here) setLabel(here); });
const hintSpec = () => ({ bg: '#2f2419', padding: 12, radius: 12, lines: [
  { text: engine.phone || hud.w < 600 ? '끌어서 둘러보기 · 바닥을 눌러 걷기'
    : '끌어서 둘러보기 · 바닥을 눌러 걷기 · W A S D / 방향키 · M 방 바로가기', size: hud.fs * 0.8, color: '#f4e2b8' }] });
hud.add(new THREE.Group(), (w, h) => {
  const pw = Math.min(w - 32 - Math.max(120, Math.min(220, w * 0.28)) - 16, 520);
  if (!hint) { hint = hud.slab(hintSpec(), pw, { depth: 10 }); hint.userData.passThrough = true; }
  else hud.setSlab(hint, hintSpec(), pw);
  hud.place(hint, 16, h - hint.userData.h - 16, 40);
});

// 방이 바뀌면: 이름판, 주소, 실내 조명, 먼 방 전시물 숨기기
const roomLight = new THREE.PointLight(0xfff0d8, 0, 0, 2);
scene.add(roomLight);
const router = createRouter(id => goRoom(id));
function onRoomChange(w) {
  here = w;
  setLabel(w);
  router.set(w.room ? w.id : null);
  const show = new Set(w.room ? [w.id, ...w.room.neighbors] : ['grandhall']);
  for (const r of building.rooms.values()) r.items.visible = show.has(r.id);
  if (w.room) {
    roomLight.position.set(w.room.cx, w.room.height - 0.8, w.room.cz);
    roomLight.intensity = w.room.height > 6 ? 260 : 120;
  } else roomLight.intensity = 0;
}

// 입력: 끌기 = 둘러보기, 짧게 누르기 = 걷기 / 전시물 보기 / 3D UI 누르기
const ray = new THREE.Raycaster();
let down = null;
function ndc(ev) {
  const r = canvas.getBoundingClientRect();
  return new THREE.Vector2((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
}
function exhibitOf(o) {
  for (let p = o; p; p = p.parent) if (p.userData.exhibit) return p.userData.exhibit;
  return null;
}
function pickWorld(ev) {
  ray.setFromCamera(ndc(ev), camera);
  const hits = ray.intersectObjects([...clickables, ...building.floors, ...scene.children.filter(o => o.userData.floor)], true)
    .filter(h => { for (let p = h.object; p; p = p.parent) if (!p.visible) return false; return true; });
  return hits[0] || null;
}
canvas.addEventListener('pointerdown', ev => {
  canvas.setPointerCapture(ev.pointerId);
  down = { x: ev.clientX, y: ev.clientY, lx: ev.clientX, ly: ev.clientY, moved: 0 };
});
canvas.addEventListener('pointermove', ev => {
  const rect = canvas.getBoundingClientRect();
  if (down) {
    const dx = ev.clientX - down.lx, dy = ev.clientY - down.ly;
    down.moved += Math.abs(dx) + Math.abs(dy);
    down.lx = ev.clientX; down.ly = ev.clientY;
    if (down.moved > 6 && !menuOpen()) walker.look(dx * 0.0045, dy * 0.0035);
    return;
  }
  const hudHit = hud.pick(ev.clientX, ev.clientY, rect);
  hud.hover(hudHit);
  const hit = !hudHit && !hud.covers(ev.clientX, ev.clientY, rect) ? pickWorld(ev) : null;
  canvas.style.cursor = hudHit || (hit && exhibitOf(hit.object)) ? 'pointer' : 'grab';
});
canvas.addEventListener('pointerup', ev => {
  const d = down; down = null;
  if (!d || d.moved > 6) return;
  const rect = canvas.getBoundingClientRect();
  const g = minimap.toGround(ev.clientX - rect.left, ev.clientY - rect.top);
  if (g && !menuOpen()) { walker.go(g.x, g.z); return; }
  const hudHit = hud.pick(ev.clientX, ev.clientY, rect);
  if (hudHit) { hudHit.userData.onClick?.(); return; }
  if (hud.covers(ev.clientX, ev.clientY, rect)) return;
  if (panel.open) { panel.hide(); return; }
  const hit = pickWorld(ev);
  if (!hit) return;
  const ex = exhibitOf(hit.object);
  if (ex) {
    const f = ex.face;
    if (f) {
      const dist = Math.hypot(f.x - walker.view.x, f.z - walker.view.z);
      const pitch = Math.atan2((f.y ?? EYE) - EYE, 3);
      if (dist > 0.8) walker.go(f.x, f.z, f.yaw, pitch);
    }
    panel.show(ex, actionsFor(ex));
    return;
  }
  // 바닥: 누른 자리까지 걷는다(1m 앞에서 멈춤)
  const p = hit.point, v = walker.view;
  const len = Math.hypot(p.x - v.x, p.z - v.z);
  if (len < 0.5) return;
  const k = Math.max(0, len - 1) / len;
  walker.go(v.x + (p.x - v.x) * k, v.z + (p.z - v.z) * k, Math.atan2(-(p.x - v.x), -(p.z - v.z)), 0);
});
canvas.addEventListener('wheel', ev => { ev.preventDefault(); if (!menuOpen()) walker.walk(-Math.sign(ev.deltaY) * 1.2); }, { passive: false });
addEventListener('keydown', ev => {
  if (ev.code === 'Escape') { panel.hide(); menu.close(); return; }
  if (ev.code === 'KeyM') { menu.toggle(); return; }
  walker.keys.add(ev.code);
});
addEventListener('keyup', ev => walker.keys.delete(ev.code));
addEventListener('blur', () => walker.keys.clear());
function menuOpen() { return menu.open_; }

// 사이트 연결: 같은 출처(holyjoekang.github.io)는 집 안 화면으로, 나머지는 새 탭으로
const overlay = createOverlay({ onClose: () => { clock.getDelta(); hud.fade(0, 500); } });
const SAME = 'https://holyjoekang.github.io/';
async function enter(ex) {
  await hud.fade(1, 420, 0xfff8ec);
  overlay.show(ex.url, ex.title);
}
function actionsFor(ex) {
  if (ex.kind === 'app') return (ex.links || []).map((l, i) => ({ label: l.label, primary: i === 0, onClick: () => openTab(l.url) }));
  if (!ex.url) return [];
  if (ex.url.startsWith(SAME) && ex.mode !== 'tab') {
    return [{ label: '들어가기', primary: true, onClick: () => enter(ex) }, { label: '새 탭', onClick: () => openTab(ex.url) }];
  }
  return [{ label: ex.kind === 'post' ? '원문 읽기 ↗' : '새 탭에서 열기 ↗', primary: true, onClick: () => openTab(ex.url) }];
}

// 시작
const lowQuality = engine.phone || new URLSearchParams(location.search).get('q') === 'low';
const post = createPost(renderer, scene, camera, !lowQuality);
engine.onResize((w, h) => { hud.resize(w, h); post.setSize(w, h); });
engine.resize();
renderer.compile(scene, camera);
minimap.snapshot();
loadTextures(renderer).then(() => minimap.snapshot());   // 실사 텍스처는 첫 화면 뒤에 도착한다
for (const r of building.rooms.values()) r.items.visible = false;
if (router.initial) goRoom(router.initial);
setTimeout(() => site.gate.open(), 900);

const clock = new THREE.Clock();
let elapsed = 0, moved = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  if (overlay.open) return;               // 사이트를 보는 동안 집은 쉰다
  elapsed += dt;
  if (walker.update(dt) && !moved) moved = true;
  const v = walker.view;
  const w = whereIs(v.x, v.z);
  if (!here || w.id !== here.id || (w.id === null && here.id !== null)) onRoomChange(w);
  site.update(dt, v);
  tickers.forEach(fn => fn(dt, elapsed));
  hud.update(dt);
  panel.update(dt);
  minimap.update();
  if (hint) hint.visible = (!moved || elapsed < 12) && !menu.open_;
  if (label) label.visible = !menu.open_;
  post.render();
  hud.render(renderer);
  engine.measure();
});
window.__joyhouse = { walker, goRoom, building, hud, panel, menu, renderer, scene, camera, actionsFor, overlay, clickables };   // 점검용
