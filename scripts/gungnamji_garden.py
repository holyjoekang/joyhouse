"""대문 밖 남쪽 '판도라 정원'(아바타풍 영혼의 나무·부유섬)을 내리고, 그 자리에 부여 궁남지 연못을 들인다.

- 새 디자인: src/world/garden/gungnamji.js (원본 scripts/assets/gungnamji.js) — 둥근 못·섬 정자(포룡정)·
  나무다리·능수버들·연잎/연꽃·갈대·석등
- 아바타 정원 기록은 남긴다: content/garden.json 의 designs 와 src/world/garden/souls.js 등은 그대로 두고
  archived 로 표시한다. 3d.html?garden=souls|floating|forest|supertrees 로 언제든 다시 볼 수 있다.
여러 번 돌려도 같은 결과."""
import json, pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parent.parent
GARDEN = ROOT / "src/world/garden"


def patch(path, old, new):
    t = path.read_text(encoding="utf-8")
    if new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:60]}"
    path.write_text(t.replace(old, new), encoding="utf-8")


shutil.copyfile(ROOT / "scripts/assets/gungnamji.js", GARDEN / "gungnamji.js")

idx = GARDEN / "index.js"
patch(idx, "  supertrees: () => import('./supertrees.js') };",
      "  supertrees: () => import('./supertrees.js'), gungnamji: () => import('./gungnamji.js') };")
# 안내판 색은 디자인마다 (궁남지는 먹색 바탕에 금빛 글씨)
patch(idx, "  const sign = textPlane({ width: 768, padding: 36, bg: '#140f2a', border: '#8f7bff', radius: 16, lines: [\n"
           "    { text: info.name, size: 70, weight: 700, color: '#e9dcff', gap: 10 },\n"
           "    { text: info.sub, size: 38, color: '#b9b0e0' }] }, 2.4, { lit: true });",
      "  const c = { bg: '#140f2a', border: '#8f7bff', title: '#e9dcff', sub: '#b9b0e0', ...info.sign };\n"
      "  const sign = textPlane({ width: 768, padding: 36, bg: c.bg, border: c.border, radius: 16, lines: [\n"
      "    { text: info.name, size: 70, weight: 700, color: c.title, gap: 10, font: c.font },\n"
      "    { text: info.sub, size: 38, color: c.sub }] }, 2.4, { lit: true });")

gp = ROOT / "content/garden.json"
spec = json.loads(gp.read_text(encoding="utf-8"))
for d in spec["designs"]:
    d.setdefault("archived", "2026-10-31 궁남지로 바꾸며 내림 — 기록으로 남김")
spec["designs"] = [d for d in spec["designs"] if d["id"] != "gungnamji"] + [{
    "id": "gungnamji", "name": "부여 궁남지 宮南池", "sub": "능수버들 드리운 연못과 포룡정",
    "sign": {"bg": "#1f1a14", "border": "#b89a5a", "title": "#efd9a6", "sub": "#cdbf9f", "font": "serif"},
    "body": "백제 무왕 때 궁의 남쪽에 판 우리나라에서 가장 오래된 인공 연못을 옮겨 왔습니다. 둥근 못 가운데 섬에 포룡정이 서고, "
            "나무다리가 섬으로 이어집니다. 물가를 두른 능수버들 가지가 바람에 흔들리고, 연잎 사이로 연꽃이 핍니다. "
            "2026년 7월과 10월, 부여를 찾을 때마다 걷던 곳입니다."}]
spec["active"] = "gungnamji"
spec.pop("layout", None)
spec["_note"] = ("대문 밖 남쪽 정원. box = [x0, z0, x1, z1]. active 는 designs 의 id 하나(또는 나란히 둘 목록 + layout). "
                 "지금은 부여 궁남지. archived 표시된 아바타풍 안들은 기록으로 남겨 두었고 3d.html?garden=souls 처럼 미리 볼 수 있다.")
gp.write_text(json.dumps(spec, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

hp = ROOT / "content/house.json"
patch(hp, '"name": "영혼의 나무 · 할렐루야 부유섬", "sub": "두 정원이 나란히"', '"name": "부여 궁남지", "sub": "버드나무 연못과 포룡정"')
patch(ROOT / "src/main.js", "// 판도라 정원: 첫 화면에는 없다.", "// 남쪽 정원(지금은 부여 궁남지): 첫 화면에는 없다.")
print("궁남지 정원:", spec["active"], "· 기록으로 남긴 안", [d["id"] for d in spec["designs"] if d.get("archived")])
