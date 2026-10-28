"""아이디어 랩에 '이음브릿지 · 다음성장'을 심다 파트너스 다음(2번)에 넣는다.
- 요약: content/ideas.json (번호·3D 방 카드·'아이디어 n개' 문구 재정렬)
- 상세: content/ieum.json + ieum.html(빈 껍데기, simda.html 스타일) + assets/site/ieum.js 가 렌더
여러 번 돌려도 같은 결과."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"
T = lambda title, head, rows, note=None: {"type": "table", "title": title, "head": head, "rows": rows, **({"note": note} if note else {})}
L = lambda items, title=None: {"type": "list", "items": items, **({"title": title} if title else {})}
N_ = lambda text: {"type": "note", "text": text}
P = lambda text: {"type": "p", "text": text}
SRC_MSS = "https://www.mss.go.kr/site/smba/ex/bbs/View.do?bcIdx=1065015&cbIdx=310&parentSeq=1065015"
SRC_KISED = "https://www.kised.or.kr/menu.es?mid=a10203010000"
SRC_LAW = "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=674&popMenu=ov"

# ── 상세 페이지 데이터 (사업계획서 전문) ──────────────────────────────
DOC = {
    "title": "이음브릿지 사업계획서",
    "brand": "🌉 이음브릿지",
    "back": "idea.html?id=ieum-bridge",
    "hero": {
        "eyebrow": "IEUM Bridge · 공동 창업 검토안 · 2027~2031",
        "h1": "경험을 <em>잇고</em>,<br>다음 성장으로.",
        "p": "대기업 출신 전문가들의 기술·경영기획·마케팅·해외사업 경험으로 B2B 기술기업의 고객 확보와 사업화를 지원합니다. 대표 프로그램은 다음성장 · NextGrowth입니다.",
        "tags": ["NextGrowth B2B", "NextGrowth Global", "NextGrowth Clinic", "민간기업 자문", "공동 수행 → 직접 수주"],
        "meta": "2026.10 · 공동 창업 검토안 · 계획 기간 2027~2031년",
    },
    "stats": [
        ["3건", "첫해 유료 프로그램 목표<br>(적격 제안 기회 8건)"],
        ["1.2억", "2027년 매출 계획<br>영업이익 1,200만 원"],
        ["9,600만", "연 손익분기 매출<br>(직접비율 50%·고정비 4,800만)"],
        ["4.5억", "2031년 매출 목표<br>프로그램 10회"],
    ],
    "disclaimer": "본 계획의 사업 일정과 재무 수치는 내부 계획 가정이다. 2027년 실제 공고, 계약 조건, 창업멤버의 참여 시간과 퇴직 시점에 따라 조정한다. 금액은 별도 표시가 없으면 부가세·법인세 차감 전이다.",
    "sections": [
        {"id": "overview", "nav": "개요", "eyebrow": "1 · Overview", "title": "사업 개요와 초기 방향", "blocks": [
            {"type": "h", "text": "1.1 설립 목적"},
            P("이음브릿지는 대기업 출신 전문가들의 기술·경영기획·마케팅·해외사업 경험을 활용해 <b>B2B 기술기업의 고객 확보와 사업화</b>를 지원한다."),
            P("2027년 대표 예정자의 희망퇴직 시점에 맞춰 사업을 시작한다. 초기에는 기존 창업지원 프로그램 운영사와 공동으로 수행하고, 실적과 운영 역량을 확보한 뒤 직접 수주를 확대한다."),
            P("첫해는 대표 1인이 사업을 총괄하고, 다른 창업멤버는 과제별로 참여한다. 네 명 모두의 상근 급여를 지급하는 구조는 첫해 목표로 삼지 않는다."),
            T("1.2 회사와 프로그램 브랜드", ["구분", "명칭", "적용"], [
                ["회사", "<b>이음브릿지 · IEUM Bridge</b>", "계약·사업 운영·전문가 네트워크"],
                ["대표 프로그램", "<b>다음성장 · NextGrowth</b>", "창업기업 성장 지원"],
                ["B2B 프로그램", "<b>NextGrowth B2B</b>", "고객 발굴·영업·사업화"],
                ["해외 프로그램", "<b>NextGrowth Global</b>", "해외시장 검증·진출 준비"],
                ["개별 지원", "<b>NextGrowth Clinic</b>", "진단·멘토링·교육"],
            ], "법인 설립 시 영문 표기는 IEUM Bridge Co., Ltd.를 검토한다. 상호·상표·도메인 사용 가능성은 별도로 확인한다."),
            {"type": "h", "text": "1.3 고객과 수혜기업"},
            L(["서울·경기창조경제혁신센터 등 창업지원기관", "창업패키지 주관기관과 대학 창업지원단",
               "테크노파크 등 지역 기업지원기관", "기존 액셀러레이팅·창업지원 프로그램 운영사",
               "사업화·해외 진출 자문이 필요한 민간기업"], "비용을 지급하는 고객"),
            L(["제조·물류·기업용 IT 분야에서 기술이나 제품을 보유했지만, 목표 고객 설정과 영업 실행에 어려움을 겪는 초기·도약기 기업"], "주요 수혜기업"),
            N_("창업기업에 지급되는 정부지원금 전체를 회사의 매출로 계산하지 않는다. 회사가 체결한 프로그램 운영·자문 계약의 대가만 매출로 반영한다."),
            T("1.4 출발 자산과 부족한 역량", ["확보한 자산", "보완할 과제"], [
                ["평가·사업운영위원 활동 경험", "신설 회사 명의의 수행 실적"],
                ["서울 지역 기관과의 접점", "전담 사업 운영·정산 인력"],
                ["경기 지역 멘토링 실적과 추가 의뢰", "표준 프로그램과 견적 체계"],
                ["기술·마케팅·해외사업 전문성", "투자 판단·조합 운영 경험"],
                ["기존 프로그램 운영사와의 관계", "반복 수주와 민간 유료 고객"],
            ]),
            {"type": "callout", "text": "첫해의 핵심 목표는 유료 프로그램 3건을 수행하고, 기관의 재의뢰 가능성과 실제 수익성을 확인하는 것이다."},
        ]},
        {"id": "schedule", "nav": "일정·제안", "eyebrow": "2 · Calendar & Pitch", "title": "연간 사업 일정과 사전 제안", "blocks": [
            {"type": "h", "text": "2.1 정부사업 일정 적용 원칙"},
            P("K-Startup의 창업기업 모집 일정과 외부 운영사 선정 일정은 구분해야 한다. 운영 용역은 주관기관 홈페이지나 나라장터 등에 별도로 공고될 수 있다."),
            P(f"2026년에는 초기·도약패키지 일반형 기업 모집이 1월 23일~2월 13일에 진행됐고, 예비창업패키지 수정공고 접수는 3월 6~24일이었다. 이를 참고하되, 2027년 일정으로 확정해서 사용하지 않는다. <a href=\"{SRC_MSS}\" target=\"_blank\" rel=\"noopener\">[중소벤처기업부]</a>"),
            T("사업군별 영업·수행 시점", ["주요 사업군", "사전 영업 시점", "수행 시점 가정", "제안할 프로그램"], [
                ["초기창업패키지 연계", "전년 4분기~당해 1분기", "2~4분기", "B2B 고객 발굴·영업 실행"],
                ["창업도약패키지 연계", "전년 4분기~당해 1분기", "2~4분기", "성장전략·대기업 고객 확보·해외 진출"],
                ["예비창업패키지 연계", "1분기", "2~3분기", "고객 정의·사업모델·시장 검증"],
                ["혁신센터 자체 사업", "연중, 착수 8~12주 전", "기관별 일정", "멘토링·사업화·고객 밋업"],
                ["차년도 프로그램 기획", "3~4분기", "다음 해", "성과에 근거한 개선 프로그램"],
            ], f"창조경제혁신센터의 프로그램은 센터별 일정으로 운영되므로 기관별 확인이 필요하다. <a href=\"{SRC_KISED}\" target=\"_blank\" rel=\"noopener\">[창업진흥원]</a>"),
            T("2.2 분기별 실행 계획", ["시기", "사전 제안·수주", "수행·관리"], [
                ["<b>2026년 4분기</b>", "기관 8곳 수요 면담 목표, 기존 운영사 2곳 협의, 상품별 기획안·견적 작성", "기존 멘토링 사례 정리, 역할·참여 시간 합의"],
                ["<b>2027년 1분기</b>", "통합공고·개별 공고 확인, 적격 과제 제안, 공동 수행 계약 검토", "소규모 진단·자문, 개인 평가 일정과 사업 일정 조정"],
                ["<b>2분기</b>", "선정기업 수요에 맞춘 프로그램 제안, 하반기 해외 과정 협의", "B2B 1기 수행, 기업별 실행계획 확보"],
                ["<b>3분기</b>", "중간 성과를 활용한 후속 제안, 차년도 기획안 작성", "B2B 2기·글로벌 과정 수행, 원가·미수금 점검"],
                ["<b>4분기</b>", "차년도 수요 면담과 정식 제안 준비", "성과공유·검수·정산·대금 회수"],
            ]),
            {"type": "h", "text": "2.3 사전 제안의 구체적 방식"},
            P("예상 착수 <b>8~12주 전</b>에 다음 내용을 담은 2쪽 기획안을 전달한다."),
            {"type": "ol", "items": ["지원 대상 기업이 겪는 문제", "프로그램 대상과 선정 기준", "기간과 회차별 수행 내용",
                                     "기업·기관에 제공할 산출물", "예산과 비용 산출 근거", "성과 측정 및 후속 관리 방식"]},
            P("첫해에는 <b>적격 제안 기회 8건, 유료 프로그램 수주 3건</b>을 목표로 한다. 신설 회사의 실적이나 자격이 부족한 공고는 기존 운영사와의 공동 수행 가능성을 먼저 확인한다."),
            N_("사전 협의는 수주 확약으로 간주하지 않는다. 계약 방식, 공동 수행 허용 여부와 당사 실적 인정 범위는 공고·계약별로 확인한다."),
        ]},
        {"id": "program", "nav": "프로그램", "eyebrow": "3 · NextGrowth", "title": "다음성장 프로그램과 운영 체계", "blocks": [
            T("3.1 첫해 상품 구성", ["상품", "기본 구성", "연간 판매 가정", "매출"], [
                ["<b>NextGrowth B2B</b>", "8개사·8주, 기업별 멘토링 3회, 공통 워크숍 2회, 고객 검증·결과보고", "2회 × 2,500만 원", "5,000만 원"],
                ["<b>NextGrowth Global</b>", "5개사·8주, 국가 1곳, 진출 준비 진단·현지 전문가 상담·접근계획", "1회 × 3,000만 원", "3,000만 원"],
                ["<b>NextGrowth Clinic</b>", "기관별 기업 진단·개별 멘토링·소규모 교육", "연간 합계", "2,000만 원"],
                ["<b>민간기업 자문</b>", "영업·사업화 자문, 계약별 범위 설정", "2곳 × 5개월 × 월 200만 원", "2,000만 원"],
                ["<b>합계</b>", "", "", "<b>1억 2,000만 원</b>"],
            ], "단가는 내부 견적 가정이다. 해외 항공·숙박, 대형 행사와 통번역은 기본 상품에서 제외하고 별도로 견적을 낸다. 공동 수행 매출은 전체 사업비가 아닌 당사 계약금액만 반영한다."),
            {"type": "steps", "title": "3.2 B2B 프로그램 진행 방식", "items": [
                ["1주차", "기업 현황·고객·영업 문제 진단", "기업별 진단표"],
                ["2~3주차", "목표 고객과 구매 의사결정 구조 정리", "고객 정의·영업 접근계획"],
                ["4~6주차", "고객 인터뷰·제안서 검증", "인터뷰 기록·수정 제안서"],
                ["7~8주차", "실행 결과 점검·후속 과제 합의", "결과보고서·90일 실행계획"],
                ["종료 90일 후", "영업기회·PoC·매출 변화 확인", "후속 성과 기록"],
            ]},
            N_("기본 목표는 8개사 중 6개사 이상 완료와 기업별 고객 인터뷰 3건 또는 기관과 합의한 대체 검증이다. 고객·투자 유치나 매출 발생을 보장하지 않는다."),
            T("3.3 대표 프로그램 원가 — B2B 1회 기준", ["항목", "예산"], [
                ["외부 멘토·전문가비", "600만 원"], ["과제 운영비", "300만 원"], ["조사·콘텐츠 제작", "150만 원"],
                ["소규모 행사", "120만 원"], ["여비·도구·기타", "80만 원"],
                ["<b>직접비 합계</b>", "<b>1,250만 원</b>"], ["<b>매출총이익</b>", "<b>1,250만 원</b>"],
            ], "비상근 창업멤버의 과제 보수는 직접비 안에서 지급한다. 대표 보수나 고정 운영비와 중복 계산하지 않는다."),
            T("3.4 인력과 역할", ["역할", "주요 책임"], [
                ["대표·사업 총괄", "기관 영업, 상품 설계, 계약, 최종 검수"],
                ["전략·멘토링 담당", "기업 진단, 사업전략, 멘토 품질관리"],
                ["경영·운영 담당", "제안 원가, 조직 운영, 수행 체계"],
                ["기술·글로벌 담당", "기술사업화, 해외시장 검증, 현지 전문가 협력"],
                ["시간제·외주 운영인력", "일정·출결·자료·보고·정산 지원"],
            ]),
            P("멘토링 입문자는 전문 분야와 활동 가능 시간을 정리한 1쪽 프로필을 작성하고, K-Startup과 운영기관의 멘토·전문가 모집을 확인한다. 초기에는 공동 멘토링으로 경험을 쌓는다."),
            N_("동시 수행은 프로그램 2개 이내로 제한한다. 지분, 참여 시간, 과제 보수, 대표 권한, 탈퇴와 콘텐츠 권리는 창업 합의서로 정한다. 위원으로 참여하는 사업과 회사의 수주 활동이 겹치면 기관에 관계를 알리고 심의·평가 참여를 사전에 정리한다."),
        ]},
        {"id": "finance", "nav": "재무", "eyebrow": "4 · Year-one finance", "title": "첫해 재무계획과 현금 운용", "blocks": [
            L(["2027년 1월부터 계약·청구 가능한 사업체와 대표 수행 시간을 확보한다.", "퇴직이나 개업이 늦어지면 매출과 고정비를 함께 이연한다.",
               "개인 평가료·위원 수당은 회사 매출에 포함하지 않는다.", "직접비는 매출의 약 50%로 가정한다.",
               "대표 외 창업멤버는 과제별 보수를 받는다.", "개인 생활비와 투자 출자금은 사업자금과 분리한다."], "4.1 재무계획의 전제"),
            T("4.2 분기별 손익계획 (단위: 백만 원)", ["항목", "1분기", "2분기", "3분기", "4분기", "연간"], [
                ["매출", "5", "30", "45", "40", "<b>120</b>"], ["직접비", "2", "15", "23", "20", "<b>60</b>"],
                ["매출총이익", "3", "15", "22", "20", "<b>60</b>"], ["고정비", "12", "12", "12", "12", "<b>48</b>"],
                ["<b>영업손익</b>", "<b>-9</b>", "<b>3</b>", "<b>10</b>", "<b>8</b>", "<b>12</b>"],
            ]),
            T("4.3 연간 고정비 구성", ["항목", "연간 예산"], [
                ["대표 보수·관련 부담 예산", "2,400만 원"], ["시간제 운영지원", "1,200만 원"],
                ["회계·공유공간·도구·영업·초기설립비 등", "1,200만 원"], ["<b>합계</b>", "<b>4,800만 원</b>"],
            ], "대표 보수·관련 부담 예산은 월평균 200만 원 수준이다. 고용 형태와 실제 부담액은 설립 전에 다시 계산한다."),
            T("4.4 현금흐름과 초기 자금 (기초 사업자금 5,000만 원, 단위: 백만 원)", ["항목", "1분기", "2분기", "3분기", "4분기", "연간"], [
                ["고객 대금 수금", "2", "23", "40", "45", "<b>110</b>"], ["사업비·고정비 지급", "14", "27", "35", "32", "<b>108</b>"],
                ["현금 증감", "-12", "-4", "5", "13", "<b>2</b>"],
                ["<b>기말 현금 잔액</b>", "<b>38</b>", "<b>34</b>", "<b>39</b>", "<b>52</b>", "<b>52</b>"],
            ], "연말 매출채권 1,000만 원, 미지급금 없음, 비용 전액 당기 지급을 가정한 단순 현금계획이다. 초기 자금은 매출과 구분한다. 현금 중 최소 1,500만 원은 세금과 예상 밖 지출에 대비해 유보한다."),
            P("4.5 직접비율 50%, 고정비 4,800만 원이면 <b>손익분기 매출은 연 9,600만 원</b>이다."),
            T("손익분기와 하방 대응", ["상황", "예상 영향", "대응"], [
                ["매출 20% 감소", "손익분기 수준", "외주 범위와 대표 보수 재검토"],
                ["매출 8,000만 원", "영업손실 약 800만 원", "고정비 축소·채용 보류"],
                ["수금 2,000만 원 이연", "연말 현금 5,200만 원 → 3,200만 원", "지급 일정 조정·추가 지출 제한"],
                ["분기말 현금 2,500만 원 미만", "운영 여유 감소", "사무실·채용·해외출장 보류"],
            ], "계약 전에 선수금·중도금·검수·잔금 조건을 확인한다. 선수금 확보를 당연하게 가정하지 않고, 주간 단위로 향후 13주 현금을 점검한다."),
        ]},
        {"id": "growth", "nav": "확대·투자", "eyebrow": "5 · Scale & Invest", "title": "확대 계획과 투자 검토", "blocks": [
            T("5.1 5개년 사업·재무계획 (단위: 백만 원)", ["연도", "사업 규모 가정", "매출", "직접비", "고정비", "영업이익"], [
                ["<b>2027</b>", "프로그램 3회, 공동 수행 중심", "120", "60", "48", "<b>12</b>"],
                ["<b>2028</b>", "프로그램 4회, 거래기관 3곳 목표", "190", "95", "75", "<b>20</b>"],
                ["<b>2029</b>", "프로그램 6회, 직접 수주 확대", "280", "140", "110", "<b>30</b>"],
                ["<b>2030</b>", "프로그램 8회, 해외 과정 반복", "360", "180", "140", "<b>40</b>"],
                ["<b>2031</b>", "프로그램 10회, 별도 운영책임자 확보", "450", "225", "170", "<b>55</b>"],
            ], "2028~2031년 매출은 프로그램당 평균 3,000만 원과 연간 자문·클리닉 매출 7,000만·1억·1억 2,000만·1억 5,000만 원을 합산한 가정이다. 투자 회수이익, 조합 관리보수와 보조금 수입은 포함하지 않는다."),
            T("5.2 연도별 확대 조건", ["연도", "우선 과제", "확대 조건"], [
                ["<b>2027</b>", "계약부터 정산까지 수행 체계 검증", "기관 재의뢰·실제 원가 확인"],
                ["<b>2028</b>", "반복 프로그램 정착·운영인력 확보", "6개월 계약 매출과 인건비 재원"],
                ["<b>2029</b>", "적격 사업 직접 제안·기관 다변화", "자체 실적·제안 역량·기관 의존도 완화"],
                ["<b>2030</b>", "검증된 국가의 해외 프로그램 반복", "현지 협력자·수요·수익성 확보"],
                ["<b>2031</b>", "대표 외 운영책임자 중심 수행", "대표 부재 시에도 품질·정산 유지"],
            ]),
            P("한 기관의 매출 비중은 중기적으로 40% 이하를 목표로 한다. 공공사업의 계절성과 예산 변동을 줄이기 위해 민간 자문을 병행한다."),
            P("네 명 전원 상근은 자동 목표로 삼지 않는다. 추가 역할이 만들어내는 수익이 고정비를 감당할 때 상근화를 결정한다."),
            T("5.3 회사와 투자조합의 관계", ["형태", "목적", "검토 시점"], [
                ["사업 운영 회사", "프로그램 계약·인력·회계·자문 매출 관리", "초기"],
                ["일반협동조합", "전문가들의 공동 소유·공동 사업", "구성원 확대와 운영 원칙 합의 후"],
                ["개인투자조합", "출자금을 모아 창업기업에 투자", "2030~2031년 조건 충족 시"],
            ], f"일반협동조합은 최소 5인의 발기인이 필요하므로 현재 네 명 외에 공동 운영에 참여할 구성원이 필요하다. <a href=\"{SRC_LAW}\" target=\"_blank\" rel=\"noopener\">[찾기쉬운 생활법령정보]</a>"),
            L(["투자 담당자의 교육과 기업 검토 경험", "기존 투자기관과의 협업 경험", "투자 후 관리 책임자",
               "사업 운영자금과 분리된 출자 여력", "당시 등록 요건과 관리 비용 확인"], "투자 기능은 다음 조건이 갖춰졌을 때 별도로 검토한다"),
        ]},
        {"id": "next90", "nav": "90일", "eyebrow": "Next 90 days", "title": "향후 90일 실행", "blocks": [
            {"type": "steps", "items": [
                ["2026년 11월", "예정 멘토링 수행, 사례 활용 동의, 창업멤버 참여 시간 합의", "사례·역할표"],
                ["12월", "서울·경기 기관 수요 면담, 기존 운영사 협의, 상품별 견적", "기획안·원가표·제안 대상 목록"],
                ["2027년 1월", "공고별 자격 확인, 퇴직 시점 대조, 계약 주체와 자금 확정", "개업 일정·분기 실행계획"],
            ]},
            {"type": "callout", "text": "첫해의 판단 기준은 매출 규모뿐 아니라 재의뢰, 수행 품질, 정산 완료와 현금 회수다. 이를 확인하면서 운영인력과 프로그램을 단계적으로 확대한다."},
        ]},
    ],
    "sources": [
        ["중소벤처기업부 — 2026 창업지원사업 공고", SRC_MSS],
        ["창업진흥원 — 창조경제혁신센터 프로그램", SRC_KISED],
        ["찾기쉬운 생활법령정보 — 일반협동조합 설립", SRC_LAW],
    ],
}

# ── 아이디어 랩 요약 카드 ─────────────────────────────────────────
IDEA = {
    "id": "ieum-bridge", "theme": "A",
    "title": "이음브릿지 · 다음성장", "en": "IEUM Bridge · NextGrowth",
    "one": "대기업 출신 전문가들의 기술·기획·마케팅·해외사업 경험으로 B2B 기술기업의 고객 확보와 사업화를 돕는 창업지원 프로그램 회사. 공동 수행으로 출발해 직접 수주로 넓힌다.",
    "stage": "공동 창업 검토 중 (2027 개업 목표)",
    "capital": "기초 사업자금 5,000만 원",
    "goal": "2027년 유료 프로그램 3건·매출 1.2억 원 → 2031년 4.5억 원",
    "tags": ["NextGrowth B2B", "NextGrowth Global", "NextGrowth Clinic", "민간 자문", "창업지원기관"],
    "problem": [
        "기술·제품은 있지만 목표 고객 설정과 영업 실행에서 막히는 초기·도약기 B2B 기업이 많다.",
        "창업지원기관은 단순 멘토링을 넘어 고객 검증과 실행까지 가는 프로그램이 필요하다.",
        "신설 회사는 명의 실적·운영·정산 인력·표준 견적 체계가 없어 직접 수주가 어렵다.",
    ],
    "solution": [
        "대표 프로그램 다음성장(NextGrowth)을 B2B·Global·Clinic 세 갈래로 표준화한다.",
        "첫해는 기존 운영사와 공동 수행으로 실적을 쌓고, 착수 8~12주 전 2쪽 기획안으로 사전 제안한다.",
        "대표 1인 총괄 + 창업멤버 과제별 참여로 고정비를 낮추고, 수익이 고정비를 감당할 때만 상근화한다.",
    ],
    "customers": [
        "지불 고객: 창조경제혁신센터, 창업패키지 주관기관·대학 창업지원단, 테크노파크, 기존 운영사, 민간기업",
        "수혜기업: 제조·물류·기업용 IT 분야 초기·도약기 B2B 기술기업",
    ],
    "canvas": {
        "seg": "창업지원기관·대학·테크노파크·기존 운영사, B2B 기술기업, 자문 수요 민간기업",
        "value": "대기업 실무 경험으로 고객 정의→인터뷰 검증→90일 실행계획까지 가는 실행형 프로그램",
        "chan": "기관 수요 면담, 착수 8~12주 전 2쪽 기획안, 공동 수행, 공고 대응",
        "rel": "성과공유·90일 후속 점검, 차년도 개선 프로그램 제안",
        "rev": "프로그램 운영 계약(B2B·Global), Clinic 진단·멘토링, 민간 자문 월 계약",
        "res": "평가·운영위원 경험, 서울·경기 기관 접점, 기술·마케팅·해외사업 전문가 4인",
        "act": "기관 영업, 상품 설계, 프로그램 수행, 검수·정산·대금 회수",
        "part": "기존 프로그램 운영사, 외부 멘토·현지 전문가, 시간제 운영인력",
        "cost": "외부 멘토비·운영비(직접비 약 50%), 대표 보수·운영지원·공유공간(고정비 연 4,800만 원)",
    },
    "money": {
        "rows": [
            ["2027 (첫해)", "매출 1억 2,000만 원 · 영업이익 1,200만 원"],
            ["손익분기", "연 매출 9,600만 원 (직접비율 50%, 고정비 4,800만 원)"],
            ["B2B 1회", "매출 2,500만 원 · 직접비 1,250만 원 · 매출총이익 1,250만 원"],
            ["2031", "매출 4억 5,000만 원 · 영업이익 5,500만 원 (프로그램 10회)"],
        ],
        "note": "내부 계획 가정이며 부가세·법인세 차감 전. 정부지원금 전체가 아닌 당사 계약금액만 매출로 잡는다. 연말 현금 5,200만 원, 최소 1,500만 원 유보.",
    },
    "market": {
        "alt": [
            ["기존 액셀러레이팅 운영사", "운영 규모는 크지만 B2B 영업 실행까지 동행하는 전문가 풀은 얇다 → 공동 수행 파트너"],
            ["개인 멘토·평가위원", "건별 참여에 그쳐 산출물·후속 관리가 남지 않는다"],
            ["일반 경영 컨설팅", "창업기업 단가와 기관 예산 구조에 맞지 않는다"],
        ],
        "edge": "대기업 실무 출신 4인의 기술·기획·마케팅·해외사업 조합과, 평가·운영위원으로 쌓은 기관 접점을 표준 프로그램(NextGrowth)으로 묶는다.",
    },
    "roadmap": [
        ["2026.11~2027.1", "멘토링 사례 정리, 기관 8곳 수요 면담, 운영사 2곳 협의, 상품별 견적, 개업 일정 확정"],
        ["2027", "공동 수행 중심 프로그램 3회 · 매출 1.2억 원 (계약부터 정산까지 수행 체계 검증)"],
        ["2028~2029", "반복 프로그램 정착·운영인력 확보 → 적격 사업 직접 제안·기관 다변화 (매출 1.9억 → 2.8억 원)"],
        ["2030~2031", "해외 과정 반복, 별도 운영책임자 중심 수행 (매출 3.6억 → 4.5억 원), 투자조합은 조건 충족 시 검토"],
    ],
    "risks": [
        ["퇴직·개업 시점 지연", "매출과 고정비를 함께 이연한다"],
        ["신설 회사 실적·자격 부족", "기존 운영사와 공동 수행, 당사 실적 인정 범위를 계약별로 확인"],
        ["매출 20% 감소·수금 이연", "외주 범위·대표 보수 재검토, 13주 현금 주간 점검, 분기말 2,500만 원 미만 시 지출 보류"],
        ["한 기관 의존·공공 예산 계절성", "기관 비중 40% 이하, 민간 자문 병행"],
        ["위원 활동과 수주 이해충돌", "기관에 관계를 알리고 심의·평가 참여를 사전에 정리"],
        ["창업멤버 간 역할 갈등", "지분·참여 시간·보수·탈퇴·콘텐츠 권리를 창업 합의서로"],
    ],
    "why": "평가위원으로 앉아 본 자리에서, 기술은 좋은데 첫 고객을 못 만나는 기업을 많이 봤다. 대기업에서 쌓은 영업·사업화 경험을 그 사이에 다리로 놓고 싶다.",
    "img": {"hero": "ideas-ieum-bridge", "body": "ideas-ieum-bridge-2"},
    "page": {"href": "ieum.html", "label": "사업계획서 전문 보기"},
    "details": [
        {"title": "첫해 상품 구성 (2027)", "head": ["상품", "기본 구성", "판매 가정", "매출"], "rows": [
            ["NextGrowth B2B", "8개사·8주, 멘토링 3회, 워크숍 2회, 고객 검증", "2회 × 2,500만 원", "5,000만 원"],
            ["NextGrowth Global", "5개사·8주, 국가 1곳, 현지 전문가 상담", "1회 × 3,000만 원", "3,000만 원"],
            ["NextGrowth Clinic", "기업 진단·개별 멘토링·소규모 교육", "연간 합계", "2,000만 원"],
            ["민간기업 자문", "영업·사업화 자문", "2곳 × 5개월 × 월 200만 원", "2,000만 원"],
            ["합계", "", "", "1억 2,000만 원"],
        ]},
        {"title": "5개년 계획 (단위: 백만 원)", "head": ["연도", "규모", "매출", "영업이익"], "rows": [
            ["2027", "프로그램 3회, 공동 수행", "120", "12"], ["2028", "4회, 거래기관 3곳", "190", "20"],
            ["2029", "6회, 직접 수주 확대", "280", "30"], ["2030", "8회, 해외 과정 반복", "360", "40"],
            ["2031", "10회, 운영책임자 확보", "450", "55"],
        ]},
    ],
}

PHOTOS = [
    '    ("ideas-ieum-bridge", "unsplash", "1556761175-5973dc0f32e7", "아이디어 랩 · 이음브릿지", 1400),\n',
    '    ("ideas-ieum-bridge-2", "unsplash", "1519389950473-47ba0277781c", "아이디어 랩 · 이음브릿지", 1000),\n',
]

SHELL = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>이음브릿지 — 경험을 잇고, 다음 성장으로</title>
<link rel="icon" href="assets/site/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<style>
__CSS__
  /* IEUM — 표·단계·강조 (simda.html 스타일 위에 덧붙임) */
  :root{--forest:#1d3f63;--forest-2:#2d5f8f;--leaf:#4f8fc0;--sprout:#d6e6f3}
  .hero{background:radial-gradient(1200px 500px at 85% -10%,#2d5f8f 0%,transparent 60%),linear-gradient(160deg,#132c46 0%,#1d3f63 55%,#284f78 100%)}
  .hero p{color:#dbe8f4} .meta{color:#a9c3dc} .tag{color:#e7f0f8}
  .doc h3{margin:34px 0 12px}
  .doc p{margin:12px 0;color:var(--ink-2)} .doc p b{color:var(--ink)}
  .tbl{overflow-x:auto;margin:14px 0;background:var(--paper);border:1px solid var(--line);border-radius:14px}
  .tbl table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
  .tbl th{background:var(--sprout);color:var(--forest);text-align:left;padding:10px 14px;font-weight:700;white-space:nowrap}
  .tbl td{padding:10px 14px;border-top:1px solid var(--line);vertical-align:top}
  .tbl td.num,.tbl th.num{text-align:right;white-space:nowrap}
  .note{font-size:14px;color:var(--ink-2);background:var(--paper);border-left:4px solid var(--gold);border-radius:8px;padding:12px 16px;margin:12px 0}
  .callout{font-family:var(--serif);font-size:19px;color:var(--forest);background:var(--gold-soft);border-radius:14px;padding:22px 26px;margin:28px 0 0;line-height:1.6}
  .doc ul,.doc ol{padding-left:22px;margin:10px 0;color:var(--ink-2)} .doc li{margin-bottom:6px}
  .steps{display:grid;gap:10px;margin:14px 0}
  .step{display:grid;grid-template-columns:120px 1fr auto;gap:16px;align-items:center;background:var(--paper);border:1px solid var(--line);border-left:5px solid var(--leaf);border-radius:12px;padding:14px 18px}
  .step .when{font-weight:700;color:var(--forest);font-size:14px}
  .step .out{font-size:12px;background:var(--gold-soft);color:#7a5a1d;border-radius:999px;padding:4px 12px}
  @media(max-width:760px){.step{grid-template-columns:1fr}}
  section:nth-of-type(even){background:var(--paper)}
  section:nth-of-type(even) .tbl,section:nth-of-type(even) .step,section:nth-of-type(even) .note{background:var(--cream)}
</style>
</head>
<body>
<div id="app"><p style="padding:40px;text-align:center">불러오는 중…</p></div>
<script src="assets/site/ieum.js" defer></script>
</body>
</html>
"""

JS = r"""// ieum.html — content/ieum.json 을 읽어 사업계획서를 그린다 (scripts/add_ieum_bridge.py 가 생성)
(async () => {
  const d = await (await fetch("content/ieum.json", {cache: "no-cache"})).json();
  const num = s => /^[-\d.,]+$/.test(String(s).replace(/<\/?b>/g, ""));
  const block = b => {
    if (b.type === "h") return `<h3>${b.text}</h3>`;
    if (b.type === "p") return `<p>${b.text}</p>`;
    if (b.type === "note") return `<div class="note">${b.text}</div>`;
    if (b.type === "callout") return `<div class="callout">${b.text}</div>`;
    if (b.type === "ol") return `<ol>${b.items.map(i => `<li>${i}</li>`).join("")}</ol>`;
    if (b.type === "list") return `${b.title ? `<h3>${b.title}</h3>` : ""}<ul>${b.items.map(i => `<li>${i}</li>`).join("")}</ul>`;
    if (b.type === "steps") return `${b.title ? `<h3>${b.title}</h3>` : ""}<div class="steps">${b.items.map(([w, t, o]) =>
      `<div class="step"><div class="when">${w}</div><div>${t}</div><span class="out">${o}</span></div>`).join("")}</div>`;
    if (b.type === "table") {
      const isNum = b.head.map((_, c) => c > 0 && b.rows.every(r => !r[c] || num(r[c])));
      return `${b.title ? `<h3>${b.title}</h3>` : ""}<div class="tbl"><table><thead><tr>${b.head.map((h, c) =>
        `<th${isNum[c] ? ' class="num"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((v, c) =>
        `<td${isNum[c] ? ' class="num"' : ""}>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${b.note ? `<div class="note">${b.note}</div>` : ""}`;
    }
    return "";
  };
  const h = d.hero;
  document.getElementById("app").innerHTML = `
<nav><div class="wrap"><a class="brand" href="#top">${d.brand}</a>
<ul>${d.sections.map(s => `<li><a href="#${s.id}">${s.nav}</a></li>`).join("")}</ul>
<a class="back" href="${d.back}">← 아이디어 랩</a></div></nav>
<header class="hero" id="top"><div class="wrap">
<div class="eyebrow">${h.eyebrow}</div><h1>${h.h1}</h1><p>${h.p}</p>
<div class="tags">${h.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
<div class="meta">${h.meta}</div></div></header>
<section style="padding:56px 0"><div class="wrap"><div class="stats" style="margin:0">${d.stats.map(([b, s]) =>
  `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("")}</div>
<div class="note" style="margin-top:20px">${d.disclaimer}</div></div></section>
${d.sections.map(s => `<section class="doc" id="${s.id}"><div class="wrap">
<div class="eyebrow">${s.eyebrow}</div><h2>${s.title}</h2>${s.blocks.map(block).join("")}</div></section>`).join("")}
<footer><div class="wrap"><h4>참고 출처</h4><ul>${d.sources.map(([t, u]) =>
  `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>
<p class="disclaimer">${d.disclaimer}</p></div></footer>`;
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
"""


def rw(path, fn):
    t = path.read_text("utf-8")
    n = fn(t)
    if n != t:
        path.write_text(n, "utf-8")


# 0) 상세 페이지: 데이터 + 껍데기 + 렌더러 (CSS는 simda.html 에서 가져온다)
(C / "ieum.json").write_text(json.dumps(DOC, ensure_ascii=False, indent=1), "utf-8")
css = re.search(r"<style>\n(.*?)\n</style>", (ROOT / "simda.html").read_text("utf-8"), re.S).group(1)
(ROOT / "ieum.html").write_text(SHELL.replace("__CSS__", css), "utf-8")
(ROOT / "assets/site/ieum.js").write_text(JS, "utf-8")

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

# 2) 3D 방 카드: 남10·북10·동7·서6(문 자리 비움) 순서로 다시 건다
slots = ([("south", round((k + .5) / 10, 3)) for k in range(10)]
         + [("north", round((k + .5) / 10, 3)) for k in range(10)]
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
    anchor = next(l for l in t.splitlines(True) if l.startswith('    ("ideas-simda-partners-2"'))
    return t.replace(anchor, anchor + "".join(PHOTOS))
rw(ROOT / "scripts/fetch_photos.py", photos)
print(f"ideas: {N}, inserted at no.{at + 1}")
