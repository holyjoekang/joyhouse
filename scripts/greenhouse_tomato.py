"""스마트팜 온실: 낮엔 맑은 유리(조명 끔), 밤엔 LED로 주황빛. 북쪽 문으로 들어가 방울토마토 고랑 사이를 걷는다.
여러 번 돌려도 같은 결과."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "src/world"

def patch(path, old, new):
    t = path.read_text()
    if new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:50]}"
    path.write_text(t.replace(old, new))

# 1) 하늘이 정한 밤 정도(lit 0..1)를 장면에 남긴다 — 스마트팜이 읽는다
patch(W / "atmosphere.js", "    lights.setLevel(lit);\n", "    lights.setLevel(lit);\n    scene.userData.lit = lit;   // 스마트팜 온실 LED가 읽는다\n")

f = W / "farm.js"
# 2) 낮 유리 / 밤 LED 재질
patch(f, "  glass: new THREE.MeshPhysicalMaterial({ color: 0xffad3f, emissive: 0xff7a00, emissiveIntensity: 0.72, transparent: true, opacity: 0.78, roughness: 0.28, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false }),",
"""  glass: new THREE.MeshPhysicalMaterial({ color: 0xffad3f, emissive: 0xff7a00, emissiveIntensity: 0.72, transparent: true, opacity: 0.78, roughness: 0.28, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false }),
  ledBar: std({ color: 0x333333, emissive: 0xff8a3d, emissiveIntensity: 0 }),
  vine: std({ color: 0x3f7a35, roughness: 0.85 }),
  leaf: std({ color: 0x2f6b2c, roughness: 0.8, side: THREE.DoubleSide }),
  tomato: std({ color: 0xffffff, roughness: 0.35 }),
  bag: std({ color: 0xe9e7df, roughness: 0.9 }),
  gutter: std({ color: 0x9aa3a0, roughness: 0.5, metalness: 0.4 }),""")

# 3) 온실: 문 + 고랑 + 방울토마토
old_start = "  // ── 가운데: 유리온실 6동. 박공 지붕, 5m 간격 철골, 3m 간격 작물 줄"
old_end = "  instanced(scene, new THREE.BoxGeometry(0.35, 0.9, 0.35), M.crop, stems);\n"
t = f.read_text()
if "방울토마토" not in t:
    a, b = t.index(old_start), t.index(old_end) + len(old_end)
    new = """  // ── 가운데: 유리온실 6동. 박공 지붕, 5m 간격 철골. 북쪽 박공에 미닫이 문, 안은 방울토마토 고랑
  const ghW = 24, ghL = 42, wallH = 7.4, ridgeH = 10.2, base = 0.4, DOOR = 2.4;
  const ROWS = [-8.5, -5.5, -2.5, 2.5, 5.5, 8.5], STEP = phone ? 1.6 : 0.8;
  const frames = [], bags = [], gutters = [], vines = [], leaves = [], fruit = [], leds = [], doors = [];
  const rr = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  let n = 1;
  for (const dz of [30, 78, 126]) for (const dx of [-19, 19]) {
    const gx = X(dx), gz0 = Z(dz), gz = gz0 + ghL / 2, ax = gx - ghW / 2, bx = gx + ghW / 2;
    const floor = box(scene, ghW, 0.05, ghL, M.soil, gx, 0.025, gz); floor.userData.floor = 'outside';
    const env = new THREE.Mesh(new THREE.BoxGeometry(ghW, wallH, ghL), M.glass); env.position.set(gx, base + wallH / 2, gz); scene.add(env);
    const v = (x, y, z) => new THREE.Vector3(x, y, z), top = base + wallH, rid = base + ridgeH;
    for (const ex of [ax, bx]) {
      const g = new THREE.BufferGeometry().setFromPoints([v(ex, top, gz0), v(gx, rid, gz0), v(gx, rid, gz0 + ghL), v(ex, top, gz0), v(gx, rid, gz0 + ghL), v(ex, top, gz0 + ghL)]);
      g.computeVertexNormals(); scene.add(new THREE.Mesh(g, M.glass));
    }
    for (const ez of [gz0, gz0 + ghL]) {
      const g = new THREE.BufferGeometry().setFromPoints([v(ax, top, ez), v(bx, top, ez), v(gx, rid, ez)]);
      g.computeVertexNormals(); scene.add(new THREE.Mesh(g, M.glass));
    }
    for (let z = gz0; z <= gz0 + ghL + 0.1; z += ghL / 8) {
      frames.push([v(ax, base, z), v(ax, top, z)], [v(bx, base, z), v(bx, top, z)], [v(ax, top, z), v(gx, rid, z)], [v(bx, top, z), v(gx, rid, z)]);
    }
    frames.push([v(gx, rid, gz0), v(gx, rid, gz0 + ghL)], [v(ax, top, gz0), v(ax, top, gz0 + ghL)], [v(bx, top, gz0), v(bx, top, gz0 + ghL)]);
    // 문틀과 열어 둔 미닫이 두 짝
    frames.push([v(gx - DOOR / 2, 0, gz0), v(gx - DOOR / 2, 2.7, gz0)], [v(gx + DOOR / 2, 0, gz0), v(gx + DOOR / 2, 2.7, gz0)], [v(gx - DOOR / 2, 2.7, gz0), v(gx + DOOR / 2, 2.7, gz0)]);
    for (const s of [-1, 1]) doors.push({ x: gx + s * (DOOR + 0.05), y: 1.35, z: gz0 - 0.08 });
    // 벽 충돌: 북쪽 문 자리만 틔운다
    blocks.push({ x0: ax - 0.1, x1: ax + 0.1, z0: gz0, z1: gz0 + ghL }, { x0: bx - 0.1, x1: bx + 0.1, z0: gz0, z1: gz0 + ghL },
      { x0: ax, x1: bx, z0: gz0 + ghL - 0.1, z1: gz0 + ghL + 0.1 },
      { x0: ax, x1: gx - DOOR / 2, z0: gz0 - 0.1, z1: gz0 + 0.1 }, { x0: gx + DOOR / 2, x1: bx, z0: gz0 - 0.1, z1: gz0 + 0.1 });
    // 고랑: 걸이 거터 위 배지 + 높은 줄 유인 방울토마토. 가운데 통로와 북쪽 앞마당은 비운다.
    const r0 = gz0 + 3.5, r1 = gz0 + ghL - 1.5;
    for (const ox of ROWS) {
      const x = gx + ox;
      gutters.push({ x, y: 0.55, z: (r0 + r1) / 2 });
      bags.push({ x, y: 0.7, z: (r0 + r1) / 2 });
      blocks.push({ x0: x - 0.45, x1: x + 0.45, z0: r0, z1: r1 });
      for (let z = r0 + 0.3; z < r1; z += STEP) {
        const h = 2.2 + rr() * 0.5;
        vines.push({ x, y: 0.8 + h / 2, z, s: h });
        for (let k = 0; k < 4; k++) leaves.push({ x: x + (rr() - 0.5) * 0.5, y: 1.0 + k * 0.5 + rr() * 0.2, z: z + (rr() - 0.5) * 0.4, ry: rr() * 6, s: 0.8 + rr() * 0.5 });
        for (let k = 0; k < 3; k++) {   // 송이: 아래는 빨갛게 익고 위로 갈수록 덜 익었다
          const ty = 1.05 + k * 0.55 + rr() * 0.15, tx = x + (rr() < 0.5 ? -0.22 : 0.22), ripe = k === 0 ? 0.9 : k === 1 ? 0.6 : 0.2;
          for (let j = 0; j < 7; j++) fruit.push({ x: tx + (rr() - 0.5) * 0.14, y: ty - j * 0.045, z: z + (rr() - 0.5) * 0.14, ripe: rr() < ripe });
        }
      }
    }
    for (const ox of [-7, -1.2, 1.2, 7]) leds.push({ x: gx + ox, y: top - 0.4, z: gz });
    tag(scene, `온실 ${n++}`, 5, gx, 5.4, gz0 - 0.05, Math.PI);
  }
  beams(scene, frames, 0.12, M.frame);
  instanced(scene, new THREE.BoxGeometry(1.15, 2.6, 0.04), M.steel, doors);
  instanced(scene, new THREE.BoxGeometry(0.45, 0.06, ghL - 5), M.gutter, gutters);
  instanced(scene, new THREE.BoxGeometry(0.3, 0.16, ghL - 5.4), M.bag, bags);
  const vm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.02, 1, 5), M.vine, vines.length), mm = new THREE.Matrix4();
  vines.forEach((p, i) => vm.setMatrixAt(i, mm.makeScale(1, p.s, 1).setPosition(p.x, p.y, p.z)));
  scene.add(vm);
  instanced(scene, new THREE.IcosahedronGeometry(0.22, 0).scale(1.3, 0.55, 1), M.leaf, leaves);
  const tm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 7, 5), M.tomato, fruit.length), col = new THREE.Color();
  fruit.forEach((p, i) => { tm.setMatrixAt(i, mm.makeTranslation(p.x, p.y, p.z)); tm.setColorAt(i, col.setHex(p.ripe ? 0xd8261c : rr() < 0.5 ? 0xf08a24 : 0x8fb43a)); });
  scene.add(tm);
  instanced(scene, new THREE.BoxGeometry(0.12, 0.06, ghL - 2), M.ledBar, leds);

  // 낮엔 해가 비추는 맑은 유리, 밤엔 LED가 켜져 온실이 주황빛으로 빛난다
  const dayGlass = { color: new THREE.Color(0xe6f2ec), opacity: 0.32 }, nightGlass = { color: new THREE.Color(0xffad3f), opacity: 0.78 };
  tickers.push(() => {
    const lit = scene.userData.lit ?? 0;
    M.glass.color.copy(dayGlass.color).lerp(nightGlass.color, lit);
    M.glass.opacity = dayGlass.opacity + (nightGlass.opacity - dayGlass.opacity) * lit;
    M.glass.emissiveIntensity = 0.72 * lit;
    M.ledBar.emissiveIntensity = 2.5 * lit;
  });
"""
    t = t[:a] + new + t[b:]
    f.write_text(t)
print("greenhouse done")
