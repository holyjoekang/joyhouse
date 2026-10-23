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
import { loadTextures, OUTDOOR_TEX, INDOOR_TEX } from './world/materials.js';
import { createOverlay, openTab } from './portal/overlay.js';
import { createAtmosphere } from './world/atmosphere.js';
import { STREAM_SPOT } from './world/stream.js';

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

// 첫 화면에 필요한 것만 먼저: 집 배치(작은 JSON) → 하늘·땅·박석길·대문. 본채와 나머지 정원은 첫 화면 뒤에 단계별로.
// 로딩 문구를 바꾼 뒤 한 프레임 쉬어 화면이 실제로 그려지게 한다. 캐시에서 다시 열 때는
// 기다릴 일이 없어 쉬지 않으면 무거운 작업이 이어 붙어 로딩 화면이 멈춘 것처럼 보인다.
const boot = msg => { window.__joyBoot?.(msg); return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };
await boot('집 도면을 펼치는 중');
const house = await data('content/house.json');
const clickables = [], tickers = [];
const blocks = [];   // 본채·정원·가구가 들어오면 여기에 더해진다 (충돌 판정이 같은 배열을 본다)
const site = buildSite(scene, renderer, house, { shadows: renderer.shadowMap.enabled, phone: engine.phone }, { blocks, clickables });
// 본채는 첫 화면 뒤에 짓는다(주소가 방을 가리키면 첫 화면 전에). 그때까지는 빈 집.
let specs = {};
let building = { ready: false, rooms: new Map(), roomAt: () => null, floors: [] };
let pendingRoom = null;

// 무대 밖 그룹에 짓고, 셰이더를 막지 않고 컴파일한 뒤 장면에 들인다(들이는 순간 화면이 멈추지 않게)
async function stageIn(build) {
  const into = new THREE.Group();
  into.userData = scene.userData;   // 스마트팜 온실이 밤 정도(lit)를 읽는다
  await build(into);
  await renderer.compileAsync(into, camera, scene).catch(() => {});
  if (into.children.length) scene.add(...into.children);
}
async function buildHouse() {
  specs = Object.fromEntries(await Promise.all(house.rooms
    .filter(r => r.stage === 1 && r.wing !== 'hall' && (r.access !== 'family' || family))
    .map(async r => [r.id, await data(`content/rooms/${r.id}.json`)])));
  await stageIn(into => {
    const b = buildBuilding(into, house, { family, specs });
    for (const r of b.rooms.values()) r.items.visible = false;
    blocks.push(...b.blocks);
    clickables.push(...b.clickables);
    building = Object.assign(b, { ready: true });
  });
  renderer.shadowMap.needsUpdate = true;
  here = undefined;   // 이름판·방 처리를 다시
  if (pendingRoom) { const id = pendingRoom; pendingRoom = null; goRoom(id); }
}
// 첫 화면 뒤: 본채 → 정원 단계들. 단계 사이엔 한 숨 쉰다.
async function growWorld() {
  const idle = () => new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 200 }));
  if (!building.ready) await buildHouse();
  for (const [name, build] of site.stages) {
    await idle();
    await stageIn(into => build(into, { data })).catch(e => console.warn(name, e));
    site.settle();
  }
  minimap.snapshot();
}
// 지금 서울의 시각·날씨로 하늘과 빛을 맞추고, 어두우면 등을 켠다
const atmos = createAtmosphere({ scene, renderer, sky: site.sky, sun: site.sun, hemi: site.hemi, lights: site.lights, phone: engine.phone });

const OUTDOOR = Object.fromEntries(house.outdoor.map(o => [o.id, o]));
const GROUP = { central: '센트럴 · 현재', west: '웨스트윙 · 과거', east: '이스트윙 · 미래', hall: '회랑' };

// 방 꾸미기는 첫 화면 뒤로 미룬다. 방마다 content/rooms/<id>.json (없으면 2단계 안내판), 잠긴 가족 방은 비워 둔다.
// 대문을 지나 집에 다가가면 그랜드 홀부터, 방에 들어서면 그 방과 이웃 방을 먼저,
// 그다음 나머지 방을 하나씩 채운다. 그림·책 표지 같은 큰 파일도 이때 받는다.
const furnished = new Map();
const queue = [];
let working = false, indoorTex = null;
// 전시물은 무대 밖 그룹에 먼저 꾸미고, 셰이더를 비동기로 컴파일한 뒤에 방에 들인다.
// 그래야 방에 들어서는 순간 컴파일 때문에 화면이 멈추지 않는다.
async function furnishInto(room) {
  const live = room.items, stage = new THREE.Group();
  room.items = stage;
  try { await furnish(room, specs[room.id] || null, { data, clickables, tickers, blocks }); }
  finally { room.items = live; }
  await renderer.compileAsync(stage, camera, scene).catch(() => {});
  if (stage.children.length) live.add(...stage.children);
}
function furnishRoom(id) {
  if (furnished.has(id)) return furnished.get(id);
  const room = building.rooms.get(id);
  const job = !room || (room.access === 'family' && !family) ? Promise.resolve()
    : furnishInto(room).catch(e => console.warn(id, e));
  furnished.set(id, job);
  return job;
}
function want(ids, first = false) {
  const fresh = ids.filter(id => !furnished.has(id) && (first || !queue.includes(id)));
  if (first) for (const id of fresh) { const i = queue.indexOf(id); if (i >= 0) queue.splice(i, 1); }
  first ? queue.unshift(...fresh) : queue.push(...fresh);
  if (!indoorTex) indoorTex = loadTextures(renderer, INDOOR_TEX);
  pump();
}
async function pump() {
  if (working) return;
  working = true;
  while (queue.length) {
    await furnishRoom(queue.shift());
    await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 300 }));   // 방 하나 채우고 한 숨: 화면이 끊기지 않게
  }
  working = false;
}
let entered = false;
function nearHouse(v) {
  if (entered || v.z > -38 || !building.ready) return;
  entered = true;
  want(['grandhall']);
}
// 판도라 정원: 첫 화면에는 없다. 25m 안으로 다가가거나, 하늘에서 보거나, 메뉴로 갈 때 받아 짓는다.
let garden = null, gardenJob = null;
function loadGarden() {
  gardenJob ??= Promise.all([data('content/garden.json'), import('./world/garden/index.js')])
    .then(([spec, mod]) => spec && mod.buildGarden(scene, spec, { blocks, clickables }))
    .then(gd => { garden = gd; renderer.shadowMap.needsUpdate = true; setTimeout(() => minimap.snapshot(), 1800); })
    .catch(e => console.warn('garden', e));
  return gardenJob;
}
function nearGarden(v) {
  if (gardenJob || !OUTDOOR.pandora) return;
  const [x0, z0, x1, z1] = OUTDOOR.pandora.box;
  const dx = Math.max(Math.min(x0, x1) - v.x, 0, v.x - Math.max(x0, x1)), dz = Math.max(Math.min(z0, z1) - v.z, 0, v.z - Math.max(z0, z1));
  if (walker.flying || Math.hypot(dx, dz) < 25) loadGarden();
}
// 이동
const collider = makeCollider(blocks, house.site);
const hud = new Hud();
const walker = createWalker(camera, collider, house.start, { onFade: v => hud.fade(v), ground: site.groundAt });

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
  if (!building.ready && house.rooms.some(r => r.id === id)) { pendingRoom = id; return; }   // 본채가 지어지면 간다
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
    if (id === 'stream') return walker.go(...STREAM_SPOT, 0);
    if (id === 'bukchon') return walker.go(x1 + 3, 20, Math.PI / 2, 0);   // 골목 어귀에서 서쪽 언덕을 본다
    if (id === 'pandora') { loadGarden(); return walker.go((x0 + x1) / 2, Math.min(z0, z1) - 3, Math.PI, 0); }   // 정원 들머리에서 남쪽을 본다
    if (id === 'farm') return walker.go(x0 + 2, Math.min(z0, z1) + 24, -Math.PI / 2, 0);   // 스마트팜 길목에서 동쪽을 본다
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

// '하늘에서 보기' 석판: 방 바로가기 아래. 누르면 높이 올라 내려다보고, 다시 누르면 내려앉는다.
let flyBtn = null;
const flySpec = () => ({ bg: walker.flying ? '#1f4a7a' : '#2f2419', padding: 12, radius: 12, align: 'center',
  lines: [{ text: walker.flying ? '걸어서 보기' : '하늘에서 보기', size: hud.fs, weight: 700, color: '#f4e2b8' }] });
function placeFly() {
  if (!flyBtn) flyBtn = hud.slab(flySpec(), hud.fs * 8.6, { depth: 14, onClick: toggleFly });
  else hud.setSlab(flyBtn, flySpec(), hud.fs * 8.6);
  hud.place(flyBtn, hud.w - flyBtn.userData.w - 16, 16 + flyBtn.userData.h + 10, 50);
}
hud.add(new THREE.Group(), placeFly);
function toggleFly() {
  panel.hide();
  walker.toggleFly();
  placeFly();
}

let label = null, hint = null, here = undefined, infoShown = '';
function setLabel(w) {
  const fs = hud.fs, spec = { bg: '#fbf6ea', padding: 12, radius: 12, lines: [
    { text: w.group, size: fs * 0.62, color: '#9a6a2e', weight: 700, gap: 2 },
    { text: w.name, size: fs * 1.05, weight: 700, gap: 2 },
    { text: w.sub || '', size: fs * 0.75, color: '#6a6258', gap: 4 },
    { text: atmos.info(), size: fs * 0.68, color: '#1f4a7a', weight: 700 }] };
  const pw = Math.min(300, hud.w * 0.5);
  if (!label) { label = hud.slab(spec, pw, { depth: 12 }); label.userData.passThrough = true; }
  else hud.setSlab(label, spec, pw);
  hud.place(label, 16, 16, 40);
  infoShown = atmos.info();
}
hud.add(new THREE.Group(), () => { if (here) setLabel(here); });
const hintSpec = () => ({ bg: '#2f2419', padding: 12, radius: 12, lines: [
  { text: engine.phone || hud.w < 600 ? '끌어서 둘러보기 · 바닥을 눌러 걷기'
    : '끌어서 둘러보기 · 바닥을 눌러 걷기 · W A S D / 방향키 · M 방 바로가기 · B 하늘 보기', size: hud.fs * 0.8, color: '#f4e2b8' }] });
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
    entered = true;
    want([w.id, ...w.room.neighbors], true);
    want([...building.rooms.keys()]);          // 나머지 방은 뒤에서 차례로
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
canvas.addEventListener('wheel', ev => {
  ev.preventDefault();
  if (menuOpen()) return;
  if (walker.flying) walker.climb(Math.sign(ev.deltaY) * 8);   // 하늘에서는 휠이 높이
  else walker.walk(-Math.sign(ev.deltaY) * 1.2);
}, { passive: false });
addEventListener('keydown', ev => {
  if (ev.code === 'Escape') { panel.hide(); menu.close(); return; }
  if (ev.code === 'KeyM') { menu.toggle(); return; }
  if (ev.code === 'KeyB') { toggleFly(); return; }
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

// 시작: 후처리(주변광 차폐·빛번짐)는 첫 화면이 뜬 다음에 받아 붙인다. 그동안은 그냥 그린다.
const lowQuality = engine.phone || new URLSearchParams(location.search).get('q') === 'low';
let post = { render: () => renderer.render(scene, camera), setSize() {} };
engine.onResize((w, h) => { hud.resize(w, h); post.setSize(w, h); });
engine.resize();
if (router.initial) { await boot('집을 짓는 중'); await buildHouse(); goRoom(router.initial); }
// 첫 화면의 셰이더를 미리, 막지 않고 컴파일한다(KHR_parallel_shader_compile). 그동안 로딩 화면은 살아 있다.
await boot('빛과 그림자를 맞추는 중');
await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(hud.scene, hud.camera)]).catch(() => {});
function afterFirstFrame() {
  window.__joyBoot?.(null);                   // 로딩 화면 걷기
  minimap.snapshot();
  setTimeout(() => site.gate.open(), 900);
  // 본채와 나머지 정원은 첫 화면이 뜬 뒤 차례로 들인다
  const grown = growWorld().catch(e => console.warn('grow', e));
  // 바깥 텍스처 → (집에 들어서면) 실내 텍스처 순서로. 도착하면 같은 재질에 갈아 끼운다.
  // 후처리는 텍스처가 자리 잡고 브라우저가 한가할 때 붙인다.
  Promise.all([loadTextures(renderer, OUTDOOR_TEX), grown]).then(() => {
    minimap.snapshot();
    if (lowQuality) return;
    (window.requestIdleCallback || setTimeout)(() => import('./core/post.js').then(({ createPost }) => {
      post = createPost(renderer, scene, camera, true);
      post.setSize(canvas.clientWidth, canvas.clientHeight);
    }).catch(e => console.warn('post', e)), { timeout: 2000 });
  });
}
let frameNo = 0;

const clock = new THREE.Clock();
let elapsed = 0, moved = false, infoAge = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  if (overlay.open) return;               // 사이트를 보는 동안 집은 쉰다
  elapsed += dt;
  if (walker.update(dt) && !moved) moved = true;
  const v = walker.view;
  atmos.update(dt, camera.position, walker.alt, post);
  if ((infoAge += dt) > 20 && here) { infoAge = 0; if (atmos.info() !== infoShown) setLabel(here); }
  const w = whereIs(v.x, v.z);
  if (!here || w.id !== here.id || (w.id === null && here.id !== null)) onRoomChange(w);
  site.update(dt, v);
  nearHouse(v);
  nearGarden(v);
  garden?.update(dt, v);
  tickers.forEach(fn => fn(dt, elapsed));
  hud.update(dt);
  panel.update(dt);
  minimap.update();
  if (hint) hint.visible = (!moved || elapsed < 12) && !menu.open_;
  if (label) label.visible = !menu.open_;
  post.render();
  hud.render(renderer);
  engine.measure();
  if (++frameNo === 1) requestAnimationFrame(afterFirstFrame);
});
window.__joyhouse = { walker, goRoom, get building() { return building; }, hud, panel, menu, renderer, scene, camera, actionsFor, overlay, clickables };   // 점검용
