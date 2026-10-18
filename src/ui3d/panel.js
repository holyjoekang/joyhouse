import * as THREE from 'three';

// 전시물을 누르면 화면 가운데에 떠오르는 3D 정보 판. 아래에 단추 석판(들어가기·새 탭·닫기)이 붙는다.
export function createPanel(hud) {
  const group = new THREE.Group();
  group.visible = false;
  hud.scene.add(group);
  let card = null, t = 0, current = null, actions = [];
  const buttons = [];

  const KIND = { portal: '포털', artwork: '작품', post: '블로그 글', locked: '가족 전용', milestone: '이정표', sign: '안내', app: 'AI-Apps 작업실' };

  function btnSpec(label, primary) {
    return { bg: primary ? '#1f4a7a' : '#3a2b1e', padding: 10, radius: 10, align: 'center',
      lines: [{ text: label, size: hud.fs, weight: 700, color: primary ? '#ffffff' : '#f4e2b8' }] };
  }

  function build(ex) {
    const fs = hud.fs, pw = Math.min(600, hud.w - 32);
    const lines = [
      { text: KIND[ex.kind] || '', size: fs * 0.75, color: '#9a6a2e', weight: 700, gap: 4 },
      { text: ex.title || '', size: fs * 1.25, weight: 700, gap: 10 },
      { text: ex.body || '', size: fs * 0.95, color: '#3c352c', gap: 8 },
    ];
    const spec = { bg: '#fbf8f1', border: '#c9a14a', padding: 22, radius: 14, lines };
    if (!card) {
      card = hud.slab(spec, pw, { depth: 18, color: 0x8a6a3e });
      card.userData.onClick = () => {};       // 판을 눌러도 닫히지 않는다
      card.userData.noTilt = true;
      group.add(card);
    } else hud.setSlab(card, spec, pw);

    const all = [...actions, { label: '닫기', onClick: hide }];
    all.forEach((a, i) => {
      const bw = Math.min(260, Math.max(110, a.label.length * fs * 0.95 + 36));
      if (!buttons[i]) { buttons[i] = hud.slab(btnSpec(a.label, a.primary), bw, { depth: 12 }); group.add(buttons[i]); }
      else hud.setSlab(buttons[i], btnSpec(a.label, a.primary), bw);
      buttons[i].userData.onClick = () => { if (a !== all.at(-1)) hide(); a.onClick(); };
      buttons[i].visible = true;
    });
    for (let i = all.length; i < buttons.length; i++) buttons[i].visible = false;
  }

  function layout(w, h) {
    if (!card || !current) return;
    const shown = buttons.filter(b => b.visible);
    const rowW = shown.reduce((s, b) => s + b.userData.w + 10, -10);
    const pw = card.userData.w;
    const wrap = rowW > pw;
    const btnH = wrap ? shown.reduce((s, b) => s + b.userData.h + 8, 0) : shown[0].userData.h;
    const ph = card.userData.h + 12 + btnH;
    const x = (w - pw) / 2, y = Math.max(16, (h - ph) / 2);
    hud.place(card, x, y, 200);
    let bx = x + pw - rowW, by = y + card.userData.h + 12;
    shown.forEach(b => {
      if (wrap) { hud.place(b, x + pw - b.userData.w, by, 200); by += b.userData.h + 8; }
      else { hud.place(b, bx, by, 200); bx += b.userData.w + 10; }
    });
  }
  hud.add(group, (w, h) => { if (current) { build(current); layout(w, h); } });

  function show(ex, acts = []) {
    current = ex; actions = acts;
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
