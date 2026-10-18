import * as THREE from 'three';
import { mats } from '../world/materials.js';
import { textPlane } from '../ui3d/text.js';

// 포털 문: 한옥 문틀 안에 물결치는 빛. 사이트 연결은 마지막 단계에서 붙는다.
export function makePortal(item) {
  const w = 2.2, h = 3.0;
  const group = new THREE.Group();
  for (const x of [-w / 2 - 0.12, w / 2 + 0.12]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.24, h + 0.3, 0.3), mats.wood);
    p.position.set(x, (h + 0.3) / 2, 0.15); p.castShadow = true; group.add(p);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.28, 0.34), mats.wood);
  lintel.position.set(0, h + 0.4, 0.15); group.add(lintel);

  const uniforms = { time: { value: 0 }, tint: { value: new THREE.Color(item.color || 0x3b6fd8) } };
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float time; uniform vec3 tint; varying vec2 vUv;
      void main(){ vec2 p = vUv - .5; float r = length(p * vec2(1., .75));
        float wave = .5 + .5 * sin(r * 26. - time * 2.2);
        float edge = smoothstep(.55, .2, r);
        gl_FragColor = vec4(mix(tint, vec3(1.), wave * .35) * (.7 + .5 * edge), .92); }`,
  }));
  glow.position.set(0, h / 2, 0.12);
  group.add(glow);

  const plate = textPlane({ width: 768, padding: 22, bg: '#2a1d14', border: '#c9a14a', radius: 8, align: 'center',
    lines: [{ text: item.label, size: 64, weight: 700, color: '#e8c77a', font: 'serif' }] }, 1.9, { lit: true });
  plate.position.set(0, h + 0.62 + plate.userData.height / 2, 0.34);
  group.add(plate);
  const note = textPlane({ width: 768, padding: 18, bg: '#f4eedf', radius: 8, align: 'center',
    lines: [{ text: '눌러서 들어가기', size: 40, color: '#5b5245' }] }, 1.4, { lit: true });
  note.position.set(0, 0.35, 0.2);
  group.add(note);

  group.userData.exhibit = {
    kind: 'portal', title: item.label,
    body: `${item.note || ''}\n이 문을 지나면 ${item.url ? item.url.replace('https://', '') : '사이트'}로 이어집니다.`.trim(),
    url: item.url,
  };
  group.userData.tick = (dt, t) => { uniforms.time.value = t; };
  return group;
}
