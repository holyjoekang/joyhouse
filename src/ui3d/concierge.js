// Accessible companion to the spatial controls; updates only when the room changes.
export function createConcierge(house, go) {
  const el = document.createElement('details'); el.id = 'jh-concierge';
  el.innerHTML = `<summary>관람 안내 <span>GUIDE</span></summary><div class="guide-body"><small>지금 머무는 곳</small><h2></h2><p class="description"></p><label>공간 바로가기<select aria-label="관람할 공간"><option value="">공간을 선택하세요</option></select></label><div class="guide-actions"><button type="button" class="travel">여행 도시 둘레길</button><button type="button" class="next">추천 코스 시작</button><button type="button" class="quality"></button></div><p class="help">바닥을 눌러 걷고, 화면을 끌어 둘러보세요. 그림·책·안내판을 누르면 자세히 볼 수 있어요.</p><a href="index.html">2D 홈페이지로 돌아가기 ↗</a></div>`;
  const style = document.createElement('style');
  style.textContent = `#jh-concierge{position:fixed;left:16px;top:164px;z-index:14;width:280px;max-width:calc(100vw - 32px);color:#f6f1e5;background:rgba(21,34,43,.94);border:1px solid #bda47566;border-radius:16px;font:14px/1.6 system-ui;box-shadow:0 12px 40px #0003}#jh-concierge summary{cursor:pointer;padding:12px 18px;font-weight:650}#jh-concierge summary span{float:right;font-size:10px;letter-spacing:.18em;color:#d9bd85}#jh-concierge .guide-body{padding:0 18px 18px;max-height:calc(100dvh - 290px);overflow:auto}#jh-concierge small{color:#cbb995;font-size:11px}#jh-concierge h2{font-size:21px;margin:4px 0 6px}#jh-concierge p{margin:6px 0 16px;color:#d6dbd9}#jh-concierge select{display:block;width:100%;margin:6px 0 12px;background:#f4efe4;color:#23313b;padding:10px;border:0;border-radius:8px;font:inherit}#jh-concierge button{border:1px solid #bda47577;background:#ffffff0c;color:#f6f1e5;padding:9px;border-radius:8px;font:inherit;cursor:pointer}#jh-concierge .guide-actions{display:flex;gap:6px;flex-wrap:wrap}#jh-concierge .help{font-size:12px;margin-top:14px}#jh-concierge a{color:#e8c98e}#jh-concierge :focus-visible{outline:2px solid #e8c98e;outline-offset:3px}@media(max-width:600px){#jh-concierge{top:164px;width:240px}#jh-concierge summary{padding:9px 14px}}`;
  document.head.append(style); document.body.append(el);
  // UI events never become walking/keyboard commands.
  for (const event of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']) el.addEventListener(event, e => e.stopPropagation());
  el.querySelector('.travel').onclick = () => go('travelring');
  const select = el.querySelector('select');
  for (const room of [...house.rooms, ...house.outdoor]) {
    if (room.access === 'family' || room.wing === 'hall') continue;
    const option = document.createElement('option'); option.value = room.id; option.textContent = room.name; select.append(option);
  }
  select.onchange = () => { if (select.value) go(select.value); };
  const route = ['grandhall', 'blueroom', 'maproom', 'china', 'chapel', 'ideas', 'vision', 'oval'];
  let index = -1;
  const next = el.querySelector('.next');
  next.onclick = () => { index = (index + 1) % route.length; go(route[index]); next.textContent = `다음 공간 · ${index + 1}/${route.length}`; };
  const quality = el.querySelector('.quality');
  const low = new URLSearchParams(location.search).get('q') === 'low';
  quality.textContent = low ? '표준 화질로' : '가볍게 보기';
  quality.onclick = () => { const url = new URL(location.href); low ? url.searchParams.delete('q') : url.searchParams.set('q', 'low'); location.assign(url); };
  const descriptions = {
    grandhall: '고흐의 색과 빛을 따라 걸어보세요. 작품을 누르면 이야기가 열립니다.',
    blueroom: '책등 사이에서 다음에 읽을 책을 찾아보세요. 책을 눌러 독서 기록을 만나세요.',
    redroom: '일상에서 건져 올린 생각들. 관심 가는 글을 골라 천천히 읽어보세요.',
    maproom: '지도 위의 장소와 여행 이야기를 연결해 보세요.',
    china: '중국에서 보낸 시간과 풍경을 따라가는 전시입니다.',
    chapel: '잠시 걸음을 멈추고 말씀과 삶의 이야기를 읽어보세요.',
    ideas: '문제에서 시작해 실험으로 이어지는 아이디어를 살펴보세요.',
    vision: '지나온 경험에서 앞으로의 삶으로 이어지는 방향을 만납니다.',
    oval: '직접 만들고 실험하는 AI 작업실입니다. 전시물을 눌러 프로젝트를 만나세요.',
  };
  return { update(room) { el.querySelector('h2').textContent = room.name; el.querySelector('.description').textContent = descriptions[room.id] || room.sub || '마을을 자유롭게 산책하거나 추천 코스를 따라 둘러보세요.'; select.value = room.id || ''; } };
}
