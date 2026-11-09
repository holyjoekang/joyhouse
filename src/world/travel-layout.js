// Seoul is the geographic origin. Distances are great-circle distances, not flight routes.
export const ORIGIN = {lat:37.5665,lng:126.978};
export const TRAVEL_BOUNDS = {x0:-650,x1:780,z1:-630,z0:820};
const CENTER={x:65,z:123}, rad=Math.PI/180;
export function geography(city){
  if(!Number.isFinite(city.lat)||!Number.isFinite(city.lng))return {distanceKm:null,bearing:0};
  const a=ORIGIN.lat*rad,b=city.lat*rad,d=(city.lng-ORIGIN.lng)*rad;
  const h=Math.sin((b-a)/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(d/2)**2;
  return {distanceKm:6371*2*Math.asin(Math.sqrt(Math.min(1,h))),bearing:Math.atan2(Math.sin(d)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(d))};
}
export function cityPositions(cities){
  const placed=new Map();
  // Closest cities get first choice; small lateral shifts keep dense regions walkable.
  for(const city of [...cities].sort((a,b)=>(geography(a).distanceKm??20000)-(geography(b).distanceKm??20000)||a.id.localeCompare(b.id))){
    const geo=geography(city),distance=geo.distanceKm??20000;
    let best=null;
    for(let step=0;step<410;step++){
      const fan=step%41;
      const offset=fan===0?0:Math.ceil(fan/2)*(fan%2?1:-1)*.025;
      const angle=geo.bearing+offset;
      const dx=Math.sin(angle),dz=-Math.cos(angle);
      const edge=Math.min(190/Math.max(.0001,Math.abs(dx)),267/Math.max(.0001,Math.abs(dz)));
      const r=edge+36+210*Math.sqrt(distance/20000)+Math.floor(step/41)*32;
      const x=CENTER.x+dx*r,z=CENTER.z+dz*r;
      if([...placed.values()].every(p=>Math.hypot(x-p.x,z-p.z)>38)){
        best={x,z,yaw:Math.atan2(-dx,-dz),...geo};break;
      }
    }
    if(!best)throw Error('도시 산책길에 배치 공간이 부족합니다: '+city.id);
    placed.set(city.id,best);
  }
  return placed;
}

export function cityEntrance(p,positions){
  for(let n=0;n<32;n++){
    const yaw=p.yaw+Math.ceil(n/2)*(n%2?1:-1)*Math.PI/16;
    const x=Math.round((p.x+Math.sin(yaw)*22)/6)*6,z=Math.round((p.z+Math.cos(yaw)*22)/6)*6;
    if([...positions.values()].every(q=>Math.abs(x-q.x)>=14||Math.abs(z-q.z)>=14))return {x,z,yaw:yaw+Math.PI};
  }
  throw Error('도시 입구 공간이 부족합니다.');
}

// A small outdoor grid joins every doorstep to the same walking network.
// Routing avoids both the village and miniature footprints; no paths cut through buildings.
export async function walkingPaths(items){
  const step=6,key=(x,z)=>`${x},${z}`,point=k=>k.split(',').map(Number),network=new Set(),paths=[];
  const models=items.map(c=>c.p);
  const blocked=(x,z)=> (x>-110&&x<240&&z>-126&&z<372)||models.some(p=>Math.abs(x-p.x)<11&&Math.abs(z-p.z)<11);
  const inside=(x,z)=>x>-620&&x<750&&z>-600&&z<790;
  const add=points=>{paths.push(points);for(const p of points)network.add(key(p.x,p.z));};
  // Meandering perimeter follows the village's rectangular footprint, with four soft corners.
  const perimeter=[];
  for(let x=-126;x<=258;x+=step)perimeter.push({x,z:-144+Math.round(6*Math.sin(x/65)/step)*step});
  for(let z=-138;z<=396;z+=step)perimeter.push({x:258+Math.round(6*Math.sin(z/71)/step)*step,z});
  for(let x=252;x>=-126;x-=step)perimeter.push({x,z:396+Math.round(6*Math.sin(x/59)/step)*step});
  for(let z=390;z>=-144;z-=step)perimeter.push({x:-126+Math.round(6*Math.sin(z/67)/step)*step,z});
  perimeter.push(perimeter[0]);add(perimeter);
  // The existing southern park path reaches the new perimeter without crossing buildings.
  paths.push([{x:66,z:348},{x:66,z:372},{x:66,z:396+Math.round(6*Math.sin(66/59)/step)*step}]);
  let batch=0;
  for(const item of items){
    if(++batch%8===0)await new Promise(resolve=>setTimeout(resolve,0));
    const t=item.target,sx=Math.round(t.x/step)*step,sz=Math.round(t.z/step)*step;
    const start=key(sx,sz),queue=[start],previous=new Map([[start,null]]);let end=null;
    for(let i=0;i<queue.length;i++){
      const k=queue[i];if(network.has(k)){end=k;break;}
      const [x,z]=point(k);
      for(const [dx,dz] of [[-6,0],[6,0],[0,-6],[0,6],[-6,-6],[-6,6],[6,-6],[6,6]]){
        const nx=x+dx,nz=z+dz,n=key(nx,nz);
        if(previous.has(n)||!inside(nx,nz)||blocked(nx,nz)||blocked(x+dx,z)||blocked(x,z+dz))continue;
        previous.set(n,k);queue.push(n);
      }
    }
    if(!end)throw Error('도시로 이어지는 산책길을 찾지 못했습니다: '+item.city.id);
    const route=[];for(let k=end;k!==null;k=previous.get(k)){const [x,z]=point(k);route.push({x,z});}
    add(route);route.push({x:t.x,z:t.z});
  }
  return paths;
}
