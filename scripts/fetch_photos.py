"""2D 사이트에 쓰는 자유 이용 사진을 assets/photos/ 에 받는다.

- Unsplash: Unsplash License(상업적 이용 가능, 출처 표기 의무 없음). 그래도 크레딧 쪽에 적는다.
- Openverse(Flickr): CC BY. 작가·라이선스를 assets/photos/credits.json 에 남기고 credits.html 이 보여 준다.

  python scripts/fetch_photos.py          # 없는 것만 받는다
  python scripts/fetch_photos.py --force  # 모두 다시 받는다
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "photos"
UA = "JoyhouseSiteBuilder/1.0 (https://github.com/holyjoekang/joyhouse)"

# (파일 이름, 출처, id, 설명, 긴 변 px)
PHOTOS = [
    ("hero-palace", "openverse", "dd356062-e32c-4930-827e-a51a0b8c121f", "경복궁", 2000),
    ("hanok-bukchon", "openverse", "184e6eee-2aaf-4649-9ad8-7b87e791a36e", "북촌 한옥마을", 1400),
    ("hanok-jeonju", "openverse", "6b70918b-2d61-48b7-883a-01aa6331f356", "전주 한옥마을", 1400),
    ("garden-pond", "openverse", "78dfcd8a-e281-4718-ade8-83b8649e8829", "창덕궁 부용지와 주합루", 1600),
    ("palace-roofs", "openverse", "fb970393-b42a-4d7b-b18a-eb888a6e7d9a", "경복궁 지붕", 1400),
    ("chongqing-night", "openverse", "13ce8d54-5356-4ee4-8620-add971419435", "충칭의 밤", 1400),
    ("chengdu-panda", "openverse", "ad52da8a-afff-41ce-9de4-8d9c6c60a4d4", "청두 판다", 1200),
    ("library-hall", "unsplash", "1507842217343-583bb7270b66", "오래된 서가", 1600),
    ("library-round", "unsplash", "1524995997946-a1c2e315a42f", "둥근 서가", 1400),
    ("library-lights", "unsplash", "1481627834876-b7833e8f5570", "전구가 걸린 서가", 1400),
    ("book-open", "unsplash", "1532012197267-da84d127e765", "펼친 책", 1400),
    ("books-row", "unsplash", "1495446815901-a7297e633e8d", "꽂힌 책들", 1200),
    ("glasses-notes", "unsplash", "1517842645767-c639042777db", "안경과 노트", 1200),
    ("pen-writing", "unsplash", "1455390582262-044cdead277a", "만년필로 쓰는 글", 1400),
    ("desk-notebook", "unsplash", "1501504905252-473c47e087f8", "노트북과 수첩", 1400),
    ("travel-map", "unsplash", "1488646953014-85cb44e25828", "지도와 카메라", 1600),
    ("road-trip", "unsplash", "1469854523086-cc02fe5d8800", "길 위의 여행", 1400),
    ("lake-dock", "unsplash", "1508672019048-805c876b67e2", "호숫가 선착장", 1400),
    ("great-wall", "unsplash", "1508804185872-d7badad00f7d", "만리장성", 1600),
    ("forbidden-city", "unsplash", "1547981609-4b6bfe67ca0b", "자금성", 1600),
    ("shanghai", "unsplash", "1474181487882-5abf3f0ba6c2", "상하이 와이탄", 1400),
    ("seoul-street", "unsplash", "1538485399081-7191377e8241", "서울의 밤거리", 1200),
    ("fuji-pagoda", "unsplash", "1526481280693-3bfa7568e0f3", "후지산과 탑", 1200),
    ("tour-bus", "unsplash", "1544620347-c4fd4a3d5957", "산길의 버스", 1400),
    ("group-friends", "unsplash", "1529156069898-49953e39b3ac", "어깨동무한 일행", 1400),
    ("team-work", "unsplash", "1552664730-d307ca884978", "팀 회의", 1400),
    ("startup-talk", "unsplash", "1556761175-5973dc0f32e7", "발표하는 창업가", 1400),
    ("coworking", "unsplash", "1519389950473-47ba0277781c", "함께 일하는 책상", 1400),
    ("laptop-typing", "unsplash", "1486312338219-ce68d2c6f44d", "노트북 작업", 1200),
    ("laptop-dark", "unsplash", "1531297484001-80022131f5a1", "어둠 속의 노트북", 1400),
    ("ai-render", "unsplash", "1677442136019-21780ecad995", "AI", 1400),
    ("family-sunset", "unsplash", "1511895426328-dc8714191300", "노을 속 가족", 1600),
    ("worship", "unsplash", "1438232992991-995b7058bbb3", "예배", 1400),
    ("mountain-sea", "unsplash", "1506905925346-21bda4d32df4", "운해", 1600),
    ("starry-mountain", "unsplash", "1519681393784-d120267933ba", "별이 뜬 산", 1600),
    # 아이디어 랩(ideas.html · idea.html · 3D 아이디어 랩) — Openverse 상업 이용 가능 사진
    ("ideas-daon-pathfinder", "unsplash", "1576765608535-5f04d1e3f289", "아이디어 랩 · 다온 라이프 패스파인더", 1400),
    ("ideas-daon-pathfinder-2", "openverse", "64ed3362-528c-4751-8937-68e37b423eed", "Senior couple walks hand in hand down a tiled sidewalk, with", 1000),
    ("ideas-senior-college", "unsplash", "1509062522246-3755977927d7", "아이디어 랩 · 다온 시니어 칼리지", 1400),
    ("ideas-senior-college-2", "unsplash", "1524178232363-1fb2b075b655", "아이디어 랩 · 다온 시니어 칼리지", 1000),
    ("ideas-second-stage-academy", "unsplash", "1541339907198-e08756dedf3f", "아이디어 랩 · 세컨드스테이지 아카데미", 1400),
    ("ideas-second-stage-academy-2", "unsplash", "1516307365426-bea591f05011", "아이디어 랩 · 세컨드스테이지 아카데미", 1000),
    ("ideas-retirement-gpt", "unsplash", "1516321318423-f06f85e504b3", "아이디어 랩 · Retirement Path Finder GPT", 1400),
    ("ideas-retirement-gpt-2", "unsplash", "1581579438747-1dc8d17bbce4", "아이디어 랩 · Retirement Path Finder GPT", 1000),
    ("ideas-senior-youtube-studio", "unsplash", "1485846234645-a62644f84728", "아이디어 랩 · 시니어 AI 유튜브 자동화 스튜디오", 1400),
    ("ideas-senior-youtube-studio-2", "unsplash", "1478737270239-2f02b77fc618", "아이디어 랩 · 시니어 AI 유튜브 자동화 스튜디오", 1000),
    ("ideas-under65-outsourcing", "unsplash", "1434030216411-0b793f4b4173", "아이디어 랩 · 언더65 사무 아웃소싱 플랫폼", 1400),
    ("ideas-under65-outsourcing-2", "unsplash", "1508780709619-79562169bc64", "아이디어 랩 · 언더65 사무 아웃소싱 플랫폼", 1000),
    ("ideas-sports-totalcare", "unsplash", "1476480862126-209bfaa8edc8", "아이디어 랩 · 5060 스포츠 토탈케어", 1400),
    ("ideas-sports-totalcare-2", "unsplash", "1571019613454-1cb2f99b2d8b", "아이디어 랩 · 5060 스포츠 토탈케어", 1000),
    ("ideas-senior-ai-class", "unsplash", "1528605248644-14dd04022da1", "아이디어 랩 · 시니어 AI 교실", 1400),
    ("ideas-senior-ai-class-2", "unsplash", "1454165804606-c3d57bc86b40", "아이디어 랩 · 시니어 AI 교실", 1000),
    ("ideas-true-story-65", "unsplash", "1584515933487-779824d29309", "아이디어 랩 · 실화탐사 65+ 유튜브 채널", 1400),
    ("ideas-true-story-65-2", "unsplash", "1590602847861-f357a9332bbc", "아이디어 랩 · 실화탐사 65+ 유튜브 채널", 1000),
    ("ideas-sea-retirement", "unsplash", "1519046904884-53103b34b206", "아이디어 랩 · 50+ 동남아 은퇴살이 컨설팅", 1400),
    ("ideas-sea-retirement-2", "unsplash", "1507525428034-b723cf961d3e", "아이디어 랩 · 50+ 동남아 은퇴살이 컨설팅", 1000),
    ("ideas-agetech-distribution", "unsplash", "1485827404703-89b55fcc595e", "아이디어 랩 · 한중일 에이지테크 유통·케어 컨설팅", 1400),
    ("ideas-agetech-distribution-2", "unsplash", "1559839734-2b71ea197ec2", "아이디어 랩 · 한중일 에이지테크 유통·케어 컨설팅", 1000),
    ("ideas-senior-china-tour", "unsplash", "1537531383496-f4749b8032cf", "아이디어 랩 · 시니어 중국 체험 여행", 1400),
    ("ideas-senior-china-tour-2", "unsplash", "1528360983277-13d401cdc186", "아이디어 랩 · 시니어 중국 체험 여행", 1000),
    ("ideas-china-edu-consulting", "unsplash", "1547981609-4b6bfe67ca0b", "아이디어 랩 · 프리미엄 중국 여행·교육 컨설팅", 1400),
    ("ideas-china-edu-consulting-2", "unsplash", "1543269865-cbf427effbad", "아이디어 랩 · 프리미엄 중국 여행·교육 컨설팅", 1000),
    ("ideas-k-stay-luggage", "unsplash", "1436491865332-7a61a109cc05", "아이디어 랩 · K-스테이 수하물 플랫폼", 1400),
    ("ideas-k-stay-luggage-2", "unsplash", "1538485399081-7191377e8241", "아이디어 랩 · K-스테이 수하물 플랫폼", 1000),
    ("ideas-ai-travel-platform", "unsplash", "1569336415962-a4bd9f69cd83", "아이디어 랩 · AI 글로벌 여행 플랫폼", 1400),
    ("ideas-ai-travel-platform-2", "unsplash", "1488085061387-422e29b40080", "아이디어 랩 · AI 글로벌 여행 플랫폼", 1000),
    ("ideas-kc-investment-link", "unsplash", "1540575467063-178a50c2df87", "아이디어 랩 · 한중 스타트업 투자 유치 프로그램", 1400),
    ("ideas-kc-investment-link-2", "unsplash", "1600880292089-90a7e086ee0c", "아이디어 랩 · 한중 스타트업 투자 유치 프로그램", 1000),
    ("ideas-central-asia-students", "openverse", "82ab875e-5947-4d44-afc6-199ecf20a72f", "Registan, Samarkand, Uzbekistan", 1400),
    ("ideas-central-asia-students-2", "unsplash", "1522202176988-66273c2fd55f", "아이디어 랩 · 중앙아시아 유학생 한국 연계", 1000),
    ("ideas-china-robot-distribution", "unsplash", "1531746790731-6c087fecd65a", "아이디어 랩 · 중국 서비스로봇 한국 총판", 1400),
    ("ideas-china-robot-distribution-2", "unsplash", "1555255707-c07966088b7b", "아이디어 랩 · 중국 서비스로봇 한국 총판", 1000),
    ("ideas-poizon-export", "unsplash", "1549298916-b41d501d3772", "아이디어 랩 · POIZON 활용 해외 수출", 1400),
    ("ideas-poizon-export-2", "unsplash", "1566576721346-d4a3b4eaeb55", "아이디어 랩 · POIZON 활용 해외 수출", 1000),
    ("ideas-kbucks-smart-retail", "unsplash", "1586528116311-ad8dd3c8310d", "아이디어 랩 · kbucks 스마트 유통", 1400),
    ("ideas-kbucks-smart-retail-2", "unsplash", "1607082348824-0a96f2a4b9da", "아이디어 랩 · kbucks 스마트 유통", 1000),
    ("ideas-china-import-agency", "unsplash", "1578575437130-527eed3abbec", "아이디어 랩 · 중국 구매대행 + 수입 판매", 1400),
    ("ideas-china-import-agency-2", "unsplash", "1556740738-b6a63e27c4df", "아이디어 랩 · 중국 구매대행 + 수입 판매", 1000),
    ("ideas-nextgen-logistics", "unsplash", "1494412574643-ff11b0a5c1c3", "아이디어 랩 · NextGen 크로스보더 물류 컨설팅", 1400),
    ("ideas-nextgen-logistics-2", "unsplash", "1460925895917-afdab827c52f", "아이디어 랩 · NextGen 크로스보더 물류 컨설팅", 1000),
    ("ideas-sme-export-platform", "unsplash", "1472851294608-062f824d29cc", "아이디어 랩 · 중소기업 소비재 수출 플랫폼", 1400),
    ("ideas-sme-export-platform-2", "unsplash", "1497366216548-37526070297c", "아이디어 랩 · 중소기업 소비재 수출 플랫폼", 1000),
    ("ideas-sea-kfashion-commerce", "unsplash", "1596422846543-75c6fc197f07", "아이디어 랩 · 동남아 K-패션 크로스보더 커머스", 1400),
    ("ideas-sea-kfashion-commerce-2", "unsplash", "1441986300917-64674bd600d8", "아이디어 랩 · 동남아 K-패션 크로스보더 커머스", 1000),
    ("ideas-k-mealkit-o4o", "unsplash", "1553163147-622ab57be1c7", "아이디어 랩 · K-밀키트 O4O 플랫폼", 1400),
    ("ideas-k-mealkit-o4o-2", "unsplash", "1590301157890-4810ed352733", "아이디어 랩 · K-밀키트 O4O 플랫폼", 1000),
    ("ideas-unmanned-stores", "unsplash", "1556745757-8d76bdb6984b", "아이디어 랩 · 무인매장 체인", 1400),
    ("ideas-unmanned-stores-2", "unsplash", "1542838132-92c53300491e", "아이디어 랩 · 무인매장 체인", 1000),
    ("ideas-sme-ax-consulting", "unsplash", "1542744173-8e7e53415bb0", "아이디어 랩 · 중소기업 AX 교육·전환 컨설팅", 1400),
    ("ideas-sme-ax-consulting-2", "unsplash", "1600880292203-757bb62b4baf", "아이디어 랩 · 중소기업 AX 교육·전환 컨설팅", 1000),
    ("ideas-genai-bootcamp", "unsplash", "1606857521015-7f9fcf423740", "아이디어 랩 · 생성형 AI 스타트업 8시간 실습 교육", 1400),
    ("ideas-genai-bootcamp-2", "unsplash", "1498050108023-c5249f4df085", "아이디어 랩 · 생성형 AI 스타트업 8시간 실습 교육", 1000),
    ("ideas-ai-job-training-saas", "unsplash", "1505373877841-8d25f7d46678", "아이디어 랩 · AI 맞춤형 직무·직급 교육 SaaS", 1400),
    ("ideas-ai-job-training-saas-2", "unsplash", "1517245386807-bb43f82c33c4", "아이디어 랩 · AI 맞춤형 직무·직급 교육 SaaS", 1000),
    ("ideas-jeju-blueberry-ai", "openverse", "66d2d1d8-2bd2-413b-8a08-06aa08cd29fb", "Blueberries (3084735551)", 1400),
    ("ideas-jeju-blueberry-ai-2", "unsplash", "1500651230702-0e2d8a49d4ad", "아이디어 랩 · AI 블루베리 팜 컨설팅(제주)", 1000),
]


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def source_info(src: str, pid: str) -> tuple[str, dict]:
    if src == "unsplash":
        return (f"https://images.unsplash.com/photo-{pid}?w=2000&q=82&fm=jpg",
                {"creator": "Unsplash", "license": "Unsplash License",
                 "license_url": "https://unsplash.com/license",
                 "page": f"https://images.unsplash.com/photo-{pid}"})
    meta = json.loads(get(f"https://api.openverse.org/v1/images/{pid}/"))
    return meta["url"], {
        "title": meta.get("title"), "creator": meta.get("creator"),
        "creator_url": meta.get("creator_url"),
        "license": f"CC {meta['license'].upper()} {meta.get('license_version', '')}".strip(),
        "license_url": meta.get("license_url"), "page": meta.get("foreign_landing_url"),
    }


def main() -> None:
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    credits_path = OUT / "credits.json"
    credits = json.loads(credits_path.read_text("utf-8")) if credits_path.exists() else {}
    for name, src, pid, alt, size in PHOTOS:
        dest = OUT / f"{name}.webp"
        if dest.exists() and name in credits and not force:
            continue
        url, info = source_info(src, pid)
        im = Image.open(io.BytesIO(get(url))).convert("RGB")
        im.thumbnail((size, size))
        im.save(dest, "WEBP", quality=78, method=6)
        credits[name] = {"file": f"assets/photos/{name}.webp", "alt": alt, "source": src, **info}
        print(f"{dest.name}: {im.size[0]}x{im.size[1]} {dest.stat().st_size // 1024}KB")
    credits = {n: credits[n] for n, *_ in PHOTOS if n in credits}
    credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=1), "utf-8")


if __name__ == "__main__":
    main()
