"""Keep121 모두의 창업 멘토링 회차 기록을 Joyhouse '현장 미팅 기록' 형식으로 옮긴다.

    python scripts/import_keep121_session.py ../keep121/content/modoo/sessions/01.json
    python scripts/build_meetings.py

- 결과: content/meetings/<날짜>-keep121-mentoring-<회차>.json (다시 돌리면 덮어씀)
- 공개 쪽이므로 사람 실명은 이니셜로 바꾼다 (NAMES)
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMES = {"이광일": "L", "조부연": "J", "강신조": "본인"}
K = "https://holyjoekang.github.io/keep121/"

src = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "keep121/content/modoo/sessions/01.json")
raw = src.read_text(encoding="utf-8")
for a, b in NAMES.items():
    raw = raw.replace(a, b)
s = json.loads(raw)
n, plan, pr = s["n"], s["plan"], s["prompt"]

sections = [
    {"title": "진행 과정과 검토 자료", "time": "", "blocks": [
        {"steps": s["process"]},
        {"cards": [[pr["title"], pr["text"], f"{K}{s.get('page', 'modoo.html')}#prompt"],
                   [plan["title"], plan["meta"], f"{K}{s.get('page', 'modoo.html')}#plan"],
                   ["Keep121 모두의 창업 진행 기록", "일정 · 멘토링 · 창업활동자금 · AI 솔루션 · 사업계획서 준비 현황", f"{K}modoo.html"]]}]},
]
if s.get("notes"):
    sections.append({"title": "회의 메모", "time": s["when"], "blocks": [{"ol": s["notes"]}]})
fb = []
for i, f in enumerate(s["feedback"], 1):
    fb += [{"h": f"{i}. {f['title']}"}, {"quote": f["body"]}, {"callout": f["apply"]}]
sections.append({"title": f"멘토 피드백 {len(s['feedback'])}가지", "time": "", "blocks": fb})
if s.get("gaps"):
    sections.append({"title": "사업계획서에서 바꿀 것", "time": "", "blocks": [{"table": {"head": ["항목", "지금 (v2.0)", "멘토링 후"], "rows": s["gaps"]}}]})
if s.get("problems5"):
    sections.append({"title": "솔루션 5개에 맞춘 문제 정의 5개 (초안)", "time": "", "blocks": [{"p": s["problems5"]["lead"]}, {"table": {"head": ["문제", "누가 겪나", "대응 구성"], "rows": s["problems5"]["rows"]}}]})
if s.get("somCheck"):
    sections.append({"title": "SOM 다시 보기 — 3년 3% · 5년 5%", "time": "", "blocks": [{"p": s["somCheck"]["lead"]}, {"table": {"head": ["구분", "규모", "산출 기준"], "rows": s["somCheck"]["rows"]}}, {"note": s["somCheck"]["note"]}]})
if s.get("interviewPlan"):
    ip, b = s["interviewPlan"], [{"p": s["interviewPlan"]["lead"]}]
    for g, cnt, qs in ip["groups"]:
        b += [{"h": f"{g} · {cnt}"}, {"list": qs}]
    sections.append({"title": "실제 타겟 고객 인터뷰 계획", "time": "", "blocks": b + [{"note": ip["rule"]}]})
b = [{"quote": plan["headline"]}, {"stats": plan["kpis"]}]
for t, items in plan["sections"]:
    b += [{"h": t}, {"list": items}]
sections.append({"title": f"검토 자료 — {plan['title']}", "time": "", "blocks": b + [{"note": plan["note"]}]})
sections.append({"title": f"검토 자료 — {pr['title']}", "time": "", "blocks": [
    {"p": pr["text"]}, {"table": {"head": ["장", "제목", "작성 내용"], "rows": pr["structure"]}}, {"note": pr["caution"]}]})

m = {
    "id": f"{s['date']}-keep121-mentoring-{n}",
    "date": s["date"],
    "title": f"Keep121 모두의 창업 멘토링 {n}회차 — {s['title']}",
    "basis": "회의 메모 기준 · 주제별 정리",
    "duration": s["when"].split(" ", 1)[-1] if " " in s["when"] else "",
    "counterpart": s["mentor"],
    "tags": ["모두의 창업", "Keep121", "사업계획서", "PSST", "고객 인터뷰", "시장 규모"],
    "participants": [["멘토", s["mentor"]], ["멘티", "본인 · Keep121 대표 (모두의 창업 2기 1라운드)"]],
    "intro": [s["summary"], f"Keep121 사이트의 {n}회차 상세 페이지에 같은 내용을 더 자세히 정리해 두었습니다."],
    "keyTitle": "멘토 피드백 핵심 요약",
    "keypoints": [[f["title"], f["body"]] for f in s["feedback"]],
    "sections": sections,
    "actions": [[a, f"{b} · {c}"] for a, b, c in s.get("actions", [])],
}
out = ROOT / "content/meetings" / f"{m['id']}.json"
out.write_text(json.dumps(m, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"  {out.relative_to(ROOT)}")
