"""3D 집(3d.html) 앞마당에 '마을 주민' 레이어를 붙인다. 다시 돌려도 안전.

    python scripts/add_village.py

- content/villagers.json  전국 각지 출신 기본 주민 20명 (이름표 · 인사말 · 생김새)
- src/main.js             src/world/village.js 를 불러 매 프레임 움직이게 한다
캐릭터는 src/world/village.js 가 캔버스로 직접 그리는 2D 꼬마 캐릭터다 (외부 게임 그림은 쓰지 않는다).
접속자 캐릭터의 동네는 src/core/hometown.js 가 정한다 (IP 기준 도시 → 원하면 위치 허용으로 동 단위).
실시간 접속자는 src/core/presence.js 가 공개 MQTT 브로커(WebSocket)로 주고받는다 — 접속 번호·이름표·가상 좌표·말풍선만.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIN = ["#ffe0c7", "#fcd5b5", "#f5c9a6", "#ffe8d6", "#efc09a"]
# (동네, 인사말들, 머리색, 머리 모양, 윗옷, 바지, 소품)
PEOPLE = [
    ("부산", ["어서 오이소!", "바다 보러 함 오이소~"], "#3b2a20", "spiky", "#2f7de1", "#2b2f45", "cap"),
    ("대구", ["반갑데이~", "여 덥제? 쪼매 쉬다 가라"], "#1f1a17", "bob", "#e2524a", "#3a3f58", ""),
    ("광주", ["어서 오시랑께!", "밥은 묵었소?"], "#5a3b26", "pony", "#f2b134", "#334", "ribbon"),
    ("대전", ["어서 와유~", "천천히 둘러봐유"], "#2a211c", "short", "#6cc070", "#2d3348", "glasses"),
    ("울산", ["반갑심더!", "고래 보러 온나"], "#40302a", "spiky", "#1fb5ad", "#2b2f45", ""),
    ("제주", ["혼저 옵서예!", "귤 하나 드릴까마씸?"], "#2e2018", "bun", "#ff8a3d", "#45506b", "flower"),
    ("강릉", ["왔드래요?", "커피 한 잔 하고 가래요"], "#1d1d24", "short", "#8a6cf0", "#2b2f45", "beanie"),
    ("전주", ["오메, 반갑네잉", "비빔밥 묵고 가쇼잉"], "#6b4430", "long", "#e85d9c", "#3a3f58", ""),
    ("춘천", ["닭갈비 먹으러 와요~", "호수 산책 좋아요"], "#2a2420", "bob", "#4fa3e0", "#2d3348", "glasses"),
    ("포항", ["반갑니더!", "과메기 철이라예"], "#30251f", "spiky", "#d9534f", "#2b2f45", "cap"),
    ("여수", ["밤바다 보러 오셨소?", "반갑소잉~"], "#4a3122", "long", "#3cc4e8", "#334", "ribbon"),
    ("수원", ["화성 한 바퀴 어때요?", "통닭 먹고 가요!"], "#26201c", "short", "#f07a2b", "#2b2f45", ""),
    ("인천", ["반가워요~ 바닷바람 좋죠?", "짜장면 원조 동네예요"], "#1c1a1a", "pony", "#5b8def", "#3a3f58", ""),
    ("청주", ["어서 와유", "직지 아시쥬?"], "#3d2c22", "bun", "#9bc94b", "#2d3348", "flower"),
    ("목포", ["오메 반가운 거", "유달산 가봤소?"], "#2b1f19", "short", "#f4c430", "#2b2f45", "beanie"),
    ("안동", ["어서 오시소", "하회마을 구경 왔니껴?"], "#211c19", "long", "#7a6bd8", "#3a3f58", ""),
    ("창원", ["반갑습니더~", "진해 벚꽃 보러 오이소"], "#4b3527", "bob", "#ff6f91", "#2d3348", "ribbon"),
    ("천안", ["호두과자 드실래유?", "반가워유~"], "#30251f", "spiky", "#c58b3a", "#2b2f45", "cap"),
    ("판교", ["커밋하다 잠깐 나왔어요", "점심 뭐 먹지?"], "#141418", "short", "#3a3f4a", "#24273a", "glasses"),
    ("잠실", ["석촌호수 한 바퀴 했어요", "롯데타워 보이죠?"], "#5c3a28", "pony", "#ffffff", "#2f3a5a", "cap"),
]

villagers = [{
    "id": f"v{i + 1:02d}", "town": t, "label": f"{t}러", "lines": lines,
    "look": {"skin": SKIN[i % len(SKIN)], "hair": hair, "style": style, "shirt": shirt, "pants": pants, "acc": acc},
} for i, (t, lines, hair, style, shirt, pants, acc) in enumerate(PEOPLE)]

data = {
    "_note": "3D 집 앞마당 기본 주민. label 이 이름표, lines 는 가까이 가면 하는 말. 생김새는 src/world/village.js 가 그린다.",
    "area": {"x0": -13, "x1": 15, "z0": 3, "z1": 40},
    "villagers": villagers,
}
(ROOT / "content/villagers.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"  content/villagers.json  (주민 {len(villagers)}명)")

main = ROOT / "src/main.js"
s = main.read_text(encoding="utf-8")
if "createVillage" not in s:
    s = s.replace("import { STREAM_SPOT } from './world/stream.js';",
                  "import { STREAM_SPOT } from './world/stream.js';\nimport { createVillage } from './world/village.js';", 1)
    anchor = "const walker = createWalker(camera, collider, house.start,"
    i = s.index(anchor)
    j = s.index("\n", i) + 1
    s = s[:j] + ("// 마을 주민: 전국 각지 출신 20명이 앞마당을 거닐고, 접속자도 동네 이름표를 단 캐릭터로 나타난다\n"
                 "const village = createVillage(scene, { ground: (x, z) => site.groundAt(x, z), collider, camera, walker, data });\n"
                 "tickers.push(village.update);\n") + s[j:]
    main.write_text(s, encoding="utf-8")
    print("  src/main.js")
