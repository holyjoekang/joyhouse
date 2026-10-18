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

export const mats = {
  marble: new THREE.MeshStandardMaterial({ map: marbleMap, roughness: 0.35, metalness: 0 }),
  plaster: new THREE.MeshStandardMaterial({ map: plasterMap, roughness: 0.9 }),
  woodFloor: new THREE.MeshStandardMaterial({ map: woodFloorMap, roughness: 0.6 }),
  checker: new THREE.MeshStandardMaterial({ map: checkerMap, roughness: 0.25 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xfbf8f1, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a4f2c, roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x3e2a1a, roughness: 0.7 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a14a, roughness: 0.35, metalness: 0.8 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 0.85 }),
  grass: new THREE.MeshStandardMaterial({ map: grassMap, roughness: 1 }),
  path: new THREE.MeshStandardMaterial({ map: stonePathMap, roughness: 0.95 }),
  tile: new THREE.MeshStandardMaterial({ map: tileMap, roughness: 0.7, side: THREE.DoubleSide }),
  ridge: new THREE.MeshStandardMaterial({ color: 0x25272b, roughness: 0.6 }),
  paperDoor: new THREE.MeshStandardMaterial({ map: paperDoorMap, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a2c14, emissiveIntensity: 0.25 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.1, metalness: 0.6 }),
  lantern: new THREE.MeshStandardMaterial({ color: 0x2f4fa8, emissive: 0x6b2a2a, emissiveIntensity: 0.9 }),
};

export function repeatFor(mat, rx, ry) {
  const m = mat.clone();
  if (m.map) { m.map = m.map.clone(); m.map.repeat.set(rx, ry); m.map.needsUpdate = true; }
  return m;
}
