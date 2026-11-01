"""미팅 기록에서 멘티 회사·제품·파트너 실명을 익명으로 바꾼다. 다시 돌려도 안전.

    python scripts/meetings_anonymize.py && python scripts/build_meetings.py

- RENAME: 파일(id) 이름 바꾸기   - SUBS: 본문 치환 (긴 표현부터)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
M = ROOT / "content/meetings"
RENAME = {"2026-10-31-negomate-funding": "2026-10-31-negotiation-ai-funding"}
SUBS = [
    ("협상 AI 스타트업 NegoMate · P 대표", "협상 AI 스타트업 A사 · P 대표"),
    ("협상 컨설턴트가 직접 만든 협상 전용 AI 'NegoMate'의 대표", "협상 컨설턴트가 직접 만든 협상 전용 AI 스타트업 A사의 대표"),
    ("NegoMate AI — 무엇을 하는 제품인가", "A사 협상 AI — 무엇을 하는 제품인가"),
    ("NegoMate AI 자금·투자 유치 1:1 멘토링", "협상 AI 스타트업 자금·투자 유치 1:1 멘토링"),
    ("NegoMate P 대표", "A사 P 대표"),
    ("그들이 NegoMate로", "그들이 A사 제품으로"),
    ("멘티 회사의 미공개 재무·이력 정보는 이 기록에서 뺐고, 대표 이름은 이니셜로 적었습니다.", "멘티 회사와 제품, 파트너 이름은 익명으로, 대표 이름은 이니셜로 적었고 미공개 재무·이력 정보는 뺐습니다."),
    ("'네버 메이트'→NegoMate", "제품명"),
    ("'대류·대령'→대륜, ", ""),
    ("대한한의사협회: 교통사고", "한의계 직능단체: 교통사고"),
    ("법무법인 대륜: 시연 후", "대형 법무법인 D: 시연 후"),
    ("KPMG AI 담당 임원", "글로벌 회계·컨설팅펌 K의 AI 담당 임원"),
    ("딜로이트 미국인 임원", "글로벌 회계·컨설팅펌 L의 미국인 임원"),
    ("로펌(대륜 MOU)", "로펌(MOU 논의 중인 D)"),
    ("NegoMate", "A사"),
]
for old, new in RENAME.items():
    if (M / f"{old}.json").exists():
        (M / f"{old}.json").rename(M / f"{new}.json")
for f in M.glob("*.json"):
    t = o = f.read_text(encoding="utf-8")
    for a, b in SUBS:
        t = t.replace(a, b)
    d = json.loads(t)
    if d["id"] != f.stem:
        d["id"] = f.stem
        t = json.dumps(d, ensure_ascii=False, indent=2) + "\n"
    if t != o:
        f.write_text(t, encoding="utf-8")
        print(f"  {f.relative_to(ROOT)}")
