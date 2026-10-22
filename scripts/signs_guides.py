"""갈림길 솟대 이정표(A안)와 스마트팜·북촌 골목 입구 안내판(한지 족자형)을 세우고, 개울길 안내판을 갈래길 뒤로 옮긴다.
글과 자리는 content/house.json 의 signposts / miniGuides. 여러 번 돌려도 같은 결과."""
import json, pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "src/world"

def patch(path, old, new):
    t = path.read_text()
    if new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:50]}"
    path.write_text(t.replace(old, new))

shutil.copy(ROOT / "scripts/assets/signs.js", W / "signs.js")
patch(W / "bukchon.js", "\nconst LOTS = [", "\nexport const LOTS = [")
s = W / "site.js"
patch(s, "import { buildGuide } from './guide.js';", "import { buildGuide } from './guide.js';\nimport { buildSigns } from './signs.js';")
patch(s, "  buildGuide(scene, house, { pond: POND }, { blocks, clickables });\n",
      "  buildGuide(scene, house, { pond: POND }, { blocks, clickables });\n  buildSigns(scene, house, { blocks, clickables });\n")

# 개울길 안내판: 갈래길 뒤(갈림길에서 남서쪽으로 내려간 자리), 오는 사람(북쪽)을 본다
for p in (W / "stream.js", ROOT / "scripts/assets/stream.js"):
    t = p.read_text()
    t = t.replace("sign.position.set(ENTRY[0] + 3.4, 1.4, ENTRY[1] + 0.5);\n  sign.rotation.y = -Math.PI / 2;",
                  "sign.position.set(-3.6, 1.4, 33.5);\n  sign.rotation.y = Math.PI - 0.35;")
    t = t.replace("face: { x: ENTRY[0] - 1, z: ENTRY[1] + 0.5, yaw: -Math.PI / 2 } };", "face: { x: -5, z: 29.5, yaw: Math.PI - 0.35 } };")
    t = t.replace("sign.position.set(-3.6, 1.4, 33.5);\n  sign.rotation.y = Math.PI - 0.35;",
                  "const sp = link.getPoint(0.3), st = link.getTangent(0.3), syaw = Math.atan2(-st.x, -st.y);\n"
                  "  sign.position.set(sp.x + st.y * 2.8, 1.4, sp.y - st.x * 2.8);\n  sign.rotation.y = syaw;\n"
                  "  for (const lx of [-0.95, 0.95]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.12), mats.darkWood); leg.position.set(lx, -0.55, -0.06); leg.castShadow = true; sign.add(leg); }")
    t = t.replace("face: { x: -5, z: 29.5, yaw: Math.PI - 0.35 } };", "face: { x: sp.x + st.y * 2.8 - st.x * 4, z: sp.y - st.x * 2.8 - st.y * 4, yaw: syaw } };")
    if "export const SPUR" not in t:
        t = t.replace("buildStream이 채운다\n", "buildStream이 채운다\nexport const SPUR = { at: null };   // 갈래길 위 t(0..1) 자리. 이정표가 개울길 쪽을 가리킬 때 쓴다\n")
        t = t.replace("  spur.receiveShadow = true;", "  SPUR.at = t => link.getPoint(t);\n  spur.receiveShadow = true;")
    p.write_text(t)

h = ROOT / "content/house.json"
house = json.loads(h.read_text())
if "signposts" not in house:
    data = {
        "signposts": [{"title": "갈림길 이정표", "x": 3.8, "z": 24.6, "arrows": [
            {"text": "개울길", "sub": "물소리 산책로", "to": "stream"},
            {"text": "북촌 골목", "sub": "벗들의 한옥 골목", "to": [-14, 20]},
            {"text": "스마트팜", "sub": "온실 · 방울토마토", "to": [122, 20]},
            {"text": "본채", "sub": "정문 · 잔디길", "to": [0, 0]}]}],
        "miniGuides": [
            {"kind": "farm", "title": "스마트팜 안내", "sub": "온실 6동 · 방울토마토", "x": 119, "z": 26.5, "yaw": -1.5708,
             "note": "북쪽은 선별·저장·관리동, 가운데는 방울토마토 유리온실 6동(북쪽 문으로 들어갑니다), 남쪽은 양액·저수조입니다."},
            {"kind": "bukchon", "title": "북촌 골목 안내", "sub": "벗들의 한옥 골목", "x": -14.5, "z": 24.2, "yaw": 1.5708,
             "note": "언덕을 오르는 골목을 따라 벗들의 한옥이 자리하고, 맨 위에 전망대가 있습니다."}],
    }
    t = h.read_text(); anchor = ' "outdoor": ['
    assert t.count(anchor) == 1
    t = t.replace(anchor, ''.join(f' "{k}": {json.dumps(v, ensure_ascii=False)},\n' for k, v in data.items()) + anchor)
    h.write_text(t); json.loads(t)
print("signs done")
