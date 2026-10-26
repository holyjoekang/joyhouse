"""오벌 오피스 컨설팅 룸에 '카페뮤제오' 코너를 헬라코리아 아래에 붙인다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/add_museo_corner.py
    python scripts/fetch_photos.py                 # 새 사진(museo-*) 받기
    python scripts/build_museo_vault.py            # 잠금 파일 만들기 (암호: private/museo_password.txt)

- consulting-museo.html  새 쪽 (암호 잠금, assets/site/museo.js 가 그린다)
- content/pages.json     새 쪽의 머리 배너
- studio.html            컨설팅 룸 카드 (헬라코리아 카드 바로 아래)
- scripts/fetch_photos.py  공개 카드·배너용 자유 이용 사진 (고객사 사이트 이미지는 잠금 안쪽에서만 쓴다)
- .github/workflows/pages.yml  배포 때 museo.css·js 캐시 무효화
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = "consulting-museo.html"

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>컨설팅 룸 · 카페뮤제오 — Joyhouse</title>
<meta name="description" content="카페뮤제오 AX 과제 도출 멀티에이전트 워크숍 (암호 필요)">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
<link rel="stylesheet" href="assets/site/museo.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<section class="block">
  <div class="wrap" id="vault"><p class="muted">불러오는 중…</p></div>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script type="module" src="assets/site/site.js"></script>
<script type="module" src="assets/site/museo.js"></script>
</body>
</html>
"""

HERO = {
    "bg": "assets/photos/museo-beans.webp",
    "crumb": "오벌 오피스 / 컨설팅 룸",
    "eyebrow": "Oval Office · Consulting Room",
    "title": "컨설팅 룸 — 카페뮤제오 AX 워크숍",
    "textHtml": "CEO·부서 책임자·실무자·고객을 AI 에이전트 17개로 만들어 인터뷰하고, 반박하고, 채점해 AX 과제를 도출한 기록입니다. 고객 자료라 암호로 잠가 두었습니다.",
    "ctas": [{"primary": True, "href": "#vault", "text": "들어가기", "newTab": False},
             {"primary": False, "href": "studio.html#consulting-museo", "text": "작업실로", "newTab": False}],
}

CARD = """<section class="block" id="consulting-museo">
  <div class="wrap split">
    <div class="figure reveal"><img src="assets/photos/museo-roaster.webp" alt="원두를 볶는 로스터" loading="lazy"></div>
    <div class="reveal">
      <span class="eyebrow">Consulting Room</span>
      <h2>컨설팅 룸 — 카페뮤제오</h2>
      <p class="lead">20년 된 커피 전문몰의 AX 과제를 찾기 위해 CEO·부서 책임자·실무자·고객을 AI 에이전트 17개로 만들었습니다. 독립 인터뷰, 반박, 수정, 채점을 거쳐 과제 순위와 로드맵, 실제 미팅 질문지를 정리했습니다. 고객 자료라 암호로 잠가 두었습니다.</p>
      <a class="btn btn-dark" href="consulting-museo.html">컨설팅 룸 들어가기 🔒</a>
    </div>
  </div>
</section>
"""

PHOTOS = """    # 컨설팅 룸(consulting-museo.html) — Unsplash
    ("museo-roaster", "unsplash", "1511537190424-bbbab87ac5eb", "원두를 볶는 로스터", 1600),
    ("museo-beans", "unsplash", "1447933601403-0c6688de566e", "볶은 원두", 2000),
"""


def main():
    (ROOT / PAGE).write_text(HTML, encoding="utf-8")

    pj = ROOT / "content" / "pages.json"
    pages = json.loads(pj.read_text(encoding="utf-8"))
    pages["heroes"][PAGE] = HERO
    pj.write_text(json.dumps(pages, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    st = ROOT / "studio.html"
    s = st.read_text(encoding="utf-8")
    if 'id="consulting-museo"' in s:  # 이미 있으면 새 문안으로 바꾼다
        a = s.index('<section class="block" id="consulting-museo">')
        s = s[:a] + s[s.index('<section class="cta-band"', a):]
    s = s.replace('<section class="cta-band"', CARD + '<section class="cta-band"', 1)
    st.write_text(s, encoding="utf-8")

    fp = ROOT / "scripts" / "fetch_photos.py"
    f = fp.read_text(encoding="utf-8")
    if '"museo-roaster"' not in f:
        anchor = '    ("hella-warehouse"'
        end = f.index("\n", f.index(anchor)) + 1
        fp.write_text(f[:end] + PHOTOS + f[end:], encoding="utf-8")

    wf = ROOT / ".github" / "workflows" / "pages.yml"
    w = wf.read_text(encoding="utf-8")
    old = r'assets/site/(site|hella)\.(css|js)'
    if old in w:
        wf.write_text(w.replace(old, r'assets/site/(site|hella|museo)\.(css|js)'), encoding="utf-8")
    print("카페뮤제오 코너 추가 완료")


if __name__ == "__main__":
    main()
