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
