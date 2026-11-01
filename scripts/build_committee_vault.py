"""작업실 · 사업운영위원회 기록을 암호로 잠근 data/committee/vault.json 을 만든다.

    python scripts/build_committee_vault.py          # private/committee/*.json → 잠금 파일
    python scripts/build_committee_vault.py --dump   # 잠금 파일을 풀어 private/committee/ 에 원본 복원 (수정할 때)

원본은 private/committee/ (git에 올라가지 않는 폴더), 형식은 content/meetings/*.json 과 같다.
암호는 환경변수 COMMITTEE_PASSWORD, 없으면 private/committee_password.txt. 공개 저장소라 암호를 코드에 적지 않는다.
암호화는 build_hella_vault.py 와 같다 (AES-256-GCM, PBKDF2-SHA256). 화면은 assets/site/meetings.js 가 같은 방식으로 푼다.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_hella_vault import seal, unseal  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "private" / "committee"
OUT = ROOT / "data" / "committee" / "vault.json"


def password():
    pw = os.environ.get("COMMITTEE_PASSWORD") or (ROOT / "private/committee_password.txt").read_text(encoding="utf-8").strip()
    if not pw:
        raise SystemExit("암호가 없습니다 (COMMITTEE_PASSWORD 또는 private/committee_password.txt)")
    return pw


def main():
    pw = password()
    if "--dump" in sys.argv:
        SRC.mkdir(parents=True, exist_ok=True)
        for m in unseal(json.loads(OUT.read_text(encoding="utf-8")), pw)["meetings"]:
            (SRC / f"{m['id']}.json").write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"  private/committee/{m['id']}.json")
        return
    meetings = sorted((json.loads(f.read_text(encoding="utf-8")) for f in SRC.glob("*.json")), key=lambda m: m["date"], reverse=True)
    if not meetings:
        raise SystemExit("private/committee/ 에 원본이 없습니다. 수정하려면 먼저 --dump")
    data = {"count": len(meetings), "meetings": meetings}
    if OUT.exists():
        try:
            if unseal(json.loads(OUT.read_text(encoding="utf-8")), pw) == data:
                print("  data/committee/vault.json  (바뀐 내용 없음)")
                return
        except Exception:
            pass
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seal(data, pw)) + "\n", encoding="utf-8")
    print(f"  data/committee/vault.json  (기록 {len(meetings)}건, 잠금)")


if __name__ == "__main__":
    main()
