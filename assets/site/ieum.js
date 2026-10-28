// ieum.html — content/ieum.json 을 읽어 사업계획서를 그린다 (scripts/add_ieum_bridge.py 가 생성)
(async () => {
  const d = await (await fetch("content/ieum.json", {cache: "no-cache"})).json();
  const num = s => /^[-\d.,]+$/.test(String(s).replace(/<\/?b>/g, ""));
  const block = b => {
    if (b.type === "h") return `<h3>${b.text}</h3>`;
    if (b.type === "p") return `<p>${b.text}</p>`;
    if (b.type === "note") return `<div class="note">${b.text}</div>`;
    if (b.type === "callout") return `<div class="callout">${b.text}</div>`;
    if (b.type === "ol") return `<ol>${b.items.map(i => `<li>${i}</li>`).join("")}</ol>`;
    if (b.type === "list") return `${b.title ? `<h3>${b.title}</h3>` : ""}<ul>${b.items.map(i => `<li>${i}</li>`).join("")}</ul>`;
    if (b.type === "steps") return `${b.title ? `<h3>${b.title}</h3>` : ""}<div class="steps">${b.items.map(([w, t, o]) =>
      `<div class="step"><div class="when">${w}</div><div>${t}</div><span class="out">${o}</span></div>`).join("")}</div>`;
    if (b.type === "table") {
      const isNum = b.head.map((_, c) => c > 0 && b.rows.every(r => !r[c] || num(r[c])));
      return `${b.title ? `<h3>${b.title}</h3>` : ""}<div class="tbl"><table><thead><tr>${b.head.map((h, c) =>
        `<th${isNum[c] ? ' class="num"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((v, c) =>
        `<td${isNum[c] ? ' class="num"' : ""}>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${b.note ? `<div class="note">${b.note}</div>` : ""}`;
    }
    return "";
  };
  const h = d.hero;
  document.getElementById("app").innerHTML = `
<nav><div class="wrap"><a class="brand" href="#top">${d.brand}</a>
<ul>${d.sections.map(s => `<li><a href="#${s.id}">${s.nav}</a></li>`).join("")}</ul>
<a class="back" href="${d.back}">← 아이디어 랩</a></div></nav>
<header class="hero" id="top"><div class="wrap">
<div class="eyebrow">${h.eyebrow}</div><h1>${h.h1}</h1><p>${h.p}</p>
<div class="tags">${h.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
<div class="meta">${h.meta}</div></div></header>
<section style="padding:56px 0"><div class="wrap"><div class="stats" style="margin:0">${d.stats.map(([b, s]) =>
  `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("")}</div>
<div class="note" style="margin-top:20px">${d.disclaimer}</div></div></section>
${d.sections.map(s => `<section class="doc" id="${s.id}"><div class="wrap">
<div class="eyebrow">${s.eyebrow}</div><h2>${s.title}</h2>${s.blocks.map(block).join("")}</div></section>`).join("")}
<footer><div class="wrap"><h4>참고 출처</h4><ul>${d.sources.map(([t, u]) =>
  `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>
<p class="disclaimer">${d.disclaimer}</p></div></footer>`;
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
