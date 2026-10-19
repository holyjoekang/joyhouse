import * as THREE from 'three';

// 1·2단계 재질은 모두 캔버스로 그린다(내려받을 파일 없음). 3단계에서 PBR 텍스처로 바꾼다.
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function rnd(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function noise(ctx, n, base, spread, alpha, r) {
  for (let i = 0; i < n; i++) {
    const v = base + (r() - 0.5) * spread;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(r() * ctx.canvas.width, r() * ctx.canvas.height, 2 + r() * 6, 2 + r() * 6);
  }
}

const marbleMap = canvasTex(512, (ctx, s) => {
  const r = rnd(7);
  ctx.fillStyle = '#f3f1ec'; ctx.fillRect(0, 0, s, s);
  noise(ctx, 3000, 235, 30, 0.25, r);
  ctx.strokeStyle = 'rgba(150,150,160,0.25)';
  for (let i = 0; i < 9; i++) {         // 대리석 결
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath();
    let x = r() * s, y = 0;
    ctx.moveTo(x, y);
    while (y < s) { x += (r() - 0.5) * 40; y += 20 + r() * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
});

const plasterMap = canvasTex(256, (ctx, s) => {
  ctx.fillStyle = '#efe7d8'; ctx.fillRect(0, 0, s, s);
  noise(ctx, 2500, 230, 22, 0.2, rnd(11));
});

const woodFloorMap = canvasTex(512, (ctx, s) => {
  const r = rnd(5);
  for (let i = 0; i < 8; i++) {          // 마루널 8장
    const v = 150 + r() * 40;
    ctx.fillStyle = `rgb(${v},${v * 0.72},${v * 0.48})`;
    ctx.fillRect(0, i * s / 8, s, s / 8);
    ctx.strokeStyle = 'rgba(60,35,20,0.35)';
    ctx.strokeRect(0, i * s / 8, s, s / 8);
    for (let k = 0; k < 14; k++) {
      ctx.strokeStyle = `rgba(90,55,30,${0.08 + r() * 0.12})`;
      ctx.beginPath();
      const y = i * s / 8 + r() * s / 8;
      ctx.moveTo(0, y); ctx.bezierCurveTo(s / 3, y + 4, s * 2 / 3, y - 4, s, y);
      ctx.stroke();
    }
  }
});

const checkerMap = canvasTex(512, (ctx, s) => {
  const r = rnd(3);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = (i + j) % 2 ? 236 : 70;
    ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
    ctx.fillRect(i * s / 4, j * s / 4, s / 4, s / 4);
  }
  noise(ctx, 2500, 200, 60, 0.08, r);
});

const grassMap = canvasTex(512, (ctx, s) => {
  const r = rnd(13);
  ctx.fillStyle = '#6f9a4a'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) {
    const g = 110 + r() * 70;
    ctx.fillStyle = `rgba(${g * 0.55},${g},${g * 0.35},0.5)`;
    ctx.fillRect(r() * s, r() * s, 1.5, 3 + r() * 4);
  }
}, 40);

const stonePathMap = canvasTex(512, (ctx, s) => {   // 박석
  const r = rnd(17);
  ctx.fillStyle = '#7c776d'; ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 64) {
    let x = -r() * 60;
    while (x < s) {
      const w = 60 + r() * 70, v = 170 + r() * 40;
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
      ctx.fillRect(x + 3, y + 3, w - 6, 58);
      x += w;
    }
  }
  noise(ctx, 3000, 150, 60, 0.15, r);
});

const tileMap = canvasTex(256, (ctx, s) => {      // 기와 골
  ctx.fillStyle = '#3c3f44'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) {
    const g = ctx.createLinearGradient(i * s / 4, 0, (i + 1) * s / 4, 0);
    g.addColorStop(0, '#2a2c30'); g.addColorStop(0.5, '#5a5e65'); g.addColorStop(1, '#2a2c30');
    ctx.fillStyle = g; ctx.fillRect(i * s / 4, 0, s / 4, s);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let j = 0; j < 4; j++) ctx.fillRect(0, j * s / 4, s, 5);
});

const paperDoorMap = canvasTex(256, (ctx, s) => { // 띠살문
  ctx.fillStyle = '#f4ecd6'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#6b4a2e';
  ctx.fillRect(0, 0, s, 14); ctx.fillRect(0, s - 14, s, 14);
  ctx.fillRect(0, 0, 14, s); ctx.fillRect(s - 14, 0, 14, s);
  for (let i = 1; i < 8; i++) ctx.fillRect(i * s / 8 - 2, 0, 4, s);
  for (const y of [0.22, 0.25, 0.5, 0.53, 0.78, 0.81]) ctx.fillRect(0, y * s, s, 4);
});

const leafMap = canvasTex(256, (ctx, s) => {        // 잎 뭉치 (관목·소나무 잎)
  const r = rnd(23);
  ctx.fillStyle = '#8c8c8c'; ctx.fillRect(0, 0, s, s);      // 회색 바탕: 색은 재질 color가 정한다
  for (let i = 0; i < 1400; i++) {
    const g = 110 + r() * 145;
    ctx.fillStyle = `rgba(${g},${g},${g},0.85)`;
    ctx.beginPath(); ctx.ellipse(r() * s, r() * s, 2 + r() * 5, 1 + r() * 2, r() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
});

const std = o => new THREE.MeshStandardMaterial(o);

export const mats = {
  // 벽: 칠한 회벽 (센트럴은 흰색, 양 윙은 한지빛)
  marble: std({ color: 0xffffff, map: plasterMap, roughness: 0.75 }),
  plaster: std({ color: 0xf4ead8, map: plasterMap, roughness: 0.9 }),
  column: std({ color: 0xfbfaf6, map: marbleMap, roughness: 0.45 }),
  stoneFloor: std({ map: checkerMap, roughness: 0.3 }),
  woodFloor: std({ color: 0xe0b994, map: woodFloorMap, roughness: 0.55 }),
  checker: std({ map: checkerMap, roughness: 0.25 }),
  ceiling: std({ color: 0xfbf8f1, roughness: 1 }),
  wood: std({ color: 0x8a5a34, roughness: 0.7 }),
  darkWood: std({ color: 0x4a3020, roughness: 0.6 }),
  trim: std({ color: 0xf7f3ea, roughness: 0.5 }),
  gold: std({ color: 0xc9a14a, roughness: 0.3, metalness: 0.9 }),
  brass: std({ color: 0xb8913f, roughness: 0.25, metalness: 1 }),
  stone: std({ color: 0xa9a397, roughness: 0.85 }),
  stoneWall: std({ color: 0xbdb8ae, roughness: 0.9 }),
  grass: std({ color: 0xa6cf7e, map: grassMap, roughness: 1 }),
  path: std({ map: stonePathMap, roughness: 0.95 }),
  gravel: std({ color: 0xa69a86, roughness: 1 }),
  tile: std({ color: 0x8c9096, map: tileMap, roughness: 0.65, side: THREE.DoubleSide }),
  ridge: std({ color: 0x2c2e32, roughness: 0.6 }),
  bark: std({ color: 0x6a4a32, roughness: 0.95 }),
  leaf: std({ map: leafMap, roughness: 0.85 }),
  hedge: std({ color: 0x3f6230, map: leafMap, roughness: 0.9 }),
  paperDoor: std({ map: paperDoorMap, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a2c14, emissiveIntensity: 0.25 }),
  glass: std({ color: 0x223040, roughness: 0.05, metalness: 0.9 }),
  daylight: new THREE.MeshBasicMaterial({ color: 0xeef4ff }),
  lantern: std({ color: 0x2f4fa8, emissive: 0x6b2a2a, emissiveIntensity: 0.9 }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xfff1d0 }),
  leather: std({ color: 0x5a2e1e, roughness: 0.5 }),
  fabricBlue: std({ color: 0x2d4a7a, roughness: 0.9 }),
  fabricRed: std({ color: 0x8a2a2a, roughness: 0.9 }),
  fabricCream: std({ color: 0xe8dcc0, roughness: 0.9 }),
};

// ── PBR 텍스처 (Poly Haven CC0, assets/tex/*.webp) ──────────────────────────
// 화면은 캔버스 재질로 먼저 뜨고, 텍스처가 도착하면 같은 재질에 갈아 끼운다.
const SETS = {
  marble: ['painted_plaster_wall', 1], plaster: ['painted_plaster_wall', 1], column: ['marble_01', 1],
  stoneFloor: ['marble_01', 1.4], woodFloor: ['herringbone_parquet', 2.4], grass: ['leafy_grass', 70],
  path: ['cobblestone_floor_01', 1], gravel: ['gravel', 1], tile: ['grey_roof_tiles', 0.6],
  stoneWall: ['japanese_stone_wall', 1], bark: ['japanese_cedar_bark', 1.5], wood: ['wood_planks', 1],
  darkWood: ['wood_planks', 1],
};
// 텍스처 자리는 처음부터 1×1 자리표시 텍스처로 채워 둔다. 실사 텍스처가 오면 같은 자리에
// 갈아 끼우기만 하므로 셰이더를 다시 컴파일하지 않는다(그 컴파일이 PC에서 화면을 멈추게 했다).
function solid(r, g, b, srgb) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}
const BLANK = { map: solid(255, 255, 255, true), normal: solid(128, 128, 255), rough: solid(255, 255, 255) };
const users = [];
for (const [k, [id, scale]] of Object.entries(SETS)) {
  const m = mats[k];
  m.userData.pbr = { id, rx: scale, ry: scale };
  m.map ||= BLANK.map;
  m.normalMap = BLANK.normal;
  m.roughnessMap = BLANK.rough;
  users.push(m);
}

export function repeatFor(mat, rx, ry) {
  const m = mat.clone();
  if (m.map) { m.map = m.map.clone(); m.map.repeat.set(rx, ry); m.map.needsUpdate = true; }
  if (mat.userData.pbr) {
    const s = mat.userData.pbr.rx;
    m.userData.pbr = { id: mat.userData.pbr.id, rx: rx * s, ry: ry * s };
    m.userData.pbrDone = false;
    users.push(m);
  }
  return m;
}

// 바깥(첫 화면)에 보이는 텍스처와 실내에서만 보이는 텍스처. 실내 것은 집에 들어설 때 받는다.
export const OUTDOOR_TEX = ['leafy_grass', 'cobblestone_floor_01', 'gravel', 'grey_roof_tiles', 'japanese_stone_wall',
  'japanese_cedar_bark', 'painted_plaster_wall', 'marble_01'];
export const INDOOR_TEX = ['herringbone_parquet', 'wood_planks'];

const texCache = {};
export function loadTextures(renderer, only) {
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const get = (id, kind) => (texCache[id + kind] ||= new Promise(res => loader.load(`assets/tex/${id}_${kind}.webp`, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace;
    res(t);
  }, undefined, () => res(null))));
  const ids = [...new Set(users.map(m => m.userData.pbr.id))].filter(id => !only || only.includes(id));
  return Promise.all(ids.map(async id => {
    const [diff, nor, rough] = await Promise.all(['diff', 'nor', 'rough'].map(k => get(id, k)));
    for (const m of users.filter(m => m.userData.pbr.id === id && !m.userData.pbrDone)) {
      const { rx, ry } = m.userData.pbr;
      const rep = t => { if (!t) return null; const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
      if (diff) m.map = rep(diff);
      if (nor) { m.normalMap = rep(nor); m.normalScale.set(0.9, 0.9); }
      if (rough) { m.roughnessMap = rep(rough); m.roughness = 1; }
      m.userData.pbrDone = true;            // 자리가 같으니 needsUpdate(재컴파일)는 하지 않는다
    }
  }));
}
