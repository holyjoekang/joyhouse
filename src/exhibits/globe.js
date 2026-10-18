import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { texture } from '../ui3d/text.js';

// 회전 지구본: 육지는 my-travel-map의 world_land.json, 핀은 다녀간 도시.
function landCanvas(land) {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d3f63'); g.addColorStop(0.5, '#2c5d8a'); g.addColorStop(1, '#1d3f63');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { const x = (lon + 180) / 360 * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#d9c9a0'; ctx.strokeStyle = '#a8946a'; ctx.lineWidth = 1.2;
  for (const country of land?.countries || []) {
    for (const ring of country.rings) {
      ctx.beginPath();
      let prev = null;
      ring.forEach(([lon, lat], i) => {
        const x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H;
        if (i === 0 || (prev !== null && Math.abs(x - prev) > W / 2)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        prev = x;
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  return c;
}

export function makeGlobe(item, land, pins = []) {
  const R = item.radius || 1.4;
  const group = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 1.0, 24), mats.wood);
  stand.position.y = 0.5; stand.castShadow = true; group.add(stand);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.12, 0.04, 8, 64), mats.gold);
  ring.position.y = 1.1 + R; ring.rotation.z = 0.41; group.add(ring);   // 지축과 같이 기운 자오선 고리

  const spin = new THREE.Group();
  spin.position.y = 1.1 + R;
  spin.rotation.z = 0.41;               // 지축 23.4°
  group.add(spin);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32),
    new THREE.MeshStandardMaterial({ map: texture(landCanvas(land)), roughness: 0.55 }));
  earth.castShadow = true;
  spin.add(earth);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xe0443a, emissive: 0x7a1a14, emissiveIntensity: 0.8 });
  const head = new THREE.SphereGeometry(1, 10, 8);
  pins.forEach(p => {
    const phi = (p.lng + 180) / 360 * Math.PI * 2, theta = (90 - p.lat) * Math.PI / 180;
    const k = 0.022 + Math.min(p.visits, 8) * 0.006;
    const dot = new THREE.Mesh(head, pinMat);
    dot.scale.setScalar(k);
    dot.position.set(-R * Math.cos(phi) * Math.sin(theta), R * Math.cos(theta), R * Math.sin(phi) * Math.sin(theta)).multiplyScalar(1.01);
    spin.add(dot);
  });

  const top = pins.slice(0, 6).map(p => `${p.name} ${p.visits}회`).join(' · ');
  group.userData.exhibit = {
    kind: 'portal', title: item.label || '나의 여행 지도',
    body: `1996년부터 다녀간 도시 ${pins.length}곳이 핀으로 꽂혀 있습니다.\n가장 많이 간 곳: ${top}`,
    url: item.url,
  };
  group.userData.tick = dt => { spin.rotation.y += dt * 0.12; };
  return group;
}
