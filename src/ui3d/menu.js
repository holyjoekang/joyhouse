import * as THREE from 'three';

// 오른쪽 위 '방 바로가기' 석판 → 누르면 모든 방이 석판으로 펼쳐진다. 석판을 누르면 그 방으로 간다.
export function createMenu(hud, entries, onGo) {
  const group = new THREE.Group();
  group.visible = false;
  hud.scene.add(group);

  const dim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.55, depthWrite: false }));
  dim.userData.onClick = () => close();
  dim.userData.noTilt = true;
  group.add(dim);

  let button = null, title = null, shut = null;
  const tiles = [];

  function open() { group.visible = true; }
  function close() { group.visible = false; }

  function build(w, h) {
    const fs = hud.fs;
    const btnSpec = { bg: '#2f2419', padding: 12, radius: 12, align: 'center',
      lines: [{ text: '방 바로가기', size: fs, weight: 700, color: '#f4e2b8' }] };
    if (!button) button = hud.slab(btnSpec, fs * 7, { depth: 14, onClick: () => (group.visible ? close() : open()) });
    else hud.setSlab(button, btnSpec, fs * 7);
    hud.place(button, w - button.userData.w - 16, 16, 50);

    dim.scale.set(w, h, 1);
    dim.position.set(w / 2, -h / 2, 100);

    const cols = w > 980 ? 4 : w > 640 ? 3 : 2;
    const gap = 10, tw = Math.min(230, (w - 32 - gap * (cols - 1)) / cols);
    const gridW = cols * tw + (cols - 1) * gap, x0 = (w - gridW) / 2;
    const titleSpec = { bg: null, padding: 4, lines: [{ text: '어느 방으로 갈까요?', size: fs * 1.3, weight: 700, color: '#fbf3df' }] };
    if (!title) { title = hud.slab(titleSpec, gridW, { depth: 2 }); title.userData.noTilt = true; title.userData.onClick = () => {}; group.add(title); }
    else hud.setSlab(title, titleSpec, gridW);
    hud.place(title, x0, 24, 120);

    let y = 24 + title.userData.h + 12, col = 0, rowH = 0;
    entries.forEach((e, i) => {
      const spec = { bg: e.locked ? '#d9d2c4' : '#f8f2e4', padding: 12, radius: 10, lines: [
        { text: e.group, size: fs * 0.62, color: '#9a6a2e', weight: 700, gap: 2 },
        { text: e.name, size: fs * 0.95, weight: 700, gap: 2, color: e.locked ? '#6a6258' : '#2a241c' },
        { text: e.locked ? `${e.sub} · 가족 전용` : e.sub, size: fs * 0.72, color: '#6a6258' }] };
      if (!tiles[i]) { tiles[i] = hud.slab(spec, tw, { depth: 10, onClick: () => { close(); onGo(e); } }); group.add(tiles[i]); }
      else hud.setSlab(tiles[i], spec, tw);
      hud.place(tiles[i], x0 + col * (tw + gap), y, 130);
      rowH = Math.max(rowH, tiles[i].userData.h);
      if (++col === cols) { col = 0; y += rowH + gap; rowH = 0; }
    });
    if (col) y += rowH + gap;
    const shutSpec = { bg: '#3a2b1e', padding: 10, radius: 10, align: 'center', lines: [{ text: '닫기', size: fs, weight: 700, color: '#f4e2b8' }] };
    if (!shut) { shut = hud.slab(shutSpec, 120, { depth: 12, onClick: close }); group.add(shut); }
    else hud.setSlab(shut, shutSpec, 120);
    hud.place(shut, (w - 120) / 2, Math.min(y + 4, h - shut.userData.h - 12), 130);
  }
  hud.add(group, build);

  return { open, close, toggle: () => (group.visible ? close() : open()), get open_() { return group.visible; } };
}
