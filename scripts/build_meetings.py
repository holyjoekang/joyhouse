"""멘토링 쪽 '미팅 기록'의 데이터 data/mentoring/meetings.json 을 만든다.

    python scripts/build_meetings.py

원천: content/meetings/*.json  (미팅 1건 = 파일 1개, 파일명 YYYY-MM-DD-슬러그.json)
새 미팅은 같은 형식의 파일을 추가하고 이 스크립트를 다시 돌리면 된다.

필드
  id date title basis duration counterpart tags[] participants[[이름,설명]]
  intro[] keypoints[[제목,본문]]
  sections[{title,time,blocks[]}]  블록: h p note callout quote list ol checks
                                         table{head,rows} stats[[값,설명]] flow[[제목,설명]]
                                         steps[[제목,설명]] cards[[제목,본문,링크?]]
  opportunities{items[[사업기회,고객,수익모델,난이도]],note,priority[]}
  actions[[과제,설명]]  verify{items[[항목,주장,확인]],note}
  conclusion{lead,paras[],meeting_points[[제목,본문]],link,message,closing}
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "meetings"
OUT = ROOT / "data" / "mentoring" / "meetings.json"
REQ = ["id", "date", "title", "sections"]
BLOCKS = {"h", "p", "note", "callout", "quote", "list", "ol", "checks", "table", "stats", "flow", "steps", "cards"}


def check(m, f):
    miss = [k for k in REQ if not m.get(k)]
    if miss:
        raise SystemExit(f"{f.name}: 필수 필드 없음 {miss}")
    if m["id"] != f.stem:
        raise SystemExit(f"{f.name}: id 가 파일명과 다름 ({m['id']})")
    for s in m["sections"]:
        for b in s["blocks"]:
            bad = set(b) - BLOCKS
            if bad:
                raise SystemExit(f"{f.name}: 모르는 블록 {bad} ({s['title']})")


def main():
    meetings = []
    for f in sorted(SRC.glob("*.json")):
        m = json.loads(f.read_text(encoding="utf-8"))
        check(m, f)
        meetings.append(m)
    meetings.sort(key=lambda m: m["date"], reverse=True)
    data = {"count": len(meetings), "meetings": meetings}
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == text:
        print("  data/mentoring/meetings.json  (바뀐 내용 없음)")
        return
    OUT.write_text(text, encoding="utf-8")
    print(f"  data/mentoring/meetings.json  (미팅 {len(meetings)}건)")


if __name__ == "__main__":
    main()
