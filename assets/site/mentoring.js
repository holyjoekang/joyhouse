// 스타트업 멘토링 방법론 — data/mentoring/mentoring.json 을 한 쪽짜리 안내서로 그린다.
// 데이터는 scripts/build_mentoring.py 가 AI-Apps 의 방법론·에이전트 산출물에서 만든다.

const root = document.getElementById("mentoring");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bold = s => s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
const tilde = s => (s || "").split("```").map((p, n) => n % 2 ? p : p.replace(/~/g, "\\~")).join("```");
const md = s => window.marked ? window.marked.parse(bold(tilde(s))).replace(/<a href="(?!https?:)[^"]*">(.*?)<\/a>/g, "$1") : `<pre>${esc(s)}</pre>`;
const list = (a, cls = "") => `<ul class="${cls}">${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const head = (id, eyebrow, title, lead = "") => `<header class="mt-head" id="${id}"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}</header>`;
const LABEL = { "확인": "ok", "관행": "warn", "제안": "info" };
const TRACK_NAME = { "b2b-poc": "B2B·PoC", "mentor-craft": "멘토링 운영" };

const NAV = [["intro", "출발점"], ["principles", "원칙"], ["stages", "단계 모델"], ["diagnosis", "진단"], ["session", "세션"],
  ["issues", "대표 이슈"], ["b2b", "B2B·PoC"], ["tracks", "교차 트랙"], ["programs", "프로그램 설계"], ["ops", "기록·윤리"], ["doc", "원문"]];

// 모든 이슈를 한 줄로 편다: 단계 이슈 + 트랙 이슈
function allIssues(d) {
  const out = [];
  d.stages.forEach(s => s.issues.forEach(i => out.push({ ...i, group: s.stage, groupName: s.name })));
  Object.entries(d.tracks).forEach(([k, t]) => t.issues.forEach(i => out.push({ ...i, group: k, groupName: TRACK_NAME[k] || t.name })));
  return out;
}

function intro(d) {
  const s = d.site, o = s.origin;
  return `<section class="mt-cover" id="intro">
  <div><span class="eyebrow">Startup Mentoring Method · ${esc(s.edition)}</span>
  <h1>${esc(s.title)}</h1>
  <blockquote>${esc(s.oneLiner)}</blockquote></div>
  <aside class="mt-origin"><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p>
    <div class="mt-facts">${o.facts.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
    <p class="mt-q-title">이 의뢰가 방법론에 던진 질문</p>${list(o.questions, "mt-qs")}
    <p class="mt-note">${esc(o.note)}</p></aside>
</section>`;
}

function principles(d) {
  const s = d.site;
  return `${head("principles", "Best Practices", "무엇을 참고했나", "해외 액셀러레이터의 멘토링 관행과 국내 창업지원 체계를 검토해 가져온 원칙입니다. 근거 수준을 확인 · 관행 · 제안으로 구분했습니다.")}
<div class="mt-sources">${s.sources.map(([t, b, l, u]) => `<article><span class="mt-badge ${LABEL[l]}">${esc(l)}</span><h3>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>` : esc(t)}</h3><p>${esc(b)}</p></article>`).join("")}</div>
<div class="mt-panel"><h3>국내 공공 멘토링의 현실적 제약</h3><div class="mt-cons">${s.constraints.map(([t, b]) => `<div><b>${esc(t)}</b><p>${esc(b)}</p></div>`).join("")}</div>
<p class="mt-callout">그래서 이 방법론의 목표는 <b>짧은 개입으로도 다음 단계의 증거를 하나 더 확보하게 하는 것</b>입니다.</p></div>`;
}

function stages(d) {
  const s = d.site;
  return `${head("stages", "Stage Model", "단계는 업력이 아니라 증거로 판정한다", "6단계마다 핵심 질문과 다음 단계로 넘어가는 증거(졸업 기준)를 정했습니다. 단계를 누르면 과제·멘토링 초점·도구·함정, 그리고 에이전트가 정리한 그 단계 대표들의 이슈가 열립니다.")}
<ol class="mt-steps">${s.stages.map((x, i) => `<li><button type="button" data-stage="${i}" aria-pressed="${i === 0}"><span>${esc(x.id)}</span><b>${esc(x.name)}</b><em>${esc(x.q)}</em></button></li>`).join("")}</ol>
<div class="mt-stage" id="mt-stage"></div>
<div class="mt-panel"><h3>판정 원칙</h3><ol class="mt-num">${s.judging.map(t => `<li>${esc(t)}</li>`).join("")}</ol></div>`;
}

function stageDetail(d, i) {
  const x = d.site.stages[i], sim = d.stages.find(s => s.stage === x.id) || {};
  return `<div class="mt-stage-grid">
  <div class="mt-stage-main">
    <div class="mt-stage-top"><span>${esc(x.id)}</span><h3>${esc(x.name)}</h3><p>${esc(x.q)}</p></div>
    ${sim.persona_summary ? `<p class="mt-persona"><b>이 단계의 대표들</b> ${esc(sim.persona_summary)}</p>` : ""}
    <div class="mt-cols">
      <div><h4>대표 과제</h4>${list(x.tasks)}</div>
      <div><h4>도구</h4>${list(x.tools)}</div>
      <div><h4>함정</h4>${list(x.traps, "mt-warn")}</div>
    </div>
    <p><b>멘토링 초점</b> ${esc(x.focus)}</p>
    <p class="muted"><b>맞는 멘토</b> ${esc(x.mentor)} · <b>국내 지원</b> ${esc(x.programs)}</p>
  </div>
  <aside class="mt-stage-side">
    <h4>졸업 기준</h4><p class="mt-exit">${esc(x.exit)}</p>
    ${sim.stage_exit_check ? `<h4>졸업 체크</h4><ul class="mt-check">${sim.stage_exit_check.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    ${sim.top_takeaways ? `<h4>멘토가 기억할 것</h4>${list(sim.top_takeaways)}` : ""}
    ${sim.issues ? `<h4>이 단계 대표 이슈 ${sim.issues.length}</h4><ol class="mt-mini">${sim.issues.map(t => `<li><a href="#issues" data-jump="${esc(x.id)}">${esc(t.title)}</a></li>`).join("")}</ol>` : ""}
  </aside></div>`;
}

function diagnosis(d) {
  const s = d.site;
  return `${head("diagnosis", "Diagnosis", "첫 세션 전에 끝낼 진단", "세션 3일 전 사전 질문지를 보내고, 받은 자료로 증거 체크리스트를 채워 단계 판정 가설을 세웁니다.")}
<div class="mt-split">
  <div class="mt-panel"><h3>사전 질문지 <small>10분 분량</small></h3><ol class="mt-num">${s.prequestions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></div>
  <div class="mt-panel"><h3>증거 체크리스트</h3><div class="mt-tablewrap"><table class="mt-table"><thead><tr><th>영역</th><th>보는 것</th><th>빨간불</th></tr></thead><tbody>
  ${s.evidence.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td class="mt-red">${esc(c)}</td></tr>`).join("")}</tbody></table></div></div>
</div>
<div class="mt-panel mt-dark"><h3>희망 주제와 진단 단계가 다를 때</h3><p><b>${esc(s.mismatch.rule)}</b></p><p>${esc(s.mismatch.example)}</p></div>`;
}

function session(d) {
  const s = d.site, mins = [5, 15, 20, 12, 8];
  return `${head("session", "60-Minute Session", "60분 '하나의 문제' 세션", "YC 오피스아워의 압축성과 GROW 코칭 구조를 국내 공공 멘토링의 1시간 단위에 맞췄습니다.")}
<div class="mt-timeline">${s.session.map((r, i) => `<div style="--w:${mins[i]}"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("")}</div>
<div class="mt-session">${s.session.map(([t, n, what, out]) => `<article><span>${esc(t)}</span><h3>${esc(n)}</h3><p>${esc(what)}</p><em>→ ${esc(out)}</em></article>`).join("")}</div>
<div class="mt-split">
  <div class="mt-panel"><h3>멘토 행동 규칙</h3><div class="mt-rules">${s.rules.map(([t, b], i) => `<div><span>${i + 1}</span><b>${esc(t)}</b><p>${esc(b)}</p></div>`).join("")}</div></div>
  <div class="mt-panel"><h3>질문 은행</h3>${s.questionBank.map(([when, q]) => `<div class="mt-qb"><small>${esc(when)}</small><p>“${esc(q)}”</p></div>`).join("")}</div>
</div>`;
}

function issueCard(i) {
  const f = i.session_flow || {};
  return `<details class="mt-issue" data-group="${esc(i.group)}" data-cat="${esc(i.category)}">
<summary><span class="mt-gid">${esc(i.id)}</span><span class="mt-it"><small>${esc(i.groupName)} · ${esc(i.category)}${i.applies_to ? ` · ${esc(i.applies_to.join("·"))}` : ""}</small><b>${esc(i.title)}</b><q>${esc(i.founder_says)}</q></span>${i.dialogue?.length ? `<span class="mt-dlg-tag">대화 예시</span>` : ""}</summary>
<div class="mt-issue-body">
  <div class="mt-sr"><div><small>겉문제</small><p>${esc(i.surface)}</p></div><div><small>진짜 문제</small><p>${esc(i.root)}</p></div></div>
  <h4>멘토의 진단 질문</h4><ol class="mt-num">${(i.diagnostic_questions || []).map(q => `<li>${esc(q)}</li>`).join("")}</ol>
  <h4>세션 진행 (GROW)</h4>
  <div class="mt-grow"><div><b>G</b><p>${esc(f.goal)}</p></div><div><b>R</b><p>${esc(f.reality)}</p></div><div><b>O</b>${list(f.options)}</div><div><b>W</b><p>${esc(f.will)}</p></div></div>
  <p><b>처방</b> ${esc(i.prescription)}</p>
  <h4>2주 과제</h4><div class="mt-tasks">${(i.two_week_tasks || []).map(t => `<div><p>${esc(t.task)}</p><em>성공 기준 · ${esc(t.success)}</em></div>`).join("")}</div>
  <div class="mt-foot"><div><small>다음 세션 확인 신호</small><p>${esc(i.success_signal)}</p></div><div class="mt-pit"><small>멘토가 흔히 하는 실수</small><p>${esc(i.mentor_pitfall)}</p></div></div>
  ${i.resources?.length ? `<p class="muted"><b>자원</b> ${i.resources.map(esc).join(" · ")}</p>` : ""}
  ${i.dialogue?.length ? `<div class="mt-dialogue"><h4>대화 예시</h4>${i.dialogue.map(t => `<p class="${t.who === "멘토" ? "me" : "fo"}"><b>${esc(t.who)}</b>${esc(t.text)}</p>`).join("")}</div>` : ""}
</div></details>`;
}

function issues(d) {
  const all = allIssues(d), groups = [...new Set(all.map(i => i.group))];
  const cats = [...new Set(all.map(i => i.category))];
  const nameOf = g => (all.find(i => i.group === g) || {}).groupName;
  const heat = groups.map(g => [g, cats.map(c => all.filter(i => i.group === g && i.category === c).length)]);
  const max = Math.max(1, ...heat.flatMap(([, r]) => r));
  return `${head("issues", "Agent Simulation", `단계별 대표 이슈 ${all.length}선 — 멘토링으로 푸는 과정`, "단계마다 에이전트가 대표 페르소나와 베테랑 멘토를 함께 맡아, 대표들이 가장 자주 가져오는 질문을 고르고 진단 질문 → GROW 세션 → 2주 과제 → 확인 신호까지 시뮬레이션했습니다. 실제 사례가 쌓이면 교체합니다.")}
<div class="mt-panel"><h3>어느 단계에 어떤 이슈가 몰리나 <small>칸의 숫자 = 이슈 수</small></h3>
<div class="mt-tablewrap"><table class="mt-heat"><thead><tr><th></th>${cats.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
${heat.map(([g, r]) => `<tr><th>${esc(g.startsWith("S") ? g : nameOf(g))}</th>${r.map(n => `<td style="--a:${n / max};color:${n / max > .45 ? "#fff" : "var(--navy)"}">${n || ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
<div class="mt-filters">
  <div role="group" aria-label="단계">${["", ...groups].map(g => `<button type="button" data-g="${esc(g)}" aria-pressed="${g === ""}">${g === "" ? "전체" : esc(g.startsWith("S") ? `${g} ${nameOf(g)}` : nameOf(g))}</button>`).join("")}</div>
  <select aria-label="분야"><option value="">모든 분야</option>${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select>
  <input type="search" placeholder="검색 — 예: 투자, 외주, PoC" aria-label="이슈 검색">
  <span class="mt-count"></span>
</div>
<div class="mt-issues">${all.map(issueCard).join("")}</div>`;
}

function b2b(d) {
  const t = d.tracks["b2b-poc"];
  if (!t) return "";
  const pb = t.poc_playbook || {};
  return `${head("b2b", "Deep Dive · B2B & PoC", "B2B 판로와 오픈이노베이션(PoC)", t.summary)}
<div class="mt-play">${[["before", "PoC 전"], ["during", "PoC 중"], ["after", "PoC 후"]].map(([k, l]) => `<section><h3>${l}</h3><ul class="mt-check">${(pb[k] || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>`).join("")}</div>
<div class="mt-split">
  <div class="mt-panel"><h3>1장짜리 PoC 제안서 목차</h3><ol class="mt-num">${(t.proposal_outline || []).map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>
  <div class="mt-panel mt-dark"><h3>핵심</h3>${list(t.top_takeaways)}<p class="mt-more">이 트랙의 이슈 ${t.issues.length}개는 <a href="#issues" data-jump="b2b-poc">대표 이슈</a>에서 볼 수 있습니다.</p></div>
</div>`;
}

function tracks(d) {
  return `${head("tracks", "Cross-cutting Tracks", "단계와 상관없이 반복되는 주제")}
<div class="mt-tracks">${d.site.tracks.map(([t, b, k]) => `<article class="k-${esc(k)}"><h3>${esc(t)}</h3><p>${esc(b)}</p></article>`).join("")}</div>`;
}

function programs(d) {
  const s = d.site, mc = d.tracks["mentor-craft"] || {};
  const sp = mc.short_program || [], rep = mc.report_example;
  return `${head("programs", "Program Design", "프로그램 형태별 설계", "가장 흔한 국내 공공 멘토링(1~3회, 60분)부터 액셀러레이팅·오피스아워·그룹까지.")}
<div class="mt-programs">${s.programs.map(([t, sub, items], i) => `<article class="${i === 0 ? "hl" : ""}"><small>${esc(sub)}</small><h3>${esc(t)}</h3>${list(items)}</article>`).join("")}</div>
${sp.length ? `<div class="mt-panel"><h3>단기 집중형 회차별 운영 스크립트 <small>에이전트 작성 · 멘토링 운영 트랙</small></h3>
<div class="mt-script-tabs" role="tablist">${sp.map((x, i) => `<button type="button" data-sp="${i}" aria-pressed="${i === 0}">${esc(x.session)}</button>`).join("")}</div>
<div id="mt-script"></div></div>` : ""}
${rep ? `<div class="mt-panel"><h3>수행보고서 작성 예시 <small>가상 · A사</small></h3><div class="mt-tablewrap"><table class="mt-table">${Object.entries(rep).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div></div>` : ""}`;
}

function script(x) {
  return `<div class="mt-script"><p><b>목표</b> ${esc(x.goal)}</p>
<div class="mt-cols"><div><h4>사전 준비</h4>${list(x.prep)}</div><div><h4>60분 진행</h4><ol class="mt-num">${(x.flow || []).map(f => `<li>${esc(f)}</li>`).join("")}</ol></div><div><h4>보고서에 적을 것</h4>${list(x.report)}</div></div>
<p class="mt-closing">“${esc(x.closing)}”</p></div>`;
}

function ops(d) {
  const s = d.site, mc = d.tracks["mentor-craft"];
  return `${head("ops", "Records · Metrics · Ethics", "기록 · 성과 · 윤리 · AI 보조")}
<div class="mt-split">
  <div class="mt-panel"><h3>세션 기록 양식 <small>수행보고서와 겸용 — 세션 마지막 8분에 대표와 함께 채운다</small></h3><div class="mt-tablewrap"><table class="mt-table">${s.record.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div></div>
  <div>
    <div class="mt-panel"><h3>성과 지표</h3><div class="mt-cols two"><div><h4>선행 (직후)</h4>${list(s.metrics.lead)}</div><div><h4>후행 (3·6개월)</h4>${list(s.metrics.lag)}</div></div></div>
    <div class="mt-panel"><h3>멘토 윤리와 경계</h3><div class="mt-ethics">${s.ethics.map(([t, b]) => `<div><b>${esc(t)}</b><p>${esc(b)}</p></div>`).join("")}</div></div>
  </div>
</div>
<div class="mt-panel"><h3>에이전트를 멘토링 보조로 <small>대표 미공개 정보는 학습 비사용 환경에서만</small></h3><div class="mt-tablewrap"><table class="mt-table"><thead><tr><th>시점</th><th>에이전트</th><th>사람</th></tr></thead><tbody>${s.agentAssist.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div></div>
${mc ? `<p class="mt-more">멘토가 현장에서 부딪히는 관계 문제 ${mc.issues.length}가지(연락 두절, 과제 미이행, 조언 충돌, 이해충돌 등)는 <a href="#issues" data-jump="mentor-craft">대표 이슈</a>의 '멘토링 운영'에 있습니다.</p>` : ""}`;
}

function doc(d) {
  return `${head("doc", "Full Text", "방법론 원문", `자료 기준 ${d.built}`)}
<details class="mt-docwrap"><summary>원문 펼치기</summary><article class="mt-md">${md(d.doc)}</article></details>`;
}

function wire(d) {
  const st = root.querySelector("#mt-stage");
  const showStage = i => { st.innerHTML = stageDetail(d, i); root.querySelectorAll("[data-stage]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.stage === i)); };
  root.querySelectorAll("[data-stage]").forEach(b => b.addEventListener("click", () => showStage(+b.dataset.stage)));
  showStage(0);

  const cards = [...root.querySelectorAll(".mt-issue")], sel = root.querySelector(".mt-filters select"), q = root.querySelector(".mt-filters input");
  let group = "";
  const apply = () => {
    const term = q.value.trim().toLowerCase();
    let n = 0;
    cards.forEach(c => {
      const ok = (!group || c.dataset.group === group) && (!sel.value || c.dataset.cat === sel.value) && (!term || c.textContent.toLowerCase().includes(term));
      c.hidden = !ok; n += ok;
    });
    root.querySelector(".mt-count").textContent = `${n}개`;
  };
  const setGroup = g => { group = g; root.querySelectorAll("[data-g]").forEach(b => b.setAttribute("aria-pressed", b.dataset.g === g)); apply(); };
  root.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => setGroup(b.dataset.g)));
  sel.addEventListener("change", apply); q.addEventListener("input", apply);
  root.addEventListener("click", e => { const j = e.target.closest("[data-jump]"); if (j) setGroup(j.dataset.jump); });
  apply();

  const sp = (d.tracks["mentor-craft"] || {}).short_program || [], box = root.querySelector("#mt-script");
  if (box) {
    const showSp = i => { box.innerHTML = script(sp[i]); root.querySelectorAll("[data-sp]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.sp === i)); };
    root.querySelectorAll("[data-sp]").forEach(b => b.addEventListener("click", () => showSp(+b.dataset.sp)));
    showSp(0);
  }

  const links = [...root.querySelectorAll(".mt-nav a")], marks = NAV.map(([id]) => root.querySelector(`#${id}`)).filter(Boolean);
  const spy = () => { const cur = marks.filter(el => el.getBoundingClientRect().top < 200).at(-1) || marks[0]; links.forEach(a => a.classList.toggle("on", a.hash === `#${cur.id}`)); };
  window.addEventListener("scroll", spy, { passive: true }); spy();
}

(async () => {
  let d;
  try {
    d = await fetch("data/mentoring/mentoring.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject());
  } catch {
    root.innerHTML = `<p class="muted">자료를 불러오지 못했습니다.</p>`;
    return;
  }
  root.innerHTML = `${intro(d)}
<nav class="mt-nav" aria-label="섹션">${NAV.map(([id, l]) => `<a href="#${id}">${esc(l)}</a>`).join("")}</nav>
${[principles, stages, diagnosis, session, issues, b2b, tracks, programs, ops, doc].map(f => `<section class="mt-sec">${f(d)}</section>`).join("")}`;
  root.querySelector('.mt-nav a[href="#issues"]').textContent = `대표 이슈 ${allIssues(d).length}선`;
  wire(d);
  if (location.hash) root.querySelector(location.hash)?.scrollIntoView();
})();
