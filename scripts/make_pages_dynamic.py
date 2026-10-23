"""2D 페이지에 남아 있던 고정 내용을 데이터로 옮긴다(한 번만).

- 페이지마다 맨 위 배너(page-hero) → content/pages.json 의 "heroes"[페이지]
- 홈의 '집 안의 방' 카드 → content/pages.json 의 "rooms"
- HTML 에는 data-render="hero" / "rooms" 자리만 남고, assets/site/site.js 가 그린다.
긴 단독 글(simda.html, china-bukjunghoe.html)은 그대로 둔다. 다시 돌리면 아무 일도 하지 않는다.
"""
import html as H, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content/pages.json"
txt = lambda s: H.unescape(re.sub(r"<[^>]+>", "", s)).strip()  # noqa: E731
if OUT.exists():
    raise SystemExit("이미 옮겼습니다")

data = {"heroes": {}, "rooms": []}
for f in sorted(ROOT.glob("*.html")):
    src = f.read_text(encoding="utf-8")
    m = re.search(r'<section class="page-hero" style="background-image:url\(\'([^\']+)\'\)">.*?</section>', src, re.S)
    if not m:
        continue
    s = m.group(0)
    crumb = re.search(r'<div class="crumbs">(.*?)</div>', s).group(1)
    data["heroes"][f.name] = {
        "bg": m.group(1),
        "crumb": txt(crumb.split("</a>")[-1]).lstrip("/ ").strip(),
        "eyebrow": txt(re.search(r'<span class="eyebrow">(.*?)</span>', s).group(1)),
        "title": txt(re.search(r"<h1>(.*?)</h1>", s, re.S).group(1)),
        "textHtml": re.search(r"<p>(.*?)</p>", s, re.S).group(1).strip(),
        "ctas": [{"primary": "btn-primary" in c, "href": h, "text": txt(t), "newTab": "_blank" in a}
                 for c, h, a, t in re.findall(r'<a class="btn ([^"]+)" href="([^"]+)"([^>]*)>(.*?)</a>', s)],
    }
    f.write_text(src.replace(s, '<section class="page-hero" data-render="hero"></section>'), encoding="utf-8")

idx = ROOT / "index.html"
src = idx.read_text(encoding="utf-8")
grid = re.search(r'(<section class="block alt" id="rooms">.*?)(<div class="grid grid-3">.*?\n    </div>)', src, re.S).group(2)
for cls, href, img, kick, h3, p in re.findall(
        r'<a class="room-card ?([^"]*?) ?reveal" href="([^"]+)"><img src="([^"]+)"[^>]*>\s*<div><span class="card-kicker">(.*?)</span><h3>(.*?)</h3><p>(.*?)</p></div></a>', grid):
    data["rooms"].append({"href": href, "img": img, "kicker": txt(kick), "title": txt(h3), "text": txt(p), "size": cls.strip()})
assert len(data["rooms"]) == 10 and len(data["heroes"]) == 11, (len(data["rooms"]), len(data["heroes"]))
idx.write_text(src.replace(grid, '<div class="grid grid-3" data-render="rooms"></div>'), encoding="utf-8")
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

# site.js: 배너와 방 카드 그리기
js = ROOT / "assets/site/site.js"
t = js.read_text(encoding="utf-8")
anchor = "\nheader();\nfooter();\n"
add = '''
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
R.rooms = async el => {
  const { rooms } = await json("content/pages.json");
  el.innerHTML = rooms.map(r => `
<a class="room-card ${esc(r.size)} reveal in" href="${esc(r.href)}"><img src="${esc(r.img)}" alt="" loading="lazy">
  <div><span class="card-kicker">${esc(r.kicker)}</span><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div></a>`).join("");
};
'''
assert t.count(anchor) == 1
js.write_text(t.replace(anchor, add + anchor), encoding="utf-8")
print(f"옮김: 배너 {len(data['heroes'])}쪽 · 방 카드 {len(data['rooms'])}장 → {OUT.relative_to(ROOT)}")
