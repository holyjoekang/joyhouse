"""형제 저장소와 블로그 RSS에서 집이 쓸 파생 데이터를 만든다.

    python scripts/sync_sources.py              # GitHub raw에서 읽는다 (CI 기본)
    python scripts/sync_sources.py --local ..   # 옆에 클론해 둔 저장소에서 읽는다

만드는 파일 (data/):
    timeline.json     사우스 론 이정표  ← my-travel-map data/trips.json 의 eras
    globe_pins.json   맵룸 지구본 핀     ← my-travel-map 여정이 들른 도시 좌표
    world_land.json   맵룸 지구본 육지   ← my-travel-map data/world_land.json 그대로
    books_top20.json  블루룸 책장 앞면   ← mybookshelf 최근 읽은 책 20권 (+ assets/books/ 표지)
    blog_latest.json  레드룸 가판대     ← 네이버 블로그 RSS 최신 글 12편

파이썬 3.10+, 표준 라이브러리만 쓴다. 한 출처가 실패해도 나머지는 만든다.
"""
import argparse
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


def globe_pins(src):
    trips = src.json("my-travel-map", "data/trips.json")["trips"]
    coords = src.json("my-travel-map", "data/place_coords.json")
    count = {}
    for t in trips:
        for c in t.get("cities", []):
            if c in coords and isinstance(coords[c], list):
                count[c] = count.get(c, 0) + 1
    pins = [{"name": c, "lat": coords[c][0], "lng": coords[c][1], "visits": n}
            for c, n in sorted(count.items(), key=lambda kv: -kv[1])]
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
    write("books_top20.json", {"books": out})


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
    for job in (timeline, globe_pins, world_land, books_top20, blog_latest):
        try:
            job(src)
        except Exception as e:  # 한 출처가 실패해도 지난번 파일을 두고 계속한다
            failed += 1
            print(f"  ! {job.__name__}: {e}", file=sys.stderr)
    sys.exit(1 if failed == 5 else 0)


if __name__ == "__main__":
    main()
