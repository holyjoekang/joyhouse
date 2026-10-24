"""비전룸을 '세 번째 30년' 비전으로 다시 짓는다.

- content/vision.json : 비전룸의 모든 글(삶의 세 막 · 비전 선언 · 여섯 영역 · 레거시 · 일의 구조 · 로드맵 · 원칙 · 실험)
- vision.html          : 배너 + data-render="vision" 자리만 남긴다. 그리는 일은 assets/site/vision.js
- site.js              : R.vision(지연 로드) 추가, 꼬리 링크 이름 변경
- site.css             : .v- 스타일 덧붙임
- pages.json / index.html / content/rooms/vision.json / README.md : 비전룸 이름·소개 갱신
Keep121 은 지우지 않고 '진행 중인 실험' 카드로 옮긴다. 다시 돌려도 결과가 같다.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W = lambda p, s: (ROOT / p).write_text(s, encoding="utf-8")  # noqa: E731
R = lambda p: (ROOT / p).read_text(encoding="utf-8")  # noqa: E731

VISION = {
  "sections": [
    {"id": "acts", "kind": "acts",
     "eyebrow": "Three Acts of Life", "title": "삶의 세 막, 그리고 세 번째 30년",
     "lead": "두 번째 30년이 아니라 세 번째 30년입니다. 앞의 두 막에서 받고 세운 것을, 이제 돌려주고 아름답게 맺습니다.",
     "items": [
       {"no": "제1막", "age": "0~26세 · 1970~1996", "title": "배움", "en": "Learning", "verb": "받다",
        "text": "부모님 품에서 자라고, 초중고·대학 교육과 군 생활을 통해 사람을 이해하는 눈을 길렀습니다. 받은 사랑과 교육이 모든 것의 뿌리가 되었습니다.",
        "tags": ["가정과 뿌리", "고려대 심리학", "청년의 꿈"]},
       {"no": "제2막", "age": "26~57세 · 1996.2~2027", "title": "세움", "en": "Building", "verb": "세우다",
        "text": "결혼해 가정을 이루고 자녀를 길렀습니다. 삼성에서 30년, 베이징 7년과 중국 총경리 6년을 지나며 일과 사람과 세상을 배웠습니다.",
        "tags": ["결혼과 자녀 양육", "삼성 30년", "베이징·중국 13년", "기술사·EMBA", "블로그 2,500편"]},
       {"no": "제3막", "age": "57~87세 · 2027 하반기~2057", "title": "나눔과 맺음", "en": "Giving & Completing", "verb": "돌려주다",
        "text": "두 번의 30년에서 얻은 경험과 지혜로 삶의 방향과 가치를 바로 세우고, 다음 세대와 자녀에게 보이지 않는 자산을 남깁니다.",
        "tags": ["조화로운 삶", "다음 세대 세우기", "무형의 유산", "아름다운 마무리"], "now": True}],
     "note": "1970년에 태어나 1996년 2월 삼성에 입사했습니다. 2027년 하반기, 새로운 30년이 시작됩니다."},

    {"id": "statement", "kind": "statement", "alt": True,
     "eyebrow": "Vision Statement",
     "vision": "두 번의 30년에서 받은 것을, 세 번째 30년에 돌려준다. 나·가족·일·관계·건강·신앙이 조화를 이루는 삶으로 다음 세대를 세우고, 아름답게 맺는다.",
     "lines": [
       {"label": "정체성", "text": "다리를 놓는 사람 — 나라(한·중·일), 세대(청년·50+), 기술과 사람, 지식과 마음을 잇는다."},
       {"label": "미션", "text": "경험과 AI로 다리를 놓아, 사람을 다시 세운다."}],
     "values": [
       {"word": "조화", "en": "Harmony", "text": "한 영역의 성공이 다른 영역의 희생이 되지 않게"},
       {"word": "이음", "en": "Bridge", "text": "내가 서 있던 자리와 자리 사이에 다리를 놓는다"},
       {"word": "섬김", "en": "Stewardship", "text": "받은 것은 내 것이 아니라 맡겨진 것이다"},
       {"word": "남김", "en": "Legacy", "text": "재산보다 이야기와 가치, 관계를 남긴다"}]},

    {"id": "harmony", "kind": "wheel",
     "eyebrow": "Six Areas of Harmony", "title": "여섯 영역이 함께 둥근 삶",
     "lead": "바퀴는 한쪽만 크면 굴러가지 않습니다. 각 영역마다 지향과 2037년의 모습, 지금 시작할 습관을 적었습니다.",
     "side": "두 번째 30년이 일 중심의 직선이었다면, 세 번째 30년은 여섯 바퀴살이 고르게 뻗은 원입니다.",
     "rules": ["일은 시간의 40%를 넘기지 않는다", "가족과 합의하지 않은 확장은 하지 않는다", "건강과 쉼을 달력에 먼저 적는다", "매년 연말, 여섯 영역을 스스로 점검한다"],
     "items": [
       {"name": "나", "art": "self_portrait", "artCap": "빈센트 반 고흐, 자화상 · 1887", "en": "Self", "color": "#2d4a7a", "aim": "배움을 멈추지 않는 사람",
        "text": "읽고 쓰는 사람으로 늙어 간다. 15년의 블로그를 책으로 엮고, 생각을 정리하는 습관을 지킨다.",
        "picture": "책 3권, 매일 쓰는 사람", "habit": "주 2편 쓰기 · 월 2권 읽기"},
       {"name": "가족", "art": "rhone", "artCap": "빈센트 반 고흐, 론 강의 별빛 · 1888", "en": "Family", "color": "#b08d57", "aim": "늘 함께하는 부부, 수평으로 이어지는 가정",
        "text": "아내와는 늘 함께한다. 국내외 여행을 같이 다니고, 매일 함께 산책하며, 대화가 끊이지 않는 부부로 산다. 자녀와는 위아래가 아니라 수평의 관계로, 멘토처럼 친구처럼 곁에 선다.",
        "picture": "함께 여행하고 매일 걷는 부부, 아버지를 친구처럼 찾는 자녀들", "habit": "매일 아내와 산책하며 대화 · 해마다 국내외 부부 여행 · 자녀와는 지시 대신 질문과 경청"},
       {"name": "일", "art": "sunflowers", "artCap": "빈센트 반 고흐, 해바라기 · 1888", "en": "Work", "color": "#1f6f5a", "aim": "경험이 쓰임이 되는 일",
        "text": "평가·자문·멘토의 바닥 위에, 사람을 세우는 주력 하나를 쌓고, 투자와 아카데미로 다음 세대에 넘긴다.",
        "picture": "청년이 함께 일하는 작은 법인", "habit": "퇴직 전에는 돈이 아닌 증거를 모은다"},
       {"name": "관계", "art": "cafe_terrace", "artCap": "빈센트 반 고흐, 밤의 카페 테라스 · 1888", "en": "Relationships", "color": "#8a1c1c", "aim": "오래된 인연을 잇고, 새 세대와 친구가 되는 사람",
        "text": "대학 동기, 중국에서 맺은 인연, 교회 공동체를 잇고, 청년들에게 먼저 다가가는 선배가 된다.",
        "picture": "동기들과 함께하는 파트너십, 한중일 신뢰 네트워크", "habit": "월 2회 감사 연락 · 청년과의 정기 만남"},
       {"name": "건강", "art": "almond", "artCap": "빈센트 반 고흐, 꽃 피는 아몬드 나무 · 1890", "en": "Health", "color": "#3c8d6e", "aim": "끝까지 내 발로 달리는 몸",
        "text": "일보다 몸이 먼저다. 물에서, 길 위에서, 아내와 토리와 함께 걸으며 몸을 지킨다. 주 4일 일하고, 해마다 한 번은 안식의 쉼표를 찍는다.",
        "picture": "70대에도 하프마라톤을 완주하는 체력", "habit": "수영 주 2회 1km · 하프마라톤 2시간 완주(연 2회 참가) · 매일 아내와 토리(갈색 푸들)와 1시간 산책 · 연 1회 정밀검진"},
       {"name": "신앙", "art": "starry_night", "artCap": "빈센트 반 고흐, 별이 빛나는 밤 · 1889", "en": "Faith", "color": "#6b4f8a", "aim": "삶 전체가 예배가 되는 일",
        "text": "청지기의 마음으로 맡겨진 시간과 재능을 쓴다. 신앙은 말보다 삶의 방식으로 드러낸다.",
        "picture": "말씀 노트와 일과 신앙을 나누는 작은 공동체", "habit": "새벽 말씀 묵상 · 주 1회 섬김"}]},

    {"id": "legacy", "kind": "legacy", "alt": True,
     "eyebrow": "Legacy", "title": "무엇을 남길 것인가",
     "lead": "사회에는 배우고 쌓은 것을 돌려주고, 자녀에게는 유형을 넘어 무형의 자산을 물려줍니다.",
     "society": {"kicker": "To the Next Generation", "title": "사회와 청년에게",
                 "text": "심사하던 사람이 판을 만드는 사람으로. 시니어의 경험과 청년의 기술이 만나는 자리를 만듭니다.",
                 "goals": [{"n": "20팀", "t": "투자·멘토링한 청년 창업팀"}, {"n": "1,000명", "t": "두 번째 커리어를 설계한 50+ 동료"},
                           {"n": "3권", "t": "경험과 지혜를 담은 책"}, {"n": "1곳", "t": "비영리 아카데미"}],
                 "ways": ["동기들과 개인투자조합을 만들어 청년 창업팀에 투자하고 멘토링한다",
                          "청년 2~3명을 고용해 함께 일하며 일하는 법을 물려준다",
                          "블로그와 책, 강연으로 30년의 경험을 공개 자산으로 만든다",
                          "숫자는 방향을 보여 주는 예시이며 확정 목표가 아니다"]},
     "children": {"kicker": "To My Children", "title": "자녀에게",
                  "text": "남겨 줄 수 있는 가장 큰 자산은 집이나 통장보다, 어떻게 살았는가에 대한 기억입니다.",
                  "rows": [["집과 금융 자산", "가치와 신앙 — 무엇을 위해 사는가"],
                           ["승계의 원칙과 문서", "일하는 태도 — 성실, 신뢰, 끝맺음"],
                           ["함께 일할 회사·지분", "함께 일해 본 경험 — 명의가 아니라 역할로"],
                           ["Joyhouse·책·기록물", "이야기 — 편지, 가족 기록, 타임캡슐"],
                           ["사람을 소개하는 자리", "관계 — 한·중·일에 걸친 신뢰의 네트워크"]],
                  "note": "유형의 자산은 원칙과 함께 넘긴다. 무형의 자산은 지금부터 함께 쌓는다."}},

    {"id": "work", "kind": "work",
     "eyebrow": "How I Work", "title": "일의 구조 — 바닥 · 주력 · 레거시",
     "lead": "하나의 사업이 아니라 세 층의 포트폴리오. 비율은 시간 배분 기준입니다.",
     "layers": [
       {"pct": 40, "name": "바닥 — 신뢰를 쌓는 일", "text": "창업 심사·평가위원, 수출 자문, 멘토링. 자본 없이 시작하고, 시장과 사람을 만나는 창구."},
       {"pct": 40, "name": "주력 — 사람을 세우는 일", "text": "AI로 두 번째 30년을 설계하는 코칭·교육·책, 창업지원 패키지. 한중일 브리지는 관문을 통과하면 확장."},
       {"pct": 20, "name": "레거시 — 넘겨주는 일", "text": "투자조합, 비영리 아카데미, 책, 다음 세대와의 관계. 돈보다 의미, 10년을 보는 층."}],
     "note": "주력은 동시에 두 개까지만. 현금흐름 압박이 낮으니, 소득 극대화가 아니라 의미 × 지속 가능성으로 고른다."},

    {"id": "road", "kind": "road", "alt": True,
     "eyebrow": "Roadmap", "title": "세 번째 30년의 지도",
     "lead": "열 해씩 세 걸음. 첫 열 해는 구체적으로, 뒤의 스무 해는 방향으로 적었습니다.",
     "decades": [
       {"age": "57~67세", "years": "2027~2037", "title": "다리를 놓다", "now": True,
        "text": "바닥을 다지고 주력 하나를 세운다. 책을 내고, 투자조합 1호를 만들고, 청년과 함께 일하기 시작한다.",
        "steps": [{"t": "준비", "d": "2026.10~27.8"}, {"t": "출발", "d": "2027.9~28"}, {"t": "집중", "d": "2029~30"},
                  {"t": "확장", "d": "2031~33"}, {"t": "이양 준비", "d": "2034~37"}]},
       {"age": "67~77세", "years": "2037~2047", "title": "세우고 넘기다",
        "text": "운영에서 물러나 이사회·멘토·재단의 자리로 간다. 아카데미와 조합을 다음 세대에게 넘기고, 자녀와 함께 가족의 가치를 정리한다."},
       {"age": "77~87세+", "years": "2047~", "title": "아름답게 맺다",
        "text": "회고록과 편지로 삶을 기록하고, 받은 것에 감사하며 축복하는 사람으로 남는다. 마지막까지 조화로운 하루를 산다."}]},

    {"id": "principles", "kind": "principles",
     "eyebrow": "Principles", "title": "판단의 원칙과 아직 정하는 질문",
     "rulesTitle": "판단의 원칙",
     "rules": ["재직 중에는 돈을 벌지 않고, 해 본 증거를 모은다", "주력은 동시에 두 개까지, 관문을 통과해야 다음으로 간다",
               "시간은 40·40·20, 주 4일, 해마다 한 번 쉼표", "가족 합의 없는 확장은 하지 않는다", "우리 사업은 우리의 이슈를 해결한다 — 시장이 끌어당길 때 움직인다"],
     "qTitle": "함께 정해 갈 질문",
     "questions": ["미션 문장은 마음에 닿는가, 무엇이 빠졌는가", "먼저 검증할 주력은 사람·AI 교육인가, 한중일 브리지인가",
                   "아내와 자녀는 어떤 역할로, 얼마나 함께하는가", "신앙의 소명을 일에 드러낼 것인가, 내면의 동기로 둘 것인가",
                   "소득과 의미의 비중을 숫자로 둘 것인가, 시간과 관계로 둘 것인가"]},

    {"id": "labs", "kind": "labs", "alt": True,
     "eyebrow": "Experiments in Progress", "title": "지금 진행 중인 실험",
     "lead": "비전은 작은 실험으로 검증합니다.",
     "items": [
       {"href": "https://holyjoekang.github.io/keep121/", "img": "tour-bus", "kicker": "Startup Lab", "title": "Keep121",
        "text": "한 사람도 빠짐없이, 지키다. 단체 여행·행사를 위한 안전 플랫폼."},
       {"href": "simda.html", "img": "team-work", "kicker": "Partnership", "title": "심다 파트너스",
        "text": "대학 동기들과 함께 청년 세대에 투자하고 레거시를 잇는 파트너십 구상."},
       {"href": "ideas.html", "img": "glasses-notes", "kicker": "Idea Lab", "title": "아이디어 랩",
        "text": "검증을 기다리는 창업 아이디어들. 비즈니스 모델과 검증 과제까지."}]},

    {"id": "verse", "kind": "quote", "tight": True,
     "text": "우리에게 우리 날 계수함을 가르치사 지혜로운 마음을 얻게 하소서", "cite": "시편 90편 12절"}]
}

# 1) 데이터
W("content/vision.json", json.dumps(VISION, ensure_ascii=False, indent=1) + "\n")

# 2) 페이지 껍데기
W("vision.html", """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>비전룸 · 세 번째 30년 — Joyhouse</title>
<meta name="description" content="세 번째 30년 — 두 번의 30년에서 받은 것을 돌려주고, 조화로운 삶으로 다음 세대를 세운다.">
<meta property="og:title" content="비전룸 · 세 번째 30년 — Joyhouse">
<meta property="og:description" content="세 번째 30년 — 두 번의 30년에서 받은 것을 돌려주고, 조화로운 삶으로 다음 세대를 세운다.">
<meta property="og:image" content="assets/photos/lake-dock.webp">
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="assets/site/site.css">
</head>
<body>
<main id="main">
<section class="page-hero" data-render="hero"></section>
<div data-render="vision"></div>
</main>
<script type="module" src="assets/site/site.js"></script>
</body>
</html>
""")

# 3) 배너·홈 카드
pages = json.loads(R("content/pages.json"))
pages["heroes"]["vision.html"] = {
  "bg": "assets/photos/lake-dock.webp", "crumb": "비전룸", "eyebrow": "East Wing · Vision Room",
  "title": "세 번째 30년",
  "textHtml": "배움의 30년, 세움의 30년을 지나 이제 <b>나눔과 맺음의 30년</b>을 엽니다.<br>두 번의 시간에서 받은 경험과 지혜를 다음 세대에게 돌려주고, 삶의 모든 영역이 조화를 이루도록 아름답게 마무리합니다.",
  "ctas": [{"primary": True, "href": "#statement", "text": "비전 선언 보기", "newTab": False},
           {"primary": False, "href": "#harmony", "text": "여섯 영역의 조화", "newTab": False}]}
for r in pages["rooms"]:
    if r["href"] == "vision.html":
        r.update(img="assets/photos/lake-dock.webp", title="비전룸 · 세 번째 30년", text="받은 것을 돌려주고, 조화롭게 맺는 30년.")
W("content/pages.json", json.dumps(pages, ensure_ascii=False, indent=1) + "\n")

# 4) site.js — 비전 렌더러(지연 로드)와 꼬리 링크
js = R("assets/site/site.js").replace("비전룸 · Keep121", "비전룸 · 세 번째 30년")
if "R.vision" not in js:
    js = js.replace("R.rooms = async el => {",
                    '// 비전룸 — 그리는 코드는 vision.js, 글은 content/vision.json\n'
                    'R.vision = async el => (await import("./vision.js")).default(el, json, esc);\n'
                    "R.rooms = async el => {", 1)
W("assets/site/site.js", js)

# 5) 홈 단면도 설명, 3D 방 제목, README
W("index.html", R("index.html").replace("이스트윙 · 비전룸 — Keep121, 한 사람도 빠짐없이 지키다",
                                         "이스트윙 · 비전룸 — 세 번째 30년, 받은 것을 돌려주고 조화롭게 맺다"))
room = json.loads(R("content/rooms/vision.json"))
room["title"] = "비전룸 — 세 번째 30년 · Keep121"
W("content/rooms/vision.json", json.dumps(room, ensure_ascii=False, indent=1) + "\n")
W("README.md", R("README.md").replace("| `vision.html` | 비전룸 | Keep121 소개 일곱 장 |",
    "| `vision.html` | 비전룸 | 세 번째 30년 비전: 삶의 세 막·비전 선언·여섯 영역의 조화·레거시·일의 구조·로드맵·원칙·진행 중인 실험 (`content/vision.json`, `assets/site/vision.js`) |"))

# 6) 스타일
CSS = """
/* ── 비전룸 · 세 번째 30년 (scripts/vision_third30.py) ── */
.v-center { justify-content: center; text-align: center; }
.v-note { color: var(--muted); font-size: .9rem; margin-top: 20px; }
.v-acts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.v-act { position: relative; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); padding: 28px 26px; box-shadow: var(--shadow); }
.v-act.now { background: var(--navy); color: #fff; border-color: var(--navy); box-shadow: var(--shadow-lg); }
.v-act.now p { color: #d5dbe7; }
.v-act-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
.v-act-no { font: 700 .82rem var(--sans); letter-spacing: .12em; color: var(--gold); }
.v-act-age { font-size: .8rem; color: var(--muted); }
.v-act.now .v-act-age { color: #aab4c8; }
.v-act h3 { font-size: 1.7rem; margin-bottom: 4px; }
.v-act h3 small { display: block; font: 500 .78rem var(--sans); letter-spacing: .08em; color: var(--muted); margin-top: 4px; }
.v-act.now h3 small { color: #aab4c8; }
.v-act-verb { display: inline-block; font: 600 .85rem var(--sans); color: var(--gold); border: 1px solid currentColor; border-radius: 999px; padding: 2px 12px; margin-bottom: 14px; }
.v-act > p:not(.v-act-verb) { font-size: .95rem; color: var(--ink-2); }
.v-act.now > p:not(.v-act-verb) { color: #d5dbe7; }
.v-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.v-tags span { font-size: .78rem; padding: 3px 10px; border-radius: 999px; background: #f2ede3; color: var(--ink-2); }
.v-act.now .v-tags span { background: rgba(255,255,255,.12); color: #fff; }
.v-arrow { position: absolute; right: -24px; top: 50%; transform: translateY(-50%); font-style: normal; color: var(--gold); font-size: 1.3rem; z-index: 2; }
@media (max-width: 900px) { .v-acts { grid-template-columns: 1fr; } .v-arrow { right: 50%; top: auto; bottom: -26px; transform: translateX(50%) rotate(90deg); } }

.v-statement { max-width: 920px; margin: 0 auto; text-align: center; }
.v-vision { font: 600 clamp(1.35rem, 2.8vw, 2rem)/1.65 var(--serif); color: var(--navy); margin: 12px 0 36px; }
.v-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 36px; }
.v-pair > div { background: var(--paper); border-radius: var(--radius); padding: 22px 24px; border-left: 4px solid var(--gold); box-shadow: var(--shadow); }
.v-pair p { margin: 6px 0 0; font: 500 1.05rem/1.6 var(--serif); }
.v-values { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.v-values > div { padding: 18px 12px; border-top: 2px solid var(--navy); }
.v-values b { display: block; font: 700 1.5rem var(--serif); color: var(--navy); }
.v-values small { display: block; color: var(--gold); font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; }
.v-values p { font-size: .88rem; color: var(--ink-2); margin: 0; }
@media (max-width: 760px) { .v-pair { grid-template-columns: 1fr; } .v-values { grid-template-columns: 1fr 1fr; } }

.v-wheel-wrap { display: grid; grid-template-columns: 380px 1fr; gap: 48px; align-items: center; margin-bottom: 40px; }
.v-wheel { width: 100%; max-width: 380px; margin: 0 auto; }
.v-hex { fill: #f4efe5; stroke: var(--line); stroke-width: 2; }
.v-spoke { stroke: #d9cfbd; stroke-width: 1.5; stroke-dasharray: 3 4; }
.v-core { fill: var(--navy); }
.v-core-t { fill: #fff; font: 700 18px var(--serif); text-anchor: middle; }
.v-core-s { fill: var(--gold); font: 600 8px var(--sans); letter-spacing: .15em; text-anchor: middle; }
.v-node { fill: var(--c); stroke: #fff; stroke-width: 3; transition: r .2s; }
.v-wheel a:hover .v-node, .v-wheel a:focus .v-node { r: 34; }
.v-node-t { fill: #fff; font: 700 14px var(--sans); text-anchor: middle; pointer-events: none; }
.v-area { border-bottom: 4px solid var(--c); scroll-margin-top: 90px; }
.v-area .card-img { position: relative; aspect-ratio: 4 / 3; }
.v-area .card-img img { width: 100%; height: 100%; object-fit: cover; }
.v-area .card-img figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 14px 8px; font-size: .74rem; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.6)); }
.v-area .card-kicker { color: var(--c); }
.v-area dl { margin: auto 0 0; font-size: .88rem; border-top: 1px dashed var(--line); padding-top: 12px; }
.v-area dt { font-weight: 700; color: var(--ink); }
.v-area dd { margin: 0 0 8px; color: var(--ink-2); }
@media (max-width: 900px) { .v-wheel-wrap { grid-template-columns: 1fr; gap: 24px; } }

.v-legacy .card-body > p { margin-bottom: 18px; }
.v-goals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
.v-goals > div { background: #f6f2ea; border-radius: 10px; padding: 12px 14px; }
.v-goals b { display: block; font: 700 1.5rem var(--serif); color: var(--navy); }
.v-goals span { font-size: .82rem; color: var(--ink-2); }
.v-table { width: 100%; border-collapse: collapse; font-size: .92rem; }
.v-table th { text-align: left; padding: 10px 12px; background: var(--navy); color: #fff; font-weight: 600; }
.v-table th:last-child { background: var(--gold); }
.v-table td { padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; color: var(--ink-2); width: 40%; }
.v-table td:last-child { width: 60%; color: var(--ink); font-weight: 500; }

.v-layers { display: flex; flex-direction: column; gap: 14px; }
.v-layer { display: grid; grid-template-columns: 110px 1fr; gap: 20px; align-items: center; background: var(--paper); border-radius: var(--radius); padding: 18px 24px; box-shadow: var(--shadow);
  background-image: linear-gradient(90deg, rgba(176,141,87,.14) calc(var(--w) * 1%), transparent 0); }
.v-layer b { font: 700 2.2rem var(--serif); color: var(--navy); }
.v-layer h3 { margin-bottom: 4px; }
.v-layer p { margin: 0; color: var(--ink-2); font-size: .95rem; }
@media (max-width: 620px) { .v-layer { grid-template-columns: 1fr; gap: 4px; } }

.v-road { list-style: none; margin: 0; padding: 0; position: relative; }
.v-road::before { content: ""; position: absolute; left: 118px; top: 8px; bottom: 8px; width: 2px; background: var(--line); }
.v-road li { display: grid; grid-template-columns: 100px 1fr; gap: 44px; padding: 0 0 36px; position: relative; }
.v-road li::before { content: ""; position: absolute; left: 112px; top: 8px; width: 14px; height: 14px; border-radius: 50%; background: var(--paper); border: 3px solid var(--gold); }
.v-road li.now::before { background: var(--gold); }
.v-road-age { font: 700 1.2rem var(--serif); color: var(--navy); text-align: right; }
.v-road-age small { display: block; font: 500 .8rem var(--sans); color: var(--muted); }
.v-road p { color: var(--ink-2); }
.v-steps { display: flex; flex-wrap: wrap; gap: 8px; }
.v-steps span { font-size: .82rem; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; color: var(--muted); }
.v-steps b { color: var(--navy); margin-right: 6px; }
@media (max-width: 620px) { .v-road::before { left: 7px; } .v-road li { grid-template-columns: 1fr; gap: 6px; padding-left: 32px; } .v-road li::before { left: 1px; } .v-road-age { text-align: left; } }
.v-qs { margin: 0; padding-left: 1.2em; color: var(--ink-2); }
.v-qs li { margin-bottom: 8px; }
"""
css = R("assets/site/site.css")
css = re.sub(r"\n/\* ── 비전룸 · 세 번째 30년.*", "", css, flags=re.S)
W("assets/site/site.css", css.rstrip() + "\n" + CSS)
print("비전룸을 세 번째 30년으로 다시 지었습니다")
