"""멘토링 쪽에 '미팅 기록' 영역을 붙인다 (한 번만 돌리면 됨, 다시 돌려도 안전).

- mentoring.html            #meetings 컨테이너와 meetings.css·js 연결
- content/pages.json        히어로에 '미팅 기록' 버튼
- .github/workflows/pages.yml  배포 때 meetings.css·js 캐시 무효화
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

html = ROOT / "mentoring.html"
t = html.read_text(encoding="utf-8")
if 'id="meetings"' not in t:
    t = t.replace('<link rel="stylesheet" href="assets/site/mentoring.css">',
                  '<link rel="stylesheet" href="assets/site/mentoring.css">\n<link rel="stylesheet" href="assets/site/meetings.css">')
    t = t.replace('<section class="block">\n  <div class="wrap" id="mentoring">',
                  '<section class="block mtg-block">\n  <div class="wrap" id="meetings"><p class="muted">미팅 기록 불러오는 중…</p></div>\n</section>\n<section class="block">\n  <div class="wrap" id="mentoring">')
    t = t.replace('<script type="module" src="assets/site/mentoring.js"></script>',
                  '<script type="module" src="assets/site/mentoring.js"></script>\n<script type="module" src="assets/site/meetings.js"></script>')
    html.write_text(t, encoding="utf-8")
    print("  mentoring.html")

pj = ROOT / "content" / "pages.json"
p = json.loads(pj.read_text(encoding="utf-8"))
pg = p["heroes"]["mentoring.html"]
if not any(c["href"] == "#meetings" for c in pg["ctas"]):
    pg["ctas"].insert(1, {"primary": False, "href": "#meetings", "text": "미팅 기록", "newTab": False})
    pg["textHtml"] = pg["textHtml"].rstrip() + " 현장에서 만난 분들과의 미팅 기록도 주제별로 정리해 쌓아 갑니다."
    pj.write_text(json.dumps(p, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("  content/pages.json")

wf = ROOT / ".github" / "workflows" / "pages.yml"
w = wf.read_text(encoding="utf-8")
if "|meetings)" not in w:
    wf.write_text(w.replace("(site|hella|museo|mentoring)", "(site|hella|museo|mentoring|meetings)"), encoding="utf-8")
    print("  .github/workflows/pages.yml")
