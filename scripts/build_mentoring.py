"""스타트업 멘토링 방법론 쪽의 데이터 data/mentoring/mentoring.json 을 만든다 (공개, 암호 없음).

    python scripts/build_mentoring.py                    # ../AI-Apps 클론에서 읽는다
    python scripts/build_mentoring.py --local <AI-Apps>

원천: AI-Apps/databank/7. 스타트업, 창업준비/startup-mentoring
  site.json            쪽 구성 (방법론을 구조화한 것)
  agents/stage-*.json  단계별 대표 이슈 시뮬레이션 (에이전트)
  agents/track-*.json  교차 트랙 (B2B·PoC, 멘토링 운영)
  01_멘토링_방법론.md   방법론 원문
"""
import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "mentoring" / "mentoring.json"
BASE = "databank/7. 스타트업, 창업준비/startup-mentoring"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", default=str(ROOT.parent / "AI-Apps"), help="AI-Apps 클론 경로")
    src = Path(ap.parse_args().local) / BASE
    load = lambda p: json.loads(p.read_text(encoding="utf-8"))
    data = {
        "built": datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d"),
        "site": load(src / "site.json"),
        "stages": [load(p) for p in sorted((src / "agents").glob("stage-S*.json"))],
        "tracks": {p.stem.removeprefix("track-"): load(p) for p in sorted((src / "agents").glob("track-*.json"))},
        "doc": (src / "01_멘토링_방법론.md").read_text(encoding="utf-8"),
    }
    old = load(OUT) if OUT.exists() else None
    if old and {k: v for k, v in old.items() if k != "built"} == {k: v for k, v in data.items() if k != "built"}:
        print("  data/mentoring/mentoring.json  (바뀐 내용 없음)")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    n = sum(len(s["issues"]) for s in data["stages"]) + sum(len(t["issues"]) for t in data["tracks"].values())
    print(f"  data/mentoring/mentoring.json  (단계 {len(data['stages'])}, 트랙 {len(data['tracks'])}, 이슈 {n})")


if __name__ == "__main__":
    main()
