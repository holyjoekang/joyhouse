# Joyhouse — Toripapa-house

한 사람의 60년을 걸어서 둘러보는 **three.js 3D 집**. 백악관식 대리석 몸통에 한옥의 기와지붕·솟을대문·띠살문을 얹었고,
기존 사이트들(나의 서재 · 나의 여행 지도 · 50플러스 인사이트 · Keep121)이 집 안의 '방'이 된다.

- 공개 주소(배포 후): https://holyjoekang.github.io/joyhouse/
- 설계 문서: Joyhouse — 3D 사이버 궁전 2차 설계 (Claude Docs)
- 화면에 보이는 UI는 **모두 3D**다(이름판·방 바로가기·정보 판·미니맵). HTML UI는 쓰지 않는다.
  사이트 연결(iframe·새 탭)은 마지막 단계(콘텐츠 연결)에서 붙인다.

## 실행

```bash
python -m http.server 5173      # 이 폴더에서
# http://localhost:5173/                 정문에서 시작
# http://localhost:5173/#/room/maproom   맵룸으로 바로
# http://localhost:5173/?key=preview     가족 방 미리보기 (보안 아님, 개발용)
```

빌드 도구 없음. three.js 0.180.0을 importmap으로 불러온다(서재·여행 지도와 같은 버전).

| 조작 | PC | 휴대폰 |
| --- | --- | --- |
| 둘러보기 | 끌기 | 끌기 |
| 걷기 | W A S D · 방향키 · 휠 · 바닥 클릭 | 바닥 누르기 |
| 전시물 보기 | 클릭 → 앞으로 다가가며 3D 정보 판 | 누르기 |
| 방 바로가기 | 오른쪽 위 석판 · M 키 | 오른쪽 위 석판 |
| 미니맵 | 누른 자리로 이동 | 같음 |

## 1단계에 들어 있는 것

- 대지: 솟을대문(문짝이 열린다) · 현판 · 꽃담 · 박석 잔디길 · 연표 이정표(1960s~2030s + 커리어 7시기) · 소나무 · 로즈가든
- 건물: 센트럴 6칸 + 양 윙 7칸 + 회랑 2, 포르티코 대리석 기둥 6개, 팔작풍 곡면 기와지붕 7개
- 채운 방 6곳: 그랜드 홀(고흐 9점) · 블루룸(책장 + 최근 읽은 책 표지 20권) · 맵룸(회전 지구본 + 다녀간 도시 핀) ·
  레드룸(블로그 최신 글 12편 가판대) · 뿌리의 방 · 가족관(가족 전용, 샘플)
- 나머지 방: '2단계에서 채웁니다' 안내판. 가족 방 문은 잠겨 있다.

## 폴더

```
index.html              캔버스 하나 + importmap
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
