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
<section class="hv-panel"><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p>
  ${table(["항목", "내용", "신뢰도"], (c.facts || []).map(f => `<tr><td>${esc(f.k)}</td><td>${esc(f.v)}</td><td>${conf(f.c)}</td></tr>`))}</section>
<section class="hv-panel"><h3>방법론 진행 단계</h3><ol class="hv-steps">${steps}</ol>
  <ul class="hv-timeline">${(p.timeline || []).map(t => `<li><time>${esc(t.date)}</time><b>${esc(t.title)}</b><span>${esc(t.desc)}</span></li>`).join("")}</ul></section>
<section class="hv-panel"><h3>역량 진단 — 자산과 병목</h3>
  ${table(["자산", "활용", "병목", "신뢰도"], (p.capabilities || []).map(x => `<tr><td><b>${esc(x.asset)}</b></td><td>${esc(x.use)}</td><td>${esc(x.bottleneck)}</td><td>${conf(x.c)}</td></tr>`))}</section>
${kpi}`;
  }],
  plan: ["통합 권고안", d => {
    const r = (d.reports || []).find(r => r.id === "integrated");
    return r ? `<article class="hv-md">${md(r.md)}</article>` : empty("통합 권고안이 아직 없습니다.");
  }],
  pipeline: ["품목 파이프라인", d => {
    const pl = d.pipeline || {}, tiers = pl.tiers || {};
    return `<div class="hv-lanes">${Object.entries(tiers).map(([t, info]) => {
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
