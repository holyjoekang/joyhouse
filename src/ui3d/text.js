import * as THREE from 'three';

// 한글은 기기 글꼴로 캔버스에 그려 텍스처로 쓴다 (웹폰트를 기다리지 않는다).
export const SANS = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans CJK KR", sans-serif';
export const SERIF = '"Batang", "AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", "Noto Serif CJK KR", serif';

function wrap(ctx, text, max) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width <= max) { line = next; continue; }
      if (line) out.push(line);
      line = '';
      // 낱말 하나가 줄보다 길면 글자 단위로 자른다
      for (const ch of word) {
        if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ''; }
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// lines: [{ text, size, weight, color, font: 'sans'|'serif', gap }]
// 폭은 고정, 높이는 글 길이에 맞춘다. image가 있으면 맨 위에 그린다.
export function drawCard({ width = 1024, padding = 56, bg = '#f8f4ec', fg = '#26221d', radius = 28,
  border = null, lines = [], align = 'left', image = null, imageHeight = 0, minHeight = 0 } = {}) {
  const probe = document.createElement('canvas').getContext('2d');
  const inner = width - padding * 2;
  const laid = lines.map(l => {
    const size = l.size || 40;
    const font = `${l.weight || 400} ${size}px ${l.font === 'serif' ? SERIF : SANS}`;
    probe.font = font;
    return { ...l, size, font, rows: wrap(probe, l.text ?? '', inner) };
  });
  let h = padding + (image ? imageHeight + 32 : 0);
  laid.forEach(l => { h += l.rows.length * l.size * 1.42 + (l.gap ?? 14); });
  h = Math.max(minHeight, Math.ceil(h + padding - 14));

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, width, h, radius);
    ctx.fill();
  }
  if (border) {
    ctx.strokeStyle = border; ctx.lineWidth = 6;
    roundRect(ctx, 3, 3, width - 6, h - 6, radius);
    ctx.stroke();
  }
  let y = padding;
  if (image) {
    const s = Math.min(inner / image.width, imageHeight / image.height);
    const iw = image.width * s, ih = image.height * s;
    ctx.drawImage(image, (width - iw) / 2, y + (imageHeight - ih) / 2, iw, ih);
    y += imageHeight + 32;
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  const x = align === 'center' ? width / 2 : align === 'right' ? width - padding : padding;
  laid.forEach(l => {
    ctx.font = l.font;
    ctx.fillStyle = l.color || fg;
    l.rows.forEach(r => { ctx.fillText(r, x, y + l.size * 0.12); y += l.size * 1.42; });
    y += l.gap ?? 14;
  });
  return canvas;
}

export function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 공간에 세우는 글자판. worldWidth(m)에 맞춰 높이가 정해진다.
export function textPlane(spec, worldWidth, { lit = false } = {}) {
  const canvas = drawCard(spec);
  const mat = lit
    ? new THREE.MeshStandardMaterial({ map: texture(canvas), transparent: true, roughness: 0.9 })
    : new THREE.MeshBasicMaterial({ map: texture(canvas), transparent: true, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldWidth * canvas.height / canvas.width), mat);
  mesh.userData.height = worldWidth * canvas.height / canvas.width;
  return mesh;
}
