"""작업실에 '사업운영위원회' 비공개 코너를 붙인다 (다시 돌려도 안전).

    python scripts/add_committee_corner.py
    python scripts/build_committee_vault.py     # 잠금 파일 (암호: private/committee_password.txt)

- committee.html         새 쪽 (암호 잠금, assets/site/meetings.js 가 data-vault 모드로 그린다, 검색 제외)
- content/pages.json     머리 배너
- studio.html            작업실 카드 (스타트업 멘토링 카드 바로 아래)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = "committee.html"
HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>작업실 · 사업운영위원회 — Joyhouse</title>
<meta name="description" content="창업지원금 사업운영위원회 참석 기록 (암호 필요)">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
<link rel="stylesheet" href="assets/site/mentoring.css">
<link rel="stylesheet" href="assets/site/meetings.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<section class="block">
  <div class="wrap" id="committee" data-vault="data/committee/vault.json" data-eyebrow="Operating Committee · Private" data-title="사업운영위원회 기록" data-lead="창업지원금 사업운영위원회에 참석하며 본 심의 사례와 쟁점, 그리고 심의를 표준화하기 위한 제안을 정리합니다."><p class="muted">불러오는 중…</p></div>
</section>
</main>
<script type="module" src="assets/site/site.js"></script>
<script type="module" src="assets/site/meetings.js"></script>
</body>
</html>
"""
HERO = {
    "bg": "assets/photos/coworking.webp",
    "crumb": "오벌 오피스 / 작업실",
    "eyebrow": "Studio · Operating Committee",
    "title": "작업실 — 사업운영위원회",
    "textHtml": "창업지원금 사업운영위원회의 심의 사례와 쟁점, 표준화 제안을 기록합니다. 위원회 내부 논의라 암호로 잠가 두었습니다.",
    "ctas": [{"primary": True, "href": "#committee", "text": "들어가기", "newTab": False},
             {"primary": False, "href": "studio.html#committee-corner", "text": "작업실로", "newTab": False}],
}
CARD = """<section class="block" id="committee-corner">
  <div class="wrap split">
    <div class="figure reveal"><img src="assets/photos/coworking.webp" alt="회의 테이블" loading="lazy"></div>
    <div class="reveal">
      <span class="eyebrow">Operating Committee</span>
      <h2>사업운영위원회</h2>
      <p class="lead">창업지원금 사업운영위원회에 매달 참석하며 본 자산 구매·용역 심의 사례와 반복되는 쟁점, 그리고 심의 기준·신청 양식·부결 사유 코드 같은 표준화 제안을 정리합니다. 위원회 내부 논의라 암호로 잠가 두었습니다.</p>
      <a class="btn btn-dark" href="committee.html">기록 들어가기 🔒</a>
    </div>
  </div>
</section>
"""

(ROOT / PAGE).write_text(HTML, encoding="utf-8")
pj = ROOT / "content/pages.json"
p = json.loads(pj.read_text(encoding="utf-8"))
p["heroes"][PAGE] = HERO
pj.write_text(json.dumps(p, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
st = ROOT / "studio.html"
s = st.read_text(encoding="utf-8")
if 'id="committee-corner"' in s:
    a = s.index('<section class="block" id="committee-corner">')
    s = s[:a] + s[s.index("</section>", a) + len("</section>\n"):]
a = s.index('<section class="block alt" id="mentoring-corner">')
b = s.index("</section>", a) + len("</section>\n")
st.write_text(s[:b] + CARD + s[b:], encoding="utf-8")
print("  committee.html · content/pages.json · studio.html")
