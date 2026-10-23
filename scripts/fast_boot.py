"""3D 첫 화면을 3초 안에: 첫 프레임에는 하늘·땅·박석길·대문만 그리고, 나머지는 첫 화면 뒤에 단계별로 들인다.

단계(main.js 가 차례로 돌린다. 단계마다 무대 밖 그룹에 짓고 셰이더를 컴파일한 뒤 장면에 들인다):
  본채 → 앞뜰(꽃담·연표·담·화단·석등·로즈가든·정관헌·앞뜰 풀) → 연못·개울·안내판·나무·먼 산 → 북촌 골목
  → 스마트팜(코드 파일째 나중에) → 개울 풀숲. 판도라 정원은 전처럼 다가갈 때.
주소에 #/room/<id> 가 있으면 본채만은 첫 프레임 전에 짓는다. 여러 번 돌려도 같은 결과."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def patch(path, old, new):
    t = path.read_text()
    if new and new in t: return
    if not new and old not in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:60]}"
    path.write_text(t.replace(old, new))


# 0) pandora_garden.py: 지우는 patch(new="")가 늘 건너뛰던 버그를 고친다(그 탓에 스마트팜·개울 풀숲이 두 번 지어졌다)
patch(ROOT / "scripts/pandora_garden.py", "    if new in t: return\n", "    if new and new in t: return\n    if not new and old not in t: return\n")

# 1) site.js: buildSite 는 첫 화면 몫만, 나머지는 stages 로
s = SRC / "world/site.js"
patch(s, "import { buildFarm } from './farm.js';\n", "")
t = s.read_text()
head = "export function buildSite(scene, renderer, house, timeline, { shadows, phone }) {\n  const blocks = [], clickables = [], tickers = [];\n"
if head in t:
    a = t.index("  const gate = sotdaemun(scene, house.plaque, blocks);\n")
    b = t.index("    update(dt) {\n", a)
    body = """  const gate = sotdaemun(scene, house.plaque, blocks);
  const plantLater = [];
  let stream = null;

  // 첫 화면 뒤에 들이는 것들. 단계마다 into(무대 밖 그룹)에 짓는다. main 이 셰이더를 컴파일한 뒤 장면에 옮긴다.
  const stages = [
    ['앞뜰', async (into, { data }) => {
      flowerWall(into, blocks);
      milestones(into, await data('data/timeline.json') || [], clickables);
      // 생울타리: 잔디길 양옆, 연못·로즈가든 디딤돌 자리는 틔운다
      // 대문에서 이어지는 첫 구간은 덕수궁 돌담길, 집 쪽은 생울타리
      doldam(into, [[5.6, -3, 6.6, -9.5], [5.6, -13.5, 6.6, -21], [-6.6, -3, -5.6, -21]], blocks);
      hedges(into, [
        [5.6, -21, 6.6, -33, 0.9], [5.6, -39, 6.6, -52, 0.9],
        [-6.6, -27, -5.6, -52, 0.9],
      ], blocks);
      flowerBeds(into, [
        [7.2, -2.2, 13, -3.8, [0xd94060, 0xf6f0e8, 0x9a5ac8]], [-13, -2.2, -7.2, -3.8, [0xd94060, 0xf6f0e8, 0x9a5ac8]],
      ]);
      for (const x of [-9.5, 9.5]) {
        const g = stoneLantern(into, x, -53.2);
        g.children[g.children.length - 1].material = lights.glass;   // 화사석 불빛도 밤에만 켠다
        lights.add(x, 1.61, -53.2, 0, 0.6);
      }
      nightLights(into, lights, blocks);
      roseGarden(into, clickables, blocks);
      jeonggwanheon(into, blocks);
      steppingStones(into, [[3.6, -11.5], [PAVILION.cx, -11.5]]);
      steppingStones(into, [[3.6, -36], [ROSE.cx - 10, -36]]);
      steppingStones(into, [[-3.6, -24], [POND.cx + 3, -24]]);
      // 풀잎: 잔디길 양쪽 앞뜰
      const avoid = (x, z) => Math.abs(x) < 3.3 || (Math.abs(x) > 5.4 && Math.abs(x) < 6.8) ||
        Math.hypot(x - POND.cx, z - POND.cz) < 13 || Math.hypot(x - ROSE.cx, z - ROSE.cz) < 13 ||
        (Math.abs(x - PAVILION.cx) < 7 && Math.abs(z - PAVILION.cz) < 5.5);
      tickers.push(grassField(into, [{ x0: -34, x1: 34, z0: -54, z1: -1 }], phone ? 16000 : 70000, avoid));
    }],
    ['연못·개울·나무', into => {
      // 나무: 소나무 숲, 앞마당 은행나무 한 쌍, 대문 곁 느티나무, 집 둘레 단풍
      const r = rng(42), spots = [];
      const ok = (x, z) => !(Math.abs(x) < 84 && z < -52 && z > -98) && !(Math.abs(x) < 9) &&
        !(Math.hypot(x - POND.cx, z - POND.cz) < 15) && !(Math.hypot(x - ROSE.cx, z - ROSE.cz) < 15) && !(Math.hypot(x - PAVILION.cx, z - PAVILION.cz) < 11) && !(z > -1 && z < 1.5) &&
        !(x < -10 && z > 1.5);   // 대문 밖 서쪽은 북촌 골목 자리
      for (let i = 0; i < 160 && spots.length < 70; i++) {
        const x = (r() < 0.5 ? -1 : 1) * (14 + r() * 76), z = 10 - r() * 120;
        if (ok(x, z)) spots.push({ x, z, s: 0.8 + r() * 0.5, kind: r() < 0.72 ? 'pine' : 'maple', rot: r() * 6 });
      }
      for (const x of [-15.5, 15.5]) spots.push({ x, z: -50.5, s: 1.25, kind: 'ginkgo', rot: x });
      spots.push({ x: 15, z: -7, s: 1.6, kind: 'zelkova', rot: 2 });
      for (const [x, z] of [[-30, -58], [30, -58], [-80, -60], [80, -60], [-26, -100], [26, -100]]) spots.push({ x, z, s: 1.0, kind: 'maple', rot: x });
      tickers.push(buildPond(into, POND, blocks, clickables, s => plantLater.push(s)));
      stream = buildStream(into, { blocks, clickables, lights, phone, plant: s => plantLater.push(s) });
      tickers.push(stream.tick);
      buildGuide(into, house, { pond: POND }, { blocks, clickables });
      buildSigns(into, house, { blocks, clickables });
      plantTrees(into, [...spots, ...plantLater], blocks);
      mountains(into);
    }],
    ['북촌 골목', into => buildBukchon(into, house.street, { blocks, clickables, lights })],
    ['스마트팜', async into => {
      if (!house.farm) return;
      const { buildFarm } = await import('./farm.js');   // 코드 파일째 나중에 받는다
      buildFarm(into, house.farm, { blocks, clickables, tickers, phone });
    }],
    ['개울 풀숲', into => { if (stream) tickers.push(grassField(into, [stream.grass.area], phone ? 8000 : 30000, stream.grass.avoid)); }],
  ];

  return {
    sky, sun, hemi, lights, stages,
    groundAt: bukchonGround,
    // 단계 하나를 지은 뒤: 새 등기구의 빛 웅덩이, 그림자 다시 그리기
    settle() { lights.build(); renderer.shadowMap.needsUpdate = true; },
"""
    t = t[:t.index(head)] + "export function buildSite(scene, renderer, house, { shadows, phone }, { blocks, clickables }) {\n  const tickers = [];\n" + t[t.index(head) + len(head):a] + body + t[b:]
    s.write_text(t)

# 2) main.js
m = SRC / "main.js"
patch(m, """// 첫 화면에 필요한 것만 먼저: 집 배치 + 연표 + 방 목록(작은 JSON). 서로 기다리지 않고 함께 받는다.
""", """// 첫 화면에 필요한 것만 먼저: 집 배치(작은 JSON) → 하늘·땅·박석길·대문. 본채와 나머지 정원은 첫 화면 뒤에 단계별로.
""")
patch(m, """const [house, timeline] = await Promise.all([data('content/house.json'), data('data/timeline.json')]);
const specs = Object.fromEntries(await Promise.all(house.rooms
  .filter(r => r.stage === 1 && r.wing !== 'hall' && (r.access !== 'family' || family))
  .map(async r => [r.id, await data(`content/rooms/${r.id}.json`)])));
await boot('정원을 가꾸는 중');
const site = buildSite(scene, renderer, house, timeline, { shadows: renderer.shadowMap.enabled, phone: engine.phone });
await boot('집을 짓는 중');
const building = buildBuilding(scene, house, { family, specs });
const clickables = [...site.clickables, ...building.clickables];
const tickers = [];
const blocks = [...building.blocks, ...site.blocks];   // 가구가 들어오면 여기에 더해진다 (충돌 판정이 같은 배열을 본다)
""", """const house = await data('content/house.json');
const clickables = [], tickers = [];
const blocks = [];   // 본채·정원·가구가 들어오면 여기에 더해진다 (충돌 판정이 같은 배열을 본다)
const site = buildSite(scene, renderer, house, { shadows: renderer.shadowMap.enabled, phone: engine.phone }, { blocks, clickables });
// 본채는 첫 화면 뒤에 짓는다(주소가 방을 가리키면 첫 화면 전에). 그때까지는 빈 집.
let specs = {};
let building = { ready: false, rooms: new Map(), roomAt: () => null, floors: [] };
let pendingRoom = null;

// 무대 밖 그룹에 짓고, 셰이더를 막지 않고 컴파일한 뒤 장면에 들인다(들이는 순간 화면이 멈추지 않게)
async function stageIn(build) {
  const into = new THREE.Group();
  into.userData = scene.userData;   // 스마트팜 온실이 밤 정도(lit)를 읽는다
  await build(into);
  await renderer.compileAsync(into, camera, scene).catch(() => {});
  if (into.children.length) scene.add(...into.children);
}
async function buildHouse() {
  specs = Object.fromEntries(await Promise.all(house.rooms
    .filter(r => r.stage === 1 && r.wing !== 'hall' && (r.access !== 'family' || family))
    .map(async r => [r.id, await data(`content/rooms/${r.id}.json`)])));
  await stageIn(into => {
    const b = buildBuilding(into, house, { family, specs });
    for (const r of b.rooms.values()) r.items.visible = false;
    blocks.push(...b.blocks);
    clickables.push(...b.clickables);
    building = Object.assign(b, { ready: true });
  });
  renderer.shadowMap.needsUpdate = true;
  here = undefined;   // 이름판·방 처리를 다시
  if (pendingRoom) { const id = pendingRoom; pendingRoom = null; goRoom(id); }
}
// 첫 화면 뒤: 본채 → 정원 단계들. 단계 사이엔 한 숨 쉰다.
async function growWorld() {
  const idle = () => new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 200 }));
  if (!building.ready) await buildHouse();
  for (const [name, build] of site.stages) {
    await idle();
    await stageIn(into => build(into, { data })).catch(e => console.warn(name, e));
    site.settle();
  }
  minimap.snapshot();
}
""")
patch(m, """function nearHouse(v) {
  if (entered || v.z > -38) return;""", """function nearHouse(v) {
  if (entered || v.z > -38 || !building.ready) return;""")
patch(m, """  const r = building.rooms.get(id);
  if (r) {""", """  if (!building.ready && house.rooms.some(r => r.id === id)) { pendingRoom = id; return; }   // 본채가 지어지면 간다
  const r = building.rooms.get(id);
  if (r) {""")
patch(m, """for (const r of building.rooms.values()) r.items.visible = false;
if (router.initial) goRoom(router.initial);
""", """if (router.initial) { await boot('집을 짓는 중'); await buildHouse(); goRoom(router.initial); }
""")
patch(m, """  // 먼 곳(스마트팜·개울 풀숲)은 첫 화면이 뜬 뒤 한가할 때 짓는다
  (window.requestIdleCallback || setTimeout)(() => site.later({ blocks, clickables })
    .then(() => renderer.compileAsync(scene, camera)).then(() => minimap.snapshot()).catch(e => console.warn('later', e)), { timeout: 1500 });
""", """  // 본채와 나머지 정원은 첫 화면이 뜬 뒤 차례로 들인다
  const grown = growWorld().catch(e => console.warn('grow', e));
""")
patch(m, """  loadTextures(renderer, OUTDOOR_TEX).then(() => {
    minimap.snapshot();
    if (lowQuality) return;""", """  Promise.all([loadTextures(renderer, OUTDOOR_TEX), grown]).then(() => {
    minimap.snapshot();
    if (lowQuality) return;""")
patch(m, "window.__joyhouse = { walker, goRoom, building, hud,", "window.__joyhouse = { walker, goRoom, get building() { return building; }, hud,")
# 3) 하늘 환경광: 부드러운 하늘이라 128px 큐브로 충분하다(256의 1/4 일). 첫 화면 전에 굽는 것 중 가장 무겁다.
# 첫 굽기(첫 화면 전)는 64px, 그다음(날씨가 오거나 1분마다)부터 128px
patch(SRC / "world/sky.js", "envRT = pmrem.fromScene(envScene, 0.03);", "envRT = pmrem.fromScene(envScene, 0.03, 0.1, 100, { size: old ? 128 : 64 });")

# 4) README 로딩 순서
r = ROOT / "README.md"
patch(r, """1. **첫 화면**: three.js + 코드 + 작은 JSON(집 배치·연표·방 목록)만 받아 대문과 정원을 그린다. 그동안 로딩 화면을 보여 준다.
2. **첫 프레임 뒤**: 먼 곳(스마트팜 — 코드 파일째, 개울 풀숲)을 한가할 때 짓고, 바깥 텍스처(잔디·박석·기와·벽) → 후처리(주변광 차폐·빛번짐)를 붙인다.
""", """1. **첫 화면**(목표 3초 안): three.js + 코드 + `content/house.json`만 받아 하늘·땅·박석길·대문만 그린다. 하늘 환경광은 64px로 한 번만 굽는다.
2. **첫 프레임 뒤**: `site.stages` 차례로 — 본채 → 앞뜰(꽃담·연표·담·화단·로즈가든·정관헌·풀) → 연못·개울·안내판·나무·먼 산 → 북촌 골목
   → 스마트팜(코드 파일째) → 개울 풀숲. 단계마다 무대 밖 그룹에 짓고 셰이더를 컴파일한 뒤 들여 화면이 멈추지 않는다.
   본채가 서기 전에 방을 고르면 서는 대로 간다. 주소가 `#/room/<id>`면 본채만은 첫 화면 전에 짓는다.
   다 들이면 바깥 텍스처(잔디·박석·기와·벽) → 후처리(주변광 차폐·빛번짐)를 붙인다.
""")
print("ok")
