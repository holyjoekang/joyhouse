"""오벌 오피스에 '컨설팅 룸 — 헬라코리아' 코너를 붙인다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/add_hella_corner.py

- consulting-hella.html  새 쪽 (암호 잠금, assets/site/hella.js 가 그린다)
- content/pages.json     새 쪽의 머리 배너
- studio.html            컨설팅 룸 카드
- .github/workflows/pages.yml  매일 동기화 때 잠금 파일(data/hella/vault.json)도 새로 만든다
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = "consulting-hella.html"

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>컨설팅 룸 · 헬라코리아 — Joyhouse</title>
<meta name="description" content="중소기업 신사업 개발 컨설팅 운영실 (암호 필요)">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
<link rel="stylesheet" href="assets/site/hella.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<section class="block">
  <div class="wrap" id="vault"><p class="muted">불러오는 중…</p></div>
</section>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script type="module" src="assets/site/site.js"></script>
<script type="module" src="assets/site/hella.js"></script>
</body>
</html>
"""

HERO = {
    "bg": "assets/photos/laptop-dark.webp",
    "crumb": "오벌 오피스 / 컨설팅 룸",
    "eyebrow": "Oval Office · Consulting Room",
    "title": "컨설팅 룸 — 헬라코리아 신사업 개발",
    "textHtml": "역량 진단에서 출발해 품목을 찾고, 3라운드로 평가하고, 매주·매월 시그널과 KPI로 점검합니다. 고객 자료가 있어 암호로 잠가 두었습니다.",
    "ctas": [{"primary": True, "href": "#vault", "text": "들어가기", "newTab": False},
             {"primary": False, "href": "studio.html", "text": "작업실로", "newTab": False}],
}

CARD = """<section class="block alt" id="consulting">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">Consulting Room</span>
      <h2>컨설팅 룸 — 헬라코리아</h2>
      <p class="lead">AI 에이전트로 리서치하고, 3라운드로 평가하고, 매주·매월 시그널과 KPI로 점검하는 중소기업 신사업 개발 운영실입니다. 고객 자료라 암호로 잠가 두었습니다.</p>
      <a class="btn btn-dark" href="consulting-hella.html">컨설팅 룸 들어가기 🔒</a>
    </div>
    <div class="figure reveal"><img src="assets/photos/laptop-dark.webp" alt="컨설팅 룸" loading="lazy"></div>
  </div>
</section>
"""

STEP = """      - name: 컨설팅 룸 잠금 파일
        env:
          HELLA_PASSWORD: ${{ secrets.HELLA_PASSWORD }}
          HELLA_SRC_TOKEN: ${{ secrets.HELLA_SRC_TOKEN }}
        run: |
          pip install -q cryptography
          python scripts/build_hella_vault.py || echo "vault 갱신 실패 — 지난 파일을 둔다"
"""


def main():
    (ROOT / PAGE).write_text(HTML, encoding="utf-8")

    pj = ROOT / "content" / "pages.json"
    pages = json.loads(pj.read_text(encoding="utf-8"))
    pages["heroes"][PAGE] = HERO
    pj.write_text(json.dumps(pages, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    st = ROOT / "studio.html"
    s = st.read_text(encoding="utf-8")
    if 'id="consulting"' not in s:
        s = s.replace('<section class="cta-band"', CARD + '<section class="cta-band"', 1)
        st.write_text(s, encoding="utf-8")

    wf = ROOT / ".github" / "workflows" / "pages.yml"
    w = wf.read_text(encoding="utf-8")
    if "컨설팅 룸 잠금 파일" not in w:
        anchor = "      - name: 바뀐 데이터 커밋"
        assert anchor in w
        w = w.replace(anchor, STEP + anchor, 1)
        wf.write_text(w, encoding="utf-8")
    # 배포 때 hella.css·js 도 site.css·js 처럼 ?v= 를 붙여 캐시를 깬다
    old = r'sed -i -E "s#assets/site/site\.(css|js)\"#assets/site/site.\1?v=$V\"#" *.html'
    new = r'sed -i -E "s#assets/site/(site|hella)\.(css|js)\"#assets/site/\1.\2?v=$V\"#" *.html'
    w = wf.read_text(encoding="utf-8")
    if old in w:
        wf.write_text(w.replace(old, new), encoding="utf-8")
    print("컨설팅 룸 코너 추가 완료")


if __name__ == "__main__":
    main()
