"""남쪽 정원 서쪽(개울 산책로와 정원 사이)에 작은 벽돌 교회 — 100년 된 안동 하회교회를 본뜬 예배당.

- content/house.json: church(자리·이름·글·연결) + 야외 목록(메뉴·이름판)에 '하회교회'
- src/world/church.js 를 첫 화면 뒤 단계(site.stages)에 넣는다. 메뉴로 가면 종탑 앞에서 교회를 본다.
여러 번 돌려도 같은 결과."""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

CHURCH = {
    "x": 14, "z": 56, "pathFrom": 22.5,
    "name": "하회교회", "sub": "100년 된 벽돌 예배당을 본떠 지은 작은 교회",
    "body": "안동 하회마을의 100년 된 하회교회를 본뜬 작은 벽돌 예배당입니다. 붉은 벽돌 박공 예배당 앞에 종탑이 서 있고, "
            "아치 창에는 밤마다 불이 켜집니다. 농장 길에서 박석 길을 따라 종탑 문 앞에 닿습니다. 들어가면 신앙 방(말씀 노트·쉽게 읽는 성경)이 열립니다.",
    "url": "https://holyjoekang.github.io/joyhouse/faith.html",
}
BOX = [8, 52, 20, 75]


def patch(path, old, new):
    t = path.read_text()
    if new and new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:60]}"
    path.write_text(t.replace(old, new))


# 1) 집 데이터: church 항목(한 줄) + 야외 목록
hp = ROOT / "content/house.json"
lines = [l for l in hp.read_text().split("\n") if not l.startswith(' "church": ')]
i = lines.index(' "outdoor": [')
lines.insert(i, ' "church": ' + json.dumps(CHURCH, ensure_ascii=False) + ",")
hp.write_text("\n".join(lines))
entry = json.dumps({"id": "church", "name": CHURCH["name"], "sub": "100년 된 벽돌 예배당", "box": BOX}, ensure_ascii=False)
patch(hp, '{"id": "pandora"', entry + ', {"id": "pandora"')
house = json.loads(hp.read_text())
assert house["church"]["x"] == CHURCH["x"] and any(o["id"] == "church" for o in house["outdoor"])

# 2) site.js: 스마트팜 앞 단계로
s = SRC / "world/site.js"
patch(s, "import { createLights } from './lights.js';\n", "import { createLights } from './lights.js';\nimport { buildChurch } from './church.js';\n")
patch(s, "    ['스마트팜', async into => {", "    ['하회교회', into => { if (house.church) buildChurch(into, house.church, { blocks, clickables, lights }); }],\n    ['스마트팜', async into => {")

# 3) main.js: 메뉴 '하회교회' → 종탑 앞 9m에서 남쪽(교회)을 본다
patch(SRC / "main.js", "    if (id === 'pandora') {", "    if (id === 'church' && house.church) return walker.go(house.church.x, house.church.z - 9, Math.PI, 0);   // 종탑 앞에서 교회를 본다\n    if (id === 'pandora') {")

# 4) README 로딩 순서
patch(ROOT / "README.md", "→ 연못·개울·안내판·나무·먼 산 → 북촌 골목\n", "→ 연못·개울·안내판·나무·먼 산 → 북촌 골목 → 하회교회(`src/world/church.js`, 남쪽 정원 서쪽)\n")
print("ok")
