"""블루룸 책 표지 주소에 내용 해시를 붙여, 같은 자리 번호(00.jpg …)에 새 표지가 들어와도 브라우저가 옛 그림을 쓰지 않게 한다.
scripts/sync_sources.py 를 고치고, 지금 data/books_top20.json 의 주소도 바로 맞춘다. 다시 돌려도 같은 결과."""
import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
s = ROOT / "scripts/sync_sources.py"
t = s.read_text(encoding="utf-8")
old = '''            cover = f"assets/books/{len(out):02d}.jpg"
            (ROOT / cover).write_bytes(img)'''
new = '''            path = f"assets/books/{len(out):02d}.jpg"
            (ROOT / path).write_bytes(img)
            cover = f"{path}?v={hashlib.md5(img).hexdigest()[:8]}"   # 자리 번호가 같아도 새 표지면 주소가 바뀐다'''
if new not in t:
    assert t.count(old) == 1
    t = t.replace(old, new).replace("import email.utils\n", "import email.utils\nimport hashlib\n", 1)
    s.write_text(t, encoding="utf-8")

d = ROOT / "data/books_top20.json"
data = json.loads(d.read_text(encoding="utf-8"))
for b in data["books"]:
    p = (b.get("cover") or "").split("?")[0]
    if p and (ROOT / p).exists():
        b["cover"] = f"{p}?v={hashlib.md5((ROOT / p).read_bytes()).hexdigest()[:8]}"
d.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("표지 주소:", ", ".join(b["cover"].split("/")[-1] for b in data["books"][:3]))
