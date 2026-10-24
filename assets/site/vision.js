// 비전룸 — 세 번째 30년. 모든 글은 content/vision.json 에서 고친다.
export default async function vision(el, json, esc) {
  const d = await json("content/vision.json");
  const head = (s, center) => `<div class="sec-head${center ? " v-center" : ""}"><div><span class="eyebrow">${esc(s.eyebrow)}</span><h2>${esc(s.title)}</h2>${s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ""}</div></div>`;
  const list = a => `<ul class="checks">${a.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const S = {};

  // 1. 삶의 세 막
  S.acts = s => `${head(s)}<div class="v-acts">${s.items.map((a, n) => `
<article class="v-act${a.now ? " now" : ""}">
  <div class="v-act-top"><span class="v-act-no">${esc(a.no)}</span><span class="v-act-age">${esc(a.age)}</span></div>
  <h3>${esc(a.title)}<small>${esc(a.en)}</small></h3>
  <p class="v-act-verb">${esc(a.verb)}</p>
  <p>${esc(a.text)}</p>
  <div class="v-tags">${a.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>
  ${n < s.items.length - 1 ? '<i class="v-arrow" aria-hidden="true">→</i>' : ""}
</article>`).join("")}</div>${s.note ? `<p class="v-note">${esc(s.note)}</p>` : ""}`;

  // 2. 비전 선언
  S.statement = s => `<div class="v-statement">
  <span class="eyebrow">${esc(s.eyebrow)}</span>
  <p class="v-vision">${esc(s.vision)}</p>
  <div class="v-pair">
    ${s.lines.map(l => `<div><span class="card-kicker">${esc(l.label)}</span><p>${esc(l.text)}</p></div>`).join("")}
  </div>
  <div class="v-values">${s.values.map(v => `<div><b>${esc(v.word)}</b><small>${esc(v.en)}</small><p>${esc(v.text)}</p></div>`).join("")}</div>
</div>`;

  // 3. 여섯 영역의 조화 — 바퀴 + 카드
  S.wheel = s => {
    const N = s.items.length, R = 132, C = 180;
    const pt = (i, r) => [C + r * Math.sin(2 * Math.PI * i / N), C - r * Math.cos(2 * Math.PI * i / N)];
    const poly = s.items.map((_, i) => pt(i, R).map(v => v.toFixed(1)).join(",")).join(" ");
    const svg = `<svg class="v-wheel" viewBox="0 0 360 360" role="img" aria-label="여섯 영역의 조화">
  <polygon points="${poly}" class="v-hex"/>
  ${s.items.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" class="v-spoke"/>`; }).join("")}
  <circle cx="${C}" cy="${C}" r="46" class="v-core"/><text x="${C}" y="${C - 4}" class="v-core-t">조화</text><text x="${C}" y="${C + 16}" class="v-core-s">HARMONY</text>
  ${s.items.map((it, i) => { const [x, y] = pt(i, R); return `<a href="#v-${i}"><circle cx="${x}" cy="${y}" r="30" class="v-node" style="--c:${it.color}"/><text x="${x}" y="${y + 6}" class="v-node-t">${esc(it.name)}</text></a>`; }).join("")}
</svg>`;
    return `${head(s)}<div class="v-wheel-wrap">${svg}<div class="v-wheel-side"><p class="lead">${esc(s.side)}</p>${list(s.rules)}</div></div>
<div class="grid grid-3 v-areas">${s.items.map((it, i) => `
<article class="card v-area" id="v-${i}" style="--c:${it.color}"><div class="card-body">
  <span class="card-kicker">${esc(it.en)}</span><h3>${esc(it.name)} — ${esc(it.aim)}</h3>
  <p>${esc(it.text)}</p>
  <dl><dt>2037의 모습</dt><dd>${esc(it.picture)}</dd><dt>지금의 습관</dt><dd>${esc(it.habit)}</dd></dl>
</div></article>`).join("")}</div>`;
  };

  // 4. 남길 것 — 사회 / 자녀
  S.legacy = s => `${head(s)}<div class="grid grid-2 v-legacy">
  <article class="card"><div class="card-body"><span class="card-kicker">${esc(s.society.kicker)}</span><h3>${esc(s.society.title)}</h3><p>${esc(s.society.text)}</p>
    <div class="v-goals">${s.society.goals.map(g => `<div><b>${esc(g.n)}</b><span>${esc(g.t)}</span></div>`).join("")}</div>${list(s.society.ways)}</div></article>
  <article class="card"><div class="card-body"><span class="card-kicker">${esc(s.children.kicker)}</span><h3>${esc(s.children.title)}</h3><p>${esc(s.children.text)}</p>
    <table class="v-table"><thead><tr><th>유형의 자산</th><th>무형의 자산</th></tr></thead><tbody>${s.children.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table>
    <p class="v-note">${esc(s.children.note)}</p></div></article>
</div>`;

  // 5. 일의 구조 40·40·20
  S.work = s => `${head(s)}<div class="v-layers">${s.layers.map(l => `
<div class="v-layer" style="--w:${l.pct}"><b>${esc(l.pct)}%</b><div><h3>${esc(l.name)}</h3><p>${esc(l.text)}</p></div></div>`).join("")}</div>
<p class="v-note">${esc(s.note)}</p>`;

  // 6. 세 번째 30년 로드맵
  S.road = s => `${head(s)}<ol class="v-road">${s.decades.map(r => `
<li${r.now ? ' class="now"' : ""}><span class="v-road-age">${esc(r.age)}<small>${esc(r.years)}</small></span>
  <div><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p>${r.steps ? `<div class="v-steps">${r.steps.map(x => `<span><b>${esc(x.t)}</b>${esc(x.d)}</span>`).join("")}</div>` : ""}</div></li>`).join("")}</ol>`;

  // 7. 판단 원칙과 질문
  S.principles = s => `${head(s)}<div class="grid grid-2">
  <div class="card"><div class="card-body"><h3>${esc(s.rulesTitle)}</h3>${list(s.rules)}</div></div>
  <div class="card"><div class="card-body"><h3>${esc(s.qTitle)}</h3><ol class="v-qs">${s.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></div></div>
</div>`;

  // 8. 지금 진행 중인 실험
  S.labs = s => `${head(s)}<div class="grid grid-3">${s.items.map(c => `
<a class="card" href="${esc(c.href)}"><div class="card-img"><img src="assets/photos/${esc(c.img)}.webp" alt="" loading="lazy"></div>
  <div class="card-body"><span class="card-kicker">${esc(c.kicker)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
  <div class="card-foot"><span class="link-arrow">둘러보기 →</span></div></div></a>`).join("")}</div>`;

  S.quote = s => `<blockquote class="quote">${esc(s.text)}<cite>${esc(s.cite)}</cite></blockquote>`;

  el.outerHTML = d.sections.map(s => `<section class="block${s.alt ? " alt" : ""}${s.tight ? " tight" : ""} v-sec" id="${esc(s.id)}"><div class="wrap">${S[s.kind](s)}</div></section>`).join("");
}
