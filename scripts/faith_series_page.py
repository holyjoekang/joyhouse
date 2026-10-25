"""신앙 방 정리: 기도제목은 큰제목·소제목만 남기고, 긴 연재는 대표 11편 + '더보기' 카드로 줄인다.

- content/faith.json : 기도제목 세부 내용·intro 삭제(맺는 기도는 유지), 연재별 featured(대표 11편)
- scripts/faith_prayer_banners.py : 같은 개인 내용을 원본 스크립트에서도 지움(다시 돌려도 되살아나지 않게)
- faith-series.html  : 연재 전체 목록 서브 페이지(?s=bible|story), data-render="faithSeries"
- site.js            : R.faith(대표 11편 + 더보기), R.faithSeries 추가, 글 쪽 목록 링크를 서브 페이지로
- site.css           : .faith-more · .prayer-sec ul 스타일
다시 돌려도 결과가 같다.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
R = lambda p: (ROOT / p).read_text(encoding="utf-8")  # noqa: E731
W = lambda p, s: (ROOT / p).write_text(s, encoding="utf-8")  # noqa: E731

FEATURED = {
  "bible": ["mippeum", "compassion", "psalm23", "eagle", "fruit", "hesed",
            "can-do-all", "job-friend", "money", "shema", "eye-for-eye"],
  "story": ["big-picture", "creation", "abraham", "joseph", "red-sea", "david",
            "nativity", "samaritan", "prodigal", "cross", "resurrection"],
}

# ── 원본 스크립트에서 기도제목 세부 내용 지우기
src = R("scripts/faith_prayer_banners.py")
src = src.replace('S = lambda title, *items: {"title": title, "items": [{"h": h, "t": t} for h, t in items]}',
                  'S = lambda title, *items: {"title": title, "items": [{"h": h} for h in items]}')
src = re.sub(r'^(\s+)\("([^"]+)", "[^"]*"\)', r'\1"\2"', src, flags=re.M)
src = re.sub(r'^  "intro": .*\n', "", src, flags=re.M)
W("scripts/faith_prayer_banners.py", src)

# ── faith.json
d = json.loads(R("content/faith.json"))
for p in d["prayers"]:
    p.pop("intro", None)
    for s in p["sections"]:
        s["items"] = [{"h": it["h"]} for it in s["items"]]
for se in d["series"]:
    if se["id"] in FEATURED:
        ids = {p["id"] for p in d["posts"] if p["series"] == se["id"]}
        assert set(FEATURED[se["id"]]) <= ids, se["id"]
        se["featured"] = FEATURED[se["id"]]
W("content/faith.json", json.dumps(d, ensure_ascii=False, indent=1) + "\n")

# ── faith-series.html (faith-post.html 머리를 그대로 빌림)
page = R("faith-post.html")
page = re.sub(r"<title>.*?</title>", "<title>신앙 · 연재 전체 — Joyhouse</title>", page)
page = re.sub(r'<meta name="description" content=".*?">', '<meta name="description" content="Joyhouse 신앙 방 — 쉽게 읽는 성경 · 성경 이야기 연재 전체 목록.">', page)
page = page.replace('<div class="faith-post" data-render="faithPost"></div>',
                    '<section class="block"><div class="wrap"><div data-render="faithSeries"></div></div></section>')
assert 'data-render="faithSeries"' in page
W("faith-series.html", page)

# ── site.js
js = R("assets/site/site.js")
REPL = [
  # 기도제목: 소제목만 목록으로, 접지 않고 바로 보이게
  ('''      <p class="prayer-intro">${esc(p.intro)}</p>
''', ""),
  ('''    <details class="prayer-more"${i === 0 ? " open" : ""}>
      <summary>기도제목 ${p.sections.length}가지 보기</summary>
      <div class="prayer-grid">''', '''    <div class="prayer-grid">'''),
  ('''          <dl>${s.items.map(it => `<dt>${esc(it.h)}</dt><dd>${esc(it.t)}</dd>`).join("")}</dl>''',
   '''          <ul>${s.items.map(it => `<li>${esc(it.h)}</li>`).join("")}</ul>'''),
  ('''        <p>${esc(p.closing.end)}</p></div>` : ""}
    </details>
  </article>`;''', '''        <p>${esc(p.closing.end)}</p></div>` : ""}
  </article>`;'''),
  ("const prayerCard = (p, i) => `", "const prayerCard = p => `"),
  # 연재: featured 가 있으면 대표 11편 + 더보기 카드, 거르기는 서브 페이지에서
  ('''      ${se.topics ? `<div class="idea-filter faith-filter" role="toolbar" aria-label="주제로 거르기">${[["all", "전체"], ...Object.entries(se.topics)].map(([k, n], i) =>
        `<button data-f="${k}" aria-pressed="${i === 0}">${esc(n)} <small>${posts.filter(p => p.series === se.id && (k === "all" || p.topic === k)).length}</small></button>`).join("")}</div>` : ""}
      <div class="faith-grid">${posts.filter(p => p.series === se.id).map(p => faithCard(p, se)).join("")}</div>
    </section>${banners''', '''      ${se.featured ? "" : faithFilter(se, posts)}
      <div class="faith-grid">${se.featured
        ? se.featured.map(id => posts.find(p => p.id === id)).map(p => faithCard(p, se)).join("") + faithMore(se, posts)
        : posts.filter(p => p.series === se.id).map(p => faithCard(p, se)).join("")}</div>
    </section>${banners'''),
  ('''  el.querySelectorAll(".faith-filter").forEach(bar => bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    bar.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    bar.parentElement.querySelectorAll(".faith-card").forEach(c => { c.hidden = b.dataset.f !== "all" && c.dataset.topic !== b.dataset.f; });
  }));
  reveal();
};
''', '''  faithFilterWire(el);
  reveal();
};

// 연재 전체 목록 서브 페이지: faith-series.html?s=bible
R.faithSeries = async el => {
  const { series, posts } = await json("content/faith.json");
  const sid = new URLSearchParams(location.search).get("s");
  const se = series.find(x => x.id === sid) || series.find(x => x.featured);
  const list = posts.filter(p => p.series === se.id);
  document.title = `${se.name} — 신앙 · Joyhouse`;
  const hero = document.querySelector(".page-hero");
  hero.style.backgroundImage = `url('${photo(se.img)}')`;
  hero.querySelector(".wrap").innerHTML = `
    <div class="crumbs"><a href="index.html">홈</a> / <a href="faith.html">신앙</a> / ${esc(se.name)}</div>
    <span class="eyebrow">${esc(se.en)} · ${list.length}편</span>
    <h1>${esc(se.name)}</h1>
    <p>${esc(se.desc)}</p>`;
  creditFor({ getAttribute: () => photo(se.img) }).then(t => { hero.querySelector(".photo-credit").innerHTML = t; });
  el.innerHTML = `
    <section class="faith-series" id="${se.id}" style="--tc:${se.color}">
      ${faithFilter(se, posts)}
      <div class="faith-grid">${list.map(p => faithCard(p, se)).join("")}</div>
    </section>
    <p><a class="btn btn-line" href="faith.html#${se.id}">← 신앙 방으로</a></p>`;
  faithFilterWire(el);
};
'''),
  # 글 쪽: 목록·빵부스러기 링크를 서브 페이지로
  ('''<a href="faith.html#${se.id}">${esc(se.name)}</a></div>''', '''<a href="${faithList(se)}">${esc(se.name)}</a></div>'''),
  ('''      <a href="faith.html#${se.id}">목록</a>''', '''      <a href="${faithList(se)}">목록</a>'''),
  # 공용 도우미
  ('''R.faith = async el => {''', '''const faithList = se => se.featured ? `faith-series.html?s=${se.id}` : `faith.html#${se.id}`;
const faithFilter = (se, posts) => se.topics ? `<div class="idea-filter faith-filter" role="toolbar" aria-label="주제로 거르기">${[["all", "전체"], ...Object.entries(se.topics)].map(([k, n], i) =>
  `<button data-f="${k}" aria-pressed="${i === 0}">${esc(n)} <small>${posts.filter(p => p.series === se.id && (k === "all" || p.topic === k)).length}</small></button>`).join("")}</div>` : "";
const faithFilterWire = el => el.querySelectorAll(".faith-filter").forEach(bar => bar.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  bar.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  bar.parentElement.querySelectorAll(".faith-card").forEach(c => { c.hidden = b.dataset.f !== "all" && c.dataset.topic !== b.dataset.f; });
}));
const faithMore = (se, posts) => `
  <a class="faith-card faith-more" href="${faithList(se)}" style="--tc:${se.color}">
    <span class="eyebrow">More</span>
    <b>${posts.filter(p => p.series === se.id).length}</b>
    <h3>${esc(se.name)} 전체 보기</h3>
    <p>${Object.values(se.topics || {}).map(esc).join(" · ")}</p>
    <span class="faith-more-go">더보기 →</span>
  </a>`;

R.faith = async el => {'''),
]
if "R.faithSeries" not in js:
    for old, new in REPL:
        assert js.count(old) == 1, old[:60]
        js = js.replace(old, new)
    W("assets/site/site.js", js)

# ── site.css
CSS = """
/* 신앙: 기도제목 소제목 목록 · 연재 더보기 카드 (scripts/faith_series_page.py) */
.prayer-sec ul { margin: 6px 0 0; padding-left: 1.1em; color: var(--ink-2); }
.prayer-sec li { margin: 4px 0; }
.prayer-sec li::marker { color: var(--gold); }
.faith-more { justify-content: center; align-items: center; text-align: center; padding: 28px 20px; background: linear-gradient(160deg, #fffdf8, #f3ecdf); }
.faith-more .eyebrow { color: var(--tc); margin-bottom: .2em; }
.faith-more b { font: 700 3rem/1 var(--serif); color: var(--tc); }
.faith-more h3 { font-size: 1.1rem; margin: .5em 0 .3em; }
.faith-more p { font-size: .85rem; color: var(--muted); margin: 0 0 14px; }
.faith-more-go { display: inline-block; padding: 7px 18px; border-radius: 999px; background: var(--tc); color: #fff; font-size: .88rem; font-weight: 700; }
"""
css = R("assets/site/site.css")
css = css.replace(".prayer-intro { color: var(--ink-2); max-width: 52em; margin: 0 0 14px; }\n", "")
css = re.sub(r"\.prayer-more summary \{[^\n]*\n", "", css)
css = re.sub(r"\.prayer-sec (dl|dt|dd) \{[^\n]*\n", "", css)
if ".faith-more" not in css:
    css = css.rstrip("\n") + "\n" + CSS
W("assets/site/site.css", css)
print("ok")
