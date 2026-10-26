"""컨설팅 룸(카페뮤제오)의 자료를 모아 암호로 잠근 data/museo/vault.json 을 만든다.

    python scripts/build_museo_vault.py                    # ../AI-Apps 클론에서 읽는다
    python scripts/build_museo_vault.py --local <AI-Apps>  # 다른 경로의 클론에서 읽는다

암호는 환경변수 MUSEO_PASSWORD, 없으면 private/museo_password.txt (git에 올라가지 않는 파일) 에서 읽는다.
원천: AI-Apps/databank/5. AI Use case/caffemuseo/ax-workshop (site.json 이 쪽 구성, 나머지는 워크숍 산출물 그대로)
암호화 방식은 build_hella_vault.py 와 같다 (AES-256-GCM, PBKDF2-SHA256 250,000회).
"""
import argparse
import csv
import importlib.util
import io
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_hella_vault import seal, unseal  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "museo" / "vault.json"
BASE = "databank/5. AI Use case/caffemuseo"


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def items(text):
    """워크숍 YAML 의 '- id:' 항목에서 한 줄 값과 접힌(>-) 글을 꺼낸다. 목록 값은 건너뛴다."""
    out, cur, key, buf = [], None, None, []

    def flush():
        if cur is not None and key and buf:
            cur[key] = " ".join(buf)

    for line in text.splitlines():
        m = re.match(r"^  - id: (\S+)", line)
        if m:
            flush(); key, buf = None, []
            cur = {"id": m.group(1)}; out.append(cur); continue
        if cur is None:
            continue
        if re.match(r"^\S", line):  # 최상위 키(conflicts 등)가 나오면 목록 끝
            flush(); break
        m = re.match(r"^    (\w+):\s*(.*)$", line)
        if m:
            flush(); key, buf = m.group(1), []
            v = m.group(2).strip()
            if v and v not in (">-", "|", ">"):
                cur[key] = v.strip('"'); key = None
            continue
        if key and line.startswith("      ") and not line.strip().startswith("- "):
            buf.append(line.strip())
    flush()
    return out


def roster(ws):
    spec = importlib.util.spec_from_file_location("museo_agents", ws / "build_agents.py")
    mod = importlib.util.module_from_spec(spec)
    sys.stdout, old = io.StringIO(), sys.stdout
    try:
        spec.loader.exec_module(mod)
    finally:
        sys.stdout = old
    return [{"slug": s, "name": n, "tier": t, "model": m, "situation": sit, "extra": ex}
            for s, n, t, m, sit, ex in mod.ROSTER]


def collect(src):
    base = src / BASE
    ws = base / "ax-workshop"
    site = json.loads((ws / "site.json").read_text(encoding="utf-8"))
    agents = roster(ws)
    names = {a["slug"]: a["name"] for a in agents}
    names["ceo"] = "대표"

    fin = {r["id"]: r for r in rows(ws / "4_scores" / "finance_valuation.csv")}
    detail = {c["id"]: c for c in items((ws / "2_candidates_v2.yaml").read_text(encoding="utf-8"))}
    track_a = []
    for r in rows(ws / "4_scores.csv"):
        f, d = fin.get(r["id"], {}), detail.get(r["id"], {})
        track_a.append({**{k: r[k] for k in ("rank", "id", "title", "ai_level", "imputed")},
                        "owner": names.get(r["owner"], r["owner"]),
                        "total": float(r["total"]),
                        "scores": {k: float(r[k]) for k in ("value", "feasibility", "acceptance", "strategy", "risk")},
                        "benefit": f.get("annual_benefit_manwon", ""), "run_cost": f.get("annual_run_cost_manwon", ""),
                        "stage1": d.get("stage1_scope", ""), "stage2": d.get("stage2_ai_option", ""),
                        "weeks": d.get("build_weeks", "")})

    gfin = {r["id"]: r for r in rows(ws / "4b_scores" / "finance_valuation.csv")}
    gdetail = {c["id"]: c for c in items((ws / "2b_growth_candidates.yaml").read_text(encoding="utf-8"))}
    track_b = []
    for r in rows(ws / "4b_scores.csv"):
        f, d = gfin.get(r["id"], {}), gdetail.get(r["id"], {})
        track_b.append({**{k: r[k] for k in ("rank", "id", "title", "ai_level")},
                        "owner": names.get(r["owner"], r["owner"]),
                        "total": float(r["total"]),
                        "scores": {k: float(r[k]) for k in ("value", "feasibility", "acceptance", "strategy", "risk")},
                        "expected": f.get("expected_annual_profit_manwon", ""), "prob": f.get("success_probability", ""),
                        "lever": d.get("growth_lever", ""), "build": d.get("what_to_build", ""),
                        "why_ai": d.get("why_ai_here", ""), "test": d.get("smallest_test", ""),
                        "kill": d.get("kill_criteria", "")})

    docs = []
    for did, title, rel in site.pop("docs"):
        try:
            docs.append({"id": did, "title": title, "md": (base / rel).read_text(encoding="utf-8")})
        except OSError as e:
            print(f"  ! {rel}: {e}", file=sys.stderr)

    return {"built": datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M KST"),
            "site": site, "agents": agents, "trackA": track_a, "trackB": track_b, "docs": docs}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", default=str(ROOT.parent / "AI-Apps"), help="AI-Apps 클론 경로")
    bundle = collect(Path(ap.parse_args().local))
    pw_file = ROOT / "private" / "museo_password.txt"
    password = os.environ.get("MUSEO_PASSWORD") or (pw_file.read_text(encoding="utf-8").strip() if pw_file.exists() else "")
    if not password:
        sys.exit("암호가 없습니다: MUSEO_PASSWORD 환경변수나 private/museo_password.txt 를 두세요")
    try:
        old = unseal(json.loads(OUT.read_text(encoding="utf-8")), password)
        if {k: v for k, v in old.items() if k != "built"} == {k: v for k, v in bundle.items() if k != "built"}:
            print("  data/museo/vault.json  (바뀐 내용 없음)")
            return
    except Exception:
        pass
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(seal(bundle, password)) + "\n", encoding="utf-8")
    print(f"  data/museo/vault.json  (과제 {len(bundle['trackA'])}+{len(bundle['trackB'])}, 에이전트 {len(bundle['agents'])}, 문서 {len(bundle['docs'])})")


if __name__ == "__main__":
    main()
