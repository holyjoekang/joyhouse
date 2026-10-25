"""아이디어 랩에 '부여 스마트팜 토마토 업사이클 가공'을 심다 파트너스 다음(2번)에 넣고,
번호·3D 방 카드·'아이디어 31' 문구를 다시 맞춘다. 여러 번 돌려도 같은 결과."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"

IDEA = {
    "id": "buyeo-tomato-upcycle", "theme": "E",
    "title": "부여 스마트팜 토마토 업사이클 가공", "en": "Buyeo Smart-farm Tomato Upcycling",
    "one": "규격외과와 작기 종료 미숙과를 원료로, 국내에 공급자가 거의 없는 유럽·미국형 프리미엄 토마토 가공식품을 만드는 사업입니다.",
    "stage": "검증 중 (사업계획 확정·지원 신청)",
    "capital": "1년차 8,500만 원 / 2년차 설비 4.5억 원",
    "goal": "3년 차 매출 약 11억 원, 영업이익 흑자",
    "tags": ["스마트팜", "업사이클", "수입 대체", "6차산업"],
    "problem": [
        "매출이 연간계약 단가와 경락가에 묶여 있어 가격 결정권이 없다.",
        "소비자가와 농가 수취가의 차이를 중간 유통이 가져간다.",
        "규격외과(연 약 144톤)가 상시 발생하고, 7월 철거 때는 미숙과(약 25톤)를 전량 폐기한다.",
    ],
    "solution": [
        "규격외과로 세미드라이 토마토 오일절임을 만든다. 상온 유통이 가능하고 kg당 28,000원에 판다.",
        "폐기하던 미숙과로 그린토마토 피클·처트니를 만든다.",
        "셰프·바 채널에는 클리어 토마토 워터를 공급해 브랜드를 알린다.",
        "주스·케첩처럼 고형분 원가로 경쟁하는 품목은 처음부터 하지 않는다.",
    ],
    "customers": [
        "1차: 이탈리안·비스트로·베이커리, 수입식자재 유통사 (B2B)",
        "2차: 호텔 F&B, 칵테일 바, 파인다이닝, 온라인 소비자",
        "3차: 대형 유통 프리미엄 코너, 수출",
    ],
    "canvas": {
        "part": "충남 농산물종합가공센터, 식품안전 컨설팅, 정책자금 기관",
        "act": "반건조·절임 가공, B2B 영업",
        "value": "국산 신선 원물로 만든 프리미엄 수입 대체품",
        "rel": "샘플 제공 후 재구매",
        "seg": "외식·베이커리, 식자재 유통, 바·호텔",
        "res": "2ha 스마트팜 원물(연중 10개월 수확), 기존 인력 12명",
        "chan": "B2B 직거래, 자사몰, 대형 유통",
        "cost": "노무비 22%, 부재료, 용기, 감가상각",
        "rev": "제품 판매 (B2B·B2C·수출)",
    },
    "money": {
        "rows": [
            ["1년차", "매출 3억 1,900만 원 · 영업이익 △2,100만 원"],
            ["2년차", "매출 5억 7,400만 원 · 영업이익 △1,700만 원"],
            ["3년차", "매출 10억 9,800만 원 · 영업이익 +7,800만 원 (7.1%)"],
        ],
        "note": "1~2년차 적자는 계획된 것이며 누적 3,800만 원 수준입니다. 사업계획서(2026년 9월)를 옮겨 정리했고, 금액은 업계 통용 계수를 적용한 추정치로 원물 실측과 시범 생산 결과에 따라 확정됩니다.",
    },
    "market": {
        "alt": [
            ["수입 완제품", "신선도와 잔여 유통기한이 불리하고 국산 표기를 할 수 없다"],
            ["국내 가공업체", "원물을 시장가로 사야 해서 원가가 맞지 않는다"],
            ["타 농가 6차산업", "물량이 작아 연중 공급을 이어가기 어렵다"],
        ],
        "edge": "가공 창업이 가장 많이 실패하는 지점은 원물 확보입니다. 이 사업은 원물을 이미 확보한 상태에서 출발하므로, 후발 주자가 자본만으로는 따라오기 어렵습니다.",
    },
    "roadmap": [
        ["0~12개월 (2027)", "임대가공으로 시제품을 만들고 인허가를 받는다. B2B 바이어 3~5곳에 샘플을 보내고 초도 납품을 시작한다."],
        ["12~24개월 (2028)", "농장 안에 가공동을 짓고 반자동 라인을 들인다. HACCP를 준비하고 매출 5억 원을 달성한다."],
        ["24~36개월 (2029)", "파생 라인을 출시하고 대형 유통에 입점하며 수출을 시범 운영한다. 영업이익 흑자로 전환한다."],
        ["설비 투자 판단 기준", "2027년 4분기에 재구매율이 40% 미만이거나 납품처가 3곳 미만이면 설비 투자를 보류한다."],
    ],
    "risks": [
        ["노동 집약성 (주스 사업 실패 원인)", "1년차는 외주로 운영하고, 반자동 라인이 없으면 투자하지 않는다. 노무비가 매출의 25%를 넘으면 품목을 재검토한다"],
        ["오일절임 식품 안전", "pH·수분활성도 시험성적을 확보한 뒤 출시한다"],
        ["판로 미확보", "샘플로 먼저 검증하고, 수주가 들어온 만큼만 생산한다"],
        ["본업 간섭", "가공 원물을 총 수확량의 22% 이내로 제한한다"],
        ["부재료 가격 변동", "연간 구매 계약을 맺고 대체 오일 배합을 검토한다"],
    ],
    "why": "2ha 스마트팜에서 원물을 직접 생산하고 있고, 초창기 주스 가공에 실패해 본 경험이 있습니다. 그 실패에서 \"고형분으로 경쟁하는 품목은 하지 않는다\"는 원칙을 얻었고, 이 사업의 출발점이 되었습니다.",
    "img": {"hero": "ideas-buyeo-tomato-upcycle", "body": "ideas-buyeo-tomato-upcycle-2"},
    "details": [
        {"title": "제품 구성", "head": ["품목", "원물", "수율", "단가", "역할"], "rows": [
            ["세미드라이 오일절임", "규격외과", "7kg → 1kg", "B2B 28,000원/kg, B2C 9,900원/병", "매출·이익 주력"],
            ["그린토마토 피클·처트니", "미숙과", "1kg → 2.2병", "도매 4,800원, 소비자가 8,900원", "원가 우위, 정책 서사"],
            ["클리어 토마토 워터", "규격외과", "1kg → 0.45L", "16,000원/L", "브랜드 인지"],
            ["파생 스프레드·수출", "—", "—", "—", "3년 차 도입"],
        ]},
        {"title": "연간 생산 캘린더", "head": ["시기", "생산"], "rows": [
            ["9~6월", "세미드라이 상시 생산"],
            ["7~8월", "그린토마토 배치 생산 (작기 종료 미숙과)"],
            ["연중", "토마토 워터는 주문이 들어올 때 생산"],
        ]},
        {"title": "원물 투입 계획", "head": ["구분", "1년차", "2년차", "3년차"], "rows": [
            ["가공 투입량", "55톤", "107톤", "175톤"],
            ["규격외과 활용률", "28%", "59%", "100%"],
        ]},
    ],
}

PHOTOS = [
    '    ("ideas-buyeo-tomato-upcycle", "openverse", "c0ae6272-dfa9-492f-9b67-382d7a24d175", "Tomato Greenhouse", 1400),\n',
    '    ("ideas-buyeo-tomato-upcycle-2", "openverse", "a9ae8d37-3393-4206-af7f-32f158c622c0", "아이디어 랩 · 부여 스마트팜 토마토 업사이클 가공", 1000),\n',
]


def rw(path, fn):
    t = path.read_text("utf-8")
    n = fn(t)
    if n != t:
        path.write_text(n, "utf-8")


# 1) 대장: 심다 파트너스 다음에 넣고 번호를 다시 매긴다
p = C / "ideas.json"
d = json.loads(p.read_text("utf-8"))
ideas = [i for i in d["ideas"] if i["id"] != IDEA["id"]]
at = next(k for k, i in enumerate(ideas) if i["id"] == "simda-partners") + 1
ideas.insert(at, {"id": IDEA["id"], "no": 0, **{k: v for k, v in IDEA.items() if k != "id"}})
for n, i in enumerate(ideas, 1):
    i["no"] = n
d["ideas"] = ideas
p.write_text(json.dumps(d, ensure_ascii=False, indent=1), "utf-8")
N = len(ideas)

# 2) 3D 방 카드: 남10·북9·동7·서6(문 자리 비움) 순서로 다시 건다
slots = ([("south", round((k + .5) / 10, 3)) for k in range(10)]
         + [("north", round((k + .5) / 9, 3)) for k in range(9)]
         + [("east", round((k + .5) / 7, 3)) for k in range(7)]
         + [("west", t) for t in (0.08, 0.21, 0.34, 0.66, 0.79, 0.92)])
assert N <= len(slots), "방 벽 자리가 모자란다"
rp = C / "rooms" / "ideas.json"
room = json.loads(rp.read_text("utf-8"))
room["title"] = f"아이디어 랩 — 창업 아이디어 {N}"
room["items"] = [i for i in room["items"] if i.get("type") != "ideaCard"] + [{
    "type": "ideaCard", "wall": w, "t": t, "y": 1.75, "w": 1.2,
    "kicker": f"{i['no']:02d} · {d['themes'][i['theme']]['name']}", "title": i["title"],
    "text": f"{i['stage']} · 초기자본 {i['capital']}", "note": i["one"],
    "img": f"assets/photos/{i['img']['body']}.webp", "url": f"idea.html?id={i['id']}",
    "accent": d["themes"][i["theme"]]["color"],
} for i, (w, t) in zip(ideas, slots)]
rp.write_text(json.dumps(room, ensure_ascii=False, indent=1), "utf-8")

# 3) 'n개' 문구
KO = {31: "서른한", 32: "서른두", 33: "서른세", 34: "서른네", 35: "서른다섯"}
EN = {31: "Thirty-one", 32: "Thirty-two", 33: "Thirty-three", 34: "Thirty-four", 35: "Thirty-five"}
def count(t):
    t = re.sub(r"창업 아이디어 \d+", f"창업 아이디어 {N}", t)
    t = re.sub(r"아이디어 \d+개", f"아이디어 {N}개", t)
    t = re.sub(r"가운데 \d+개를", f"가운데 {N}개를", t)
    t = re.sub(r"Thirty-\w+ Ideas", f"{EN.get(N, N)} Ideas", t)
    return re.sub(r"서른(?:한|두|세|네|다섯)(?= 개의)", KO.get(N, str(N)), t)
for f in ["ideas.html", "index.html", "README.md", "assets/site/site.js", "content/house.json", "content/pages.json"]:
    rw(ROOT / f, count)

# 4) 사진 목록
def photos(t):
    if PHOTOS[0] in t:
        return t
    anchor = next(l for l in t.splitlines(True) if l.startswith('    ("ideas-jeju-blueberry-ai-2"'))
    return t.replace(anchor, anchor + "".join(PHOTOS))
rw(ROOT / "scripts/fetch_photos.py", photos)
print(f"ideas: {N}, inserted at no.{at + 1}")
