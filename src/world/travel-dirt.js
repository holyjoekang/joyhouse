import * as THREE from 'three';

// A small, repeatable earth texture is generated once; no extra asset downloads.
export function createDirtMaterial(){
  const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
  let seed=8721;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const a=x/size*Math.PI*2,b=y/size*Math.PI*2;
    const grain=(random()-.5)*22,patch=Math.sin(a+Math.sin(b))*3+Math.cos(b*2-a)*2;
    const i=(y*size+x)*4;
    pixels.data[i]=153+patch+grain;pixels.data[i+1]=122+patch+grain;pixels.data[i+2]=83+patch+grain;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  // Sparse small pebbles; wrapped copies keep the tile seams invisible.
  for(let i=0;i<340;i++){
    const x=random()*size,y=random()*size,r=.3+random()*.65;
    ctx.fillStyle=random()<.55?'#887457':'#b3a080';
    for(const dx of [-size,0,size])for(const dy of [-size,0,size]){
      ctx.beginPath();ctx.ellipse(x+dx,y+dy,r,r*.65,0,0,Math.PI*2);ctx.fill();
    }
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  const material=new THREE.MeshLambertMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  // Fade the last ~40cm into the underlying grass, with an uneven, worn edge.
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float trailSide; varying float vTrailSide;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrailSide=trailSide;');
    shader.fragmentShader='varying float vTrailSide;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float wear=.012*sin(vMapUv.x*37.+sin(vMapUv.y*29.))+.01*sin(vMapUv.y*53.);
      diffuseColor.a*=smoothstep(.01,.18,1.-abs(vTrailSide)+wear);`);
  };
  material.customProgramCacheKey=()=> 'travel-dirt-feather-v1';
  return material;
}
