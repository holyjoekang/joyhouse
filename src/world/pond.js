import * as THREE from 'three';
import { mats } from './materials.js';
import { hanokRoof } from './roof.js';
import { rng, stoneLantern } from './nature.js';
import { textPlane } from '../ui3d/text.js';

// 물결 법선맵: 겹친 사인파로 그린 캔버스. 매 프레임 두 장을 서로 다른 방향으로 흘린다.
function rippleNormal() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
  const h = (x, y) => Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * 0.6 + Math.sin(y * 0.13 + x * 0.05) * 0.4 + Math.sin((x + y) * 0.21) * 0.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const n = new THREE.Vector3(-dx, -dy, 2).normalize(), i = (y * S + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 3);
  return t;
}

// 방지원도(方池圓島) 연못: 네모난 못 + 둥근 섬 + 소나무, 남쪽 둑에 정자.
export function buildPond(scene, { cx, cz, w, d }, blocks, clickables, plant) {
  const r = rng(5);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({
    color: 0x2c4a4c, roughness: 0.04, metalness: 0.1, normalMap: rippleNormal(), normalScale: new THREE.Vector2(0.35, 0.35),
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, 0.06, cz);       // 땅(0)보다 살짝 위: 둑돌이 물을 가둔다
  water.receiveShadow = true;
  scene.add(water);

  // 둑: 장대석
  const edge = 0.7;
  for (const [x, z, ew, ed] of [[cx, cz - d / 2 - edge / 2, w + edge * 2, edge], [cx, cz + d / 2 + edge / 2, w + edge * 2, edge],
    [cx - w / 2 - edge / 2, cz, edge, d], [cx + w / 2 + edge / 2, cz, edge, d]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(ew, 0.55, ed), mats.stoneWall);
    s.position.set(x, 0.12, z); s.castShadow = s.receiveShadow = true;
    scene.add(s);
  }
  blocks.push({ x0: cx - w / 2 - 0.2, x1: cx + w / 2 + 0.2, z0: cz - d / 2 - 0.2, z1: cz + d / 2 + 0.2 });

  // 둥근 섬과 소나무 한 그루
  const island = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.9, 24), mats.stoneWall);
  island.position.set(cx + w * 0.12, 0.2, cz - d * 0.05);
  scene.add(island);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.grass);
  mound.scale.y = 0.25; mound.position.set(island.position.x, 0.62, island.position.z);
  scene.add(mound);
  plant({ x: island.position.x, z: island.position.z, s: 0.75, kind: 'pine', rot: 1.2 });

  // 연잎
  const pad = new THREE.CircleGeometry(0.45, 14, 0.3, Math.PI * 2 - 0.4);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.6, side: THREE.DoubleSide });
  const pads = new THREE.InstancedMesh(pad, padMat, 26);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    const x = cx - w / 2 + 0.8 + r() * (w * 0.35), z = cz - d / 2 + 0.8 + r() * (d - 1.6), s = 0.6 + r() * 0.8;
    m.makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(r() * 6)).scale(new THREE.Vector3(s, s, s)).setPosition(x, 0.075, z);
    pads.setMatrixAt(i, m);
  }
  scene.add(pads);
  const lotus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2b8c8, roughness: 0.5 }), 6);
  for (let i = 0; i < 6; i++) { m.makeTranslation(cx - w / 2 + 1 + r() * w * 0.3, 0.16, cz - d / 2 + 1 + r() * (d - 2)); lotus.setMatrixAt(i, m); }
  scene.add(lotus);

  // 정자: 남쪽 둑 위, 기둥 넷 + 마루 + 난간 + 사모지붕
  const px = cx - w * 0.22, pz = cz + d / 2 + 2.6, ps = 4.2;
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(ps + 0.8, 0.5, ps + 0.8), mats.stoneWall);
  base.position.y = 0.25; base.castShadow = base.receiveShadow = true; g.add(base);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ps, 0.12, ps), mats.wood);
  floor.position.y = 0.56; g.add(floor);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 12), mats.wood);
    post.position.set(sx * (ps / 2 - 0.2), 2.0, sz * (ps / 2 - 0.2)); post.castShadow = true; g.add(post);
  }
  for (const [x, z, rw, rd] of [[0, -ps / 2 + 0.2, ps - 0.4, 0.06], [-ps / 2 + 0.2, 0, 0.06, ps - 0.4], [ps / 2 - 0.2, 0, 0.06, ps - 0.4]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.08, rd), mats.darkWood);
    rail.position.set(x, 1.25, z); g.add(rail);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ps, 0.25, ps), mats.darkWood);
  beam.position.y = 3.45; g.add(beam);
  g.add(hanokRoof({ box: [-ps / 2, -ps / 2, ps / 2, ps / 2], y: 3.6, rise: 2.0, overhang: 1.1, lift: 0.5, ridgeCap: false }));
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), mats.ridge);
  finial.position.y = 5.75; g.add(finial);
  const plate = textPlane({ width: 512, padding: 16, bg: '#2a1d14', border: '#c9a14a', radius: 6, align: 'center',
    lines: [{ text: '애련정 愛蓮亭', size: 48, weight: 700, color: '#e8c77a', font: 'serif' }] }, 1.2, { lit: true });
  plate.position.set(0, 3.2, ps / 2 + 0.01); g.add(plate);
  g.position.set(px, 0, pz);
  scene.add(g);
  g.userData.exhibit = { kind: 'sign', title: '애련정과 연못', body: '네모난 못에 둥근 섬을 띄운 방지원도(方池圓島). 땅은 네모나고 하늘은 둥글다는 옛 생각을 담은 한국 정원의 연못입니다.',
    face: { x: px, z: pz + 7, yaw: 0 } };
  clickables.push(g);

  stoneLantern(scene, cx + w / 2 + 1.6, cz + d / 2 + 1.6, 0.9);
  stoneLantern(scene, cx - w / 2 - 1.6, cz + d / 2 + 1.6, 0.9);

  return dt => {
    water.material.normalMap.offset.x += dt * 0.012;
    water.material.normalMap.offset.y += dt * 0.007;
  };
}

// 토리 동상: 받침돌 위 청동 강아지
export function toriStatue(scene, x, z, clickables) {
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.35, metalness: 0.85 });
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.0), mats.stone);
  ped.position.y = 0.45; ped.castShadow = true; g.add(ped);
  const dog = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 12), bronze);
  body.rotation.z = Math.PI / 2; body.position.set(0, 0.36, 0); dog.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bronze);
  head.position.set(0.36, 0.56, 0); dog.add(head);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.1, 4, 8), bronze);
  snout.rotation.z = Math.PI / 2; snout.position.set(0.52, 0.51, 0); dog.add(snout);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 8), bronze);
    ear.position.set(0.32, 0.72, s * 0.09); ear.rotation.x = s * 0.25; dog.add(ear);
    for (const fx of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 8), bronze);
      leg.position.set(fx, 0.14, s * 0.09); dog.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), bronze);
  tail.position.set(-0.34, 0.5, 0); tail.rotation.z = 0.6; dog.add(tail);
  dog.position.y = 0.9; dog.rotation.y = -Math.PI / 2; dog.scale.setScalar(2.2);
  dog.traverse(o => { o.castShadow = true; });
  g.add(dog);
  const plate = textPlane({ width: 512, padding: 14, bg: '#3a2f22', radius: 4, align: 'center',
    lines: [{ text: '토리', size: 56, weight: 700, color: '#e8d2a0', font: 'serif' }] }, 0.6, { lit: true });
  plate.position.set(0, 0.5, 0.51); g.add(plate);
  g.position.set(x, 0, z);
  scene.add(g);
  g.userData.exhibit = { kind: 'sign', title: '토리', body: '토리아빠의 토리. 로즈가든 한가운데에서 집을 지킵니다. 2단계에 토리 사진 앨범을 이 둘레에 겁니다.',
    face: { x, z: z + 3.2, yaw: 0 } };
  clickables.push(g);
}
