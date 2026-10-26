// 컨설팅 룸 · 카페뮤제오 — data/museo/vault.json 을 암호로 풀어 한 쪽짜리 보고서로 그린다.
// 잠금 파일은 scripts/build_museo_vault.py 가 만든다 (AES-256-GCM, PBKDF2-SHA256).

const root = document.getElementById("vault");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KEY = "museo-pw";
const store = {
  get: () => { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch { return null; } },
  set: (pw, keep) => { try { sessionStorage.setItem(KEY, pw); if (keep) localStorage.setItem(KEY, pw); } catch {} },
  clear: () => { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch {} },
};

async function open(vault, pw) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(vault.salt), iterations: vault.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(vault.iv) }, key, b64(vault.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

function lock(vault, msg = "") {
  root.innerHTML = `
<form class="mv-lock">
  <div class="mv-lock-mark" aria-hidden="true">☕</div>
  <span class="eyebrow">Consulting Room · Caffe Museo</span>
  <h2>카페뮤제오 AX 워크숍</h2>
  <p class="muted">고객 자료가 있는 공간입니다. 암호를 입력하세요.</p>
  <label class="mv-sr" for="mv-pw">암호</label>
  <input id="mv-pw" type="password" autocomplete="current-password" placeholder="암호" required>
  <label class="mv-keep"><input type="checkbox" id="mv-keep"> 이 기기에서 기억</label>
  <button class="btn btn-primary" type="submit">들어가기</button>
  <p class="mv-err" role="alert">${esc(msg)}</p>
</form>`;
  const form = root.querySelector("form");
  form.querySelector("input").focus();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const pw = form.querySelector("#mv-pw").value;
    form.querySelector("button").disabled = true;
    try {
      const data = await open(vault, pw);
      store.set(pw, form.querySelector("#mv-keep").checked);
      show(data);
    } catch {
      lock(vault, "암호가 맞지 않습니다.");
    }
  });
}

// ── 공통 ──
const tilde = s => (s || "").split("```").map((p, n) => n % 2 ? p : p.replace(/~/g, "\\~")).join("```");
// 한글 바로 앞뒤의 **굵게** 는 marked 가 못 알아보므로 먼저 바꾸고, 워크숍 폴더 안의 .md 상대 링크는 글자만 남긴다
const bold = s => s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
const unlink = h => h.replace(/<a href="(?!https?:)[^"]*\.md[^"]*">(.*?)<\/a>/g, "$1");
const md = s => window.marked ? unlink(window.marked.parse(bold(tilde(s)))) : `<pre>${esc(s)}</pre>`;
// 고객사 사이트 이미지는 원본 주소로 불러온다. 못 불러오면 칸을 접는다.
const img = (o, cls = "") => o ? `<img class="${cls}" src="${esc(o.src)}" alt="${esc(o.alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure')?.classList.add('mv-noimg')">` : "";
const fig = (o, cap, cls = "") => `<figure class="mv-fig ${cls}">${img(o)}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`;
const head = (id, eyebrow, title, lead = "") => `<header class="mv-head" id="${id}"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}</header>`;
const AI = { "없음": "none", "범용 AI 도구 활용": "tool", "맞춤 AI 구축": "custom" };
const aiChip = l => `<span class="mv-ai mv-ai-${AI[l] || "none"}">${esc(l === "없음" ? "AI 없음" : l)}</span>`;
const man = v => v === "" || v == null ? "—" : `${Number(v).toLocaleString("ko-KR")}만`;

// 기준 색: 가치(커피) · 용이성(크레마) · 수용성(초록) · 전략(남색) · 리스크(회색)
const CRIT = [
  ["value", "사업 가치", .30, "#7a4a2b"], ["feasibility", "실행 용이성", .25, "#c8a165"],
  ["acceptance", "현장 수용성", .15, "#1f6f5a"], ["strategy", "전략 정합성", .15, "#2d4a7a"], ["risk", "리스크(역)", .15, "#9aa0ab"],
];
const INK = "#1c1410", MUTED = "#7b7268", GRID = "rgba(28,20,16,.08)";
let charts = [];
const chart = (el, cfg) => {
  if (!window.Chart || !el) return;
  Chart.defaults.font.family = '"Noto Sans KR", system-ui, sans-serif';
  Chart.defaults.color = MUTED;
  charts.push(new Chart(el, cfg));
};

// ── 섹션 ──
const NAV = [["cover", "개요"], ["company", "회사"], ["conclusion", "결론"], ["workshop", "워크숍"], ["debate", "토론"],
  ["ranking", "과제 순위"], ["growth", "성장 과제"], ["first", "먼저 할 일"], ["roadmap", "로드맵"], ["voices", "목소리"], ["limits", "한계"], ["docs", "문서"]];

function cover(d) {
  const s = d.site;
  return `<section class="mv-cover" id="cover">
  <div class="mv-cover-text">
    <span class="eyebrow">AX Workshop · ${esc(s.date)}</span>
    <h1>${esc(s.title)}</h1>
    <p>${esc(s.subtitle)}</p>
    <p class="mv-disclaimer"><b>읽기 전에</b> ${esc(s.disclaimer)}</p>
  </div>
  ${fig(s.images.brand, "", "mv-cover-img")}
</section>
<div class="mv-stats">${s.stats.map(([v, l, sub]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span><em>${esc(sub)}</em></div>`).join("")}</div>`;
}

function company(d) {
  const s = d.site, im = s.images;
  return `${head("company", "Company Snapshot", "카페뮤제오는 어떤 회사인가", "2002년 시작한 커피 전문몰. 자체 로스팅 원두와 347개 수입 브랜드를 자사몰과 8곳 이상의 외부몰에서 판다. 확인된 사실은 DART 감사보고서 5개년과 자사몰 공개 정보다.")}
<div class="mv-split">
  <div class="mv-panel"><h3>매출과 영업이익률 <small>억원 · %, DART 감사보고서</small></h3><div class="mv-chart"><canvas id="c-rev"></canvas></div></div>
  <div class="mv-panel mv-problems"><h3>확인된 경영 신호</h3><ol>${s.problems.map(p => `<li>${esc(p)}</li>`).join("")}</ol></div>
</div>
<div class="mv-facts">${s.facts.map(([v, l, sub]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span><em>${esc(sub)}</em></div>`).join("")}</div>
<div class="mv-gallery">
  ${fig(im.roaster, "용인 로스팅·물류센터 — 2022년 2배로 확장", "tall")}
  ${fig(im.brands, "공식 수입 브랜드 — 비알레띠·하리오·케멕스·칼리타 등", "tall mv-contain")}
  ${fig(im.channels, "판매 채널 — 자사몰 외 오픈마켓·종합몰", "wide mv-contain")}
</div>
<div class="mv-banners" aria-label="자사몰 메인 배너">${im.banners.map(b => fig(b, b.alt)).join("")}</div>
<p class="mv-source">이미지 출처: caffemuseo.co.kr 공개 페이지 (고객사 자료, 원본 주소로 표시)</p>`;
}

function conclusion(d) {
  return `${head("conclusion", "Key Findings", "결론 다섯 가지")}
<div class="mv-cards5">${d.site.conclusions.map(([t, b], i) => `<article><b>${i + 1}</b><h3>${esc(t)}</h3><p>${esc(b)}</p></article>`).join("")}</div>
<p class="mv-callout">고객사에 "AX 로드맵"이라고 내면 과장입니다. 정직한 이름은 <b>"AI 도입 전 운영 진단과 정비 목록, 그리고 조건부 AI 옵션"</b>입니다.</p>`;
}

function workshop(d) {
  const s = d.site, tiers = Object.keys(s.tiers);
  return `${head("workshop", "Multi-Agent Design", "에이전트 17개로 회사를 재현했다", "CEO·부서 책임자·실무자·고객·검증자를 각각 에이전트로 만들고, 같은 팩트팩에서 출발해 독립 인터뷰 → 반박 → 수정 → 채점을 거쳤다.")}
<div class="mv-principles">${s.principles.map(([t, b]) => `<div><b>${esc(t)}</b><span>${esc(b)}</span></div>`).join("")}</div>
<ol class="mv-flow">${s.phases.map(([n, t, b, calls]) => `<li><span class="mv-flow-n">${esc(n)}</span><b>${esc(t)}</b><p>${esc(b)}</p><em>${calls === "사람" ? "사람" : `호출 ${esc(calls)}`}</em></li>`).join("")}</ol>
<div class="mv-roster">${tiers.map(t => {
    const list = d.agents.filter(a => a.tier === t);
    return `<section><h3>${esc(s.tiers[t])} <small>${list.length}</small></h3><div>${list.map(a => `
<details class="mv-agent t-${esc(t)}"><summary><span class="mv-avatar">${esc(a.name.slice(0, 1))}</span><span><b>${esc(a.name)}</b><small>${esc(a.slug)} · ${esc(a.model)}</small></span></summary>
<p>${esc(a.situation)}</p>${a.extra ? `<p class="mv-extra">${esc(a.extra)}</p>` : ""}</details>`).join("")}</div></section>`;
  }).join("")}</div>`;
}

function funnel(rows) {
  const W = 560, rowH = 62, max = rows[0][0];
  return `<svg class="mv-svg" viewBox="0 0 ${W} ${rows.length * rowH + 8}" role="img" aria-label="${rows.map(r => `${r[1]} ${r[0]}`).join(", ")}">
${rows.map(([n, label, sub], i) => {
    const w = 90 + (W - 290) * (n / max), x = (W - 190 - w) / 2, y = i * rowH + 4;
    const fill = i === rows.length - 1 ? "#efe7da" : `rgba(122,74,43,${0.2 + i * 0.25})`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${rowH - 12}" rx="10" fill="${fill}"/>
<text x="${x + w / 2}" y="${y + 32}" text-anchor="middle" font-size="22" font-weight="700" fill="${i >= 1 && i < rows.length - 1 ? "#fff" : INK}">${n}</text>
<text x="${W - 175}" y="${y + 24}" font-size="17" font-weight="700" fill="${INK}">${esc(label)}</text>
<text x="${W - 175}" y="${y + 44}" font-size="14" fill="${MUTED}">${esc(sub)}</text>`;
  }).join("")}</svg>`;
}

function debate(d) {
  return `${head("debate", "Debate", "토론이 과제를 어떻게 바꿨나", "레드팀·데이터 검증자·실무자·고객이 반박하고, 책임자가 스스로 범위를 줄이거나 폐기했다.")}
<div class="mv-split">
  <div class="mv-panel"><h3>후보가 줄어든 과정</h3>${funnel(d.site.funnel)}</div>
  <div class="mv-panel"><h3>에이전트별 반응 요약</h3><ul class="mv-ticks">
    <li>실무자 4명 — 일일 대시보드·발주 초안 "안 쓸 것", 주문 통합·반품 공유표 "매일 쓸 것"</li>
    <li>레드팀 — 챗봇·공급사 대조 폐기, 5건 통합 권고</li>
    <li>데이터·IT — 7건을 난이도 '상'으로 판정 (직접 개발 기준)</li>
    <li>고객 2명 — 재고에 끌려가는 추천과 가격 방어를 "싫다"</li>
    <li>책임자 6명 — 대부분 "AI 없이 표·기성 솔루션으로 먼저"로 축소</li></ul></div>
</div>
<div class="mv-tablewrap"><table class="mv-table"><thead><tr><th>처음 제안</th><th>반박</th><th>결론</th></tr></thead><tbody>
${d.site.debate.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="muted">${esc(b)}</td><td><b>${esc(c)}</b></td></tr>`).join("")}</tbody></table></div>`;
}

function ranking(d) {
  const levels = [...new Set(d.trackA.map(x => x.ai_level))];
  return `${head("ranking", "Scoring · Track A", "운영 정비 과제 14개 — 채점 순위", "가중치 가치 30 · 용이성 25 · 수용성 15 · 전략 15 · 리스크 15. 기준마다 아는 사람만 채점했고 합산은 파이썬이 했다.")}
<div class="mv-panel"><h3>기준별 기여도 <small>막대 길이 = 총점(5점 만점)</small></h3><div class="mv-chart tall"><canvas id="c-rank"></canvas></div></div>
<div class="mv-filter" role="group" aria-label="AI 수준 필터"><button aria-pressed="true" data-f="">전체</button>${levels.map(l => `<button aria-pressed="false" data-f="${esc(l)}">${esc(l === "없음" ? "AI 없음" : l)}</button>`).join("")}</div>
<div class="mv-tasks">${d.trackA.map(x => `
<details class="mv-task" data-ai="${esc(x.ai_level)}"><summary>
  <span class="mv-rank">${esc(x.rank)}</span>
  <span class="mv-task-t"><small>${esc(x.id)} · ${esc(x.owner)}</small><b>${esc(x.title)}</b></span>
  ${aiChip(x.ai_level)}
  <span class="mv-score"><strong>${x.total.toFixed(2)}</strong><em>연 효과 ${man(x.benefit)}</em></span>
</summary>
<div class="mv-task-body">
  <div class="mv-bars">${CRIT.map(([k, l, , c]) => `<div><span>${l}</span><i style="--w:${x.scores[k] / 5 * 100}%;--c:${c}"></i><b>${x.scores[k]}</b></div>`).join("")}</div>
  <div>${x.stage1 ? `<p><b>1단계 범위</b> ${esc(x.stage1)}</p>` : ""}${x.stage2 ? `<p><b>조건부 AI</b> ${esc(x.stage2)}</p>` : ""}${x.weeks ? `<p class="muted"><b>기간</b> ${esc(x.weeks)}</p>` : ""}${x.imputed ? `<p class="muted">채점자 없음 → 중립 3점: ${esc(x.imputed)}</p>` : ""}</div>
</div></details>`).join("")}</div>
<p class="mv-note">연 효과는 재무 검증자가 깎은 값(만원, 시간 절감은 실현율 50%)입니다. 전부 가정이므로 합산하지 않습니다. 순위는 착수 순서가 아닙니다 — 13위 주문 통합(AX-02)의 첫 행동인 "시스템 현황 확인 1일"이 모든 것의 선행입니다.</p>`;
}

function growth(d) {
  return `${head("growth", "Growth Round · Track B", "성장 보정 라운드 — 매출을 키우는 과제 7개", "1차 결과에 성장 과제가 없다는 CEO 지적을 받아 성장 옹호자가 7개를 내고, 같은 기준으로 채점했다. 수용성은 고객과 담당 책임자가 매겼다.")}
<div class="mv-panel"><h3>연간 기대 순이익 <small>만원 · 성공 시 이익 × 성공 확률 · 갈색 AI 없음 · 크레마 범용 도구 · 남색 맞춤 구축</small></h3><div class="mv-chart"><canvas id="c-growth"></canvas></div></div>
<div class="mv-growth">${d.trackB.map(x => `
<article class="mv-gcard">
  <header><span class="mv-rank">${esc(x.rank)}</span><div><small>${esc(x.id)} · ${esc(x.owner)}</small><h3>${esc(x.title)}</h3></div><strong>${x.total.toFixed(2)}</strong></header>
  <p>${aiChip(x.ai_level)} <span class="mv-prob">성공 확률 ${Math.round(Number(x.prob || 0) * 100)}% · 기대 ${man(x.expected)}</span></p>
  ${x.lever ? `<p><b>성장 레버</b> ${esc(x.lever)}</p>` : ""}
  <details><summary>4주 실험 · 접는 기준 · AI의 역할</summary>
    ${x.test ? `<p><b>4주 실험</b> ${esc(x.test)}</p>` : ""}${x.kill ? `<p class="mv-kill"><b>접는 기준</b> ${esc(x.kill)}</p>` : ""}${x.why_ai ? `<p><b>AI의 역할</b> ${esc(x.why_ai)}</p>` : ""}
  </details>
</article>`).join("")}</div>
<p class="mv-callout">AI가 실제로 비용을 바꾸는 과제는 가이드 콘텐츠(GX-04) 하나입니다. 가장 큰 숫자가 붙은 납품·OEM(GX-01)과 창업 패키지(GX-02)는 영업 과제이며, 대표 페르소나는 동시에 돌릴 실험을 2개로 답했습니다.</p>`;
}

function first(d) {
  const s = d.site;
  return `${head("first", "Before Anything", "과제보다 먼저 — 숫자 5개와 결정 3개")}
<div class="mv-split">
  <div class="mv-panel"><h3>2주 안에 잴 숫자</h3><ol class="mv-numbers">${s.numbers.map(([q, who, eff]) => `<li><b>${esc(q)}</b><small>${esc(who)}</small><p>${esc(eff)}</p></li>`).join("")}</ol></div>
  <div class="mv-panel mv-dark"><h3>대표가 정할 것</h3><ol class="mv-numbers">${s.decisions.map(([q, b]) => `<li><b>${esc(q)}</b><p>${esc(b)}</p></li>`).join("")}</ol><p class="mv-sign">✍ ${esc(s.signature)}</p></div>
</div>`;
}

function roadmap(d) {
  const s = d.site;
  return `${head("roadmap", "Roadmap", "로드맵 — 책임자 1명당 동시 1개", "직원 35명 회사가 21개를 동시에 할 수 없다는 레드팀 판정에 따라 단계를 나눴다.")}
<div class="mv-road">${s.roadmap.map((r, i) => `<section class="s${i}"><header><b>${esc(r.stage)}</b><span>${esc(r.when)}</span></header><h3>${esc(r.title)}</h3><ul>${r.items.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`).join("")}</div>
<div class="mv-panel"><h3>3단계 — AI 옵션과 착수 조건 <small>조건이 실측으로 확인될 때만</small></h3>
<div class="mv-tablewrap"><table class="mv-table"><thead><tr><th>AI 옵션</th><th>과제</th><th>착수 조건</th></tr></thead><tbody>
${s.ai_gates.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function voices(d) {
  return `${head("voices", "Voices", "에이전트들이 남긴 말")}
<div class="mv-quotes">${d.site.voices.map(([who, q, k]) => `<blockquote class="q-${esc(k)}"><p>“${esc(q)}”</p><cite>${esc(who)}</cite></blockquote>`).join("")}</div>`;
}

function limits(d) {
  const s = d.site;
  return `${head("limits", "Limits & Implications", "이 결과의 한계와 시사점")}
<div class="mv-split">
  <div class="mv-limits">${s.limits.map(([t, b]) => `<div><b>${esc(t)}</b><p>${esc(b)}</p></div>`).join("")}</div>
  <div class="mv-panel mv-dark"><h3>제안자 입장에서</h3><ul class="mv-ticks">${s.implications.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
</div>`;
}

function docs(d) {
  return `${head("docs", "Documents", "원문 문서", "워크숍 산출물을 그대로 싣는다.")}
<div class="mv-docs"><nav>${d.docs.map((x, n) => `<button data-doc="${n}" aria-pressed="${n === 0}">${esc(x.title)}</button>`).join("")}</nav>
<article class="mv-md" id="mv-doc">${d.docs[0] ? md(d.docs[0].md) : ""}</article></div>`;
}

function wire(d) {
  const s = d.site;
  chart(root.querySelector("#c-rev"), {
    data: { labels: s.revenue.years, datasets: [
      { type: "bar", label: "매출(억원)", data: s.revenue.sales, backgroundColor: s.revenue.sales.map((_, i) => i === 1 ? "#7a4a2b" : "#c9b39a"), borderRadius: 6, yAxisID: "y" },
      { type: "line", label: "영업이익률(%)", data: s.revenue.op_margin, borderColor: "#1c1410", backgroundColor: "#1c1410", tension: .3, pointRadius: 4, yAxisID: "y1" },
    ] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: GRID }, title: { display: true, text: "억원" } },
        y1: { position: "right", beginAtZero: true, grid: { display: false }, title: { display: true, text: "%" } } } },
  });
  chart(root.querySelector("#c-rank"), {
    type: "bar",
    data: { labels: d.trackA.map(x => innerWidth < 760 ? x.id : `${x.id}  ${x.title.length > 16 ? x.title.slice(0, 16) + "…" : x.title}`), datasets: CRIT.map(([k, l, w, c]) => ({ label: `${l} ${w * 100}%`, data: d.trackA.map(x => +(x.scores[k] * w).toFixed(2)), backgroundColor: c, borderColor: "#fff", borderWidth: 1 })) },
    options: { indexAxis: "y", maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { usePointStyle: true } },
        tooltip: { callbacks: { title: c => { const x = d.trackA[c[0].dataIndex]; return `${x.id} ${x.title}`; }, footer: c => `총점 ${d.trackA[c[0].dataIndex].total}` } } },
      scales: { x: { stacked: true, max: 5, grid: { color: GRID } }, y: { stacked: true, grid: { display: false } } } },
  });
  chart(root.querySelector("#c-growth"), {
    type: "bar",
    data: { labels: d.trackB.map(x => [x.id, x.title.length > 12 ? x.title.slice(0, 12) + "…" : x.title]), datasets: [{ label: "기대 순이익(만원)", data: d.trackB.map(x => +x.expected || 0),
      backgroundColor: d.trackB.map(x => x.ai_level === "없음" ? "#7a4a2b" : x.ai_level === "맞춤 AI 구축" ? "#2d4a7a" : "#c8a165"), borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { title: c => d.trackB[c[0].dataIndex].title, label: c => `${c.raw.toLocaleString("ko-KR")}만원 · ${d.trackB[c.dataIndex].ai_level}` } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: GRID } } } },
  });
  root.querySelectorAll(".mv-filter button").forEach(b => b.addEventListener("click", () => {
    root.querySelectorAll(".mv-filter button").forEach(x => x.setAttribute("aria-pressed", x === b));
    root.querySelectorAll(".mv-task").forEach(t => { t.hidden = !!b.dataset.f && t.dataset.ai !== b.dataset.f; });
  }));
  root.querySelectorAll("[data-doc]").forEach(b => b.addEventListener("click", () => {
    root.querySelectorAll("[data-doc]").forEach(x => x.setAttribute("aria-pressed", x === b));
    const art = root.querySelector("#mv-doc");
    art.innerHTML = md(d.docs[+b.dataset.doc].md);
    art.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  // 지금 보고 있는 섹션을 목차에 표시
  const links = [...root.querySelectorAll(".mv-nav a")];
  const marks = NAV.map(([id]) => root.querySelector(`#${id}`)).filter(Boolean);
  const spy = () => {
    const cur = marks.filter(el => el.getBoundingClientRect().top < 200).at(-1) || marks[0];
    links.forEach(a => a.classList.toggle("on", a.hash === `#${cur.id}`));
  };
  window.addEventListener("scroll", spy, { passive: true });
  spy();
}

function show(d) {
  charts.forEach(c => c.destroy()); charts = [];
  root.classList.add("mv");
  root.innerHTML = `
<div class="mv-bar"><span class="muted">자료 기준 ${esc(d.built)}</span><button class="btn mv-out" type="button">잠그기</button></div>
${cover(d)}
<nav class="mv-nav" aria-label="섹션">${NAV.map(([id, l]) => `<a href="#${id}">${esc(l)}</a>`).join("")}</nav>
${[company, conclusion, workshop, debate, ranking, growth, first, roadmap, voices, limits, docs].map(f => `<section class="mv-sec">${f(d)}</section>`).join("")}`;
  wire(d);
  root.querySelector(".mv-out").addEventListener("click", () => { store.clear(); location.reload(); });
  if (location.hash) root.querySelector(location.hash)?.scrollIntoView();
}

(async () => {
  let vault;
  try {
    vault = await fetch("data/museo/vault.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject());
  } catch {
    root.innerHTML = `<p class="muted">자료를 불러오지 못했습니다.</p>`;
    return;
  }
  const saved = store.get();
  if (saved) {
    try { return show(await open(vault, saved)); } catch { store.clear(); }
  }
  lock(vault);
})();
