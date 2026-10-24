"""홈 방 소개에 '이 집을 지은 방법' 카드를 더하고, 비전룸 뿌리 문장을 고친다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/home_making_card.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CARD = {"href": "making.html", "img": "assets/photos/laptop-dark.webp", "kicker": "Oval Office · How it was built",
        "title": "이 집을 지은 방법", "text": "AI와 대화로 지은 절차·방법, 그리고 강의·개인·중소기업 사이트로 넓힐 계획.", "size": ""}

OLD = "부모님 품에서 자라고, 심리학을 공부하며 사람을 이해하는 눈을 길렀습니다."
NEW = "부모님 품에서 자라고, 초중고·대학 교육과 군 생활을 통해 사람을 이해하는 눈을 길렀습니다."


def main():
    p = ROOT / "content/pages.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    if not any(r["href"] == CARD["href"] for r in d["rooms"]):
        at = next(i for i, r in enumerate(d["rooms"]) if r["href"] == "studio.html") + 1
        d["rooms"].insert(at, CARD)
        p.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    for f in ["content/vision.json", "scripts/vision_third30.py"]:
        t = (ROOT / f).read_text(encoding="utf-8")
        (ROOT / f).write_text(t.replace(OLD, NEW), encoding="utf-8")
    print("ok")


if __name__ == "__main__":
    main()
