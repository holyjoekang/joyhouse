import * as THREE from 'three';

// 미니맵: 집 전체를 위에서 한 번 찍어 둔 그림 + 지금 서 있는 자리를 가리키는 화살.
// 그림을 누르면 그 자리로 간다.
export function createMinimap(hud, renderer, scene, site, getView) {
  const W = site.x1 - site.x0, D = site.z0 - site.z1;
  const rt = new THREE.WebGLRenderTarget(512, Math.round(512 * D / W));
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.OrthographicCamera(site.x0, site.x1, -site.z1, -site.z0, 1, 400);
  cam.position.set(0, 200, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, 0, 0);
  // up = -z 이므로 화면 위쪽이 북(-z). left/right = x, top/bottom = -z 축 값
  cam.top = -site.z1; cam.bottom = -site.z0;
  cam.updateProjectionMatrix();

  function snapshot() {
    const fog = scene.fog; scene.fog = null;
    const hide = scene.children.filter(o => o.userData.noMap && o.visible);   // 비·눈·구름·별은 빼고 찍는다
    hide.forEach(o => { o.visible = false; });
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    hide.forEach(o => { o.visible = true; });
    scene.fog = fog;
  }

  const group = new THREE.Group();
  hud.scene.add(group);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3a2b1e, roughness: 0.6 }));
  const map = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }));
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 3), new THREE.MeshStandardMaterial({ color: 0xe0443a, emissive: 0x801a14 }));
  group.add(frame, map, arrow);
  let size = 160, ox = 0, oy = 0;
  map.userData.onClick = () => {};         // 실제 이동은 toGround로 main이 처리
  map.userData.noTilt = true;

  hud.add(group, (w, h) => {
    size = Math.max(120, Math.min(220, w * 0.28));
    const mh = size * D / W;
    ox = w - size - 16; oy = h - mh - 16;
    frame.scale.set(size + 12, mh + 12, 8);
    frame.position.set(ox + size / 2, -(oy + mh / 2), 0);
    map.scale.set(size, mh, 1);
    map.position.set(ox + size / 2, -(oy + mh / 2), 5);
    arrow.scale.setScalar(size / 18);
  });

  return {
    snapshot,
    update() {
      const v = getView();
      const mh = size * D / W;
      const u = (v.x - site.x0) / W, t = (v.z - site.z1) / D;
      arrow.position.set(ox + u * size, -(oy + t * mh), 10);
      arrow.rotation.z = v.yaw;
    },
    // 화면 좌표 → 미니맵 위인지, 위라면 땅 좌표
    toGround(px, py) {
      const mh = size * D / W;
      const u = (px - ox) / size, t = (py - oy) / mh;
      if (u < 0 || u > 1 || t < 0 || t > 1) return null;
      return { x: site.x0 + u * W, z: site.z1 + t * D };
    },
    get mesh() { return map; },
  };
}
