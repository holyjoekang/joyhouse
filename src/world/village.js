// 마을 주민 — 3D 집 앞마당을 거니는 2D 꼬마 캐릭터들.
// 기본 주민(content/villagers.json, 전국 각지 출신 20명)과, 접속하면 생기는 '나' 캐릭터(동네 이름표: 잠실러·판교러…).
// 캐릭터는 이 파일이 기본 도형으로 직접 만드는 3D 꼬마 캐릭터다(큰 머리·작은 몸, 만화풍 음영). 외부 게임 그림·모델은 쓰지 않는다.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hometown, byPosition, setTown } from '../core/hometown.js';
import { createPresence } from '../core/presence.js';

const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif';
const TOP = 1.32;                                  // 머리 꼭대기 높이(m) — 이름표·말풍선 기준

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ── 3D 꼬마 캐릭터: 큰 머리·작은 몸, 만화 같은 3단 음영(toon) ──────────────
const GRAD = (() => { const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const MATS = new Map();
const mat = (color, extra) => {
  const k = color + (extra ? JSON.stringify(extra) : '');
  if (!MATS.has(k)) { const { basic, ...o } = extra || {}; MATS.set(k, basic ? new THREE.MeshBasicMaterial({ color, ...o }) : new THREE.MeshToonMaterial({ color, gradientMap: GRAD, emissive: new THREE.Color(color).multiplyScalar(0.28), ...o })); }
  return MATS.get(k);
};
const GEO = {
  sphere: new THREE.SphereGeometry(1, 24, 16),
  cap: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  // 얼굴 쪽(+z)을 비운 머리카락 (단발·긴머리)
  bob: new THREE.SphereGeometry(1, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.72),
  limb: new THREE.CylinderGeometry(1, 0.85, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 10),
  torso: new THREE.CapsuleGeometry(1, 0.8, 6, 16),
  ring: new THREE.TorusGeometry(1, 0.12, 8, 24),
  smile: new THREE.TorusGeometry(1, 0.28, 6, 16, Math.PI),
  disc: new THREE.CircleGeometry(1, 20),
};
// 모든 캐릭터가 함께 쓰는 재질 하나(정점 색 + 만화풍 음영). 밤에도 보이게 정점 색의 28%를 스스로 빛나게 한다
const BODY = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD, side: THREE.DoubleSide });
BODY.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor.rgb * 0.28;'); };
const SHADOW = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });
function mix(a, b, k) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString(); }
// 묶음(Group)의 자식 메시들을 정점 색을 단 하나의 메시로 합친다
function bake(group) {
  const parts = [];
  for (const m of group.children) {
    if (!m.isMesh) continue;
    m.updateMatrix();
    const g = m.geometry.clone().applyMatrix4(m.matrix);
    const c = m.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  group.clear();
  group.add(new THREE.Mesh(merged, BODY));
}
function mesh(geo, material, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = sx, sz = sx] = [], [rx = 0, ry = 0, rz = 0] = []) {
  const m = new THREE.Mesh(GEO[geo], material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  return m;
}

function buildBody(L) {
  const rig = new THREE.Group();
  const skin = mat(L.skin), hair = mat(L.hair, { side: THREE.DoubleSide }), shirt = mat(L.shirt), pants = mat(L.pants), dark = mat('#2b2522');
  // 다리 (엉덩이 축으로 흔든다)
  const legs = [-0.085, 0.085].map(x => {
    const g = new THREE.Group(); g.position.set(x, 0.34, 0);
    g.add(mesh('limb', pants, [0, -0.13, 0], [0.065, 0.26, 0.065]), mesh('sphere', dark, [0, -0.29, 0.03], [0.08, 0.055, 0.115]));
    rig.add(g); return g;
  });
  // 몸통
  const torso = new THREE.Group(); rig.add(torso);
  torso.add(mesh('torso', shirt, [0, 0.5, 0], [0.16, 0.12, 0.135]), mesh('sphere', mat(shade(L.shirt, 0.86)), [0, 0.6, 0.11], [0.06, 0.03, 0.03]));
  // 팔 (어깨 축)
  const arms = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * 0.2, 0.6, 0); g.rotation.z = s * 0.18;
    g.add(mesh('limb', shirt, [0, -0.1, 0], [0.05, 0.2, 0.05]), mesh('sphere', skin, [0, -0.23, 0], [0.055]));
    rig.add(g); return g;
  });
  // 머리
  const head = new THREE.Group(); head.position.y = 0.94; rig.add(head);
  head.add(mesh('sphere', skin, [0, 0, 0], [0.31, 0.29, 0.295]));
  // 얼굴: 큰 눈 + 반짝임, 볼터치, 웃는 입
  const eye = mat('#2b1d16'), white = mat('#ffffff', { basic: true }), blush = mat(mix(L.skin, '#ff8a95', 0.45));
  for (const s of [-1, 1]) {
    head.add(mesh('sphere', eye, [s * 0.1, -0.015, 0.272], [0.042, 0.06, 0.02]));
    head.add(mesh('sphere', white, [s * 0.1 - 0.014, 0.012, 0.288], [0.014]));
    head.add(mesh('disc', blush, [s * 0.175, -0.075, 0.235], [0.042, 0.028, 1], [0, s * 0.62, 0]));
  }
  head.add(mesh('smile', mat('#a3523f'), [0, -0.098, 0.283], [0.03], [0, 0, Math.PI]));
  // 머리카락
  const cap = () => head.add(mesh('cap', hair, [0, 0.015, -0.01], [0.33, 0.33, 0.325], [-0.32, 0, 0]));
  cap();
  for (const [x, y, r] of [[-0.17, 0.13, 0.11], [-0.06, 0.17, 0.12], [0.06, 0.17, 0.12], [0.17, 0.13, 0.11]]) head.add(mesh('sphere', hair, [x, y, 0.2], [r, r * 0.75, r * 0.7]));   // 앞머리
  if (L.style === 'spiky') for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; head.add(mesh('cone', hair, [Math.sin(a) * 0.16, 0.27, Math.cos(a) * 0.12 - 0.04], [0.07, 0.17, 0.07], [Math.cos(a) * -0.6, 0, Math.sin(a) * 0.6])); }
  if (L.style === 'bob' || L.style === 'long') head.add(mesh('bob', hair, [0, 0.02, -0.01], [0.345, L.style === 'long' ? 0.5 : 0.36, 0.34]));
  if (L.style === 'long') head.add(mesh('sphere', hair, [0, -0.22, -0.16], [0.26, 0.22, 0.12]));
  if (L.style === 'pony') { head.add(mesh('sphere', hair, [0, -0.02, -0.36], [0.1, 0.2, 0.1], [0.5, 0, 0])); head.add(mesh('sphere', mat('#ff5c8a'), [0, 0.12, -0.31], [0.045])); }
  if (L.style === 'bun') head.add(mesh('sphere', hair, [0, 0.31, -0.08], [0.12]));
  // 소품
  if (L.acc === 'cap') {
    const c = mat(L.shirt === '#ffffff' ? '#2f3a5a' : shade(L.shirt, 0.9));
    head.add(mesh('cap', c, [0, 0.06, -0.01], [0.335, 0.3, 0.33], [-0.2, 0, 0]), mesh('limb', c, [0, 0.11, 0.25], [0.2, 0.018, 0.16], [0.12, 0, 0]));
  } else if (L.acc === 'beanie') {
    head.add(mesh('cap', mat('#e9e2d0'), [0, 0.07, -0.01], [0.335, 0.32, 0.33], [-0.15, 0, 0]), mesh('sphere', mat('#d64b4b'), [0, 0.4, -0.04], [0.06]));
  } else if (L.acc === 'glasses') {
    const g = mat('#24242c');
    for (const s of [-1, 1]) head.add(mesh('ring', g, [s * 0.1, -0.015, 0.29], [0.065]));
    head.add(mesh('limb', g, [0, -0.005, 0.295], [0.008, 0.07, 0.008], [0, 0, Math.PI / 2]));
  } else if (L.acc === 'ribbon') {
    const r = mat('#ff5c8a');
    for (const s of [-1, 1]) head.add(mesh('cone', r, [0.2 + s * 0.06, 0.25, 0.02], [0.05, 0.1, 0.05], [0, 0, s * Math.PI / 2]));
    head.add(mesh('sphere', r, [0.2, 0.25, 0.02], [0.03]));
  } else if (L.acc === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i * 1.257; head.add(mesh('sphere', mat('#fff3a8'), [-0.23 + Math.cos(a) * 0.035, 0.2 + Math.sin(a) * 0.035, 0.12], [0.028])); }
    head.add(mesh('sphere', mat('#ff9f1c'), [-0.23, 0.2, 0.13], [0.025]));
  }
  // 바닥 그림자
  const shadow = new THREE.Mesh(GEO.disc, SHADOW); shadow.position.y = 0.012; shadow.scale.setScalar(0.26); shadow.rotation.x = -Math.PI / 2;
  // 부품 30여 개를 묶음마다 한 덩어리로 굽는다 (다리·팔·몸통·머리 = 그리기 6번)
  [...legs, ...arms, torso, head].forEach(bake);
  return { rig, legs, arms, head, shadow };
}

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const spriteOf = (tex, w, h, order = 10) => {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const s = new THREE.Sprite(m); s.scale.set(w, h, 1); s.renderOrder = order; return s;
};

// 이름표: 어두운 둥근 띠에 흰 글씨 (나는 금색 테두리)
function nameTag(text, kind) {
  const mine = kind === 'me', peer = kind === 'peer';
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `700 30px ${FONT}`;
  const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 50;
  g.font = `700 30px ${FONT}`;
  g.fillStyle = mine ? 'rgba(60,40,10,.85)' : peer ? 'rgba(10,52,48,.85)' : 'rgba(18,22,34,.72)'; rr(g, 2, 2, w - 4, 46, 14); g.fill();
  if (mine || peer) { g.strokeStyle = mine ? '#f2c14e' : '#5ee6c8'; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = mine ? '#ffe08a' : peer ? '#c9fff2' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 27);
  const h = 0.22;
  return spriteOf(canvasTex(c), h * w / 50, h, 11);
}

// 말풍선 (두 줄까지)
function bubbleTex(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `600 28px ${FONT}`;
  const lines = [''];
  for (const ch of [...text]) { if (g.measureText(lines.at(-1) + ch).width > 300 && lines.length < 2) lines.push(''); lines[lines.length - 1] += ch; }
  const w = Math.ceil(Math.max(...lines.map(l => g.measureText(l).width))) + 40, h = 26 + lines.length * 36 + 16;
  c.width = w; c.height = h;
  g.font = `600 28px ${FONT}`;
  g.fillStyle = '#fff'; g.strokeStyle = 'rgba(30,30,40,.55)'; g.lineWidth = 3;
  rr(g, 2, 2, w - 4, h - 18, 16); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 10, h - 17); g.lineTo(w / 2, h - 3); g.lineTo(w / 2 + 10, h - 17); g.fillStyle = '#fff'; g.fill();
  g.fillStyle = '#1d2433'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, w / 2, 22 + i * 36 + 4));
  return { tex: canvasTex(c), aspect: w / h };
}

function makeCharacter(scene, spec, kind) {
  const mine = kind === 'me';
  const group = new THREE.Group();
  const body = buildBody(spec.look);
  const tag = nameTag(mine ? `${spec.label} (나)` : kind === 'peer' ? `● ${spec.label}` : spec.label, kind);
  tag.position.y = TOP + 0.14;
  const bubble = spriteOf(null, 1, 0.4, 12);
  bubble.center.set(0.5, 0); bubble.position.y = TOP + 0.3; bubble.visible = false;
  group.add(body.rig, body.shadow, tag, bubble);
  scene.add(group);
  return {
    spec, group, ...body, tag, bubble, mine,
    x: 0, z: 0, tx: 0, tz: 0, yaw: Math.random() * 6.28, face: null, swing: 0,
    wait: Math.random() * 3, speed: 0.8 + Math.random() * 0.6, t: Math.random() * 10,
    talk: 0, nextChat: 6 + Math.random() * 18, greeted: -99,
    say(text, sec = 3.6) {
      const { tex, aspect } = bubbleTex(text);
      bubble.material.map?.dispose(); bubble.material.map = tex; bubble.material.needsUpdate = true;
      const h = 0.34 + (aspect < 3 ? 0.18 : 0);
      bubble.scale.set(h * aspect, h, 1); bubble.visible = true; this.talk = sec;
    },
    dispose() { scene.remove(group); group.traverse(o => { if (o.isMesh && o.material === BODY) o.geometry.dispose(); }); tag.material.map?.dispose(); bubble.material.map?.dispose(); },
  };
}

// 내 캐릭터의 생김새는 이름표에서 정한다 (같은 동네면 같은 모습)
function lookFrom(seed) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = a => a[(h = (h * 1103515245 + 12345) >>> 0) % a.length];
  return { skin: pick(['#ffe0c7', '#fcd5b5', '#f5c9a6', '#ffe8d6']), hair: pick(['#2a211c', '#5c3a28', '#141418', '#7a4a2a', '#c9853f']),
    style: pick(['spiky', 'bob', 'pony', 'short', 'bun', 'long']), shirt: pick(['#ff7a59', '#4fa3e0', '#7bc96f', '#b48cf2', '#ffd166', '#ef6f8e']),
    pants: pick(['#2b2f45', '#3a3f58', '#45506b']), acc: pick(['', 'cap', 'ribbon', 'glasses', 'flower', 'beanie']) };
}

// 화면 아래 작은 띠: 내 이름표, 동네 맞추기, 이름 바꾸기
function chip(onLocate, onRename, onToggle, onSay) {
  const css = document.createElement('style');
  css.textContent = `#jh-me{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:15;display:flex;gap:6px;align-items:center;padding:6px 8px 6px 14px;border-radius:999px;background:rgba(20,33,61,.82);color:#fff;font:600 13px/1.2 ${FONT};box-shadow:0 4px 18px rgba(0,0,0,.2);backdrop-filter:blur(6px);max-width:calc(100vw - 24px)}
#jh-me b{color:#ffe08a;white-space:nowrap}#jh-me span{opacity:.75;font-weight:500;white-space:nowrap}
#jh-me button{font:inherit;font-size:12px;border:0;border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;white-space:nowrap}#jh-me button:hover{background:rgba(255,255,255,.26)}
@media (max-width:520px){#jh-me span{display:none}#jh-me{top:auto;bottom:calc(96px + env(safe-area-inset-bottom,0px));left:12px;transform:none}}`;
  document.head.append(css);
  const el = document.createElement('div'); el.id = 'jh-me'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>🙂 나는</span><b>…</b><span class="n"></span><button type="button" data-a="loc" title="위치를 허용하면 동 이름으로 바꿉니다">📍 동네 맞추기</button><button type="button" data-a="say" title="한마디 하기">💬</button><button type="button" data-a="name" title="동네 이름 바꾸기">✏️</button><button type="button" data-a="hide" title="내 캐릭터 숨기기/보이기">👤</button>`;
  document.body.append(el);
  el.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'loc') onLocate(); else if (a === 'name') onRename(); else if (a === 'hide') onToggle(); else if (a === 'say') onSay();
  });
  return { set(label, count, online, live) { el.querySelector('b').textContent = label; el.querySelector('.n').textContent = online ? `· 지금 ${live}명 접속 · 주민 ${count}명` : `· 주민 ${count}명과 함께`; } };
}

export function createVillage(scene, { ground, collider, camera, walker, data, renderer }) {
  const people = [];
  let area = { x0: -13, x1: 15, z0: 5, z1: 40 }, me = null, meHidden = false, ui = null, home = null;
  const peers = new Map();           // 실시간 접속자: id → 캐릭터
  let online = false, said = { text: '', sid: 0, until: 0 }, sentAt = 0, lastSent = null, force = true;
  const spread = { f: Math.random() * 1.6, s: (Math.random() - 0.5) * 2.4 };   // 접속자들이 같은 자리에 겹치지 않게
  const refresh = () => ui?.set(home?.label || '…', people.length, online, peers.size + 1);
  const rand = (a, b) => a + Math.random() * (b - a);
  const place = c => { const p = collider.resolve({ x: rand(area.x0, area.x1), z: rand(area.z0, area.z1) }); c.tx = p.x; c.tz = p.z; };

  // 첫 화면을 막지 않게: 집이 뜨고 한숨 돌린 뒤, 캐릭터 재질을 화면을 멈추지 않고 미리 컴파일하고,
  // 주민은 한 프레임에 한 명씩 등장시킨다
  const idle = ms => new Promise(r => setTimeout(() => (window.requestIdleCallback || setTimeout)(r, { timeout: 1500 }), ms));
  const pending = [];
  const warm = (async () => {
    await idle(1200);
    const probe = makeCharacter(new THREE.Group(), { label: '·', look: { skin: '#ffe0c7', hair: '#222', style: 'bob', shirt: '#888', pants: '#333', acc: '' } }, 'me');
    try { await renderer?.compileAsync(probe.group, camera, scene); } catch {}
    probe.dispose();
  })();
  Promise.all([data('content/villagers.json'), warm]).then(([d]) => {
    if (!d) return;
    if (d.area) area = d.area;
    d.villagers.forEach((v, i) => pending.push([v, i]));
  });
  function addVillager([v, i]) {
    {
      const c = makeCharacter(scene, v, false);
      const front = i % 3 === 0;   // 셋 중 하나는 정문 앞(첫 화면에 보이는 자리)에서 시작
      const p = collider.resolve(front ? { x: rand(-9, 9), z: rand(area.z0 - 1, 6) } : { x: rand(area.x0, area.x1), z: rand(area.z0, area.z1) });
      c.x = c.tx = p.x; c.z = c.tz = p.z; if (front) c.wait = rand(4, 12);
      people.push(c);
    }
    refresh();
  }

  // 내가 한 말은 몇 초 동안 위치와 함께 보내서, 늦게 받은 사람도 보게 한다
  function speak(text, sec = 4) { me?.say(text, sec); said = { text, sid: said.sid + 1, until: performance.now() + sec * 1000 }; force = true; }

  function spawnMe(h) {
    home = h;
    const spec = { label: home.label, town: home.town, look: lookFrom(home.label + presence.id) };
    me?.dispose();
    me = makeCharacter(scene, spec, 'me');
    const v = walker.view;
    me.x = v.x - Math.sin(v.yaw) * 4.2 + Math.cos(v.yaw) * 1.9; me.z = v.z - Math.cos(v.yaw) * 4.2 - Math.sin(v.yaw) * 1.9;
    me.tx = me.x; me.tz = me.z; me.speed = 2.2; me.group.visible = !meHidden;
    speak(home.town ? `${home.town}에서 왔어요! 반가워요 👋` : '안녕하세요! 놀러 왔어요 👋', 4.5);
    // 가까운 주민 둘이 반겨 준다
    setTimeout(() => {
      people.map(c => [c, Math.hypot(c.x - me.x, c.z - me.z)]).sort((a, b) => a[1] - b[1]).slice(0, 2)
        .forEach(([c], i) => setTimeout(() => c.say(`${home.label}님, ${c.spec.lines[0]}`), i * 1400));
    }, 2600);
    refresh();
  }

  // 실시간 접속자
  function nearestVillager(x, z) { return people.map(c => [c, Math.hypot(c.x - x, c.z - z)]).sort((a, b) => a[1] - b[1])[0]?.[0]; }
  const presence = createPresence({
    bounds: collider.bounds || { x0: -95, x1: 226, z0: 358, z1: -112 },
    onStatus(s) { online = s === 'on'; if (online) force = true; refresh(); },
    onLeave(id) { const c = peers.get(id); if (c) { c.dispose(); peers.delete(id); refresh(); } },
    onPeer(m) {
      if (window.JH_DEBUG && !peers.has(m.id)) console.info('[presence] new peer', m.id, m.label);
      let c = peers.get(m.id);
      if (c && c.spec.label !== m.label) { c.dispose(); peers.delete(m.id); c = null; }
      if (!c) {
        c = makeCharacter(scene, { label: m.label, lines: [], look: lookFrom(m.label + m.id) }, 'peer');
        c.x = c.tx = m.x; c.z = c.tz = m.z; c.lastSid = 0;
        peers.set(m.id, c); refresh();
        const v = nearestVillager(m.x, m.z);
        if (v && Math.hypot(v.x - m.x, v.z - m.z) < 12) setTimeout(() => v.say(`${m.label}님 오셨네요! ${v.spec.lines[0]}`), 900);
      }
      c.tx = m.x; c.tz = m.z; c.seen = performance.now(); c.remoteYaw = m.yaw;
      if (m.say && m.sid !== c.lastSid) { c.lastSid = m.sid; c.say(m.say, 4); }
    },
  });

  ui = chip(
    async () => {
      me?.say('동네를 찾는 중…', 3);
      try { spawnMe(await byPosition()); }
      catch { me?.say('위치를 못 찾았어요. ✏️로 직접 적어 주세요', 4); }
    },
    () => {
      const t = prompt('어느 동네에서 오셨나요? (예: 잠실, 판교, 해운대)', me?.spec.town || '');
      const h = t && setTown(t); if (h) spawnMe(h);
    },
    () => { meHidden = !meHidden; if (me) me.group.visible = !meHidden; },
    () => {
      const t = prompt('한마디 (40자까지, 접속한 모두에게 보입니다)', '');
      const s = String(t || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
      if (s) speak(s, 5);
    },
  );
  Promise.all([hometown(), warm]).then(([h]) => spawnMe(h));

  const cam = new THREE.Vector3();
  function step(c, dt, el, speed) {
    const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
    const moving = d > 0.15;
    if (moving) {
      const k = Math.min(1, (speed * dt) / d);
      const p = collider.resolve({ x: c.x + dx * k, z: c.z + dz * k });
      if (Math.hypot(p.x - c.x, p.z - c.z) < speed * dt * 0.2) { c.tx = c.x; c.tz = c.z; }   // 막혔으면 멈춘다
      c.x = p.x; c.z = p.z;
    }
    c.t += dt;
    // 걷는 방향(또는 지정된 방향)을 천천히 바라본다
    const want = moving ? Math.atan2(dx, dz) : c.face;
    if (want != null) { let d2 = want - c.yaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); c.yaw += d2 * Math.min(1, dt * 8); }
    c.group.rotation.y = c.yaw;
    // 팔다리 흔들기, 걸을 때 통통, 서 있을 때 숨쉬기
    c.swing += ((moving ? 1 : 0) - c.swing) * Math.min(1, dt * 8);
    const ph = c.t * (5 + speed * 3), s = Math.sin(ph) * 0.65 * c.swing;
    c.legs[0].rotation.x = s; c.legs[1].rotation.x = -s;
    c.arms[0].rotation.x = -s * 0.9; c.arms[1].rotation.x = s * 0.9;
    c.rig.position.y = Math.abs(Math.sin(ph)) * 0.045 * c.swing;
    c.head.rotation.z = Math.sin(c.t * 1.7) * 0.05 * (1 - c.swing);
    c.head.position.y = 0.94 + Math.sin(c.t * 2.4) * 0.006 * (1 - c.swing);
    c.group.position.set(c.x, ground(c.x, c.z), c.z);
    if (c.talk > 0) { c.talk -= dt; c.bubble.material.opacity = Math.min(1, c.talk * 2); if (c.talk <= 0) c.bubble.visible = false; }
    return moving;
  }

  function update(dt, elapsed) {
    dt = Math.min(dt, 0.1);
    if (pending.length) addVillager(pending.shift());   // 한 프레임에 한 명
    camera.getWorldPosition(cam);
    const far = Math.hypot(cam.x - (area.x0 + area.x1) / 2, cam.z - (area.z0 + area.z1) / 2) > 140 || walker.flying && walker.alt > 90;
    for (const c of people) {
      const near = Math.hypot(cam.x - c.x, cam.z - c.z);
      c.group.visible = !far && near < 70;
      if (far) continue;
      if (near > 3.2) c.face = null;
      if (near < 3.2 && !walker.flying) {          // 가까이 오면 멈춰서 인사
        c.tx = c.x; c.tz = c.z; c.wait = 1.5; c.face = Math.atan2(cam.x - c.x, cam.z - c.z);   // 나를 돌아본다
        if (elapsed - c.greeted > 25) { c.greeted = elapsed; c.say(c.spec.lines[Math.floor(Math.random() * c.spec.lines.length)]); }
      }
      const moving = step(c, dt, elapsed, c.speed);
      if (!moving) {
        c.wait -= dt;
        if (c.wait <= 0) { place(c); c.wait = rand(1.5, 6); }
      }
      c.nextChat -= dt;
      if (c.nextChat <= 0) { c.nextChat = rand(14, 34); if (c.talk <= 0 && near < 30) c.say(c.spec.lines[Math.floor(Math.random() * c.spec.lines.length)], 3); }
    }
    // 접속자: 받은 위치를 따라 걷고, 12초 동안 소식이 없으면 사라진다
    const now = performance.now();
    for (const [id, c] of peers) {
      if (now - c.seen > 12000) { if (window.JH_DEBUG) console.info('[presence] stale', id, now, c.seen); c.dispose(); peers.delete(id); refresh(); continue; }
      const d = Math.hypot(c.tx - c.x, c.tz - c.z);
      if (d > 15) { c.x = c.tx; c.z = c.tz; }
      c.face = c.remoteYaw;
      step(c, dt, elapsed, Math.max(1.4, d * 2.2));
    }
    // 내 위치 보내기: 움직이면 0.25초마다, 가만있으면 3초마다
    if (me && home && !document.hidden && presence.online) {
      const px = meHidden ? walker.view.x : me.x, pz = meHidden ? walker.view.z : me.z;
      const moved = !lastSent || Math.hypot(px - lastSent.x, pz - lastSent.z) > 0.08;
      if (force || (moved && now - sentAt > 250) || now - sentAt > 3000) {
        force = false; sentAt = now; lastSent = { x: px, z: pz };
        presence.send({ label: home.label, x: px, z: pz, yaw: me.yaw, say: now < said.until ? said.text : '', sid: said.sid });
      }
    }
    if (me && !meHidden) {
      // 나는 시선 앞 오른쪽 4m쯤에서 같이 걷는다. 멀어지면(순간이동 뒤) 바로 옆에 나타난다
      const v = walker.view, fw = 3.8 + spread.f, sd = 1.9 + spread.s, ax = v.x - Math.sin(v.yaw) * fw + Math.cos(v.yaw) * sd, az = v.z - Math.cos(v.yaw) * fw - Math.sin(v.yaw) * sd;
      if (Math.hypot(me.x - v.x, me.z - v.z) > 14) { const p = collider.resolve({ x: ax, z: az }); me.x = me.tx = p.x; me.z = me.tz = p.z; }
      if (Math.hypot(ax - me.tx, az - me.tz) > 0.8) { me.tx = ax; me.tz = az; }
      me.group.visible = !walker.flying;
      me.face = Math.atan2(cam.x - me.x, cam.z - me.z);   // 멈춰 있을 때는 나를 바라본다
      step(me, dt, elapsed, Math.max(2.2, Math.hypot(ax - me.x, az - me.z) * 1.6));
    }
  }
  if (window.JH_DEBUG) window.__village = { peers, people, get me() { return me; } };
  return { update, get me() { return me; }, people };
}
