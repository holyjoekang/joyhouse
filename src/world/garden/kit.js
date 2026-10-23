import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../nature.js';
export { rng };

// 판도라 정원 공용 도구. 빛나는 것은 모두 조명 없는 재질(MeshBasic)이라 광원·그림자 비용이 없다.
// 낮에는 파스텔 식물색, 밤(lit → 1)에는 1을 넘는 밝기로 빛번짐(post의 bloom)이 걸린다.
export const U = {
  time: { value: 0 }, lit: { value: 0 },
  steps: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, 99, 0)) },   // 발자국 (x, z, 지난 시간)
};

// opts: day/night = 낮·밤 밝기 배수, pulse = 숨쉬듯 깜박임, tip = 끝 색(높이에 따라 섞는다),
// sway = 바람 흔들림(m), hang = 위에서 아래로 늘어진 모양(지오메트리 y 0 → -1)
export function glow(color, { day = 0.6, night = 2.2, pulse = 0.25, speed = 1.1, tip = null, sway = 0, hang = false, opacity = 1, additive = false } = {}) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide, opacity,
    transparent: opacity < 1 || additive, depthWrite: !additive && opacity >= 1, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const tipC = new THREE.Color(tip ?? color);
  const f = v => v.toFixed(3);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uT: U.time, uLit: U.lit, uTip: { value: tipC } });
    sh.vertexShader = 'uniform float uT;\nvarying float vPh;\nvarying float vK;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 org = vec3(0.0);
        #ifdef USE_INSTANCING
          org = instanceMatrix[3].xyz;
        #endif
        vPh = org.x * 0.37 + org.z * 0.23;
        vK = clamp(${hang ? '-position.y' : 'position.y'}, 0.0, 1.0);`)
      .replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        float sw = vK * vK * ${f(sway)};
        mvPosition.x += sin(uT * 0.8 + vPh) * sw;
        mvPosition.z += sin(uT * 0.6 + vPh * 1.7) * sw * 0.6;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = 'uniform float uT;\nuniform float uLit;\nuniform vec3 uTip;\nvarying float vPh;\nvarying float vK;\n' + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float pul = 1.0 + ${f(pulse)} * sin(uT * ${f(speed)} + vPh * 3.0);
        vec3 base = mix(diffuse, uTip, vK);
        vec4 diffuseColor = vec4(base * mix(${f(day)}, ${f(night * 0.6)} * pul, uLit), opacity);`);
  };
  m.customProgramCacheKey = () => ['glow', day, night, pulse, speed, sway, hang].join();
  return m;
}

// 어두운 몸체(나무껍질·바위): 조명을 받는 보통 재질
export const body = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });

// 같은 지오메트리를 여러 자리에. spots: [{x, y, z, s | sx sy sz, ry, rx, rz, c}]
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function matrixOf(o) {
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ');
  return _m.compose(_p.set(o.x, o.y || 0, o.z), _q.setFromEuler(_e), _s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1));
}
export function instances(parent, geo, mat, spots) {
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const c = new THREE.Color();
  spots.forEach((o, i) => { im.setMatrixAt(i, matrixOf(o)); if (o.c !== undefined) im.setColorAt(i, c.set(o.c)); });
  im.computeBoundingSphere();
  parent.add(im);
  return im;
}

// 늘어진 덩굴 한 가닥: 위 끝이 0, 아래 끝이 -1
export const strand = (r0 = 0.04, r1 = 0.015) => new THREE.CylinderGeometry(r0, r1, 1, 3, 8, true).translate(0, -0.5, 0);
// 땅에서 솟은 풀잎 하나: 아래 0, 위 1
export function blade(w = 0.12) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, 0.5, 0, w * 0.6, 0.5, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  return g;
}

// 풀포기: 잎 n장을 둥글게 벌려 세운 한 포기
export function tuft(n = 6, w = 0.05, lean = 0.45) {
  return mergeGeometries(Array.from({ length: n }, (_, i) => blade(w).rotateX(-lean * (0.6 + (i % 3) * 0.25)).rotateY(i / n * Math.PI * 2 + i)));
}

function dotTexture(colors, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 512, y = r() * 512, s = 1 + r() * r() * 6;
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 2.4);
    const col = colors[Math.floor(r() * colors.length)];
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - s * 2.4, y - s * 2.4, s * 4.8, s * 4.8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 빛 이끼: 땅에 깔린 반짝이 점. 밤에 빛나고, 밟은 자리는 한동안 환하게 번진다(아바타의 발광 이끼).
export function moss(parent, { x, z, r, colors, step = 0xbff6ff, seed = 5, repeat = 10 }) {
  const map = dotTexture(colors, seed);
  map.repeat.set(repeat, repeat);
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const stepC = new THREE.Color(step);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uT: U.time, uLit: U.lit, uSteps: U.steps, uStep: { value: stepC }, uR: { value: r } });
    sh.vertexShader = 'varying vec3 vW;\nvarying vec2 vL;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = position.xy;\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uT;\nuniform float uLit;\nuniform vec4 uSteps[10];\nuniform vec3 uStep;\nuniform float uR;\nvarying vec3 vW;\nvarying vec2 vL;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        float edge = 1.0 - smoothstep(uR * 0.72, uR, length(vL));
        float tw = 0.75 + 0.25 * sin(uT * 1.3 + vW.x * 0.7 + vW.z * 0.5);
        float hit = 0.0;
        for (int i = 0; i < 10; i++) {
          float d = distance(vW.xz, uSteps[i].xy), a = uSteps[i].z;
          hit += (1.0 - smoothstep(0.0, 1.6 + a * 0.9, d)) * exp(-a * 0.55);
        }
        hit = min(hit, 1.6) * uLit;
        diffuseColor.rgb = diffuseColor.rgb * mix(0.2, 0.45 * tw, uLit) + uStep * hit * 0.8;
        diffuseColor.a = edge;`);
  };
  m.customProgramCacheKey = () => 'moss';
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 48), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.06, z);
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

// 떠다니는 빛 알갱이(씨앗 정령·반딧불·포자). rise > 0 이면 천천히 떠오르며 순환한다.
export function motes(parent, { count, x, z, r, y0 = 0.5, y1 = 10, color, size = 0.35, rise = 0, wander = 1.5, seed = 9, day = 0.25 }) {
  const rand = rng(seed);
  const pos = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
    pos.set([x + Math.cos(a) * d, y0 + rand() * (y1 - y0), z + Math.sin(a) * d], i * 3);
    ph[i] = rand() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, (y0 + y1) / 2, z), r + y1);
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: U.time, uLit: U.lit, uC: { value: new THREE.Color(color) }, uS: { value: size * 420 }, uY: { value: new THREE.Vector3(y0, y1, rise) }, uW: { value: wander }, uDay: { value: day } },
    vertexShader: `uniform float uT; uniform float uS; uniform vec3 uY; uniform float uW; attribute float aPh; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uT * 0.21 + aPh) * uW + sin(uT * 0.53 + aPh * 2.1) * uW * 0.3;
        p.z += cos(uT * 0.17 + aPh * 1.3) * uW;
        p.y += sin(uT * 0.4 + aPh * 3.0) * 0.4;
        if (uY.z > 0.0) p.y = uY.x + mod(p.y - uY.x + uT * uY.z, uY.y - uY.x);
        vA = 0.55 + 0.45 * sin(uT * 2.2 + aPh * 7.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uS * (0.6 + 0.4 * vA) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uC; uniform float uLit; uniform float uDay; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a * a * vA * mix(uDay, 1.0, uLit);
        gl_FragColor = vec4(uC * (0.8 + 1.2 * smoothstep(0.18, 0.0, d)), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, m);
  parent.add(pts);
  return pts;
}

// 굽은 길 따라 빛나는 디딤돌
export function glowPath(parent, pts, mat, { gap = 1.15, r = 0.42, seed = 3 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const n = Math.round(curve.getLength() / gap), rand = rng(seed);
  const spots = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    spots.push({ x: p.x + (rand() - 0.5) * 0.3, y: 0.05, z: p.z + (rand() - 0.5) * 0.3, sx: 0.8 + rand() * 0.4, sz: 0.8 + rand() * 0.4, sy: 1, ry: rand() * 3 });
  }
  return instances(parent, new THREE.CylinderGeometry(r, r * 1.1, 0.08, 9), mat, spots);
}
