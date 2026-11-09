import * as THREE from 'three';
import { landmarkMesh } from './travel-landmarks.js';
import { createTravelCitiesUI } from '../ui3d/travel-cities.js';

import { cityPositions, cityEntrance, walkingPaths } from './travel-layout.js';
const idle=()=>new Promise(resolve=>setTimeout(resolve,0));
function footpaths(paths){
  const vertices=[];
  for(const path of paths){
    // Quadratic corner cuts smooth grid bends while staying inside the cleared corridor.
    const points=[];
    for(let i=0;i<path.length;i++){
      const p=path[i],a=path[i-1]||p,b=path[i+1]||p;
      const u={x:p.x*.8+a.x*.2,z:p.z*.8+a.z*.2},v={x:p.x*.8+b.x*.2,z:p.z*.8+b.z*.2};
      for(let j=0;j<=3;j++){const t=j/3;points.push({x:(1-t)**2*u.x+2*t*(1-t)*p.x+t*t*v.x,z:(1-t)**2*u.z+2*t*(1-t)*p.z+t*t*v.z});}
    }
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.001)continue;
      const nx=-(b.z-a.z)/length*2.5,nz=(b.x-a.x)/length*2.5;
      const A=[a.x+nx,.035,a.z+nz],B=[a.x-nx,.035,a.z-nz],C=[b.x+nx,.035,b.z+nz],D=[b.x-nx,.035,b.z-nz];
      vertices.push(...A,...B,...C,...B,...D,...C);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:'#d6c7a7',side:THREE.DoubleSide}));mesh.userData.floor='travel-ring';return mesh;
}
function label(city){
  const c=document.createElement('canvas');c.width=512;c.height=160;const g=c.getContext('2d');
  g.fillStyle='#183b43';g.beginPath();g.roundRect(2,2,508,156,20);g.fill();g.strokeStyle='#d5bb80';g.lineWidth=3;g.stroke();
  g.textAlign='center';g.fillStyle='#fbf2d9';g.font='600 33px system-ui';g.fillText(city.name,256,55,470);
  g.font='22px system-ui';g.fillStyle='#dac391';g.fillText(city.landmark,256,93,470);
  g.font='20px system-ui';g.fillStyle='#c4ddd9';g.fillText(city.history.length?`방문 기록 ${city.completed}회${city.planned?' · 예정 '+city.planned+'회':''}`:'저장 장소 · 방문 횟수 미집계',256,130,470);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(7,2.2,1);sprite.position.set(0,2.2,7);return sprite;
}
export async function createTravelRing(scene,doc,{camera,walker,blocks,clickables}){
  if(!doc?.cities?.length)throw Error('여행 도시 기록을 불러오지 못했습니다.');
  const group=new THREE.Group();group.name='travel-city-ring';scene.add(group);
  const positions=cityPositions(doc.cities);
  const cities=new Map();let labels=[];
  const ui=createTravelCitiesUI(doc,id=>visit(id),()=>{walker.keys.clear();Object.assign(walker.goal,{x:walker.view.x,z:walker.view.z});});
  function visit(id){const item=cities.get(id);if(!item)return;walker.setFlying(false);const p=item.target;walker.go(p.x,p.z,p.yaw);}
  for(let i=0;i<doc.cities.length;i++){
    const city=doc.cities[i],p=positions.get(city.id),tile=new THREE.Group();tile.position.set(p.x,0,p.z);tile.rotation.y=p.yaw;
    const model=landmarkMesh(city);model.scale.setScalar(.85);tile.add(model);group.add(tile);
    const target=cityEntrance(p,positions);
    tile.rotation.y=Math.atan2(target.x-p.x,target.z-p.z);
    model.userData.exhibit={kind:'travelCity',cityId:city.id,title:city.name};
    tile.userData.exhibit=model.userData.exhibit;
    clickables.push(tile);
    // Conservative footprint keeps walkers outside the miniature without testing its tiny parts.
    blocks.push({x0:p.x-6,x1:p.x+6,z0:p.z-6,z1:p.z+6});
    cities.set(city.id,{city,p,tile,model,target,label:null});
    if(i%3===2)await idle();
  }
  const paths=await walkingPaths([...cities.values()]);
  const road=footpaths(paths);group.add(road);clickables.push(road);
  let age=0;
  function update(dt){
    age+=dt;if(age<.25)return;age=0;
    const nearby=[...cities.values()].map(c=>[c,Math.hypot(camera.position.x-c.p.x,camera.position.z-c.p.z)]).filter(([,d])=>d<65).sort((a,b)=>a[1]-b[1]).slice(0,6).map(([c])=>c);
    for(const c of labels)if(!nearby.includes(c)){c.tile.remove(c.label);c.label.material.map.dispose();c.label.material.dispose();c.label=null;}
    for(const c of nearby)if(!c.label){c.label=label(c.city);c.tile.add(c.label);}
    labels=nearby;
  }
  return {group,cities,paths,update,open:id=>ui.open(id),visit,get open_(){return ui.open_;}};
}
