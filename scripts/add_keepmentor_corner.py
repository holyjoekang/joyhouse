"""오벌 오피스(studio.html)에 'Keep Mentor' 코너를 스타트업 멘토링 카드 아래에 붙인다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/add_keepmentor_corner.py

- content/keepmentor.json      코너 내용 (https://keepmentor.vercel.app 요약)
- assets/photos/keepmentor.webp 코너 사진 (Keep Mentor 사이트의 Unsplash 사진)
- assets/site/site.js          R.keepmentor 렌더러
- studio.html                  data-render="keepmentor" 자리
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_PHOTO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/user/keepmentor/public/images/hero.jpg")
URL = "https://keepmentor.vercel.app"

DATA = {
    "url": URL,
    "eyebrow": "Keep Mentor",
    "title": "Keep Mentor — 멘토링의 품질을 증거로",
    "lead": "스타트업 멘토링 방법론을 실제로 쓰는 웹앱으로 만들었습니다. 모든 기업을 같은 7축·12문항으로 진단하고, 회차마다 2주짜리 실험 카드로 끝내며, 변화를 증거등급으로 측정합니다. 핵심 기록은 사람이 먼저 쓰고 AI는 초안만 돕습니다.",
    "photo": "assets/photos/keepmentor.webp",
    "photoAlt": "포스트잇을 붙이며 워크숍을 하는 팀",
    "stats": [
        {"value": "6단계", "label": "사전진단부터 사후 추적까지"},
        {"value": "12문항", "label": "7개 축의 표준 진단"},
        {"value": "E0–E4", "label": "증거등급에 따른 점수 상한"},
        {"value": "12개", "label": "참고한 검증 방법론"},
    ],
    "steps": [
        {"title": "신청·사전진단", "when": "1차 7일 전", "text": "대표가 현황과 이슈를 증거와 함께 먼저 적습니다."},
        {"title": "진단·목표 합의", "when": "1차", "text": "증거로 현재 위치를 판정하고 목표를 1~2개로 좁힙니다."},
        {"title": "실험 설계", "when": "1차 마무리", "text": "조언 대신 2주 안에 돌릴 실험 카드로 끝냅니다."},
        {"title": "실행·점검", "when": "2차", "text": "실험 결과를 보고 Pivot · Persevere · Kill을 결정합니다."},
        {"title": "정리·로드맵", "when": "3차", "text": "재측정으로 변화를 확인하고 90일 로드맵을 만듭니다."},
        {"title": "사후 추적", "when": "3·6개월 후", "text": "지원사업 선정, 투자, 고용, 매출로 성과를 추적합니다."},
    ],
    "links": [
        {"text": "Keep Mentor 열기 ↗", "href": URL, "primary": True},
        {"text": "방법론 상세 ↗", "href": URL + "/method", "primary": False},
        {"text": "도입 안내 ↗", "href": URL + "/solutions", "primary": False},
    ],
    "note": "데모 모드로 멘토·멘티·기관 역할을 골라 바로 써 볼 수 있습니다.",
}

RENDERER = r'''
// Keep Mentor 코너 — content/keepmentor.json 을 그린다.
R.keepmentor = async el => {
  const d = await json("content/keepmentor.json");
  el.innerHTML = `
<div class="split">
  <div class="reveal in">
    <span class="eyebrow">${esc(d.eyebrow)}</span>
    <h2>${esc(d.title)}</h2>
    <p class="lead">${esc(d.lead)}</p>
    <div class="hero-cta">${d.links.map(l => `<a class="btn ${l.primary ? "btn-dark" : "btn-line"}" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.text)}</a>`).join("")}</div>
    <p class="muted" style="margin-top:12px">${esc(d.note)}</p>
  </div>
  <div class="figure reveal in"><img src="${esc(d.photo)}" alt="${esc(d.photoAlt)}" loading="lazy"></div>
</div>
<div class="stats making-stats" style="margin-top:32px">${d.stats.map(s => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>
<ol class="grid grid-3 make-steps" style="margin-top:24px">${d.steps.map((s, n) => `
<li class="card reveal in"><div class="card-body"><span class="make-no">${n + 1}</span>
  <span class="card-kicker">${esc(s.when)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join("")}</ol>`;
};
'''

SECTION = """<section class="block" id="keepmentor">
  <div class="wrap" data-render="keepmentor"></div>
</section>
"""


def main():
    (ROOT / "content" / "keepmentor.json").write_text(json.dumps(DATA, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    photo = ROOT / DATA["photo"]
    if not photo.exists():
        from PIL import Image
        im = Image.open(SRC_PHOTO).convert("RGB")
        im.thumbnail((1400, 1400))
        im.save(photo, "WEBP", quality=78)

    js = ROOT / "assets" / "site" / "site.js"
    s = js.read_text(encoding="utf-8")
    if "R.keepmentor" not in s:
        anchor = '\ndocument.querySelectorAll("[data-render]")'
        s = s.replace(anchor, RENDERER + anchor, 1)
        js.write_text(s, encoding="utf-8")

    st = ROOT / "studio.html"
    h = st.read_text(encoding="utf-8")
    if 'id="keepmentor"' not in h:
        anchor = '<section class="block" id="committee-corner">'
        h = h.replace(anchor, SECTION + anchor, 1) if anchor in h else h.replace('<section class="cta-band"', SECTION + '<section class="cta-band"', 1)
        st.write_text(h, encoding="utf-8")
    print("Keep Mentor 코너 추가 완료")


if __name__ == "__main__":
    main()
