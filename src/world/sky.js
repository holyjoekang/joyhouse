import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// 물리 기반 하늘(대기 산란) + 같은 하늘에서 뽑은 환경광. 대리석·유리·물이 하늘을 비춘다.
// 해 위치와 날씨가 바뀌면 update()로 하늘·환경광을 다시 만든다. 구름 덮개와 별은 카메라를 따라다닌다.
export function buildSky(scene, renderer, sunDir) {
  const make = () => {
    const sky = new Sky();
    sky.scale.setScalar(1000);
    const u = sky.material.uniforms;
    u.turbidity.value = 3.2;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(sunDir);
    return sky;
  };
  const sky = make();
  scene.add(sky);

  // 흐린 날의 구름 덮개: 하늘 위에 덧씌우는 반투명 반구 (먼 산보다 뒤에 있다)
  const veil = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshBasicMaterial({ color: 0xb9c0c8, transparent: true, opacity: 0, side: THREE.BackSide, fog: false, depthWrite: false }));
  veil.renderOrder = 1;
  veil.userData.noMap = true;
  scene.add(veil);

  // 별: 밤이고 맑을수록 보인다
  const n = 1400, pos = new Float32Array(n * 3);
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, y = 0.08 + r() * 0.92, k = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * k * 780, y * 780, Math.sin(a) * k * 780], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe8eeff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.renderOrder = 1;
  stars.userData.noMap = true;
  scene.add(stars);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = make();
  envScene.add(envSky);
  // 땅이 반사광에 섞이도록 아래 반구를 풀빛으로 막는다
  const ground = new THREE.Mesh(new THREE.SphereGeometry(900, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4a5a3a, side: THREE.BackSide }));
  envScene.add(ground);
  let envRT = null;
  function bakeEnv() {
    const old = envRT;
    envRT = pmrem.fromScene(envScene, 0.03);
    scene.environment = envRT.texture;
    old?.dispose();
  }
  bakeEnv();
  scene.environmentIntensity = 0.55;

  // dir: 해 방향(지평선 아래면 y < 0). a = 대기 상태 { turbidity, rayleigh, cloud(0..1), cloudColor, stars(0..1), groundColor }
  function update(dir, a) {
    for (const m of [sky, envSky]) {
      const u = m.material.uniforms;
      u.sunPosition.value.copy(dir);
      u.turbidity.value = a.turbidity;
      u.rayleigh.value = a.rayleigh;
      u.mieCoefficient.value = a.mie;
    }
    veil.material.color.set(a.cloudColor);
    veil.material.opacity = a.cloud;
    stars.material.opacity = a.stars;
    ground.material.color.set(a.groundColor);
    bakeEnv();
  }
  function follow(cam) { veil.position.set(cam.x, 0, cam.z); stars.position.set(cam.x, 0, cam.z); }

  return { sky, update, follow };
}
