import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats } from '../world/materials.js';
import { drawCard, texture, textPlane } from '../ui3d/text.js';

const box = (w, h, d, mat, x = 0, y = 0, z = 0, r = 0) => {
  const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
};
const cloth = hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92 });

// 카펫: 테두리 띠 + 가운데 메달리온 무늬를 캔버스로 그린다
function rugTexture(colors, oval) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768;
  const g = c.getContext('2d');
  const [base, border, accent, light] = colors;
  g.fillStyle = base; g.fillRect(0, 0, 1024, 768);
  if (oval) { g.save(); g.beginPath(); g.ellipse(512, 384, 500, 372, 0, 0, Math.PI * 2); g.clip(); }
  g.strokeStyle = border; g.lineWidth = 46; g.strokeRect(40, 40, 944, 688);
  g.strokeStyle = light; g.lineWidth = 6; g.strokeRect(80, 80, 864, 608); g.strokeRect(14, 14, 996, 740);
  for (let i = 0; i < 26; i++) {                      // 테두리 꽃무늬
    for (const [x, y] of [[60 + i * 35, 40], [60 + i * 35, 728]]) { g.fillStyle = i % 2 ? accent : light; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = border; g.beginPath(); g.ellipse(512, 384, 230, 160, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = accent; g.beginPath(); g.ellipse(512, 384, 150, 100, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = light;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.ellipse(512 + Math.cos(a) * 190, 384 + Math.sin(a) * 130, 22, 12, a, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * 1024, Math.random() * 768, 2, 2); }
  if (oval) g.restore();
  return texture(c);
}

export const FURNITURE = {
  rug(it) {
    const oval = it.pattern === 'oval';
    const geo = oval ? new THREE.CircleGeometry(0.5, 64) : new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: rugTexture(it.colors || ['#7a1f24', '#1f2f5a', '#c9a14a', '#efe2c4'], oval), roughness: 1, transparent: oval }));
    m.rotation.x = -Math.PI / 2; m.scale.set(it.w, it.d, 1); m.position.y = 0.015;
    m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m);
    return g;
  },
  bench(it) {
    const w = it.w || 2.4, g = new THREE.Group();
    g.add(box(w, 0.14, 0.62, mats.leather, 0, 0.5, 0, 0.05));
    for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) for (const z of [-0.22, 0.22]) g.add(box(0.07, 0.43, 0.07, mats.darkWood, x, 0.215, z));
    g.userData.footprint = [w, 0.7];
    return g;
  },
  sofa(it) {
    const w = it.w || 2.4, mat = cloth(it.color ? parseInt(it.color.slice(1), 16) : 0x8a2a2a), g = new THREE.Group();
    g.add(box(w, 0.42, 0.95, mat, 0, 0.32, 0, 0.08));
    g.add(box(w, 0.6, 0.22, mat, 0, 0.75, -0.38, 0.08));
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(box(0.22, 0.62, 0.95, mat, x, 0.45, 0, 0.08));
    for (let i = 0; i < Math.round(w / 0.8); i++) g.add(box(w / Math.round(w / 0.8) - 0.06, 0.16, 0.75, mat, -w / 2 + (i + 0.5) * w / Math.round(w / 0.8), 0.6, 0.05, 0.06));
    g.userData.footprint = [w, 1];
    return g;
  },
  armchair(it) {
    const g = FURNITURE.sofa({ ...it, w: 1.0 });
    g.userData.footprint = [1, 1];
    return g;
  },
  desk(it) {
    const w = it.w || 2.2, g = new THREE.Group();
    g.add(box(w, 0.08, 1.05, mats.darkWood, 0, 0.78, 0));
    for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) g.add(box(0.55, 0.74, 0.95, mats.darkWood, x, 0.37, 0));
    g.add(box(w - 1.1, 0.6, 0.05, mats.darkWood, 0, 0.45, 0.42));
    g.add(box(0.5, 0.03, 0.35, mats.leather, -0.3, 0.835, 0));
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f5a3a, emissive: 0x3a2a10, side: THREE.DoubleSide }));
    lamp.position.set(w / 2 - 0.4, 1.15, -0.2); g.add(lamp);
    g.add(box(0.03, 0.32, 0.03, mats.brass, w / 2 - 0.4, 0.98, -0.2));
    // 의자 (책상 뒤, 북쪽)
    const chair = new THREE.Group();
    chair.add(box(0.62, 0.12, 0.6, mats.leather, 0, 0.5, 0, 0.04));
    chair.add(box(0.62, 0.75, 0.12, mats.leather, 0, 0.95, -0.28, 0.04));
    chair.add(box(0.06, 0.45, 0.06, mats.brass, 0, 0.22, 0));
    chair.position.z = -0.95;
    g.add(chair);
    g.userData.footprint = [w, 2.2];
    return g;
  },
  table(it) {
    const w = it.w || 1.2, d = it.d || w, g = new THREE.Group();
    const top = it.round ? new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.06, 40), mats.darkWood) : box(w, 0.06, d, mats.darkWood);
    top.position.y = it.h || 0.75; top.castShadow = true; g.add(top);
    g.add(box(0.1, (it.h || 0.75) - 0.03, 0.1, mats.darkWood, 0, ((it.h || 0.75) - 0.03) / 2, 0));
    g.add(box(Math.min(w, 0.7), 0.05, Math.min(d, 0.7), mats.darkWood, 0, 0.03, 0));
    g.userData.footprint = [w, d];
    return g;
  },
  lamp() {
    const g = new THREE.Group();
    g.add(box(0.36, 0.04, 0.36, mats.brass, 0, 0.02, 0));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 8), mats.brass); pole.position.y = 0.8; g.add(pole);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.34, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf4e6c8, emissive: 0xffd9a0, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    shade.position.y = 1.6; g.add(shade);
    return g;
  },
  plant(it) {
    const g = new THREE.Group(), s = it.s || 1;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.2 * s, 0.5 * s, 20), new THREE.MeshStandardMaterial({ color: 0x2c4a6a, roughness: 0.3 }));
    pot.position.y = 0.25 * s; pot.castShadow = true; g.add(pot);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * s, 1), mats.hedge);
      leaf.scale.set(1, 1.4, 1);
      leaf.position.set(Math.cos(a) * 0.18 * s, (0.75 + (i % 3) * 0.22) * s, Math.sin(a) * 0.18 * s);
      g.add(leaf);
    }
    g.userData.footprint = [0.6 * s, 0.6 * s];
    return g;
  },
  // 월동문(月洞門): 붉은 원형 문틀
  moongate(it) {
    const R = it.radius || 1.6, g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.22, 16, 64), new THREE.MeshStandardMaterial({ color: 0x8a1c1c, roughness: 0.45 }));
    ring.position.y = R + 0.05; ring.castShadow = true; g.add(ring);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.24, 0.05, 8, 64), mats.gold);
    rim.position.y = R + 0.05; g.add(rim);
    for (const x of [-R - 0.9, R + 0.9]) g.add(box(1.4, 2 * R + 0.5, 0.3, new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.9 }), x, R + 0.25, 0));
    return g;
  },
  // 홍등: 공중에 매단 붉은 비단 등
  redLantern(it) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc81e1e, emissive: 0x8a1010, emissiveIntensity: 0.9, roughness: 0.6 }));
    body.scale.y = 0.8; g.add(body);
    for (const y of [0.34, -0.34]) g.add(box(0.36, 0.06, 0.36, mats.gold, 0, y, 0));
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xd9a020 }));
    tassel.position.y = -0.65; tassel.rotation.x = Math.PI; g.add(tassel);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 4), mats.darkWood);
    cord.position.y = 0.95; g.add(cord);
    g.position.y = it.y || 3.0;
    return g;
  },
  // 앱 모니터: 받침 + 화면. 화면에 앱 이름·설명·기술을 그린다.
  monitor(it) {
    const g = new THREE.Group();
    g.add(box(0.12, 0.42, 0.12, mats.brass, 0, 1.0, -0.05));
    g.add(box(0.5, 0.04, 0.3, mats.brass, 0, 0.8, -0.05));
    g.add(box(1.32, 0.82, 0.06, new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.3, metalness: 0.4 }), 0, 1.55, 0));
    const screen = textPlane({ width: 768, padding: 34, bg: it.bg || '#10223a', radius: 0, minHeight: 470, lines: [
      { text: it.group || '', size: 26, color: '#8fb8e8', weight: 700, gap: 6 },
      { text: it.title, size: 46, weight: 700, color: '#ffffff', gap: 12 },
      { text: it.desc || '', size: 26, color: '#c9d6e6', gap: 10 },
      { text: it.tech || '', size: 22, color: '#7f95ad' }] }, 1.22);
    screen.position.set(0, 1.55, 0.035);
    g.add(screen);
    g.add(box(1.6, 0.76, 0.7, mats.darkWood, 0, 0.38, -0.05));
    g.userData.exhibit = { kind: 'app', title: it.title, body: [it.desc, it.tech].filter(Boolean).join('\n'), links: it.links || [] };
    g.userData.footprint = [1.6, 0.8];
    return g;
  },
  // 포스터: 사이트 한 쪽을 액자 포스터로. 누르면 그 쪽으로 들어간다.
  poster(it) {
    const g = new THREE.Group(), w = it.w || 1.3;
    const card = textPlane({ width: 640, padding: 40, bg: it.bg || '#f7f3ea', radius: 0, minHeight: 860, lines: [
      { text: it.kicker || '', size: 30, color: it.accent || '#1f6f5a', weight: 700, gap: 10 },
      { text: it.title, size: 58, weight: 700, gap: 18 },
      { text: it.text || '', size: 32, color: '#4a4338' }] }, w, { lit: true });
    card.position.z = 0.03; g.add(card);
    const h = card.userData.height, b = 0.06;
    for (const [fw, fh, x, y] of [[w + 2 * b, b, 0, h / 2 + b / 2], [w + 2 * b, b, 0, -h / 2 - b / 2], [b, h, -w / 2 - b / 2, 0], [b, h, w / 2 + b / 2, 0]]) g.add(box(fw, fh, 0.06, mats.darkWood, x, y, 0.03));
    g.userData.exhibit = { kind: 'portal', title: it.title, body: it.text || '', url: it.url, mode: it.mode || 'overlay' };
    return g;
  },
};
