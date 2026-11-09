import { geography } from '../world/travel-layout.js';
export function createTravelCitiesUI(doc, visit, stop) {
  const dialog=document.createElement('dialog');dialog.id='travel-cities';
  dialog.innerHTML=`<header><div><small>JOYHOUSE · AROUND THE WORLD</small><h2>여행 도시 둘레길</h2></div><button class="close" aria-label="여행 도시 안내 닫기">×</button></header><p class="intro"></p><label class="search-label">도시 또는 대표 풍경 찾기<input type="search" placeholder="베이징, 금문교, 초원…" aria-label="여행 도시 검색"></label><div class="travel-layout"><nav aria-label="여행 도시 목록" class="city-list"></nav><section class="city-detail" aria-live="polite"></section></div><footer></footer>`;
  const style=document.createElement('style');style.textContent=`#travel-cities{box-sizing:border-box;width:min(880px,calc(100vw - 24px));max-height:90dvh;overflow:auto;padding:24px;border:1px solid #bda36e;border-radius:20px;background:#f5f0e4;color:#243e42;box-shadow:0 24px 80px #0005;font:14px/1.6 system-ui}#travel-cities::backdrop{background:#122c38aa}#travel-cities header{display:flex;justify-content:space-between;align-items:center;gap:12px}#travel-cities small{color:#8b6d38;font-size:10px;letter-spacing:.12em}#travel-cities h2{margin:4px 0;font-size:26px}#travel-cities button{font:inherit;cursor:pointer;border:1px solid #cec5b1;border-radius:10px;padding:10px 12px;background:#fffdf7;color:#24434a}#travel-cities .close{font-size:22px}#travel-cities input{box-sizing:border-box;width:100%;font:inherit;padding:12px;border:1px solid #bcb6a6;border-radius:10px;background:#fffdf7;margin:5px 0 18px}#travel-cities .travel-layout{display:grid;grid-template-columns:240px 1fr;gap:24px}#travel-cities .city-list{max-height:47dvh;overflow:auto;display:flex;flex-direction:column;gap:6px;padding-right:5px}#travel-cities .city-list button{text-align:left;flex-shrink:0}#travel-cities .city-list button[aria-current=true]{background:#294e54;color:white;border-color:#294e54}#travel-cities .city-detail{min-width:0}#travel-cities h3{font-size:24px;margin:0 0 4px}#travel-cities .landmark{font-size:17px;color:#7b613b;margin:0 0 16px}#travel-cities .visits{font-size:18px;font-weight:650}#travel-cities .visit{background:#294e54;color:white}#travel-cities .history{max-height:25dvh;overflow:auto;padding-left:22px}#travel-cities .history li{margin:9px 0}#travel-cities a{color:#286772;text-underline-offset:3px}#travel-cities .note,#travel-cities footer{font-size:12px;color:#626c65}#travel-cities footer{margin-top:18px;border-top:1px solid #d9d0be;padding-top:12px}#travel-cities :focus-visible{outline:3px solid #b08030;outline-offset:2px}@media(max-width:600px){#travel-cities{padding:18px}#travel-cities .travel-layout{grid-template-columns:1fr;gap:18px}#travel-cities .city-list{max-height:150px}#travel-cities h2{font-size:22px}}`;
  document.head.append(style);document.body.append(dialog);
  const list=dialog.querySelector('.city-list'),detail=dialog.querySelector('.city-detail'),search=dialog.querySelector('input');
  const cities=doc.cities;let current=cities[0];
  dialog.querySelector('.intro').textContent=`${cities.length}개 도시·여행지가 서울에서의 거리와 방향에 따라 마을 외곽 산책길에 놓여 있습니다. 거리는 걷기 좋게 압축하고, 이웃 도시의 간격을 조정했습니다. 도시를 골라 모형 앞으로 이동하거나 방문 기록을 펼쳐 보세요.`;
  dialog.querySelector('footer').textContent=doc.countNote+' '+doc.modelNote;
  dialog.querySelector('.close').onclick=()=>dialog.close();
  for(const type of ['keydown','keyup','pointerdown','pointerup','wheel'])dialog.addEventListener(type,e=>e.stopPropagation());
  const link=(text,url)=>{const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
  function renderDetail(){
    detail.replaceChildren();if(!current)return;
    const c=current,h=document.createElement('h3'),landmark=document.createElement('p'),count=document.createElement('p'),note=document.createElement('p');
    h.textContent=c.name;landmark.className='landmark';landmark.textContent=c.landmark;
    count.className='visits';count.textContent=c.history.length ? `방문 기록 ${c.completed}회`+(c.planned?` · 예정 ${c.planned}회`:'') : '방문 횟수 미집계';
    note.className='note';note.textContent=c.basis==='saved-place' ? (c.eras.includes('E3')?'2005–2006년 중국지역전문가 시기의 저장 장소 기록입니다. 개별 방문 날짜·횟수는 원본에서 미집계입니다.':'여행 지도에 등록된 장소입니다. 개별 방문 날짜·횟수는 원본에서 미집계입니다.') : '날짜는 해당 도시가 포함된 여정의 기간입니다. 장기 거주·주재도 여정 기록 1건으로 표시됩니다.';
    const button=document.createElement('button');button.className='visit';button.textContent='이 도시 모형 앞으로 이동 →';button.onclick=()=>{dialog.close();visit(c.id);};
    const distance=document.createElement('p'),km=geography(c).distanceKm;distance.className='note';distance.textContent=km===null?'서울 기준 거리 정보 없음':`서울에서 약 ${Math.round(km).toLocaleString('ko-KR')} km · 직선거리`;
    detail.append(h,landmark,distance,count,button,note);
    const ul=document.createElement('ul');ul.className='history';
    for(const trip of [...c.history].reverse()){
      const li=document.createElement('li');const date=trip.start===trip.end?trip.start:`${trip.start} ~ ${trip.end}`;
      li.append(link(`${trip.planned?'예정 · ':''}${date || '날짜 미상'} ↗`,doc.source+'?trip='+encodeURIComponent(trip.id)));ul.append(li);
    }
    detail.append(ul,link('나의 여행 지도에서 전체 기록 보기 ↗',doc.source));
  }
  function renderList(){
    list.replaceChildren();const q=search.value.trim().toLocaleLowerCase();
    for(const c of cities.filter(c=>(c.name+' '+c.landmark).toLocaleLowerCase().includes(q))){
      const b=document.createElement('button');b.textContent=c.name;b.setAttribute('aria-current',String(c===current));b.onclick=()=>{current=c;renderList();renderDetail();};list.append(b);
    }
    list.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest'});
    if(!list.childElementCount){const p=document.createElement('p');p.textContent='일치하는 도시가 없습니다.';list.append(p);}
  }
  search.oninput=renderList;
  return {open(id){current=cities.find(c=>c.id===id)||current;search.value='';renderList();renderDetail();stop();if(!dialog.open)dialog.showModal();search.focus();},get open_(){return dialog.open;}};
}
