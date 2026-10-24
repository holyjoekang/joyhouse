// 컨설팅 룸 — data/hella/vault.json 을 암호로 풀어 탭별로 그린다.
// 잠금 파일은 scripts/build_hella_vault.py 가 만든다 (AES-256-GCM, PBKDF2-SHA256).

const root = document.getElementById("vault");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KEY = "hella-pw";
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
<form class="hv-lock card">
  <div class="hv-lock-icon" aria-hidden="true">🔒</div>
  <h2>컨설팅 룸</h2>
  <p class="muted">고객 자료가 있는 공간입니다. 암호를 입력하세요.</p>
  <label class="hv-sr" for="hv-pw">암호</label>
  <input id="hv-pw" type="password" inputmode="numeric" autocomplete="current-password" placeholder="암호" required>
  <label class="hv-keep"><input type="checkbox" id="hv-keep"> 이 기기에서 기억</label>
  <button class="btn btn-primary" type="submit">들어가기</button>
  <p class="hv-err" role="alert">${esc(msg)}</p>
</form>`;
  const form = root.querySelector("form");
  form.querySelector("input").focus();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const pw = form.querySelector("#hv-pw").value;
    form.querySelector("button").disabled = true;
    try {
      const data = await open(vault, pw);
      store.set(pw, form.querySelector("#hv-keep").checked);
      show(data);
    } catch {
      lock(vault, "암호가 맞지 않습니다.");
    }
  });
}

// ── 공통 조각 ──
const chip = (t, cls = "") => `<span class="hv-chip ${cls}">${esc(t)}</span>`;
const conf = c => chip(c || "미확인", { "확인됨": "ok", "추정": "warn", "미확인": "bad" }[c] || "");
const table = (head, rows) => `<div class="hv-tablewrap"><table class="hv-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const empty = t => `<p class="muted">${esc(t)}</p>`;
// 보고서의 "6~12개월" 같은 물결표가 취소선으로 바뀌지 않게, 코드 블록 밖의 ~ 를 이스케이프한다
const tilde = s => (s || "").split("```").map((p, n) => n % 2 ? p : p.replace(/~/g, "\\~")).join("```");
const md = s => window.marked ? window.marked.parse(tilde(s)) : `<pre>${esc(s)}</pre>`;

// ── 시각화 ──
// 범주 색은 검증된 고정 순서(파랑·주황·청록·노랑)로만 쓴다. 등급 A·B·C 와 브랜드에 같은 순서를 쓰고, 보류·배제는 회색.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const TIER_COLOR = { A: SERIES[0], B: SERIES[1], C: SERIES[2], H: "#9aa0ab", X: "#c2c6cd" };
const INK = "#1b2233", MUTED = "#7b8191", GRID = "rgba(20,33,61,.08)";
const PHOTO = n => `assets/photos/${n}.webp`;
let charts = [];
const chart = (el, cfg) => {
  if (!window.Chart || !el) return;
  Chart.defaults.font.family = '"Noto Sans KR", system-ui, sans-serif';
  Chart.defaults.color = MUTED;
  charts.push(new Chart(el, cfg));
};
const axes = (x = {}, y = {}) => ({
  x: { grid: { display: false }, border: { color: GRID }, ...x },
  y: { grid: { color: GRID }, border: { display: false }, beginAtZero: true, ...y },
});
const gmNum = s => { const m = String(s ?? "").match(/(\d+(\.\d+)?)%/); return m ? +m[1] : null; };

// 큰 숫자 띠
const stats = items => `<div class="hv-stats">${items.map(([v, l, sub]) =>
  `<div><strong>${v}</strong><span>${esc(l)}</span>${sub ? `<em>${esc(sub)}</em>` : ""}</div>`).join("")}</div>`;

// 사진 카드
const photoCards = items => `<div class="hv-photos">${items.map(([img, kicker, title, text]) => `
<figure><img src="${PHOTO(img)}" alt="" loading="lazy"><figcaption><span>${esc(kicker)}</span><b>${esc(title)}</b><p>${esc(text)}</p></figcaption></figure>`).join("")}</div>`;

// 3라운드 평가 깔때기 (가로 막대가 좁아지는 그림)
function funnel(rows) {
  const W = 760, rowH = 58, max = rows[0][0];
  return `<svg class="hv-svg" viewBox="0 0 ${W} ${rows.length * rowH + 8}" role="img" aria-label="후보 품목 깔때기: ${rows.map(r => `${r[1]} ${r[0]}개`).join(", ")}">
${rows.map(([n, label, sub], i) => {
    const w = 220 + (W - 420) * (n / max), x = (W - 200 - w) / 2, y = i * rowH + 4;
    const fill = i === rows.length - 1 ? SERIES[0] : `rgba(42,120,214,${0.18 + i * 0.16})`;
    return `<rect x="${x}" y="${y}" width="${w}" height="${rowH - 10}" rx="8" fill="${fill}"/>
<text x="${x + w / 2}" y="${y + 31}" text-anchor="middle" font-size="22" font-weight="700" fill="${i >= 2 ? "#fff" : INK}">${n}</text>
<text x="${W - 190}" y="${y + 22}" font-size="14" font-weight="700" fill="${INK}">${esc(label)}</text>
<text x="${W - 190}" y="${y + 40}" font-size="12" fill="${MUTED}">${esc(sub)}</text>`;
  }).join("")}</svg>`;
}

// 단기 → 중장기 시너지 순환도
function flywheel() {
  const nodes = [
    ["정비소 케미칼 키트", "단기 · 총판 30곳으로 공급", SERIES[0]],
    ["정비소 거래 DB", "키트 거래처 = 가맹 후보", SERIES[1]],
    ["헬라 트럭온", "중장기 · 상용차 정비 O2O", SERIES[2]],
    ["상용 디젤·DPF 번들", "요소수·첨가제 반복 구매", SERIES[3]],
  ];
  const cx = 380, cy = 210, R = 150;
  const pos = nodes.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 2; return [cx + R * 1.55 * Math.cos(a), cy + R * Math.sin(a)]; });
  const arrows = pos.map(([x1, y1], i) => {
    const [x2, y2] = pos[(i + 1) % 4], mx = (x1 + x2) / 2 + (cx - (x1 + x2) / 2) * -0.25, my = (y1 + y2) / 2 + (cy - (y1 + y2) / 2) * -0.25;
    return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${MUTED}" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#hv-arrow)"/>`;
  }).join("");
  return `<svg class="hv-svg" viewBox="0 0 760 430" role="img" aria-label="시너지 순환: ${nodes.map(n => n[0]).join(" → ")}">
<defs><marker id="hv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="${MUTED}"/></marker></defs>
${arrows}
<circle cx="${cx}" cy="${cy}" r="74" fill="#14213d"/>
<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">HELLA 브랜드</text>
<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="13" fill="#e6d3b0">+ 윤활유 총판망</text>
${nodes.map(([t, s, c], i) => { const [x, y] = pos[i]; return `<g><rect x="${x - 105}" y="${y - 34}" width="210" height="68" rx="12" fill="#fff" stroke="${c}" stroke-width="2.5"/>
<circle cx="${x - 86}" cy="${y}" r="7" fill="${c}"/>
<text x="${x - 70}" y="${y - 4}" font-size="15" font-weight="700" fill="${INK}">${esc(t)}</text>
<text x="${x - 70}" y="${y + 17}" font-size="12" fill="${MUTED}">${esc(s)}</text></g>`; }).join("")}
</svg>`;
}

// 단기·중기·중장기 로드맵 (사진 머리 + 품목 칩)
function roadmap(pl) {
  const cols = [["A", "hella-mechanic", "0~6개월", "단기 · 즉시 매출", "총판·정비소 채널에 바로 얹는다"],
                ["B", "hella-warehouse", "6~12개월", "중기 · 2차 확장", "검증 후 케미칼 라인 확대"],
                ["C", "hella-truck", "12~24개월", "중장기 · 트럭온 시너지", "상용차 정비 O2O와 연결"]];
  return `<div class="hv-road">${cols.map(([t, img, when, title, sub]) => `
<section style="--c:${TIER_COLOR[t]}"><div class="hv-road-img" style="background-image:url('${PHOTO(img)}')"><span>${esc(when)}</span></div>
  <div class="hv-road-body"><h4>${esc(title)}</h4><p>${esc(sub)}</p>
  <ul>${(pl?.items || []).filter(i => i.tier === t).map(i => `<li>${esc(i.name)}${gmNum(i.gm) ? ` <small>GM ${gmNum(i.gm)}%</small>` : ""}</li>`).join("")}</ul></div></section>`).join('<div class="hv-road-arrow" aria-hidden="true">→</div>')}</div>`;
}

// ── 탭 ──
const TABS = {
  overview: ["개요·KPI", d => {
    const p = d.profile || {}, c = p.company || {};
    const steps = (p.methodology || []).map(s => `<li class="hv-step ${esc(s.status)}"><b>${s.id}</b><span>${esc(s.name)}</span></li>`).join("");
    const kpi = (d.kpis?.layers || []).map(l => `
<section class="hv-panel"><h3>${esc(l.name)} <small>${esc(l.audience)}</small></h3>
  <div class="hv-kpis">${l.kpis.map(k => `<div class="hv-kpi"><span>${esc(k.name)}</span>
    <strong>${k.current ?? "—"}<small>${esc(k.unit)}</small></strong>
    <em>목표 ${k.target ?? "미정"}${k.target != null ? esc(k.unit) : ""}</em></div>`).join("")}</div></section>`).join("");
    return `
${stats([["114억", "2025년 매출"], ["140억", "2026년 예상 매출", "▲ 23%"], ["90+10", "윤활유 품목 + 케미칼", "자동차용"], ["30+", "전국 총판·대리점", "온라인 5곳"], ["5명", "실행 조직", "본부장 중심"]])}
${photoCards([["hella-mechanic", "강점", "총판·정비소 유통망", "윤활유를 팔던 같은 영업·배송으로 케미칼을 얹는다"],
              ["hella-port", "기회", "해외 Top 케미칼 · 중국 소싱", "검증된 해외 제품과 중국 OEM으로 라인업 확장"],
              ["hella-truck", "중장기", "헬라 트럭온", "상용차 정비 O2O — 단기 품목이 시너지를 만든다"]])}
<section class="hv-panel"><h3>후보 47개를 3라운드로 좁혔다</h3>${funnel([[47, "롱리스트", "서치 에이전트 5종"], [17, "R1 유통·시장", "하드필터 4개"], [8, "R2 소싱·규제·재무", "100점 가중평가"], [4, "R3 단기 A등급", "전략·반론·본부장 관점"]])}</section>
<section class="hv-panel"><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p>
  ${table(["항목", "내용", "신뢰도"], (c.facts || []).map(f => `<tr><td>${esc(f.k)}</td><td>${esc(f.v)}</td><td>${conf(f.c)}</td></tr>`))}</section>
<section class="hv-panel"><h3>방법론 진행 단계</h3><ol class="hv-steps">${steps}</ol>
  <ul class="hv-timeline">${(p.timeline || []).map(t => `<li><time>${esc(t.date)}</time><b>${esc(t.title)}</b><span>${esc(t.desc)}</span></li>`).join("")}</ul></section>
<section class="hv-panel"><h3>역량 진단 — 자산과 병목</h3>
  ${table(["자산", "활용", "병목", "신뢰도"], (p.capabilities || []).map(x => `<tr><td><b>${esc(x.asset)}</b></td><td>${esc(x.use)}</td><td>${esc(x.bottleneck)}</td><td>${conf(x.c)}</td></tr>`))}</section>
${kpi}`;
  }],
  online: ["온라인 현황", d => {
    const o = d.online;
    if (!o) return empty("네이버 조회 결과가 아직 없습니다.");
    const yoy = v => v == null ? "—" : `${v > 0 ? "+" : ""}${v}%`;
    const bar = (v, max) => `<span class="hv-bar-row"><i style="width:${Math.max(1, Math.min(100, v / max * 100))}%"></i><b>${v ?? "—"}</b></span>`;
    const trend = (rows, label) => {
      const max = Math.max(...rows.map(r => r.recent), 1);
      return table([label, "최근 3개월 관심도", "1년 전 같은 기간", "변화"], rows.map(r =>
        `<tr><td><b>${esc(r.name)}</b></td><td class="hv-barcell">${bar(r.recent, max)}</td><td>${r.year_ago}</td><td>${yoy(r.yoy)}</td></tr>`));
    };
    const smax = Math.max(...o.shopping.map(r => r.vs_wiper || 0), 1);
    return `<p class="muted">${esc(o.source)} · ${esc(o.period)} · 조회 ${esc(o.updated)} · 지수는 각 조회 안에서 가장 높은 구간 = 100인 상대값</p>
${stats([["1/4", "리퀴몰리 대비 헬라 검색 관심도"], ["1/90", "불스원 대비"], ["6,480", "'헬라 엔진오일' 블로그 글"], ["242", "차량용 방향제 쇼핑 클릭", "와이퍼 = 100"]])}
<div class="hv-grid2">
  <section class="hv-panel"><h3>브랜드 검색 관심도 추이</h3><p class="muted">불스원(최근 66)은 규모가 달라 그래프에서 뺐다</p><div class="hv-chart"><canvas id="c-brand"></canvas></div></section>
  <section class="hv-panel"><h3>후보 품목 쇼핑 클릭 (와이퍼 = 100)</h3><p class="muted">막대 색 = 통합 권고안 등급</p><div class="hv-chart tall"><canvas id="c-shop"></canvas></div></section>
</div>
${o.notes?.length ? `<section class="hv-panel"><h3>해석</h3><ul class="hv-notes">${o.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></section>` : ""}
<section class="hv-panel"><h3>브랜드 검색 관심도 (네이버 통합검색)</h3>${trend(o.brand_trend, "브랜드")}</section>
<section class="hv-panel"><h3>헬라 제품군별 검색 관심도</h3>${trend(o.hella_lines, "제품군")}</section>
<section class="hv-panel"><h3>후보 품목 쇼핑 클릭 (와이퍼 = 100 기준)</h3>
  ${table(["키워드", "등급", "분야", "클릭 지수", "전년비"], o.shopping.map(r =>
    `<tr><td><b>${esc(r.name)}</b></td><td>${chip(r.tier)}</td><td>${esc(r.category)}</td><td class="hv-barcell">${bar(r.vs_wiper ?? 0, smax)}</td><td>${yoy(r.yoy)}</td></tr>`))}</section>
<section class="hv-panel"><h3>온라인 언급 (블로그)</h3>
  ${table(["검색어", "글 수", "최근 글"], o.mentions.map(m => `<tr><td><b>${esc(m.query)}</b></td>
    <td>${Object.entries(m.counts).map(([k, v]) => `${esc(k)} ${Number(v).toLocaleString("ko-KR")}`).join("<br>")}</td>
    <td>${m.recent.map(r => `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a> <small class="muted">${esc(r.by)} ${esc(r.date)}</small>`).join("<br>")}</td></tr>`))}</section>`;
  }, (el, d) => {
    const o = d.online, keep = ["헬라", "리퀴몰리", "소낙스", "모튤"];
    const brands = keep.map(n => o.brand_trend.find(b => b.name === n)).filter(Boolean);
    chart(el.querySelector("#c-brand"), {
      type: "line",
      data: { labels: brands[0].data.map(x => x[0]), datasets: brands.map((b, i) => ({
        label: b.name, data: b.data.map(x => x[1]), borderColor: SERIES[i], backgroundColor: SERIES[i],
        borderWidth: b.name === "헬라" ? 3 : 2, pointRadius: 0, pointHoverRadius: 5, tension: .3 })) },
      options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } } },
        scales: axes({ ticks: { maxTicksLimit: 8 } }, { title: { display: true, text: "검색 관심도 (상대)" } }) },
    });
    const shop = o.shopping.filter(r => r.vs_wiper > 0);
    chart(el.querySelector("#c-shop"), {
      type: "bar",
      data: { labels: shop.map(r => r.name), datasets: [{ label: "클릭 지수", data: shop.map(r => r.vs_wiper),
        backgroundColor: shop.map(r => TIER_COLOR[r.tier] || "#9aa0ab"), borderRadius: 4, borderSkipped: false, barThickness: 14 }] },
      options: { indexAxis: "y", maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `클릭 지수 ${c.raw} · 등급 ${shop[c.dataIndex].tier} · 전년비 ${shop[c.dataIndex].yoy ?? "—"}%` } } },
        scales: { x: { grid: { color: GRID }, border: { display: false }, beginAtZero: true }, y: { grid: { display: false }, ticks: { color: INK } } } },
    });
  }],
  plan: ["통합 권고안", d => {
    const r = (d.reports || []).find(r => r.id === "integrated");
    return `
${stats([["4개", "단기 A등급 품목", "0~6개월"], ["4,000만", "1차 파일럿 자금 상한", "1컨테이너 이하"], ["6,260만", "파일럿 매출 추정"], ["1.8~3.6억", "A등급 2027 연매출 추정"], ["7건", "결정 요청", "모두 Yes 권고"]])}
<section class="hv-panel"><h3>단기 매출 → 중장기 트럭온 시너지 로드맵</h3>${roadmap(d.pipeline)}</section>
<section class="hv-panel"><h3>시너지 순환 구조</h3><p class="muted">단기 품목이 만든 정비소 관계가 트럭온의 가맹망이 되고, 상용차 소모품 반복 구매로 돌아온다</p>${flywheel()}</section>
${r ? `<article class="hv-md">${md(r.md)}</article>` : empty("통합 권고안이 아직 없습니다.")}`;
  }],
  pipeline: ["품목 파이프라인", d => {
    const pl = d.pipeline || {}, tiers = pl.tiers || {};
    return `<section class="hv-panel"><h3>매력도 매트릭스 — 마진 × 종합 점수</h3><p class="muted">오른쪽 위일수록 매력적. 점 색 = 등급 (A 파랑 · B 주황). 점수·마진이 모두 있는 품목만 표시</p>
  <div class="hv-chart tall"><canvas id="c-matrix"></canvas></div></section>
<div class="hv-lanes">${Object.entries(tiers).map(([t, info]) => {
      const items = (pl.items || []).filter(i => i.tier === t);
      return `<section class="hv-lane t-${t}"><header><b>${esc(t)}</b> ${esc(info.label)}<small>${esc(info.horizon)}</small></header>
${items.map(i => `<article class="hv-item">
  <div class="hv-item-top"><h4>${esc(i.name)}</h4>${chip(i.stage)}</div>
  <dl><dt>점수</dt><dd>${i.score ?? "—"}</dd><dt>GM</dt><dd>${esc(i.gm)}</dd></dl>
  <p><b>조달</b> ${esc(i.sourcing)}</p>
  ${i.gate && i.gate !== "—" ? `<p class="hv-gate"><b>게이트</b> ${esc(i.gate)}</p>` : ""}
  ${i.next && i.next !== "—" ? `<p><b>다음</b> ${esc(i.next)}</p>` : ""}
  ${i.synergy && i.synergy !== "—" ? `<p class="hv-syn"><b>트럭온 시너지</b> ${esc(i.synergy)}</p>` : ""}
</article>`).join("") || empty("없음")}</section>`;
    }).join("")}</div>`;
  }, (el, d) => {
    const pts = (d.pipeline?.items || []).filter(i => i.score && gmNum(i.gm) != null);
    chart(el.querySelector("#c-matrix"), {
      type: "scatter",
      data: { datasets: ["A", "B", "C"].map(t => ({ label: `${t} ${d.pipeline.tiers[t].label}`,
        data: pts.filter(i => i.tier === t).map(i => ({ x: gmNum(i.gm), y: i.score, name: i.name })),
        backgroundColor: TIER_COLOR[t], borderColor: "#fff", borderWidth: 2, pointRadius: 9, pointHoverRadius: 12 })).filter(ds => ds.data.length) },
      options: { maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true } },
          tooltip: { callbacks: { label: c => `${c.raw.name}: 점수 ${c.raw.y} · GM ${c.raw.x}%` } } },
        scales: { x: { title: { display: true, text: "매출총이익률 GM (%)" }, grid: { color: GRID }, min: 20, max: 70 },
                  y: { title: { display: true, text: "R2 종합 점수 (100점)" }, grid: { color: GRID }, min: 65, max: 90 } } },
      plugins: [{ id: "labels", afterDatasetsDraw(c) {
        const g = c.ctx, boxes = []; g.save(); g.font = '600 12px "Noto Sans KR", sans-serif'; g.fillStyle = INK;
        // 이름표가 앞서 그린 이름표와 겹치면 아래로 내린다
        c.data.datasets.forEach((ds, i) => c.getDatasetMeta(i).data.forEach((pt, j) => {
          const t = ds.data[j].name, w = g.measureText(t).width; let x = pt.x + 12, y = pt.y + 4;
          while (boxes.some(b => x < b.x + b.w && b.x < x + w && Math.abs(b.y - y) < 14)) y += 15;
          boxes.push({ x, y, w }); g.fillText(t, x, y);
        }));
        g.restore(); } }],
    });
  }],
  signals: ["시그널", d => {
    const s = d.signals || {};
    if (!s.signals?.length) return `<section class="hv-panel"><h3>설계 단계 — 가동 전</h3>
<p>1차 협의에서 범위를 정한 뒤 가동하면, 매주 월요일 아래 시그널을 모아 이 화면과 주간 브리프에 올립니다.</p>
${table(["구분", "내용", "원천"], [
  ["환율·운임", "USD·CNY/KRW, 해상 운임 → 랜디드코스트 재계산", "공개 환율 API, 실견적 입력"],
  ["시장 뉴스", "기유 품귀·엔진오일 가격, 불스원·카포스 등 경쟁 동향", "뉴스 검색"],
  ["규제", "화학제품안전법 안전확인, 대기환경보전법 첨가제, 회수·처분 공지", "환경부·KEITI·공정위·뉴스"],
  ["수요·경쟁가", "품목 키워드 검색량, 쇼핑 최저가", "네이버 데이터랩·쇼핑 API (키 필요)"],
  ["실적", "판매·견적·총판 피드백 → KPI", "구글 시트 (박 대표·본부장 입력)"],
].map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`))}</section>`;
    return `<p class="muted">${esc(s.week || "")} · 갱신 ${esc(s.updated || "")}</p>` + table(["구분", "내용", "값", "변화", "출처"],
      s.signals.map(x => `<tr class="lv-${esc(x.level)}"><td>${chip(x.type)}</td><td>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</td>
        <td>${esc(x.value ?? "")}</td><td>${esc(x.delta ?? "")}</td><td>${esc(x.source || "")} ${esc(x.date || "")}</td></tr>`));
  }],
  assumptions: ["가정 검증", d => {
    const items = d.assumptions?.items || [];
    const n = items.length, open = items.filter(a => a.status === "미확인").length;
    return `<p class="muted">미확인 ${open} / 전체 ${n} — 이 비율을 매주 낮추는 것이 검증 단계의 목표입니다.</p>` +
      table(["가정", "영향", "상태", "담당", "기한", "최근 기록"], items.map(a => {
        const last = (a.history || []).at(-1) || {};
        return `<tr><td>${esc(a.text)}</td><td>${esc(a.impact)}</td><td>${conf(a.status)}</td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td><td>${esc(last.date || "")} ${esc(last.note || "")}</td></tr>`;
      }));
  }],
  decisions: ["결정·액션", d => table(["결정 요청", "권고", "상태", "담당", "기한"],
    (d.decisions?.items || []).map(x => `<tr><td>${esc(x.title)}</td><td>${esc(x.recommendation)}</td><td>${chip(x.status, x.done ? "ok" : "")}</td><td>${esc(x.owner)}</td><td>${esc(x.due)}</td></tr>`))],
  reports: ["리포트", d => {
    const list = (d.reports || []).filter(r => r.type !== "method");
    return `<div class="hv-reports"><nav>${list.map((r, n) => `<button data-r="${n}" aria-pressed="${n === 0}">${chip({ report: "권고", research: "리서치", weekly: "주간", monthly: "월간" }[r.type] || r.type)} ${esc(r.title)} <small>${esc(r.date)}</small></button>`).join("")}</nav>
      <article class="hv-md" id="hv-report">${list[0] ? md(list[0].md) : ""}</article></div>`;
  }, (el, d) => {
    const list = (d.reports || []).filter(r => r.type !== "method");
    el.querySelectorAll("[data-r]").forEach(b => b.addEventListener("click", () => {
      el.querySelectorAll("[data-r]").forEach(x => x.setAttribute("aria-pressed", x === b));
      el.querySelector("#hv-report").innerHTML = md(list[+b.dataset.r].md);
      el.querySelector("#hv-report").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }],
  method: ["방법론", d => {
    const r = (d.reports || []).find(r => r.type === "method");
    return r ? `<article class="hv-md">${md(r.md)}</article>` : empty("운영 방법론 문서가 아직 없습니다.");
  }],
};

function show(d) {
  const tab = (location.hash.slice(1) in TABS) ? location.hash.slice(1) : "overview";
  root.innerHTML = `
<div class="hv-bar"><span class="muted">자료 기준 ${esc(d.built)}</span><button class="btn btn-ghost-dark hv-out" type="button">잠그기</button></div>
<nav class="hv-tabs" role="tablist">${Object.entries(TABS).map(([id, [label]]) => `<a role="tab" href="#${id}" aria-selected="${id === tab}">${esc(label)}</a>`).join("")}</nav>
<div class="hv-body"></div>`;
  const body = root.querySelector(".hv-body");
  const render = id => {
    const [, draw, wire] = TABS[id];
    charts.forEach(c => c.destroy()); charts = [];
    body.innerHTML = draw(d);
    wire?.(body, d);
    root.querySelectorAll(".hv-tabs a").forEach(a => a.setAttribute("aria-selected", a.hash === `#${id}`));
  };
  render(tab);
  window.onhashchange = () => { const id = location.hash.slice(1); if (id in TABS) render(id); };
  root.querySelector(".hv-out").addEventListener("click", () => { store.clear(); location.reload(); });
}

(async () => {
  let vault;
  try {
    vault = await fetch("data/hella/vault.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : Promise.reject());
  } catch {
    root.innerHTML = empty("자료를 불러오지 못했습니다.");
    return;
  }
  const saved = store.get();
  if (saved) {
    try { return show(await open(vault, saved)); } catch { store.clear(); }
  }
  lock(vault);
})();
