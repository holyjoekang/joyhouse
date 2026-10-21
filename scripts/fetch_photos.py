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
    # 신앙(faith.html · faith-post.html · 3D 신앙 방) — 퍼블릭 도메인 명화·Unsplash
    ("faith-notes-moses", "openverse", "8f45b669-ea6b-4cf1-8e99-b19c14b59ce1", "신앙 · 지킬 수 없을 때, 맡기는 믿음", 1400),
    ("faith-notes-jeremiah", "openverse", "3c7e4304-9c00-4bc1-b242-da56263a54e9", "신앙 · 갇힌 자리에서, 부르짖으라", 1400),
    ("faith-notes-yes", "unsplash", "1470252649378-9c29740c9fa8", "신앙 · '예'만 되시는 하나님", 1400),
    ("faith-notes-psalm", "openverse", "3cebde40-5776-45ad-bc11-525775679c56", "신앙 · 기가 막힐 웅덩이에서 건지시는 분", 1400),
    ("faith-bible-faithful", "unsplash", "1504052434569-70ad5836ab65", "신앙 · '미쁘다'는 무슨 뜻일까", 1400),
    ("faith-bible-hardened", "unsplash", "1509316785289-025f5b846b35", "신앙 · '강퍅하다' — 굳어 버린 마음", 1400),
    ("faith-bible-hypocrite", "unsplash", "1437603568260-1950d3ca6eab", "신앙 · '외식하는 자'는 밖에서 밥 먹는 사람이 아니다", 1400),
    ("faith-bible-compassion", "unsplash", "1555252333-9f8e92e65df9", "신앙 · '긍휼' — 어머니의 태에서 나온 말", 1400),
    ("faith-work-avodah", "unsplash", "1500382017468-9049fed747ef", "신앙 · 아보다 — 일과 예배는 한 단어였다", 1400),
    ("faith-work-monday", "unsplash", "1517817748493-49ec54a32465", "신앙 · 한 치도 예외 없는 — 월요일의 신앙", 1400),
    ("faith-work-cobbler", "unsplash", "1449505278894-297fdb3edbc1", "신앙 · 루터의 구두 수선공 — 소명과 그 함정", 1400),
    ("faith-work-ai", "unsplash", "1544027993-37dbfe43562a", "신앙 · AI가 대신할 수 없는 일터의 영성", 1400),
    # 신앙 · 쉽게 읽는 성경 확장 — Openverse 상업 이용 가능 사진
    ("faith-bible-counselor", "openverse", "9c0808a1-bb72-40cd-b247-49e73d897a74", "신앙 · '기묘자라, 모사라' — 이상한 사람도, 꾀쟁이도 아니다", 1400),
    ("faith-bible-psalm23", "openverse", "6c53c772-f262-4370-8360-a029b7771a90", "신앙 · 시편 23편의 옛말 — 초장, 음침한, 안위", 1400),
    ("faith-bible-eagle", "openverse", "41d0b89b-27d7-4eba-b193-d397927d3328", "신앙 · '앙망'과 '곤비' — 독수리처럼 다시 날아오르는 힘", 1400),
    ("faith-bible-ransom", "openverse", "ce7e8dd6-89c8-44ca-a893-d8cefb535e45", "신앙 · '대속물'과 '화목제물' — 몸값을 치르고, 관계를 되찾다", 1400),
    ("faith-bible-justified", "openverse", "3c0c07a9-5625-4838-8453-6c9304523969", "신앙 · '정죄', '의인', '이르지 못하더니' — 법정의 언어", 1400),
    ("faith-bible-grammar", "openverse", "d3e7c806-d05f-49de-b2cf-47ba646a1b84", "신앙 · '가라사대', '말미암아', '~지어다' — 성경의 옛 문법", 1400),
    ("faith-bible-homonym", "openverse", "2903b886-b0c7-43d3-9544-978cf73520d5", "신앙 · '장사', '부인', '제비' — 소리는 같고 뜻은 다른 말", 1400),
    ("faith-bible-proverbs", "openverse", "42cc39bb-50bc-4886-af68-02b08088a00b", "신앙 · '명철', '범사', '지도하시리라' — 잠언의 한자어", 1400),
    ("faith-bible-paraclete", "openverse", "b4d8f1cb-058f-46cb-90d2-215fbad32b50", "신앙 · '보혜사', '독생자', '피조물' — 대신할 수 없는 신앙의 단어", 1400),
    ("faith-bible-pedagogue", "openverse", "a22002f4-b51c-4a4b-8d92-c7f8b0094832", "신앙 · '몽학선생'과 '초등학문' — 율법은 초등학교 선생님?", 1400),
    ("faith-bible-servant", "openverse", "358d9bd9-4e31-4834-a858-e5ae8b857200", "신앙 · '간고'와 '질고' — 슬픔과 아픔을 아는 메시아", 1400),
    ("faith-bible-fruit", "openverse", "3f394ba0-d5eb-44ea-bb21-39842a2c3ad1", "신앙 · '희락', '양선', '온유' — 성령의 열매를 오늘 말로", 1400),
    ("faith-bible-hesed", "openverse", "b65394af-5e5a-4006-88cc-1b274cbdf572", "신앙 · '인자'와 '진멸' — 아침마다 새로운 헤세드", 1400),
    ("faith-bible-substance", "openverse", "5edcafe3-d09d-4be5-bab6-dda2beea00af", "신앙 · '실상', '증거', '확증' — 믿음은 막연한 기대가 아니다", 1400),
    ("faith-bible-refuge", "openverse", "a969159c-eda4-45ca-a303-328c46d22bcf", "신앙 · '환난', '피난처', '담대' — 좁은 곳에서 넓은 곳으로", 1400),
    ("faith-bible-psalm1", "openverse", "8addc90b-86bc-4370-9ae2-383374ea0646", "신앙 · '꾀', '주야', '묵상' — 시편 1편, 복 있는 사람의 하루", 1400),
    ("faith-bible-power", "openverse", "5f813109-2bb8-4a0e-8f32-52b5c95adcbf", "신앙 · '권세', '권능', '증인' — 자격과 힘과 삶", 1400),
    ("faith-bible-pray-always", "openverse", "0a6e46e3-c14c-4bd9-bc8b-f33c817fbd5c", "신앙 · '간구', '쉬지 말고', '범사에' — 기도의 세 가지 결", 1400),
    ("faith-bible-immanuel", "openverse", "f0d948a6-71b7-4bad-89e1-c0639f3ce595", "신앙 · '임마누엘'과 70인역 — 히브리어에서 헬라어로 건너간 구약", 1400),
    ("faith-bible-shema", "openverse", "61843866-c249-451d-8f2d-054029c16fcf", "신앙 · '쉐마'와 '귀 있는 자는 들을지어다' — 듣는 것이 곧 행하는 것", 1400),
    ("faith-bible-job-friend", "openverse", "8d1fe1a8-63db-4f99-b463-e52cfe4defd1", "신앙 · '네 시작은 미약하였으나' — 욥의 친구가 한 말", 1400),
    ("faith-bible-two-or-three", "openverse", "766d6f61-7310-423d-b142-dfe2c6e32e9b", "신앙 · '두세 사람이 모인 곳'과 '비판하지 말라'", 1400),
    ("faith-bible-laodicea", "openverse", "2d15006f-1212-4b09-bdb4-4d6c80f0d754", "신앙 · '문 밖에 서서 두드리노니'와 '미지근하다' — 라오디게아 교회", 1400),
    ("faith-bible-numbers", "openverse", "0fffbdeb-d798-49e1-9e4c-e72b092ff071", "신앙 · 666과 144,000 — 요한계시록의 숫자 읽기", 1400),
    ("faith-bible-money", "openverse", "692ef875-88ed-46c3-9652-dc635751b516", "신앙 · '돈은 일만 악의 뿌리'?와 과부의 두 렙돈", 1400),
    ("faith-bible-hard-ot", "openverse", "193f90be-60cc-467b-a110-1056b6ed901d", "신앙 · 120년, 계명성, 바위에 메어치는 자 — 구약의 어려운 구절 셋", 1400),
    ("faith-bible-daily-bread", "openverse", "7e7329f1-a59c-4b8a-a5e4-e5d6d607affa", "신앙 · '중언부언', '일용할 양식', '새벽에 도우시리로다'", 1400),
    ("faith-bible-take-off-shoes", "openverse", "0b84400d-bd88-4936-b81d-df015237bdc3", "신앙 · '신을 벗으라', '판벽한 집', '죽도록 충성하라'", 1400),
    ("faith-bible-eye-for-eye", "openverse", "d216d166-161a-4b23-a4db-c950b9dddb18", "신앙 · '눈에는 눈'은 복수법이 아니었다", 1400),
    ("faith-bible-yoke", "openverse", "d0b7b99c-e28b-4309-a05e-c225f9b45a4b", "신앙 · 쉬운 멍에와 바람에 나는 겨 — 들판의 언어", 1400),
    ("faith-bible-salt", "openverse", "f0a2df8e-4a24-4715-9ee7-71895302cd70", "신앙 · 맷돌, 소금, 가죽 부대 — 부엌에서 나온 비유", 1400),
    ("faith-bible-camel", "openverse", "8a023f90-3b56-4977-bb28-8c9abe7a7eb2", "신앙 · 낙타가 바늘귀로 — 유대식 과장법", 1400),
    ("faith-bible-names", "openverse", "f1230075-5ab6-45c3-a027-87bf0874a714", "신앙 · 겟세마네, 가버나움, 마라 — 이름에 담긴 이야기", 1400),
    ("faith-bible-watchful", "openverse", "4752f9bb-1c01-4e23-b1d9-c884f48e0191", "신앙 · '권고', '근신', '분부' — 돌보심과 깨어 있음", 1400),
    ("faith-bible-can-do-all", "openverse", "71d2445f-ccb4-4ae8-9478-ed0de7b611d7", "신앙 · 빌립보서 4:13과 예레미야 29:11 — 축복 구절의 원래 자리", 1400),
    ("faith-bible-temple-body", "openverse", "fcc05cbf-93a9-4185-8d61-b351587db365", "신앙 · '너희가 하나님의 성전'과 '감당치 못할 시험'", 1400),
    ("faith-bible-in-my-name", "openverse", "6d27382c-501d-44ef-b3de-f6516af602e6", "신앙 · '내 이름으로 구하라'와 '내 이름으로 일컫는 내 백성'", 1400),
    # 신앙 · 성경 이야기 — 메트로폴리탄 미술관 퍼블릭 도메인(CC0) 소장품
    ("faith-story-creation", "met", "458971", "신앙 · 천지창조 — 혼돈에서 질서로, 그리고 안식", 1400),
    ("faith-story-fall", "met", "428305", "신앙 · 에덴과 타락 — '네가 어디 있느냐'", 1400),
    ("faith-story-noah", "met", "335674", "신앙 · 노아의 방주 — 심판의 물결 위에 뜬 은혜", 1400),
    ("faith-story-abraham", "met", "436911", "신앙 · 아브라함의 부르심 — 별을 세어 보라", 1400),
    ("faith-story-joseph", "met", "341466", "신앙 · 요셉의 채색옷 — 악을 선으로 바꾸시는 하나님", 1400),
    ("faith-story-jacob", "met", "371674", "신앙 · 야곱의 하나님 — 할아버지의 하나님, 아버지의 하나님, 그리고 나의 하나님", 1400),
    ("faith-story-burning-bush", "met", "436205", "신앙 · 모세와 불타는 떨기나무 — 여든 살에 받은 부르심", 1400),
    ("faith-story-red-sea", "met", "359558", "신앙 · 홍해를 건너다 — 앞은 바다, 뒤는 군대", 1400),
    ("faith-story-sinai", "met", "436913", "신앙 · 시내산의 십계명 — 자유를 지키는 울타리", 1400),
    ("faith-story-david", "met", "436912", "신앙 · 다윗과 골리앗 — 전쟁은 여호와께 속한 것", 1400),
    ("faith-story-daniel", "met", "891635", "신앙 · 다니엘과 사자 굴 — 창문을 열고 하루 세 번", 1400),
    ("faith-story-nativity", "met", "437231", "신앙 · 구유에 누인 아기 — 가장 낮은 곳으로 오신 왕", 1400),
    ("faith-story-baptism", "met", "440393", "신앙 · 요단강의 세례와 광야의 시험", 1400),
    ("faith-story-beatitudes", "met", "209287", "신앙 · 산상수훈과 팔복 — 뒤집힌 행복의 목록", 1400),
    ("faith-story-samaritan", "met", "436115", "신앙 · 선한 사마리아인 — '누가 나의 이웃입니까'", 1400),
    ("faith-story-loaves", "met", "437821", "신앙 · 오병이어 — 한 아이의 도시락으로 시작된 기적", 1400),
    ("faith-story-prodigal", "met", "340664", "신앙 · 탕자의 비유 — 멀리서 달려오는 아버지", 1400),
    ("faith-story-zacchaeus", "met", "471107", "신앙 · 삭개오 — 뽕나무 위의 세리장을 부르신 이름", 1400),
    ("faith-story-last-supper", "met", "459131", "신앙 · 최후의 만찬 — 떡과 잔, 그리고 대야와 수건", 1400),
    ("faith-story-cross", "met", "910391", "신앙 · 십자가 — '다 이루었다'", 1400),
    ("faith-story-resurrection", "met", "468590", "신앙 · 빈 무덤 — 죽음 너머의 아침", 1400),
    ("faith-story-jonah-1", "met", "349348", "신앙 · 요나 1장 — 다시스로 가는 배", 1400),
    ("faith-story-jonah-2", "met", "912949", "신앙 · 요나 2장 — 물고기 뱃속의 기도", 1400),
    ("faith-story-jonah-3", "met", "322620", "신앙 · 요나 3장 — 니느웨가 베옷을 입다", 1400),
    ("faith-story-jonah-4", "met", "453683", "신앙 · 요나 4장 — 박넝쿨과 하나님의 질문", 1400),
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
    if src == "met":   # 메트로폴리탄 미술관 Open Access(CC0) 소장품
        obj = json.loads(get(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{pid}"))
        return (obj["primaryImage"] or obj["primaryImageSmall"],
                {"title": obj["title"], "creator": obj.get("artistDisplayName") or "The Metropolitan Museum of Art",
                 "license": "CC0 1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                 "page": obj.get("objectURL")})
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
