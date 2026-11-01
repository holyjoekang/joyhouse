"""미팅 기록의 실명을 이니셜로, 개인 일정(희망퇴직 날짜)을 지운다. 다시 돌려도 안전.

    python scripts/meetings_redact.py && python scripts/build_meetings.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUBS = [
    ("전화성 대표", "J 대표"),
    ("김대홍 대표", "K 대표"),
    ('"2027년 8월경 희망퇴직 목표"', '"희망퇴직 후 활동 준비"'),
    ("2027년 8월경 희망퇴직을 목표로", "희망퇴직을 염두에 두고"),
]
for f in sorted((ROOT / "content" / "meetings").glob("*.json")):
    t = o = f.read_text(encoding="utf-8")
    for a, b in SUBS:
        t = t.replace(a, b)
    if t != o:
        f.write_text(t, encoding="utf-8")
        print(f"  {f.relative_to(ROOT)}")
