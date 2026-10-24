"""컨설팅 룸(헬라코리아)의 자료를 모아 암호로 잠근 data/hella/vault.json 을 만든다.

    python scripts/build_hella_vault.py                    # GitHub(AI-Apps master)에서 읽는다 (CI 기본)
    python scripts/build_hella_vault.py --local ../AI-Apps # 클론해 둔 AI-Apps에서 읽는다

암호는 환경변수 HELLA_PASSWORD (없으면 초기값 88888888).
암호를 바꾸려면 joyhouse 저장소 Secrets 의 HELLA_PASSWORD 를 바꾸고 워크플로를 다시 돌린다.
원천 저장소를 비공개로 옮기면 HELLA_SRC_TOKEN(읽기 권한 토큰)을 Secrets에 넣는다.

AES-256-GCM, 키는 PBKDF2-SHA256(250,000회)로 만든다. 브라우저는 WebCrypto로 같은 방식으로 푼다.
"""
import argparse
import base64
import json
import os
import secrets
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "hella" / "vault.json"
REPO, BRANCH = "holyjoekang/AI-Apps", "master"
BASE = "databank/5. AI Use case/hella-korea"
ITER = 250_000
DATA = ["profile", "online", "pipeline", "kpis", "assumptions", "decisions", "signals"]
# 사이트의 '리포트' 탭에 늘 싣는 문서 (주간·월간 리포트는 ops/reports/index.json 에서 더한다)
FIXED = [
    ("integrated", "report", "통합 권고안 — 헬라코리아 신사업 개발", "ops/reports/통합권고안_헬라코리아 신사업 개발.md"),
    ("claude", "research", "Claude 딥리서치 — 중국 소싱 품목 선정", "china-sourcing-2026-10/최종보고서_헬라코리아 중국 소싱 품목 선정.md"),
    ("google", "research", "Google 딥리서치 — OEM 소싱·트럭온 전략", "china-sourcing-2026-10/구글딥리서치_헬라코리아 중국 OEM 소싱 및 트럭온 전략 보고서.md"),
    ("review", "research", "검토보고서 — Claude vs Google 비교", "china-sourcing-2026-10/검토보고서_클로드 조사 vs 딥리서치 비교.md"),
    ("method", "method", "운영 방법론 · 에이전트", "ops/agents/README.md"),
]


class Source:
    def __init__(self, local):
        self.local = Path(local) if local else None
        self.token = os.environ.get("HELLA_SRC_TOKEN")

    def read(self, rel):
        if self.local:
            return (self.local / BASE / rel).read_bytes()
        path = urllib.parse.quote(f"{BASE}/{rel}")
        if self.token:  # 비공개 저장소: contents API
            req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/contents/{path}?ref={BRANCH}",
                                         headers={"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github.raw"})
        else:
            req = urllib.request.Request(f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{path}",
                                         headers={"User-Agent": "joyhouse-sync"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()

    def text(self, rel):
        return self.read(rel).decode("utf-8")

    def json(self, rel):
        return json.loads(self.read(rel))


def collect(src):
    bundle = {"built": datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M KST")}
    for name in DATA:
        try:
            bundle[name] = src.json(f"ops/data/{name}.json")
        except Exception as e:
            print(f"  ! {name}: {e}", file=sys.stderr)
            bundle[name] = None
    reports = []
    for rid, kind, title, rel in FIXED:
        try:
            reports.append({"id": rid, "type": kind, "title": title, "date": "", "md": src.text(rel)})
        except Exception as e:
            print(f"  ! {rel}: {e}", file=sys.stderr)
    try:
        index = src.json("ops/reports/index.json")
    except Exception:
        index = []
    for r in sorted(index, key=lambda r: r.get("date", ""), reverse=True):
        if r.get("type") not in ("weekly", "monthly"):
            continue
        try:
            reports.append({**{k: r.get(k, "") for k in ("id", "type", "title", "date")}, "md": src.text(r["path"])})
        except Exception as e:
            print(f"  ! {r.get('path')}: {e}", file=sys.stderr)
    bundle["reports"] = reports
    return bundle


def seal(obj, password):
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(password.encode())
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), None)
    b64 = lambda b: base64.b64encode(b).decode()
    return {"v": 1, "kdf": "PBKDF2-SHA256", "iter": ITER, "salt": b64(salt), "iv": b64(iv), "ct": b64(ct)}


def unseal(vault, password):
    raw = lambda k: base64.b64decode(vault[k])
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=raw("salt"), iterations=vault["iter"]).derive(password.encode())
    return json.loads(AESGCM(key).decrypt(raw("iv"), raw("ct"), None))


def unchanged(bundle, password):
    """내용도 암호도 그대로면 매일 새 커밋이 생기지 않게 지난 파일을 둔다."""
    try:
        old = unseal(json.loads(OUT.read_text(encoding="utf-8")), password)
    except Exception:
        return False
    strip = lambda b: {k: v for k, v in b.items() if k != "built"}
    return strip(old) == strip(bundle)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", help="AI-Apps 클론 경로")
    args = ap.parse_args()
    bundle = collect(Source(args.local))
    if not bundle.get("profile"):
        sys.exit("profile.json 을 읽지 못해 지난 vault 를 그대로 둔다")
    password = os.environ.get("HELLA_PASSWORD") or "88888888"
    if unchanged(bundle, password):
        print("  data/hella/vault.json  (바뀐 내용 없음)")
        return
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seal(bundle, password)) + "\n", encoding="utf-8")
    print(f"  data/hella/vault.json  (리포트 {len(bundle['reports'])}건)")


if __name__ == "__main__":
    main()
