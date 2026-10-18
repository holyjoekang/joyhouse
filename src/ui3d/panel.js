import * as THREE from 'three';

// 전시물을 누르면 화면 가운데에 떠오르는 3D 정보 판. 판은 앞으로 기울어진 채 떠올라 제자리에 선다.
export function createPanel(hud) {
  const group = new THREE.Group();
  group.visible = false;
  hud.scene.add(group);
  let card = null, close = null, t = 0, current = null;

  const KIND = { portal: '포털', artwork: '작품', post: '블로그 글', locked: '가족 전용', milestone: '이정표', sign: '안내' };

  function layout(w, h) {
    if (!card) return;
    const pw = card.userData.w, ph = card.userData.h + 12 + close.userData.h;
    const x = (w - pw) / 2, y = Math.max(16, (h - ph) / 2);
    hud.place(card, x, y, 200);
    hud.place(close, x + pw - close.userData.w, y + card.userData.h + 12, 200);
    card.remove(); group.add(card); group.add(close);
  }
  hud.add(group, (w, h) => { if (current) build(current); layout(w, h); });

  function build(ex) {
    const fs = hud.fs, pw = Math.min(600, hud.w - 32);
    const lines = [
      { text: KIND[ex.kind] || '', size: fs * 0.75, color: '#9a6a2e', weight: 700, gap: 4 },
      { text: ex.title || '', size: fs * 1.25, weight: 700, gap: 10 },
      { text: ex.body || '', size: fs * 0.95, color: '#3c352c', gap: 8 },
    ];
    if (ex.kind === 'portal' || ex.kind === 'post') {
      lines.push({ text: '사이트 연결은 마지막 단계(콘텐츠 연결)에서 열립니다.', size: fs * 0.8, color: '#7a6f60' });
    }
    const spec = { bg: '#fbf8f1', border: '#c9a14a', padding: 22, radius: 14, lines };
    if (!card) {
      card = hud.slab(spec, pw, { depth: 18, color: 0x8a6a3e });
      card.userData.onClick = () => {};       // 판을 눌러도 닫히지 않는다
      card.userData.noTilt = true;
      close = hud.slab({ bg: '#3a2b1e', padding: 10, radius: 10, align: 'center',
        lines: [{ text: '닫기', size: fs, weight: 700, color: '#f4e2b8' }] }, 120, { depth: 12, onClick: hide });
    } else {
      hud.setSlab(card, spec, pw);
      hud.setSlab(close, { bg: '#3a2b1e', padding: 10, radius: 10, align: 'center',
        lines: [{ text: '닫기', size: fs, weight: 700, color: '#f4e2b8' }] }, 120);
    }
  }

  function show(ex) {
    current = ex;
    build(ex);
    layout(hud.w, hud.h);
    group.visible = true;
    t = 0;
  }
  function hide() { group.visible = false; current = null; }

  return {
    show, hide,
    get open() { return group.visible; },
    update(dt) {
      if (!group.visible || t >= 1) return;
      t = Math.min(1, t + dt * 3.5);
      const e = 1 - Math.pow(1 - t, 3);
      group.scale.setScalar(0.92 + 0.08 * e);
      group.position.set((1 - group.scale.x) * hud.w / 2, -(1 - group.scale.y) * hud.h / 2, 0);
      card.rotation.x = -0.5 * (1 - e);
    },
  };
}
