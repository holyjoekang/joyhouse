"""맵룸 '다녀간 도시' 지도를 구글 지도로 바꾼다 — 여행 지도(my-travel-map)와 같이 베이징에서 시작한다.

키는 이 저장소에 두지 않는다. my-travel-map 이 배포 때 함께 내놓는 maps.json 에서 읽고,
키가 없거나 구글이 받아 주지 않으면 예전 등장방형 그림을 그대로 그린다. 여러 번 돌려도 한 번만 바뀐다.

    python scripts/google_map.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "assets/site/site.js"
CSS = ROOT / "assets/site/site.css"

START = "// 등장방형 투영."
END = "\nR.pins = "

NEW_JS = r"""// 등장방형 투영. 남극 아래와 북극 위는 잘라 낸다.
const project = ([lng, lat]) => [(lng + 180).toFixed(1), (85 - lat).toFixed(1)];
const svgMap = async (el, cities) => {
  const { countries } = await json("data/world_land.json");
  const land = countries.map(c => c.rings.map(r => "M" + r.map(p => project(p).join(",")).join("L") + "Z").join("")).join("");
  const dots = cities.filter(c => c.lat != null && c.lng != null).map(c => {
    const [x, y] = project([c.lng, c.lat]);
    return `<circle class="pin" cx="${x}" cy="${y}" r="${(1.1 + Math.sqrt(c.visits) * .7).toFixed(2)}"><title>${esc(c.name)}${c.visits ? ` · ${c.visits}번` : ""}</title></circle>`;
  }).join("");
  el.innerHTML = `<svg viewBox="0 0 360 145" role="img" aria-label="다녀간 도시 ${cities.length}곳 지도"><path class="land" d="${land}"/>${dots}</svg>`;
};

// 구글 지도 — 여행 지도와 같이 베이징에서 시작한다. 키는 여행 지도가 배포 때 내놓는 maps.json 에서 읽는다
// (이 저장소에는 키가 없다). 키가 없거나 구글이 받아 주지 않으면 위의 그림 지도로 돌아간다.
const MAPS_JSON = "https://holyjoekang.github.io/my-travel-map/maps.json";
const BEIJING = { lat: 39.9042, lng: 116.4074 };
let gmapsLoading = null;
const loadGoogleMaps = key => window.google?.maps ? Promise.resolve() : (gmapsLoading ||= new Promise((ok, fail) => {
  window.__gmapsReady = ok;          // loading=async 는 onload 가 아니라 callback 으로 준비를 알린다
  const s = document.createElement("script");
  s.async = true;
  s.onerror = fail;
  s.src = `https://maps.googleapis.com/maps/api/js?loading=async&language=ko&callback=__gmapsReady&key=${encodeURIComponent(key)}`;
  document.head.append(s);
}));
// 도시 목록은 여행 지도의 '여행지' 쪽과 같은 것(data/cities.json, 같은 순서·같은 횟수)이다.
R.map = async el => {
  const { cities } = await json("data/cities.json");
  try {
    const { googleMapsKey: key } = await fetch(MAPS_JSON, { cache: "no-cache" }).then(r => r.json());
    if (!key) throw new Error("no key");
    window.gm_authFailure = () => svgMap(el, cities);   // 키가 이 주소를 막으면 구글이 부른다
    await loadGoogleMaps(key);
    el.innerHTML = `<div class="gmap" role="region" aria-label="다녀간 도시 ${cities.length}곳 지도"></div>`;
    const map = new google.maps.Map(el.firstElementChild, {
      center: BEIJING, zoom: 5, mapTypeControl: false, streetViewControl: false,
      fullscreenControl: true, backgroundColor: "#0f1a33",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#a9b8d6" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a33" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a33" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3c4f7a" }] },
        { featureType: "road", stylers: [{ visibility: "off" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    for (const c of cities) {
      if (c.lat == null || c.lng == null) continue;
      new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng }, map,
        title: c.name + (c.visits ? ` · ${c.visits}번` : ""),
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4 + Math.min(Math.sqrt(c.visits || 1) * 1.6, 8),
                fillColor: "#f2c46b", fillOpacity: .92, strokeColor: "#fff", strokeWeight: 1 },
      });
    }
  } catch {
    await svgMap(el, cities);
  }
};
"""

CSS_ADD = """.map-box .gmap { width: 100%; aspect-ratio: 16 / 9; min-height: 320px; border-radius: 10px; overflow: hidden; }
@media (max-width: 700px) { .map-box .gmap { aspect-ratio: 4 / 5; } }
"""


def main():
    js = JS.read_text(encoding="utf-8")
    if "MAPS_JSON" not in js:
        a, b = js.index(START), js.index(END)
        JS.write_text(js[:a] + NEW_JS + js[b:], encoding="utf-8")

    css = CSS.read_text(encoding="utf-8")
    if ".map-box .gmap" not in css:
        anchor = ".map-box .pin:hover { fill: #ff7a59; }\n"
        CSS.write_text(css.replace(anchor, anchor + CSS_ADD, 1), encoding="utf-8")
    print("ok")


if __name__ == "__main__":
    main()
