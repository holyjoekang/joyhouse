# Joyhouse — Toripapa-house

커리어 30년, 걸어온 길과 갈 길을 담은 **개인 홈페이지**. 기존 사이트들(나의 서재 · 나의 여행 지도 · 50플러스 인사이트 · Keep121)이
집 안의 '방'이 되어 이어진다.

- 공개 주소: https://holyjoekang.github.io/joyhouse/
- **2D 홈페이지가 기본**이다(`index.html` 외 방별 쪽). three.js 3D 집은 하위 쪽 `3d.html`로 옮겼다.
- 사진은 모두 자유 이용 이미지다(Unsplash License · CC BY · 퍼블릭 도메인). 목록은 `credits.html`.

## 2D 사이트

| 쪽 | 방 | 내용 |
| --- | --- | --- |
| `index.html` | 홈 | 히어로 슬라이드, 방 소개, 커리어 연표, 최신 글, 최근 읽은 책, 여행 지도 |
| `gallery.html` | 그랜드 홀 | 고흐 9점 갤러리(누르면 크게) |
| `library.html` | 블루룸 | 최근 읽은 책 20권, 나의 서재 연결 |
| `blog.html` | 레드룸 | 네이버 블로그 최신 글 12편 |
| `travel.html` | 맵룸 | 다녀간 도시 102곳 지도(SVG), 여행지 카드, 자주 간 순서 (나의 여행 지도와 같은 목록) |
| `studio.html` | 오벌 오피스 | 커리어 연표, AI 앱 10개 |
| `china.html` | 중국관 | 주재원 9년, 중국 서부 일정표 |
| `vision.html` | 비전룸 | Keep121 소개 일곱 장 |
| `family.html` | 가족의 방들 | 가족 전용 방 안내 |
| `credits.html` | — | 사진·그림 출처 |
| `3d.html` | — | three.js 3D 투어(예전 첫 화면) |

- 공통 머리·꼬리·목록은 `assets/site/site.js`가 그린다. 목록은 HTML에 박지 않고 `content/`·`data/` JSON을 읽으므로
  `sync_sources.py`가 매일 데이터를 바꾸면 2D와 3D가 함께 바뀐다.
- 스타일은 `assets/site/site.css` 하나.
- 사진은 `python scripts/fetch_photos.py`가 `assets/photos/`에 webp로 받고 출처를 `assets/photos/credits.json`에 남긴다.
  사진을 더하려면 이 스크립트의 `PHOTOS`에 한 줄 더한다.

## 실행

```bash
python -m http.server 5173      # 이 폴더에서
# http://localhost:5173/                 2D 홈
# http://localhost:5173/3d.html          3D 정문에서 시작
# http://localhost:5173/3d.html#/room/maproom   3D 맵룸으로 바로
# http://localhost:5173/3d.html?key=preview     가족 방 미리보기 (보안 아님, 개발용)
```

빌드 도구 없음. three.js 0.180.0을 importmap으로 불러온다(서재·여행 지도와 같은 버전).

| 조작 | PC | 휴대폰 |
| --- | --- | --- |
| 둘러보기 | 끌기 | 끌기 |
| 걷기 | W A S D · 방향키 · 휠 · 바닥 클릭 | 바닥 누르기 |
| 전시물 보기 | 클릭 → 앞으로 다가가며 3D 정보 판 | 누르기 |
| 방 바로가기 | 오른쪽 위 석판 · M 키 | 오른쪽 위 석판 |
| 미니맵 | 누른 자리로 이동 | 같음 |

## 3D 로딩 순서

첫 화면을 빨리 띄우려고 받는 순서를 나눴다.

1. **첫 화면**: three.js + 코드 + 작은 JSON(집 배치·연표·방 목록)만 받아 대문과 정원을 그린다. 그동안 로딩 화면을 보여 준다.
2. **첫 프레임 뒤**: 바깥 텍스처(잔디·박석·기와·벽) → 후처리(주변광 차폐·빛번짐)를 붙인다.
3. **집에 다가가면**: 그랜드 홀을 먼저 꾸민다(고흐 그림).
4. **방에 들어서면**: 그 방과 이웃 방을 먼저, 나머지 방은 하나씩 차례로 채운다. 실내 텍스처(마루·목재)도 이때 받는다.

해는 움직이지 않으므로 그림자 지도는 한 번만 그리고, 대문이 열리는 동안만 다시 그린다.

## 사이트 연결

| 방 | 전시물 | 열리는 곳 | 방식 |
| --- | --- | --- | --- |
| 블루룸 | 책장 · 포털 문 | 나의 서재 (mybookshelf/app/) | 집 안 화면 |
| 맵룸 | 지구본 · 포털 문 | 나의 여행 지도 | 집 안 화면 |
| 레드룸 | 가판대 · 포털 문 | 50플러스 인사이트 (myblog) | 집 안 화면 |
| 레드룸 | 글 카드 12장 | 네이버 블로그 원문 | 새 탭 |
| 비전룸 | 포털 문 · 포스터 7장 | Keep121 각 쪽 | 집 안 화면 |
| 중국관 | 포스터 2장 · 포털 문 | 충칭·중국 서부 일정표, 여행 지도 | 집 안 화면 |
| 오벌 오피스 · 중국관 | 앱 모니터 11대 | AI-Apps 소스(GitHub), AI Studio | 새 탭 |

같은 출처(holyjoekang.github.io)는 집 안 화면으로, 다른 출처는 프레임을 막으므로 새 탭으로 연다.

## 실사 표현

- 하늘: 대기 산란 하늘(Sky) + 같은 하늘에서 뽑은 환경광(PMREM). 해는 늦은 오후 남동쪽.
- 재질: Poly Haven CC0 PBR 텍스처(색·노멀·거칠기). 첫 화면은 캔버스 재질로 뜨고 텍스처가 오면 갈아 끼운다.
- PC 후처리: 주변광 차폐(GTAO) + 약한 빛번짐 + 멀티샘플. 휴대폰과 `?q=low`는 끈다.
- 정원: 바람에 흔들리는 풀잎(PC 7만·휴대폰 1.6만), 소나무·단풍·은행·느티나무, 회양목 울타리, 석등,
  방지원도 연못과 애련정, 로즈가든과 토리 동상, 먼 산.
- 실내: 방마다 벽 빛깔, 징두리 판벽·걸레받이·허리띠·천장 몰딩·문틀, 창과 커튼, 샹들리에·한지등,
  그림 조명, 카펫·가구. 그림 9점은 퍼블릭 도메인 원작 이미지(assets/CREDITS.md).

## 1단계에 들어 있는 것

- 대지: 솟을대문(문짝이 열린다) · 현판 · 꽃담 · 박석 잔디길 · 연표 이정표(1960s~2030s + 커리어 7시기) · 소나무 · 로즈가든
- 건물: 센트럴 6칸 + 양 윙 7칸 + 회랑 2, 포르티코 대리석 기둥 6개, 팔작풍 곡면 기와지붕 7개
- 채운 방 6곳: 그랜드 홀(고흐 9점) · 블루룸(책장 + 최근 읽은 책 표지 20권) · 맵룸(회전 지구본 + 다녀간 도시 핀) ·
  레드룸(블로그 최신 글 12편 가판대) · 뿌리의 방 · 가족관(가족 전용, 샘플)
- 나머지 방: '2단계에서 채웁니다' 안내판. 가족 방 문은 잠겨 있다.

## 폴더

```
index.html · *.html      2D 쪽들
3d.html                 3D: 캔버스 하나 + importmap
assets/site/            2D 공통 CSS·JS·파비콘
assets/photos/          자유 이용 사진 + credits.json
src/
  main.js               부트, 입력, 방 바뀜 처리, 렌더 루프
  core/                 engine(렌더러·자동 해상도) · router(#/room/<id>) · access(손님/가족)
  nav/                  walk(1인칭) · collide(벽 충돌)
  world/                site(대지) · building(벽·문·창·지붕) · roof(곡면 기와지붕) · materials(캔버스 재질)
  world/rooms/index.js  content/rooms/<id>.json 대로 방을 꾸민다 (전시물 종류 = BUILDERS 한 줄)
  exhibits/             frame · bookshelf · globe · newsstand · portal-door · sign
  ui3d/                 hud(화면 고정 3D 층) · panel · menu · minimap · text(한글 캔버스 글자)
content/
  house.json            방 좌표·문·야외 구역 (설계 문서 4절 표와 같다)
  rooms/<id>.json       방별 전시물
  portals.json          마지막 단계에서 열 사이트 대장
data/                   sync_sources.py 가 만드는 파생 데이터 (손으로 고치지 않는다)
assets/books/           최근 읽은 책 표지
scripts/sync_sources.py 형제 저장소·네이버 RSS → data/
```

## 데이터 갱신

```bash
python scripts/sync_sources.py              # GitHub raw + 네이버 RSS에서
python scripts/sync_sources.py --local ..   # 옆에 클론한 my-travel-map, mybookshelf에서
```

GitHub Actions(`.github/workflows/pages.yml`)가 매일 06:00 KST에 같은 일을 하고 Pages로 배포한다.
저장소 Settings → Pages → Source를 **GitHub Actions**로 한 번 설정해야 한다.

## 방 하나 더하기

1. `content/house.json`의 `rooms`에 상자 좌표를, `doors`에 문 위치를 더한다.
2. `content/rooms/<id>.json`에 전시물(`frame`·`sign`·`portal`·`bookshelf`·`globe`·`newsstand`)을 적고 `stage`를 1로.

`private/`(가족 사진 원본)은 커밋하지 않는다.
