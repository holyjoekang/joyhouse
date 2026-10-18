import * as THREE from 'three';
import { drawCard, texture } from './text.js';

// 화면에 붙는 3D 층. 직교 카메라로 두 번째 장면을 그린다. 좌표는 화면 픽셀(위가 0, 아래로 음수).
// 판은 얇은 상자라 빛을 받아 옆면이 보이고, 손가락이 올라가면 살짝 기운다.
const S = 2;      // 텍스처 해상도 배율

export class Hud {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
    this.camera.position.z = 1000;
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-0.5, 0.8, 1);
    this.scene.add(key);
    this.layouts = [];
    this.ray = new THREE.Raycaster();
    this.hovered = null;
    this.w = 1; this.h = 1;

    this.fader = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0d0b09, transparent: true, opacity: 0, depthTest: false }));
    this.fader.renderOrder = 999; this.fader.position.z = 900;
    this.scene.add(this.fader);
    this.add(this.fader, (w, h) => { this.fader.scale.set(w, h, 1); this.fader.position.set(w / 2, -h / 2, 900); });
  }

  // 글자 크기 기준: 화면 높이의 3% (16~24px)
  get fs() { return Math.max(16, Math.min(24, this.h * 0.03)); }

  // 판 하나. spec.lines의 size는 화면 픽셀. 높이는 글 길이로 정해진다.
  slab(spec, pxW, { depth = 10, color = 0x5a4430, onClick = null } = {}) {
    const side = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const face = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });   // 글자는 조명 없이 또렷하게
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [side, side, side, side, face, side]);
    mesh.userData.onClick = onClick;
    mesh.userData.depth = depth;
    this.setSlab(mesh, spec, pxW);
    this.scene.add(mesh);
    return mesh;
  }

  setSlab(mesh, spec, pxW) {
    const scaled = {
      ...spec, width: Math.round(pxW * S), padding: (spec.padding ?? 14) * S, radius: (spec.radius ?? 10) * S,
      minHeight: (spec.minHeight || 0) * S,
      lines: (spec.lines || []).map(l => ({ ...l, size: l.size * S, gap: (l.gap ?? 4) * S })),
    };
    const canvas = drawCard(scaled);
    const face = mesh.material[4];
    face.map?.dispose();
    face.map = texture(canvas);
    face.needsUpdate = true;
    mesh.scale.set(pxW, canvas.height / S, mesh.userData.depth);
    mesh.userData.w = pxW; mesh.userData.h = canvas.height / S;
  }

  add(obj, layout) { this.layouts.push({ obj, layout }); if (this.w > 1) layout(this.w, this.h); }

  // 왼쪽 위 모서리 기준으로 놓는다
  place(obj, x, y, z = 0) { obj.position.set(x + obj.userData.w / 2, -(y + obj.userData.h / 2), z); }

  resize(w, h) {
    this.w = w; this.h = h;
    Object.assign(this.camera, { left: 0, right: w, top: 0, bottom: -h });
    this.camera.updateProjectionMatrix();
    this.layouts.forEach(l => l.layout(w, h));
  }

  pick(clientX, clientY, rect) {
    const p = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    const hit = this.ray.intersectObjects(this.scene.children, true).find(h => h.object.visible && h.object.userData.onClick && isShown(h.object));
    return hit ? hit.object : null;
  }

  // 무엇이든 눌렸으면 true (아래 3D 세상으로 클릭이 새지 않게)
  covers(clientX, clientY, rect) {
    const p = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    return this.ray.intersectObjects(this.scene.children, true).some(h => h.object !== this.fader && isShown(h.object) && !h.object.userData.passThrough);
  }

  hover(obj) {
    if (this.hovered === obj) return;
    if (this.hovered) this.hovered.userData.tilt = 0;
    this.hovered = obj;
    if (obj && !obj.userData.noTilt) obj.userData.tilt = 1;
  }

  update(dt) {
    this.scene.traverse(o => {
      if (o.userData.tilt === undefined) return;
      const t = o.userData.tilt || 0;
      o.rotation.x += ((t ? -0.25 : 0) - o.rotation.x) * Math.min(1, dt * 10);
      o.rotation.y += ((t ? 0.12 : 0) - o.rotation.y) * Math.min(1, dt * 10);
    });
  }

  fade(to, ms = 260, color = 0x0d0b09) {
    const m = this.fader.material, from = m.opacity, t0 = performance.now();
    if (to > 0) m.color.setHex(color);
    return new Promise(res => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        m.opacity = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }

  render(renderer) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
}

function isShown(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
