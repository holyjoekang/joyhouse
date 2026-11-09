import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cityPositions,cityEntrance,walkingPaths} from '../src/world/travel-layout.js';
import {naturePlan,LAKES,FALLS} from '../src/world/travel-nature-layout.js';
const cities=JSON.parse(readFileSync(new URL('../data/travel_cities.json',import.meta.url))).cities;
test('natural outskirts leave every city and connected walking route clear',async()=>{
  const positions=cityPositions(cities),items=cities.map(city=>({city,p:positions.get(city.id),target:cityEntrance(positions.get(city.id),positions)}));
  const paths=await walkingPaths(items),plan=naturePlan(items,paths);
  for(const item of items){
    assert.equal(plan.height(item.p.x,item.p.z),0);
    assert.equal(plan.height(item.target.x,item.target.z),0);
    assert.ok(!plan.inLake(item.p.x,item.p.z,25));
  }
  for(const path of paths)for(const p of path){
    assert.equal(plan.height(p.x,p.z),0);
    assert.ok(!plan.inLake(p.x,p.z,6));
    for(const f of FALLS)assert.ok(Math.hypot(p.x-f.x,p.z-f.z)>45);
  }
  for(const l of LAKES){assert.equal(plan.height(l.x,l.z),0);assert.ok(plan.clearance(l.x,l.z)>40);}
  assert.ok(plan.height(0,-570)>100,'a high northern ridge replaces the circular wall');
  assert.ok(plan.height(0,740)<plan.height(0,-570),'southern hills stay lower');
});
