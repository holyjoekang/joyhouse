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
  ["vision.html", "비전"],
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
const json = path => (cache[path] ||= fetch(path).then(r => r.ok ? r.json() : Promise.reject(new Error(path))));
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
      <p>한 사람의 60년을 방 하나하나에 담은 집. 서재·여행 지도·블로그·Keep121이 이 집의 방이 되어 이어집니다.</p>
    </div>
    <div><h4>집 안의 방</h4><ul>
      <li><a href="gallery.html">그랜드 홀 · 고흐 갤러리</a></li><li><a href="library.html">블루룸 · 나의 서재</a></li>
      <li><a href="blog.html">레드룸 · 블로그</a></li><li><a href="travel.html">맵룸 · 여행 지도</a></li>
      <li><a href="studio.html">오벌 오피스 · 작업실</a></li></ul></div>
    <div><h4>윙</h4><ul>
      <li><a href="china.html">중국관 · 주재원 9년</a></li><li><a href="vision.html">비전룸 · Keep121</a></li>
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

R.books = async el => {
  const { books } = await json("data/books_top20.json");
  const n = +el.dataset.limit || books.length;
  el.innerHTML = books.slice(0, n).map(b => `
<a class="book" href="${LINKS.bookshelf}">
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
R.map = async el => {
  const [{ countries }, { pins }] = await Promise.all([json("data/world_land.json"), json("data/globe_pins.json")]);
  const land = countries.map(c => c.rings.map(r => "M" + r.map(p => project(p).join(",")).join("L") + "Z").join("")).join("");
  const dots = pins.map(p => {
    const [x, y] = project([p.lng, p.lat]);
    return `<circle class="pin" cx="${x}" cy="${y}" r="${(1.3 + Math.sqrt(p.visits) * .7).toFixed(2)}"><title>${esc(p.name)} · ${p.visits}회</title></circle>`;
  }).join("");
  el.innerHTML = `<svg viewBox="0 0 360 145" role="img" aria-label="다녀간 도시 ${pins.length}곳 지도"><path class="land" d="${land}"/>${dots}</svg>`;
};

R.pins = async el => {
  const { pins } = await json("data/globe_pins.json");
  el.innerHTML = [...pins].sort((a, b) => b.visits - a.visits).map(p => `<li>${esc(p.name)} <b>${p.visits}회</b></li>`).join("");
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
  el.textContent = d[key].length;
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

function reveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach(e => io.observe(e));
}

header();
footer();
heroSlides();
lightbox();
reveal();
document.querySelectorAll("[data-render]").forEach(el =>
  R[el.dataset.render](el).catch(err => { console.error(err); el.innerHTML = '<p class="muted">자료를 불러오지 못했습니다.</p>'; }));
