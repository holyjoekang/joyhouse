import * as THREE from 'three';
import { glow, body, instances, strand, tuft, moss, motes, glowPath, rng, U } from './kit.js';

// B안 · 할렐루야 부유섬: 바위섬 여섯이 공중에 떠 천천히 오르내리고, 섬 밑으로 청록 덩굴이 드리운다.
// 가장 큰 섬에서 빛나는 폭포가 연못으로 떨어지고, 연못엔 빛 연잎, 바닥엔 물안개가 깔린다.
function islandGeo(seed, rad) {
  const r = rng(seed), geo = new THREE.IcosahedronGeometry(rad, 3), p = geo.attributes.position;
  const bumps = Array.from({ length: 6 }, () => [r() * 6.28, r() * 3.14, 0.1 + r() * 0.15]);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x), ph = Math.acos(y / rad);
    let k = 1;
    for (const [bt, bp, s] of bumps) k += s * Math.cos((th - bt) * 3) * Math.sin(ph * 2 + bp);
    if (y > 0) y *= 0.25; else { y *= 1.9; const t = -y / (rad * 1.9); x *= 1 - t * 0.55; z *= 1 - t * 0.55; }
    p.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

export function build(g, { cx, cz, entry, w = 74, d = 122 }, { blocks }) {
  const r = rng(52), kx = w / 74, kz = d / 122;   // 칸이 작으면 섬 자리·숲을 그만큼 좁힌다
  const rock = body(0x5d5a66, { flatShading: true }), turf = body(0x2d5a4c, { flatShading: true });
  const vine = glow(0x37e0c8, { tip: 0x6fa8ff, day: 0.5, night: 2.3, pulse: 0.35, speed: 0.8, sway: 0.5, hang: true });
  const crown = glow(0x3fe0b0, { tip: 0xd3ff7a, day: 0.55, night: 2.0, pulse: 0.3, sway: 0.25 });
  const isles = [
    { x: cx + 4 * kx, z: cz + 6 * kz, y: 21, rad: 9, still: true }, { x: cx - 18 * kx, z: cz - 14 * kz, y: 27, rad: 6 }, { x: cx + 20 * kx, z: cz - 18 * kz, y: 17, rad: 5 },
    { x: cx - 16 * kx, z: cz + 30 * kz, y: 32, rad: 7 }, { x: cx + 22 * kx, z: cz + 34 * kz, y: 24, rad: 4.5 }, { x: cx - 4 * kx, z: cz - 36 * kz, y: 36, rad: 3.5 },
  ];
  const bob = [];
  isles.forEach((s, i) => {
    const isle = new THREE.Group();
    const geo = islandGeo(30 + i, s.rad);
    const m = new THREE.Mesh(geo, rock); m.castShadow = true; isle.add(m);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(s.rad * 0.92, s.rad * 0.98, 0.5, 18), turf);
    top.position.y = s.rad * 0.22; isle.add(top);
    const vines = [], trees = [];
    for (let k = 0; k < s.rad * 26; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s.rad * 0.8;
      const underside = -s.rad * 1.9 * (1 - d / s.rad) ** 0.8;
      vines.push({ x: Math.cos(a) * d, y: underside + 0.3, z: Math.sin(a) * d, sx: 1, sz: 1, sy: 2 + r() * (6 + s.rad) });
    }
    for (let k = 0; k < s.rad * 12; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * s.rad * 0.85;
      trees.push({ x: Math.cos(a) * d, y: s.rad * 0.22 + 0.2, z: Math.sin(a) * d, s: 1 + r() * 2, ry: r() * 6 });
    }
    instances(isle, strand(0.05, 0.02), vine, vines);
    instances(isle, tuft(6, 0.12, 0.6), crown, trees);
    isle.position.set(s.x, s.y, s.z);
    g.add(isle);
    bob.push({ isle, y: s.y, ph: i * 1.7, amp: s.still ? 0 : 0.8 + r() * 0.6 });
  });

  // 폭포: 큰 섬 가장자리에서 연못으로. 물줄기 결이 아래로 흐른다.
  const big = isles[0], fx = big.x - big.rad * 0.75, fz = big.z - 2;
  const fallTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const x = c.getContext('2d'), rr = rng(4);
    x.fillStyle = '#000'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.15 + rr() * 0.5})`; x.fillRect(rr() * 64, rr() * 256, 1 + rr() * 3, 20 + rr() * 80); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
    return t;
  })();
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, color: 0x9ff3ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const fallH = big.y + big.rad * 0.2;
  for (const [w, dx] of [[3.2, 0], [1.6, 0.5]]) {
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.75, fallH, 12, 1, true, Math.PI * 0.5, Math.PI), fallMat);
    fall.position.set(fx + dx, fallH / 2, fz); g.add(fall);
  }

  // 연못 + 빛 연잎
  const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ color: 0x0d2a3a, roughness: 0.08, metalness: 0.3 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(fx, 0.04, fz); g.add(pond);
  blocks.push({ x0: fx - 7.5, x1: fx + 7.5, z0: fz - 7.5, z1: fz + 7.5 });
  const pads = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 2.5 + r() * 6;
    pads.push({ x: fx + Math.cos(a) * d, y: 0.08, z: fz + Math.sin(a) * d, s: 0.3 + r() * 0.6, rx: -Math.PI / 2, rz: r() * 6, c: r() < 0.7 ? 0x6ff7d8 : 0xff7ad9 });
  }
  instances(g, new THREE.CircleGeometry(1, 14, 0.4, 5.6), glow(0xffffff, { day: 0.55, night: 2.2, pulse: 0.5, speed: 0.8 }), pads);

  // 물안개: 바닥 가까이 겹친 원판 셋이 천천히 돈다
  const mistTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), rr = rng(8);
    for (let i = 0; i < 40; i++) {
      const px = 40 + rr() * 176, py = 40 + rr() * 176, s = 20 + rr() * 50, gr = x.createRadialGradient(px, py, 0, px, py, s);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  })();
  const mists = [0.5, 1.3, 2.4].map((y, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: mistTex, color: 0x7fe9ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.rotation.set(-Math.PI / 2, 0, i * 2); m.position.set(cx, y, cz); g.add(m);
    return m;
  });

  // 바위 아치: 들어오는 길목의 두 돌기둥과 그 위를 잇는 바위 다리
  const ax = entry[0], az = entry[1] + 12;
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(islandGeo(60 + s, 2.2).rotateX(Math.PI).scale(1, 3.2, 1).translate(0, 1.3, 0), rock);
    col.position.set(ax + s * 5, 0, az); col.castShadow = true; g.add(col);
    blocks.push({ x0: ax + s * 5 - 1.8, x1: ax + s * 5 + 1.8, z0: az - 1.8, z1: az + 1.8 });
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(5, 1.1, 6, 24, Math.PI), rock);
  arch.position.set(ax, 12, az); arch.castShadow = true; g.add(arch);
  const archVines = [];
  for (let k = 0; k < 90; k++) { const a = r() * Math.PI; archVines.push({ x: ax + Math.cos(a) * 5, y: 12 + Math.sin(a) * 5 - 0.8, z: az + (r() - 0.5) * 1.6, sx: 1, sz: 1, sy: 1.5 + r() * 6 }); }
  instances(g, strand(0.04, 0.015), vine, archVines);

  // 바닥: 빛 고사리 숲
  const ferns = [];
  for (let i = 0; i < 1500 * kx * kz; i++) {
    const x = cx + (r() - 0.5) * (w - 4), z = cz + (r() - 0.5) * (d - 6);
    if (Math.hypot(x - fx, z - fz) < 10 || (Math.abs(x - ax) < 3 && z < cz)) continue;
    ferns.push({ x, z, s: 0.5 + r() * 1.3, ry: r() * 6 });
  }
  instances(g, tuft(7, 0.05), glow(0x2fc9d6, { tip: 0xb8ff8a, day: 0.5, night: 1.6, pulse: 0.3, sway: 0.2 }), ferns);

  moss(g, { x: cx, z: cz, r: Math.min(40, Math.max(w, d) * 0.5), colors: ['#37e0c8', '#6fa8ff', '#d3ff7a', '#2f7bff'], step: 0x9ff8ff, seed: 17 });
  glowPath(g, [entry, [ax, az + 4], [cx - 8, cz - 16], [fx + 6, fz + 10]], glow(0xc8fff4, { day: 0.8, night: 1.8, pulse: 0.2 }));
  motes(g, { count: 420, x: cx, z: cz, r: Math.min(36, Math.max(w, d) * 0.45), y0: 0.5, y1: 9, color: 0xffd98a, size: 0.26, wander: 2, seed: 31, day: 0 });
  motes(g, { count: 320, x: fx, z: fz, r: 12, y0: 0.2, y1: 6, color: 0x9ff3ff, size: 0.5, rise: 0.6, wander: 1, seed: 32, day: 0.2 });

  return {
    update(dt, t) {
      for (const b of bob) { b.isle.position.y = b.y + Math.sin(t * 0.35 + b.ph) * b.amp; b.isle.rotation.y += dt * 0.01 * (b.amp ? 1 : 0); }
      fallTex.offset.y += dt * 1.4;
      mists.forEach((m, i) => { m.rotation.z += dt * 0.012 * (i % 2 ? -1 : 1); m.material.opacity = 0.06 + 0.2 * U.lit.value; });
    },
  };
}
