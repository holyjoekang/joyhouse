"""오벌 오피스에 '이 집을 지은 방법' 코너와 상세 쪽(making.html)을 붙인다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/add_making_story.py

- content/making.json   절차·방법·모듈·확장 계획 (숫자는 git 기록에서 다시 센다)
- making.html           새 쪽 (site.js 의 R.making 이 그린다)
- content/pages.json    새 쪽의 머리 배너
- studio.html           배너 바로 아래 요약 코너
- assets/site/site.js   R.making 렌더러
- assets/site/site.css  단계 카드 모양
"""
import glob
import json
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = "making.html"


def git(*args):
    try:
        return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=True).stdout.split()
    except (OSError, subprocess.CalledProcessError):
        return []


def stats():
    days = git("log", "--format=%ad", "--date=short")
    first = date.fromisoformat(days[-1]) if days else date(2026, 10, 18)
    pages = [p for p in glob.glob(str(ROOT / "*.html")) if not p.endswith(PAGE)] + [PAGE]
    scripts = glob.glob(str(ROOT / "scripts" / "*.py"))
    return [
        {"value": f"{(date.today() - first).days + 1}일", "label": f"첫 커밋 {first:%Y.%m.%d}부터"},
        {"value": str(len(days) + 1), "label": "AI와 주고받은 커밋"},
        {"value": str(len(pages)), "label": "쪽(페이지)"},
        {"value": str(len(scripts)), "label": "고치기용 Python 스크립트"},
    ]


DATA = {
    "intro": "이 집은 코드를 손으로 짜지 않고 AI(Claude Code)와 대화로 지었습니다. 사람은 무엇을 담을지 정하고, AI가 설계·코드·자료 정리를 맡고, GitHub가 매일 자동으로 새로 짓습니다.",
    "steps": [
        {"title": "기획 — 집의 그림", "text": "커리어 30년을 '집'으로 보고 방을 나눴습니다. 덕수궁 석조전·정관헌을 모티프로 서재·여행·블로그·작업실을 방으로 배치했습니다.", "tool": "대화 · PRD"},
        {"title": "뼈대 — AI와 대화로 코딩", "text": "\"방 6곳짜리 3D 집을 만들어 줘\"처럼 말로 요청하면 Claude Code가 three.js 3D 집과 2D 홈페이지를 만들고 GitHub에 올립니다.", "tool": "Claude Code · three.js"},
        {"title": "자료 분리 — JSON 한 곳", "text": "글·목록·숫자는 HTML에 박지 않고 content/·data/ JSON에 둡니다. 쪽은 빈 자리(data-render)만 두고 JS가 자료를 읽어 그립니다.", "tool": "JSON · JS 렌더러"},
        {"title": "고치기 — Python 스크립트", "text": "새 코너·새 쪽을 붙일 때도 손으로 고치지 않고 AI가 Python 스크립트를 써서 돌립니다. 다시 돌려도 결과가 같아 안전합니다.", "tool": "scripts/*.py"},
        {"title": "자동 갱신·배포", "text": "매일 06:00 GitHub Actions가 블로그·서재·여행 지도 저장소에서 자료를 모아 다시 짓고 GitHub Pages로 내보냅니다.", "tool": "GitHub Actions · Pages"},
        {"title": "방 늘리기", "text": "중국관·신앙·아이디어 랩·암호로 잠근 컨설팅 룸까지, 같은 방식으로 방을 하나씩 더해 왔습니다.", "tool": "모듈 추가"},
    ],
    "methods": [
        {"title": "말로 일 시키기", "text": "CLAUDE.md에 '스크립트로 고친다 · 자료로 그린다 · 말은 짧게' 세 줄 규칙을 두고 AI가 늘 같은 방식으로 일하게 합니다."},
        {"title": "빌드 도구 없음", "text": "npm·번들러 없이 HTML·CSS·JS 그대로 올립니다. 배울 것이 적고 고장 날 곳이 적습니다."},
        {"title": "무료 자료만", "text": "사진은 Unsplash·CC·퍼블릭 도메인만 받아 출처를 credits.json에 남깁니다. 호스팅도 GitHub Pages라 비용이 0원입니다."},
        {"title": "지킬 것은 잠그기", "text": "고객 자료는 암호화 파일로만 올리고 암호는 GitHub Secrets에 둡니다. 코드에는 비밀이 없습니다."},
    ],
    "modules": [
        {"name": "머리·꼬리", "file": "site.js", "text": "메뉴·바닥글을 모든 쪽에 한 번에"},
        {"name": "렌더러", "file": "data-render", "text": "배너·연표·카드·목록을 JSON에서 그림"},
        {"name": "콘텐츠", "file": "content/*.json", "text": "글을 고치면 2D·3D가 함께 바뀜"},
        {"name": "동기화", "file": "sync_sources.py", "text": "외부 블로그·저장소에서 매일 자료 수집"},
        {"name": "잠금 방", "file": "vault", "text": "암호로 여는 고객 전용 공간"},
        {"name": "3D 투어", "file": "src/", "text": "같은 자료로 걷는 three.js 집"},
    ],
    "plans": [
        {"kicker": "Lecture", "title": "강의", "text": "비개발자가 AI와 대화로 자기 사이트를 짓는 과정을 교재·실습 템플릿으로. 수강생이 첫날 자기 주소를 갖고 돌아갑니다.", "items": ["바이브코딩 입문 과정", "단계별 실습 저장소", "CLAUDE.md 규칙 템플릿"]},
        {"kicker": "Personal", "title": "개인 사이트", "text": "커리어·서재·여행·블로그를 '방'으로 고르는 개인 홈페이지. JSON만 채우면 내 집이 됩니다.", "items": ["커리어 연표·포트폴리오", "블로그·서재 자동 연결", "가족·신앙 등 선택 방"]},
        {"kicker": "SMB", "title": "중소기업 사이트", "text": "회사 소개·제품·뉴스에 고객 전용 잠금 방까지. 운영자가 글만 고치면 매일 자동으로 갱신됩니다.", "items": ["회사·제품 소개 모듈", "고객 전용 컨설팅 룸", "AI 리서치·보고서 연동"]},
    ],
    "roadmap": ["모듈 분리 — 렌더러·방을 독립 부품으로", "템플릿 — 설정 JSON 하나로 새 사이트 생성", "서비스 — 강의·개인·중소기업 패키지"],
}

HTML = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>이 집을 지은 방법 · AI로 만든 사이트 — Joyhouse</title>
<meta name="description" content="AI와 대화로 지은 Joyhouse의 제작 절차·방법과 서비스 확장 계획.">
<meta property="og:title" content="이 집을 지은 방법 — Joyhouse">
<meta property="og:description" content="AI와 대화로 지은 Joyhouse의 제작 절차·방법과 서비스 확장 계획.">
<meta property="og:image" content="assets/photos/laptop-dark.webp">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<section class="block"><div class="wrap"><div data-render="making" data-part="stats"></div></div></section>
<section class="block" id="steps">
  <div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Process</span><h2>지은 절차</h2></div>
      <p class="lead" data-render="making" data-part="intro"></p></div>
    <div data-render="making" data-part="steps"></div>
  </div>
</section>
<section class="block alt">
  <div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Method</span><h2>일하는 방법</h2></div></div>
    <div data-render="making" data-part="methods"></div>
  </div>
</section>
<section class="block">
  <div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Modules</span><h2>부품으로 나눈 구조</h2></div>
      <p class="lead">방마다 같은 부품을 다시 씁니다. 이 부품들을 떼어 내면 다른 사이트도 같은 방식으로 지을 수 있습니다.</p></div>
    <div data-render="making" data-part="modules"></div>
  </div>
</section>
<section class="block alt" id="plans">
  <div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Next</span><h2>서비스로 넓히기</h2></div>
      <p class="lead">모듈화된 프로그램으로 다듬어 강의·개인 사이트·중소기업 사이트로 확장할 예정입니다.</p></div>
    <div data-render="making" data-part="plans"></div>
    <div data-render="making" data-part="roadmap"></div>
  </div>
</section>
</main>
<script type="module" src="assets/site/site.js"></script>
</body>
</html>
"""

HERO = {
    "bg": "assets/photos/laptop-dark.webp",
    "crumb": "오벌 오피스 / 이 집을 지은 방법",
    "eyebrow": "Oval Office · How it was built",
    "title": "AI와 대화로 지은 집",
    "textHtml": "코드를 손으로 짜지 않고 AI에게 말로 일을 시켜 지었습니다. 그 절차와 방법을 공개하고, 모듈로 다듬어 강의·개인 사이트·중소기업 사이트로 넓혀 갑니다.",
    "ctas": [{"primary": True, "href": "#steps", "text": "절차 보기", "newTab": False},
             {"primary": False, "href": "#plans", "text": "확장 계획", "newTab": False}],
}

MARK = "<!-- making -->"
CORNER = MARK + """
<section class="block" id="making">
  <div class="wrap">
    <div class="sec-head reveal">
      <div><span class="eyebrow">How it was built</span><h2>이 집은 AI로 지었습니다</h2></div>
      <p class="lead" data-render="making" data-part="intro"></p>
    </div>
    <div data-render="making" data-part="stats"></div>
    <div data-render="making" data-part="steps" data-brief="1"></div>
    <div class="hero-cta reveal" style="margin-top:28px">
      <a class="btn btn-dark" href="making.html">절차·방법 자세히 →</a>
      <a class="btn btn-line" href="making.html#plans">강의·개인·중소기업 확장 계획 →</a>
    </div>
  </div>
</section>
"""

JS_MARK = "// 이 집을 지은 방법"
JS = JS_MARK + """ — content/making.json 의 부분(data-part)을 그린다. data-brief 면 단계 제목만.
R.making = async el => {
  const d = await json("content/making.json");
  const part = el.dataset.part;
  if (part === "intro") { el.textContent = d.intro; return; }
  if (part === "stats") el.innerHTML = `<div class="stats making-stats">${d.stats.map(s =>
    `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>`;
  if (part === "steps") el.innerHTML = `<ol class="grid grid-3 make-steps">${d.steps.map((s, n) => `
<li class="card reveal in"><div class="card-body"><span class="make-no">${n + 1}</span>
  <span class="card-kicker">${esc(s.tool)}</span><h3>${esc(s.title)}</h3>${el.dataset.brief ? "" : `<p>${esc(s.text)}</p>`}</div></li>`).join("")}</ol>`;
  if (part === "methods") el.innerHTML = `<div class="grid grid-2">${d.methods.map(m => `
<article class="card reveal in"><div class="card-body"><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></div></article>`).join("")}</div>`;
  if (part === "modules") el.innerHTML = `<div class="grid grid-3">${d.modules.map((m, n) => `
<article class="card app-card reveal in"><div class="card-body">
  <div class="app-icon" style="background:${APP_COLORS[n % APP_COLORS.length]}">${esc(m.name[0])}</div>
  <h3>${esc(m.name)}</h3><p>${esc(m.text)}</p><div><span class="tag">${esc(m.file)}</span></div></div></article>`).join("")}</div>`;
  if (part === "plans") el.innerHTML = `<div class="grid grid-3">${d.plans.map(p => `
<article class="card reveal in"><div class="card-body"><span class="card-kicker">${esc(p.kicker)}</span><h3>${esc(p.title)}</h3>
  <p>${esc(p.text)}</p><ul class="make-list">${p.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div></article>`).join("")}</div>`;
  if (part === "roadmap") el.innerHTML = `<ol class="make-road">${d.roadmap.map(r => `<li>${esc(r)}</li>`).join("")}</ol>`;
};

"""

CSS_MARK = "/* making */"
CSS = CSS_MARK + """
.making-stats { margin: 0 0 28px; }
.make-steps { list-style: none; padding: 0; margin: 0; }
.make-no { float: right; font: 700 2rem/1 var(--serif); color: var(--gold); }
.make-list { margin: 12px 0 0; padding-left: 1.1em; color: var(--muted); font-size: .92rem; }
.make-road { display: flex; flex-wrap: wrap; gap: 12px; list-style: none; counter-reset: r; padding: 0; margin: 28px 0 0; }
.make-road li { counter-increment: r; flex: 1 1 220px; padding: 14px 18px; border-left: 3px solid var(--gold); background: var(--paper); border-radius: var(--radius); }
.make-road li::before { content: counter(r) "단계 · "; font-weight: 700; color: var(--navy); }
"""


def main():
    data = {"stats": stats(), **DATA}
    (ROOT / "content/making.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / PAGE).write_text(HTML, encoding="utf-8")

    pages_path = ROOT / "content/pages.json"
    pages = json.loads(pages_path.read_text(encoding="utf-8"))
    pages["heroes"][PAGE] = HERO
    pages_path.write_text(json.dumps(pages, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    studio = ROOT / "studio.html"
    s = studio.read_text(encoding="utf-8")
    if MARK not in s:
        hero = '<section class="page-hero" data-render="hero"></section>\n'
        assert hero in s
        studio.write_text(s.replace(hero, hero + CORNER, 1), encoding="utf-8")

    js = ROOT / "assets/site/site.js"
    t = js.read_text(encoding="utf-8")
    if JS_MARK not in t:
        anchor = "R.posters = async el => {"
        assert anchor in t
        js.write_text(t.replace(anchor, JS + anchor, 1), encoding="utf-8")

    css = ROOT / "assets/site/site.css"
    c = css.read_text(encoding="utf-8")
    if CSS_MARK not in c:
        css.write_text(c.rstrip("\n") + "\n\n" + CSS, encoding="utf-8")

    readme = ROOT / "README.md"
    r = readme.read_text(encoding="utf-8")
    row = "| `making.html` | 오벌 오피스 | 이 집을 지은 방법: 제작 절차·방법·모듈 구조, 강의·개인·중소기업 확장 계획 (`content/making.json`) |\n"
    if "`making.html`" not in r:
        anchor = "| `china.html` |"
        readme.write_text(r.replace(anchor, row + anchor, 1), encoding="utf-8")
    print("making: ok", data["stats"])


if __name__ == "__main__":
    main()
