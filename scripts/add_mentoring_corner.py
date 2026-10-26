"""오벌 오피스에 '스타트업 멘토링' 코너를 카페뮤제오 카드 아래에 붙인다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/add_mentoring_corner.py
    python scripts/build_mentoring.py      # 데이터 만들기 (AI-Apps/databank/7. 스타트업, 창업준비/startup-mentoring)

- mentoring.html          새 쪽 (공개, assets/site/mentoring.js 가 data/mentoring/mentoring.json 으로 그린다)
- content/pages.json      새 쪽의 머리 배너
- studio.html             스타트업 멘토링 카드
- .github/workflows/pages.yml  배포 때 mentoring.css·js 캐시 무효화
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = "mentoring.html"

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>스타트업 멘토링 방법론 — Joyhouse</title>
<meta name="description" content="증거 기반 단계별 스타트업 멘토링 방법론과 단계별 대표 이슈 해결 과정">
<meta property="og:title" content="스타트업 멘토링 방법론 — Joyhouse">
<meta property="og:description" content="단계는 업력이 아니라 증거로 판정하고, 세션마다 가장 큰 문제 하나만 다루며, 다음 2주의 검증 과제로 끝낸다.">
<meta property="og:image" content="assets/photos/team-work.webp">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
<link rel="stylesheet" href="assets/site/mentoring.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<section class="block">
  <div class="wrap" id="mentoring"><p class="muted">불러오는 중…</p></div>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script type="module" src="assets/site/site.js"></script>
<script type="module" src="assets/site/mentoring.js"></script>
</body>
</html>
"""

HERO = {
    "bg": "assets/photos/team-work.webp",
    "crumb": "오벌 오피스 / 스타트업 멘토링",
    "eyebrow": "Oval Office · Startup Mentoring",
    "title": "스타트업 멘토링 — 증거 기반 단계별 방법론",
    "textHtml": "국내외 멘토링 베스트 프랙티스를 바탕으로 6단계별 과제와 멘토링 방법을 정리하고, 에이전트로 단계마다 대표들이 가장 자주 가져오는 질문과 그것을 풀어 가는 과정을 시뮬레이션했습니다.",
    "ctas": [{"primary": True, "href": "#mentoring", "text": "방법론 보기", "newTab": False},
             {"primary": False, "href": "studio.html#mentoring-corner", "text": "작업실로", "newTab": False}],
}

CARD = """<section class="block alt" id="mentoring-corner">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">Startup Mentoring</span>
      <h2>스타트업 멘토링</h2>
      <p class="lead">창조경제혁신센터 스케일업 멘토링 의뢰에서 출발해, 국내외 베스트 프랙티스로 증거 기반 단계별 멘토링 방법론을 만들었습니다. 6단계 과제와 60분 세션 모델, 그리고 에이전트로 시뮬레이션한 대표 이슈와 해결 과정을 담았습니다. 실제 멘토링 사례는 이어서 추가합니다.</p>
      <a class="btn btn-dark" href="mentoring.html">멘토링 방법론 보기 →</a>
    </div>
    <div class="figure reveal"><img src="assets/photos/startup-talk.webp" alt="발표하는 창업가" loading="lazy"></div>
  </div>
</section>
"""


def main():
    (ROOT / PAGE).write_text(HTML, encoding="utf-8")

    pj = ROOT / "content" / "pages.json"
    pages = json.loads(pj.read_text(encoding="utf-8"))
    pages["heroes"][PAGE] = HERO
    pj.write_text(json.dumps(pages, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    st = ROOT / "studio.html"
    s = st.read_text(encoding="utf-8")
    if 'id="mentoring-corner"' in s:
        a = s.index('<section class="block alt" id="mentoring-corner">')
        s = s[:a] + s[s.index('<section class="cta-band"', a):]
    s = s.replace('<section class="cta-band"', CARD + '<section class="cta-band"', 1)
    st.write_text(s, encoding="utf-8")

    wf = ROOT / ".github" / "workflows" / "pages.yml"
    w = wf.read_text(encoding="utf-8")
    old = r'assets/site/(site|hella|museo)\.(css|js)'
    if old in w:
        wf.write_text(w.replace(old, r'assets/site/(site|hella|museo|mentoring)\.(css|js)'), encoding="utf-8")
    print("스타트업 멘토링 코너 추가 완료")


if __name__ == "__main__":
    main()
