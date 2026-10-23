import * as THREE from 'three';
import { U } from './kit.js';
import { textPlane } from '../../ui3d/text.js';

// 판도라 정원(대문 밖 남쪽 빈터). 첫 화면에는 싣지 않고, 걸어서 다가가거나 하늘에서 보거나
// 메뉴로 갈 때 이 파일과 고른 디자인 하나만 받아 짓는다. 디자인은 content/garden.json 의 active,
// 점검용 주소 인자 ?garden=souls|floating|forest 가 이긴다.
const DESIGNS = { souls: () => import('./souls.js'), floating: () => import('./floating.js'), forest: () => import('./forest.js') };

export async function buildGarden(scene, spec, { blocks, clickables }) {
  const want = new URLSearchParams(location.search).get('garden');
  const id = DESIGNS[want] ? want : DESIGNS[spec.active] ? spec.active : 'souls';
  const info = spec.designs.find(d => d.id === id) || { name: '판도라 정원', sub: '' };
  const [x0, z0, x1, z1] = spec.box, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const site = { cx, cz, entry: [cx, Math.min(z0, z1)] };

  const g = new THREE.Group();
  const design = (await DESIGNS[id]()).build(g, site, { blocks });

  // 들머리 안내판: 디자인 이름과 한 줄 소개
  const sign = textPlane({ width: 768, padding: 36, bg: '#140f2a', border: '#8f7bff', radius: 16, lines: [
    { text: info.name, size: 70, weight: 700, color: '#e9dcff', gap: 10 },
    { text: info.sub, size: 38, color: '#b9b0e0' }] }, 2.4, { lit: true });
  sign.position.set(site.entry[0] + 3.6, 1.5, site.entry[1] - 1.2);
  for (const lx of [-1.05, 1.05]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2236 })); leg.position.set(lx, -0.6, -0.05); sign.add(leg); }
  sign.userData.exhibit = { kind: 'sign', title: info.name, body: info.body || info.sub,
    face: { x: sign.position.x, z: sign.position.z - 4, yaw: Math.PI } };
  sign.rotation.y = Math.PI;   // 길(북쪽)에서 읽는다
  g.add(sign);
  clickables.push(sign);

  // 자라나며 나타난다: 땅에서 솟아 1.6초 만에 제 키가 된다
  g.scale.set(1, 0.001, 1);
  scene.add(g);
  let grow = 0, t = 0, moved = 0;
  const last = new THREE.Vector2(1e9, 1e9), steps = U.steps.value;
  return {
    id,
    update(dt, view) {
      t += dt;
      U.time.value = t;
      U.lit.value = scene.userData.lit ?? 0;
      if (grow < 1) { grow = Math.min(1, grow + dt / 1.6); g.scale.y = 1 - (1 - grow) ** 3; }
      // 발자국: 0.7m 걸을 때마다 새 자국, 오래된 자국은 바랜다
      for (const s of steps) s.z += dt;
      moved = Math.hypot(view.x - last.x, view.z - last.y);
      if (moved > 0.7) {
        last.set(view.x, view.z);
        const old = steps.reduce((a, b) => (b.z > a.z ? b : a));
        old.set(view.x, view.z, 0, 0);
      }
      design.update(dt, t, view);
    },
  };
}
