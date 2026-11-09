import * as THREE from 'three';
import {TRAVEL_BOUNDS} from './travel-layout.js';
import {naturePlan,LAKES,FALLS} from './travel-nature-layout.js';

export async function buildTravelNature(parent,items,paths,{blocks}){
  const group=new THREE.Group();group.name='travel-natural-landscape';parent.add(group);
  const plan=naturePlan(items,paths),positions=[],colors=[],mountainBlocks=[];
  const grass=new THREE.Color('#a6cf7e'),green=new THREE.Color('#648663'),rock=new THREE.Color('#838b83'),snow=new THREE.Color('#cbd4cc');
  const grid=22,{x0,x1,z0,z1}=TRAVEL_BOUNDS;
  function vertex(x,z){const y=plan.height(x,z);const color=grass.clone().lerp(green,Math.min(1,y/12)).lerp(rock,Math.min(1,y/140));if(y>130)color.lerp(snow,Math.min(.8,(y-130)/65));return {x,y,z,color};}
  function tri(a,b,c){for(const p of [a,b,c]){positions.push(p.x,p.y-.035,p.z);colors.push(p.color.r,p.color.g,p.color.b);}}
  for(let z=z1;z<z0;z+=grid){
    for(let x=x0;x<x1;x+=grid){
      const a=vertex(x,z),b=vertex(Math.min(x+grid,x1),z),c=vertex(x,Math.min(z+grid,z0)),d=vertex(Math.min(x+grid,x1),Math.min(z+grid,z0));
      tri(a,c,b);tri(b,c,d);
      // Mountains form a physical boundary; broad cells avoid per-triangle collision tests.
      if(Math.min(a.y,b.y,c.y,d.y)>9&&plan.clearance(x+grid/2,z+grid/2)>35)mountainBlocks.push({x0:x,x1:x+grid,z0:z,z1:z+grid});
    }
    if(Math.round((z-z1)/grid)%8===0)await new Promise(r=>setTimeout(r,0));
  }
  const merged=[];
  for(const b of mountainBlocks){const last=merged.at(-1);if(last&&last.z0===b.z0&&last.x1===b.x0)last.x1=b.x1;else merged.push({...b});}
  blocks.push(...merged);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const terrain=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true}));terrain.name='outer-mountain-ridges';group.add(terrain);
  // Instanced forest: three draw calls for hundreds of trunks and two foliage layers.
  let seed=8173;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trees=[];
  for(let i=0;i<6000&&trees.length<850;i++){
    const x=x0+random()*(x1-x0),z=z1+random()*(z0-z1),h=plan.height(x,z);
    if(plan.clearance(x,z)<25||h>115||plan.inLake(x,z,15)||FALLS.some(f=>Math.hypot(x-f.x,z-f.z)<28))continue;
    // Clearings and denser northern forest break up the edge naturally.
    if(random()>.65+.2*Math.sin(x*.018)*Math.cos(z*.013))continue;
    trees.push({x,z,y:h,s:8+random()*11});
  }
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,.8,1,5),new THREE.MeshLambertMaterial({color:'#655241'}),trees.length);
  const crown=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),new THREE.MeshLambertMaterial({color:'#315b43'}),trees.length);
  const tip=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7),new THREE.MeshLambertMaterial({color:'#487654'}),trees.length);
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  trees.forEach((t,i)=>{
    matrix.compose(new THREE.Vector3(t.x,t.y+t.s*.4,t.z),q,new THREE.Vector3(t.s*.13,t.s*.8,t.s*.13));trunk.setMatrixAt(i,matrix);
    matrix.compose(new THREE.Vector3(t.x,t.y+t.s*.85,t.z),q,new THREE.Vector3(t.s*.42,t.s*1.2,t.s*.42));crown.setMatrixAt(i,matrix);
    matrix.compose(new THREE.Vector3(t.x,t.y+t.s*1.3,t.z),q,new THREE.Vector3(t.s*.3,t.s*.95,t.s*.3));tip.setMatrixAt(i,matrix);
  });
  for(const mesh of [trunk,crown,tip]){mesh.computeBoundingSphere();group.add(mesh);}
  const waterMaterial=new THREE.MeshLambertMaterial({color:'#4d9ca4',emissive:'#10282c',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  for(const l of LAKES){
    const shape=new THREE.Shape();
    for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,r=1+.045*Math.sin(a*3)+.025*Math.sin(a*7);const x=Math.cos(a)*l.rx*r,y=Math.sin(a)*l.rz*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}
    const lake=new THREE.Mesh(new THREE.ShapeGeometry(shape),waterMaterial);lake.rotation.x=-Math.PI/2;lake.position.set(l.x,.08,l.z);lake.name='woodland-lake';group.add(lake);
    // Use several short rectangles to approximate the shoreline without an oversized box.
    for(let z=-l.rz;z<l.rz;z+=12){const w=l.rx*Math.sqrt(Math.max(0,1-(z/l.rz)**2));blocks.push({x0:l.x-w,x1:l.x+w,z0:l.z+z,z1:l.z+z+12});}
  }
  const fallMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},side:THREE.DoubleSide,
    vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 v;uniform float time;void main(){float flow=.5+.5*sin(v.y*55.+time*6.+sin(v.x*43.)*2.);float streak=pow(.5+.5*sin(v.x*91.+sin(v.y*12.+time*2.)),3.);vec3 c=mix(vec3(.38,.72,.78),vec3(.89,.96,.94),flow*.3+streak*.5);gl_FragColor=vec4(c,1.);}'
  });
  const cliffMaterial=new THREE.MeshLambertMaterial({color:'#7a8173'}),foamMaterial=new THREE.MeshBasicMaterial({color:'#d4ece4'});
  for(const f of FALLS){
    const cliff=new THREE.Mesh(new THREE.CylinderGeometry(f.w*1.1,f.w*1.8,f.h,7),cliffMaterial);cliff.position.set(f.x,f.h/2,f.z-9);group.add(cliff);
    const fall=new THREE.Mesh(new THREE.PlaneGeometry(f.w,f.h),fallMaterial);fall.position.set(f.x,f.h/2+.2,f.z+f.w*1.2);fall.name='forest-waterfall';group.add(fall);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(f.w*1.6,24),waterMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(f.x,.1,f.z+f.w*1.2);group.add(pool);
    const foam=new THREE.Mesh(new THREE.CircleGeometry(f.w*.7,16),foamMaterial);foam.rotation.x=-Math.PI/2;foam.scale.set(1,.45,1);foam.position.set(f.x,.13,f.z+f.w*1.2+2);group.add(foam);
    blocks.push({x0:f.x-f.w*1.8,x1:f.x+f.w*1.8,z0:f.z-f.w*1.8-9,z1:f.z+f.w*1.8});
  }
  let elapsed=0,age=0;
  return {group,plan,trees:trees.length,update(dt,camera){elapsed+=dt;age+=dt;if(age<.1)return;age=0;if(FALLS.some(f=>Math.hypot(camera.position.x-f.x,camera.position.z-f.z)<360))fallMaterial.uniforms.time.value=elapsed;}};
}
