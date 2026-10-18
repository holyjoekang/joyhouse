import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// 물리 기반 하늘(대기 산란) + 같은 하늘에서 뽑은 환경광. 대리석·유리·물이 하늘을 비춘다.
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

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(make());
  // 땅이 반사광에 섞이도록 아래 반구를 풀빛으로 막는다
  const ground = new THREE.Mesh(new THREE.SphereGeometry(900, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4a5a3a, side: THREE.BackSide }));
  envScene.add(ground);
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  return sky;
}
