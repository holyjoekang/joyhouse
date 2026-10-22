"""3d.html 남서쪽(미니맵 왼쪽 아래)에 개울과 산책로를 놓는다. 여러 번 돌려도 같은 결과."""
import json, pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "src/world"

def patch(path, old, new):
    t = path.read_text()
    if new in t: return
    assert t.count(old) == 1, f"{path.name}: anchor not found: {old[:40]}"
    path.write_text(t.replace(old, new))

shutil.copy(ROOT / "scripts/assets/stream.js", W / "stream.js")
patch(W / "pond.js", "\nfunction rippleNormal()", "\nexport function rippleNormal()")
s = W / "site.js"
patch(s, "import { buildPond, toriStatue } from './pond.js';",
      "import { buildPond, toriStatue } from './pond.js';\nimport { buildStream } from './stream.js';")
patch(s, "  plantTrees(scene, [...spots, ...plantLater], blocks);",
      "  const stream = buildStream(scene, { blocks, clickables, lights, phone, plant: s => plantLater.push(s) });\n"
      "  tickers.push(stream.tick);\n"
      "  plantTrees(scene, [...spots, ...plantLater], blocks);")
patch(s, "  tickers.push(grassField(scene, [{ x0: -34, x1: 34, z0: -54, z1: -1 }], phone ? 16000 : 70000, avoid));",
      "  tickers.push(grassField(scene, [{ x0: -34, x1: 34, z0: -54, z1: -1 }], phone ? 16000 : 70000, avoid));\n"
      "  tickers.push(grassField(scene, [stream.grass.area], phone ? 8000 : 30000, stream.grass.avoid));")
m = ROOT / "src/main.js"
patch(m, "import { createAtmosphere } from './world/atmosphere.js';",
      "import { createAtmosphere } from './world/atmosphere.js';\nimport { STREAM_SPOT } from './world/stream.js';")
patch(m, "    if (id === 'bukchon')", "    if (id === 'stream') return walker.go(...STREAM_SPOT, 0);\n    if (id === 'bukchon')")

h = ROOT / "content/house.json"
farm = '"box": [110, 196, 222, -4]}'
patch(h, farm + "\n ]", farm + ',\n  {"id": "stream", "name": "개울길", "sub": "물소리 따라 걷는 산책로", "box": [-95, 200, 60, 50]}\n ]')
json.loads(h.read_text())
print("stream added")
