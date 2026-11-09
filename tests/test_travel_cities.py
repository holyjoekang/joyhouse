import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from travel_cities import build

class Source:
    def __init__(self, places, trips): self.places, self.trips = places, trips
    def json(self, repo, path):
        if path.endswith('places.json'): return {'places': self.places}
        if path.endswith('trips.json'): return {'trips': self.trips}
        return {'북경': '베이징'}

class TravelCities(unittest.TestCase):
    def test_aliases_umbrella_plans_and_private_fields(self):
        src=Source([{'name':'베이징','level':'city'},{'name':'정원','level':'poi'}],[
            {'id':'one','cities':['북경'],'start':'2005-04','end':'2006-04','companions':['PRIVATE'],'note':'PRIVATE'},
            {'id':'all','cities':['베이징'],'start':'2005','umbrella':True},
            {'id':'future','cities':['베이징'],'start':'2026-11-18'}])
        result=build(src,today='2026-11-09'); c=result['cities'][0]
        self.assertEqual(len(result['cities']),1)
        self.assertEqual((c['visits'],c['completed'],c['planned']),(2,1,1))
        self.assertEqual(c['history'][0]['start'],'2005-04')
        self.assertNotIn('PRIVATE',json.dumps(result))
    def test_saved_place_is_not_invented_visit(self):
        c=build(Source([{'name':'广场','level':'city','eras':['E3']}],[]))['cities'][0]
        self.assertEqual(c['visits'],0);self.assertEqual(c['history'],[])
        self.assertEqual(c['basis'],'saved-place')
    def test_all_exported_places_have_landmark_and_consistent_counts(self):
        root=Path(__file__).resolve().parents[1]
        doc=json.loads((root/'data/travel_cities.json').read_text())
        models=json.loads((root/'content/travel/landmarks.json').read_text())
        self.assertEqual(len({c['id'] for c in doc['cities']}),len(doc['cities']))
        for c in doc['cities']:
            self.assertIn(c['id'],models)
            self.assertEqual(c['visits'],len(c['history']))
            self.assertEqual(c['visits'],c['completed']+c['planned'])

if __name__=='__main__':unittest.main()
