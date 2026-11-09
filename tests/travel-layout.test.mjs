import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geography,cityPositions,cityEntrance,walkingPaths,TRAVEL_BOUNDS} from '../src/world/travel-layout.js';
const cities=JSON.parse(readFileSync(new URL('../data/travel_cities.json',import.meta.url))).cities;
test('Seoul distances and bearings use geography, including across the date line',()=>{
  const tokyo=geography({lat:35.6762,lng:139.6503}),london=geography({lat:51.5072,lng:-.1276});
  assert.ok(tokyo.distanceKm>1100&&tokyo.distanceKm<1200);
  assert.ok(tokyo.bearing>0&&tokyo.bearing<Math.PI);
  assert.ok(london.distanceKm>8800&&london.distanceKm<9000);
  assert.equal(geography({lat:37.5665,lng:126.978}).distanceKm,0);
  assert.equal(geography({}).distanceKm,null);
});
test('all cities have spaced, bounded positions and connected obstacle-free walking routes',async()=>{
  const positions=cityPositions(cities);
  assert.deepEqual([...positions], [...cityPositions([...cities].reverse())]);
  const items=cities.map(city=>({city,p:positions.get(city.id),target:cityEntrance(positions.get(city.id),positions)}));
  for(const {p} of items){
    assert.ok(p.x>TRAVEL_BOUNDS.x0+15&&p.x<TRAVEL_BOUNDS.x1-15&&p.z>TRAVEL_BOUNDS.z1+15&&p.z<TRAVEL_BOUNDS.z0-15);
    for(const q of positions.values())if(p!==q)assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>38);
  }
  const paths=await walkingPaths(items),key=p=>`${p.x},${p.z}`,connected=new Set(paths[0].map(key));
  assert.equal(paths.length,items.length+2);
  // The park approach is intentionally inside the village; all city branches stay outside.
  for(const path of paths.slice(2)){
    assert.ok(connected.has(key(path[0])),'branch joins the existing network');
    for(let i=0;i<path.length;i++){
      const a=path[i],b=path[i+1]||a;
      for(let t=0;t<=1;t+=.25){
        const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
        assert.ok(!(x>-110&&x<240&&z>-126&&z<372),'route avoids village');
        for(const p of positions.values())assert.ok(Math.abs(x-p.x)>=10||Math.abs(z-p.z)>=10,'route clears models');
      }
      connected.add(key(a));
    }
  }
  for(const item of items)assert.ok(connected.has(key(item.target)),'every city entrance is reachable');
});
