import * as THREE from 'three';
import { mats } from './materials.js';

// 밤의 조명: 등기구는 모두 그려 두고(빛나는 유리 + 바닥의 빛 웅덩이), 실제 광원은 몇 개만 두어
// 카메라에 가까운 등기구로 옮겨 다닌다. 광원 수가 늘 같으니 셰이더를 다시 컴파일하지 않는다.
const bronze = new THREE.MeshStandardMaterial({ color: 0x2b2520, roughness: 0.35, metalness: 0.85 });
// 등 유리: 낮에는 꺼진 유백색, 밤에는 톤매핑을 넘어 빛번짐이 걸리는 밝기
const glass = new THREE.MeshBasicMaterial({ color: 0xd9d2c4, toneMapped: false });
const DAY_GLASS = new THREE.Color(0xcfc8ba), NIGHT_GLASS = new THREE.Color(1, 0.8, 0.5);   // 1을 넘기면 흰색으로 잘린다: 빛번짐은 post의 문턱이 맡는다

function poolTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,200,130,1)'); r.addColorStop(0.35, 'rgba(255,170,90,0.45)'); r.addColorStop(1, 'rgba(255,150,70,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createLights(scene, { phone }) {
  const fixtures = [];
  let level = 0, since = 1;

  const pool = Array.from({ length: phone ? 4 : 8 }, () => {
    const l = new THREE.PointLight(0xffc27e, 0, 18, 2);
    scene.add(l);
    return l;
  });
  // 집 정면을 아래에서 비추는 투광등 둘
  const floods = [-1, 1].map(s => {
    const l = new THREE.SpotLight(0xffd6a0, 0, 45, 0.42, 0.7, 1.4);
    l.position.set(s * 13, 0.4, -46);
    l.target.position.set(s * 9, 7, -55);
    scene.add(l, l.target);
    return l;
  });

  // 등기구 하나: 빛 중심(x, y, z), 그 아래 바닥 높이 gy, 세기 power
  function add(x, y, z, gy = 0, power = 1) { fixtures.push({ x, y, z, gy, power }); }

  // 같은 모양을 여러 자리에: parts = [[geo, mat, dy], ...]
  function instanced(parts, spots) {
    const m = new THREE.Matrix4();
    for (const [geo, mat, dy] of parts) {
      const im = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach(([x, y, z], i) => im.setMatrixAt(i, m.makeTranslation(x, y + dy, z)));
      im.castShadow = mat !== glass;
      scene.add(im);
    }
  }

  // 정원 가로등: 막돌 받침 + 청동 기둥 + 육각 등갓 (빛 중심 3.68m)
  function gardenLamps(spots) {
    instanced([
      [new THREE.BoxGeometry(0.38, 0.42, 0.38), mats.stone, 0.21],
      [new THREE.CylinderGeometry(0.05, 0.075, 3.0, 10), bronze, 1.92],
      [new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10), mats.brass, 3.43],
      [new THREE.CylinderGeometry(0.17, 0.12, 0.46, 6), glass, 3.7],
      [new THREE.CylinderGeometry(0.03, 0.27, 0.24, 6), bronze, 4.04],
      [new THREE.SphereGeometry(0.045, 8, 6), mats.brass, 4.19],
    ], spots);
    spots.forEach(([x, y, z]) => add(x, y + 3.7, z, y));
  }

  // 담장 등: 꽃담에 붙은 작은 청동 등 (빛 중심 1.95m)
  function wallLamps(spots) {
    instanced([
      [new THREE.BoxGeometry(0.2, 0.34, 0.2), glass, 1.95],
      [new THREE.BoxGeometry(0.28, 0.06, 0.28), bronze, 2.15],
      [new THREE.BoxGeometry(0.16, 0.05, 0.16), bronze, 1.76],
    ], spots);
    spots.forEach(([x, y, z]) => add(x, y + 1.95, z, y, 0.7));
  }

  // 청사초롱: 처마 끝에 매다는 붉은·푸른 초롱
  function chorong(spots) {
    instanced([
      [new THREE.CylinderGeometry(0.2, 0.2, 0.44, 12), glass, 0],
      [new THREE.CylinderGeometry(0.21, 0.21, 0.1, 12), mats.lantern, 0.24],
      [new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), mats.fabricRed, -0.24],
      [new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), bronze, 0.55],
    ], spots);
    spots.forEach(([x, y, z, gy]) => add(x, y, z, gy ?? 0, 0.8));
  }

  // 바닥의 빛 웅덩이: 모든 등기구 아래 (build()에서 등기구가 다 모인 뒤 만든다)
  let pools = null;
  function build() {
    if (pools) { scene.remove(pools); pools.geometry.dispose(); pools.material.map.dispose(); pools.material.dispose(); }
    const near = fixtures.filter(f => f.y - f.gy < 8);
    const mat = new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, near.length);
    const m = new THREE.Matrix4();
    near.forEach((f, i) => { const s = 3 + (f.y - f.gy) * 1.1 * f.power; pools.setMatrixAt(i, m.makeScale(s, 1, s).setPosition(f.x, f.gy + 0.07, f.z)); });
    pools.renderOrder = 2;
    pools.material.opacity = 0.42 * level;
    scene.add(pools);
  }

  return {
    glass, add, gardenLamps, wallLamps, chorong, build,
    // 0 = 낮(꺼짐) … 1 = 밤
    setLevel(v) {
      level = v;
      glass.color.copy(DAY_GLASS).lerp(NIGHT_GLASS, v);
      if (pools) pools.material.opacity = 0.42 * v;
      floods.forEach(l => { l.intensity = 900 * v; });
      since = 1;
    },
    update(dt, cam) {
      if ((since += dt) < 0.4) return;
      since = 0;
      if (level <= 0.01) { pool.forEach(l => { l.intensity = 0; }); return; }
      const near = fixtures.map(f => [Math.hypot(f.x - cam.x, f.z - cam.z), f]).sort((a, b) => a[0] - b[0]).slice(0, pool.length);
      pool.forEach((l, i) => {
        const f = near[i]?.[1];
        if (!f) { l.intensity = 0; return; }
        l.position.set(f.x, f.y - 0.3, f.z);
        l.intensity = 38 * level * f.power;
      });
    },
  };
}
