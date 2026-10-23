"""'서재에 꽂힌 책' 수를 mybookshelf 에서 받아 쓴다(한 번만 돌려 연결, 이후엔 sync_sources.py 가 매일 갱신).
- sync_sources.py: books_top20.json 에 "total"(mybookshelf 앱이 보여 주는 책 수)을 넣고, 글 속 'N권'도 맞춘다
- index.html · library.html 의 숫자 칸은 data-render="count" 로 그 값을 읽는다
다시 돌려도 같은 결과."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def patch(path, old, new, count=1):
    p = ROOT / path; t = p.read_text(encoding="utf-8")
    if new in t: return
    assert t.count(old) == count, f"{path}: {old[:50]}"
    p.write_text(t.replace(old, new), encoding="utf-8")

patch("assets/site/site.js", "  el.textContent = d[key].length;",
      "  const v = d[key];\n  el.textContent = Array.isArray(v) ? v.length : v;   // 목록이면 개수, 숫자면 그대로")
for f in ("index.html", "library.html"):
    t = (ROOT / f).read_text(encoding="utf-8")
    t2 = re.sub(r'<b>(\d+)</b><span>서재에 꽂힌 책</span>',
                r'<b data-render="count" data-src="data/books_top20.json#total">\1</b><span>서재에 꽂힌 책</span>', t)
    (ROOT / f).write_text(t2, encoding="utf-8")

S = "scripts/sync_sources.py"
patch(S, '''    out = blog_books(out) + out
    write("books_top20.json", {"books": out[:20]})''', '''    out = blog_books(out) + out
    # 서재에 꽂힌 책 수: mybookshelf 앱이 실제로 보여 주는 권수(기억으로 복원한 책 포함)
    try:
        total = len(src.json("mybookshelf", "app/data/library.json"))
    except Exception:
        total = len(books)
    write("books_top20.json", {"total": total, "books": out[:20]})
    book_total_text(total)


# 글 속 '평생 읽은 책 N권' · 메타 설명의 권수를 실제 수로 맞춘다(숫자 칸은 화면이 books_top20.json 에서 읽는다)
BOOK_TEXT = ["index.html", "library.html", "content/pages.json", "content/rooms/blueroom.json"]


def book_total_text(total):
    pat = re.compile(r"(평생 (?:읽은|읽어 온) 책 )\\d+(권)")
    for name in BOOK_TEXT:
        p = ROOT / name
        if p.exists():
            t = p.read_text(encoding="utf-8")
            t2 = pat.sub(lambda m: f"{m.group(1)}{total}{m.group(2)}", t)
            t2 = re.sub(r'(data-src="data/books_top20.json#total">)\\d+(</b>)', rf"\\g<1>{total}\\2", t2)
            if t2 != t:
                p.write_text(t2, encoding="utf-8")''')
print("서재 권수 연결 완료")
