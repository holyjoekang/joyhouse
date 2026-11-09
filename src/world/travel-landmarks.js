import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Shared primitive templates, baked vertex colours: one draw call per city, no image downloads.
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  dome: new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  ring: new THREE.TorusGeometry(1, .06, 4, 24),
  arch: new THREE.TorusGeometry(1, .18, 4, 12, Math.PI),
};
const material = new THREE.MeshLambertMaterial({vertexColors: true, emissive: '#242126', fog: false});
const C = { stone: '#e8d4ac', dark: '#65564a', roof: '#ba6248', gold: '#d6ac56', blue: '#5c91a3', green: '#719379', water: '#629caa', white: '#f1e9d7' };
export function landmarkMesh(city) {
  const parts = [];
  function add(shape, x,y,z, sx,sy,sz, color=C.stone, rx=0,ry=0,rz=0) {
    const g = G[shape].clone().toNonIndexed();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)), new THREE.Vector3(sx,sy,sz));
    g.applyMatrix4(m);
    const c = new THREE.Color(color), a = new Float32Array(g.attributes.position.count * 3);
    for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(a,3)); parts.push(g);
  }
  const box=(x,y,z,w,h,d,c)=>add('box',x,y,z,w,h,d,c);
  function tree(x,z,h=3) {add('cylinder',x,h*.3,z,.18,h*.6,.18,C.dark);add('cone',x,h*.8,z,1.1,h,1.1,C.green);}
  function water(){box(0,.12,0,15,.12,12,C.water);}
  function hill(x,z,h=5,c=C.green){add('cone',x,h/2,z,h*.55,h,h*.45,c,0,x*.1,.1);}
  function roof(x,y,z,w=4,d=3,c=C.roof){add('cone',x,y,z,w*.72,1.3,d*.72,c,0,Math.PI/4);}
  function house(x,z,h=3,c=C.white){box(x,h/2,z,2.5,h,2.2,c);roof(x,h+.5,z,2.8,2.5);box(x,h*.55,z+1.12,.7,1.1,.04,C.blue);}
  function pagoda(x=0,z=0,levels=5,stone=false){
    for(let i=0;i<levels;i++){const w=4-i*.45;box(x,.65+i*1.35,z,w,1.3,w,stone?C.stone:C.roof);roof(x,1.3+i*1.35,z,w+1,w+1,stone?C.dark:C.gold);}
    add('cone',x,levels*1.35+1,z,.25,1.4,.25,C.gold);
  }
  function wall(){box(0,1.5,0,13,3,2,C.dark);for(let x=-6;x<=6;x+=1.2)box(x,3.2,0,.6,.7,2.2,C.stone);for(const x of [-5,5]){box(x,2,0,2.7,4,3,C.stone);roof(x,4.5,0,3.2,3.2);} }
  function bridge(stone=false){
    water();box(0,2,0,15,.5,2.4,stone?C.stone:C.roof);
    for(const x of [-4,4]){
      if(stone){add('arch',x,.5,0,2.5,1.6,1,C.dark);house(x,-2,2.6);}
      else {for(const z of [-1.4,1.4]){box(x,4,z,.5,8,.5,C.roof);box(x,6,z,2,.3,.3,C.roof);for(let i=-2;i<=2;i++)add('cylinder',x+i*.65,3.8+Math.abs(i)*.5,z,.045,4-Math.abs(i),.045,C.gold);}}
    }
  }
  function cathedral(){box(0,2.5,0,5,5,6);roof(0,5.7,0,5,6,C.dark);for(const x of [-2,2]){box(x,4,3,1.5,8,1.7);add('cone',x,9,3,1,3,1,C.dark);box(x,4,3.86,.6,1.8,.04,C.blue);}}
  function dome(onion=false){
    box(0,2,0,5,4,4,C.white);add('dome',0,4,0,2.8,2.8,2.8,onion?C.green:C.blue);
    if(onion)for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.sin(a)*3.4,z=Math.cos(a)*3.4;add('cylinder',x,2.5,z,.85,5,.85,C.roof);add('sphere',x,5.4,z,1,1.3,1,[C.gold,C.blue,C.green,C.roof][i]);add('cone',x,6.8,z,.3,1,.3,C.gold);}
  }
  function clock(){box(0,4,0,2.5,8,2.5);box(0,8.2,0,3,1.6,3);add('cylinder',0,8.2,1.53,.6,.06,.6,C.white,Math.PI/2);box(0,8.4,1.58,.06,.5,.04,C.dark);box(.18,8.2,1.58,.4,.06,.04,C.dark);add('cone',0,10,0,2,2.5,2,C.dark);}
  function minaret(){box(0,.2,0,14,.2,12,'#d1ad75');add('cylinder',0,4,0,1.4,8,1.4,C.roof);for(let y=1;y<8;y+=1.4)add('cylinder',0,y,0,1.55,.2,1.55,C.gold);add('dome',0,8,0,1.3,1.3,1.3,C.stone);}
  function skyline(){for(let i=0;i<5;i++){const h=3+(i*7%6);box((i-2)*2.3,h/2,0,1.8,h,2,i%2?C.blue:C.stone);box((i-2)*2.3,h*.55,1.02,.8,h*.65,.05,'#b8d2d5');}}
  box(0,-.3,0,16,.6,14,'#bcb096');box(0,.02,0,15.5,.08,13.5,'#d9d1b9');
  const kind=city.model;
  switch(kind){
    case 'temple':
      for(let i=0;i<3;i++){add('cylinder',0,.3+i*.3,0,5-i*.5,.3,5-i*.5,C.white);}
      for(let i=0;i<8;i++){const a=i*Math.PI/4;add('cylinder',Math.sin(a)*2.6,2.5,Math.cos(a)*2.6,.2,3,.2,C.roof);}
      for(let i=0;i<3;i++){add('cylinder',0,3+i*1.4,0,3-i*.6,1.3,3-i*.6,C.roof);add('cone',0,4+i*1.4,0,4-i*.7,1.5,4-i*.7,'#315f82');}add('cone',0,7.7,0,.25,1,.25,C.gold);break;
    case 'pearl':
      for(const x of [-1.1,0,1.1])add('cylinder',x,4,0,.22,8,.22,C.stone);
      add('sphere',0,3,0,2,2,2,'#bf7674');add('sphere',0,8,0,1.3,1.3,1.3,'#bf7674');add('cone',0,10,0,.2,3,.2,C.dark);box(4,4,-1,2,8,2,C.blue);break;
    case 'pagodaTower':
      for(let i=0;i<8;i++)box(0,.7+i*1.05,0,3.4-i*.12,1,3.4-i*.12,'#689a94');add('cone',0,10,0,.2,3,.2,C.gold);break;
    case 'marina': water();for(const x of [-4,0,4])box(x,3.5,0,2,7,3,C.white);box(0,7.2,0,13,.7,3.5,C.green);for(const x of [-6,6])add('sphere',x,7.2,0,1,.4,1.7,C.white);break;
    case 'twins':
      for(const x of [-2.3,2.3]){for(let i=0;i<7;i++)add('cylinder',x,.7+i*1.25,0,1.4-i*.1,1.15,1.4-i*.1,'#a7bfc3');add('cone',x,10,0,.3,2,.3,C.stone);}box(0,5.5,0,5,.5,.6,C.blue);break;
    case 'empire':for(let i=0;i<4;i++)box(0,1.5+i*2.1,0,4-i*.7,3,3-i*.45,C.stone);add('cone',0,10.5,0,.2,3,.2,C.dark);break;
    case 'clock':clock();break;
    case 'clockHarbour':water();clock();break;
    case 'bridge':bridge();break;
    case 'stoneBridge':bridge(true);break;
    case 'gardenBridge':water();add('arch',0,.3,0,4,2.2,2,C.stone);pagoda(-4,-2,2);tree(5,-2);break;
    case 'onion':dome(true);break;
    case 'dome':dome();for(const x of [-4,4])box(x,2,0,2,4,3,C.white);break;
    case 'cathedral':cathedral();break;
    case 'church':cathedral();break;
    case 'palace':cathedral();house(-4,0);house(4,0);break;
    case 'fortress':hill(0,0,3);wall();break;
    case 'castle':for(let i=0;i<4;i++){box(0,.7+i*1.6,0,5-i,1.6,4-i*.6,C.white);roof(0,1.6+i*1.6,0,6-i,5-i*.6,C.green);}break;
    case 'arch':box(0,5,0,8,2,2,C.stone);for(const x of [-3,3])box(x,2.5,0,2,5,2,C.stone);break;
    case 'stupa':for(let i=0;i<6;i++)add('cone',0,1+i*1.2,0,3.6-i*.5,2.4,3.6-i*.5,C.gold);break;
    case 'pagoda':pagoda();break;
    case 'stonePagoda':pagoda(0,0,5,true);break;
    case 'pagodaWall':wall();pagoda(0,-2,5,true);break;
    case 'threePagodas':pagoda(0,-1,5,true);pagoda(-5,2,3,true);pagoda(5,2,3,true);break;
    case 'twinPagodas':pagoda(-3,0,5,true);pagoda(3,0,5,true);break;
    case 'lakePagoda':water();pagoda(0,0,3);tree(-5,-2);tree(5,-2);break;
    case 'pier':water();box(0,.5,2,2,.6,10,C.stone);pagoda(0,-2,3);break;
    case 'wall':wall();break;
    case 'seaWall':water();wall();break;
    case 'courtyard':for(const x of [-4,4]){box(x,1.5,0,3,3,8,C.roof);roof(x,3.5,0,3.5,8);}box(0,1.5,-4,8,3,2,C.roof);roof(0,3.5,-4,9,3);break;
    case 'monastery':hill(-4,-3,5);for(let i=0;i<3;i++){box((i-1)*3,1.5,1,3,3,4,C.white);roof((i-1)*3,3.5,1,3.5,4.5,C.gold);}break;
    case 'oldtown':hill(-3,-3,7,'#9aa99b');hill(2,-4,9,'#c7cfcb');for(let i=0;i<4;i++)house((i-1.5)*3,2,2.5);break;
    case 'hillside':for(let i=0;i<4;i++)for(let j=0;j<3;j++){box((j-1)*3.5,1+i*1.5,-i*1.3,3,2,3,C.roof);roof((j-1)*3.5,2.2+i*1.5,-i*1.3,3.5,3.5,C.gold);}break;
    case 'canal':water();for(let i=0;i<4;i++)house((i-1.5)*3,-2,3+i%2,['#be8269','#e6cc93','#a5816b','#c1b29a'][i]);break;
    case 'shophouse':for(let i=0;i<5;i++)house((i-2)*2.8,0,3,['#dbb88b','#a8beb0','#d9967e','#c4bbd5','#e1cf8b'][i]);break;
    case 'coast':water();for(let i=0;i<3;i++)house((i-1)*3,-1,3);tree(5,2);break;
    case 'island':water();add('sphere',0,0,0,5,.8,4,'#d8c9a0');for(const x of [-3,0,3]){add('cylinder',x,2.3,0,.16,4.6,.16,C.dark);for(let i=0;i<4;i++)add('sphere',x+Math.sin(i*1.57),4.6,Math.cos(i*1.57),1.3,.16,.5,C.green,0,-i*1.57);}break;
    case 'harbour':water();skyline();break;
    case 'skyline':skyline();break;
    case 'spire':add('cone',0,6,0,2.4,12,2.4,C.blue);for(const x of [-4,4])box(x,2,0,2,4,2,C.stone);break;
    case 'vegas':add('cone',-3,3,0,4,6,4,'#576b79',0,Math.PI/4);for(const x of [2,5])box(x,3,0,2,6,3,C.gold);break;
    case 'hollywood':hill(0,0,4);for(let i=0;i<7;i++)box((i-3)*1.1,3.6,1.5,.6,.9,.12,C.white);tree(-5,3);tree(5,3);break;
    case 'cliffs':add('sphere',-2,3,0,3,6,3,'#b4ada0');box(3,3,-1,4,6,4,'#c4baaa');tree(-5,3);tree(5,3);break;
    case 'mountains':case 'alpine':water();for(let i=0;i<3;i++)hill((i-1)*4,-2,5+i*1.5);for(let i=0;i<4;i++)tree((i-1.5)*3,3);break;
    case 'karst':water();for(let i=0;i<5;i++)add('sphere',(i-2)*2.8,(4+i%3)/2,-1+(i%2)*3,1.2,4+i%3,1.4,C.green);break;
    case 'crater':for(let i=0;i<8;i++){const a=i*Math.PI/4;hill(Math.sin(a)*4,Math.cos(a)*3,3.5,'#a8b2ac');}add('cylinder',0,.4,0,2.5,.1,2.5,C.water);break;
    case 'dunes':for(const x of [-4,0,4])add('sphere',x,0,-1,4,3,4,'#d8b57b');add('sphere',0,.18,3,3,.1,1,C.water);break;
    case 'waterfall':box(0,3,-2,12,6,3,'#8d9c87');box(0,3,-.43,7,6,.2,'#e4eff0');water();break;
    case 'grotto':box(0,3,0,12,6,3,'#ac967a');for(let x=-4;x<=4;x+=2){box(x,2.4,1.55,1.3,3,.06,'#665948');add('sphere',x,3,1.8,.3,.5,.3,C.gold);add('cone',x,1.8,1.8,.6,1.8,.5,C.stone);}break;
    case 'stoneForest':for(let i=0;i<9;i++)add('cone',(i%3-1)*3,2+(i%3), (Math.floor(i/3)-1)*3,1,4+(i%3)*2,1,'#a3a89b');break;
    case 'terraces':water();for(let i=0;i<5;i++)box(0,.3+i*.45,-i*.8,13-i*1.7,.6,7-i*.5,i%2?C.green:'#afbd76');break;
    case 'wetland':water();for(let i=0;i<12;i++){const x=(i%6-2.5)*2,z=Math.floor(i/6)*4-2;add('cylinder',x,.8,z,.08,1.6,.08,C.green);add('sphere',x,1.5,z,.2,.5,.2,'#ab8865');}break;
    case 'mountainGate':hill(-3,0,6);hill(3,0,7);box(0,4,2,5,1,2,C.roof);for(const x of [-2,2])box(x,2,2,.7,4,.7,C.stone);break;
    case 'minaret':minaret();break;
    case 'mosque':dome();for(const x of [-4,4]){add('cylinder',x,3,1,.7,6,.7,C.gold);add('cone',x,6.7,1,.9,1.5,.9,C.green);}break;
    case 'yurts':for(const x of [-4,0,4]){add('cylinder',x,1,0,1.8,2,1.8,C.white);add('cone',x,2.4,0,2,1.2,2,C.white);box(x,.7,1.8,.7,1.4,.04,C.roof);}break;
    case 'facade':box(0,2.5,0,7,5,.6,C.stone);add('cone',0,5.7,0,4,2,.4,C.stone,0,Math.PI/4);for(const x of [-2,0,2])box(x,2, .32,.7,1.5,.03,C.dark);break;
    case 'shells':water();for(const [x,h] of [[-2,6],[3,4]])add('sphere',x,h/2,0,2,h/2,.7,C.white,0,0,-.2);break;
    case 'industrial':box(-2,1.5,0,6,3,5,C.roof);for(const x of [2,4])add('cylinder',x,4,-1,.6,8,.6,C.dark);break;
    case 'wheel':water();add('ring',0,5,0,4,4,4,C.gold);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(Math.sin(a)*4,5+Math.cos(a)*4,0,.6,.6,.6,C.blue);add('cylinder',Math.sin(a)*2,5+Math.cos(a)*2,0,.035,4,.035,C.stone,0,0,-a);}for(const x of [-1.5,1.5])add('cylinder',x,2.5,0,.18,6,.18,C.stone,0,0,x*.2);break;
    case 'kites':tree(-5,0);tree(5,0);for(let i=0;i<3;i++){box((i-1)*3,4+i,0,1.5,1.5,.08,['#c96d5a','#dbb35f','#699da7'][i]);add('cylinder',(i-1)*3,2+i/2,0,.03,4+i,.03,C.dark);}break;
    default:skyline();
  }
  const geo=mergeGeometries(parts);parts.forEach(g=>g.dispose());geo.computeBoundingSphere();
  const mesh=new THREE.Mesh(geo,material);mesh.name=`travel-landmark-${city.id}`;return mesh;
}
