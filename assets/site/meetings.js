// 멘토링 쪽 '미팅 기록' — data/mentoring/meetings.json 을 그린다.
// 원천은 content/meetings/*.json (미팅 1건 = 파일 1개), scripts/build_meetings.py 가 묶는다.

const root = document.getElementById("meetings");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ul = (a, cls = "") => `<ul class="${cls}">${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const fmtDate = d => { const [y, m, dd] = d.split("-"); return `${y}년 ${+m}월 ${+dd}일`; };
const LEVEL = { "낮음": 1, "중": 2, "중~높음": 3, "높음": 4 };
const KEY = id => `joyhouse.meeting.${id}.done`;
const loadDone = id => { try { return new Set(JSON.parse(localStorage.getItem(KEY(id)) || "[]")); } catch { return new Set(); } };
const saveDone = (id, s) => { try { localStorage.setItem(KEY(id), JSON.stringify([...s])); } catch {} };

// ── 블록 ──────────────────────────────────────────────
const table = ({ head, rows }) => `<div class="mt-tablewrap"><table class="mt-table mtg-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const BLOCK = {
  h: t => `<h4 class="mtg-h">${esc(t)}</h4>`,
  p: t => `<p>${esc(t)}</p>`,
  note: t => `<p class="mtg-note"><span>확인</span>${esc(t)}</p>`,
  callout: t => `<p class="mt-callout mtg-callout"><b>시사점</b> ${esc(t)}</p>`,
  quote: t => `<blockquote class="mtg-quote">${esc(t)}</blockquote>`,
  list: a => ul(a, "mtg-list"),
  ol: a => `<ol class="mt-num">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ol>`,
  checks: a => ul(a, "mt-check mtg-checks"),
  table,
  stats: a => `<div class="mtg-stats">${a.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>`,
  flow: a => `<ol class="mtg-flow">${a.map(([t, s]) => `<li><b>${esc(t)}</b>${s ? `<span>${esc(s)}</span>` : ""}</li>`).join("")}</ol>`,
  steps: a => `<ol class="mtg-steps">${a.map(([t, s], i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><em>${esc(s)}</em></li>`).join("")}</ol>`,
  cards: a => `<div class="mtg-cards">${a.map(([t, b, href]) => `<article><h5>${href ? `<a href="${esc(href)}">${esc(t)} →</a>` : esc(t)}</h5><p>${esc(b)}</p></article>`).join("")}</div>`,
};
const blocks = bs => bs.map(b => Object.entries(b).map(([k, v]) => (BLOCK[k] || (() => ""))(v)).join("")).join("");

// ── 미팅 1건 ──────────────────────────────────────────
function parts(m) {
  // 번호가 붙는 장 목록: 핵심 요약 → 본문 장들 → 사업기회 → 실행과제 → 사실확인 → 결론
  const out = [{ key: "key", title: m.keyTitle || "전체 대화의 핵심 요약" }];
  m.sections.forEach((s, i) => out.push({ key: `s${i}`, title: s.title, time: s.time, sec: s }));
  if (m.opportunities) out.push({ key: "opp", title: `대화에서 도출된 사업기회 ${m.opportunities.items.length}가지` });
  if (m.actions) out.push({ key: "act", title: "후속 실행과제" });
  if (m.verify) out.push({ key: "ver", title: "사실확인이 필요한 사항" });
  if (m.conclusion) out.push({ key: "end", title: "종합 결론" });
  return out.map((p, i) => ({ ...p, no: i + 1, anchor: `m-${m.id}-${p.key}` }));
}

function body(m, p) {
  if (p.key === "key") return `<div class="mtg-keys">${m.keypoints.map(([t, b], i) => `<article><span>${"①②③④⑤⑥⑦⑧⑨⑩"[i] || i + 1}</span><h5>${esc(t)}</h5><p>${esc(b)}</p></article>`).join("")}</div>`;
  if (p.sec) return blocks(p.sec.blocks);
  if (p.key === "opp") {
    const o = m.opportunities;
    return `<div class="mt-tablewrap"><table class="mt-table mtg-table"><thead><tr><th>사업기회</th><th>핵심 고객</th><th>수익모델</th><th>초기 실행 난이도</th></tr></thead><tbody>
${o.items.map(([a, b, c, d]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td><td>${esc(c)}</td><td><span class="mtg-lv" style="--lv:${LEVEL[d] || 2}">${esc(d)}</span></td></tr>`).join("")}</tbody></table></div>
${o.note ? `<p class="mtg-note"><span>참고</span>${esc(o.note)}</p>` : ""}
${o.priority ? `<h4 class="mtg-h">우선순위에 대한 제안</h4>${ul(o.priority, "mtg-list")}` : ""}`;
  }
  if (p.key === "act") return `<div class="mtg-todo" data-id="${esc(m.id)}"><div class="mtg-todo-top"><b class="mtg-prog"></b><div class="mtg-bar"><i></i></div><button type="button" class="mtg-copy">체크리스트 복사</button></div>
<ul>${m.actions.map(([t, d], i) => `<li><label><input type="checkbox" data-i="${i}"><span><b>${esc(t)}</b><em>${esc(d)}</em></span></label></li>`).join("")}</ul>
<p class="muted mtg-small">체크 상태는 이 브라우저에만 저장됩니다.</p></div>`;
  if (p.key === "ver") return `${table({ head: ["항목", "녹취 속 주장", "확인 필요사항"], rows: m.verify.items })}${m.verify.note ? `<p class="mtg-note"><span>교정</span>${esc(m.verify.note)}</p>` : ""}`;
  if (p.key === "end") {
    const c = m.conclusion;
    return `<p class="mtg-lead">${esc(c.lead)}</p>${(c.paras || []).map(t => `<p>${esc(t)}</p>`).join("")}
<h4 class="mtg-h">두 사람의 경험이 만나는 지점</h4><div class="mtg-keys three">${c.meeting_points.map(([t, b], i) => `<article><span>${["첫째", "둘째", "셋째", "넷째"][i] || i + 1}</span><h5>${esc(t)}</h5><p>${esc(b)}</p></article>`).join("")}</div>
${c.link ? `<p>${esc(c.link)}</p>` : ""}${c.message ? `<blockquote class="mtg-message">${esc(c.message)}</blockquote>` : ""}${c.closing ? `<p>${esc(c.closing)}</p>` : ""}`;
  }
  return "";
}

function reader(m) {
  const ps = parts(m), open = new Set(["key", "end"]);
  return `<article class="mtg-reader" id="m-${esc(m.id)}">
<header class="mtg-rhead">
  <div class="mtg-meta"><time datetime="${esc(m.date)}">${fmtDate(m.date)}</time>${m.duration ? `<span>${esc(m.duration)}</span>` : ""}${m.basis ? `<span>${esc(m.basis)}</span>` : ""}</div>
  <h3>${esc(m.title)}</h3>
  ${m.participants ? `<dl class="mtg-people">${m.participants.map(([n, d]) => `<div><dt>${esc(n)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl>` : ""}
  ${(m.intro || []).map(t => `<p>${esc(t)}</p>`).join("")}
  <div class="mtg-tags">${(m.tags || []).map(t => `<span>#${esc(t)}</span>`).join("")}</div>
</header>
<div class="mtg-layout">
  <nav class="mtg-toc" aria-label="미팅 목차"><b>목차</b><ol>${ps.map(p => `<li><a href="#${p.anchor}">${esc(p.title)}</a></li>`).join("")}</ol>
    <button type="button" class="mtg-all">모두 펼치기</button></nav>
  <div class="mtg-parts">${ps.map(p => `<details class="mtg-part" id="${p.anchor}"${open.has(p.key) ? " open" : ""}>
<summary><span class="mtg-no">${p.no}</span><span class="mtg-pt"><b>${esc(p.title)}</b>${p.time ? `<small>관련 대화 ${esc(p.time)}</small>` : ""}</span></summary>
<div class="mtg-pbody">${body(m, p)}</div></details>`).join("")}</div>
</div></article>`;
}

// ── 목록 · 누적 보드 ───────────────────────────────────
function listCard(m) {
  return `<button type="button" class="mtg-card" data-m="${esc(m.id)}" aria-pressed="false">
<time>${fmtDate(m.date)}</time><b>${esc(m.title)}</b><small>${esc(m.counterpart || "")}${m.duration ? ` · ${esc(m.duration)}` : ""}</small>
<span class="mtg-chips">${(m.tags || []).slice(0, 4).map(t => `<i>${esc(t)}</i>`).join("")}</span></button>`;
}

function board(ms) {
  if (ms.length < 2) return "";
  const acts = ms.flatMap(m => (m.actions || []).map(a => [...a, m])), opps = ms.flatMap(m => (m.opportunities?.items || []).map(o => [...o, m]));
  return `<section class="mtg-board"><h3>미팅 누적 보드 <small>${ms.length}건의 미팅에서 모은 것</small></h3>
<div class="mt-split"><div class="mt-panel"><h4 class="mtg-h">실행과제 ${acts.length}</h4><ul class="mtg-list">${acts.map(([t, , m]) => `<li>${esc(t)} <a class="mtg-src" href="#m-${esc(m.id)}" data-m="${esc(m.id)}">${esc(m.date)}</a></li>`).join("")}</ul></div>
<div class="mt-panel"><h4 class="mtg-h">사업기회 ${opps.length}</h4><ul class="mtg-list">${opps.map(([t, , , d, m]) => `<li>${esc(t)} <span class="mtg-lv" style="--lv:${LEVEL[d] || 2}">${esc(d)}</span> <a class="mtg-src" href="#m-${esc(m.id)}" data-m="${esc(m.id)}">${esc(m.date)}</a></li>`).join("")}</ul></div></div></section>`;
}

function wireTodo(box) {
  const id = box.dataset.id, done = loadDone(id), boxes = [...box.querySelectorAll("input")];
  const sync = () => {
    const n = boxes.filter(b => b.checked).length;
    box.querySelector(".mtg-prog").textContent = `${n}/${boxes.length} 완료`;
    box.querySelector(".mtg-bar i").style.width = `${(n / boxes.length) * 100}%`;
  };
  boxes.forEach(b => { b.checked = done.has(+b.dataset.i); b.addEventListener("change", () => { b.checked ? done.add(+b.dataset.i) : done.delete(+b.dataset.i); saveDone(id, done); sync(); }); });
  box.querySelector(".mtg-copy").addEventListener("click", async e => {
    const text = [...box.querySelectorAll("li")].map((li, i) => `${boxes[i].checked ? "[x]" : "[ ]"} ${li.querySelector("b").textContent} — ${li.querySelector("em").textContent}`).join("\n");
    try { await navigator.clipboard.writeText(text); e.target.textContent = "복사했습니다"; } catch { e.target.textContent = "복사 실패"; }
    setTimeout(() => (e.target.textContent = "체크리스트 복사"), 1600);
  });
  sync();
}

function show(ms, id, anchor) {
  const m = ms.find(x => x.id === id) || ms[0], box = root.querySelector("#mtg-view");
  box.innerHTML = reader(m);
  root.querySelectorAll(".mtg-card").forEach(c => c.setAttribute("aria-pressed", c.dataset.m === m.id));
  box.querySelectorAll(".mtg-todo").forEach(wireTodo);
  const all = box.querySelector(".mtg-all"), det = [...box.querySelectorAll(".mtg-part")];
  all.addEventListener("click", () => { const o = det.some(d => !d.open); det.forEach(d => (d.open = o)); all.textContent = o ? "모두 접기" : "모두 펼치기"; });
  box.querySelectorAll(".mtg-toc a").forEach(a => a.addEventListener("click", () => { const d = box.querySelector(a.hash); if (d) d.open = true; }));
  if (anchor) { const el = document.getElementById(anchor); if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView(); } }
}

(async () => {
  let d;
  try { d = await fetch("data/mentoring/meetings.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject()); }
  catch { root.innerHTML = `<p class="muted">미팅 기록을 불러오지 못했습니다.</p>`; return; }
  const ms = d.meetings || [];
  if (!ms.length) { root.innerHTML = ""; return; }
  const tags = [...new Set(ms.flatMap(m => m.tags || []))];
  root.innerHTML = `<header class="mt-head mtg-top"><span class="eyebrow">Field Notes · Meetings</span><h2>현장 미팅 기록 <small>${ms.length}건</small></h2>
<p class="lead">창업 생태계에서 만난 분들과의 대화를 녹취 기준으로 주제별 재구성해 쌓아 갑니다. 각 미팅의 사업기회·실행과제·사실확인 사항을 함께 기록합니다.</p></header>
${ms.length > 3 ? `<div class="mt-filters mtg-filter"><div role="group" aria-label="주제">${["", ...tags].map(t => `<button type="button" data-t="${esc(t)}" aria-pressed="${!t}">${t ? esc(t) : "전체"}</button>`).join("")}</div><input type="search" placeholder="미팅 검색" aria-label="미팅 검색"></div>` : ""}
<div class="mtg-list-cards">${ms.map(listCard).join("")}</div>
<div id="mtg-view"></div>${board(ms)}`;

  root.addEventListener("click", e => {
    const c = e.target.closest("[data-m]");
    if (!c) return;
    e.preventDefault();
    show(ms, c.dataset.m);
    history.replaceState(null, "", `#m-${c.dataset.m}`);
    root.querySelector("#mtg-view").scrollIntoView({ behavior: "smooth" });
  });
  const f = root.querySelector(".mtg-filter");
  if (f) {
    let tag = "";
    const q = f.querySelector("input");
    const apply = () => root.querySelectorAll(".mtg-card").forEach(c => {
      const m = ms.find(x => x.id === c.dataset.m), term = q.value.trim().toLowerCase();
      c.hidden = !((!tag || (m.tags || []).includes(tag)) && (!term || JSON.stringify(m).toLowerCase().includes(term)));
    });
    f.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { tag = b.dataset.t; f.querySelectorAll("[data-t]").forEach(x => x.setAttribute("aria-pressed", x === b)); apply(); }));
    q.addEventListener("input", apply);
  }
  const h = decodeURIComponent(location.hash.slice(1)), hit = h.startsWith("m-") && ms.find(m => h === `m-${m.id}` || h.startsWith(`m-${m.id}-`));
  show(ms, hit ? hit.id : ms[0].id, hit ? h : null);
  if (h === "meetings") root.scrollIntoView();
})();
