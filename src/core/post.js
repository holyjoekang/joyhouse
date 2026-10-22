import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// PC: 주변광 차폐(구석·틈이 자연스럽게 어두워진다) + 아주 약한 빛번짐(전구·하늘). 휴대폰은 끈다.
export function createPost(renderer, scene, camera, enabled) {
  if (!enabled) return { render: () => renderer.render(scene, camera), setSize() {} };
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    // 밤(v → 1)일수록 등불이 번지게
    setGlow(v) { bloom.strength = 0.18 + 0.55 * v; bloom.threshold = 0.92 - 0.32 * v; },
    setSize(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); },
  };
}
