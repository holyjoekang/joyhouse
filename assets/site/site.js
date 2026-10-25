// Joyhouse 2D — 머리·꼬리를 붙이고, data-render 자리를 content/·data/ JSON으로 채운다.
// 데이터는 scripts/sync_sources.py 가 매일 새로 만든다. 그래서 목록을 HTML에 박지 않고 여기서 읽는다.

const NAV = [
  ["index.html", "홈"],
  ["gallery.html", "그랜드 홀"],
  ["library.html", "서재"],
  ["blog.html", "블로그"],
  ["travel.html", "여행"],
  ["studio.html", "작업실"],
  ["china.html", "중국관"],
  ["faith.html", "신앙"],
  ["vision.html", "비전"],
  ["ideas.html", "아이디어"],
  ["family.html", "가족"],
];

const LINKS = {
  bookshelf: "https://holyjoekang.github.io/mybookshelf/app/",
  travel: "https://holyjoekang.github.io/my-travel-map/",
  blog: "https://holyjoekang.github.io/myblog/",
  naver: "https://blog.naver.com/joekang",
  keep121: "https://holyjoekang.github.io/keep121/",
  github: "https://github.com/holyjoekang",
};

const MARK = `<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M3 17 Q20 4 37 17 Q30 15 20 9 Q10 15 3 17Z" fill="#14213d"/>
  <rect x="8" y="17" width="24" height="17" rx="1" fill="#fff" stroke="#14213d" stroke-width="2"/>
  <rect x="12" y="21" width="3" height="13" fill="#b08d57"/><rect x="18.5" y="21" width="3" height="13" fill="#b08d57"/><rect x="25" y="21" width="3" height="13" fill="#b08d57"/>
</svg>`;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cache = {};
// content/*.json 은 자주 바뀌므로 매번 서버에 재확인한다(바뀌지 않았으면 304라 가볍다)
const json = path => (cache[path] ||= fetch(path, { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject(new Error(path))));
const here = (location.pathname.split("/").pop() || "index.html");

function header() {
  const nav = NAV.map(([href, label]) =>
    `<a href="${href}"${href === here ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin", `
<a class="skip" href="#main">본문으로</a>
<header class="site-header"><div class="wrap">
  <a class="brand" href="index.html">${MARK}<span>Joyhouse<small>Toripapa-house</small></span></a>
  <button class="menu-toggle" aria-expanded="false" aria-controls="nav">메뉴</button>
  <nav class="nav" id="nav">${nav}<a class="btn-3d" href="3d.html">3D 투어</a></nav>
</div></header>`);
  const btn = document.querySelector(".menu-toggle"), navEl = document.getElementById("nav");
  btn.addEventListener("click", () => {
    const open = navEl.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });
}

function footer() {
  document.body.insertAdjacentHTML("beforeend", `
<footer class="site-footer"><div class="wrap">
  <div class="cols">
    <div>
      <a class="brand" href="index.html">${MARK}<span>Joyhouse<small>Toripapa-house</small></span></a>
      <p>커리어 30년, 걸어온 길과 갈 길을 담다. 꿈으로 만든 나의 공간으로 다시 탄생하는 죠이하우스 — 서재·여행 지도·블로그·Keep121이 이 집의 방이 되어 이어집니다.</p>
    </div>
    <div><h4>집 안의 방</h4><ul>
      <li><a href="gallery.html">그랜드 홀 · 고흐 갤러리</a></li><li><a href="library.html">블루룸 · 나의 서재</a></li>
      <li><a href="blog.html">레드룸 · 블로그</a></li><li><a href="travel.html">맵룸 · 여행 지도</a></li>
      <li><a href="studio.html">오벌 오피스 · 작업실</a></li></ul></div>
    <div><h4>윙</h4><ul>
      <li><a href="china.html">중국관 · 중국 생활 7년</a></li><li><a href="faith.html">신앙 · 말씀과 일</a></li><li><a href="vision.html">비전룸 · 세 번째 30년</a></li>
      <li><a href="ideas.html">아이디어 랩 · 창업 아이디어 31</a></li>
      <li><a href="family.html">가족의 방들</a></li><li><a href="3d.html">3D 투어</a></li></ul></div>
    <div><h4>바깥 사이트</h4><ul>
      <li><a href="${LINKS.bookshelf}">나의 서재</a></li><li><a href="${LINKS.travel}">나의 여행 지도</a></li>
      <li><a href="${LINKS.blog}">50플러스 인사이트</a></li><li><a href="${LINKS.naver}" target="_blank" rel="noopener">네이버 블로그 ↗</a></li>
      <li><a href="${LINKS.keep121}">Keep121</a></li></ul></div>
  </div>
  <div class="bottom"><span>© ${new Date().getFullYear()} Joyhouse · 토리아빠</span>
    <a href="credits.html">사진·그림 출처</a></div>
</div></footer>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="크게 보기"><img alt=""><p></p></div>`);
}

/* ── 히어로 슬라이드 ── */
function heroSlides() {
  const box = document.querySelector(".hero-slides");
  if (!box) return;
  const imgs = [...box.querySelectorAll("img")], credit = document.querySelector(".hero .photo-credit");
  const dots = document.querySelector(".hero-dots");
  let i = 0, timer;
  const show = n => {
    imgs[i].classList.remove("on"); dots?.children[i]?.classList.remove("on");
    i = (n + imgs.length) % imgs.length;
    imgs[i].classList.add("on"); dots?.children[i]?.classList.add("on");
    if (credit) creditFor(imgs[i]).then(t => credit.innerHTML = t);
  };
  if (dots) imgs.forEach((_, n) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `사진 ${n + 1}`);
    b.addEventListener("click", () => { show(n); clearInterval(timer); });
    dots.append(b);
  });
  imgs[0].classList.add("on"); dots?.children[0]?.classList.add("on");
  if (credit) creditFor(imgs[0]).then(t => credit.innerHTML = t);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && imgs.length > 1)
    timer = setInterval(() => show(i + 1), 6500);
}

async function creditFor(img) {
  const name = img.getAttribute("src").split("/").pop().replace(".webp", "");
  const c = (await json("assets/photos/credits.json").catch(() => ({})))[name];
  if (!c) return "";
  return c.source === "unsplash"
    ? `사진: <a href="credits.html">Unsplash</a>`
    : `사진: <a href="${esc(c.page)}" target="_blank" rel="noopener">${esc(c.creator)}</a> · ${esc(c.license)}`;
}

/* ── 렌더러 ── */
const R = {};

// 아이디어 랩: 목록(필터 칩 + 카드)과 상세(공통 틀 10블록). 대장은 content/ideas.json
const photo = name => `assets/photos/${name}.webp`;
const ideaCard = (it, th) => `
  <a class="idea-card" href="idea.html?id=${esc(it.id)}" data-theme="${it.theme}" style="--tc:${th.color}">
    <div class="idea-img"><img src="${photo(it.img.hero)}" alt="" loading="lazy"><span class="idea-no">${String(it.no).padStart(2, "0")}</span></div>
    <div class="idea-body">
      <span class="card-kicker" style="color:${th.color}">${esc(th.name)} · ${esc(it.stage)}</span>
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.one)}</p>
      <div class="idea-badges"><span>초기자본 ${esc(it.capital)}</span><span>목표 ${esc(it.goal)}</span></div>
    </div>
  </a>`;

R.ideas = async el => {
  const { themes, ideas, featured } = await json("content/ideas.json");
  const chips = [["all", "전체", ideas.length], ...Object.entries(themes).map(([k, t]) => [k, t.name, ideas.filter(i => i.theme === k).length])];
  el.innerHTML = `
    <a class="idea-featured" href="${esc(featured.href)}">
      <img src="${photo(featured.img)}" alt="" loading="lazy">
      <div><span class="card-kicker">${esc(featured.stage)} · 아이디어에서 사업으로</span><h3>${esc(featured.title)}</h3><p>${esc(featured.one)}</p></div>
    </a>
    <div class="idea-filter" role="toolbar" aria-label="테마로 거르기">${chips.map(([k, n, c], i) =>
      `<button data-f="${k}" aria-pressed="${i === 0}"${k !== "all" ? ` style="--tc:${themes[k].color}"` : ""}>${esc(n)} <small>${c}</small></button>`).join("")}</div>
    <div class="idea-grid">${ideas.map(it => ideaCard(it, themes[it.theme])).join("")}</div>`;
  el.querySelector(".idea-filter").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    el.querySelectorAll(".idea-filter button").forEach(x => x.setAttribute("aria-pressed", x === b));
    el.querySelectorAll(".idea-card").forEach(c => { c.hidden = b.dataset.f !== "all" && c.dataset.theme !== b.dataset.f; });
  });
};

R.idea = async el => {
  const { themes, ideas } = await json("content/ideas.json");
  const id = new URLSearchParams(location.search).get("id");
  const k = ideas.findIndex(i => i.id === id);
  if (k < 0) {
    document.querySelector(".page-hero h1").textContent = "아이디어를 찾을 수 없습니다";
    el.innerHTML = `<section class="block"><div class="wrap"><p>주소가 바뀌었거나 아직 반영 중입니다. <a href="ideas.html">아이디어 목록</a>에서 다시 골라 주세요.</p></div></section>`;
    return;
  }
  const it = ideas[k], th = themes[it.theme];
  const same = ideas.filter(i => i.theme === it.theme), s = same.indexOf(it);
  const prev = same[(s - 1 + same.length) % same.length], next = same[(s + 1) % same.length];
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join("");
  const C = it.canvas;
  const cell = (cls, label, v) => `<div class="bmc-${cls}"><h4>${label}</h4><p>${esc(v)}</p></div>`;
  document.title = `${it.title} — 아이디어 랩 · Joyhouse`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", it.one);
  const hero = document.querySelector(".page-hero");
  hero.style.backgroundImage = `url('${photo(it.img.hero)}')`;
  hero.querySelector(".wrap").innerHTML = `
    <div class="crumbs"><a href="index.html">홈</a> / <a href="ideas.html">아이디어 랩</a> / ${String(it.no).padStart(2, "0")}</div>
    <span class="eyebrow">${esc(th.name)} · ${esc(th.en)}</span>
    <h1>${esc(it.title)}</h1>
    <p>${esc(it.one)}</p>
    <div class="idea-tags"><span>${esc(it.stage)}</span><span>초기자본 ${esc(it.capital)}</span><span>목표 ${esc(it.goal)}</span>${it.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>${it.page ? `
    <div class="hero-cta"><a class="btn btn-primary" href="${esc(it.page.href)}">${esc(it.page.label)} →</a></div>` : ""}`;
  creditFor({ getAttribute: () => photo(it.img.hero) }).then(t => { hero.querySelector(".photo-credit").innerHTML = t; });
  el.style.setProperty("--tc", th.color);
  el.innerHTML = `
  <section class="block"><div class="wrap">
    <div class="idea-ps reveal">
      <div><span class="eyebrow">Problem</span><h2>문제</h2><ul class="checks x">${li(it.problem)}</ul></div>
      <div><span class="eyebrow">Solution</span><h2>해결</h2><ul class="checks">${li(it.solution)}</ul></div>
    </div>
    <div class="idea-who reveal"><span class="eyebrow">Customers</span><h3>타깃 고객</h3><ul>${li(it.customers)}</ul></div>
  </div></section>
  ${(it.details || []).length ? `
  <section class="block tight"><div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">How it works</span><h2>프로그램 구성</h2></div></div>
    ${it.details.map(t => `<div class="idea-detail-table reveal"><h3>${esc(t.title)}</h3><div class="table-scroll"><table>
      <thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${t.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join("")}</tr>`).join("")}</tbody>
    </table></div></div>`).join("")}
  </div></section>` : ""}

  <section class="block alt"><div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Business Model</span><h2>비즈니스 모델</h2></div>
      <p class="lead">비즈니스 모델 캔버스 9칸으로 정리했습니다.</p></div>
    <div class="bmc reveal">
      ${cell("part", "핵심 파트너", C.part)}${cell("act", "핵심 활동", C.act)}${cell("res", "핵심 자원", C.res)}
      ${cell("value", "가치 제안", C.value)}${cell("rel", "고객 관계", C.rel)}${cell("chan", "채널", C.chan)}
      ${cell("seg", "고객 세그먼트", C.seg)}${cell("cost", "비용 구조", C.cost)}${cell("rev", "수익원", C.rev)}
    </div>
    <div class="idea-money reveal">
      <h3>수익 구조 <small>추정치</small></h3>
      <table>${it.money.rows.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</table>
      <p class="muted">${esc(it.money.note)}</p>
    </div>
  </div></section>

  <section class="block"><div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">Market</span><h2>시장과 경쟁</h2>
      <table class="idea-alt"><thead><tr><th>대안·경쟁</th><th>한계</th></tr></thead><tbody>
        ${it.market.alt.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
      <p class="idea-edge"><b>차별점</b> ${esc(it.market.edge)}</p>
    </div>
    <div class="figure reveal"><img src="${photo(it.img.body)}" alt="" loading="lazy"></div>
  </div></section>

  <section class="block alt"><div class="wrap">
    <div class="sec-head reveal"><div><span class="eyebrow">Roadmap</span><h2>실행 로드맵</h2></div></div>
    <ol class="idea-road reveal">${it.roadmap.map(([w, t]) => `<li><b>${esc(w)}</b><span>${esc(t)}</span></li>`).join("")}</ol>
    <div class="idea-risk reveal"><h3>리스크와 검증 과제</h3>
      <table><thead><tr><th>핵심 가정</th><th>검증 방법</th></tr></thead><tbody>
        ${it.risks.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div>
  </div></section>

  <section class="block"><div class="wrap">
    <blockquote class="idea-why reveal"><span class="eyebrow">Why me</span><p>${esc(it.why)}</p></blockquote>
    <nav class="idea-pager reveal" aria-label="같은 테마의 다른 아이디어">
      <a href="idea.html?id=${esc(prev.id)}">← ${esc(prev.title)}</a>
      <a href="ideas.html">목록</a>
      <a href="idea.html?id=${esc(next.id)}">${esc(next.title)} →</a>
    </nav>
    <p class="muted idea-note">개인 노트에서 옮겨 정리한 아이디어입니다. 금액은 모두 추정치이며 실제 사업 계획과 다를 수 있습니다.</p>
  </div></section>`;
  reveal();
};

// 신앙: 연재 3개(말씀 노트·쉽게 읽는 성경·일과 신앙)와 글 12편. 대장은 content/faith.json
const faithCard = (p, se) => `
  <a class="faith-card" href="faith-post.html?id=${esc(p.id)}" data-topic="${p.topic || ""}" style="--tc:${se.color}">
    <div class="faith-img"><img src="${photo(p.img)}" alt="" loading="lazy"></div>
    <div class="faith-body">
      <span class="card-kicker" style="color:${se.color}">${esc(se.name)} · ${esc(p.scripture)}</span>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary)}</p>
    </div>
  </a>`;

// 기도제목: 해마다 한 장씩 쌓인다. 최신 카드만 펼친 채로 시작
const prayerCard = p => `
  <article class="prayer-card reveal" id="prayer-${esc(p.id)}">
    <div class="prayer-head">
      <span class="eyebrow">Prayer · ${esc(p.year)}</span>
      <h2>${esc(p.title)} <small>v${esc(p.version)}</small></h2>
      <p class="prayer-meta">작성: ${esc(p.written)}${p.revised?.length ? ` | 수정: ${p.revised.map(esc).join(", ")}` : ""}</p>
      <div class="prayer-keys">${(p.keywords || []).map(k => `<span>${esc(k)}</span>`).join("")}</div>
    </div>
    <div class="prayer-grid">${p.sections.map((s, n) => `
        <section class="prayer-sec"><h3><b>${n + 1}</b>${esc(s.title)}</h3>
          <ul>${s.items.map(it => `<li>${esc(it.h)}</li>`).join("")}</ul>
        </section>`).join("")}</div>
      ${p.closing ? `<div class="prayer-close"><h3>${esc(p.closing.title)}</h3>
        ${p.closing.body.map(t => `<p>${esc(t)}</p>`).join("")}
        ${p.closing.quotes.map(q => `<blockquote>"${esc(q)}"</blockquote>`).join("")}
        <p>${esc(p.closing.end)}</p></div>` : ""}
  </article>`;

const faithBanner = b => `
  <figure class="faith-banner reveal"><img src="${photo(b.img)}" alt="" loading="lazy">
    <figcaption><span class="eyebrow">${esc(b.eyebrow)}</span><p>${esc(b.text)}</p></figcaption>
  </figure>`;

const faithList = se => se.featured ? `faith-series.html?s=${se.id}` : `faith.html#${se.id}`;
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

R.faith = async el => {
  const { prayers = [], banners = [], series, posts } = await json("content/faith.json");
  el.innerHTML = [...prayers].sort((a, b) => b.year - a.year).map(prayerCard).join("") + series.map(se => `
    <section class="faith-series reveal" id="${se.id}" style="--tc:${se.color}">
      <div class="faith-series-head"><span class="eyebrow">${esc(se.en)}</span><h2>${esc(se.name)}</h2><p>${esc(se.desc)}</p></div>
      ${se.featured ? "" : faithFilter(se, posts)}
      <div class="faith-grid">${se.featured
        ? se.featured.map(id => posts.find(p => p.id === id)).map(p => faithCard(p, se)).join("") + faithMore(se, posts)
        : posts.filter(p => p.series === se.id).map(p => faithCard(p, se)).join("")}</div>
    </section>${banners.filter(b => b.after === se.id).map(faithBanner).join("")}`).join("");
  faithFilterWire(el);
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

R.faithPost = async el => {
  const { series, posts } = await json("content/faith.json");
  const id = new URLSearchParams(location.search).get("id");
  const p = posts.find(x => x.id === id) || posts[0], se = series.find(x => x.id === p.series);
  const same = posts.filter(x => x.series === p.series), s = same.indexOf(p);
  const prev = same[(s - 1 + same.length) % same.length], next = same[(s + 1) % same.length];
  document.title = `${p.title} — 신앙 · Joyhouse`;
  const hero = document.querySelector(".page-hero");
  hero.style.backgroundImage = `url('${photo(p.img)}')`;
  hero.querySelector(".wrap").innerHTML = `
    <div class="crumbs"><a href="index.html">홈</a> / <a href="faith.html">신앙</a> / <a href="${faithList(se)}">${esc(se.name)}</a></div>
    <span class="eyebrow">${esc(se.name)} · ${esc(se.en)}</span>
    <h1>${esc(p.title)}</h1>
    <p>${esc(p.summary)}</p>`;
  creditFor({ getAttribute: () => photo(p.img) }).then(t => { hero.querySelector(".photo-credit").innerHTML = t; });
  el.style.setProperty("--tc", se.color);
  el.innerHTML = `
  <section class="block"><div class="wrap faith-article">
    <div class="faith-meta"><span>${esc(p.scripture)}</span><time datetime="${esc(p.date)}">${esc(p.date.replaceAll("-", ". "))}</time></div>
    <blockquote class="faith-verse">${esc(p.verse)}</blockquote>
    ${p.body.map(t => `<p>${esc(t)}</p>`).join("")}
    <aside class="faith-q"><span class="eyebrow">For Reflection</span><p>${esc(p.question)}</p></aside>
    <nav class="idea-pager" aria-label="같은 연재의 다른 글">
      <a href="faith-post.html?id=${esc(prev.id)}">← ${esc(prev.title)}</a>
      <a href="${faithList(se)}">목록</a>
      <a href="faith-post.html?id=${esc(next.id)}">${esc(next.title)} →</a>
    </nav>
    <p class="muted idea-note">설교를 듣고 남긴 기록과 공부 노트를 바탕으로 다시 쓴 글입니다. 성경 인용은 개역개정.</p>
  </div></section>`;
};

// 중국관: 블로그 칼럼 아카이브(주제 7개, 필터 칩 + 글 목록). 대장은 content/china.json
R.chinaColumns = async el => {
  const { groups, count } = await json("content/china.json");
  const chips = [["all", "전체", count], ...groups.map(g => [g.id, g.name.replace(/^연재 /, ""), g.posts.length])];
  el.innerHTML = `
    <div class="idea-filter cc-filter" role="toolbar" aria-label="주제로 거르기">${chips.map(([k, n, c], i) =>
      `<button type="button" data-f="${k}" aria-pressed="${i === 0}">${esc(n)} <small>${c}</small></button>`).join("")}</div>
    ${groups.map(g => `
    <section class="cc-group" data-g="${g.id}" id="cc-${g.id}" style="--tc:${g.color}">
      <div class="faith-series-head"><span class="eyebrow">${esc(g.en)}</span><h3>${esc(g.name)}</h3><p>${esc(g.desc)}</p></div>
      <ol class="cc-list">${[...g.posts].sort((a, b) => a.date.localeCompare(b.date)).map(p => `
        <li><a href="${esc(p.url)}" target="_blank" rel="noopener">
          <time datetime="${p.date}">${p.date.slice(0, 7).replace("-", ". ")}</time>
          <b>${esc(p.title)}</b><span>${esc(p.note)}</span></a></li>`).join("")}</ol>
    </section>`).join("")}`;
  const bar = el.querySelector(".cc-filter");
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    bar.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    el.querySelectorAll(".cc-group").forEach(g => { g.hidden = b.dataset.f !== "all" && g.dataset.g !== b.dataset.f; });
  });
};

R.books = async el => {
  const { books } = await json("data/books_top20.json");
  const n = +el.dataset.limit || books.length;
  el.innerHTML = books.slice(0, n).map(b => `
<a class="book" href="${esc(b.url || LINKS.bookshelf)}">
  <div class="book-cover">${b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.title)} 표지" loading="lazy">` : esc(b.title)}</div>
  <h4>${esc(b.title)}</h4><small>${esc(b.author || "—")} · ${esc((b.read || "").slice(0, 7))}</small>
</a>`).join("");
};

const fmtDate = s => { const d = new Date(s); return isNaN(d) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };

R.posts = async el => {
  const { posts } = await json("data/blog_latest.json");
  const n = +el.dataset.limit || posts.length;
  el.innerHTML = posts.slice(0, n).map(p => `
<a class="post" href="${esc(p.url)}" target="_blank" rel="noopener">
  <span class="card-kicker">${esc(p.category)}</span>
  <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><time>${fmtDate(p.date)} · 원문 읽기 ↗</time>
</a>`).join("");
};

R.timeline = async el => {
  const { eras } = await json("data/timeline.json");
  el.innerHTML = eras.map(e => `
<div class="era"><small>${esc(e.start.slice(0, 4))} – ${e.end ? esc(e.end.slice(0, 4)) : "현재"}</small>
<b>${esc(e.name)}</b><span>${esc(e.role)}</span></div>`).join("");
};

R.gallery = async el => {
  const { items } = await json("content/rooms/grandhall.json");
  el.innerHTML = items.filter(i => i.type === "frame" && i.src).map(f => `
<button class="art" data-full="${esc(f.src)}" data-cap="${esc(`${f.title} · ${f.artist}, ${f.year} · ${f.where}`)}">
  <figure style="margin:0"><img src="${esc(f.src)}" alt="${esc(f.title)}" loading="lazy">
  <figcaption><b>${esc(f.title)}</b><small>${esc(f.artist)} · ${esc(f.year)} · ${esc(f.where)}</small>
  ${f.note ? `<p class="muted" style="margin:.4em 0 0;font-size:.85rem">${esc(f.note)}</p>` : ""}</figcaption></figure>
</button>`).join("");
};

// 등장방형 투영. 남극 아래와 북극 위는 잘라 낸다.
const project = ([lng, lat]) => [(lng + 180).toFixed(1), (85 - lat).toFixed(1)];
const svgMap = async (el, cities) => {
  const { countries } = await json("data/world_land.json");
  const land = countries.map(c => c.rings.map(r => "M" + r.map(p => project(p).join(",")).join("L") + "Z").join("")).join("");
  const dots = cities.filter(c => c.lat != null && c.lng != null).map(c => {
    const [x, y] = project([c.lng, c.lat]);
    return `<circle class="pin" cx="${x}" cy="${y}" r="${(1.1 + Math.sqrt(c.visits) * .7).toFixed(2)}"><title>${esc(c.name)}${c.visits ? ` · ${c.visits}번` : ""}</title></circle>`;
  }).join("");
  el.innerHTML = `<svg viewBox="0 0 360 145" role="img" aria-label="다녀간 도시 ${cities.length}곳 지도"><path class="land" d="${land}"/>${dots}</svg>`;
};

// 구글 지도 — 여행 지도와 같이 베이징에서 시작한다. 키는 여행 지도가 배포 때 내놓는 maps.json 에서 읽는다
// (이 저장소에는 키가 없다). 키가 없거나 구글이 받아 주지 않으면 위의 그림 지도로 돌아간다.
const MAPS_JSON = "https://holyjoekang.github.io/my-travel-map/maps.json";
const BEIJING = { lat: 39.9042, lng: 116.4074 };
let gmapsLoading = null;
const loadGoogleMaps = key => window.google?.maps ? Promise.resolve() : (gmapsLoading ||= new Promise((ok, fail) => {
  window.__gmapsReady = ok;          // loading=async 는 onload 가 아니라 callback 으로 준비를 알린다
  const s = document.createElement("script");
  s.async = true;
  s.onerror = fail;
  s.src = `https://maps.googleapis.com/maps/api/js?loading=async&language=ko&callback=__gmapsReady&key=${encodeURIComponent(key)}`;
  document.head.append(s);
}));
// 도시 목록은 여행 지도의 '여행지' 쪽과 같은 것(data/cities.json, 같은 순서·같은 횟수)이다.
R.map = async el => {
  const { cities } = await json("data/cities.json");
  try {
    const { googleMapsKey: key } = await fetch(MAPS_JSON, { cache: "no-cache" }).then(r => r.json());
    if (!key) throw new Error("no key");
    window.gm_authFailure = () => svgMap(el, cities);   // 키가 이 주소를 막으면 구글이 부른다
    await loadGoogleMaps(key);
    el.innerHTML = `<div class="gmap" role="region" aria-label="다녀간 도시 ${cities.length}곳 지도"></div>`;
    const map = new google.maps.Map(el.firstElementChild, {
      center: BEIJING, zoom: 5, mapTypeControl: false, streetViewControl: false,
      fullscreenControl: true, backgroundColor: "#0f1a33",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#a9b8d6" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a33" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a33" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3c4f7a" }] },
        { featureType: "road", stylers: [{ visibility: "off" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    for (const c of cities) {
      if (c.lat == null || c.lng == null) continue;
      new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng }, map,
        title: c.name + (c.visits ? ` · ${c.visits}번` : ""),
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4 + Math.min(Math.sqrt(c.visits || 1) * 1.6, 8),
                fillColor: "#f2c46b", fillOpacity: .92, strokeColor: "#fff", strokeWeight: 1 },
      });
    }
  } catch {
    await svgMap(el, cities);
  }
};

R.pins = async el => {
  const { cities } = await json("data/cities.json");
  el.innerHTML = cities.map(c => `<li><span>${esc(c.name)} <small class="muted">${esc(c.country)}</small></span> <b>${c.visits ? `${c.visits}번` : ""}</b></li>`).join("");
};

// trip.com CDN 은 파일명 끝의 _D_1180_558 로 크기를 정한다 (여행 지도와 같은 방식).
const sized = (url, w, h) => (url || "").replace(/_[A-Z]_\d+_\d+(_R\d+)?(?=\.\w+(\?|$))/, `_D_${w}_${h}`);
R.dests = async el => {
  const { cities } = await json("data/cities.json");
  const n = +el.dataset.limit || 4;
  el.innerHTML = cities.slice(0, n).map(d => `
<article class="card dest">
  <div class="card-img">${d.cover ? `<img src="${esc(sized(d.cover, 480, 300))}" alt="${esc(d.name)} 사진" loading="lazy" referrerpolicy="no-referrer">` : ""}
    ${d.visits ? `<span class="visits">${d.visits}번 갔다</span>` : ""}</div>
  <div class="card-body">
    <h3>${esc(d.name)}</h3>
    <div class="where">${esc([d.country, d.enName].filter(Boolean).join(" · "))}</div>
    <p class="intro">${esc(d.intro)}</p>
    <div class="card-foot">${d.url ? `<a class="link-arrow" href="${esc(d.url)}" target="_blank" rel="noopener nofollow">Trip.com 가이드 →</a><span>사진·소개 © Trip.com</span>` : "<span>Trip.com 가이드가 없는 곳</span>"}</div>
  </div>
</article>`).join("");
};

const APP_COLORS = ["#2d4a7a", "#1f6f5a", "#8a1c1c", "#b08d57", "#5a3d7a", "#14213d"];
R.apps = async el => {
  const rooms = (el.dataset.room || "oval,china").split(",");
  const items = (await Promise.all(rooms.map(r => json(`content/rooms/${r}.json`)))).flatMap(d => d.items.filter(i => i.type === "monitor"));
  el.innerHTML = items.map((a, n) => `
<article class="card app-card"><div class="card-body">
  <div class="app-icon" style="background:${APP_COLORS[n % APP_COLORS.length]}">${esc(a.title[0])}</div>
  <span class="card-kicker">${esc(a.group)}</span><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p>
  <div><span class="tag">${esc(a.tech)}</span></div>
  <div class="app-links">${(a.links || []).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
</div></article>`).join("");
};

// 이 집을 지은 방법 — content/making.json 의 부분(data-part)을 그린다. data-brief 면 단계 제목만.
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

R.posters = async el => {
  const { items } = await json(`content/rooms/${el.dataset.room}.json`);
  const photos = (el.dataset.photos || "").split(",").filter(Boolean);
  el.innerHTML = items.filter(i => i.type === "poster").map((p, n) => `
<a class="card" href="${esc(p.url)}">
  ${photos.length ? `<div class="card-img"><img src="assets/photos/${photos[n % photos.length]}.webp" alt="" loading="lazy"></div>` : ""}
  <div class="card-body"><span class="card-kicker">${esc(p.kicker)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
  <div class="card-foot"><span class="link-arrow">자세히 보기 →</span></div></div>
</a>`).join("");
};

R.count = async el => {
  const [file, key] = el.dataset.src.split("#");
  const d = await json(file);
  const v = d[key];
  el.textContent = Array.isArray(v) ? v.length : v;   // 목록이면 개수, 숫자면 그대로
};

R.credits = async el => {
  const c = await json("assets/photos/credits.json");
  el.innerHTML = `<table class="credits"><thead><tr><th>사진</th><th>설명</th><th>작가</th><th>라이선스</th></tr></thead><tbody>${
    Object.values(c).map(p => `<tr><td><img src="${esc(p.file)}" alt="" loading="lazy"></td><td>${esc(p.alt)}</td>
    <td>${p.page ? `<a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.creator)}</a>` : esc(p.creator)}</td>
    <td><a href="${esc(p.license_url)}" target="_blank" rel="noopener">${esc(p.license)}</a></td></tr>`).join("")}</tbody></table>`;
};

function lightbox() {
  const box = document.querySelector(".lightbox");
  document.addEventListener("click", e => {
    const art = e.target.closest(".art");
    if (art) {
      box.querySelector("img").src = art.dataset.full;
      box.querySelector("p").textContent = art.dataset.cap;
      box.classList.add("on");
    } else if (e.target.closest(".lightbox")) box.classList.remove("on");
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") box.classList.remove("on"); });
}

function houseMap() {
  const desc = document.querySelector(".house-desc");
  if (!desc) return;
  const idle = desc.textContent;
  document.querySelectorAll(".hs-room").forEach(a => {
    const show = () => { desc.textContent = a.dataset.desc; };
    a.addEventListener("mouseenter", show);
    a.addEventListener("focus", show);
    a.addEventListener("mouseleave", () => { desc.textContent = idle; });
  });
}

function reveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach(e => io.observe(e));
}

// 페이지 맨 위 배너와 홈의 방 카드. 글은 content/pages.json 에서 고친다.
R.hero = async el => {
  const h = (await json("content/pages.json")).heroes[here];
  if (!h) return;
  el.style.backgroundImage = `url('${h.bg}')`;
  el.innerHTML = `<div class="wrap">
    <div class="crumbs"><a href="index.html">홈</a> / ${esc(h.crumb)}</div>
    <span class="eyebrow">${esc(h.eyebrow)}</span>
    <h1>${esc(h.title)}</h1>
    <p>${h.textHtml}</p>
    ${h.ctas.length ? `<div class="hero-cta">${h.ctas.map(c => `<a class="btn ${c.primary ? "btn-primary" : "btn-ghost"}" href="${esc(c.href)}"${c.newTab ? ' target="_blank" rel="noopener"' : ""}>${esc(c.text)}</a>`).join("")}</div>` : ""}
  </div>`;
};
// 비전룸 — 그리는 코드는 vision.js, 글은 content/vision.json
R.vision = async el => (await import("./vision.js")).default(el, json, esc);
R.rooms = async el => {
  const { rooms } = await json("content/pages.json");
  el.innerHTML = rooms.map(r => `
<a class="room-card ${esc(r.size)} reveal in" href="${esc(r.href)}"><img src="${esc(r.img)}" alt="" loading="lazy">
  <div><span class="card-kicker">${esc(r.kicker)}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div></a>`).join("");
};

header();
footer();
heroSlides();
lightbox();
houseMap();
reveal();
document.querySelectorAll("[data-render]").forEach(el =>
  R[el.dataset.render](el).catch(err => { console.error(err); el.innerHTML = '<p class="muted">자료를 불러오지 못했습니다.</p>'; }));
