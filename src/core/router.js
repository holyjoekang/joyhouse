// 주소 #/room/<id> 와 지금 있는 방을 서로 맞춘다. 블로그 글에서 특정 방으로 바로 보낼 때 쓴다.
export function createRouter(onRoute) {
  const read = () => (location.hash.match(/^#\/room\/([\w-]+)/) || [])[1] || null;
  addEventListener('hashchange', () => { const id = read(); if (id) onRoute(id); });
  return {
    initial: read(),
    set(id) {
      const h = id ? `#/room/${id}` : '';
      if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search);
    },
  };
}
