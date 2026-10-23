"""블루룸 표지 파일 이름을 mybookshelf 와 같은 규칙으로 찾는다(한 번만, 다시 돌려도 같은 결과).
예전 규칙은 빈칸만 '_'로 바꿔서, 쉼표·물음표·물결표가 든 제목(『바로바로 클로드 with 코워크, …』)의 표지를 못 찾았다."""
from pathlib import Path

p = Path(__file__).resolve().parent / "sync_sources.py"
t = p.read_text(encoding="utf-8")
old = '        stem = re.sub(r"\\s+", "_", b["title"].strip())'
new = '        stem = re.sub(r"[^\\w가-힣]+", "_", b["title"]).strip("_")   # mybookshelf book_info.slug 와 같은 규칙'
if new not in t:
    assert t.count(old) == 1
    p.write_text(t.replace(old, new), encoding="utf-8")
print("표지 이름 규칙 맞춤")
