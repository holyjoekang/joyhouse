"""오벌 오피스 '직접 만든 AI 앱' 맨 앞에 바로타(지하철 안내 웹앱)를 넣고,
'AI 앱 10개' 문구를 실제 개수에 맞춘다. 여러 번 돌려도 같은 결과."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OVAL = ROOT / "content" / "rooms" / "oval.json"

APP = {
    "type": "monitor", "x": 0.08, "z": 0.45, "facing": "east", "w": 1.6,
    "group": "일상·생산성", "title": "바로타",
    "desc": "출퇴근 역을 저장해 두면 버튼 하나로 다음 열차·그다음 열차가 몇 분 후 오는지 큰 글씨로 보여 주는 지하철 안내 웹앱. 환승도 단계별로 안내하고, 개인정보는 저장하지 않는다.",
    "tech": "JavaScript · Vercel · 서울시 실시간 API",
    "links": [
        {"label": "앱 열기 ↗", "url": "https://barota-five.vercel.app/"},
        {"label": "소스 보기 ↗", "url": "https://github.com/holyjoekang/barota"},
    ],
    "bg": "#10223a",
}

room = json.loads(OVAL.read_text(encoding="utf-8"))
items = [i for i in room["items"] if not (i.get("type") == "monitor" and i.get("title") == APP["title"])]
first = next(n for n, i in enumerate(items) if i.get("type") == "monitor")
items.insert(first, APP)
room["items"] = items
OVAL.write_text(json.dumps(room, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

count = sum(1 for i in items if i.get("type") == "monitor")
targets = {
    ROOT / "studio.html": r"직접 만든 AI 앱 \d+개",
    ROOT / "index.html": r"직접 만든 AI 앱 \d+개",
    ROOT / "content" / "pages.json": r"직접 만든 AI 앱 \d+개",
}
for path, pat in targets.items():
    text = path.read_text(encoding="utf-8")
    new = re.sub(pat, f"직접 만든 AI 앱 {count}개", text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        print("updated", path.relative_to(ROOT))
print("monitors:", count)
