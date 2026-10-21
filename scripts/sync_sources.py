"""형제 저장소와 블로그 RSS에서 집이 쓸 파생 데이터를 만든다.

    python scripts/sync_sources.py              # GitHub raw에서 읽는다 (CI 기본)
    python scripts/sync_sources.py --local ..   # 옆에 클론해 둔 저장소에서 읽는다

만드는 파일 (data/):
    timeline.json     사우스 론 이정표  ← my-travel-map data/trips.json 의 eras
    cities.json       맵룸 도시 102곳    ← my-travel-map 도시(장소 제외)·방문 횟수·Trip.com 사진과 소개
    globe_pins.json   맵룸 지구본 핀     ← cities.json 중 좌표가 있는 도시
    world_land.json   맵룸 지구본 육지   ← my-travel-map data/world_land.json 그대로
    books_top20.json  블루룸 책장 앞면   ← mybookshelf 최근 읽은 책 20권 (+ assets/books/ 표지)
    blog_latest.json  레드룸 가판대     ← 네이버 블로그 RSS 최신 글 12편

파이썬 3.10+, 표준 라이브러리만 쓴다. 한 출처가 실패해도 나머지는 만든다.
"""
import argparse
import email.utils
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
COVERS = ROOT / "assets" / "books"
RAW = "https://raw.githubusercontent.com/holyjoekang/{repo}/main/{path}"
RSS = "https://rss.blog.naver.com/joekang.xml"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "joyhouse-sync"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


class Source:
    def __init__(self, local):
        self.local = Path(local) if local else None

    def read(self, repo, path):
        if self.local:
            return (self.local / repo / path).read_bytes()
        return fetch(RAW.format(repo=repo, path=urllib.parse.quote(path)))

    def json(self, repo, path):
        return json.loads(self.read(repo, path))


def write(name, obj, indent=1):
    DATA.mkdir(exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, indent=indent, separators=None if indent else (",", ":"))
    (DATA / name).write_text(text + "\n", encoding="utf-8")
    print(f"  data/{name}")


def timeline(src):
    trips = src.json("my-travel-map", "data/trips.json")
    eras = [{"id": e["id"], "name": e["name"], "start": e["start"], "end": e["end"], "role": e.get("role", "")}
            for e in trips["eras"]]
    write("timeline.json", {"eras": eras})


def cities(src):
    """여행 지도의 '여행지' 쪽과 같은 도시 목록을 같은 순서로 만든다.

    방문 횟수는 my-travel-map scripts/build_app.py 와 같은 규칙으로 센다:
    표기는 place_aliases.json 으로 맞추고, 포괄 여정(umbrella)은 빼고,
    citiesFrom 이 gmaps_saved 인 여정은 2005년(E3) 장소 전체를 도시로 친다.
    """
    places = src.json("my-travel-map", "data/places.json")["places"]
    trips = src.json("my-travel-map", "data/trips.json")["trips"]
    aliases = {k: v for k, v in src.json("my-travel-map", "data/place_aliases.json").items()
               if not k.startswith("_")}
    dests = src.json("my-travel-map", "data/destinations.json")
    dests = {d["place"]: d for d in (dests["destinations"] if isinstance(dests, dict) else dests)}
    e3 = [p["name"] for p in places if "E3" in p.get("eras", [])]
    count = {}
    for t in trips:
        if t.get("umbrella"):
            continue
        names = [aliases.get(c.strip(), c.strip()) for c in t.get("cities", [])]
        if str(t.get("citiesFrom", "")).startswith("gmaps_saved"):
            names = e3
        names += [aliases.get(x.strip(), x.strip()) for x in t.get("places", [])]
        for c in names:
            count[c] = count.get(c, 0) + 1
    out = []
    for p in places:
        if p.get("level") == "poi":
            continue
        d = dests.get(p["name"], {})
        out.append({"place": p["name"], "name": d.get("name") or p["name"], "enName": d.get("enName", ""),
                    "country": p.get("country") or d.get("country") or "", "visits": count.get(p["name"], 0),
                    "lat": p.get("lat"), "lng": p.get("lng"),
                    "cover": d.get("cover", ""), "intro": d.get("intro", ""), "url": d.get("url", "")})
    # 여행 지도 gallery() 와 같은 순서: 많이 간 곳 → 사진 있는 곳 → 이름
    out.sort(key=lambda c: (-c["visits"], not c["cover"], c["name"]))
    write("cities.json", {"cities": out})
    pins = [{"name": c["name"], "lat": c["lat"], "lng": c["lng"], "visits": c["visits"]}
            for c in out if c["lat"] is not None and c["lng"] is not None]
    write("globe_pins.json", {"pins": pins})


def world_land(src):
    write("world_land.json", src.json("my-travel-map", "data/world_land.json"), indent=None)


def read_date(s):
    m = re.match(r"(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})", s or "")
    return f"{m[1]}-{int(m[2]):02d}-{int(m[3]):02d}" if m else ""


def books_top20(src):
    books = src.json("mybookshelf", "data/books.json")["books"]
    dated = sorted((b for b in books if read_date(b.get("firstReadDate"))),
                   key=lambda b: read_date(b["firstReadDate"]), reverse=True)
    COVERS.mkdir(parents=True, exist_ok=True)
    out = []
    for b in dated:
        if len(out) == 20:
            break
        stem = re.sub(r"\s+", "_", b["title"].strip())
        cover = ""
        try:
            img = src.read("mybookshelf", f"data/book_info/{stem}.jpg")
            cover = f"assets/books/{len(out):02d}.jpg"
            (ROOT / cover).write_bytes(img)
        except Exception:
            pass
        out.append({"title": b["title"], "author": b.get("author") or "",
                    "read": read_date(b["firstReadDate"]), "cover": cover})
    out = blog_books(out) + out
    write("books_top20.json", {"books": out[:20]})


def blog_books(shelf):
    """서재에 아직 없는 RSS의 [독서노트] 글을 맨 앞에 끼운다."""
    have = {re.sub(r"\s", "", b["title"]) for b in shelf}
    new = []
    for it in ET.fromstring(fetch(RSS)).iter("item"):
        t = it.findtext("title") or ""
        if "독서노트" not in t:
            continue
        m = re.search(r"『(.+?)』", t)
        name = m[1] if m else re.sub(r"#\S+|\[독서노트\]", "", t).strip()
        if re.sub(r"\s", "", name) in have:
            continue
        d = email.utils.parsedate_to_datetime(it.findtext("pubDate")).date()
        new.append({"title": name, "author": "", "read": d.isoformat(), "cover": "",
                    "url": (it.findtext("link") or "").split("?")[0]})
    return new


def blog_latest(_src):
    root = ET.fromstring(fetch(RSS))
    items = []
    for it in root.iter("item"):
        link = (it.findtext("link") or "").split("?")[0]
        desc = re.sub(r"<[^>]+>", " ", it.findtext("description") or "")
        items.append({"title": (it.findtext("title") or "").strip(),
                      "category": (it.findtext("category") or "").strip(),
                      "date": it.findtext("pubDate") or "",
                      "summary": re.sub(r"\s+", " ", desc).strip()[:140],
                      "url": link})
        if len(items) == 12:
            break
    write("blog_latest.json", {"posts": items})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", help="형제 저장소들을 클론해 둔 폴더")
    args = ap.parse_args()
    src = Source(args.local)
    failed = 0
    for job in (timeline, cities, world_land, books_top20, blog_latest):
        try:
            job(src)
        except Exception as e:  # 한 출처가 실패해도 지난번 파일을 두고 계속한다
            failed += 1
            print(f"  ! {job.__name__}: {e}", file=sys.stderr)
    sys.exit(1 if failed == 5 else 0)


if __name__ == "__main__":
    main()
