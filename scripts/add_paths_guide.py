"""스마트팜 길을 박석길로 바꾸고 정문·북촌 골목·개울길과 끊김 없이 잇는다. 정문 오른쪽에 안내도·안내판을 세운다.
여러 번 돌려도 같은 결과."""
import json, pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "src/world"

def patch(path, old, new):
    t = path.read_text()
    if new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:50]}"
    path.write_text(t.replace(old, new))

# 1) 스마트팜 길: 자갈 → 박석(3m 무늬). 정문 바로 앞(z=0.3)부터 내려오고, 서쪽으로는 북촌 골목 어귀(x=-14)까지 잇는다.
patch(W / "farm.js",
"""  const roadLen = x0 - F.road;
  flat(scene, 5, gateZ - 8, repeatFor(mats.gravel, 1.2, 3), F.road, (gateZ + 8) / 2 + 1.25, 0.03);
  flat(scene, roadLen, 5, repeatFor(mats.gravel, roadLen / 4, 1.2), F.road + roadLen / 2, gateZ, 0.03);""",
"""  // 박석길: 정문 바로 앞에서 내려오고, 서쪽은 북촌 골목 어귀까지 이어 길이 끊기지 않는다
  const down = gateZ + 2.5 - 0.3, west = F.road - 14, roadLen = x0 - west;
  flat(scene, 5, down, repeatFor(mats.path, 5 / 3, down / 3), F.road, 0.3 + down / 2, 0.03);
  flat(scene, roadLen, 5, repeatFor(mats.path, roadLen / 3, 5 / 3), west + roadLen / 2, gateZ, 0.032);""")

# 2) 개울길 박석 무늬를 다른 길과 같은 3m 크기로
shutil.copy(ROOT / "scripts/assets/stream.js", W / "stream.js")
for f in ("stream.js",):
    t = (W / f).read_text()
    t = t.replace("const BEND =", "export const BEND =", 1) if "export const BEND" not in t else t
    t = t.replace("ENTRY[1] + 6", "ENTRY[1] + 0.5").replace("ENTRY[0] + 3.2", "ENTRY[0] + 3.4")   # 안내판이 새 박석길 위에 서지 않게
    t = t.replace("repeatFor(mats.path, 1, 1)", "repeatFor(mats.path, PATH_W / 3, PATH_W / 1.5)")
    (W / f).write_text(t)
shutil.copy(W / "stream.js", ROOT / "scripts/assets/stream.js")   # add_stream.py 를 다시 돌려도 같게
patch(W / "bukchon.js", "\nconst PATH = [", "\nexport const PATH = [")

# 3) 안내도·안내판
shutil.copy(ROOT / "scripts/assets/guide.js", W / "guide.js")
s = W / "site.js"
patch(s, "import { buildStream } from './stream.js';", "import { buildStream } from './stream.js';\nimport { buildGuide } from './guide.js';")
patch(s, "  tickers.push(stream.tick);\n", "  tickers.push(stream.tick);\n  buildGuide(scene, house, { pond: POND }, { blocks, clickables });\n")

h = ROOT / "content/house.json"
house = json.loads(h.read_text())
if "guide" not in house:
    guide = {
        "title": "Joyhouse 안내",
        "intro": "정문으로 들어가 잔디길을 따라 걸으면 본채입니다. 박석길은 모두 이어져 있어 어디로든 걸어갈 수 있습니다.",
        "tips": ["끌어서 둘러보기 · 바닥을 눌러 걷기 · M 방 바로가기 · B 하늘에서 보기"],
        "mapNote": "빨간 점이 지금 서 있는 곳입니다. 정문 앞 박석길에서 서쪽은 북촌 골목, 동쪽은 스마트팜, 남쪽 갈림길은 개울길로 이어집니다.",
    }
    t = h.read_text()
    anchor = ' "outdoor": ['
    assert t.count(anchor) == 1
    h.write_text(t.replace(anchor, ' "guide": ' + json.dumps(guide, ensure_ascii=False) + ',\n' + anchor))
    json.loads(h.read_text())
print("paths + guide done")
