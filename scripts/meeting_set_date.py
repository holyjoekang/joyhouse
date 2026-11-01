"""미팅 날짜를 바꾸고 파일명(id)도 맞춘다. 날짜는 YYYY-MM-DD 또는 일자를 모르면 YYYY-MM.

    python scripts/meeting_set_date.py 2026-10-31-negotiation-ai-funding 2026-05
    python scripts/build_meetings.py
"""
import json, re, sys
from pathlib import Path

M = Path(__file__).resolve().parent.parent / "content/meetings"
old, date = sys.argv[1], sys.argv[2]
assert re.fullmatch(r"\d{4}-\d{2}(-\d{2})?", date), date
f = M / f"{old}.json"
d = json.loads(f.read_text(encoding="utf-8"))
slug = re.sub(r"^\d{4}-\d{2}(-\d{2})?-", "", old)
d["date"], d["id"] = date, f"{date}-{slug}"
(M / f"{d['id']}.json").write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
if d["id"] != old:
    f.unlink()
print(f"  content/meetings/{d['id']}.json")
