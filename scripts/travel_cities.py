"""Public, minimal city histories derived from my-travel-map, using its alias/count rules."""
from datetime import date
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP_URL = 'https://holyjoekang.github.io/my-travel-map/'

def build(src, today=None):
    today = today or date.today().isoformat()
    places = src.json('my-travel-map', 'data/places.json')['places']
    trips = src.json('my-travel-map', 'data/trips.json')['trips']
    aliases = src.json('my-travel-map', 'data/place_aliases.json')
    landmarks = json.loads((ROOT / 'content/travel/landmarks.json').read_text())
    e3 = [p['name'] for p in places if 'E3' in p.get('eras', [])]
    histories = {}
    for t in trips:
        if t.get('umbrella'):
            continue
        names = [aliases.get(n.strip(), n.strip()) for n in t.get('cities', [])]
        if str(t.get('citiesFrom', '')).startswith('gmaps_saved'):
            names = e3.copy()
        names += [aliases.get(n.strip(), n.strip()) for n in t.get('places', [])]
        for name in names:
            # Only explicit public fields. No notes, people, companions or private albums.
            histories.setdefault(name, []).append({
                'id': t['id'], 'start': t.get('start', ''), 'end': t.get('end') or t.get('start', ''),
                'planned': bool(t.get('planned')) or str(t.get('start', ''))[:10] > today,
            })
    cities = []
    for p in places:
        if p.get('level') == 'poi':
            continue
        history = sorted(histories.get(p['name'], []), key=lambda v: (v['start'], v['id']))
        landmark, model = landmarks.get(p['name'], [p['name'] + ' 도시 풍경', 'skyline'])
        completed = sum(not v['planned'] for v in history)
        cities.append({'id': p['name'], 'name': p['name'], 'country': p.get('country') or '',
                       'landmark': landmark, 'model': model, 'visits': len(history),
                       'completed': completed, 'planned': len(history) - completed,
                       'history': history, 'eras': p.get('eras', []),
                       'basis': 'trip' if history else 'saved-place',
                       'lat': p.get('lat'), 'lng': p.get('lng')})
    # Geographic order around the circle, with stable name tie-breaking.
    cities.sort(key=lambda c: (c['lng'] if c['lng'] is not None else 999, c['name']))
    return {'source': MAP_URL, 'generatedAt': today,
            'countNote': '여행 지도와 같은 도시명 정규화·포괄 여정 제외 규칙. 도시별 여정 수이며 실제 입국 횟수와 다를 수 있습니다. 예정은 별도 표시합니다.',
            'modelNote': '대표 명소를 축약한 상징 모형이며, 명소 자체의 방문 여부를 뜻하지 않습니다.',
            'cities': cities}

def travel_cities(src):
    doc = build(src)
    path = ROOT / 'data/travel_cities.json'
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'  data/travel_cities.json · {len(doc["cities"])} cities')

if __name__ == '__main__':
    import argparse
    from sync_sources import Source
    ap = argparse.ArgumentParser(); ap.add_argument('--local'); args = ap.parse_args()
    travel_cities(Source(args.local))
