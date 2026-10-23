"""대문 밖 남쪽 빈터(개울과 스마트팜 사이)에 아바타풍 '판도라 정원'을 들이고, 3D 첫 로딩을 가볍게 한다.

- 정원: content/garden.json (디자인 3안, active 하나) + src/world/garden/*.js. 첫 화면에는 싣지 않고
  다가가거나 하늘에서 보거나 메뉴로 갈 때 고른 디자인 하나만 받는다. 점검: 3d.html?garden=souls|floating|forest
- 빠른 첫 화면: 스마트팜(파일째)과 개울 풀숲은 첫 프레임 뒤 한가할 때 짓고, 하늘 환경광을 두 번 굽지 않는다.
여러 번 돌려도 같은 결과."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
BOX = [30, 28, 104, 150]   # x0, z0, x1, z1 — 농장 길(z≈20) 남쪽, 개울 산책로 동쪽, 농장 울타리(x=122) 서쪽


def patch(path, old, new):
    t = path.read_text()
    if new and new in t: return
    if not new and old not in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:60]}"
    path.write_text(t.replace(old, new))


# 1) 정원 데이터
garden = {
    "_note": "판도라 정원(대문 밖 남쪽). box = [x0, z0, x1, z1]. active 를 souls|floating|forest|supertrees 중 하나로. 3d.html?garden=… 로 미리 본다.",
    "box": BOX,
    "active": "souls",
    "designs": [
        {"id": "souls", "name": "영혼의 나무", "sub": "분홍·보랏빛 덩굴이 드리운 거대한 버드나무",
         "body": "가운데 거대한 나무에서 빛나는 덩굴 천여 가닥이 땅까지 드리웁니다. 하얀 씨앗 정령이 둘레를 떠다니고, 뿌리 고리와 이끼가 밤에 숨쉬듯 빛납니다. 이끼를 밟으면 발자국이 번져 빛납니다."},
        {"id": "floating", "name": "할렐루야 부유섬", "sub": "공중에 뜬 바위섬과 빛나는 폭포",
         "body": "바위섬 여섯이 공중에 떠 천천히 오르내리고 섬 밑으로 청록 덩굴이 드리웁니다. 가장 큰 섬에서 빛 폭포가 연못으로 떨어지고, 바닥엔 물안개와 반딧불이 깔립니다. 바위 아치를 지나 들어갑니다."},
        {"id": "forest", "name": "빛의 숲", "sub": "푸른 버섯과 다가가면 숨는 나선 꽃",
         "body": "줄무늬로 빛나는 우산나무 아래 푸른 버섯 군락과 주황 나선 꽃(헬리코라디언)이 자랍니다. 나선 꽃은 다가가면 휙 말려 숨었다가 천천히 다시 핍니다. 땅에서는 푸른 포자가 피어오릅니다."},
        {"id": "supertrees", "name": "슈퍼트리 그로브", "sub": "싱가포르 가든스 바이 더 베이의 철골 나무 숲",
         "body": "16~34m 철골 나무 열한 그루가 숲을 이룹니다. 줄기는 풀과 꽃이 덮인 수직 정원, 꼭대기는 나팔처럼 벌어진 격자 우산입니다. 큰 두 그루를 하늘길이 잇고, 밤이면 격자에 불이 들어와 보라·파랑·초록·무지개로 바뀌는 빛의 쇼가 펼쳐집니다."},
    ],
}
gp = ROOT / "content/garden.json"
if gp.exists():
    garden["active"] = json.loads(gp.read_text()).get("active", garden["active"])   # 고른 안은 지킨다
if __import__("sys").argv[1:2]:
    garden["active"] = __import__("sys").argv[1]   # python scripts/pandora_garden.py supertrees
gp.write_text(json.dumps(garden, ensure_ascii=False, indent=2) + "\n")

# 2) 메뉴·이름판: 야외 목록에 정원 추가
hp = ROOT / "content/house.json"
act = next(d for d in garden["designs"] if d["id"] == garden["active"])   # 메뉴·이름판은 고른 안의 이름을 쓴다
entry = {"id": "pandora", "name": act["name"], "sub": act["sub"], "box": BOX}
line = json.dumps(entry, ensure_ascii=False)
t = re.sub(r'\{"id": "pandora"[^}]*\}, ', "", hp.read_text())
hp.write_text(t.replace('{"id": "farm", "name": "스마트팜"', line + ', {"id": "farm", "name": "스마트팜"', 1))
assert any(o["id"] == "pandora" for o in json.loads(hp.read_text())["outdoor"])

# 3) 빛 웅덩이를 다시 지을 수 있게(뒤에 지은 등기구도 웅덩이를 얻는다)
patch(SRC / "world/lights.js", """  function build() {
    const near""", """  function build() {
    if (pools) { scene.remove(pools); pools.geometry.dispose(); pools.material.map.dispose(); pools.material.dispose(); }
    const near""")
patch(SRC / "world/lights.js", """    pools.renderOrder = 2;
    scene.add(pools);""", """    pools.renderOrder = 2;
    pools.material.opacity = 0.42 * level;
    scene.add(pools);""")

# 4) site.js: 스마트팜과 개울 풀숲은 later() 로
s = SRC / "world/site.js"
FAST = "stages" in s.read_text()   # scripts/fast_boot.py 가 단계별 짓기로 바꾼 뒤에는 4)·5)의 later() 는 쓰지 않는다
if not FAST: patch(s, "import { buildFarm } from './farm.js';\n", "")
if not FAST: patch(s, "  if (house.farm) buildFarm(scene, house.farm, { blocks, clickables, tickers, phone });\n", "")
if not FAST: patch(s, "  tickers.push(grassField(scene, [stream.grass.area], phone ? 8000 : 30000, stream.grass.avoid));\n", "")
if not FAST: patch(s, """    groundAt: bukchonGround,
""", """    groundAt: bukchonGround,
    // 첫 화면 뒤에 짓는 먼 곳: 스마트팜(파일째 나중에 받는다), 개울 풀숲. 막는 것·누를 것은 main 의 배열에 더한다.
    async later(out) {
      if (house.farm) {
        const { buildFarm } = await import('./farm.js');
        buildFarm(scene, house.farm, { blocks: out.blocks, clickables: out.clickables, tickers, phone });
        lights.build();
      }
      tickers.push(grassField(scene, [stream.grass.area], phone ? 8000 : 30000, stream.grass.avoid));
      renderer.shadowMap.needsUpdate = true;
    },
""")

# 5) main.js: 먼 곳은 첫 프레임 뒤에, 정원은 다가갈 때
m = SRC / "main.js"
patch(m, """    if (id === 'farm') return""", """    if (id === 'pandora') { loadGarden(); return walker.go((x0 + x1) / 2, Math.min(z0, z1) - 3, Math.PI, 0); }   // 정원 들머리에서 남쪽을 본다
    if (id === 'farm') return""")
patch(m, """// 이동
const collider""", """// 판도라 정원: 첫 화면에는 없다. 25m 안으로 다가가거나, 하늘에서 보거나, 메뉴로 갈 때 받아 짓는다.
let garden = null, gardenJob = null;
function loadGarden() {
  gardenJob ??= Promise.all([data('content/garden.json'), import('./world/garden/index.js')])
    .then(([spec, mod]) => spec && mod.buildGarden(scene, spec, { blocks, clickables }))
    .then(gd => { garden = gd; renderer.shadowMap.needsUpdate = true; setTimeout(() => minimap.snapshot(), 1800); })
    .catch(e => console.warn('garden', e));
  return gardenJob;
}
function nearGarden(v) {
  if (gardenJob || !OUTDOOR.pandora) return;
  const [x0, z0, x1, z1] = OUTDOOR.pandora.box;
  const dx = Math.max(Math.min(x0, x1) - v.x, 0, v.x - Math.max(x0, x1)), dz = Math.max(Math.min(z0, z1) - v.z, 0, v.z - Math.max(z0, z1));
  if (walker.flying || Math.hypot(dx, dz) < 25) loadGarden();
}
// 이동
const collider""")
if not FAST: patch(m, """  // 바깥 텍스처 → (집에 들어서면)""", """  // 먼 곳(스마트팜·개울 풀숲)은 첫 화면이 뜬 뒤 한가할 때 짓는다
  (window.requestIdleCallback || setTimeout)(() => site.later({ blocks, clickables })
    .then(() => renderer.compileAsync(scene, camera)).then(() => minimap.snapshot()).catch(e => console.warn('later', e)), { timeout: 1500 });
  // 바깥 텍스처 → (집에 들어서면)""")
patch(m, """  nearHouse(v);
""", """  nearHouse(v);
  nearGarden(v);
  garden?.update(dt, v);
""")
# 6) 하늘 환경광은 createAtmosphere 가 곧바로 지금 하늘로 굽는다. 처음 값으로 한 번 더 굽던 것을 뺀다.
patch(SRC / "world/sky.js", """  bakeEnv();
  scene.environmentIntensity = 0.55;""", """  scene.environmentIntensity = 0.55;   // 첫 굽기는 atmosphere.js 의 apply() 가 한다""")
# 7) README: 로딩 순서와 정원
r = ROOT / "README.md"
if not FAST: patch(r, """2. **첫 프레임 뒤**: 바깥 텍스처(잔디·박석·기와·벽) → 후처리(주변광 차폐·빛번짐)를 붙인다.
""", """2. **첫 프레임 뒤**: 먼 곳(스마트팜 — 코드 파일째, 개울 풀숲)을 한가할 때 짓고, 바깥 텍스처(잔디·박석·기와·벽) → 후처리(주변광 차폐·빛번짐)를 붙인다.
""")
patch(r, """4. **방에 들어서면**: 그 방과 이웃 방을 먼저, 나머지 방은 하나씩 차례로 채운다. 실내 텍스처(마루·목재)도 이때 받는다.
""", """4. **방에 들어서면**: 그 방과 이웃 방을 먼저, 나머지 방은 하나씩 차례로 채운다. 실내 텍스처(마루·목재)도 이때 받는다.
5. **판도라 정원**(대문 밖 남쪽, 개울과 스마트팜 사이): 25m 안으로 다가가거나 하늘에서 보거나 메뉴로 갈 때만 `src/world/garden/`과
   고른 디자인 하나를 받아 땅에서 자라나듯 짓는다. 디자인 4안(`souls` 영혼의 나무 · `floating` 할렐루야 부유섬 · `forest` 빛의 숲 · `supertrees` 슈퍼트리 그로브)은
   `content/garden.json`의 `active`로 고르고, `3d.html?garden=forest&time=22:00`처럼 미리 본다. 밤에 빛나고, 이끼를 밟으면 발자국이 번진다.
""")
patch(r, "# http://localhost:5173/3d.html?key=preview     가족 방 미리보기 (보안 아님, 개발용)\n",
      "# http://localhost:5173/3d.html?key=preview     가족 방 미리보기 (보안 아님, 개발용)\n# http://localhost:5173/3d.html?garden=souls&time=22:00   판도라 정원 디자인 미리보기(밤)\n")
print("ok")
