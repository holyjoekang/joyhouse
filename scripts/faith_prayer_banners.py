"""신앙 방(faith.html)에 해마다 쌓이는 '기도제목' 카드와, 연재 사이의 가로 배너를 넣는다.

- content/faith.json : prayers(해마다 추가 · 최신이 맨 위) · banners(after = 앞 연재 id)
- site.js            : R.faith 가 기도제목 카드 → 연재(+배너) 순서로 그림
- site.css           : .prayer- / .faith-banner 스타일 덧붙임
다시 돌려도 결과가 같다. 새해 기도제목은 PRAYERS 에 한 덩어리 추가 후 다시 실행.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
R = lambda p: (ROOT / p).read_text(encoding="utf-8")  # noqa: E731
W = lambda p, s: (ROOT / p).write_text(s, encoding="utf-8")  # noqa: E731

S = lambda title, *items: {"title": title, "items": [{"h": h} for h in items]}  # noqa: E731

PRAYERS = [{
  "id": "2026", "year": 2026, "title": "2026년 기도제목", "version": "2.1",
  "written": "2026년 1월 1일", "revised": ["1월 4일", "1월 7일", "6월 30일"],
  "keywords": ["위대한 하강", "전적 위탁", "가족의 회복"],
  "sections": [
    S("신앙의 회복과 새로운 사명",
      "전적 위탁의 삶",
      "새벽 기도의 지속",
      "지난 30년, 다음 30년",
      "자녀와의 관계 회복"),
    S("부부의 사랑과 자녀의 자립",
      "부부 관계의 심화",
      "보석이의 회복과 새 출발",
      "효정이의 대학원과 신앙"),
    S("양가 부모님과 가족의 화목",
      "부모님의 건강과 효도",
      "포용하는 마음",
      "가족 공동체의 회복"),
    S("사회적 관계에서 주는 사람으로",
      "멘토들과의 교류",
      "나눔과 섬김",
      "공동체에 대한 감사"),
    S("사랑의교회와 한국교회, 카톨릭성당",
      "사랑의교회와 SaGA",
      "예배의 축복",
      "한국교회의 갱신"),
    S("영육간의 건강과 청지기 정신",
      "건강한 몸과 절제의 삶",
      "말씀 연구와 지적 성장",
      "재정의 청지기 정신"),
  ],
  "closing": {
    "title": "맺는 기도",
    "body": ["2026년 한 해는 저를 중심으로 뻗어 있는 모든 관계의 실타래가 사랑과 신뢰로 풀려, 가문을 다시 일으키고 사회에 선한 유산(Legacy)을 남기는 원년이 되기를 간절히 소망합니다.",
             "이 모든 관계는 마치 '에벤에셀의 하나님'께서 세우신 기념비와 같으니, 여기까지 우리를 도우신 주님의 은혜가 온 가족과 지인들에게 강물처럼 흐르기를 기도합니다."],
    "quotes": ["The best is yet to come.", "Expect Great Things from God, Attempt Great Things for God."],
    "end": "이 고백처럼 2026년이 제 인생 이후 30년이 더욱 빛나는 '인생 2막'의 원년이 되기를 함께 소망합니다."},
}]

BANNERS = [
  {"after": "notes", "img": "faith-bible-shema", "eyebrow": "With All Your Heart", "text": "사람에게는 진심, 하나님께는 전심"},
  {"after": "bible", "img": "faith-story-resurrection", "eyebrow": "Beyond Recovery", "text": "회복을 넘어 부흥으로"},
  {"after": "story", "img": "faith-story-abraham", "eyebrow": "Genesis 18:14", "text": "여호와께 능치 못한 일이 있겠느냐"},
]

# ── faith.json
d = json.loads(R("content/faith.json"))
d = {"_note": d["_note"], "prayers": PRAYERS, "banners": BANNERS, **{k: v for k, v in d.items() if k not in ("_note", "prayers", "banners")}}
W("content/faith.json", json.dumps(d, ensure_ascii=False, indent=1) + "\n")

# ── site.js
JS_OLD = '''R.faith = async el => {
  const { series, posts } = await json("content/faith.json");
  el.innerHTML = series.map(se => `'''
JS_NEW = '''// 기도제목: 해마다 한 장씩 쌓인다. 최신 카드만 펼친 채로 시작
const prayerCard = (p, i) => `
  <article class="prayer-card reveal" id="prayer-${esc(p.id)}">
    <div class="prayer-head">
      <span class="eyebrow">Prayer · ${esc(p.year)}</span>
      <h2>${esc(p.title)} <small>v${esc(p.version)}</small></h2>
      <p class="prayer-meta">작성: ${esc(p.written)}${p.revised?.length ? ` | 수정: ${p.revised.map(esc).join(", ")}` : ""}</p>
      <p class="prayer-intro">${esc(p.intro)}</p>
      <div class="prayer-keys">${(p.keywords || []).map(k => `<span>${esc(k)}</span>`).join("")}</div>
    </div>
    <details class="prayer-more"${i === 0 ? " open" : ""}>
      <summary>기도제목 ${p.sections.length}가지 보기</summary>
      <div class="prayer-grid">${p.sections.map((s, n) => `
        <section class="prayer-sec"><h3><b>${n + 1}</b>${esc(s.title)}</h3>
          <dl>${s.items.map(it => `<dt>${esc(it.h)}</dt><dd>${esc(it.t)}</dd>`).join("")}</dl>
        </section>`).join("")}</div>
      ${p.closing ? `<div class="prayer-close"><h3>${esc(p.closing.title)}</h3>
        ${p.closing.body.map(t => `<p>${esc(t)}</p>`).join("")}
        ${p.closing.quotes.map(q => `<blockquote>"${esc(q)}"</blockquote>`).join("")}
        <p>${esc(p.closing.end)}</p></div>` : ""}
    </details>
  </article>`;

const faithBanner = b => `
  <figure class="faith-banner reveal"><img src="${photo(b.img)}" alt="" loading="lazy">
    <figcaption><span class="eyebrow">${esc(b.eyebrow)}</span><p>${esc(b.text)}</p></figcaption>
  </figure>`;

R.faith = async el => {
  const { prayers = [], banners = [], series, posts } = await json("content/faith.json");
  el.innerHTML = [...prayers].sort((a, b) => b.year - a.year).map(prayerCard).join("") + series.map(se => `'''
JS_TAIL_OLD = '''      <div class="faith-grid">${posts.filter(p => p.series === se.id).map(p => faithCard(p, se)).join("")}</div>
    </section>`).join("");'''
JS_TAIL_NEW = '''      <div class="faith-grid">${posts.filter(p => p.series === se.id).map(p => faithCard(p, se)).join("")}</div>
    </section>${banners.filter(b => b.after === se.id).map(faithBanner).join("")}`).join("");'''
js = R("assets/site/site.js")
if "const prayerCard" not in js:
    assert JS_OLD in js and JS_TAIL_OLD in js
    js = js.replace(JS_OLD, JS_NEW).replace(JS_TAIL_OLD, JS_TAIL_NEW)
    W("assets/site/site.js", js)

# ── site.css
CSS = """
/* 신앙: 기도제목 카드 · 연재 사이 배너 (scripts/faith_prayer_banners.py) */
.prayer-card { margin-bottom: 64px; background: linear-gradient(160deg, #fffdf8, #f6efe2); border: 1px solid #ebe1cd; border-top: 4px solid var(--gold); border-radius: var(--radius); box-shadow: var(--shadow); padding: 34px 36px; }
.prayer-head h2 { margin-bottom: .25em; }
.prayer-head h2 small { font: 700 .8rem var(--sans); color: var(--gold); vertical-align: middle; margin-left: 6px; }
.prayer-meta { color: var(--muted); font-size: .88rem; margin: 0 0 14px; }
.prayer-intro { color: var(--ink-2); max-width: 52em; margin: 0 0 14px; }
.prayer-keys span { display: inline-block; margin: 0 8px 8px 0; padding: 4px 14px; border-radius: 999px; background: var(--navy); color: #fff; font-size: .85rem; font-weight: 500; }
.prayer-more summary { cursor: pointer; margin-top: 10px; font-weight: 700; color: var(--navy); }
.prayer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 20px; }
.prayer-sec { background: var(--paper); border: 1px solid #efe9de; border-radius: 12px; padding: 20px 22px; }
.prayer-sec h3 { font-size: 1.08rem; display: flex; align-items: center; gap: 10px; }
.prayer-sec h3 b { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--gold); color: #fff; font: 700 .85rem/28px var(--sans); text-align: center; }
.prayer-sec dl { margin: 0; }
.prayer-sec dt { font-weight: 700; color: var(--navy); margin-top: 12px; }
.prayer-sec dd { margin: 2px 0 0; color: var(--ink-2); font-size: .94rem; line-height: 1.7; }
.prayer-close { margin-top: 22px; padding: 24px 26px; background: var(--navy); color: #eef0f5; border-radius: 12px; }
.prayer-close h3 { color: #fff; }
.prayer-close p { margin: 0 0 .8em; line-height: 1.85; }
.prayer-close blockquote { margin: 0 0 .5em; font: 700 1.1rem/1.5 var(--serif); color: #e7cf9f; }
.faith-banner { position: relative; margin: 0 0 64px; border-radius: var(--radius); overflow: hidden; aspect-ratio: 4 / 1; min-height: 180px; box-shadow: var(--shadow); }
.faith-banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.faith-banner figcaption { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 6%; background: linear-gradient(90deg, rgba(20, 33, 61, .82), rgba(20, 33, 61, .25)); }
.faith-banner .eyebrow { color: #e7cf9f; margin-bottom: .4em; }
.faith-banner p { margin: 0; font: 700 clamp(1.3rem, 3.2vw, 2.2rem)/1.35 var(--serif); color: #fff; text-shadow: 0 2px 12px rgba(0, 0, 0, .35); }
@media (max-width: 720px) { .prayer-card { padding: 24px 18px; } .prayer-grid { grid-template-columns: 1fr; } .faith-banner { aspect-ratio: 2 / 1; } }
"""
css = R("assets/site/site.css")
if ".prayer-card" not in css:
    W("assets/site/site.css", css.rstrip("\n") + "\n" + CSS)
print("ok")
