import * as THREE from 'three';

// Renderer · Scene · Camera. 느린 기기에서는 해상도를 스스로 낮춘다.
export function createEngine(canvas) {
  const phone = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !phone });
  let ratio = Math.min(devicePixelRatio, phone ? 1.5 : 2);
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !phone;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfdcec, 120, 420);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);

  const listeners = [];
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    listeners.forEach(fn => fn(w, h));
  }
  addEventListener('resize', resize);

  // 2초마다 평균 프레임을 보고 30fps 밑이면 해상도를 한 단계 낮춘다
  let frames = 0, since = performance.now();
  function measure() {
    frames++;
    const now = performance.now();
    if (now - since < 2000) return;
    const fps = frames * 1000 / (now - since);
    frames = 0; since = now;
    if (fps < 30 && ratio > 1) {
      ratio = Math.max(1, ratio - 0.5);
      renderer.setPixelRatio(ratio);
      resize();
    }
  }

  return {
    renderer, scene, camera, phone,
    onResize(fn) { listeners.push(fn); },
    resize, measure,
  };
}
