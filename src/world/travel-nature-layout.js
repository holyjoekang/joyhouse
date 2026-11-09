// Fixed seed and broad, overlapping ridges: no circular horizon wall.
export const LAKES=[{x:570,z:205,rx:85,rz:110},{x:-310,z:-475,rx:72,rz:48}];
export const FALLS=[{x:575,z:91,h:48,w:12},{x:-320,z:-522,h:35,w:9}];
export function naturePlan(items,paths){
  const cities=items.map(c=>c.p),route=paths.flat();
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  function clearance(x,z){
    if(x>-160&&x<290&&z>-175&&z<430)return 0;
    let d=Infinity;for(const p of cities)d=Math.min(d,Math.hypot(x-p.x,z-p.z)-44);
    for(const p of route)d=Math.min(d,Math.hypot(x-p.x,z-p.z)-22);
    return d;
  }
  function inLake(x,z,margin=0){return LAKES.some(l=>((x-l.x)/(l.rx+margin))**2+((z-l.z)/(l.rz+margin))**2<1);}
  function height(x,z){
    const clear=clearance(x,z);if(clear<=0)return 0;
    const ridges=[[-420,-560,155,190,100],[-60,-570,168,210,94],[300,-530,145,190,120],
      [-580,-180,100,90,240],[-575,280,78,100,200],[660,-150,105,110,200],[680,450,75,100,210],[-240,700,48,240,100],[240,740,60,240,120]];
    let h=0;
    for(const [cx,cz,amp,rx,rz] of ridges)h+=amp*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
    h*=.86+.12*Math.sin(x*.031+z*.014)+.08*Math.cos(z*.047-x*.017);
    let shore=1;
    for(const l of LAKES){const d=Math.hypot((x-l.x)/l.rx,(z-l.z)/l.rz);shore=Math.min(shore,smooth(1.35,1.95,d));}
    return Math.max(0,h*smooth(0,55,clear)*shore);
  }
  return {height,clearance,inLake};
}
